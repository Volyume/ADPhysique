# 03 — Navigation & Flow Audit

Status: **COMPLETE**
Date: 2026-05-31
Branch: `main` @ current HEAD
Method: traced from `src/navigation/RootNavigator.js` (read in full,
Phase 2), `App.js` (deep links), `app.json` (scheme/intent filters), and a
grep of every `navigation.navigate/replace/push(...)` + nested
`{ screen: ... }` target across `src/screens` + `src/components`, then
cross-referenced against the registered `<Stack.Screen name=…>` set.
Every claim below is from those reads — no assumed routes.

---

## 1. Navigation architecture (verified)

Entry: `index.js` → `App` → providers → `RootNavigator`. The navigator
**gates between flows by store state** in `renderNavigator()`
(`RootNavigator.js:904-913`), priority order:

1. `!tier` → **WelcomeStack** (Welcome → Login → Onboarding)
2. signed-in cloud user + `healthConsent === false` → **Article9ConsentStack**
   (single screen; submission flips the store and re-renders onward)
3. `!firstRunComplete` → **ProOnboardingStack** (tier `pro`) or
   **FirstRunStack** (free)
4. else → **MainTabs**

Splash gate (`:876`): shown until `splashReady && firstRunChecked &&
tierChecked`; deliberately NOT gated on `isAuthLoading` (documented fix for
the OAuth wizard-unmount loop).

**5 tabs** (`MainTabs`, `lazy={false}` so all mount at entry — A2-008):
HomeTab "Train", PlansTab "Plans", DiaryTab "Diary", ProgressTab
"Progress", ProfileTab "You". Each stack registers a `tabPress` listener →
`StackActions.popToTop()` so re-tapping a tab returns to its root.

**51 registered route names** across the stacks (verified list in Phase 2
notes). Stack sizes: Home 9, Plans 9, Diary 9, Progress 12, Profile 24.

---

## 2. Every navigation target resolves (no broken `navigate`)

Cross-referenced all `navigation.navigate/replace/push('X')` + nested
`{ screen: 'X' }` calls across screens/components against the registered
`<Stack.Screen name>` set. **Every target resolves to a registered route.**
The most-navigated targets: `PlanDetail` (×12), `HomeTab`/`AddCustomFood`/
`ActiveWorkout` (×6), `ProUpgrade` (×5). `ProUpgrade` is registered in
**all four** main stacks (Home/Plans/Progress/Profile, lines 226/247/272/
309) so a Pro-gate tap resolves no matter which tab the user is on — good.

**No broken navigation found.** No `navigate()` to an unregistered name.

### N3-001 — Cross-tab nested navigation relies on the route existing in the *target* tab's stack.
Nested calls like `navigate('ProfileTab', { screen: 'WeeklyCheckIn' })`
(notification routing, `RootNavigator:449`) and the WhatsNewSheet's
`navigate('ProfileTab', { screen: 'Settings' })` work because those screens
ARE in ProfileStack. Verified the two notification routes
(`weekly_checkin`→ProfileTab/WeeklyCheckIn, `year_of_lifts_unlock`→
ProgressTab/YearOfLifts) both resolve. No dead nested target found.

---

## 3. Unreachable / dead screens

Checked each registered route for an inbound navigation path.

### N3-002 — `Onboarding` (generic OnboardingScreen) appears to be a dead/legacy route.
`OnboardingScreen` is registered in `WelcomeStack` (`:361`) and is the
target of zero `navigate('Onboarding')` calls anywhere in screens/
components (grep: not in the navigate-target list). The live signup flows
route **Login → (tier set) → FirstRunStack/ProOnboardingStack**, not through
`Onboarding`. So the 5-step generic OnboardingScreen (with the orphan
`training_focus` taxonomy, A2-066) is **reachable only if something inside
WelcomeStack pushes 'Onboarding'** — and nothing does. → **Likely dead
screen.** Confirm before removal; if kept, fix A2-066. (Cross-ref Phase 2
A2-067.)

### Everything else is reachable (spot-traced):
- Modal/sheet routes (`ProUpgrade`, `Paywall`, `CascadeGate`,
  `ScanBarcode/Label`, food sheets) — reached via in-screen taps.
- Deep targets (`YearOfLifts`, `WeeklyCheckIn`) — via tab nav + notification
  routing.
- `ProSetupComplete` — pushed at the end of ProOnboardingStack.
- All Profile-stack management screens — via `YouScreen` NavRows + Settings.

No other orphan routes detected. (`AthleteHub` — flagged in Phase 1 — is
confirmed **absent** from both the import list and the route set; fully
removed, only stale code comments remain, e.g. useAppStore A2-024.)

---

## 4. Deep-link coverage — the real gap (confirms A2-010)

`app.json` declares (verified):
- iOS: `scheme: "volyume"` + `associatedDomains: ["applinks:volyume.app"]`
  (`:25-27`).
- Android: two `autoVerify` intent filters — `volyume://` scheme and
  `https://volyume.app` App Links (`:63-91`).

