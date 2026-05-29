# 02 · Navigation, tab bar, headers, transitions, routing shell

Phase 3 assessment for the navigation layer: `RootNavigator.js` (read in
full, tab bar, six stacks, transitions, auth/consent gating, splash),
`BackHeader`, `ScreenHeader`, `PeekMenu`, and the sync badge's place in
the header chrome.

## Phase 2, best-in-class references

- **Tab count + clarity:** 3–5 tabs is the accepted sweet spot; the active
  tab should differ by *icon style + colour + weight* together. Volyume
  has exactly 5 (Train/Plans/Diary/Progress/You) with filled-vs-outline
  icons + amber tint, on spec.
- **Robinhood:** complex domain made legible by stripping jargon and
  leaning on clean visual states. Relevant to Volyume's header chrome
  (sync badge) and the dense Progress/Coaching stacks.
- **Linear:** "tight transitions, focused interactions, immediate state
  changes", one coherent transition language. Volyume has a nice
  hero-zoom but applies it to only two routes; everything else is the
  default slide.
- **iOS vs Android tab-state convention:** iOS *retains* each tab's stack
  position on switch; Android *resets* to root. Volyume forces reset on
  every tab press (popToTop) on both platforms, a deliberate choice worth
  examining (below).
- **Scroll-to-hide tab bar:** common in content-dense apps to reclaim
  vertical space. Volyume's bar is always visible.

What separates best-in-class: one transition language, a header that's
quiet until it has something to say, and tab behaviour that matches
platform expectation.

---

## Component: Bottom tab bar

**File:** `RootNavigator.js:314-352` (`MainTabs`)

**Current state:** Good and on-brand. 5 tabs, Ionicons filled when
focused / outline when not, `tabBarActiveTintColor: colors.primary`
(amber) over `tabBarInactiveTintColor: colors.textMuted`, edge-to-edge
safe-area padding handled correctly (`paddingBottom: 4 + insets.bottom`,
`height: 60 + insets.bottom`, l.327-328, with a documented Android 15 /
iOS rationale). `lazy={false}` mounts all tabs up front.

**Best-in-class reference:** Material/iOS tab bars, active state by
icon+colour+weight; tokenised label type.

**Gap:**
1. **Off-token label type.** `tabBarLabelStyle: { fontSize: 11,
   fontWeight: '600' }` (l.332) hardcodes both instead of `fontSize.xs` /
   `fontWeight.semibold`. With the larger-text accessibility multiplier
   active, every label in the app scales except the tab bar.
2. **Icon size literal.** `size={22}` (l.341) bypasses `iconSize`.
3. **`lazy={false}`** mounts five stacks (several of which are 1000–2600
   line screens) at launch. This trades a heavier cold start + memory
   footprint for instant tab switches. On a budget Android device this is
   a real cost; worth measuring.
4. No scroll-to-hide, so on the long scrolling screens (Diary, Analytics,
   ActiveWorkout) ~64px of vertical space is permanently spent.

**Improvement:** Tokenise label size/weight (and respect larger-text), use
`iconSize.md` for the glyph. Re-evaluate `lazy={false}`: if the only
reason is avoiding a flash on first tab open, a lighter per-tab skeleton
on first focus may beat eager-mounting the giant screens. Consider
scroll-to-hide on the two or three longest scroll surfaces only (not
app-wide, it can hurt discoverability).

**Coherence impact:** Medium positive, the tab bar is the most-seen
component; tokenising it closes a visible accessibility gap.

**Priority:** Medium (tokens + larger-text), Low/investigate (`lazy`,
scroll-hide).

---

## Component: Tab-press → popToTop behaviour

**File:** every stack: `DiaryStack:159-163`, `HomeStack:212-216`,
`PlansStack:233-237`, `ProgressStack:254-258`, `ProfileStack:279-283`

**Current state:** Each stack registers an identical `tabPress` listener
that `popToTop()`s on every tab press. So tapping a tab always returns to
its root, even re-tapping the current tab.

**Best-in-class reference:** iOS convention, first tap on another tab
returns you to where you were in that tab; tapping the *already-active*
tab pops to root. Two different gestures, two different outcomes.

**Gap:** Volyume collapses both into "always reset". That means switching
Diary → Plans → back to Diary loses your place in Diary even though you
didn't ask to. The same five-line effect is also duplicated verbatim in
five stacks (DRY/maintenance smell).

**Improvement:** Extract one `useResetStackOnTabPress` helper. Then
decide the behaviour deliberately: the common best-in-class pattern is
"pop to root only when re-tapping the *focused* tab" (check
`navigation.isFocused()` in the listener), which keeps each tab's position
on cross-tab switches. If the founder prefers always-reset (simpler mental
model, fewer stale screens), keep it but make it a one-line documented
decision in the helper, not five copies.

