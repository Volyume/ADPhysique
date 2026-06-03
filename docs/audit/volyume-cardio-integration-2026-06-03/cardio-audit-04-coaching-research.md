# Cardio integration audit - Phase 4: Coaching methodology research

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only.
Sources cited inline. Synthesis is labelled where it spans sources.

---

## 1. Do elite coaches prescribe activities, or set targets?

**Consensus: coaches set the dose (frequency, duration, intensity, or a weekly
calorie/step goal) and let the client choose the modality.** The deciding
factor is adherence, which is individual.

- "The best cardio for fat loss is the one you'll do consistently; adherence
  wins every time." Coaches prescribe more cardio when they know the client
  will adhere, and match the modality to what the client enjoys
  ([Tailored Coaching Method](https://tailoredcoachingmethod.com/the-ultimate-guide-to-cardio-for-fat-loss/)).
- Self-selected intensity produces more pleasure and better adherence than
  prescribed intensity
  ([PMC11843731](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11843731/));
  autonomy supports long-term behaviour change
  ([PMC8735821](https://pmc.ncbi.nlm.nih.gov/articles/PMC8735821/)).
- Where coaches do specify modality, it is usually to **steer away from**
  high-interference choices during a hard hypertrophy block (e.g. prefer
  cycling over running to spare the legs), not to mandate one activity
  (synthesis of [Barbell Medicine](https://www.barbellmedicine.com/blog/concurrent-training-and-the-interference-effect/)
  + Tailored Coaching Method).

**Implication for Volyume:** the coach should output a *dose* ("aim for 3
sessions, 20-30 min, easy pace this week"), optionally a *steer* ("low-impact
keeps your legs fresh for squats"), and never a specific activity. This is
already how `weeklyCoach.js` phrases it; the proposal keeps that voice.

---

## 2. How cardio targets are communicated

Coaches communicate cardio as one of a small ladder of fat-loss levers, pulled
in order of least disruptive first: food → steps/NEAT → structured cardio
([Tailored Coaching Method](https://tailoredcoachingmethod.com/the-ultimate-guide-to-cardio-for-fat-loss/)).
Volyume's coach already encodes exactly this order: calories → steps → cardio
(`weeklyCoach.js`: steps is "the gentlest lever", cardio is "the next lever").
Targets are given as **sessions × duration × intensity**, sometimes as a weekly
total, in plain language. Volyume should keep plain-language dosing ("3
sessions" not "150 min Zone 2"), matching its voice rules.

---

## 3. Cardio and the calorie target in coaching practice

Two schools:
- **Add-back** (MyFitnessPal-style): estimate burn, eat it back. Widely
  criticised for inaccuracy and over-eating because of compensation.
- **Energy-balance** (MacroFactor, modern evidence-based coaches): don't add
  cardio calories; let the weight trend reveal the true expenditure and adjust
  food from results ([MF](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).

Volyume already runs the energy-balance school (adaptive TDEE). The coaching
research reinforces that cardio should **not** move the calorie target directly;
its effect arrives through the weight trend. Cardio is a *deficit lever*
(burn more) used when food and steps are exhausted, not a *budget top-up*.

---

## 4. Cardio, recovery, and lifting scheduling

- **Interference is dose- and modality-dependent.** High-volume continuous
  endurance impairs lower-body strength/hypertrophy more than low-volume HIIT;
  the mechanism is total-load and residual fatigue
  ([Sports Medicine 2020](https://link.springer.com/article/10.1007/s40279-020-01421-6),
  [PMC11688070](https://pmc.ncbi.nlm.nih.gov/articles/PMC11688070/)).
- **Coaching rules of thumb (synthesis):** separate hard cardio from leg days;
  prefer low-impact non-overlapping modalities (cycling, swimming, elliptical)
  in a hypertrophy block; keep HIIT brief and infrequent; never let cardio
  compound a recovery deficit. Volyume already does the last one
  (`weeklyCoach.js:737` pauses cardio when recovery is poor).
- **Scheduling:** ~3+ hours between cardio and lifting reduces interference
  ([PMC11688070](https://pmc.ncbi.nlm.nih.gov/articles/PMC11688070/)). For a
  weekly-target model this becomes a gentle "do cardio on rest days or after
  lifting, not before legs" note, not a hard scheduler.

---

## 5. How cardio differs across goals

| Goal | Coaching stance on cardio | Source/synthesis |
|---|---|---|
| **Fat loss / cut** | A deficit lever after food + steps; raise gradually; protect muscle by capping volume and favouring low-impact | Tailored Coaching Method; interference research |
| **Contest prep** | More structured cardio as a tool to keep dropping while food stays high enough to train; still client-chosen modality | synthesis |
| **Muscle building / bulk** | Minimal cardio, mainly cardiovascular health; keep volume low to protect the surplus and recovery; this is *health* cardio, not a deficit lever | synthesis + interference research |
| **Maintenance / general fitness** | Cardio for heart health and enjoyment; no deficit role; pure user-led | synthesis |

**Key gap vs current code:** Volyume's coach only offers cardio in a cut
(`weeklyCoach.js:735`). The coaching research says cardio also has a *health*
role in bulk/maintenance/general fitness, where it is purely user-led and the
coach merely acknowledges it (no deficit target). The proposal (Phase 6) adds a
non-cut, health-framed cardio mode so a bulking or maintaining user who enjoys
cardio is supported without the coach treating it as a fat-loss lever.

---

## 6. What coaches say goes wrong with self-managed cardio

Synthesis of the coaching sources:
- **Too much, too soon** in a cut: cardio ramped so high it crushes recovery and
  stalls strength (the interference effect), leaving no lever left later.
- **Eating it back**: logging a burn then over-eating, erasing the deficit.
- **Junk-volume HIIT every day**: high acute fatigue, poor recovery, no
  programming logic.
- **Cardio before legs**: avoidable interference.

Volyume's design answers each: the coach raises cardio gradually and only after
steps max out; cardio kcal is never added to the target; the recovery flag
pauses cardio and the impact classification discourages stacking HIIT on leg
days; a scheduling note nudges cardio off pre-leg slots. These are the guard
rails the proposal builds in.

---

## 7. Net coaching conclusion

The coaching world already operates the exact model the brief mandates: **set
the dose, let the client pick the activity, use the weight trend (not a burn
estimate) to judge calories, and watch recovery/interference.** Volyume's coach
is one short step from this; it needs (a) a library to pick from, (b) a log to
read compliance and modality from, (c) availability beyond cuts for the health
role, and (d) a recovery-impact signal. Phases 5-7 specify these.
