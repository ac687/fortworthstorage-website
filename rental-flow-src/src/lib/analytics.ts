import { config } from '../config'

// Sends rental-funnel events straight to this website's own GA4 property.
//
// Why not only the dataLayer: the page's Google Tag Manager container belongs to Monument and sends to
// a different GA4 property. pushEvent() and the Monument relay in CheckoutPanel keep pushing to the
// dataLayer exactly as before (so that container keeps working). This file adds a second path: a
// gtag() call with send_to set to this site's measurement ID, so the events land in this site's GA4 only.
//
// Nothing personal is ever sent: Monument's messages are never forwarded as they are. Only the event name
// is read from them, and the details come from what the visitor picked on this page (size, type, tier, price).

type Params = Record<string, string | number | boolean>

type Context = {
  unit_size: string
  unit_type: string
  unit_tier: string
  rental_mode: string
  monthly_rent: number
  promo?: string
}

// Monument event -> GA4 event. Events not listed here are not sent
// (unit_rent_now / unit_tier_selected are covered by this page's own events).
const MONUMENT_EVENTS: Record<string, string> = {
  lead_generated: 'generate_lead',
  info_provided: 'rental_info_provided',
  unit_details_provided: 'rental_details_provided',
  payment_provided: 'add_payment_info',
  lease_signature_page: 'rental_lease_viewed',
  lease_signed: 'rental_lease_signed',
  unit_reserved: 'rental_reserved',
  joined_waitlist: 'rental_waitlist_joined',
}

// Events that carry value (the monthly rent, not what was paid) and currency.
const WITH_VALUE = new Set(['begin_checkout', 'add_payment_info', 'rental_lease_signed'])

type Win = Window & { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] }

let context: Context | null = null
// Each Monument step is counted once per checkout (Monument can repeat a step, e.g. payment retries).
let sent = new Set<string>()

// Called every time a customer opens the checkout.
export function startTracking(unit: { size: string; unitType: string }, tier: { name: string; webRate: number; promoName?: string | null }, mode: string) {
  context = {
    unit_size: unit.size,
    unit_type: unit.unitType,
    unit_tier: tier.name,
    rental_mode: mode,
    monthly_rent: tier.webRate,
    ...(tier.promoName ? { promo: tier.promoName } : {}),
  }
  sent = new Set()
}

function gtagCall(...args: unknown[]) {
  const w = window as Win
  if (typeof w.gtag === 'function') {
    w.gtag(...args)
    return
  }
  // gtag.js only reads "arguments" objects from the dataLayer, not arrays.
  w.dataLayer = w.dataLayer || []
  const dl = w.dataLayer
  ;(function (..._a: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    dl.push(arguments)
  })(...args)
}

// Anything not on the live site (preview deployments, localhost) or coming from Monument's staging
// checkout is sent as debug traffic: it shows in GA4 DebugView, and GA4's "Developer traffic" data
// filter (Admin > Data filters) can exclude it from reports.
function isTest(origin?: string): boolean {
  const a = config.analytics
  const host = window.location.hostname.toLowerCase()
  if (!a.productionHosts.includes(host)) return true
  return !!origin && /^https:\/\/tenant-suite\.stg\./.test(origin)
}

function contextParams(withUnit = true): Params {
  const a = config.analytics
  const c = withUnit ? context : null
  return {
    facility: a.facilityName || config.facility.name,
    ...(c ? { unit_size: c.unit_size, unit_type: c.unit_type, unit_tier: c.unit_tier, rental_mode: c.rental_mode, ...(c.promo ? { promo: c.promo } : {}) } : {}),
  }
}

function send(name: string, params: Params, origin?: string) {
  const a = config.analytics
  if (!a.enabled || !a.measurementId) return
  const payload: Params = { send_to: a.measurementId, ...params }
  if (WITH_VALUE.has(name) && context) {
    payload.value = context.monthly_rent
    payload.currency = 'USD'
  }
  if (isTest(origin)) payload.debug_mode = true
  try {
    gtagCall('event', name, payload)
  } catch {
    /* tracking must never break the page */
  }
}

// This page's own steps. `event` and `data` are exactly what pushEvent() gets.
export function trackOwnEvent(event: string, data: Record<string, unknown>) {
  if (event === 'select_unit') {
    send('rental_unit_selected', {
      ...contextParams(false), // the unit details come from this click, not from an earlier checkout
      unit_size: String(data.unit_size ?? ''),
      unit_type: String(data.unit_type ?? ''),
      rental_mode: String(data.rental_mode ?? ''),
      ...(typeof data.units_left === 'number' ? { units_left: data.units_left } : {}),
    })
  } else if (event === 'begin_checkout') {
    // Reserve flow is a different step from a rental, so it gets its own name.
    send(data.rental_mode === 'reserve' ? 'rental_reserve_started' : 'begin_checkout', contextParams())
  } else if (event === 'join_waitlist') {
    send('rental_waitlist_started', contextParams())
  } else if (event === 'call_to_rent') {
    // A tap on a vehicle parking card's "Call" button (parking is rented by phone).
    send('rental_call_clicked', {
      ...contextParams(false),
      unit_size: String(data.unit_size ?? ''),
      unit_type: String(data.unit_type ?? ''),
    })
  }
}

// Messages from the Monument iframe (already origin- and source-checked by the caller).
export function trackMonumentEvent(msg: Record<string, unknown>, origin: string) {
  const name = typeof msg.event === 'string' ? MONUMENT_EVENTS[msg.event] : undefined
  if (!name) return
  // A payment attempt that Monument marks as failed is not counted.
  if (msg.event === 'payment_provided' && msg.payment_success === false) return
  if (sent.has(name)) return
  sent.add(name)
  send(name, contextParams(), origin)
}
