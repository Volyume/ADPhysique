# WORLD-CLASS USABILITY AUDIT — SYNTHESIS (2026-07-03)

Founder brief (verbatim): "Be the best app in the world. Not simply features,
but usability, how things flow, ease of use as a newbie, guiding new users
through. Becoming an app people can't stop thinking about and wanting to use.
Look at every feature we have, where can we improve it in these areas. Are
there other things we should add to elevate against competitors?"

Method: seven scoped read-only passes run today — newbie journey (01), training
core (02), nutrition (03), coaching core loop (04) with three sub-passes
(04a progress surfaces, 04b cardio/contest/notifications, 04c goal
setup/methodology), whole-app cohesion (05), and external research on what
makes apps genuinely beloved (06). Every raw report lives beside this file
with file:line evidence. NOTHING here is approved; the founder decides per
item. Decision-gated items 11-16 are untouched, as are all locked systems.

---

## 1. THE HONEST VERDICT

Large parts of the app already ARE world-class, verified against source, and
should be protected, not touched:

- The safety and honesty machinery of the weekly loop: insufficient-data
  receipts with live counts and named unlock dates, floor-held applies that
  explain themselves, ED lockout copy, rapid-loss reported in green, the
  never-collapsed safety zone (04).
- The streak system is the best-designed emotional arc in the codebase:
  resting keeps the run, one off week self-heals as "Covered", the word
  "streak" is banned, Pause is agency, the ED flag withholds the number (04a).
- The Year-of-Lifts story deck, the volume-heatmap body diagram with
  plain-English legends, and the recomposition insight (04a).
- Notifications are genuinely coach-voiced and calm end to end (04b).
- Welcome, Article 9 consent, the free 3-question on-ramp, the calm day-14
  gate and the ED-safe winback (01).
- Tap economy in the gym: 1-tap repeat set, per-exercise steppers, 2-tap
  add/swap/edit (02); and every daily action sits 0-1 taps from open (05).

Three sentences carry the whole audit:

1. **"The gap is not transparency, it is memory."** The coach explains every
   week brilliantly and then never points back at its own record (04).
2. **The app under-tells its own story**: Precision Coaching acts before it
   is ever explained; widgets, forgiveness mechanics, and shipped features
   are invisible; the What's New map has one entry (01, 05).
3. **The first week has small trust leaks in big moments**: every first set
   fires a false PERSONAL RECORD; the first food log is the least-confirmed
   action in the app; day-0 shows a guaranteed-dead "Copy yesterday" (01, 03).

---

## 2. TIER 0 — THE QUICK-FIX BASKET (all S, ~25 items, one wave)

Grouped for a single founder yes/no per group; each item carries evidence in
its track file.

**Group A — first-week trust leaks (01, 03):**
A1 first-ever set of any exercise fires full PR confetti (algorithms.js:567,
heaviestEver starts 0) — relabel "First lift logged", suppress celebration on
empty history (celebration layer only, engine untouched). A2 first food log
gets a diary-side toast + Undo like every other log. A3 hide/replace day-0
"Copy yesterday" with "Try a suggested meal" (Suggested tab has pre-history
content). A4 Progress day-0 empty state gets a CTA (EmptyState primitive
already supports it). A5 rename ProOnboarding Step 2 "About you" + add the
two missing "why we ask" hints (age, height). A6 wire the EXISTING glossary
onto onboarding's unglossed jargon (volume x3, surplus/deficit/compound/
isolation) — closes the Ultimate Audit's Q-NE1. A7 caption the OAuth spinner
+ give cancelled OAuth feedback.

