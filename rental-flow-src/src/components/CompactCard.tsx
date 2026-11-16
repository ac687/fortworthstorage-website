import { Phone, Tag } from 'lucide-react'
import { config } from '../config'
import type { UnitOption } from '../lib/units'
import { availabilityBadge, isPopular, withoutPromo, formatPrice } from '../lib/units'
import MoveInCost from './MoveInCost'
import { priceModel } from './PriceBox'

type Props = {
  unit: UnitOption
  onSelect: (unit: UnitOption, mode: 'rent' | 'reserve') => void
  allowReservations: boolean
  allowWaitlist: boolean
  phone: { display: string; href: string } | null
  onCall?: (unit: UnitOption) => void
  // True when the unit sits under its own type heading, so the type is not repeated on the card.
  underHeading: boolean
  hideTypePill?: boolean
}

const link = 'cursor-pointer whitespace-nowrap py-1 -my-2 py-3 text-[13px] leading-5 font-bold text-brand-dark underline hover:text-navy'

// Short type name for the size line, used when the card is not under a type heading.
function shortType(unit: UnitOption): string {
  if (unit.category === 'drive-up') return 'Drive up'
  if (unit.category === 'temperature-controlled') return 'Temperature controlled'
  if (unit.category === 'parking') return 'Vehicle parking'
  return unit.unitType
}

