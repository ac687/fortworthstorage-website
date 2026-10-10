import { config } from '../config'
import type { Tier } from './units'
import { buildUpcoming, monthLong, monthShort, todayAtFacility, type Estimate, type Prepay, type NextMonthPromo } from './estimate'

// Monument's own cart for a same-day rental (through /api/cart-preview), turned into the same
// Estimate the built-in calculation produces. Monument decides the proration, the promotion, the
// prepaid month and the tax; this file only reads the result. First-of-month and anniversary billing
// are told apart by what the cart says (invoiceGenerationType, isProratedAtMoveIn, billingPeriod).

export type CartItem = {
  name: string
  category: string // "RENT" | "FEES" | "COVERAGE" ...
  isRecurring: boolean
  isProratedAtMoveIn: boolean
  invoiceGenerationType: string | null // "FIRST_OF_MONTH" | "ANNIVERSARY"
  fixedFeeAmount: number | null
  fullNonProratedAmount: number | null
  taxAmountInPennies: number
  amountInPennies: number // before any promotion discount
  preProrationAmountInPennies: number | null
  billingPeriod: number // 1 = due today, 2 = next month prepaid today
  dateDesiredMoveIn: string | null // "2026-10-29T00:00:00.000+00:00"
  promotion: { promotionUuid: string | null; promotionName: string | null; discountAmountInPennies: number; discountType: string | null } | null
}

