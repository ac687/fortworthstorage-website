import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fetchCart, estimateFromCart } from '../lib/cart'
import { money, moveInEstimate, todayAtFacility, type Estimate } from '../lib/estimate'
import type { Tier } from '../lib/units'
import { cardLabels, formatPrice, pushEvent } from '../lib/units'

// "What's due today?" on a unit card. Opens a popup under the link (a bottom sheet on phones).
// The numbers come from Monument's cart preview when it answers in time, otherwise from the built-in
// calculation. It is always labelled an estimate: taxes and the final total are calculated at checkout.

const cache = new Map<string, Estimate>()

async function loadEstimate(tier: Tier): Promise<Estimate> {
  const key = `${tier.unitGroupUuid}|${tier.promotionUuid ?? ''}`
  const hit = cache.get(key)
  if (hit) return hit
  let est: Estimate | null = null
  try {
    const items = await fetchCart(tier)
    const cartEst = estimateFromCart(items, tier)
    const t = todayAtFacility(new Date())
    const today = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
    const cartDate = (items.find((i) => i.category === 'RENT')?.dateDesiredMoveIn ?? '').slice(0, 10)
    if (cartEst && cartDate === today) est = cartEst
  } catch {
    // fall through to the built-in estimate
  }
  est = est ?? moveInEstimate(tier)
  if (est.source === 'cart') cache.set(key, est)
  return est
}

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

function afterLine(tier: Tier): string | null {
  const n = tier.promoMonths
  if (tier.promoRate === null || n === null) return null
  const { rentMonth } = cardLabels(tier)
  const price = tier.promoRate === 0 ? '$0' : `${formatPrice(tier.promoRate)}/mo`
  if (rentMonth.startsWith('Months 1 and')) {
    const first = 2
    const last = first + n - 1
    const when = n === 1 ? 'Month 2' : `Months ${first} to ${last}`
    return `${when} rent is ${price}. From month ${last + 1}, your rent is ${formatPrice(tier.webRate)}/mo.`
  }
  const last = n
  return `After month ${last}, your rent is ${formatPrice(tier.webRate)}/mo.`
}

export default function MoveInCost({ tier, multi = false, onRent }: { tier: Tier; multi?: boolean; onRent: () => void }) {
  const [open, setOpen] = useState(false)
  const [est, setEst] = useState<Estimate | null>(null)
  const [phone, setPhone] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let live = true
    setEst(null)
    loadEstimate(tier).then((e) => live && setEst(e))
    const onDown = (ev: Event) => {
      if (!wrap.current) return
      if (!ev.composedPath().includes(wrap.current)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      live = false
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, tier])

  const toggle = () => {
    if (!open) {
      setPhone(isPhone())
      pushEvent('move_in_cost_open', { promo: tier.promoName ?? 'none' })
    }
    setOpen(!open)
  }

  const Chev = open ? ChevronUp : ChevronDown
  const save = cardLabels(tier).save
  const after = afterLine(tier)

  const row = (label: React.ReactNode, value: React.ReactNode, tone = 'text-slate-700') => (
    <div className={`flex justify-between gap-3 py-[3px] text-sm ${tone}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap font-semibold">{value}</span>
    </div>
  )

  const body = (
    <>
      <div className="mb-1.5 flex items-center justify-between">
        <b className="text-base text-navy">What's due today?</b>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-m-2 cursor-pointer rounded p-3 text-slate-500 hover:text-slate-800">
          <X size={18} />
        </button>
      </div>
      {!est ? (
        <div className="space-y-2 py-2" aria-busy="true">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="h-4 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          {row(est.prorated ? `Rent, ${est.periodLabel}` : 'Monthly rent', money(est.rent).replace('.00', ''))}
          {est.promoDiscount > 0 && row(est.promoName || 'Promotion', `−${money(est.promoDiscount).replace('.00', '')}`, 'text-[#166534]')}
          {est.protection > 0 && row(`Protection plan ($${est.protectionCoverage.toLocaleString('en-US')} coverage)`, money(est.protection).replace('.00', ''))}
          {est.adminFee > 0 && row('Admin fee (one time)', money(est.adminFee).replace('.00', ''))}
          {est.prepay && (
            <>
              {row(`${est.prepay.monthName} rent (prepaid)`, money(est.prepay.rent).replace('.00', ''))}
              {est.prepay.promoDiscount > 0 && row(est.prepay.promoName || 'Promotion', `−${money(est.prepay.promoDiscount).replace('.00', '')}`, 'text-[#166534]')}
              {est.prepay.protection > 0 && row(`${est.prepay.monthName} protection (prepaid)`, money(est.prepay.protection).replace('.00', ''))}
            </>
          )}
          {row('Taxes', est.tax > 0 ? money(est.tax) : 'Calculated at checkout')}
          <div className="my-2 border-t border-slate-200" />
          <div className="flex justify-between text-[15px] font-extrabold text-navy">
            <span>Estimated due today*</span>
            <span>{money(est.total).replace('.00', '')}</span>
          </div>
          {after && <p className="mt-0.5 text-xs text-slate-500">{after}</p>}
          {tier.promoRequiresAutopay && tier.promoRate !== null && <p className="mt-0.5 text-xs text-slate-500">This offer requires autopay.</p>}
          {save !== null && save > 0 && (
            <div className="mt-2.5 rounded-lg bg-[#dcfce7] px-2.5 py-2 text-center text-[13px] font-bold text-[#166534]">Your savings with this offer: {formatPrice(save)}</div>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onRent()
            }}
            className="mt-3 w-full cursor-pointer rounded-full bg-cta py-[11px] text-[15px] font-bold text-white transition hover:bg-cta-hover"
          >
            Rent now
          </button>
          {multi && <p className="mt-2 text-[11.5px] leading-snug text-slate-500">Based on this size's lowest-priced option. You choose your exact unit next.</p>}
          <p className="mt-2.5 text-[11.5px] leading-snug text-slate-500">*Estimate only. Taxes and your final total are calculated at checkout.</p>
        </>
      )}
    </>
  )

  return (
    <div ref={wrap} className="relative text-center">
      <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[13px] -my-2 py-3 font-bold text-brand-dark underline hover:text-navy">
        What's due today? <Chev size={14} aria-hidden="true" />
      </button>
      {open && !phone && (
        <div role="dialog" aria-label="What's due today?" className="absolute left-1/2 top-[calc(100%+10px)] z-50 w-[min(350px,92vw)] -translate-x-1/2 rounded-xl lg:left-auto lg:right-0 lg:translate-x-0 border border-slate-300 bg-white p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,.22)]">
          <div className="absolute -top-[7px] left-1/2 -ml-1.5 h-3 w-3 lg:left-auto lg:right-12 lg:ml-0 rotate-45 border-l border-t border-slate-300 bg-white" />
          {body}
        </div>
      )}
      {open && phone && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="What's due today?">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="tu-sheet-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[18px] bg-white px-4 pb-5 pt-2 text-left shadow-2xl">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
            {body}
          </div>
        </div>
      )}
    </div>
  )
}
