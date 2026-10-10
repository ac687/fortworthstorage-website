import { config } from '../config'
import type { Tier } from './units'
import { formatPrice } from './units'

// Move-in cost estimate for a same-day rental: the rest of this month's rent
// (today counts as a full day), the protection plan for the same days, and the
// one-time admin fee. A rental in the last few days of the month (config.estimate.prepayLastDays)
// also prepays next month's rent and protection plan. All math is in whole cents so nothing drifts.
//
// Promotions start in one of two places. Most start at move-in, so they discount this month's prorated rent.
// A promotion that starts at the first FULL month (tier.promoFirstFullMonth) leaves the prorated month alone and
// discounts next month instead: on the prepaid line in the last days of the month, otherwise as a preview note.
//
// This file is the built-in calculation, used when Monument's cart preview (lib/cart.ts) can't be reached.
// With config.estimate.billingMode = 'anniversary' the first month is full price (no proration, no prepay) and
// later payments fall on the move-in day instead of the 1st.

export type Prepay = {
  monthName: string // "November"
  periodLabel: string // "Nov 1 to Nov 30"
  rent: number // dollars, full month
  promoName: string | null // set when the promotion also discounts this month
  promoDiscount: number // dollars, positive
  protection: number // dollars, full month
  lastDays: number // the rule's setting, for the explanation text (0 = no "last days" wording)
  promoFirstFullMonth: boolean // this month is the promotion's first full month
}

export type NextMonthPromo = {
  promoName: string | null
  monthName: string // "November"
  billedLabel: string // "Nov 1"
  rent: number // dollars, full month before the promotion
  rentAfterPromo: number // dollars, what that month costs with the promotion
}

// One upcoming payment after today: "Nov 1", its amount, and the math behind it.
export type Upcoming = { label: string; amount: number; detail: string }

export type Estimate = {
  periodLabel: string // "Oct 5 to Oct 31"
  prorated: boolean // the first month is a part month, so "X of Y days" applies
  dueDay: number | null // anniversary billing: the day of the month payments fall on; null = the 1st
  daysLeft: number
  daysInMonth: number
  rent: number // dollars, what is charged today (prorated when part of a month)
  rentFull: number // dollars, the full monthly rent, shown struck through when rent is prorated
  promoName: string | null
  promoDiscount: number // dollars, positive
  promoMonths: number | null // how many rent payments the promotion covers, when its name says
  protection: number
  protectionCoverage: number // dollars of coverage, for the label
  protectionMonthly: number // dollars / month, full price (0 = no protection plan in the estimate)
  adminFee: number
  tax: number // dollars, from the cart preview (the built-in calculation has none)
  source: 'cart' | 'calc' // where the numbers came from
  promoFirstFullMonth: boolean // the promotion starts at the first full month, not at move-in
  promoRequiresAutopay: boolean // the discount only applies with autopay
  nextMonthPromo: NextMonthPromo | null // preview of the discounted first full month, when it is not billed today
  prepay: Prepay | null // next month's charges, only in the last days of the month
  // Payments after today ("Coming up"). null = a promotion applies but its length isn't known,
  // so no amounts are promised. When next month is prepaid today, the list starts the month after.
  upcoming: Upcoming[] | null
  total: number
}

// Today's date where the facility is, not where the visitor's browser is.
export function todayAtFacility(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: config.estimate.timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export const monthShort = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
export const monthLong = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })

type ForecastInput = {
  tier: Tier
  year: number
  month: number // 1-12, the move-in month
  dueDay: number | null // anniversary billing: day of month; null = the 1st
  firstUpcoming: number // months after the move-in month of the first payment not billed today
  protectionMonthly: number // dollars
  monthDiscountCents: number
  firstFull: boolean
}

// Coming up: the payments after today, following the promotion's length.
// A promotion that starts at move-in counts today's rent as payment 1, so the next month is payment 2.
// A first-full-month promotion leaves today alone, so the next month is payment 1.
// Months already billed today are skipped (firstUpcoming).
export function buildUpcoming(i: ForecastInput): Upcoming[] | null {
  const { tier, year, month, dueDay, firstUpcoming, protectionMonthly } = i
  const hasPromo = tier.promoRate !== null && i.monthDiscountCents > 0
  const label = (ahead: number) => {
    const y = month - 1 + ahead >= 12 ? year + Math.floor((month - 1 + ahead) / 12) : year
    const m = ((month - 1 + ahead) % 12) + 1
    const day = dueDay === null ? 1 : Math.min(dueDay, new Date(Date.UTC(y, m, 0)).getUTCDate())
    return `${monthShort(year, month + ahead)} ${day}`
  }
  const row = (ahead: number, rent: number, tail = ''): Upcoming => ({
    label: label(ahead),
    amount: Math.round((rent + protectionMonthly) * 100) / 100,
    detail: protectionMonthly > 0 ? `${formatPrice(rent)} rent + ${formatPrice(protectionMonthly)} protection${tail}` : `${formatPrice(rent)} rent${tail}`,
  })
  const regularRow = (ahead: number) => row(ahead, tier.webRate, ', every month after')
  if (!hasPromo) return [regularRow(firstUpcoming)]
  if (tier.promoMonths === null) return null
  // Last month ahead that still gets the promotion's rent.
  const lastPromoAhead = i.firstFull ? tier.promoMonths : tier.promoMonths - 1
  const out: Upcoming[] = []
  for (let a = firstUpcoming; a <= lastPromoAhead; a++) out.push(row(a, tier.promoRate!))
  out.push(regularRow(Math.max(firstUpcoming, lastPromoAhead + 1)))
  return out
}

