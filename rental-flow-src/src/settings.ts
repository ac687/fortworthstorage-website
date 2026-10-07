import { config } from './config'

// Per-website settings, read from /js/rental-flow-settings.js (plain file, no rebuild
// needed). Every value is checked here; anything missing or invalid is ignored and
// the built-in default stays, so a typo in that file can never break the page.

export type SiteSettings = {
  hours?: { timeZone?: string; gate?: { open?: string; close?: string }; support?: { open?: string; close?: string } }
  amenities?: string[]
  photos?: { src: string; alt: string }[]
  unitPhotos?: Record<string, string>
  tierAmenities?: Record<string, Record<string, string[]>>
  typeBullets?: Record<string, string[]>
  estimate?: { prepayLastDays?: number; fullMonthPromoWords?: string[] }
  sizeInfo?: Record<string, { summary?: string; fits?: string[] }>
  tiers?: Record<string, { rank?: number; label?: string; copy?: string; highlight?: boolean }>
  checkout?: { brandUuid?: string; facilityUuid?: string; params?: string }
  backup?: { name?: string; street?: string; cityLine?: string; phone?: string }
  colors?: Partial<Record<'brand' | 'brandDark' | 'navy' | 'brand50' | 'brand100' | 'button' | 'buttonHover', string>>
}

declare global {
  interface Window {
    RENTAL_FLOW_SETTINGS?: unknown
  }
}

