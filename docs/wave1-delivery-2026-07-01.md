# Wave 1 delivery — "Safe, true, felt" (2026-07-01)

Source programme: `audit/06-MASTER-PLAN.md` §4 (founder greenlight 2026-07-01,
plan approved before implementation). Branch:
`claude/codebase-audit-docs-pv6mjd`, commits `1350770..0a6ae5f`
(base `5e52531`). All twelve greenlit items shipped, plus the fixes from the
fresh-eyes hostile review of the full diff.

**Verification:** `npm run lint` clean; full suite **326 suites / 4,810
passing** (9 pre-existing skips) after the review fixes. F3 carried its own
founder sign-off (plan approval) and a contract suite written to fail first
(11 red before the fix, 15 green after).

---

## 1. What shipped, per item

- **D0 — token truth pass.** theme.js gained the missing tokens (bodySm,
  captionTight, radius.hair, seven alpha stops, colors.camera, celebration
  accents, motion.sheet); the widget amber bug fixed (`#F59E0B` → the brand
  `#F5A623`); ScanLabel/PRCelebration raw hexes tokenised;
  `docs/rules/styling.md` rewritten from theme.js.
- **F1 — sync data-loss guard.** Watermarks/cursors, the active-workout crash
  snapshot and the tz baseline are excluded from the user_prefs sync on BOTH
  the push and (post-review) the pull side; `pullFromCloud` aborts cleanly at
  every stage when a sign-out wipe starts (no watermark advance mid-wipe).
- **F2 — Article 9 fail-closed sync gate.** `syncAll` skips unless store
  healthConsent is exactly true; the sign-in restore waits for the consent
  check and defers when unresolved; granting consent kicks the deferred sync.
- **F3 — ED-floor seam repairs (signed off, strengthen-only).** Macro-cycle
  rest day floor-clamped by sex; robust 7-days-ago helpers return null instead
  of fabricating a rate; non-positive weights filtered from all smoothers;
  unknown sex takes the female (higher) EA caution line; rapid-loss boundary
  inclusive at exactly 1.5%; ED-pattern hold row can't be masked; persisted
  cycle days re-floored at read (defence in depth).
- **F4 — dead navigation taps.** Home coach banner, MealPlan targets link and
  the Diary OFF-share prompt now route via the parent tab navigator (navigate
  first, dismiss on success), with a guard test pinning route names.
- **F6a — startup wins.** Snapshot version fast path (no 6.3 MB parse per
  launch) with a constant-vs-asset drift guard and (post-review) an automatic
  constant bump in the refresh workflow; theme ready no longer blocked on
  accessibility bootstrap; first-run/tier checks run concurrently with DB
  init; heroZoom on Plan/Routine/ExerciseDetail.
- **A6 — UK provenance.** Food search names the on-device UK database
  (gov.uk CoFID + UK branded) before typing; the CoFID source chip carries a
  verified treatment and a "what is CoFID?" gloss, now rendered in the food
  detail sheet (post-review wiring).
- **A7 — check-in integrity.** Coach narration finally speaks the calorie
  answer (mapped vocabulary into buildOffItems/buildFocus/the registered
  response); the engine's weekly confidence renders as one calm caption; a
  check-in exactly one day late is allowed with softer-accuracy framing and
  the correct (anchored) review week; the chosen check-in day persists even
  when the notification permission is denied; the cardio prefill names its
  source log.
