import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Phone } from 'lucide-react'
import type { FacilityInfo, Tier, UnitOption } from '../lib/units'
import { formatPrice, promoLabels, typeLabel } from '../lib/units'
import { moveInEstimate, todayAtFacility, type Estimate } from '../lib/estimate'
import { estimateFromCart, fetchCart } from '../lib/cart'
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
  // The built-in calculation shows right away; Monument's own cart preview replaces it when it
  // arrives (and is what the page shows from then on). If the preview fails, the calculation stays.
  const calcEstimate = useMemo(() => (mode === 'tenant' ? moveInEstimate(tier) : null), [mode, tier])
  const [cartEstimate, setCartEstimate] = useState<Estimate | null>(null)
  useEffect(() => {
    setCartEstimate(null)
    if (mode !== 'tenant' || !config.estimate.cartPath) return
    let live = true
    fetchCart(tier)
      .then((items) => {
        if (!live) return
        const est = estimateFromCart(items, tier)
        // The cart must be for today at the facility. If Monument used another day, don't show it.
        const t = todayAtFacility(new Date())
        const today = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
        const cartDate = (items.find((i) => i.category === 'RENT')?.dateDesiredMoveIn ?? '').slice(0, 10)
        if (debug) addDebug(`move-in date: sent ${today} | cart used ${cartDate || '?'}${cartDate === today ? '' : '  <-- DIFFERENT, cart ignored'}`)
        if (est && cartDate !== today) return
        if (!est) {
          if (debug) addDebug('cart preview: no usable rent line, using the built-in calculation')
          return
        }
        setCartEstimate(est)
        if (debug) {
          const calc = moveInEstimate(tier)
          const same = Math.round(est.total * 100) === Math.round(calc.total * 100)
          addDebug(`cart preview: total ${est.total.toFixed(2)} | built-in ${calc.total.toFixed(2)} | ${same ? 'MATCH' : 'DIFFERENT'}`)
          // Line by line, cart vs built-in, so any difference is easy to find.
          const c2 = (n: number) => n.toFixed(2).padStart(9)
          const lines: [string, number, number][] = [
            ['rent (today)', est.rent, calc.rent],
            ['promo (today)', -est.promoDiscount, -calc.promoDiscount],
            ['protection (today)', est.protection, calc.protection],
            ['admin fee', est.adminFee, calc.adminFee],
            ['tax', est.tax, calc.tax],
            ['prepaid rent', est.prepay?.rent ?? 0, calc.prepay?.rent ?? 0],
            ['prepaid promo', -(est.prepay?.promoDiscount ?? 0), -(calc.prepay?.promoDiscount ?? 0)],
            ['prepaid protection', est.prepay?.protection ?? 0, calc.prepay?.protection ?? 0],
            ['TOTAL', est.total, calc.total],
          ]
          addDebug(`line items:  ${'cart'.padStart(9)} ${'built-in'.padStart(9)} ${'diff'.padStart(9)}`)
          for (const [name, a, b] of lines) {
            const diff = Math.round((a - b) * 100) / 100
            addDebug(`${name.padEnd(19)}${c2(a)} ${c2(b)} ${diff === 0 ? '        -' : c2(diff)}${diff === 0 ? '' : '  <-- differs'}`)
          }
          addDebug(`days: cart ${est.prorated ? `${est.daysLeft}/${est.daysInMonth}` : 'not prorated'} | built-in ${calc.prorated ? `${calc.daysLeft}/${calc.daysInMonth}` : 'not prorated'} | billing: cart ${est.dueDay ? 'anniversary' : 'first-of-month'}, built-in ${config.estimate.billingMode}`)
          addDebug(`unit: web ${tier.webRate} | street ${tier.streetRate} | promo price ${tier.promoRate ?? '-'} (discount ${tier.promoRate !== null ? (tier.webRate - tier.promoRate).toFixed(2) : '-'}/mo) | promo months ${tier.promoMonths ?? '?'} | first-full-month ${tier.promoFirstFullMonth} | promo "${tier.promoName ?? '-'}"`)
          addDebug(`cart: full-month rent ${items.find((i) => i.category === 'RENT')?.preProrationAmountInPennies ?? '?'}c | protection/mo ${items.find((i) => i.category === 'COVERAGE')?.fixedFeeAmount ?? '?'}c (built-in assumes ${config.estimate.protectionMonthly * 100}c) | promo ${items.find((i) => i.promotion)?.promotion?.discountAmountInPennies ?? 0}c ${items.find((i) => i.promotion)?.promotion?.discountType ?? ''}`)
          addDebug(`cart preview: ${items.map((i) => `${i.billingPeriod}:${i.category}:${i.invoiceGenerationType ?? '-'}:${i.amountInPennies}${i.promotion ? `-${i.promotion.discountAmountInPennies}` : ''}+tax${i.taxAmountInPennies}`).join('  ')}`)
        }
      })
      .catch((err) => {
        if (live && debug) addDebug(`cart preview failed (${err instanceof Error ? err.message : String(err)}), using the built-in calculation`)
      })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tier.unitGroupUuid, tier.promotionUuid])
  const estimate = cartEstimate ?? calcEstimate
  const src = monumentCheckoutUrl(tier.unitGroupUuid, mode)
  const sizeInfo = config.sizeInfo[`${unit.width}x${unit.depth}`]

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
                    <b className="text-brand">{tier.promoRate === 0 ? 'Free' : `${formatPrice(tier.promoRate)}/mo`}</b>{' '}
                    {/* Same duration the unit cards show; unknown durations stay generic. */}
                    {promoLabels(tier).sentence}{' '}
                    <b className="text-navy">{formatPrice(tier.webRate)}/mo</b>
                  </>
                ) : (
                  <b className="text-navy">{formatPrice(tier.webRate)}/mo</b>
                )}
              </p>
            </div>
            {!estimate && <p className="mt-2 text-xs text-slate-500">Your final total, including any fees, taxes and protection plan, is shown below before you pay.</p>}
            {estimate && !estimateDone && sizeInfo && (
              // Desktop only: fills the space beside the estimate without pushing the estimate down on phones.
              <div className="mt-5 hidden md:block">
                {sizeInfo.summary && <p className="text-sm text-slate-600">{sizeInfo.summary}</p>}
                {sizeInfo.fits.length > 0 && (
                  <>
                    <p className="mt-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">What fits</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {sizeInfo.fits.map((f) => (
                        <li key={f} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-[13px] text-navy">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-4 text-[13px] text-slate-600">
                  Not sure it fits?{' '}
                  <a href={config.sizeGuidePath} target="_blank" rel="noopener" className="font-semibold text-brand underline hover:text-brand-dark">
                    See the size guide
                  </a>
                  .
                </p>
              </div>
            )}
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
