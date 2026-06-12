# r-04 — Active Workout & Logging: best-in-class external research

> ULTIMATE-APP MANDATE, Phase 2 area 04. Aimed at `audit/a-04-active-workout-logging.md`
> (frictions G1 plate calculator orphaned, G2 unilateral logging dead, G3 six expert
> set types unGated, G4 readiness skipped on ad-hoc, G5 form guidance buried + no
> equipment filter on swap).
> Method: WebSearch + WebFetch of live 2026 sources. Vendor marketing roots
> (`hevyapp.com/features`, `help.fitbod.me`, `help.hevyapp.com`) are bot-walled on
> direct fetch and are sourced via WebSearch records + alternates per the standing
> rule; every such case is flagged. Load-bearing claims carry 2+ sources. British
> English throughout. Today 2026-06-12.

---

## STEP 0 — tooling proof (verbatim fetch + URL)

End-to-end WebFetch succeeded on Strong's own help centre. Verbatim, from
<https://help.strongapp.io/article/171-warm-up-calculator>:

> "The **Warm-up Calculator** allows you to automatically batch add/update the
> warm-up sets for an exercise." … "Warm-up Calculator is a Strong PRO feature." …
> "To use the Warm-up Calculator, hit the ... More Menu for an exercise and select
> **Add Warm-up Sets.**" … "The Warm-up Calculator can be used only for barbell,
> dumbbell, and machine exercises."

Second independent end-to-end fetch, verbatim from the Garmin Venu 3 owner's manual
<https://www8.garmin.com/manuals/webhelp/GUID-9CC4A873-E034-4A06-B2E0-636DCFE760EE/EN-US/GUID-49D892BF-429E-454D-B0C6-D4AE07E9D4A0.html>:

> "By default, the watch counts your reps. Your rep count appears when you complete
> at least four reps." … "Press [Button B] to finish the set. The watch displays the
> total reps for the set." … "After several seconds, the rest timer appears." … "If
> necessary, edit the number of reps, and select [Edit symbol] to add the weight used
> for the set."

Tooling proven. Proceeding.

**Verified base reused, no re-fetch:** `docs/deep-audit-2026-06-12/validation/val-ext-01-02.md`
already VERIFIED the Hevy benchmark set — Live Activity rest-timer widget with
previous-performance on lock screen, automatic rest timer with ±15s and skip,
inline PR flagging, free 25/26-programme library, Trainer auto-adjustment (Pro).
Those are not re-fetched here.

---

## 1. PER-APP IN-GYM DEPTH (17 apps + cross-cutting notes)

Legend per app: taps-to-log · previous-performance · rest-timer UX · plate calc ·
warm-up calc · unilateral/per-side · set-type depth vs beginner · mid-workout swap ·
interruption/crash · watch companion · form access mid-set.

