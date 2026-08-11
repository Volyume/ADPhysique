# Campaign 7 — WS-11: H4 store correction pack

**H4 REMAINS OPEN.** Nothing here has been published. The repository
cannot see either console, so repo copy is not proof that the LIVE
listings say these things — it is the best available evidence of what
was pasted. The founder must open both consoles, compare, and apply.

## What is actually true in the shipping product (verified in code)

- **Cardio logging does not exist.** Removed 2026-06-25/07-01 (D95
  reconfirmed); no cardio route, screen, writer or permission ships.
  Legacy `cardio_log` rows are retained as history only.
- **Steps are not a shipped coaching input.** `weeklyCoach.js:624,1280`
  — the only production call site passes `stepsEnabled: false`, and the
  code comment says so verbatim ("not part of the shipped coaching
  product"). Any listing bullet promising step targets/adjustment is
  as false as the cardio ones.
- Both repo listing drafts already carry a **"STALE ON CARDIO — DO NOT
  PASTE"** banner (`docs/PLAY_STORE_LISTING.md:3`,
  `docs/APP_STORE_CONNECT_LISTING.md:3`), so the drafts were caught;
  the live consoles are the open question.

## Google Play — exact corrections

| # | OLD CLAIM (repo draft line) | NEW CLAIM | WHERE | WHY |
|---|---|---|---|---|
| P1 | *"Precision Coaching then adjusts your calories, steps, cardio and training volume…"* (`:51`) | *"Precision Coaching then adjusts your calories and training volume, and tells you exactly what changed and why."* | Play Console → Main store listing → **Full description** | Cardio does not exist; steps are not a coaching output (`stepsEnabled:false`) |
| P2 | *"Track steps and cardio alongside your lifting."* (`:54`) | *"See your morning weight trend, body metrics and progress photos in one place."* (delete the sentence) | Full description | Neither is shipped |
| P3 | *"Food diary, macros, nutrition targets, cardio, steps, weekly check-ins and Precision Coaching."* (`:66`) | *"Food diary, macros, nutrition targets, weekly check-ins and Precision Coaching."* | Full description (subscription paragraph) | Same |
| P4 | *"Log cardio too, and see the energy it cost."* (`:159`) | delete the sentence | Full description (nutrition paragraph) | Same |
| P5 | Whole **"Cardio (Pro)"** feature block: *"Log any cardio session with duration and effort, and see the energy it cost"* (`:212-213`) | delete the entire block | Full description (feature list) | A feature bullet for a removed feature is the clearest H4 breach |
| P6 | Short description / title variants, IF any mention cardio | remove the word | Short description; any live Store Listing Experiment | Same |

## Apple App Store — exact corrections

| # | OLD CLAIM | NEW CLAIM | WHERE | WHY |
|---|---|---|---|---|
| A1 | Any cardio mention in the **description** (the repo draft's cardio prose was already flagged stale; the live text must be read in App Store Connect) | remove cardio sentences/bullets | ASC → App Information → **Description** | Feature does not exist |
| A2 | Any cardio/steps mention in **subtitle** or **keywords** | remove; do not substitute a new claim | ASC → Subtitle / Keywords | Keywords for absent features also mislead |
| A3 | *"Health Information (body weight, measurements, entered body fat, **cardio, steps**, check-ins)"* (`:336`) | *"Health Information (body weight, measurements, entered body fat, check-ins)"* | ASC → App Privacy → data types | See declarations below |

## Screenshots / captions

- **Any screenshot showing a cardio screen, a cardio log entry, a cardio
  row in the diary, or a caption naming cardio must be replaced.**
  Impact: if such a screenshot exists it cannot simply be re-captioned —
  the UI it shows no longer exists in the app, which is an independent
  misrepresentation.
- Same test for a steps-target screenshot.
- Replacement candidates that are truthful today: the volume screen
  (now showing per-muscle provenance captions), the coach decision
  card, the food diary, the block-start explanation.
- **Not generated here** — the order says do not produce final store
  screenshots unless asked.

## Data declarations — does cardio removal change them?

- **Google Play Data Safety:** the repo matrix row (`:306`) lists
  *"Body weight, measurements, body fat, steps, cardio, progress photo
  metadata…"* under Health & fitness. Cardio and steps should be struck
  from the **description of what is collected**, but the **Health &
  fitness category itself still applies** (body weight, measurements,
  check-ins). So: edit the wording, do **not** remove the category.
- **Apple App Privacy:** identical treatment — keep *Health & Fitness*,
  strike cardio/steps from the enumerated types (A3).
- **No other declaration changes follow from cardio removal.** Retained
  legacy `cardio_log` history is user data the user can still export
  and delete, so nothing becomes under-declared by removing the
  forward-looking claim.

## Verification steps for the founder

1. Play Console → Main store listing: search the full description for
   "cardio" and "steps". Apply P1-P6. Save.
2. Play Console → App content → Data safety: apply the wording change.
3. ASC → your app → Description/Subtitle/Keywords: search for "cardio",
   "steps". Apply A1-A2. Save (takes effect with the next version).
4. ASC → App Privacy: apply A3.
5. Both stores → Screenshots: confirm none shows cardio or step targets.
6. Report back which of the six/three items were actually present live.
   **Only that confirmation closes H4.**

**Status: H4 PREP COMPLETE. H4 NOT RESOLVED.**