**Group B — comprehension and locked-spec conformance (04, 04c, 04a):**
B1 REGRESSION: restore the two dropped sentences on GoalLockConsentScreen
from the locked voice doc (the "2 signals to 3" mechanism and "either choice
keeps the absolute safety floor" reassurance) + fix its stale docstring.
B2 MethodologyScreen: "fat-free mass" -> "lean mass" (locked Pattern 10
violation) + deep-link its open section from route.params.source. B3 link
"How Precision Coaching works" from ProSetupComplete and the Home trial
banner (the black-box hole of the trial); state the 14-day arc in one calm
sentence at setup complete. B4 next check-in DATE on ProGoalSetup footer
(helper already exists). B5 move the "New to calories and macros?" primer
above the numbers. B6 why-line into the CoachOutput hero ("Because: ...");
hold weeks get a non-applyable hero ("change nothing, the plan is working");
confidence caption names which data was thin; permanent "Coaching history"
link; wizard final CTA promises the payoff ("See this week's coaching");
fast-path provenance line. B7 InfoTooltips: Recomposition header (+GLOSSARY
entry), adaptiveBurn confidence, CoachOutput trend chip (screen has zero
tooltips today; 13 others have them). B8 WorkloadCard puts "your optimal
range" in the status line, not tooltip-only; one-line takeaway on the
training-load hero (chartWindows pattern exists). B9 wire the existing
cardioVerdictLabel() into the CoachOutput cardio row; icon-differentiate the
cardio caution vs acknowledgement rows.

**Group C — flow friction (02, 03, 05):**
C1 LiftProgress gets a search box; render the already-computed "last time:
X kg x Y" headline (free — data computed, never rendered). C2 tappable
exercise rows in WorkoutHistory -> ExerciseDetail. C3 visible countdown/
cancel on the 1.8s auto-advance. C4 plan activation uses the app's bottom
sheet, not stacked native Alerts. C5 diary day-swipe gesture (chevrons stay).
C6 drop the saved-meal confirm dialog for optimistic-write + Undo. C7 make
the three long-press-only fast paths visible (portion editor, water +500,
multi-select). C8 remember the OCR "skip name" choice. C9 flatten
notification settings from 4 taps to 3 (two rows on Settings root).
C10 widget discovery: one Settings row + What's New entry (feature is fully
built, currently invisible). C11 great-week share gets celebratory
(non-amber) treatment. C12 training-reminder push references the plan name
(wiring only). C13 tokenise the last hardcoded motion values (Toast,
WorkoutSummary, PRCelebration). C14 stale asset cleanup + dead route params.

## 3. TIER 1 — THE SIGNATURE MOVES (the "can't stop thinking about it" bets)

**S1. Give the coach a memory (M+M+S, the audit's biggest single insight).**
Three angles of one feature, all presentation-only over data already
persisted per week: (a) outcome loop in coaching history — pair each
decision with the NEXT week's trend verdict and an Applied chip, turning a
decision log into a track record; (b) the coach's scorecard — "weeks you
applied the call and the next trend landed on target: 7 of 9" (suppressed
under ED flag/calm); (c) the pre-commitment line — "Next Sunday I'm checking
whether the trend responds to the 150 kcal cut", which next week's
acknowledgement visibly answers. This is the mechanic that makes users come
back to see if the coach was right. No engine change; deterministic.

**S2. Tell the forgiveness story we already built (S+S+S).**
The band-not-chain consistency system already exists and matches exactly
what the research says the most-loved calm apps do (Gentler Streak). Surface
it: (a) a compact in-app echo of the consistency stat near the Home hero
(widget writer data exists); (b) a dismiss-once explainer that states the
promise upfront — "one off week never breaks your run"; (c) the "longest
run" personal best gets the same gradient share-card moment other milestones
get. Founder question attached: the strip's unlabelled "missed" glyph — 
deliberate no-shame choice or legend gap? Ask, don't fix.

**S3. The daily brief and the mid-week runway (M).**
The research's strongest ritual mechanic (Oura's morning check) translated
deterministically: one line on open — "Deload week. Lighter targets today."
— composed from engine state; plus a "since your check-in" strip (days to
check-in, weigh-ins banked vs needed, sessions done vs planned) reusing the
coachLedger's exact thresholds so it can never disagree with the gate.
ED-neutral variant reuses the existing no-weigh-in-counts mode. Between
check-ins the app stops being a logger and becomes a coach mid-sentence.

**S4. The weekly mini-story + shareable moments (M).**
"Your week, in one card" — a 7-day story reusing the already-built
YearOfLifts StoryCard infrastructure at higher frequency; extend "Make a
card" to the recomposition insight (the most only-Volyume insight in the
app, currently unshareable) and training load. Research: wrapped-style
recaps are now category-expected (Boostcamp, Gentler Streak); ours should be
reflective, never competitive.

