/* Fills every [data-starting-price="WxD"] element with the lowest current web
   rate for that size, from /api/units (Monument). Sold-out unit groups still count.
   A size Monument doesn't have shows "$??", or the element's data-price-fallback text if it has one.

   Promotions: an element that also has data-promo="panel", "card", "cc" or "row" shows the lowest
   promotional price for its size (and unit type) when one applies: a pill with the promotion's name,
   the discounted price with the regular price struck through, and a "Months 1-2, then $X/mo" line.
   "panel" is the big price block on the size guide page; "card" is the price in the home page size
   guide; "cc" is a climate controlled page card; "row" is a table cell. A size with no active
   promotion looks exactly as before. The rules come from bestAutoAppliedPromotion.details in /api/units
   (same rules the rental flow uses); without details nothing is shown, since we can't tell who it is for.
   The structured data (JSON-LD) always uses regular prices.

   Availability: a rent button with data-availability="WxD" says "Join Waitlist" when that size has no
   unit free (see applyAvailability). */
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
  // Same grouping the rental flow uses, so any spelling Monument sends still matches:
  // "Temperature Controlled", "Climate-Controlled", "Climate Control"... all count as one kind.
  function category(type) {
    var t = String(type || '').toLowerCase()
    if (t.indexOf('parking') > -1) return 'parking'
    if (t.indexOf('drive') > -1) return 'drive-up'
    if (t.indexOf('temperature') > -1 || t.indexOf('climate') > -1) return 'temperature-controlled'
    return t
  }

  // What one group's promotion does, or null when it should not be shown. Mirrors the rental flow:
  // off for inactive or Business-only promotions, discount taken per payment from the rules (cents).
  function promoFor(g, rate) {
    var p = g.bestAutoAppliedPromotion, d = p && p.details
    if (!p || !p.promotionName || !d) return null
    if (d.isActive === false || String(d.tenantType || '').toLowerCase() === 'business') return null
    if (String(d.discountAmountType || 'OFF_RENT').toUpperCase() !== 'OFF_RENT') return null
    var off = 0
    if (d.discountType === 'PERCENTAGE' && typeof d.discountPercentage === 'number' && d.discountPercentage > 0) {
      off = Math.round((rate * Math.min(100, d.discountPercentage)) / 100)
    } else if (d.discountType === 'FIXED_AMOUNT' && typeof d.fixedDiscountAmount === 'number' && d.fixedDiscountAmount > 0) {
      off = d.fixedDiscountAmount
    }
    off = Math.min(off, rate)
    if (!(off > 0)) return null
    return {
      name: String(p.promotionName).trim(),
      price: rate - off, // cents, with the promotion
      regular: rate, // cents, without it
      months: typeof d.durationInMonths === 'number' && d.durationInMonths > 0 ? d.durationInMonths : null,
      firstFull: d.monthStarts === 1,
      autopay: !!d.isAutoPayRequired,
    }
  }

  // Lowest web rate per size, overall and per unit category, plus the best promotional price per size.
  function lowest(groups) {
    var all = {}, byType = {}, promoAll = {}, promoByType = {}, availAll = {}, availByType = {}
    groups.forEach(function (g) {
      var k = key(g)
      // Units free to rent, counted like the rental flow does (missing = none). A size is only
      // in these maps when Monument has a group for it, so an unknown size is never called sold out.
      var n = Math.max(0, Number(g.availableUnitCount) || 0)
      if (k) {
        var at = category(g.unitType)
        availAll[k] = (availAll[k] || 0) + n
        var ab = availByType[at] || (availByType[at] = {})
        ab[k] = (ab[k] || 0) + n
      }
      var rate = g.currentWebRate != null ? g.currentWebRate : g.currentStreetRate
      if (!k || typeof rate !== 'number' || !(rate > 0)) return
      var t = category(g.unitType)
      var bt = byType[t] || (byType[t] = {})
      if (all[k] == null || rate < all[k]) all[k] = rate
      if (bt[k] == null || rate < bt[k]) bt[k] = rate
      // A promotion is only shown from a group someone can actually rent.
      var pr = n > 0 ? promoFor(g, rate) : null
      if (pr) {
        var pt = promoByType[t] || (promoByType[t] = {})
        if (!promoAll[k] || pr.price < promoAll[k].price) promoAll[k] = pr
        if (!pt[k] || pr.price < pt[k].price) pt[k] = pr
      }
    })
    return { all: all, byType: byType, promoAll: promoAll, promoByType: promoByType, availAll: availAll, availByType: availByType }
  }

  // Rent buttons marked data-availability="WxD" (optionally data-availability-type="Temperature Controlled")
  // become "Join Waitlist" when no unit of that size (and type) is free. The link is unchanged:
  // the rental flow opens that size and offers the waitlist when everything is sold out.
  function applyAvailability(res) {
    var btns = document.querySelectorAll('[data-availability]')
    for (var i = 0; i < btns.length; i++) {
      var parts = btns[i].getAttribute('data-availability').split('x')
      var nk = sizeKey(parts[0], parts[1])
      var t = btns[i].getAttribute('data-availability-type')
      var table = t ? (res.availByType || {})[category(t)] || {} : res.availAll || {}
      if (table[nk] === 0) {
        var target = btns[i].querySelector('strong') || btns[i]
        target.textContent = 'Join Waitlist'
      }
    }
  }

  // "Months 1-2, then $60/mo" and friends.
  function promoTerms(pr) {
    var n = pr.months, then = ', then ' + money(pr.regular) + '/mo'
    if (pr.firstFull) {
      if (n === null) return 'Every full month'
      return (n === 1 ? 'First full month' : 'First ' + n + ' full months') + then
    }
    if (n === null) return 'Every month'
    return (n === 1 ? 'First month only' : 'Months 1–' + n) + then
  }
  function mk(tag, css, text) {
    var e = document.createElement(tag)
    e.style.cssText = css
    if (text != null) e.textContent = text
    return e
  }
  function pill(pr) {
    var e = mk('span', 'display:inline-block;max-width:100%;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
      'background:#dbe3f4;color:#344e8b;border-radius:999px;padding:4px 10px;font:600 11px/1.2 Inter,Arial,sans-serif', pr.name)
    e.title = pr.name
    e.setAttribute('data-promo-pill', '')
    return e
  }
  function terms(pr, css) {
    var t = promoTerms(pr) + (pr.autopay ? ' · with autopay' : '')
    return mk('div', 'font:400 12px/1.4 Inter,Arial,sans-serif;color:#5c6d8a;' + css, t)
  }
  // The big price block on the size guide: pill on top, discounted price with the old one struck through, terms below.
  function renderPanel(el, pr) {
    el.textContent = money(pr.price) + '/mo '
    el.appendChild(mk('span', 'font-size:0.5em;font-weight:400;color:#8a97ad;text-decoration:line-through', money(pr.regular)))
    var box = el.parentNode
    box.insertBefore(mk('div', 'margin-bottom:6px', null), box.firstChild).appendChild(pill(pr))
    el.parentNode.insertBefore(terms(pr, 'margin:2px 0 4px'), el.nextSibling)
  }
  // Home page size guide: the pill sits on its own line above the title and price row
  // (the price column is narrow and right-aligned), the price and terms go in the price column.
  function renderCard(el, pr) {
    el.textContent = money(pr.price) + '/mo '
    el.appendChild(mk('span', 'font-size:0.6em;font-weight:400;color:#8a97ad;text-decoration:line-through', money(pr.regular)))
    var line = el.closest ? el.closest('.price-line') : null
    var row = mk('div', 'margin-bottom:8px;max-width:100%')
    row.appendChild(pill(pr))
    if (line && line.parentNode) line.parentNode.insertBefore(row, line)
    else el.parentNode.insertBefore(row, el.parentNode.firstChild)
    el.parentNode.insertBefore(terms(pr, 'white-space:nowrap'), el.nextSibling)
  }
  // Climate controlled page cards: pill at the top of the card, price and terms in place.
  function renderCC(el, pr) {
    var holder = el.parentNode // the price block; the <strong> sits inside it
    el.textContent = money(pr.price) + '/mo '
    el.appendChild(mk('span', 'font-size:0.6em;font-weight:400;color:#8a97ad;text-decoration:line-through', money(pr.regular)))
    var card = holder.closest ? holder.closest('.div-block-33') : null
    var row = mk('div', 'min-height:28px;display:flex;align-items:center;margin-bottom:6px')
    row.setAttribute('data-promo-row', '')
    row.appendChild(pill(pr))
    if (card) card.insertBefore(row, card.firstChild)
    var t = terms(pr, 'min-height:17px')
    t.setAttribute('data-promo-terms', '')
    holder.parentNode.insertBefore(t, holder.nextSibling)
  }
  // Cards side by side stay level: a card without a promotion gets empty space where the others have one.
  function levelCards() {
    var cards = document.querySelectorAll('.div-block-33')
    var any = false
    for (var i = 0; i < cards.length; i++) if (cards[i].querySelector('[data-promo-row]')) any = true
    if (!any) return
    for (var j = 0; j < cards.length; j++) {
      var c = cards[j]
      if (!c.querySelector('[data-starting-price][data-promo="cc"]') || c.querySelector('[data-promo-row]')) continue
      c.insertBefore(mk('div', 'min-height:34px'), c.firstChild)
      var price = c.querySelector('[data-starting-price]')
      var hold = price && price.parentNode
      if (hold && hold.parentNode) hold.parentNode.insertBefore(mk('div', 'min-height:17px'), hold.nextSibling)
    }
  }
  // A table cell: same content, stacked and centered.
  function renderRow(el, pr) {
    el.textContent = ''
    el.style.minWidth = '0'
    var wrap = mk('div', 'display:flex;flex-direction:column;align-items:center;gap:3px;max-width:100%;min-width:0;text-align:center')
    wrap.appendChild(pill(pr))
    var line = mk('div', 'line-height:1.2', money(pr.price) + '/mo ')
    line.appendChild(mk('span', 'font-size:13px;font-weight:400;color:#8a97ad;text-decoration:line-through', money(pr.regular)))
    wrap.appendChild(line)
    wrap.appendChild(terms(pr, 'font-size:11px'))
    el.appendChild(wrap)
  }
  // An element may add data-price-type="Temperature Controlled" to price only that unit type.
  function show(res) {
    var promoShown = false
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-starting-price')
      var parts = k.split('x'), nk = sizeKey(parts[0], parts[1])
      var t = els[i].getAttribute('data-price-type')
      var table = t ? res.byType[category(t)] || {} : res.all
      // data-price-fallback: text to keep when Monument has no price for this size (or can't be reached).
      els[i].textContent = table[nk] != null ? money(table[nk]) + '/mo' : els[i].getAttribute('data-price-fallback') || MISSING
      var mode = els[i].getAttribute('data-promo')
      var pr = mode && (t ? (res.promoByType || {})[category(t)] || {} : res.promoAll || {})[nk]
      if (pr && (mode === 'panel' || mode === 'row' || mode === 'card' || mode === 'cc')) {
        if (mode === 'panel') renderPanel(els[i], pr)
        else if (mode === 'cc') renderCC(els[i], pr)
        else if (mode === 'card') renderCard(els[i], pr)
        else renderRow(els[i], pr)
        promoShown = true
      }
      els[i].style.visibility = ''
    }
    // Tables mark their wrapper with data-promo-note so the footnote only appears when a row has a promotion.
    var notes = document.querySelectorAll('[data-promo-note]')
    for (var j = 0; promoShown && j < notes.length; j++) {
      notes[j].parentNode.insertBefore(
        mk('div', 'margin-top:8px;font:400 12px/1.4 Inter,Arial,sans-serif;color:#5c6d8a', 'Promotion applies to the sizes marked above. Final terms are confirmed at checkout.'),
        notes[j].nextSibling
      )
    }
    levelCards()
    applyAvailability(res)
    updateStructuredData(res)
  }
  // Keep the Google structured-data offer prices in step with what is shown.
  function sizeKey(w, d) { return Math.min(+w, +d) + 'x' + Math.max(+w, +d) }
  function updateStructuredData(res) {
    var low = res.all
    // Pages whose structured-data text quotes prices for one unit type name it on the script tag.
    var ldType = (document.querySelector('script[src*="starting-prices"]') || {}).getAttribute
      ? document.querySelector('script[src*="starting-prices"]').getAttribute('data-ld-price-type') : null
    var typed = ldType ? res.byType[category(ldType)] || {} : null
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
