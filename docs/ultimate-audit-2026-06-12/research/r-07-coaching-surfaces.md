# Ultimate Research r-07 — Coaching communication (how the leaders SPEAK)

External research for area 07, aimed at audit a-07 (the deterministic engine's voice:
five-part weekly response, C1 register system, C2 science toggle, free one-liner,
food-level narration). Verification protocol bound. British English. Do NOT commit.

**Tooling proof (STEP 0).** Live WebFetch of the WHOOP Locker succeeded end-to-end,
verbatim: *"When nothing warrants action, WHOOP stays quiet"* and WHOOP as *"A
proactive partner in health"* that *"anticipates, not just responds"*
(https://www.whoop.com/us/en/thelocker/new-ai-guidance-from-whoop/, fetched
2026-06-12). WebSearch and a second independent fetch (Apple newsroom, below) also
confirmed working. Tooling proven; research proceeds.

**Fetch-failure log (per-URL).** WebFetch failures encountered and worked around:
- `nngroup.com/articles/coaching-apps/` — HTTP 404 (guessed URL; abandoned).
- `blog.dr-muscle.com/how-dr-muscle-works/` — ECONNREFUSED (abandoned; used dr-muscle.com search corpus instead).
- `support.whoop.com/.../How-to-Use-the-AI-Powered-WHOOP-Coach` — HTTP 403 (used WHOOP Locker pages instead).
- `macrofactorapp.com/adherence-neutral/` — 301 → `macrofactor.com`, which returned a JS loading shell (no content); `strongerbyscience.com` mirror returned 403. MacroFactor adherence-neutral claim therefore rests on the WebSearch snippet of the primary page PLUS the val-ext-03-06 prior verification (below), not a fresh full fetch. Flagged.
- `medium.com/.../duolingo-streak-system...` — fetched OK but contained design analysis only, no verbatim Duolingo copy. Duolingo's exact streak-recovery strings are **UNVERIFIABLE** from open sources here; treated as design-intent, not quoted as product copy.

**Total clean fetch failures worked around: 5** (all routed around; no load-bearing
claim left unsourced except where marked UNVERIFIABLE).

**Verified base reused, not re-fetched** (per brief): `docs/deep-audit-2026-06-12/
validation/val-ext-03-06.md` — WAG/Stronger U check-in structure, MacroFactor
adherence-neutral rationale, RP v1.52 overhaul are VERIFIED there.

---

## 1. Per-app findings — WHERE the coach lives, cold-start, cadence, praise/instruction, free/paid, depth-on-demand

Depth grading: **D** = deep explained decisions, **N** = narrative/voice, **C** =
count-only/shallow.

### JuggernautAI — readiness feedback loops · depth **D**
- **WHERE:** the coach is the *programme itself*; adjustments surface inline in the session screen and at weekly check-ins, not a separate tab.
- **Cadence / loop:** *"makes adjustments to your program pre-session, intra-session, session to session, week to week, block to block, and program to program"* via the Readiness Rating System (jtsstrength.com/how-juggernautai-works, fetched verbatim). v2.5: *"weekly check-ins automatically drop sets when your readiness score falls below 3"* and *"training volume pulls back when you're fatigued"* (juggernautai.app/blog/juggernautai-25, search corpus).
- **Praise vs instruction:** almost pure instruction; the "voice" is the prescription, not encouragement. Readiness rating (sleep/nutrition/motivation/soreness) is the input.
- **Free/paid:** subscription-gated whole.
- **Depth-on-demand:** explains *that* it adapted across timeframes; thin on a human-readable *why this set was dropped* string (the how-it-works page gives no UI message format — a gap even for the leader).

### RP Hypertrophy — set-by-set / post-session feedback · depth **D**
- **WHERE:** feedback prompts live *inside the workout flow* (per-set/per-muscle) and the weekly recalibration is shown in the next mesocycle's prescription.
- **Cold-start:** estimates start loads from an onboarding assessment; first week is calibration, openly framed as such.
- **Cadence:** every set/session — *"pump, soreness, perceived effort, 'disruption' (general fatigue and strength loss), joint pain, and performance"* feed next week's volume/intensity/exercise selection (search corpus; structure VERIFIED in val-ext-03-06 re v1.52 overhaul).
- **Praise vs instruction:** instruction-led, autoregulatory ("neither undertrain nor overreach").
- **Depth-on-demand:** the science is the product's brand; jargon (MEV/MRV/RIR) is surfaced, not hidden — the **opposite** of Volyume's jargon blocklist.

