# Working agreement

You are building the product defined in PRD.md.
Track all progress in PROGRESS.md.

## Workflow for every stage
1. Read PRD.md and PROGRESS.md before doing anything.
2. State which stage you are on and your plan for it.
3. Implement the stage.
4. Review your own work against the PRD. Be critical —
   list what's missing or risky before moving on.
5. Run `npm run verify` (build + lint + typecheck + tests). Paste the LAST 30 LINES of its
   real output into PROGRESS.md under the stage. A stage is never ticked without this evidence.
6. Update PROGRESS.md: tick the stage, note decisions.
7. Move to the next stage automatically unless a STOP rule applies.

## STOP and ask before:
- Installing a new dependency that is NOT listed in PRD.md §4 (Approved Dependencies)
- Changing the database schema in a way that differs from PRD.md §6 (Data Model)
- Deleting or rewriting existing working code
- Anything touching auth, payments, or secrets beyond what PRD.md §7 (Security) specifies
- Any decision not clearly answered by the PRD

When you stop, write the question under "Open questions for Fola"
in PROGRESS.md and wait.

Dependencies, schema, auth and security are all fully specified in PRD.md.
If you are following the PRD, the STOP rules should rarely trigger.
Do NOT stop for cosmetic choices, copy wording, component layout, or anything the PRD
leaves to your judgement — decide, note the decision in PROGRESS.md, and continue.

## Session continuity
If a session ends, the next one resumes from PROGRESS.md.
Never redo completed stages.

## Project rules (always apply)

### Environment and databases
- `.env.local` points at the DEV Supabase project. You only ever run migrations, seeds and
  tests against DEV. You never have, and never need, production credentials.
  Production promotion is a documented manual step for Fola (PRD §14, Stage L15 → LAUNCH.md).
- All secrets are already in `.env.local` (see SETUP.md for the full list of variable names).
  Never ask Fola to create an account or generate a key. If a variable is missing,
  write it under "Open questions for Fola" and continue with other work in the stage.
- Never commit `.env.local`. `.env.example` must list every variable with an empty value.
- `SUPABASE_SERVICE_ROLE_KEY` is used ONLY in server-side code (Route Handlers, Server Actions,
  scripts). It must never be imported into a Client Component or exposed via `NEXT_PUBLIC_`.

### Code conventions
- Next.js App Router, TypeScript strict mode, no `any`.
- Tailwind CSS + shadcn/ui components. Do not add other UI kits or chart libraries.
- Validate every input on the server with `zod` before it touches the database.
- All database access goes through `/lib/db/*` (user client) or `/lib/admin-db/*` (service role).
  No raw Supabase calls inside components.
- Business logic lives in `/lib/services/*`. Server Actions, Route Handlers and (later) the
  Agent API are thin wrappers over services.
- Mobile-first. Every page must look correct at 375px width before desktop.
- `npm run verify` must pass before every commit.
- Commit after each completed stage with message: `stage <id>: <stage name>`.

### Security conventions
- Row Level Security (RLS) is enabled on every table. No table is created without a policy.
- Admin-only tables and views live in the `private` schema, which is NOT exposed to PostgREST.
- Every admin route checks `role in ('moderator','admin','super_admin')` server-side AND
  that the session is `aal2` (MFA). Never trust client claims.
- Every write to a user-facing table creates an `audit_log` row (PRD §6.14).
- Uploaded images: strip EXIF, re-encode via `sharp`, max 5 MB, max 2000px long edge,
  ONE image per server invocation.
- Rate limits (PRD §7.5) are per-user first; IP limits are generous (Nigerian mobile
  networks share IPs via carrier-grade NAT).

### Content and brand
- The brand name is a single constant `BRAND_NAME` in `/lib/config.ts`, read from
  `NEXT_PUBLIC_BRAND_NAME`. Never hard-code the brand name anywhere else.
