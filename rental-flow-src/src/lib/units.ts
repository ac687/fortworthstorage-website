import { config } from '../config'
import staticGroups from '../data/unitGroups.static.json'

// Shape of a unit group as returned by Monument's Shopping API
// (GET /facilities/:facilityUuid/unitGroups). Rates are in pennies.
export type ApiUnitGroup = {
  unitGroupUuid: string
  description?: string | null
  facilityName?: string | null
  facilityAddress?: string | null
  unitGroupWidth: number
  unitGroupDepth: number
  unitType?: string | null
  availableUnitCount?: number | null
  currentStreetRate?: number | null
  currentWebRate?: number | null
  amenities?: { key: string; present: boolean }[] | null
  bestAutoAppliedPromotion?: { promotionName?: string | null; highestDiscountAmount?: number | null } | null
}

export type Tier = {
  name: string
  rank: number
  label: string
  copy: string
  highlight: boolean
  unitGroupUuid: string
  available: number
  webRate: number // dollars / month
  streetRate: number // dollars / month
  promoName: string | null
  promoRate: number | null // dollars / month while the promo applies
  promoMonths: number | null // how many months it applies, when the name says so
  features: string[]
}

export type Category = 'drive-up' | 'temperature-controlled' | 'parking' | 'other'

export type UnitOption = {
  key: string
  size: string // "10x10"
  width: number
  depth: number
  sqft: number
  unitType: string
  category: Category
  photo: string | null
  tiers: Tier[]
  totalAvailable: number
  fromTier: Tier // the tier whose price is shown on the card
}

