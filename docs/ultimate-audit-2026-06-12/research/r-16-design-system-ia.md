# r-16 — Design system, look & feel, navigation IA (external research)

Ultimate-app mandate, Phase 2. Area 16. Paired to audit a-16. Fetched sources,
British English. No commit.

## STEP 0 — tooling proof (verbatim quote + URL)

Live WebFetch succeeded end-to-end against Wikipedia/Strava. Verbatim quote:

> "Beacon is a feature that allows Strava users to share their location in real
> time with anyone they choose and nominate others as a safety contact."

Source (fetched, HTTP 200): https://en.wikipedia.org/wiki/Strava

Tooling proven. Proceeding.

---

## Method + fetch-failure log

Mix of direct WebFetch (verbatim) and WebSearch result-snippets (each app's own
help-centre / press content). Load-bearing IA claims (where the coach lives)
carry 2+ corroborating sources where possible.

Fetch failures (logged per protocol):
- `https://www.hevyapp.com/` and `.../hevy-tutorial/` — bot-verification wall
  ("Please wait while your request is being verified…"). Hevy IA recovered via
  search snippets of the same pages instead.
- `https://support.whoop.com/.../WHOOP-App-Navigation-Bar` — HTTP 403.
  Recovered via search snippet of the same support article + a second source.
- `https://wellness.alibaba.com/fitlife/whoop-strength-trainer-guide` — HTTP 403.

Total distinct fetch failures: **3 URLs** (all routed around with corroborating
search sources; no claim rests solely on a failed fetch).

---

## (a) TAB-IA PATTERNS — where the coach lives, per app

Three structural archetypes emerge. The headline finding for a-16: **the field
splits cleanly between "coach is a home/tab" (wearables + nutrition coaches) and
"coach is buried / is the whole app" (loggers + AI-programmers). Volyume sits in
the worst quadrant — it HAS a deterministic coach but hides it.**

### Archetype 1 — dedicated Coach / Strategy tab (coach is first-class)

- **WHOOP** — 5-tab bar; a literal **Coaching tab**. "The Coaching section gives
  you access to Strain Coach, Sleep Coach, and your Performance Assessments";
  Home holds Overview/Strain/Recovery/Sleep. Coaching is a peer of Home, not a
  child of a profile.
  Sources: https://support.whoop.com/hc/en-us/articles/360056034814-WHOOP-App-Navigation-Bar
  (snippet) ; https://www.whoop.com/us/en/thelocker/whoop-unveils-the-new-whoop-coach-powered-by-openai/
- **MacroFactor** — coaching unified under a **Strategy tab**: "When you have a
  check-in available, there will be a small alert indication on the Strategy
  tab"; "The Strategy page unifies all coaching, goal-setting, and macro
  program-related features under one roof." The weekly adjustment (its core
  differentiator) gets its own destination + alert badge.
  Sources: https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules
  (fetched, verbatim) ; https://macrofactor.com/dashboard-revamp/
- **Caliber** — human coach lives in a dedicated **in-app chat/messaging
  surface**: "in-app chat + video messaging with your coach and weekly progress
  reviews"; users "speak with their personal trainer almost daily via the chat
  feature." Coach = a persistent conversation thread, not a screen you hunt for.
  Sources: https://www.garagegymreviews.com/caliber-app-review ; https://barbend.com/caliber-fitness-app-review/
- **Noom** — coaching split across a persistent **Coach/chat channel** + daily
  lessons on Today's Plan + a Success Kit tab: "Noom offers different types of
  coaching, from AI support to human Coaches"; AI assistant "Welli" surfaces a
  Meal Insight inline at log-time. Coaching is woven into the daily loop, not
  parked.
  Sources: https://www.noom.com/support/faqs/coach-and-community/2025/10/what-can-i-ask-my-coach-or-welli/ ;
  https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/how-to-find-and-revisit-your-noom-lessons/

### Archetype 2 — coach IS the home tab (recommendation engine = the app)

- **Fitbod** — "The first view of the app is the 'workout' tab"; the AI-built
  session (the coaching output) IS the landing screen. Plus a Recovery tab
  (muscle-rest map) and a Log tab. No separate "coach" — the coach's output is
  the front door.
  Source: https://fitbod.me/blog/a-better-workout-tab/ ; https://medium.com/product-x-management/app-critique-fitbod-b78db0b8e61e
