# 13 — TRENDS, VERIFIED: testing the founder's 2026 design claim
Read-only research lane, Opus, web. 2026-09-14. Nothing in this file is a ruling.

**Authority.** Founder statement under test, in chat 2026-09-14: "The current 2026
design trend is actually moving toward minimalism, thumb-friendly layouts, bottom
sheets, restrained glass effects, tactile depth and purposeful micro-interactions
rather than simply throwing gradients and cards everywhere."

**Brief.** Test the claim, do not confirm it. Six parts, then the category tell and
what ages badly.

**Evidence marks used on every claim:**
- `[SOURCE]` — design commentary, platform documentation or journalism says this.
- `[SHIPPED]` — a large product actually shipped it; dated and attributable.
- `[EVIDENCE]` — usability, accessibility or measurement data exists.
- `[JUDGEMENT]` — the lane's reading, labelled as such.

**Standing constraint on every recommendation below:** RN 0.81 / Expo 54 managed,
no new dependency (available: Reanimated 4, Skia, react-native-svg,
gesture-handler, @gorhom/bottom-sheet, FlashList, expo-haptics,
expo-linear-gradient), WCAG contrast computed and asserted by tests,
Reduce Motion honoured everywhere, Android primary including mid-range.

**CORRECTION (lead, after the lane reported).** The brief this lane was given
listed `expo-blur` among the available libraries. That was the lead's error:
`expo-blur` is NOT in `package.json`, and `src/styles/theme.js:26` already
records the decision to decline it ("expo-blur declined, Android-first rule").
Report 12 caught this independently (`12-shipped-patterns.md:79-86`). Nothing in
section 4 below depends on it being installed -- the section's verdict is to
design the scrim first and treat blur as an optional upgrade -- but every
expo-blur note below must be read as describing a library we would have to ADD,
which is a founder-gated new dependency under Section 2 of CLAUDE.md, not one we
already have.

---

## 1. Minimalism

### What the commentary says
`[SOURCE]` 2026 trend writing is genuinely split, and the split is the finding.
One camp calls 2026 the year of "calm interfaces … and the end of visual
theatrics", "motion that explains rather than performs" (Envato Elements, 2026).
The other names "Anti-Design & Maximalism" as a numbered 2026 UI trend and frames
it explicitly as "a strategic response to AI-generated mediocrity" (Bootcamp,
2026). The most honest summary found says the landscape "is better understood as
pluralistic rather than as one aesthetic replacing another".

`[JUDGEMENT]` "2026 is minimalist" is the claim made about every year since 2013.
It is not falsifiable from trend writing, and trend writing is the weakest class of
evidence in this document. Discount it.

### What the strongest 2025-26 evidence actually shows — and it cuts the other way
`[EVIDENCE]` **CHI 2026, Bentley et al. (Google + Ipsos), "Usability Hasn't Peaked:
Exploring How Expressive Design Overcomes the Usability Plateau"
(doi:10.1145/3772318.3790373).** 48 participants, tasks across 10 applications,
each built twice: once to Material 3 Expressive guidelines, once to the previous
(calmer, more uniform) Material guidelines. Result: users **fixated on the correct
screen element 33% faster** and **completed tasks 20% faster** on the Expressive
versions, and preferred them aesthetically. Conclusion in the authors' own framing:
mobile usability "has not peaked", and the gain comes from "returning to basic
design fundamentals and increasing flexibility in size and color use".

`[EVIDENCE]` Google's own programme behind M3 Expressive: **46 studies, 18,000+
participants over three years**, eye-tracking plus surveys plus usability testing.
Users spotted key UI elements "up to four times faster" in Expressive designs; the
age gap in element-spotting largely disappeared; preference up to 87% in 18-24s.

`[EVIDENCE]` Google states the limits itself, and they matter more than the
headline: expressiveness that abandoned established interaction patterns
**decreased** usability scores; "a strong minority of users preferred calmer, less
intense versions"; results "impacted by users' lack of familiarity" (novelty
confound, unresolved).

`[JUDGEMENT]` Read carefully, this is not an argument for maximalism. The variables
M3 Expressive moved are **size, shape, colour, containment and type** — that is
differentiation, i.e. hierarchy. The finding is that **flat hierarchy costs task
time**, and that reduced chrome per se was never the lever.

### Where minimalism actively harms, with numbers
`[EVIDENCE]` **NN/g, "Flat UI Elements Attract Less Attention and Cause
Uncertainty", 3 Sept 2017.** 71 general web users, 9 sites, between-subjects,
findability tasks, eye-tracking. Weak clickability signifiers cost **22% more time
on task and 25% more fixations**, both significant by paired t-test with sites as
random factor, p < 0.05. Verbatim conclusion: "Designs with weak clickability
signifiers waste users' time".

`[EVIDENCE]` **NN/g, hidden navigation.** Hiding a site's main navigation cuts
discoverability "almost in half"; where hidden items are also available visibly,
visible usage is "often double or more"; task time rises and perceived difficulty
rises. Held on both mobile and desktop.

`[EVIDENCE]` **Neumorphism, 2020, is the opposite failure and the more useful
lesson.** It died on contrast: raising shadow contrast enough to pass accessibility
destroys the soft look that is the entire point, so it could not be fixed. Depth
was not the error; depth that requires low contrast was.

### Named failure modes for a data-dense product
`[JUDGEMENT]` For a strength log read at arm's length mid-set, the known failure
modes of minimalism are, in order of cost here:
1. **Flat hierarchy** — every block the same size, width, radius and weight, so the
   eye has nowhere to land. This is Volyume's measured state: 73.9% of typed text
   at 11 or 13 px, 92.9% at ≤16 px, five sites above 24 px across 106 screens
   (`11-current-state-audit.md`). The CHI 2026 result says this is a *task-time*
   defect, not a taste defect.
