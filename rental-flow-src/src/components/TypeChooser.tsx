import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { config } from '../config'
import type { UnitOption } from '../lib/units'
import { accessLabel, formatPrice, promoLabels, typeLabel } from '../lib/units'

type Props = {
  size: string // "10x10"
  units: UnitOption[] // one option per unit type for that size
  allowWaitlist?: boolean
  onClose: () => void
  onChoose: (unit: UnitOption) => void
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '')

const DEFAULT_BULLETS: Record<string, string[]> = {
  'drive-up': ['Pull right up to your door', 'Easy for furniture, vehicles and gear'],
  'temperature-controlled': ['Heated and cooled indoor hallway', 'Best for electronics, documents and keepsakes'],
}

function bulletsFor(unit: UnitOption): string[] {
  const key = Object.keys(config.typeBullets).find((k) => norm(k) === norm(unit.unitType))
  if (key) return config.typeBullets[key]
  return DEFAULT_BULLETS[unit.category] ?? []
}

// Cheapest way in: the lowest promo price when any tier has a promotion, otherwise the lowest web rate.
function PriceBadge({ unit }: { unit: UnitOption }) {
  const promoTiers = unit.tiers.filter((t) => t.promoRate !== null && t.available > 0)
  const best = promoTiers.sort((a, b) => (a.promoRate ?? 0) - (b.promoRate ?? 0))[0]
  if (!best || best.promoRate === null) {
    return (
      <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-navy">
        Starting from {formatPrice(unit.fromTier.webRate)}/mo
      </span>
    )
  }
  const { promo: promoLabel } = promoLabels(best)
  const first = best.promoRate === 0 ? 'Free' : `${formatPrice(best.promoRate)}/mo`
  return (
    <div>
      <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-navy">
        {best.promoRate === 0 ? '' : 'From '}<strong className="text-sm font-extrabold text-brand">{first}</strong> · {promoLabel.toLowerCase()}
      </span>
      <p className="mt-1.5 text-xs text-slate-500">
        then {formatPrice(best.webRate)}/mo{best.streetRate > best.webRate && <span className="ml-1 line-through text-slate-400">{formatPrice(best.streetRate)}</span>}
      </p>
    </div>
  )
}

// Shown when a size-guide button is clicked for a size that comes in more than one
// unit type. Picking a type continues to that type's tier popup (or, if the type is
// sold out, straight to its waitlist).
export default function TypeChooser({ size, units, allowWaitlist = true, onClose, onChoose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [w, d] = size.split('x')

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

  const cols = units.length === 2 ? 'sm:grid-cols-2' : units.length >= 3 ? 'sm:grid-cols-3' : ''

  return (
    <div className="fixed inset-0 z-[2147483000] grid place-items-center bg-navy/65 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tu-type-title"
        className="tu-root max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl outline-none sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="tu-type-title" className="font-display text-2xl font-bold text-navy sm:text-3xl">
              Choose Your {w}' x {d}' Unit Type
            </h2>
            <p className="mt-1 text-sm text-slate-500">Same size, different access. Pick what suits your stuff.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className={`grid items-stretch gap-4 ${cols}`}>
          {units.map((unit) => {
            const soldOut = unit.totalAvailable <= 0
            const temp = unit.category === 'temperature-controlled'
            const title = temp ? typeLabel(unit.category, unit.unitType) : accessLabel(unit.category, unit.unitType)
            const sub = temp ? accessLabel(unit.category, unit.unitType) : null
            const bullets = bulletsFor(unit)
            return (
              <div key={unit.key} className="flex flex-col rounded-xl border border-slate-300 p-5">
                <div className="mb-3">
                  {soldOut ? (
                    <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">Sold out</span>
                  ) : (
                    <PriceBadge unit={unit} />
                  )}
                </div>
                <h3 className="font-display text-xl font-bold text-navy">{title}</h3>
                {sub && <p className="text-xs text-slate-500">{sub}</p>}
                <ul className="my-4 flex flex-1 flex-col gap-2 text-sm text-slate-800">
                  {bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <Check className="mt-0.5 shrink-0 text-brand" size={16} aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                {soldOut && !allowWaitlist ? (
                  <span className="rounded-full bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">Sold out</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChoose(unit)}
                    className={
                      soldOut
                        ? 'cursor-pointer rounded-full border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                        : 'cursor-pointer rounded-full bg-cta px-4 py-3 text-sm font-bold text-white hover:bg-cta-hover'
                    }
                  >
                    {soldOut ? 'Join Waitlist' : `Choose ${typeLabel(unit.category, unit.unitType)}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
