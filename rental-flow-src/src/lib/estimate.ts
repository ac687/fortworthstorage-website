import { config } from '../config'
import type { Tier } from './units'

// Move-in cost estimate for a same-day rental: the rest of this month's rent
// (today counts as a full day), the protection plan for the same days, and the
// one-time admin fee. All math is in whole cents so nothing drifts.

export type Estimate = {
  periodLabel: string // "Oct 5 to Oct 31"
  daysLeft: number
  daysInMonth: number
  rent: number // dollars
  promoName: string | null
  promoDiscount: number // dollars, positive
  protection: number
  protectionCoverage: number // dollars of coverage, for the label
  adminFee: number
  total: number
}

// Today's date where the facility is, not where the visitor's browser is.
function todayAtFacility(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: config.estimate.timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

const monthShort = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })

export function moveInEstimate(tier: Tier, now = new Date()): Estimate {
  const { year, month, day } = todayAtFacility(now)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const daysLeft = daysInMonth - day + 1
  const share = (cents: number) => Math.round((cents * daysLeft) / daysInMonth)

  const rentCents = share(Math.round(tier.webRate * 100))
  const discountCents =
    tier.promoRate !== null ? Math.min(rentCents, share(Math.max(0, Math.round((tier.webRate - tier.promoRate) * 100)))) : 0
  const protectionCents = share(Math.round(config.estimate.protectionMonthly * 100))
  const adminCents = Math.round(config.estimate.adminFee * 100)
  const totalCents = rentCents - discountCents + protectionCents + adminCents

  const mon = monthShort(year, month)
  return {
    periodLabel: daysLeft === 1 ? `${mon} ${day}` : `${mon} ${day} to ${mon} ${daysInMonth}`,
    daysLeft,
    daysInMonth,
    rent: rentCents / 100,
    promoName: discountCents > 0 ? tier.promoName : null,
    promoDiscount: discountCents / 100,
    protection: protectionCents / 100,
    protectionCoverage: config.estimate.protectionCoverage,
    adminFee: adminCents / 100,
    total: totalCents / 100,
  }
}

export const money = (n: number) => `$${n.toFixed(2)}`