const str = (v: unknown, max = 300): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)
const uuid = (v: unknown): string | null => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null)
// Images must be on this site ("/images/...") or https.
const imgSrc = (v: unknown): string | null => {
  const s = str(v, 500)
  return s && (/^\/(?!\/)[^\s"'<>]+$/.test(s) || /^https:\/\/[^\s"'<>]+$/.test(s)) ? s : null
}
const color = (v: unknown): string | null => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : null)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

const COLOR_VARS: Record<string, string> = {
  brand: '--color-brand',
  brandDark: '--color-brand-dark',
  navy: '--color-navy',
  brand50: '--color-brand-50',
  brand100: '--color-brand-100',
  button: '--color-cta',
  buttonHover: '--color-cta-hover',
}

// Colors are returned as CSS variables to set on the widget's host elements.
export function applySettings(raw: unknown = window.RENTAL_FLOW_SETTINGS): Record<string, string> {
  const s = obj(raw)
  const cssVars: Record<string, string> = {}
  if (!s) return cssVars

  const hours = obj(s.hours)
  if (hours) {
    const hhmm = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
    const win = (v: unknown) => {
      const o = obj(v)
      const open = o && hhmm(o.open)
      const close = o && hhmm(o.close)
      return open && close ? { open, close } : null
    }
    const g = win(hours.gate)
    const sp = win(hours.support)
    if (g) config.facility.gateHours = g
    if (sp) config.facility.supportHours = sp
    if (typeof hours.timeZone === 'string') {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: hours.timeZone })
        config.facility.timeZone = hours.timeZone
      } catch {
        /* unknown time zone: keep default */
      }
    }
  }

  if (Array.isArray(s.amenities)) {
    const list = s.amenities.map((a) => str(a, 120)).filter((a): a is string => !!a)
    if (list.length) config.facility.amenities = list
  }

  if (Array.isArray(s.photos)) {
    const list = s.photos
      .map((p) => {
        const o = obj(p)
        const src = o && imgSrc(o.src)
        return src ? { src, alt: (o && str(o.alt, 200)) || '' } : null
      })
      .filter((p): p is { src: string; alt: string } => !!p)
    if (list.length) config.facility.photos = list
  }

  const up = obj(s.unitPhotos)
  if (up) {
    const map: Record<string, string> = {}
    for (const [size, src] of Object.entries(up)) {
      const clean = imgSrc(src)
      if (/^\d+x\d+$/.test(size) && clean) map[size] = clean
    }
    if (Object.keys(map).length) config.unitPhotos = map
  }

  const tiers = obj(s.tiers)
  if (tiers) {
    for (const [name, v] of Object.entries(tiers)) {
      const o = obj(v)
      if (!o || !name.trim()) continue
      const prev = config.tiers[name] ?? { rank: 9, label: '', copy: '' }
      config.tiers[name] = {
        rank: typeof o.rank === 'number' && Number.isFinite(o.rank) ? o.rank : prev.rank,
        label: typeof o.label === 'string' ? o.label.trim().slice(0, 40) : prev.label,
        copy: typeof o.copy === 'string' ? o.copy.trim().slice(0, 200) : prev.copy,
        highlight: typeof o.highlight === 'boolean' ? o.highlight : prev.highlight,
      }
    }
  }

  const ta = obj(s.tierAmenities)
  if (ta) {
    const map: Record<string, Record<string, string[]>> = {}
    for (const [scope, tierMap] of Object.entries(ta)) {
      const tm = obj(tierMap)
      if (!tm || !scope.trim()) continue
      const inner: Record<string, string[]> = {}
      for (const [tier, list] of Object.entries(tm)) {
        if (!Array.isArray(list) || !tier.trim()) continue
        inner[tier.trim()] = list.map((a) => str(a, 120)).filter((a): a is string => !!a)
      }
      if (Object.keys(inner).length) map[scope.trim()] = inner
    }
    config.tierAmenities = map
  }

  const tb = obj(s.typeBullets)
  if (tb) {
    const map: Record<string, string[]> = {}
    for (const [type, list] of Object.entries(tb)) {
      if (!Array.isArray(list) || !type.trim()) continue
      map[type.trim()] = list.map((a) => str(a, 120)).filter((a): a is string => !!a)
    }
    config.typeBullets = map
  }

  const est = obj(s.estimate)
  if (est && typeof est.prepayLastDays === 'number' && Number.isInteger(est.prepayLastDays) && est.prepayLastDays >= 0 && est.prepayLastDays <= 28) {
    config.estimate.prepayLastDays = est.prepayLastDays
  }
  if (est && Array.isArray(est.fullMonthPromoWords)) {
    const words = est.fullMonthPromoWords.map((w) => str(w, 60)).filter((w): w is string => !!w)
    if (words.length) config.estimate.fullMonthPromoWords = words
  }

  const si = obj(s.sizeInfo)
  if (si) {
    const map: Record<string, { summary: string; fits: string[] }> = {}
    for (const [size, v] of Object.entries(si)) {
      const o = obj(v)
      if (!o || !/^\d+x\d+$/.test(size)) continue
      const summary = str(o.summary, 160)
      const fits = Array.isArray(o.fits) ? o.fits.map((f) => str(f, 80)).filter((f): f is string => !!f).slice(0, 6) : []
      if (summary || fits.length) map[size] = { summary: summary ?? '', fits }
    }
    config.sizeInfo = map
  }

  const co = obj(s.checkout)
  if (co) {
    const brand = uuid(co.brandUuid)
    const fac = uuid(co.facilityUuid)
    const params = typeof co.params === 'string' && /^[\w%=&.\-]*$/.test(co.params) ? co.params : null
    if (brand) config.monument.brandUuid = brand
    if (fac) config.monument.facilityUuid = fac
    if (params !== null) config.monument.params = params
  }

  const bk = obj(s.backup)
  if (bk) {
    const name = str(bk.name)
    const street = str(bk.street)
    const city = str(bk.cityLine)
    const phone = str(bk.phone, 30)
    if (name) config.facility.name = name
    if (street) config.facility.street = street
    if (city) config.facility.cityLine = city
    const digits = phone ? phone.replace(/\D/g, '') : ''
    if (phone && digits.length >= 10) {
      config.facility.phoneDisplay = phone
      config.facility.phoneHref = `tel:+1${digits.slice(-10)}`
    }
  }

  const colors = obj(s.colors)
  if (colors) {
    for (const [key, cssVar] of Object.entries(COLOR_VARS)) {
      const c = color(colors[key])
      if (c) cssVars[cssVar] = c
    }
  }
  return cssVars
}
