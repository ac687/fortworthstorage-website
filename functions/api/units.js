// Cloudflare Pages Function: GET /api/units
// Returns Monument's unit groups for one facility, with the full details of each group's
// promotion. The API keys stay here as Cloudflare secrets and are never sent to the browser.
//
// Settings (Cloudflare > Settings > Variables and Secrets):
//   MONUMENT_API_KEY              secret  (required) Shopping API key
//   MONUMENT_INTEGRATION_API_KEY  secret  optional Integration API key, used for promotion details.
//                                         Falls back to MONUMENT_API_KEY when not set.
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
//   2. One batched POST .../promotions/get_by_uuids (Integration API) returns the rules for the
//      distinct promotions: percentage or fixed amount, how many months, which invoice it starts on,
//      who it is for, and whether autopay is required. They are attached to each group as
//      bestAutoAppliedPromotion.details.
//   If step 2 fails for any reason the groups are still returned with the promotion from step 1, and the
//   page falls back to reading the promotion's name. The x-promo-details response header says what happened.

const DEFAULT_PORTFOLIO = 'storageoperationsgroup'
const CACHE_SECONDS = 180 // unit availability and rates
const PROMO_CACHE_SECONDS = CACHE_SECONDS // promotion rules refresh on the same schedule as rates and availability
const PROMO_TIMEOUT_MS = 4000
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
async function fetchPromoRules({ uuids, origin, portfolio, facility, apiKey, monEnv, cache, waitUntil }) {
  const cacheKey = new Request(`https://cache.invalid/${monEnv}/promos/${facility}/${uuids.join(',')}`)
  const toMap = (rows) => new Map(rows.filter((r) => r && r.promotionUuid).map((r) => [r.promotionUuid, r]))

  const hit = await cache.match(cacheKey)
  if (hit) {
    try {
      const rows = await hit.json()
      if (Array.isArray(rows)) return { rules: toMap(rows), status: `cached ${rows.length}` }
    } catch {
      /* fall through and fetch again */
    }
  }

  try {
    const res = await fetch(`${origin}/api/${portfolio}/portfolios/v1/facilities/${facility}/promotions/get_by_uuids`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'content-type': 'application/json', accept: 'application/json', 'user-agent': USER_AGENT },
      body: JSON.stringify({ promotionUuids: uuids }),
      signal: AbortSignal.timeout(PROMO_TIMEOUT_MS),
    })
    if (!res.ok) return { rules: null, status: `failed ${res.status}` }
    const rows = await res.json()
    if (!Array.isArray(rows)) return { rules: null, status: 'failed bad response' }
    waitUntil?.(cache.put(cacheKey, json(rows, 200, { 'cache-control': `public, max-age=${PROMO_CACHE_SECONDS}` })))
    return { rules: toMap(rows), status: `ok ${rows.length}` }
  } catch {
    return { rules: null, status: 'failed unreachable' }
  }
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

  const { rules, status } = await fetchPromoRules({ ...ctx, uuids })
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
  const integrationKey = (env.MONUMENT_INTEGRATION_API_KEY || '').trim() || key

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
      apiKey: integrationKey,
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
