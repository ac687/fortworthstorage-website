import { useLayoutEffect, useRef, useState } from 'react'
import type { Tier } from '../lib/units'
import { formatPrice, promoLabels } from '../lib/units'

// True when this tier's prices are wide enough (three digits, or cents) to need the smaller size.
export function needsSmallPrice(tier: Tier) {
  const rates = [tier.webRate, tier.promoRate ?? 0]
  return rates.some((r) => r >= 100 || r % 1 !== 0)
}

// Promo price for the first months, then the regular web rate.
// Falls back to a single price when there is no promotion.
// `small` lets the tier popup size every card the same when any one of them needs the smaller price.
// `stack` (with `onFit`) lets the popup stack all three cards together when any one of them is too narrow.
export default function Price({
  tier,
  compact = false,
  small = false,
  stack: stackAll,
  onFit,
}: {
  tier: Tier
  compact?: boolean
  small?: boolean
  stack?: boolean
  onFit?: (fits: boolean) => void
}) {
  const strike = tier.streetRate > tier.webRate
  // Three-digit prices and prices with cents ($36.50) are wider, so they step down to a smaller size.
  const big = compact || small || needsSmallPrice(tier) ? 'text-2xl' : 'text-3xl'
  // Labels come from the promotion's name; unknown durations stay generic.
  const { promo: promoLabel, after: afterLabel } = promoLabels(tier)
  const free = tier.promoRate === 0
  // Same height with or without a promotion, so boxes side by side (the tier popup's three columns) line up.
  // The unit card sets its own fixed box height, so the compact version needs none.
  const minH = compact ? '' : 'min-h-[120px]'

  // Tier popup only: the two prices sit side by side with a divider when they fit. When the card is too
  // narrow for these exact prices they stack instead of overlapping. A hidden copy measures the width needed.
  const wrapRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const [localStack, setLocalStack] = useState(false)
  const stack = stackAll ?? localStack
  const onFitRef = useRef(onFit)
  onFitRef.current = onFit
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (compact || !wrap) return
    const check = () => {
      const fits = (probeRef.current?.scrollWidth ?? 0) <= wrap.clientWidth
      setLocalStack(!fits)
      onFitRef.current?.(fits)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [compact, tier, small])

  if (tier.promoRate !== null) {
    const promoCol = (pad: string) => (
      <div className={`min-w-0 whitespace-nowrap ${pad}`}>
        {free ? (
          <strong className={`${big} font-extrabold text-brand`}>Free</strong>
        ) : (
          <>
            <strong className={`${big} font-extrabold text-brand`}>{formatPrice(tier.promoRate!)}</strong>
            <span className="text-xs text-slate-500">/mo</span>
          </>
        )}
        <p className="text-xs font-semibold text-slate-500">{promoLabel}</p>
      </div>
    )
    const regularCol = (pad: string) => (
      <div className={`min-w-0 whitespace-nowrap ${pad}`}>
        <strong className={`${big} font-extrabold text-navy`}>{formatPrice(tier.webRate)}</strong>
        <span className="text-xs text-slate-500">/mo</span>
        <p className="text-xs font-semibold text-slate-500">{afterLabel}</p>
        {strike && <p className="text-xs text-slate-400 line-through">{formatPrice(tier.streetRate)}</p>}
      </div>
    )
    const pill = (
      <span className="max-w-full rounded-full bg-brand-100 px-3 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-brand-dark">
        {tier.promoName}
      </span>
    )

    if (compact) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {pill}
          <div className="mt-2 grid grid-cols-2 divide-x divide-slate-200">
            {promoCol('pr-3')}
            {regularCol('pl-3')}
          </div>
        </div>
      )
    }
    return (
      <div ref={wrapRef} className={`relative flex flex-col items-center justify-center text-center ${minH}`}>
        {pill}
        <div
          className={`mt-2 grid ${stack ? 'grid-cols-1 gap-3' : 'grid-cols-[auto_auto] divide-x divide-slate-200'}`}
        >
          {promoCol(stack ? '' : 'pr-4')}
          {regularCol(stack ? '' : 'pl-4')}
        </div>
        <div ref={probeRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 grid h-0 grid-cols-[auto_auto] overflow-hidden">
          {promoCol('pr-4')}
          {regularCol('pl-4')}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${minH}`}>
      <div>
        <strong className={`${big} font-extrabold text-navy`}>{formatPrice(tier.webRate)}</strong>
        <span className="text-xs text-slate-500">/mo</span>
      </div>
      {strike && <p className="text-xs text-slate-400 line-through">{formatPrice(tier.streetRate)}/mo</p>}
    </div>
  )
}
