import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Lock, LockOpen, Phone, Star } from 'lucide-react'
import { config } from '../config'
import { facilityClock, formatWindow, isOpenNow } from '../lib/hours'
import type { FacilityInfo, Rating } from '../lib/units'

// A grey placeholder bar, shown while the facility's name/address/phone load from
// Monument, so no other facility's saved details ever flash on screen.
const Bar = ({ w, h = 'h-4' }: { w: string; h?: string }) => (
  <span className={`block animate-pulse rounded bg-slate-200 ${w} ${h}`} aria-hidden="true" />
)

// rating: undefined = use the saved values (static data); null = hide; object = live Google rating.
type Props = { info?: Partial<FacilityInfo>; infoReady?: boolean; phoneReady?: boolean; rating?: Rating | null }

export default function FacilityHeader({ info = {}, infoReady = true, phoneReady = true, rating }: Props) {
  // Name and address come from Monument when available; the rest is from config.
  const f = { ...config.facility, ...info }
  const shownRating = rating === undefined ? { rating: f.rating, count: f.reviewCount, url: null } : rating
  // Google shows one decimal, e.g. 4.8.
  const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n))
  // Re-check the gate status every 30 seconds so the pill flips on its own.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  const gateOpen = isOpenNow(now, f.timeZone, f.gateHours)
  const [i, setI] = useState(0)
  const go = (d: number) => setI((n) => (n + d + f.photos.length) % f.photos.length)

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid md:min-h-[320px] md:grid-cols-[1.25fr_1fr]">
        <div className="relative h-56 overflow-hidden bg-brand-50 sm:h-72 md:h-auto">
          {f.photos.map((p, n) => (
            <img
              key={p.src}
              src={p.src}
              alt={p.alt}
              loading={n === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${n === i ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          {f.photos.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/95 text-navy shadow hover:bg-white">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/95 text-navy shadow hover:bg-white">
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {f.photos.map((p, n) => (
                  <span key={p.src} className={`size-2 rounded-full ${n === i ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div>
            {infoReady ? <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{f.name}</p> : <Bar w="w-32" h="h-3" />}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {infoReady ? <h2 className="font-display text-2xl font-bold text-navy">{f.street}</h2> : <Bar w="w-56" h="h-7" />}
              {shownRating &&
                (() => {
                  const chip = (
                    <>
                      <Star className="size-3.5 fill-current text-amber-500" aria-hidden="true" />
                      {fmt(shownRating.rating)} ({shownRating.count} Google reviews)
                    </>
                  )
                  const cls = 'inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-navy'
                  return shownRating.url ? (
                    <a href={shownRating.url} target="_blank" rel="noopener" className={`${cls} hover:bg-brand-100`}>
                      {chip}
                    </a>
                  ) : (
                    <span className={cls}>{chip}</span>
                  )
                })()}
            </div>
            {infoReady ? <p className="text-sm text-slate-500">{f.cityLine}</p> : <Bar w="w-40" />}
            {phoneReady ? (
              <a href={f.phoneHref} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark">
                <Phone size={14} aria-hidden="true" />
                {f.phoneDisplay}
              </a>
            ) : (
              <span className="mt-2 block"><Bar w="w-28" /></span>
            )}
          </div>
          <div className="grid gap-3 border-y border-slate-200 py-3 text-sm">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="font-semibold text-navy">Gate Access Hours</h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-2.5 text-[13px] font-semibold ${
                    gateOpen ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'
                  }`}
                >
                  {gateOpen ? <LockOpen size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
                  {gateOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
              <p className="text-slate-600">{formatWindow(f.gateHours)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-navy">Customer Service Hours</h3>
              <p className="text-slate-600">{formatWindow(f.supportHours)}</p>
            </div>
            <p className="text-xs text-slate-500">Facility time: {facilityClock(now, f.timeZone)}</p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-navy">Amenities</h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600">
              {f.amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
