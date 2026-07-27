# Final pre-release sweep — 2026-07-27, audit findings and lead rulings

Founder order (verbatim): "I want you to do a full adversarial audit of the
entire app and try and find and then fix any issues in any area at all. Make
sure the app is error proof and bullet proof. Spawn lower level sunnet agents
for all big reads and writes as per claude.md then do the decision making
yourself. Make sure all sizings are right, boxes fit data right data entry
areas are consistent and visible and functional, keyboard timings are right and
things like that and fix anything that will be an annoyance for the end user.
This is a final sweep before we release. Sweep the app completely and make sure
every area is best in class and better than all other competition."

Four read-only audit agents swept distinct lanes: share cards (landed
separately, see share-card-audit-2026-07-27.md), data entry and keyboard,
layout and sizing, and runtime crash safety. Every finding below was verified
by the auditing agent against the actual source, not inferred from a name.

Decisions are lead-ruled under D33 on one criterion: the best result for the
app and its users, never on effort. Section 2 inviolables remain binding and
none is weakened by any ruling here.

---

## LANE A — DATA ENTRY AND KEYBOARD

### A1 — Centralise the numeric Done bar in TextField. RULED: DO IT.

iOS `number-pad` and `decimal-pad` have NO Return key. Roughly thirty numeric
fields across the app therefore have no way to dismiss the keyboard, including
the daily weigh-in, the whole Pro onboarding funnel, every food sheet, and the
body-metrics form. `src/components/SetEntry.js` was already fixed with an
`InputAccessoryView` Done bar and is the reference implementation.

The audit flagged "centralise vs patch each site" as a human decision. Ruled:
centralise. `src/components/TextField.js` is the shared base nearly every one
of those screens already builds on, so one change fixes the whole class
consistently, and a per-screen patch guarantees the next new field is born
broken. Auto-enable the accessory whenever `keyboardType` is `number-pad` or
`decimal-pad`, with an opt-out prop for any caller that supplies its own.

iOS only. `InputAccessoryView` is a no-op on Android, which has its own back
gesture, so Android behaviour must be unchanged.

### A2 — keyboardShouldPersistTaps. RULED: FIX.

A `ScrollView` containing inputs without `keyboardShouldPersistTaps="handled"`
eats the first tap on a button: the user taps "Log", the keyboard closes, and
nothing happens until they tap again. Confirmed on the Home scroll view that
hosts the daily weigh-in and on the body-metrics form. Fix both.

### A3 — Dead `returnKeyType`/`onSubmitEditing` on numeric pads. RULED: REMOVE.

Several numeric fields set `returnKeyType="done"` and an `onSubmitEditing`
handler that can never fire, because those keyboards have no Return key. It is
inert code that reads as though dismissal is already solved, which is exactly
how the problem survived this long. Remove it, or comment why it stays.

### A4 — Focus chaining between sibling fields. RULED: FIX where free.

Feet to inches, stone to pounds, MEV to MAV to MRV, email to password: none
chain. Add `returnKeyType="next"` plus an `onSubmitEditing` ref hop on
text-keyboard fields where the Return key genuinely exists.

### A5 — LoginScreen. RULED: FIX IN PLACE, do not swap the component.

The email field does not advance to password on Return, and the password field
has no show/hide toggle, though `src/components/auth/EmailPasswordFields.js`
implements exactly that and is unused. Ruled: add the focus hop and a
visibility toggle to LoginScreen directly rather than swapping the whole form
component. This is the primary sign-in funnel days before App Review; the
user-visible gain is identical and the blast radius is far smaller. The
duplication is real and is recorded as follow-up, not silently ignored.

### A6 — ProgressPhotoViewer note editor. RULED: FIX IN PLACE.

A bespoke `Modal` rather than the shared `BottomSheet`: no
`KeyboardAvoidingView`, no backdrop-tap dismiss, and a multiline field whose
Return inserts a newline, so on iOS there is no guaranteed way out. Ruled: fix
all three user-visible faults in place (keyboard avoidance, backdrop dismiss, a
Done affordance). The full migration onto `BottomSheet` is the tidier
architecture but is a larger diff on a Pro photo surface immediately before
release; it is recorded as follow-up. This is a risk judgement, not an effort
one: every symptom the user actually hits is fixed now.

### A7 — Freeform date fields. RULED: VALIDATE.

