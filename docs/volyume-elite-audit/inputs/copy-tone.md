# Volyume Elite Audit — Copy, Messaging & Emotional Tone (O3)

AUDIT ONLY. Read-only. Evidence + options, no copy finalised. Standard used:
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (calm, plain, no shame, no clipped
commands, numbers-before-narrative, honesty test, British English, no em dash).

## Exec summary (10 lines)

1. The app's voice is, on the whole, unusually disciplined: no dark patterns,
   no shame/streak-guilt, no bro-speak, no em dashes, no exclamation marks in
   screen copy, British spelling holds (US spellings live only in RN property
   names, which CLAUDE.md permits).
2. The strongest work is the safety/coaching register and the reassurance copy
   (subscription, privacy, "No card. Nothing charged"). Protect these verbatim.
3. The single biggest tone gap is at FAILURE moments: error toasts/alerts drop
   into clipped system-speak ("Couldn't log", "Try again.", "Cannot remove"),
   breaking the calm register exactly when a user is already frustrated.
4. The second gap is EMPTY STATES: a cluster state absence coldly ("No data",
   "No data found", "No entries yet") instead of teaching/inviting.
5. Term drift is real in user-facing copy: session / workout / routine are used
   interchangeably; plan / programme / routine overlap.
6. Person is mostly consistent (Precision Coaching + "you"), with a few
   marketing-"we" leaks that are permitted but sit oddly beside engine copy.
7. Notifications are a highlight: calm, low-pressure, opt-out in tone, ED-safe.
8. Paywall/trial copy is honest and pressure-free; no fear-of-loss or fake
   urgency found anywhere.
9. Emotional high moments mostly land (PR celebration, streak milestones), but
   celebration is thin outside PRs and the first session.
10. No P0 trust-damaging copy found. Breaches are P1 (register) and P2 (drift).

Severity counts: P0 = 0 · P1 = 4 · P2 = 5 · P3 = 3.

---

## 1. Register drift (voice breaches)

### F-01 · Failure-moment copy drops into clipped system-speak
Area: Train / Cardio / global errors · Severity: **P1** (major tone breach)

Evidence:
- `src/screens/LogCardioScreen.js:138` — `appAlert('Couldn\'t log', 'Try again.')`
- `src/screens/ActiveWorkoutScreen.js:494` — `appAlert('Cannot remove', 'This is the only exercise in your session.')`
- `src/screens/ActiveWorkoutScreen.js:1408` / `:1433` — `'Couldn\'t delete set', 'That set couldn\'t be removed. Please try again.'`
- `src/screens/FirstRunScreen.js:49` — `appAlert('Something went wrong', e?.message ?? 'Try again.')`
- `src/screens/WorkoutSummaryScreen.js:718` — `toast.show('Could not save template. Try again.', ...)`
- Pervasive pattern `"Couldn't X, try again"` across `PlansScreen`, `BuildWorkoutScreen`,
  `RoutineDetailScreen:303`, `PlanLibraryScreen`, `MealPlanScreen` (10+ instances).

Voice conflict: "Cannot remove" and bare "Try again." are clipped commands /
cold system register (Failure-mode catalogue bans the clipped-command voice;
COACHING_VOICE §Voice rules: "no clipped commands"). "Something went wrong" +
raw `e.message` is the exact cold-system-speak the brief flags.

User impact: at a frustration moment the app sounds like an OS error, not a
calm coach. Erodes the warmth built elsewhere.
Business impact: failure moments are disproportionately remembered; churn
literature (Kidman 2024, cited in the locked doc) ties tone to abandonment.
Complexity: **M** (many call sites, but mechanical + a shared helper).
Rewrite directions:
- (a) Convert titles from commands to plain observations ("That didn't log",
  "This is your only exercise") and bodies to a calm next step without the
  imperative full-stop clip.
- (b) Introduce a small shared error-copy map so 10+ "Couldn't X, try again"
  toasts share one warmer, consistent template.
- (c) Never surface raw `e.message` to users (FirstRun:49, several
  `e?.message ?? ...` toasts); keep it in `logError` only.

### F-02 · Marketing-"we" leaks into engine-adjacent surfaces
Area: Paywall / Photos / Partners · Severity: **P2** (drift)

Evidence:
- `src/screens/PaywallScreen.js:130` — `'Nothing to restore', 'We could not find an active subscription on this Google account.'`
- `src/screens/ProgressPhotosScreen.js:407-408` — `'...We never upload or sync your photos...'`
- `src/screens/PartnerScreen.js:393` — `'We could not record your agreement to share. Please try again.'`

