# Best-in-Class Patterns — Volyume Elite Audit (Input O8)

**Author:** Agent O8 (pattern researcher). **Date:** 2026-07-04.
**Web access:** YES — WebSearch/WebFetch succeeded for every load-bearing claim
below. Where a claim rests on training knowledge rather than a fetched source it
is tagged `[training-knowledge]`.
**Scope:** design/product PRINCIPLES of the current era (2025–2026), not
competitor feature parity (a sibling agent owns that). For every principle:
source URL, exemplar app, the PRINCIPLE (transferable, not the feature), and a
Volyume-fit verdict — **adopt** / **adapt** (with the Volyume-native twist named)
/ **avoid** (why).

---

## Executive summary (10 lines)

1. The platform ground shifted in 2025: iOS 26 introduced **Liquid Glass** (a
   translucent, light-reactive material for the *navigation layer only*), and
   Android shipped **Material 3 Expressive** (spring physics, shape morphing,
   haptic-coupled motion). Premium now = restrained depth + physics-based motion.
2. The winning cross-platform stance is "one brand, two dialects": Spotify /
   Airbnb feel unmistakably themselves yet obey each platform's motion, sheet and
   navigation idioms — never lowest-common-denominator.
3. Streaks retain via loss-aversion but breed anxiety; the ethical fix is **mercy
   infrastructure** (streak freeze / repair) that removes the catastrophic-failure
   state without removing the daily meaning. Gentler Streak goes further: reward
   showing up, reframe rest as valid.
4. Onboarding norm is **effort-before-value with a 3-minute path to an "aha"** and
   **progressive profiling + contextual permission choreography** — ask each
   permission at the moment its feature is used, not upfront.
5. Progress-photo craft is a solved pattern elsewhere: **ghost-overlay guided
   capture** for consistent framing, timeline + side-by-side comparison, and
   private-by-default trust — all of which map cleanly onto Volyume's on-device
   photo lock.
6. Supportive social beats competitive social for the vulnerable-to-shame fitness
   audience: **kudos and presence signals retain; global leaderboards eject the
   non-elite majority.**
7. Paywall enforcement tightened hard: Apple now **rejects free-trial toggles**
   (Guideline 3.1.2); the compliant, higher-trust pattern is the **honest
   timeline paywall** ("Today → reminder day → charge day").
8. Notifications users *praise* are **earned, budgeted, quiet-hours-aware and
   warm in tone**; manipulative streak-guilt pushes backfire on lapsed users.
9. "Premium" is a sum of micro-details: **motion at moments of meaning, crafted
   empty states, warm copy, latency masking** (skeletons/optimistic UI).
10. The single pattern most apps copy that **Volyume should refuse**: manufactured
    streak-loss anxiety and variable-reward slot-machine loops — they conflict
    with the calm, no-shame, ED-safe brand and its deterministic-no-AI trust
    stance.

---

## 1. Platform design now (iOS 26 HIG · Material 3 Expressive)

**iOS 26 — Liquid Glass.** Apple's biggest visual change since iOS 7 (WWDC
2025). A translucent material that refracts and reflects surrounding content,
adapts to light/dark and to the content beneath, with real-time specular
highlights. Crucially: *"the glass material is reserved for the navigation layer
(nav bars, tab bars, buttons) that floats above your content"* — content itself
stays legible and calm.
- Source: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ ; https://github.com/conorluddy/LiquidGlassReference
- Exemplar: Apple system apps (iOS 26).
- **Principle:** depth and material belong to the *chrome that floats*, not the
  data; hierarchy is expressed by letting foreground controls sit visibly above
  content, not by decorating the content.
- **Volyume-fit: ADAPT.** Volyume is a managed Expo/React-Native app on a
  dark, token-based system and will not get true Liquid Glass rendering for free.
  Twist: emulate the *intent* — a subtly translucent/blurred floating tab bar and
  nav layer (e.g. `expo-blur`), reserved for chrome, over calm flat content
  surfaces. Do **not** chase literal glass everywhere (perf + brand calm). Keep
  large-title collapse behaviour and native sheet idioms (detents, grabber).

