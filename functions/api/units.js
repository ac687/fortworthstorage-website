// Cloudflare Pages Function: GET /api/units
// Returns Monument's unit groups for one facility, with the full details of each group's
// promotion. The API keys stay here as Cloudflare secrets and are never sent to the browser.
//
// Settings (Cloudflare > Settings > Variables and Secrets):
//   MONUMENT_API_KEY              secret  (required) Shopping API key
//   PROMO_KV                      KV binding (optional) Cloudflare KV namespace shared by every data center. Keeps the
//                                         promotion rules for a few hours so Monument is asked rarely.
//                                         Without it the page still works, with a per-data-center cache only.
//   MONUMENT_ENV                  text    "stg" or "prd" (default "prd")
//   MONUMENT_FACILITY_UUID        text    which facility to list
//   MONUMENT_PORTFOLIO            text    optional, default "storageoperationsgroup"
//   MONUMENT_API_BASE             text    optional full Shopping base URL, overrides the two above,
//                                         e.g. https://<host>/shopping/<portfolio>/v1
//                                         (the Integration API is reached on the same host)
//
// How promotions work here:
//   1. GET /facilities/:facility/unitGroups already includes each group's best auto-applied
//      promotion (name, UUID, and the discount in pennies for that group).
//   2. One batched POST .../promotions/get_by_uuids (called with the same Shopping API key) returns the rules for the
//      distinct promotions: percentage or fixed amount, how many months, which invoice it starts on,
//      who it is for, and whether autopay is required. They are attached to each group as
//      bestAutoAppliedPromotion.details.
//   If step 2 fails for any reason the groups are still returned with the promotion from step 1, and the
//   page falls back to reading the promotion's name. The x-promo-details response header says what happened:
//     ok N | cached N | kv N          rules loaded (from Monument, this data center's cache, or shared KV)
//     stale (refreshing | paused)     the last good rules are being used while Monument is refreshed or paused
//     failed 429 | paused             no rules at all, so the page reads the promotion's name
//     none needed                     no promotions on any group

const DEFAULT_PORTFOLIO = 'storageoperationsgroup'
const CACHE_SECONDS = 180 // unit availability and rates
const PROMO_CACHE_SECONDS = 900 // per data center: promotion rules change rarely, so they refresh less often than rates
const PROMO_STALE_SECONDS = 86400 // per data center: last good rules, used only when Monument refuses or fails a refresh
const PROMO_KV_FRESH_SECONDS = 4 * 3600 // shared KV copy counts as fresh this long
const PROMO_KV_KEEP_SECONDS = 7 * 86400 // shared KV copy is kept this long as the last good rules
const PROMO_PAUSE_SECONDS = 300 // after a failed refresh, do not ask Monument again for this long
const PROMO_MAX_PAUSE_SECONDS = 900 // longest pause, even if Monument's Retry-After asks for more
const PROMO_LOCK_SECONDS = 60 // while one visitor's refresh runs, others do not start their own
const PROMO_RECHECK_SECONDS = 300 // saved rules that miss a unit group are re-fetched, but at most this often
const PROMO_TIMEOUT_MS = 4000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5)) // +/- 25%, so callers do not retry in step
const UUID_RE = /^[0-9a-f-]{36}$/i
const USER_AGENT = 'fortworth-website/1.0'

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })

// Only the fields the page uses. isAutoPayRequired comes back as 0/1, so it is turned into a boolean.
function pickRules(d) {
  return {
    tenantType: d.tenantType ?? null,
    promotionCategory: d.promotionCategory ?? null,
    isAutoPayRequired: !!d.isAutoPayRequired,
    isActive: d.isActive !== false,
    discountType: d.discountType ?? null,
    discountAmountType: d.discountAmountType ?? null,
    discountPercentage: d.discountPercentage ?? null,
    fixedDiscountAmount: d.fixedDiscountAmount ?? null,
    durationInMonths: d.durationInMonths ?? null,
    monthStarts: d.monthStarts ?? null,
  }
}

