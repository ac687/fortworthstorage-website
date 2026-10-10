// Cloudflare Pages Function: GET /api/cart-preview?unitGroupUuid=...&promotionUuid=...&date=YYYY-MM-DD
// Asks Monument for the cart a same-day rental would produce (Shopping API,
// POST /shopping-cart/generate-detached-cart, no lead needed) and returns just the
// fields the page needs. The API key stays here as a Cloudflare secret.
//
// Settings: same as /api/units (MONUMENT_API_KEY, MONUMENT_ENV, MONUMENT_FACILITY_UUID,
// MONUMENT_PORTFOLIO, MONUMENT_API_BASE). The facility always comes from the settings,
// never from the request.
//
// The x-cart-status response header says what happened (ok, retried without date, failed 403 ...).

const DEFAULT_PORTFOLIO = 'storageoperationsgroup'
const CACHE_SECONDS = 120
const TIMEOUT_MS = 5000
const UUID_RE = /^[0-9a-f-]{36}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const USER_AGENT = 'tidyup-storage-site/1.0'

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })

// Only the fields the page uses.
function slim(item) {
  const t = item?.itemType ?? {}
  const promo = t.promotion ?? (Array.isArray(t.promotions) ? t.promotions[0] : null) ?? null
  return {
    name: t.itemTypeName ?? '',
    category: t.category ?? '',
    isRecurring: !!t.isRecurring,
    isProratedAtMoveIn: !!t.isProratedAtMoveIn,
    invoiceGenerationType: t.invoiceGenerationType ?? null,
    fixedFeeAmount: t.fixedFeeAmount ?? null,
    fullNonProratedAmount: t.fullNonProratedAmount ?? null,
    taxAmountInPennies: Number(t.taxAmountInPennies) || 0,
    amountInPennies: Number(item.amountInPennies) || 0,
    preProrationAmountInPennies: item.preProrationAmountInPennies ?? null,
    billingPeriod: Number(item.billingPeriod) || 1,
    dateDesiredMoveIn: item.dateDesiredMoveIn ?? null,
    promotion: promo
      ? {
          promotionUuid: promo.promotionUuid ?? null,
          promotionName: promo.promotionName ?? null,
          discountAmountInPennies: Number(promo.discountAmountInPennies) || 0,
          discountType: promo.discountType ?? null,
        }
      : null,
  }
}

export async function onRequestGet({ env, request, waitUntil }) {
  const key = (env.MONUMENT_API_KEY || '').trim()
  if (!key) return json({ error: 'MONUMENT_API_KEY is not set' }, 500)
  const facility = env.MONUMENT_FACILITY_UUID
  if (!facility || !UUID_RE.test(facility)) return json({ error: 'MONUMENT_FACILITY_UUID is not set or invalid' }, 500)

  const q = new URL(request.url).searchParams
  const unitGroupUuid = q.get('unitGroupUuid') || ''
  const promotionUuid = q.get('promotionUuid') || ''
  const date = q.get('date') || ''
  if (!UUID_RE.test(unitGroupUuid)) return json({ error: 'unitGroupUuid is required' }, 400)
  if (promotionUuid && !UUID_RE.test(promotionUuid)) return json({ error: 'Invalid promotionUuid' }, 400)
  if (date) {
    // The facility's own "today", sent by the page. Must be within a day of now.
    const ms = Date.parse(date + 'T00:00:00Z')
    if (!DATE_RE.test(date) || Number.isNaN(ms) || Math.abs(ms - Date.now()) > 2 * 86400000) return json({ error: 'Invalid date' }, 400)
  }

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
  const cacheKey = new Request(`https://cache.invalid/cart/${monEnv}/${facility}/${unitGroupUuid}/${promotionUuid}/${date}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const call = async (withDate) => {
    const body = { facilityUuid: facility, unitGroupUuid }
    if (promotionUuid) body.promotionUuids = [promotionUuid]
    // Noon UTC lands on the same calendar day in any US time zone. A bare date is read as midnight UTC,
    // which is the evening before in New York, and Monument then prorates one day too many.
    if (withDate && date) body.dateDesiredMoveIn = `${date}T12:00:00.000Z`
    return fetch(`${base}/shopping-cart/generate-detached-cart`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json', accept: 'application/json', 'user-agent': USER_AGENT },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  }

  let status = 'ok'
  let upstream
  try {
    upstream = await call(true)
    // If Monument rejects the date format, ask again without it (it then defaults to its own today).
    if (date && (upstream.status === 400 || upstream.status === 422)) {
      upstream = await call(false)
      status = 'retried without date'
    }
  } catch {
    return json({ error: 'Could not reach Monument' }, 502)
  }
  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 200)
    return json({ error: `Monument returned ${upstream.status}`, detail }, 502, { 'x-cart-status': `failed ${upstream.status}` })
  }

  let data
  try {
    data = await upstream.json()
  } catch {
    return json({ error: 'Bad response from Monument' }, 502)
  }
  if (!data || !Array.isArray(data.items) || !data.items.length) return json({ error: 'Empty cart' }, 502, { 'x-cart-status': 'failed empty' })

  const res = json({ items: data.items.map(slim) }, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}`, 'x-cart-status': status })
  waitUntil?.(cache.put(cacheKey, res.clone()))
  return res
}