### Dr. Muscle — explained AI decisions · depth **D**/**N**
- **WHERE:** in the active workout, per-exercise weight/rep prescription with brief plain-English rationale.
- **Cadence:** real-time intra-session — *"Having a great day? The app pushes you harder. Feeling beat up? It backs off just enough to keep you gaining"* (dr-muscle.com/what-makes-dr-muscle-different, search corpus).
- **Praise vs instruction:** instruction with light encouragement woven in; deloads scheduled and *explained* ("tells you exactly when to back off").
- **Depth-on-demand:** markets the decision as legible ("calculates your ideal weights for next time"); explanation is short, not layered.

### Carbon Diet Coach — weekly check-in verdict · depth **D**
- **WHERE:** a **Coach tab**; the check-in report is opened from there (verbatim fetch, help.joincarbon.com/.../weekly-check-in).
- **Cadence:** weekly on a scheduled day. Asks verbatim *"Did you track everything you ate this week?"* then current weight + optional body-fat.
- **Verdict delivery (verbatim):** *"Carbon generates a check-in report with a detailed breakdown of your intake, compliance, and target adjustments for the week."*
- **Non-adherence handling:** *"If you were not adherent, the targets stay the same and the app tells you to stick closer to the plan next week"* (search corpus). This is a **compliance-gated** verdict — the relevant contrast to MacroFactor below and to Volyume's own ED-safe suppression.
- **Trend weight:** a trend algorithm computes "true" weight to avoid over-adjusting on noise (parallels Volyume's 7-day average).
- **Cold-start:** the help page does **not** specify what a brand-new pre-first-check-in user sees (gap; UNVERIFIABLE here).

### MacroFactor — adherence-neutral verdict & tone · depth **D**/**N**
- **WHERE:** weekly check-in flow + a dashboard; coaching is built on the expenditure estimate.
- **Tone (the headline):** *"a lack of shame-based visual elements when someone eats a 'bad' food or exceeds their calorie or macronutrient targets, and a lack of coaching elements that would attempt to make people 'compensate'"*; *"Shaming people for not adhering to their diet is unlikely to increase their dietary adherence... research suggests [it] will make them less likely to adhere"* (macrofactorapp.com/adherence-neutral search snippet; rationale VERIFIED in val-ext-03-06).
- **Cadence:** weekly; targets recompute automatically from expenditure + weight + goal, *regardless of whether you hit targets* — the core of "adherence-neutral." This is the **direct opposite** of Carbon's compliance-gated verdict.
- **Depth-on-demand:** curated "Coaching Modules" resolve specific diet challenges — progressive, opt-in education attached to the verdict.
- *(Load-bearing tone claim carried by 2 sources: search snippet of primary + val-ext-03-06 prior verification.)*

### Noom — daily lesson voice · depth **N**
- **WHERE:** a daily-lesson feed (the spine of the product) plus human/coach messaging.
- **Cadence:** daily, *"always... less than 12 minutes... as little as four minutes"*; psychology-first, reframes the relationship with food (noom.com/support, search corpus).
- **Praise vs instruction:** teaching register — quizzes, reflection, "practise immediately." Coaches are human, board-certified.
- **Free/paid:** lessons are the paid core.

### Caliber — human-coach hybrid messaging · depth **N**
- **WHERE:** in-app chat thread with a real coach; same interface as logging.
- **Cadence:** *"Your coach is available 24/7, typically replying within a few hours"*; lower tiers = async messaging, higher tiers = video check-ins + weekly progress reviews (barbend / corahealth, search corpus).
- **Free/paid split:** a free self-guided tier exists; human messaging is the paid differentiator. The *tier ladder of coach intimacy* (async text → video) is the model.

### Future — human coach texting (~$149/mo benchmark) · depth **N**
- **WHERE:** a 1:1 text thread, the product's whole surface.
- **Cadence:** *"Your trainer texts you each morning, reviews your workouts, adjusts your program when you're traveling or sick, and builds context about you over time"* — *"communicates daily via text"* (onbetterliving / barbend, search corpus). Form review via recorded video + occasional FaceTime.
- **Pricing benchmark:** **$149/mo** standard, $199 elite. This is the ceiling Volyume undercuts: Future's value is *a human who remembers you*. The relevant lesson is **continuity of context** ("builds context about you over time"), which a deterministic engine can emulate via persisted history.

### Whoop — daily narrative + "Whoop Coach" · depth **N**/**D**
- **WHERE:** a dedicated **Coach tab**, plus entry points from Home, Sleep, Strain, Recovery with *pre-curated suggested prompts* (so a user need not type). Daily Outlook each morning; Day in Review each evening.
- **Cadence / restraint (verbatim):** *"When nothing warrants action, WHOOP stays quiet"*; *"A proactive partner in health"* that *"anticipates, not just responds"*; *"guidance finds you at the right moment, shaped by what's happening in your life"* (whoop.com/.../new-ai-guidance, fetched). **This restraint principle is the single most transferable idea for Volyume's ED-safe + notification posture.**
- **Cold-start:** suggested prompts substitute for a blank coach when there's no history.

### Oura — Advisor tone · depth **N** — *direct parallel to Volyume's C1*
- **WHERE:** *"your in-app health and wellbeing assistant"*, reachable from the + and menu on the **Today tab** and from Readiness insight messages (ouraring.com/blog/oura-advisor, fetched verbatim).
- **Tone toggle (the parallel):** **Conversational** = *"a supportive, encouraging voice"* vs **Direct** = *"a more goal-oriented, accountability-driven approach."* This is Oura's version of Volyume's **C1 Supportive/Precise** — shipped, member-facing, and praised. Volyume's exists too but is partly unconsumed (a-07 §1.3).
- **Cadence:** user-chosen — weekly / 3× week / daily / off (a configurability Volyume lacks).
- **Memory:** persists shared context (e.g. "recovering from knee surgery") across insights.

### Garmin — training-readiness narrative · depth **N**
- **WHERE:** the **Morning Report** — one consolidated morning summary.
- **Voice:** a single 0–100 readiness figure backed by six factors (sleep, HRV, recovery time, acute load, stress, Body Battery), turned into *"whether you're ready for serious outdoor activity... and how well you're likely to perform"* (the5krunner / shoulditrain, search corpus). Banded guidance: 60+ push, 40–59 ease, <40 recover.
- **Lesson:** *one figure + plain banded verdict + factor breakdown on demand* — depth-on-demand done with a score, not paragraphs.

### Apple Workout Buddy (June 2026) — spoken encouragement · depth **N**
- **WHERE:** *spoken*, mid-workout, through Bluetooth headphones (cannot use the watch speaker).
- **Cold-start pep talk (verbatim, fetched apple.com newsroom):** *"Way to get out for your run this Wednesday morning. You're 18 minutes away from closing your Exercise ring."* Mid-workout: *"Mile four. You picked up the pace and ran that last one in 8 minutes and 28 seconds."* Milestone: *"Your total running distance for the year just crossed the 200-mile mark!"*
- **Voice design (verbatim):** a generative TTS voice built from *"voice data from Fitness+ trainers, so it has the right energy, style, and tone for a workout."*
- **Praise vs instruction:** **encouragement over instruction** — celebrates effort and milestones, gives *no* form correction. Anchors every line to a *real number from the user's own data* — exactly Volyume's "name something REAL" acknowledgement rule.

### Freeletics — Coach+ explanations · depth **D**/**N**
- **WHERE:** the Coach is the session feed; rationale surfaces at session generation and on "Adapt Session."
- **Cold-start (the strongest cold-start model found):** *"clusters new users with similar users based on their fitness level and demographics to normalize each recommendation"* and estimates rep-max via initial assessment, claiming *"90% accuracy from week one"* (freeletics.com/blog, search corpus). So week 1 is *not* a blank — it borrows the cohort's data. **Directly relevant to a-07's cold-start friction.**
- **Progression legibility:** *"changing only one variable at a time, slowly and progressively, always increasing volume before intensity"* — a legible rule the user can internalise.
- **Adapt Session:** explains the recalibration when life intervenes (no space/equipment/sore muscle).

### Athlytic / Bevel — data-narrative apps · depth **N** — *Bevel = a second C1 parallel*
- **Athlytic:** *"translates HRV and resting heart rate into actionable insights... personalized reports on how recovered you are each morning"* — a morning recovery narrative (athlyticapp / oreateai, search corpus).
- **Bevel — the register parallel:** *"Personalities so you can choose how Bevel Intelligence communicates and coaches you: **Data Nerd, Guardian, Friend, or Commander**"*; Recovery Score is *"your daily readiness, simplified... actionable insight without having to interpret charts"* (autonomous.ai / askvora, search corpus). Bevel's four personalities are a richer, named version of Volyume's C1 — strong evidence the register idea is now *table stakes*, and that **named personas beat abstract labels**.

### Noom / Duolingo / Headspace / Calm — cold-start, streak-recovery, supportive register
- **Duolingo:** streak repair exists (gems, or a free Super trial if lost <48h); design literature stresses an *"empathetic learning app... far better than... unforgiving"* posture, but **Duolingo's exact comeback/guilt-reduction copy is UNVERIFIABLE from open sources fetched here** — logged, not quoted as product copy.
- **Headspace:** *"Ebb... asks open-ended, deep, reflective questions... offers non-judgmental support"*; Andy's voice is *"calm, measured, and reassuring... like a patient teacher"* (dscout / headspace.com, search corpus). The persona is deliberately authored ("marrying psychology best practices and brand guidelines").
- **Calm:** non-judgmental mindfulness register — *"allowing [thoughts] to arise and pass without any added stress."*
- **Lesson:** the supportive register is *authored as a character with rules*, not improvised — which is what Volyume's `coachRegister.js` already does deterministically.

---

## 2. SYNTHESIS

### (a) Repeating WINNER patterns (apps + URLs)

1. **A single, named "coach" home with curated entry prompts.** Whoop's Coach tab,
   Oura's Today-tab Advisor, Carbon's Coach tab, Future's one text thread. Every
   leader has *one canonical place* the coach lives, reachable from many surfaces but
   resolving to one home. (whoop.com/.../new-ai-guidance; ouraring.com/blog/oura-advisor;
   help.joincarbon.com/.../weekly-check-in) — **the direct answer to a-07's
   "no single my-coach home" friction.**
2. **A selectable tone/persona register, named not abstract.** Oura
   Conversational/Direct; Bevel Data Nerd/Guardian/Friend/Commander. (ouraring.com/blog/oura-advisor;
   autonomous.ai/ourblog/bevel-app-review) — Volyume has this (C1) but with abstract
   labels and a partly-unconsumed science layer.
3. **Restraint as a feature: speak only when there's something to say.** Whoop:
   *"When nothing warrants action, WHOOP stays quiet."* (whoop.com/.../new-ai-guidance)
4. **Every line anchored to a real number from the user's own data.** Apple Workout
   Buddy ("18 minutes away from closing your Exercise ring"), Garmin morning figure,
   MacroFactor expenditure. (apple.com/newsroom/2025/06/watchos-26...) — Volyume's
   acknowledgement rule already enforces this; the leaders prove it generalises.
5. **Cold-start is borrowed or warm, never a blank apology.** Freeletics cohort-clusters
   to "90% accuracy from week one"; Apple greets you on a *first* run; RP/Dr. Muscle
   calibrate openly. (freeletics.com/blog/posts/AI-and-your-Coach) — **the direct
   answer to a-07's discarded cold-start warmth.**
6. **Adherence-neutral, shame-free verdicts retain users better than compliance-gating.**
   MacroFactor vs Carbon is the clean A/B. (macrofactorapp.com/adherence-neutral;
   help.joincarbon.com/.../weekly-check-in)
7. **Depth-on-demand: plain verdict first, mechanism behind a tap.** Garmin score →
   six factors; MacroFactor verdict → Coaching Modules; Whoop answer → ask-a-follow-up.

### (b) Where VOLYUME ALREADY LEADS (honestly)

- **Deterministic receipts to the gram.** No leader narrates a calorie change *through
  the live meal plan at the food level* ("30 g of carbs off... 40 g of rice and a slice
  of toast", a-07 §1.5). Whoop/Oura explain *trends*; Carbon/MacroFactor change *macro
  numbers*; none translate the change into the user's actual next meal. **This is a
  genuine, defensible moat.**
- **Register system exists and is suppression-aware.** C1 Supportive/Precise matches
  Oura's two-tone and is *beginner-safe by construction* (a-07 §1.2) — ahead of a binary
  toggle in safety design, behind Bevel only on *naming/personality*.
- **ED-safe suppression of rate language and weighing cues** (a-07 §1.1). Whoop's
  "stay quiet" restraint is voluntary product polish; Volyume's is a hard safety
  invariant the leaders have no equivalent of.
- **Enforced jargon blocklist** (MEV/MRV/RIR/surnames throw in dev, a-07 §3). RP and
  Dr. Muscle *flaunt* jargon; Volyume guarantees plain language. A retention asset for
  the new gym-newbie market.
- **Acknowledgement honesty test** ("would this be true if the user did nothing but
  kept logging?", a-07 §1.1) — stricter than Apple's pep-talk, which will still
  congratulate thin effort.

### (c) RANKED pick-ups vs a-07's 5 frictions — for Besa (newbie) AND Eddie (athlete)

**Friction order from a-07:** F1 dead Home banner tap; F2 cold-start warmth
built-but-discarded; F3 C2 science toggle no-op; F4 two unlinked weekly surfaces /
no single coach home; F5 thin free coaching voice.

1. **Single "My Coach" home (fixes F4 + F1).** Adopt the universal pattern (Whoop
   Coach tab / Oura Today Advisor / Carbon Coach tab): one canonical destination that
   *always resolves*, surfacing the latest five-part read, the held card, the
   check-in CTA and CoachReview as sections — not two parallel screens reached from
   different places. The broken Home banner (F1) then deep-links to *that* home via the
   proven `getParent()` cross-tab pattern, killing the dead tap.
   - *Besa:* a place to go that says "this is your coach" lowers the intelligence to a
     relationship. *Eddie:* one address for "what does the engine think right now."
2. **Warm cold-start, borrowed not blank (fixes F2).** Render the engine's existing
   five-part *shrink* (a-07 §1.12 — it already computes sessions/PRs/whatWorking) instead
   of `InsufficientDataView`. Model the *opening line* on Apple Workout Buddy's
   data-anchored greeting and Freeletics' cohort framing: *"Week one. You trained 3
   sessions and logged your weight twice. The first real read lands after week two —
   keep this up and it will be sharp."* Deterministic, honest, warm.
   - *Besa:* the make-or-break first week stops feeling like an apology. *Eddie:*
     respects that he knows it's calibrating, no false precision.
3. **Make C2 "Show the science" actually do something (fixes F3).** Wire `withScience`
   into `CoachOutputScreen` (a-07 §1.3 — built, unconsumed). Pattern it on
   depth-on-demand winners: plain verdict always leads, the science rides *behind the
   same tap* (Garmin's six factors, MacroFactor's modules). A no-op Pro toggle erodes
   the very trust the science is meant to build.
   - *Eddie:* the reason he'd pay; he can see MEV→MRV framing on demand. *Besa:* off by
     default, never forced — preserves the jargon-free newbie path.
4. **Widen the free coach voice without ungating Pro (addresses F5).** Today free =
   one direction-only line. The leaders' free tiers still *teach* (Noom lessons,
   Freeletics week-1) and *acknowledge* (Apple's effort praise needs no subscription).
   Give free users the **acknowledgement + one cue** parts of the five-part response
   (both honesty-tested, neither reveals the Pro *decision/macros*), plus a single
   methodology teaser. Keep decision, interpretation-with-rate, held narrative, and
   food-level receipts Pro. This is a gating call for synthesis — flagged, not assumed.
   - *Besa (likely free):* hears a coach that *names her real week*, the strongest
     conversion hook (she now knows what Pro's verdict would add). *Eddie:* unaffected.
5. **Named registers + restraint posture (polish on C1, lesson from Whoop/Bevel).**
   Consider naming the C1 tones (Bevel proves named personas land better than abstract
   "Precise") and adopting Whoop's "stay quiet when nothing warrants action" as an
   explicit content rule for nudges — which also dovetails with the ED-safe posture.

### (d) What EVERYONE has that we LACK

- **A single canonical coach home.** Universal across leaders; Volyume has two unlinked
  weekly surfaces and a dead entry banner (a-07 §2.1–2.2). *Biggest structural gap.*
- **A warm/borrowed cold-start.** Freeletics borrows cohort data; Apple greets a first
  workout; Volyume computes warmth then discards it on screen.
- **User-chosen check-in cadence.** Oura (daily/3×/weekly/off) and Whoop's restraint
  give the user control of how often the coach speaks. Volyume's cadence is fixed weekly
  + event-driven.
- **Persisted, referenced context ("remembers you").** Future "builds context about you
  over time"; Oura recalls a knee surgery. A deterministic engine *can* persist and
  reference history without AI — Volyume does not yet narrate continuity ("third week
  running at the right rate" exists, but no longer-arc memory).
- **Named personas, not abstract tone labels.** Bevel's four; Oura's two named tones.
- **A consumed, member-facing science depth layer.** Built in Volyume, but unwired (F3).
- **Curated suggested prompts / a conversational entry.** Whoop/Oura let users explore
  without typing. Out of scope for a no-AI engine as *conversation*, but the *pattern*
  (pre-curated "tap to ask: why did my calories change?" → deep-link to the receipt)
  is fully achievable deterministically and would make the coach feel answerable.

---

## 3. Source ledger (load-bearing = 2+ where marked)

- Whoop (fetched): whoop.com/us/en/thelocker/new-ai-guidance-from-whoop/ — verbatim restraint + "proactive partner" quotes.
- Apple Workout Buddy (fetched, primary): apple.com/newsroom/2025/06/watchos-26-delivers-more-personalized-ways-to-stay-active-and-connected/ — verbatim pep-talk + voice design.
- Carbon (fetched, primary help centre): help.joincarbon.com/en/articles/6004812-weekly-check-in — verbatim ask + verdict delivery.
- JuggernautAI (fetched, primary): jtsstrength.com/how-juggernautai-works/ — verbatim readiness-timeframes quote. (2nd: juggernautai.app/blog/juggernautai-25 via search.)
- Oura (fetched, primary blog): ouraring.com/blog/oura-advisor/ — verbatim tone toggle + placement.
- MacroFactor (search snippet of macrofactorapp.com/adherence-neutral + **val-ext-03-06 prior verification**) — adherence-neutral tone (2 sources; full fetch blocked by JS shell/403, logged).
- RP Hypertrophy (search corpus + **val-ext-03-06** v1.52 overhaul VERIFIED) — set-by-set feedback structure (2 sources).
- Dr. Muscle (search corpus, dr-muscle.com) — explained intra-session adaptation.
- Freeletics (search corpus, freeletics.com/blog) — cohort cold-start, one-variable progression.
- Future (search corpus, onbetterliving/barbend) — daily-text model, $149/mo, "builds context."
- Caliber (search corpus, barbend/corahealth) — async→video tier ladder, 24/7 thread.
- Garmin (search corpus, the5krunner/shoulditrain) — morning readiness figure + bands.
- Bevel/Athlytic (search corpus, autonomous.ai/oreateai/askvora) — Bevel four "Personalities", Athlytic morning recovery narrative.
- Noom (search corpus, noom.com) — daily-lesson voice.
- Headspace/Calm (search corpus, dscout/headspace.com) — authored non-judgmental register.
- Duolingo — streak-recovery exact copy **UNVERIFIABLE** from sources fetched; design-intent only, not quoted as product copy.
