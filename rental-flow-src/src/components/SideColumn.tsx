import { useEffect, useRef, useState } from 'react'
import { Gift, LockKeyhole, Phone, Star } from 'lucide-react'
import { config } from '../config'
import type { FacilityInfo, Rating } from '../lib/units'
import { pushEvent } from '../lib/units'

// The desktop side column beside the unit list: Google reviews, rate lock, free disc lock, size help.
// It stays in view while the list scrolls (and stops at the end of the unit section), unless the screen is too
// short to show all of it, in which case it scrolls with the page. Rating and count are live from Google.
export function Stars({ className = 'size-4' }: { className?: string }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((n) => (
        <Star key={n} className={`${className} fill-current text-amber-500`} />
      ))}
    </span>
  )
}

const fmt = (n: number) => n.toFixed(1)

export default function SideColumn({ rating, facility, getTop }: { rating: Rating | null | undefined; facility: Partial<FacilityInfo>; getTop: () => number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pin, setPin] = useState(true)
  const [top, setTop] = useState(100)
  const shown = rating === undefined ? { rating: config.facility.rating, count: config.facility.reviewCount, url: null } : rating
  const phone = { display: facility.phoneDisplay ?? config.facility.phoneDisplay, href: facility.phoneHref ?? config.facility.phoneHref }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const t = getTop()
      setTop(t)
      setPin(el.offsetHeight + t + 16 <= window.innerHeight)
    }
    check()
    window.addEventListener('resize', check)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      window.removeEventListener('resize', check)
      ro.disconnect()
    }
  }, [getTop])

  return (
    <aside aria-label="Reviews and what's included" className="hidden min-[1180px]:block">
      <div ref={ref} className={`flex flex-col gap-3 ${pin ? 'sticky' : ''}`} style={pin ? { top } : undefined}>
        <section className="rounded-2xl border border-[#D5DBE6] bg-white p-4">
          {shown && (
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-extrabold leading-none text-navy">{fmt(shown.rating)}</span>
              <div>
                <Stars />
                <p className="text-xs font-semibold text-[#475569]">{shown.count} Google reviews</p>
              </div>
            </div>
          )}
          {config.reviews.map((r) => (
            <figure key={r.name} className="mt-3 border-t border-[#D5DBE6] pt-3">
              <blockquote className="text-sm leading-snug text-slate-800">"{r.text}"</blockquote>
              <figcaption className="mt-1 text-xs font-semibold text-[#475569]">
                {r.name}
                {r.date ? `, ${r.date}` : ''}
              </figcaption>
            </figure>
          ))}
          {shown?.url && (
            <a href={shown.url} target="_blank" rel="noopener" onClick={() => pushEvent('read_all_reviews_click')} className="mt-3 inline-block text-[13px] font-bold text-brand-dark underline hover:text-navy">
              Read all reviews
            </a>
          )}
        </section>

        {config.rateLock.enabled && (
          <section className="rounded-2xl bg-navy p-4 text-white">
            <p className="flex items-center gap-2 font-display text-base font-bold">
              <LockKeyhole size={18} aria-hidden="true" />
              {config.rateLock.panelTitle}
            </p>
            <p className="mt-1 text-sm leading-snug text-slate-200">{config.rateLock.panelText}</p>
          </section>
        )}

        {config.discLock.enabled && (
          <section className="rounded-2xl border border-[#D5DBE6] bg-white p-4">
            <p className="flex items-center gap-2 font-display text-base font-bold text-[#166534]">
              <Gift size={18} aria-hidden="true" />
              {config.discLock.panelTitle}
            </p>
            <p className="mt-1 text-sm leading-snug text-slate-700">{config.discLock.panelText}</p>
          </section>
        )}

        <section className="rounded-2xl border border-[#D5DBE6] bg-brand-50 p-4">
          <p className="font-display text-base font-bold text-navy">Not sure which size?</p>
          <p className="mt-1 text-sm text-slate-700">
            <a href={config.sizeGuidePath} target="_blank" rel="noopener" onClick={() => pushEvent('size_guide_click')} className="font-bold text-brand-dark underline hover:text-navy">
              See the size guide
            </a>{' '}
            or call us.
          </p>
          <a href={phone.href} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-dark no-underline hover:text-navy">
            <Phone size={14} aria-hidden="true" />
            {phone.display}
          </a>
        </section>
      </div>
    </aside>
  )
}
