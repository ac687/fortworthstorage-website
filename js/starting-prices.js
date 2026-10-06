/* Fills every [data-starting-price="WxD"] element with the lowest current web
   rate for that size, from /api/units (Monument). Promotions are ignored and
   sold-out unit groups still count. A size Monument doesn't have shows "$??". */
(function () {
  var els = document.querySelectorAll('[data-starting-price]')
  if (!els.length) return
  var MISSING = '$??'

  function key(g) {
    var w = Number(g.unitGroupWidth), d = Number(g.unitGroupDepth)
    if (!(w > 0) || !(d > 0)) return null
    return Math.min(w, d) + 'x' + Math.max(w, d)
  }
  function money(cents) {
    var v = cents / 100
    return '$' + (v % 1 ? v.toFixed(2) : String(v))
  }
  // Lowest web rate per size, overall and per unit type (lower-case type name).
  function lowest(groups) {
    var all = {}, byType = {}
    groups.forEach(function (g) {
      var k = key(g)
      var rate = g.currentWebRate != null ? g.currentWebRate : g.currentStreetRate
      if (!k || typeof rate !== 'number' || !(rate > 0)) return
      var t = String(g.unitType || '').toLowerCase()
      var bt = byType[t] || (byType[t] = {})
      if (all[k] == null || rate < all[k]) all[k] = rate
      if (bt[k] == null || rate < bt[k]) bt[k] = rate
    })
    return { all: all, byType: byType }
  }
  // An element may add data-price-type="Temperature Controlled" to price only that unit type.
  function show(res) {
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-starting-price')
      var parts = k.split('x'), nk = sizeKey(parts[0], parts[1])
      var t = els[i].getAttribute('data-price-type')
      var table = t ? res.byType[t.toLowerCase()] || {} : res.all
      els[i].textContent = table[nk] != null ? money(table[nk]) + '/mo' : MISSING
      els[i].style.visibility = ''
    }
    updateStructuredData(res)
  }
  // Keep the Google structured-data offer prices in step with what is shown.
  function sizeKey(w, d) { return Math.min(+w, +d) + 'x' + Math.max(+w, +d) }
  function updateStructuredData(res) {
    var low = res.all
    // Pages whose structured-data text quotes prices for one unit type name it on the script tag.
    var ldType = (document.querySelector('script[src*="starting-prices"]') || {}).getAttribute
      ? document.querySelector('script[src*="starting-prices"]').getAttribute('data-ld-price-type') : null
    var typed = ldType ? res.byType[ldType.toLowerCase()] || {} : null
    var tags = document.querySelectorAll('script[type="application/ld+json"]')
    for (var i = 0; i < tags.length; i++) {
      var data
      try { data = JSON.parse(tags[i].textContent) } catch (e) { continue }
      var changed = false
      ;(function walk(n) {
        if (!n || typeof n !== 'object') return
        if (Array.isArray(n)) return n.forEach(walk)
        var m, cents
        // Product with "@id": ".../#unit-10-20" and an "offers" object
        if (typeof n['@id'] === 'string' && n.offers && (m = n['@id'].match(/#unit-(\d+)-(\d+)$/))) {
          cents = low[sizeKey(m[1], m[2])]
          if (cents != null) { n.offers.price = (cents / 100).toFixed(2); changed = true }
        }
        // Offer whose itemOffered is named like "10x20 Storage Unit"
        if (n.itemOffered && typeof n.itemOffered.name === 'string' && 'price' in n &&
            (m = n.itemOffered.name.match(/(\d+)\s*[x\u00d7]\s*(\d+)/))) {
          cents = low[sizeKey(m[1], m[2])]
          if (cents != null) {
            n.price = (cents / 100).toFixed(2)
            if (typeof n.itemOffered.description === 'string') {
              n.itemOffered.description = n.itemOffered.description.replace(/Starting at \$[\d.,]+\/month/, 'Starting at ' + money(cents) + '/month')
            }
            changed = true
          }
        }
        // Text like "start from $75/mo for a 5\u00d75" -> live price for that size and type.
        if (typed) {
          Object.keys(n).forEach(function (k) {
            if (typeof n[k] !== 'string') return
            var s = n[k].replace(/\$[\d.,]+\/mo for a (\d+)\s*[x\u00d7]\s*(\d+)/g, function (all, w, d) {
              var cents = typed[sizeKey(w, d)]
              return cents != null ? money(cents) + '/mo for a ' + w + '\u00d7' + d : all
            })
            if (s !== n[k]) { n[k] = s; changed = true }
          })
        }
        Object.keys(n).forEach(function (k) { walk(n[k]) })
      })(data)
      if (changed) tags[i].textContent = JSON.stringify(data)
    }
  }

  for (var i = 0; i < els.length; i++) els[i].style.visibility = 'hidden'
  var done = false
  function finish(res) { if (!done) { done = true; show(res) } }
  setTimeout(function () { finish({ all: {}, byType: {} }) }, 5000)
  fetch('/api/units', { headers: { accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json() })
    .then(function (d) { finish(lowest(Array.isArray(d) ? d : [])) })
    .catch(function () { finish({ all: {}, byType: {} }) })
})()
