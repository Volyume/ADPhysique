# WHAT VOLYUME ACTUALLY DOES

Written 2026-08-22 after I shipped false copy about the coaching
engine twice in one session, in opposite directions. Every claim below
is traced to code. This file exists so copy is checked against the
product rather than against an assumption, and so the next person
writing a sentence about "the coach" can find out what it really does
in one read.

Rule for using this file: if a line of user-facing copy makes a claim
about what Volyume does, it must be findable here. If it is not here,
it is not established, and the answer is to read the code and add it,
not to write the sentence anyway.

## 1. The session loop: what happens when you train

**Volyume suggests the weight. This is real and I got it wrong twice.**

`livePrescription.js` builds a per-set prescription and
`ActiveWorkoutScreen` seeds the entry box from it:
`live.prefill ? (live.weight ?? '')`, flagged `isGhost` and described
in that file's own comment as "the app's own suggestion, never
something the user typed". The user can type straight over it, and an
untouched ghost is re-seeded if an earlier set is edited.

The suggestion is DETERMINISTIC and rule-named, not learned. The rule
that fired is recorded as one of `PROVENANCE`:

- `FIRST_TIME_BAND` - no history, so a rep band only and no weight
- `MATCH_LOAD_ADD_REP` - same weight, one more rep than last time
- `LOAD_ADVANCE_RANGE_TOPPED` - topped the rep range, so the weight goes up
- `HOLD_BUILDING_RANGE`, `HOLD_EFFORT_UNKNOWN`, `HOLD_EFFORT_VERY_HARD`
- `LOAD_DROP_CONSECUTIVE_MISS` - missed the target twice, so the weight comes down
- `CURRENT_SESSION_STRONGER`, `CURRENT_SESSION_FATIGUE_ADJUST`
- `STABLE_BACKOFF_PATTERN`, `SENIOR_RECOVERY_HOLD`
- `USER_CHOICE_RESPECTED`, `INSUFFICIENT_EVIDENCE`

Read that list before writing anything about weights. It works from
the SECOND session (the first has no history to carry). It does not
get cleverer with volume of data, and it never judges the person.

Also in a session: rep targets and bands, rest timers (a live silent
countdown channel plus an end-of-rest alert that sounds and vibrates),
per-side logging as an opt-in per exercise (one rep count used for
BOTH sides, by founder ruling 2026-07-11), warm-up ramps, set types
(warm-up, cluster, myo-reps, drop set).

## 2. The weekly loop: check-in, then three suggestions

The weekly check-in (`WeeklyCheckInScreen`) asks: energy and
motivation, stress, average sleep hours, muscle soreness and which
muscles, joint or tendon pain (or, when a temporary change is active,
how training around it went), how you got on against your calorie
target, anything else to flag, and optionally a progress scan.

`runWeeklyCoach` (`weeklyCoach.js`, pure, no I/O) takes that plus the
morning-weight trend and training data, and produces exactly THREE
adjustment lanes:

- **training** - a volume signal: `push` | `hold` | `reduce`.
  Volume means SETS PER MUSCLE (`computeVolumeApply` in
  `coachApply.js` rewrites planned rows). It does not mean weight.
- **calories** - a new daily calorie target (`computeCalorieTargets`)
- **steps** - a step target

Nothing applies itself. Founder direction 2026-05-27: every adjustment
is a suggestion with an Apply button, and nothing changes until the
user taps (`markApplied` / `markDeclined`). Calories included, by the
2026-05-28 decision - there is no silent auto-apply anywhere.

The coach also emits `loadSignal` (`reduce` | `hold` | `progress`), a
direction on load progression that is stored on the output. It is NOT
a prescribed number and no screen turns it into one.

Other weekly outputs: `primary` (the top decision), `whyThisWeek`,
`deloadSuggested`, `dietBreakSuggested`, `heldDecisions` (a decision
the engine deliberately did not make, and why).

## 3. The block loop

`blockAdvisor.js` returns one of five actions: `continue`,
`heads_up`, `early_deload`, `in_recovery`, `post_recovery`. A recovery
week is roughly half the sets, same exercises, easy effort
(`computeDeloadVolume`, floored at `deloadFloor(mev)` so it never
falls under the minimum).

Volume landmarks are MEV / MAV / MRV per muscle (`planEngine.js`),
adjusted by experience, recovery, nutrition phase and age. THIS is the
part that genuinely improves with more logged sessions: block history
feeds adaptive landmarks and deload timing.

## 4. Nutrition

`nutritionEngine.js`: Mifflin-St Jeor or Katch-McArdle maintenance,
adaptive TDEE from the weight trend (`computeAdaptiveTDEEAdjustment`),
macro targets, a step-trend modifier.

Safety, tier-blind and never negotiable: calorie floors (1,500 kcal
men, 1,200 women), the fat-free-mass floor (30 kcal/kg), rapid-loss
and max-safe-loss gates, energy-availability caution, ED-pattern
detection and calm mode. These never consult tier and never soften.

## 5. Free and Pro

Binary, resolved from real trial or subscription state
(`proGate.js`, `PRO_BETA_ACTIVE = false`).

- **Free**: plan library, plan builder, workout logging, exercise
  library, personal bests, progress stats, and the whole capability
  and accessibility lane (CAP-19).
- **Pro**: everything nutrition and coaching - food diary, barcode,
  meal suggestions, targets and macros, the weekly check-in, Precision
  Coaching, division plans, wearables.

## 6. What copy may and may not say

MAY, because the code does it:
- Volyume suggests a starting weight from what you lifted last time
- it adds a rep, adds weight when you top the range, or eases the
  weight after two missed targets
- it suggests changes to your sets, calories and steps once a week,
  and nothing changes until you tap Apply
- more logged sessions improve how much training it gives you and when
  it schedules an easier week

MAY NOT, because it is false or banned:
- that it "sets", "chooses" or "decides" your weights as an authority.
  It suggests, from your own history, and you type over it
- that it "learns", "judges what suits you", or "gets better at
  understanding you". The engine is deterministic. No AI, ever
  (CLAUDE.md section 2). This phrasing is banned twice over: wrong
  mechanism, and an AI tell
- that anything applies automatically
- any physiological or health claim the engine does not compute
- prescribing different reps or loads per side. One rep count covers
  both sides, deliberately

## 7. The two errors this file exists to prevent

1. "The more you log, the better Volyume gets at setting your weights"
   - wrong: the weight suggestion is a fixed rule working from the
   last comparable session, not something that improves with data
   volume, and "gets better at" implies learning the engine does not do.
2. "No weight is ever prefilled or shown as a target" - also wrong,
   asserted while correcting the first. The ghost prefill is a real,
   central feature.

Both came from writing about a mechanism without reading it. Read
section 1 before writing about weights.
