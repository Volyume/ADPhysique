# r-11 — Retention & Gamification: best-in-class research (fetched-source)

> Research agent r-11 of the ULTIMATE-APP MANDATE. Phase 2, aimed at
> `audit/a-11-retention-gamification.md`. British English. No commit, no code
> changes. Every competitive claim below carries a fetched-source URL; load-
> bearing claims carry 2+. Failed fetches are logged in §0. Verdicts of
> UNVERIFIABLE / vendor-grade are stated, not invented.

---

## 0. Tooling proof + fetch log

**Tooling proven (verbatim quote + URL).** From Duolingo's official habit blog,
fetched live this session:

> "The Streak Freeze, which allows you to hit pause on your streak for a day, is
> designed to grant this type of flexibility when you need a day off."
> — [blog.duolingo.com/how-duolingo-streak-builds-habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)

and, same page, a real published retention figure (note the modest true
magnitude — directly relevant to deflating the struck folklore):

> "seeing these animations increased the likelihood a brand new learner was still
> using Duolingo 7 days later by +1.7%"
> "this change actually increased the relative number of active learners on
> Duolingo every day by +0.38%" (equipping up to two Streak Freezes).

**Fetch failures logged (4):**
- `blog.duolingo.com/how-duolingo-streaks-build-habits/` → HTTP 404 (wrong slug;
  correct slug `how-duolingo-streak-builds-habit` fetched fine).
- `help.hevyapp.com/.../Track-Your-Workout-Consistency...` → HTTP 403 (Zendesk
  block). Mitigated: `hevyapp.com/features/gym-consistency/` + search snippet of
  the same help article corroborate the weekly-streak definition.
- `help.headspace.com/.../My-run-streak-reset-What-can-I-do` → HTTP 403 (Zendesk
  block). Mitigated: Headspace's own editorial article (fetched) carries the
  no-shame philosophy verbatim.
- `support.strava.com/.../The-Strava-Trophy-Case` → HTTP 403 (Zendesk block).
  Mitigated: Strava press + support search snippets corroborate Trophy Case /
  finisher-badge mechanics.

A Zendesk help-centre pattern (403) recurs across Hevy/Headspace/Strava; in each
case a second independent fetched source carried the load-bearing fact, so no
claim below rests on a blocked page alone.

---

## 1. Per-app findings

For each: **ladder shape** (early density vs long-tail), **what fires beyond
day 100 / year 1**, **comeback/repair**, **completion events**, **tone (ED-safe
lens)**.

### 1.1 Duolingo — the streak archetype (build on VERIFIED base)

Building on `validation/val-ext-04-05-07.md` (do NOT re-cite the struck churn
folklore). Verified spine: **600+ streak experiments** in ~4 years
(Shuttleworth, Lenny's Podcast); **~70% of DAU carry a 7+ day streak** (Q3 FY22/
FY23 shareholder letters); **Friend Streak → +22% daily-lesson completion**,
monotonic in number of friends, cap 5 (Duolingo product blog, 20 Sep 2024).

New, fetched this session:
- **Streak Freeze is framed as flexibility, not failure**, and is grounded in
  real research: "research from University of Pennsylvania and UCLA demonstrates
  that offering people a little 'slack' as they pursue their goals can actually
  be more motivating than having a rigid set of rules." Equipping up to two
  freezes lifted daily-active by **+0.38%** ([blog.duolingo.com](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)).
- **Ladder shape:** daily granularity with a long-tail recognition system —
  **Streak Society** tiers at ~7 / 30 / 100 / 365 days, VIP at 365 (verified in
  base doc, G10). So Duolingo *does* fire beyond day 100: the 365-day VIP tier is
  the headline long-tail anchor.
- **Repair is monetised** (paid Streak Repair) — a deliberately punitive economy
  that Volyume's ED-safe posture must NOT copy (base doc G9; deceptive.design
  lists Duolingo for A/B-tested streak monetisation).

