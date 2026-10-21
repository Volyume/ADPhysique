# volyume.app rebuild: stage 1, inventory and plan (2026-10-21)

Source brief: the owner's "Volyume website rebuild: brief" (2026-10-21), plus
the owner's corrections the same day: the site stays on GitHub Pages (the
July Vercel note in marketing/hq/GROWTH-LEDGER.md belongs to a sidelined
marketing platform), and iPhone universal links stay on hold, so the site
only links to the App Store.

Supporting files in this folder, each code-verified with file:line:
- `FEATURES.md`: every feature in 3.3.0, grouped, with description, code
  location and platform; wording cautions C1 to C17; the "do not mention"
  list.
- `FACTS.md`: every fact and number, re-verified on main.
- `SITE-INVENTORY.md`: every served file, inbound dependencies, the tests that
  read public/.

Nothing is built or published at this stage.

## 1. Rules that apply to the site

| Rule | Where | What it means for the site |
|---|---|---|
| British English, no em dash, calm voice, no shame | CLAUDE.md section 3; `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` | Every page. Lint-style guard test. |
| Plain English test | `docs/rules/plain-english.md` | Read as someone who has never lifted or counted calories; whole sentences; "your coach" not "the engine". |
| Fully free product, no price talk | CLAUDE.md section 2 (D137); `docs/rules/billing.md` | The brief goes further: no price or cost claims at all. No Pro, tiers, trials, prices, restore, refunds. |
| ED-safety and weight claims | CLAUDE.md section 2; `marketing/hq/CLAIMS-STANDARDS.md` sections 5, 6, 9A | No weight-loss promises, no before-and-after bodies, weight never the headline, no medical framing, never target under-18s, safety systems never marketed. |
| Every claim traces to code | `marketing/hq/PRODUCT-FACTS.md` governing rule; FACTS.md | Numbers generated from the repo; claims checked. |
| Privacy truth | CLAUDE.md section 2 (GDPR, EU residency with the Resend exception); `src/screens/__tests__/privacyTruth.guard.test.js` | Site privacy claims pinned by test. |
| Identity | `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md` | No "use without an account". |
| Styling tokens | `docs/rules/styling.md`; `src/styles/theme.js` | Site colours, sizes and radii come from theme.js; amber only for actions. |
| Builds and native changes | CLAUDE.md section 4 | No change to app.json or any native file in this work. |
| New dependencies | CLAUDE.md section 2 | Lighthouse is not in the repo: needs the owner's yes (question 7). |

## 2. Where the brief and the rules or the code disagree

1. **"No price claims anywhere" vs the challenge terms.** `/challenge-terms/`
   says "Entry is free, and you can leave at any time." For a prize draw, a
   free way to enter is what keeps it lawful in Great Britain (Gambling Act
   2005, schedule 2). Proposal: keep that one sentence in the terms only.
   Owner decision (question 5).
2. **"Privacy legal text word for word" vs a false section.** The privacy
   policy's section 6 still describes Health Connect, which the app no longer
   has (`src/screens/ProOnboardingScreen.js:2052`). Proposal: correct that
   section only. Owner decision (question 6).
3. **"Your progress photos and workout videos stay on this phone."** True
   until the person shares a video. The app's What's new uses "private on your
   device unless you choose to share them". Proposal: use the Welcome line and
   add "unless you choose to share them" on the site.
4. **CLAIMS-STANDARDS and PRODUCT-FACTS are stale** (trial and price sections,
   "barcode is Pro", iPhone "TestFlight only", old counts). D137 already
   overrides them. Proposal: bring both up to date in stage 2 so they stop
   contradicting the site.
5. **Build step.** GitHub Pages publishes public/ as it is. The generated CSS
   and numbers are committed, a guard test fails if they drift from the code,
   and the deploy workflow regenerates them before upload. This adds a Node
   step to `.github/workflows/deploy-pages.yml`; no app or native file
   changes.

## 3. Feature list (summary; full table in FEATURES.md)

Platform is both unless marked.