2. **Invisible affordances** — 22%/25% penalty above.
3. **Hidden navigation / mystery-meat icons** — discoverability halved; 683 stock
   Ionicons with 244 amber-tinted is a mystery-meat risk as well as a brand one.
4. **Same object for every meaning** — one radius doing five jobs removes shape as
   a signal, which is one of the five variables the CHI paper says carries the gain.

**Verdict on part 1: Partly supported, and mis-framed.** The direction Volyume
needs is not minimalism; it is *differentiation with restraint*. Quiet chrome,
loud hierarchy, unmistakable affordances. The existing "one loud thing per screen"
law in `20-DIRECTION-AND-PLAN.md` is the correct reading of the strongest evidence
available, and should be cited to CHI 2026 rather than to taste.

---

## 2. Thumb-friendly layouts

### The original research
`[EVIDENCE]` **Hoober, 2013, 1,333 street observations**: 49% one-handed grip, 36%
cradled (one hand holds, other hand taps), 15% two-handed two-thumb; ~75% of
touches made with a thumb; roughly two-thirds of one-handed grips right-handed.
Caution: secondary reporting of these figures varies (one widely-read summary gives
"10%" for two-thumb), which is itself a reason to cite the 2013 original and not
the infographics derived from it.

### The revision, which almost nobody quotes
`[EVIDENCE]` **Hoober's own later work (UXmatters, Sept 2014; 31 participants,
~100 hours of analysis) contradicts the popular thumb-zone chart.** Findings, close
to verbatim: users "prefer to touch the center of the screen and will do so
whenever you give them a choice of where to touch"; people "are more accurate at
touching the middle of a mobile device's screen"; grips change constantly by task
and context, to the point that he writes "there's hardly any one-handed use for
actually touching the screen"; 41% of virtual-keyboard typing is two-handed. His
design recommendation is **key content and actions in the middle two-thirds of the
screen, secondary options along the top and bottom edges**. Secondary reporting
notes he has since said the green/yellow/red thumb-zone diagram — "including
versions he drew over ten years ago" — is wrong.

`[EVIDENCE]` **NN/g, "Bottom Sheets: Definition and UX Guidelines" (Laubheimer,
11 June 2023)** states the same thing as an explicit debunk: the reachability
rationale "is not universally true … the bottom of the screen is often not the most
easily reachable screen region, with the middle of the screen representing the most
easily tappable area".

### What large products shipped anyway, and what they said
`[SHIPPED]` **Chrome for Android bottom address bar.** Tested from October 2024,
stable rollout from April 2025, widely rolled out on v138 by June/July 2025.
Google's stated reason is one-handed reachability on taller phones: it "moves the
Omnibox above the gesture navigation bar for improved one-handed usage". Chrome for
iOS shipped the same option in 2023; Safari moved its bar down in iOS 15 (2021).
`[SHIPPED]` **iOS 26** puts Safari's search at the bottom by default.
`[EVIDENCE]` NN/g criticised that specific move for the relearning cost it imposes
on existing users, not for the ergonomics.

### Platform guidance as it stands in 2026
`[SOURCE]` **Apple HIG / iOS 26:** the tab bar is a bottom Liquid Glass capsule,
inset 21 pt left/right/bottom; search is a separate circular island to its right;
2-5 tabs; minimum tap target 44×44 pt; 11 pt minimum for tab labels. Commentary on
the HIG notes "the search button being on the bottom of the screen is a newer
emphasis of Apple's".
`[SOURCE]` **Material 3:** bottom app bars "group primary and secondary actions at
the bottom of the screen, where they are easily reachable by the user's thumb".
M3 Expressive adds floating toolbars as a further bottom-anchored surface.

### Size, which is the part with hard numbers
`[EVIDENCE]` **Parhi, Karlson & Bederson, MobileHCI 2006 — the only study here
specifically about one-handed *thumb* use.** 9.2 mm for discrete tasks, 7.6 mm for
serial tasks, as the size below which performance and preference degrade.
`[JUDGEMENT]` Converted: 1 dp = 0.15875 mm, so Material's 48 dp minimum = 7.62 mm,
i.e. exactly the *serial-task* floor and below the discrete-task figure. Apple's
44 pt ≈ 6.86 mm is below both. **9.2 mm ≈ 58 dp.** For a control pressed once per
set by a sweaty hand, 48 dp is the floor and ~56-58 dp is the right size.

### Proportion of use that is genuinely one-handed
`[JUDGEMENT]` **Unknown for this product, and it should not be guessed.** The 49%
figure is street observation from 2013 on much smaller phones. Gym use plausibly
skews far more one-handed (one hand on a bar, a rack or a towel) but no published
figure for that context was found. This is answerable from the product's own
telemetry or from a founder device-walk; it is not answerable from the literature.

**Verdict on part 2: Partly supported, with the popular justification wrong.**
Durable: primary repeated actions belong low, never in the top corners, and must be
large. Overstated: "bottom is most reachable" is contradicted by the same
researcher who produced the thumb-zone idea. Do not justify a layout decision with
the thumb-zone diagram; justify it with frequency of use and target size.

---

## 3. Bottom sheets

### Are they the default modal surface?
`[SHIPPED]` Effectively yes on both platforms. Material 3 ships modal and standard
bottom sheets as first-class components; Apple shipped resizable sheet detents in
iOS 15 and iOS 26 makes bottom-anchored glass surfaces the system norm. Google Maps,
Apple Maps, Files, Photos and most Google apps present their primary secondary
surface as a sheet.
`[JUDGEMENT]` "Default modal surface" is accurate as description. It is not a
recommendation, and the guidance from both Google and NN/g is narrower than
practice.

