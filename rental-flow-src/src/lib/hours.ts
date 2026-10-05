// Facility hours are stored as 24-hour "HH:MM" strings and always read in the
// facility's own time zone, so a visitor in another zone sees the right status.

export type HoursWindow = { open: string; close: string }

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Minutes since midnight right now at the facility.
function facilityMinutes(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return (get('hour') % 24) * 60 + get('minute')
}

// True while `now` falls inside the daily window (open inclusive, close exclusive).
// A window whose close is earlier than its open runs past midnight.
export function isOpenNow(now: Date, timeZone: string, w: HoursWindow) {
  const t = facilityMinutes(now, timeZone)
  const open = toMinutes(w.open)
  const close = toMinutes(w.close)
  if (open === close) return true // 24 hours
  return open < close ? t >= open && t < close : t >= open || t < close
}

// "06:00" -> "6:00 AM"
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

export function formatWindow(w: HoursWindow) {
  return `Daily: ${formatTime(w.open)} – ${formatTime(w.close)}`
}

// "6:10 AM EDT", the current time at the facility.
export function facilityClock(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(now)
}
