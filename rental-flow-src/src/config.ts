// Everything facility-specific lives here.

export const config = {
  facility: {
    name: 'Fort Worth Storage',
    street: '229 N Beach St',
    cityLine: 'Fort Worth, TX 76111',
    phoneDisplay: '(817) 838-6781',
    phoneHref: 'tel:+18178386781',
    rating: 4.8,
    reviewCount: 41,
    // Hours are 24-hour HH:MM, read in the facility's own time zone (IANA name).
    timeZone: 'America/Chicago',
    gateHours: { open: '06:00', close: '22:00' },
    supportHours: { open: '08:00', close: '20:00' },
    amenities: [
      'Drive-Up Access',
      'Fully Gated Facility',
      '24/7 HD Video Surveillance',
      '24-Hour Access Upgrade',
      'Rent Online in Minutes',
    ],
    photos: [
      { src: '/images/fort-worth-storage-rear-row-1920x1080.webp', alt: 'Rear row of drive-up storage units at Fort Worth Storage' },
      { src: '/images/fort-worth-storage-front-row-1200x900.webp', alt: 'Front row of storage units at Fort Worth Storage' },
      { src: '/images/fort-worth-storage-google-square-600x600.webp', alt: 'Fort Worth Storage in Fort Worth, TX' },
    ],
  },

  // Photo shown on each unit card, by size.
  unitPhotos: {
    '10x10': '/images/10x10-unit-thumb.webp',
    '10x20': '/images/10x20-unit-thumb.webp',
    '10x30': '/images/10x30-unit-thumb.webp',
    '20x20': '/images/20x20-unit-thumb.webp',
    '20x30': '/images/20x30-unit-thumb.webp',
  } as Record<string, string>,

  // Tier names exactly as they appear in Monument's unit group "description".
  tiers: {
    Essential: { rank: 0, label: 'Best value', copy: 'The most affordable way to store.' },
    Preferred: { rank: 1, label: 'Most popular', copy: 'Added convenience with flexible terms.', highlight: true },
    Premium: { rank: 2, label: 'Premium pick', copy: 'Premium placement for maximum convenience.' },
  } as Record<string, { rank: number; label: string; copy: string; highlight?: boolean }>,

  // Amenity bullets in the tier popup, typed in /js/rental-flow-settings.js.
  // Outer key = unit type ("Drive-Up"), "10x20 Drive-Up" for one size, or "default"; inner key = tier name.
  tierAmenities: {} as Record<string, Record<string, string[]>>,
  // Bullets hidden on a tier when every other tier of that unit is sold out (settings file).
  hideWhenOtherTiersSoldOut: [] as string[],

  // Bullets on the unit-type chooser (size guide links), typed in /js/rental-flow-settings.js.
  // Key = unit type ("Drive-Up"); a type with no list here uses the built-in wording.
  typeBullets: {} as Record<string, string[]>,

  monument: {
    host: 'https://tenant-suite.prd.monument.io',
    portfolio: 'storageoperationsgroup',
    brandUuid: '36354d02-2791-11f1-b21b-bb17b36a561d',
    facilityUuid: '7ea9ca6e-cfcc-11f0-887a-5565cdff6098',
    // Same branding settings as the original Fort Worth Storage iframe.
    params:
      'logoenab=null&faviconenab=dc8b5810-27a6-11f1-81b2-2b540d0228d7&pcolor=%23c2410c&scolor=%231f2e4e&trackerenab=true&apayreq=false&tcreq=true&globalbrandingenab=false',
    trustedOrigins: ['https://tenant-suite.prd.monument.io', 'https://tenant-suite.stg.monument.io'],
  },

  // 'static' uses src/data/unitGroups.static.json.
  // 'api' fetches live data from the Cloudflare function at apiPath (step 4/5).
  dataSource: 'api' as 'static' | 'api',
  apiPath: '/api/units',
  facilityApiPath: '/api/facility',
  ratingApiPath: '/api/rating',

  // "Estimated due today" box above the checkout. Same-day rentals only.
  estimate: {
    protectionMonthly: 12, // default protection plan, dollars / month
    protectionCoverage: 2000, // coverage amount shown in the label, dollars
    adminFee: 25, // one time, dollars
    // Only used for the built-in calculation (the fallback when Monument's cart preview can't be reached).
    // 'first-of-month': prorated move-in month, bills on the 1st. 'anniversary': full first month, bills on the move-in day.
    // The cart preview itself decides this from what Monument returns. Can also be set in /js/rental-flow-settings.js.
    billingMode: 'first-of-month' as 'first-of-month' | 'anniversary',
    cartPath: '/api/cart-preview', // set to '' to skip the cart preview and always use the built-in calculation
    timeZone: 'America/Chicago', // facility time zone, decides what "today" is
    // A same-day rental in the last N days of the month also prepays next month's rent and
    // protection plan. 0 turns the rule off. Can also be set in /js/rental-flow-settings.js.
    prepayLastDays: 5,
    // A promotion whose name contains one of these phrases starts at the first FULL month, so the
    // prorated move-in month is not discounted. Case does not matter. Can also be set in /js/rental-flow-settings.js.
    fullMonthPromoWords: ['full month', 'second month', '2nd month'] as string[],
  },

  // "Rate locked" item at the bottom of every unit card's price box, and the navy rate lock panel in the side column.
  // Turn it on only if it is true for this facility, including the rent after a promotion ends.
  // Set in /js/rental-flow-settings.js (rateLock).
  rateLock: {
    enabled: false,
    text: 'Rate locked 12 months',
    panelTitle: '12-month rate lock',
    panelText: 'The rate you start at is the rate you pay for 12 months.',
  },
  // Small gray note in the price box's bottom bar on any size that has more than one tier, because the prices shown are the lowest ones.
  // Empty hides it. Set in /js/rental-flow-settings.js (priceNote).
  priceNote: 'Lowest price shown',
  // Units with no promotion: show the in-store rate crossed out next to the online price ("Online price: X% off").
  // Only shown when the in-store rate is higher than the online rate. Set in /js/rental-flow-settings.js (showStreetRate).
  showStreetRate: true,
  // The one unit that carries the "Most popular size" ribbon. unit = size + type, e.g. '10x10 Drive Up' (empty = none).
  // Set in /js/rental-flow-settings.js (popular: {...}).
  popular: { unit: '', ribbonText: 'Most popular size' },
  // The line under "Available units". Set in /js/rental-flow-settings.js (tagline).
  tagline: 'Rent online in minutes. Move in today.',
  // Desktop side column: two review quotes (settings file: reviews). Rating and count come live from Google.
  reviews: [] as { name: string; date: string; text: string }[],
  // "What's due today?" link on each unit card (popup on desktop, bottom sheet on phones).
  moveInCost: { enabled: false },

  // "What fits" block beside the estimate on desktop, typed in /js/rental-flow-settings.js.
  // Key = size ("5x5"). line is the short line under the size on the unit card; summary is one short line; fits is a short list.
  // `line` sits under the size on tablets and desktop; `short` is the shorter version beside the size on phones (empty = use `line`).
  sizeInfo: {} as Record<string, { summary: string; fits: string[]; line: string; short: string }>,
  sizeGuidePath: '/size-guide',

  // Free disc lock this facility gives every tenant. Off by default; a site turns it on, and can change
  // every word, in /js/rental-flow-settings.js (discLock: {...}). Shown as a green item in the unit card's price box
  // (phones and tablets; on desktop the side column panel says it instead), a note under "Admin fee" in the
  // "What's due today?" box, and one line above the tiers in the tier popup.
  // In the popup text, **double asterisks** make the words bold.
  discLock: {
    enabled: false,
    barLabel: 'Free disc lock', // item in the unit card's price box
    panelTitle: 'Free disc lock, a $20 value', // side column panel
    panelText: 'Waiting inside your unit on move-in day, and yours to keep.',
    adminFeeNote: 'Includes a free disc lock, a $20 value', // small line under "Admin fee" in the estimate; empty hides it
    popupText: '**Every unit includes a free disc lock**, a $20 value. Waiting inside your unit, yours to keep.', // tier popup, desktop
    popupTextShort: '**Every unit includes a free disc lock**, yours to keep.', // tier popup on phones and tablets
  },

  // GA4 events sent straight from this page to this website's own property (see lib/analytics.ts).
  // All of it can be set in /js/rental-flow-settings.js (analytics: {...}).
  analytics: {
    enabled: true,
    measurementId: 'G-6CQ8V3S3JV',
    // Sites listed here send real events. Any other address (a Cloudflare preview, localhost) sends debug
    // events, which show in GA4 DebugView and can be kept out of reports with the Developer traffic filter.
    productionHosts: ['www.storagefortworthtexas.com', 'storagefortworthtexas.com'] as string[],
    facilityName: '', // leave empty to use the facility name above
  },

  // Px to leave above the flow when scrolling to it (sticky nav height).
  scrollOffset: 90,
}

