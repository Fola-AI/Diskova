# Diskova UI/UX audit and upgrade plan

_8 October 2026 · branch `develop` @ `09f5d11`_

**Method.**
- Playwright captured 45 mobile screens at 390×844 (`isMobile`, dark theme), signed out, as a user and as a vendor, plus 4 desktop views at 1440×900.
- Script-measured in each page: tap targets under 44×44, text under 12px, heading order, unlabelled controls, horizontal overflow and page height.
- I read the component code for anything a screenshot can't show: focus, ARIA, motion and the admin screens, which sit behind MFA.

**Scope.** Presentation, feedback, motion and accessibility only. No changes to business logic, data models or routes. No new dependencies: framer-motion is **not** in PRD §4, so every motion spec below uses CSS transitions/keyframes, CSS `linear()` spring curves and a small pointer-events hook.

**Priority.**
- **P0**: accessibility or usability defect. Fix first.
- **P1**: noticeable quality gain.
- **P2**: polish.

**What already works (keep it).**
- No horizontal page scroll on any screen.
- Every image has alt text.
- Sheets are Radix Dialogs (focus trap, Esc, aria).
- The "Unverified — posted by a community member" label is present everywhere.
- Copy is short and human.
- The dark palette suits night-time use.
- The itinerary currency toggle and day tabs already use `radiogroup`/`tablist` roles.
- The countdown already uses `aria-live="off"`.

---

## 0. Global design system (applies to every screen)

These fixes live in shared components, so they repair most per-screen findings at once.

### G1 · Touch targets: P0
**Issues.**
- The header on every page is too small:
  - logo link 107×**32**; "Events" 60×**32**; "Ask" 41×**32**;
  - Search 36×**36**; "Sign in"/"Me" 63×**36**.
- The sheet close button is 36×36.
- Measured small-target counts (targets under 44pt / total):

  | Screen | Small / total |
  |---|---|
  | Home | 25/35 |
  | City | 48/74 |
  | Venue | 20/35 |
  | Events | **37/40** |
  | Event | 16/19 |
  | December | **33/35** |
  | Leaderboard | 20/21 |
  | Itinerary | 20/22 |
  | Assistant | 18/20 |
  | Check-in sheet | 25/54 |

- Most offenders are the shared Button `sm` size (h-8/h-9), filter chips (h-9) and inline text links.

**Changes.**
- **Button sizes:**
  - `default` → `h-11` (44px);
  - `sm` → `h-10`, plus an invisible hit-area expander: `relative after:absolute after:-inset-1 after:content-['']`;
  - `icon` → `h-11 w-11`.
- **Header:** set every nav item to `h-11 min-w-11 px-3`. Header height goes from `h-14` to `h-14` (unchanged), with items centred. The logo tile stays 32px visually inside a 44px link.
- **Sheet close:** `h-11 w-11`.
- **Filter chips** (city, category, December, events): `h-10` plus a 2px hit expander. Gap between chips becomes `gap-2` (8px grid).
- **Inline text links inside paragraphs:** exempt, as WCAG 2.5.8 allows. Footer links become a two-column list with `py-2.5` rows.

### G2 · Type scale: P0/P1
**Issues.**
- **10px** countdown units (December).
- **11px** date-chip month/weekday ("OCT"/"SUN") on every event card.
- **11px** pulse labels (Empty/Chill/Busy/Packed) on the venue page.
- 15 sub-12px elements in the check-in sheet.
- Small caps on dim muted text make these the hardest strings in the product to read on a phone at night.

**Changes.** Adopt one 6-step scale and lint against arbitrary `text-[10px]`/`text-[11px]`:

| Token | Size / line-height | Use |
|---|---|---|
| `caption` | 12 / 16, +0.02em, weight 500 | chip labels, units, timestamps (floor; nothing smaller) |
| `footnote` | 13 / 18 | meta lines, helper text |
| `body` | 15 / 22 (≈1.47) | default body on mobile |
| `callout` | 17 / 24 | list-row titles, card titles |
| `title` | 22 / 28 Fraunces 600 | section h2 (currently `text-xl` = 20) |
| `display` | 32 / 36 Fraunces 600 (40 / 44 ≥ sm) | page h1 |

- Uppercase micro-labels ("EVENING", "OCT", "DAYS") use `caption` at weight 600 with tracking `0.06em`, never below 12px.

### G3 · Focus visibility: P0
**Issue.** The Button focus ring is `ring-1` with `--ring: 146 60% 45%` on `#0B0F0D`. A 1px green ring is nearly invisible on the dark background. Chips, cards and nav links have no focus style at all.

**Change.** Add a global rule:
```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: inherit;
}
```
- Remove the per-component `focus-visible:outline-none` overrides.
- Cards that are whole-card links get `focus-within:ring-2` on the card.
- Gold (`#F4B400`) is the high-contrast focus colour inside green-filled controls.

### G4 · Motion tokens and reduced motion: P0 (the reduced-motion part) / P1
**Issues.**
- Only the accordion and `live-pulse` keyframes exist.
- Sheets snap in and out with no transition.
- Nothing responds on touch-down.
- `live-pulse` runs infinitely, and there is no `prefers-reduced-motion` handling anywhere.

**Changes.** Add CSS variables and Tailwind tokens:

```css
:root {
  --dur-press: 120ms;      /* touch-down feedback */
  --dur-micro: 180ms;      /* toggles, chips, segmented indicators (150–250ms) */
  --dur-move: 320ms;       /* sheets, page-level transitions (250–400ms) */
  --dur-exit: 220ms;       /* exits are ~30% faster than entrances */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);       /* decelerate */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);            /* exits */
  /* spring, moderate damping (≈ stiffness 380, damping 32, ~4% overshoot) */
  --ease-spring: linear(0, 0.18 7%, 0.56 17%, 0.86 28%, 1.01 40%, 1.04 50%, 1.02 62%, 1 78%, 1);
}
@supports not (transition-timing-function: linear(0, 1)) {
  :root { --ease-spring: var(--ease-out); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```
- **Rule:** animate only `transform` and `opacity`, never `height`, `top` or `box-shadow`.
- **Interruptibility:** every animation is a CSS **transition** (re-targetable mid-flight), never a fire-and-forget keyframe, except the live dot.

### G5 · Press feedback (respond on touch-down): P1
**Issue.** Buttons, chips, cards and pulse tiles only change colour on `:hover`, which doesn't fire on touch. A tap gives no feedback until navigation completes.

**Change.** Add an `active:` layer to Button, chip and card-link variants:
- `active:scale-[0.97] active:opacity-90`;
- `transition-[transform,opacity] duration-[var(--dur-press)] ease-out`;
- `touch-action: manipulation`, which removes the 300ms double-tap-zoom delay on older WebKit;
- `-webkit-tap-highlight-color: transparent`.

**Motion.**
- **What:** the pressed element.
- **From→to:** scale 1 → 0.97 and opacity 1 → 0.9 on pointerdown; back to 1 on release.
- **Timing:** 120ms ease-out down, 180ms spring up, so release has a slight bounce.

### G6 · Bottom sheet (Sheet component): P1
Used by the check-in, add-to-night, report and share sheets.

**Issues.**
- No enter/exit animation.
- No grabber.
- No drag-to-dismiss.
- The sticky primary action is not pinned, so on short phones "Post check-in" sits below the fold.
- The sheet title row scrolls away.