Body-metric date and the prep-countdown date are plain text with no calendar
validity check. "2026-13-45" can coerce to a real but wrong date, so a mistyped
date lands silently in history. Add explicit calendar validation and a calm
message.

---

## LANE B — NUMERIC CORRECTNESS (lead-owned, safety-adjacent)

### B1 — Decimal comma silently truncates. RULED: FIX AT THE CHOKE POINT.

`parseFloat("82,5")` returns `82`. Nothing in the codebase normalises a comma
decimal. On a device regioned to a comma-decimal locale the iOS `decimal-pad`
renders a comma key, so a user typing "82,5" kg stores 82 kg. The range
validators then pass it, because 82 is a perfectly plausible weight, so the
corruption is never caught.

This is the most serious finding of the sweep. Body weight feeds
`nutritionEngine.js` through BMR, so a silently truncated weight propagates
into calorie and macro targets. Fix at the lowest shared parse point so every
caller inherits it, and normalise rather than reject: the user typed a number
their keyboard offered them, and refusing it would be punishing them for their
device region.

Handled by the lead, not delegated, because it is ED-safety adjacent. No floor,
gate or threshold changes: this only ensures the engine receives the number the
user actually typed.

### B2 — Controlled numeric inputs snap back mid-edit. RULED: FIX.

`onChangeText={v => setX(parseInt(v) || x)}` on a controlled input means
clearing the field restores the old value instantly, so it cannot be cleared
and retyped; and typing "2." collapses to "2" before the next digit lands, so a
fractional value cannot be entered at all. Confirmed on the workout builder's
reps and starting weight, and on recipe ingredient quantity. Hold the raw
string in state and coerce only at save time, exactly as `SetEntry.js` does.

---

## LANE C — RAW ERROR MESSAGES REACHING USERS

### C1 — Plan rebuild. RULED: FIX.

`plan_engine_error` text is interpolated straight into a user-facing toast, and
the raw exception message reaches the user during a failed "Adjust training"
rebuild. CLAUDE.md Section 3 requires a calm toast and never a raw technical
message. Log the real error with `logError` and show fixed calm copy.

### C2 — Snapshot restore. RULED: FIX.

The raw native FileSystem error string is shown mid-way through a destructive
"this replaces ALL current data" flow. The equivalent JSON-backup path already
uses calm generic copy. Match it.

---

## LANE D — LAYOUT AND SIZING

### D1 — Accessibility text overflows fixed containers. RULED: FIX.

The kcal number on the Eat ring renders through a single-line `TextInput` that
cannot wrap, inside a hard-coded 132pt circle, with no font-scale ceiling at
any call site, though the component's own documentation recommends one for
exactly this case. At a large OS text size the number spills out of the ring on
the most-viewed screen in the app. Cap the multiplier there and on the
workout-summary tonnage hero.

### D2 — Toast overlaps the tab bar. RULED: FIX.

The toast host is pinned at a fixed `bottom: 80` while the real tab bar is
`49 + insets.bottom`, which is 83pt on every notched iPhone, so the toast
already sits inside the tab bar, and worse on Android three-button navigation.
`PRCelebration.js` was fixed for the equivalent problem at the top of the
screen; apply the same treatment using the real safe-area inset. The toast is
the most frequently shown element in the app, so this is worth getting exactly
right.

### D3 — Analytics hero row cannot wrap. RULED: FIX.

`heroValueRow` has no `flexWrap`, and its numeral is a `TextInput` that cannot
shrink, so a large tonnage or a large text size pushes the trailing unit off
screen. The equivalent row in `PartnerScreen.js` already sets `flexWrap`.

### D4 — Plan name capping. RULED: SPLIT THE DECISION.

The audit asked whether to cap plan names at two lines everywhere. Ruled: cap
the Plan Library CARD at two lines so cards stay uniform, and leave the Plan
Detail heading uncapped. A list card is a fixed-rhythm element where a long
name breaks the grid; a detail page heading is that page's title and should
show the user's full chosen name. Same field, different jobs.

### D5 — Body-metrics form labels. RULED: LET THEM WRAP.

A fixed 140pt label column with `numberOfLines={1}` truncates measurement
labels at large text sizes, and "Left forea…" sits next to the field the user
is about to type a measurement into. Legibility of the label beats the form's
visual rhythm. Remove the fixed width and allow a second line.

### D6 — RollingNumber's font-scale prop. RULED: KEEP IT OPTIONAL.