**Coherence impact:** Medium, affects how the whole app "remembers" where
you were.

**Priority:** Medium.

---

## Component: Screen transitions (heroZoom + default)

**File:** `RootNavigator.js:124-148` (`heroZoomTransition`),
`useStackMotionOverride:153-156`

**Current state:** Thoughtful. `heroZoom` scales the destination from 0.92
→ 1.0 while fading in, so a tapped card "grows" into a full screen
(applied to ActiveWorkout, WorkoutSummary). It has a real defensive guard
against the `current.progress` undefined crash on back-gesture
(l.131-133), a genuine production fix. Reduce Motion disables animation
per-stack via the store, no restart needed (l.153-156). Everything else
uses the default platform slide.

**Best-in-class reference:** Linear/iOS, one transition vocabulary, used
consistently so motion *means* something (zoom = drill into a card;
slide = lateral move).

**Gap:** The hero-zoom is only on 2 of ~60 routes, so the "tap card →
expands" language is barely established, most card taps slide like
everything else, diluting the signal. Durations are inline literals
(280/200, l.145-147) rather than `motion` tokens, and they don't match
the `motion.card` (220) token, so the one place with bespoke motion
disagrees with the token that exists for exactly this.

**Improvement:** Either lean in (apply hero-zoom to the other
card→detail drill-downs: PlanDetail from a plan card, ExerciseDetail from
an exercise card, CoachOutput from the week card) so the language reads, or
pull it back to the two showcase moments and accept default slide
elsewhere. Route the durations through `motion` tokens either way.

**Coherence impact:** Medium positive, motion becomes a consistent
signal rather than a one-off.

**Priority:** Medium.

---

## Component: BackHeader

**File:** `src/components/BackHeader.js`

**Current state:** Solid. Back chevron + title + optional right node,
theme tokens, accessibilityRole+label on the back control, hitSlop.

**Best-in-class reference:** iOS large-title nav bar / Linear header,
back affordance has a clear press state and (on iOS) a label; title
truncates gracefully.

**Gap:** The chevron has hitSlop but no *visual* press state (no opacity
or scale on press), so taps don't feel acknowledged. Coexists with React
Navigation's native stack header on the many screens that set
`headerShown: true` (e.g. PlanDetail, RoutineDetail), so the app has two
header systems: the RN stack header (with `SyncStatusBadge` headerRight)
and the custom `BackHeader`/`ScreenHeader` on `headerShown: false`
screens. They look similar but aren't identical (tint, spacing,
right-slot behaviour).

**Improvement:** Add a press state (wrap the chevron in the PressableCard
press model or an opacity dip). Bigger picture: pick one header system.
The cleanest path is to make the custom headers the single source and turn
`headerShown` off everywhere, or vice-versa, but at minimum align their
tint, title type, and right-slot so the seam is invisible. Tracked again
in 08-coherence.

**Coherence impact:** High, header is on nearly every screen; two header
systems is a top coherence risk.

**Priority:** High (unify), Low (press state).

---

## Component: ScreenHeader

**File:** `src/components/ScreenHeader.js`

**Current state:** Tab-root header: title + subtitle + Volyume wordmark +
optional right override. Used on Train/Plans/Progress/You roots.

**Best-in-class reference:** Monzo/Robinhood app headers, consistent
optical alignment of wordmark and title, one right-slot convention.

**Gap:** Optical alignment is hand-tuned in the component
(`WORDMARK_HEIGHT = 22`, paddingTop 6, l.25,67), fragile if the wordmark
asset or title size changes. No accessibilityLabel on the header block.
Inconsistent with BackHeader's right-slot (one takes `right`, the stack
header injects `SyncStatusBadge` automatically), so the sync badge
appears on pushed screens but is absent on tab roots that use
ScreenHeader. That's an inconsistency: sync status visibility depends on
which header you're under.

**Improvement:** Have ScreenHeader render the same right-slot contract as
the stack header (include `SyncStatusBadge` by default unless overridden),
so sync visibility is uniform. Bake the wordmark optical offset into
BrandMark (see 01-foundation). Add an a11y label.

**Coherence impact:** High, fixes the "sync badge present on some screens,
absent on others" inconsistency.

**Priority:** High.

---

## Component: PeekMenu (long-press context menu)

**File:** `src/components/PeekMenu.js`

**Current state:** Good. Imperative ref API, slides up from bottom, icon +
label rows with destructive styling, Pressable press states, role+label on
items. Backdrop hardcoded `#000` 0.55 (l.166).

**Best-in-class reference:** iOS context menu, long-press lifts the
source element and shows actions anchored to it, with haptic on trigger.