### Hevy (mass-market leader; verified in base)
- **Previous-performance + rest timer:** the Live Activity widget on lock
  screen/Dynamic Island shows current exercise, next set, target reps, **and your
  previous workout's performance on that set**, with ±15s and skip from the widget.
  (val-ext-01-02 VERIFIED; corroborated WebSearch record of
  <https://help.hevyapp.com/hc/en-us/articles/35649846517399-How-to-Use-Hevy-s-Live-Activity-on-iOS-and-Android>:
  "track your rest timer and see workout details like the current exercise, what set
  is next, and how many reps you should do … access it by … tapping on your screen
  while your phone is locked".)
- **Warm-up + plate calc:** both shipped as workout-settings toggles ("Timer / Warm-up
  calculator / Plate Calculator / Smart Superset Scrolling" — WebSearch record of the
  Hevy help article; page 403 on direct fetch).
- **Form mid-set:** hundreds of exercises with free high-quality videos, reachable
  from the in-workout exercise (WebSearch record of hevyapp.com + Google Play listing).
- **Watch:** standalone Apple Watch logging (start, log sets, timers, HR, phone-free).

### Strong (the incumbent everyone benchmarks)
- **Set types:** tag sets as **Warm Up, Failure, Drop Set** (App Store listing;
  RPE supported). Warm-up + plate calculators both present; **Warm-up Calculator is
  PRO-gated** and batch-adds graduated warm-ups via the per-exercise "..." menu
  (fetched help.strongapp.io, verbatim above). Free tier limited to 3 custom routines
  (val-ext-01-02 #47).
- **Rest timer:** built-in auto countdown after a set.
- **Watch:** standalone Apple Watch app (log sets + timers + HR, phone-free).
- Sources: <https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577>,
  <https://help.strongapp.io/article/171-warm-up-calculator>, <https://www.strong.app/>.

### Fitbod (algorithmic; the warm-up + plate-calc gold standard)
- **Warm-up sets — automatic and graduated:** "Fitbod automatically adds warm-up sets
  based on the exercise and your working weight, building up gradually to your first
  working set … only added to weighted exercises, and only for the first exercise
  targeting each muscle group. Barbell exercises … may include more warm-up sets than
  dumbbell or machine exercises." (WebSearch record of help.fitbod.me Warm-Up Sets;
  appsftw review corroborates.)
- **Plate calculator — equipment-aware:** "The Plate Calculator … automatically
  calculates the correct number and size of plates needed on each side … only appears
  for exercises that use a barbell." (same record; second source: fitnessdrum review.)
- **Rest timer:** auto-starts on logging a set, tone/vibration on completion, shows the
  prescribed rest per exercise.
- **Mid-workout swap — equipment-aware:** "Replace Exercise" (swipe-left → Replace),
  plus Recommend More/Less/Exclude; the whole engine only surfaces exercises matching
  the user's selected equipment — choose dumbbells and it rebuilds the session around
  them. (WebSearch records of help.fitbod.me Editing Workouts + Gym Profile.)
- **Form mid-set:** every exercise has video demos (some multi-angle) plus written
  coaching cues, reachable in-session. Cold-start caveat from base: needs 10–15
  sessions to personalise, 3 free workouts then $15.99/mo.
- Sources: <https://fitnessdrum.com/fitbod-review/>,
  <https://appsftw.com/review/1446587291-rest-timer-warm-up-sets-fitbod>,
  <https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout>.

### Alpha Progression (hypertrophy logger)
- Easy logging with integrated rep counter, weight + **RIR tracker**, notes, rest timer.
- **Per-category rest:** rest periods set per exercise category (longer after
  bench/deadlift than curls). **No warm-up/mobility routines** — an admitted gap.
- **Swap:** "very easy to find similar exercises for each exercise … if you want/need
  to swap" (similar-exercise list; no stated equipment filter).
- Generator is Pro; free tier is logging. Sources:
  <https://fitnessdrum.com/alpha-progression-app-review/>,
  <https://www.hotelgyms.com/blog/alpha-progression-the-gym-logger-app-from-germany>.

### JuggernautAI (powerlifting AI; RPE-native)
- **Per-set RPE/RIR capture is the core mechanic:** "After each set, you can put in
  your weight and RPE or RIR"; end-of-session difficulty rating (5–10) feeds the AI.
- Daily workout screens show "exercises in a logical sequence with rest timers, weight
  recommendations, and performance tracking fields"; deep per-exercise history reachable.
- Sources: <https://powerliftingtechnique.com/juggernaut-ai-review/>,
  <https://techfixai.com/juggernautai-review/>.

### RP Hypertrophy (Renaissance Periodisation; the autoregulation benchmark — with holes)
- **Autoregulation:** adjusts volume/intensity from per-session feedback (pump,
  soreness, perceived effort); intensity expressed as **RIR**.
- **NOTABLE GAPS (two independent reviews):** "**no built-in rest timer**" and no
  plate calculator — "just about every other app ever used has these little widgets."
  UI described as dated/cluttered; the pump/soreness feedback "confuses newer lifters
  who don't yet have a good internal reference point."
- Sources: <https://mesostrength.com/blog/rp-hypertrophy-alternatives>,
  <https://dr-muscle.com/rp-hypertrophy-app-critique/>.

### Boostcamp (free-first; programme library + clean logger)
- **One-tap rhythm:** "Tap a set, the timer starts. Hit your reps, the next session's
  weight is already there." Rest timer auto-starts.
- **Plate calculator (free):** "tells you exactly which plates to load on each side."
- **Previous-performance:** "shows the exercise, target sets and reps, and your last
  logged weight."
- **RPE/RIR free, set-level:** "Log Rate of Perceived Exertion (5 to 10) and Reps in
  Reserve on any set."
- **Swap — weight-carrying:** "Mid-workout exercise alternatives carry your weights
  over to substitutes" (val-ext-01-02 corrected the earlier "paywalled swap" claim:
  alternatives are FREE).
