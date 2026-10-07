# Agent API — `/api/agent/v1`

A read-mostly operations API for an AI agent (or any script) that helps run the platform: KPIs, activity,
moderation load, reports, vendors, events, content and tasks. It **cannot** moderate, sanction, publish or
delete anything. The only writes are creating admin tasks and adding internal notes.

## Keys

- A **super admin** creates keys in **Admin → Settings → Agent API keys** (with a fresh authenticator code).
  The key (`dk_xxxxxxxx_…`) is shown **once**; only its SHA-256 hash and the `dk_xxxxxxxx` prefix are stored.
- Keys **expire** (default 90 days, max 365), can be **revoked** at any time, and can be limited to an
  **IP allowlist** (IPs or CIDRs).
- **Scopes:**

| Scope | Grants |
|---|---|
| `read` | Every GET endpoint except `/issues`. Always included |
| `tasks:write` | `POST /tasks` |
| `notes:write` | `POST /notes` |
| `pii:read` | `GET /issues`, plus emails and informational IP/network data on `/users/{id}` and `/search`. Off by default — grant sparingly |

- **Rate limit:** 120 requests / minute / key → `429` with `Retry-After`.
- **Audit:** every authenticated call (including refused ones) is written to the audit log with
  `actor_role = 'agent'`, the key id, path, query and status. Tasks and notes are attributed to the key's creator.

Send the key in the `X-Agent-Key` header:

```bash
export AGENT_KEY="dk_1a2b3c4d_…"
export BASE="https://diskova.io/api/agent/v1"
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/summary" | jq
```

## Responses & errors

Every response is `{ "data": …, "error": null | { "code", "message" }, "meta": { "generated_at" } }`, except
`/openapi.json`, which returns the bare document. Responses are never cached.

| HTTP | `error.code` | Meaning |
|---|---|---|
| 401 | `missing_key`, `invalid_key`, `key_revoked`, `key_expired` | Fix or replace the key |
| 403 | `ip_not_allowed` | Call from an allowed IP, or update the key's allowlist |
| 403 | `insufficient_scope` | The key lacks the scope this endpoint needs |
| 400 | `invalid_request` | Bad query/body (message lists the fields) |
| 404 | `not_found` | Unknown id |
| 422 | `rejected` | The service refused the write |
| 429 | `rate_limited` | Over 120 req/min |

## Endpoints

| Method & path | Scope | What |
|---|---|---|
| `GET /summary` | read | KPIs (signups, posts, check-ins, live venues, moderation by priority, open reports/issues), 14-day daily series, pending vendor/event reviews, open tasks |
| `GET /activity?kind=&city=&vendor_id=&user_id=&limit=` | read | Activity events (last 30 days). `kind` is a prefix: `post`, `vendor`, `user`, `event`, `report`, `sanction` |
| `GET /live?city=` | read | Venues with live crowd signals, per city |
| `GET /vendors?q=&status=&city=&verified=&claim=&no_prices=&no_photos=&never_posted=&sort=&dir=&limit=&offset=` | read | The admin vendor table: completeness, posts/official updates in 7 days, open reports, last activity |
| `GET /vendors/{id}` | read | Listing, members, prices, recent posts (all statuses), events, pending verification (**no documents**), reports, audit trail, notes |
| `GET /moderation/queue?source=&limit=` | read | Open moderation items by priority then age, with post, author card and signals |
| `GET /moderation/stats` | read | Open by source/priority, 7-day human decisions and auto-flags, median time to close |
| `GET /reports?status=&entity=&offset=` | read | User reports (default `open`; `status=all` for everything) |
| `GET /issues?status=&limit=` | **pii:read** | Private safety/issue reports. Descriptions may contain third-party personal data |
| `GET /users/{id}` | read | Profile, sanctions, recent posts, audit timeline. `email` and `network_informational` only with `pii:read` |
| `GET /events?status=&city=&limit=` | read | Events in any status (default: pending review + upcoming published) |
| `GET /content?status=&type=` | read | Guides, toolkit, blog and safety pages (metadata) |
| `GET /tasks` | read | Admin tasks |
| `POST /tasks` | tasks:write | Create a task |
| `POST /notes` | notes:write | Add an internal note to a vendor / profile / event / post |
| `GET /search?q=` | read | Vendors, users (no email without `pii:read`), events, content |
| `GET /schema` | read | Endpoints, scopes and what *this* key may call |
| `GET /openapi.json` | read | OpenAPI 3.1 document (load it into tools / function-calling) |

## Examples

```bash
# What's waiting for a human?
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/moderation/stats" | jq '.data'
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/moderation/queue?source=hold&limit=10" | jq '.data[] | {priority, source, opened_at}'

# Venues that need attention in Lagos
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/vendors?city=lagos&no_prices=true&status=published&limit=20" | jq '.data.vendors[] | {name, completeness, last_activity_at}'

# Who signed up today?
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/activity?kind=user&limit=50" | jq '.data[] | {at, username}'

# Create a task (needs tasks:write)
curl -s -X POST -H "X-Agent-Key: $AGENT_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Call Copper Lantern about missing prices","priority":"normal","due_at":"2026-12-01","related_entity_type":"vendor","related_entity_id":"<vendor uuid>"}' \
  "$BASE/tasks" | jq

# Add a note (needs notes:write)
curl -s -X POST -H "X-Agent-Key: $AGENT_KEY" -H "Content-Type: application/json" \
  -d '{"entity_type":"vendor","entity_id":"<vendor uuid>","note":"Three reports this week mention long queues at the door."}' \
  "$BASE/notes" | jq

# Machine-readable description
curl -s -H "X-Agent-Key: $AGENT_KEY" "$BASE/openapi.json" > agent-openapi.json
```

## What an agent can't do (by design)

Approve, remove or hide posts; warn, suspend, ban or shadowban; publish or edit listings, events or content;
change settings or roles; read verification documents. Those stay with humans in `/admin`, with MFA, reasons
and the audit log.
