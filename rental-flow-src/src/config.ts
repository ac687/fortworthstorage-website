// Everything facility-specific lives here.

export const config = {
  facility: {
    name: 'Fort Worth Storage',
    street: '229 N Beach St',
    cityLine: 'Fort Worth, TX 76111',
    phoneDisplay: '(817) 838-6781',
    phoneHref: 'tel:+18178386781',
    rating: 4.7,
    reviewCount: 26,
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
      { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69f3aad5235195d5a957ec2a_rear-row2%201920x1080.webp', alt: 'Rear row of drive-up storage units at Fort Worth Storage' },
      { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69f3aad52b3435d101e44586_front-row2%201200x900.webp', alt: 'Front row of storage units at Fort Worth Storage' },
      { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69bd4ea0c4ca50e41eef33cb_google-square-image.webp', alt: 'Fort Worth Storage in Fort Worth, TX' },
    ],
  },

  // Photo shown on each unit card, by size.
  unitPhotos: {
    '10x10': '/images/10x10-storage-unit-p-500.webp',
    '10x20': '/images/10x20-storage-unit-p-500.webp',
    '10x30': '/images/10x30-storage-unit-p-500.webp',
    '20x20': '/images/20x20-storage-unit-p-500.webp',
    '20x30': '/images/20x30-storage-unit-p-500.webp',
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

  monument: {
    host: 'https://tenant-suite.prd.monument.io',
    portfolio: 'storageoperationsgroup',
    brandUuid: '36354d02-2791-11f1-b21b-bb17b36a561d',
    facilityUuid: '7ea9ca6e-cfcc-11f0-887a-5565cdff6098',
    // Same branding settings as the original Fort Worth Storage iframe.
    params:
      'logoenab=null&faviconenab=dc8b5810-27a6-11f1-81b2-2b540d0228d7&pcolor=%231769B3&scolor=%231769B3&trackerenab=true&apayreq=false&tcreq=true&globalbrandingenab=false',
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
    timeZone: 'America/Chicago', // facility time zone, decides what "today" is
    // A same-day rental in the last N days of the month also prepays next month's rent and
    // protection plan. 0 turns the rule off. Can also be set in /js/rental-flow-settings.js.
    prepayLastDays: 5,
  },

  // "What fits" block beside the estimate on desktop, typed in /js/rental-flow-settings.js.
  // Key = size ("5x5"). summary is one short line; fits is a short list.
  sizeInfo: {} as Record<string, { summary: string; fits: string[] }>,
  sizeGuidePath: '/size-guide',

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