// Fetches the rules for a set of promotion UUIDs. Returns { rules: Map | null, status }.
//
// Where the rules come from, cheapest first:
//   1. This data center's own cache (15 minutes).
//   2. Workers KV (binding PROMO_KV), shared by every data center (4 hours). Optional.
//   3. Monument, only when 1 and 2 have nothing fresh. A 429 or server error is retried with a short exponential
//      back-off (about 1s, then 2s, with jitter). If it still fails, calls are paused for a few minutes.
// The last good rules (7 days in KV, 24 hours in the local cache) are used whenever Monument fails or is paused.
// When a last good copy exists, the visitor is answered from it at once and the refresh runs in the background.
async function fetchPromoRules({ uuids, expect, origin, portfolio, facility, apiKey, monEnv, cache, waitUntil, kv }) {
  const list = uuids.join(',')
  const cacheKey = new Request(`https://cache.invalid/${monEnv}/promos/${facility}/${list}`)
  const staleKey = new Request(`https://cache.invalid/${monEnv}/promos-stale/${facility}/${list}`)
  const pauseKey = new Request(`https://cache.invalid/${monEnv}/promos-pause/${facility}`)
  const kvKey = `promos:${monEnv}:${facility}:${list}`
  const kvPause = `promos-pause:${monEnv}:${facility}`
  const useKv = !!kv && typeof kv.get === 'function' && kvKey.length < 480
  const toMap = (rows) => new Map(rows.filter((r) => r && r.promotionUuid).map((r) => [r.promotionUuid, r]))
  const later = (p) => (waitUntil ? waitUntil(p) : p)
  const asJson = (rows, seconds) => json(rows, 200, { 'cache-control': `public, max-age=${seconds}`, 'x-saved-at': String(Date.now()) })

  // Saved rules are only trusted if they list every unit group that currently has the promotion. A group added to a
  // promotion in Monument is missing from the saved list, so the rules are re-fetched (at most every 5 minutes).
  // Rules that carry no group list at all are trusted as they are.
  const covers = (rows) => {
    if (!expect) return true
    for (const [promoUuid, groups] of expect) {
      const row = rows.find((r) => r && r.promotionUuid === promoUuid)
      if (!row) return false
      if (!Array.isArray(row.unitGroupUuids)) continue
      for (const g of groups) if (!row.unitGroupUuids.includes(g)) return false
    }
    return true
  }
  const usable = (rows, at) => covers(rows) || Date.now() - (Number(at) || 0) < PROMO_RECHECK_SECONDS * 1000

  const localRows = async (req) => {
    try {
      const hit = await cache.match(req)
      const rows = hit ? await hit.json() : null
      return Array.isArray(rows) ? { rows, at: Number(hit.headers.get('x-saved-at')) || 0 } : null
    } catch {
      return null
    }
  }
  const kvEntry = async () => {
    if (!useKv) return null
    try {
      const e = await kv.get(kvKey, 'json')
      return e && Array.isArray(e.rows) ? e : null
    } catch {
      return null
    }
  }
  const isPaused = async () => {
    try {
      if (useKv && (await kv.get(kvPause))) return true
    } catch {
      /* ignore */
    }
    return !!(await cache.match(pauseKey))
  }
  const setPause = async (seconds) => {
    const s = Math.min(PROMO_MAX_PAUSE_SECONDS, Math.max(60, Math.round(seconds)))
    const jobs = [cache.put(pauseKey, asJson({ paused: true }, s))]
    if (useKv) jobs.push(kv.put(kvPause, '1', { expirationTtl: s }))
    await Promise.allSettled(jobs)
  }
  const save = async (rows) => {
    const jobs = [cache.put(cacheKey, asJson(rows, PROMO_CACHE_SECONDS)), cache.put(staleKey, asJson(rows, PROMO_STALE_SECONDS)), cache.delete(pauseKey)]
    if (useKv) {
      jobs.push(kv.put(kvKey, JSON.stringify({ rows, at: Date.now() }), { expirationTtl: PROMO_KV_KEEP_SECONDS }))
      jobs.push(kv.delete(kvPause))
    }
    await Promise.allSettled(jobs)
  }

  // One call to Monument, retried with back-off on a 429 or a server error. Returns { rows } or { status, retryAfter }.
  const callMonument = async (attempts) => {
    let status = 'failed unreachable'
    let retryAfter = 0
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await sleep(jitter(1000 * 2 ** (i - 1)))
      try {
        const res = await fetch(`${origin}/api/${portfolio}/portfolios/v1/facilities/${facility}/promotions/get_by_uuids`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json', 'user-agent': USER_AGENT },
          body: JSON.stringify({ promotionUuids: uuids }),
          signal: AbortSignal.timeout(PROMO_TIMEOUT_MS),
        })
        if (res.ok) {
          const rows = await res.json()
          return Array.isArray(rows) ? { rows } : { status: 'failed bad response', retryAfter: 0 }
        }
        status = `failed ${res.status}`
        const ra = Number(res.headers.get('retry-after'))
        if (ra > 0) retryAfter = ra
        if (res.status !== 429 && res.status < 500) break // a 401, 403 or 404 will not get better by retrying
      } catch {
        status = 'failed unreachable'
      }
    }
    return { status, retryAfter }
  }
  const refresh = async (attempts) => {
    const out = await callMonument(attempts)
    if (out.rows) {
      await save(out.rows)
      return { rows: out.rows }
    }
    await setPause(out.retryAfter || PROMO_PAUSE_SECONDS)
    return { status: out.status }
  }

  // 1. This data center's cache.
  const fresh = await localRows(cacheKey)
  if (fresh && usable(fresh.rows, fresh.at)) return { rules: toMap(fresh.rows), status: `cached ${fresh.rows.length}` }

  // 2. Shared KV.
  const entry = await kvEntry()
  if (entry && Date.now() - (entry.at || 0) < PROMO_KV_FRESH_SECONDS * 1000 && usable(entry.rows, entry.at)) {
    later(cache.put(cacheKey, asJson(entry.rows, PROMO_CACHE_SECONDS)))
    return { rules: toMap(entry.rows), status: `kv ${entry.rows.length}` }
  }
  const staleLocal = fresh ? null : await localRows(staleKey)
  const stale = entry ? entry.rows : fresh ? fresh.rows : staleLocal ? staleLocal.rows : null

  // 3. Monument, unless it is paused or another visitor's refresh is already running.
  if (await isPaused()) {
    return stale ? { rules: toMap(stale), status: 'stale (paused)' } : { rules: null, status: 'paused' }
  }
  if (stale) {
    await setPause(PROMO_LOCK_SECONDS) // claim the refresh; a failure replaces this with the longer pause
    later(refresh(3))
    return { rules: toMap(stale), status: 'stale (refreshing)' }
  }
  const out = await refresh(2) // no copy at all, so this visitor waits for one retry
  if (out.rows) return { rules: toMap(out.rows), status: `ok ${out.rows.length}` }
  return { rules: null, status: out.status }
}

