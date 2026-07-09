# Facts: Home & daily hub

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

I have everything needed. Final report below.

## 1. INFORMATION ARCHITECTURE

**Tabs** (`src/navigation/RootNavigator.js` lines 546-568), fixed order, custom `VolyumeTabBar`:
1. `HomeTab` → title "Today", icon `today`/`today-outline`
2. `PlansTab` → title "Train", icon `barbell`/`barbell-outline`
3. `DiaryTab` → title "Nutrition", icon `nutrition`/`nutrition-outline`
4. `ProgressTab` → title "Progress", icon `stats-chart`/`stats-chart-outline`
5. `ProfileTab` → title "Coach", icon `pulse`/`pulse-outline` (internal route IDs kept stable for deep links; visible IA differs from route names)

Coach tab (`YouScreen.js`) carries a small amber dot (`hasUnseenCoachChange`, mirrored from Home's coach-banner condition, cleared by `CoachOutputScreen`) when there's an unseen weekly coach review.

**Home (`HomeScreen.js`) top-to-bottom order** (one scroll view, `RefreshControl`):
1. `ScreenHeader` — title "Today", subtitle = time-of-day greeting
2. Training-schedule context line (conditional, e.g. "Today is a training day")
3. Fresh coach-update banner (Pro, dismissible)
4. AttentionCard "trial" variant (Pro trial ledger)
5. Deload/recovery-week banner
6. Nutrition phase-mismatch banner
7. Lift-plateau banner
8. Activation-nudge banner (tier-blind, stall stages only)
9. AttentionCard "attention" slot: free-tier weekly one-liner OR differential paywall badge
10. "N more updates" collapse affordance (only top 2 banners shown by default; rest collapse — founder decision D7)
11. Skeleton placeholders during `initialLoading` (`SkeletonCard` height 160 + 64)
12. `TodayStrip` (morning-weight card) — **Pro only**
13. First-launch "Welcome to Volyume" card (0 sessions, dismissible, only when a plan+nextWorkout exist)
14. Primary workout area: continue-active-workout card, OR hero plan/session card, OR no-plan section (different content free vs pro — see below)
15. `CoachDailyBrief` (the "Since your check-in" runway) — Pro only, ledger-driven
16. Free-tier Pro-teaser row (free tier, 3+ sessions only)
17. Last-session slim row (tap → history, inline "Repeat" button)
18. One-time coaching-discovery nudge (Pro, check-in day only)
19. Modals: block-shape sheet, change-workout sheet, pre-workout intent/readiness prompt

**Free vs Pro differences on Home:**
- `TodayStrip` (morning weight) is Pro-only (`tier === 'pro' && user?.id`).
- No-plan state diverges completely: Pro gets "No active plan yet" + "Start with a plan" (cloud-rebuild copy); Free gets a "starter card" with a 3-question micro-quiz CTA ("Start with a plan") + "Browse plans", plus a quiet "Just want to log? Start a blank workout" link (Pro instead gets a full `quickStartCard`).
- `CoachDailyBrief` runway is Pro-only; suppressed while the trial banner shows.
- Pro-teaser upsell row only shows on free tier after 3+ sessions.
- AttentionCard "trial" variant is Pro-trial only; free-tier/differential variant only for free tier.
- Coaching nudge only for Pro with 3+ completed sessions on check-in day.

**You/Coach screen (`YouScreen.js`) top-to-bottom:** `ScreenHeader` (title "Coach", subtitle "Weekly coaching from your logs.", settings gear top-right) → load-error retry card (conditional) → status card ("Weekly coach update: <date>" or pending-copy states, or "Coach is available on Pro" for free) → "This week" section (Pro: Weekly check-in / Coaching decision / Your week rows; Free: Upgrade to Pro / Coaching history) → profile card (avatar, name, session count or skeleton, focus line e.g. "Cut - Fat loss - 4 days/week") → "Setup" section (Pro only: goal/phase, nutrition targets, coaching reminders) → "Support" section (Partners row, always) → "Safety checks" section (Pro only: Goal lock, Wellbeing check) → About footer ("Volyume" / "Private coaching based on your logs.").

**Personalisation:** Time-of-day + first-name greeting via `getGreeting()`: "Up early, {name}." (<5h), "Morning, {name}." (<12h), "Afternoon, {name}." (<17h), "Evening, {name}." (<21h), "Late night, {name}." (else); falls back to no name suffix if `firstName` absent. You-screen shows `displayName` (firstName, else derived from email, else "Athlete") plus avatar.

## 2. VERBATIM COPY

- "Up early, {name}." / "Morning, {name}." / "Afternoon, {name}." / "Evening, {name}." / "Late night, {name}." (greeting)
- "Today is a training day" / "Next session: tomorrow" / "Next session: {dayName}"
- "Coach - this week's decision" / "Calories adjusted to {n} kcal. Tap to see why."
- "Recovery week suggested" / "Your recent training signals it is time for a lighter week."
- "Welcome to Volyume" / "Begin from your plan, or just log freely. Tap Start workout and log each set as you go." / "Every session you log sharpens your plan. There is nothing to set up."
- "No active plan yet" — Pro: "If you just signed in, we may still be pulling your data from the cloud. If nothing arrives, start with a plan and we'll rebuild it from your profile."
- "No active plan yet" — Free: "Answer three quick questions and we'll suggest a starter plan. You can also browse the library." (or, with history: "You've been training without a set plan...")
- "Not logged yet" (weight empty state, `TodayStrip.js`)
- "One off week never breaks your run. Life happens, and your run carries on." (`ConsistencyEcho.js`)
- "How the Coach works" / "Pro reads the full story" (`AttentionCard.js`)
- "Your weekly check-in is ready" / "It's your check-in day. See how your week went and what to adjust." / "If you like, add a progress scan first for extra visual context. Skipping it is fine."
- "First check-in not open yet" / "Log your morning weight and train as normal. Volyume will open the check-in once the baseline is ready." (`YouScreen.js`)
- "Couldn't refresh Coach" / "Your saved profile stays unchanged. Tap to try again."
- "How are you feeling today?" / "Takes a second. Helps us read your sessions better over time." / "Don't ask before each session"

## 3. STATE COVERAGE

- **First-ever launch:** dedicated "Welcome to Volyume" card, gated on `totalSessions === 0 && !welcomeDismissed && activePlan && nextWorkout` — i.e. it only shows once a plan exists; a brand-new user with no plan instead sees the free/pro no-plan starter states. Dismissal persisted per-user in AsyncStorage.
- **Rest/recovery week:** no dedicated "rest day" screen state; recovery surfaces as (a) the deload/recovery banner ("Recovery week suggested"), (b) `readinessSummary` chip line, (c) `ConsistencyEcho`'s "Recovery week. Your run carries on." — never framed negatively.
- **Loading skeletons:** `initialLoading` flag renders two `SkeletonCard`s (160px hero-shaped, 64px strip-shaped) in place of the hero/TodayStrip during cold SQLite load; `YouScreen` uses small `Skeleton` for the profile session-count line while `sessions` is null.
- **Error/offline handling:** `YouScreen` uses `Promise.allSettled` per data source; on any rejection shows a dismissable-by-retap "Couldn't refresh Coach" card (tap increments `reloadKey` to retry) while keeping stale/cached data. Home's individual loaders each swallow errors to `null`/defaults (`catch(() => {})` / try-catch with fallback state) rather than surfacing a screen-level error; weight-log failures show a toast ("Couldn't save weight, try again") and revert optimistic UI. Several ED-safety-relevant reads (open-ED flag, wellbeing) explicitly fail CLOSED (map errors to a truthy/suppressing sentinel `'read_failed'`) rather than fail open.
- **Pull-to-refresh:** Home only, standard `RefreshControl`; on refresh it also fires `pullFromCloud` in the background if a session exists (status mirrored into the Zustand store via `markCloudSyncing/Complete/Error`), then reloads local data regardless.

## 4. DYNAMISM

- Rest-timer countdown ticks live in `ActiveSessionMiniBar`'s self-subscribing `MiniBarStatus` child (isolated re-render, "the HeaderRestChip pattern") — mm:ss format, or "Set X of Y" / "N sets done".
- Live pulsing "live" dot (opacity loop, `withRepeat`/`withTiming`) on the mini-bar, static under Reduce Motion.
- `VolyumeTabBar`: sliding amber selection pill (`withSpring`, `motion.springs.settle`) behind active tab icon+label; per-icon settle-scale bounce (1→1.06→1) on focus tap, paired with an M1 haptic; instant/no-scale under Reduce Motion.
- Mini-bar slide-in/out (`SlideInDown`/`SlideOutDown`) when a workout starts/ends, again suppressed under Reduce Motion (appears/disappears instantly instead).
- Coach-review, trial-ledger, streak, and consistency-echo numbers recompute on every focus/cloud-sync (`cloudSyncVersion` bump triggers re-load without navigating away).
- No confetti/celebration components found in these files — comments explicitly say celebratory treatments are avoided (e.g. mini-bar header comment: "nothing celebratory, no weight/food-adjacent number").
- Two delayed safety-net reloads at +3s/+10s after sign-in to catch late-arriving cloud-pull data.

## 5. ACCESSIBILITY + PERFORMANCE

- Heavy, consistent `accessibilityRole`/`accessibilityLabel`/`accessibilityState` usage (65 occurrences of accessibilityLabel/Role in HomeScreen alone); dynamic labels describe state (e.g. mini-bar: "Workout in progress: {exercise}. Return to your session."; TodayStrip: "Weight {x} logged today. Tap to see your trend, long press to edit.").
- `useSafeAreaInsets`/`SafeAreaView` used throughout for edge-to-edge devices.
- Global `reduceMotion` flag (`accessibility?.reduceMotion` from the store) gates every spring/pulse/slide animation across `VolyumeTabBar`, `ActiveSessionMiniBar`, and the block-shape Modal (`animationType={reduceMotion ? 'none' : 'slide'}`).
- No `useMemo`/`React.memo` found in HomeScreen.js (0 matches) — the large derived-state block (banner priority list, readiness summary, coach brief) recomputes every render.
- No `FlatList`/`SectionList` in these files — Home is a single `ScrollView`; no list virtualisation concern here since Home has no long lists (banners/cards only).
- Heavy work on mount: `loadData()` fires ~11-15 parallel loaders (`Promise.all`) on every focus, each hitting SQLite (`getAllWorkouts`, `getWorkoutSetsSince`, etc.); comments note deliberate bounding (LB-7 pattern: fetch last 4/8 weeks of sets, not full history) to keep this cheap.
- `ActiveSessionMiniBar` isolates its per-second rest-tick subscription to avoid re-rendering the whole app shell — explicitly documented as a performance contract.

## 6. STANDOUT FACTS

**Strong:**
1. ED-safety is threaded through nearly every Home data loader as an explicit fail-closed OR-chain (`edFlagOpen || wellbeing === 'read_failed' || isCalm(wellbeing)`), reused identically across trial banner, coach runway, free coach line, differential banner, and activation nudge — a single audited pattern, not ad hoc.
2. Positional-destructuring warning comment in `loadData()` explicitly documents a fragile array-index dependency between loaders and the differential-paywall context, flagging a real fragility risk to future editors.
3. Deliberate content restraint: a coach-brief filler line ("Ready when you are" as both headline and body) was removed by founder decision because it was "a content-free card under the hero."
4. Same `buildCoachLedger`/`useWeeklyStreak` view-models are reused verbatim across Home, You, and Progress surfaces specifically so counts can never disagree between screens.
5. Founder-dated design decisions are cited inline throughout (e.g. "founder 2026-06-30", "D7", "NAV-4") giving strong traceability from code back to product rationale.

**Rough edges (factual):**
1. HomeScreen.js is 3,048 lines — a single monolithic screen component handling ~15 independent banner/loader concerns.
2. `WhatsNewSheet.js` has a stale/orphaned comment block: the app version (1.2.0) hasn't bumped even though 5+ shipped features are undocumented in it, and the code explicitly says a wrong version guess "silently never fires."
3. No `useMemo`/`React.memo` in HomeScreen despite substantial derived-state computation (banner priority sorting, readiness summary, coach brief) re-run every render.
4. Two hardcoded "safety-net" reload timers (+3s, +10s) after every sign-in run unconditionally as a workaround for a cloud-sync race rather than an event-driven completion signal.
5. `loadWeekStats()`'s deload computation hardcodes several unused/placeholder metrics (`weeksSinceLastDeload: 99`, `avgJointDiscomfort: 0`, `hasOverMRV: false`, `avgSoreness: 0`) with a comment "not tracked in local DB" — the deload-suggestion signal is running on partially-stubbed inputs.