**Changes.**
- **Grabber:** add a 36×5 rounded `bg-muted-foreground/40` bar centred 8px from the top edge, marked `aria-hidden`.
- **Header:** make the header row `sticky top-0` with a `bg-background/95` backdrop.
- **Primary action:** footer slot `sticky bottom-0` with a top hairline and `pb-[env(safe-area-inset-bottom)]`.
- **Drag to dismiss:** a pointer-events hook on the grabber/header.
  - The content follows the finger one-to-one: `translateY = max(0, dy)`.
  - Above 0 the sheet follows at rubber-band resistance, `dy * 0.25`, as a soft boundary.
  - Dismiss on release if `dy > 30% of height` **or** `velocity > 0.5px/ms`; otherwise spring back.
  - Pass release velocity into the exit duration: `duration = clamp(160, remaining / v, 320)ms`, so a fast flick leaves fast and the sheet keeps the finger's momentum.
- **Desktop (≥ sm):** remains a centred dialog.

**Motion.**

| Event | What moves | From → to | Duration / easing |
|---|---|---|---|
| Open | sheet | `translateY(100%)` → `0` | 320ms `--ease-spring` |
| Open | overlay | opacity 0 → 1 | 200ms ease-out |
| Close (button/Esc/overlay) | sheet | `0` → `translateY(100%)` | 220ms `--ease-in` |
| Close | overlay | opacity 1 → 0 | 180ms |
| Drag release, not dismissed | sheet | current y → 0 | 280ms spring |
| Desktop open | dialog | scale 0.96 + opacity 0 → 1 | 220ms ease-out |

- Use Radix `data-state=open|closed` with `forceMount` and transitions, so a half-closed sheet can be reopened mid-animation.

**Accessibility.**
- The grabber is decorative.
- Drag is never the only way to close: the Close button and Esc remain.
- Focus returns to the trigger on close (Radix default; verify it is not lost when content lazy-loads).

### G7 · Loading, empty, error and success states: P1
**Issues.**
- `loading.tsx` exists only for some routes. Client fetches show nothing until they resolve, including Q&A answers, list editor actions and the assistant first token.
- Empty states vary from a dashed box (December) to plain text (vendor updates) to nothing.

**Changes.**
- **Shared `<Skeleton>`:** `bg-muted` with a 1.2s opacity shimmer between 0.5 and 1, disabled under reduced motion. Add a `loading.tsx` for `/c/[city]`, `/v/[slug]`, `/events`, `/e/[slug]`, `/itineraries/*`, `/me/*` and `/vendor/*`, matching each page's real layout so nothing shifts.
- **Shared `<EmptyState icon title body action>`:** 48px muted icon, 17px title, 15px body, one primary action. Use it for December, events, vendor updates, saved lists, my posts, the Q&A list and search no-results.
- **Shared `<InlineError>`:** a red-tinted card with a retry button. Never surface a raw error string.
- **Toasts (sonner):**
  - Bottom-centre on mobile, positioned above the sticky totals bar or sheet footer via `offset`.
  - Swipe-to-dismiss, which sonner supports.
  - Max 1 visible.
  - Destructive actions get **Undo** instead of a confirm dialog: delete list item, remove from night, unsave and delete own post. Undo uses a 5s deferred commit.

**Motion.** Toasts enter `translateY(16px)`+opacity 0 → 0/1 in 240ms spring and exit with opacity → 0 in 160ms. Skeleton → content is a 150ms opacity crossfade.

### G8 · Navigation and IA on mobile: P1/P2
**Issues.**
- The header carries logo + Events + Ask + Search + Me on a 390px screen. That is cramped (G1), and there is no persistent way back to "Tonight" or "Saved" from deep pages.
- Breadcrumbs exist only on itineraries.
- The `Live` pill is hidden on mobile.

**Changes.**
- **P1:** add breadcrumbs (`City / Venue`, `Events / Event`, `City / Questions / Question`, `Me / Lists / List`). Render them as 13px `footnote` links with `h-11` hit rows, wrapped in `nav aria-label="Breadcrumb"`.
- **P2:** add a **bottom tab bar on < sm only**, presentation only, linking to routes that already exist:
  - **Tonight** (`/c/[lastCity]`), **Events**, **Ask** (when `FEATURES.aiAssistant`), **Saved** (`/me/lists`), **Me**;
  - 5 items, `h-[56px] + safe-area`, icons 24px plus 12px labels;
  - the active tab uses brand green, plus a 2px top indicator so it does not rely on colour alone.
  - The header then slims to logo + Search.
  - The tab bar hides while scrolling down and returns on scroll up.

**Motion.**
- **Tab bar hide/show:** `translateY(0 ↔ 100%)`, 250ms ease-out.
- **Active indicator:** slides between tabs, `translateX` 220ms spring.

**Accessibility.**
- `nav aria-label="Main"` with `aria-current="page"`.
- The bar never covers focused elements: add `scroll-padding-bottom` equal to the bar height.

### G9 · Contrast and colour semantics: P1
**Issues.**
- Muted text (`--muted-foreground` on `#0B0F0D`) passes AA for body. On `bg-card`/`bg-secondary` surfaces at 11–12px (date chips, "Free before midnight", "2 cocktails"), it sits near the 4.5:1 floor.
- The disabled primary button ("Post check-in", dark green + dim text) reads as **broken**, not "waiting for input".
- The pulse levels rely on dot colour plus a label, which is fine. On the map heat legend, colour is the only cue.

**Changes.**
- Raise `--muted-foreground` lightness by about 6%. Never use muted text below 13px on raised surfaces.
- Disabled primary: keep full-opacity text on `bg-primary/40`, plus a helper line saying what's missing (see Check-in).
- Heat map legend: add text labels ("Quiet → Packed") alongside the colour ramp.

### G10 · Development artefact (not a product issue)
The round "N" badge overlapping content in every screenshot is the Next.js dev-tools indicator, which only appears in `next dev`. Optionally set `devIndicators: false` so it stops obscuring QA screenshots.

---

## 1. Public screens

### 1.1 Home / Tonight (`/`, `/c/[city]` Tonight view)
**Issues.**
- 25/35 small targets: city chips h-9, "All events", "See all", "Own a venue?" text links, and the add-to-night icon (36px) on cards.
- Event date chip "OCT/SUN" at 11px.
- Search sits at the very bottom of the page (after rails), but it's the most common intent.
- The "Live now" rail with one card leaves a large empty right half.
- The Daytime rail has no scroll affordance other than a clipped card. Fine on touch, invisible to keyboard users.
- The heat-map button floats over a static map image with no hint that tapping loads the interactive map.

**Recommended changes.**
1. Move the search field to directly under the hero ("Tonight in Lagos"). Make it 48px tall with 15px placeholder text.
2. City chips → `h-10` plus a hit expander. The selected chip gets a check icon or bold weight in addition to green.
3. **Live rail when there are fewer than 2 venues:** render full-width cards instead of a rail.
4. **When the rail has 0 venues:** show the shared EmptyState: "Quiet so far — be the first to check in", linking to directory.
5. **Section links** ("All events", "See all"): give them a 44px hit area and a chevron icon so they read as navigation.
6. **Add-to-night icon button:** 44×44 hit area (visual 36px).
7. **Rails:** add `scroll-snap-type: x mandatory` with `scroll-snap-align: start` per card, `scroll-padding-inline: 16px` and edge fade masks. On ≥ md, add prev/next arrow buttons for keyboard and mouse.
8. **Heat map button label:** "Open live map" and a subtitle "Loads interactive map".