Voice conflict: "we" for the Volyume team/policy IS permitted (locked doc §1),
so these are not violations — but they sit beside Precision-Coaching-voice and
impersonal system copy with no consistent rule for when "we" appears. Reads as
three authors.
User impact: low individually; cumulatively the narrator identity wobbles.
Business impact: minor.
Complexity: **S**.
Rewrite directions: (a) decide one rule — "we" only for team/policy/privacy,
impersonal elsewhere — and align these three; (b) leave privacy "we" (it is the
warmest, most human place for it) and de-"we" the two error strings.

## 2. Term consistency — drift table

| Concept | Names found in user-facing copy | Evidence |
| --- | --- | --- |
| A logged training bout | **session** ("Your sessions will appear here" `WorkoutHistoryScreen:674`; "the only exercise in your session" `ActiveWorkoutScreen:494`) vs **workout** ("Couldn't start workout" `PlansScreen:256`; "Workout deleted." `WorkoutHistoryScreen:175`; "Workout Templates" `WorkoutSummaryScreen:716`) | mixed |
| A saved template of exercises | **routine** ("Swap this exercise in the routine?" `RoutineDetailScreen:232`; "future sessions of this routine") vs **workout** vs **plan** | `RoutineDetailScreen:232-233` |
| A multi-week structure | **plan** ("No active plan yet" `PlansScreen:757`) vs **programme** (internal `programmeId`, surfaces in division naming) vs **routine** | `PlansScreen:757`, `RoutineDetailScreen:157` |
| Recording bodyweight | **weigh-in** (`CoachOutputScreen:2383`), **weight**, "log today's weight" (notifications) — reasonably consistent | scheduler.js |
| Accountability peer | **partner / training partner** consistently; **no "buddy"** anywhere | `PartnerScreen`, `partnerBeats.js` |

