import { Car, DoorClosed, Phone, ThermometerSnowflake, Warehouse } from 'lucide-react'
import { config } from '../config'
import type { UnitOption } from '../lib/units'
import { availabilityBadge, isPopular, typeLine, withoutPromo } from '../lib/units'
import MoveInCost from './MoveInCost'
import PriceBox from './PriceBox'

type Props = {
  unit: UnitOption
  onSelect: (unit: UnitOption, mode: 'rent' | 'reserve') => void
  allowReservations?: boolean
  allowWaitlist?: boolean
  // The facility phone. null while it is still loading. Vehicle parking is rented by phone, not online.
  phone?: { display: string; href: string } | null
  onCall?: (unit: UnitOption) => void
}

const link = 'cursor-pointer text-[13px] font-bold text-brand-dark underline hover:text-navy'

export default function UnitCard({ unit, onSelect, allowReservations = true, allowWaitlist = true, phone = null, onCall }: Props) {
  // Parking and RV spaces are rented by phone, so availability wording ("Waitlist only", "Only 2 left") is left off.
  const byPhone = unit.category === 'parking'
  const badge = byPhone ? null : availabilityBadge(unit.totalAvailable)
  const soldOut = unit.totalAvailable <= 0
  const multi = unit.tiers.length > 1
  const popular = !soldOut && !byPhone && isPopular(unit)
  const showCost = config.moveInCost.enabled && !soldOut && !byPhone
  const shownTier = soldOut ? withoutPromo(unit.fromTier) : unit.fromTier
  const sizeLine = config.sizeInfo[unit.size]?.line
  // Solid blue = temperature controlled, outlined = drive up. Other types (parking) get no label.
  const typePill =
    unit.category === 'temperature-controlled'
      ? { text: 'Temperature Controlled', Icon: ThermometerSnowflake, cls: 'border-[#bfd3f7] bg-[#dbeafe] text-[#1e3a8a]' }
      : unit.category === 'drive-up'
        ? { text: 'Drive Up', Icon: DoorClosed, cls: 'border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]' }
        : null

  const rent = 'w-full cursor-pointer rounded-full bg-cta px-8 py-3 text-center text-sm font-bold text-white transition hover:bg-cta-hover'

  return (
    <article className={`relative rounded-2xl bg-white p-4 sm:p-5 ${popular ? 'border border-navy ring-1 ring-navy' : 'border border-[#D5DBE6]'}`}>
      {popular && (
        <span className="absolute -top-3 left-5 rounded-full bg-navy px-3 py-1 text-xs font-extrabold leading-none tracking-wide text-white">★ {config.popular.ribbonText}</span>
      )}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(290px,300px)_170px] lg:items-center lg:gap-5">
        {/* Unit details: type label on top (same words as the filter buttons), then photo and text */}
        <div className="flex flex-col items-center gap-2 lg:items-start">
          {typePill && (
            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-[9px] pr-3 text-[13px] font-bold leading-tight ${typePill.cls}`}>
              <typePill.Icon size={15} strokeWidth={2.2} aria-hidden="true" />
              {typePill.text}
            </span>
          )}
        <div className="flex items-center justify-center gap-4 lg:justify-start">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
            {unit.photo ? (
              <img src={unit.photo} alt={`${unit.width}' x ${unit.depth}' storage unit`} loading="lazy" className="h-full w-full object-contain p-1" />
            ) : unit.category === 'parking' ? (
              <Car className="m-auto h-full text-brand" />
            ) : (
              <Warehouse className="m-auto h-full text-brand" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-bold text-navy">
              {unit.width}' x {unit.depth}'
              {badge && (
                <span className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 font-sans text-xs font-bold ${badge.tone === 'red' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-slate-100 text-[#475569]'}`}>
                  {badge.text}
                </span>
              )}
            </h3>
            {sizeLine && <p className="text-sm font-semibold text-navy">{sizeLine}</p>}
            <p className="text-sm text-[#475569]">{typeLine(unit.category, unit.unitType)}</p>
          </div>
        </div>
        </div>

        {/* Price box (same size on every card, with or without a promotion) */}
        <div className="w-full md:mx-auto md:max-w-[380px] lg:mx-0 lg:max-w-none">
          <PriceBox tier={shownTier} multi={multi} soldOut={soldOut} byPhone={byPhone} />
        </div>

        {/* Actions */}
        <div className="w-full md:mx-auto md:max-w-[380px] lg:mx-0 lg:max-w-none">
          {byPhone ? (
            <div className="flex w-full flex-col items-stretch gap-2">
              {phone ? (
                <a href={phone.href} onClick={() => onCall?.(unit)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-cta px-4 py-3 text-sm font-bold text-white no-underline transition hover:bg-cta-hover hover:text-white">
                  <Phone size={16} aria-hidden="true" />
                  Call {phone.display}
                </a>
              ) : (
                <span className="block h-[44px] w-full animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
              )}
              <p className="text-center text-xs text-[#475569]">Parking is rented by phone</p>
            </div>
          ) : soldOut && !allowWaitlist ? (
            <span className="block rounded-full bg-slate-100 px-6 py-3 text-center text-sm font-semibold text-[#475569]">Currently unavailable</span>
          ) : soldOut ? (
            <button type="button" onClick={() => onSelect(unit, 'rent')} className="w-full cursor-pointer rounded-full border-2 border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              Join waitlist
            </button>
          ) : (
            <>
              <button type="button" onClick={() => onSelect(unit, 'rent')} className={rent}>
                Rent now
              </button>
              {(showCost || allowReservations) && (
                <div className="mt-2.5 flex items-center justify-center gap-x-5 border-t border-[#D5DBE6] pt-2.5 lg:flex-col lg:gap-y-1.5 lg:border-0 lg:pt-0">
                  {showCost && <MoveInCost tier={unit.fromTier} multi={multi} onRent={() => onSelect(unit, 'rent')} />}
                  {allowReservations && (
                    <button type="button" onClick={() => onSelect(unit, 'reserve')} className={link}>
                      Reserve for later
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
}