export async function loadUnitGroups(): Promise<ApiUnitGroup[]> {
  if (config.dataSource === 'api') {
    const res = await fetch(config.apiPath, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`Unit data request failed (${res.status})`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Unit data: unexpected response')
    return data
  }
  return staticGroups as ApiUnitGroup[]
}

export type FacilityInfo = {
  name: string
  street: string
  cityLine: string
  phoneDisplay: string
  phoneHref: string
}

// Facility settings from Monument. A missing value means "unknown", and the page
// then keeps the option available (Monument's own page still has the final say).
export type Policy = { allowReservations?: boolean; allowWaitlist?: boolean }

export type Rating = { rating: number; count: number; url: string | null }

// Live Google rating from /api/rating. Returns null when it isn't available
// (not set up, or Google can't be reached), and the page then hides the rating.
export async function loadRating(): Promise<Rating | null> {
  try {
    const res = await fetch(config.ratingApiPath, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.available || typeof d.rating !== 'number' || typeof d.count !== 'number') return null
    return { rating: d.rating, count: d.count, url: typeof d.url === 'string' && d.url.startsWith('https://') ? d.url : null }
  } catch {
    return null
  }
}

// "Hemsbury, OK 74442" -> "Hemsbury, OK"
export function cityState(cityLine: string) {
  const m = cityLine.match(/^(.+?),\s*([A-Za-z]{2})\b/)
  return m ? `${m[1].trim()}, ${m[2].toUpperCase()}` : cityLine
}

// The phone number is not in the unit-group data; /api/facility has it, along
// with the facility ID and environment the checkout links should use.
export async function loadFacilityDetails(): Promise<{ info: Partial<FacilityInfo>; facilityUuid?: string; env?: string; policy: Policy }> {
  if (config.dataSource !== 'api') return { info: {}, policy: {} }
  try {
    const res = await fetch(config.facilityApiPath, { headers: { accept: 'application/json' } })
    if (!res.ok) return { info: {}, policy: {} }
    const { phone, facilityUuid, env, allowReservations, allowWaitlist } = await res.json()
    const digits = String(phone ?? '').replace(/\D/g, '')
    const info: Partial<FacilityInfo> = {}
    if (digits.length >= 10) {
      const national = digits.slice(-10)
      info.phoneDisplay = `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
      info.phoneHref = `tel:+1${national}`
    }
    const policy: Policy = {}
    if (typeof allowReservations === 'boolean') policy.allowReservations = allowReservations
    if (typeof allowWaitlist === 'boolean') policy.allowWaitlist = allowWaitlist
    return { info, facilityUuid, env, policy }
  } catch {
    return { info: {}, policy: {} }
  }
}

// Facility name and address come with every unit group. Monument sends the
// address as one string ("128 Cloverleaf Lane, Hemsbury, OK 74442").
export function facilityFromGroups(groups: ApiUnitGroup[]): Partial<FacilityInfo> {
  const g = groups.find((x) => x.facilityName || x.facilityAddress)
  if (!g) return {}
  const out: Partial<FacilityInfo> = {}
  if (g.facilityName?.trim()) out.name = g.facilityName.trim()
  const addr = g.facilityAddress?.trim()
  if (addr) {
    const i = addr.indexOf(',')
    out.street = i > 0 ? addr.slice(0, i).trim() : addr
    out.cityLine = i > 0 ? addr.slice(i + 1).trim() : ''
  }
  return out
}

export const initialUnitGroups = staticGroups as ApiUnitGroup[]

function categoryOf(unitType: string): Category {
  const t = unitType.toLowerCase()
  // Every kind of parking (covered, uncovered, enclosed, RV, boat...) is one group.
  if (t.includes('parking')) return 'parking'
  if (t.includes('drive')) return 'drive-up'
  if (t.includes('temperature') || t.includes('climate')) return 'temperature-controlled'
  return 'other'
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}

// Reads how long a promotion lasts from its name ("First Month Free",
// "50% Off Your First Two Rent Payments"). Returns null when the name doesn't
// say, so the page never states a duration it can't back up.
export function promoMonthsFromName(name: string): number | null {
  const n = name.toLowerCase()
  const num = (w: string) => (/^\d+$/.test(w) ? Number(w) : NUMBER_WORDS[w] ?? null)
  let m = n.match(/\b(?:first|1st)\s+(?:(\d+|[a-z]+)\s+)?(?:months?|rent|payments?)\b/)
  if (m) {
    if (!m[1]) return 1
    const v = num(m[1])
    if (v) return v
  }
  m = n.match(/\b(\d+|[a-z]+)\s+months?\b/)
  if (m) {
    const v = num(m[1])
    if (v) return v
  }
  return null
}

// Lowercase letters and digits only, so "Drive-Up", "drive up" and "DRIVE UP" all match.
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '')

// Amenity bullets typed in the settings file. Most specific wins: "10x20 Drive-Up",
// then "Drive-Up", then "default". Returns null when nothing is typed for this
// tier, and the page then falls back to the amenities Monument sends. An empty
// list in the settings file means "show no bullets".
function hardCodedAmenities(g: ApiUnitGroup, tierName: string): string[] | null {
  const scopes = config.tierAmenities
  const type = g.unitType || 'Self Storage'
  const size = `${g.unitGroupWidth}x${g.unitGroupDepth}`
  const wanted = [norm(`${size} ${type}`), norm(type), 'default']
  const keys = Object.keys(scopes)
  for (const w of wanted) {
    const key = keys.find((k) => norm(k) === w)
    if (!key) continue
    const tier = Object.keys(scopes[key]).find((t) => t.toLowerCase() === tierName.toLowerCase())
    if (tier) return scopes[key][tier]
  }
  return null
}

function toTier(g: ApiUnitGroup): Tier {
  const name = (g.description || 'Standard').trim()
  const meta = config.tiers[name] ?? { rank: 9, label: '', copy: '' }
  const web = (g.currentWebRate ?? g.currentStreetRate ?? 0) / 100
  const street = (g.currentStreetRate ?? g.currentWebRate ?? 0) / 100
  const promo = g.bestAutoAppliedPromotion
  const discount = (promo?.highestDiscountAmount ?? 0) / 100
  const hasPromo = !!promo?.promotionName && discount > 0
  return {
    name,
    rank: meta.rank,
    label: meta.label,
    copy: meta.copy,
    highlight: !!meta.highlight,
    unitGroupUuid: g.unitGroupUuid,
    available: Math.max(0, g.availableUnitCount ?? 0),
    webRate: web,
    streetRate: street,
    promoName: hasPromo ? promo!.promotionName! : null,
    promoMonths: hasPromo ? promoMonthsFromName(promo!.promotionName!) : null,
    promoRate: hasPromo ? Math.max(0, Math.round((web - discount) * 100) / 100) : null,
    features: hardCodedAmenities(g, name) ?? (g.amenities ?? []).filter((a) => a.present).map((a) => a.key),
  }
}

// Monument has one unit group per size + type + tier. Group them into one
// option per size + type, with its tiers in Essential → Preferred → Premium order.
export function groupUnitOptions(groups: ApiUnitGroup[]): UnitOption[] {
  const map = new Map<string, UnitOption>()
  for (const g of groups) {
    if (!(g.unitGroupWidth > 0 && g.unitGroupDepth > 0)) continue
    const unitType = g.unitType || 'Self Storage'
    const size = `${g.unitGroupWidth}x${g.unitGroupDepth}`
    const key = `${size}|${unitType}`
    let opt = map.get(key)
    if (!opt) {
      opt = {
        key,
        size,
        width: g.unitGroupWidth,
        depth: g.unitGroupDepth,
        sqft: g.unitGroupWidth * g.unitGroupDepth,
        unitType,
        category: categoryOf(unitType),
        // The photos show storage units, so only use them for those types.
        photo: ['drive-up', 'temperature-controlled'].includes(categoryOf(unitType)) ? (config.unitPhotos[size] ?? null) : null,
        tiers: [],
        totalAvailable: 0,
        fromTier: undefined as unknown as Tier,
      }
      map.set(key, opt)
    }
    opt.tiers.push(toTier(g))
  }
  const options = [...map.values()]
  for (const o of options) {
    o.tiers.sort((a, b) => a.rank - b.rank || a.webRate - b.webRate)
    o.totalAvailable = o.tiers.reduce((n, t) => n + t.available, 0)
    const pool = o.tiers.filter((t) => t.available > 0)
    o.fromTier = [...(pool.length ? pool : o.tiers)].sort((a, b) => a.webRate - b.webRate)[0]
  }
  return options.sort((a, b) => a.sqft - b.sqft || a.category.localeCompare(b.category))
}

export function formatPrice(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`
}

export function availabilityBadge(available: number): { text: string; tone: 'red' | 'gray' } | null {
  if (available <= 0) return { text: 'Waitlist only', tone: 'gray' }
  if (available <= 3) return { text: `Only ${available} left`, tone: 'red' }
  return null
}

export function typeLabel(category: Category, unitType: string) {
  if (category === 'drive-up') return 'Drive Up'
  if (category === 'temperature-controlled') return 'Temperature Controlled'
  return unitType // parking and other types keep Monument's own name
}

export function accessLabel(category: Category, unitType = '') {
  if (category === 'drive-up') return 'Drive-up access'
  if (category === 'temperature-controlled') return 'Temperature controlled'
  if (category === 'parking') return 'Vehicle parking'
  return unitType || 'Self storage'
}

export function pushEvent(event: string, data: Record<string, unknown> = {}) {
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event, ...data })
}
