# R4 — Mobile Accessibility Research: Current Authoritative Guidance for a Native Workout App

**Agent:** Research Agent R4
**Scope:** Disability-inclusion architecture campaign — accessibility guidance survey, workout-app-specific, for Volyume (React Native 0.81 / Expo SDK 54, iOS + Android).
**Method:** Research and citation only. No product recommendations, no implementation decisions. Every claim below is sourced with a URL; where a claim is this agent's synthesis rather than a direct quote, it is marked as such.
**Date:** 2026-08-20

---

## How to read this document

- Sections 1–6 are the topic findings, each with inline citations.
- Section 7 is a **PRACTICAL CHECKLIST** (criterion → source → concrete mobile check) for later app-audit use.
- Section 8 is the **RN LIMITS REGISTER** — documented gaps in React Native's accessibility API that constrain what any implementation can do.
- Section 9 is the **NEEDS LEGAL REVIEW REGISTER** — questions this research surfaced that are legal determinations, not engineering ones.

---

## 1. Standards baseline

### 1.1 WCAG 2.2 — success criteria most relevant to a native mobile workout app

**2.5.8 Target Size (Minimum) — Level AA, new in WCAG 2.2.**
Exact requirement: "The size of the target for pointer inputs is at least 24 by 24 CSS pixels", except where the target meets one of five exceptions: **Spacing** (a 24px-diameter circle centred on the target doesn't intersect another target), **Equivalent** (an alternative same-size control exists), **Inline** (target sits within a line of text), **User Agent** (size is controlled by the platform, not the app), or **Essential** (a specific presentation is legally required or essential to the information).
Intent: prevent accidental activation of adjacent controls by people with dexterity limitations.
Source: [Understanding SC 2.5.8, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

**2.5.5 Target Size (Enhanced) — Level AAA (not AA; cited for contrast).**
Requirement: targets at least 44 by 44 CSS pixels, same exception structure as 2.5.8. Not a WCAG AA obligation, but the same *number* (44) is what Apple's HIG independently sets as its minimum (see §2.1) — useful context: platform-native guidance for iOS already meets or exceeds the AAA bar, not just the AA bar.
Source: [Understanding SC 2.5.5, W3C WAI](https://w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)

**2.5.7 Dragging Movements — Level AA, new in WCAG 2.2.**
Exact requirement: "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging, unless dragging is essential or the functionality is determined by the user agent and not modified by the author."
Who it helps: people with tremor or limited dexterity, and people using a head pointer, eye-tracker, trackball, or switch, "for whom pressing, holding, and moving in one motion is hard."
Scope note: covers grab-and-move interactions specifically; 2.5.1 (below) covers path-based/multipoint gestures where direction/shape matters.
Source: [Understanding SC 2.5.7, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

**2.5.1 Pointer Gestures — Level A (WCAG 2.1, still in force in 2.2).**
Requirement: functionality operable via a multipoint or path-based (complex) gesture must also be operable via a single-pointer action without a path-based gesture, unless the gesture is essential (e.g. a signature). Acceptable single-pointer alternatives: single tap, double-tap, tap-and-hold.
2.2-specific tightening: the single-pointer alternative **cannot itself rely on dragging** — that would fail 2.5.7. So a swipe-to-delete gesture needs a single-pointer alternative that is not itself a drag (e.g. a visible button), not just "drag more slowly."
Source: [Understanding SC 2.5.1, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

**4.1.3 Status Messages — Level AA (WCAG 2.1, still in force).**
Requirement: status messages (success/failure of an action, waiting/loading state, progress, or existence of errors) must be programmatically determinable so assistive tech can announce them **without** the message needing to receive focus. Implementation pattern cited: ARIA `role="status"`/`role="alert"` or live-region marking (native mobile equivalent: Android `accessibilityLiveRegion`, iOS `announceForAccessibility` — see §3).
Source: [Understanding SC 4.1.3, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

**2.2.1 Timing Adjustable — Level A.**
If content imposes a time limit, the user must be able to turn it off, extend it (to at least 10× the default), or the timing must be essential. Directly implicates any timed rest-timer / workout-timer UI that auto-advances.
Source: search-synthesised from [Silktide's WCAG 2.2.1 guide](https://silktide.com/accessibility-guide/the-wcag-standard/2-2/enough-time/2-2-1-timing-adjustable/) and [NYU Accessibility Testing Standards SC 2.2.1](https://digitalaccessibility.nyu.edu/testing/sc221.html) — cross-check against the primary W3C Understanding doc before treating as final wording.

**2.2.6 Timeouts — Level AAA.** If inactivity could cause data loss (e.g. an unsaved set/workout in progress that could be discarded on a session timeout), users must be warned in advance with time to react, or be told the length of the inactivity period at the start. AAA, not an AA obligation, but directly on-point for an app where users log data mid-session.
Source: [Understanding SC 2.2.6, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html)

**2.4.11 Focus Not Obscured (Minimum) — Level AA, new in WCAG 2.2.**
When a component receives keyboard focus, author-created content (sticky headers/footers, non-modal dialogs) must not completely hide it. This SC is written for keyboard focus, so its direct mobile relevance is for external-keyboard and Switch Control users (Switch Control moves a visible focus cursor) rather than touch/VoiceOver-swipe users — flagged as a WCAG2Mobile interpretation question, not resolved by a primary source in this research pass.
Source: [Understanding SC 2.4.11, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

**1.3.3 Sensory Characteristics — Level A (WCAG 2.0, still in force).**
Exact requirement: "Instructions provided for understanding and operating content do not rely solely on sensory characteristics of components such as shape, colour, size, visual location, orientation, or sound."
Directly relevant to a workout timer that signals "rest over" **only** with a beep, or a set-completion cue that relies **only** on a colour change or a vibration pattern with no accompanying text/visual state.
Source: [Understanding SC 1.3.3, W3C](https://w3c.github.io/wcag21/understanding/sensory-characteristics.html)

**3.3.7 Redundant Entry — Level A, new in WCAG 2.2.**
Exact requirement: "Information previously entered by or provided to the user that is required to be entered again in the same process is either auto-populated or available for the user to select," except where re-entry is essential (e.g. security re-confirmation). Rationale given: repeated entry "increases cognitive load, takes more time, and increases the likelihood of errors," and is "especially problematic for users with cognitive disabilities or memory impairments."
Directly on-point for a workout app's set-logging flow (same weight/reps repeated across sets) and any multi-step onboarding/check-in flow that asks for the same data twice.
Source: search-synthesised, with primary text quoted from [AllAccessible's SC 3.3.7 guide](https://www.allaccessible.org/blog/wcag-337-redundant-entry-implementation-guide) and [Appt.org SC 3.3.7](https://appt.org/en/guidelines/wcag/success-criterion-3-3-7) — verify exact SC wording against [W3C TR WCAG 2.2](https://www.w3.org/TR/WCAG22/) before citing as final text in an audit.

### 1.2 What "WCAG for native mobile" formally means today — WCAG2Mobile status

- **WCAG2ICT** ("Guidance on Applying WCAG 2 to Non-Web Information and Communications Technologies") is a **published W3C Group Note** (October 2024) explaining how WCAG 2.0/2.1/2.2 success criteria apply to non-web software, including native mobile apps. It is organised to mirror WCAG's own Principle/Guideline/SC structure.
  Source: [WCAG2ICT Overview, W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/non-web-ict/)

- **WCAG2Mobile** ("Guidance on Applying WCAG 2.2 to Mobile Applications") is, as of this research date, a **W3C Group Draft Note**, published 6 May 2025, explicitly **not yet endorsed by W3C or its Members** and stated to be "work in progress that may be updated, replaced, or obsoleted." It narrows WCAG2ICT's scope specifically to mobile (native, mobile-web, and hybrid apps), and its stated intention is eventual publication as a Group Note, matching WCAG2ICT's status — i.e. **informative guidance, not a new set of testable success criteria.** It replaces web vocabulary ("web page" → "screen"/"view"; "set of web pages" → "set of screens").
  Confirmed directly from the document: "Group Draft Notes are not endorsed by W3C nor its Members." Coverage of touch/gesture-relevant SCs (2.5.1, 2.5.7, 2.5.8) exists but several other SC sections are explicitly marked **"Work In Progress"** with open GitHub issues, meaning the mobile interpretation of some criteria is not yet settled even in draft form.
  Source: [WCAG2Mobile Draft Note, 6 May 2025, W3C](https://www.w3.org/TR/2025/DNOTE-wcag2mobile-22-20250506/) — [live/latest editor's draft](https://w3c.github.io/matf/)

- **Practical implication:** there is no single ratified "WCAG for native apps" checklist as of this research date. The operative approach in the field is: apply WCAG 2.2 A/AA success criteria as interpreted through WCAG2ICT (settled Group Note) and WCAG2Mobile (draft, partially incomplete), cross-checked against each platform's own accessibility HIG/developer guidance (§2) — which is what EN 301 549 also does structurally (see below).

### 1.3 EN 301 549 / European Accessibility Act — applicability to a consumer app sold in the EU

**NEEDS LEGAL REVIEW** — flagged in full in §9. Summary of what the research surfaced:

- The EAA became legally applicable on **28 June 2025** to new products and newly-published digital services/content.
  Source: [Davis Wright Tremaine, "European Accessibility Act Goes Live"](https://www.dwt.com/insights/2025/07/european-accessibility-act-digital-products)

- **EN 301 549** is the harmonised technical standard used to demonstrate EAA compliance. It incorporates WCAG 2.1 Level AA for web (Chapter 9), and separately covers non-web documents (Chapter 10) and **non-web software — explicitly including native iOS, native Android, and cross-platform frameworks like React Native** (Chapter 11).
  Source: [Deque, "EN 301 549 | European standard for digital accessibility"](https://www.deque.com/en-301-549-compliance/); framework-naming detail from [Auditsu, "EN 301 549 Chapter 11"](https://auditsu.com/resources/en-301-549-chapter-11-mobile-apps) (secondary/support source — verify framework-naming claim against the EN 301 549 v4.1.1 text itself before relying on it).

- Chapter 11 requirements go **beyond** WCAG: cited additions include mandatory platform accessibility-API integration (UIAccessibility on iOS, AccessibilityNodeInfo-based APIs on Android), mandatory support of the OS-level font-size/Dynamic-Type setting, gesture-alternative and orientation-support requirements, and a non-biometric alternative wherever biometric authentication is offered.
  Source (secondary, support tier): [Auditsu, EN 301 549 Chapter 11](https://auditsu.com/resources/en-301-549-chapter-11-mobile-apps); [Abra, "Mobile App Accessibility under EN 301 549 v4.1.0"](https://abra.ai/blog/mobile-app-accessibility-en-301-549-v4-1-0). **These specific requirement claims should be verified against the EN 301 549 v4.1.1 primary text (ETSI) before being treated as binding** — this research pass relied on secondary compliance-vendor summaries for Chapter 11 detail, not the primary standard document itself.

- **Scope question (the crux of the legal-review flag):** EAA Annex I organises obligations by **service category** — it does not blanket-cover "all consumer apps." Categories include e-commerce services, consumer banking, e-books, transport-booking, electronic-communications, and audiovisual media, among others.
  Source: [EAA Annex I text, Norwegian government mirror of the Directive](https://www.regjeringen.no/contentassets/bf754def6200499da599368de05ec3df/annex-i-european-accessibility-act_accessible-l407065-l431785.pdf)

- The EAA's e-commerce category is defined broadly: "a service provided at a distance, through websites and mobile device-based services, by electronic means and at the individual request of a consumer, with a view to concluding a consumer contract." Multiple secondary legal-compliance sources state that **"ancillary e-commerce elements (like in-app purchases or paid upgrades) can bring [a platform] into scope"** even where the app's core function is not commerce.
  Source (secondary, support tier): [TestParty, "European Accessibility Act & E-commerce"](https://testparty.ai/blog/european-accessibility-act-ecommerce); consistent framing in [Bird & Bird's EAA guide for online retailers/platforms](https://www.twobirds.com/en/insights/2025/a-guide-to-navigating-the-european-accessibility-act-for-online-retailers-service-providers-and-plat)

- This directly touches Volyume's `pro_monthly`/`pro_annual` in-app subscription purchases (per `docs/rules/billing.md` and CLAUDE.md §1 Payments). Whether that in-app purchase flow constitutes "e-commerce services" under the EAA — and therefore pulls the whole app into EN 301 549 Chapter 9/11 scope — is a fact-specific legal determination this research cannot resolve. **See §9.**

---

## 2. Platform guidance

### 2.1 iOS (Apple)

**Note on sourcing:** Apple's `developer.apple.com/design/human-interface-guidelines/*` pages are JavaScript-rendered and did not yield fetchable body text via this session's tooling (repeated WebFetch attempts returned only page titles). Findings below are drawn from WebSearch result synthesis of those same authoritative URLs, cited to the primary Apple URL where the search tool attributed the claim to it; direct-quote confidence is lower than for the RN/Android sections below, which fetched cleanly. Recommend a follow-up pass with a JS-capable fetch for any claim used verbatim in the audit.

- **VoiceOver.** Apple's VoiceOver HIG page frames it as letting people "experience your app's interface without needing to see the screen," and states every interactive element needs a meaningful accessibility label; system components (UIKit/SwiftUI standard controls) provide labels automatically, custom controls do not.
  Source: [VoiceOver, Apple HIG](https://developer.apple.com/design/human-interface-guidelines/voiceover)

- **Minimum tappable size: 44×44 points.** Cited consistently as Apple's HIG minimum, roughly 9mm physically. HIG framing: this is a floor, not a target — "these are absolute minimums, not ideal sizes," with 56×56pt or larger cited as producing measurably lower error rates in practice. The tappable *hit area* can exceed the *visible* control size (equivalent to React Native's `hitSlop` — see §3).
  Source (secondary aggregation of the HIG figure): [DesignMonks, mobile button size guide](https://www.designmonks.co/blog/perfect-mobile-button-size); cross-referenced against Apple's own HIG Layout page title (`developer.apple.com/design/human-interface-guidelines/layout`), which independent secondary sources consistently attribute the 44×44pt figure to.

- **Switch Control.** Apple's HIG states Switch Control is "a powerful accessibility technology for users with very limited mobility," and Apple provides developer-facing best practices and dedicated APIs to improve the Switch Control experience (referenced WWDC session: WWDC20 "Explore accessibility APIs and switch control"). No further specific API detail was retrievable from this session's tooling for the HIG page itself — **follow-up needed** with a fetch-capable session to extract concrete Switch Control implementation requirements (e.g. grouping, custom actions honoured by Switch Control's scanning cursor) beyond what §3's RN accessibility-actions API already documents generically.
  Source: [Switch Control, Apple developer resources](https://developer.apple.com/design/human-interface-guidelines/controls) (indexed reference only — page body not retrieved this pass).

- **Dynamic Type.** "Dynamic Type is a feature that lets people choose the size of onscreen text… allowing your app or game to respond appropriately when people adjust text to a size that works for them." System fonts support Dynamic Type automatically, including dynamic optical sizing (interpolating weight/optical size continuously rather than in discrete steps). Apple's stated **minimum font size for iOS/iPadOS apps is 11pt**, with the explicit caveat that display pixel density, brightness, viewing distance, eyesight, and lighting all affect what's actually legible.
  Source: [Typography, Apple HIG](https://developers.apple.com/design/human-interface-guidelines/foundations/typography/) (search-attributed; note this URL uses "developers." not "developer." — flagged as a possible mirror rather than the canonical apple.com domain; verify against `developer.apple.com/design/human-interface-guidelines/typography` directly before citing in an audit).

- **Haptics.** `UINotificationFeedbackGenerator` is Apple's purpose-built API for "communicat[ing] successes, failures, and warnings" via three notification feedback types (success/warning/error). `CoreHaptics` is for more complex custom haptic sequences (transient + continuous events, varying sharpness/intensity, optional synchronised audio). Apple's stated guidance: "Be sure to use the system-defined haptics consistently in your app so that you don't confuse people," pointing to a dedicated "Playing haptics" HIG document (not retrieved this pass — **follow-up needed**). Practical accessibility note surfaced independently: haptic feedback should **complement, not replace,** visual/audio feedback, and apps should respect the user's OS-level haptics setting (Settings → Sounds & Haptics).
  Source: [UINotificationFeedbackGenerator, Apple Developer Documentation](https://developer.apple.com/documentation/uikit/uinotificationfeedbackgenerator)

- **Reduced Motion.** When the Reduce Motion setting is on, apps "should minimize or eliminate animations" and should "play tightened animations." Apple specifically calls out oscillating motion — "especially with large amplitudes and frequencies around 0.2 Hz (one oscillation every five seconds)" — as the most problematic pattern. Guidance is explicit that animation must never be the *sole* means of communicating important information, and that for **custom** animations (i.e. anything outside system-provided transitions) the app itself is responsible for detecting and honouring the setting — there's no automatic pass-through. React Native's cross-platform tie-in: `AccessibilityInfo.isReduceMotionEnabled()` (see §3).
  Source: [Motion, Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion) (search-attributed synthesis).

- **Touch Accommodations (motor-access relevant to rapid/repeated tapping).** Two specific mechanisms directly relevant to fast-paced set-logging UI: **Hold Duration** (a touch must be held for a configurable minimum time — default onset above 0.3s shows a circular timer — before it registers, meaning brief accidental taps are ignored) and **Ignore Repeat** (multiple rapid taps within a configurable window collapse into a single registered tap). Both are user-configured OS settings an app cannot see or override directly, but they mean **an app must not assume every "tap" event corresponds to a single deliberate user action at the OS event-timing level** — rapid double/triple-tap counters (e.g. a rep counter incrementing per raw tap event) can be defeated or altered by a user's own accessibility settings.
  Source: [Apple Support, "Use Touch Accommodations"](https://support.apple.com/en-us/102222)

- **Reachability.** iPhone's Reachability feature (double-tap Home on Home-button devices; swipe down on the bottom edge on Face ID devices) slides on-screen content to the lower half of the display for one-handed thumb reach in portrait orientation only. Apple frames this as helping "people with smaller hands… or those who experience difficulty with mobility or dexterity." This is an **OS-level, not app-level, mechanism** — an app cannot invoke it, but an app's own layout (e.g. primary actions placed at the very top of a tall screen) can work against it if critical controls sit above where Reachability would bring content down to.
  Source: [Apple Support, "Reach the top of the iPhone screen with one hand"](https://support.apple.com/guide/iphone/use-reachability-iph145eba8e9/ios)

### 2.2 Android (Google)

**Note on sourcing:** Android/Google developer documentation fetched cleanly via WebFetch — quotes below are verbatim from the primary source pages.

- **TalkBack + touch target size.** Direct quote from Android's own developer guide: *"For touch interfaces, we recommend that each interactive UI element have a focusable area, or touch target size, of at least 48dp×48dp. Larger is even better."* Preferred implementation is `android:minWidth`/`android:minHeight` (Views) or `Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)` (Compose); Material components (`Button`, `IconButton`, `ListItem`) already enforce this. A 48×48dp target is stated to equal **~9mm physically, regardless of screen density**, tied to ergonomic research citing a 7–10mm recommended range for touchscreen targets. Google's separate accessibility-help documentation adds a recommended **8dp minimum spacing** between adjacent touch targets.
  Source: [Make apps more accessible, Android Developers](https://developer.android.com/guide/topics/ui/accessibility/apps); [Touch target size, Android Accessibility Help](https://support.google.com/accessibility/android/answer/7101858?hl=en)

- **Content descriptions.** Direct quote: *"For each UI element in your app, include a description that describes the element's purpose. In most cases, you include this description in the element's `contentDescription` attribute."* Guidance: describe purpose/result, not visual appearance; avoid redundant type-naming (use "Submit," not "Submit button" — the role is announced separately); each list item needs a **unique** description reflecting its specific content; purely decorative elements should be explicitly hidden from the accessibility tree (`hideFromAccessibility`); plain `Text` composables don't need an explicit description (auto-announced).
  Source: [Make apps more accessible, Android Developers](https://developer.android.com/guide/topics/ui/accessibility/apps)

- **Colour contrast.** Direct quote: *"If the text is smaller than 18sp, or if the text is bold and smaller than 14sp, use foreground and background colors that result in a color contrast ratio of at least 4.5:1. For all other text, set the color contrast ratio to at least 3:1."* Google's own **Accessibility Scanner** app is the recommended verification tool.
  Source: [Make apps more accessible, Android Developers](https://developer.android.com/guide/topics/ui/accessibility/apps)

- **Role semantics.** Android guidance directs use of the `Role` semantics property (`Role.Button`, `Role.Switch`, etc.) so screen readers announce a control's type correctly — the Compose/Android analogue of React Native's `accessibilityRole` (see §3).
  Source: [Make apps more accessible, Android Developers](https://developer.android.com/guide/topics/ui/accessibility/apps)

- **Custom actions.** Android represents interactivity as a set of discrete actions attached to a node (`ACTION_CLICK`, `ACTION_LONG_CLICK`, `ACTION_SCROLL_FORWARD`, `ACTION_SET_TEXT`, `ACTION_FOCUS`, plus arbitrary custom actions via `AccessibilityNodeInfo.AccessibilityAction`). Specific TalkBack UX mechanism: *"TalkBack surfaces the custom actions via the 'actions' rotor — the user swipes up with one finger and hears each custom action by name."*
  Source: [AccessibilityNodeInfo.AccessibilityAction reference](https://emanual.github.io/Android-docs/reference/android/view/accessibility/AccessibilityNodeInfo.AccessibilityAction.html) (mirror of the official Android SDK reference) — cross-check against `developer.android.com/reference/android/view/accessibility/AccessibilityNodeInfo.AccessibilityAction` directly before final citation.

- **Live regions.** Direct definition: *"A live region is a node that contains information that is important for the user and when it changes the user should be notified."* Worked example given: an "incorrect password" notification `TextView` should be marked `ACCESSIBILITY_LIVE_REGION_POLITE`. `ACCESSIBILITY_LIVE_REGION_POLITE` is described as suitable for "prominent updates within app content that don't require the user's immediate attention" — i.e. it queues rather than interrupts. (An `ASSERTIVE` mode also exists for interrupting, higher-urgency updates — implied by the polite/assertive pairing consistently documented across Android a11y APIs; not independently re-quoted this pass.)
  Source: search-synthesised from Android developer reference material; primary reference is [AccessibilityNodeInfo, Android Developers](https://developer.android.com/reference/android/view/accessibility/AccessibilityNodeInfo).

- **Reduced motion / "Remove animations."** Android's setting is named **"Remove animations"** (location varies by OEM skin: Display, Visibility enhancements, or under Android 13+'s "Color and motion" accessibility category). It "removes system animations as you move around the operating system" and affects Animator-based animations app-wide. Jetpack Compose's animation APIs have followed this OS setting automatically since Compose 1.2.0 — a materially different (more automatic) story than iOS, where custom animations require the app to explicitly check `isReduceMotionEnabled` itself (§2.1).
  Source (secondary/support tier — not an official Android Developers page): [Eevis Panula, "Android, Animations and Reduced Motion"](https://eevis.codes/blog/2022-12-12/android-animations-and-reduced-motion/); [Kent State Equal Access, "Android Accessibility Part 3: Reduced Motion"](https://www.kent.edu/equalaccess/news/android-accessibility-part-3-4-reduced-motion). **This entire finding is sourced from developer-community/university-accessibility-office writeups, not an official Android Developers URL — flag for verification against `developer.android.com` before citing as authoritative platform guidance in the audit.**

- **Haptics.** Android's `HapticFeedbackConstants` (used via `View.performHapticFeedback()`) is explicitly action-based rather than effect-based — *"these constants will have fallback behavior if necessary"* and using them "does not require any special permissions." Design guidance: pick the constant matching the semantic event (e.g. `KEYBOARD_PRESS`, `LONG_PRESS`) rather than picking a raw vibration effect, for consistency across devices with different haptic hardware.
  Source: [HapticFeedbackConstants, Android Developers API reference](https://developer.android.com/reference/android/view/HapticFeedbackConstants); design framing from [Haptics design principles, Android Developers](https://developer.android.com/develop/ui/views/haptics/haptics-principles)

- **Switch Access (Android's Switch Control equivalent).** Described as "a system accessibility service that helps people who have motor disabilities, highlights interactive elements, and performs actions in response to the user pressing a button," operable with one or two external switches. App-compatibility requirement stated directly: *"views that are clickable should be selectable and reachable by a keyboard, and views that require gestures can also be properly navigated to without using the required gesture"* — i.e. the same gesture-alternative requirement as WCAG 2.5.1, restated as an Android platform obligation.
  Source: [Set up switch access for Android, Android Accessibility Help](https://support.google.com/accessibility/android/answer/6301490?hl=en-GB); compatibility-requirement quote from [Riggaroo, "Making your app Switch Access Compatible"](https://riggaroo.dev/android-accessibility-switch-access/) (secondary, support tier — cross-check against `developer.android.com/guide/topics/ui/accessibility/principles` for the primary-source version of this requirement).

- **One-handed mode.** Android 12+ (AOSP-native, so available across compliant OEM builds, not just Pixel) added a system one-handed mode ("Pull screen into reach") that shrinks/lowers on-screen content to ~40% for thumb reach, following years of OEM-specific implementations (Samsung since 2012, later Xiaomi/Huawei). Same app-level implication as iOS Reachability: this is OS-level and outside app control, but rewards layouts that don't force critical controls to the very top of a tall screen.
  Source (secondary/support tier — no official Android Developers URL retrieved for this specific feature): [XDA Developers, "Android 12 One-Handed Mode"](https://www.xda-developers.com/android-12-one-handed-mode-leak/); [Google Accessibility Help, "Use one-handed mode"](https://support.google.com/accessibility/android/answer/12652418?hl=en) — this second URL is the stronger citation (Google's own support docs) and should be preferred if this claim is used in the audit.

- **Material Design 3 touch targets.** M3 states a **48×48dp minimum** touch target (consistent with the Android platform guidance above, not a separate/conflicting number), with the visual element allowed to be smaller than the touch target as long as padding fills the gap, and **8dp minimum / 16dp-or-more recommended spacing** between frequently-used adjacent controls.
  Source: [Material Design 3, Accessibility designing/structure](https://m3.material.io/foundations/designing/structure) (search-attributed synthesis).

### 2.3 Gesture-only interactions and alternatives — cross-platform synthesis

Both platforms' own guidance converges with WCAG 2.5.1/2.5.7 on one principle, stated independently by each: **any interaction that depends on a specific gesture shape (swipe, drag, multi-finger) must have a non-gesture, single-pointer (tap/button) alternative**, unless the gesture is essential to the task itself (e.g. capturing a literal signature). This was found stated as an explicit Android app-compatibility requirement for Switch Access (§2.2, "views that require gestures can also be properly navigated to without using the required gesture") and is the same requirement WCAG 2.5.1 codifies at the standards level (§1.1). No equivalent explicit single-sentence statement was retrieved from an Apple primary source this pass for iOS Switch Control specifically — Apple's position is inferred from the general Switch Control HIG framing (§2.1) plus the shared WCAG baseline, not independently confirmed in Apple's own words. **Flagged for a follow-up fetch pass** if this exact claim needs a primary Apple citation.

---

## 3. React Native reality — API surface, cross-platform support, documented gaps

*All quotes in this section are verbatim from the official React Native documentation, fetched directly this pass: [reactnative.dev/docs/accessibility](https://reactnative.dev/docs/accessibility) and [reactnative.dev/docs/accessibilityinfo](https://reactnative.dev/docs/accessibilityinfo).*

### 3.1 Core props (both platforms unless noted)

| Prop | Platform | Notes (quoted/paraphrased from RN docs) |
|---|---|---|
| `accessible` | Both | Marks a view as a single accessibility element. Maps to native `focusable` (Android) / `isAccessibilityElement` (iOS). "By default, all touchable elements are accessible." |
| `accessibilityLabel` | Both | Screen-reader-verbalised string. If omitted on a Touchable, it's built by concatenating child `Text` nodes. |
| `accessibilityHint` | Both, **behaviour differs** | iOS: VoiceOver reads it after the label, *only if the user has hints enabled in VoiceOver settings*. Android: TalkBack reads it after the label, and **"hints cannot be turned off on Android"** at time of writing — an asymmetry worth knowing before writing hint copy, since Android users cannot opt out of hearing it. |
| `accessibilityRole` | Both | Enum incl. `adjustable`, `alert`, `button`, `checkbox`, `header`, `image`, `link`, `progressbar`, `radio`, `switch`, `tab`, `timer`, etc. |
| `role` (ARIA-aligned) | Both | Newer, W3C-role-aligned alternative to `accessibilityRole`; **takes precedence over `accessibilityRole` if both are set.** |
| `accessibilityState` | Both | Object: `disabled`, `selected`, `checked` (bool or `'mixed'`), `busy`, `expanded`. |
| `accessibilityValue` | Both | Object: `min`/`max`/`now` (for ranges/progress), or `text` (overrides the numeric fields if set) — this is the mechanism for exposing a rep counter's or progress bar's current value to a screen reader. |
| `accessibilityActions` + `onAccessibilityAction` | Both, some action names platform-specific | Programmatic custom actions. Standard names: `magicTap`/`escape` (iOS only), `activate`, `increment`, `decrement`, `longpress`/`expand`/`collapse` (Android only). |
| `accessibilityLiveRegion` | **Android only** | Values `none`/`polite`/`assertive`. "polite": announce without interrupting. "assertive": interrupt ongoing speech immediately. **No iOS equivalent prop** — see §3.2/§8. |
| `aria-live` | **Android only** | ARIA-aligned equivalent of the above (`off`/`polite`/`assertive`). Same iOS gap applies. |
| `accessibilityViewIsModal` / `aria-modal` | **iOS only** | Tells VoiceOver to ignore sibling views outside the marked subtree — the mechanism for making a modal properly trap VoiceOver focus. **No documented Android equivalent prop** on this page — see §8. |
| `accessibilityElementsHidden` | **iOS only** | Hides an element and its descendants from the accessibility tree. RN docs explicitly note it is "similar to the Android property `importantForAccessibility="no-hide-descendants"`" — i.e. the two platforms need two *different* props to achieve the same hiding effect. |
| `importantForAccessibility` | **Android only** | Values `auto`/`yes`/`no`/`no-hide-descendants`. |
| `aria-hidden` | Both | Cross-platform alternative that (per the docs' own cross-reference) achieves what `accessibilityElementsHidden` (iOS) and `importantForAccessibility="no-hide-descendants"` (Android) each separately achieve. |
| `accessibilityLanguage` | **iOS only** | BCP-47 language tag for the element's spoken label/value/hint — useful for mixed-language content (e.g. exercise names in another language) but has no documented Android counterpart. |
| `accessibilityIgnoresInvertColors` | **iOS only** | Excludes a view from Smart Invert. |
| `accessibilityShowsLargeContentViewer` / `accessibilityLargeContentTitle` | **iOS only**, iOS 13+ | Long-press large content viewer for small icon-only controls. |
| `onAccessibilityEscape` | **iOS only** | Fires on VoiceOver's two-finger "Z" escape gesture; should navigate back. Falls through the view hierarchy if unhandled, or "bonks" if nothing handles it. |
| `onMagicTap` | **iOS only** | Fires on VoiceOver's two-finger double-tap; "should perform the most relevant action a user could take on a component." |
| `sendAccessibilityEvent` (Android only, imperative) | **Android only** | Direct `UIManager` call to fire `typeWindowStateChanged`/`typeViewFocused`/`typeViewClicked` events. |
| `experimental_accessibilityOrder` | Both, **explicitly experimental** | Array of `nativeID`s defining explicit AT focus order. RN's own docs warning, quoted verbatim: **"This API is experimental. Experimental APIs may contain bugs and are likely to change in a future version of React Native. Don't use them in production."** |

### 3.2 `AccessibilityInfo` — state queries and events

Verbatim/near-verbatim from the official docs:

- **Cross-platform:** `isScreenReaderEnabled()`, `isReduceMotionEnabled()` (on Android this also reflects the Developer Options "Transition Animation Scale = Animation off" setting), `announceForAccessibility(string)`, `sendAccessibilityEvent()`, the `screenReaderChanged` and `reduceMotionChanged` events.
- **iOS only:** `isBoldTextEnabled()`, `isGrayscaleEnabled()`, `isInvertColorsEnabled()`, `isReduceTransparencyEnabled()`, `isDarkerSystemColorsEnabled()`, `prefersCrossFadeTransitions()`, `announceForAccessibilityWithOptions(text, {queue})`, and the `announcementFinished`/`boldTextChanged`/`grayscaleChanged`/`invertColorsChanged`/`reduceTransparencyChanged` events.
- **Android only:** `isHighTextContrastEnabled()`, `isAccessibilityServiceEnabled()` (any AT service, not just TalkBack — docs explicitly say prefer `isScreenReaderEnabled()` if TalkBack specifically is what you mean), `getRecommendedTimeoutMillis(originalTimeout)` (reads the OS "Time to take action" accessibility setting — the direct native mechanism for honouring WCAG 2.2.1/2.2.6-style extended-timeout requirements on Android, with **no documented iOS equivalent API**), and the `accessibilityServiceChanged` event.
- **`setAccessibilityFocus(reactTag)` is documented as deprecated**, in favour of `sendAccessibilityEvent(host, 'focus')`. A caveat is given: "Ensure any View receiving accessibility focus has `accessible={true}`."

### 3.3 Testing instructions given in the official docs

- TalkBack is **not installed by default on Android emulators** — must be installed from Play Store on the emulator image.
- VoiceOver is **not available on the iOS Simulator at all**; RN's own docs recommend Xcode's Accessibility Inspector (driving macOS VoiceOver) as a *fallback*, with an explicit caveat: "it's always best to test with a device as macOS's VoiceOver may result in varied experiences." This directly supports CLAUDE.md's existing "testing on device, no simulator" rule for a different reason than build tooling — VoiceOver testing specifically cannot be done credibly on a simulator even where a simulator otherwise exists.
  Source: [Accessibility, React Native docs](https://reactnative.dev/docs/accessibility)

### 3.4 Documented RN accessibility gaps (community/issue-tracker evidence — not official "known limitations" docs, but consistent, reproducible, filed issues)

- **`accessibilityLiveRegion` genuinely has no iOS mechanism at the OS level** — not just an RN gap. Direct quote reasoning from the RN issue tracker discussion: *"On iOS there is no concept of live regions at a system level, so to support this we'd need to detect when content changes on any element… and make a manual announcement."* The documented workaround is manual: call `AccessibilityInfo.announceForAccessibility()`/`announceForAccessibilityWithOptions()` yourself when the equivalent Android live-region content changes.
  Source: [facebook/react-native#34735, "Android/iOS Accessible Live Regions"](https://github.com/react/react-native/issues/34735)

- **FlatList VoiceOver focus order is platform-inconsistent.** On iOS, VoiceOver focus can go to the first item in the underlying data array even if it's not the first *visible* item (an off-screen/virtualised item); Android instead focuses the first visible item. Documented separately: **inverted FlatLists swap the accessibility traversal direction**, and **it is "not currently possible to swipe to the next item in a FlatList using VoiceOver if that item is off screen"** (i.e. virtualisation and VoiceOver's linear swipe navigation actively conflict). Android-side: FlatList/SectionList/VirtualizedList/ScrollView do **not** support the "Position in Collection" accessibility metadata TalkBack would otherwise use to announce "In list, N items" / "Showing items X to Y of Z."
  Sources: [facebook/react-native#37720, "iOS has a different Flatlist focus order than Android"](https://github.com/react/react-native/issues/37720); [react/react-native#30373, "Inverted FlatList accessibility order"](https://github.com/react/react-native/issues/30373); [facebook/react-native#30977, "Position in Collection not supported"](https://github.com/facebook/react-native/issues/30977)
  **Direct relevance to Volyume:** exercise-library lists, set-logging lists, and workout-history lists are all FlatList-shaped; a long virtualised list (e.g. exercise picker) is exactly the scenario this gap bites hardest.

- **Modal focus management is a recurring, multi-issue problem, concentrated on iOS.** Distinct, separately-filed issues: (a) opening a modal does not move VoiceOver focus *into* the modal, so a VoiceOver user "may [be] potentially unaware that there even is a modal"; (b) closing a modal does not restore focus to the element that triggered it — instead "focus shift[s] back to the first element of the screen instead of the button that triggered the modal" on iOS (documented as working correctly on Android in the same issue); (c) a related backdrop-touch issue where `pointerEvents="box-none"` "does not consistently allow VoiceOver activation of sibling Touchable backdrop element." RN's own docs provide `accessibilityViewIsModal` (iOS) as the tool to trap focus *within* an open modal, but **entry-focus and exit-focus-restoration are not automatic** and are left to the app to implement manually — a pattern description, not a bug in the trapping prop itself.
  Sources: [facebook/react-native#30644](https://github.com/facebook/react-native/issues/30644); [callstack/react-native-paper#3912](https://github.com/callstack/react-native-paper/issues/3912); [react/react-native#45098, "VoiceOver: Focus Returns to First Element Instead of Trigger Button After Closing Modal on iOS"](https://github.com/react/react-native/issues/45098); [react/react-native#32759](https://github.com/react/react-native/issues/32759)

- **`experimental_accessibilityOrder` is explicitly not production-ready** per RN's own docs (§3.1) — so the one first-party mechanism for fixing arbitrary custom focus order cannot currently be relied on for a shipping app; manual workarounds (e.g. restructuring component order, imperative focus calls) remain the only supported path.

### 3.5 Expo-specific notes

- Expo itself does not appear to publish a distinct accessibility guidance document beyond React Native's own — Expo's managed workflow exposes the same `accessible*`/`aria-*` prop surface documented in §3.1–3.2, since Expo apps are React Native apps.
- **`expo-haptics`**, the SDK module Volyume would use for `Core Haptics`/`UINotificationFeedbackGenerator`-equivalent effects (per CLAUDE.md's architecture notes on `modules/rest-timer-live` and `modules/live-activity`), documents specific **conditions under which iOS haptics silently do nothing**: *"the Taptic engine will do nothing if Low Power Mode is enabled, if the user disabled the Taptic Engine in settings, if iOS Camera is active, or if iOS dictation is active."* This is a real failure mode for a haptic-only cue (e.g. a rest-timer-complete buzz) — if it's the *only* signal for an event, Low Power Mode alone can silently remove it, independent of any accessibility setting.
  Source: [Haptics, Expo Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/)
- **`expo-video` subtitle support has a documented, currently-open platform gap:** an Expo GitHub issue reports *"Subtitle settings in player are not available on Android"* for `expo-video`'s in-player subtitle-track UI, i.e. the subtitle-track-selection surface itself is iOS-only/incomplete on Android as filed. `expo-av`'s older `Video` component's subtitle path is documented as dependent on the video already being packaged as an HLS stream with embedded subtitle tracks — there is no documented simple "pass a caption file" API in either module as surveyed this pass.
  Sources: [expo/expo#31802, "Subtitle settings in player are not available on Android"](https://github.com/expo/expo/issues/31802); [expo-video docs, Expo Documentation](https://docs.expo.dev/versions/latest/sdk/video/)

---

## 4. Workout-context patterns

*Framing note: the brief asks for "documented guidance/examples, not invention." Several of the findings below are this agent's synthesis of general (non-fitness-specific) accessibility pattern guidance applied to a workout context — none of the sources found were fitness-app-specific accessibility case studies. Flagged inline where synthesis, not direct precedent, is being reported.*

### 4.1 Accessible timers (rest timers, workout timers)

- No fitness-specific source was found. The closest documented pattern is the general **ARIA "timer" pattern / countdown-announcement discipline**, which — while written for web ARIA — states principles that map directly onto RN's `accessibilityRole="timer"` + `accessibilityLiveRegion`/`announceForAccessibility` combination (§3):
  - **Do not announce every second-tick** — described as creating "too much noise and distraction."
  - Announce at **meaningful intervals** (e.g. 5 minutes / 1 minute / 30 seconds remaining), and in the final stretch, more frequently.
  - For urgent end-of-timer moments specifically, use an **interrupting/assertive** announcement channel (RN: Android `accessibilityLiveRegion="assertive"`; iOS: `announceForAccessibilityWithOptions` without `queue: true`, since default behaviour already interrupts).
  - A cited numeric floor: announcements should be **spaced at least 15 seconds apart**, "to give the screen reader enough time to announce the new value, even on the slowest screen reader speech rate, in any language" — i.e. don't just throttle to avoid annoyance, throttle because faster updates can be genuinely unintelligible at slow speech rates.
  Source (web ARIA pattern, applied here to native by analogy — not a native-specific source): [Number Analytics, "The Ultimate Role=Timer Guide"](https://www.numberanalytics.com/blog/ultimate-role-timer-guide-accessible-design"); interval/spacing figures from [DigitalA11y, "Addressing Timeout Modals"](https://www.digitala11y.com/addressing-timeout-modals-navigating-the-nuances-for-inclusive-web-design/) and [eBay's accessibility pattern library, "time"](https://opensource.ebay.com/evo-web/accessibility/patterns/time) — the eBay source is a real production design-system pattern doc, i.e. evidence of practice rather than pure theory, though again web- not native-specific.

- **Direct standards tie-in:** a rest-timer or workout-timer that signals completion via **audio tone only** fails WCAG 1.3.3 (Sensory Characteristics — §1.1) if no visual/haptic equivalent exists, and a rest-timer that **auto-advances the workout** without a way to pause/extend it implicates WCAG 2.2.1 Timing Adjustable (§1.1). This is this agent's application of the general SC text to the specific workout-timer case, not a found source discussing rest timers by name.

- **Visual + haptic alternatives to audio cues:** no fitness-specific source found. The general principle (multiple redundant channels for the same event, per WCAG 1.3.3/1.4.2 in §1.1 and §6) applies directly: a rest-timer-complete event should be expressible as sound **and** a haptic pulse (`expo-haptics`, with the Low-Power-Mode caveat noted in §3.5) **and** a visible state change (colour/text/icon) — with **screen-reader announcement** as the fourth channel for a VoiceOver/TalkBack user who may not perceive haptics or colour changes at all.

### 4.2 Rapid repeated data entry (set logging) with assistive technology

- **WCAG 3.3.7 Redundant Entry (§1.1)** is the most directly on-point standard: a set-logging flow that asks for weight/reps on set 2 having already captured the same weight on set 1 should offer to auto-populate or reuse the prior value, not force blind re-entry — described in the standard's own rationale as reducing "cognitive load," time, and error rate, "especially problematic for users with cognitive disabilities or memory impairments."
- **The VoiceOver "adjustable" trait pattern** (Deque, applied to stepper-style increment/decrement controls, directly relevant to a weight/rep stepper): the documented failure mode of a naive two-button (+/−) stepper is that *"[the] fundamental issue is information separation… a user navigating with gestures only hears 'increment' or 'decrement' without learning the actual numeric value, requiring them to mentally track counts."* The documented fix is to **wrap the label and the stepper into a single accessible element** using `accessibilityRole="adjustable"` (RN's direct equivalent) with `accessibilityValue` carrying the current number, so that VoiceOver's up/down swipe gestures adjust the value *and* announce the new value together, rather than exposing separate unlabelled +/− buttons.
  Source: [Deque, "How to Implement UI Adjustable Trait Design Pattern For Accessibility"](https://www.deque.com/blog/implement-ui-adjustable-trait-design-pattern/)
- **Tap-rate-defeating OS settings (§2.1) are a real constraint on rep-counter UI specifically:** iOS Touch Accommodations' "Ignore Repeat" setting can collapse a user's rapid sequence of taps (e.g. tapping "+1 rep" five times quickly) into fewer registered events than intended, and "Hold Duration" can delay registration of any tap altogether. A rep/set counter relying on raw tap-event counting without accounting for this is a documented (if user-configured, not code-level) source of miscounts for motor-impaired users. **This is this agent's applied synthesis** of the Apple Touch Accommodations documentation (§2.1) to the specific rep-counter case — no source discusses rep counters by name.

### 4.3 One-handed operation and reachability

Covered platform-mechanism detail is in §2.1 (iOS Reachability) and §2.2 (Android one-handed mode). Both are **OS-level, not app-level** features an app cannot invoke or detect, meaning the only app-side lever is layout: avoiding placement of frequently-used primary actions (e.g. "log set," "finish workout") at the very top edge of the screen where neither platform's reach-assist feature would bring them within thumb range on a large device held one-handed. No source found stating this as an explicit fitness-app design rule — flagged as this agent's inference from the platform mechanics, not a found recommendation.

### 4.4 Tremor/dexterity-friendly controls: target size, spacing, confirmation vs instant action

- Target size and spacing are covered fully in §1.1 (WCAG 2.5.8/2.5.5) and §2.1/§2.2 (44pt iOS / 48dp Android, 8dp+ spacing).
- **Confirmation vs instant action** is addressed by the **W3C COGA "reversibility" pattern** (§5) rather than a motor-specific source: *"Let Users Go Back"* — allow undo and backward navigation — is the documented general mitigation for accidental activation, which serves both cognitive-disability users (who may act on content they later realise they misunderstood) and motor-impaired/tremor users (who may activate a control unintentionally). No workout-specific source discusses whether a "delete set" or "finish workout early" action should be instant vs confirmed vs undoable — **this is a product-design decision the research surfaces standards support for, not a documented workout-app precedent.**

### 4.5 Alternatives to drag-and-drop reordering and long-press menus

- Directly on-point, general (non-fitness) UX pattern guidance, consistent with the WCAG 2.5.7 requirement (§1.1) that drag-based reordering (e.g. reordering exercises within a workout plan) needs a non-drag path:
  - **"Move up"/"Move down" buttons** next to each list item — usable via a single tap, "no dragging needed."
  - **"Move to position" input** (numeric or dropdown) for longer lists, avoiding repeated single-step taps.
  - **Select-then-"Move to" button** pattern: select one or more items first, then a dedicated action bar/button moves the whole selection — described as "especially [good for] narrow mobile screens."
  - Explicit design-philosophy framing found: *"If you do add drag and drop to mobile, also give another way to do the same task, for example, let users choose to drag and drop or use a menu to move an element on the list"* — i.e. keep drag-and-drop as an option, but never as the only option.
  Source: synthesised across [Microsoft Mobile Engineering, "Accessible Reordering For Touch Devices"](https://medium.com/microsoft-mobile-engineering/accessible-reordering-for-touch-devices-e7f7a7ef404) and [AllAccessible, "WCAG 2.5.7 Dragging Movements Implementation Guide"](https://www.allaccessible.org/blog/wcag-257-dragging-movements-implementation-guide)
- **Long-press menus** (e.g. long-press an exercise card for a context menu) are a form of gesture the user must discover and perform correctly; the same WCAG 2.5.1/2.5.7 principle applies — a visible, always-available alternative (e.g. a persistent "⋯" overflow-menu button) should expose the same actions without requiring the long-press gesture at all. No source specifically discussed long-press menus as distinct from drag-and-drop; this is the same underlying standard (§1.1) applied by this agent to that second interaction pattern named in the brief.

### 4.6 Accessible charts (progress graphs, volume charts)

- **WCAG 1.1.1-derived guidance** (text alternatives for non-text content) is the standards anchor; for charts specifically, the documented two-tier pattern is: **(1)** a short text summary/alt description of the key takeaway, plus **(2)** for anything non-trivial, an accompanying **structured data table** (proper header cells/captions) that assistive tech can read row-by-row, rather than relying on the visual chart alone. Quoted framing: *"Simple visuals can use short alt text, while complex ones benefit from a brief summary and a well-structured data table."*
  Source: [The A11Y Collective, "The Ultimate Checklist for Accessible Data Visualisations"](https://www.a11y-collective.com/blog/accessible-charts/); [216digital, "Creating Accessible Data for Charts and Graphs"](https://216digital.com/creating-accessible-data-for-charts-and-graphs/)
- **Sonification** was named explicitly in only one non-fitness source as one option among several ("brief text descriptions… detailed data tables… potentially sonification or interactive exploration for complex datasets") with no concrete implementation guidance or native-mobile example found this pass — treat as a named-but-undeveloped option, not a documented pattern with a reference implementation.
  Source: [DubBot, "Beyond the Chart: A Guide to Accessible Data Visualization"](https://dubbot.com/dubblog/2024/charts-graphs.html)
- **RN-specific chart-library accessibility is thin and inconsistent.** Victory (the web/RN charting library family, includes Victory Native) documents `desc`/`title` props specifically "to assist with accessibility for screen readers," but has an **open, unresolved issue** where setting `role="img"` on the underlying SVG cannot be overridden, constraining how much a screen reader will actually expose about the chart's contents beyond the title/desc text. No accessibility documentation was found for `react-native-svg-charts`.
  Sources: [FormidableLabs/victory#1606, "Screenreader to announce contents of charts and usability bug with aria-title"](https://github.com/FormidableLabs/victory/issues/1606); general library survey via [LogRocket, "top React Native chart libraries"](https://blog.logrocket.com/top-react-native-chart-libraries/) — **practical implication for an audit: whatever RN chart library Volyume uses for progress graphs, its screen-reader behaviour should be tested directly rather than assumed from the library's marketing docs, since even a library that documents an a11y prop (Victory) has an open unresolved a11y bug.**

---

## 5. Cognitive accessibility

### 5.1 W3C COGA "Making Content Usable" — key patterns

Direct section/pattern-number quotes and paraphrases fetched from the primary source, [W3C TR, "Making Content Usable for People with Cognitive and Learning Disabilities" — Design Guide](https://www.w3.org/TR/coga-usable/design_guide.html):

- **4.2.1 (Purpose Clarity):** *"Help the user know the purpose of the content. Use a clear title or heading that summarizes the purpose of a page [screen]."*
- **4.3.3 (Page/screen structure):** organise content into logical sections with clear visual separation (dividing lines, whitespace, background-colour differentiation between regions).
- **4.6 (Help Users Focus):** an entire objective grouping around limiting interruptions, keeping critical paths short, avoiding excess content, and giving task-preparation information up front. Sub-pattern **4.6.2 (Short Critical Paths)** specifically: streamline processes to minimise the number of steps to complete a task.
- **4.4.5 (Succinct Text):** *"Keep paragraphs short. Have only one topic in each paragraph,"* preferring bulleted/numbered lists.
- **4.4.10 (White Spacing):** *"Put white space around objects and text… so that each section is clearly separated,"* to reduce visual clutter.
- **4.5.2 (Reversibility):** *"Let Users Go Back"* — undo and backward navigation, directly relevant to the confirmation-vs-instant-action question raised in §4.4.
- **4.5.4 (Form Design):** prevent mistakes through clear labelling and validation.
- **4.7 (Memory Independence)** and **4.7.5 (Avoid Memory Demands):** *"Do Not Rely on Users Calculations or Memorizing Information"* — processes should not depend on the user remembering earlier-shown information or doing mental arithmetic. Direct overlap with WCAG 3.3.7 Redundant Entry (§1.1/§4.2): both point at the same underlying failure mode (forcing users to hold/recall information the system already has).

A secondary characterisation worth quoting for scope-setting: *"Unlike plain-language simplification, cognitive accessibility is about interaction design: consistent navigation, time limits that are generous or can be switched off, tolerance of errors, clear feedback and the avoidance of unnecessary complexity in processes."*
Source: [FINK Brot, "Cognitive Accessibility Explained"](https://finkbrot.at/en/glossary/digital-accessibility/cognitive-accessibility) (secondary, support tier, used only for this one framing sentence — the pattern-numbered content above is from the primary W3C source).

### 5.2 UK "Easy Read" principles

- Sourced from UK government/NHS commissioning guidance for Easy Read documents: sentences of **10–16 words**, **active voice**, **sans-serif fonts at least 14pt**, bullet points, defined "hard" words, and accompanying images for each idea.
- Explicit principle quoted: *"Each idea needs both words and pictures – both pictures and words are important."*
- Process principle: *"Ensure that people with learning disabilities are involved from the start"* of producing Easy Read content — i.e. Easy Read is framed as much as a co-production process as a formatting standard.
Sources: [NHS Cheshire & Wirral Partnership, "Basic guidelines for people who commission Easy Read information"](https://webstore.cwp.nhs.uk/publications/ld/website/guidelines.pdf); [Inspired Services, "Making written information easier to understand for people with a learning disability" (government guidance)](https://inspiredservices.org.uk/wp-content/uploads/Government-EasyRead-Guidance.pdf)

### 5.3 Evidence of mainstream-app simplified-mode practice

- **Apple's "Assistive Access"** (iOS 17+) is the strongest found example of a mainstream OS shipping a genuine simplified mode, not just larger text. Documented behaviour: reduces the visible home screen to essential apps only (calls, messages, camera, music, photos by default), offers a choice between a large-row or large-tile layout, uses large buttons and high-contrast text, and **explicitly limits swipe gestures "preventing the user from unintentionally launching different menu screens."** Apple frames it as built for "people with cognitive disabilities such as autism or intellectual disabilities," with an acknowledged secondary benefit for elderly users overwhelmed by mainstream UI complexity.
  Source: [Apple Developer, WWDC23 "Meet Assistive Access"](https://developer.apple.com/videos/play/wwdc2023/10032/); descriptive detail from [iOSDev/Medium, "What is Assistive Access?"](https://iosdev03.medium.com/what-is-assistive-access-how-apple-is-rethinking-simplicity-in-ios-37865ddfcd54) (secondary, support tier for the descriptive detail; the primary claim of the feature's existence and stated purpose is Apple's own WWDC session).
- **Android OEM "senior modes"** (manufacturer-level, not stock-AOSP) are documented as a parallel but less centralised practice: larger icons, clearer text, streamlined/reduced navigation menus, aimed at reducing cognitive load for older users. No single canonical Google-first-party feature equivalent to Assistive Access was found for stock Android in this research pass — this is described only at the OEM-fragmentation level, which is itself a useful finding (Android's cognitive-accessibility simplified-mode story is less unified than iOS's).
  Source: [Android Headlines, "Simplified interfaces: How Android phones are adapting for the elderly"](https://www.androidheadlines.com/2024/04/simplified-interfaces-how-android-phones-are-adapting-for-the-elderly.html) (secondary, support tier).
- **W3C's own worked example of the "support simplification" pattern**, useful as a design-pattern-level (not OS-level) precedent: [WCAG2 Supplemental, "Cognitive Accessibility Design Pattern: Support Simplification"](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p03-complexity) — page located but not fetched for body content this pass; flagged for a follow-up fetch if the audit needs the pattern's specific worked recommendations rather than just its existence.

---

## 6. Hearing

### 6.1 Captions/transcripts for instructional video

- **WCAG 1.2.2 Captions (Prerecorded) — Level A.** Requirement: captions for all prerecorded audio in synchronised media (i.e. any instructional workout-demonstration video with a soundtrack), unless the video is itself a media alternative for text content and is clearly labelled as such. Scope of what captions must contain, quoted: captions *"not only include dialogue, but identify who is speaking and include non-speech information conveyed through sound, including meaningful sound effects."* This is a **Level A** (baseline, not "nice to have") requirement — directly relevant if Volyume ships or plans to ship any exercise-demonstration video content with narration.
  Source: [Understanding SC 1.2.2, W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)
- **RN/Expo implementation reality (§3.5):** `expo-video`'s subtitle-track UI has a documented open gap on Android (subtitle settings unavailable in-player), and `expo-av`'s subtitle path depends on the source already being packaged as HLS with embedded tracks. **Practical implication:** shipping WCAG-1.2.2-compliant captions on instructional video is not a trivial "turn on a prop" step in Volyume's current video stack — it is constrained by the state of the underlying Expo video module and likely requires either HLS-packaged sources with embedded caption tracks, or a custom (non-native-player) caption overlay.

### 6.2 Visual/haptic equivalents for audio alerts

- Standards anchor is **WCAG 1.3.3 Sensory Characteristics** (§1.1) — instructions/alerts must not rely *solely* on sound (or shape/colour/location) — and the related **1.4.2 Audio Control**, which is narrower (governs pausing/stopping/volume-controlling auto-playing audio specifically, not visual-alternative provision) and should not be conflated with 1.3.3 when citing this requirement in an audit; this research initially risked exactly that conflation and the correction is recorded here deliberately.
- Concrete mechanism on both platforms for a visual+haptic+audio triple-redundant alert (e.g. "rest complete," "set logged," "PR achieved"): audio tone **+** `expo-haptics` pulse (with the Low Power Mode caveat from §3.5 noted) **+** an on-screen visual state change **+**, for a screen-reader user who may be relying on neither the audio nor the haptic channel, an explicit `AccessibilityInfo.announceForAccessibility()` (iOS) / `accessibilityLiveRegion` (Android) announcement (§3.1/3.2) carrying the same information in words. No fitness-specific source documents this exact four-channel pattern; it is this agent's synthesis of the WCAG 1.3.3 requirement plus the RN/Expo API surface documented in §3.

---

## 7. PRACTICAL CHECKLIST (for later app audit)

*Format: Criterion → Source → Concrete mobile check.*

| # | Criterion | Source | Concrete mobile check |
|---|---|---|---|
| C1 | WCAG 2.5.8 Target Size (Minimum), AA | [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Every tappable control (button, icon, list-row tap area, checkbox) measures at least 24×24 CSS-equivalent px, OR has ≥24px spacing to the next target, OR has an equivalent-sized alternative elsewhere. |
| C2 | iOS HIG minimum tap target | [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (verify direct quote — §2.1 sourcing note) | Every iOS tappable control is ≥44×44pt hit area (visual size may be smaller if padding/`hitSlop` fills the gap). |
| C3 | Android/Material touch target | [Android Developers, Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps); [Material Design 3](https://m3.material.io/foundations/designing/structure) | Every Android tappable control is ≥48×48dp, with ≥8dp spacing (16dp+ for frequently-used adjacent controls, e.g. stepper +/− buttons or set-row action icons). |
| C4 | WCAG 2.5.7 Dragging Movements, AA | [W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | Any drag interaction (reorder exercises, reorder plan days, slider inputs) has a non-drag single-pointer alternative (move-up/down buttons, numeric input, or a select-then-move action) — test with the drag gesture disabled/unavailable. |
| C5 | WCAG 2.5.1 Pointer Gestures, A (2.2-tightened) | [W3C Understanding 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) | Any swipe (swipe-to-delete a set, swipe between workout days) has a tap-based alternative that is not itself a disguised drag. |
| C6 | WCAG 4.1.3 Status Messages, AA | [W3C Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Toast/success/error messages (`components/Toast` per CLAUDE.md) are exposed via `accessibilityLiveRegion="polite"` (Android) and an explicit `announceForAccessibility` call (iOS) — not just a visual toast that a screen-reader user could miss entirely. Verify with TalkBack/VoiceOver on, trigger a save, confirm it is spoken without moving focus. |
| C7 | WCAG 2.2.1 Timing Adjustable, A | [Silktide SC 2.2.1](https://silktide.com/accessibility-guide/the-wcag-standard/2-2/enough-time/2-2-1-timing-adjustable/) (verify against W3C primary) | Any auto-advancing timer (rest timer moving to next set automatically) can be paused or extended by the user, or the auto-advance is not essential and can be turned off. |
| C8 | WCAG 3.3.7 Redundant Entry, A | [AllAccessible SC 3.3.7](https://www.allaccessible.org/blog/wcag-337-redundant-entry-implementation-guide) (verify against W3C TR WCAG 2.2) | Set-logging flow: does the app carry forward the previous set's weight/reps as a pre-filled default rather than an empty field? Onboarding/check-in: is any previously-entered value (e.g. body weight already logged today) ever asked for twice in the same flow? |
| C9 | WCAG 1.3.3 Sensory Characteristics, A | [W3C 1.3.3](https://w3c.github.io/wcag21/understanding/sensory-characteristics.html) | Every audio-only or colour-only signal (rest-timer-complete beep, red/green set-status colour) has a text/icon/haptic co-signal. Test with device muted AND with colour filters / greyscale on. |
| C10 | RN `accessibilityLiveRegion` iOS gap | [facebook/react-native#34735](https://github.com/react/react-native/issues/34735); RN docs §3.1 | For any Android `accessibilityLiveRegion` usage, confirm there is a parallel explicit `AccessibilityInfo.announceForAccessibility()` call on iOS — the prop alone does nothing there. |
| C11 | RN FlatList VoiceOver order | [react/react-native#37720](https://github.com/react/react-native/issues/37720); [#30977](https://github.com/facebook/react-native/issues/30977) | Test every long virtualised list (exercise picker, workout history, food diary if in scope) with VoiceOver AND TalkBack: confirm item order matches visual order on both, and check whether "N items in list" context is missing on Android. |
| C12 | RN Modal focus management | [react/react-native#45098](https://github.com/react/react-native/issues/45098); [#30644](https://github.com/facebook/react-native/issues/30644) | For every Modal: (a) does VoiceOver/TalkBack focus move INTO the modal on open? (b) does focus return to the triggering control on close (test iOS specifically — documented as broken there, working on Android)? |
| C13 | Apple Dynamic Type | [Apple HIG Typography](https://developers.apple.com/design/human-interface-guidelines/foundations/typography/) (verify domain — §2.1 note) | All text uses Dynamic-Type-responsive sizing (RN: scalable font sizes, not hardcoded px that ignores OS text-size setting); test at the largest accessibility text size and confirm no truncation/overlap in set-logging rows, timers, or stat tiles. |
| C14 | `AccessibilityInfo.isReduceMotionEnabled` | RN docs §3.2 | Any custom animation (progress-ring fill, confetti/celebration on PR, screen transitions) checks this flag and provides a reduced/instant alternative — test with Reduce Motion on, on both platforms. |
| C15 | Haptics as sole signal | [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/) | Confirm no event relies on haptic feedback alone — test with Low Power Mode on (iOS) where Taptic Engine "will do nothing," and confirm the visual/audio channel still carries the information. |
| C16 | VoiceOver hint asymmetry | RN docs §3.1 | Because Android users "cannot turn off" hints but iOS users can, confirm `accessibilityHint` copy is written to be non-essential filler on Android (since it's unavoidable) and genuinely optional context on iOS. |
| C17 | Stepper/adjustable controls | [Deque Adjustable Trait pattern](https://www.deque.com/blog/implement-ui-adjustable-trait-design-pattern/) | Weight/rep steppers use `accessibilityRole="adjustable"` with `accessibilityValue` carrying the live number as one wrapped element, not two separately-focusable unlabelled +/− buttons. |
| C18 | Redundant/conflicting drag-and-menu affordance | [Microsoft Mobile Engineering, Accessible Reordering](https://medium.com/microsoft-mobile-engineering/accessible-reordering-for-touch-devices-e7f7a7ef404) | Wherever drag-to-reorder exists, a "⋯" menu or up/down button exposes the identical reorder action, discoverable without performing the drag gesture at all. |
| C19 | Chart accessibility | [A11Y Collective checklist](https://www.a11y-collective.com/blog/accessible-charts/) | Every progress chart/graph has a text summary AND a data-table (or list) fallback reachable by a screen reader — do not assume the charting library's default a11y props (if any) are sufficient; test directly (§4.6 notes an open unresolved bug even in a library that documents a11y props). |
| C20 | Video captions | [W3C Understanding 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html); [expo/expo#31802](https://github.com/expo/expo/issues/31802) | Any instructional/demo video with narration ships with captions; verify the caption UI actually surfaces on Android given the documented `expo-video` gap, not just iOS. |
| C21 | COGA short critical paths / no redundant memory load | [W3C COGA Design Guide §4.6, §4.7](https://www.w3.org/TR/coga-usable/design_guide.html) | Multi-step flows (onboarding, plan setup, check-in) minimise step count and never require recalling a value shown on an earlier step without redisplaying it. |
| C22 | Easy Read-adjacent plain language | [NHS/gov Easy Read guidance](https://inspiredservices.org.uk/wp-content/uploads/Government-EasyRead-Guidance.pdf) | Coaching/guidance copy uses short sentences (10–16 word guideline), active voice, and pairs any complex concept with a simple visual — consistent with CLAUDE.md's existing plain-language/no-shame voice rule. |
| C23 | Switch Control / Switch Access reachability | [Android Switch Access setup](https://support.google.com/accessibility/android/answer/6301490?hl=en-GB); Apple HIG Switch Control (§2.1, unverified quote) | Every custom (non-native-component) touchable is reachable and actionable by the platform's switch-scanning cursor without requiring the specific gesture (long-press, drag) it was built around — test with Switch Control/Switch Access enabled, not just VoiceOver/TalkBack. |
| C24 | Reachability/one-handed layout | [Apple Reachability](https://support.apple.com/guide/iphone/use-reachability-iph145eba8e9/ios); [Google one-handed mode](https://support.google.com/accessibility/android/answer/12652418?hl=en) | Primary logging actions (log set, finish workout) are not placed at the extreme top edge of the screen on tall-device layouts where thumb reach is worst. |
| C25 | EN 301 549 platform-API integration | [Deque EN 301 549 overview](https://www.deque.com/en-301-549-compliance/) (Chapter 11 detail is secondary-sourced — §1.3 caveat) | Custom RN components expose themselves correctly to `UIAccessibility` (iOS) and the Android accessibility-node tree — i.e. RN's `accessible`/`accessibilityRole`/`accessibilityLabel` props are actually present on every custom-built interactive component, not just native `Button`/`TextInput`. |

---

## 8. RN LIMITS REGISTER (documented gaps that constrain implementation)

1. **`accessibilityLiveRegion` / `aria-live` has no iOS implementation.** There is no OS-level live-region concept on iOS at all; the prop is Android-only by RN's own docs, and the RN team's own issue-tracker reasoning confirms this is a platform limitation, not an oversight — any "announce this dynamic change" behaviour on iOS must be built manually via `announceForAccessibility`/`announceForAccessibilityWithOptions`.
   Source: [facebook/react-native#34735](https://github.com/react/react-native/issues/34735); RN docs.

2. **FlatList/VirtualizedList VoiceOver focus order is inconsistent with Android and can break on virtualised, off-screen, or inverted lists.** iOS may focus an off-screen first-array-item; Android focuses the first visible item; inverted lists swap traversal direction; VoiceOver cannot swipe to an item that isn't rendered/mounted. Android additionally lacks "Position in Collection" metadata (no "item N of M" announcement) across FlatList/SectionList/VirtualizedList/ScrollView.
   Source: [react/react-native#37720](https://github.com/react/react-native/issues/37720); [react/react-native#30373](https://github.com/react/react-native/issues/30373); [facebook/react-native#30977](https://github.com/facebook/react-native/issues/30977)

3. **Modal accessibility focus is not automatically managed on open or close, and iOS close-focus-restoration is documented as actively broken (not merely unimplemented).** Opening a modal does not move VoiceOver/TalkBack focus into it by default; closing a modal on iOS returns focus to the first element on screen rather than the triggering control (Android is reported to behave correctly for the close case in the same issue thread). `accessibilityViewIsModal` (iOS) only handles focus *containment*, not focus *entry/exit* management.
   Source: [react/react-native#45098](https://github.com/react/react-native/issues/45098); [facebook/react-native#30644](https://github.com/facebook/react-native/issues/30644); [callstack/react-native-paper#3912](https://github.com/callstack/react-native-paper/issues/3912)

4. **`experimental_accessibilityOrder` — the one first-party API for controlling custom AT focus order — is explicitly marked not production-safe** by RN's own documentation ("Don't use them in production"). No stable first-party replacement exists as of this research date.
   Source: RN docs §3.1.

5. **`AccessibilityInfo.setAccessibilityFocus()` is deprecated** in favour of `sendAccessibilityEvent(host, 'focus')` — any existing code using the old API is on a deprecated path.
   Source: RN docs §3.2.

6. **Several accessibility props are platform-exclusive with no cross-platform equivalent prop name**, requiring per-platform branching to achieve parity: `accessibilityViewIsModal`/`aria-modal` (iOS-only) vs. no documented Android modal-focus-trap prop; `accessibilityElementsHidden` (iOS) vs. `importantForAccessibility="no-hide-descendants"` (Android) achieve the same hiding effect via different props (RN's own docs note the equivalence, implying `aria-hidden` is the intended unifying alternative — verify this resolves both platforms identically before relying on it exclusively); `accessibilityLanguage` (iOS-only, BCP-47) has no documented Android counterpart; `getRecommendedTimeoutMillis` (Android-only) has no documented iOS equivalent for reading the OS-level "extra time" accessibility setting.
   Source: RN docs §3.1–3.2.

7. **`accessibilityHint` cannot be disabled by the user on Android**, unlike iOS where hint-reading is a user-toggleable VoiceOver setting. Writing hint copy therefore has a different cost/benefit calculus per platform (Android users always hear it; iOS users may have opted out).
   Source: RN docs, quoted in §3.1.

8. **VoiceOver cannot be tested on the iOS Simulator at all**; RN's own docs recommend Xcode's Accessibility Inspector driving macOS VoiceOver only as a fallback, with an explicit caveat that results may vary from a real device. TalkBack is not preinstalled on Android emulators either, though it can be installed. Net effect: credible accessibility testing for this app requires physical devices for both platforms, reinforcing (for an independent reason) CLAUDE.md's existing device-only testing rule.
   Source: RN docs §3.3.

9. **Third-party RN chart libraries have inconsistent, sometimes buggy accessibility support.** Victory/Victory Native documents `desc`/`title` props for screen readers but has an open, unresolved issue where the underlying `role="img"` cannot be overridden, constraining what's actually exposed. No accessibility documentation was located for `react-native-svg-charts` in this research pass (absence of evidence, not confirmed absence of support).
   Source: [FormidableLabs/victory#1606](https://github.com/FormidableLabs/victory/issues/1606).

10. **`expo-video`'s in-player subtitle-selection UI is documented as unavailable on Android** (open GitHub issue), and `expo-av`'s older subtitle path requires HLS-packaged sources — neither module documents a straightforward "attach a plain caption file" API as surveyed this pass.
    Source: [expo/expo#31802](https://github.com/expo/expo/issues/31802); [Expo video docs](https://docs.expo.dev/versions/latest/sdk/video/).

11. **`expo-haptics` is silently inert under several common device states** (Low Power Mode, Taptic Engine disabled in Settings, active Camera, active Dictation, all iOS-specific) — a haptic-only cue can disappear entirely without any error or fallback firing automatically; the app must provide a redundant channel itself.
    Source: [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/).

---

## 9. NEEDS LEGAL REVIEW REGISTER

1. **Does the European Accessibility Act apply to Volyume at all, and if so under which service category?**
   The EAA's obligations attach to specific Annex I product/service categories (e-commerce, consumer banking, e-books, transport-booking, electronic communications, audiovisual media, among others) — it is not a blanket rule for "all consumer apps." Volyume is a fitness/coaching app, not obviously any of the named categories on its face. However, secondary legal-compliance sources state that **"ancillary e-commerce elements (like in-app purchases or paid upgrades) can bring [a platform] into scope"** even where the app's core function is not commerce, and the EAA's own e-commerce definition ("a service provided at a distance… by electronic means and at the individual request of a consumer, with a view to concluding a consumer contract") is broad enough that Volyume's `pro_monthly`/`pro_annual` in-app subscription purchase flow is at least arguably within it. This is a genuine, unresolved-by-this-research legal question: **does selling a subscription via Apple/Google in-app purchase make an otherwise-uncategorised consumer app an "e-commerce service" under the EAA, in whole or only for the purchase flow itself?**
   Sources consulted (none authoritative enough to resolve this): [TestParty, EAA & E-commerce](https://testparty.ai/blog/european-accessibility-act-ecommerce); [Bird & Bird EAA guide](https://www.twobirds.com/en/insights/2025/a-guide-to-navigating-the-european-accessibility-act-for-online-retailers-service-providers-and-plat); [EAA Annex I primary text](https://www.regjeringen.no/contentassets/bf754def6200499da599368de05ec3df/annex-i-european-accessibility-act_accessible-l407065-l431785.pdf).

2. **If EAA does apply (in whole or via the purchase flow), does it pull the entire app into EN 301 549 Chapter 11 scope, or only the purchase/subscription screens?**
   Not resolved by this research. The practical difference is significant: "the checkout flow must be accessible" is a materially smaller obligation than "the whole app must meet EN 301 549 Chapter 11."

3. **Are the specific EN 301 549 Chapter 11 requirement claims in §1.3 accurate?**
   The Chapter 11 detail in this report (platform-API integration mandate, OS font-size mandate, biometric-alternative mandate) is sourced from **compliance-vendor secondary summaries** (Auditsu, Abra), not the ETSI EN 301 549 v4.1.1 primary standard document itself. These claims should be verified against the primary standard text before being treated as binding requirements in any compliance decision.

4. **UK-market question (not covered by this research at all): does the EAA (an EU instrument) have any UK-market equivalent obligation post-Brexit, given CLAUDE.md's British-English/UK-market framing (Beat UK signposting, UK-local week-start) suggesting a UK user base alongside EU?** This research scoped only the EU EAA per the brief; a UK-specific accessibility-law equivalent (e.g. Equality Act 2010 service-provision duties as applied to apps) was not researched and is a distinct open question if the founder needs UK-specific legal grounding separate from EU EAA.

5. **General caveat covering the whole register:** this agent is a research agent, not qualified to give legal advice, and did not consult a lawyer or a primary EN 301 549/EAA legislative text in full for every claim above. Every item in this section should go to actual legal counsel before being treated as a compliance conclusion.

---

## Source-confidence notes (for the campaign lead)

- **High confidence / directly fetched and quoted from primary source:** React Native official docs (§3), Android Developers + Google Accessibility Help docs (§2.2), W3C WCAG Understanding documents (§1.1), W3C WCAG2Mobile Draft Note (§1.2), W3C COGA Design Guide (§5.1), Deque's Adjustable Trait pattern (§4.2), Apple Support consumer-facing docs for Touch Accommodations/Reachability (§2.1 — these are support.apple.com, not developer HIG, but fetched cleanly and quoted directly).
- **Medium confidence / WebSearch-synthesised from primary-source URLs that could not be fetched directly this pass (Apple's JS-rendered HIG pages):** Apple VoiceOver HIG framing, Apple 44pt tap-target HIG citation, Apple Dynamic Type HIG citation, Apple Reduce Motion HIG citation, Apple Switch Control HIG citation. **Recommend a follow-up research pass with a JS-capable fetch tool to convert these to direct quotes before they're relied on verbatim in the audit.**
- **Lower confidence / secondary compliance-vendor or blog sources used only where no primary source was found, flagged inline at point of use:** EN 301 549 Chapter 11 specific requirement list (§1.3), Android "Remove animations" behaviour detail (§2.2), Android one-handed mode history (§2.2), Android Switch Access app-compatibility quote (§2.2), COGA cognitive-vs-plain-language framing sentence (§5.1), Android OEM senior-mode practice (§5.3).
- No claim in this document should be treated as a final, audit-ready citation without the confidence level above being checked against how it's being used — a checklist item for internal engineering triage can tolerate medium confidence; anything going into a compliance/legal document cannot.