Finding F-03 · Session / workout / routine used interchangeably
Area: Train · Severity: **P2** · Complexity: **M**
User impact: a beginner cannot tell whether "session", "workout" and "routine"
are the same thing; undermines the plain-language rule.
Business impact: confusion on the core free surface (the app's front door).
Rewrite directions: (a) pick one user-facing word per concept (candidate:
"session" = the live/logged bout, "workout" = the saved template, "plan" = the
multi-week structure) and normalise; (b) at minimum stop calling the same
object a "routine" in one dialog and a "workout" in the next screen; (c) keep
"partner" as-is — it is already clean. NOTE: partner term is already good.

## 3. Alerts + toasts — tone inventory (top 10 worst)

Most dialogs are calm and actionable (e.g. `PartnerScreen:422` "End
partnership? Sharing will stop right away and everything you shared will be
deleted." is excellent). The worst offenders are the terse error paths:

1. `LogCardioScreen.js:138` — "Couldn't log" / "Try again." — bluntest in app.
2. `ActiveWorkoutScreen.js:494` — "Cannot remove" — clipped command title.
3. `FirstRunScreen.js:49` — "Something went wrong" + raw error message.
4. `WorkoutHistoryScreen.js:126` — "Couldn't repeat session. Try again."
5. `SettingsDisplayScreen.js:46` — "Reload failed" / "Close and reopen Volyume to apply the change." (asks the user to do the app's job).
6. `SettingsDataScreen.js:164` — "Backup failed" + raw `e?.message`.
7. `PaywallScreen.js:103` — "Purchase did not complete" / "Try again or pick a different option." (acceptable but terse at a money moment).
8. `MealPlanScreen.js` (×10) — "Couldn't build/refresh/swap... Try again." repetition reads robotic in aggregate.
9. `ProGoalSetupScreen.js:356` — "Goal and targets saved, but the plan didn't reroll (${error}). On Home, tap Build my plan to retry" — leaks an error code into copy.
10. `SettingsHealthScreen.js:203` — "Sync failed. Check your Health connection." — blames the connection curtly.

Best-in-class dialogs to protect: `PartnerScreen:422`, `:440` (calm, complete,
reassuring); `ProgressPhotosScreen:301` "Add a photo / Stored only on this
device."; `ActiveWorkoutScreen:2664` "Discard workout? / All logged sets will
be lost." (honest, no drama).

Complexity to fix cluster: **M**. Directions as F-01.

## 4. Empty states + nudges

### F-04 · A cluster of empty states state absence instead of teaching
Area: global · Severity: **P1**

Worst (cold, teach nothing):
- `src/screens/CoachReviewScreen.js:37` — `default: return 'No data'`
- `src/screens/BlockReflectionScreen.js:127` — "No data found"
- `src/screens/CoachHeldHistoryScreen.js:183` — "No entries yet"
- `src/screens/ProgressPhotosScreen.js:476/499` — "No photos on this device." / "No photos with this pose yet."
- `src/screens/AnalyticsScreen.js:849` — "Nothing logged this week yet."
- `src/screens/DiaryScreen.js:1109` — "Nothing logged this day."

Best (teach + invite, protect these):
- `src/screens/WorkoutHistoryScreen.js:674-675` — "Your sessions will appear here" (+ illustration + subtext).
- `src/screens/ActiveWorkoutScreen.js:3332-3333` — "Add your first exercise" / "Search the exercise library to get started".
- `src/widgets/widgets.js:73` — "No plan scheduled. Build one in Plans." (states absence AND the way forward).
- `src/screens/PlanPreviewScreen.js:44` — "No card. Nothing charged unless you choose." (reassurance as empty/finction copy).

User impact: bare "No data" reads as a dead end on surfaces (analytics,
coaching history) where a first-time user most needs orientation.
Business impact: empty states are onboarding surfaces; absence-only copy
depresses activation.
Complexity: **S-M** (localised text changes).
Rewrite directions: (a) every "No data" gets a one-line "what will appear here
and how to make it appear"; (b) match the tone already set by
WorkoutHistory/widgets; (c) keep them short — teach, don't lecture.

## 5. Notifications (`src/lib/notifications/`)

Assessment: **a highlight of the app.** Calm, low-pressure, consistently
opt-out in tone, ED-safe. A tired user at 9pm would feel invited, not nagged.

Protect verbatim:
- `scheduler.js:85` — "When you get a moment, pop on the scales and log the number. That's all for now."
- `scheduler.js:165` — "If you haven't caught today's weight yet, there's still time. No worries either way."
- `scheduler.js:292` — "A gentle reminder to log it if it helps. No pressure."
- `missedCheckin.js:30-31` — "Your check-in is ready when you are" / "It takes about two minutes."
- `scheduler.js:450-451` (trial-ending) — "Hope you've been enjoying it. Have a look at your options whenever you're ready." (zero urgency on a monetisation push — exemplary).
- `scheduler.js:454-455` — "You're back on the free plan / Everything you've logged is safe and waiting."

ED-safety note (LOCKED suppression is out of scope to change): the strings that
DO send are unambiguously safe in tone. The weigh-in nudges are framed around
"the number / the scales" with explicit no-pressure outs and never attach worth
or judgement to the value. `partnerBeats.js` cheer copy ("They can see your
week is being kept") is neutral and non-comparative. No motivational-filler or
weight-praise leaks in the sending strings. No change recommended here beyond
protecting them.

Minor P3 (F-05): `trainingReminders.js:192` "Today's a training day" and
`restEnd.js:60` "Rest done" are terser than the weigh-in family; harmless but
slightly less warm. Optional alignment only.

## 6. Paywall / trial / billing

Assessment: **honest and calm; no dark patterns found.** No countdown timers,
no "last chance", no fear-of-loss, no fake urgency. Consistent with the locked
Surface 2/5 redrafts.

Protect:
- `PaywallScreen.js:188` — "Pro is the coach" (confident, honest, not hype).
- `PaywallScreen.js:190` — "Pro reads your training, weight, and food together
  and adjusts your plan and targets every week, with a written reason for every
  change." (value stated in mechanism, not adjectives).
- `PaywallScreen.js:171-175` — auto-renew/cancel disclosure is plain and complete.
- `SubscriptionPolicyScreen.js:74` — "Nothing you've logged disappears. Every
  workout, every PR, every check-in stays on your phone exactly as you left it."
  (best reassurance line in the app).
- `WelcomeScreen.js:165` — "No ads, ever."

F-06 · "Save {n}%" badge — the one place near a sales register
Area: Paywall · Severity: **P3 (nit)**
Evidence: `PaywallScreen.js:224` — `Save {annualSavingsPct()}%` badge.
This is legitimate (annual genuinely saves) and not fake urgency, but the
all-caps micro-badge is the single most "app-store" element on an otherwise
calm surface. User/business impact low. Direction: (a) keep — it is honest and
users expect it; (b) if softening, present as plain text ("Annual saves X%")
rather than a coloured badge. Founder call, not pre-decided.

## 7. Emotional high moments

### F-07 · Celebration lands for PRs and first session but is thin elsewhere
Area: Progress / milestones · Severity: **P2**

What already rises to the moment (protect):
- `src/components/PRCelebration.js:274-289` — "PERSONAL RECORD" + "+X% over your
  previous best" + confetti + haptic ladder. Genuinely celebratory.
- Honesty done right: `PRCelebration.js:119-120,138-141` — a first-ever lift is
  explicitly NOT dressed as a record ("First lift logged", quiet toast, no
  confetti). This is the honesty test applied to celebration. Excellent, keep.
- `src/screens/AnalyticsScreen.js:40-45` — streak milestone copy: "4 weeks of
  showing up.", "12 weeks of showing up. That's a habit.", "A year of showing
  up. Few do that." Warm, restrained, no comparison/rank. Model lines.
- `src/screens/WorkoutSummaryScreen.js:447` — "Your first session is done, and
  that's the hard part over." (warm, earned).
- `WorkoutSummaryScreen.js:694` — block completion "A full training block,
  recovery week and all."

Where deserved celebration is missing / flat:
- Block/mesocycle completion and week-completion beats are mostly a single
  caption; compared with the PR moment they under-celebrate a bigger
  achievement.
- Analytics/Consistency milestones live as a small strip row
  (`AnalyticsScreen:445-447`) rather than a moment.
- The all-caps "PERSONAL RECORD" (`PRCelebration.js:274`) is the app's only
  shouting copy; it works here but note it as the ceiling — do not let all-caps
  spread to other surfaces.

User impact: the emotional arc peaks at the single-set PR and is comparatively
muted at the harder-won weekly/block milestones.
Business impact: milestone moments drive retention and sharing; flat treatment
leaves engagement on the table.
Complexity: **M** (design + copy, not just strings).
Rewrite directions: (a) give week/block completion a copy beat proportional to
effort, in the same restrained "showing up" register (never hype); (b) keep the
data-referenced honesty rule — celebrate the logged fact, not an inferred
feeling; (c) reserve confetti/all-caps for genuine records; use warm plain copy
for consistency milestones.

## 8. Micro-trust (privacy-adjacent copy)

### F-08 · Progress Photos privacy note — assessment of current wording
Area: Progress Photos · Severity: **P3 (already good; minor polish)**
Evidence: `src/screens/ProgressPhotosScreen.js:407-408` —
"Private to this device. We never upload or sync your photos, and nothing is
shared unless you choose to." (ED-variant adds: "Use these only if they help
you, and skip them if they do not.")
Assessment: this is plain-English, reassuring, and specific — a good rewording.
The ED-sensitive variant is a thoughtful, non-clinical addition. Keep.
Minor: `:301` "Stored only on this device." and `:483` "Private to this device,
at your own pace." repeat the promise in three slightly different phrasings;
optional to standardise the exact wording so the promise reads identical
everywhere (trust copy benefits from verbatim repetition).

### F-09 · Partner sharing consent copy is plain and calm
Area: Partners · Severity: nil (protect)
Evidence: `PartnerScreen.js:422` "Sharing will stop right away and everything
you shared will be deleted."; `PartnerScreen.js:393` records the agreement to
share explicitly. Plain, reassuring, no legalese. Keep.

## What is already good (protect verbatim)

- Notification family: `scheduler.js:85,165,292`, `missedCheckin.js:30-31`,
  `scheduler.js:450-455` — calmest push copy tone in the category.
- `SubscriptionPolicyScreen.js:74` — the data-safety reassurance line.
- `PaywallScreen.js:188-190` — honest, mechanism-based Pro value.
- Streak milestones `AnalyticsScreen.js:40-45` — restrained pride, no rank.
- PR honesty `PRCelebration.js:119-120,138-141` — first lift never faked as a record.
- `PlanPreviewScreen.js:44` "No card. Nothing charged unless you choose."
- `WelcomeScreen.js:165` "No ads, ever."
- `PartnerScreen.js:422,440` — model confirm-dialog copy.
- Compliance: no em dashes in user-facing copy (only in test comments); no
  exclamation marks in screen strings; British spelling holds.

## Scope cuts (runtime honesty)

- Sampled heavily but not exhaustively: ~30 screens + all notification modules +
  key components read in full; remaining screens sampled via grep of quoted
  strings, alerts, toasts and empty states rather than full reads.
- Did not read every WHY_LIBRARY / `weeklyCoach.js` engine output string line by
  line (Surface 8 territory) — spot-checked via CoachOutput/CoachReview only;
  a dedicated engine-copy pass is worth a follow-up.
- Share-card / BeforeAfter on-card copy assessed via component/screen names and
  surrounding copy, not pixel-level render.
- Severity is copy-tone only; did not assess layout/visual weight of moments
  beyond where copy depends on it (F-07).