- **A8 — gating and conversion.** Locked-screen benefit copy for four gates;
  ProBadge on locked Analytics tiles; loading skeletons for Analytics/You;
  ProUpgrade gained the tier strip and a five-question FAQ (no billing logic;
  the founder's "three differences only" lock respected).
- **A2 — rest through the lock screen.** A scheduled, sounding end-of-rest
  notification (new HIGH `rest-alerts` channel, fixed identifier, cancelled
  on skip/finish/sign-out) backstops the in-app timer; GO cue fires on
  foreground catch-up; sticky header countdown chip; the auto-advance yank is
  cancelled by "Log another set"; bottom-pinned primary CTA; rest state
  survives process death.
- **A3 — week-one proof.** New pure `coachLedger.js` sharing the gate's own
  constants; Home shows "what your coach is reading" from day 0 of a trial;
  the week-one hold renders as a full held-decision receipt (inputs, rule,
  named unlock date); the plan reveal names the actual first-review date; the
  wizard's step 4 shows the provisional kcal/day. Every surface has an
  ED-neutral variant with no weigh-in counts or weight asks.
- **D2 — felt life.** The haptic vocabulary is fully wired (PR ladder,
  workout complete, check-in commit, plan ready, delete/undo beats, warm-up
  vs working set) and every call routes through the reduce-motion gate; new
  AnimatedRow ends the Diary/set-row jump-cuts (set rows re-keyed to stable
  ids); the draining rest-timer fill; the 50/100-session rungs earn a gold
  particle burst behind the same calm/ED/reduce-motion gates.

## 2. Hostile review outcome

One blocker (the pull side of the prefs sync), two majors (the seed fast-path
gap + its false comment; SourceChip dead code) and six minors were found,
fixed, and are covered above. Full details in commit `0a6ae5f`. One finding
needs a **founder decision** (§4).

## 3. Founder follow-ups (no action taken in code)

1. **NOTIFICATIONS_LOCKED.md addendum needed (review finding).** The A2
   end-of-rest alert intentionally bypasses quiet hours and the push budget
   (it only exists mid-session) and has no in-app disable — only the Android
   channel toggle; iOS users can only mute the whole app. Decide: sign an
   addendum accepting this, or ask for an in-app toggle in workout settings.
2. **PartnerScreen free/pro spec discrepancy** (A8 agent finding): the
   partner tile treatment implies a different tier boundary than the gate
   enforces — worth a look.
3. **Tier/trial_state pref-sync exclusion** was deliberately deferred
   (billing-adjacent; needs its own written test plan per docs/rules/billing.md).
4. **Differential paywall placement** (NAV-4): still rendered inside a
   Pro-guarded screen; untouched per plan. Decide surface-or-retire.
5. The OFF refresh workflow now edits `src/lib/food/seed.js` on main when the
   snapshot changes — expected and guarded, but be aware the weekly bot
   commit can now touch a source file.

## 4. Manual test checklist — physical Android device (EAS build)

Numbered steps, expected result per step. ED-safety cases included wherever
the change is weight/food/notification-adjacent. Native modules changed
(notification channel/category), so a FRESH EAS BUILD is required — not an
OTA update.

### F4 — dead taps
1. As Pro with a completed check-in, Home → tap "this week's review" banner →
   CoachOutput opens (was: nothing).
2. MealPlan → tap the targets link → NutritionTargets opens.
3. Diary → OFF-share prompt → tap through → the share/consent screen opens
   and only then does the card dismiss.

### F1/F2 — sync safety
1. Sign out mid-session → sign back in → workouts/weights restore; no
   duplicate or missing recent workouts.
2. Fresh install → sign in with an account that has NOT completed Article 9 →
   no sync occurs (airplane-mode toggle shows no spinner/errors); complete
   the consent gate → data pulls immediately.
3. Two-device check (if available): log a workout on device A offline, sign
   in on device B, then bring A online → A's workout appears on B after A
   syncs; nothing is silently skipped.

### F3 — ED floors (safety cases)
1. Female profile, aggressive settings → apply a carb cycle from CoachOutput →
   NO day (training or rest) in NutritionTargets/Diary shows below 1,200 kcal
   (male: 1,500).
2. Log a rapid weight drop (>1.5%/week) with low energy → the weekly review
   shows the rapid-loss alert and does NOT show a "held" row that hides it.
3. With only 1–2 morning weights in the week → the review holds (no calorie
   change), and no fabricated weekly rate appears anywhere.

### F6a — startup
1. Cold launch after first run → Home appears noticeably faster; food search
   still finds branded + generic foods (snapshot intact).
2. Plan → tap a plan/routine/exercise → the detail screen zooms in (with
   reduce-motion ON in system settings: no zoom, instant switch).

### A6 — provenance
1. Diary → Add food, before typing → the line "UK food database on your
   device…" is visible; it disappears once you type 2+ characters.
2. Open a generic food (e.g. "chicken breast, raw") → detail sheet shows the
   CoFID chip with a checkmark; tapping the ⓘ explains CoFID.

### A7 — check-in integrity
1. Complete a check-in answering "Off target" for calories (with food logged
   this week) → the coach review's "what was off" names the calorie miss;
   Focus reflects it.
2. The review shows one confidence line under "Why this week" (high/medium/
   low wording matches the data you gave it).
3. On the day AFTER your check-in day, open Weekly check-in → a "Your
   check-in day was {day}" screen offers "Check in anyway" → tapping it opens
   the form for LAST week (check the date range in the header); two days late
   → the old "come back on {day}" gate.
4. During onboarding, DENY the notification permission → finish → Weekly
   check-in still opens on the day you chose (not Sunday).
5. Cardio prescribed: the check-in's cardio question shows "From your cardio
   log: N of M prescribed sessions".

### A8 — gating
1. As a FREE user: Analytics → Body Metrics/Partner tiles wear a PRO badge;
   tapping opens the gate (never the feature). Nothing previously free is
   locked.
2. ProUpgrade → comparison strip renders, FAQ answers expand; prices load
   from Play (no hardcoded figures).

### A2 — rest through the lock screen (fresh EAS build required)
1. Start a rest timer, lock the phone, wait it out → at zero the phone sounds
   and vibrates ("Rest done"); tapping returns to the session.
2. Skip the rest in-app → no stray notification later. Sign out mid-rest →
   no notification later.
3. Scroll down mid-rest → the remaining time stays visible in the header.
4. Log the final target set, tap "Log another set" within 2 s → NO auto-jump
   to the next exercise.
5. Force-kill the app mid-rest → reopen → the resumed session shows the
   correct remaining rest, and the locked-phone alert still fires at zero.
6. Watch the timer bar → it drains smoothly second by second (reduce-motion:
   steps once per second, no animation).

### A3 — week-one proof
1. Fresh trial account: Home shows "What your coach is reading" from day 0
   (0 of 3 weigh-ins, day 1 of 5, no sessions) and the counts tick up as you
   log.
2. Finish onboarding → the plan reveal's check-in card names a real date
   ("…your first review lands on Sunday 6 July"), and the wizard's goal step
   showed "Provisionally about N kcal a day" once a focus was chosen.
3. Open the coach review before enough data exists → a receipt: the same
   counts, the rule, and the unlock date — not the bare "building your
   baseline" text.
4. ED case: with an open ED-pattern flag (or calm mode), the Home card and
   the receipt show NO weigh-in counts and no weight ask — only a neutral
   "getting to know you" line, and the receipt says "around", not "on".

### D2 — felt life
1. Diary: swipe-delete a food → the row fades out and the rows below glide up
   (no jump), a medium haptic lands, Undo restores with a light tick.
2. Active workout: each logged set slides into "This workout"; a warm-up set
   feels lighter than a working set.
3. Submit a weekly check-in → one firm haptic on the tap.
4. Finish onboarding → a single success haptic as the plan reveal lands.
5. Reduce-motion ON: none of the above vibrates or animates; everything still
   works.
6. (Long-term) 50th/100th completed session → gold burst over the summary +
   strong haptic; earlier rungs stay quiet. Calm mode/ED flag: no burst.

### D0 — visual spot-checks
1. Android home-screen widget → the amber matches the in-app brand amber.
2. Scan-a-label screen → the camera surround is the deep camera black, no
   visual change otherwise.
