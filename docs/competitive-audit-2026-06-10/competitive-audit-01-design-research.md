# Competitive Audit 01 — Design, UX and Visual Quality
**Volyume competitive intelligence · 10 June 2026**
**Scope:** the most visually premium fitness/health apps plus cross-category design references, benchmarked against Volyume's design baseline (dark-only, single amber #F5A623 accent on near-black #0D0D0D tonal ladder, tokens-only CI-enforced styling, system font with strict type ramp and tabular figures, intent-named haptics, motion tokens with reduce-motion gating, skeletons not spinners, hand-built SVG empty states, dense numbers-first, no gamification noise).

**Method:** 22 web searches across design commentary (Mobbin, Dribbble, 60fps.design, design blogs), Apple Design Award coverage, store-review aggregators, Reddit/community-forum sentiment, and UI teardowns. Claims below are cited inline; where evidence is single-source or inferential it is flagged.

---

## 1. Top 10 ranked — most visually premium fitness/health apps

| # | App | Why it ranks here |
|---|-----|-------------------|
| 1 | **Whoop** | The category's data-density gold standard: strict three-tier information architecture, DINPro numerals, black-and-white restraint, custom charting. Designed with information designer Martin Oberhaeuser (Bureau Oberhaeuser). |
| 2 | **Oura** | The "calm" benchmark. 2025–26 redesign praised as "gorgeous", Liquid-Glass-adjacent, colour used as a biometric state signal, nature-scene hero treatment. |
| 3 | **Gentler Streak** | Apple Design Award winner (2024, Social Impact). Custom illustrated character ("Yorhart" by Sören Selleslagh), bespoke design language, motion that "makes users feel welcomed". |
| 4 | **Bevel** | Repeatedly called "Apple-esque"; reviewers explicitly contrast it with "a spreadsheet of medical data". Smooth animations, intentional navigation, strong onboarding/paywall craft. |
| 5 | **Copilot Money** *(cross-category, data-app reference)* | Apple Design Award finalist (Interaction, 2024); "elegant graphs and a crystal-clear interface"; the best argument that a numbers-first app can feel luxurious. |
| 6 | **MacroFactor** | "Modern and streamlined… looks and feels much better than its competitors" — the premium nutrition tracker. Weaknesses: home screen utility, discoverability. |
| 7 | **Athlytic** | "Incredible UI… readiness check in under ten seconds" — best-in-class glanceability on a tiny indie budget. |
| 8 | **Hevy** | Clean, fast, friendly logging UX; the lifting-tracker UI users actually recommend on Reddit, though reviewers still "want a better UI" in places. |
| 9 | **Rise** | Distinctive energy-curve visualisation (the undulating day view) — a genuine signature visual — but dinged for tab/screen sprawl and feeling overwhelming. |
| 10 | **Peloton / Strava** (tied) | Big-brand polish, strong motion-led brand identity (Peloton's "leaning forward" wordmark, neon accent discipline). Strava's 2025 activity-screen rework drew community criticism ("bad UI decisions"), keeping both out of the top tier. |

**Cross-category references:** **Linear** (taste-driven development, no A/B tests, conviction-led craft — Saarinen's "10 rules"), **Craft** (ADA winner, Mac App of the Year, "clean typography, polished UI", instant launch), **Monzo** (custom Compose design system beyond Material, "animations so easy to add there's little reason not to animate colour/size/elevation changes", human tone).

---

## 2. Per-app deep dives

### 2.1 Whoop
- **What it does:** Strict three-tier IA — overview (three numbers: Recovery %, Strain 0–21, Sleep), trend, detail — each tier on its own screen reached by deliberate tap/swipe, "clean mental boundaries" rather than progressive disclosure within one screen ([925 Studios breakdown](https://www.925studios.co/blog/whoop-design-breakdown)). Default tile layout "works for 90% of use cases" with reordering for the rest.
- **Typography:** Brand guidelines specify **DINPro for numbers** (Black/Bold/Medium/Regular/Light) plus Proxima Nova; palette is essentially black and white ([Whoop brand guidelines PDF](https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf), [fonts.whoop.com](https://fonts.whoop.com/)). The numeric typeface *is* the brand.
- **Sentiment — love:** answers "how should I train today?" in one glance; data density that "feels simple".
- **Sentiment — hate/wish:** persistent **light-mode requests** on the official community forum — threads from May 2025 to Feb 2026 asking for light/system appearance, citing daytime readability and **eye strain** ([Whoop Community: Light mode dark mode](https://www.community.whoop.com/t/light-mode-dark-mode/6711), [Light/Dark Mode — WHOOP 5.0](https://www.community.whoop.com/t/light-dark-mode/1034), [eye strain thread](https://www.community.whoop.com/t/light-mode-dark-mode-eye-strain/13924)). Whoop has not shipped one. This is the single most relevant data point for Volyume's dark-only decision: the market leader holds the same line, and the complaint volume is real but evidently not existential.

### 2.2 Oura
- **What it does:** 2025–26 redesign moved from "boxing everything off into sections" to a calmer layered Today page with a nature scene hero; Vitals gives a quick-glance view anchored to personal baselines; a new colour system signals the body's state from biometrics ([Oura blog](https://ouraring.com/blog/new-app-design/), [Pocket-lint review](https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/)).
- **Sentiment — love:** "the visual refresh is gorgeous… feels even more natural on my iPhone"; "I actually want to spend more time in the app than before" (Pocket-lint). Oura's premium feel comes from *atmosphere* (light, depth, photography) rather than density.
- **Wish/lag:** the calm aesthetic trades away glanceable density; Oura is the anti-Whoop and Volyume sits firmly on the Whoop side.

### 2.3 Gentler Streak (Apple Design Award 2024, Social Impact)
- Custom character **Yorhart** (illustrator Sören Selleslagh); the Streak tab's illustration + daily status is "a love letter from your heart" ([Sketch blog](https://www.sketch.com/blog/gentler-streak/)). Apple praised the "subtle and consistently pleasing design language" and smartly organised health data ([Apple Developer: Behind the Design](https://developer.apple.com/news/?id=3m0ht22s)). Animations catalogued on [60fps.design](https://60fps.design/apps/gentler-streak); screens on [Mobbin](https://mobbin.com/apps/gentler-streak-ios-5b268813-8b73-4242-9322-121482264f81).
- **Lesson:** its award was won on *tone + bespoke illustration + motion*, not data. Hand-built illustration is a proven differentiator — directly validates Volyume's hand-built SVG empty states, and suggests extending that illustration language beyond empty states.

### 2.4 Bevel
- "Remarkably Apple-esque, clean, minimal, highly responsive… avoids the cluttered, data-heavy look… the interface feels more like a refined, intuitive dashboard **than a spreadsheet of medical data**" ([Neura Health review](https://neura.health/insight/bevel-health-app-in-depth-review), [Autonomous review](https://www.autonomous.ai/ourblog/bevel-app-review)). Store reviewers: "every aspect of the application is high-quality" ([justuseapp reviews](https://justuseapp.com/en/app/6456176249/bevel-longevity-performance/reviews)). Offers light *and* dark themes with illustrative/minimal background personalisation. Onboarding → soft paywall flow is studied as a model ([screensdesign showcase](https://screensdesign.com/showcase/bevel-health-performance)).
- **Lesson:** the "spreadsheet" insult is the live failure mode for data-dense health apps; Bevel escapes it with motion quality and colour coding, not by removing data.

### 2.5 Copilot Money (reference)
- ADA Interaction finalist 2024 ([Apple newsroom](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/), [Copilot Instagram](https://www.instagram.com/copilotmoney/p/C7hr-LERYti/)); "elegant graphs and a crystal-clear interface… closer to reading a well-designed dashboard than wrestling with a finance tool" ([BudgetPeer](https://www.budgetpeer.com/blog/is-copilot-money-worth-it-an-honest-look-at-the-premium-budget-app)); Swift Charts craft documented by Apple ([developer.apple.com article](https://developer.apple.com/articles/copilot-money/)).
- **Lesson:** chart quality is where numbers-first apps win or lose the premium impression. Bespoke, beautifully animated charts are Copilot's moat.

### 2.6 MacroFactor
- "UI is modern and streamlined… looks and feels much better than its competitors. It also has the gentlest learning curve." Criticism: "some of the UI isn't all that intuitive yet, the home screen isn't very useful, and some features aren't explained very well" ([Outlift review](https://outlift.com/macrofactor-review/)).
- **Lesson:** even the best-designed nutrition app loses points on *home-screen utility* and feature explanation — a gap Volyume's dense numbers-first dashboard can directly exploit.

### 2.7 Athlytic
- "Incredible UI providing visibility across a wealth of data"; "presentation is clean and glanceable — most users can check their readiness in under ten seconds, among the best UI implementations in the recovery-tracking category" ([Gymshark roundup](https://www.gymshark.com/blog/article/best-apple-watch-recovery-apps), [Cora comparison](https://www.corahealth.app/compare/athlytic)).
- **Lesson:** the ten-second readiness check is a measurable glanceability bar Volyume should meet for "what do I train / eat today".

### 2.8 Hevy
- Reddit consensus: clean, fast to use between sets, friendly design; trade-off framing vs Strong ("speed and modern UX") and FitNotes ("absolute simplicity") ([Setgraph Reddit roundup](https://setgraph.app/ai-blog/best-gym-app-reddit)). Product Hunt reviewers still "want a better UI, clearer weight tracking… calendar view" ([Product Hunt reviews](https://www.producthunt.com/products/hevy/reviews)).
- **Lesson:** in lifting trackers, *speed of logging* is perceived as design quality. Visual polish that slows logging reads as regression (see MyFitnessPal, §4).

### 2.9 Rise
- Signature **energy-curve** visual: "undulating view of your estimated energy levels" praised as the app's identity ([Mattress Clarity](https://www.mattressclarity.com/accessories/rise-app-review/), [TapSmart](https://www.tapsmart.com/apps/review-rise/)). But: "four main tabs with several screens within each… a lot going on", schedule feature "overwhelming" ([MoveWell](https://movewellapp.com/blog/rise-science-review/)).
- **Lesson:** one signature visualisation can carry an app's identity; sprawl kills it.

### 2.10 Peloton & Strava
- Peloton: disciplined saturated accent "reserved for critical interactive elements… impossible to miss"; motion-infused brand identity (wordmark angled like a sprinter leaning forward) ([Riala Studio](https://www.studioriala.com/project-detail-peloton-app), [Hatchwise logo history](https://www.hatchwise.com/resources/the-evolution-of-the-peloton-logo)). Validates Volyume's single-accent rule.
- Strava: 2025 record-screen update merged map+stats well ([the5krunner](https://the5krunner.com/2025/07/16/strava-app-redesign/)), but the Feb 2025 activity-view rework drew direct community fire — "Feedback on: New Mobile App Interface for Activities (**bad UI decisions**)" ([Strava Community Hub](https://communityhub.strava.com/general-chat-2/feedback-on-new-mobile-app-interface-for-activities-bad-ui-decisions-8887)).
- **Lesson:** redesigns that reorganise users' data hierarchy are the highest-risk design move in the category.

### Cross-category references
- **Linear:** "taste-driven development" — no A/B tests, conviction + craft, limited customisation; users "go beyond using it to loving it", driving word-of-mouth and reducing price sensitivity ([Sequoia spotlight](https://sequoiacap.com/article/linear-spotlight/), [Figma blog: Saarinen's 10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/), [linear.app/now/craft](https://linear.app/now/craft)). Volyume's tokens-only CI enforcement is the engineering expression of exactly this.
- **Craft:** ADA winner / Mac App of the Year; praise centres on typography, nesting-card polish, and *instant launch* — performance is design ([Calmevo review](https://calmevo.com/craft-app-review/), [Saner.ai](https://www.saner.ai/blogs/craft-review)).
- **Monzo:** built a custom Compose design system because Material wasn't enough; "animations so easy to add that there's very little reason not to animate colour/size/elevation changes" ([Android Developers story](https://developer.android.com/stories/apps/monzo-compose)); "brilliant UI… makes banking feel human" ([Creative Bloq](https://www.creativebloq.com/web-design/ux-ui/monzos-brilliant-ui-design-is-a-delight-to-use)). The strongest *Android-specific* proof that a token/component system pays off in perceived quality.

---

## 3. Cross-cutting findings

### 3.1 What makes an app feel premium vs generic
Designers converge on four things, none of which is "more features":
1. **Spacing discipline** — "most interfaces don't look cheap because of colour or typography — they look cheap because everything sits too close or too far apart… premium products feel calm" ([Muzli: 7 tiny UI fixes](https://medium.muz.li/7-tiny-ui-fixes-that-can-make-any-product-look-premium-94a7c71c2aae)).
2. **Typography hierarchy and motion language** "are more important than photography or colour schemes" ([Glance](https://thisisglance.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive), [Affective](https://weareaffective.com/learning-centre/luxury-mobile-app-design-and-development)).
3. **Considered pacing** — deliberately weighted micro-moments ("a slightly slower animation that feels more considered") communicate care.
4. **Restraint** — premium apps are "not the flashiest"; they win on detail and intentionality.

Generic = template feel: undifferentiated layout grids, Material defaults, stock icons, spinner-everywhere loading, badge confetti ([madappgang on typical mistakes](https://madappgang.com/blog/the-best-fitness-app-design-examples-and-typical-mistakes/)).

### 3.2 Trends 2025–2026
- **Liquid Glass / disciplined glassmorphism:** back "in a more disciplined form… used surgically for overlay cards, panels, contextual menus" after Apple's 2025 redesign ([Tubik 2026 trends](https://blog.tubikstudio.com/ui-design-trends-2026/), [Muzli 2026 patterns](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/)). Oura's Today page is the category's flagship example. *Conflicts with Volyume's no-gradients/no-glows rule — a deliberate trade, not an oversight, but worth re-examining for one hero surface.*
- **Motion that communicates state, not delight-spam:** "in 2026 motion earns its keep by guiding rather than flashing… animation should communicate state, structure and system intent" (Tubik, [MindInventory](https://www.mindinventory.com/blog/mobile-app-ui-ux-design-trends/)). Volyume's intent-named haptics map and motion tokens are exactly on-trend.
- **Bento-grid dashboards** of modular rounded cards for scan-heavy home screens ([Muzli dashboards](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)).
- **Multi-sensory (haptics + sound):** "great apps aren't just seen — they're felt and heard"; fitness apps using haptic pulses per completed rep/milestone; custom patterns reserved for core brand interactions ([Saropa haptics guide](https://saropa.com/articles/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback), [ThinkDebug](https://thinkdebug.com/multi-sensory-apps-designing-with-sound-vibration-and-haptics/)). Sound design remains rare in trackers — open ground.
- **Big-number dashboards:** "people act faster when headline numbers are obvious and self-explanatory… always pair measure, unit and time window" ([Basis Health dashboard guide](https://basishealth.io/blog/personalized-health-dashboards-design-guide-and-best-practices), [Zigpoll](https://www.zigpoll.com/content/how-can-i-use-data-visualization-techniques-to-enhance-the-user-experience-on-our-health-and-wellness-app's-dashboard-design)). Fitbit reportedly saw +30% DAU after simplifying its main screen to three numbers (single-source claim, treat as directional).

### 3.3 User sentiment about design (named sources)
- **"Spreadsheet" as the canonical insult:** Bevel's reviewers explicitly praise it for *not* feeling like "a spreadsheet of medical data" (Neura Health). The exact phrase "feels like a spreadsheet" did not surface verbatim in fitness-app reviews in this research; it lives as a contrast designers and reviewers reach for.
- **Clutter is the #1 complaint at scale:** MyFitnessPal — "cluttered with upsells, blog content, community features and 'insights' that add noise" ([PlateLens](https://platelens.app/blog/myfitnesspal-alternatives-2026)); its 2026 Today-tab redesign triggered: more taps to log, tiny macro numbers, diary "ruined by… gigantic, space-consuming cards" ([PiunikaWeb](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/), [MFP community thread "New App Design Disregards Basic UX and IA Principles"](https://community.myfitnesspal.com/en/discussion/10959956/new-app-design-disregards-basic-ux-and-ia-principles)).
- **Gamification fatigue is real:** "over-reliance on rewards, notifications or streaks can… reduce intrinsic motivation; too many badges feel like pressure"; "streak anxiety replaces habit enjoyment" ([RevenueCat gamification guide](https://www.revenuecat.com/blog/growth/gamification-in-apps-complete-guide/), [RazFit](https://razfit.app/gamification-fitness/best-gamified-workout-apps-2026/)). Volyume's "celebrations only for genuine PRs" stance is validated.
- **What earns "special":** Gentler Streak (bespoke illustration + encouraging tone), Oura (atmosphere/calm), Whoop (one-glance answer to "how should I train today"), Copilot (chart elegance).

### 3.4 Dark-only sentiment
- Whoop — the closest dark-only comparator — has a multi-year stream of community requests for light/system mode citing daytime readability and eye strain, including astigmatism-type accessibility arguments common across dark-only complaints generally. Whoop has not yielded; the complaints persist but the product thrives.
- **Implication for Volyume:** dark-only is defensible as identity (Whoop holds it), but the complaint pattern is predictable and accessibility-flavoured. Volyume's higher-contrast and larger-text toggles partially answer it; a documented stance plus best-in-class contrast tuning matters more than capitulating. Astigmatism/halation is the strongest critic argument — mitigate with slightly-off-white text on elevated (not pure-black) surfaces, which Volyume's tonal ladder already does.

### 3.5 Typography
- Whoop's identity is carried by **DINPro numerals**; MacroFactor's "modern, streamlined" feel similarly leans on type. Designers rate type hierarchy above colour for premium perception. Volyume's system-font + strict ramp + tabular figures gets ~80% of the value; the remaining 20% (a distinctive numeric display face for hero metrics only) is the single cheapest brand-equity upgrade available — Whoop proves a numbers-app can own a numeral style.

### 3.6 Empty and loading states
- Consensus best practice matches Volyume's baseline: skeletons for content-shaped loads >0.5s, spinners only for short system actions; skeleton must match final layout exactly (no shift); fast shimmer; **static skeletons under reduce-motion** ([NN/g](https://www.nngroup.com/articles/skeleton-screens/), [LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/), [Mobbin glossary](https://mobbin.com/glossary/skeleton)). Users perceive a 3s skeleton ≈ 1.5s spinner; visible progress can cut abandonment up to 30% ([Onething](https://www.onething.design/post/skeleton-screens-vs-loading-spinners), [Appy Pie](https://www.appypie.com/blog/loading-states-mobile-apps)). Designed empty states with bespoke illustration are an award-grade differentiator (Gentler Streak).

### 3.7 Best single implementation & most common failure mode
- **Best-in-class single implementation:** **Whoop's three-number home screen + three-tier IA.** It is the category's most-cited example of data density that "feels simple", and it is the pattern Volyume's dashboard should be measured against (one glance → today's answer; one tap → trend; one more → detail).
- Runner-up: Oura's colour-as-body-state system; Rise's energy curve (signature data-viz as brand).
- **Most common failure mode:** **clutter creep + redesigns that add taps.** MyFitnessPal (upsell noise, card bloat, more taps to log) and Strava (activity-screen backlash) both show the same death pattern: visual "modernisation" that degrades information density and task speed. Second-place failure: badge/streak noise that manufactures engagement and breeds resentment.

---

## 4. Volyume vs each app — lead / match / lag

| App | Volyume leads | Volyume matches | Volyume lags |
|---|---|---|---|
| **Whoop** | CI-enforced token discipline; reduce-motion gating; designed empty states (Whoop has none notable) | Dark-only stance; numbers-first density; tabular figures | Custom numeral typeface (DINPro); custom charting library depth; tile-reorder personalisation |
| **Oura** | Glanceable density; logging speed; offline-first immediacy | Colour-coded state signalling (amber vs Oura's palette) | Atmosphere/depth (Liquid-Glass hero surfaces); "want to spend time in it" emotional pull |
| **Gentler Streak** | Data density; pro-grade numerics | Bespoke SVG illustration (empty states) | Illustration as *system-wide* identity + character; signature motion moments; award-level tone of voice |
| **Bevel** | Density without clutter; deterministic trust (no AI haze) | Smooth animation intent (motion tokens) | Onboarding/paywall craft; theme personalisation; "Apple-esque" transition polish |
| **Copilot Money** | Offline-first; haptics map | Crystal-clear dashboard ambition | Chart elegance and chart animation; ADA-grade interaction detail |
| **MacroFactor** | Home-screen utility (dense, decision-driving); visual identity (MF is fairly neutral) | Streamlined logging | Algorithm-explainer UX (MF explains adherence-neutral logic in-product better than most) |
| **Athlytic** | Visual system maturity; styling consistency | Ten-second glanceability goal | Nothing material — but match its readiness-in-10s bar explicitly |
| **Hevy** | Visual restraint; no social noise; token system | Logging speed between sets | Social proof/community polish (deliberate non-goal for Volyume) |
| **Rise** | IA discipline (Rise sprawls) | — | A single signature data visualisation that *is* the brand |
| **Peloton/Strava** | Single-accent discipline already equal or better; no redesign-regression risk (tokens prevent drift) | Accent-reserved-for-action pattern | Motion-infused brand identity (wordmark/logo animation); content production values |
| **Linear/Craft/Monzo** | Same philosophy, earlier stage | Tokens-only = Linear's craft ethos, Monzo's custom design system | Perceived-performance obsession (Craft's instant-open), Monzo's "animate everything cheaply" component maturity |

**Net position:** Volyume's *system* (tokens, motion/haptic governance, skeletons, a11y toggles) is genuinely ahead of most of the category — closer to Linear/Monzo engineering culture than to typical fitness apps. Its *expressive layer* (numeral typeface, chart craft, signature visualisation, illustration beyond empty states, depth/atmosphere) is where it lags the top four.

---

## 5. Improvement opportunities for Volyume (ranked by impact)

1. **Commission a numeric display face for hero metrics (keep system font for everything else).**
   Whoop's DINPro numerals and designers' consensus ("typography hierarchy… more important than photography or colour") make this the highest-leverage brand move for a numbers-first app. Scope it to the display sizes of the type ramp only — minimal token change, zero body-copy risk, instant differentiation in screenshots and store listing. *(Respects the "no custom font yet" decision as a deliberate, now-expirable trade.)*

2. **Define one signature data visualisation and over-invest in chart craft.**
   Copilot's ADA recognition and Rise's energy curve show a single bespoke, beautifully animated viz can carry the brand. Candidate: the Precision Coaching adjustment trajectory (weight trend vs target corridor) rendered with spring-animated, amber-accented drawing — deterministic data deserves a distinctive deterministic chart. Default RN chart libraries read generic; this is the "spreadsheet vs dashboard" line.

3. **Hit and advertise the "ten-second answer".**
   Athlytic's praised bar ("check readiness in under ten seconds") and Whoop's three-number home screen define category-best glanceability. Audit the Volyume home screen: can a user answer "what do I train and eat today?" in one glance, ≤3 headline numbers, each with measure+unit+time-window pairing? Trim anything that doesn't serve that.

4. **Extend the empty-state illustration language into a lightweight system-wide identity.**
   Gentler Streak's award proves bespoke illustration is the category's most defensible "feels special" asset. Reuse the existing SVG style in onboarding, PR celebrations and the rare error states — no character/mascot needed (off-brand for Volyume's tone), just a consistent geometric illustration grammar.

5. **Add one "considered weight" motion moment.**
   Luxury-app research highlights deliberately paced micro-moments as premium signals. The genuine-PR celebration is the natural slot: a slightly slower, weightier spring + a distinct haptic pattern, used nowhere else. Reserved scarcity is what keeps it premium (and is the anti-gamification position users reward).

6. **Pre-empt the dark-only complaint with a published stance + halation tuning.**
   Whoop's forum pattern predicts Volyume's future complaints (daytime readability, astigmatism/eye strain). Mitigation without capitulation: verify body text is off-white (not #FFFFFF) on elevated surfaces, ship the higher-contrast toggle prominently, and add a settings-screen one-liner explaining why Volyume is dark-only. Turns a complaint into a brand statement.

7. **Steal MacroFactor's weakness: explain the engine in-product.**
   MacroFactor's top criticisms are an under-useful home screen and unexplained features. Volyume's deterministic coaching is an explainability gift — a "why this adjustment?" disclosure (Whoop-style tier-3 detail screen) converts density into trust and is a Pro-retention asset.

8. **Performance as design: protect cold-start and tab-switch latency.**
   Craft's "opens instantly" is cited as a core reason it feels premium; offline-first already gives Volyume the architecture to win here on Android. Set a cold-start budget and treat regressions as design bugs.

9. **Evaluate one disciplined depth surface (optional, lowest priority).**
   2026 trend consensus is surgical glassmorphism on overlays only. If Volyume ever relaxes no-gradients/no-glows, the only candidate is sheet/dialog scrims — never data surfaces. Defensible to skip entirely; Whoop does.

10. **Pilot subtle sound design for the PR moment only.**
    Multi-sensory feedback is the 2025–26 frontier and almost no tracker does it tastefully. One short, optional, reduce-motion-respecting sound paired with the PR haptic would be category-novel at near-zero scope. (User-toggleable, off by default.)

---

## 6. Source list

**Apps & teardowns:** [925 Studios — WHOOP design breakdown](https://www.925studios.co/blog/whoop-design-breakdown) · [WHOOP brand guidelines](https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf) · [WHOOP developer design guidelines](https://developer.whoop.com/docs/developing/design-guidelines/) · [Whoop Community light-mode threads](https://www.community.whoop.com/t/light-mode-dark-mode/6711), [#2](https://www.community.whoop.com/t/light-dark-mode/1034), [#3](https://www.community.whoop.com/t/light-mode-dark-mode-eye-strain/13924) · [Oura — new app design](https://ouraring.com/blog/new-app-design/) · [Pocket-lint Oura redesign review](https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/) · [Apple — Behind the Design: Gentler Streak](https://developer.apple.com/news/?id=3m0ht22s) · [Sketch blog — Gentler Streak](https://www.sketch.com/blog/gentler-streak/) · [60fps.design — Gentler Streak](https://60fps.design/apps/gentler-streak) · [Mobbin — Gentler Streak](https://mobbin.com/apps/gentler-streak-ios-5b268813-8b73-4242-9322-121482264f81) · [Neura Health — Bevel review](https://neura.health/insight/bevel-health-app-in-depth-review) · [Autonomous — Bevel review](https://www.autonomous.ai/ourblog/bevel-app-review) · [screensdesign — Bevel](https://screensdesign.com/showcase/bevel-health-performance) · [justuseapp — Bevel reviews](https://justuseapp.com/en/app/6456176249/bevel-longevity-performance/reviews) · [Apple — Copilot Money article](https://developer.apple.com/articles/copilot-money/) · [Apple newsroom — 2024 ADA](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/) · [BudgetPeer — Copilot review](https://www.budgetpeer.com/blog/is-copilot-money-worth-it-an-honest-look-at-the-premium-budget-app) · [Outlift — MacroFactor review](https://outlift.com/macrofactor-review/) · [Gymshark — recovery apps](https://www.gymshark.com/blog/article/best-apple-watch-recovery-apps) · [Cora — Athlytic review](https://www.corahealth.app/compare/athlytic) · [Setgraph — Reddit gym app roundup](https://setgraph.app/ai-blog/best-gym-app-reddit) · [Product Hunt — Hevy reviews](https://www.producthunt.com/products/hevy/reviews) · [Mattress Clarity — Rise review](https://www.mattressclarity.com/accessories/rise-app-review/) · [MoveWell — Rise review](https://movewellapp.com/blog/rise-science-review/) · [TapSmart — Rise review](https://www.tapsmart.com/apps/review-rise/) · [the5krunner — Strava redesign](https://the5krunner.com/2025/07/16/strava-app-redesign/) · [Strava Community — bad UI decisions thread](https://communityhub.strava.com/general-chat-2/feedback-on-new-mobile-app-interface-for-activities-bad-ui-decisions-8887) · [Riala — Peloton app](https://www.studioriala.com/project-detail-peloton-app) · [Hatchwise — Peloton logo](https://www.hatchwise.com/resources/the-evolution-of-the-peloton-logo)

**Cross-category:** [Sequoia — Linear spotlight](https://sequoiacap.com/article/linear-spotlight/) · [Figma — Saarinen's 10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/) · [Linear — Craft](https://linear.app/now/craft) · [Calmevo — Craft review](https://calmevo.com/craft-app-review/) · [Saner.ai — Craft review](https://www.saner.ai/blogs/craft-review) · [Android Developers — Monzo & Compose](https://developer.android.com/stories/apps/monzo-compose) · [Creative Bloq — Monzo UI](https://www.creativebloq.com/web-design/ux-ui/monzos-brilliant-ui-design-is-a-delight-to-use)

**Principles & trends:** [Glance — what makes apps premium](https://thisisglance.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive) · [Affective — luxury app design](https://weareaffective.com/learning-centre/luxury-mobile-app-design-and-development) · [Muzli — 7 tiny UI fixes](https://medium.muz.li/7-tiny-ui-fixes-that-can-make-any-product-look-premium-94a7c71c2aae) · [Tubik — 2026 UI trends](https://blog.tubikstudio.com/ui-design-trends-2026/) · [Muzli — 2026 mobile patterns](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/) · [Muzli — dashboard examples 2026](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/) · [MindInventory — 2026 UI/UX trends](https://www.mindinventory.com/blog/mobile-app-ui-ux-design-trends/) · [NN/g — skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [LogRocket — skeleton loading](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/) · [Onething — skeletons vs spinners](https://www.onething.design/post/skeleton-screens-vs-loading-spinners) · [Mobbin — skeleton glossary](https://mobbin.com/glossary/skeleton) · [Appy Pie — loading states](https://www.appypie.com/blog/loading-states-mobile-apps) · [Saropa — 2025 haptics guide](https://saropa.com/articles/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback) · [ThinkDebug — multi-sensory apps](https://thinkdebug.com/multi-sensory-apps-designing-with-sound-vibration-and-haptics/) · [Basis Health — dashboard guide](https://basishealth.io/blog/personalized-health-dashboards-design-guide-and-best-practices) · [Zigpoll — health data viz](https://www.zigpoll.com/content/how-can-i-use-data-visualization-techniques-to-enhance-the-user-experience-on-our-health-and-wellness-app's-dashboard-design) · [RevenueCat — gamification guide](https://www.revenuecat.com/blog/growth/gamification-in-apps-complete-guide/) · [RazFit — gamified workout apps](https://razfit.app/gamification-fitness/best-gamified-workout-apps-2026/) · [PlateLens — MFP alternatives](https://platelens.app/blog/myfitnesspal-alternatives-2026) · [PiunikaWeb — MFP update complaints](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/) · [MFP community — UX/IA thread](https://community.myfitnesspal.com/en/discussion/10959956/new-app-design-disregards-basic-ux-and-ia-principles) · [madappgang — fitness app design mistakes](https://madappgang.com/blog/the-best-fitness-app-design-examples-and-typical-mistakes/)

---

*Research notes: WebSearch summaries were cross-checked against multiple independent sources where possible. Single-source claims (Fitbit +30% DAU figure; "3s skeleton ≈ 1.5s spinner" perception study) are flagged as directional. No code was changed; this document is the only artefact produced.*
