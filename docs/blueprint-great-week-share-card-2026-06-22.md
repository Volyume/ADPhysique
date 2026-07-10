⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# BLUEPRINT — "Great Week" Precision Coaching recap → share card

**Date:** 2026-06-22 · **Status:** BUILT (Phase 1 + Phase 2 + gym-photo) — see §12 BUILD STATUS & RECONCILIATION · **Branch:** `claude/audit-work-quality-review-benrin`
**Origin:** founder request 2026-06-22 — "when a user has a great weekly check-in (PRs, on-target
progress, good feedback), give them a shareable moment to celebrate and advertise the app."

This is a research/design blueprint only. No feature code has been written. It is built from three
parallel research streams (competitor/growth teardown, an in-repo code audit, and evidence-based
ED-safe-celebration research) and is intended to be build-ready when green-lit.

---

## 1. The opportunity

When a user finishes a strong weekly check-in and the Precision Coaching review tells them they hit
their target, set PRs, and trained consistently, they are at an emotional peak. Handing them a
beautiful, shareable recap at that moment turns satisfied users into an organic growth channel — the
same mechanic behind Spotify Wrapped, Strava Year-in-Sport, Whoop's weekly report, Hevy PR cards and
Duolingo streak shares.

**The single most important growth principle (from the research): the card is the USER'S trophy, not
our advert.** Brand sits as a small watermark. People share things that make *them* look disciplined
and successful (Berger's STEPPS: social currency, emotion, public). Wrapped spreads because it
showcases the user's identity, not Spotify's.

## 2. Research basis (full reports retained in session)

- **Growth / competitor teardown.** Spotify Wrapped (identity-first, 9:16, brand-subtle), Whoop
  Weekly Performance Assessment (Monday cadence — direct analogue to our check-in), Hevy/Fitbod (PR
  & muscle-map cards, transparent-overlay-on-selfie, design variety), Gentler Streak ("celebrate,
  don't chase" — the responsible tonal north star), Duolingo (milestone cards as premium artifacts
  drove a **5–10× organic-sharing jump**; design quality is load-bearing).
- **Code audit (in-repo).** We already have the data and the renderer (see §7).
- **ED-safe-celebration research (evidence-based, cited §10).** Self-Determination Theory; the
  content-type finding that weight-*number* / weight-loss content specifically drives comparison and
  ED harm; the 0.5–1%/wk safe-rate guideline (NHS/CDC/NIH).

## 3. Card concept

A **weekly recap card** generated from the Precision Coaching output, offered (opt-in) right after a
**"great week"** check-in. Two formats from day one: **1:1 square** (feed/WhatsApp) and **9:16 story**
(IG/TikTok), pre-rendered, zero cropping, one-tap share.

Tone: the warm, deterministic Precision Coaching voice — second-person, British English, numbers
before narrative, no jargon, no AI. Borrow the personal-coach feel of Caliber/Future check-ins.

## 4. What goes on the card

Lead with a **status-conferring tier label, not a number** (the LinkedIn "top 5%" / Wrapped effect):
e.g. **"Dialled-In Week" / "On-Target Week" / "Textbook Week"** (final names = founder voice).

Then **3–5 glanceable, self-referential metrics** (never vs other users), all of which the user
*controlled* (Self-Determination Theory: competence + autonomy):
- **PRs set this week** (`prsThisWeek`)
- **Sessions completed** e.g. 5/5, and/or **consistency streak** (`sessionsCompleted/Planned`, streak)
- **Energy / recovery** ("recovered well") (`recoveryFlag`)
- **On-target progress** — the emotional centre, framed **qualitatively** (see §6): a checkmark /
  trend arrow landing inside a "healthy zone" band — "Hit your sustainable target ✓"
- One **warm coach line**: "You showed up 5 times and hit your target — textbook week."

Plus a **signature, ownable visual** (a weekly "balance ring" or strength sparkline) so the card is
recognisable at a glance in a feed (Hevy's muscle chart / Fitbod's heat map are the patterns to
emulate), and a small **Volyume wordmark** footer.

**Reserve premium "milestone" cards** for landmark weeks (first PR, streak milestones, a "perfect
month") — Duolingo's evidence says these premium artifacts are where the sharing spike comes from.

## 5. The "great week" trigger (when the opt-in CTA appears)

The "Share your week" CTA on `CoachOutputScreen` should appear ONLY when the week genuinely warrants
it, using signals the engine already produces (`src/lib/weeklyCoach.js` return shape, ~`:1278–1342`):

```
greatWeek =
     trend.onTarget === true                                  // weeklyCoach.js:577, output trend.onTarget
  && sessionsCompleted >= ceil(sessionsPlanned * 0.75)        // sessionsCompleted/Planned :1321-1323
  && (prsThisWeek > 0 || recoveryFlag === 'normal')           // prsThisWeek :1321 ; recoveryFlag :1326
  && deloadSuggested === false                                // :1304
  && edPatternFired === false                                 // :1316  (hard gate)
  && ffmFloorHeld === false                                   // :1314  (hard gate)
  && rapidWeightLossFlag === false                            // :1312  (hard gate)
```

Tiers (for the headline label + milestone treatment) can layer on top: a normal great week gets the
clean card; first-PR / streak-milestone / "perfect month" gets the premium card.

## 6. The weight-progress rule (the key ED-safe decision)

> **FOUNDER CORRECTION 2026-06-22 — SUPERSEDES the earlier "qualitative-only" call below.**
> A qualitative tick celebrates nothing the user can see, and "nobody is going to want to share"
> a card with no achievement on it. The card MUST show the **real** weight lost/gained and the PRs —
> that is the achievement the user is proud of and the reason to share. It is shown as the **hero**
> (big, gold). This is safe because the card only ever fires on a verified-SAFE, on-target week
> (§5 gates rapid-loss / FFM-floor / ED-flag), so a number only ever appears once the progress has
> been confirmed safe and on target.
>
> The guardrails that remain (implemented in `greatWeek.js` / `drawShareCard.js`):
> - **Only on a safe, on-target week.** `isGreatWeek` already requires `onTarget` and clears the
>   three hard safety flags, so the card never celebrates overshoot or an unsafe rate.
> - **Suppress strips every number.** Under an open ED-pattern flag OR calm mode (`suppress`), the
>   weight hero, the best-lift hero and all weight language are dropped to the bare consistency wins
>   (sessions / PRs / recovery) — unchanged from before.
> - **Bodyweight itself is never shown** — only the *change* (e.g. "−0.7 kg this week · on target").
> - **Self-referential only**; never a comparison to other users.

---

*Superseded original (kept for the record):*

Founder intent (2026-06-22): healthy, on-target weight progress IS worth celebrating and is honest
marketing ("members achieve sustainable, healthy progress"). The evidence refines *how*:

- ~~**Celebrate on-target progress QUALITATIVELY, not numerically.**~~ (Superseded — see correction
  above. The qualitative-only execution produced a card with no visible achievement.)
- Rationale (cited §10): content-type research shows weight-*number* and weight-loss content
  specifically drive social-comparison and ED harm. Mitigation retained: the number appears only on a
  confirmed-safe, on-target week, only as the *change* (never the scale weight), and is fully
  suppressed under any open safety flag.
- **Never reward overshoot.** Faster-than-target is a *miss*; off-target weeks never qualify for the
  card at all (matches our 1.5%/wk rapid-loss ceiling and the 0.5–1%/wk guideline).

## 7. Technical implementation path (plugs into what we already have)

**Data — already produced.** The weekly coach output carries everything: `prsThisWeek`,
`sessionsCompleted/Planned`, `trend.onTarget` + `trend.rateLabel`, `recoveryFlag`, `whatWorking[]`,
`volumeSignal`, streak (`streak.js computeStreak`), and the safety flags
(`edPatternFired`/`ffmFloorHeld`/`rapidWeightLossFlag`). Reachable via `getLatestCoachOutput(userId)`.

**Renderer — already exists.** `src/lib/shareCard/drawShareCard.js` is a single Skia renderer used for
preview + export, with card types `session` / `pr` / `milestone` (`:394–396`), square (1080) + story
(1920) via `cardHeight()` (`:374`), and reusable blocks: `drawBackground` (`:122`), `drawAccentBar`
(`:133`), `drawStatBoxes` (`:179`), `drawFooter` wordmark (`:137`), `drawIntensityBadge` (`:163`).
Add a `'weekly'` branch (`:394`) → new `drawWeeklyRecap()` reusing those blocks.

**Screen — extend.** `src/screens/ShareCardScreen.js` already has the card-type selector (`:294`),
square/story toggle (`:307`), live preview (`:326`), include-toggles (`:344`) and the share/PNG flow
(`:368`). Add a `'weekly'` entry + toggles (the weight-rate toggle disabled under an ED/calm flag).

**Entry point.** On `src/screens/CoachOutputScreen.js`, when `greatWeek` (§5) is true, show an opt-in
"Share your week" CTA → `navigation.navigate('ShareCard', { weeklyRecapData: output, suppress })`.

**Verification harness exists:** `scripts/render-share-card.cjs` renders the card to PNG headlessly
for visual checking.

## 8. Safety guardrails (NON-NEGOTIABLE — inherit existing machinery)

The recap card MUST honour the app's ED-safety posture. The suppression logic already exists; the
card reads the same flags:

1. **ED-pattern flag OR calm mode active** → suppress rate language, weigh-in counts, and numeric
   streak (streak shows "resting"); weight direction-only or hidden.
   (`coachResponse.js:23–27`, `chartWindows.js:118–129`, `streak.js:35–42`, `wellbeing.isCalm`)
2. **Frame weight as on-target, never "best/most/fastest".** Qualitative by default (§6).
3. **FFM floor / rapid-loss holds** are framed as the coach protecting the user, never as a win;
   never celebrate low intake. (`weeklyCoach.js:836–862`, `nutritionEngine.js:109–117`)
4. **Adherence-neutral** — "hit your calorie target", never "perfect adherence / zero misses".
5. **Self-referential only** — no leaderboards, ranks, or comparison to other users.
6. **Jargon blocklist + voice rails** (`whyThisTemplates.js:40–62`) — no MEV/MRV/RIR/researcher
   surnames; British English; numbers before narrative; honesty test.
7. **Opt-in, unpressured, never auto-post** (autonomy; no like-baiting). User-initiated share keeps
   EU/PII rules clean (no data leaves the device except what the user chooses to post).

## 9. Recommended phasing

1. **Phase 1** — recap card (square+story), qualitative on-target framing, ED-safe, opt-in CTA after a
   great-week check-in. Reuses the existing renderer.
2. **Phase 2** — premium **milestone** cards (first PR, streak milestones, perfect month): the proven
   virality multiplier.
3. **Phase 3** — design variety (light/dark/transparent-overlay-on-a-gym-selfie) to avoid the
   "every card looks identical" failure mode that blunts Strava's shareability.

## 10. Open product decisions (founder)

- **Tier label wording** ("Dialled-In Week" etc.) — founder voice.
- **Raw weight number:** recommend default OFF on the shared image (qualitative only), opt-in to
  include privately — confirm.
- **Pro gating:** the recap is a Precision Coaching output, so it is inherently Pro-gated; Pro users
  become the advocates. Confirm that's intended (vs any free-tier teaser card).
- **Cadence/ritual:** deliver the card the same day each week post-check-in (Whoop/Wrapped ritual +
  gentle FOMO).

## 11. Sources (ED-safe celebration + growth)

Growth: Spotify Wrapped (NoGood; Idomoo), Strava Year-in-Sport (Strava support; Bikepacking critique),
Whoop WPA, Hevy/Fitbod shareables, Gentler Streak weekly recaps, Duolingo streak/milestone sharing,
Berger STEPPS / Wharton *Contagious*.

ED-safe celebration:
- Ryan & Deci, Self-Determination Theory (selfdeterminationtheory.org; APA)
- Need satisfaction, motivation & exercise (PMC4489042)
- Designing for Sustained Motivation / SDT in behaviour-change tech (arXiv 2402.00121)
- Unintended consequences of fitness apps (Br. J. Health Psychology 10.1111/bjhp.70026)
- Healthy rate of weight loss (Harvard Health; NHS/CDC summary) — 0.5–1%/wk
- Social media & ED harms (UC Anschutz; scoping review PMC10032524)
- Content matters more than duration of exposure (ScienceDirect S1471015323000223)
- Non-scale victories (TODAY; Allina Health)

**Bottom line:** celebrating *on-target, safe-rate* progress is evidence-appropriate; the responsible,
shareable card leads with process/competence wins, frames weight qualitatively as "sustainable /
on-target" (numbers private by default), is strictly self-referential, never rewards overshoot, and
makes sharing a low-pressure, autonomous choice — and it plugs into the share-card renderer we
already have.

---

## 12. BUILD STATUS & RECONCILIATION (2026-06-22)

Reconciliation of what was actually built today against this blueprint. All on
`claude/audit-work-quality-review-benrin`; `npm run lint && npm test` green (288 suites / ~4446 tests).
This is the TODAY (22/06/2026) Great Week share-card task — unrelated to the 06-21 says-vs-does audit
or the ultimate audit.

### DONE — Phase 1 (weekly recap)
- Blueprint (`3e6697e`). Trigger `isGreatWeek` + ED-safe param builder `src/lib/shareCard/greatWeek.js`
  (`872cc3e`). Screens wired: opt-in "Share your week" CTA on `CoachOutputScreen` → `ShareCardScreen`
  → `'weekly'` branch in `drawShareCard.js` (`cfdf575`, `35c3427`). Best-lift hero, app voice,
  square-only, user-unit (`ebc1f83`, `5548a99`, `1b1b2ec`).
- **DECISION CHANGE (founder, mid-build) — supersedes §6's qualitative-only rule:** the card LEADS
  WITH THE REAL ACHIEVEMENT, not a tick. Cut goals → weight lost as the hero, explicitly labelled
  ("WEIGHT LOST THIS WEEK · RIGHT ON TARGET"); non-cut goals → best lift / PRs as the hero. Still gated
  to a safe, on-target week and fully stripped under an ED-flag / calm mode (`596e460`, `27318e3`,
  `6328f7c`).

### DONE — Phase 2 (premium milestones)
- Perfect-month detector + card, lifetime-tonnage landmark, premium-streak card; CTAs on
  `AnalyticsScreen`; fire-once seen-records (`c8aa972`, `527cc1c`). Fixes: tonnage NULL guard,
  persist-until-tapped CTAs, PR-badge tofu glyph, hero-label overflow fit (`527cc1c`, `2254e1a`,
  `d5fcdb7`).

### DONE — Phase 3 (variety, partial)
- Gym-photo background for ALL card types (cover-fit + brand scrim); picker wired into the screen
  (`094ccfb`). Light/multi themes NOT built — they violate the dark-only design standard
  (`DESIGN_SYSTEM.md`); deliberately rejected.

### CORRECTED (overhaul/thrash that was reverted)
- A mid-session "conform to theme.js" pass wrongly stripped the SHIPPED baseline card design (the
  tonal gradient background, the card palette) and added then removed an AI-looking glow + star.
  Reverted to the shipped baseline (`4c77353`); only the genuine new work (weekly recap, milestones,
  gym photo) was kept. The existing session/PR/milestone cards are back to their pre-today shipped look.

### WHAT REMAINS (not built — needs founder input or a device)
- **Open product decisions (§10):** tier label wording (currently "Textbook Week" / "Textbook Month"),
  weekly cadence/ritual, and Pro-gating confirmation.
- **Device-walk only:** the gym-photo picker uses `expo-image-picker` (a native module) — it runs only
  in a real build; the render path is verified via `scripts/render-share-card.cjs`.
- **Founder review + merge:** all work sits on the audit branch; not merged.

### STATUS: BUILT + TESTED. Awaiting founder review, the open §10 decisions, and a device-walk.