- Never use the phrase "Detty December" anywhere in the product. Use "December in Nigeria".
- Every user-generated post displays the "Unverified — posted by a community member" label unless
  `verified = true`.
- Never write copy that promises authorities will act on anything posted.

### Definition of done for each stage
- `npm run verify` passes with real output pasted into PROGRESS.md.
- All acceptance criteria listed for the stage in PRD.md are met.
- PROGRESS.md is updated.

## Environment notes (from setup, 7 Oct 2026) — binding

### Brand and domain
- Brand is **Diskova**, domain **diskova.io** (supersedes "DiscoverNigeria" / discovernigeria.ng
  anywhere in PRD.md or SETUP.md). Brand still comes only from `NEXT_PUBLIC_BRAND_NAME`.
- `NEXT_PUBLIC_SITE_URL` is unset on Vercel Preview. Fall back to `https://${VERCEL_URL}`, then
  `http://localhost:3000`.

### Supabase DEV
- Project ref `hizkmujuygupxedpmbqr`, region eu-west-2 (London).
- **Auto-expose new tables is OFF.** Every migration that creates a table, view or function in
  `public` must include explicit `GRANT`s to `anon` / `authenticated` (and `service_role` where
  needed) alongside its RLS policies. No grant = "permission denied" from PostgREST.
- Automatic RLS event trigger is ON (safety net only; still write explicit
  `ENABLE ROW LEVEL SECURITY` + policies).
- Exposed schemas: `public`, `graphql_public`. `private` must never be added.
- API keys are the new format: `NEXT_PUBLIC_SUPABASE_ANON_KEY` holds the publishable key
  (`sb_publishable_…`), `SUPABASE_SERVICE_ROLE_KEY` holds the secret key (`sb_secret_…`).
  Both work with supabase-js.
- `SUPABASE_DB_URL` is the Session pooler (IPv4). Direct connection is IPv6-only — don't use it.
- Extensions already enabled: postgis, pg_trgm, unaccent, citext, pg_cron, **pg_net, pg_partman**
  (both available). Use pg_partman for `activity_events` (PRD §6.23). Migrations should still use
  `create extension if not exists … schema extensions`.
- Auth: email confirm ON, anonymous OFF, TOTP MFA ON, Google provider ON (OAuth consent in Testing
  mode — only test users can sign in with Google on DEV).
- **Custom SMTP is NOT yet configured** (Resend domain pending). `RESEND_API_KEY` may be empty.
  Do not block on it. In tests, never depend on real email delivery: confirm users via
  `auth.admin.generateLink` / admin API in the Playwright signup→verify flow. Log it under
  "Open questions for Fola" only if something genuinely can't proceed.

### Hosting and git
- Work on branch **`develop`**. Never push to `main` (main = Vercel Production, which has no env
  vars until launch). Every push to develop builds a Vercel Preview against DEV.
- Commit `.gitignore` (covering `.env`, `.env*.local`) before any other file.
- The repo already contains the docs, so `create-next-app` can't run in place: scaffold into a temp
  folder and merge, never overwriting CLAUDE.md, PRD.md, PROGRESS.md, SETUP.md,
  CLAUDE_CODE_PROMPT.md or `.env.local`.
- Vercel function region is `lhr1` (set in dashboard). Also set `"regions": ["lhr1"]` in
  `vercel.json`.

### Services
- Sentry (EU, `algoscape` / `diskova-web`): error monitoring + tracing only,
  `tracesSampleRate` 0.1. Session replay, profiling and logs OFF (privacy + quota).
- OpenAI key is restricted to `/v1/moderations` only — don't call any other endpoint.
- Groq (P5): check Groq's current model list first. If `llama-3.3-70b-versatile` is retired, use
  Groq's recommended replacement and note it in PROGRESS.md. Do not stop to ask.
- Mapbox DEV token is unrestricted (localhost); the PROD token will be URL-restricted at launch.