- **JuggernautAI** — autoregulation engine drives the session screen directly;
  you log readiness (sleep/soreness/motivation) + RPE/RIR and the plan adjusts.
  The "coaching" is the load/volume adjustment surfaced inside the workout, not a
  tab. (Closest analogue to Volyume's deterministic Precision Coaching, but
  Juggernaut surfaces the adjustment AT the set; Volyume parks it in You.)
  Source: https://dr-muscle.com/juggernaut-workout-app-review/ ; https://www.juggernautai.app/
- **RP Hypertrophy** — mesocycle-calendar IS the structure; no conventional tab
  bar (web-app shell). Users navigate Week/Day grid. Notably criticised for the
  *absence* of a calendar tab to review past work — a cautionary tale on
  under-structuring navigation.
  Source: https://dr-muscle.com/rp-hypertrophy-app-review/

### Archetype 3 — pure logger, no coach surface (Volyume's free-tier neighbours)

- **Strong** — 4 tabs: **Workout / History / Exercises / Profile**. "the simplest
  interface of any fitness app." Profile holds widgets+charts; Exercises is its
  own tab. No coaching (deliberate). Exercise detail uses a 4-tab sub-nav
  (About/History/Charts/Records) — a clean progressive-disclosure pattern.
  Source: https://help.strongapp.io/article/229-my-first-workout ; https://help.strongapp.io/article/237-about-exercise-detail
- **Hevy** — 3 primary tabs: **Home (feed/Discover) / Workout (routines+Explore
  programs) / Profile (analytics+settings gear)**. Social feed is the Home tab;
  analytics live under Profile. No coach.
  Source: https://www.hevyapp.com/hevy-tutorial/ (via search snippet, fetch
  bot-walled) ; https://www.hotelgyms.com/blog/how-to-use-the-hevy-app
- **Boostcamp** — program-library-centric (130+ coach-designed + 11,000+
  community programs, filterable by experience/goal/days). The "coach" is the
  pre-built program author, not an in-app surface. Free core, premium analytics.
  Source: https://www.boostcamp.app/features ; https://www.boostcamp.app/free-workout-app

### Archetype 4 — wearable/ring summary-first (relevant to dashboard density)

- **Apple Fitness** — 3 tabs: **Summary / Fitness+ / Sharing**. Summary is fully
  user-customisable ("add, edit, move, and remove fitness metrics"). Premium
  content (Fitness+) is its own tab, hidden if not subscribed — a clean gating
  precedent.
  Source: https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios ;
  https://www.imore.com/fitness-app-everything-you-need-know
- **Oura** — **collapsed 5 tabs → 3** (Home/Readiness/Sleep/Activity/Resilience
  → **Today / Vitals / My Health**) in the Oct-2025 redesign, explicitly "to
  reduce information overload while providing deeper insights for users who want
  to dig into specific metrics." Today = interpreted/dynamic; Vitals = raw data;
  My Health = long-term trends. A live, documented case of de-cluttering a 5-tab
  bar — directly relevant to Volyume's overloaded You tab.
  Source: https://ouraring.com/blog/new-oura-app-experience/ ;
  https://tech.yahoo.com/wearables/articles/ouras-made-big-changes-app-182805861.html
- **Peloton** — content-heavy bottom nav (Home / Programs / Classes(→Workouts) /
  Experiences / Schedule / Challenges) with a personalised, dynamic Home of
  recommendation rows; recently *renamed* "More" → "Experiences" and slimmed
  Profile to Progress/History/Achievements. Shows a mature app actively
  re-labelling tabs for clarity.
  Source: https://www.pelobuddy.com/peloton-experiences-interface/ ;
  https://www.onepeloton.com/press/articles/revamping-peloton-homescreen-experience-with-personalized-rows
- **Gentler Streak** — see (b)/accessibility; summary-first, kindness-led.

**Coach-location summary table**

| App | Coach lives in | Tab archetype |
|---|---|---|
| WHOOP | dedicated **Coaching tab** (peer of Home) | 1 |
| MacroFactor | dedicated **Strategy tab** (+ alert badge) | 1 |
| Caliber | persistent **chat/messaging** surface | 1 |
| Noom | **Coach channel** + daily-plan lessons + inline AI | 1 |
| Fitbod | **Workout tab = landing** (coach output is home) | 2 |
| JuggernautAI | **inside the session** (adjustment at the set) | 2 |
| RP | mesocycle calendar (no coach tab) | 2 |
| Strong / Hevy / Boostcamp | none (pure logger) | 3 |
| Apple Fitness / Oura / Peloton | summary-first dashboards | 4 |
| **Volyume (today)** | **buried in You tab, fragile getParent jump** | — (worst) |

