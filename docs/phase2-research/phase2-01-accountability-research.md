# Phase 2 — Feature 1 Research: Private Accountability Groups (phase2-01)

**Date:** 2026-06-08 · **Feature:** accountability (not social media) · **Status:** research, no build
**Method note:** Findings are from fan-out web search + cross-source corroboration. Many primary academic PDFs and app pages returned HTTP 403 to automated fetch; figures rest on search-index extraction plus independent corroboration. **Confidence is flagged per claim. Items that could not be verified to a primary source are called out explicitly — do not put unverified stats in user-facing copy.**

---

## A. Accountability science

### A1. The "ASTD 65% / 95%" statistic — DO NOT USE
The viral claim ("65% chance of completing a goal if you commit to someone, 95% with an accountability appointment", attributed to ASTD/American Society for Training & Development) is **unverifiable folklore**. No primary ASTD document, year, methodology, or dataset exists; it propagates by recursive citation, structurally identical to the debunked "1953 Yale goals study". The 95% figure is implausibly high for any behaviour-change intervention. **Confidence the figures are real: LOW. Treat as apocryphal; never use in marketing or in-app copy.**

### A2. The Matthews / Dominican University study — real, but routinely misquoted
Dr Gail Matthews (Dominican University of California, 2015). 267 enrolled, **149 completed**, five randomly assigned groups over a 4-week goal window:
- G1 think only · G2 write goals · G3 write goals + action commitments · G4 + share with a friend · G5 + send weekly progress reports.

Two metrics circulate (writers conflate them):
- **Achievement score (≈1–10):** G1 **4.28** → G4 **6.41** → G5 **7.6** (highest). (G2/G3 middle ordering could NOT be pinned to the primary PDF.)
- **Percentage-of-goals framing:** G1 **43%** → G4 **64%** → G5 **76%**. Plus: **>70%** of weekly-reporters reported success vs **35%** who kept goals private and unwritten.

**Honest framing to use:** *"writing goals + sharing + weekly progress reports was associated with achieving ~76% of goals vs ~43% for unwritten goals (small 2015 Dominican University study)."* Caveats: small cells (~30 each), self-report, self-selected business population, **not peer-reviewed** (conference summary). The viral "42% more likely by writing down" is a loose paraphrase of the score gap, not a literal probability. **Do not quote the 7.6 *score* as "76%"** — different metrics. **Confidence the figures are as stated: HIGH. Evidentiary strength of the study itself: MEDIUM-LOW.**

### A3. Does partner/social support actually help? Yes — moderately
- **Vowels & Carnelley (2022), Eur. J. Soc. Psych.** — meta-analysis, 195 effect sizes / 10,130 participants: overall **r = .25**; responsive support r = .27; **negative/unsupportive support r = −.14** (bad "accountability" backfires). **HIGH.**
- Social support → physical activity specifically: **r ≈ .30** (meta-analytic, skews adolescent). **MEDIUM-HIGH.**
- **Köhler motivation-gain effect** (partnered exercise raises effort/persistence; meta-analysis 19 studies, N=1,912): real for *within-session* effort, even with virtual partners. **HIGH** — but this is about intensity, not long-term adherence.

### A4. Binary accountability + a stake + being observed works — without data exposure
- **Commitment devices:** temptation bundling raised gym attendance **~51%** initially (Milkman et al. 2014); commitment lotteries improved attainment at 13/26 weeks. These operate on a **binary** ("did I show up — yes/no") + external stake; **no detailed data sharing required.** **HIGH that they work initially; MEDIUM on durability — effects decay once the stake/novelty fades.**
- **Implementation intentions** (if-then plans): cross-domain d≈0.65, but **PA-specific is small (d≈.14–.31)**. Don't overstate. **HIGH.**
- **Hawthorne / observation effect:** being watched (or tracked) changes behaviour (hand-hygiene +~55% when observed); a wearable/check-in is itself a passive observer. **MEDIUM** — well-attested but attenuates as observation becomes routine.

### A5. Digital/app accountability — helps short-term, attrition is the enemy
Self-monitoring rises with app use and correlates with adherence (small pilots, **MEDIUM**), but the dominant finding is **high attrition / engagement decay** (**MEDIUM-HIGH**). **No clean RCT isolates "streaks" alone** — evidence for streaks specifically is **LOW**; plausible via Hawthorne + commitment + loss aversion but always bundled with other features.

**Science takeaways for the build:** (1) accountability genuinely helps but **moderately**, and effects **decay** → design for re-engagement, not a one-time hook; (2) **binary/minimal signals are sufficient** — detailed data sharing is unnecessary and risky; (3) unsupportive comparison can *harm* (r=−.14) → keep it supportive, never competitive; (4) anchor any copy to Matthews framed honestly, never to ASTD.

---

## B. How apps have done it (mechanics + reception)

