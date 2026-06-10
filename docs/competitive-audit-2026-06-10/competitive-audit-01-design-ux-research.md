# Competitive Audit 01 — Design, UX and Visual Quality (Agent 10)

> Research date: 10 June 2026. Sources: Apple Design Awards 2022–2026,
> vendor design blogs and case studies, UX research (NN/g and others),
> app-store and community sentiment. Volyume ground truth: baseline
> section 3.12 (`competitive-audit-00-volyume-baseline.md`).
> No code was modified.

---

## 1. Ranked top 10 — most visually premium fitness/health apps

Ranked by weight of evidence: design-award recognition, named design
partners, documented design systems, and user sentiment specifically
about look-and-feel.

| # | App | Why it ranks here (evidence) |
|---|---|---|
| 1 | **Oura** | The category's most deliberate data-viz architecture. The October 2025 redesign (agency: [Instrument](https://www.instrument.com/work/oura-app)) rebuilt visualisations around **three adaptable levels**: at-a-glance rings/bars/colour cues → mid-level focused metrics → deep interactive exploratory views, and reorganised five tabs into three (Today / Vitals / My Health). Design principle: emphasise "**one big thing**" — the single score or insight to act on now — and use **colour to signal the body's state** ([Oura blog](https://ouraring.com/blog/new-oura-app-experience/), [Tech Between The Lines](https://www.techbetweenthelines.com/oura-rings-major-app-redesign-and-cumulative-stress-feature-now-rolling-out/), [9to5Google](https://9to5google.com/2025/10/20/oura-app-redesign/)). |
| 2 | **Whoop** | Dark-only data-dense UI built by information-design studio **Bureau Oberhaeuser** (BMW, Airbnb data products). Near-black background exists so "high-contrast data points pop" and morning/evening checks cause no glare; a **deliberately narrow three-colour vocabulary** (green/yellow/red) "repeats across every screen so users learn the visual language once"; strict three-tier progressive disclosure ([925 Studios design breakdown](https://www.925studios.co/blog/whoop-design-breakdown)). Counter-evidence: users still report the data becomes "super overwhelming" around months 3–4 and that feedback copy uses confusing jargon ([WellnessPulse](https://wellnesspulse.com/reviews/whoop-review/), [Thingtesting](https://thingtesting.com/brands/whoop/reviews)). |
| 3 | **Gentler Streak / The Outsiders** (Gentler Stories) | The most award-decorated studio in fitness. Gentler Streak: Apple Watch App of the Year 2022, **2024 Apple Design Award winner** (Social Impact; 2023 Visuals & Graphics finalist) ([Apple Newsroom](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/)). Design philosophy is "humanity": *"Statistics are just numbers. Without knowing how to interpret them, they are meaningless"* — soft, warm atmosphere, copy that "guides without pushing" ([Apple Behind the Design](https://developer.apple.com/news/?id=3m0ht22s), [Sketch blog](https://www.sketch.com/blog/gentler-streak/)). Their new athlete app **The Outsiders** is a **2026 ADA finalist (Interaction)**, called "a beautiful new high-performance exercise app" with a Training Readiness Score described as "a beautiful data visualization" ([9to5Mac](https://9to5mac.com/2025/09/15/the-outsiders-gentler-streak-exercise-app/), [Apple ADA 2026](https://developer.apple.com/design/awards/)). Co-founder Andrej Mihelic: Home Screen **widgets were "the number one ask since launch"** ([9to5Mac](https://9to5mac.com/2026/05/20/the-outsiders-celebrates-apple-design-awards-2026-nomination-with-biggest-update-yet/)). |
| 4 | **Apple Fitness** | The platform-defining reference: a **dark-only** first-party app where the Activity rings are the original "one glanceable big thing", numerals set in SF Pro / SF Rounded ([Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Apple Developer Forums](https://developer.apple.com/forums/thread/15365)). Important precedent: Apple ships this dark-only and it is rarely criticised for it — dark is the accepted default for glanceable activity data. |
| 5 | **MacroFactor** | The best interactive charts in nutrition. Charts support **scrubbing with a live average readout plus a first-to-last delta readout**, and **tap-and-hold tooltips "designed for data exploration"** ([release notes](https://macrofactor.com/version-1-5-3/), [dashboard revamp](https://macrofactor.com/dashboard-revamp/)). Reviews call the graphing "brilliant, robust, and informative" and the design "clean, glanceable… with deep nutritional details when you want them" ([Stronger By Science](https://www.strongerbyscience.com/macrofactor/), [Outlift](https://outlift.com/macrofactor-review/)). Ships **System/Light/Dark themes** ([help centre](https://help.macrofactorapp.com/en/articles/73-switch-between-dark-and-light-mode)) and widgets that adopt **Material You** dynamic colour on Android ([widgets announcement](https://macrofactor.com/widgets-announcement/)). |
| 6 | **Bevel** | Repeatedly described as "remarkably Apple-esque — clean, minimal, highly responsive", with ring-based visualisation, **light and dark themes with illustrative or minimal backgrounds**, and "beautifully crafted widgets" ([Neura Health review](https://neura.health/insight/bevel-health-app-in-depth-review), [Autonomous review](https://www.autonomous.ai/ourblog/bevel-app-review)). Instructive nuance: its own feedback board contains a request for "a more minimal and mature design" because rounded, comic-style typography reads "slightly too playful" ([Bevel feedback](https://feedback.bevel.health/feature-requests/p/ui-feedback-wish-for-a-more-minimal-and-mature-design)) — personality without restraint cuts both ways. |
| 7 | **Strava** | Scale leader investing visibly in design: dark mode was "the main request from Strava users over the past few years" and shipped June 2024, with the CEO noting every UI element had to be reworked so dark mode "doesn't feel clunky" ([Strava press](https://press.strava.com/articles/available-today-strava-releases-dark-mode), [TechRadar](https://www.techradar.com/health-fitness/fitness-apps/strava-is-finally-adding-dark-mod-ai-leaderboards-family-plans-and-more)); 2025 brought a redesigned Record experience with metrics overlaid on the map and a redesigned Watch app ([Strava press](https://press.strava.com/articles/strava-launches-redesigned-record-experience)). 2025 App Store Award finalist ([Apple Newsroom](https://www.apple.com/newsroom/2025/11/apple-announces-finalists-for-the-2025-app-store-awards/)). |
| 8 | **Runna** | UK-grown proof that **onboarding is a design surface**: a 25-screen flow that case studies praise rather than condemn — "every choice — from unhurried pacing to clear copy — signals that this app is serious about getting you to your goal… calm, clear, confident design can still move people" ([Rosie Hoggmascall, UX Collective](https://uxdesign.cc/how-to-nail-onboarding-a-case-study-of-runna-7780ba89c202), [Growth Dives](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study)). 4.9 stars from 48k+ ratings. Acquired by Strava. |
| 9 | **Peloton** | "Calm tech" in fitness UX: metrics presented "in an immersive yet calm manner", hideable on demand; the design goal is to "encourage, not overwhelm" ([Medium — Calm Tech in Fitness UX](https://medium.com/@blessingokpala/calm-tech-in-fitness-ux-what-peloton-gets-right-about-motivation-and-flow-30b9891c092d)). Premium feel rests heavily on content production values rather than UI alone. |
| 10 | **Hevy** | The closest direct competitor. Sentiment is consistently "clean, easy, intuitive" — "buttons are large and the layout is intuitive… everything feels lightweight and focused on the session" ([RepReturn](https://repreturn.com/hevy-app-review/), [Product Hunt reviews](https://www.producthunt.com/products/hevy/reviews)) — but praise stops at *clean*; nobody calls it beautiful or special, and some reviews note overlapping buttons and ask for "a better UI" ([justuseapp](https://justuseapp.com/en/app/1458862350/hevy-workout-tracker-gym-log/reviews)). Clean-generic, not premium. |

### Non-fitness design references (per brief)

- **Linear** — the benchmark for *systemised* precision. Rebuilt theming on the
  **LCH colour space** because it is perceptually uniform, letting them generate
  every theme from **three variables (base, accent, contrast) instead of 98**,
  and to derive surface elevation steps reliably
  ([Linear — How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)).
  Positioning is explicit: craft, speed and clarity as the product
  ([Sequoia spotlight](https://sequoiacap.com/article/linear-spotlight/)).
  Lesson for Volyume: its token ladder is the right instinct; the next maturity
  step is *derived* colour (programmatic elevation/accent ramps) rather than
  hand-picked hexes.
- **Craft** — **Mac App of the Year 2021** and ADA finalist for "a deep feature
  set and beautiful, native design across every Apple platform"
  ([Businesswire](https://www.businesswire.com/news/home/20211202005370/en/Craft-Docs-Wins-Mac-App-of-the-Year-for-Apples-2021-App-Store-Awards),
  [MacStories](https://www.macstories.net/news/apple-names-the-2021-app-of-the-year-award-winners/)).
  Lesson: delight lives in transitions and direct manipulation, not decoration.
- **Monzo** — the case study in a **signature colour as a brand asset**: hot
  coral was nearly a prototype, kept due to community love, and became the
  identity; paired with a jargon-free, witty tone of voice that "distances
  them from corporate-speak"
  ([The Scaleup Collective](https://www.thescaleupcollective.com/blog/monzos-brand-strategy-how-the-neobank-championed-community),
  [Monzo tone of voice](https://monzo.com/tone-of-voice),
  [Root Fifty-Two](https://rootfiftytwo.co.uk/news/why-monzo-tone-of-voice-guidelines-are-a-game-changer)).
  Lesson: Volyume's amber + honest voice is the same playbook — double down on
  the signature rather than diversifying the palette.
- **(Not Boring) Habits** (honourable mention) — won the **2022 ADA "Delight
  and Fun"** award for "sensational designs, **playful haptics**, and elegant
  gamification" ([Apple Newsroom](https://www.apple.com/newsroom/2022/06/apple-announces-winners-of-the-2022-apple-design-awards/)) —
  award-level proof that a haptic vocabulary is a premium differentiator,
  which Volyume already has in token form.

---

## 2. Pattern analysis — what separates premium from generic

**1. Typography restraint plus numeric heroism.** Premium guidance converges:
max two typefaces, deliberate weight contrast, generous spacing; "typography is
probably the quickest way to signal quality"
([This is Glance](https://thisisglance.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive),
[Zamora Design](https://zamora.design/10-things-that-make-your-design-look-premium/)).
Apple Fitness and Whoop both treat the number as the interface. Volyume's
`type.num()` tabular-numeral rule is genuinely best-practice here. The risk is
at the other end of the scale: heavy use of 11–13pt on dense screens, where the
premium apps instead *remove* information (progressive disclosure) rather than
shrink it.

**2. Narrow, semantic colour.** Whoop's three-colour state vocabulary and
Oura's "colour signals your body's state" both show that premium data apps use
*few* colours but give each one a fixed meaning users learn once
([925 Studios](https://www.925studios.co/blog/whoop-design-breakdown),
[Oura blog](https://ouraring.com/blog/new-oura-app-experience/)). Premium
palettes are "three to five colors maximum"
([This is Glance](https://thisisglance.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive)).
Volyume's single amber is restrained — the gap is that amber is an *identity*
colour, not a *state* system; success/error exist but recovery/strain/on-target
states have no consistent colour grammar across screens.

**3. The "one big thing" hierarchy.** Oura's redesign and Apple's rings both
lead with a single dominant element and push everything else down a level.
NN/g-cited research: progressive disclosure reduces cognitive load by up to
55%, and users abandon dashboards that are too complex
([UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/),
[Aufait UX](https://www.aufaitux.com/blog/dashboard-design-principles/)).
Volyume's Home currently stacks three utility cards above the hero workout
card (baseline §4) — the inverse of this pattern.

**4. Interactive charts as the premium tell.** MacroFactor's scrub-with-
average-readout and tap-and-hold tooltips
([release notes](https://macrofactor.com/version-1-5-3/)), Oura's "precise
exploratory views… often interactive", and The Outsiders' ADA-nominated
readiness visualisation all make the chart a *surface you touch*. Generic apps
render charts; premium apps let you interrogate them. Selection-style haptic
ticks during scrubbing are the canonical iOS pattern
([Medium — Haptic Feedback: The Secret to Apps That Feel Premium](https://medium.com/@chandra.welim/haptic-feedback-the-secret-to-apps-that-feel-premium-7463fdc1ccca),
[HackerNoon iOS haptics guide](https://hackernoon.com/the-ios-guide-to-haptic-feedback)):
"apps with good haptics feel more polished, more expensive, more professional."
Volyume's static SVG polylines with Skia sitting installed-but-unused is its
single largest distance from the leaders.

**5. Purposeful motion, never decorative.** "Companies like Stripe, Linear,
and Notion demonstrate premium motion design: noticeable enough to feel
polished, restrained enough to never interfere"
([This is Glance](https://thisisglance.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive));
2026 trend guidance stresses motion that respects reduced-motion settings
([Lyssna](https://www.lyssna.com/blog/app-design-trends/)). Volyume's tokenised
M3 curves + Reduce Motion support already match this bar.

**6. Warmth and humanity as differentiators.** Gentler Streak won its awards
not on graphic fireworks but on interpretive, kind presentation of data
([Apple Behind the Design](https://developer.apple.com/news/?id=3m0ht22s)).
Volyume's honest, jargon-free coaching voice is the same family of asset; its
visual layer (no illustration warmth, one accent, all-dark) currently reads
colder than its copy.

**7. Beyond-the-app surfaces.** Widgets were "the number one ask" for The
Outsiders; Bevel ships "beautifully crafted widgets"; MacroFactor widgets adopt
Material You. Glanceable home-screen surfaces are now part of perceived design
quality. Volyume has none, and its built Live Activity is disabled
(baseline §5.5–5.6).

---

## 3. Loading and empty states — where the bar sits

- Skeletons beat spinners for content loads: identical waits feel ~2× faster
  ("a 3-second skeleton wait ≈ a 1.5-second spinner wait"); teams report
  30–50% perceived-performance gains; never show a loader under ~300 ms
  ([Onething Design](https://www.onething.design/post/skeleton-screens-vs-loading-spinners),
  [NN/g Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/),
  [LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)).
- Empty states are onboarding: "the first empty screen should be treated as
  onboarding, because that is what it is"; structure = headline, supporting
  line, illustration, single CTA; the forward-looking trend is **avoiding
  empty states entirely** via preloaded sample data or starter content
  ([UserOnboard](https://www.useronboard.com/onboarding-ux-patterns/empty-states/),
  [Eleken](https://www.eleken.co/blog-posts/empty-state-ux),
  [Pencil & Paper](https://www.pencilandpaper.io/articles/empty-states)).

Volyume already ships a Skeleton component and designed EmptyState component
(baseline §3.12) — at or above category norm. The open question is coverage
and whether first-run screens *pre-fill* (e.g. seeded plan, sample chart)
rather than explain.

---

## 4. Dark mode across the category — is dark-only a risk?

Evidence cuts both ways, and the direction matters:

- **Dark is the category norm for data-heavy fitness.** Whoop and Apple
  Fitness are dark-only by design; Fitbit was criticised for being light-only
  because dark backgrounds "make parsing through complex graphs… easier on the
  eyes" and only recently added dark mode
  ([TechRadar](https://www.techradar.com/health-fitness/fitness-apps/fitbits-new-dark-mode-app-makes-it-feel-more-like-garmin-connect-heres-how-to-turn-it-on)).
  Strava's *dark* mode was its most-requested feature for years
  ([Strava press](https://press.strava.com/articles/available-today-strava-releases-dark-mode)).
  Volyume's #0D0D0D-with-warm-elevation approach is defensible and on-trend.
- **But dark-only generates a persistent complaint channel among paying
  users.** Whoop's community has multiple long-running threads requesting
  light/system modes: users say dark "is a strain on my eyes" in daylight and
  ask "why is there no light mode option for an app that costs almost $400 per
  year?" ([Whoop Community](https://www.community.whoop.com/t/light-dark-mode/1034),
  [eye-strain thread](https://www.community.whoop.com/t/light-mode-dark-mode-eye-strain/13924)).
  MacroFactor, Hevy, Bevel and Strava all offer System/Light/Dark.

**Verdict:** dark-only is a *moderate, slow-burn* risk, not an urgent one.
Volyume is in good company (Whoop, Apple Fitness), and its non-pure-black
ladder is better-considered than most. But as the paying base grows, the
Whoop-style "I pay for this, give me a choice" thread is predictable —
especially for a nutrition diary used outdoors in daylight, unlike a
morning-check recovery app. A token-derived light theme (the Linear LCH
lesson: themes from three variables, not 98 hand-picked values) is the
low-regret path when capacity allows. The amber-on-charcoal system itself
stands up well against the best: it is closer to Whoop's discipline than to
the pastel-gradient generic tier, and the WCAG-documented token table is
ahead of anything publicly documented by Hevy or Strava.

---

## 5. User sentiment: does design drive retention or is it table stakes?

- Hard evidence that design *retains* is thin; evidence that bad UX *churns*
  is strong: "a poor initial UX is the leading cause of early churn"
  ([Codebridge](https://www.codebridge.tech/articles/fitness-mobile-app-development-strategies-that-drive-user-retention-and-revenue));
  fitness apps average ~9.2% monthly churn
  ([RetentionCheck](https://retentioncheck.com/churn-benchmarks/fitness-apps)).
  Retention deltas come mainly from personalisation, social and gamification
  ([arXiv 2501.13407](https://arxiv.org/pdf/2501.13407)).
- What design *does* drive is **word of mouth and willingness to pay**: Monzo's
  coral card sparked conversations that grew the bank; Runna's "calm, clear,
  confident" onboarding converts; MacroFactor reviews lead with the charts;
  The Outsiders is covered by the tech press *because* it is beautiful.
- The qualities users name when an app feels "special": *clean/easy* (Hevy),
  *beautiful charts* ("brilliant, robust, and informative" — MacroFactor
  reviews via [Stronger By Science](https://www.strongerbyscience.com/macrofactor/)),
  *Apple-esque / intentional* (Bevel), *warm/human* (Gentler Streak), and
  haptic/tactile polish ((Not Boring) Habits' ADA). Conversely the words that
  kill: *overwhelming* (Whoop), *clunky* (Strava pre-dark-mode), *too playful*
  (Bevel's own feedback board).

**Strongest single sentiment finding:** paying users of the most design-lauded
dark app in the category (Whoop) publicly resent the absence of appearance
choice — "why is there no light mode for an app that costs almost $400 a
year?" — while simultaneously, Whoop's data-density earns "super overwhelming
by month 3–4". Premium ≠ more; premium = legible, touchable, and optional.

---

## 6. Implications for Volyume

**Where Volyume already leads the category:**
- Token discipline: WCAG-documented contrast per token, tabular numerals,
  tokenised M3 motion, haptic vocabulary, 4-step elevation — this is
  Linear-style systems thinking that Hevy/Strong tiers do not show.
- Accessibility modes (higher contrast, Okabe-Ito colour-blind-safe palette,
  1.2× text, Reduce Motion) are ahead of every fitness comparator surveyed.
- Skeletons + designed empty states meet documented best practice.
- Year of Lifts recap + 1080×1920 share cards match the Strava/Spotify
  social-surface trend.

**Where Volyume lags the leaders:**
1. **Static charts** (largest gap) — no scrubbing, no tooltips, no haptic
   ticks, Skia idle. MacroFactor, Oura and Whoop all treat the chart as an
   interactive surface; this is the clearest "premium tell" Volyume misses.
2. **No semantic colour grammar** — amber is identity, but there is no
   learned-once state vocabulary (on-target / caution / hold) across coach,
   volume and nutrition surfaces the way Whoop's three colours or Oura's
   body-state colours work.
3. **Hierarchy inversions on dense screens** — Home buries the hero card under
   three utility cards; ActiveWorkout's chip soup and 11pt coaching context
   run against the "one big thing" + progressive-disclosure pattern that
   defines Oura's redesign.
4. **No glanceable surfaces** — no widgets, Live Activity built but disabled;
   the market evidence (The Outsiders' "number one ask") says these now count
   as design quality, not features.
5. **Dark-only with no roadmap answer** — defensible today, predictable
   complaint channel tomorrow (Whoop precedent).

**The five moves that would raise perceived quality most (ranked):**
1. **Make charts touchable.** Skia-based line/bar charts with tap-and-hold
   tooltip, scrub with selection-style haptic ticks, and MacroFactor-style
   average + first-to-last delta readouts. Start with EWMA weight trend and
   e1RM trajectory — the two charts Pro users stare at weekly.
2. **Define a three-state semantic colour vocabulary** (e.g. on-track /
   watch / hold) layered beneath amber, applied identically on CoachOutput,
   VolumeHeatmap, Diary rings and check-in chips, with the existing
   colour-blind-safe swaps extended to it. One legend, learned once.
3. **Reassert "one big thing" on Home and Progress.** Hero workout card first;
   collapse weight/steps/cardio into one compact strip; lift dense 11pt
   coaching copy into progressive disclosure instead of smaller type.
4. **Ship widgets and re-enable the Live Activity** (rest timer + today's
   session). Highest-leverage "feels premium outside the app" investment, and
   the modules are partially built already.
5. **Plan a token-derived light theme** (System/Light/Dark like MacroFactor),
   generated from the existing token table rather than hand-painted — the
   Linear LCH lesson makes this a bounded cost and removes the Whoop-style
   complaint before the paying base scales.

---

*Sources are linked inline throughout. Key primary references: Apple Design
Awards [2024](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/),
[2025](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/) and
[2026](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/);
[Instrument × Oura](https://www.instrument.com/work/oura-app);
[Bureau Oberhaeuser × Whoop breakdown](https://www.925studios.co/blog/whoop-design-breakdown);
[Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui);
[MacroFactor release notes](https://macrofactor.com/version-1-5-3/);
[Whoop community light-mode threads](https://www.community.whoop.com/t/light-dark-mode/1034);
[NN/g skeleton screens](https://www.nngroup.com/articles/skeleton-screens/).*