// Keeps each group's own promotion (groups can have different ones) and adds its rules when known.
async function withPromoDetails(groups, ctx) {
  const slim = groups.map((g) => {
    const p = g.bestAutoAppliedPromotion
    if (!p || !p.promotionName) return g
    return {
      ...g,
      bestAutoAppliedPromotion: {
        promotionUuid: p.promotionUuid ?? null,
        promotionName: p.promotionName,
        highestDiscountAmount: p.highestDiscountAmount ?? null,
      },
    }
  })

  const uuids = [
    ...new Set(slim.map((g) => g.bestAutoAppliedPromotion?.promotionUuid).filter((u) => typeof u === 'string' && UUID_RE.test(u))),
  ].sort()
  if (!uuids.length) return { groups: slim, status: 'none needed' }

  // Which unit groups currently have each promotion, so saved rules that miss one can be refreshed.
  const expect = new Map()
  for (const g of slim) {
    const u = g.bestAutoAppliedPromotion?.promotionUuid
    if (typeof u !== 'string' || !UUID_RE.test(u)) continue
    if (!expect.has(u)) expect.set(u, new Set())
    expect.get(u).add(g.unitGroupUuid)
  }

  const { rules, status } = await fetchPromoRules({ ...ctx, uuids, expect })
  if (!rules) return { groups: slim, status }

  const merged = slim.map((g) => {
    const p = g.bestAutoAppliedPromotion
    const d = p?.promotionUuid ? rules.get(p.promotionUuid) : null
    if (!d) return g
    // Cross-check: the promotion must list this unit group as one it is assigned to.
    if (Array.isArray(d.unitGroupUuids) && !d.unitGroupUuids.includes(g.unitGroupUuid)) return g
    return { ...g, bestAutoAppliedPromotion: { ...p, details: pickRules(d) } }
  })
  return { groups: merged, status }
}

