# Track 4b (child of coaching audit): cardio / contest countdown / notification voice

VERDICTS: cardio prescriptions explain WHY on change (escalate/hold/pause carry reason
clauses) but the steady-state dose note is static — "why 3 sessions" rationale lives in
code comments, never reaches the user; no expandable why for cardio unlike the calorie
row. Contest countdown: fail-closed rigorous (3 truthy-fail paths), process-only
checkpoints good, top-line countdown deliberately terse (Rule 5 blocklist) — named as a
UX cost, defensible. Notifications: genuinely coach-voiced and calm across the suite
(winback grounded in user's own session count, no shame anywhere); ONE generic string:
trainingReminders.js "Today's a training day" (deliberately generic, wiring-only fix
possible); budget fails OPEN by design (fine, must never be reused as a safety gate).

RANKED FIXES (presentation only):
1. (M) Cardio dose card gets a "why" line grounded in user's own trend/phase — compose
   at screen layer from existing engine outputs (CoachOutputScreen NextWeekCard pattern
   369-379; context already computed at 1566-1573).
2. (S) Icon-differentiate cardioFlag (caution) vs cardioAcknowledgement (positive) —
   currently identical rows (CoachOutputScreen 2278-2290).
3. (S) Training-reminder push references plan name (pass plan context at call site;
   trainingReminders.js:129-131 deliberately generic today).
4. (S) Countdown card one-line "why now" pairing checkpoint.detail with elapsed-prep
   framing (no urgency vocab, Rule 5).
5. (S) Wire existing cardioVerdictLabel() ('Done'/'Did some'/'Did less',
   cardioEngine.js:137-141) into the CoachOutput cardio row — pure helper, unrendered.

ELEVATION: steady-state cardio note references actual compliance ("3 again — you hit
3 of 3 last week"); countdown gains quiet "X weeks of prep logged" process fact;
missed-checkin follow-up grounds in one true data point like winback does; partner-
style personalisation extended to training reminder; cardio caution lines get a
tap-through showing the underlying number (highImpactSessions).