**Gap:** It's a bottom action sheet, not an anchored context menu, so the
spatial link between the long-pressed item and its actions is weaker than
iOS's lift-and-anchor. Backdrop off-token (will be fixed by the scrim
token). Worth checking it fires a haptic on open (the spec calls long-press
the brand's "amber affordance"-adjacent gesture).

**Improvement:** Route backdrop through the scrim token; confirm a haptic
on open; consider showing the source item's title in the menu header so
the link is explicit (it supports `title`/`subtitle` already, ensure
callers pass them). Anchored-popover redesign is optional/Low.

**Coherence impact:** Medium positive.

**Priority:** Medium (scrim + haptic + title), Low (anchoring).

---

## Component: Splash screen

**File:** `RootNavigator.js:942-1067` (`SplashScreen`, `splashStyles`)

**Current state:** Branded, well-sequenced hero+wordmark+accent-bar+
tagline animation, fully reduceMotion-aware (every animated value starts
at its end state when RM is on). Minimum 2500ms display (`SPLASH_MIN_MS`).

**Best-in-class reference:** A splash should be the shortest possible
brand beat; many best-in-class apps cut to content the instant data is
ready rather than holding a fixed minimum.

**Gap:** Container background hardcoded `#000000` (l.1039), not the
brand `#0D0D0D`, so the splash is a different black from the rest of the
app (a subtle but real seam at hand-off). `SPLASH_MIN_MS = 2500` forces a
2.5s wait even when bootstrap finishes sooner, long by modern standards.
A dead `wordmark` style (l.1043-1051) is defined but unused (the image is
used instead).

**Improvement:** Use `colors.background` for the container so the splash
matches the app's black. Reconsider the 2.5s floor, gate on
"animation complete OR data ready", whichever is later, with a lower floor
(~1200–1500ms). Remove the dead `wordmark` style.

**Coherence impact:** Medium, first impression + the black seam.

**Priority:** Medium.

---

## Component: Routing / gating shell

**File:** `RootNavigator.js:408-908` (bootstrap, auth listener,
`renderNavigator`)

**Current state:** Robust and heavily battle-tested (the comments document
multiple real incidents: OAuth loop on splash unmount, pro→free
demotion race, cross-device data loss, Article 9 re-prompt on network
blip). Routing priority is clear and commented (l.889-908): no tier →
Welcome; signed-in + consent missing → Article 9; first-run incomplete →
Pro or Free onboarding; else MainTabs. Optimistic sign-in (route on local
cues, sync cloud in background) avoids a sign-in splash.

**Best-in-class reference:** Not a visual component, but best-in-class
routing keeps this orchestration *out* of the navigator file (a dedicated
bootstrap/session module) so the navigator stays declarative.

**Gap:** This is a ~530-line `useEffect`-heavy bootstrap living inside the
navigator component. It's correct but it's a maintenance and
re-render-risk concentration: SQLite init, seed imports, auth state
machine, tier reconciliation, consent checks, cross-user wipe, bulk
upload, telemetry flush, push registration, all in one file. Not a
*design* issue but a structural one the audit should flag (runtime-
critical per CLAUDE.md Rule 5).

**Improvement:** (Engineering, not visual) extract the bootstrap + auth
listener into `lib/bootstrap.js` / `lib/authFlow.js`, leaving
RootNavigator to declare stacks and call `renderNavigator()`. Out of scope
for a design pass but noted for the master recommendations as a structural
risk.

**Coherence impact:** N/A visual; High maintainability.

**Priority:** Low for this audit's design remit; flagged for engineering.

---

## Navigation summary

| Item | Gap | Priority |
| --- | --- | --- |
| Two header systems (RN stack header vs custom) | sync badge + tint inconsistency across screens | High |
| ScreenHeader right-slot vs stack headerRight | sync status visible on some roots, not others | High |
| Tab label/icon off-token | doesn't scale with larger-text a11y | Medium |
| tabPress always-resets (×5 duplicated) | loses tab position; not platform-idiomatic | Medium |
| Hero-zoom on only 2 routes, inline durations | motion signal diluted, off-token | Medium |
| Splash `#000000` + 2.5s floor | black seam, slow start | Medium |
| PeekMenu/back press-state + scrim | minor feel gaps | Low–Medium |
| `lazy={false}` eager-mounts giant screens | cold-start/memory cost | Investigate |

Top navigation move: **unify the two header systems** and make the sync
badge appear consistently. It's the most-seen surface and the clearest
break in coherence.

Sources:
- [Bottom tab bar navigation best practices (UX Planet)](https://uxplanet.org/bottom-tab-bar-navigation-design-best-practices-48d46a3b0c36)
- [Bottom navigation bar 2025 guide (AppMySite)](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Mobile navigation UX best practices (Design Studio)](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Mobile UX design examples 2025 (Eleken)](https://www.eleken.co/blog-posts/mobile-ux-design-examples)