| App | Shared signal | Granularity | Verification | Dominant reaction |
|---|---|---|---|---|
| **Fitbit** | Steps total + rank | Single raw number | **None** | Loved for engagement; **wrecked by cheating**; outrage when removed (Mar 2023) |
| **Apple Fitness** | 3 activity rings, workout completions, % points | Abstracted/visual, not raw health | Watch-sensor gated | Mostly positive; complaints = **guilt/pressure**, not exposure |
| **Garmin** | Steps/distance + badges/points | Raw + gamified | Device-gated | Engaging but **metrics too narrow** |
| **Nike Run Club** | Distance/mileage + badges | Aggregate distance | GPS | Liked, esp. beginners (lightly evidenced) |
| **WHOOP Teams** | Recovery %, HRV, RHR, Strain, Sleep | **Most intimate** | Device-gated, owner-scoped | Under-evidenced socially; **active privacy litigation** (Lomeli v. WHOOP, Aug 2025, re backend Segment tracker) |

**Patterns (HIGH confidence):**
1. **The more granular/raw the shared metric, the higher the stakes** — for cheating (Fitbit's editable single number) and for privacy discomfort (WHOOP).
2. **Abstraction protects users.** Apple's rings let people compete on *effort progress* without revealing weight/pace/health — most positive reception, least "exposure" complaint; downside is *emotional* (guilt), a framing problem Apple softened in watchOS 5.
3. **Verification matters** — sensor/device-gated signals resist the cheating that wrecked Fitbit.
4. **Consent scoping is a real lever** — WHOOP's "owner sets what's shared + join-to-see + searchability toggle".
5. **No major app ships a *purely binary* social signal.** Apple's rings are the closest to "minimal-but-meaningful". **This is itself a finding: binary accountability is a design space, not a copy-the-incumbent decision** (MEDIUM, from absence of precedent).

*Under-corroborated (flagged):* verbatim Reddit/App-Store sentiment (pages not retrievable); the "friend slacked so I quit" Apple narrative (plausible, much "how to stop sharing" content, not directly evidenced); NRC negative sentiment (thin); WHOOP Teams per-metric default visibility.

---

## C. What goes wrong when social is bolted onto premium fitness apps

1. **Privacy harms come from *sharing*, not hacking** (HIGH):
   - **Strava heatmap (2018)** exposed military base perimeters/patrol routes; DoD review followed.
   - **Strava Flyby** auto-tagged passers-by with name/photo/route → stalking reports; made opt-in after outcry.
   - **Swedish PM (2025):** bodyguards' public Strava activities exposed his residences/travel — **not a breach**, just default-public sharing.
   - **GetHealth (2021):** 61M wearable records leaked via an unsecured third-party aggregator; brands not directly breached.
   - → *An app with no performance/location sharing structurally cannot produce these incidents.*
2. **Competitive/social mechanics invite cheating and erode trust** (HIGH): Strava purged **millions** of fraudulent activities; leaderboards remain "community-moderated", i.e. structurally unsolved.
3. **Sharing nutrition/performance data stacks two evidenced harm vectors** (HIGH, with causation caveat):
   - **Levinson et al. (2017), *Eating Behaviors* 27:14–16** — n=105 with eating disorders; ~75% used MyFitnessPal; **73% of those felt it contributed to their ED** (~35% "largely"). Retrospective/self-report → correlational, not causal.
   - 2025 Flinders systematic review (38 studies): diet/fitness-app use ↔ greater disordered-eating symptoms, worse body image, dose-dependent.
   - Online social comparison ↔ body-image concerns (meta-analysis, 83 studies, 55,440 participants).
4. **Social features are feature creep that alienates core users** (HIGH/MEDIUM): Strava's premium "Athlete Intelligence" AI alienated experienced users (incl. a tone-deaf "hope you're okay after that car accident!"); MyFitnessPal retired its Newsfeed (June 2024) citing low usage — a minority who relied on it churned, but its own justification supports "most users don't want it."

**Decision support:** the evidence strongly backs **accountability *without* social media, *without* nutrition sharing, *without* performance sharing.** For Volyume's ED-aware demographic (it ships an ED safety system), sharing weight/calories/macros/performance is precisely the intersection the literature warns against. Share the **minimum** — a derived binary — to friends the user explicitly invited, never to strangers, never competitively.

---

## D. Technical research (Supabase RLS, GDPR, anti-gaming)

### D1. Invite-only private groups in Supabase RLS (HIGH)
- Schema: `groups`, `group_members` (with `status` + `sharing_enabled`), `group_invites` (store a **hash** of the token, not the raw token). RLS on all three; **no list/discovery endpoint ever** → no-discovery comes from *absence + member-scoped RLS*.
- **Recursive-RLS pitfall:** a `group_members` SELECT policy that queries `group_members` throws `infinite recursion detected in policy`. **Canonical fix:** a `SECURITY DEFINER` helper in a **private** schema (not exposed via PostgREST), marked `STABLE`, `SET search_path = ''`, that returns the caller's group ids; policies use `group_id in (select private.groups_for_user(auth.uid()))`.
- **Perf:** wrap `(select auth.uid())` for initPlan caching; index every policy column (`user_id`, `group_id`).
- Corroborated by Supabase RLS docs, Discussions #1138/#3328, and the BoardShape team-invite pattern.

### D2. Invite link generation/validation (HIGH)
- App-level invites (your `group_invites` rows), **distinct from Supabase Auth magic links**. Token = `gen_random_bytes(16)` (128-bit CSPRNG, pgcrypto), base64url, **store only `digest(token,'sha256')`**. Mandatory `expires_at`; `max_uses` (1 = single-use); `revoked` flag.
- Accept via a `SECURITY DEFINER` RPC `accept_group_invite(token)` with `FOR UPDATE` lock (race-safe single-use); never let non-members SELECT `group_invites`. Deep link `volyume://…` (Universal/App Links preferred). Watch the email-prefetch gotcha (scanners consuming links) if email is ever involved.

### D3. Complete data toggle-off **at the data layer** (HIGH)
- The shared signal's RLS predicate must check the **sharer's** `sharing_enabled = true AND status = 'active'`, not just the viewer's membership. Flipping `sharing_enabled = false` returns **zero rows** to everyone else instantly — reversible, auditable, no deletion. Optionally harden with a trigger that nulls/deletes shared rows on toggle-off (defence in depth). This *is* the GDPR "withdrawal as easy as giving" mechanism.

### D4. Realtime vs polling (HIGH given offline-first)
- The data is one boolean per user per week. **Do not use Realtime** — a persistent WebSocket per user is disproportionate, and Postgres-Changes Realtime re-checks RLS per change (the part that doesn't scale). **Piggyback on the existing offline-first sync layer**: fetch group signals as a normal RLS-protected query on app open / pull-to-refresh / sync tick. (Consider lightweight Broadcast later if a nudge is ever needed.)

### D5. UK GDPR (MEDIUM-HIGH; DPO sign-off needed)
- A "trained this week yes/no" tied to a named member **is personal data** (ICO: definition isn't limited to sensitive/factual data; binary facts and inferences count). Pseudonymising to a display name does not remove it from scope while linkable.
- **Special category (Art. 9 health data)? Borderline** — bare yes/no reveals little, but in a fitness app the health inference is real, and **if ever joined to weight/calorie/ED-safety data it must be treated as special category** (needs explicit consent + Art. 9 condition). **Flag to DPO.**
- **Lawful basis: explicit opt-in consent (Art. 6(1)(a))** — freely given, specific, informed, unbundled, no pre-ticked boxes, **withdrawal as easy as giving** (the toggle). Legitimate interests is weaker for user-to-user disclosure.
- **Data minimisation:** share only the current-week boolean — never session times, exercises, weights, location. **Purpose/storage limitation:** use only for accountability; prune to a rolling window. **EU/UK residency:** keep in Supabase EU (Dublin); no PII to external tools. Update privacy notice; a short **DPIA** is advisable.

### D6. Anti-gaming (MEDIUM-HIGH)
- **Server decides the fact, not the client.** `trained` is *derived* from real logged `workouts` (Volyume already has `getWeeklySessionStats` → `workouts WHERE is_completed=1` in a Monday-anchored week, `database.js:4214`). No client-writable `trained` flag.
- **Plausibility thresholds:** require a real session (min duration, ≥1 completed set; reject future-dated or impossible bursts). Stamp a server `inserted_at`/`synced_at` and only count sessions logged within a sane window of `started_at` (catches back-dating across the offline boundary).
- **Accept residual risk:** offline-first means perfect anti-fake is impossible; this is a low-stakes social signal. Aim for "can't be *trivially* faked." **These checks live in the social-signal path only — never feed the coaching engine or ED safety system** (hard project rule).

---

## E. Synthesised design constraints (feed into phase2-02)
1. Binary/abstracted signal only; supportive, never competitive (avoid the r=−.14 backfire and Fitbit cheating/ Strava trust damage).
2. Invite-link-only, no discovery, no profiles, no feed/posts/likes — absence is the privacy guarantee.
3. Never share weight/calories/macros/performance/ED data (Levinson + comparison literature).
4. Cross-user data cannot use the single-owner offline sync engine → separate cloud-direct RLS read path.
5. Pro-only, **default OFF**, explicit opt-in consent; toggle-off enforced in RLS, leaving zero trace.
6. Derive `trained` server-side from real sessions; design for re-engagement (effects decay).
7. Remote push is currently a no-op (no EAS projectId) → don't depend on push for core value.

*Sources: see inline citations; full URL list retained in the agent transcripts. Re-verify the four flagged items (ASTD figures, Matthews middle-group ordering, "42% more likely", "streaks work") against primaries before any production copy.*