The verdict for a-16: **every app that has a coaching differentiator gives it a
first-class home — a tab (WHOOP, MacroFactor), a persistent thread (Caliber,
Noom), or the landing screen (Fitbod, Juggernaut).** None bury it two tabs deep
under a person icon reachable only via a cross-tab `getParent` jump. Volyume's
deterministic coach is its moat and is placed worse than any leader's.

---

## (b) WHERE VOLYUME ALREADY LEADS (honest)

These are genuine, not flattery — corroborated against what the field actually ships:

1. **Token rigour / self-documenting system.** a-16 verified ~45 dark + ~34
   light colour tokens, semantic type roles with getters, Material-3 motion
   tokens, named spacing/radius escape hatches, a phantom-token guard test. The
   external field is dominated by Dribbble dark-theme UI-kits and ad-hoc systems;
   no public evidence any logger (Strong/Hevy/Boostcamp) ships a comparably
   formalised, theme-keyed, CVD-aware token layer with a guard test. This is a
   real lead.
2. **Okabe-Ito CVD palette + state-colour grammar.** Volyume's `warning` retuned
   to Okabe-Ito yellow so "watch" ≠ amber action, with full CVD swaps
   (success→sky-blue, error→reddish-purple), theme-keyed. CVD-first palettes are
   essentially absent from the competitor marketing/help corpus surveyed — this
   is an accessibility lead, not a follow.
3. **Adherence-neutral / shame-free visual intent.** The mandate's "welcoming,
   supportive, without losing performance" maps exactly onto the one philosophy
   the field's most-awarded design app is built around — Gentler Streak's
   kindness-led, "less about hard comparisons" Monthly Summary (2024 Apple
   Design Award, Social Impact). Volyume already has the EmptyState primitive
   designed "shame-free, directional." Volyume is philosophically aligned with
   the best-in-class — it just hasn't *adopted* its own primitive (1/44).
