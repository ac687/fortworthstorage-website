// Cloudflare Pages Function: GET /api/units
// Returns Monument's unit groups for one facility. The API key stays here as a
// Cloudflare secret and is never sent to the browser.
//
// Settings (Cloudflare > Settings > Variables and Secrets):
//   MONUMENT_API_KEY        secret  (required)
//   MONUMENT_ENV            text    "stg" or "prd" (default "prd")
//   MONUMENT_FACILITY_UUID  text    which facility to list (set after picking one)
//   MONUMENT_PORTFOLIO      text    optional, default "storageoperationsgroup"
//   MONUMENT_API_BASE       text    optional full base URL, overrides the two above,
//                                   e.g. https://<host>/shopping/<portfolio>/v1
//
// Temporary helper: /api/units?facilities=1 lists the facilities the key can see
// (names + UUIDs only) so the right one can be chosen. Remove once chosen.

const DEFAULT_PORTFOLIO = 'storageoperationsgroup'
const CACHE_SECONDS = 180

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })

export async function onRequestGet({ request, env, waitUntil }) {
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
  const url = new URL(request.url)
  const listing = url.searchParams.has('facilities')

  // TEMPORARY: /api/units?promos=1&facility=<uuid> tries the promotions call with
  // different options for one facility and reports counts only. Remove before launch.
  if (url.searchParams.has('promos')) {
    const hdrs = { 'x-api-key': key, accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'fortworth-website/1.0' }
    const fac = url.searchParams.get('facility') || env.MONUMENT_FACILITY_UUID
    if (!/^[0-9a-f-]{36}$/i.test(fac || '')) return json({ error: 'Invalid facility' }, 400)
    const groupsRes = await fetch(`${base}/facilities/${fac}/unitGroups`, { headers: hdrs })
    const groups = groupsRes.ok ? await groupsRes.json() : []
    const ids = groups.map((g) => g.unitGroupUuid)
    const variants = []
    for (const autopay of [false, true]) {
      for (const withIds of [false, true]) {
        variants.push({ autopay, withIds })
      }
    }
    const results = []
    for (const v of variants) {
      const body = { facilityUuids: [fac], isForBusiness: false, isAutopayEnabled: v.autopay }
      if (v.withIds) body.unitGroupUuids = ids.slice(0, 10)
      const r = await fetch(`${base}/promotions/eligible-auto-applied-promotions-with-highest-discount`, { method: 'POST', headers: hdrs, body: JSON.stringify(body) })
      const text = await r.text()
      let parsed = null
      try { parsed = JSON.parse(text) } catch {}
      results.push({ ...v, status: r.status, count: Array.isArray(parsed) ? parsed.length : null, sample: Array.isArray(parsed) ? parsed.slice(0, 2) : text.slice(0, 160) })
    }
    return json({ facility: fac, unitGroups: groups.length, results })
  }

  // TEMPORARY: /api/units?policies=1&from=0&to=25 lists each facility's reservation
  // and waitlist settings. Remove before launch.
  if (url.searchParams.has('policies')) {
    const hdrs = { 'x-api-key': key, accept: 'application/json', 'user-agent': 'fortworth-website/1.0' }
    const from = Math.max(0, Number(url.searchParams.get('from')) || 0)
    const to = Math.min(from + 25, Number(url.searchParams.get('to')) || from + 25)
    const list = await (await fetch(`${base}/facilities`, { headers: hdrs })).json()
    const slice = list.slice(from, to)
    const out = []
    for (let i = 0; i < slice.length; i += 5) {
      const rows = await Promise.all(
        slice.slice(i, i + 5).map(async (f) => {
          const r = await fetch(`${base}/policies/facilities/${f.facilityUuid}`, { headers: hdrs })
          if (!r.ok) return { name: f.facilityName, uuid: f.facilityUuid, status: r.status }
          const pol = await r.json()
          return { name: f.facilityName, uuid: f.facilityUuid, reservations: pol.allowReservations, waitlist: pol.allowWaitlist }
        }),
      )
      out.push(...rows)
    }
    return json({ total: list.length, from, to, facilities: out })
  }

  // TEMPORARY test helper: /api/units?scan=1&from=0&to=20 summarizes facilities
  // (unit types, promotions) so a good staging test facility can be chosen.
  // Max 20 facilities per call (Cloudflare limits subrequests). Remove before launch.
  if (url.searchParams.has('scan')) {
    const hdrs = { 'x-api-key': key, accept: 'application/json', 'user-agent': 'fortworth-website/1.0' }
    const from = Math.max(0, Number(url.searchParams.get('from')) || 0)
    const to = Math.min(from + 20, Number(url.searchParams.get('to')) || from + 20)
    const list = await (await fetch(`${base}/facilities`, { headers: hdrs })).json()
    const out = await Promise.all(
      list.slice(from, to).map(async (f) => {
        const id = f.facilityUuid
        try {
          const [g, p] = await Promise.all([
            fetch(`${base}/facilities/${id}/unitGroups`, { headers: hdrs }).then((r) => (r.ok ? r.json() : [])),
            fetch(`${base}/promotions/eligible-auto-applied-promotions-with-highest-discount`, {
              method: 'POST',
              headers: { ...hdrs, 'content-type': 'application/json' },
              body: JSON.stringify({ facilityUuids: [id], isForBusiness: false, isAutopayEnabled: false }),
            }).then(async (r) => (r.ok ? r.json() : { __status: r.status, __body: (await r.text()).slice(0, 160) })),
          ])
          const promoFailed = p && !Array.isArray(p) && p.__status
          return {
            promoStatus: promoFailed ? { status: p.__status, body: p.__body } : 'ok',
            name: f.facilityName,
            uuid: id,
            unitTypes: [...new Set(g.map((x) => x.unitType))],
            groups: g.length,
            soldOutGroups: g.filter((x) => !x.availableUnitCount).length,
            promos: [...new Set((Array.isArray(p) ? p : []).map((x) => x.promotionName))],
            promoGroups: Array.isArray(p) ? p.length : 0,
          }
        } catch {
          return { name: f.facilityName, uuid: id, error: true }
        }
      }),
    )
    return json({ total: list.length, from, to, facilities: out })
  }

  let path
  if (listing) {
    path = '/facilities'
  } else {
    const facility = env.MONUMENT_FACILITY_UUID
    if (!facility) return json({ error: 'MONUMENT_FACILITY_UUID is not set' }, 500)
    if (!/^[0-9a-f-]{36}$/i.test(facility)) return json({ error: 'Invalid facility UUID' }, 500)
    path = `/facilities/${facility}/unitGroups`
  }

  const cache = caches.default
  const cacheKey = new Request(`https://cache.invalid/${monEnv}${path}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let upstream
  try {
    upstream = await fetch(base + path, { headers: { 'x-api-key': key, accept: 'application/json', 'user-agent': 'fortworth-website/1.0' } })
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
  if (!listing && Array.isArray(data)) {
    // Unit groups don't carry promotions; Monument has a separate call for the
    // best auto-applied promotion per unit group. If it fails, show prices without it.
    try {
      const promoRes = await fetch(`${base}/promotions/eligible-auto-applied-promotions-with-highest-discount`, {
        method: 'POST',
        headers: { 'x-api-key': key, 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'fortworth-website/1.0' },
        body: JSON.stringify({ facilityUuids: [env.MONUMENT_FACILITY_UUID], isForBusiness: false, isAutopayEnabled: false }),
      })
      if (promoRes.ok) {
        const promos = await promoRes.json()
        const byGroup = new Map((Array.isArray(promos) ? promos : []).map((x) => [x.unitGroupUuid, x]))
        body = data.map((g) => {
          const p = byGroup.get(g.unitGroupUuid)
          return p ? { ...g, bestAutoAppliedPromotion: { promotionName: p.promotionName, highestDiscountAmount: p.highestDiscountAmount } } : g
        })
      }
    } catch {
      /* promotions are optional */
    }
  }
  if (listing) {
    const rows = Array.isArray(data) ? data : data.data ?? data.facilities ?? []
    body = rows.map((f) => ({ uuid: f.facilityUuid ?? f.uuid, name: f.facilityName ?? f.name, address: f.address }))
  }

  const res = json(body, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}` })
  waitUntil?.(cache.put(cacheKey, res.clone()))
  return res
}