**Motion spec.**
- **City switch:** content crossfades, opacity 1 → 0 → 1, 180ms ease-out each way. The selected chip background slides to the new chip (`translateX`, 220ms spring), using a single absolutely-positioned pill element.
- **Live dot:** keep `live-pulse` (1.6s ease-in-out), but stop it under reduced motion.
- **Card press:** G5 scale 0.97.
- **Rail:** native momentum scroll plus snap. No JS scroll animation.

**Accessibility notes.**
- The city chips are a single-choice set: `role="radiogroup"` + `role="radio"` + `aria-checked`, with arrow-key roving focus. Alternatively, keep them as links with `aria-current="true"`.
- **Rails:** each is a `<section aria-labelledby>`; cards are `<li>` in a `<ul>`.
- The date chip needs an accessible date: `<time dateTime="2026-10-11">`, with the visible "OCT 11 SUN" marked `aria-hidden` and an sr-only "Sunday 11 October".

### 1.2 City page (`/c/[city]` full)
**Issues.**
- **6.8 screens tall**: Tonight view + Q&A link + the full A–Z directory in one scroll.
- 48/74 small targets: category filter chips, directory rows and pagination.
- The directory filter chips and the city switcher look identical but do different things.

**Recommended changes.**
1. **Collapse the directory behind a segmented control** at the top of the content: **Tonight · Directory · Questions**.
   - All three render on the same route, so this is presentation only.
   - The default segment is Tonight.
   - The choice is persisted in the URL hash (`#directory`) so links still work.
   - This roughly halves page length.
2. Directory rows → 64px min height: 48px thumbnail, 17px name, 13px meta (area · category · price band) and a chevron.
3. **Directory filters:** move into a "Filters" button that opens a bottom sheet (G6) with Category, Area, Price and Open now. Show the active-filter count as a badge on the button, and render active filters as removable chips under the button (× hit area 44px).
4. **Sticky segmented control:** sticks under the header, `top-14`.

**Motion spec.**
- **Segment indicator:** `translateX` + width, 200ms spring.
- **Panel swap:** outgoing opacity → 0 over 120ms. Incoming opacity 0 → 1 plus `translateX(±12px → 0)` (direction follows the segment order, for spatial consistency) over 240ms ease-out.
- **Filter sheet:** G6.

**Accessibility notes.**
- **Segmented control:** `role="tablist"` / `tab` / `tabpanel`, with ←/→ arrow keys and Home/End.
- **Filter result count:** announced with `aria-live="polite"` ("23 places").

### 1.3 Venue page (`/v/[slug]`)
**Issues.**
- **Action row** (Directions · Bolt · Uber · WhatsApp · Website): it overflows and Website is clipped at the right edge with no affordance, and the tiles are about 52×52. There are also **three** separate share/save rows (Add to my night; Share on WhatsApp; Copy link), so there are ~10 actions above the pulse bar, beyond the ≤9 main-actions guideline.
- **Pulse labels at 11px.** The "At capacity" label wraps to two lines.
- **"Check in" competes with the one-tap pulse bar** directly above it: two ways to report crowd level, one after the other.
- **The hero** is a plain gradient band of 220px when there's no cover photo, which wastes the first screen.
- **The prices card** row height is fine, but "Free before midnight on Thursdays" is 12px muted on a raised surface (contrast).
- **The opening hours table** highlights only by bold weight; today's row isn't marked.

**Recommended changes.**
1. **Primary action row:**
   - Three fixed equal-width buttons: **Directions**, **Ride** and **Share**. Each is 48px tall with an icon and label.
   - **Ride** opens a sheet with Bolt / Uber.
   - **Share** opens a sheet with WhatsApp / Copy link / native `navigator.share` where available.
   - **Website** moves into the "Getting there" or about section.
   - **Add to my night** becomes an icon button (bookmark-plus, 44×44) in the title row.
2. **Pulse bar:** 5 equal tiles, 56px tall, 12px labels. Abbreviate "At capacity" → "Full" visually, and keep the full text in `aria-label`.
3. **Check-in button:** rename it "Add details (photo, vibe, wait)", restyle as secondary, and show it **after** a pulse tap ("Thanks! Add more?"). Pulse is the primary, low-effort action.
4. **No-photo hero:** shrink to 120px. Use the category icon at 48px plus a category-tinted gradient.
5. **Opening hours:** mark today's row with a "Today" pill and `bg-secondary`. Show "Open now · closes 4am" / "Closed · opens 10pm" status at the top of the page in green/amber text **plus** an icon.
6. **Sticky compact header after the hero scrolls away:** venue name (17px) + pulse badge, 48px tall, `bg-background/90 backdrop-blur`.