**S5. Fix the plan-authoring spine (S-M port + M + S-M).**
The one training surface below world class: port BuildWorkout's existing
steppers into ManualBuilder (targets are read-only text today); duplicate
day/routine; make supersets editable outside the create flow; and fix the
giant-set integrity risk (builder allows 3+, live session pairs only 2 —
silent mid-session breakage; cap at pairs now, extend later).

**S6. Instrument the metric that predicts everything (S).**
Research: under 3 sessions in the first 14 days = 3-4x churn. The funnel
telemetry (migrate_099) already exists; add the one derived event/report and
judge every onboarding change against it. Also adopt the 90-second
install-to-first-set benchmark as a standing test.

## 4. TIER 2 — STRUCTURAL (M/L, sequenced after the above)

T1 saved meals/recipes join the ranked relog pool (the go-to dinner deserves
the 1-tap treatment single foods get). T2 tab-icon badge for unseen coach
changes (Home banner is single-surfaced today; dismiss = gone). T3 shared
navigateCrossTab helper replacing 15 hand-rolled getParent() calls (the F4
silent-dead-tap bug class, already bitten once). T4 RPE/RIR progressive
disclosure gated by logged-set history (beginners cannot self-rate for
months; evidence in 06). T5 beginner-first default sort on PlanLibrary
outside the quiz path. T6 differentiate Pro-lock vs not-enough-data-yet lock
styles (extend the Recaps countdown pattern). T7 drag-and-drop reorder in
plan world (check gesture-handler already in tree before any dep ask).
T8 missed week acknowledged calmly in history and the next verdict.
T9 identity-copy sweep: "6 weeks of training three times a week" register
everywhere a count is celebrated (06's Bem mechanism; mostly done, sweep the
stragglers).

## 5. FOUNDER DECISIONS NEEDED (ask-first, in your words)

D1 Home food quick-log: you removed the TodayStrip food cell on 2026-06-30.
Every meal log now starts with a tab switch — the single most frequent
action in the app. What drove the removal, and would a leaner one-tap "Log
lunch" (deep-link into the inferred meal slot) avoid it? We will not re-add
anything without your reasoning.
D2 The session-start intent modal fires on every start with no
remember-skip. It feeds readiness adjustments, so changing it touches
coaching input. Options: remember-skip toggle / inline chip row / leave.
D3 Seven banner types compete for Home's one slot. Calm today; accretion
risk. Merge 2-3 into one "worth your attention" card?
D4 The streak strip's unlabelled "missed" glyph (S2 above).
D5 Rest-day framing confirmation: Home always shows next-session (plan
round-robin, no calendar rest day) — confirm this stays the rule for future
copy.
D6 Exercise demo media: still the largest first-workout-confidence gap
(license vs produce; L; already gated).
D7 ED-owner triage: GoalChangeSummary shows deficit-phase framing without an
ED-flag check (ProSetupComplete has one). Flag only.
D8 CoachReviewScreen (free) derivation drift vs the Pro engine (hardcoded
deload weeks, boolean/numeric mismatch) — separate correctness pass.
D9 Quiz-first pre-account path is built and switched off
(ONBOARDING_QUIZ_FIRST=false) — the A/B decision from P5 still stands open.
D10 What's New content map has one populated version — make it a release
checklist item.

## 6. WHAT NOT TO TOUCH (verified best-in-class, protect)

The ED/safety machinery and its copy, verbatim. The streak model's
mechanics. The insufficient-data receipts. The 14-day trial length. The
calm register of notifications. The one-amber rule. The free on-ramp.
And nothing here proposes AI, a feed, punitive anything, or a change to the
free/Pro split.

## 7. SUGGESTED SEQUENCE IF BROADLY APPROVED

Wave A: Tier 0 groups A+B+C (one wave, guard-tested, ~25 S items).
Wave B: S1 coach memory + S2 forgiveness story (the two identity bets).
Wave C: S3 daily brief/runway + S5 plan-authoring spine.
Wave D: S4 mini-story/shares + Tier 2 in ranked order.
S6 instrumentation lands with Wave A and judges everything after.