So the OS will hand `volyume://…` and `https://volyume.app/…` URLs to the
app. **But there is no React-Navigation `linking` config** (Navigation
container has no `linking` prop, `RootNavigator:915-941`). In-app URL
handling is only:
1. `App.js handleAuthDeepLink` — Supabase auth callbacks (PKCE/implicit).
2. Notification-tap `routeFor()` — exactly **2 types** (`weekly_checkin`,
   `year_of_lifts_unlock`).

### N3-003 (= A2-010) — Universal links can open the app but cannot deep-link to any content screen.
A `https://volyume.app/plan/123` link opens the app to wherever the gate
lands (Welcome/Home), **not** to the plan. There is no declarative
URL→screen map, so marketing links, shared-card links, and "open my X"
flows can't target a screen. For an app that ships a ShareCard feature and
universal-link entitlements, this is a **meaningful capability gap** (and a
competitor table-stakes feature — most loggers deep-link to a workout). →
Phase 11 high-impact: add a `linking` config covering the main routes.

### N3-004 — Two notification-tap handlers coexist (= A2-009/057).
`RootNavigator:454-468` (`routeFor`, 2 types) and `App.js:410-415`
(`data.url` → `Linking.openURL`). A notification carrying both a `type` and
a `url` would be handled twice. Confirmed both listeners install; no payload
currently sets both, so no live double-nav, but it's fragile. → unify.

---

## 5. Modal / sheet flows — no traps

`presentation: 'modal'` routes (ProUpgrade, Paywall, CascadeGate, food
sheets via the BottomSheet component) all have an explicit close/dismiss
(X button + hardware-back via `onRequestClose`, verified in Phase 2 for
`BottomSheet`, `PeekMenu`, `FeedbackSheet`, `PaywallScreen`,
`CascadeGateScreen`). **No modal traps the user.** `CascadeGateScreen`'s X
is a documented "decide later" no-op (re-fires next gate) — intentional,
not a trap.

The `withProGuard` HOC (`ProGate.js`) renders `ProLocked` (with a "Not now"
→ `goBack`) for free users on a Pro route, so a deep/stale nav to a Pro
screen never dead-ends.

---

## 6. Onboarding & auth flows (traced end-to-end)

**New user (free):** Welcome → `chooseTier('free')` → Login (`intent:
free_signup`) → signup → auth listener sets session → (tier null →
`setTier`? no, free stays) → FirstRunStack (FirstRunScreen: name+units →
`completeFirstRun`) → MainTabs. ✔ resolves.

**New user (pro):** Welcome → `chooseTier('pro')` → Login (`pro_signup`,
opens in signup tab) → signup → `LoginScreen:163 setTier('pro')` →
RootNavigator routes to ProOnboardingStack → ProOnboardingScreen wizard →
ProSetupComplete → `completeFirstRun` → MainTabs. ✔ resolves. (Article 9
gate interposes for cloud users without consent.)

**Returning user:** cold launch → bootstrap reads session → optimistic
route (per-uid cache / created_at heuristic) → MainTabs; cloud pull fills
empty states. ✔ (A2-021 caveat: the 60s heuristic can route a slow email-
confirmer past onboarding into an empty MainTabs.)

**OAuth:** Login → `handleOAuth` → browser → `volyume://` redirect →
`App.js handleAuthDeepLink` exchanges code → `onAuthStateChange` routes.
✔ (A2-016: Apple uses this browser path, not native — App Store risk.)

**Lapsed user:** no special re-engagement flow in the navigator; a returning
user just lands on MainTabs with their (synced) data. `dailyNarrative`
surfaces a "X days off, ease in" line on Home (Phase 2). No dead end.

---

## 7. Tab-bar resolution (verified)

`MainTabs` (`:347-351`) maps each tab `name`→icon via a lookup with an
`'ellipse'` fallback (`:343`) so an unknown route can't crash the tab bar.
All 5 tab `component`s resolve to their stack functions. Tab labels are
tokenised (`fontSize.xs`) so they scale with Larger Text (the one a11y
dimension that IS live). Bottom inset padding handles edge-to-edge
(`:327-328`).

---

## 8. Navigation-level findings summary

| ID | Finding | Severity |
|---|---|---|
| N3-003 (=A2-010) | No `linking` config — universal links can't reach content screens | **High (capability gap)** |
| N3-002 (=A2-067) | `Onboarding` route likely dead/legacy (no inbound nav) | Low–med |
| N3-004 (=A2-009/057) | Two notification-tap handlers coexist | Low–med |
| N3-001 | Cross-tab nested nav is correct but contract-fragile | Info |
| — | **No broken navigation; no modal traps; no orphan reachable-screen dead-ends** | Positive |

**Verdict:** the navigation graph is **sound** — every target resolves,
no traps, no dead ends, Pro-gating enforced at the route level. The single
substantive gap is **deep-link coverage** (declared entitlements, no
in-app routing map), plus one likely-dead legacy onboarding screen and the
duplicate notification handler. Carried to Phase 11.
