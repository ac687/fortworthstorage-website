import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, DoorClosed, ThermometerSnowflake } from 'lucide-react'
import SideColumn from './components/SideColumn'
import type { CheckoutMode } from './config'
import { config, monumentUnitsUrl, setRuntimeFacility } from './config'
import type { Category, FacilityInfo, Policy, Rating, Tier, UnitOption } from './lib/units'
import { cityState, facilityFromGroups, groupUnitOptions, initialUnitGroups, isPopular, loadFacilityDetails, loadRating, loadUnitGroups, pushEvent, typeLine } from './lib/units'
import SectionBand from './components/SectionBand'
import FacilityHeader from './components/FacilityHeader'
import UnitCard from './components/UnitCard'
import TierModal from './components/TierModal'
import TypeChooser from './components/TypeChooser'
import CheckoutPanel from './components/CheckoutPanel'
import { startTracking } from './lib/analytics'

type Filter = 'all' | Category
type Sort = 'size' | 'price-asc' | 'price-desc'
type Selection = { unit: UnitOption; tier: Tier; mode: CheckoutMode }

const HISTORY_KEY = 'tuRentalCheckout'

// Height of the page's sticky/fixed header elements (nav + promo banner), so a
// scroll lands just below them. Falls back to config.scrollOffset.
function stickyHeaderHeight() {
  let total = 0
  const seen: Element[] = []
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el)
    if (s.position !== 'sticky' && s.position !== 'fixed') continue
    if (parseFloat(s.top) > 1 || s.display === 'none' || s.visibility === 'hidden') continue
    if (seen.some((p) => p.contains(el))) continue
    const h = (el as HTMLElement).offsetHeight
    if (h > 0 && h < window.innerHeight / 3) {
      seen.push(el)
      total += h
    }
  }
  return Math.max(total, config.scrollOffset) + 12
}

function sectionTitle(cat: Category, unitType: string) {
  if (cat === 'drive-up') return 'Drive Up'
  if (cat === 'temperature-controlled') return 'Temperature Controlled'
  if (cat === 'parking') return 'Vehicle Parking'
  return unitType || 'Other storage'
}

// The heading above one group of units: the type, a short description, and how many sizes it has.
function SectionHeading({ cat, unitType, count }: { cat: Category; unitType: string; count: number }) {
  const temp = cat === 'temperature-controlled'
  const Icon = temp ? ThermometerSnowflake : cat === 'drive-up' ? DoorClosed : null
  const color = temp ? 'text-[#1E3A8A] border-[#1E3A8A]' : 'text-navy border-navy'
  const sub = cat === 'parking' ? 'Rented by phone' : typeLine(cat, unitType)
  return (
    <div className={`mt-2 flex items-end justify-between gap-3 border-b-2 px-0.5 pb-2 first:mt-0 ${color}`}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold leading-tight">
          {Icon && <Icon size={20} strokeWidth={2.2} aria-hidden="true" />}
          {sectionTitle(cat, unitType)}
        </h3>
        <p className="mt-0.5 text-[13px] font-normal text-[#475569]">{sub}</p>
      </div>
      <span className="whitespace-nowrap text-[12.5px] font-semibold text-[#475569]">
        {count} {cat === 'parking' ? (count === 1 ? 'space' : 'spaces') : count === 1 ? 'size' : 'sizes'}
      </span>
    </div>
  )
}

