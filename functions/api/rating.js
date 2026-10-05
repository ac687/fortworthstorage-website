// Cloudflare Pages Function: GET /api/rating
// Returns the facility's live Google rating and review count (Places API, new).
//
// Settings (Cloudflare > Settings > Variables and Secrets):
//   GOOGLE_PLACES_API_KEY  secret  (restrict the key to "Places API (New)" in Google Cloud)
//   GOOGLE_PLACE_ID        text    this website's Google Business Place ID
//
// Without both settings, or if Google can't be reached, it answers {"available":false}
// and the page simply hides the rating, so a stale number is never shown.

const CACHE_SECONDS = 86400 // one day; keeps Google usage (and cost) tiny

const json = (body, cache) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': cache },
  })

export async function onRequestGet({ env, waitUntil }) {
  const key = env.GOOGLE_PLACES_API_KEY ? env.GOOGLE_PLACES_API_KEY.trim() : ''
  const placeId = env.GOOGLE_PLACE_ID ? env.GOOGLE_PLACE_ID.trim() : ''
  if (!key || !placeId || !/^[\w-]{10,200}$/.test(placeId)) {
    return json({ available: false }, 'no-store')
  }

  const cache = caches.default
  const cacheKey = new Request(`https://cache.invalid/rating/${placeId}`)
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let res
  try {
    res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': key,
        // Ask only for what we show, which also keeps the request in the cheapest tier.
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri',
        accept: 'application/json',
      },
    })
  } catch {
    return json({ available: false }, 'no-store')
  }
  if (!res.ok) return json({ available: false }, 'no-store')

  const p = await res.json()
  if (typeof p.rating !== 'number' || typeof p.userRatingCount !== 'number') {
    return json({ available: false }, 'no-store')
  }

  const out = json(
    { available: true, rating: p.rating, count: p.userRatingCount, url: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : null },
    `public, max-age=${CACHE_SECONDS}`,
  )
  waitUntil?.(cache.put(cacheKey, out.clone()))
  return out
}
