import { Car, Check, Warehouse } from 'lucide-react'
import type { UnitOption } from '../lib/units'
import { accessLabel, availabilityBadge, typeLabel } from '../lib/units'
import Price from './Price'

type Props = {
  unit: UnitOption
  onSelect: (unit: UnitOption, mode: 'rent' | 'reserve') => void
  allowReservations?: boolean
  allowWaitlist?: boolean
}

export default function UnitCard({ unit, onSelect, allowReservations = true, allowWaitlist = true }: Props) {
  const badge = availabilityBadge(unit.totalAvailable)
  const soldOut = unit.totalAvailable <= 0
  const multi = unit.tiers.length > 1

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
        <div className="flex items-center justify-center gap-4 lg:justify-start">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
            {unit.photo ? (
              <img src={unit.photo} alt={`${unit.width}' x ${unit.depth}' storage unit`} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              unit.category === 'parking' ? <Car className="m-auto h-full text-brand" /> : <Warehouse className="m-auto h-full text-brand" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{typeLabel(unit.category, unit.unitType)}</p>
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
          </div>
        </div>

        <div className="lg:mx-2 lg:justify-self-center">
          {/* Same size on every card (with or without a promotion) so the list lines up. */}
          <div className="flex h-[176px] w-full flex-col items-center justify-center rounded-xl border border-brand-100 bg-brand-50/60 px-4 md:mx-auto md:max-w-[380px] lg:mx-0 lg:max-w-none lg:w-[300px]">
            {multi && <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Starting at</p>}
            <Price tier={unit.fromTier} compact />
          </div>
        </div>

        <div className="flex gap-3 md:mx-auto md:w-full md:max-w-[380px] lg:mx-0 lg:max-w-none lg:w-auto lg:justify-end">
          {soldOut && !allowWaitlist ? (
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
