# /content — real launch content

Everything in this folder is loaded into the database by `scripts/seed-content.ts`. Files and folders whose
name starts with `_` are ignored (see `_examples/` for a complete, valid set of examples).

```bash
npm run content:check                              # validate every file, write nothing
npm run content:load -- --confirm=<project-ref>    # load into the project in .env.local (DEV)
# PROD (Fola): npx dotenv -e .env.production.local -- npx tsx scripts/seed-content.ts --confirm=<PROD_REF>
```

- **All-or-nothing:** every file is validated first. If anything is wrong, nothing is written and each
  problem is listed as `file:line — reason`.
- **Re-runnable:** venues, prices and events are matched by slug and updated. Guides and safety entries that
  already exist are skipped unless you add `--overwrite` (so edits made in Admin → Content aren't lost).
- **Claimed venues are never touched**: once an owner has claimed a listing, they manage it.
- Images go in `content/images/`. Each one is re-encoded (EXIF/GPS stripped, ≤ 2000 px, WebP), one at a time.
- Every run writes one `content.loaded` entry to the audit log.

## Layout

| Path | What |
|---|---|
| `vendors/<anything>.csv` | Venues (one row each) |
| `prices/<anything>.csv` | Price lists. A venue's list is **replaced** by the rows given for it |
| `events/<city-slug>.csv` | Events in that city (e.g. `events/lagos.csv`) |
| `guides/<city-slug>/<slug>.md` | City / area / daytime guides (`guides/nigeria/…` for national) |
| `toolkit/<slug>.md` | Diaspora toolkit articles |
| `blog/<slug>.md` | Blog posts |
| `safety-pages/<city-slug>.md` | Long-form safety page for a city (`safety_page` guide) |
| `safety/<city-slug or national>.md` | Safety information entries (emergency numbers, hospitals…) |
| `images/` | Cover photos referenced by `cover` columns / front matter |

## vendors/*.csv

Header row, then one venue per row. Only `city`, `name`, `category`, `lat`, `lng` are required.

| Column | Notes |
|---|---|
| `city` | City slug: `lagos`, `abuja`, `ibadan`, `port-harcourt`, `aba`, `owerri` |
| `area` | Area slug in that city, e.g. `victoria-island`, `ikoyi`, `wuse-2` (Admin → Cities lists them) |
| `name` | Venue name |
| `slug` | Optional. Defaults to name + city, e.g. `afrobeat-junction-lagos` |
| `category` | `nightclub` `lounge` `bar` `rooftop` `hotel_bar` `restaurant` `street_food` `cafe` `beach` `resort` `cinema` `art_gallery` `museum` `historic_site` `nature` `amusement_park` `concert_venue` `event_space` `market` |
| `secondary_categories` | Optional, `;`-separated category slugs |
| `price_band` | `free` `budget` `mid` `premium` `luxury` |
| `tagline` | ≤ 140 chars · `description` ≤ 5000 chars (markdown) |
| `address` | Street address |
| `lat`, `lng` | Decimal degrees (copy from Google Maps → right-click the pin) |
| `phone`, `whatsapp`, `email`, `website` | Public business contact details only |
| `instagram`, `tiktok`, `x` | Handles (with or without `@`) |
| `features` | `;`-separated: `live_music` `dj` `late_night` `vip_area` `rooftop` `outdoor_seating` `sea_view` `food_served` `reservations` `card_payments` `wifi` `air_conditioned` `parking` `wheelchair_access` `family_friendly` |
| `hours` | e.g. `mon-thu 16:00-01:00; fri,sat 16:00-03:00; sun closed` · `daily 09:00-17:00`. An end before the start runs past midnight; days not mentioned are closed |
| `dress_code`, `age_policy`, `parking_note` | Free text |
| `status` | `published` (default) or `draft` |
| `cover` | File name in `content/images/` |

## prices/*.csv

`vendor,label,amount_ngn,note` — `vendor` is the venue slug; `amount_ngn` a whole number of naira (`0` = free).

## events/<city>.csv

| Column | Notes |
|---|---|
| `title`, `category` | Category: `concert` `festival` `party` `beach_party` `boat_cruise` `comedy` `art` `food` `sport` `conference` `community` `other` |
| `starts`, `ends` | `YYYY-MM-DD HH:MM` in the city's local time (`ends` optional) |
| `venue` or `venue_name` | A venue slug from this site, or a free-text venue name |
| `area` | Optional area slug |
| `ticket_url`, `is_free` (`yes`/`no`), `price_from_ngn`, `price_to_ngn`, `description` | Optional |
| `status` | `published` (default) or `draft` |
| `slug` | Optional. Defaults to title + date |

Events between the *December in Nigeria* season dates are tagged automatically.

## Guides, toolkit, blog, safety pages (`.md`)

```markdown
---
title: A first weekend in Lagos
excerpt: Where to eat, dance and rest across two nights.
type: city_guide          # guides/ only: city_guide | area_guide | daytime
tags: [weekend, nightlife]
status: published         # draft | review | published (default draft)
seo_title: First weekend in Lagos — where to go
seo_description: A practical two-night plan for Lagos.
cover: lagos-weekend.jpg  # optional, from content/images/
---

Markdown body. Custom blocks work exactly as in the CMS:
<VendorCard slug="afrobeat-junction-lagos" />
<Map vendors="a-lagos,b-lagos" />
<PriceTable vendor="a-lagos" />
<Callout type="tip">Short advice.</Callout>
```

The file name (without `.md`) is the slug unless `slug:` is given.

## safety/<city or national>.md

Only publish information you have checked against the official source.

```markdown
---
verified_on: 2026-11-01      # sets "Last verified" on every entry in this file
---

## hospitals | Lagos Island General Hospital — 24 h A&E
Broad Street, Lagos Island. Call **0700 000 0000**.

## police_stations | Victoria Island Police Division
…
```

Sections: `emergency_numbers` `hospitals` `police_stations` `embassies` `travel_advice` `area_notes` `scam_awareness`.
Entries are matched by city + section + title.