### Guidance, close to verbatim
`[SOURCE]` **Material 3:** use a modal bottom sheet "as an alternative to inline
menus or simple dialogs on mobile, especially when offering a long list of action
items"; it blocks interaction with the rest of the screen but keeps the context
behind visible. Full-screen dialogs are for complex tasks.
`[EVIDENCE]` **NN/g (2023), the operative list:**
- "Do not use a bottom sheet to replace typical page-to-page user flows." Sheets
  are "transient UI elements not intended to be stable places for users to return
  to or spend significant time on."
- Do not stack sheets or modals; if a flow needs modal after modal, redesign it as
  a multi-step page.
- Do not use for lengthy content. A sheet expanded to full screen "looks like a
  regular page", which confuses users about where they are.
- Include a visible close control (X or "Close"); do not rely on the swipe or the
  grab handle alone — that is an accessibility barrier and it collides with system
  gestures.
- Support the device Back button/gesture for dismissal.
- The reachability argument for sheets is wrong (part 2 above).

### Accessibility and screen readers — the part libraries do not do for you
`[EVIDENCE]` The accessible-sheet contract is: move focus into the sheet on open,
trap focus inside it, make background content inert, return focus on close, offer
a non-gestural close, and announce the sheet. Common implementations fail all six.
`[SOURCE]` **@gorhom/bottom-sheet specifically** (the library already installed):
issue #687, opened 8 Oct 2021, asked for sibling-hiding and focus transfer; it was
**closed as "invalid"** with no maintainer explanation. The workarounds are ours to
write: `accessibilityViewIsModal` on iOS, `importantForAccessibility="no-hide-
descendants"` on the sibling tree on Android, and
`AccessibilityInfo.setAccessibilityFocus()` on present.