export function moveInEstimate(tier: Tier, now = new Date()): Estimate {
  const { year, month, day } = todayAtFacility(now)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const anniversary = config.estimate.billingMode === 'anniversary'
  // Anniversary billing: the first month is a full month, so nothing is prorated.
  const daysLeft = anniversary ? daysInMonth : daysInMonth - day + 1
  const share = (cents: number) => Math.round((cents * daysLeft) / daysInMonth)

  const rentCents = share(Math.round(tier.webRate * 100))
  // The promotion starts right away, so it discounts this month's prorated rent (payment 1).
  const monthDiscountCents = tier.promoRate !== null ? Math.max(0, Math.round((tier.webRate - tier.promoRate) * 100)) : 0
  const firstFull = !anniversary && tier.promoFirstFullMonth && tier.promoRate !== null
  // A first-full-month promotion does not touch the prorated move-in month.
  const discountCents = firstFull ? 0 : Math.min(rentCents, share(monthDiscountCents))
  const protectionMonthlyCents = Math.round(config.estimate.protectionMonthly * 100)
  const protectionCents = share(protectionMonthlyCents)
  const adminCents = Math.round(config.estimate.adminFee * 100)

  // Prepay rule: in the last N days of the month, next month is due today too.
  // The prepaid month is payment 2 of the promotion, so it is discounted too when the promotion
  // covers two or more payments. Same duration the unit cards use (tier.promoMonths, read from
  // the promotion's name); when the name doesn't say, the prepaid month is left at full price.
  const lastDays = Math.max(0, Math.min(28, Math.floor(Number(config.estimate.prepayLastDays) || 0)))
  const prepaying = !anniversary && lastDays > 0 && daysLeft <= lastDays
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextDays = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate()
  const prepayRentCents = prepaying ? Math.round(tier.webRate * 100) : 0
  const prepayProtectionCents = prepaying ? protectionMonthlyCents : 0
  // A first-full-month promotion discounts the prepaid month itself: it is the first full month.
  const prepayDiscountCents = prepaying
    ? firstFull
      ? Math.min(prepayRentCents, monthDiscountCents)
      : tier.promoMonths !== null && tier.promoMonths >= 2
        ? Math.min(prepayRentCents, monthDiscountCents)
        : 0
    : 0

  const totalCents = rentCents - discountCents + protectionCents + adminCents + prepayRentCents - prepayDiscountCents + prepayProtectionCents

  const upcoming = buildUpcoming({
    tier,
    year,
    month,
    dueDay: anniversary ? day : null,
    firstUpcoming: prepaying ? 2 : 1,
    protectionMonthly: config.estimate.protectionMonthly,
    monthDiscountCents,
    firstFull,
  })

  const mon = monthShort(year, month)
  const nextMon = monthShort(nextYear, nextMonth)
  return {
    periodLabel: anniversary ? 'first month' : daysLeft === 1 ? `${mon} ${day}` : `${mon} ${day} to ${mon} ${daysInMonth}`,
    prorated: !anniversary,
    dueDay: anniversary ? day : null,
    daysLeft,
    daysInMonth,
    rent: rentCents / 100,
    rentFull: tier.webRate,
    promoName: discountCents > 0 ? tier.promoName : null,
    promoDiscount: discountCents / 100,
    promoMonths: tier.promoMonths,
    promoFirstFullMonth: firstFull,
    promoRequiresAutopay: tier.promoRequiresAutopay && tier.promoRate !== null,
    nextMonthPromo:
      firstFull && !prepaying
        ? {
            promoName: tier.promoName,
            monthName: monthLong(nextYear, nextMonth),
            billedLabel: `${monthShort(nextYear, nextMonth)} 1`,
            rent: tier.webRate,
            rentAfterPromo: Math.max(0, Math.round(tier.webRate * 100 - monthDiscountCents)) / 100,
          }
        : null,
    protection: protectionCents / 100,
    protectionCoverage: config.estimate.protectionCoverage,
    protectionMonthly: config.estimate.protectionMonthly,
    adminFee: adminCents / 100,
    tax: 0,
    source: 'calc',
    prepay: prepaying
      ? {
          monthName: monthLong(nextYear, nextMonth),
          periodLabel: `${nextMon} 1 to ${nextMon} ${nextDays}`,
          rent: prepayRentCents / 100,
          promoName: prepayDiscountCents > 0 ? tier.promoName : null,
          promoDiscount: prepayDiscountCents / 100,
          protection: prepayProtectionCents / 100,
          lastDays,
          promoFirstFullMonth: firstFull,
        }
      : null,
    upcoming,
    total: totalCents / 100,
  }
}

export const money = (n: number) => `$${n.toFixed(2)}`