**Read-across to a-11:** the freeze-as-slack finding is the academic backbone
for Volyume's pause/repair already being *correct* — and the +0.38%/+1.7%
true magnitudes confirm that honest streak mechanics move retention in small,
real increments, not the fabricated double-digit lifts. The long-tail gap
(Duolingo has a 365-day VIP tier; Volyume's session ladder dead-ends at 100) is
the single clearest pick-up.

Sources: [Duolingo habit blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/);
base validation doc (Friend Streak, 600+, 70% DAU, Streak Society tiers).

### 1.2 Apple Fitness / Apple Watch — awards + limited-edition challenges

- **Ladder shape:** a deep, evergreen award library — Apple's badge case is
  categorised "Close Your Rings, Monthly Challenges, Limited Edition, Workouts,
  Competitions" ([wareable](https://www.wareable.com/apple/how-to-view-earn-apple-watch-awards-challenges-badges-achievements), [macrumors](https://www.macrumors.com/guide/activity-challenge/)).
- **Personalised monthly challenge** — "Each month has its own unique fitness
  challenge… may task you with burning a specific number of calories, working out
  a number of times, or traveling a certain distance" and is tuned to the user's
  own recent history ([macworld](https://www.macworld.com/article/231140/how-to-get-all-of-the-apple-watch-activity-challenge-badges.html)).
  This is the long-tail engine: a fresh, individualised target *every month,
  forever* — there is no "desert" because the ladder regenerates.
- **Longest-streak award (directly relevant to Volyume's high-water guard):**
  "When you hit your Move goal several days in a row, that's a 'streak.' You get
  this award when your streak finally ends, **if it's longer than your previous
  best streak**" ([macworld](https://www.macworld.com/article/231140/how-to-get-all-of-the-apple-watch-activity-challenge-badges.html)).
  Apple celebrates the *record* on the way down, not the break — a no-shame
  reframe of streak loss.
- **Limited-edition events** — Global Close Your Rings Day (24 Apr): close all
  three rings → "a limited-edition award, plus 10 animated stickers and an
  animated badge for Messages," plus a **physical pin** at Apple Stores "while
  supplies last" ([apple.com newsroom](https://www.apple.com/newsroom/2025/04/get-active-with-apple-watch/)).
  The 2026 "Ring in the New Year" challenge: close all three rings 7 days in a
  row in January ([9to5mac](https://9to5mac.com/2025/12/16/apple-announces-2026-ring-in-the-new-year-challenge-for-apple-watch-users/), [macrumors](https://www.macrumors.com/2025/12/16/apple-2026-new-year-activity-challenge/)).
- **ED-safe note:** watchOS 11 added **rest days / pausing rings without losing
  award streaks** (base doc G28, verified) — Apple itself retrofitted forgiveness
  into a previously rigid system. Volyume's deload-aware `resting` state is the
  *native* version of what Apple bolted on.

### 1.3 Peloton — milestone tiers + Century Club + Club Peloton longevity

- **Ladder shape (per-discipline):** "a special badge for completing 1, 10, 25,
  50, 75, and 100 classes in a specific discipline, plus continue racking them up
  for every 50 classes you take after that" ([onepeloton.com/blog/milestones](https://www.onepeloton.com/blog/milestones)).
  Cross-source: increments of 25 before 100, then 50s to 500, 100s to 1,000, then
  every 500 after ([leahingram](https://www.leahingram.com/what-are-peloton-milestones/), [champagneandcoffeestains](https://www.champagneandcoffeestains.com/peloton-badge-achievement-guide-video/)).
  **The defining trait: the ladder NEVER ends** — it widens its spacing but always
  has a next rung.
- **Century Club** = the 100th class; first Century Club badge earns a free
  shirt ([leahingram](https://www.leahingram.com/what-are-peloton-milestones/), [starkinsider](https://www.starkinsider.com/2020/05/what-happens-when-you-hit-100-rides-on-a-peloton-bike/)).
  A named, identity-grade tier at exactly the point Volyume's ladder dies.
- **Club Peloton (2024–25)** — an explicit **longevity** layer: 11 levels
  (Bronze/Silver/Gold I–III, Champion, Legend), points from "workouts,
  milestones, streaks, challenges, and community engagement," "**Every point you
  earn stays with you for good and won't expire as long as you're a Member**,"
  existing members back-placed by prior activity, and **"25 points for each year
  you continue your Peloton membership"** ([onepeloton.com/blog/what-is-club-peloton](https://www.onepeloton.com/blog/what-is-club-peloton), [onepeloton.com/club-peloton](https://www.onepeloton.com/club-peloton)).
  This is the membership-longevity framing Whoop also leans on (§1.7) — rewarding
  *tenure*, not just volume.
- **Streaks** reset on a missed day/week ([leahingram](https://www.leahingram.com/what-are-peloton-milestones/)) — a punitive break Volyume deliberately avoids.

### 1.4 Strava — challenges + trophies + annual anchor

- **Trophy Case:** completed challenges become finisher badges; the four most
  recent show on profile; challenges last a day to a month, individual or group,
  with distance/elevation/time/active-days goals (support article via [search
  snippet]; [VeloViewer trophy cabinet](https://blog.veloviewer.com/strava-challenges-trophy-cabinet/)).
  The long-tail engine is **rolling monthly/limited challenges**, same pattern as
  Apple — the ladder is replenished externally, not a fixed count.
- **Achievements** (subscriber): KOM/QOM/CR, Local Legend, segment trophies 2nd–
  10th — *competitive* recognition, comparison-based, the exact mechanic the
  83-study meta-analysis (base doc V24) flags as the ED-harm vector. Volyume
  should NOT copy leaderboard trophies.
- **Year in Sport (annual anchor):** "a highly personalised recap… highlighting
  unique data insights, meaningful social engagements, and stand-out moments,"
  scenes selected by how much data you have, min 3 activities, share per-scene to
  social ([support.strava.com/.../Your-Year-in-Sport](https://support.strava.com/hc/en-us/articles/22067973274509-Your-Year-in-Sport), [strava.com/year-in-sport](https://www.strava.com/year-in-sport)).
  **CAUTION (verified in base doc V9):** Strava **paywalled** Year in Sport in
  Dec 2025 → severe multi-outlet backlash. The lesson for a-11 is hard-confirmed:
  the recap/annual anchor must be decided free-or-Pro **before launch and never
  re-gated**. Volyume's Year of Lifts being free is the right call.

### 1.5 Garmin — badges + points/levels + insights

- **Ladder shape:** badge points (1/2/4/8 each) accrue into **Levels 1–10**;
  points feed a leaderboard among connections ([support.garmin.com](https://support.garmin.com/en-US/?faq=6pECo6UIFn7ergw8kNmfu9), [garminbadges.com/faq](https://garminbadges.com/faq.php)).
  Long-tail via a **rolling monthly badge calendar** (new badges every month) and
  big cumulative expedition badges (e.g. Appalachian Trail = 2,200 mi of steps)
  — again, the never-ending ladder pattern.
- **Insights / Connect+** — Garmin's premium tier added personalised insights;
  note **Connect+ launched to backlash** (echoed in base doc V9 alongside
  Strava's). Same free/Pro-line lesson.
- ED-safe note: Garmin's system is heavily competitive/leaderboard-led — a model
  to learn the *ladder shape* from, not the comparison mechanics.

### 1.6 Hevy & Strong — the lifting-app baseline

- **Hevy** = **weekly** streak: "the number of consecutive weeks where you've
  logged at least one session… ordinal number shown when you complete your first
  session for the current week," viewable on the calendar; "Some Hevy users have
  streaks well beyond 100 weeks" ([hevyapp.com/features/gym-consistency](https://www.hevyapp.com/features/gym-consistency/);
  help-article text via search snippet — page itself 403). Hevy reached **10M+
  users** largely organically (base doc V4, verified).
  **Key contrast:** Hevy's weekly streak is a *raw consecutive-week counter* —
  no deload-awareness, no repair, no pause. A missed week breaks it. Volyume's
  deload-aware, repair-capable derivation is strictly more humane and more
  correct than the category leader's.
- **Strong** = deliberately minimal gamification (no native badge/level system of
  note; consistency surfaced via calendar/history). Confirms the lifting category
  largely *under-invests* in retention mechanics — Volyume's 23-surface system is
  already ahead of the two best-known lifting trackers on mechanism depth.

### 1.7 Headspace — milestones + no-shame comeback (ED-safe exemplar)

- **Ladder:** run-streak count beside "earned and yet-to-be-earned milestone
  badges," with "data-informed congratulatory messages along the way to get users
  past habit-forming moments" ([help.headspace.com run-streak article via search snippet]).
- **Comeback / no-shame (the gold standard for tone):** if you break a streak,
  "the important thing is to realise when you have missed a planned session and
  then continue with the next, a little like noticing when the mind has wandered
  off before returning to the breath" (Headspace help, search snippet). And from
  Headspace's own editorial (fetched verbatim):
  > "Now, the way I keep the meditation habit going is by giving myself permission
  > to miss a session from time to time."
  > "Even one day of meditation per week is better than none."
  > ([headspace.com/articles/fell-off-meditation-wagon-got-back](https://www.headspace.com/articles/fell-off-meditation-wagon-got-back))
- **Human repair:** support can manually restore a streak reset "in error" — a
  forgiveness escape hatch.
- This is the closest external philosophy to Volyume's repair/pause/`resting`
  design. Volyume *automates* what Headspace delivers as copy + a support ticket.

### 1.8 Whoop & Oura — membership-longevity + rest-as-tag

- **Whoop** frames retention around **healthspan/WHOOP Age over years**, not
  streaks: Profile "highlights WHOOP Age, levels, and streaks to show how
  consistent habits translate into improved healthspan"; "Healthspan connects
  these data points to show not just where you stand today, but how your body is
  trending over time" ([whoop.com/thelocker/healthspan](https://www.whoop.com/us/en/thelocker/healthspan/), [whoop.com/thelocker/everything-whoop-launched-in-2025](https://www.whoop.com/us/en/thelocker/everything-whoop-launched-in-2025/)).
  Healthspan also has a **soft engagement floor** (21 recoveries per 31-day
  window to keep updates). The retention frame is *longitudinal identity*
  ("becoming biologically younger"), a long-horizon anchor that never caps —
  parallel to Peloton/Whoop tenure points.
- **Oura — Rest Mode = the deload analogue.** "Rest Mode is a unique mode…
  designed for days when your body and mind need time to rest… can be used
  anytime you feel exhausted or overworked," surfaced as a non-removable **tag**
  in Trends ([support.ouraring.com/.../Rest-Mode](https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode)).
  Oura treats recovery as a *labelled, legitimate state*, not a gap — exactly
  Volyume's `resting` philosophy ("recovery is compliance, never a miss").
  Independent external validation that the deload-aware streak is best-in-class
  thinking.

### 1.9 Nike Run Club — achievement longevity (compete with your past self)

- **Ladder shape:** distance milestones (5K, 10K, half, marathon) THEN
  **cumulative lifetime distance** badges — "100 miles, 500 miles, 1,000 miles
  lifetime — provide a continuing target that scales with the runner's
  progression"; auto-levels ([nike.com/help/nrc-run-level](https://www.nike.com/help/a/nrc-run-level), [trophy.so NRC case study](https://trophy.so/blog/nike-run-club-gamification-case-study)).
  Explicitly "built primarily around competition with your past self rather than
  with other runners" — the ED-safe self-relative posture Volyume already holds.
  The lifetime-distance tail is NRC's answer to the post-100 desert: the ladder
  simply keeps climbing on a cumulative axis.

### 1.10 Live events / annual recaps as retention anchors

- **Spotify Wrapped** (the recap archetype Volyume's Year of Lifts already
  emulates): verified in base doc — Wrapped 2020 drove **+21% weekly app
  downloads**; Wrapped 2025 hit **200M engaged in ~24h, ~500M shares** (base doc
  V28, G23). The annual recap is the single most powerful re-engagement *and*
  acquisition artefact in consumer apps. Strava/Garmin both copied it; both then
  mis-stepped by gating it (§1.4, §1.5).
- **Pokémon GO–style live events:** time-boxed community events drive spikes, but
  the mechanic is comparison/competition-heavy and FOMO-driven — not ED-safe in
  raw form. The *transferable* idea is Apple's limited-edition, **non-competitive,
  participation-only** event (close your rings on one named day) rather than a
  leaderboard event. Keep events solo-or-cooperative, never ranked.

---

## 2. Synthesis

### (a) Winner patterns (with sources)

1. **The ladder must never end** — every retention leader replenishes the ladder
   past 100/year 1, by one of three shapes:
   - *Widening fixed increments* (Peloton: 25→50→100→500 forever; NRC: 100/500/
     1,000-mi lifetime) — [Peloton milestones](https://www.onepeloton.com/blog/milestones), [NRC](https://www.nike.com/help/a/nrc-run-level).
   - *Regenerating personalised periodic targets* (Apple monthly challenge, Strava
     monthly challenges, Garmin monthly badges) — [macworld](https://www.macworld.com/article/231140/how-to-get-all-of-the-apple-watch-activity-challenge-badges.html), [Garmin](https://support.garmin.com/en-US/?faq=6pECo6UIFn7ergw8kNmfu9).
   - *Longitudinal identity / tenure* (Whoop Age & healthspan; Peloton's 25
     points per membership-year; Duolingo 365-day VIP) — [Whoop](https://www.whoop.com/us/en/thelocker/healthspan/), [Club Peloton](https://www.onepeloton.com/blog/what-is-club-peloton).
2. **Forgiveness is now standard, and validated** — Duolingo's freeze-as-slack
   (UPenn/UCLA), Apple's watchOS 11 rest-day rings, Oura Rest Mode, Headspace's
   "permission to miss," Whoop's recovery framing. Rigid streaks are the old
   model; the leaders all retrofitted forgiveness. [Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit/), [Oura](https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode), [Headspace](https://www.headspace.com/articles/fell-off-meditation-wagon-got-back).
3. **Celebrate the record, not the break** — Apple fires the longest-streak award
   *when the streak ends, if it beat your best* ([macworld](https://www.macworld.com/article/231140/how-to-get-all-of-the-apple-watch-activity-challenge-badges.html)).
4. **The annual recap is the strongest single anchor** — Spotify/Strava prove it;
   it must be **free and never re-gated** (Strava Dec-2025 paywall backlash, base
   doc V9).
5. **Named tiers create identity** — "Century Club," "Legend," "VIP," "WHOOP Age"
   — a *name* converts a number into membership.

### (b) Where Volyume already leads, honestly

- **Deload-aware streak** — uniquely correct. Hevy/Peloton reset on any miss;
  Apple/Oura had to bolt rest-days on. Volyume's `resting` state (deload +
  ED-suppression collapsed into one indistinguishable benign label) is *native*
  and is the same philosophy Oura's Rest Mode and Apple's rest-day rings reach
  for — Volyume got there structurally, not as a retrofit.
- **Repair without shame, capped & quiet** — the bridge rule (one per rolling 6
  weeks) and the calm surfaced-repair line beat Duolingo's *paid* repair and
  Peloton's hard reset. Headspace matches the philosophy only via copy + a
  support ticket; Volyume automates it.
- **ED suppression of the whole streak surface** — no competitor suppresses its
  gamification under a wellbeing signal. This is category-leading and
  defensible on the verified harm literature (83-study meta, Sheen 2025).
- **Block-aware recaps with neutral framing** — the monthly recap's calm/ED
  neutral path and the block tonnage-climb slide exceed Strava/Spotify recaps,
  which have no safety-framing path at all.
- **Self-relative throughout** — like NRC ("compete with your past self"),
  Volyume has zero leaderboards/comparison, the right ED-safe posture; Strava/
  Garmin lead with comparison and inherit its harms.
- **Privacy-clean share cards** (no PII) — ahead of typical share artefacts.

### (c) Ranked pick-ups vs a-11's frictions — Besa (newbie/light) AND Eddie (athlete)

Ranked by retention impact × fit × ED-safety:

1. **WIRE THE 4/12/26/52-WEEK STREAK MILESTONES (a-11 friction #2).** They are
   computed (`pendingMilestone`) and dropped. For **Besa** these are *the*
   beats — a quarter/half/full year of weeks-running is the consistency reward
   the whole expanded-scope persona lives for. Apple/Duolingo/Headspace all fire
   exactly this class of consistency milestone. Lowest-effort, highest-impact
   fix. (Evidence: Duolingo Streak Society tiers; Apple Perfect Month/streak
   awards.)
2. **EXTEND THE SESSION LADDER PAST 100 — widening increments (a-11 #3).** Adopt
   the Peloton/NRC shape: after 100, every 50 (then 100, then 250…) so the ladder
   *never* dead-ends. Add a **named tier** at 100 ("Century"-class) to convert the
   terminal rung into an identity moment rather than a cliff. Serves **Eddie**
   (daily user hits 100 in ~3–4 months) and any long-tenure Besa. (Evidence:
   [Peloton](https://www.onepeloton.com/blog/milestones), [NRC lifetime distance](https://www.nike.com/help/a/nrc-run-level).)
3. **REAL BLOCK-COMPLETION EVENT, not a heuristic (a-11 #5).** A status='completed'
   writer firing one deliberate celebratory beat at mesocycle end (the current
   `weekIndex >= plannedWeeks` heuristic misses early-stoppers and re-fires on
   over-trainers). For **Eddie** the end of a hard block is the emotional peak and
   it is under-marked — a "block complete" moment is the lifting analogue of NRC's
   training-plan completion reward and Strava's challenge finisher badge.
4. **WIRE THE FORWARD-LOOKING NUDGE `nextSessionRung` (a-11 #4).** "N sessions to
   your next milestone" — implemented, never called. Approach-motivation is the
   most motivating part of a ladder for **Besa**. Apple's monthly challenge and
   Garmin's badge progress both surface *approach*, not just arrival.
5. **A LONGITUDINAL/TENURE ANCHOR + post-100 celebration cadence.** Borrow the
   Whoop/Peloton tenure idea in an ED-safe, non-numeric-bodyweight form: recognise
   *training tenure* (months/years training, blocks completed) as a standing
   identity, and ensure the post-100 period has *some* beat before D365 Year of
   Lifts (monthly recap already exists — make the streak-milestone + extended
   ladder fill the gap). Closes the "celebration desert" for both personas.

Supporting fixes (lower rank, already named in a-11): move streak/milestone/
win-back state to a **synced table** (a-11 #1 — the biggest *correctness* gap,
blocks multi-device and the partner view); give **Year of Lifts a calm/ED
neutral path** to match the monthly recap; reconcile the two "milestone" systems.

### (d) What everyone has that we lack

- **A ladder that never ends.** Every leader (Peloton, Apple, Strava, Garmin,
  NRC, Duolingo) has a post-100 / post-year-1 continuation; Volyume's session
  ladder stops at 100 and the weekly-milestone ladder never fires at all. This is
  the one structural gap shared across the entire competitive set.
- **Regenerating periodic challenges** (Apple/Strava/Garmin monthly) — a
  self-replenishing target source Volyume has no analogue for. (Adopt cautiously:
  participation-only, self-relative, never ranked — per ED lens.)
- **Named identity tiers** (Century Club / Legend / VIP / WHOOP Age) — Volyume's
  milestones are events, not standings; no persistent *status*.
- **A discrete completion artefact for finishing structured work** — Strava
  finisher badges / NRC plan-completion rewards. Volyume's block "completion" is a
  recap *row*, not a celebration.

What Volyume should explicitly **NOT** adopt (everyone has it; it conflicts with
the safety boundary): leaderboards / competitive trophies (Strava KOM, Garmin
levels), paid streak repair (Duolingo), hard streak resets on a miss (Peloton/
Hevy), and re-gating the annual recap (Strava's verified mistake).

---

## 3. Confidence & provenance

- **Load-bearing claims double-sourced:** Peloton ladder shape (onepeloton +
  leahingram/champagne), Duolingo spine (base validation doc + live blog fetch),
  Apple longest-streak/limited-edition (macworld + apple.com newsroom + macrumors),
  Strava recap free→paid lesson (base doc V9 + Strava support/press), Hevy weekly
  streak (features page + help snippet), Wrapped impact (base doc V28/G23).
- **Single-source / vendor-grade, flagged as such:** Trophy.so's NRC/achievement
  retention percentages (e.g. "metric achievements 34.0% vs streak 25.6% D1
  retention") are a gamification-API **vendor's own platform data** — same
  caution the base doc applied to Trophy's Nike figure (G19). Used only as
  directional colour, never as industry evidence. Club Peloton point thresholds
  came from a single fetched blog quoting the in-app screen — treated as
  illustrative, not load-bearing.
- **UNVERIFIABLE (stated, not invented):** exact Headspace milestone-day
  thresholds (help page 403; philosophy verified, thresholds not); whether Club
  Peloton status can be lost (source silent).

*r-11 complete 2026-06-12. No code modified. Not committed — for orchestrator
spot-check and synthesis.*
