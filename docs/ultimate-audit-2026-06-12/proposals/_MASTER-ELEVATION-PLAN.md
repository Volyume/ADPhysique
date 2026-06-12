# MASTER ELEVATION PLAN — Volyume (Phase 3 synthesis, 2026-06-12)

Composed centrally from the verified corpus: 18 code-audits (a-01..a-18,
file:line evidence) + 18 research reports (r-01..r-18, every one
adversarially spot-checked before acceptance). Every claim below traces to
one of those documents. Nothing here builds without founder sign-off;
items marked FOUNDER are decisions only the founder can take.

---

## The five theses (what the whole corpus says)

**T1 — The biggest wins are already paid for.** A striking share of the
gap to "best app it can be" is wiring, not building: ~19 built-but-severed
features found (dead taps, computed-but-never-read milestones, orphaned
components, unwired dedupe, un-armable reminders, dead pushes, no-op
toggles). Reconnecting them is days of work with outsized impact.

**T2 — Placement beats absence.** The app's differentiators are hidden:
the coach is buried deeper than analytics (a-16); the meal plan has no
persistent door (a-09); the rich exercise screen is unreachable until
after you've logged the exercise (a-05). The mandate's "ideal location,
findable in real life" lens is the single highest-leverage question.

**T3 — We cannot measure what matters.** Quiz funnel untracked (a-01),
~1 event on Home (a-02), 1 in the whole plans area (a-03), 4 in Progress
(a-06), 0 in meal plans (a-09). Every elevation needs its instrument.

**T4 — The moats are real and unarticulated.** Verified unique in the
field: division-specific deterministic generation (r-03), gram-level
coach→plate narration (r-07), free per-muscle MEV/MAV/MRV heatmap (r-06),
the barcode heal chain (r-08), the movement-safety interlock (r-10),
ED-safety breadth (r-18 — beyond every surveyed app), £29.99/yr value
(r-14 — ties the cheapest logger while bundling coaching priced $299+
elsewhere). With AI now table-stakes (Hevy Trainer, Peloton IQ, Apple
Workout Buddy, MFP AI Coach), "deterministic — every change has a reason"
is a sharpened contrast position, not a gap (r-03, r-08).

**T5 — Honesty and compliance debts exist and are cheap to clear.**
Article 9 withdrawal is coupled to account deletion vs GDPR Art 7(3)
verified verbatim (a-15/r-15); no true data-access export; the 3-partner
upsell sells an unbuilt UI (a-12/a-14); OFF consent copy promises a photo
upload that never happens (a-08 supplement); paywall social proof ships
dark and win-back ships inert (a-14 — founder console actions).

---

## Build waves (proposed order)

### Wave 0 — RECONNECT (days; pure wiring + honesty; tests exist for most)
1. Route the Home coach banner (one-line getParent fix — a-02/a-07)
2. Render the built cold-start five-part shrink (presentation-only — a-07)
3. Wire C2 "Show the science" to output (a-07) — or hide the toggle
4. Fire the 4/12/26/52 streak milestones + next-rung nudge (a-11/r-11)
5. Wire the plate calculator into SetEntry (a-04/r-04)
6. Wire watch dedupe arg + fix bodyweight field (75kg bug) (a-10)
7. Day-picker + writer for training reminders (the un-armable critical,
   a-13/r-13 Peloton/Garmin model); route morning-push tap; revive the two
   dead celebration pushes
8. Populate partnerFirstName; fix the partner invite funnel (deferred deep
   link + landing — a-12/r-12)
9. Honesty set: reword 3-partner upsell (or build the UI), fix OFF photo
   copy, relabel "Back up everything" as data download (a-15)
10. withinTolerance recompute on swap; meal-plan "log this day" date param
    (a-09); Suggested-tab target dead-end (a-08)
11. Update styling.md to match the live theme (a-16 — stops misleading
    every future agent); Button onPrimary one-liner; OS reduce-motion

### Wave 1 — PLACEMENT (the IA pass; design judgement)
1. **A first-class Coach home** (field-justified — r-16; fixes the two
   unlinked weekly surfaces a-07). Candidate: promote coach to a stable
   badged surface reachable from Train in one tap.
2. **Persistent meal-plan door** (a-09/r-09) — Diary header + Home when
   active.
3. **Exercise library browse**: ungate ExerciseDetailScreen + a Library
   entry; reuse custom-create chips as muscle/equipment filters; surface
   computed difficulty (a-05/r-05 — mostly routing, no new data).
4. BodyMetrics tile honesty (Pro-tag the free tile — a-06).
5. Reduce fragile cross-tab jumps (8 found — a-16) as part of the above.