export default function App({ host, layer }: { host: HTMLElement; layer: HTMLElement }) {
  // With live data, nothing is shown until Monument answers, so old saved prices
  // never flash on screen. The saved snapshot is only used when dataSource is 'static'.
  const [options, setOptions] = useState<UnitOption[] | null>(() =>
    config.dataSource === 'api' ? null : groupUnitOptions(initialUnitGroups),
  )
  const [loadError, setLoadError] = useState(false)
  const [policy, setPolicy] = useState<Policy>({})
  // The facility's name, address and phone from the settings file show straight away, and Monument's
  // details replace them if they differ. (Keep the settings file in step with Monument.)
  const live = config.dataSource === 'api'
  const [infoReady, setInfoReady] = useState(true)
  // Google rating: from the saved details when static; live from Google when 'api' (hidden until loaded).
  const [rating, setRating] = useState<Rating | null | undefined>(live ? null : undefined)
  const [phoneReady, setPhoneReady] = useState(true)
  const [apiFacility, setApiFacility] = useState<Partial<FacilityInfo>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('size')
  const [modal, setModal] = useState<{ unit: UnitOption; mode: 'rent' | 'reserve' } | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [chooser, setChooser] = useState<{ size: string; units: UnitOption[] } | null>(null)
  const rentParamHandled = useRef(false)
  const pushedHistory = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadUnitGroups()
      .then((groups) => {
        if (cancelled) return
        setOptions(groupUnitOptions(groups))
        setApiFacility((f) => ({ ...f, ...facilityFromGroups(groups) }))
        setInfoReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setInfoReady(true) // fall back to the saved details
      })
    if (live) loadRating().then((r) => !cancelled && setRating(r))
    loadFacilityDetails().then(({ info, facilityUuid, env, policy }) => {
      if (cancelled) return
      setPolicy(policy)
      setPhoneReady(true)
      setRuntimeFacility({ facilityUuid, env })
      setApiFacility((f) => ({ ...f, ...info }))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const scrollToTop = useCallback(() => {
    const top = host.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight()
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [host])

  // Browser Back from the checkout returns to the unit list instead of leaving the page.
  useEffect(() => {
    const onPop = () => {
      if (!(history.state && history.state[HISTORY_KEY])) {
        pushedHistory.current = false
        setSelection(null)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const startCheckout = useCallback(
    (unit: UnitOption, tier: Tier, mode: CheckoutMode) => {
      startTracking(unit, tier, mode)
      pushEvent(mode === 'waitlist' ? 'join_waitlist' : 'begin_checkout', {
        rental_mode: mode,
        unit_size: unit.size,
        unit_type: unit.unitType,
        unit_tier: tier.name,
        unit_price: tier.webRate,
        unit_group_uuid: tier.unitGroupUuid,
      })
      setModal(null)
      setSelection({ unit, tier, mode })
      if (!pushedHistory.current) {
        history.pushState({ ...(history.state || {}), [HISTORY_KEY]: true }, '')
        pushedHistory.current = true
      }
      requestAnimationFrame(scrollToTop)
    },
    [scrollToTop],
  )

  const openUnit = useCallback(
    (unit: UnitOption, mode: 'rent' | 'reserve', position?: number) => {
      // Vehicle parking is rented by phone, so it never opens a checkout.
      if (unit.category === 'parking') return
      pushEvent('select_unit', {
        unit_size: unit.size,
        unit_type: unit.unitType,
        rental_mode: mode,
        units_left: unit.totalAvailable,
        promo: unit.totalAvailable > 0 ? unit.fromTier.promoName ?? 'none' : 'none',
        popular: isPopular(unit),
        position,
      })
      // Reserve goes straight to the lowest tier that has space, with no popup.
      if (mode === 'reserve') {
        const lowest = [...unit.tiers].filter((t) => t.available > 0).sort((a, b) => a.rank - b.rank || a.webRate - b.webRate)[0]
        if (lowest) {
          startCheckout(unit, lowest, 'reserve')
          return
        }
      }
      // Join Waitlist (every tier sold out) also goes straight to the lowest tier.
      if (mode === 'rent' && unit.totalAvailable <= 0) {
        const lowest = [...unit.tiers].sort((a, b) => a.rank - b.rank || a.webRate - b.webRate)[0]
        if (lowest) {
          startCheckout(unit, lowest, 'waitlist')
          return
        }
      }
      // Sizes with a single tier skip the popup.
      if (unit.tiers.length === 1) {
        const t = unit.tiers[0]
        startCheckout(unit, t, t.available <= 0 ? 'waitlist' : mode === 'reserve' ? 'reserve' : 'tenant')
        return
      }
      setModal({ unit, mode })
    },
    [startCheckout],
  )

  // Rental buttons elsewhere on the site link to /?rent=10x10#rent-now. A size opens the
  // tier popup when it has one unit type, or a type chooser when it has several. Adding
  // &type=temperature-controlled (or drive-up) skips the chooser for that type.
  // An unknown size just leaves the normal list in view.
  const openForSize = useCallback(
    (rawSize: string, type: string | null): boolean => {
      if (options === null) return false
      const size = rawSize.toLowerCase().replace(/[^0-9x]/g, '')
      // Vehicle parking has no online rental, so a ?rent= link never opens it.
      const matches = options
        .filter((o) => o.size === size && o.category !== 'parking')
        .sort((a, b) => (a.category === 'drive-up' ? 0 : 1) - (b.category === 'drive-up' ? 0 : 1))
      if (matches.length === 0) return false
      const typed = type ? matches.filter((o) => o.category === type) : []
      if (typed.length > 0) openUnit(typed[0], 'rent')
      else if (matches.length === 1) openUnit(matches[0], 'rent')
      else setChooser({ size, units: matches })
      return true
    },
    [options, openUnit],
  )

  // On arrival: ?rent=SIZE opens that size; ?type=... on its own shows only that unit type.
  useEffect(() => {
    if (options === null || rentParamHandled.current) return
    rentParamHandled.current = true
    const url = new URL(window.location.href)
    const rent = url.searchParams.get('rent')
    const typeRaw = url.searchParams.get('type')
    if (rent === null && typeRaw === null) return
    url.searchParams.delete('rent')
    url.searchParams.delete('type')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
    const type = typeRaw === 'drive-up' || typeRaw === 'temperature-controlled' ? typeRaw : null
    requestAnimationFrame(scrollToTop)
    if (rent !== null) openForSize(rent, type)
    else if (type && options.some((o) => o.category === type)) setFilter(type)
  }, [options, openForSize, scrollToTop])

  // Links on this page marked data-rent-size (the size chart's Rent Now buttons) open the
  // popup in place, with no page reload. Without JS, or before the units have loaded, the
  // link's own /?rent= address still works.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[data-rent-size]') as HTMLElement | null
      if (!a) return
      // Runs first (capture phase) because Webflow's own scroll script otherwise claims
      // links to this page and cancels the click before it gets here.
      if (openForSize(a.dataset.rentSize ?? '', a.dataset.rentType ?? null)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [openForSize])

  const backToList = useCallback(() => {
    // Don't use history.back(): steps inside the Monument iframe also add
    // history entries, so Back could just move the iframe back a step.
    if (pushedHistory.current) {
      const state = { ...(history.state || {}) }
      delete state[HISTORY_KEY]
      history.replaceState(state, '')
      pushedHistory.current = false
    }
    setSelection(null)
    requestAnimationFrame(scrollToTop)
  }, [scrollToTop])

  const visible = useMemo(() => {
    const all = options ?? []
    const list = filter === 'all' ? all : all.filter((o) => o.category === filter)
    const byPrice = (a: UnitOption, b: UnitOption) => a.fromTier.webRate - b.fromTier.webRate
    if (sort === 'price-asc') return [...list].sort(byPrice)
    if (sort === 'price-desc') return [...list].sort((a, b) => byPrice(b, a))
    // All, by size: units you can rent first, then vehicle parking (call to rent), then sold-out
    // units that only offer the waitlist. Each part stays in size order (the sort is stable).
    if (filter === 'all') {
      const rank = (o: UnitOption) => (o.category === 'parking' ? 1 : o.totalAvailable <= 0 ? 2 : 0)
      return [...list].sort((a, b) => rank(a) - rank(b))
    }
    return list
  }, [options, filter, sort])

  // Only offer a filter for types this facility actually has.
  const present = useMemo(() => new Set((options ?? []).map((o) => o.category)), [options])
  const loading = options === null && !loadError
  // With two or more unit types (parking not counted), the default view is grouped under one heading per type.
  // Sorting by price or filtering to one type shows a plain list again, with the type label on each card.
  const grouped = filter === 'all' && sort === 'size' && [...present].filter((c) => c !== 'parking').length > 1
  // The number on the "Call" button for vehicle parking: Monument's phone when it has answered, else the saved one.
  const facilityPhone = { ...config.facility, ...apiFacility }
  const callPhone = phoneReady ? { display: facilityPhone.phoneDisplay, href: facilityPhone.phoneHref } : null

  const groups = useMemo(() => {
    if (!grouped) return []
    const order: Category[] = ['drive-up', 'temperature-controlled', 'other', 'parking']
    return order
      .map((cat) => {
        const units = visible.filter((u) => u.category === cat)
        // Units you can rent first, sold-out ones after. Each part keeps its size order.
        const sorted = [...units.filter((u) => u.totalAvailable > 0), ...units.filter((u) => u.totalAvailable <= 0)]
        return { cat, units: sorted }
      })
      .filter((g) => g.units.length > 0)
  }, [grouped, visible])

  const unitCard = (unit: UnitOption, position: number, underHeading: boolean) => (
    <UnitCard
      key={unit.key}
      unit={unit}
      onSelect={(u, m) => openUnit(u, m, position)}
      allowReservations={policy.allowReservations !== false}
      allowWaitlist={policy.allowWaitlist !== false}
      phone={callPhone}
      onCall={(u) => pushEvent('call_to_rent', { unit_size: u.size, unit_type: u.unitType, units_left: u.totalAvailable })}
      hideTypePill={underHeading}
    />
  )

  const filterBtn = (value: Filter, label: string, first = false) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`cursor-pointer px-4 py-2 sm:px-5 ${first ? '' : 'border-l border-navy'} ${filter === value ? 'bg-navy text-white' : 'text-navy hover:bg-slate-100'}`}
    >
      {label}
    </button>
  )

  return (
    <div className={`tu-root bg-slate-50 ${selection ? '' : 'border-t border-slate-200 shadow-[inset_0_10px_14px_-12px_rgba(15,23,42,0.18)]'}`}>
      {/* The unit list has no band: the page intro above it ends in a soft edge instead. The checkout step keeps its heading. */}
      {selection && <SectionBand checkout />}
      <div className="mx-auto max-w-[1220px] px-3 py-5 lg:px-4">
        {selection ? (
          <CheckoutPanel
            key={selection.tier.unitGroupUuid + selection.mode}
            unit={selection.unit}
            tier={selection.tier}
            mode={selection.mode}
            onBack={backToList}
            scrollToTop={scrollToTop}
            facility={apiFacility}
          />
        ) : (
          <>
            <FacilityHeader info={apiFacility} infoReady={infoReady} phoneReady={phoneReady} rating={rating} />
            <section aria-labelledby="tu-units-heading">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="tu-units-heading" className="font-display text-xl font-bold text-navy sm:text-2xl">
                    Rent Self Storage Units{infoReady ? ` in ${cityState(apiFacility.cityLine ?? config.facility.cityLine)}` : ''}
                  </h2>
                  {config.tagline && <p className="mt-0.5 text-sm text-[#475569]">{config.tagline}</p>}
                </div>
                <label className="relative inline-flex w-fit items-center">
                  <span className="sr-only">Sort units</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="cursor-pointer appearance-none rounded-full border border-slate-300 bg-white py-2 pl-4 pr-9 text-xs font-medium text-slate-800"
                  >
                    <option value="size">Sort: Size</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" aria-hidden="true" />
                </label>
              </div>

              {/* One unit type only: the filter would do nothing, so it is hidden. */}
              {present.size > 1 && (
              <div className="my-4 flex w-fit overflow-hidden rounded-lg border border-navy text-sm font-semibold max-[349px]:grid max-[349px]:w-full max-[349px]:grid-cols-2 max-[349px]:text-center max-[349px]:[&>button:last-child:nth-child(odd)]:col-span-2 max-[349px]:[&>button:nth-child(3)]:border-l-0 max-[349px]:[&>button:nth-child(n+3)]:border-t max-[349px]:[&>button:nth-child(n+3)]:border-navy" role="group" aria-label="Unit type filter">
                {filterBtn('all', 'All', true)}
                {present.has('drive-up') && filterBtn('drive-up', 'Drive Up')}
                {present.has('temperature-controlled') && filterBtn('temperature-controlled', 'Temperature Controlled')}
                {present.has('parking') && filterBtn('parking', 'Vehicle Parking')}
              </div>
              )}

              {loadError && (
                <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  {options === null ? "We couldn't load available units right now." : "Live availability couldn't be loaded, so prices may be out of date."}{' '}
                  <a className="font-semibold underline" href={monumentUnitsUrl()} target="_blank" rel="noopener">
                    See current availability
                  </a>
                </p>
              )}

              <div className="min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_300px] min-[1180px]:gap-5">
              <div className="flex flex-col gap-5" aria-busy={loading}>
                {loading &&
                  [0, 1, 2].map((n) => (
                    <div key={n} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" aria-hidden="true" />
                  ))}
                {grouped
                  ? (() => {
                      let n = 0
                      return groups.map((g) => (
                        <section key={g.cat} className="flex flex-col gap-5" aria-label={sectionTitle(g.cat, g.units[0].unitType)}>
                          <SectionHeading cat={g.cat} unitType={g.units[0].unitType} count={g.units.length} />
                          {g.units.map((unit) => {
                            n += 1
                            const pos = n
                            return unitCard(unit, pos, true)
                          })}
                        </section>
                      ))
                    })()
                  : visible.map((unit, i) => unitCard(unit, i + 1, false))}
                {!loading && options !== null && visible.length === 0 && <p className="py-8 text-center text-slate-500">No units of this type right now.</p>}
              </div>
              <SideColumn rating={rating} facility={facilityPhone} getTop={stickyHeaderHeight} />
              </div>
            </section>
          </>
        )}
      </div>

      {chooser &&
        createPortal(
          <TypeChooser
            size={chooser.size}
            units={chooser.units}
            allowWaitlist={policy.allowWaitlist !== false}
            onClose={() => setChooser(null)}
            onChoose={(unit) => {
              setChooser(null)
              openUnit(unit, 'rent')
            }}
          />,
          layer,
        )}

      {modal &&
        createPortal(
          <TierModal unit={modal.unit} mode={modal.mode} allowWaitlist={policy.allowWaitlist !== false} onClose={() => setModal(null)} onChoose={(tier, mode) => startCheckout(modal.unit, tier, mode)} />,
          layer,
        )}
    </div>
  )
}