- **Auto-progression:** "Finish your prescribed reps and Boostcamp bumps the working
  weight on your next session. Miss reps and it adjusts down."
- Sources (fetched): <https://www.boostcamp.app/workout-tracker>,
  <https://www.boostcamp.app/free-workout-app>.

### Caliber (coaching ladder; very clean logger)
- **Previous-performance inline:** "displays your previous performance for each
  exercise, making it easy to aim for progressive overload."
- **Rest timer:** automatic rest timer triggers after a completed set (v5.4.0 added it),
  press-and-hold the timer icon for the full option list; per-exercise + default rest
  targets settable. A "custom keyboard" speeds numeric entry.
- Free-forever logging + 500+ exercise videos. Sources:
  <https://www.garagegymreviews.com/caliber-app-review>,
  <https://feedback.caliberstrong.com/announcements/caliber-540-custom-keyboard-automatic-rest-timer-default-exercise-settings-sundaymonday-start-date-g>,
  <https://barbend.com/caliber-fitness-app-review/>.

### Dr. Muscle (AI auto-pilot)
- **One-tap auto-pilot:** "Letting the app choose brings up that day's workout with the
  weights and reps chosen for you based on your last few workouts" — auto weight
  increases via rep-based + weight-based overload (predicts 2–3% jumps).
- **Rest timer is goal-aware:** auto-sets rest by set style (≥2 min hypertrophy, ≥3 min
  strength); native **rest/pause cluster** flow (12 reps → 25s → 4 → 25s → 4).