### React Native pitfalls, named
`[SOURCE]` Open/known issues against @gorhom/bottom-sheet: keyboard cuts
`BottomSheetFlatList` content on Android (#1211); keyboard expands the sheet past
its intended maximum height (#1430); a `TextInput` at the bottom of a scroll view
falls behind the Android keyboard (#1934); scrollables must come from
`react-native-gesture-handler`, not `react-native`, or gestures conflict;
`BottomSheetFlatList` performs poorly with substantial content and images.
`[SOURCE]` An RN `Modal` is a separate Android window, so anything inside it cannot
read or blur the window behind it.
`[JUDGEMENT]` Every one of those defects is in the keyboard-plus-list quadrant.
That is the quadrant a set logger lives in.

**Verdict on part 3: Partly supported, and risky for this product's core flow.**
`[JUDGEMENT]` Use a sheet for: one short list of choices, one single-value picker
(weight, reps, RPE), row-contextual actions. Never for: anything with a keyboard
and more than one field, any multi-step flow, anything the user must return to,
anything that would grow to full height. Mid-set set editing must stay **inline in
the ledger** — a sheet that covers the rows you are comparing against is strictly
worse than an inline editor, and it is the flow most exposed to the Android
keyboard bugs above.

---

## 4. Restrained glass

### iOS 26: what shipped and what was walked back
`[SHIPPED]` Liquid Glass announced WWDC June 2025, shipped September 2025 as "the
single biggest update to Apple's design system since iOS 7". Transparency was
reduced across the beta cycle — the comparison between first beta and stable
release is described as "night and day". **iOS 26.1 added a "Tinted" control** that
raises opacity and contrast, after weeks of criticism.
`[EVIDENCE]` **NN/g, "Liquid Glass Is Cracked, and Usability Suffers in iOS 26",
10 Oct 2025**, verbatim where quoted: "Text on top of text creates an illegible
mess"; tap targets "cramped, squeezed" versus iOS 18; navigation collapses
contextually so users "have to play hide-and-seek with the navigation controls";
"Motion for motion's sake is not usability. It's distraction with a side of
nausea"; overall, "Apple is prioritizing spectacle over usability".
`[EVIDENCE]` Infinum's accessibility review reported screens measuring around
**1.5:1** against the WCAG 4.5:1 minimum, with lock-screen notifications barely
visible and Control Center toggles blending into the wallpaper.

### iOS 27: the second walk-back
`[SHIPPED]` **WWDC 2026 (8-12 June 2026).** Apple revamped Liquid Glass for iOS 27
/ iPadOS 27 / macOS 27 explicitly to address the criticism: default transparency
reduced again, better diffusion of complex content behind the glass, a **darkened
edge** plus brighter specular highlights to restore separation, and a user-facing
**transparency slider** running from ultra-clear to fully tinted. Corroborated
across MacRumors, Neowin and TechTimes.
`[SOURCE]` One secondary source additionally claims a "~40% to ~60% opacity floor",
a "High Contrast Liquid Glass" mode and a `UIDesignSystem` API with
`.liquidGlass` / `.classic` / `.adaptive`. **Single-source and self-described as
the author's synthesis with no Apple statements — treat as unverified.**

### What Android does instead
`[SHIPPED]` Material 3 Expressive announced May 2025, shipped in Android 16 QPR1
from around 3 Sept 2025, default out of the box on Pixel 10.
`[SOURCE]` **Correction to a common claim:** M3 Expressive is not blur-free. Android
Central describes it as using "semi-translucent elements and … heavy blur to create
depth", and the widely-held read (Mishaal Rahman) is that the *heaviness* of the
blur is precisely why it holds up better than iOS 26's transparency. Where iOS
reaches for glass, M3E also reaches for bright bold colour, larger shapes and
physics motion — but it did not avoid blur.
`[SHIPPED]` **Google shipped an off switch too.** Mindy Brooks, VP of Product
Management and UX for Android, on the record: "we will be rolling out a new
customization setting so that you can turn blur off as well", and, on the original
intent, "we obviously know that it doesn't meet the needs of all users."
`[JUDGEMENT]` **This is the single most useful fact in this section.** Within twelve
months, both platform owners shipped a user-level kill switch for their own
signature material. A material with a kill switch cannot carry a product's
identity, because a meaningful share of users will be looking at the version
without it.

### The practical question: blur in RN on mid-range Android
`[SOURCE]` **expo-blur, official docs:** "The blur can be achieved efficiently only
by using the RenderNode Android API, which was introduced in Android SDK 31 …
on older versions of Android `expo-blur` uses the much less efficient RenderScript
API." `dimezisBlurView` "may lead to decreased performance on Android SDK 30 and
below"; `dimezisBlurViewSdk31Plus` falls back to `'none'` below SDK 31; and the
**default `blurMethod` on Android is `'none'`**, which renders a semi-transparent
view and no blur at all.
`[SOURCE]` Technical constraints that decide the design:
- Animating `intensity` forces "capture the backdrop, downsample it, blur it and
  upload it … on every animated frame". Animate **opacity** instead; the GPU
  composites that for free.
- Blur cannot sample a `SurfaceView`, so video and maps give you "the tint and none
  of the blur".
- Blur inside an RN `Modal` cannot read the window behind it (separate Android
  window).
- Skia's `BackdropFilter` only blurs pixels drawn inside its own Canvas, so it
  cannot blur a `FlatList` that lives outside the Canvas. Skia is the wrong tool
  for blurring native views on Android; expo-blur samples the real view hierarchy.
`[SOURCE]` The only quantified Android measurements found (Apptim, on an **Expo Go +
Storybook** project, not a production build — low confidence): multiple blurs in a
single element degraded worst of all cases tested, memory on the multi-blur story
averaged 407.8 MB against a 384 MB warning threshold, and one run registered a
crash invisible to the user. Single blur per element was fine. Treat as directional
only; a real number would need a profile on a real mid-range device.

**Verdict on part 4: Supported, and the word "restrained" is carrying all of it.**
`[JUDGEMENT]` For Volyume: **design the scrim first and treat blur as an optional
upgrade.** Blur is justified in at most one place — fixed, short-lived overlay
chrome (a sheet backdrop, possibly the tab bar) where what is behind is decorative
for that moment. It is a legibility mistake anywhere behind text read at arm's
length, and specifically behind the ledger. Gate it on `Platform.Version >= 31`,
honour Reduce Transparency, never animate `intensity`, never place it inside a
`Modal`, one blur surface at a time. Amber on the current ground computes at
**9.59:1** (#F5A623 on #0D0D0D) — blur is the one move that would throw that away
for nothing.

---

## 5. Tactile depth

### Separating the fashion from the substance
`[SOURCE]` "Tactile" in 2026 trend writing overwhelmingly means **physical texture
and maximalism** — Creative Bloq's "texture, warmth and tactile rebellion",
"tactile maximalism", sculptural type, layered illustration, "the beautifully
imperfect marks of human hands". Most of that literature is interiors and graphic
design, not product UI.
`[JUDGEMENT]` That is not what the founder means, and it is the fashion half of the
word. Adopting it literally in a training app would be a mistake.

### The substantive half: depth as affordance
`[EVIDENCE]` The 22%-more-time / 25%-more-fixations result (part 1) is the direct
evidence for depth. NN/g's stated remedy is **Flat 2.0**: "a mostly flat design, but
with clickable elements that users can recognize easily". The strongest clickability
signifier that flat design removed was the 3-D effect.
`[EVIDENCE]` **Neumorphism is the boundary condition.** It failed because its
affordance *was* the low-contrast shadow: "an active toggle and an inactive one are
the same gray pillow" on a dimmed phone or in sunlight. Depth that only works at low
contrast cannot be made accessible, so it was abandoned.
`[JUDGEMENT]` **On a #0D0D0D ground, drop shadows are close to invisible anyway.**
Depth here has to be carried by **surface lightness steps and hairlines**, not
shadow. That is fortunate: lightness steps are exactly what the existing
`theme.test.js` already asserts contrast for across five elevation steps.

### What "tactile depth" means concretely in 2026
`[SOURCE]` M3 Expressive builds depth from **containment, shape and tonal surfaces**
plus physics motion, not from shadows. Its motion system replaces duration/easing
curves with springs: **spatial** springs for layout movement, **effect** springs for
colour and opacity, each with fast/default/slow variants, parameterised by stiffness
and damping ratio.
`[EVIDENCE]` **Press physics has a hard budget, and it is small.** NN/g: for an
animation to convey a cause-and-effect relationship, "the effect must begin within
0.1 seconds of the initial user action". Doherty & Thadani (IBM, 1982): **400 ms** is
where response and action fuse into one perceived event. So a press must *start*
under 100 ms and be *finished* well inside 400 ms. Anything longer is decoration.
`[EVIDENCE]` **Haptics, Android's official design principles, verbatim:** "Favor
rich and clear haptics over buzzy haptics"; "Be consistent, both with the system and
the app design"; "Be mindful of frequency of use, and importance"; "Haptic effects
shouldn't overwhelm the user or feel gratuitous"; effects on very frequent events
"should be very subtle"; avoid legacy one-shot vibrations; "Given the choice of
buzzy haptics or no haptics for touch feedback, choose no haptics"; a good keyclick
lasts 10-20 ms; prefer `HapticFeedbackConstants` because consistency "is particularly
valuable as an accessibility consideration". Summary line: "less is more … Too much
vibration can be annoying and even numbing to the hands".

### The line between tactile and skeuomorphic
`[JUDGEMENT]` **Tactile** = the surface *behaves* like an object: it responds inside
100 ms, it holds a fixed rank in an elevation ladder, it has mass in motion.
**Skeuomorphic** = the surface *depicts* a material: leather, brushed metal, glass,
knurling, bevels, inner glow. The test to apply in review: strip the texture and the
gradient, keep only the behaviour and the lightness step. If it still reads as
pressable, it is tactile. If the only affordance was the depiction, it is
skeuomorphic and it will date.

**Verdict on part 5: Supported as affordance, Fashion as texture.** Build an
**elevation ladder** with a fixed, small number of ranks (ground, row, card, sheet,
overlay), each defined as a token lightness step against its parent plus a hairline,
each asserted by the contrast tests that already exist. No depicted materials. No
inner glow. Press response under 100 ms, settled under 400 ms.

---

## 6. Purposeful micro-interactions

### Where they demonstrably help
`[EVIDENCE]` **NN/g, "Animation for Attention and Comprehension" (21 Sept 2014).**
Animation earns its place when it draws attention to and explains a *change*, and
when it conveys the relationship between an element and the action just taken.
Timing requirement, verbatim: the effect "must begin within 0.1 seconds of the
initial user action". Warning in the same piece: "just because you can implement an
animation, it doesn't mean that you should", and users repeatedly reported "this was
nice the first time, but now it's getting annoying".
`[EVIDENCE]` **Perceived speed.** Skeleton screens are perceived as faster than
spinners at *identical measured load time*; in a mobile study (n = 80, randomised
order, skeleton vs spinner vs blank) the skeleton performed best on perceived
duration and best on emotional response, blank worst. `[SOURCE]` The widely-quoted
"30% faster" figure is secondary reporting and was not traced to a paper — do not
cite it in product copy.
`[EVIDENCE]` **Response-time thresholds that still hold:** 0.1 s perceived as
instantaneous; 1 s is the limit of uninterrupted flow of thought; 10 s is the limit
of attention (Nielsen, 1993).

### Where they harm
`[EVIDENCE]` NN/g on Liquid Glass (2025): controls animating "without user benefit"
— carousel dots morphing, buttons pulsating — is "distraction with a side of nausea".
`[EVIDENCE]` NN/g on scroll-triggered animation (2017) is **qualitative only** — no
sample size, no measured slowdown, one participant quote. Report it as sentiment,
not as data. Honest reading: the evidence that animation *harms task time* is much
weaker than the evidence that missing affordances harm task time.
`[EVIDENCE]` **The accessibility obligation is not weak, though.** WCAG 2.3.3
"Animation from Interactions" (Level AAA) requires that motion animation triggered by
interaction can be disabled unless it is essential. The population served is large:
an epidemiological estimate cited by the Vestibular Disorders Association (Agrawal
et al., *Archives of Internal Medicine*, 2009) puts **~35% of US adults aged 40+**,
roughly 69 million people, as having experienced some vestibular dysfunction.
Reported reactions to unwanted motion include nausea, migraine and needing bed rest.
`[JUDGEMENT]` A strength-training app skews adult. This is not an edge case here.

### Durations and easing that hold up
`[SOURCE]` **Material 3 duration tokens:** 50 ms (ripple, checkbox tick), 100 ms
(small element appear), 150 ms (icon transitions, selection indicators), 200 ms
(tooltip, chip), 250 ms (FAB expand, card state), **300 ms — "most common: dialog,
bottom sheet, nav drawer"**, 400 ms (page-level panel), 450-600 ms (shared element,
container morph), 700-1000 ms full-screen transitions only.
`[SOURCE]` **Easing, with the rule that matters:** "Enter = Decelerate easing …
Exit = Accelerate easing … Never use the same easing for both." Emphasized decelerate
(0.05, 0.7, 0.1, 1.0) entering; emphasized accelerate (0.3, 0.0, 0.8, 0.15) exiting;
emphasized (0.2, 0.0, 0.0, 1.0) as the default; linear for looping animations only.
`[JUDGEMENT]` The 100-400 ms band has survived Material 1, Material 3, M3 Expressive
and Liquid Glass. Bet on it.

### What Reduce Motion obliges
`[JUDGEMENT]` Honour `AccessibilityInfo.isReduceMotionEnabled` everywhere, and the
correct behaviour is **replace, not remove**. A spring becomes a 100 ms cross-fade or
an instant state change; the *feedback* must survive, because removing it removes
state legibility, which is the only justification the micro-interaction had.

### Haptic restraint rules for this product
`[JUDGEMENT]`, derived from the Android principles above:
- Haptic on **commit only** (set logged, session finished, destructive confirm).
  Never on scroll, never on every field change, never per rep.
- One vocabulary: the same effect for the same class of event, everywhere.
- Prefer platform constants over hand-rolled waveforms.
- Behind a user setting, and off under Reduce Motion is a reasonable default to test.
- `[EVIDENCE]` Battery is not the constraint: short 50-100 ms vibrations draw
  negligible power; only continuous or high-frequency vibration measures. The real
  constraint is annoyance and habituation.
- **ED-safety cross-check (CLAUDE.md Section 2):** celebratory micro-interactions —
  confetti, streak flames, escalating reward haptics, "you crushed it" — are exactly
  the class this product forbids. "Purposeful" here means *state legibility* (this
  set is logged; this is the set you are on), never reward.

**Verdict on part 6: Supported, with a hard ceiling.**

---

## 7. The category tell: can a warm amber brand survive?

### What makes an app read as a fitness app in 2026
`[SOURCE]` Trend and template writing converges on a recipe: a near-black ground
(#0B0B0F is quoted), **one** high-energy accent (electric lime, neon orange, amber
yellow, cyan) reserved for progress and CTAs, oversized numeric type for live stats,
generous spacing. "Dark mode is a strong default choice for gym and fitness brands
because it conveys energy, intensity and modernity." Weak evidence class, but it is
describing something real.

### What the large products actually ship
`[SHIPPED]` **Strava** — dark ground, brand orange **#FC4C02**, achievements glowing
in the same orange as the logo.
`[SHIPPED]` **Whoop** — Cod Gray / near-black with a signature red, plus a strict
three-colour data vocabulary (green = recovered, yellow = intermediate, red = strain
or risk) that "repeats across every screen". The Recovery score renders at roughly
**72 pt equivalent, explicitly for readability at arm's length**. Whoop's own framing
of the dark ground is functional, not aesthetic: colour data pops, the app is checked
first and last thing in the day, and the dark canvas makes coloured coaching elements
read as content rather than decoration. Their information architecture is three tiers
on three separate screens, not expanding sections.
`[SHIPPED]` **Nike Training Club** — clean, high contrast, deliberately distraction-
free during a workout. **Apple Fitness** — red/green/blue rings on black.
`[SHIPPED]` **Hevy / Strong** — positioned and reviewed on the absence of bloat,
gamification and upselling rather than on visual signature.

`[JUDGEMENT]` So: **dark ground plus one hot accent is the category signature, and
orange specifically is Strava's.** #F5A623 on #0D0D0D sits inside that signature, not
outside it. The founder's "must not look like a fitness app" is a complaint about
looking *generic*, and the generic part is not the hue — it is the recipe:
same-size cards, stock glyphs in tinted circles, accent sprayed on decoration.

### The AI-design critique, at primary source
`[SOURCE]` **Kyle Chayka, New Yorker column; Substack version dated 29 June 2026.**
Verbatim: "beige- and cream-colored backgrounds, rusty orange-hued accents, and large
serif typefaces that are italicized"; subheadings "tracked out"; "an inexplicable
prevalence of ticker-like text bars"; and, from designer David McGillivray,
dashboards with "multiple rounded rectangular outlines, sometimes with a neon glow
underneath for good measure". He ties it explicitly to Claude Design output mirroring
Anthropic's own branding. His own nuance: the choices are "unobjectionable, even
desirable, in and of themselves" — the problem is ubiquity turning them into "instant
design clichés". One designer quoted is "instinctively repulsed by the warm tones".
`[SOURCE]` **Jim Nielsen, "The AI Aesthetic", 29 July 2026** — credits the
beige/orange/serif observation to Chayka and adds shimmering "thinking" text,
streaming text, tiny thin sidebar icons, whack-a-mole controls, and the sparkle emoji
("the telltale sign of buttons not to click"). He makes no value judgement on the
palette itself.

### The answer, plainly
`[JUDGEMENT]` **Yes, a warm amber brand can survive — and it is not the thing being
criticised.** The named AI tell is a **light warm ground** (beige/cream) + a
**desaturated rusty** orange + a **large italic serif**. Volyume is a near-black
ground + a saturated amber + a grotesque. It is not Chayka's aesthetic. But two
specific devices on the tell list are live risks in this repo:
- the **neon glow under a rounded rectangle** — which is precisely the Skia glow
  promised at `theme.js:28-29`. Do not build it.
- **amber sprayed on decoration** — 244 amber-tinted stock icons, against the app's
  own written rule. That is the ubiquity charge, landing.

Four disciplines make a warm amber defensible:
1. **Budget.** Amber means one thing ("now") and appears on one, at most two,
   elements per screen. Chayka's charge is ubiquity; the fix is scarcity.
2. **No warm ground, ever.** No cream, beige or ivory surface. This alone puts the
   product outside the named aesthetic.
3. **No co-occurring tells.** No display serif, no italic display, no tracked-out
   subheads, no ticker bars, no glow under a rounded rectangle, no sparkle. Archivo
   (a grotesque) is on the right side of this line.
4. **Amber is earned by data, not decoration.** Whoop's discipline: colour encodes
   state, identically, everywhere, so it is learned once.

### Two (three) concrete alternatives that keep the warmth
All contrast figures below computed for this report against #0D0D0D; every one must
be re-asserted in `theme.test.js` before adoption.

- **A. Warm the neutrals, shrink the accent.** Keep #F5A623 strictly as a state
  colour and move the whole grey ramp from neutral to **warm grey** (e.g. #121110 /
  #1A1816 / #24211D). Warmth then comes from the temperature of the *ground*, which
  no AI default produces, and the accent can shrink almost to nothing.
  `[JUDGEMENT]` Cheapest change, largest character gain, zero contrast risk
  (#F5A623 on #141414 computes 9.09:1).
- **B. Split the warm into two roles, signal and material.** Promote a hotter,
  industrial orange for "now"/live (safety-orange territory, e.g. **#FF6A00 =
  6.77:1** — AA for normal text, AAA for large) and demote #F5A623 to a *material*
  warm for ledger rules and figures at low emphasis. Two warms with distinct jobs
  reads as authored; one warm everywhere reads as a default.
  **Caution:** #FC4C02 computes 5.71:1 and is Strava's brand. Do not land near it.
- **C. Warm the type, not the ground.** Keep amber for "now" and replace pure white
  body type with a warm bone (e.g. #E8E2D6). Warmth lives in the text at very high
  contrast, and the accent budget can fall to a single element per screen.
  `[JUDGEMENT]` Safest of the three; smallest visual shift.

---

## 8. What ages badly, and what I would bet five years on

### Fashion — expect these to date inside two years
- `[SHIPPED]` **Translucency and blur as identity.** Both platform owners shipped a
  user-level off switch for their own signature material within twelve months (Apple's
  Tinted in iOS 26.1 and the iOS 27 transparency slider; Google's blur toggle, on the
  record from Mindy Brooks). A material a meaningful share of users turns off cannot
  carry a brand.
- `[SOURCE]` **Neon glow under a rounded rectangle, gradient-filled cards,
  glassmorphic chrome.** Already named on the AI-tell lists in mid-2026.
- `[SOURCE]` **Cream ground + italic display serif + tracked-out subheads + ticker
  bars.** Dated the day Chayka named them, June 2026.
- `[SOURCE]` **Anti-design / tactile maximalism / deliberate imperfection.** A 2026
  reaction to AI sameness. Reactions have short half-lives, and it is flatly wrong for
  a safety-adjacent tool where legibility is the product.
- `[JUDGEMENT]` **Springy overshoot as a default.** M3 Expressive's physics motion
  arrived in 2025; a bouncy default will read as "2025-26" the way the Material ripple
  reads as "2014". Use springs where mass is the meaning; not everywhere.
- `[JUDGEMENT]` **Full-bleed hero photography** in a logging product.

### Durable — I would bet five years on these
- `[EVIDENCE]` **A type scale with real range, contrast-tested.** The single loudest
  lever available, and CHI 2026 says it is also the *usability* lever (33% / 20%).
- `[EVIDENCE]` **Depth as affordance, expressed as surface-lightness steps and
  hairlines.** Survived flat, Flat 2.0, Material 3 and Liquid Glass. Shadows do not
  work on near-black; lightness ranks do, and they are testable.
- `[EVIDENCE]` **Visible navigation, visible affordances, no mystery meat.** Evidence
  from 2015 to now, never reversed.
- `[EVIDENCE]` **Targets sized for real thumbs** — 48 dp floor, ~56-58 dp for the
  commit control — with frequent actions in the middle-to-lower two-thirds and nothing
  frequent in the top corners.
- `[SOURCE]` **Motion in the 100-400 ms band, different curve in and out, fully
  disableable.** Stable across three design-language generations.
- `[JUDGEMENT]` **One repeated, owned device** (the week ribbon, the ledger). Platform
  materials change under you; a device you drew yourself does not. This is the single
  strongest defence against reading as machine-made, because no default produces it.
- `[SHIPPED]` **Dark ground, one saturated accent, one meaning.** Whoop has run this
  for a decade and Strava longer.
- `[JUDGEMENT]` **Tokens plus tests as the mechanism.** What lets a live product change
  its look without re-skinning is that colour, radius, spacing and motion are named and
  asserted. The audit shows Volyume already has this; it is the most valuable asset in
  the system and nothing in a redesign should weaken it.

`[JUDGEMENT]` **The largest ageing risk is not any of the six claims.** It is shipping
a platform-signature material at all. On a cross-platform RN app you inherit the
criticism without the platform's ability to fix it in a point release — and both
platforms needed two attempts in twelve months.

---

## Closing table: verdict on each of the founder's six claims

| # | Claim | Verdict | Strongest single piece of evidence | What we should actually do |
|---|---|---|---|---|
| 1 | Minimalism | **Partly supported, mis-framed** | `[EVIDENCE]` CHI 2026 (Bentley et al., Google + Ipsos, n=48, 10 apps): Material 3 **Expressive** designs beat the previous calmer guidelines by **33% faster first fixation on the correct element and 20% faster task completion** | Stop calling it minimalism. Build *differentiation*: one loud thing per screen, quiet chrome, unmistakable affordances. Fix the measured flat hierarchy (73.9% of text at 11-13 px), not the amount of ink |
| 2 | Thumb-friendly layouts | **Partly supported; the usual justification is wrong** | `[EVIDENCE]` Hoober's own later work: users "prefer to touch the center of the screen", are most accurate there, and switch grips constantly; NN/g (2023) states the middle, not the bottom, is the most tappable region | Primary repeated controls in the middle-to-lower two-thirds, ≥48 dp and ~56-58 dp for the commit button, nothing frequent in top corners. Never cite the thumb-zone diagram as the reason. Measure this product's real one-handed share rather than assuming 49% |
| 3 | Bottom sheets | **Partly supported; risky for the core flow** | `[EVIDENCE]` NN/g (Laubheimer, 2023): "Do not use a bottom sheet to replace typical page-to-page user flows"; do not stack; visible close required; the reachability rationale is wrong. Plus @gorhom/bottom-sheet's open Android keyboard defects (#1211, #1430, #1934) and a11y issue #687 closed as "invalid" | Sheets for one short choice or one value picker only. Never for keyboard flows, multi-step flows, or anything returned to. Mid-set set editing stays **inline in the ledger**. If we ship any sheet, we write the focus/inert/close a11y layer ourselves |
| 4 | Restrained glass | **Supported, with "restrained" doing all the work** | `[SHIPPED]` Both platform owners shipped a user-level kill switch for their own material within 12 months: Apple's Tinted (iOS 26.1) then the iOS 27 transparency slider; Google's blur toggle, per Mindy Brooks, VP Product Management & UX, Android | Design the scrim first; blur only as an upgrade gated on SDK ≥ 31 and Reduce Transparency, never animated `intensity`, never inside a `Modal`, never behind the ledger. Protect the 9.59:1 amber-on-black we already have |
| 5 | Tactile depth | **Supported as affordance; Fashion as texture** | `[EVIDENCE]` NN/g eyetracking (n=71, p<0.05): weak clickability signifiers cost **22% more time and 25% more fixations**. Neumorphism is the counter-proof that depth requiring low contrast cannot be fixed | A five-rank elevation ladder built from token lightness steps and hairlines (not shadows, which are invisible on #0D0D0D), each asserted by contrast tests. Press starts <100 ms, settles <400 ms. No depicted materials, no inner glow |
| 6 | Purposeful micro-interactions | **Supported, with a hard ceiling** | `[EVIDENCE]` NN/g: cause-and-effect animation "must begin within 0.1 seconds"; motion without meaning is "distraction with a side of nausea". WCAG 2.3.3 plus ~35% of adults 40+ having experienced vestibular dysfunction makes Reduce Motion non-optional | 100-400 ms band, decelerate in / accelerate out, never the same curve both ways. Reduce Motion *replaces* motion with a cross-fade, never removes the feedback. Haptics on commit only, one vocabulary, platform constants, behind a setting. No celebratory motion or reward haptics (ED-safety, Section 2) |

### And the two questions that actually decide the redesign
| Q | Answer |
|---|---|
| 7. Can warm amber survive on a product that must not look like a fitness app? | **Yes.** `[JUDGEMENT]` The named AI tell is a *light* cream ground + *desaturated rusty* orange + *italic serif*; Volyume is near-black + saturated amber + grotesque, which is not it. The real exposure is ubiquity (244 amber-tinted stock icons) and one specific device on the tell list: the neon glow under a rounded rectangle promised at `theme.js:28-29`. **Do not build the glow.** Discipline: amber means one thing, never a warm ground, no serif/italic/tracked-out/ticker/sparkle, colour earned by data. Warm alternatives that keep character: (A) warm the neutral ramp and shrink the accent; (B) split into a hot signal orange (#FF6A00, 6.77:1) plus amber as a low-emphasis material; (C) warm bone type (#E8E2D6) instead of pure white. All re-asserted in `theme.test.js` first |
| 8. What ages badly? | `[JUDGEMENT]` **Fashion:** blur/translucency as identity, neon glow under rounded rectangles, cream + italic serif, anti-design texture, springy overshoot as a default, hero photography. **Durable:** a contrast-tested type scale with range, depth as lightness ranks, visible affordances and navigation, thumb-sized targets, 100-400 ms disableable motion, one owned repeated device, dark ground with one meaningful accent, and tokens-plus-tests as the mechanism that lets a live product change without re-skinning |

---

## Sources
CHI 2026 / Material 3 Expressive research: <https://doi.org/10.1145/3772318.3790373> ·
<https://design.google/library/expressive-material-design-google-research> ·
<https://m3.material.io/blog/building-with-m3-expressive>
NN/g: <https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/> ·
<https://www.nngroup.com/articles/flat-design/> ·
<https://www.nngroup.com/articles/hamburger-menus/> ·
<https://www.nngroup.com/articles/bottom-sheet/> ·
<https://www.nngroup.com/articles/liquid-glass/> ·
<https://www.nngroup.com/articles/animation-usability/> ·
<https://www.nngroup.com/articles/scroll-animations/> ·
<https://www.nngroup.com/articles/response-times-3-important-limits/>
Thumb zone and touch: <https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php> ·
<https://www.uxmatters.com/mt/archives/2014/09/insights-on-switching-centering-and-gestures-for-touchscreens.php> ·
<https://addyosmani.com/blog/touch-friendly-design/> ·
<https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/> ·
<https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf> ·
<https://arxiv.org/abs/2208.08734>
Bottom placement shipped: <https://9to5google.com/2025/06/24/chrome-bottom-address-bar-android/> ·
<https://www.androidpolice.com/google-makes-chromes-bottom-address-bar-official-android/> ·
<https://www.learnui.design/blog/ios-design-guidelines-templates.html>
Liquid Glass and Material 3 Expressive: <https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/> ·
<https://www.macrumors.com/how-to/ios-reduce-transparency-liquid-glass-effect/> ·
<https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/> ·
<https://www.androidcentral.com/apps-software/android-os/android-16-material-3-expressive-vs-ios-26-liquid-glass> ·
<https://www.androidfaithful.com/exclusive-inside-material-3-expressive-google-reveals-blur-toggle/>
React Native specifics: <https://docs.expo.dev/versions/latest/sdk/blur-view/> ·
<https://motionary.dev/blog/react-native-blur-background> ·
<https://shopify.github.io/react-native-skia/docs/backdrops-filters/> ·
<https://github.com/gorhom/react-native-bottom-sheet/issues/687> ·
<https://gorhom.dev/react-native-bottom-sheet/troubleshooting>
Motion, haptics, accessibility: <https://github.com/aldefy/compose-skill/blob/master/skills/compose-expert/references/material3-motion.md> ·
<https://developer.android.com/develop/ui/views/haptics/haptics-principles> ·
<https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html> ·
<https://web.dev/learn/accessibility/motion>
Category and AI aesthetic: <https://kylechayka.substack.com/p/the-generic-style-of-ai-web-design> ·
<https://blog.jim-nielsen.com/2026/ai-aesthetic/> ·
<https://www.925studios.co/blog/whoop-design-breakdown> ·
<https://mobbin.com/colors/brand/whoop> ·
<https://brandpalettes.com/strava-colors/> ·
<https://canvasbuilder.co/blog/fitness-website-design-trends-2026>
Counter-trend: <https://medium.com/design-bootcamp/ui-design-trend-2026-8-anti-design-maximalism-02296a9f0212> ·
<https://www.creativebloq.com/design/graphic-design/texture-warmth-and-tactile-rebellion-the-big-graphic-design-trends-for-2026> ·
<https://elements.envato.com/learn/ux-ui-design-trends> ·
<https://webflow.com/blog/neumorphism>

Contrast figures in this report were computed for this report (WCAG 2.x relative
luminance) and are not quoted from a source. They must be re-derived and asserted in
`src/styles/__tests__/theme.test.js` before any of them is adopted.