- **Training (43):** Today and the next workout; the workout logger (set types,
  warm-ups, supersets, one side at a time, use last session, swap, "I cannot
  do this", shorten, notes, history and records); rest timer and rest alert
  (lock-screen countdown with +15 s and Skip, and "Make rest alerts exact":
  Android only); personal bests; workout summary; save a workout to reuse; set
  videos; exercise library; plan library and plan pages; Adjust training plan;
  training styles; create your own plan; training blocks with a lighter
  recovery week and choosing the next block; Injuries and limitations; import
  from Hevy or Strong; session length.
- **Nutrition (30):** food diary with meals per day; add food by search,
  "Around this time", typing what you ate, barcode, label scan, quick add,
  custom foods; food detail; water; copy days, select several, saved meals,
  recipes; meal builder with swaps, add this day or week, shopping list,
  repeat a day, oily fish choice; nutrition targets and "See why"; trends;
  dietary needs; fibre, sugars and salt; nutrition basics; import a diary.
- **Progress (19):** Progress tab; lifts and exercise pages; weight lifted;
  consistency; muscle map of weekly sets; estimated recovery; weekly sets
  review; full history; recaps and year of lifts; body metrics; progress
  photos with compare and trend; Volyume Score; share card ("Set as
  wallpaper": Android only); two-photo progress card; athlete profile.
- **Coaching (20):** coaching setup; Coach tab; weekly check-in; coaching
  decision that holds rather than guesses; Coached, Collaborative or Manual;
  coaching tone; how the coach works and the science; coaching history; your
  week; update goal and phase; what changed; physique goals and weak points;
  stalled-lift notice; Today line; optional cycle tracking; coaching
  reminders.
- **Community and challenges (21):** Feed, People, Groups and You; posts and
  automatic session posts (you choose who sees them); respect and comments;
  find people and search; connections and messages; groups and boards;
  training profile; open to training together; training now; gym directory;
  block, mute and report; Community privacy; activity; gym challenge (only
  when one is running); friends on the home-screen widget (Android only).
- **Privacy and safety (11):** health-data consent; sign-in required; works
  without signal; encrypted on the phone; photos and set videos stay on the
  phone unless shared; app lock; usage data switch; delete your account; no
  marketing notifications; privacy policy in the app.
- **Settings and accessibility (23):** sign-in options (Apple on both; Google
  on Android until the iPhone client ID exists; email); Display (theme, text
  size, higher contrast, colour-blind palette, reduce motion); Units; Workout
  settings; Notifications; Calmer coaching; Dietary needs; Profile; Account;
  back up, restore, export, import; videos storage; home-screen widgets
  (Android only); shake to send feedback; help and FAQ; What's new.

Left off the site, and why (FEATURES.md "Do not mention"): the eating-disorder
safety system, the wellbeing check, goal lock and the under-18 limits (safety
is never marketed; CLAIMS-STANDARDS 5 and 6); the Natural or Enhanced
question (sensitive); the debug log and moderation tools (internal); dormant
billing; the parked iPhone widget and live rest countdown; the weekly summary
and news emails (not confirmed live); pre- and post-workout meals
(unreachable); internals; free for life outside the challenge pages; the gym
challenge on the homepage unless one is running.

## 4. Current site (summary; full table in SITE-INVENTORY.md)

38 files. Pages the app, Android or emails depend on, which must keep working
at the same URL: `/partner/`, `/u/`, `/p/`, `/s/`, `/g/`, `/c/`,
`/auth/confirm/`, `/auth/callback/`, `/email/preferences/`,
`/email/unsubscribe/`, `/survey/`, `/challenge-terms/`, `/members/`, `/404.html`
(forwards `/partner/CODE` and `/c/CODE`). Store listings point at `/`,
`/support/` and `/privacy/`. Orphans: `/get/`, `/privacy.html`,
`/privacy-policy.md`, `/.well-known/README.md` (an internal note, served
publicly). `/.well-known/assetlinks.json` (filled from secrets at deploy) and
`/.well-known/apple-app-site-association` (already present, untouched, on
hold) stay byte for byte.

## 5. Proposed site map and content

All pages share one header (logo, Features, How the coach works, Articles,
Support, and "Get the app"), one footer (store links, Privacy, Support,
Challenge terms, contact) and one stylesheet.

**Home `/`** (rewritten)
1. Headline: "Training, food and a weekly check-in, with a coach that explains
   every change." Sub: "Volyume plans your training, logs your workouts and
   food, and once a week looks at how it went. It then changes your plan or
   keeps it as it is, and tells you why in plain words." Both store buttons.
   Screen: Today.
2. "Log a workout without thinking about it": the logger, rest timer, records,
   set videos. Screen: a logged set.
3. "Plans built around you": the plan library (58 plans), training styles,
   your own plan, a lighter recovery week built in. Screen: Train.
4. "Food that fits your day": over 29,000 foods built around UK products,
   barcode and label scan, the meal builder. Screen: Nutrition.
5. "Once a week, a decision with its reasons": the check-in, the decision,
   holds when there is not enough to go on, you choose how much it does on
   its own. Screen: the coaching decision. Link to How the coach works.
6. "See what is working": lifts, sets per muscle, estimated recovery,
   progress photos and the Volyume Score explained. Screen: Progress.
7. "Train alongside other people": Community, groups, your gym. Screen:
   Community.
8. "Your data": works without signal, photos and videos stay on your phone
   unless you share them, your coach is not an AI chatbot and follows fixed
   rules, delete everything from Settings.
9. Get the app: both stores.

**Features `/features/`** (new): the full list from section 3, in plain
sentences under the seven headings, with "Android only" where it applies. This
is where "everything the app does" lives, so the homepage can stay readable.

**How the coach works `/how-the-coach-works/`** (new, owner to confirm):
what the weekly check-in asks; what the coach looks at (training done, how
sessions felt, food logged, morning weigh-ins as one input among several);
the three outcomes (change, hold, or wait for more information); Coached,
Collaborative and Manual; "fixed rules, not an AI chatbot"; every change shows
its reason; coaching history. No calorie floors, no safety-system detail.

**Get `/get/`**: both store buttons, what you need (an account: Apple,
Google on Android, or email), what works without signal.

**Support `/support/`**: getting started, sign-in methods and resetting a
password, moving phones, exporting and deleting your data, contact. Beat
signposting stays as it is.

**Privacy `/privacy/`**: layout only; text unchanged except section 6 if the
owner agrees. `/privacy.html` stays byte-identical (parity test) unless the
owner chooses a redirect (question 8).

**Articles `/articles/` and the three articles**: new layout, store links to
both stores, jargon explained at first use or reworded; URLs unchanged
(question 2).

**Challenge `/c/` and `/challenge-terms/`**: new layout; "Open in Volyume" and
"Get Volyume" kept; noindex kept; the free-for-life line exactly as in the
app; the promoter postal address shown as a clearly marked placeholder.

**Working pages** (`/auth/*`, `/email/*`, `/survey/`, `/g/`, `/u/`, `/s/`,
`/p/`, `/partner/`, `/404.html`): new header, footer and styles; logic,
wording the tests pin, and noindex unchanged. `/members/` (private admin
tool) left as it is.

**New files**: `/assets/site.css`, `/assets/tokens.css` (generated),
`/assets/fonts/` (Inter, Inter Display, Ionicons; open licences),
`/assets/screens/` (current app captures), `/sitemap.xml`, `/robots.txt`, a
1200 by 630 share image.

## 6. Facts the site will state

| Fact | Value | Source |
|---|---|---|
| Built-in exercises | 923, plus your own | `CORPUS`, `src/lib/exerciseCorpus/index.js`; seeded by `src/lib/seedExercises.js:96` |
| Built-in plans | 58 | `LIBRARY_PLANS`, `src/lib/seedRoutines.js:132, 2505, 2666` |
| Foods available without signal | over 29,000 (29,279), built around UK products | bundled food data, importer `seed.js:361-367` |
| Curated meals in the meal builder | 94 | curated meals list (FACTS.md 2.4) |
| Training styles | 6 | FACTS.md section 2 |
| Physique goals | 9 | FACTS.md section 2 |
| Platforms | Android (Google Play, `app.volyume`) and iPhone (App Store id6777083702, page live 2026-10-21) | FACTS.md section 1 |
| Coach | fixed rules, not an AI chatbot; on-phone recognition for labels and the photo score | FACTS.md section 5 |

Every number on a page is written by the build step and checked by a test.

## 7. Design tokens taken from the app

| Token | Dark | Light |
|---|---|---|
| background | #0D0D0D | #FAFAF7 |
| surface / elevated / 2 / 3 | #191917 / #222220 / #2A2A27 / #343431 | #FFFFFF / #F6F6F1 / #EFEFEA / #E7E7E1 |
| border / subtle | #6E6E6E / #2E2E2C | #8F8F8B / #E4E4DF |
| primary (text, icons) | #F5A623 | #8A5200 |
| primary fill (buttons) | #E08C0B | #F5A623 |
| on primary | #0D0D0D | (as app) |
| text primary / secondary / muted | #FFFFFF / #9E9E9E / #9C9C9C | #1A1A18 / #555553 / #5C5C5A |

Fonts: Inter (400, 500, 600, 700, 800) for text, Inter Display (700, 800) for
headings, from `assets/fonts` (open licence). Text sizes 11, 13, 16 (body),
17, 20, 24, 32, 40. Line heights 1.2, 1.35, 1.5, 1.6. Spacing 2, 4, 6, 8, 12,
16, 24, 32, 48. Radii 6, 10, 16 (cards and buttons), 20; never the 999
capsule. Icons: Ionicons, the app's set. All generated from
`src/styles/theme.js` and `src/styles/fontFamily.js`.

## 8. Stage 2 plan

1. `scripts/site/build.mjs`: writes `tokens.css` from theme.js and the numbers
   into each page (marked `data-fact`), from the code.
2. Shared `site.css`, header and footer; every page moved onto them.
3. Guard tests: jargon list, banned phrases, em dash, emoji, price words,
   ellipsis and line-clamp, capsule radii on text, numbers match the code,
   internal links resolve, no third-party scripts, fonts or cookies, title,
   description and share image on every page, noindex where required,
   assetlinks unchanged, app-link paths served, privacy text unchanged.
4. Screenshots of every page at 360, 375 and 1280 px, dark and light, and at
   200% zoom; each page beside the app screen it borrows from.
5. A link check, the list of anything removed, and Lighthouse on phone if the
   owner agrees.
