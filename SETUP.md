# SETUP.md — Accounts, keys and `.env.local` (v2.0, post-audit)

Do everything here BEFORE dropping PRD.md into Claude Code.
Result: one file, `.env.local`, in the repo root, pointing at your **DEV** Supabase project.
Claude Code never sees production credentials. Production goes live via LAUNCH.md (written by
Claude Code in Stage L15) which you run yourself.

Estimated time: 90 minutes. Build cost: £0. Launch cost: ~$45–50/month (Vercel Pro, Supabase Pro).

---

## 0. Before you start
- GitHub account; create an empty private repo, e.g. `discovernigeria-web`.
- Password manager: paste every key there as well as into `.env.local`.
- Brand name: decide if you can. Default `DiscoverNigeria`; `Diskova` is renameable via one env var later. Check the .com/.ng and App Store names before committing to Diskova.

## 1. Domain
Buy `discovernigeria.ng` (Whogohost, Qservers or Web4Africa) and the `.com` if free. Don't point DNS yet.
→ `NEXT_PUBLIC_SITE_URL=https://discovernigeria.ng` · `NEXT_PUBLIC_BRAND_NAME=DiscoverNigeria`

## 2. Vercel
1. vercel.com → sign up with GitHub → Import repo (Next.js, defaults). First deploy fails — fine.
2. Settings → Domains → add apex + www; add the DNS records at your registrar.
3. **Plan:** Hobby is for non-commercial use only. Build on Hobby; upgrade to **Pro ($20/mo)** the week of launch. (Crowd jobs now run inside Supabase via pg_cron, so there's no cron-frequency dependency on Vercel — only the commercial-use terms.)
4. `openssl rand -hex 32` → `CRON_SECRET=` (used by the daily digest and weekly backup routes).

## 3. Supabase — create TWO projects
Region **eu-west-2 (London)** for both (no Nigerian region; London is the best latency compromise for you and Lagos).

### 3a. DEV project `discovernigeria-dev` — goes into `.env.local`
1. Project Settings → API: Project URL, `anon` key, `service_role` key.
2. Project Settings → General: Reference ID.
3. Database → Connection string (URI).
4. Account → Access Tokens → new token `claude-code-cli`.
5. Database → Extensions: enable `postgis`, `pg_trgm`, `unaccent`, `citext`, **`pg_cron`**, `pg_net` (if listed), `pg_partman` (if listed).
6. Authentication → Providers → Email: enabled, **Confirm email ON**. Google: enable (needs step 4 below).
7. Authentication → URL Configuration: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:3000/**`, `https://*.vercel.app/**`.
8. Authentication → Multi-Factor → enable TOTP.
9. **Authentication → SMTP Settings → Enable Custom SMTP** (critical — the built-in sender is rate-limited to a handful of emails per hour and only to team members, which would silently break signups):
   - Host `smtp.resend.com` · Port `465` · User `resend` · Password = your Resend API key (step 5) · Sender email `hello@discovernigeria.ng` · Sender name = brand name.
   - Do this after step 5 if you're going in order.
10. **API → Exposed schemas**: must contain `public` and `storage` only. If `private` ever appears here, remove it. (Claude Code also documents this in LAUNCH.md for PROD.)

→ `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
SUPABASE_DB_URL=
SUPABASE_ACCESS_TOKEN=
SUPER_ADMIN_EMAIL=you@yourdomain.com
```

### 3b. PROD project `discovernigeria` — NOT in `.env.local`
Create it now with the same settings (steps 5–10, but Site URL `https://discovernigeria.ng` and redirect `https://discovernigeria.ng/**`). Store its keys in your password manager only. You'll paste them into **Vercel → Environment Variables (Production)** when you run LAUNCH.md. Enable **Point in Time Recovery** (Pro, $25/mo) the week of launch.

## 4. Google Cloud (Google sign-in)
console.cloud.google.com → new project → OAuth consent (External, publish) → Credentials → OAuth client (Web).
Origins: `https://discovernigeria.ng`, `http://localhost:3000`. Redirect URIs: `https://<DEV_REF>.supabase.co/auth/v1/callback` **and** `https://<PROD_REF>.supabase.co/auth/v1/callback`.
Paste Client ID/Secret into both Supabase projects → Auth → Providers → Google. Not needed in `.env.local`.

## 5. Resend
Sign up → Domains → add `discovernigeria.ng` → add DKIM/SPF/MX at registrar → Verified. Add DMARC TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`.
API Keys → `production`, Full access → copy once. Use this same key for Supabase SMTP (3a.9) on both projects.
→ `RESEND_API_KEY=` · `EMAIL_FROM="DiscoverNigeria <hello@discovernigeria.ng>"` · `EMAIL_ADMIN_TO=you@yourdomain.com`

## 6. Mapbox
Sign up → Tokens → `web-public` with URL restrictions `https://discovernigeria.ng/*`, `https://*.vercel.app/*`; a separate `dev-public` without restriction for localhost.
**Account → Usage → set an email alert at 40,000 map loads/month.** The map is lazy-loaded so most visits don't count, but a viral December night can spike.
→ `NEXT_PUBLIC_MAPBOX_TOKEN=pk.…` (dev token locally; web-public in Vercel)

## 7. OpenAI (moderation — free)
Sign up → add payment method → Billing → Limits → hard cap $5/month → API key `moderation`.
→ `OPENAI_API_KEY=`

## 8. Groq (AI assistant, Stage P5 — can do later)
console.groq.com → API key `web`. → `GROQ_API_KEY=` · `GROQ_MODEL=llama-3.3-70b-versatile`
If you skip this now, leave the key empty; nothing before P5 needs it.

## 9. Upstash Redis
Create Regional DB, region **eu-west-1**, name `discovernigeria-ratelimit`. Free tier 10k commands/day is fine for building; switch to pay-as-you-go with a $10 budget cap the week of launch.
→ `UPSTASH_REDIS_REST_URL=` · `UPSTASH_REDIS_REST_TOKEN=`

## 10. Sentry
New project (Next.js) `discovernigeria-web` → DSN; Auth token with `project:releases`, `org:read`; note org slug.
→ `NEXT_PUBLIC_SENTRY_DSN=` · `SENTRY_AUTH_TOKEN=` · `SENTRY_ORG=` · `SENTRY_PROJECT=discovernigeria-web`

## 11. Encryption key
`openssl rand -base64 32` → `TOKEN_ENCRYPTION_KEY=`

## 12. Meta / Instagram (OPTIONAL — Stage P6 only)
Skip for launch. Leave `META_APP_ID`/`META_APP_SECRET` empty and `FEATURE_INSTAGRAM_FEED=false`. If you do it later: developers.facebook.com → Business app → Instagram API with Instagram Login → App ID/Secret; redirect URIs `https://discovernigeria.ng/vendor/instagram/callback`; App Review (1–3 weeks).

## 13. Final `.env.local` (DEV values only)
```
# --- Site ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=DiscoverNigeria

# --- Supabase DEV ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
SUPABASE_DB_URL=
SUPABASE_ACCESS_TOKEN=
SUPER_ADMIN_EMAIL=

# --- Email ---
RESEND_API_KEY=
EMAIL_FROM="DiscoverNigeria <hello@discovernigeria.ng>"
EMAIL_ADMIN_TO=

# --- Maps ---
NEXT_PUBLIC_MAPBOX_TOKEN=

# --- AI ---
OPENAI_API_KEY=
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# --- Rate limiting ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Monitoring ---
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=discovernigeria-web

# --- Secrets ---
CRON_SECRET=
TOKEN_ENCRYPTION_KEY=

# --- Feature flags ---
FEATURE_INSTAGRAM_FEED=false
FEATURE_VIDEO=false
FEATURE_AI_ASSISTANT=true
FEATURE_CROWD_FORECAST=true
FEATURE_QA=true
FEATURE_POINTS=true

# --- Optional (P6) ---
META_APP_ID=
META_APP_SECRET=
```

Then in **Vercel → Settings → Environment Variables**:
- **Preview** environment: paste the DEV values above (with `NEXT_PUBLIC_SITE_URL` left as production URL is fine).
- **Production** environment: leave EMPTY until LAUNCH.md. This guarantees nothing Claude Code deploys can touch PROD data.

Confirm `.gitignore` contains `.env.local` before your first push.

## 14. Repo before starting Claude Code
```
discovernigeria-web/
  CLAUDE.md  PRD.md  PROGRESS.md  SETUP.md  CLAUDE_CODE_PROMPT.md
  .env.local   (NEVER commit)
```
Open Claude Code in the folder and paste the contents of `CLAUDE_CODE_PROMPT.md`.

## 15. What you do after the build
- Draft real content with Claude (chat) and load it via Admin → Content or the `/content` loader.
- Replace or delete the sample vendors.
- Run LAUNCH.md step by step (PROD migrations, PROD env in Vercel, SMTP on PROD, PITR, DNS).
- Enrol MFA on your super-admin account on first PROD login.
- Vendor outreach: the product is designed so one vendor posting an official update makes their page look alive on day one — lead with that in your pitch.
