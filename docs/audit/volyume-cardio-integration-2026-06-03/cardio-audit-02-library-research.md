# Cardio integration audit - Phase 2: Cardio library research

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only.
Method note: single-session web research, no sub-agents. Sources cited inline.
MET caveat: representative values below are the canonical 2024 Adult
Compendium ranges; **each seed row's exact MET + activity code must be
verified against pacompendium.com at seed time** (a QA step named in Phase 5).
Volyume MET values are not fabricated here, they are the standard published
figures, flagged for verification rather than presented as line-read.

---

## 1. Priority question: user-selected vs prescribed cardio

**The evidence favours user-selected activity, coach-set targets.**

- **Self-selected beats prescribed for adherence and enjoyment.** A controlled
  trial on self-selected vs prescribed aerobic intensity found self-selection
  produced greater pleasure/affect, which predicts adherence
  ([PMC11843731](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11843731/)).
  Autonomy/choice trials show the same: behaviour driven by external
  prescription rather than autonomous choice is harder to sustain
  ([PMC8735821](https://pmc.ncbi.nlm.nih.gov/articles/PMC8735821/),
  [NCT03576924](https://clinicaltrials.gov/study/NCT03576924)).
- **Coaching consensus: pick what the client will actually do.** "The best
  cardio for fat loss is the one you'll do consistently; adherence wins every
  time"; coaches help clients choose the modality they enjoy (running, cycling,
  swimming, rowing) rather than mandating one
  ([Tailored Coaching Method](https://tailoredcoachingmethod.com/the-ultimate-guide-to-cardio-for-fat-loss/)).
- **Community norm is flexible.** r/Fitness's standard guidance treats the
  cardio modality as flexible: "the specifics of what you do are much less
  important than simply doing the work", any day of the week
  ([The Fitness Wiki](https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/)).

**The hybrid model (coach sets targets, user picks activity) is therefore the
right one, and it is also what big platforms do in practice:** the tracker
sets/measures load, the user always chooses the sport. This validates the
principle the brief mandates and the de-facto model Volyume's coach already
uses (`weeklyCoach.js` emits "3 sessions of 20-30 min", never an activity).

---

## 2. How the apps handle the activity library and the model

| App | Model | Library / selection | Calorie method | Source |
|---|---|---|---|---|
| **Strava** | User-selected | 50+ activity types (recently added dance, basketball, padel, etc.), an open hub with 400+ integrations | Device HR / GPS power; estimates per activity | [Strava support](https://support.strava.com/hc/en-us/articles/216919407-Supported-Sport-Types-on-Strava), [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/strava-now-lets-you-track-5-much-requested-new-activities-including-the-worlds-fastest-growing-sport) |
| **Garmin Connect** | User-selected | Device-defined activity profiles (dozens), per-activity control | Device HR + Firstbeat physiology | [Garmin forums](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/352760/) |
| **Apple Fitness / Watch** | User-selected | Native workout types (running, cycling, rowing, elliptical, HIIT, dance, etc.) | HR + motion, per-type kcal | [DC Rainmaker](https://www.dcrainmaker.com/2025/01/apple-fitness-and-strava-integration-and-new-fitness-features.html) |
| **MacroFactor** | No activity library; energy-balance | Does not log activities or add exercise calories | **Weight trend + intake** back-calculates TDEE; cardio shows up on the scale within ~2 weeks | [MF help: wearables](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker), [MF: expenditure](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure) |
| **Caliber** | Strength-led, syncs cardio | Combines strength + cardio + nutrition; syncs cardio from wearable; reviewers note it is strength-focused, weak for cardio-centric users | Wearable | [BarBend](https://barbend.com/caliber-fitness-app-review/), [caliberstrong.com](https://caliberstrong.com/) |
| **RP Hypertrophy** | Strength only | **No cardio log at all** ("no cardio log or ability to add that for a warm up or cool down") | n/a | [dr-muscle critique](https://dr-muscle.com/rp-hypertrophy-app-critique/) |
| **Hevy / Strong / Fitbod** | Strength logging | Cardio is a weak afterthought; reviewers steer cardio users to Strava | varies | [Setgraph](https://setgraph.app/ai-blog/best-gym-app-reddit) |

**Two clear camps.** The activity-first apps (Strava, Garmin, Apple) all give a
broad **user-browsed** library and never prescribe the sport, the camp Volyume's
cardio should join for selection. The diet-coach apps (MacroFactor) prove the
**energy-balance** calorie model that Volyume already runs, so Volyume should
take the selection UX from the first camp and the calorie philosophy from the
second.

---

## 3. Lifting-focused apps: the cardio gap is direct demand evidence

The strongest "build this" signal is that the leading hypertrophy apps have no
cardio at all and their users notice:

- **RP Hypertrophy**: no cardio log, called out in a structured critique
  ([dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/)).
- **Hevy / Strong / Fitbod**: strength logging with cardio as an afterthought;
  Reddit round-ups send cardio-mixing lifters to a second app (Strava)
  ([Setgraph](https://setgraph.app/ai-blog/best-gym-app-reddit)).

A physique-focused user who runs or cycles on off-days currently keeps a second
app. A lightweight, opt-in cardio log inside Volyume removes that, without
turning Volyume into a running app. This is the wedge: **enough cardio to keep
a lifter in one app, not a Strava competitor.**

---

## 4. MET science (2024 Adult Compendium of Physical Activities)

- **Definition:** 1 MET = 1 kcal/kg/hour ≈ resting energy cost
  ([2024 Compendium, PMC10818145](https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/),
  [pacompendium.com](https://pacompendium.com/)).
- **Calorie estimate:** `kcal = MET × bodyweight(kg) × duration(hours)`. This is
  the standard MET formula; it scales linearly with bodyweight and time.
- **MET varies strongly by intensity within an activity** (e.g. cycling spans
  ~4 to ~14 MET by effort), so the library must carry per-intensity MET, not a
  single value.
- **Representative MET values** (2024 Compendium ranges, to be verified per row
  at seed):

  | Activity | Low | Moderate | High |
  |---|---|---|---|
  | Walking | 3.0 (3 mph) | 4.3 (4 mph) | 5.0 (4.5 mph, brisk) |
  | Running | 8.3 (5 mph) | 9.8 (6 mph) | 11.8–12.8 (7.5–8.5 mph) |
  | Cycling (outdoor) | 4.0–6.8 | 8.0 (12–14 mph) | 10–12 (16–19 mph) |
  | Cycling (indoor / spin) | 4.8 | 7.0 | 8.5–11.0 |
  | Rowing machine | 4.8 | 7.0 | 8.5–12.0 |
  | Swimming | 5.8 (leisurely) | 7.0 | 9.5–10.0 (fast crawl) |
  | Elliptical | 4.6 | 5.0 | 6.8 |
  | Stair climber / stepmill | 8.0 | 9.0 | 9.0+ |
  | Jump rope | 8.8 | 11.0 | 12.3 |
  | HIIT / vigorous circuit | 6.0 | 8.0 | 10.0 |
  | Kettlebell cardio | 6.0 | 8.0 | 9.8 |
  | Boxing / kickboxing | 6.0 (bag) | 7.8 | 9.5–12.0 (sparring) |
  | Battle ropes | 6.0 | 8.0 | 10.0 |
  | Sled / prowler push | 6.0 | 8.0 | 9.5 |
  | Hiking | 5.3 | 6.0 | 7.0+ (hills/pack) |

- **Limitations apps must handle:** MET ignores individual fitness, mechanical
  efficiency, terrain, and **activity compensation** (the body offsets some
  exercise burn elsewhere), so a MET figure overstates net daily change. This
  is exactly why MacroFactor refuses to add exercise calories
  ([MF: wearables](https://help.macrofactorapp.com/en/articles/33-does-macrofactor-use-energy-expenditure-data-from-my-wearable-activity-tracker)).
  Volyume should treat MET kcal as **session feedback**, not a target adjustment.
- **HIIT/interval vs steady-state:** intervals accumulate fewer total minutes
  but a higher peak MET; a single average-MET × duration figure understates
  HIIT's true cost slightly. For a feedback number this is acceptable; the
  proposal flags it.

---

## 5. Recovery-impact classification (peer-reviewed basis)

The library needs a recovery-impact flag per activity. The science:

- **Interference effect is real but modality- and volume-dependent.** High
  volume of moderate, continuous endurance (classic LISS done a lot) attenuates
  lower-body strength and hypertrophy more than low-volume HIIT/sprint work
  ([Springer, Sports Medicine 2020](https://link.springer.com/article/10.1007/s40279-020-01421-6),
  [Barbell Medicine](https://www.barbellmedicine.com/blog/concurrent-training-and-the-interference-effect/)).
- **Mechanism = total training load outstripping recovery**, plus residual
  fatigue; separating cardio and lifting by ~3+ hours reduces it
  ([PMC11688070](https://pmc.ncbi.nlm.nih.gov/articles/PMC11688070/)).
- **Two fatigue axes:** *cardiovascular/central* fatigue (HIIT, hard intervals)
  vs *musculoskeletal/peripheral* fatigue + soreness (running's eccentric
  impact, sled, heavy rowing on shared leg musculature). Low-impact
  non-overlapping modalities (cycling, swimming, elliptical) interfere least
  with leg hypertrophy; running interferes most because it shares the leg
  musculature and adds impact
  ([Frontiers 2016](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2016.00487/full),
  Barbell Medicine).

**Classification the library should carry (derived from the above):**

| Recovery impact | Impact type | Examples | Rationale |
|---|---|---|---|
| Low | Cardiovascular | Walking, easy cycling, easy elliptical, easy swim | minimal central + minimal peripheral overlap |
| Moderate | Cardiovascular | Steady rowing, moderate cycling/elliptical, stair climber | central load, modest peripheral |
| Moderate | Both | Running (steady), hiking with pack | central + eccentric leg load |
| High | Cardiovascular | HIIT, spin intervals, boxing rounds | high central, acute fatigue |
| High | Both | Sprint intervals, hard sled/prowler, hard rowing intervals, kettlebell cardio | high central + high peripheral leg overlap |

This maps onto Volyume's existing recovery EMA (soreness/fatigue/joint, 7-day
half-life) as a per-session fatigue contribution and a coach flag when high-
impact cardio stacks against heavy leg training.

---

## 6. Implications carried into the proposal

1. Selection UX: copy the activity-first apps (broad browsable library,
   favourites, user picks the sport).
2. Calorie philosophy: copy MacroFactor (energy balance; MET kcal is feedback,
   never added to target).
3. Library size: enough to keep a lifter in one app (~30-45 activities, MET ×
   intensity), not a 1000-row sport database.
4. Recovery: each activity carries impact + axis so the coach can flag stacking
   against leg days; HIIT and LISS treated differently, per §5.
5. MET values: seed from the 2024 Compendium with a per-row verification step.
