import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Phone } from 'lucide-react'
import type { FacilityInfo, Tier, UnitOption } from '../lib/units'
import { formatPrice, typeLabel } from '../lib/units'
import { moveInEstimate } from '../lib/estimate'
import EstimateCard from './EstimateCard'
import { config, monumentCheckoutUrl, type CheckoutMode } from '../config'

type Props = {
  unit: UnitOption
  tier: Tier
  mode: CheckoutMode
  onBack: () => void
  scrollToTop: () => void
  facility?: Partial<FacilityInfo>
}

const modeTitle: Record<CheckoutMode, string> = {
  tenant: 'Rent your unit',
  reserve: 'Reserve your unit',
  waitlist: 'Join the waitlist',
}

export default function CheckoutPanel({ unit, tier, mode, onBack, scrollToTop, facility = {} }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(1000)
  const [estimateCollapsed, setEstimateCollapsed] = useState(false)
  // Monument shows its own cart once the details form is done, so the estimate goes away then.
  const [estimateDone, setEstimateDone] = useState(false)
  // Add ?tudebug=1 to the page address to see every message Monument sends to the
  // page (console + a log under the checkout). Off by default; changes nothing else.
  const debug = useMemo(() => new URLSearchParams(window.location.search).has('tudebug'), [])
  const [debugLog, setDebugLog] = useState<string[]>([])
  const startedAt = useRef(Date.now())
  const addDebug = (line: string) => {
    const t = ((Date.now() - startedAt.current) / 1000).toFixed(1).padStart(5)
    console.log('[tu-debug]', t + 's', line)
    setDebugLog((l) => [...l.slice(-199), `${t}s  ${line}`])
  }
  // Only a same-day rental has something due today. Reserve and waitlist don't.
  const estimate = useMemo(() => (mode === 'tenant' ? moveInEstimate(tier) : null), [mode, tier])
  const src = monumentCheckoutUrl(tier.unitGroupUuid, mode)

  // Monument talks to the parent page with postMessage:
  //  - a number      → new content height for the iframe
  //  - "RESET_TO_TOP" → moved to another step; scroll back to the top 
  //  - {popupOpen}   → opened a popup (e.g. payment); scroll to the top
  //  - {event, ...}  → analytics event; forward it to Google Tag Manager
  //                    ("info_provided" also hides the estimate: Monument's cart takes over)
  useEffect(() => {
    const mountedAt = Date.now()
    function onMessage(e: MessageEvent) {
      if (debug && e.source === iframeRef.current?.contentWindow) {
        let body: string
        try {
          body = JSON.stringify(e.data) ?? String(e.data)
        } catch {
          body = String(e.data)
        }
        addDebug(`message from ${e.origin}: ${body}`)
      }
      if (!config.monument.trustedOrigins.includes(e.origin)) return
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      const d = e.data
      if (d === 'RESET_TO_TOP' || (d && typeof d === 'object' && d.popupOpen)) {
        // Ignore the reset Monument sends while first loading, so the page doesn't jump.
        if (Date.now() - mountedAt > 1500) scrollToTop()
        return
      }
      if (d && typeof d === 'object' && typeof d.event === 'string') {
        // "info_provided" is sent when the last details step is submitted and Monument's
        // own cart appears (seen in the tudebug log; "lead_generated" comes earlier, mid-form).
        if (d.event === 'info_provided') setEstimateDone(true)
        const w = window as unknown as { dataLayer?: unknown[] }
        w.dataLayer = w.dataLayer || []
        w.dataLayer.push(d)
        return
      }
      const h = Number(d)
      if (d !== '' && d !== null && !Number.isNaN(h) && h > 0) setHeight(Math.ceil(h))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [scrollToTop])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark">
          <ArrowLeft size={16} aria-hidden="true" /> Choose a different unit
        </button>
        <a href={facility.phoneHref || config.facility.phoneHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy">
          <Phone size={14} aria-hidden="true" /> Questions? {facility.phoneDisplay || config.facility.phoneDisplay}
        </a>
      </div>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Your selection">
        <div className={estimate && !estimateDone ? 'grid gap-4 md:grid-cols-2 md:items-start md:gap-6' : ''}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{modeTitle[mode]}</p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 className="font-display text-xl font-bold text-navy sm:text-2xl">
                {unit.width}' x {unit.depth}' {typeLabel(unit.category, unit.unitType)}
              </h2>
              <p className="text-sm text-slate-700">
                {tier.promoRate !== null ? (
                  <>
                    <b className="text-brand">{formatPrice(tier.promoRate)}/mo</b> for months 1–2, then <b className="text-navy">{formatPrice(tier.webRate)}/mo</b>
                  </>
                ) : (
                  <b className="text-navy">{formatPrice(tier.webRate)}/mo</b>
                )}
              </p>
            </div>
            {!estimate && <p className="mt-2 text-xs text-slate-500">Your final total, including any fees, taxes and protection plan, is shown below before you pay.</p>}
          </div>
          {estimate && !estimateDone && <EstimateCard estimate={estimate} collapsed={estimateCollapsed} onToggle={() => setEstimateCollapsed((c) => !c)} />}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <iframe
          ref={iframeRef}
          id="locationiFrame"
          key={src}
          src={src}
          title={`${modeTitle[mode]} at ${facility.name || config.facility.name}`}
          allow="geolocation; payment"
          scrolling="no"
          onLoad={debug ? () => addDebug('iframe load event') : undefined}
          className="block w-full border-0"
          style={{ height }}
        />
      </div>

      {debug && (
        <section className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-label="Debug log">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-amber-900">Debug: messages from Monument (tudebug)</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(debugLog.join('\n'))}
              className="cursor-pointer rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Copy log
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-800">{debugLog.length ? debugLog.join('\n') : 'Waiting for messages…'}</pre>
        </section>
      )}
    </div>
  )
}
