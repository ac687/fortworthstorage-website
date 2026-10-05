/* ==========================================================================
   RENTAL FLOW – SETTINGS FOR THIS WEBSITE
   --------------------------------------------------------------------------
   This is the ONLY file you edit to customize the rental flow for a site.
   Change the text between the quotes, save, and the site updates after the
   next deploy. No rebuild needed.

   - Anything you delete or mistype is ignored and the built-in default is used,
     so a mistake here can't break the page.
   - Facility name, address, phone, prices, availability, promotions and the
     Google rating all come live from Monument/Google. Don't put them here
     (except the BACKUP block below).
   - Which facility is used is NOT set here. That's in Cloudflare
     (MONUMENT_FACILITY_UUID, MONUMENT_ENV, GOOGLE_PLACE_ID).
   ========================================================================== */
window.RENTAL_FLOW_SETTINGS = {

  /* 0. TIER AMENITIES  (the bullet points under each tier in the popup)
        Prices, availability and promotions still come live from Monument, but the bullet
        points are typed here so you control the wording. Edit, add or remove lines freely.

        Layout: a unit type, then each tier, then its bullets.
          'Drive-Up'                 applies to every Drive-Up unit
          'Temperature Controlled'   applies to every Temperature Controlled unit
          '10x20 Drive-Up'           (optional) one size only; beats the type-wide list
          default                    (optional) any unit type that has no list of its own
        The unit type and tier names must match Monument's (capitals and dashes don't matter).
        A tier with no list here (and no default) falls back to the amenities set on that unit group in Monument.
        Use an empty list [] to show no bullets for a tier. Bullets show in the order written. */
  tierAmenities: {
    'Drive-Up': {
      Essential: ['Furthest from Entrance', '3 Month Minimum Rental', '24/7 Online Account Management'],
      Preferred: ['Easy Access', 'Month-to-month contract', 'More Convenient', '24/7 Online Account Management'],
      Premium: ['24-Hour Access', 'Month-to-month contract', '24/7 Online Account Management', 'Best Location/Easiest Access'],
    },
    // Any other unit type uses these.
    default: {
      Essential: ['Furthest from Entrance', '3 Month Minimum Rental', '24/7 Online Account Management'],
      Preferred: ['Easy Access', 'Month-to-month contract', 'More Convenient', '24/7 Online Account Management'],
      Premium: ['24-Hour Access', 'Month-to-month contract', '24/7 Online Account Management', 'Best Location/Easiest Access'],
    },
  },

  /* 1. HOURS shown in the facility header (24-hour "HH:MM"), read in this time zone.
        Time zone examples: America/New_York, America/Chicago, America/Denver, America/Los_Angeles */
  hours: {
    timeZone: 'America/Chicago',
    gate: { open: '06:00', close: '22:00' },
    support: { open: '08:00', close: '20:00' },
  },

  /* 2. AMENITIES shown as the checklist (one per line, add or remove freely) */
  amenities: [
    'Drive-Up Access',
    'Fully Gated Facility',
    '24/7 HD Video Surveillance',
    '24-Hour Access Upgrade',
    'Rent Online in Minutes',
  ],

  /* 3. FACILITY PHOTOS (path on this site like "/images/x.webp", or a full https:// link) */
  photos: [
    { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69f3aad5235195d5a957ec2a_rear-row2%201920x1080.webp', alt: 'Rear row of drive-up storage units at Fort Worth Storage' },
    { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69f3aad52b3435d101e44586_front-row2%201200x900.webp', alt: 'Front row of storage units at Fort Worth Storage' },
    { src: 'https://cdn.prod.website-files.com/69237b9074b0e1a0ee44d1f5/69bd4ea0c4ca50e41eef33cb_google-square-image.webp', alt: 'Fort Worth Storage in Fort Worth, TX' },
  ],

  /* 4. PHOTO ON EACH UNIT CARD, by size ("WIDTHxDEPTH": image). Sizes with no photo show none. */
  unitPhotos: {
    '10x10': '/images/10x10-storage-unit-p-500.webp',
    '10x20': '/images/10x20-storage-unit-p-500.webp',
    '10x30': '/images/10x30-storage-unit-p-500.webp',
    '20x20': '/images/20x20-storage-unit-p-500.webp',
    '20x30': '/images/20x30-storage-unit-p-500.webp',
  },

  /* 5. TIER WORDING. The name on the left must match the unit group name in
        Monument exactly. rank = order (0 is cheapest/first). highlight = emphasized card. */
  tiers: {
    Essential: { rank: 0, label: 'Best value', copy: 'The most affordable way to store.' },
    Preferred: { rank: 1, label: 'Most popular', copy: 'Added convenience with flexible terms.', highlight: true },
    Premium: { rank: 2, label: 'Premium pick', copy: 'Premium placement for maximum convenience.' },
  },

  /* 6. MONUMENT CHECKOUT BRANDING (the page customers land on after clicking Rent).
        brandUuid and params come from the Monument link for this website's brand. */
  checkout: {
    brandUuid: '36354d02-2791-11f1-b21b-bb17b36a561d',
    params: 'logoenab=null&faviconenab=dc8b5810-27a6-11f1-81b2-2b540d0228d7&pcolor=%231769B3&scolor=%231769B3&trackerenab=true&apayreq=false&tcreq=true&globalbrandingenab=false',
  },

  /* 7. BACKUP DETAILS. Only shown if Monument can't be reached. Normally invisible. */
  backup: {
    name: 'Fort Worth Storage',
    street: '229 N Beach St',
    cityLine: 'Fort Worth, TX 76111',
    phone: '(817) 838-6781',
  },

  /* 8. COLORS (optional; remove this block to use the defaults) */
  colors: {
    // brand: '#1769B3',
    // brandDark: '#0f4f87',
    // navy: '#0b2540',
    // button: '#1769B3',
    // buttonHover: '#0f4f87',
  },
};