**Android — Material 3 Expressive** (Google, May 2025; Android 16). A
spring-based motion system, shape-morphing transitions, refreshed colour and
type, and **haptics coupled to motion** (e.g. dismissing a notification gives a
detach animation + haptic rumble while neighbours react). Google's own research
framed Expressive as making key actions faster to find and more emotionally
engaging.
- Source: https://m3.material.io/blog/building-with-m3-expressive ; https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/ ; https://android-developers.googleblog.com/2025/08/introducing-material-3-expressive-for-wear-os.html
- Exemplar: Android 16 system UI, Wear OS.
- **Principle:** motion should feel like physics (spring, not linear ease), and
  meaningful actions should be *felt* (haptic) as well as seen; expressiveness is
  earned emphasis, not decoration everywhere.
- **Volyume-fit: ADAPT.** Adopt spring-based motion tokens and haptic coupling on
  *moments of meaning* (set logged, check-in saved, PB hit). Twist: Volyume's
  brand is calm, so "expressive" is dialled to *quiet confidence* — smaller
  amplitude, warmer timing — not the playful bounce Google demos. Note the
  founder-gated Core-Haptics dependency question (CLAUDE.md item 13) governs how
  far haptics can go; do not assume it.

**Dynamic colour.** Material 3's Material You derives palettes from wallpaper.
- **Volyume-fit: AVOID (as literal feature).** Volyume owns a deliberate dark
  brand palette in `theme.js`; user-wallpaper-derived colour would fracture brand
  coherence and the ED-safe calm. Keep tokenised brand colour on both platforms.

**One brand, two platforms.** Top cross-platform apps (Spotify, Airbnb,
Instagram) "feel the same on iOS, Android and web — not identical, but
unmistakably theirs," achieved by keeping brand identity constant while yielding
platform-specific navigation, gestures, sheets and back behaviour.
- Source: https://www.uxpin.com/studio/blog/ios-vs-andoid-ui-design-for-mobile/ ; https://rosalie24.medium.com/creating-consistent-ui-design-for-cross-platform-apps-40e5aec6ee83 ; https://m2.material.io/design/platform-guidance/cross-platform-adaptation.html
- **Principle:** brand = colour, type, voice, motion character (constant);
  platform = navigation model, sheet/modal idioms, system gestures, back
  affordance, haptic vocabulary (per-platform). Never average the two into
  something native to neither.
- **Volyume-fit: ADOPT.** This is the governing rule for the whole audit: hold
  `theme.js` tokens and coaching voice constant; branch navigation/sheet/haptic
  idioms by platform (largely already what RN gives, but audit for iOS large
  titles, Android predictive-back, platform sheet detents, and per-platform
  haptic mapping).

---

## 2. Habit formation & retention loops (beyond the Hook model)

**Loss aversion is the engine — and the hazard.** Streaks retain because losing
a 90-day streak feels ~2× worse than the joy of extending it; users protect
rather than pursue. But "streak-break emotions are disproportionate to the actual
loss," which is where anxiety and churn live.
- Source: https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature ; https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/
- Exemplar: Duolingo.

**Mercy infrastructure.** Streak Freeze / repair "removes the catastrophic
failure state that causes abandonment without eliminating the daily pressure";
Duolingo's freeze reportedly cut at-risk churn ~21%. *"A streak that can never be
repaired is a bomb set for a bad day."*
- Source: https://trophy.so/blog/duolingo-gamification-case-study
- **Principle:** never let a single missed day be terminal. Provide a graceful,
  low-drama recovery so the loop survives illness, travel and grief.
- **Volyume-fit: ADAPT.** Volyume should track *consistency*, not fragile
  perfect-streak counters. Twist: frame it as a **weekly rhythm / "showing up"**
  rather than an unbroken chain, with an automatic, no-shame grace so a missed day
  never triggers red-alert copy. This is a hard line given ED-safety: any
  weight/food-adjacent streak pressure is dangerous.

**Gentler Streak — the calm-brand exemplar to study closely.** It was built
*because* the founder "worked out too much and needed something to say when it
was enough." Principles it embodies:
- Meet people where they are: *"if a 15-minute walk is what your body can do at
  that moment, that's great."*
- **Reframe rest as valid** — rest/recovery days are tracked as healthy, not as
  failures; the app suggests rest.
