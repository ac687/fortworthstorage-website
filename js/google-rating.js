/*
 * Live Google rating for the ".tu-rating" block.
 *
 * Reads /api/rating (Cloudflare Pages Function, Places API New, cached ~1 day) and
 * updates the score, star fill and review count. If the call fails or returns
 * {"available":false}, the numbers already in the HTML are left exactly as they are.
 */
(function () {
  var box = document.querySelector('.tu-rating')
  if (!box) return

  var GOLD = '#f59e0b'
  var GREY = '#d1d5db'

  function paintStars(rating) {
    var stars = box.querySelectorAll('.tu-rating-stars svg')
    for (var i = 0; i < stars.length; i++) {
      var fill = Math.max(0, Math.min(1, rating - i)) // 0..1 for this star
      var svg = stars[i]
      var path = svg.querySelector('path')
      if (!path) continue
      var old = svg.querySelector('defs')
      if (old) svg.removeChild(old)
      if (fill >= 0.995) { path.setAttribute('fill', GOLD); continue }
      if (fill <= 0.005) { path.setAttribute('fill', GREY); continue }
      var id = 'tu-star-' + i
      var pct = Math.round(fill * 100) + '%'
      var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      defs.innerHTML =
        '<linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' +
        '<stop offset="' + pct + '" stop-color="' + GOLD + '"/>' +
        '<stop offset="' + pct + '" stop-color="' + GREY + '"/></linearGradient>'
      svg.insertBefore(defs, svg.firstChild)
      path.setAttribute('fill', 'url(#' + id + ')')
    }
  }

  fetch('/api/rating', { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (d) {
      if (!d || !d.available || typeof d.rating !== 'number' || typeof d.count !== 'number') return

      var score = box.querySelector('.tu-rating-score')
      var count = box.querySelector('.tu-rating-count')
      if (score) score.textContent = d.rating.toFixed(1)
      if (count) {
        var label = d.count.toLocaleString('en-US') + ' Google Review' + (d.count === 1 ? '' : 's')
        if (d.url && /^https:\/\//.test(d.url)) {
          count.textContent = ''
          var a = document.createElement('a')
          a.href = d.url
          a.target = '_blank'
          a.rel = 'noopener'
          a.textContent = label
          a.style.color = 'inherit'
          a.style.textDecoration = 'none'
          count.appendChild(a)
        } else {
          count.textContent = label
        }
      }
      paintStars(d.rating)
    })
    .catch(function () { /* keep the static numbers */ })
})()