// The phone version of the unit card: no photo, price and Rent now side by side, about half the height of the full card.
// Rate lock and the free disc lock are said once in a banner above the list (App.tsx) instead of on every card.
export default function CompactCard({ unit, onSelect, allowReservations, allowWaitlist, phone, onCall, underHeading, hideTypePill = false }: Props) {
  const byPhone = unit.category === 'parking'
  const badge = byPhone ? null : availabilityBadge(unit.totalAvailable)
  const soldOut = unit.totalAvailable <= 0
  const multi = unit.tiers.length > 1
  const popular = !soldOut && !byPhone && isPopular(unit)
  const showCost = config.moveInCost.enabled && !soldOut && !byPhone
  const tier = soldOut ? withoutPromo(unit.fromTier) : unit.fromTier
  const info = config.sizeInfo[unit.size]
  const sizeLine = info?.short || info?.line
  const { promo, strip, left, right } = priceModel(tier, soldOut, byPhone)
  const showNote = multi && !soldOut && !byPhone && !!config.priceNote
  const detail = [sizeLine, underHeading || hideTypePill ? '' : shortType(unit)].filter(Boolean)

  const cents = [left.price, right?.price ?? 0].some((p) => formatPrice(p).includes('.'))
  const priceSize = cents ? 'text-[20px]' : 'text-[22px]'
  const half = (h: { price: number; label: string; free?: boolean; promo?: boolean; crossed?: boolean; soft?: boolean }, tint: boolean) => (
    <div className={`flex min-w-0 flex-col items-center justify-center px-1 py-1.5 text-center ${tint ? 'bg-[#F0FDF4]' : ''}`}>
      <div className="whitespace-nowrap leading-none">
        <span
          className={`font-display ${priceSize} ${
            h.crossed ? 'font-bold text-[#334155] line-through decoration-1' : h.promo ? 'font-extrabold text-[#15803D]' : h.soft ? 'font-semibold text-[#334155]' : soldOut ? 'font-semibold text-[#475569]' : 'font-extrabold text-navy'
          }`}
        >
          {h.free ? '$0' : formatPrice(h.price)}
        </span>
        {!h.free && <span className="text-xs font-medium text-[#475569]">/mo</span>}
      </div>
      <div className="mt-1 whitespace-nowrap text-xs leading-none text-[#475569]">{h.label}</div>
    </div>
  )

  // Under 360px the button drops below the price at full width; wider phones keep it beside the price.
  const side = byPhone ? 'w-full' : 'w-full min-[360px]:w-[108px] min-[360px]:shrink-0'
  const btn = 'flex min-h-[44px] cursor-pointer items-center justify-center rounded-full px-3 text-center text-[15px] font-bold transition'

  return (
    <article className={`relative rounded-2xl p-3 bg-white ${popular ? 'border border-navy ring-1 ring-navy' : 'border border-[#D5DBE6]'}`}>
      {popular && (
        <span className="absolute -top-3 left-4 rounded-full bg-navy px-3 py-1 text-xs font-extrabold leading-none tracking-wide text-white">★ {config.popular.ribbonText}</span>
      )}
      <div className="flex flex-col gap-2">
        {badge && (
          // "Only 2 left" and "Waitlist only" sit on the top edge, next to the "Most popular size" ribbon, so the size row stays clean.
          <span className={`absolute -top-3 right-4 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-extrabold leading-none ${badge.tone === 'red' ? 'border-[#fecaca] bg-[#FEE2E2] text-[#991B1B]' : 'border-slate-300 bg-slate-100 text-[#334155]'}`}>
            {badge.text}
          </span>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-px">
          <h3 className={`font-display text-xl font-bold leading-tight ${soldOut ? 'text-[#475569]' : 'text-navy'}`}>
            {unit.width}' x {unit.depth}'
          </h3>
          {detail.length > 0 && (
            <p className={`text-[13px] font-semibold ${soldOut ? 'text-[#475569]' : 'text-navy'}`}>
              {detail[0]}
              {detail[1] && <span className="font-normal text-[#475569]"> · {detail[1]}</span>}
            </p>
          )}
        </div>

        {strip && (
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold leading-tight ${promo ? 'text-[#166534]' : 'text-[#14532D]'}`}>
              <Tag size={13} className="shrink-0" aria-hidden="true" />
              {strip.text}
            </span>
            {strip.save !== null && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-extrabold text-[#166534]">
                Save {formatPrice(strip.save)}
                {!promo ? '/mo' : ''}
              </span>
            )}
          </div>
        )}

        <div className={`mx-auto flex w-full max-w-[420px] gap-2 ${byPhone ? 'flex-col' : 'flex-col min-[360px]:flex-row min-[360px]:items-stretch'}`}>
          <div className={`grid min-h-[54px] min-w-0 flex-1 overflow-hidden rounded-[10px] border ${soldOut ? 'border-slate-200 bg-[#F8FAFC]' : 'border-brand-100 bg-white'} ${right ? 'grid-cols-2 [&>*:last-child]:border-l [&>*:last-child]:border-brand-100' : 'grid-cols-1'}`}>
            {half(left, promo)}
            {right && half(right, false)}
          </div>
          {byPhone ? (
            <>
              {phone ? (
                <a href={phone.href} onClick={() => onCall?.(unit)} className={`${btn} gap-2 whitespace-nowrap bg-cta text-white no-underline hover:bg-cta-hover hover:text-white ${side}`}>
                  <Phone size={16} aria-hidden="true" />
                  Call {phone.display}
                </a>
              ) : (
                <span className="block h-[44px] w-full animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
              )}
              <p className="text-center text-[13px] text-[#475569]">Parking is rented by phone</p>
            </>
          ) : soldOut && !allowWaitlist ? (
            <span className={`${btn} bg-slate-100 text-[13px] font-semibold text-[#475569] ${side}`}>Currently unavailable</span>
          ) : soldOut ? (
            <button type="button" onClick={() => onSelect(unit, 'rent')} className={`${btn} whitespace-nowrap border-2 border-slate-300 px-2 text-[14px] text-slate-700 hover:border-slate-400 hover:bg-slate-50 ${side}`}>
              Join waitlist
            </button>
          ) : (
            <button type="button" onClick={() => onSelect(unit, 'rent')} className={`${btn} bg-cta text-white hover:bg-cta-hover ${side}`}>
              Rent now
            </button>
          )}
        </div>

        {!byPhone && !soldOut && (showCost || allowReservations || showNote) && (
          // Note on the left, links on the right, all on one text baseline. Under 360px the links come first and the note sits centred below.
          <div className="flex items-baseline justify-between gap-x-3 max-[369px]:flex-col max-[369px]:items-stretch max-[369px]:gap-y-0.5">
            {showNote && <span className="whitespace-nowrap text-xs leading-5 text-[#64748b] max-[369px]:order-2 max-[369px]:text-center">{config.priceNote}</span>}
            <span className={`inline-flex items-baseline gap-x-3.5 max-[369px]:order-1 max-[369px]:w-full max-[369px]:justify-between ${showNote ? '' : 'ml-auto'}`}>
              {showCost && <MoveInCost tier={unit.fromTier} multi={multi} onRent={() => onSelect(unit, 'rent')} />}
              {allowReservations && (
                <button type="button" onClick={() => onSelect(unit, 'reserve')} className={link}>
                  <span className="min-[370px]:hidden">Reserve for later</span>
                  <span className="max-[369px]:hidden">Reserve</span>
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