export async function onRequestGet({ env, waitUntil }) {
  const rawKey = env.MONUMENT_API_KEY
  const key = rawKey ? rawKey.trim() : rawKey
  if (!key) return json({ error: 'MONUMENT_API_KEY is not set' }, 500)

  const monEnv = env.MONUMENT_ENV === 'stg' ? 'stg' : 'prd'
  const portfolio = env.MONUMENT_PORTFOLIO || DEFAULT_PORTFOLIO
  let base = `https://public-api.${monEnv}.monument.io/shopping/${portfolio}/v1`
  if (env.MONUMENT_API_BASE) {
    // Only https, no trailing slash. Lets staging hosts be set without a code change.
    if (!/^https:\/\/[a-z0-9.-]+\.monument\.io(\/[\w./-]*)?$/i.test(env.MONUMENT_API_BASE)) {
      return json({ error: 'MONUMENT_API_BASE must be an https monument.io URL' }, 500)
    }
    base = env.MONUMENT_API_BASE.replace(/\/+$/, '')
  }

  const facility = env.MONUMENT_FACILITY_UUID
  if (!facility) return json({ error: 'MONUMENT_FACILITY_UUID is not set' }, 500)
  if (!UUID_RE.test(facility)) return json({ error: 'Invalid facility UUID' }, 500)
  const path = `/facilities/${facility}/unitGroups`

  const cache = caches.default
  const cacheKey = new Request(`https://cache.invalid/v2/${monEnv}${path}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let upstream
  try {
    upstream = await fetch(base + path, { headers: { 'x-api-key': key, accept: 'application/json', 'user-agent': USER_AGENT } })
  } catch {
    return json({ error: 'Could not reach Monument' }, 502)
  }
  if (!upstream.ok) {
    // Never echo headers or the key. Include which environment/portfolio was
    // used plus a short upstream message, to make setup problems easy to spot.
    const detail = (await upstream.text().catch(() => '')).slice(0, 200)
    return json({ error: `Monument returned ${upstream.status}`, env: monEnv, portfolio, base: new URL(base).origin + new URL(base).pathname, detail,
      // Non-secret checks to spot a mis-pasted key: length and stray whitespace only.
      keyLength: key.length, keyHadWhitespace: rawKey !== key }, 502)
  }

  const data = await upstream.json()
  let body = data
  let promoStatus = 'n/a'
  if (Array.isArray(data)) {
    const out = await withPromoDetails(data, {
      origin: new URL(base).origin,
      portfolio,
      facility,
      apiKey: key,
      kv: env.PROMO_KV,
      monEnv,
      cache,
      waitUntil,
    })
    body = out.groups
    promoStatus = out.status
  }

  const res = json(body, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}`, 'x-promo-details': promoStatus })
  waitUntil?.(cache.put(cacheKey, res.clone()))
  return res
}