**Motion spec.**
- **Pulse tap:**
  - The tapped tile goes to scale 0.95 on touch-down (120ms), then springs back to 1 with a brief ring fill (`box-shadow` → use a pseudo-element's opacity, 200ms).
  - The "Right now" crowd badge counts up/updates with a 180ms crossfade.
  - The "Thanks! Add more?" row slides in: `translateY(8px)` + opacity 0 → 0/1, 240ms spring.
- **Sticky compact header:** fades in on hero exit, opacity 0 → 1 and `translateY(-8px → 0)`, 200ms ease-out, driven by IntersectionObserver (no scroll listeners).
- **Ride/Share sheets:** G6.

**Accessibility notes.**
- **Pulse bar:**
  - Wrap in a `fieldset` with legend "How busy is it right now?".
  - Each tile is `aria-pressed` after voting, with an `aria-live="polite"` confirmation "Thanks — marked Busy".
  - It must not depend on colour: the label is always visible.
- **Today row:** `aria-current="date"`.
- **The external Bolt/Uber/WhatsApp links:** add `aria-label="… (opens app)"`.

### 1.4 Events list (`/events`) and December (`/december`)
**Issues.**
- **Events:** **37/40 small targets** (chips h-9, card add buttons, month-grid days).
- **December:**
  - **33/35** small targets.
  - Countdown units at **10px**.
  - Two horizontally scrolling chip rows stacked (city + category), both clipped with no affordance.
  - The empty state sits in a dashed box that looks like a drop zone.
  - "Subscribe: iCal feed" is a tiny afterthought link.
- **Event card date chip:** 11px.
- **Month grid:** day cells are about 40px on a 390 screen.

**Recommended changes.**
1. **Collapse the two chip rows** into one row: a **City** dropdown chip ("All cities ▾") plus category chips. The City chip opens a sheet list with 56px rows.
2. **Chips and day cells:** `h-10` with hit expanders. Day cells use `aspect-square min-h-11`. If 7 columns don't fit at 44px (they do: 7×48 = 336 < 358), make cells 48px.
3. **Countdown:**
   - Units become 12px caption at weight 600.
   - The numbers stay 28px Fraunces with `tabular-nums` so the width doesn't jitter.
   - Tick only the seconds digit.
4. **Empty state:** shared EmptyState with an illustration-free icon (calendar-plus), "The calendar is filling up", and a primary button **Submit your event**. Use a solid card, not dashed.
5. **iCal:** promote to a secondary button "Add to my calendar" with a calendar icon, next to the filters.

**Motion spec.**
- **Countdown digits:** on change, the old digit goes `translateY(0 → -40%)` + opacity → 0 and the new one `translateY(40% → 0)`, 200ms ease-out. Disabled under reduced motion (digits just swap).
- **Filter change:**
  - The list crossfades over 180ms.
  - New cards stagger in: each `translateY(8px → 0)` + opacity, 220ms ease-out, 30ms stagger, max 6 staggered and the rest instant.

**Accessibility notes.**
- **Countdown:** keep `aria-live="off"`, and provide a static sr-only sentence "Season starts in 37 days" that updates hourly, not every second.
- **Month grid:** `role="grid"` with arrow-key navigation. Each day cell's `aria-label` reads "Sunday 11 October, 2 events".
- **Category chips:** `aria-pressed`, or radiogroup if single-select.

### 1.5 Event detail (`/e/[slug]`)
**Issues.**
- 16/19 small targets: ticket link, add-to-night, share, venue link.
- The ticket price range and time are buried in the meta line.
- No clear primary action.

**Recommended changes.**
1. **Key-facts block** under the title, as three rows with icons, each 15px: **Date & time** ("Sun 11 Oct · 2:35pm"), **Venue** (tappable row → venue page) and **Price** ("₦15,000 – ₦40,000").
2. **Sticky bottom action bar on mobile:** primary **Get tickets** (external), with secondary icon buttons **Add to night** and **Share** (44×44 each). Pad the page bottom so content clears the bar.
3. **Add-to-calendar:** move into the Share sheet.

**Motion spec.**
- **Sticky bar:** slides up on load, `translateY(100% → 0)`, 280ms spring after first paint (`requestAnimationFrame`), so it doesn't contribute to LCP/CLS: it is `position: fixed` and reserved with padding.
- **Add to night success:** the icon morphs plus → check with a 180ms scale 0.8 → 1 spring and a toast.

**Accessibility notes.**
- Wrap the date in `<time>`.
- **External ticket link:** `rel="noopener"` with `aria-label="Get tickets (opens ticket site)"`.
- **Sticky bar:** `role="region" aria-label="Event actions"`.

### 1.6 Guides list / guide (`/guides`, `/guides/[slug]`), Diaspora toolkit (`/toolkit`), Safety (`/safety`)
**Issues.**
- **Long-form pages:** body text is 16px, but measure (line length) runs to about 75 characters on desktop.
- No reading progress or table of contents on long guides.
- The saved-guides toggle is small.
- **Safety:** emergency numbers are body text, not tappable `tel:` buttons.

**Recommended changes.**
1. **Prose:** cap at `max-w-[65ch]`, line-height 1.6 and 24px paragraph spacing.
2. **Guides over 4 sections:** a collapsible "On this page" TOC (`<details>`) at the top, plus a sticky 2px reading-progress bar under the header (transform `scaleX`).
3. **Save guide:** 44×44 icon button with a label tooltip on desktop and a toast on save with Undo.
4. **Safety:** each emergency contact becomes a 56px row: name, number and a **Call** button (`tel:`). Do not promise any response, per the CLAUDE.md copy rule. Keep the "verify locally" note directly above the list.

**Motion spec.**
- **Reading progress:** `transform: scaleX(p)`, updated through a passive scroll listener / `animation-timeline: scroll()` where supported, with no easing (1:1 tracking).
- **TOC expand:** 200ms ease-out on the chevron's rotation. Content appears instantly (no height animation).

**Accessibility notes.**
- **TOC:** `nav aria-label="On this page"`.
- **Progress bar:** decorative, `aria-hidden`.
- **Call buttons:** `aria-label="Call Lagos State Emergency, 112"`.

### 1.7 Search (`/search`)
**Issues.**
- Results arrive only on submit. There is no debounce-as-you-type, no recent searches, and no explicit no-results state with suggestions.
- The search field isn't autofocused when arriving from the header icon.

**Recommended changes.**
1. **Autofocus** when navigated from the header (`?focus=1`). The input uses `type="search" enterkeyhint="search"` and is 48px tall, with a clear (×) button at 44px.
2. **As-you-type results:** 250ms debounce through the existing search service. Show a skeleton list while loading.
3. **Empty query state:** recent searches (localStorage, per-device convenience, try/catch) plus popular categories as chips.
4. **No-results:** EmptyState "Nothing for 'xyz' in Lagos" with actions **Search all cities** and **Ask the community**.

**Motion spec.** Results crossfade over 150ms; first-load rows stagger 20ms (max 8).

**Accessibility notes.**
- `role="search"` landmark.
- Result count via `aria-live="polite"` ("12 results").
- The clear button's `aria-label` is "Clear search".

### 1.8 Leaderboard (`/c/[city]/leaderboard`)
**Issues.**
- **20/21 small targets.** Rows are about 36px tall with profile links.
- The ranks 1–3 treatment relies on colour alone.
- The month switcher is small.

**Recommended changes.**
1. **Rows:** 56px tall, with rank (tabular, 17px), avatar 32px, handle and check-in count right-aligned.
2. **Top 3:** add a medal icon plus the text rank.
3. **The current user's own row:** pinned at the bottom as a sticky "You · #14" when it's off-screen.
4. **Month switcher:** a segmented control (This month · Last month), 44px.

**Motion spec.** Switching month crossfades the list (180ms). The sticky self-row slides in `translateY(100% → 0)`, 240ms spring.

**Accessibility notes.**
- Use an ordered list (`<ol>`) so rank is semantic. The medal icon is `aria-hidden` because rank is in the text.

### 1.9 City Q&A list (`/c/[city]/questions`) and Question (`/q/[id]`)
**Issues.**
- **`/q/[id]` has no `<h1>`.** The question title is rendered as a lower heading. P0.
- **Answer actions** (helpful 👍, Report, Answer) are about 32px tall.
- "Accepted" is a green badge with an icon (OK) but sits at 12px.
- The question composer is behind a button that opens a form inline with no character count.

**Recommended changes.**
1. Promote the question title to `<h1>` at the `display` token.
2. **Answer action row:** `h-11` icon+label buttons. The helpful count sits inside the button ("👍 3"), and Report is in an overflow (⋯) menu, to reduce visual weight.
3. **Accepted answer:** pin it first, with a 2px green left border plus the "Accepted" label.
4. **Composer:** a bottom sheet (G6) with textarea, `maxLength` counter ("120/500"), inline validation on blur and a sticky Post button.

**Motion spec.**
- **Helpful tap:** the thumb icon scales 1 → 1.2 → 1 (220ms spring). The count rolls with the same digit transition as the countdown (200ms).
- **New answer posted:** inserted with `translateY(8px)` + opacity → 0/1 (240ms) and a 1s background highlight fade from `primary/15` → transparent.

**Accessibility notes.**
- **Helpful button:** `aria-pressed` + `aria-label="Mark helpful, 3 people found this helpful"`.
- `@radix-ui/react-dropdown-menu` is not installed or approved, so the ⋯ menu is a small Sheet (G6) listing the actions. It needs no new dependency.

### 1.10 Shared list (`/l/[token]`)
**Issues.**
- The list renders as plain rows. The owner is anonymous by design, but there's no "Save a copy" or "Open on map" affordance.
- The share CTA is small.

**Recommended changes.**
1. **Header:** list name (h1), item count and "Shared list" caption.
2. **Rows:** venue cards with a 56px thumbnail, area and live pulse badge when present.
3. **Primary actions:** **Open all on map** (existing MapToggle) and **Share** (native share sheet).

**Motion spec.** Rows stagger in (20ms, max 8). The map toggle crossfades the list → map over 250ms.

**Accessibility notes.** `<ol>`/`<ul>` semantics; the item count is in the heading's accessible description.

### 1.11 Itineraries list and Itinerary (`/itineraries`, `/itineraries/[slug]`)
**Issues.**
- 20/22 small targets: currency radios about 36px, day tabs about 40px, share buttons.
- **Totals card text wraps awkwardly:** "Day 1: ₦18,500   Running total to day 1: ₦18,500" sits on one line and fights for space at 390px.
- **"Whole trip"** is in muted grey even though it's the most important number.
- The totals card is already `sticky bottom-2`, but at about 170px tall it covers roughly 20% of the viewport over the stops on a 390px phone.
- Stop cards are not tappable, though they name a venue.
- **Currency radiogroup** and **day tablist** lack arrow-key navigation (roles present, roving focus missing).

**Recommended changes.**
1. **Totals:** slim the existing sticky card to a **48px bottom bar** on mobile (48px + safe area), showing "Day 1 **₦18,500** · Trip **₦28,500**" with the "rough guide, per person" caption in a tap-to-expand. On desktop, keep the card in a right column.
2. **Totals hierarchy:** whole trip in foreground colour at weight 600; day total secondary. Drop the "running total to day N" line when N = 1 (it duplicates the day total).
3. **Currency toggle:** a segmented control at 44px. It also becomes a single `£`/`$`/`₦` button in the sticky bar on mobile, saving vertical space.
4. **Day tabs:** 44px pills with "Day 1 · Sat" labels, and horizontal swipe between day panels (see motion).
5. **Stop cards with a venue:** the whole card becomes a link to the venue (chevron on the right). Time-of-day label "EVENING" at 12px caption weight 600 with the icon.
6. Show `≈` before converted amounts, with a footnote giving the rate date.

**Motion spec.**
- **Currency change:**
  - The segmented indicator slides (200ms spring).
  - Each amount does a 160ms vertical digit roll: old `translateY(0 → -30%)` + fade, new `translateY(30% → 0)`.
  - No layout shift, because amounts use `tabular-nums` with a reserved `min-width`.
- **Day change via tab:**
  - The active pill background slides to the new tab (220ms spring).
  - The panel transitions directionally: going to a later day, the outgoing panel moves `translateX(0 → -24px)` + fade over 160ms and the incoming moves `translateX(24px → 0)` over 260ms ease-out; going back mirrors this (spatial consistency).
- **Day change via swipe:**
  - The panel follows the finger 1:1 horizontally.
  - Commit if `|dx| > 25% width` or `velocity > 0.4px/ms`, finishing with a spring inheriting the release velocity. Otherwise spring back over 260ms.
  - At the first/last day, rubber-band at 0.3×.
  - Vertical scroll stays native: lock the axis after 10px of movement.
- **Sticky bar:** enters `translateY(100% → 0)`, 280ms spring.

**Accessibility notes.**
- Add roving `tabIndex` plus ←/→/Home/End to both the radiogroup and the tablist (WAI-ARIA APG patterns).
- Day panel: `aria-labelledby` the active tab.
- **Totals:** announce changes politely only on currency switch ("Totals now in pounds"), not on every render.
- Swipe is supplementary; the tabs remain.

### 1.12 Assistant (`/assistant`)
**Issues.**
- 18/20 small targets: suggestion chips and the send button.
- There's no visible typing/streaming indicator before the first token.
- The disclaimer ("can be wrong") is far from the answer.
- The input doesn't stay above the iOS keyboard. It is a page-level form, not a fixed composer.

**Recommended changes.**
1. **Composer:** fixed to the bottom (`position: sticky; bottom: 0` in a flex column using `100dvh`). Textarea auto-grows to 4 lines, with a 44px send button disabled until there's text.
2. **Suggestions:** chips at 44px, in a 2-column grid when empty, replaced by the conversation once started.
3. **Indicator:** three-dot "thinking" bubble until the first token.
4. **Citations/links** to venues render as tappable 44px chips under the message.
5. A one-line footnote under **each** assistant message: "AI can be wrong — check before you go".
6. **Stop:** a stop-generating button replaces send while streaming.

**Motion spec.**
- **User message:** appears from the composer, `translateY(12px) scale(0.98)` → 0/1, 220ms spring.
- **Thinking dots:** each dot opacity 0.3 → 1, 900ms loop with 150ms offsets. Under reduced motion, a static "Thinking…" label.
- **Streaming text:** no per-token animation (avoid jank). Auto-scroll only if the user is within 80px of the bottom; otherwise show a "↓ New reply" pill that fades in over 150ms.

**Accessibility notes.**
- **Message list:** `role="log" aria-live="polite" aria-relevant="additions"`. Announce only the completed message, not every streamed token: set `aria-busy="true"` while streaming.
- **Send button:** `aria-label="Send"`.
- **Textarea:** a visible label or `aria-label="Ask about December in Nigeria"`.

### 1.13 Auth: Login, Sign up, Reset (`/login`, `/signup`, `/reset`)
**Issues.**
- Validation shows only after submit (`25-signup-errors`), and errors render as a block above the form, far from the fields.
- No show/hide password toggle.
- The Google button and email form have equal weight with no divider.
- `autocomplete` attributes are partly set.

**Recommended changes.**
1. **Validation and errors:**
   - Validate inline on **blur** (zod schema shared client-side for UX; the server still validates).
   - Show errors directly under the field in 13px red with an icon.
   - The field gets a red border and `aria-invalid`.
   - Errors clear as the user types valid input.
2. **Password:** 44×44 show/hide eye toggle inside the field. Show strength hints as a checklist (8+ chars ✓) that ticks live, not just an error.
3. **Order:** Google button first, then an "or" divider, then the email form, or the reverse. Pick one and apply it across login and signup consistently.
4. **Autocomplete:** `email` + `current-password` (login); `new-password` (signup); `autocapitalize="none" spellcheck="false"` on email.
5. **Submit:** spinner inside the button and the label "Signing in…". The button stays the same width (no layout jump).
6. **Post-signup:** a "Check your email" success screen with the address, an **Open mail app** link (`mailto:`, best effort) and resend with a 60s cooldown timer.

**Motion spec.**
- **Error appear:** opacity 0 → 1 + `translateY(-4px → 0)`, 160ms ease-out.
- **Error field shake:** a gentle `translateX` 0 → 4 → -4 → 0 over 240ms on submit with errors only (not on blur). Disabled under reduced motion.
- **Button spinner:** fades in over 150ms.

**Accessibility notes.**
- Each error is linked via `aria-describedby`.
- **On submit with errors:** focus moves to the first invalid field, with a polite summary "2 fields need attention".
- Labels are visible (not placeholder-only).
- The password toggle's `aria-label` switches between "Show password" and "Hide password", with `aria-pressed`.

### 1.14 Privacy / Terms / Guidelines, 404, Offline
**Issues.**
- **Legal pages:** long and unstructured on mobile.
- **404:** only a link home.
- **Offline:** it is text-only and suggests no next step.

**Recommended changes.**
1. **Legal:** prose `max-w-[65ch]`, a `<details>` TOC and a "Last updated" line.
2. **404:** EmptyState with **Search**, **Tonight in [last city]** and **Events** buttons.
3. **Offline:**
   - EmptyState titled "You're offline".
   - Show a list of saved guides available offline (the saved-guides cache already exists).
   - Add a **Try again** button that calls `location.reload()`.

**Motion.** None beyond G7.

**Accessibility.**
- `<h1>` on each page.
- The offline page announces its status in its title.

### 1.15 Consent banner (first visit)
**Issues.**
- It covers about 30% of the first screen at 390px.
- The Accept and Decline buttons differ in emphasis, which is borderline nudging.
- The buttons are about 36px tall.

**Recommended changes.**
1. **Layout:** compact the banner to 2 lines of copy plus two **equal-weight** buttons ("Essential only" / "Accept all"), each `h-11`, side-by-side. Add a "Settings" text link with a 44px hit area.
2. **Placement:** sits above the bottom tab bar if G8 ships.

**Motion spec.** It currently server-renders visible (good for no CLS), so don't animate entry. Dismiss is opacity → 0 + `translateY(8px)`, 200ms ease-in, then removed.

**Accessibility notes.**
- `role="region" aria-label="Cookie choices"` (not a modal; it does not trap focus).
- Reachable early in tab order.

---

## 2. Signed-in user screens

### 2.1 Me (`/me`)
**Issues.**
- It is a list of links and stats with no visual grouping.
- The avatar upload control's file input has **no accessible name** (sr-only input, P0).
- "Sign out" sits among the regular links.

**Recommended changes.**
1. **Header card:** avatar (72px, tappable to change), handle, city and check-in count.
2. **Grouped list** in iOS settings style: **Activity** (My posts, Saved lists, Itineraries if saved), **Account** (Settings, Privacy & data) and **Venue** (Vendor dashboard, only if a vendor member). 56px rows with icons and chevrons.
3. **Sign out:** at the bottom, separated and styled as a destructive text button. No confirm needed; it's reversible.

**Motion spec.**
- **Avatar change:** preview crossfades over 200ms, with an upload progress ring on the avatar (stroke-dashoffset, linear).
- **Row press:** G5.

**Accessibility notes.**
- **The avatar input:**
  - give it `aria-label="Change profile photo"`;
  - or wrap it in a `<label>` with visible text;
  - the visible trigger must be a `<label htmlFor>` or a button that calls `input.click()`.
- **Upload result:** announced via `aria-live`.

### 2.2 Settings (`/me/settings`)
**Issues.**
- Toggles (location, notifications, public profile) are checkboxes with long helper text.
- Save is a single button at the bottom with no dirty-state indication.
- Delete account sits in the same visual weight band as other settings.

**Recommended changes.**
1. **Toggles:** iOS-style switches. Use a native checkbox with `role="switch"` styling, or a styled checkbox, 51×31 visual with a 44px hit area.
2. **Save behaviour:** each switch auto-saves with a toast "Saved". Text fields keep an explicit Save button that's disabled until there are changes, plus an "Unsaved changes" hint.
3. **Danger zone:** delete account in a separate red-bordered section at the bottom. Typed confirmation stays: it's destructive and irreversible, so a confirm is justified.

**Motion spec.**
- **Switch:** the thumb `translateX` moves over 200ms spring and the track colour transitions over 180ms.
- **Toast:** G7.

**Accessibility notes.**
- `role="switch"` + `aria-checked`, with helper text linked by `aria-describedby`.
- Delete confirmation field: label "Type DELETE to confirm".

### 2.3 My posts (`/me/posts`)
**Issues.**
- No empty state beyond text.
- Delete has a confirm dialog when undo would be better.
- Post status (hidden/flagged) shows only as a colour badge.

**Recommended changes.**
1. EmptyState with a "Check in somewhere tonight" CTA.
2. **Delete:** swipe-left on the row to reveal Delete (mobile) as well as the ⋯ menu, followed by a toast with **Undo** (5s deferred commit), with no confirm dialog.
3. **Status badges:** icon + text ("Hidden by moderators").

**Motion spec.**
- **Swipe row:** 1:1 tracking. Snap open at -88px (the action width) if released past 40% or with velocity > 0.4px/ms; otherwise spring closed over 240ms. A full swipe past 70% deletes directly.
- **Row removal:** opacity → 0 + `translateX(-16px)` over 180ms, then the list collapses using a FLIP transform on siblings (220ms ease-out), not height animation.

**Accessibility notes.**
- Swipe is supplementary: the ⋯ menu offers Delete for keyboard and screen-reader users.
- The toast Undo is a focusable button, and the toast stays while focused.

### 2.4 Saved lists (`/me/lists`) and List editor (`/me/lists/[id]`)
**Issues.**
- **List editor has no `<h1>`** (P0).
- Reorder is up/down buttons about 32px.
- Remove has no undo.
- The share token link is a raw URL.

**Recommended changes.**
1. **Title:** the list name becomes the `<h1>`, with an inline-edit pencil (44px). The editing state turns it into an input with Save/Cancel.
2. **Reorder:** a drag handle (⋮⋮, 44×44) for pointer/touch drag, plus Move up/down in each row's ⋯ menu.
3. **Remove:** toast with Undo.
4. **Share:** a "Share list" button opens a sheet with native share / WhatsApp / Copy link and a "Stop sharing" toggle. Hide the raw token.

**Motion spec.**
- **Drag reorder:** the lifted row scales to 1.02 and gets a shadow over 150ms. It follows the finger 1:1 vertically while siblings shift by FLIP (200ms spring). Dropping settles over 200ms spring.
- **Copy link success:** the button label crossfades "Copy link" → "Copied ✓" (150ms) and reverts after 2s.

**Accessibility notes.**
- **Drag and drop:** needs a keyboard alternative (the menu's Move up/down) and live-region announcements ("Moved Escape to position 2 of 5").
- **Inline title edit:** focus moves into the input, Esc cancels and Enter saves.

### 2.5 Check-in sheet (venue → Check in)
**Issues.**
- **The primary "Post check-in" button is disabled with no explanation.** It reads as broken.
- **Placeholder-only textarea:** no label, and the hint text vanishes on type.
- **The photo file input has no accessible name** (P0).
- **15 sub-12px elements.**
- **"At capacity" wraps** in the 5-up tile row.
- **Form length:** two 5-option tile rows + select + number + textarea + photo + location card + submit, so the submit sits below the fold on 667px-tall phones.
- **The location checkbox** is a 20px box inside a large card.
- **Entry fee** is a free number field without a currency prefix inside the field.

**Recommended changes.**
1. **Required vs optional:** "How busy?" is the only required field.
   - Show helper text under the disabled button: "Pick how busy it is to post".
   - Better: keep the button **enabled** and, on tap with no selection, scroll to and highlight "How busy?" with an inline error.
2. **Progressive disclosure:** show How busy + Vibe + Post by default. Put Wait / Entry fee / Note / Photos / Location behind "Add more details ▾".
3. **Tiles:** 56px tall, 12px labels, "Full" visual label for "At capacity" (`aria-label` keeps the full text). Selected state = green border + check icon + filled background (not colour alone).
4. **Entry fee field:** a `₦` prefix inside the input, with `inputmode="numeric"` and thousands-separator formatting on blur.
5. **Note:** visible label "Note (optional)" above the textarea, plus a character counter.
6. **Photos:** a button labelled "Add photos (optional)" wired to the input by `<label htmlFor>`. Thumbnails get remove (×, 44px) buttons and an upload progress overlay.
7. **Location:** a switch row ("Mark me as at the venue") with the helper text collapsed under an ⓘ disclosure.
8. **Footer:** sticky (G6) holding the Post button.

**Motion spec.**
- **Tile select:** the background fills from the centre (`scale 0.9 → 1` on a pseudo-element, opacity 0 → 1, 180ms spring). The check icon pops at 0.6 → 1 scale over 200ms spring.
- **"Add more details" expand:** reveal with opacity 0 → 1 + `translateY(-8px → 0)`, 240ms ease-out. The chevron rotates 180° over 200ms.
- **Submit:** spinner in button → success. The sheet dismisses via G6 close (220ms), followed by a toast "Checked in — thanks!". The new post animates into the live feed (`translateY(-8px)` + fade, 240ms, and a 1s highlight).

**Accessibility notes.**
- Each tile group is `fieldset`+`legend` with radios (`role="radio"`, arrow keys).
- **On error:** focus moves to the first invalid group, and the error is linked via `aria-describedby`.
- **Photo input:** `aria-label="Add photos"`.
- **Upload progress:** `aria-valuenow` on a `role="progressbar"`.

### 2.6 Add to my night sheet
**Issues.**
- **Primary flow:** pick or create a list, then confirm. Two steps for the common case of one list.
- List rows are about 40px.

**Recommended changes.**
1. **Default list:** if the user has one list (or a default "My night"), add on tap immediately and show a toast "Added to My night · Change". "Change" opens the sheet.
2. **Sheet rows:** 56px with a checkbox state, multi-select. "New list" is an inline input row at the top.

**Motion spec.**
- **Bookmark icon:** fills over 180ms with a scale 0.8 → 1.1 → 1 spring (240ms total).
- **Sheet:** G6.

**Accessibility notes.** Rows are checkboxes (`aria-checked`); the toast includes the list name.

### 2.7 Admin 404 as non-admin (`/admin` without role)
**Issue.** A non-admin sees a generic 404. That's correct for security (it doesn't reveal the admin area), but confusing for staff whose role hasn't been granted yet. That is exactly what happened on 7 Oct.

**Change.** Keep the 404 for everyone, so routing and security are unchanged. In the **dev** build only, add a footnote: "Staff? Ask a super admin to grant your role." Production stays unchanged.

---

## 3. Vendor dashboard

### 3.1 Vendor dashboard home (`/vendor`)
**Issues.**
- **"0% complete" with an empty progress bar** gives no sense of *what* is missing.
- **The 2×2 + 1 tile grid** leaves an orphan "Events" tile.
- **Tiles are equally weighted:** no tile says which one to do next.
- **The "Recent official updates" empty state** is plain text, though posting an update is the vendor's most valuable daily action and has no button here.

**Recommended changes.**
1. **Checklist:** replace the % bar with a checklist card ("Finish your listing — 2 of 5 done").
   - Show rows ✓ Name & category, ○ Photos, ○ Opening hours, ○ Prices, ○ Verification. Each row is a 56px link to the step.
   - Keep a thin progress bar above the rows as a summary.
2. **Primary daily action:** a full-width **"Post tonight's update"** button. It is disabled with an explanation until the listing is approved.
3. **Tiles:** a single-column 56px list on mobile (Edit profile, Prices, Events, Get verified, QR poster) with status captions ("Not started", "Pending review").
4. **Updates empty state:** EmptyState with "Post your first update" as the action.

**Motion spec.**
- **Checklist progress bar:** fills on load from 0 → value via `scaleX` over 400ms ease-out, once per session.
- **A completed row's check:** stroke-draws over 250ms.

**Accessibility notes.**
- **Progress:** `role="progressbar"` with `aria-valuetext="2 of 5 steps done"`.
- **Checklist:** a list whose rows read "Photos, not done".

### 3.2 Onboarding / listing wizard (`/vendor/onboarding`)
**Issues.**
- No step indicator.
- A long single page of fields.
- Validation only on submit.
- No autosave, so a dropped mobile connection loses everything.

**Recommended changes.**
1. **Split into steps** in the same route, as client-side step state (no routing change): Basics → Location → Hours → Photos → Review.
2. **Step indicator** at the top ("Step 2 of 5 · Location") plus a segmented progress bar.
3. **Autosave:** the draft autosaves on blur through the existing save action, with a "Saved ✓ 2s ago" caption. Back/Next buttons in a sticky footer.
4. **Validation:** inline on blur; Next disabled → enabled with an explanation, as in the Check-in pattern.
5. **Review step:** summarises everything, with "Edit" links per section and Submit for review.

**Motion spec.**
- **Step change:** directional slide. Forward: outgoing `translateX(0 → -24px)` + fade over 160ms, incoming `translateX(24px → 0)` over 280ms ease-out. Back mirrors.
- **Progress segment fill:** 300ms ease-out.

**Accessibility notes.**
- **Step heading:** `<h2>` receives focus on step change.
- **Progress:** `aria-valuetext`.
- **Errors:** the field pattern from 1.13.

### 3.3 Post update (`/vendor/update`)
**Issues.**
- The free text area dominates.
- Crowd level and "open tonight" are secondary.
- No preview of how the update appears publicly.

**Recommended changes.**
1. **Primary controls:** "We're open tonight" switch + crowd tiles (the same component as the pulse bar), with the note optional underneath.
2. **Live preview:** a preview card showing the public "Official update" rendering, which updates as the vendor types.
3. **After posting:** success toast, then a redirect to the dashboard with the update listed at the top.

**Motion spec.** The preview updates with a 150ms crossfade on change, debounced 200ms.

**Accessibility notes.** The preview is marked `aria-hidden` or labelled "Preview", so screen readers don't read the content twice.

### 3.4 Prices (`/vendor/prices`)
**Issues.**
- Rows of label + amount inputs with small add/remove buttons.
- No currency prefix.
- Removing a row is instant with no undo.

**Recommended changes.**
1. **Amount inputs:** `₦` prefix inside the field, `inputmode="numeric"` and formatting on blur.
2. **Add/remove buttons:** "Add price" is a full-width dashed-outline button, which is appropriate here as an "add" affordance. Remove is a 44px × button followed by an Undo toast.
3. **Reorder:** drag handle (as in 2.4).

**Motion spec.**
- **Row add:** `translateY(-8px)` + opacity → 0/1 over 200ms, and focus moves to the new label field.
- **Row remove:** as in 2.3.

**Accessibility notes.** Each row is a `fieldset` with legend "Price 2", and the remove button is labelled "Remove Bottles from".

### 3.5 Profile (`/vendor/profile`), Verification (`/vendor/verification`), QR poster (`/vendor/qr`)
**Issues.**
- **Profile:** photo uploads have the same unlabelled sr-only input issue, and there is no per-image upload progress.
- **Verification:** the document upload explains requirements only after failure.
- **QR:** the download/print buttons are small, and there is no preview at a printed size.

**Recommended changes.**
1. **Profile:**
   - A photo grid with 3 columns of 1:1 tiles, an "Add photo" tile, a per-tile progress ring, and tap-to-set-cover.
   - Uploads stay one image per request, per the CLAUDE.md rule: run them as a sequential queue with visible per-photo status.
2. **Verification:** put the requirements up front as a checklist ("Clear photo of CAC certificate · max 5 MB · JPG/PNG"). Show the status timeline: Submitted → In review → Verified / Needs changes.
3. **QR:** a large preview card. Primary **Download PDF** and secondary **Print** buttons, each `h-11`.

**Motion spec.**
- **Upload ring:** stroke-dashoffset, linear, follows actual progress.
- **Completion:** ring → check over 200ms spring.
- **Timeline:** the current step dot pulses once (scale 1 → 1.15 → 1, 400ms) on load.

**Accessibility notes.**
- File inputs labelled.
- **Upload status:** live-announced ("Photo 2 of 4 uploaded").
- **Timeline:** an ordered list with `aria-current="step"`.

---

## 4. Admin back office (`/admin/*`, from code; screenshots need MFA)

### 4.1 Admin shell and navigation (AdminNav)
**Issues.**
- **Nav density:** the nav lists about 12 sections in one horizontal strip on mobile, which overflows.
- **Unclear location:** no grouping, and no indication of the current section beyond colour.

**Recommended changes.**
1. **Group sections:** **Moderation** (Reports, Posts, Q&A), **Content** (Venues, Events, Guides, Itineraries, Safety), **People** (Users, Vendors, Verification), **System** (Audit log, Agent keys, Export).
2. **On mobile:** a "Sections" button opens a sheet with the grouped list.
3. **On desktop:** a left sidebar (240px).
4. **Current section:** `aria-current="page"` + bold + a 3px left indicator.

**Motion spec.** Sheet per G6. The sidebar indicator slides between items with `translateY`, 200ms spring.

**Accessibility notes.** `nav aria-label="Admin"`; group headings are `<h2>` (sr-visible).

### 4.2 Data tables (DataTable, FilterBar): reports, posts, users, venues, audit log
**Issues.**
- Wide tables scroll horizontally on mobile.
- Row actions are small text buttons.
- Filters reload the page with no loading indicator.
- No bulk actions for moderation queues.

**Recommended changes.**
1. **Rows below `md`:** render each row as a stacked card (primary field as the title, 2–3 key fields as meta, an actions row). Above `md`, keep the table with a sticky header and first column.
2. **Filter state:** the FilterBar shows an active-filter count and a "Clear" button. Use `useTransition` (keeping the current navigation) so the table dims to 60% opacity with a top progress bar while the new data loads.
3. **Moderation queues:** checkbox column + sticky bulk-action bar ("3 selected · Hide · Dismiss"). This reuses existing per-item actions in a loop; the services are unchanged.
4. **Row actions:** destructive ones (hide, ban, revoke key) keep a confirm, since they're admin actions with user impact. That confirm states the consequence ("Hides this post for everyone. You can restore it from the audit log.").

**Motion spec.**
- **Pending state:** table opacity 1 → 0.6 over 150ms. A top progress bar animates `scaleX` 0 → 0.8 (ease-out, 1.5s), then → 1 and fades on completion over 200ms.
- **Bulk bar:** enters with `translateY(100% → 0)`, 240ms spring.

**Accessibility notes.**
- Proper `<th scope>` headers.
- Row checkboxes are labelled "Select report #123".
- **Bulk action result:** announced politely.
- Sortable headers use `aria-sort`.

### 4.3 Action forms (ActionForm) and MFA (`/admin/mfa`)
**Issues.**
- ActionForm submit states are a text change only.
- **MFA enrolment:**
  - The QR code and secret lack copy affordances.
  - The 6-digit code field is a plain input without `autocomplete="one-time-code"`.

**Recommended changes.**
1. **ActionForm:** spinner in the button + `aria-busy`. Success shows a toast; errors show inline under the form.
2. **MFA:**
   - Numbered steps (1 Scan · 2 Enter code).
   - A "Copy secret" button with copied feedback.
   - The code input uses `inputmode="numeric" autocomplete="one-time-code" maxlength=6`, auto-submits at 6 digits, and has a large 24px tabular font with letter-spacing.

**Motion spec.**
- **Wrong code:** the input shakes (240ms, disabled under reduced motion) and the field clears with focus kept.
- **Success:** check icon pop (200ms spring), then redirect.

**Accessibility notes.**
- **Code field:** labelled "6-digit code from your authenticator app".
- **Errors:** announced via `role="alert"`.

---

## 5. Implementation order

| # | Item | Screens fixed | Effort |
|---|---|---|---|
| 1 | G3 focus ring + G4 reduced-motion block | all | XS |
| 2 | G1 Button/chip/header target sizes | all (fixes most small-target counts) | S |
| 3 | G2 type tokens; remove 10–11px text | home, events, December, venue, check-in | S |
| 4 | Missing `<h1>` on `/q/[id]` and `/me/lists/[id]`; label avatar and photo file inputs | Q&A, lists, me, check-in, vendor profile | XS |
| 5 | G6 Sheet motion + grabber + sticky footer + drag-to-dismiss | check-in, add-to-night, share, filters | M |
| 6 | Check-in sheet: progressive disclosure, explained disabled state | venue | S |
| 7 | G5 press feedback + G7 skeleton/empty/undo primitives | all | M |
| 8 | Itinerary sticky totals + segmented controls + roving focus | itinerary | S |
| 9 | Venue action-row consolidation + pulse-first flow | venue | M |
| 10 | City page segmented Tonight/Directory/Questions | city | M |
| 11 | Vendor checklist + onboarding steps + autosave | vendor | M |
| 12 | Admin card rows on mobile + pending states + bulk bar | admin | M |
| 13 | G8 bottom tab bar (P2) | all | M |

**How to check each step.**
- Re-run the 390×844 measurement script (target counts, sub-12px text, h1 presence). Targets: **0** sub-12px text elements and **≤ 10%** small targets per page, excluding inline prose links.
- Test with VoiceOver on iOS Safari and with keyboard-only navigation.
- Toggle reduced motion and verify no animation runs.
- `npm run verify` stays green.

---

## 6. Implementation status (Stage U1, 8 October 2026)

**Re-measured at 390×844 against DEV:**

| Screen | Small targets (before → after) | Text < 12px (before → after) | Length in screens |
|---|---|---|---|
| Home | 25 → 1 | yes → 0 | 2.3 |
| City | 48 → 5 | yes → 0 | 6.8 → 4.3 |
| Venue | 20 → 2 | yes → 0 | 4.4 |
| Events | 37 → 3 | yes → 0 | 1.7 |
| December | 33 → 1 | yes → 0 | 2.0 |
| Leaderboard | 20 → 3 | — → 0 | 1.4 |
| Assistant | 18 → 1 | — → 0 | 1.8 |

Every page has exactly one `<h1>` and no horizontal overflow. The remaining "small" items are mostly inline prose links, which WCAG 2.5.8 exempts.

**Done:**
- G1–G7 complete: tokens, focus, reduced motion, press feedback, Sheet (grabber, drag-to-dismiss with velocity, sticky footer), skeleton/empty/undo primitives.
- G8: the phone tab bar ships, with breadcrumbs on deep pages.
- Per-screen items in §1–§4 are done, except the deviations below.

**Deliberate deviations:**
1. **City page uses a sticky scroll-spy section nav (Tonight · Places · Questions), not tabs that hide panels.** The directory stays in the DOM, which matters for SEO, no-JS use, deep links and the existing tests. Length still drops from 6.8 to 4.3 screens, thanks to compact directory rows on phones.
2. **Venue Ride/Share sheets are not used.** Directions became the primary full-width action; Bolt, Uber, WhatsApp, Call and Website sit in an equal-width grid that wraps 3+2. Nothing is clipped, and every action stays one tap away.
3. **No route-level `loading.tsx`.** On routes that can 404 or redirect (`/v`, `/c`, `/events/[slug]`, `/me`, `/vendor`), a Suspense boundary would make Next stream a 200 before `notFound()`/`redirect()` runs. On `/search` it streamed the results twice (a hidden copy stays in the DOM). Pages are ISR and prefetched, so navigation is already near-instant. Skeletons are used inside components instead (map, list sheet).
4. **Not implemented** (they would need new endpoints or data, beyond "presentation only"):
   - drag-to-reorder lists (labelled Move up/down buttons remain);
   - swipe-to-delete rows (Undo toasts instead);
   - the leaderboard's sticky "You · #14" row.
5. **Every motion spec uses CSS** (tokens in `app/globals.css`, `linear()` springs with a cubic-bezier fallback) plus small pointer/touch hooks, because framer-motion is not an approved dependency.
