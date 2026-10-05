// Cloudflare Pages Function: GET /api/facility
// Returns the configured facility's name, address and phone from Monument.
// Uses the same settings as /api/units (MONUMENT_API_KEY, MONUMENT_ENV,
// MONUMENT_FACILITY_UUID, optional MONUMENT_PORTFOLIO / MONUMENT_API_BASE).

const DEFAULT_PORTFOLIO = 'storageoperationsgroup'
const CACHE_SECONDS = 180

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

export async function onRequestGet({ env, waitUntil }) {
  const key = env.MONUMENT_API_KEY ? env.MONUMENT_API_KEY.trim() : ''
  const facility = env.MONUMENT_FACILITY_UUID
  if (!key || !facility) return json({ error: 'Monument settings are missing' }, 500)

  const monEnv = env.MONUMENT_ENV === 'stg' ? 'stg' : 'prd'
  const portfolio = env.MONUMENT_PORTFOLIO || DEFAULT_PORTFOLIO
  let base = `https://public-api.${monEnv}.monument.io/shopping/${portfolio}/v1`
  if (env.MONUMENT_API_BASE) {
    if (!/^https:\/\/[a-z0-9.-]+\.monument\.io(\/[\w./-]*)?$/i.test(env.MONUMENT_API_BASE)) {
      return json({ error: 'MONUMENT_API_BASE must be an https monument.io URL' }, 500)
    }
    base = env.MONUMENT_API_BASE.replace(/\/+$/, '')
  }

  const cache = caches.default
  const cacheKey = new Request(`https://cache.invalid/facility/${monEnv}/${facility}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let upstream
  try {
    upstream = await fetch(`${base}/facilities`, {
      headers: { 'x-api-key': key, accept: 'application/json', 'user-agent': 'fortworth-website/1.0' },
    })
  } catch {
    return json({ error: 'Could not reach Monument' }, 502)
  }
  if (!upstream.ok) return json({ error: `Monument returned ${upstream.status}` }, 502)

  const rows = await upstream.json()
  const f = (Array.isArray(rows) ? rows : []).find((x) => (x.facilityUuid ?? x.uuid) === facility)
  if (!f) return json({ error: 'Facility not found' }, 404)

  // Only public business details; nothing else from the record.
  // Facility policies say whether reservations and the waitlist are switched on.
  // If this call fails, the fields are left out and the page keeps both options.
  let allowReservations
  let allowWaitlist
  try {
    const pr = await fetch(`${base}/policies/facilities/${facility}`, {
      headers: { 'x-api-key': key, accept: 'application/json', 'user-agent': 'fortworth-website/1.0' },
    })
    if (pr.ok) {
      const pol = await pr.json()
      if (typeof pol.allowReservations === 'boolean') allowReservations = pol.allowReservations
      if (typeof pol.allowWaitlist === 'boolean') allowWaitlist = pol.allowWaitlist
    }
  } catch {
    /* optional */
  }

  // facilityUuid and env tell the page which facility/environment its checkout
  // links belong to, so the Cloudflare settings are the single source of truth.
  const res = json({ name: f.facilityName ?? f.name, address: f.address, phone: f.phone, facilityUuid: facility, env: monEnv, allowReservations, allowWaitlist }, 200, {
    'cache-control': `public, max-age=${CACHE_SECONDS}`,
  })
  waitUntil?.(cache.put(cacheKey, res.clone()))
  return res
}
