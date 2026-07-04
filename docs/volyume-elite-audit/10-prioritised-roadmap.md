# 10 · Prioritised Roadmap

**Author:** Fable (main-loop synthesis of all 15 audits). **Date:** 2026-07-04.
**Nature:** a ranked menu, not a commitment. Nothing here is scheduled or
approved. Every item is an option; the founder chooses what and when.

**Prioritisation framework (as briefed):**
- **P0** — critical breakage, trust, privacy, data loss, crashes, severe blockers.
- **P1** — major retention/activation/conversion/quality opportunities.
- **P2** — meaningful polish/depth improvements.
- **P3** — nice-to-have refinements.
- **Avoid / Founder-decision** — expensive, off-brand, or constitution-touching;
  surfaced, never pre-decided.

Effort: **S** = hours, **M** = a few days, **L** = a week+. Every item cites the
source audit(s). Founder-decision forks are marked **⚖︎** and never carry a
pre-selected option.

---

## P0 — Do first (trust, measurement, safety-of-record)

| # | Item | Effort | Source | Note |
|---|------|--------|--------|------|
| P0-1 | **Apply pending telemetry migrations `092–102` to EU-Dublin** (staging first per each header). Turns the entire activation/conversion/partner/landmark funnel from dark to live. | S (founder action) | O4-M1 | Highest value-per-effort in the audit. No code change. Nothing downstream is measurable until this lands. |
| P0-2 | **Verify iOS Live Activity actually works in a shipped TestFlight build.** The module comment says `Activity.request()` throws until a Widget Extension target is added manually; no config plugin automates it. | S to verify, M–L if broken | S1-P0 | Device verification first. If dead, a shipped feature is non-functional — decide fix vs remove. ⚖︎ |
| P0-3 | **Add a behavioural test that enumerates every Pro screen and asserts `withProGuard`.** Today only source-regex guards exist; a new Pro screen could ship ungated. | M | S5-P0 | Trust-critical gating currently protected by the most brittle test type. |
| P0-4 | **Add a fail-closed behavioural test path for the Article 9 consent gate** (or document why RootNavigator can't render under Jest and pin the gate another way). | M | S5-P0 | The un-skippable GDPR gate has no behavioural coverage. |

---

## P1 — High leverage (retention, conversion, the "one product" feel)

### Conversion & measurement (all small, all high-ROI)
| # | Item | Effort | Source |
|---|------|--------|--------|
| P1-1 | **Populate the empty paywall proof slot.** `PAYWALL_EXCERPTS = []` ships the paywall with zero social proof despite the UI being built. Use consented on-brand quotes, or an honest mechanism-proof card — **never fabricate reviews**. ⚖︎ (which proof source) | S | O4-PW1 |
| P1-2 | **Fire `paywall_shown` on `PaywallScreen` and `CascadeGateScreen` mount.** The core view→trial KPI is uncomputable for the two main gates. Event + allow-list already exist; no migration. | S | O4-M2 |
| P1-3 | **Emit a `feature_locked_viewed` event** so the founder can rank which gate drives upgrades. | S/M | O4-M3 |

### The "one product" feel (the founder's core complaint)
| # | Item | Effort | Source |
|---|------|--------|--------|
| P1-4 | **Roll `Card` + a shared `ModalHeader` across the bolted-on surfaces first** (Progress Photos' 5 modals, Partners sub-components, Cardio chrome, Share). Then backfill the wider 64/80 hand-rolled boxes. ⚖︎ (big-bang codemod vs bolted-on-first vs lint-ban-new-only) | M | O1-F1, S4-§3 |
| P1-5 | **Extend the haptic vocabulary to the silent surfaces** — shutter, pair-accepted, cheer-sent, share-success. Zero haptics fire across all Photos + Partners files today. Calm-mode must still gate. | S | O1-F2 |
| P1-6 | **Add a shared load/error state** (`<LoadState>` loading/error/empty/content). Error states are absent in ~all but 3 screens, so a failed read looks identical to an empty account. | M | O1-F5 |
| P1-7 | **Unify the two share-card builders** (ShareCardScreen + BeforeAfterShareSheet duplicate ~90% of UI, share only the Skia renderer). ⚖︎ (merge vs extract primitives vs align-chrome-only) | M/L | O1-F4 |

### The integration heart (Photos + Partners → organs) — see docs 05 & 06
| # | Item | Effort | Source |
|---|------|--------|--------|
| P1-8 | **Weave Progress Photos into the weekly check-in** as a passive "your record is here" surface (LOOP-2, the lowest ED-risk loop). Never a capture nag; fully suppression-gated. ⚖︎ (which loop, if any) | M | O5-F1/F2 |
| P1-9 | **Give the solo weekly streak a calm milestone push** ("Three weeks running"), ED/calm-suppressed, forward-framed only — never "don't break your streak." The largest half-open retention loop. ⚖︎ | M | O4-HB1 |
| P1-10 | **Partners: add a mutual weekly intention** (Option A) — the one proven pairwise mechanic the app lacks; converts observation into a shared object. ⚖︎ (Option A / B / A+B / none) | M | O6-F2 |
| P1-11 | **Partners: add the missing "your partner joined" moment/push.** The most exciting moment of the flow is currently silent until next sync. | S | O6-F3 |

### Structural risk
| # | Item | Effort | Source |
|---|------|--------|--------|
| P1-12 | **De-risk the legacy free-tier sync.** Either migrate the highest-traffic table (workouts/sets) to the registry, or write a regression-matrix suite pinning current legacy behaviour first. ⚖︎ (migrate vs pin-then-migrate vs backlog) | M–L | S4-§1 |
| P1-13 | **Add `typecheck` + `check:imports` to the PR-gate CI** (`main-ci.yml`) — currently only in the Android build workflow, so a type/import regression can reach main. | S | S4-§5 |
| P1-14 | **Fix `ProGate.js` accessibility** — the wrapper around every Pro surface has zero a11y labelling; one file, app-wide reach. | S | S2-P1 |

---

## P2 — Meaningful depth & polish

| # | Item | Effort | Source |
|---|------|--------|--------|
| P2-1 | Add one honest line on the Article 9 screen that tapping Continue starts the 14-day trial (silent side effect today). Additive copy; locked consent body untouched. ⚖︎ | S | O2-P1-2 |
| P2-2 | Package `runWeeklyCoach` output as an anticipated weekly *moment* (headline → trends → detail), the WHOOP retention pattern. | M | O8, O4 |
| P2-3 | Skeleton loading on Photos/Partners/Share/food (bare spinners today vs branded Skeleton in the core). | S/M | O1-F6 |
| P2-4 | Migrate the three hand-rolled photo dialogs to the shared `BottomSheet`. | S | O5-F6, O1-F3 |
| P2-5 | Partners encouragement upgrade (Option B): small fixed no-shame acknowledgement set + reconnection surface on archive. ⚖︎ | S/M | O6-F1/F7 |
| P2-6 | Down-sample progress photos before local storage (no dimension cap today; storage bloat + decode jank on photo-heavy accounts). | S | S3-P1 |
| P2-7 | Wrap `createWorkoutTemplateFromWorkout` in a transaction (its sibling `duplicateRoutine` already is; interruption leaves partial routines). | S | S3-P1 |
| P2-8 | Warm the cold failure-moment copy ("Couldn't log / Try again" → calm, plus stop leaking raw `e.message` to users). | S/M | O3-P1 |
| P2-9 | Teaching empty states for the remaining dead ends (CoachReview, VolumeHeatmap, Consistency, MyMeals, Plans no-active-plan). | S/M | O1-F12, O2-P2-4, guidance-audit |
| P2-10 | Term-drift pass: standardise session/workout/routine and plan/programme naming. ⚖︎ (choose canonical terms) | M | O3-P2 |
| P2-11 | Win-back + PostLapse: signal the already-wired returning-user offer at peak attention (only when a real Play offer exists — never fabricated). | S | O4-TW1/TW2 |
| P2-12 | Free daily "why open" hook on Home (non-coaching: today's session, streak, last PB) — free retention past the activation window is thin. ⚖︎ (stay right of the free/Pro line) | M | O4-HB3 |
| P2-13 | Re-home Partners so its tab-home matches where it's entered (lives in Progress, entered from You). ⚖︎ | S/M | O1-F7 |
| P2-14 | Photo backup — an honest one-time "these are device-only, not backed up" warning at minimum; a user-initiated local export at most. **Founder decision — touches the never-leaves-device posture.** ⚖︎ | S–L | O5-F5 |
| P2-15 | Partner sharing granularity: surface the streak toggle to both partners / allow post-pair toggle (inviter-only + invisible today). ⚖︎ | M | O6-F5 |
| P2-16 | Font-scaling protection (`maxFontSizeMultiplier`) on hero numeric displays (only 4/82 screens today). | S/M | S1-P2, S2 |
| P2-17 | DiaryScreen "move to meal slot" modal a11y isolation fix (likely unreachable for screen readers). | S | S2-P1 |
| P2-18 | Store-review prompt also on a Pro coaching high-moment (great week / milestone), same 10/14 dedupe. | S | O4-RV1 |

---

## P3 — Refinements

| # | Item | Effort | Source |
|---|------|--------|--------|
| P3-1 | Swap the `code-outline` `</>` glyph used as a compare slider grip; fix filled-vs-outline icon drift on the new surfaces. | S | O1-F9 |
| P3-2 | CoachReview en-dash date → "to" (house-style break; extend lint to en-dash). | S | O1-F10 |
| P3-3 | Camera shutter animation + haptic; SafeAreaView on `ProgressGhostCapture` (fakes the inset today). | S | O1-F8, O5 |
| P3-4 | First-capture lighting/consistency primer + a calm pre-permission privacy line before the first camera request. | S | O5-F7/F8 |
| P3-5 | Delete the dead `PartnerRow.js` + fix its stale docstrings (built, tested, unmounted). ⚖︎ (delete vs re-home vs keep as latent asset) | S | O6-F4 |
| P3-6 | Mirror LoginScreen's OAuth-cancel toast on ProOnboarding step 1 (silent today). | S | O2-P3-1 |
| P3-7 | Migrate reference empty states to `EmptyState.js`; correct CLAUDE.md's stale "96 migrations" → 99; delete stale `schema.sql`/`setup_complete.sql`. | S | O1-F11, S4-§4/§5 |
| P3-8 | Add `share_completed` telemetry to size the organic viral loop. | S | O4-SV1 |

---

## Avoid / explicit Founder-decision items (surfaced, never pre-decided)

These are the forks where "do less / do more" is genuinely the founder's call,
per the no-corner-cutting rule. None is recommended here.

1. **Cadence photo reminders (LOOP-1).** O5 names this the *single highest-risk
   ED lever*; even opt-in, a recurring body-photo reminder can seed body-checking.
   LOOP-2 (passive surface) is far lower risk. ⚖︎ **Do not default to building this.**
2. **Photo backup/export** (P2-14) — touches the never-leaves-device lock. Any
   build must be user-controlled local export, never a Volyume-held copy. ⚖︎
3. **Partners Option C** (real shared programme identity + pair milestones) — L
   effort, re-opens the privacy surface, weakest evidence floor. A separate
   strategic bet, not a polish item. ⚖︎
4. **Any billing-adjacent paywall change** (honest-timeline paywall, trial-copy
   reconciliation) — product IDs and cascade are locked; needs founder sign-off +
   a written test plan per `docs/rules/billing.md`. ⚖︎
5. **Referral/incentive loops** — can drift into dark-pattern territory; off the
   calm brand unless done as "share a plan, not a discount." ⚖︎
6. **Quiz-first onboarding** (`ONBOARDING_QUIZ_FIRST`, currently false) — the
   "make the form shorter before value" fork; plumbing exists. ⚖︎
7. **`useAppStore.js` slice refactor** — L, 121 importers, high regression risk;
   CLAUDE.md's "no drive-by refactors" rule means this is opt-in only. ⚖︎
8. **Remove the unused `@gorhom/bottom-sheet` dependency** — looks safe, but the
   "never remove a dep without asking" mirror rule applies. ⚖︎

---

## Suggested sequencing (if the founder wants a default order)

Not a commitment — a sensible first three waves, each independently shippable and
each ending green (`npm run lint && npm test`), device-checklist per change:

- **Wave 1 — "Turn the lights on + stop the bleeding" (mostly S):** P0-1, P0-2
  (verify), P1-1, P1-2, P1-3, P1-13, P1-14. Small, high-ROI, low-risk. Makes the
  next waves measurable.
- **Wave 2 — "One product" (M):** P1-4, P1-5, P1-6, P2-3, P2-4, P2-8, P2-9. The
  component/haptic/state roll-out that closes the visual bolt-on gap.
- **Wave 3 — "Two organs" (M, needs founder forks first):** P1-8, P1-9, P1-10,
  P1-11, P2-2. The integration heart — Photos + Partners woven into the weekly
  rhythm. Requires the ⚖︎ decisions in docs 05 & 06 answered first.

P0-3/P0-4 (test coverage) and P1-12 (sync de-risk) run in parallel as their own
track since they touch different files.