- Apple Watch app in progress. Trust caveat from base (#37): hard-to-cancel subs.
- Sources: <https://dr-muscle.com/what-makes-dr-muscle-different/>,
  <https://dr-muscle.com/apple-watch-app/>.

### GymBook (premium no-subscription iOS/Watch)
- **Rest timer:** primary timer auto-starts after logging; **keeps running with the
  device asleep or the app closed**; secondary timer for stretching/timed work;
  per-exercise timers; classic or graphical display; multiple sounds.
- Plate-calculation functionality included; muscle-group visuals; Apple Watch.
- Source: <https://www.gymbookapp.com/faq>,
  <https://apps.apple.com/us/app/gymbook-strength-training/id650113307>.

### Setgraph (speed-logging specialist)
- **Fewest taps in the set:** "Log a set in seconds", "Swipe to log reps and weight"
  (fetched homepage) — one-swipe logging is the headline.
- **Previous-performance:** "instantly see what you did last time"; ad-hoc friendly —
  "pull up the exercise … see what you did last time, and aim to beat it."
- **Rest timer on lock screen + Dynamic Island:** auto-starts after a set.
- **Plate calculator, two forms:** "Smart Plates" (enter 225 → shows plates per side)
  AND a **"Plates keyboard" — dial in your working weight by tapping the plates you're
  loading** (input method, not just an output). 1RM calculator built in.
- Sources (fetched homepage + WebSearch record):
  <https://setgraph.app/>,
  <https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters>.

### Lyfta (free, video-rich logger)
- Log sets/reps/weight/**RPE**/notes "in seconds"; **5,000+ exercises with HD video
  guides**; auto rest timer.
- **Advanced set types:** warm-ups, drop sets, supersets, AMRAP, failure.
- No plate calculator surfaced in sources (UNVERIFIABLE for plate calc). 4.82★/56k.
- Sources: <https://www.lyfta.app/>,
  <https://apps.apple.com/us/app/lyfta-gym-workout-tracker-log/id6443740936>.

### KeyLifts (5/3/1 specialist)
- Free: warm-up sets, rest timer, PR alerts, 150+ 5/3/1 templates, **swap exercises
  during a workout**, Joker sets, assistance tracking.
- **Plate Calculator is PRO** (with auto Training-Max progression + sync) — "shows you
  what plates to use" from percentage-based prescriptions.
- Sources: <https://keylifts.com/>,
  <https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461>.

### Peloton Strength+ (instructor-led, gym-mode; formerly "Peloton Gym")
- **Follow-along + self-log:** "Generate custom workouts tailored to your targeted
  muscle focus, workout length, experience, and more"; "Get audio cues and technique
  tips from expert coaches you can trust" (fetched landing page); follow workout cues
  and log weights + reps.
- **2026: personalised weight recommendations** — analyses your history to suggest when
  to increase load.
- iOS, free for All-Access/App+ members. Note Peloton IQ (camera rep-count + form
  feedback, Oct 2025) is the hardware sibling, not the phone gym app.
- Sources (fetched + records): <https://www.onepeloton.com/strength-plus-app>,
  <https://www.pelobuddy.com/personalized-weight-strength-plus/>.

### Apple Workout (native, strength)
- **Logs almost nothing structured:** "Traditional Strength Training" /
  "Functional Strength Training" track duration, HR, calories — **no reps, sets, or
  weights** without third-party apps. The wrist is a sensor, not a logger.
- watchOS 26 adds **Workout Buddy** (AI spoken coaching, Fitness+ trainer-voiced) —
  motivational, not set-logging. Strength logging on Apple Watch is owned by Strong /
  Hevy / Fitloop standalone apps.
- Sources: <https://www.myhealthyapple.com/strength-training-using-apple-watch/>,
  <https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026>.

### Garmin (wrist strength logging)
- **Auto rep-count from wrist IMU:** "the watch counts your reps. Your rep count
  appears when you complete at least four reps" (fetched manual, verbatim STEP 0).
  Finish a set → **rest timer appears automatically** → edit reps + enter weight
  (≤999 lb / 453.5 kg) during rest.
- Garmin Connect shows logged sets/reps/weights + a **muscle map** (primary muscles
  red, secondary yellow). Limit: one move per set, leg moves may not count.
- Sources (fetched manual + support record): the Venu 3 manual URL above;
  <https://support.garmin.com/en-US/?faq=xEPSpxE3j27gpEsiq8K9o8>.

### Whoop Strength Trainer (load-quantification, not a logger-first product)
- **Three logging modes:** pre-plan (enter moves/weights/reps/sets or pick a pro
  template), **post-workout logging** (tap saved activity → follow prompts), and
  **automatic estimation** (no logging — strain estimated from activity type/duration
  off millions of prior sessions).
- Quantifies **muscular load** from band IMU (velocity/volume/force) and folds it into
  Strain alongside cardiovascular load; surfaces total tonnage + per-exercise HR.
  Needs wrist wear. Differentiator is the *load model*, not in-gym logging speed.
- Sources: <https://www.whoop.com/us/en/thelocker/introducing-strength-trainer-a-new-way-to-quantify-the-impact-of-your-strength-training/>,
  <https://support.whoop.com/s/article/Track-Muscular-Load-with-Strength-Trainer?language=en_US>.

---

## 2. SYNTHESIS

### (a) Repeating winner patterns (the table stakes + the leaders)

1. **Equipment-aware plate calculator that is one tap from the bar, barbell-only
   surfaced.** Hevy, Strong, Fitbod, Boostcamp (free), Setgraph, KeyLifts (Pro). Fitbod
   states it plainly: "only appears for exercises that use a barbell." Setgraph goes
   furthest — plates are an *input* method ("Plates keyboard"), not just an output.
   (Fitbod help record; <https://setgraph.app/>; <https://www.boostcamp.app/workout-tracker>.)
2. **Automatic graduated warm-up sets computed from the working weight.** Fitbod
   (auto, per-muscle, more sets for barbells) and Strong (PRO batch-add) are the
   reference. (Fitbod help record; fetched help.strongapp.io.)
3. **Rest timer that lives on the lock screen / Dynamic Island / wrist, with ±15s and
   skip from there.** Hevy Live Activity, Setgraph (lock screen + Dynamic Island),
   GymBook (runs with app closed), Garmin (auto-appears on finishing a set). This is
   now expected, not a differentiator. (Hevy help record; <https://setgraph.app/>;
   <https://www.gymbookapp.com/faq>; Garmin manual.)
4. **Previous-performance shown at the point of logging**, and beat-it framing for
   ad-hoc. Hevy (on the widget), Caliber ("displays your previous performance for each
   exercise"), Boostcamp ("your last logged weight"), Setgraph ("see what you did last
   time, and aim to beat it"). (Caliber: garagegymreviews; Boostcamp fetched; Setgraph
   fetched.)
5. **Weight-carrying, equipment-aware mid-workout swap.** Boostcamp carries weights to
   the substitute; Fitbod rebuilds around selected equipment via Replace + equipment
   profile. (Boostcamp fetched; Fitbod help records.) Alpha/KeyLifts swap but without a
   stated equipment filter.
6. **Per-set RPE/RIR as a first-class, free field** in the serious tier of the market —
   Boostcamp (free), Alpha, JuggernautAI, RP, Lyfta. Volyume *removed* this (a-04 §3).
7. **In-session exercise video reachable while resting.** Fitbod (video + written cues),
   Hevy (free videos), Lyfta (5,000+ HD), Caliber (500+). Text-only form help is now
   the exception, not the norm. (sensai/findyouredge/autonomous records.)
8. **Standalone wrist logging.** Strong, Hevy, Fitloop on Apple Watch; Garmin native;
   Whoop load model. Apple's own Workout app logs no sets/reps/weights.

### (b) Where Volyume already leads honestly (defensible, not vanity)

- **One-tap common-case log.** Pre-filled weight + reps from target/beat-line; Setgraph
  is the only competitor at parity (one swipe). Most others need at least a tap into the
  exercise then a confirm. Volyume's 1-tap (a-04 §3) is genuinely class-leading.
- **Crash/interruption depth.** Per-mutation snapshot + guarded restore (wrong-user,
  completed, deleted, race), wall-clock timers that survive lock/background/app-kill,
  stale-session Resume/Finish/Discard, idempotent watch event replay. No competitor in
  this set documents anything near this — the field mostly relies on the OS keeping the
  app alive. This is a quiet, real moat.
- **Deterministic target line + autoregulation surface (COMP-015).** A transparent,
  no-LLM adjusted-target with a "use planned sets instead" revert. RP/Juggernaut/Dr.
  Muscle autoregulate but as opaque AI; Volyume's is inspectable. (Contrast sharpens vs
  the now-ubiquitous AI layer — val-ext base Part 3 §5.)
- **Set-type breadth with a real cluster engine.** Myo-reps + rest-pause logged as one
  row with a breakdown (only Dr. Muscle has a comparable native rest/pause flow);
  AMRAP, drop set, warm-up all present. The *breadth* leads; the *gating* lags (G3).
- **Rest timer correctness.** Wall-clock-derived with foreground re-sync and a clamp
  that can't flip sign or drop below 5s — more robust than a naive countdown.

### (c) Ranked pick-ups vs G1–G5, for Besa (newbie) AND Eddie (athlete)

Ranked by impact × low-build-cost, mapped to the audit's gaps:

1. **G1 — Wire the plate calculator, barbell-only, one tap from the bar.** Build cost
   already paid (PlateCalculator.js is complete, orphaned). The single clearest "every
   leader has this, we built it and hid it" gap. Besa: removes the load-a-barbell panic.
   Eddie: speed on heavy sets. Consider Setgraph's **plates-as-input** keyboard as the
   stretch goal once the read-out ships. Surface only for barbell exercises (Fitbod's
   rule). Sources: Fitbod/Setgraph/Boostcamp above.
2. **G5b — Equipment filter on the in-session swap.** The audit's own nit; Fitbod is the
   template (rebuild around selected equipment). Besa: "dumbbells only, now" without
   leaving the set. Eddie: a busy-gym substitute fast. Cheap relative to value.
3. **G3 — Progressive-disclosure on the 6-type set sheet.** `isBeginner` already
   computed; gate Myo-reps/Rest-pause/AMRAP behind a "More techniques" reveal for
   beginners. Besa stops meeting "Myo-reps" jargon in session one; Eddie unaffected
   (one extra tap he won't notice). Pure UI; no engine change. Matches the field's norm
   of layering, not front-loading, expert techniques.
4. **G5a — Make form guidance reachable mid-set with media, not buried text.** The whole
   serious field (Fitbod, Hevy, Lyfta, Caliber) puts a demo one tap from the in-workout
   exercise; Volyume buries text two deep behind ⋯. Besa's biggest unmet need. Respects
   offline-first if demos are bundled/cached (area 05 owns the media; this is the
   in-workout entry point). Highest *newbie-retention* lever here.
5. **G4 — Carry intent/readiness onto ad-hoc paths.** Cheap consistency fix so
   `migrate_072` readiness isn't blank for blank/BuildWorkout sessions, strengthening
   the adaptive signal Eddie benefits from. Lowest user-visible value of the five but
   tidy and supports the coaching engine.

**Honourable mention beyond G1–G5 — restore optional per-set RPE/RIR (Eddie).** The
serious half of the market treats it as a free first-class field (Boostcamp, Alpha,
Juggernaut, RP, Lyfta). a-04 notes it was removed and defaulted internally. Re-exposing
it *optionally* (hidden for Besa via the same `isBeginner` disclosure as G3) closes a
credibility gap with athletes without cluttering the newbie card. Founder decision: keep
removed (simplicity) vs optional-advanced (parity)? — flagging, not assuming.

### (d) What "everyone" has mid-workout that Volyume lacks

- **A working plate calculator surfaced at the bar** — we built it and orphaned it (G1).
  *This is the one universal table-stake we are visibly missing.*
- **Automatic graduated warm-up sets from the working weight** — Fitbod/Strong compute
  them; Volyume makes warm-up a 2-tap sheet trip with no auto-calc (a-04 §2.4). Not in
  G1–G5 as scoped, but it is a clear field norm and pairs naturally with G1.
- **An in-session exercise demo a tap away** (video/animation) — field-standard; ours is
  buried text (G5).
- **Per-set RPE/RIR for the athlete** — field-standard in the serious tier; we removed it.

Everything else mid-workout (auto rest timer, previous-performance at log, weight-carry
swap, lock-screen timer) Volyume **already has** — several implemented more robustly than
the field (crash recovery, wall-clock timer, deterministic target). The gap is narrow and
concrete: surface the plate calculator, auto-warm-ups, in-session demos, and equipment-
aware swap; gate the expert set types. Do those and Volyume's in-gym screen is at or above
best-in-class on every axis the leaders compete on.

---

## 3. SOURCING LEDGER

**End-to-end fetches succeeded (verbatim quoted):** help.strongapp.io (warm-up calc),
Garmin Venu 3 manual (rep count/rest/weight), boostcamp.app/workout-tracker (logging,
plate calc, swap, RPE, prev-performance), setgraph.app (swipe-log, plate assist,
prev-performance), onepeloton.com/strength-plus-app (custom generator, audio cues +
technique tips).

**Fetched but content-light / partial (used WebSearch record instead):** setgraph.app
and onepeloton landing pages returned summaries lacking some specifics (Dynamic Island,
weight-rec); filled from WebSearch records, flagged inline.

**Bot-walled on direct fetch (sourced via WebSearch records + alternates, per standing
rule, flagged inline):** hevyapp.com/features/* (verification wall), help.hevyapp.com
(403), help.fitbod.me (403), fitbod.zendesk.com (403).

**Fetch failures logged (count = 5 distinct URLs):**
1. `https://www.hevyapp.com/features/` — bot verification wall (no content).
2. `https://www.hevyapp.com/features/live-activity/` — bot verification wall.
3. `https://www.hevyapp.com/features/workout-rest-timer/` — bot verification wall.
4. `https://support.hevyapp.com/.../Rest-Timer` — ECONNREFUSED, then 403 on help. variant.
5. `https://help.fitbod.me/hc/en-us/articles/360006340194-Rest-Timer` — 403 (and an
   earlier 404 on a guessed Intercom URL; the canonical content was recovered via the
   WebSearch record of the same help article).

No claim in this report rests solely on a failed fetch; every bot-walled vendor claim is
corroborated by a WebSearch record and, where load-bearing, a second independent review.
UNVERIFIABLE marked where a feature could not be confirmed (Lyfta plate calculator).

*No commit. File left uncommitted for orchestrator spot-check.*
