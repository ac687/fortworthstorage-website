import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { money, type Estimate } from '../lib/estimate'
import { pushEvent } from '../lib/units'
import EstimateBody from './EstimateBody'

// "Estimated due today" on the checkout step, opened like "What's due today?" on the unit cards:
// a popover under the link on larger screens, a bottom sheet on phones. Closed, it is one line with the total.

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

export default function EstimatePopup({ estimate }: { estimate: Estimate }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (ev: Event) => {
      if (!wrap.current) return
      if (!ev.composedPath().includes(wrap.current)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) {
      setPhone(isPhone())
      pushEvent('checkout_estimate_open', {})
    }
    setOpen(!open)
  }

  const Chev = open ? ChevronUp : ChevronDown
  const body = (
    <>
      <div className="mb-1.5 flex items-center justify-between">
        <b className="text-base text-navy">Estimated due today</b>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="cursor-pointer rounded p-1 text-slate-500 hover:text-slate-800">
          <X size={18} />
        </button>
      </div>
      <EstimateBody estimate={estimate} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 w-full cursor-pointer rounded-full border border-slate-300 bg-white py-[10px] text-[15px] font-bold text-navy transition hover:bg-slate-50 sm:hidden"
      >
        Close
      </button>
    </>
  )

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${open ? 'border-brand/40 bg-brand-100/60' : 'border-brand-100 bg-brand-50 hover:bg-brand-100/60'}`}
      >
        <span className="text-sm font-bold text-navy">Estimated due today</span>
        <span className="inline-flex items-center gap-1.5 text-base font-bold text-navy">
          {money(estimate.total)}
          <Chev size={16} aria-hidden="true" />
        </span>
      </button>
      {open && !phone && (
        <div
          role="dialog"
          aria-label="Estimated due today"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(430px,92vw)] rounded-xl border border-slate-300 bg-white p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,.22)]"
        >
          <div className="absolute -top-[7px] right-12 h-3 w-3 rotate-45 border-l border-t border-slate-300 bg-white" />
          {body}
        </div>
      )}
      {open && phone && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Estimated due today">
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
