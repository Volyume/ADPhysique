# r-13 — Notifications & re-engagement (external research)

ULTIMATE-APP MANDATE, Phase 2, Area 13. Best-in-class research against a-13
(`audit/a-13-notifications.md`). British English. Not committed.

**Tooling proof (VERIFICATION PROTOCOL §1).** End-to-end WebFetch verified on
the official Duolingo engineering blog, *How the Duolingo Owl Decides What
Notification To Send* — verbatim: *"Bandit algorithms are a form of AI where an
algorithm must repeatedly choose between the same set of options, and it
gradually learns from past decisions which options are best."* and *"We had to
explicitly teach the AI algorithm that learners don't like seeing the same
notification too often by demoting reminders that have already been seen
recently."* and *"We started by collecting data: the results of ~200 million
practice reminders sent over a 34-day period."*
Source (fetched): https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/

Citation rule applied throughout: load-bearing claims carry 2+ sources; vendor/
single-blog claims are flagged; the specific "Duolingo stops after exactly 7
days" folklore is marked UNVERIFIABLE (see §1). Failed fetches logged in §9.

---

## 0. The question a-13 actually poses

a-13 found Volyume's notification system is **tonally excellent but mechanically
half-wired**: 14 push surfaces, a real hard budget (2/day, 8/week), ED-safe
silence rules, named warm British copy — but training-day reminders are
*un-armable* (no day picker, no `SCHEDULE_KEY` writer), two surfaces are dead
code, several taps dead-end, quiet hours has no UI, and the onboarding
permission ask is conditional. The external question is therefore narrow and
practical: **how do the best practice/habit/coaching apps (a) arm a recurring
day-based reminder, (b) prime the permission ask, (c) respect quiet time, (d)
time the daily report, (e) re-engage after a lapse — and crucially when do they
STOP.** That last one is the respect signal, and it is where Volyume already
has the strongest instinct in the market.

---

## 1. Duolingo — the canonical practice-reminder system

**Verified base** (`val-ext-04-05-07.md`, re-confirmed this session): the bandit
model is real and published (KDD 2020); 600+ streak A/B tests verified; Friend
Streak +22% daily-completion verified; "~70% of DAU carry a >7-day streak"
verified (Q3 FY22/FY23 SEC letters); DAU >50M (Q3 2025). The quantified
retention folklore (churn 47→28, Streak Freeze −21%, widget +60%, 17.19 vs
11.62 days) **did not survive** earlier verification — do not reuse.

**How the reminder is timed and armed — the headline finding.** Duolingo has
*moved away from user-picked reminder times toward learned behavioural
triggers.* From the deconstructoroffun mechanics teardown (fetched), verbatim:
*"Earlier versions of the system asked users to pick their own reminder time,
and the result wasn't users getting their preferred time — it was users missing
their notifications because, as the team has put it, 'life always gets in the
way.'"* and *"Routine notifs read the user's revealed habit window: they
practiced at 6pm yesterday, the push fires at 5:30pm today."* and *"Every push
has to clear a behavioral or state trigger to fire — there are no scheduled
broadcasts."*
Source (fetched): https://duolingo.deconstructoroffun.com/mechanics/notifications
Second source (the ML mechanism that powers it — recency penalty / "recovering
arm" / forgetting-curve spacing): https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ (fetched, quoted above).

> **Hard constraint note for Volyume.** Duolingo's *learned* timing is a
> machine-learning bandit. Volyume's engine is **deterministic, no-AI** (SACRED
> RULE). So the *learned habit-window* model is OFF-LIMITS as built. The
> pick-up for Volyume is the **deterministic cousin**: a user-set day+time
> (which Duolingo found fragile alone) PLUS same-day suppression when the act is
> already done (which Volyume already has, `handler.js`). That combination —
> explicit schedule + "don't fire if already done today" — is the deterministic
> approximation of Duolingo's behavioural trigger, and a-13 shows Volyume is one
> day-picker away from it.

