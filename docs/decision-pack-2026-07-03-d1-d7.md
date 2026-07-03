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
