import type { Tier } from '../lib/units'
import { formatPrice } from '../lib/units'

// Promo price for the first months, then the regular web rate.
// Falls back to a single price when there is no promotion.
export default function Price({ tier, compact = false }: { tier: Tier; compact?: boolean }) {
  const strike = tier.streetRate > tier.webRate
  // Three-digit prices in two narrow columns need a smaller size to stay apart.
  const wide = tier.webRate >= 100 || (tier.promoRate ?? 0) >= 100
  const big = compact || wide ? 'text-2xl' : 'text-3xl'
  // Labels come from the promotion's name; unknown durations stay generic.
  const n = tier.promoMonths
  const promoLabel = n === null ? 'Promo price' : n === 1 ? 'Month 1' : `Months 1–${n}`
  const afterLabel = n === null ? 'Regular rate' : n === 1 ? 'Month 2+' : `Month ${n + 1}+`

  if (tier.promoRate !== null) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="w-fit rounded-full bg-brand-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
          {tier.promoName}
        </span>
        <div className="mt-2 grid grid-cols-2 divide-x divide-slate-200">
          <div className="min-w-0 whitespace-nowrap pr-3">
            <strong className={`${big} font-extrabold text-brand`}>{formatPrice(tier.promoRate)}</strong>
            <span className="text-xs text-slate-500">/mo</span>
            <p className="text-xs font-semibold text-slate-500">{promoLabel}</p>
          </div>
          <div className="min-w-0 whitespace-nowrap pl-3">
            <strong className={`${big} font-extrabold text-navy`}>{formatPrice(tier.webRate)}</strong>
            <span className="text-xs text-slate-500">/mo</span>
            <p className="text-xs font-semibold text-slate-500">{afterLabel}</p>
            {strike && <p className="text-xs text-slate-400 line-through">{formatPrice(tier.streetRate)}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <strong className={`${big} font-extrabold text-navy`}>{formatPrice(tier.webRate)}</strong>
      <span className="text-xs text-slate-500">/mo</span>
      {strike && <p className="text-xs text-slate-400 line-through">{formatPrice(tier.streetRate)}/mo</p>}
    </div>
  )
}