The audit asked whether it should become required. No: fixing the call sites
delivers the entire user-visible benefit, and forcing the prop on every caller
is churn with no further gain.

### D7 — Off-scale spacing literals. RULED: FIX, LOW PRIORITY.

Cosmetic token drift with no functional risk. Mechanical alignment pass; must
not be allowed to displace anything above it.

---

## VERIFIED CLEAN — recorded so it is not re-litigated

- Hard-coded colours: essentially zero across every screen and component.
- `numberOfLines` used in 93 files; all three shared headers cap correctly.
- No sub-44pt touch target found in the sampled set.
- 320pt rows in Pro onboarding and nutrition targets wrap correctly.
- Long exercise-name rows in the active workout and routine detail are built
  correctly for overflow.
- Crash safety: no triggerable unguarded `.map`/`.filter`/`.reduce`/division on
  persistence-boundary data. Every candidate traced was already guarded, most
  with regression tests. The `withSetsArrays` class of bug did not recur.

## NOT CHANGED

- The coaching engine: untouched and deterministic.
- ED-safety: untouched except where strengthened. No floor, gate, threshold or
  suppression is weakened.
- GDPR/Article 9 consent gate, EU residency: untouched.
- Billing, product IDs, identity, free/pro gating: untouched.
- No new dependencies.

---

## OUTSTANDING AT FIRST LANDING — surfaced, not parked

The first wave landed A1-A3, B1-B2, C1-C2 and D1-D5, plus the share-card
lockup work. The items below were RULED "FIX" and then not built in that wave.
Recording them here rather than letting them sit silently, per Section 4.
Second wave dispatched 2026-07-27 to close them.

### Share cards (authority: share-card-audit-2026-07-27.md)
- **R6/H5** story layout wastes 30-40% of the canvas; distribute the content
  block around the vertical centre as drawBeforeAfter already does.
- **R8/M5** hard-coded 'kg' on the session card and recap payload; thread units
  through. `src/__tests__/p15UnitDisplayCopy.guard.test.js` pins the current
  string and must be updated in the same change.
- **M2** two-line truncation drops the tail with no ellipsis; append an ellipsis
  when wrapText returns more lines than the cap.
- **M3** plan name and eyebrow are drawn with no width fit and no clip; wrap in
  fitFont as the weekly hero label already does.
- **R10/M7** the before/after card - the ONLY Pro card and the only one
  carrying bodyweight - has no rendered-output coverage in
  `scripts/render-share-card.cjs` or drawShareCard.test.js. Add square,
  portrait and story cases. Delete the dead `premium` fixture key.
- **R9/M9** share entry-point and action copy is inconsistent; standardise
  entry points on "Create share image", actions on "Share image" / "Save to
  gallery".
- **R9/L5** `AnalyticsScreen.js:47` "A year of showing up. Few do that." is a
  comparison against other people on a card family whose stated principle is
  never a comparison to others. Drop the second sentence.
- **R11/M4** the Date toggle is dead on the streak and Year-of-Lifts milestone
  cards; default the date in buildParams rather than patching seven call sites.
- **R11/L2** a zero-work session is still shareable; hide the action at 0
  working sets.
- **R11/L3** stat boxes stretch to fill the row so proportions differ card to
  card; fix the box width and centre the row.
- **R11/L4** fixed cache filenames mean consecutive exports overwrite in the
  cache dir; append a timestamp.
- **M8** the footer hugs the bottom edge on square (19px against a 74px side
  pad); give the last footer element at least `pad * 0.5` clearance.

### Keyboard (authority: LANE A above)
- **A4** no focus chaining between sibling fields (feet/inches, stone/lbs,
  MEV/MAV/MRV). Add returnKeyType="next" + an onSubmitEditing ref hop on
  TEXT-keyboard fields only.
- **A5** LoginScreen: no email-to-password hop and no password visibility
  toggle, though `src/components/auth/EmailPasswordFields.js` implements one
  and is unused. Fix IN PLACE per the ruling; do not swap the component.
- **A6** ProgressPhotoViewer's note editor is a bespoke Modal with no
  KeyboardAvoidingView, no backdrop-tap dismiss, and a multiline field whose
  Return inserts a newline - on iOS there is no guaranteed way out. Fix all
  three IN PLACE per the ruling; do not migrate to BottomSheet.
- **A7** freeform date fields accept a syntactically parseable but invalid date
  ("2026-13-45"). Add explicit calendar validation and a calm message.
