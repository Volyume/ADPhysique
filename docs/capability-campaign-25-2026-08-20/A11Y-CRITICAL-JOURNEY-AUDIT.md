# CRITICAL TRAINING JOURNEY ACCESSIBILITY AUDIT (gap-closure Phase G; order section 22)

Scope: the critical end-to-end training experience (onboarding capability
step -> How you train -> Training considerations -> plan browse/install
-> Today -> start -> log sets -> rest timer -> swap/blocked flows ->
finish -> weekly check-in -> coach output). The FULL per-screen app audit
remains its own registered future campaign (the brief's boundary,
re-affirmed at traceability T14); this file audits the journey the
capability work rides.

Method: mechanism verification in source (cited), building on the CC32
implementation. CODE-VERIFIED means the mechanism exists and is tested
where a suite covers it; DEVICE-PENDING means journey F of
PHYSICAL-VALIDATION-BACKLOG.md must confirm it on hardware with TalkBack/
VoiceOver before the matrix A11Y gates convert. Nothing here claims
device-verified behaviour.

## Visual (screen reader, labels, focus, state)

- Labels/roles on the journey's interactive elements: CODE-VERIFIED.
  ActiveWorkoutScreen carries 49 explicit accessibilityLabels; the picker
  17; check-in 23; the settings surfaces ride SettingsPrimitives'
  labelled rows; TrainingConsiderations ships labelled rows/buttons and
  an announced detail-mode change (built this workstream).
- State announcements: CODE-VERIFIED. Picker unavailable-notices announce
  on both platforms + Android live regions (CC32); How you train
  announces the fail-closed notice (HowYouTrainScreen.js:94); rest timer
  announces start ('Rest timer started', RestTimer.js:313).
- Modals on the journey: the add flow is INLINE by construction (no
  Modal, 33.18); the mid-workout sheet is a native alert (33.18 verified
  at CC32 close).
- No colour-only information on the capability surfaces: CODE-VERIFIED
  by construction (text labels accompany every state chip built this
  workstream).
- DEVICE-PENDING: focus order through the logger, VoiceOver behaviour on
  the set list (RN FlatList ordering is documented-broken upstream, R4),
  Dynamic Type at large sizes.

## Motor and dexterity (targets, one-handed, alternatives)

- Steppers carry the adjustable trait with increment/decrement actions
  and bounds-guarded handlers (CC32, Stepper.js): CODE-VERIFIED.
- Rest timer controls are buttons, not gestures; countdown is
  non-time-critical to operate (CC32): CODE-VERIFIED.
- Drag/long-press/swipe-only interactions on the journey have button
  alternatives (CC32 sweep): CODE-VERIFIED; DEVICE-PENDING for feel.
- One-handed operation: nothing on the journey requires simultaneous
  touches; new surfaces use full-width rows with 44pt minimum heights
  (TrainingConsiderations styles): CODE-VERIFIED.
- No timed taps anywhere on the journey (logging never expires):
  CODE-VERIFIED by construction.

## Hearing

- Rest timer end and countdown carry THREE channels: visual (in-screen +
  notification), haptic (restCountdown/restDone), audio - audio is never
  the sole channel (CC32; RestTimer.js:298 graceful fallback):
  CODE-VERIFIED.
- No audio-only cues exist on the journey; the app ships no
  instructional media, so captions are structurally n/a (recorded in the
  matrix as such).

## Cognitive and learning

- Onboarding capability cards: one idea per card, no memory burden,
  first-class skip (CC28, COGA basics): CODE-VERIFIED.
- Plans repeat weekly by design; the logger surfaces one exercise at a
  time; nothing on the journey is time-pressured: CODE-VERIFIED by
  construction.
- Plain-language pass over the new gap-closure copy: enforced
  mechanically for directory strings (schema wording validator) and by
  the calm-voice review for screens (this workstream's diffs).
- The learning_disability directory profile records the delivery
  guidance (consistent flow, supporter setup) that the product already
  satisfies structurally.
- HONEST LIMIT: real-user comprehension can only ever be shown by real
  users; no code check substitutes. Not a required action (GC-D12) -
  recorded so no comprehension claim is made without it.

## Residuals (honest)

1. Journey F device walk (TalkBack + VoiceOver + Switch Access spot
   checks) is REQUIRED before any A11Y matrix cell converts - device
   action C.
2. Whole-app audit beyond the journey stays a registered future
   campaign; unrelated screens carry no new claims.
3. expo-video subtitle support (R4) stays moot while no media ships.
4. Large-text reflow on dense stats surfaces (HomeScreen cards) is
   outside the critical journey; noted for the whole-app campaign.
