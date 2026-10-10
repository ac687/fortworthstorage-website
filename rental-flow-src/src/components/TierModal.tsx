import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Tier, UnitOption } from '../lib/units'
import { availabilityBadge, typeLabel, withoutPromo } from '../lib/units'
import type { CheckoutMode } from '../config'
import Price, { needsSmallPrice } from './Price'
import TierAccordion from './TierAccordion'

// Same breakpoint as Tailwind's `lg`: three side-by-side cards from here up, the accordion below.
function useDesktop() {
  const query = '(min-width: 1024px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const update = () => setDesktop(m.matches)
    m.addEventListener('change', update)
    update()
    return () => m.removeEventListener('change', update)
  }, [])
  return desktop
}

type Props = {
  unit: UnitOption
  mode: 'rent' | 'reserve'
  allowWaitlist?: boolean
  onClose: () => void
  onChoose: (tier: Tier, mode: CheckoutMode) => void
}

export default function TierModal({ unit, mode, allowWaitlist = true, onClose, onChoose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const desktop = useDesktop()

  // Esc closes; focus the dialog; lock page scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prev
    }
  }, [onClose])

  const cols = unit.tiers.length >= 3 ? 'lg:grid-cols-3' : unit.tiers.length === 2 ? 'lg:grid-cols-2' : ''
  // The waitlist is only offered when every tier is sold out. If any tier has
  // units, a sold-out tier is just shown as sold out so people pick what is open.
  const anyAvailable = unit.tiers.some((t) => t.available > 0)
  // One price size across the row: if any tier needs the smaller size, all of them use it.
  // Every card stacks its prices together if any one of them is too narrow for side by side.
  const [fits, setFits] = useState<Record<string, boolean>>({})
  const reportFit = (name: string, ok: boolean) => setFits((prev) => (prev[name] === ok ? prev : { ...prev, [name]: ok }))
  const stackRow = Object.values(fits).some((ok) => !ok)
  const anySmall = unit.tiers.some((t) => t.available > 0 && needsSmallPrice(t))

  return (
    <div className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-navy/65 pt-3 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tu-tier-title"
        className="tu-root flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:max-h-[90vh] sm:rounded-2xl sm:p-8 lg:block lg:overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4 lg:mb-6">
          <div>
            <p className="hidden text-xs font-bold uppercase tracking-[0.2em] text-slate-500 sm:block">Select your location</p>
            <h2 id="tu-tier-title" className="sm:mt-1 font-display text-xl font-bold text-navy sm:text-3xl">
              Choose Your {unit.width}' x {unit.depth}' {typeLabel(unit.category, unit.unitType)} Unit
            </h2>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">Upgrade for closer access, flexible terms, and maximum convenience.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {!desktop ? (
          <TierAccordion unit={unit} mode={mode} allowWaitlist={allowWaitlist} onChoose={onChoose} />
        ) : (
        <div className={`grid items-stretch gap-4 ${cols}`}>
          {unit.tiers.map((tier) => {
            const badge = availabilityBadge(tier.available)
            const soldOut = tier.available <= 0
            // Sold out while other tiers are open: greyed out, no waitlist.
            const unavailable = soldOut && anyAvailable
            // A sold-out tier doesn't get the "Most popular" highlight.
            const highlight = tier.highlight && !unavailable
            const checkoutMode: CheckoutMode = soldOut ? 'waitlist' : mode === 'reserve' ? 'reserve' : 'tenant'
            const cta = soldOut ? 'Join Waitlist' : `Select ${tier.name}`
            return (
              <div
                key={tier.unitGroupUuid}
                aria-disabled={unavailable || undefined}
                className={`relative flex flex-col rounded-xl border p-5 ${
                  highlight ? 'border-4 border-navy shadow-2xl md:-mt-3 md:mb-3' : unavailable ? 'border-slate-300 bg-slate-50' : 'border-slate-300'
                }`}
              >
                {highlight && (
                  <div className="-mx-5 -mt-5 mb-5 rounded-t-lg bg-navy px-4 py-2 text-center text-xs font-bold tracking-widest text-white">MOST POPULAR</div>
                )}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {unavailable ? (
                    <span className="w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Sold out</span>
                  ) : (
                    <>
                      {tier.label && !tier.highlight && <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-navy">{tier.label}</span>}
                      {badge && (
                        <span className={`w-fit rounded px-2 py-0.5 text-xs font-bold ${badge.tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{badge.text}</span>
                      )}
                    </>
                  )}
                </div>
                <h3 className={`font-display text-xl font-bold ${unavailable ? 'text-slate-500' : 'text-navy'}`}>{tier.name}</h3>
                {tier.copy && <p className="mt-1 text-sm text-slate-500">{tier.copy}</p>}
                {unavailable ? (
                  <div className="my-5 flex min-h-[120px] flex-col items-center justify-center text-center">
                    <strong className="text-3xl font-bold text-slate-500">Sold out</strong>
                    <p className="mt-1 text-xs text-slate-500">No units available in this tier</p>
                  </div>
                ) : (
                  <div className="my-5">
                    <Price tier={soldOut ? withoutPromo(tier) : tier} small={anySmall} stack={stackRow} onFit={(fits) => reportFit(tier.name, fits)} />
                  </div>
                )}
                <ul className={`flex flex-1 flex-col gap-3 text-sm ${unavailable ? 'text-slate-500' : 'text-slate-800'}`}>
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className={`mt-0.5 shrink-0 ${unavailable ? 'text-slate-400' : 'text-brand'}`} size={16} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                {unavailable ? (
                  <button type="button" disabled className="mt-6 cursor-not-allowed rounded-full bg-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-500">
                    Sold out
                  </button>
                ) : soldOut && !allowWaitlist ? (
                  <span className="mt-6 rounded-full bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">Sold out</span>
                ) : (
                <button
                  type="button"
                  onClick={() => onChoose(tier, checkoutMode)}
                  className={
                    soldOut
                      ? 'mt-6 cursor-pointer rounded-full border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      : 'mt-6 cursor-pointer rounded-full bg-cta px-4 py-3 text-sm font-bold text-white hover:bg-cta-hover'
                  }
                >
                  {cta}
                </button>
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
