/*
 * Keeps the AggregateRating in the page's Google structured data (JSON-LD) in step with the
 * live Google rating shown on the site.
 *
 * Reads /api/rating (Cloudflare Pages Function, cached ~1 day, same data as js/google-rating.js)
 * and rewrites ratingValue / reviewCount on every AggregateRating in the page's JSON-LD.
 * If the call fails or returns {"available":false}, the numbers already in the HTML are left
 * exactly as they are, so the schema never ends up empty or invented.
 *
 * Loaded on every page (the schema is on every page), unlike google-rating.js, which only
 * paints the visible rating block on the home page.
 */
(function () {
  var tags = document.querySelectorAll('script[type="application/ld+json"]')
  if (!tags.length) return

  function update(d) {
    var rating = d.rating.toFixed(1)
    var count = String(d.count)
    for (var i = 0; i < tags.length; i++) {
      var data
      try { data = JSON.parse(tags[i].textContent) } catch (e) { continue }
      var changed = false
      ;(function walk(n) {
        if (!n || typeof n !== 'object') return
        if (Array.isArray(n)) return n.forEach(walk)
        if (n['@type'] === 'AggregateRating') {
          if ('ratingValue' in n) { n.ratingValue = rating; changed = true }
          if ('reviewCount' in n) { n.reviewCount = count; changed = true }
          if ('ratingCount' in n) { n.ratingCount = count; changed = true }
        }
        Object.keys(n).forEach(function (k) { walk(n[k]) })
      })(data)
      if (changed) tags[i].textContent = JSON.stringify(data)
    }
  }

  fetch('/api/rating', { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (d) {
      if (!d || !d.available || typeof d.rating !== 'number' || typeof d.count !== 'number') return
      if (!(d.rating > 0 && d.rating <= 5) || !(d.count > 0)) return
      update(d)
    })
    .catch(function () { /* keep the static numbers */ })
})()
