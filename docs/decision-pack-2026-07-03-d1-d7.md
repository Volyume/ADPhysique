# DECISION PACK D1-D7 (2026-07-03) — options for the founder's own words

Per the usability directive: these block or shape approved work. Nothing
below is actioned. Each decision lists options, what each implies, and a
recommendation where one is honest. Evidence lives in
docs/world-class-audit-2026-07-03/ (tracks 02, 03, 04a, 05).

## D1 — Home food quick-log (you removed the TodayStrip food cell 2026-06-30)

The fact: every food log now starts with a tab switch; it is the most
frequent action in the app (every meal, every day). The old cell is NOT
being re-added; the question is whether a leaner shape earns its place.

- OPTION 1 "Log lunch" deep-link chip: one compact Pro-gated chip on the
  Home hero area showing the CURRENT inferred meal slot by time of day
  ("Log lunch"). Tap opens FoodSearch already scoped to that slot with
  Add-again/usuals on top. It displays NO numbers, no calories, no progress
  — pure verb, no valence, nothing ED-adjacent on the semi-public Home.
  One tap saves the tab switch; two taps to a logged repeat meal.
- OPTION 2 same chip but inside TodayStrip (where weight/cardio live), so
  Home's hero stays training-only. Slightly less prominent, most consistent
  with the existing strip grammar.
- OPTION 3 leave as-is. The Diary tab is one tap; the cost is real but
  bounded, and Home stays purely about training.

Recommendation: Option 2 — it restores the shortest path without putting
food on the training hero, and shows nothing but a verb. But the removal
was yours and the reasoning was not recorded; if the reason was "no food
surface on Home at all", Option 3 stands and we record that rule.

## D2 — Session-start intent modal (fires every start, feeds coaching input)

The readiness answer (Sharp / Average / Below par / Skip) feeds
sessionAdjustments, so each option changes what the coaching sees:

- OPTION A remember-skip toggle ("Don't ask each time") in the modal.
  Implication: users who opt out send NO readiness signal; session tweaks
  simply never fire for them (engine unchanged — absent input means no
  adjustment, same as tapping Skip today). Honest, reversible per user.
- OPTION B inline chip row on the hero card (no modal, no confirm tap;
  Start begins immediately with Average assumed unless a chip was tapped).
  Implication: keeps a signal for everyone but introduces an ASSUMED
  "Average" — the coaching would sometimes act on a readiness the user
  never actually stated. I flag this as the risky option: it fabricates
  input. A variant that assumes NOTHING unless tapped avoids that, and is
  the version I would put forward.
- OPTION C leave as-is: highest-quality signal, but a forced 2-tap gate at
  the moment of highest motivation, every single session, forever.

Recommendation: Option A. It never fabricates coaching input and respects
the user who has decided the question is not for them. The toggle lives in
the modal itself and in Settings > Coaching.

## D3 — Seven banner types compete for Home's one slot

- OPTION 1 merge the three commercial/informational types (trial-value
  ledger, free-tier weekly line, differential badge) into ONE "worth your
  attention" card class with internal priority; the four coaching-signal
  types (coach review, deload/recovery, phase mismatch, plateau) stay
  distinct because each has its own action. Cuts the state machines from
  seven to five with no lost information.
- OPTION 2 full generic card (one component, seven content variants).
  Cleanest long-term, biggest one-time churn, needs a design pass.
- OPTION 3 leave; revisit when an eighth banner is proposed.

Recommendation: Option 1 now, Option 2 only if a redesign wave ever opens
the Home hero anyway.

## D4 — The streak strip's unlabelled "missed" glyph

The 12-week strip's on-screen key lists Kept / Recovery / Covered / Paused
but not the hollow "missed" glyph. Reading the code and the no-shame design
language, this looks deliberate (never label a miss); the audit agreed it
may well be correct as-is.
- OPTION 1 confirm deliberate: add a code comment recording the rule; no UI
  change ever.
- OPTION 2 add a neutral key entry with calm wording ("Quiet week") so
  sighted users are not left guessing.
Recommendation: Option 1, recorded in your words.

## D5 — Rest-day framing rule

Home always shows the NEXT session (plan round-robin; there is no
calendar-based rest day), so an off day never reads as a miss. Confirm this
stays the standing rule so all future copy (including the A2 rest-day
notification from the earlier directive) can rely on it. Yes/no.

