# Cardio integration audit - Phase 3: Competitor experience research

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only.
Honesty note: where a finding is a sourced fact it is cited; where it is a
reasoned synthesis across sources it is labelled "synthesis". No user quotes
are invented; cited reviews/threads are linked.

---

## 1. The competitive map, by model

Two questions decide where Volyume should sit: (a) prescribed vs user-selected
cardio, (b) how cardio feeds the calorie/coach loop.

| App | Cardio model | Where cardio lives | Logged data | Calories → target | Coach use | Can non-cardio users ignore it? |
|---|---|---|---|---|---|---|
| **MacroFactor** | Energy-balance, no activity log | Nowhere as a session; absorbed by weight trend | none | **Not added** (trend absorbs) | Expenditure auto-adjusts | Yes, fully ([MF](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)) |
| **Carbon Diet Coach** | Diet-coach; activity via steps/check-in | Check-in inputs | activity level | Adjusts targets from results | Weekly adjustment | Yes |
| **Caliber** | Strength-led, cardio synced | Synced sessions + body stats | wearable cardio | wearable-driven | Coaching plan | Mostly ([BarBend](https://barbend.com/caliber-fitness-app-review/)) |
| **Future / Trainerize / TrueCoach** | Human coach assigns | Coach-built sessions in the plan | as coach defines | manual | 1:1 coach | Depends on coach |
| **RP Hypertrophy** | None | n/a | none | n/a | n/a | n/a (absent) ([dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/)) |
| **Hevy / Strong / Fitbod** | Strength log; weak cardio | A logged "cardio" entry, minimal | duration maybe | no coach loop | none | Yes |
| **Strava / Garmin / Apple** | User-selected activity-first | First-class activity feed | full (GPS/HR/dur) | n/a (not a diet app) | training-load metrics | n/a (cardio is the point) |

**Reading:** nobody combines (a) physique-grade lifting + (b) an opt-in,
user-selected cardio log + (c) an energy-balance coach that uses cardio as a
*target* lever without double-counting calories. That intersection is open, and
it is exactly where Volyume already sits minus the cardio library and log.

---

## 2. Where cardio lives, per app, and the lesson for Volyume

- **MacroFactor**: cardio is invisible by design; the scale tells the story.
  *Lesson:* Volyume's calorie side should stay energy-balance; cardio kcal is
  feedback only. ([MF wearables](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker))
- **Strava/Garmin/Apple**: cardio is a first-class, user-chosen activity from a
  broad library (Strava 50+ types). *Lesson:* the selection model is a browsable
  library, never a prescription. ([Strava types](https://support.strava.com/hc/en-us/articles/216919407-Supported-Sport-Types-on-Strava))
- **Caliber**: strength-first app that *adds* cardio + nutrition and syncs it,
  but reviewers say it is weak for cardio-centric users. *Lesson:* a lifting app
  can hold cardio as a secondary surface without becoming a cardio app, and
  should not over-promise. ([BarBend](https://barbend.com/caliber-fitness-app-review/))
- **RP Hypertrophy**: a flagship hypertrophy app with **no cardio at all**;
  users note the absence. *Lesson:* there is unmet demand among exactly
  Volyume's audience. ([dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/))

---

## 3. Praise and complaints (sourced) and what they imply

- **Praise for autonomy:** self-selected cardio yields more enjoyment and
  adherence than prescribed; "the one you'll do consistently" wins
  ([Tailored Coaching Method](https://tailoredcoachingmethod.com/the-ultimate-guide-to-cardio-for-fat-loss/),
  [PMC11843731](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11843731/)).
  *Implication:* Volyume's user-led principle is a feature to lean on, not a
  compromise.
- **Complaint about lifting apps lacking cardio:** RP/Hevy/Strong users keep a
  second app for cardio ([Setgraph](https://setgraph.app/ai-blog/best-gym-app-reddit),
  [dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/)).
  *Implication:* a minimal opt-in cardio log is a retention win.
- **Complaint about double-counted exercise calories** (general to MyFitnessPal-
  style apps): adding back exercise calories encourages over-eating and is
  inaccurate because of compensation; MacroFactor markets the opposite as a
  selling point ([MF expenditure](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).
  *Implication:* do NOT add cardio kcal to the day's target. Strong, evidence-
  backed differentiator.
- **Complaint about prescription rigidity (synthesis):** coached apps that
  assign specific sessions can feel restrictive for users who already have a
  cardio they like; autonomy research backs letting them choose
  ([PMC8735821](https://pmc.ncbi.nlm.nih.gov/articles/PMC8735821/)).
  *Implication:* coach sets the target, never the activity.

---

## 4. Recovery handling across apps

- **Garmin/Whoop**: physiological recovery (HRV, sleep) drives readiness and a
  "training load" balance of cardio vs strength. Volyume deliberately keeps
  HR/HRV/sleep out of scope (`BACKLOG.md:19`), so it cannot copy this; it must
  derive cardio recovery cost from the **activity's classification** (Phase 2
  §5) plus its own session soreness/fatigue EMAs.
- **Most diet/lifting apps**: no cardio-specific recovery handling at all.
  Volyume's existing recovery EMA + the proposed per-activity impact flag would
  put it ahead of RP/Hevy/Strong here without needing a wearable.

---

## 5. "Invisible unless opted in" benchmark

MacroFactor, Hevy, Strong all let a non-cardio user ignore cardio entirely.
Volyume's CLAUDE design rule ("ship what's there or hide it") demands the same:
a lifter who never opts into cardio must see zero cardio UI in Plans,
check-in, Diary, or onboarding beyond the single opt-in question. This is a
table-stakes benchmark, not a nice-to-have.

---

## 6. Net competitive conclusion

Volyume should build the **selection UX of the activity-first apps** (browsable,
user-chosen library, favourites) on top of the **calorie philosophy of
MacroFactor** (energy balance, no added exercise calories), wrapped in its
**existing coach-as-targets, confirm-then-apply** contract, and kept **fully
optional**. That combination is not offered by any single competitor and is a
natural extension of what Volyume already runs.