### Wave 2 — MEASURE (instrument before further change)
Funnel events: quiz steps, plan doors (6), paywall triggers, meal-plan
usage, library browse, share/invite. Telemetry allow-list migration in one
batch (the strict server-mirrored pattern, a-13 conventions).

### Wave 3 — TABLE-STAKES (verified field baselines we lack)
1. Merged food search + "More results" + FTS5 index (r-08 pattern +
   r-17 official fix — kills first-source-wins AND the 100k full-scan)
2. Shopping list for meal plans (universal in all 11 plan leaders — r-09;
   offline/local, aisle-sorted)
3. CSV + JSON data export, labelled as a right (r-06/r-15)
4. Session-time estimates on plan previews; bind the days question;
   difficulty floor on the library-quiz path (a-03/r-03)
5. Rest-day Home state + weekly glance (a-02/r-02)
6. Step-history screen + cardio per-type rollups (a-10/r-10)
7. Equipment filter on in-session swap; progressive disclosure on set
   types via existing isBeginner (a-04/r-04)
8. Free body-stats editor post-onboarding (r-15 — universal norm)

### Wave 4 — DIFFERENTIATE LOUDER
1. Named, bounded "first two weeks" beginner journey with early-win
   milestone density (r-01/r-06/r-11 — fixes the celebration desert)
2. Post-100 ladder with named tiers + real block-completion event
   (r-11 — Eddie's emotional peak, currently a heuristic row)
3. Share CTA at the PR moment + deep-linked cards + plan-share links
   (r-06/r-12 — the bigger acquisition unlock)
4. Visual demos (licensed media; MoveKit price NEEDS VENDOR CONTACT — the
   $99 figure failed live verification, r-05)
5. Moat articulation: methodology/paywall/store copy leading with the
   verified uniques (T4); coach-price anchor on paywall (r-14)
6. Consent-last onboarding resequencing + confirm-don't-re-ask + honest
   cold-start timeline (r-01 — fixes a-01's F2/F4/F5)
7. Progressive-disclosure density axis (interpreted-vs-raw), NOT a forked
   beginner UI (r-16 — answers the dual-market balance)

### Wave 5 — PLATFORM
Analytics rollup table (r-17), per-navigator error boundaries, wire OTA
(updates.url + channels), revive Maestro E2E via EAS Workflows, decouple
Article 9 withdrawal from deletion + consent-review screen (r-15 — also a
compliance item; schema/flow work, founder-reviewed).

---

## FOUNDER-DECISION REGISTER (nothing proceeds without your verdict)

| # | Decision | Source |
|---|---|---|
| F1 | Widen free coaching voice to acknowledgement + one cue (keeps decision/receipts Pro)? Touches the sacred gating split. | r-07 |
| F2 | Restore optional per-set RPE/RIR for the serious tier? | r-04 |
| F3 | Photo/voice logging: both collide with the no-AI boundary. The boundary-safe variant is a verified-search accelerator only. | r-08 |
| F4 | Billing presentation: align CascadeGate to annual-first; fill social proof (your real reviews); create the Play Console win-back offer. ALL billing-adjacent. | a-14/r-14 |
| F5 | Safety presentation (ALL FOUNDER-GATE, mechanisms untouched): persistent "Support & wellbeing" entry; voluntary-calm-mode naming; rest-positive copy on voluntary paths only. | r-18 |
| F6 | Coach tab/IA promotion — where exactly does the coach live? | r-16 |
| F7 | 3-partner Pro UI: build it or reword the upsell? | a-12 |
| F8 | IF/skip-breakfast support (ED-floor-checked design required). | a-09/r-09 |
| F9 | Demo media spend (vendor price unconfirmed). | r-05 |
| F10 | Article 9 decoupling flow (compliance-grade; legal review advisable). | r-15 |

## Consciously REJECT (field practice we will not copy)
Generative-AI coaching/advice (Tessa precedent), red/green food guilt,
projection-style warnings, leaderboards/public comparison, paywalled
barcode scanning, streaks that reset on rest, conspicuous safety
interventions, dark-pattern cancellation. (r-08/r-11/r-12/r-18, val base.)

## Provenance
Audits a-01..a-18 + a-08-supplement (code, file:line). Research r-01..r-18
(fetched sources; spot-checked: 17 verbatim passes, 1 corrected-in-place).
Failures during the operation: 2 hung/incomplete agents (caught,
relaunched, work recovered), 1 stale price claim (caught at spot-check).
No claim in this plan rests on unverified material.