export async function fetchCart(tier: Tier, now = new Date(), timeoutMs = 4500): Promise<CartItem[]> {
  const t = todayAtFacility(now)
  const date = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
  const q = new URLSearchParams({ unitGroupUuid: tier.unitGroupUuid, date })
  if (tier.promotionUuid) q.set('promotionUuid', tier.promotionUuid)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${config.estimate.cartPath}?${q}`, { headers: { accept: 'application/json' }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`Cart preview failed (${res.status})`)
    const data = await res.json()
    if (!data || !Array.isArray(data.items) || !data.items.length) throw new Error('Cart preview was empty')
    return data.items as CartItem[]
  } finally {
    clearTimeout(timer)
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const discountOf = (i: CartItem) => Math.max(0, i.promotion?.discountAmountInPennies ?? 0)
const datePart = (i: CartItem) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(i.dateDesiredMoveIn ?? '')
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null
}

// Returns null when the cart has no usable rent line, so the caller falls back to the built-in calculation.
export function estimateFromCart(items: CartItem[], tier: Tier): Estimate | null {
  const today = items.filter((i) => (i.billingPeriod || 1) === 1)
  const later = items.filter((i) => (i.billingPeriod || 1) >= 2)
  const rent1 = today.find((i) => i.category === 'RENT')
  const when = rent1 ? datePart(rent1) : null
  if (!rent1 || !when || rent1.amountInPennies <= 0) return null
  const { year, month, day } = when

  const gen = (rent1.invoiceGenerationType ?? '').toUpperCase()
  const anniversary = gen !== '' && gen !== 'FIRST_OF_MONTH'
  const prorated = rent1.isProratedAtMoveIn
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const daysLeft = prorated && !anniversary ? daysInMonth - day + 1 : daysInMonth

  const cov1 = today.find((i) => i.category === 'COVERAGE')
  const fees1 = today.filter((i) => i.category !== 'RENT' && i.category !== 'COVERAGE')
  const rent2 = later.find((i) => i.category === 'RENT')
  const cov2 = later.find((i) => i.category === 'COVERAGE')
  const fees2 = later.filter((i) => i.category !== 'RENT' && i.category !== 'COVERAGE')

  const rentDiscount = discountOf(rent1)
  const protectionMonthlyCents = cov1 ? (cov1.fixedFeeAmount ?? cov1.fullNonProratedAmount ?? cov1.amountInPennies) : cov2 ? (cov2.fixedFeeAmount ?? cov2.amountInPennies) : 0
  const coverageDollars = Number(/\$\s?([\d,]+)/.exec(cov1?.name ?? cov2?.name ?? '')?.[1]?.replace(/,/g, ''))

  const totalCents = sum(items.map((i) => i.amountInPennies - discountOf(i) + i.taxAmountInPennies))
  const taxCents = sum(items.map((i) => i.taxAmountInPennies))

  const monthDiscountCents = tier.promoRate !== null ? Math.max(0, Math.round((tier.webRate - tier.promoRate) * 100)) : 0
  const firstFull = !anniversary && tier.promoFirstFullMonth && tier.promoRate !== null && rentDiscount === 0
  const mon = monthShort(year, month)

  let prepay: Prepay | null = null
  if (rent2) {
    const w2 = datePart(rent2) ?? { year, month: month === 12 ? 1 : month + 1, day: 1 }
    const days2 = new Date(Date.UTC(w2.year, w2.month, 0)).getUTCDate()
    const mon2 = monthShort(w2.year, w2.month)
    const d2 = discountOf(rent2)
    prepay = {
      monthName: monthLong(w2.year, w2.month),
      periodLabel: anniversary ? `${mon2} ${w2.day}` : `${mon2} 1 to ${mon2} ${days2}`,
      rent: rent2.amountInPennies / 100,
      promoName: d2 > 0 ? (rent2.promotion?.promotionName ?? tier.promoName) : null,
      promoDiscount: d2 / 100,
      protection: (cov2?.amountInPennies ?? 0) / 100,
      lastDays: anniversary ? 0 : Math.max(0, Math.floor(Number(config.estimate.prepayLastDays) || 0)),
      promoFirstFullMonth: firstFull,
    }
  }

  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthPromo: NextMonthPromo | null =
    firstFull && !rent2
      ? {
          promoName: tier.promoName,
          monthName: monthLong(nextYear, nextMonth),
          billedLabel: `${monthShort(nextYear, nextMonth)} 1`,
          rent: tier.webRate,
          rentAfterPromo: Math.max(0, Math.round(tier.webRate * 100 - monthDiscountCents)) / 100,
        }
      : null

  const maxPeriod = Math.max(1, ...items.map((i) => i.billingPeriod || 1))
  return {
    periodLabel: anniversary || !prorated ? 'first month' : daysLeft === 1 ? `${mon} ${day}` : `${mon} ${day} to ${mon} ${daysInMonth}`,
    prorated: prorated && !anniversary,
    dueDay: anniversary ? day : null,
    daysLeft,
    daysInMonth,
    rent: rent1.amountInPennies / 100,
    rentFull: (rent1.preProrationAmountInPennies ?? rent1.fullNonProratedAmount ?? rent1.amountInPennies) / 100,
    promoName: rentDiscount > 0 ? (rent1.promotion?.promotionName ?? tier.promoName) : null,
    promoDiscount: rentDiscount / 100,
    promoMonths: tier.promoMonths,
    protection: (cov1?.amountInPennies ?? 0) / 100,
    protectionCoverage: coverageDollars > 0 ? coverageDollars : config.estimate.protectionCoverage,
    protectionMonthly: protectionMonthlyCents / 100,
    adminFee: sum(fees1.map((i) => i.amountInPennies)) / 100 + sum(fees2.map((i) => i.amountInPennies)) / 100,
    tax: taxCents / 100,
    source: 'cart',
    promoFirstFullMonth: firstFull,
    promoRequiresAutopay: tier.promoRequiresAutopay && tier.promoRate !== null,
    nextMonthPromo,
    prepay,
    upcoming: buildUpcoming({
      tier,
      year,
      month,
      dueDay: anniversary ? day : null,
      firstUpcoming: maxPeriod,
      protectionMonthly: protectionMonthlyCents / 100,
      monthDiscountCents,
      firstFull,
    }),
    total: totalCents / 100,
  }
}
