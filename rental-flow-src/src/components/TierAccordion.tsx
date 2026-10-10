import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Tier, UnitOption } from '../lib/units'
import { availabilityBadge, formatPrice, promoLabels, withoutPromo } from '../lib/units'
import type { CheckoutMode } from '../config'

type Props = {
  unit: UnitOption
  mode: 'rent' | 'reserve'
  allowWaitlist: boolean
  onChoose: (tier: Tier, mode: CheckoutMode) => void
}

// Which tier starts selected: the "most popular" (middle) tier when it has units, else the
// middle one, else the first tier that still has units. Never a sold-out tier while others are open.
function startingIndex(tiers: Tier[]): number {
  const open = tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.available > 0)
  const popular = tiers.findIndex((t) => t.highlight)
  const middle = popular >= 0 ? popular : Math.floor(tiers.length / 2)
  if (!open.length) return middle
  return (open.find(({ i }) => i === middle) ?? open[0]).i
}

// Phones and tablets: one row per tier. The selected tier opens to show what it includes,
// and one button at the bottom continues with it. Desktop keeps the three side-by-side cards.
export default function TierAccordion({ unit, mode, allowWaitlist, onChoose }: Props) {
  const { tiers } = unit
  const [sel, setSel] = useState(() => startingIndex(tiers))
  const anyAvailable = tiers.some((t) => t.available > 0)
  const chosen = tiers[sel]
  const chosenSoldOut = chosen.available <= 0
  const checkoutMode: CheckoutMode = chosenSoldOut ? 'waitlist' : mode === 'reserve' ? 'reserve' : 'tenant'
  const cantContinue = chosenSoldOut && !allowWaitlist
  const cta = chosenSoldOut ? (allowWaitlist ? 'Join Waitlist' : 'Sold out') : `Continue with ${chosen.name}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="radiogroup" aria-labelledby="tu-tier-title" className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-2">
        {tiers.map((raw, i) => {
          const soldOut = raw.available <= 0
          // Sold out while other tiers are open: greyed out and not selectable, no waitlist.
          const unavailable = soldOut && anyAvailable
          // A sold-out tier shows its regular price only.
          const tier = soldOut ? withoutPromo(raw) : raw
          const selected = i === sel
          const badge = availabilityBadge(raw.available)
          const promo = tier.promoRate !== null
          const free = tier.promoRate === 0
          const labels = promoLabels(tier)
          const strike = tier.streetRate > tier.webRate
          const bigPrice = promo ? (free ? 'Free' : formatPrice(tier.promoRate!)) : formatPrice(tier.webRate)
          return (
            <div
              key={tier.unitGroupUuid}
              className={`rounded-xl px-3.5 ${
                selected ? 'border-2 border-brand bg-white pb-3' : unavailable ? 'border border-slate-300 bg-slate-50' : 'border border-slate-300 bg-white'
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={unavailable}
                onClick={() => setSel(i)}
                className="flex min-h-[72px] w-full py-2 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-navy' : unavailable ? 'border-slate-300' : 'border-slate-400'}`}
                >
                  {selected && <span className="size-2.5 rounded-full bg-navy" />}
                </span>

                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`font-display text-lg font-bold leading-tight ${unavailable ? 'text-slate-500' : 'text-navy'}`}>{tier.name}</span>
                    {!unavailable && tier.label && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-navy">{tier.label}</span>
                    )}
                  </span>
                  {unavailable ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">Sold out</span>
                  ) : (
                    badge && (
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${badge.tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {badge.text}
                      </span>
                    )
                  )}
                  {promo && selected && (
                    <span className="rounded-md bg-brand-100 px-2 py-1 text-xs font-semibold leading-tight text-brand-dark">{tier.promoName}</span>
                  )}
                </span>

                {!unavailable && (
                  <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap text-right">
                    <span className={`text-xs ${promo ? 'font-semibold text-navy' : 'font-medium text-slate-500'}`}>{promo ? labels.promo : 'Regular rate'}</span>
                    <span className={`font-display text-2xl font-extrabold leading-none ${promo ? 'text-brand' : 'text-navy'}`}>{bigPrice}</span>
                    {promo ? (
                      <span className="text-xs text-slate-500">then {formatPrice(tier.webRate)}/mo</span>
                    ) : strike ? (
                      <span className="text-xs text-slate-400 line-through">{formatPrice(tier.streetRate)}/mo</span>
                    ) : (
                      <span className="text-xs text-slate-500">per month</span>
                    )}
                  </span>
                )}
              </button>

              {selected && (
                <div className="pl-8">
                  {tier.copy && <p className="hidden text-sm text-slate-500 sm:block">{tier.copy}</p>}
                  {tier.features.length > 0 && (
                    <ul className={`flex flex-col gap-2 text-sm text-slate-800 ${tier.copy ? 'sm:mt-3' : ''}`}>
                      {tier.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <Check className="mt-0.5 shrink-0 text-brand" size={16} aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {promo && tier.promoFirstFullMonth && (
                    <p className="mt-2.5 border-t border-slate-200 pt-2.5 text-xs text-slate-500">
                      Move-in month is prorated at the regular rate.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-slate-200 pb-[env(safe-area-inset-bottom)] pt-3">
        <button
          type="button"
          disabled={cantContinue}
          onClick={() => onChoose(chosen, checkoutMode)}
          className={
            cantContinue
              ? 'w-full cursor-not-allowed rounded-full bg-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-500'
              : chosenSoldOut
                ? 'w-full cursor-pointer rounded-full border-2 border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                : 'w-full cursor-pointer rounded-full bg-cta px-4 py-3 text-center text-sm font-bold text-white hover:bg-cta-hover'
          }
        >
          {cta}
        </button>
      </div>
    </div>
  )
}