- Encouragement over performance; a supportive mascot ("what your heart would be
  telling you").
- **Self-comparison, not peer-comparison** — Monthly Summary shows progress
  relative to your own history.
- Contrast cited by users: Apple's Activity Rings "feel like high pressure and
  lead to feelings of failure," Gentler Streak "feels encouraging."
- Source: https://developer.apple.com/news/?id=3m0ht22s ; https://www.sketch.com/blog/gentler-streak/ ; https://gentler.app/
- **Principle:** the reward is *sustainability and self-relative progress*, and
  the app has the courage to tell users to stop. Rest is a first-class state.
- **Volyume-fit: ADOPT (brand-defining).** This is the closest external analogue
  to Volyume's soul. Adopt rest-as-valid, self-relative progress framing, and the
  "tell them when it's enough" stance — which also aligns with the ED-safety
  guardrails (rapid-loss gates, energy-availability caution).

**Weekly-rhythm products.** WHOOP delivers a **Weekly/Monthly Performance
Assessment** on a fixed cadence (was in-app Monday; moved to monthly email May
2025), compressing dense biometrics into one score → trends → deep detail, and a
daily strain-recovery loop "without gamification gimmicks."
- Source: https://www.whoop.com/gb/en/thelocker/new-weekly-performance-assessment/ ; https://www.925studios.co/blog/whoop-design-breakdown
- **Principle:** a predictable weekly ritual (a "moment" the user anticipates)
  drives retention more calmly than daily nagging; layer data (headline → trend →
  detail) so it's glanceable yet deep.
- **Volyume-fit: ADOPT.** Volyume already runs a deterministic `runWeeklyCoach`;
  package its output as an anticipated **weekly moment** with a single headline,
  then trends, then detail. Twist: keep it deterministic and explainable (no AI),
  which is itself a trust signal WHOOP-style loops lack.

**Variable reward, done ethically.** The literature's line: habit design is
ethical "when product value aligns with a natural behaviour loop," manipulative
when it exploits it (streak speed-running that harms the actual outcome).
- Source: https://dev.to/pocket_linguist/why-duolingos-gamification-works-and-when-it-doesnt-1d4
- **Principle:** reward the behaviour that *is* the value (a logged session, an
  honest check-in), never a hollow tap that games the metric.
- **Volyume-fit: ADAPT → mostly AVOID the variable part.** Volyume's rewards
  should be *predictable and earned* (deterministic coaching feedback, real
  progress), not randomised dopamine. Avoid slot-machine variability.

---

## 3. Onboarding / activation patterns

**Effort-before-value with a fast aha.** Current norm: prove worth within ~3
minutes; the "aha" can fire more than once, the first being the realisation the
product solves a real daily problem.
- Source: https://www.appcues.com/blog/mobile-onboarding ; https://www.chameleon.io/blog/successful-user-onboarding
- Exemplar: Duolingo (commit to a goal, first lesson before signup).
- **Principle:** ask for a little meaningful effort (it raises commitment), but
  deliver a tangible payoff quickly; don't front-load a long form before any
  value.
- **Volyume-fit: ADAPT.** Volyume's onboarding legitimately needs biological sex
  and required fields *before* the engine can produce a valid, safe plan (a hard
  gate: `proOnboarding.sexGate.test.js`, no defaults, no tap-through). Twist: make
  the effort *feel* like value — each required answer visibly shapes the emerging
  plan preview, so the gate reads as personalisation, not bureaucracy. The "aha"
  is the first deterministic plan/target appearing.

**Progressive profiling.** Ask one or two segmentation questions at signup;
gather the rest over time via in-app moments/behaviour.
- Source: https://formbricks.com/blog/user-onboarding-best-practices ; https://productgrowth.in/insights/healthtech/patient-onboarding/
- **Principle:** collect only what's needed to deliver the next value step;
  defer the rest to contextual moments.
- **Volyume-fit: ADAPT.** Constrained by safety (some fields are non-deferrable).
  Twist: split onboarding into "safety-critical now" vs "refine later" — collect
  the ED-safety essentials up front, progressively profile the nice-to-haves.

**Permission choreography.** Request primary permissions upfront *with a clear
why*; request secondary permissions **contextually, only when the feature is
first used.** Health apps tie each consent to a specific action.
- Source: https://www.appcues.com/blog/mobile-onboarding ; https://productgrowth.in/insights/healthtech/patient-onboarding/
- Exemplar: health apps using per-action progressive consent.
- **Principle:** never fire a stack of OS permission dialogs at launch; earn each
  one at its moment of relevance with plain-language rationale.
- **Volyume-fit: ADOPT.** Camera at first progress-photo, notifications after
  first value delivered, etc. This dovetails with the un-skippable Article 9
  health-consent gate (which is a *separate, mandatory* legal gate, not an OS
  permission — keep it first and fail-closed; do not fold it into "contextual"
  permissions).

---

## 4. Photo-progress UX

**Ghost-overlay guided capture.** The dominant pattern: the previous photo shows
faintly "ghosted" over the live camera so pose/angle/framing align in real time
("aligning becomes foolproof"). Guided/record modes standardise framing without a
tripod.
- Source: https://apps.apple.com/us/app/alignshot-overlay-camera/id6754617984 ; https://cameraoverlay.com/ ; https://apps.apple.com/us/app/apollo-camera-overlay/id6449167716
- Exemplars: AlignShot, Camera Overlay, Apollo.
- **Principle:** consistency is the entire value of progress photos; the app must
  actively help the user reproduce framing, not just store snapshots.
- **Volyume-fit: ADOPT.** Build ghost-overlay alignment for the second-and-later
  captures. Fully compatible with on-device privacy (all processing local).

**Timeline storytelling + comparison interactions.** Leading apps stitch a
timeline, export before/after as a single image or time-lapse video, and offer
side-by-side comparison.
- Source: https://gainframe.app/blog/best-progress-photo-apps/ ; https://localonelabs.com/pages/blog/best-fitness-progress-photo-apps
- **Principle:** the payoff of progress photos is the *comparison across time*;
  design the compare + timeline as the hero, not the single shot.
- **Volyume-fit: ADOPT with brand twist.** Side-by-side + timeline. Twist: calm,
  no-hype presentation (no "SHREDDED!" energy). Respect the founder-approved
  **Pro before/after progress card** exception (2026-07-03): may show bodyweight
  beside each photo, withheld entirely under calm mode / open ED flag,
  name/measurements/notes stay banned.

**Private-by-default trust.** The category's trust differentiator is that
sensitive body images never leave the device / are locked.
- **Principle:** for body images, privacy *is* the feature; make "never leaves
  your phone" explicit and visible.
- **Volyume-fit: ADOPT (already a lock).** Volyume's photos-never-leave-device is
  a genuine competitive moat; surface it prominently at the capture moment as a
  trust signal, not buried in settings.

**Transformation-moment celebration.** Category apps celebrate the reveal
(before/after export, time-lapse).
- **Principle:** mark the transformation as a genuine emotional beat.
- **Volyume-fit: ADAPT.** Celebrate quietly and truthfully — a dignified reveal,
  never body-shaming "look how bad you were" framing. Must respect calm mode / ED
  flag withholding.

---

## 5. Social accountability without toxicity

**Kudos > leaderboards for retention.** Strava's Kudos is a lightweight "the
community noticed" signal. Leaderboards "help some users but demotivate anyone who
feels permanently behind"; pure comparison "motivates the already-fit while
quietly ejecting everyone else." Fitness is "unusually vulnerable to shame."
- Source: https://trophy.so/blog/strava-gamification-case-study ; https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged
- Exemplar: Strava (Kudos), and its own leaderboard critique.
- **Principle:** reward *showing up*, not *out-performing*; acknowledgement loops
  retain broadly, ranking loops retain the top decile and shed the rest.
- **Volyume-fit: ADOPT the stance.** If Volyume adds any social layer, it is
  kudos/acknowledgement and self-relative milestones — never a global leaderboard.
  Guardrails must stay tier-blind and shame-free.

**Presence signals over metric exposure.** Supportive-accountability apps favour
"presence at execution, not retrospective dashboard review" — the partner sees
*that you showed up*, not your numbers.
- Source: https://becandid.io/blog/accountability-partner-app ; https://dontsnooze.io/blog/accountability-app-couples/
- **Principle:** "your partner trained today" (a presence signal) is supportive;
  exposing each other's weights/macros is comparison fuel and, for this audience,
  potentially harmful.
- **Volyume-fit: ADAPT.** If a partner/accountability feature ships, expose
  *presence* ("trained today"), never bodyweight/measurements/macros — this is
  also mandated by the share-card privacy rules (name/bodyweight/measurements
  banned). Small-group or pairwise supportive presence, never metric leaderboards.

**Social visibility raises consistency.** Apps with social streak features show
longer average streaks (~5.69 vs 4.25 days) — but the effect is from *belonging*,
not comparison.
- Source: https://trophy.so/blog/strava-gamification-case-study (and social.plus)
- **Principle:** belonging drives consistency; engineer belonging (presence,
  kudos) without engineering comparison.
- **Volyume-fit: ADAPT, cautiously.** Any social loop is opt-in, supportive, and
  ED-safe; if it can't be made shame-free it should not ship. Founder decision.

---

## 6. Paywall / trial UX

**Apple now polices free-trial toggles.** In early 2026 Apple began rejecting
toggle-based free-trial paywalls under **Guideline 3.1.2** as "confusing and
misleading" — the toggle defaulting to off obscured that users were committing to
an auto-renewing subscription. Google is reportedly aligning toward the same
transparency bar (toggles still technically allowed on Play/web).
- Source: https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/ ; https://revenueflo.com/blog/common-ios-paywall-rejections-and-the-fixes-that-work
- **Principle:** the trial's existence and the charge terms must be unmissable,
  not toggled/hidden.

**The honest timeline paywall.** The recommended, higher-trust pattern (Blinkist):
*"Today: Full Access → Day 5: Reminder → Day 7: You're Charged."* Plus: state
trial inclusion explicitly, full price upfront, clear cancellation, visual
hierarchy instead of tricks.
- Source: https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/ ; https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/
- Exemplar: Blinkist (timeline), value-first paywalls generally.
- **Principle:** transparency *raises* conversion and satisfies both stores;
  front-load value, show the full timeline, no dark patterns.
- **Volyume-fit: ADOPT.** Volyume's paywall should use an honest trial timeline
  and value-first gating. Twist: reinforce the calm, no-pressure brand — a
  reminder before charge is a *courtesy*, consistent with the win-back tone. Note:
  product IDs `pro_monthly`/`pro_annual` and the cascade flow are locked; any
  paywall UX change is billing-adjacent and needs founder sign-off + a written
  test plan per `docs/rules/billing.md`.

**Win-back tone.** Dark patterns (hidden cancellation, delayed price reveal)
"hurt retention long-term."
- **Principle:** lapse/win-back messaging should be warm and non-guilting; make
  leaving easy, which paradoxically retains trust.
- **Volyume-fit: ADOPT.** Aligns with `winbackState.js` / `lapseDetect.js` and
  the no-shame voice.

---

## 7. Notification craft

**Earned, budgeted, quiet-hours-aware.** Best practice: cap frequency (≤~3/day),
auto-hold overnight (commonly 10pm–7am local, some say 8pm–8am), and treat
relevance + timing as equal to content ("a useful message at the wrong moment is
still noise").
- Source: https://www.braze.com/resources/articles/push-notifications-best-practices ; https://appbot.co/blog/app-push-notifications-2026-best-practices/
- **Principle:** every notification must earn its send; a budget + quiet hours are
  respect made mechanical.
- **Volyume-fit: ADOPT (already largely built).** Matches Volyume's
  `notifications/` scheduler, quiet hours, push budget. Reinforce it.

**Emotional tone.** "Emotional manipulation through streaks and reminders
backfires, especially for casual/lapsed users." Skip all-caps and marketing
jargon; reflective/encouraging prompts work *only if the product genuinely
delivers emotional support.* Humour only when users are decompressing, never
during stress.
- Source: https://appbot.co/blog/app-push-notifications-2026-best-practices/ ; https://www.pausa.co/blog/research-how-notifications-impact-mental-health
- Exemplar (praised tone): apps with warm, human, low-pressure copy (Duolingo's
  wit is praised *when* playful, criticised when guilt-tripping).
- **Principle:** notifications carry brand voice; warmth and restraint earn
  praise, guilt and urgency earn uninstalls.
- **Volyume-fit: ADOPT.** Volyume's calm/no-shame voice is a natural fit. Hard
  line already in CLAUDE.md: weight/food-adjacent notifications suppress under an
  open ED flag — never weaken. No streak-guilt pushes, ever.

---

## 8. Perceived-quality signals ("this app feels premium")

**Motion at moments of meaning.** Apps with strong motion log ~15–20% longer
sessions; the highest-impact moments are success beats — a checkmark that draws
itself, a completion animation, tab indicators that slide to convey location.
Navigation transitions land best at ~300–500ms.
- Source: https://bricxlabs.com/blogs/micro-interactions-2025-examples ; https://medium.com/design-bootcamp/10-micro-interaction-patterns-that-make-users-subconsciously-love-your-product-3c341c78acb4
- **Principle:** spend motion budget on the few moments that carry emotional
  weight; everywhere else, stay quiet and fast.
- **Volyume-fit: ADOPT.** Set-logged, PB, check-in-saved, weekly-coach-reveal are
  Volyume's meaning-moments. Twist: calm amplitude, brand timing.

**Latency masking.** Skeleton loaders and smooth loading motion make waits *feel*
shorter; optimistic UI hides round-trips.
- Source: https://www.linearity.io/blog/ui-animation-guide/ ; https://dev.to/markyu/premium-micro-interactions-in-react-19-without-the-jank-230b
- **Principle:** perceived speed > measured speed; never show a dead blank while
  loading.
- **Volyume-fit: ADOPT — and Volyume is structurally advantaged.** Offline-first
  SQLite means most reads are instant; use optimistic writes + skeletons only for
  sync-dependent surfaces. This is a genuine premium edge to exploit.

**Empty-state & copy craft.** Crafted empty states (guiding micro-animation +
warm copy) turn dead ends into delight; warm, human microcopy signals care.
- Source: https://bricxlabs.com/blogs/micro-interactions-2025-examples
- Exemplars named across sources: apps praised for playful empty states and
  success confetti (Duolingo, Slack-style).
- **Principle:** the unglamorous states (empty, error, loading, first-run) are
  where premium is actually judged.
- **Volyume-fit: ADOPT.** Invest in first-run and empty states in the calm voice;
  no confetti overload (brand). This is high-leverage, low-risk polish.

---

## Principle shortlist (ranked by leverage for Volyume)

1. **One brand, two dialects** — constant tokens/voice/motion-character; branch
   navigation/sheet/haptic idioms per platform. (Governs the whole audit.)
2. **Rest is a first-class state; reward showing up** (Gentler Streak). Brand-
   defining and ED-aligned. ADOPT.
3. **Refuse manufactured streak-loss anxiety & variable-reward loops.** The
   pattern Volyume must reject. AVOID.
4. **Weekly ritual as the retention spine** (WHOOP) — package `runWeeklyCoach` as
   an anticipated, deterministic weekly moment. ADOPT.
5. **Mercy infrastructure / grace over fragile perfect streaks** — consistency &
   weekly rhythm, no catastrophic-fail states. ADAPT.
6. **Honest timeline paywall + transparent trial** (Apple 3.1.2 compliant). ADOPT
   (billing-gated).
7. **Ghost-overlay guided photo capture** for consistent framing. ADOPT.
8. **Photo comparison/timeline as hero + private-by-default surfaced as trust.**
   ADOPT (leverages on-device lock).
9. **Contextual, per-action permission choreography** (keep Article 9 gate first &
   fail-closed). ADOPT.
10. **Effort-that-feels-like-value onboarding** — required fields visibly shape a
    live plan preview; aha = first deterministic plan. ADAPT.
11. **Kudos/presence over leaderboards; belonging not comparison.** ADAPT/ADOPT-
    stance; leaderboards AVOID.
12. **Presence signals not metric exposure** for any partner feature. ADAPT.
13. **Motion at moments of meaning, calm amplitude.** ADOPT.
14. **Latency masking + optimistic UI** — exploit offline-first speed edge. ADOPT.
15. **Empty-state & first-run craft in the calm voice.** ADOPT.
16. **Physics-based (spring) motion tokens + haptic coupling on meaning-moments**
    (M3 Expressive), dialled to quiet confidence. ADAPT (Core-Haptics is founder-
    gated).
17. **Depth/material reserved for the floating chrome layer** (Liquid Glass
    intent), emulated via blur, not literal glass everywhere. ADAPT.
18. **Warm, earned, budgeted notifications; no guilt pushes; ED suppression
    intact.** ADOPT.
19. **Self-relative progress framing, never peer-comparison** for a shame-prone
    audience. ADOPT.
20. **No dynamic/wallpaper colour** — hold the deliberate dark brand palette on
    both platforms. AVOID the M3 Material-You feature.
