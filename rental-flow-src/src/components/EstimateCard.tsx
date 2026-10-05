import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { money, type Estimate } from '../lib/estimate'

type Props = {
  estimate: Estimate
  collapsed: boolean
  onToggle: () => void
}

// "Estimated due today" box shown above Monument's iframe.
export default function EstimateCard({ estimate: e, collapsed, onToggle }: Props) {
  const bodyId = useId()
  const row = 'flex items-start justify-between gap-4 py-1 text-sm'
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3" role="group" aria-label="Estimated cost due today">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-bold text-navy">Estimated due today</span>
        <span className="inline-flex items-center gap-1.5 text-base font-bold text-navy">
          {collapsed && money(e.total)}
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </span>
      </button>

      <div id={bodyId} hidden={collapsed} className="mt-2 border-t border-brand-100 pt-2">
        <div className={row}>
          <span className="text-slate-600">
            Rent, {e.periodLabel}
            <span className="block text-xs text-slate-500">
              {e.daysLeft} of {e.daysInMonth} days
            </span>
          </span>
          <span className="text-slate-900">{money(e.rent)}</span>
        </div>
        {e.promoDiscount > 0 && (
          <div className={row}>
            <span className="text-emerald-700">{e.promoName || 'Promotion'}</span>
            <span className="text-emerald-700">-{money(e.promoDiscount)}</span>
          </div>
        )}
        <div className={row}>
          <span className="text-slate-600">
            Protection plan: ${e.protectionCoverage.toLocaleString('en-US')} coverage
            <span className="block text-xs text-slate-500">Prorated, same days</span>
          </span>
          <span className="text-slate-900">{money(e.protection)}</span>
        </div>
        <div className={row}>
          <span className="text-slate-600">
            Admin fee
            <span className="block text-xs text-slate-500">One time</span>
          </span>
          <span className="text-slate-900">{money(e.adminFee)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-brand-100 pt-2 text-base font-bold text-navy">
          <span>Estimated total</span>
          <span>{money(e.total)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Estimate only. Taxes and final promotion terms are confirmed on the next step.</p>
      </div>
    </div>
  )
}
