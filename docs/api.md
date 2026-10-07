# Public JSON API — `/api/v1`

Read-only endpoints are public (no key). Three write endpoints act as a signed-in user. Every endpoint is a
thin wrapper over the same services the web app uses, so RLS, rate limits and moderation apply identically.

- **Base URL:** `https://<your-domain>/api/v1` (DEV previews: `https://<preview>.vercel.app/api/v1`)
- **Format:** JSON. Every response has the same envelope:

```json
{ "data": <payload or null>, "error": null | { "code": "not_found", "message": "Unknown city." }, "meta": { … } }
```

- **Caching:** GET responses are CDN-cached for 15 s – 1 h (see each endpoint) and send
  `Access-Control-Allow-Origin: *`, so browsers on other sites can call them.
- **Rate limits:** reads 300 requests / minute / IP (generous on purpose, because Nigerian mobile networks share
  IPs). Writes use the same per-user limits as the app: pulse 20 / h and 2 per venue per 30 min, posts
  6 / h, reports 10 / h. Over the limit → `429` with `error.code = "rate_limited"` (reads also send `Retry-After`).
- **Community content** is unverified unless `verified: true`. Show the label
  *"Unverified — posted by a community member"* wherever you display posts.

## Errors

| HTTP | `error.code` | When |
|---|---|---|
| 400 | `invalid_request`, `invalid_json` | Bad query or body (message lists the fields) |
| 401 | `unauthorized` | Missing or invalid `Authorization: Bearer` token on a write |
| 403 | `email_unverified`, `account_restricted` | User must verify their email; suspended or banned |
| 404 | `not_found` | Unknown city, venue, etc. |
| 413 / 415 | `too_large`, `unsupported_media_type` | Body over 20 KB / not `application/json` |
| 422 | `rejected` | The service refused it (e.g. venue not open for posts) |
| 429 | `rate_limited` | Slow down |
| 500 | `internal` | Our fault — it's logged |

## Read endpoints

### `GET /cities`
Launch cities. Cached 1 h.
```bash
curl https://<domain>/api/v1/cities
```
`data`: `[{ id, slug, name, state, timezone, lat, lng }]`

### `GET /cities/{slug}/live`
Venues with crowd signals right now (the Tonight view): crowd level, confidence, counts, latest photo.
Cached 30 s.
```bash
curl https://<domain>/api/v1/cities/lagos/live
```

### `GET /vendors`
Published venues in a city, or a text search.

| Query | Notes |
|---|---|
| `city` | City slug. Required unless `q` is given |
| `q` | Search by name / area / category (≥ 2 chars); `city` optional to narrow |
| `category` | Category slug, e.g. `nightclub`, `restaurant`, `beach` |
| `area` | Area slug within the city, e.g. `ikoyi` |
| `price` | `free` · `budget` · `mid` · `premium` · `luxury` |
| `feature` | e.g. `live_music`, `outdoor_seating`, `parking` |
| `limit` | 1–120 (default 50) |

```bash
curl "https://<domain>/api/v1/vendors?city=lagos&category=nightclub&limit=20"
curl "https://<domain>/api/v1/vendors?q=suya&city=lagos"
```

### `GET /vendors/{slug}`
One venue: listing fields, `prices`, `live` (current crowd snapshot, if any) and `official_updates`.
```bash
curl https://<domain>/api/v1/vendors/afrobeat-junction-lagos
```

### `GET /vendors/{slug}/posts`
Recent public community posts for a venue: check-ins, pulses and official updates (official ones are
labelled). `limit` 1–50. Cached 15 s.

### `GET /events`
Upcoming events, soonest first.

| Query | Notes |
|---|---|
| `city` | City slug |
| `season` | `december` → only *December in Nigeria* season events |
| `from`, `to` | `YYYY-MM-DD` (Lagos time) |
| `category` | `concert` · `festival` · `party` · `beach_party` · `boat_cruise` · `comedy` · `art` · `food` · `sport` · `conference` · `community` · `other` |
| `limit` | 1–200 (default 50) |

```bash
curl "https://<domain>/api/v1/events?city=lagos&season=december"
```
For calendars, subscribe to `/events/calendar.ics?city=lagos&season=december`.

### `GET /guides`
Published guides, diaspora toolkit and blog posts: summaries plus a `url` to the full article.
Query: `type` (`city_guide` · `area_guide` · `daytime` · `toolkit` · `blog` · `safety_page`), `city`, `tag`,
`limit` (1–100).

### `GET /leaderboard/{city}`
`?board=month` (default) or `?board=december`. Public usernames, display names and points only.

## Write endpoints (signed-in user)

Send the user's **Supabase access token** (the `access_token` of their Supabase session) as a Bearer token.
The user must have verified their email. Tokens expire (default 1 h); refresh them with the Supabase client.

```bash
TOKEN="<supabase access token>"
```

### `POST /pulse`
One-tap crowd level for a venue. Publishes immediately (pulses carry no text or photos).
```bash
curl -X POST https://<domain>/api/v1/pulse \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"vendorId":"<uuid>","crowdLevel":4}'
```
Body: `vendorId` (uuid), `crowdLevel` 1–5, and optionally `lat`, `lng` with `consentNow: true` (location is used
only to mark the post "at venue" and is never shown publicly).
`201` → `{ postId, isAtVenue, points }`

### `POST /posts`
A text check-in. It runs through the same automatic moderation as the app, so it may come back `published`,
`pending` (held for review) or `hidden`. Photo check-ins need the app's one-image-per-request upload
pipeline and aren't available over this API.
```bash
curl -X POST https://<domain>/api/v1/posts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"vendorId":"<uuid>","crowdLevel":3,"vibe":4,"note":"Live band just started","waitMinutes":10}'
```
Body: `vendorId`, `crowdLevel` 1–5, `vibe` 1–5, optional `note` (≤ 500 chars), `waitMinutes`, `coverFeeNgn`,
`lat`/`lng`/`consentNow`.
`201` → `{ postId, status, holdReason, points }`

### `POST /reports`
Report a post, venue, event or profile.
```bash
curl -X POST https://<domain>/api/v1/reports \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"entityType":"post","entityId":"<uuid>","reason":"fake","details":"Photo is from another venue"}'
```
`reason`: `fake` · `spam` · `abuse` · `dangerous` · `wrong_venue` · `rival_sabotage` · `copyright` · `other`.
`201` → `{ received: true }`. Reporting the same thing twice → `422`.

## Not in this API
No bookings or payments, no review or star-rating endpoints, no bulk export of user data. Private safety
reports go only through the website's private form. The separate **Agent API** (`/api/agent/v1`, API keys)
is documented in `docs/agent-api.md` once Stage P1 ships.
