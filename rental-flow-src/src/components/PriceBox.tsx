import { Gift, LockKeyhole } from 'lucide-react'
import { config } from '../config'
import type { Tier } from '../lib/units'
import { cardLabels, formatPrice, sentenceCase } from '../lib/units'

// The unit card's price box: an offer strip (promotion name + "Save $X"), two equal halves (lead price | regular rent)
// and a bottom bar (rate lock, free disc lock). Same height on every card, with or without a promotion.
// `multi` = the size has more than one tier, so the prices shown are the lowest ones (the bar says so). `soldOut` = the regular price only.
export type PriceLeft = { price: number; label: string; free?: boolean; promo?: boolean }
export type PriceRight = { price: number; label: string; crossed?: boolean; soft?: boolean }

// What the price box shows for a tier: the offer strip text, the lead price (left) and the regular price (right).
// Shared by the full price box and the compact phone card, so both always say the same thing.
export function priceModel(tier: Tier, soldOut: boolean, byPhone: boolean) {
  const promo = !soldOut && tier.promoRate !== null
  const inStore = !soldOut && !byPhone && !promo && config.showStreetRate && tier.streetRate > tier.webRate
  const { promoMonth, rentMonth, save } = cardLabels(tier)

  let strip: { text: string; save: number | null } | null = null
  let left: PriceLeft
  let right: PriceRight | null = null

  if (promo) {
    strip = { text: sentenceCase(tier.promoName ?? 'Special offer'), save: save !== null && save > 0 ? save : null }
    left = { price: tier.promoRate!, label: promoMonth, free: tier.promoRate === 0, promo: true }
    right = { price: tier.webRate, label: rentMonth, soft: true }
  } else if (inStore) {
    const pct = Math.round(((tier.streetRate - tier.webRate) / tier.streetRate) * 100)
    strip = { text: `Online price: ${pct}% off`, save: tier.streetRate - tier.webRate }
    left = { price: tier.webRate, label: 'Every month' }
    right = { price: tier.streetRate, label: 'In-store price', crossed: true }
  } else {
    left = { price: tier.webRate, label: 'Every month' }
  }
  return { promo, inStore, strip, left, right }
}

// `popup` = the tier popup's version: no bottom bar (the popup says rate lock and disc lock once, under the tiers) and a shorter box.
// `sharedOffer` = the popup's banner already names the promotion, so the strip only says how much it saves.
export default function PriceBox({
  tier,
  multi,
  soldOut,
  byPhone = false,
  popup = false,
  sharedOffer = false,
}: {
  tier: Tier
  multi: boolean
  soldOut: boolean
  byPhone?: boolean
  popup?: boolean
  sharedOffer?: boolean
}) {
  const { promo, inStore, strip, left, right } = priceModel(tier, soldOut, byPhone)

  // Both prices in a box share one size. A price with cents ("$44.50") is wider, so the pair steps down a size to fit its half.
  const cents = [left.price, right?.price ?? 0].some((p) => formatPrice(p).includes('.'))
  const priceSize = cents ? 'text-[22px]' : 'text-[26px]'

  const price = (p: number, label: string, o: { free?: boolean; crossed?: boolean; promo?: boolean; soft?: boolean } = {}) => (
    <div className="min-w-0 text-center leading-none">
      <div className="whitespace-nowrap">
        <span
          className={`font-display ${priceSize} ${
            o.crossed ? 'font-extrabold text-[#475569] line-through decoration-1' : o.promo ? 'font-extrabold text-[#15803D]' : o.soft ? 'font-semibold text-[#334155]' : soldOut ? 'font-semibold text-[#475569]' : 'font-extrabold text-navy'
          }`}
        >
          {o.free ? '$0' : formatPrice(p)}
        </span>
        {!o.free && <span className="text-xs font-medium text-[#475569]">/mo</span>}
      </div>
      <div className="mt-1.5 text-xs font-semibold text-[#475569]">{label}</div>
    </div>
  )

  const showLock = !popup && config.rateLock.enabled && !soldOut
  const showFree = !popup && config.discLock.enabled && !soldOut
  const showNote = !popup && multi && !soldOut && !!config.priceNote
  const saveOnly = sharedOffer && promo && strip !== null

  return (
    <div className={`flex ${popup ? 'h-[136px]' : 'h-[172px]'} w-full flex-col overflow-hidden rounded-xl border ${soldOut ? 'border-slate-200 bg-[#F8FAFC]' : 'border-brand-100 bg-white'}`}>
      {strip && saveOnly && (
        strip.save !== null && (
          <div className="flex h-[34px] shrink-0 items-center justify-center border-b border-[#CBD5E1] bg-[#DCFCE7] px-3 text-[13px] font-extrabold text-[#14532D]">
            Save {formatPrice(strip.save)}
          </div>
        )
      )}
      {strip && !saveOnly && (
        <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-[#CBD5E1] bg-[#DCFCE7] px-3">
          <span className="line-clamp-2 min-w-0 text-[12.5px] font-extrabold leading-tight text-[#14532D]" title={strip.text}>
            {strip.text}
          </span>
          {strip.save !== null && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#166534]">
              Save {formatPrice(strip.save)}
              {inStore ? '/mo' : ''}
            </span>
          )}
        </div>
      )}
      <div className={`grid min-h-0 flex-1 ${right ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* The promotional half is tinted to carry the offer strip's green down to the sale price. */}
        <div className={`flex min-w-0 items-center justify-center px-1.5 ${promo ? 'bg-[#DCFCE7]' : ''}`}>{price(left.price, left.label, left)}</div>
        {right && <div className="flex min-w-0 items-center justify-center border-l border-brand-100 px-1.5">{price(right.price, right.label, right)}</div>}
      </div>
      {(showLock || showFree || showNote) && (
        // Items sit on one line when they fit and wrap to a second centered row when they do not (narrow phones, free disc lock on).
        <div className="flex min-h-9 shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-[3px] border-t border-brand-100 bg-brand-50 px-2 py-[7px] text-xs font-semibold">
          {showLock && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-navy">
              <LockKeyhole size={13} aria-hidden="true" />
              {config.rateLock.text}
            </span>
          )}
          {showNote && <span className="whitespace-nowrap text-[11px] font-normal text-[#64748b]">{showLock ? '· ' : ''}{config.priceNote}</span>}
          {showFree && (
            // On desktop the side column's panel says this, so the card drops it there (see App.tsx).
            <span className="tu-free-lock inline-flex items-center gap-1 whitespace-nowrap text-[#166534]">
              <Gift size={13} aria-hidden="true" />
              {config.discLock.barLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
