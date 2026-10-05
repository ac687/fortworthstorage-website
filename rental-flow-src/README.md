# Fort Worth Storage rental flow

The unit list, tier popup (Essential / Preferred / Premium) and Monument handoff
on the home page. It builds to one file, `/js/rental-flow.js`, which `index.html`
loads and mounts into `<div id="tu-rental-flow">`.

## How it works
1. Unit groups (one per size + type + tier in Monument) are grouped into one
   card per size + type. The tier comes from the unit group's `description`.
2. **Rent Now / Reserve** on a card opens the tier popup. Sizes with only one
   tier skip the popup.
3. Choosing a tier replaces the list with Monument's iframe, opened straight on
   that unit group:
   `…/shopping/facility/{facilityUuid}/unit/{unitGroupUuid}/{tenant|reserve|waitlist}`
   Sold-out tiers go to the waitlist page.

The widget renders inside a shadow root, so Webflow CSS and the widget's
Tailwind CSS don't affect each other.

## Editing
- Facility details, photos, tier labels, Monument IDs: `src/config.ts`
- Button color: `--color-cta` / `--color-cta-hover` in `src/styles.css`
- Static data (real Tidy Up unit groups captured 2026-10-04):
  `src/data/unitGroups.static.json`

## Build
```
cd rental-flow-src
npm install
npm run build      # writes ../js/rental-flow.js — commit it
```
Cloudflare Pages serves the repo as-is, so the built file must be committed.

## Switching to live data (next step)
Set `dataSource: 'api'` in `src/config.ts` once the Cloudflare function at
`/api/units` exists. It must return the Shopping API's
`GET /facilities/{facilityUuid}/unitGroups` response unchanged. The API key
lives only in Cloudflare as a secret, never in this repo.

## Per-site settings (`/js/rental-flow-settings.js`)

Edit this one file to customize a website: tier popup amenity bullets (`tierAmenities`), hours, amenities, photos, unit-card photos,
tier wording, Monument checkout branding, backup facility details and colors. No rebuild
is needed. Invalid or missing values are ignored and defaults are used.
Which facility is shown is set in Cloudflare (`MONUMENT_FACILITY_UUID`, `MONUMENT_ENV`,
`GOOGLE_PLACE_ID`), not in this file. For a new site, copy the file and change the values.