## D7 — ED-flag asymmetry on GoalChangeSummaryScreen (surfaced, not proposed)

ProSetupCompleteScreen checks getOpenEdPatternFlag before showing dated
weight-adjacent copy; GoalChangeSummaryScreen shows deficit-phase framing
("You're entering a controlled calorie deficit...") and the 8-week
diet-break notice with NO equivalent check. Per the ED rules this is yours
to triage, not mine to fix. The symmetrical treatment would be the same
suppression ProSetupComplete uses; saying nothing is also a choice if the
screen is judged different in kind (it renders only after a deliberate
goal edit). Decision requested: suppress like ProSetupComplete / leave as
is / something else in your words.

(D6 media and D9 quiz-first stay held per your directive; D10 is now a
release-checklist process line — no decision needed.)

---

## FOUNDER RESPONSE RECEIVED (2026-07-03, recorded verbatim in substance)

- D2 DECIDED: Option A remember-skip toggle (modal + Settings > Coaching).
  Rule of record: never fabricate coaching input; opt-outs send no readiness
  signal and session adjustments simply do not fire (identical to Skip,
  engine untouched). Toggle copy states plainly what is lost, calm register;
  re-enabling restores the modal next session. Test required: absent input
  produces NO adjustment rather than a default.
- D3 DECIDED: Option 1 — merge trial-value ledger + free-tier weekly line +
  differential badge into one "worth your attention" card class; the four
  coaching-signal banners stay distinct. Condition: the merged card's
  internal priority order is written explicitly in the plan AND recorded in
  the component. Option 2 not while E1 is in flight.
- D5 CONFIRMED: Home always shows the next session; plan is round-robin; no
  calendar rest day. Standing rule for all future copy. ATTACHED CONDITION:
  the A2 rest-day surface must be re-specified before build — its trigger
  derives from the reminder schedule and recent-session state and must NEVER
  assert "today is your rest day" as a plan fact. A revised A2 decision pack
  (trigger + copy) goes to the founder before any build.
- D1 OPEN: the founder's option choice (2 or 3) and his recorded reason for
  the 2026-06-30 removal arrived as unfilled [AL] slots. No action until his
  words land. If Option 2 ever proceeds: chip hidden (not locked) on free.
- D4 OPEN: option choice and the calm word arrived as unfilled [AL] slots.
  Non-negotiable already accepted: the glyph gets an accessibilityLabel with
  his chosen word regardless of the visual choice.
- D7 OPEN: suppress/leave/other arrived as an unfilled [AL] slot. If
  suppression is chosen: the ProSetupComplete getOpenEdPatternFlag pattern
  is the spec, STRONG model, locked-voice review, ED regression tests.
- D6/D9 remain HELD; D10 done as a checklist line. Model tiering: D7 and
  the intent-modal coaching-input contract are STRONG; chip/banner/glyph
  are FAST with STRONG review.

## SLOTS RESOLVED (founder delegated wording, 2026-07-03: "take my decision
## and use words relevant")

- D1 DECIDED: Option 2. Recorded rule of removal (2026-06-30) and the rule
  going forward: Home never carries food NUMBERS or food progress — the old
  cell showed calories on the app's most-seen surface and pulled Home away
  from training. A pure verb chip ("Log lunch") carries no number, no
  progress, no valence, so it does not break that rule. Chip lives in
  TodayStrip, deep-links to FoodSearch scoped to the inferred slot, HIDDEN
  (not locked) on free. Build queues behind the Wave A agent lane (shared
  files).
- D4 DECIDED: Option 1 — no visual key entry for the missed glyph (the
  no-shame rule: a miss is never labelled on screen), recorded as a code
  comment; the glyph carries accessibilityLabel "Quiet week" so screen-
  reader users are never handed an unlabelled state.
- D7 DECIDED: suppress. GoalChangeSummary performs the same
  getOpenEdPatternFlag check ProSetupComplete does; under an open flag the
  deficit-phase framing and the 8-week diet-break notice give way to the
  neutral register while the goal-change receipt itself stays honest. The
  ProSetupComplete pattern is the spec; ED regression test pins it.
- A2 note: the revised rest-day pack (schedule-truth trigger + copy) still
  awaits its own explicit word — a NOTIFICATIONS_LOCKED deviation is not
  folded into a general wording delegation.
