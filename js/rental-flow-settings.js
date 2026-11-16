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

  /* ANALYTICS  (rental funnel events sent to this website's own Google Analytics 4 property)
        Events: rental_unit_selected, begin_checkout, rental_info_provided, generate_lead, rental_details_provided,
        add_payment_info, rental_lease_viewed, rental_lease_signed (plus rental_reserve_started,
        rental_waitlist_started, rental_reserved, rental_waitlist_joined). No names, emails or card details are sent.
        measurementId    this site's GA4 Measurement ID (Admin > Data streams). Copy this block to each site and change it.
        productionHosts  addresses that send real events. Any other address (preview deployments, localhost) sends
                         debug events: they show in GA4 DebugView, not in the normal reports once the
                         "Developer traffic" data filter is active (Admin > Data filters).
        enabled: false   turns this tracking off.
        Not set here = the built-in defaults below are used (Tidy Up). */
  analytics: {
    enabled: true,
    measurementId: 'G-6CQ8V3S3JV',
    productionHosts: ['www.storagefortworthtexas.com', 'storagefortworthtexas.com'],
  },

  /* FREE DISC LOCK  (ON here: every tenant gets a disc lock to keep. Set enabled: false to hide it everywhere.)
        When on, it shows in four places: a green "Free disc lock" item in each unit card's price box (phones and
        tablets; on desktop the side column panel says it instead), the white "Free disc lock" panel in the desktop
        side column, a note under "Admin fee" in the "What's due today?" box, and one line above the tiers in the
        tier popup. The home page headline pill is NOT part of this: it is plain HTML in index.html and has to be
        added there separately.
        enabled: true      turns it on, false hides it everywhere in the rental flow.
        barLabel           the item in each unit card's price box.
        panelTitle         heading of the side column panel; panelText the line under it.
        adminFeeNote       the small line under "Admin fee" in the estimate (use '' for no note).
        popupText          the line above the tiers on desktop; popupTextShort on phones and tablets.
                           **Double asterisks** make words bold. */
  discLock: {
    enabled: true,
    barLabel: 'Free disc lock',
    panelTitle: 'Free disc lock, a $20 value',
    panelText: 'Ready in your unit on move-in day, and yours to keep.',
    adminFeeNote: 'Includes a free disc lock, a $20 value',
    popupText: '**Every unit includes a free disc lock**, a $20 value. Waiting inside your unit, yours to keep.',
    popupTextShort: '**Every unit includes a free disc lock**, yours to keep.',
  },

  /* UNIT-TYPE CHOOSER  (the popup that asks "Drive Up or Temperature Controlled?" when a size-guide
        button is clicked for a size that comes in both types)
        Short bullet points under each type. Key = unit type, as named in Monument (capitals and dashes
        don't matter). A type with no list here uses the built-in wording. [] shows no bullets. */
  typeBullets: {
    'Drive-Up': ['Pull right up to your door', 'Easy for furniture, vehicles and gear'],
  },

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
        Use an empty list [] to show no bullets for a tier. Bullets show in the order written.

        BOLD  Wrap the words you want bold in double asterisks. Works on a whole bullet or part of one:
                '**24-Hour Access**'
                'Closest to the **front office**'
              Nothing else is formatted, and an unmatched ** is simply ignored.

        HIDE A BULLET WHEN THE OTHER TIERS ARE SOLD OUT  Use hideWhenOtherTiersSoldOut (just below the
              lists). Any bullet listed there disappears from a tier when every other tier of that same
              unit has 0 available, and shows as normal while any other tier still has space. The text
              must match the bullet (capitals and **bold** marks are ignored). It applies to every tier
              and unit that uses that bullet. Use [] to turn it off. */
  tierAmenities: {
    'Drive-Up': {
      Good: ['**3-Month Minimum Commitment**', 'Standard Ground-Level Access', 'Access Hours: 6:00 AM – 10:00 PM', '24/7 Online Account Management'],
      Better: ['**Flexible Month-to-Month Terms**', 'Quick-Access Row Placement', 'Access Hours: 6:00 AM – 10:00 PM', '24/7 Online Account Management'],
      Best: ['**Flexible Month-to-Month Terms**', 'Premium Row Placement', 'Includes 24/7 Gate Access (A $10/mo value included free)', '24/7 Online Account Management'],
    },
     '10x10 Drive-Up': {
      Good: ['**3-Month Minimum Commitment**', 'Compact Lane Access (Cars & Pickups)', 'Access Hours: 6:00 AM – 10:00 PM', '24/7 Online Account Management'],
    },
    // Any other unit type uses these.
    default: {
      Good: ['**3-Month Minimum Commitment**', 'Standard Ground-Level Access', 'Access Hours: 6:00 AM – 10:00 PM', '24/7 Online Account Management'],
      Better: ['**Flexible Month-to-Month Terms**', 'Quick-Access Row Placement', 'Access Hours: 6:00 AM – 10:00 PM', '24/7 Online Account Management'],
      Best: ['**Flexible Month-to-Month Terms**', 'Premium Row Placement', 'Includes 24/7 Gate Access (A $10/mo value included free)', '24/7 Online Account Management'],
    },
  },

  hideWhenOtherTiersSoldOut: ['3-Month Minimum Commitment'],

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
    { src: '/images/carousel-fort-worth-rear-row-900.webp', alt: 'Rear row of drive-up storage units at Fort Worth Storage' },
    { src: '/images/carousel-fort-worth-front-row-900.webp', alt: 'Front row of storage units at Fort Worth Storage' },
    { src: '/images/fort-worth-storage-google-square-600x600.webp', alt: 'Fort Worth Storage in Fort Worth, TX' },
  ],

  /* 4. PHOTO ON EACH UNIT CARD, by size ("WIDTHxDEPTH": image). Sizes with no photo show none. */
  unitPhotos: {
    '10x10': '/images/10x10-unit-thumb.webp',
    '10x20': '/images/10x20-unit-thumb.webp',
    '10x30': '/images/10x30-unit-thumb.webp',
    '20x20': '/images/20x20-unit-thumb.webp',
    '20x30': '/images/20x30-unit-thumb.webp',
  },

  /* 5. TIER WORDING. The name on the left must match the unit group name in
        Monument exactly. rank = order (0 is cheapest/first). highlight = emphasized card. */
  tiers: {
    Good: { rank: 0, label: 'Best value', copy: 'The most affordable way to store.' },
    Better: { rank: 1, label: 'Most popular', copy: 'Added convenience with flexible terms.', highlight: true },
    Best: { rank: 2, label: 'Premium pick', copy: 'Premium placement and convenience.' },
  },

  /* 6. MONUMENT CHECKOUT BRANDING (the page customers land on after clicking Rent).
        brandUuid and params come from the Monument link for this website's brand. */
  checkout: {
    brandUuid: '36354d02-2791-11f1-b21b-bb17b36a561d',
    params: 'logoenab=null&faviconenab=dc8b5810-27a6-11f1-81b2-2b540d0228d7&pcolor=%23c2410c&scolor=%23c2410c&trackerenab=true&apayreq=false&tcreq=true&globalbrandingenab=false',
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

  /* 9. MOVE-IN ESTIMATE RULES
        prepayLastDays: a same-day rental in the last N days of the month also prepays next
        month's rent and protection plan, shown in the "Estimated due today" box.
        5 = the last five days of the month. 0 = turn the rule off. Whole numbers 0 to 28.
        fullMonthPromoWords: a promotion whose name contains one of these phrases starts at the first FULL
        month, so the prorated move-in month is not discounted (the discount shows on next month's rent
        instead). Case does not matter. Most promotions start at move-in and need nothing here.
        With 'anniversary' billing, Monument's promotion "month starts" 1 means the move-in invoice (month 1),
        and 2 means the second payment, so the cards read "Months 1 to 3" for a 3 month promotion that starts at 1.
        billingMode: 'first-of-month' (prorated move-in month, bills on the 1st) or 'anniversary' (full first
        month, bills on the move-in day). The box normally takes this from Monument's cart preview, so this
        only matters for the built-in backup calculation, used if the preview can't be reached.
        All three rules above apply to that backup calculation. */
  estimate: {
    billingMode: 'anniversary',
    prepayLastDays: 5,
    fullMonthPromoWords: ['full month', 'second month', '2nd month'],
  },

  /* 9b. UNIT CARDS (the list of available units)
        showStreetRate  true shows the in-store rate crossed out next to the online price, with "Online price: X% off",
                    on units with no promotion (only when the in-store rate is higher than the online rate). false hides it.
        rateLock    enabled: true shows "Rate locked 12 months" at the bottom of every unit's price box and a navy
                    "12-month rate lock" panel in the desktop side column. text: the wording in the price box.
                    panelTitle and panelText: the wording in the side column panel. Turn it on only if it is true at this
                    facility, including the rent after a promotion ends. false hides all of it.
        popular     unit: the ONE unit that gets the "Most popular size" ribbon and a navy border, size plus type,
                    e.g. '10x10 Drive Up' or '10x10 Temperature Controlled' ('' = none). Hidden if that unit is sold out.
                    ribbonText: the words on the ribbon.
        priceNote   a small gray note in the price box's bottom bar, shown only on sizes that have more than one tier
                    (the prices shown are the lowest ones). It replaces the word "from" before prices. '' hides it.
        tagline     the line under "Available units".
        reviews     desktop side column: up to three short Google reviews (name, date, text). The rating and review count
                    come live from Google. Use recent, short reviews. No staff names. No claims of 24-hour access.
                    Keep them different from the reviews lower on the page.
        moveInCost  enabled: true adds a "What's due today?" link to each unit card. It opens a popup (a bottom sheet
                    on phones) built from Monument's cart preview, with the built-in estimate as backup.
                    It is always labelled an estimate: taxes and the final total are calculated at checkout.
        The line under each unit's size ("About a standard closet") is "line" in the WHAT FITS block below. */
  showStreetRate: true,
  rateLock: {
    enabled: true,
    text: 'Rate locked 12 months',
    panelTitle: '12-month rate lock',
    panelText: 'The rate you start at is the rate you pay for 12 months.',
  },
  popular: { unit: '10x20 Drive Up', ribbonText: 'Most popular size' },
  priceNote: 'Lowest price shown',
  tagline: 'Rent online in minutes. Move in today.',
  reviews: [
    { name: 'Raymond B.', date: 'Oct 2026', text: 'Quick easy process and very polite service.' },
    { name: 'Scott R.', date: 'Feb 2026', text: 'I find that Fort Worth Storage is a great place to store my belongings. They are always helpful and quick to respond to any issues that I might have. I have been with them for over 10 years.' },
  ],
  moveInCost: { enabled: true },

  /* 10. WHAT FITS (the line under the size on each unit card, and a block beside the estimate on the checkout step)
         One entry per size ("WIDTHxDEPTH"): line = the short line under the size on the unit card (tablet and desktop); short = a shorter version
         beside the size on phones, about 27 characters at most (leave out to use line); summary = a one-line
         summary and fits = a short list of what fits (both shown beside the estimate on desktop).
         Sizes with no entry show nothing. Keep each item short. */
  sizeInfo: {
    '10x10': {
      line: 'Fits a 1-bedroom apartment',
      short: '1-bedroom apartment', // phones: shorter, fits beside the size
      summary: '100 sq ft, about the size of a standard bedroom.',
      fits: ['Contents of a 1 to 2 bedroom apartment', 'Living room furniture', 'Bedroom sets', '20 to 30 boxes'],
    },
    '10x20': {
      line: 'One-car garage size, fits a 3-bedroom home',
      short: 'One-car garage size', // phones: shorter, fits beside the size
      summary: '200 sq ft, about the size of a one-car garage.',
      fits: ['Contents of a 3 to 4 bedroom home', 'Motorcycles, ATVs, and small boats', 'Contractor tools and equipment', 'Business inventory'],
    },
    '10x30': {
      line: 'Two-car garage size, fits a 5-bedroom home',
      short: 'Two-car garage size', // phones: shorter, fits beside the size
      summary: '300 sq ft, about the size of a two-car garage.',
      fits: ['Contents of a large 4 to 5 bedroom home', 'Multiple full-size vehicles or trucks', 'Large boats, RVs, or campers (check dimensions)', 'Business or commercial inventory'],
    },
    '20x20': {
      line: 'Large two-car garage size',
      short: 'Large two-car garage', // phones: shorter, fits beside the size
      summary: '400 sq ft, about the size of a large two-car garage.',
      fits: ['Contents of a large 4 to 5 bedroom home plus garage', 'Multiple full-size vehicles side by side', 'Full business inventory or retail overstock', 'Contractor materials, trailers, and large equipment'],
    },
    '20x30': {
      line: 'Our largest unit, fits a very large home',
      short: 'Our largest unit', // phones: shorter, fits beside the size
      summary: '600 sq ft, our largest unit.',
      fits: ['Contents of a very large home plus detached garage', 'Multiple full-size vehicles, trucks, or work vans', 'Complete business or commercial inventory', 'Oversized items, trailers, and bulk materials'],
    },
  },
};