export type CheckoutMode = 'tenant' | 'reserve' | 'waitlist'

// Set once /api/facility answers. The Cloudflare settings (MONUMENT_FACILITY_UUID,
// MONUMENT_ENV) then decide which facility the checkout links point at. Until
// then, or if that request fails, the values in `config.monument` are used.
const runtime: { facilityUuid?: string; env?: 'stg' | 'prd' } = {}

export function setRuntimeFacility(v: { facilityUuid?: string; env?: string }) {
  if (v.facilityUuid && /^[0-9a-f-]{36}$/i.test(v.facilityUuid)) runtime.facilityUuid = v.facilityUuid
  if (v.env === 'stg' || v.env === 'prd') runtime.env = v.env
}

function monumentBase() {
  const m = config.monument
  const host = runtime.env ? `https://tenant-suite.${runtime.env}.monument.io` : m.host
  return `${host}/${m.portfolio}/${m.brandUuid}/shopping/facility/${runtime.facilityUuid ?? m.facilityUuid}`
}

export function monumentCheckoutUrl(unitGroupUuid: string, mode: CheckoutMode) {
  return `${monumentBase()}/unit/${unitGroupUuid}/${mode}?${config.monument.params}`
}

export function monumentUnitsUrl() {
  return `${monumentBase()}/units?${config.monument.params}`
}