4. **Dark default is the correct, on-trend baseline.** Dark-first is the de-facto
   fitness norm (Strava-style "bright accents on dark draw the eye… easy to spot
   during/after an activity"; readable in gym lighting). Volyume's audited,
   shipped dark theme is exactly where the field is.
   Source: https://www.designrush.com/best-designs/apps/trends/fitness-app-design-examples

---

## (c) RANKED PICK-UPS vs a-16's frictions — for Besa (newbie) AND Eddie (athlete)

**TOP 5 (ranked by leverage against a-16 frictions):**

1. **Give the deterministic coach a first-class home — YES, the field justifies a
   Coach surface.** WHOOP (Coaching tab), MacroFactor (Strategy tab + alert
   badge), Caliber/Noom (persistent thread), Fitbod/Juggernaut (coach-as-landing)
   all do. Recommendation for the dual market: NOT necessarily a 6th tab (Oura
   *removed* tabs; Peloton consolidates) — but at minimum a **stable, badged
   direct route** from the daily Train loop, mirroring MacroFactor's "alert
   indication on the Strategy tab when a check-in is available." Kills a-16's
   fragile `getParent` jumps (§2c) AND surfaces the moat. Besa sees a friendly
   "your coach has something for you" prompt; Eddie gets a fast 1-tap to the
   adjustment. (Decision for founder: dedicate the existing 5th "You" tab to
   coaching identity, OR add a 6th Coach tab, OR Fitbod-style surface the weekly
   output on the Train home. Multi-choice — keep building either way.)
2. **Surface the coaching adjustment AT the moment, like Juggernaut/MacroFactor.**
   Juggernaut adjusts load "after receiving your RPE feedback" *in the session*;
   MacroFactor badges the check-in. Volyume parks CoachOutput in You. Pick up:
   inline coach nudges in the Train loop (Eddie) + a badge that pulls Besa toward
   her first check-in. Adherence-neutral phrasing per Gentler Streak.
3. **Adopt the EmptyState primitive as directional onboarding (1/44 → broad).**
   Best practice is unambiguous: "avoid users feeling like they've hit a wall";
   "forcing users through a directional flow"; starter/dummy content (Whimsical);
   "informative text + explicit action CTA" (Google Currents). Volyume already
   built the right primitive — every "No … yet" screen should become a next-step
   for Besa. Directly answers the mandate's welcoming/supportive lens.
   Source: https://www.pencilandpaper.io/articles/empty-states (fetched, verbatim)
4. **Honour the OS reduce-motion setting (WCAG 2.3.3) — Gentler Streak is the
   bar.** Gentler Streak explicitly supports "Reduce Motion… reduces iOS
   animations," Dynamic Type ("Display and Text Sizes… bold, increase font
   sizes, reduce transparency, increase contrast"), and VoiceOver — and won an
   Apple Design Award partly for inclusivity. a-16 gap #3: Volyume reads only its
   in-app flag, never `AccessibilityInfo.isReduceMotionEnabled()`. Pick up the OS
   read; it costs almost nothing and matches the accessibility leader.
   Source: https://9to5mac.com/2023/04/06/gentler-streak-ios-accessibility-features/ (fetched, verbatim)
5. **Solve dual-market density via progressive disclosure + customisable
   dashboards, NOT a separate "newbie mode".** How the field actually solves it:
   (i) Strong/Hevy keep ONE simple UI and let depth live in drill-downs (exercise
   detail's About/History/Charts/Records sub-tabs) — same UI serves beginner and
   powerlifter; (ii) Apple Fitness & Peloton make the **dashboard
   user-customisable** ("add, edit, move, remove fitness metrics"; personalised
   rows) so each persona curates their own density; (iii) Oura splits
   *interpreted* (Today) from *raw* (Vitals) so light users live on the
   interpreted layer and athletes drill to raw — a clean density axis without
   forking the app; (iv) Boostcamp filters content "by experience level." So:
   Volyume should add a **progressive-disclosure / customisable-summary axis**
   (interpreted-vs-detailed), not a hard beginner/advanced toggle. Besa lives on
   the interpreted layer; Eddie expands to dense tabular/volume-band data. The
   token system already centralises spacing — feasible.
   Sources: https://ouraring.com/blog/new-oura-app-experience/ ;
   https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios ;
   https://help.strongapp.io/article/237-about-exercise-detail

Secondary pick-ups:
- **Relabel/consolidate the You tab** — Peloton actively renames tabs for clarity
  ("More"→"Experiences"); Oura collapsed 5→3 to cut overload. Volyume's 33-screen
  You tab is the clearest consolidation target.
- **Badge-driven re-engagement on the coach surface** (MacroFactor's check-in
  alert) — pulls light users back without nagging.
- **Customisable home rows** (Peloton/Apple) — lets Eddie pin volume/PBs and Besa
  pin the next workout.

---

## (d) WHAT EVERYONE HAS THAT WE LACK

1. **A first-class, directly-reachable coaching home** (WHOOP/MacroFactor tab;
   Caliber/Noom thread; Fitbod/Juggernaut landing). Volyume alone buries it.
2. **A density / interpreted-vs-raw answer** for mixed audiences (Oura
   Today/Vitals; Apple/Peloton customisable dashboards; Strong drill-down).
   Volyume has one scale for both personas (a-16 §3).
3. **OS-level reduce-motion respect** (Gentler Streak). Volyume ignores it.
4. **Adopted directional empty states** as onboarding scaffolding (the field's
   stated best practice). Volyume built the primitive but uses it once.
5. **Verified, shipped light theme** — most leaders treat light/dark as
   first-class; Volyume's light theme is beta/unverified (a-16 §3), and the
   primary Button still has a light-theme contrast bug (a-16 gap #2).

Note Volyume is NOT behind on token quality, CVD palette, or dark-theme craft —
those are leads, not gaps (see (b)).

---

## VERIFICATION NOTES
- Verbatim-fetched (HTTP 200): Strava/Wikipedia; MacroFactor coaching help;
  Gentler Streak accessibility (9to5mac); empty-state best practice (Pencil&Paper).
- Load-bearing coach-location claims carry 2+ sources (WHOOP, Caliber, Oura).
- 3 fetch failures logged above; all routed around with corroborating sources.
- UNVERIFIABLE where stated; no invented competitor behaviour.
