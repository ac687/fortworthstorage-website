import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { money, type Estimate, type NextMonthPromo, type Upcoming } from '../lib/estimate'

type Props = {
  estimate: Estimate
  collapsed: boolean
  onToggle: () => void
}

// "Estimated due today" box shown above Monument's iframe.
export default function EstimateCard({ estimate: e, collapsed, onToggle }: Props) {
  const bodyId = useId()
  const row = 'flex items-start justify-between gap-4 py-1 text-sm'
  const p = e.prepay
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
        {p && <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">{e.prorated ? 'Rest of this month' : 'This month'}</p>}
        <div className={row}>
          <span className="text-slate-600">
            Rent, {e.periodLabel}
            <span className="block text-xs text-slate-500">
              {e.prorated ? `${e.daysLeft} of ${e.daysInMonth} days` : e.dueDay ? `Then billed on the ${ordinal(e.dueDay)} of each month` : 'Full month'}
            </span>
          </span>
          <Amount now={e.rent} full={e.prorated ? e.rentFull : undefined} />
        </div>
        {e.promoDiscount > 0 && (
          <div className={row}>
            <span className="text-emerald-700">
              {e.promoName || 'Promotion'}
              {e.promoMonths !== null && e.promoMonths >= 2 && <span className="block text-xs">Discount 1 of {e.promoMonths}</span>}
            </span>
            <span className="text-emerald-700">-{money(e.promoDiscount)}</span>
          </div>
        )}
        {e.protectionMonthly > 0 && (
          <div className={row}>
            <span className="text-slate-600">
              Protection plan: ${e.protectionCoverage.toLocaleString('en-US')} coverage
              <span className="block text-xs text-slate-500">{e.prorated ? 'Prorated, same days' : 'First month'}</span>
            </span>
            <Amount now={e.protection} full={e.prorated ? e.protectionMonthly : undefined} />
          </div>
        )}

        {p && (
          <div className="mt-2.5 rounded-lg border border-brand-100 bg-white px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-display text-[13px] font-bold text-navy">Prepaid for next month</span>
              <span className="whitespace-nowrap rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-navy">Upcoming month</span>
            </div>
            <div className={row}>
              <span className="text-slate-600">
                Rent, {p.periodLabel}
                <span className="block text-xs text-slate-500">{p.monthName}, full month</span>
              </span>
              <span className="text-slate-900">{money(p.rent)}</span>
            </div>
            {p.promoDiscount > 0 && (
              <div className={row}>
                <span className="text-emerald-700">
                  {p.promoName || 'Promotion'}
                  <span className="block text-xs">
                    {p.promoFirstFullMonth ? (e.promoMonths !== null && e.promoMonths >= 2 ? `Discount 1 of ${e.promoMonths}` : 'Applies to your first full month') : `Discount 2 of ${e.promoMonths}`}
                  </span>
                </span>
                <span className="text-emerald-700">-{money(p.promoDiscount)}</span>
              </div>
            )}
            {p.protection > 0 && (
              <div className={row}>
                <span className="text-slate-600">
                  Protection plan: ${e.protectionCoverage.toLocaleString('en-US')} coverage
                  <span className="block text-xs text-slate-500">{p.monthName}, full month</span>
                </span>
                <span className="text-slate-900">{money(p.protection)}</span>
              </div>
            )}
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              {p.lastDays > 0
                ? `Because you are renting in the last ${p.lastDays} days of the month, ${p.monthName}'s rent and protection plan are due today.`
                : `${p.monthName}'s rent and protection plan are also due today.`}
            </p>
          </div>
        )}

        <div className={`${row} ${p ? 'pt-2' : ''}`}>
          <span className="text-slate-600">
            Admin fee
            <span className="block text-xs text-slate-500">One time</span>
          </span>
          <span className="text-slate-900">{money(e.adminFee)}</span>
        </div>
        {e.tax > 0 && (
          <div className={row}>
            <span className="text-slate-600">Tax</span>
            <span className="text-slate-900">{money(e.tax)}</span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-brand-100 pt-2 text-base font-bold text-navy">
          <span>Estimated total</span>
          <span>{money(e.total)}</span>
        </div>
        {p && <p className="mt-0.5 text-right text-xs text-slate-500">Includes {money(p.rent - p.promoDiscount + p.protection)} prepaid for {p.monthName}</p>}
        {e.upcoming ? (
          <ComingUp rows={e.upcoming} rowClass={row} />
        ) : (
          <div className="mt-3 border-t border-dashed border-slate-300 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Coming up</p>
            <p className="mt-1 text-sm text-slate-600">Your promotion may change your later payments. Exact amounts are confirmed in your cart.</p>
          </div>
        )}
        {e.nextMonthPromo && <NextMonthNote n={e.nextMonthPromo} months={e.promoMonths} />}
        {e.promoRequiresAutopay && <p className="mt-2 text-xs font-semibold text-emerald-800">The promotion requires autopay.</p>}
        <p className="mt-2 text-xs text-slate-500">Estimates only. Taxes and final promotion terms are confirmed on the next step.</p>
      </div>
    </div>
  )
}

// A prorated amount, with the full monthly price struck through beside it.
function Amount({ now, full }: { now: number; full?: number }) {
  const struck = full !== undefined && full - now >= 0.005
  return (
    <span className="whitespace-nowrap text-slate-900">
      {struck && (
        <>
          <span className="sr-only">Full price </span>
          <s className="mr-1.5 text-[13px] text-slate-500">{money(full)}</s>
          <span className="sr-only">, prorated </span>
        </>
      )}
      {money(now)}
    </span>
  )
}

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

// Shown when a first-full-month promotion is not billed today: says where the discount lands.
function NextMonthNote({ n, months }: { n: NextMonthPromo; months: number | null }) {
  const free = n.rentAfterPromo === 0
  return (
    <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
      <p className="text-sm font-semibold text-emerald-800">{n.promoName || 'Promotion'}</p>
      <p className="mt-0.5 text-xs leading-snug text-emerald-800">
        {free ? (
          <>
            Your first full month is {n.monthName}, and its rent is <b>free</b> (normally {money(n.rent).replace('.00', '')}). Nothing is discounted today.
          </>
        ) : (
          <>
            Your first full month is {n.monthName}. Rent for {n.monthName} is <b>{money(n.rentAfterPromo).replace('.00', '')}</b> instead of {money(n.rent).replace('.00', '')}, billed {n.billedLabel}. Nothing is discounted today.
          </>
        )}
        {months !== null && months >= 2 && ` The discount covers your first ${months} full months.`}
      </p>
    </div>
  )
}

// The payments after today, with the math behind each amount.
function ComingUp({ rows, rowClass }: { rows: Upcoming[]; rowClass: string }) {
  return (
    <div className="mt-3 border-t border-dashed border-slate-300 pt-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Coming up</p>
      {rows.map((u) => (
        <div key={u.label} className={rowClass}>
          <span className="text-slate-600">
            {u.label}
            <span className="block text-xs text-slate-500">{u.detail}</span>
          </span>
          <span className="text-slate-900">{money(u.amount)}</span>
        </div>
      ))}
    </div>
  )
}