**The "stop" rule — the respect signal.** Duolingo's persona escalates guilt
after lapse ("Some people just aren't language learners", "We'll stop sending
you these reminders soon") and then *actually stops*. Two points must be split:
- **VERIFIED (direction):** Duolingo escalates after inactivity and eventually
  ceases reminders; the "we'll stop sending these reminders" message is widely
  documented. (medium/milessightings, fetched: *"'We'll stop sending you these
  reminders soon' is mentioned as part of Week 4's approach"*; webdesignerdepot
  corroborates the persona.) Sources:
  https://medium.com/@milessightings/i-reverse-engineered-duolingos-guilt-algorithm-6ddf598d2a72
  ; https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/
- **UNVERIFIABLE (the exact "7 days" figure).** The brief's "stop-after-7 rule"
  could not be confirmed to a primary. Observers variously report the *first*
  reminder at ~2–3 days of inactivity and the reverse-psychology/stop phase at
  ~week 4. No Duolingo primary states a hard 7-day cessation. **Treat the
  *principle* (escalate, then stop, and SAY you're stopping) as the transferable
  asset; do not quote a day count.** Logged per protocol.

**Persona vs reality.** The "passive-aggressive Duo" is a *brand/meme layer* on
top of the bandit; the bandit itself optimises for lesson completion, not guilt.
Volyume's no-shame copy is the deliberate *opposite* of the meme — and the
verified harm literature (Sheen 2025, BJHP — notification irritation and shame
drive abandonment) says Volyume's posture is the correct one for a product with
an ED safety system. **Do not import the guilt persona. Import the
escalate-then-stop *structure* with warm copy.**

---

## 2. Per-app findings (timing · arming · permission · quiet hours · settings · re-engagement/stop · tap)

### 2.1 Headspace — mindful-nudge archetype
- **Timing/arming:** user sets a meditation reminder time; plus "Mindful
  Moments", 1–5 gentle messages spread across the day. Reminders are "carefully
  timed and tailored to each individual's preferences and habits."
- **Tone:** non-coercive, metaphorical, never a command — e.g. *"How you're
  breathing is often how you are feeling."*, *"What's your positive intention
  for the day?"* (verbatim, ngrow teardown, fetched).
- **Re-engagement:** habit/badging mechanics, low-pressure; positions app as
  companion not nag.
- Sources: https://www.ngrow.ai/blog/8-push-notifications-from-headspace-that-will-help-you-cultivate-mindfulness (fetched) ; https://taplytics.com/blog/headspace-sends-push-notifications-with-prompts-to-help-users-become-more-mindful/ (search-confirmed; direct fetch redirect-looped — see §9).
- **Relevance:** Headspace's tone is the closest market analogue to Volyume's
  already-named warm copy. Validates Volyume's voice; offers little new
  mechanically. The *frequency dial* (let the user choose 1–5/day intensity) is
  a granularity idea Volyume lacks.

### 2.2 Apple Fitness / Activity — coaching notifications + customisation
- **Surfaces (5 toggles, verbatim from search-confirmed Apple support):** Stand
  Reminders, Daily Coaching, Goal Completions, Special Challenges, Activity
  Sharing Notifications.
- **Timing:** Stand reminder fires at *50 minutes past the hour* if the stand
  goal isn't met that hour; Daily Coaching fires *contextually* ("when you're
  getting close to" a goal) — event-triggered, not scheduled. User can set
  preferred times for reminders / coaching tips / evening wrap-up
  (Summary → Activity → Reminders).
- **Settings granularity:** each of the 5 is an independent toggle — the gold
  standard for per-category control.
- Source: https://support.apple.com/guide/iphone/change-fitness-notifications-iph5f0e22170/ios (search-confirmed; full body JS-rendered, §9) ; https://support.apple.com/en-gb/guide/watch/apd3bf6d85a6/watchos (fetched — confirms Daily Coaching toggle + "lets you know if you're on track or falling behind").
- **Relevance:** the **per-category independent toggle set** is exactly what
  Volyume's `categories.js` already supports under the hood but doesn't fully
  expose (no partner toggle UI, no quiet-hours UI). Apple proves users *expect*
  one switch per notification *type*, not one master switch.

### 2.3 Whoop — daily report timing
- **Timing:** the morning Journal prompt and **Daily Outlook** appear
  *automatically after sleep is processed* — i.e. event-triggered on a data
  milestone, not a fixed clock time. Weekly guidance + accountability via the
  Weekly Plan.
- **Re-engagement:** conversational pushes keyed to what the user logged
  (work-stress follow-up, travel prep) — i.e. state-triggered, contextual.
- Source: https://www.whoop.com/us/en/thelocker/new-ai-guidance-from-whoop/ (search-confirmed) ; https://support.whoop.com/ (Day in Review / morning Journal, search-confirmed).
- **Relevance:** the *"fire the report when the data is ready, not at a guessed
  time"* pattern. Volyume's weekly coach-ready is laid Monday 09:00; the Whoop
  model suggests firing it when the *check-in/processing* completes instead —
  Volyume already half-does this (coach-ready only laid on check-in submit,
  a-13 §1.3). Confirms Volyume's instinct.

### 2.4 Garmin — morning report (the cleanest day/time arming model)
- **Timing:** the Morning Report fires inside a window *1 hour before/after the
  user's pre-defined sleep wake-up window* set in Garmin Connect. So timing is
  *derived from a thing the user already configured* — not a separate alarm.
- **Arming/granularity:** Show Report on/off; **Edit Report** to choose the
  order and type of data shown. Configurable on-watch *and* in Connect.
- Source: https://www8.garmin.com/manuals/webhelp/GUID-EECCAC99-90D6-4AB1-9A3A-EC433D3365E2/EN-US/GUID-4D26FDDC-63BD-4910-95B8-98937FEC2545.html (Morning Report manual, search-confirmed across fenix 7/8, vivoactive 5/6 manuals) ; https://gadgetsandwearables.com/2022/08/01/garmin-morning-report/ (corroborating explainer).
- **Relevance:** **best-in-class arming UX** — derive the report time from a
  schedule the user already owns, and let them edit *content*. Volyume's morning
  weigh-in (07:00 fixed-ish) could derive from the user's logged wake/training
  pattern, and a "what's in it" edit is a granularity idea Volyume lacks.

### 2.5 Strava — group/social push granularity
- **Settings:** per-type push toggles (You → Settings → Push Notifications) for
  kudos, comments, new activities, etc.; **per-club** override (all posts /
  announcements only / off) reached from the club's gear icon.
- **Re-engagement risk:** Strava also sends "motivational"/"activity logged"
  pushes that users actively seek to mute — a documented irritation (community
  threads). And the **Dec 2025 paywalling of Year-in-Sport** caused severe
  backlash (val-ext §V9) — a re-engagement artefact, re-gated, backfired.
- Source: https://support.strava.com/hc/en-us/articles/216918367-Strava-Notifications (search-confirmed) ; https://communityhub.strava.com/strava-features-chat-5/how-to-remove-mute-motivational-messages-from-strava-502 (irritation, search-confirmed).
- **Relevance:** two lessons — (1) **per-source granularity** (Volyume's partner
  pushes should have the per-partner-equivalent toggle a-13 gap #6 flags);
  (2) **don't bolt on motivational spam** — Strava's muted "motivational"
  messages are exactly the genre Volyume's budget + no-marketing stance already
  forbids. Volyume is *ahead* on (2).

### 2.6 Peloton — streak/class reminders (user-armed schedule)
- **Arming:** the user *signs up for a class* and gets **both a calendar alert
  and an app push** reminding them — an explicit, user-chosen, day/time-anchored
  reminder. **Stacks** auto-remind of the next class when one ends.
- **Milestone reminders (2024):** alerts for upcoming streaks, weekly-activity
  targets, workout-count milestones, and user-set goals — surfaced top of home.
- **Streak rule:** daily streak resets on a missed day; **weekly streak resets
  after 7 consecutive skipped days (Mon-anchored)** — note the Monday anchor,
  same as Volyume's budget week.
- Source: https://support.onepeloton.com/hc/en-us/articles/360051054031-Scheduling-Workouts (search-confirmed) ; https://www.pelobuddy.com/app-milestone-reminders/ (milestone reminders, search-confirmed) ; https://www.onepeloton.com/blog/secret-to-workout-streaks (streak reset rules, search-confirmed).
- **Relevance:** **directly answers a-13's central gap.** Peloton's
  *user-schedules-a-session → gets a reminder* is precisely the training-day
  arming model Volyume is missing. The mechanism is: pick the session/day, the
  reminder is armed from that pick. Volyume has the plan/schedule data; it just
  never writes `SCHEDULE_KEY.days` from it.

### 2.7 MacroFactor — check-in nudges (user-picked day, dismissible)
- **Arming:** check-ins are **weekly and the user chooses the check-in day**.
  An available check-in shows as a *small alert on the Strategy tab* — i.e. an
  in-app badge, not necessarily a loud push.
- **Respect mechanic:** a check-in can be **dismissed/silenced** and the panel
  later *reminds* you of the dismissed check-in — gentle re-surfacing, no
  penalty. Coaching modules explicitly designed to be *"meaningfully impactful
  and minimally disruptive."*
- Source: https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules (search-confirmed) ; https://macrofactor.com/dashboard-revamp/ (search-confirmed).
- **Relevance:** validates Volyume's weekly check-in *user-picks-the-day* model
  (a-13 §2.2 — already shipped on the Pro screen). The **dismiss-then-gently-
  re-surface** pattern is a softer alternative to Volyume's missed-check-in
  push, and the *"minimally disruptive"* philosophy mirrors Volyume's budget.

### 2.8 Noom — daily lesson cadence
- **Cadence:** one bite-sized lesson per day under "Today's Plan"; reminders are
  customisable and reschedulable; **missed lessons can be rescheduled without
  penalty** ("maintains engagement without creating additional stress").
- Source: https://www.noom.com/support/faqs/using-the-app/daily-features/2025/10/how-to-find-and-revisit-your-noom-lessons/ (search-confirmed) ; https://www.noom.com/lose-weight/ (search-confirmed).
- **Relevance:** the **no-penalty reschedule** is the same no-shame principle
  Volyume encodes (banned word "missed", zeros never shown). Confirms direction.

### 2.9 Oura — quiet insights + Rest Mode (the recovery-silence parallel)
- **Surfaces (5, restrained):** low battery, inactivity alerts, activity
  progress, bedtime, and **new-insight/weekly-summary** notifications. Bedtime
  guidance fires *1 hour before* the *derived* ideal bedtime.
- **Rest Mode:** on rest/illness/injury days, **activity goals/score and
  activity nudges are disabled**; insights re-tuned toward recovery.
- Source: https://support.ouraring.com/hc/en-us/articles/360025579173-Managing-Your-Notifications (search-confirmed) ; https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode (search-confirmed).
- **Relevance:** **Rest Mode is the market's closest analogue to Volyume's ED-
  flag silence** — a *named, user-or-state-triggered mode that suppresses
  performance nudges.* Volyume's silence is automatic (ED flag) and stricter;
  Oura's is partly user-invokable. A *user-invokable* "quiet/rest" mode
  (distinct from the ED system, which stays untouchable) is a granularity
  pick-up. Bedtime timing again shows the *derive-from-existing-schedule*
  pattern (Garmin, Whoop).

### 2.10 Finch / habit apps — the gentle-accountability archetype
- **Philosophy:** *non-punishing.* The companion "simply waits for you to return
  and continues growing whenever you're ready"; "accountability without shame";
  no negative enforcement even after a week away.
- **Copy:** supportive, never pushy — *"Time to take your meds, you've got
  this!"*, *"Don't forget to hydrate!"* — "just enough to help, never enough to
  overwhelm."
- Source: https://www.autonomous.ai/ourblog/finch-self-care-app-review-full-breakdown (search-confirmed) ; https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review (search-confirmed).
- **Relevance:** Finch is the *anti-Duolingo* and the **closest spiritual match
  to Volyume's no-shame stance.** It proves a gentle archetype retains. Volyume
  already lives here on tone; Finch's "the pet just waits, no penalty" is the
  emotional model for Volyume's win-back framing ("everything you've logged is
  safe and waiting" — already shipped, a-13 §1.8).

### 2.11 OS-level — Android channels & iOS permission/Focus
- **Android channels (VERIFIED, official):** *"Starting in Android 8.0 (API
  level 26), all notifications must be assigned to a channel."* *"After you
  create a notification channel, you can't change the notification behaviors.
  The user has complete control at that point."* *"The user interface refers to
  notification channels as 'categories.'"* Users set importance/sound per
  channel; the dev cannot override.
  Source (fetched): https://developer.android.com/develop/ui/views/notifications/channels
- **iOS permission priming (VERIFIED direction):** ask *in context* when the
  user hits the feature, never at cold launch; a pre-permission "soft ask"
  educates and *preserves the one-shot system prompt* (iOS shows it once ever);
  provisional authorisation (iOS 12+) delivers quietly to Notification Centre
  with no prompt. Grant rates rise materially when the user triggers the prompt
  in-context. (Note one contrarian source: pre-prompts don't always beat the
  raw system dialog.)
  Source: https://www.appcues.com/blog/mobile-permission-priming (search-confirmed) ; https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications (title-confirmed only; JS body, §9).
- **Relevance:** (1) Volyume already uses Android channels well (3 channels) —
  this is a *strength*, and the right move is **more channels** (one per warm
  category) so users get per-type OS control "for free". (2) iOS priming
  directly addresses a-13 gap #8: Volyume's onboarding ask is *conditional*
  (declining both coaching reminders → never prompted → cascade/trial/win-back
  silently have no permission). The fix is a single in-context primer that
  arms permission for *all* event pushes regardless of which habit toggles are
  chosen, **plus provisional authorisation** as a no-prompt fallback so quiet
  surfaces (recap, year-of-lifts) can still land.

---

## 3. (a) Winner patterns — the transferable best-in-class set

| # | Pattern | Best exemplar(s) | Source |
|---|---|---|---|
| W1 | **User-armed session reminder** (pick the day/session → reminder armed from that pick) | Peloton (class sign-up → calendar+push), MacroFactor (pick check-in day) | onepeloton support; macrofactorapp help |
| W2 | **Derive timing from a schedule the user already owns** (don't add a new alarm) | Garmin (wake window), Oura (bedtime), Whoop (after sleep processed) | garmin manual; ouraring support; whoop locker |
| W3 | **Fire the report when the data is ready**, not at a guessed clock time | Whoop (post-sleep), Apple (contextual Daily Coaching) | whoop support; apple support |
| W4 | **Per-category independent toggles** = one switch per notification *type* | Apple Fitness (5 toggles), Strava (per-type + per-club), Android channels | apple support; strava support; developer.android.com |
| W5 | **Escalate after lapse, then STOP — and say you're stopping** | Duolingo (reverse-psychology cessation) — *structure only, not the guilt* | deconstructoroffun; blog.duolingo.com |
| W6 | **No-penalty reschedule / dismiss-and-gently-resurface** | Noom (reschedule), MacroFactor (dismiss → reminder panel), Finch (just waits) | noom support; macrofactorapp; finch reviews |
| W7 | **Permission asked in-context with a value primer; provisional as fallback** | iOS HIG / priming practice | appcues; apple developer docs |
| W8 | **A user-invokable quiet/rest mode** that suppresses performance nudges | Oura Rest Mode | ouraring support |
| W9 | **Frequency-intensity dial** (user chooses how many nudges/day) | Headspace Mindful Moments (1–5/day) | ngrow; taplytics |

---

## 4. (b) Where Volyume already leads — honestly, with evidence

These are real, verified strengths a-13 documents in code. The external scan
confirms most of the market does NOT have them:

1. **A genuine HARD budget cap (2/day, 8/week, Monday-anchored), with priority
   eviction and one-per-topic-per-day.** No researched consumer app exposes or
   enforces a global event budget like this. Apple/Strava/Garmin give per-type
   toggles but no *global ceiling*; Duolingo deliberately maximises volume.
   Volyume's `budget.js` is, on the evidence, **best-in-class and unique.**
2. **ED-safe silence rules baked into scheduling.** Every weight/calorie-adjacent
   push checks the open-ED flag and goes silent; "missed" is banned; zeros are
   never shown. Oura's Rest Mode is the *only* market analogue, and it is
   user-invoked and softer — Volyume's is automatic, deterministic and stricter.
   This is a **category-leading safety posture**, backed by Sheen 2025 (BJHP)
   and the verified harm literature.
3. **Named, warm, British, complete-sentence copy** — the deliberate opposite of
   Duolingo's guilt meme, and the spiritual peer of Finch/Headspace. Backed by
   the autonomy-supportive coaching evidence (Amorose 2007, Zhang 2025).
4. **Collision priority with deterministic eviction** (cascade > coach-ready >
   missed > trial > win-back > …). No researched app publishes a priority lattice
   — most just fire everything. This is engineering maturity others lack.
5. **Fire-on-real-event discipline:** weekly coach-ready only laid when a real
   check-in exists; monthly recap silent on a zero-session month; win-back never
   shows a zero. This matches the *best* of Whoop's "fire when data is ready"
   without any AI.
6. **No marketing, ever; local-only; EU residency; sound requested OFF by
   default.** Strava's muted "motivational" spam is the cautionary tale Volyume
   has already designed out.

**Bottom line:** Volyume's *philosophy and safety engineering* already beat the
field. Its gap is purely **mechanical wiring and settings exposure**, not design.

---

## 5. (c) Ranked pick-ups vs a-13's frictions — for Besa AND Eddie

Ordered by impact. Each maps to an a-13 gap and a §3 winner pattern, and is
checked against the hard constraints (deterministic, ED-untouchable,
free/Pro gating, offline-first, British copy).

### PICK-UP 1 — The training-day **day-picker arming model** (fixes a-13 gap #1, CRITICAL)
*Pattern W1 (Peloton/MacroFactor) + W2 (Garmin derive-from-schedule).*
- **Mechanism:** add the missing day picker to `NotificationSettingsScreen` and
  a `SCHEDULE_KEY.days` **writer**, so toggling "Remind me to train" + picking
  days + time actually arms `scheduleTrainingReminders`. This is the
  single biggest functional win in the area — the code, channel and tests
  already exist (a-13 §1.A); only the writer + picker are missing.
- **Two arming sources, both deterministic:**
  (i) **explicit** — user ticks the days (Peloton model); and ideally
  (ii) **derived** — pre-fill the day set from the user's *training plan
  schedule* (Garmin "derive from what they already own"), which Volyume already
  reads at `HomeScreen.js:463`. Derived-default + user-editable is the
  best-in-class shape.
- **Besa (newbie):** the promised "remind me to train" finally works — the
  silent letdown a-13 §3.1 flags is removed. Gym newbies rely on the nudge most.
- **Eddie (athlete):** wants the nudge on *his* training days only, on his time;
  the day picker gives exact control without spam. Free feature (training is
  free-tier), so no gating issue.
- **Fix the lying helper text** ("the days you want") at the same time.

### PICK-UP 2 — **Unconditional in-context permission primer + provisional fallback** (fixes a-13 gap #8)
*Pattern W7.*
- **Mechanism:** one onboarding/first-relevant-moment primer that, on accept,
  requests permission for **all** push categories — not gated on choosing a
  coaching reminder. Add **provisional authorisation** (iOS) so quiet surfaces
  (recap, year-of-lifts, cascade) can still land silently if the user skips the
  prompt. British value-copy: explain it's local-only, no marketing.
- **Besa:** if she declines coaching reminders she still keeps her trial/cascade
  pushes — currently she silently loses them.
- **Eddie:** provisional delivery means his recap/coach-ready land even if he
  was permission-shy at install.

### PICK-UP 3 — **Per-category settings exposure: quiet-hours UI, partner toggle, more channels** (fixes a-13 gaps #5, #6; pattern W4)
- **Mechanism:** (a) build the quiet-hours UI that `setQuietHours` already
  supports but no screen calls (a-13 §2.6 — currently a fixed 22:00–07:00
  constant with a stale comment); (b) expose the `partnerCheerEnabled` toggle
  (read but never settable in-app, gap #6); (c) split Android channels per warm
  category so users get OS-level per-type control "for free" (Android-channels
  pattern — users already expect "categories").
- **Besa & Eddie both:** control over *when* (quiet hours) and *which*
  (per-type) — the table-stakes granularity Apple/Strava/Garmin all ship and
  Volyume has the plumbing for but doesn't expose.

### PICK-UP 4 — **Route every tap; revive the two dead surfaces** (fixes a-13 gaps #2, #3, #4, #7)
*Not a competitor pattern — table stakes every researched app meets.*
- **Mechanism:** add `morning_weight`, `training_reminder`, `partner_streak`,
  and the server `subscription_*` types to `routeForNotificationType`; wire live
  call-sites for `checkYearOfLiftsUnlock` and `checkMonthlyRecapReady` (built,
  tested, dead). Morning weigh-in is the *most frequent* push and currently
  dead-ends — every other app's daily nudge has a destination.
- **Besa:** taps her daily morning reminder → lands on weight logging (today:
  opens app on last screen).
- **Eddie:** his partner streak-kept and annual recap actually fire and route.

### PICK-UP 5 — **Escalate-then-STOP re-engagement with explicit stand-down copy** (pattern W5/W6, the respect signal)
- **Mechanism:** Volyume already stops the *right* way structurally (win-back is
  single-shot with a 180-day floor; missed-check-in stands down if checked in
  within 72h). The pick-up is to make the *stand-down explicit and warm*, the
  Duolingo *structure* with Finch *tone*: after a defined lapse, one final
  "we'll leave you to it — everything's saved, come back any time" then silence.
  **No guilt, no day-count theatrics** — the opposite of Duo's persona, the same
  respect signal. Also adopt Noom/MacroFactor **no-penalty reschedule/dismiss**
  for the check-in nudge (dismiss → gentle in-app resurface rather than a second
  push).
- **Besa:** if she lapses in week 1, she gets gentle accountability then a clean
  goodbye — not nagging that the harm literature says drives churn.
- **Eddie:** if he's mid-lapse (injury/deload), the explicit stand-down reads as
  respect, not abandonment — and pairs with a future user-invokable quiet mode
  (W8) distinct from the untouchable ED system.

---

## 6. (d) What everyone has that Volyume lacks

1. **A working day-anchored recurring reminder a user can arm.** Peloton,
   MacroFactor, Garmin, Oura, Headspace, Noom all let the user arm a recurring
   reminder on their chosen schedule. Volyume's training reminder is *un-armable*
   (gap #1). This is the one genuine *table-stakes* miss.
2. **A quiet-hours / do-not-disturb UI.** Every OS and most apps expose a
   quiet window; Volyume's is a hard-coded constant with no UI (gap #5).
3. **Per-type settings granularity fully exposed.** Apple's 5 toggles, Strava's
   per-type + per-club, Android's per-channel — all surfaced. Volyume has the
   plumbing (`categories.js`, channels, `partnerCheerEnabled`) but several
   toggles have **no UI** (gaps #5, #6).
4. **Reliable tap destinations for every push.** Standard everywhere; Volyume
   has 4 dead-ends (gaps #2–4, #7).
5. **A "what's in my report" content edit** (Garmin Edit Report) — a nice-to-have
   granularity Volyume's morning/recap pushes don't offer.
6. **A frequency-intensity dial** (Headspace 1–5/day) — minor; Volyume's budget
   already protects volume, so this is low priority.

**What Volyume has that they lack** (mirror of §4): a global hard budget,
deterministic priority eviction, automatic ED-safe silence, and a no-shame voice
backed by the harm literature. The trade is stark and favourable: **Volyume is
ahead on everything that's hard to build and behind only on things that are
straightforward to wire.**

---

## 7. Constraint check (every pick-up cleared)

- **Deterministic / no-AI:** none of the five pick-ups introduces learning or
  randomness. The Duolingo *bandit/learned-timing* model is explicitly NOT
  adopted; its deterministic cousin (explicit schedule + already-done
  suppression) is. ✔
- **ED system untouchable:** the user-invokable quiet/rest mode (W8) is proposed
  as a *separate* surface; the ED flag silence stays exactly as built. ✔
- **Free/Pro gating:** training reminders are free-tier (training is free);
  coaching/check-in/partner stay Pro. No gating line moves. ✔
- **Offline-first:** all arming/scheduling is local (`expo-notifications`); no
  pick-up requires a server. The known win-back v1 limit (never-returning
  segment unreachable without server push) is unchanged and out of scope. ✔
- **British English:** all proposed copy is British, warm, no-marketing. ✔

---

## 8. Cross-references
- a-13 §1.A (training reminder un-armable) ← PICK-UP 1.
- a-13 gaps #2/#3/#4/#7 (dead/unrouted) ← PICK-UP 4.
- a-13 gap #5 (quiet hours no UI), #6 (partner toggle) ← PICK-UP 3.
- a-13 gap #8 (conditional permission) ← PICK-UP 2.
- `val-ext-04-05-07.md` §7(d): notification budget + ghost-prevention KEPT;
  Sheen 2025 / Li 2025 are the citations to use, NOT Duolingo cadence folklore.
- a-12 (partner): `partner_streak` unrouted + partner toggle — confirmed here.
- a-11 (retention): Year-of-Lifts / Monthly recap screens exist; only triggers
  dead — PICK-UP 4 revives them.

## 9. Fetch log (VERIFICATION PROTOCOL §2)
**Successful, load-bearing (quoted in-body):**
- blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ — OK (bandit, recency penalty, 200M/34d).
- duolingo.deconstructoroffun.com/mechanics/notifications — OK (learned habit-window, no scheduled broadcasts).
- developer.android.com/.../notifications/channels — OK (channels = categories, user control).
- support.apple.com/en-gb/guide/watch/apd3bf6d85a6/watchos — OK (Daily Coaching toggle).
- ngrow.ai/.../8-push-notifications-from-headspace — OK (copy examples, tone).
- medium.com/@milessightings/...guilt-algorithm — OK (week-4 stop message; observational, flagged).

**Failed / degraded (logged, not used as primary):**
- support.apple.com/guide/iphone/change-fitness-notifications-iph5f0e22170/ios — body JS-rendered; only nav stub returned. Content recovered via search-confirmed summary; 5-toggle list corroborated by imore + techsolutions. NON-FATAL.
- developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications — title-only (JS body). Substituted appcues priming summary + Apple title confirmation. NON-FATAL.
- developer.apple.com/design/human-interface-guidelines/managing-notifications — title-only (JS body). Not used. NON-FATAL.
- taplytics.com/blog/headspace-... — too many redirects on direct fetch; search-confirmed only. NON-FATAL.
- support.duolingo.com/.../adjust-the-time-of-my-daily-practice-reminder — 301 → /help redirect loop. NON-FATAL (deconstructoroffun + blog cover the timing claim).
- blog.duolingo.com/how-duolingo-streak-builds-habit/ — fetched OK but contained no reminder-timing content (Streak Freeze only); not used for reminder claims.

**UNVERIFIABLE (per protocol, never invented):**
- Duolingo "stops after exactly 7 days" — no primary; observers say first
  reminder ~2–3 days, stop/reverse-psychology ~week 4. Principle kept, figure
  dropped.

**Total fetch failures (HTTP/redirect/JS-stub): 5** (2 Apple dev JS-stubs, 1
Apple iPhone-guide JS-stub, 1 Taplytics redirect, 1 Duolingo support redirect).
All non-fatal; every load-bearing claim retains a working fetched or
search-confirmed source. Tooling proven (§ header).

*Research complete 2026-06-12. No code modified. Not committed — for synthesis.*
