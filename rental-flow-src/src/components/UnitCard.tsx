import { Car, Check, Lock, Phone, Warehouse } from 'lucide-react'
import { config } from '../config'
import type { UnitOption } from '../lib/units'
import { accessLabel, availabilityBadge, typeLabel, withoutPromo } from '../lib/units'
import Price from './Price'
import TempIcon from './TempIcon'

type Props = {
  unit: UnitOption
  onSelect: (unit: UnitOption, mode: 'rent' | 'reserve') => void
  allowReservations?: boolean
  allowWaitlist?: boolean
  // The facility phone. null while it is still loading. Vehicle parking is rented by phone, not online.
  phone?: { display: string; href: string } | null
  onCall?: (unit: UnitOption) => void
}

export default function UnitCard({ unit, onSelect, allowReservations = true, allowWaitlist = true, phone = null, onCall }: Props) {
  // Parking and RV spaces are rented by phone, so availability wording ("Waitlist only", "Only 2 left") is left off.
  const byPhone = unit.category === 'parking'
  const badge = byPhone ? null : availabilityBadge(unit.totalAvailable)
  const soldOut = unit.totalAvailable <= 0
  const multi = unit.tiers.length > 1

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
        <div className="flex items-center justify-center gap-4 lg:justify-start">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
            {unit.photo ? (
              <img src={unit.photo} alt={`${unit.width}' x ${unit.depth}' storage unit`} loading="lazy" className="h-full w-full object-contain p-1" />
            ) : (
              unit.category === 'parking' ? <Car className="m-auto h-full text-brand" /> : <Warehouse className="m-auto h-full text-brand" />
            )}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {typeLabel(unit.category, unit.unitType)}
              <TempIcon category={unit.category} height={16} />
            </p>
            <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-xl font-bold text-navy">
              {unit.width}' x {unit.depth}'
              {badge && (
                <span className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 font-sans text-xs font-bold ${badge.tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {badge.text}
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500">
              <Check size={13} className="-mt-0.5 inline" aria-hidden="true" /> {accessLabel(unit.category, unit.unitType)}
            </p>
            {config.discLock.enabled && (
              <p className="mt-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[13px] font-semibold text-navy">
                  <Lock size={14} className="shrink-0 text-brand-dark" aria-hidden="true" />
                  {config.discLock.cardLabel}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="lg:mx-2 lg:justify-self-center">
          {/* Same size on every card (with or without a promotion) so the list lines up. */}
          <div className="flex h-[176px] w-full flex-col items-center justify-center rounded-xl border border-brand-100 bg-brand-50/60 px-4 md:mx-auto md:max-w-[380px] lg:mx-0 lg:max-w-none lg:w-[300px]">
            {multi && <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Starting at</p>}
            {/* No units free: the regular price only, never a promotion nobody can use. */}
            <Price tier={soldOut ? withoutPromo(unit.fromTier) : unit.fromTier} compact />
            {soldOut && unit.fromTier.promoRate !== null && <p className="mt-1 text-xs text-slate-500">Regular rate</p>}
          </div>
        </div>

        <div className="flex gap-3 md:mx-auto md:w-full md:max-w-[380px] lg:mx-0 lg:max-w-none lg:w-auto lg:justify-end">
          {byPhone ? (
            <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:items-end">
              {phone ? (
                <a
                  href={phone.href}
                  onClick={() => onCall?.(unit)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-cta px-7 py-3 text-sm font-bold text-white no-underline transition hover:bg-cta-hover hover:text-white"
                >
                  <Phone size={16} aria-hidden="true" />
                  Call {phone.display}
                </a>
              ) : (
                <span className="block h-[44px] w-full animate-pulse rounded-full bg-slate-200 lg:w-[240px]" aria-hidden="true" />
              )}
              <p className="text-center text-xs text-slate-500 lg:text-right">Parking is rented by phone</p>
            </div>
          ) : soldOut && !allowWaitlist ? (
            <span className="flex-1 rounded-full bg-slate-100 px-6 py-3 text-center text-sm font-semibold text-slate-500 lg:flex-none">Currently unavailable</span>
          ) : soldOut ? (
            <button type="button" onClick={() => onSelect(unit, 'rent')} className="flex-1 cursor-pointer rounded-full border-2 border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 lg:flex-none">
              Join Waitlist
            </button>
          ) : (
            <>
              <button type="button" onClick={() => onSelect(unit, 'rent')} className="flex-1 cursor-pointer rounded-full bg-cta px-8 py-3 text-sm font-bold text-white transition hover:bg-cta-hover lg:flex-none">
                Rent Now
              </button>
              {allowReservations && <button type="button" onClick={() => onSelect(unit, 'reserve')} className="flex-1 cursor-pointer rounded-full border-2 border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 lg:flex-none">
                Reserve
              </button>}
            </>
          )}
        </div>
      </div>
    </article>
  )
}
