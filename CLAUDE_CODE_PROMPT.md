# Paste everything below this line into Claude Code (auto mode)

You are the sole engineer building DiscoverNigeria, a real-time "what's happening right now" tourism and nightlife platform for Nigeria. You are working autonomously. I am not watching the session.

## Read first, in this order
1. `CLAUDE.md` — the working agreement. Treat every rule in it as binding.
2. `PRD.md` — the complete product and technical specification. Every decision has already been made there: stack, dependencies, schema, security, features, and a stage-by-stage build plan (§14).
3. `PROGRESS.md` — the tracker. It is at Stage 0.

## Your environment
- `.env.local` already exists and is fully populated. It points at the **DEV** Supabase project. Every account and key you need already exists. Do not ask me to create accounts, generate keys, or change settings in any dashboard. If a variable you need is genuinely absent from `.env.local`, log it under "Open questions for Fola" in PROGRESS.md and continue with everything else in the stage that doesn't depend on it.
- You will never have production credentials and must never try to obtain or guess them. Production promotion is a manual step I will run from the `LAUNCH.md` you write in Stage L15.
- Node, npm, git and the Supabase CLI are available. Use `SUPABASE_ACCESS_TOKEN` from `.env.local` for `supabase link` and `supabase db push` against the DEV project only.

## How to work
- Start at Stage L1 and proceed sequentially through L15, then continue automatically into P1–P5. P6 and P7 only run if their feature flags are true (they are false); otherwise skip them and note it.
- For each stage: announce the stage, implement it, run `npm run verify`, paste the last 30 lines of its real output into PROGRESS.md under that stage, review your work critically against the PRD's acceptance criteria, tick the stage, commit with `stage <id>: <name>`, and move on. Never tick a stage without real verify output. Never fabricate test results.
- If `npm run verify` fails, fix it before moving on. If you cannot fix it after three genuine attempts, document exactly what fails and why under "Open questions for Fola", then continue to the next stage if it does not depend on the failure.
- Make reasonable decisions yourself for anything the PRD leaves open: naming, layout, copy wording, component structure, colour nuances. Record each decision in PROGRESS.md "Notes / decisions". Do not stop to ask about these.

## When to flag me — and only then
Stop and write under "Open questions for Fola" only when a STOP rule in CLAUDE.md applies:
- a dependency not in PRD §4 is truly required,
- the PRD's schema (§6) cannot work as specified,
- working code must be deleted or rewritten,
- auth, payments or secrets need something beyond PRD §7,
- a product decision is genuinely unanswerable from the PRD.
Everything else: decide, note it, continue. A question that could have been answered by re-reading the PRD is not a reason to stop.

## Non-negotiables (repeat them to yourself at every stage)
- RLS on every table; `private` schema never exposed; service-role key never in client code.
- No bookings, no payments, no public incident feed, no reviews or star ratings, no social scraping.
- Never the phrase "Detty December". Never copy that promises authorities will act.
- Brand name comes only from `NEXT_PUBLIC_BRAND_NAME`.
- Mobile-first at 375 px. Photo-first, dark default.
- Per-user rate limits first; IP limits generous (carrier-grade NAT in Nigeria).
- One image per server invocation in the media pipeline.
- Every privileged action writes to the append-only audit log.

## Session continuity
If this session ends for any reason, the next session starts by reading PROGRESS.md and resuming from the first unticked stage. Never redo a ticked stage.

Begin now with Stage L1. State your plan for it, then build.
