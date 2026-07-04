# Progress Photos — Deep-Dive Audit (O5)

**Auditor:** O5 (Progress Photos deep-dive), Volyume Elite Audit
**Date:** 2026-07-04
**Mode:** READ-ONLY. Evidence + options only. No source file was modified.
**Sources verified in code:** `src/screens/ProgressPhotosScreen.js`,
`src/components/{ProgressPhotoViewer,ProgressPhotoCompare,ProgressGhostCapture,BeforeAfterShareSheet,PhotoDetailsSheet,PhotoDatePicker}.js`,
`src/lib/progressPhotoMeta.js`, `src/lib/shareCard/drawShareCard.js`,
`src/hooks/usePhotoSuppression.js`, `src/screens/{AnalyticsScreen,BodyMetricsScreen}.js`,
`src/navigation/RootNavigator.js`, `src/lib/{weeklyCoach,coachApply,coachingGoals,mesocycle}.js`,
`src/components/BottomSheet.js`. Research corpus read in full:
`research/progress-photos/{A1,E1,E2,_FRAMEWORK-AND-SPEC,…}` and
`docs/audit/guidance-audit-2026-07-03.md`.

---

## EXEC SUMMARY (verdict up front)

1. **Verdict: a beautifully-built island, not yet an integrated organ.** The
   *surfaces* are premium and best-in-class in isolation; the *connective
   tissue* to the rest of the product is a single thread (a weight snapshot).
2. The recent build closed almost every A1 gap: dated pose-typed timeline,
   full-size viewer (ends delete-only), three comparison modes, ghost-overlay
   capture, before/after Skia card, and a weight-at-photo join. Real, high-
   quality work.
3. The headline differentiator — `ProgressGhostCapture` ghost-overlay — is
   genuinely shipped and genuinely nobody-else-ships-it. This is the strongest
   single asset in the feature and it is done well.
4. ED-safety is exemplary: `usePhotoSuppression` starts suppressed, does dual
   raw fail-closed reads, and every high-risk surface is double-gated (entry +
   self-guard). This is not where the weakness is.
5. **The bolt-on signal is real and locatable in code:** the deterministic
   coaching engine has ZERO photo awareness (`grep photo` over
   weeklyCoach/coachApply/coachingGoals/mesocycle → no matches). The weekly
   coach never mentions photos; the weekly check-in never invites one;
   `PRCelebration`/`WorkoutSummary` never suggest capturing one; no milestone
   opens a photo moment.
6. **There is no repeat-use path whatsoever.** The only way a user takes photo
   #2 is by independently remembering to navigate to the tile. "No cadence
   nag" (correct, locked) has been implemented as "no return loop at all" —
   these are not the same thing, and the gap between them is the retention hole.
7. Data links to goals, workouts, measurements, habits, routines, milestones
   are entirely absent; weight is the sole join. The photo does not know what
   phase of the mesocycle it sits in or what the user's goal is.
8. Discovery is now adequate for a Pro feature (promoted Progress-tab NavTile +
   Body Metrics row) but absent from the two highest-intent weekly moments: the
   Train/Home tab and the weekly check-in.
9. Premium feel is high on the full-screen surfaces; the exception is the small
   dialogs (`PhotoDetailsSheet`, the viewer note editor, the iOS date host) which
   hand-roll their own scrim+panel chrome instead of the shared `BottomSheet`
   the app extracted precisely to stop that drift. The founder's suspicion here
   is correct but narrow.
10. Biggest strategic risks, ranked: (P1) no coaching integration; (P1) no
    return loop; (P2) weight-only data model; (P2/P3) no backup path (the #1
    churn driver in the dedicated-app category per P2 research); (P3) hand-rolled
    dialog chrome.

**Severity counts:** P0 = 0 · P1 = 2 · P2 = 4 · P3 = 3.

---

## THE 10 FOUNDER QUESTIONS, ANSWERED

### Q1 — Where does it appear; is discovery adequate for its strategic weight?
Two live entry points, both verified:
- **Progress tab (`AnalyticsScreen.js:627-638`)** — a promoted full-width
  `NavTile` ("Progress photos", camera icon, Pro badge for free), added after a
  founder device-walk (2026-07-03) found it "buried in Body Metrics and
  effectively undiscoverable". Good fix.
- **Body Metrics (`BodyMetricsScreen.js:822-829`)** — the original in-domain row.
- Route: `RootNavigator.js:427,472`, `withReadOnlyProGuard` + `headerShown:false`.

Adequate as a Pro-destination tile. **Not adequate for a "core transformation
pillar":** absent from the Train/Home tab (the guidance audit already flagged
Home exposes no entry to it, `guidance-audit:85`), and — more importantly —
absent from the **weekly check-in flow**, which is the one place the app already
has the user in a reflective, weekly, progress-reviewing frame. That is the
natural discovery-and-cadence moment and it is empty.

### Q2 — How do users add photos? Friction vs delight.
Add flow (`ProgressPhotosScreen.onAdd:300`): an `appAlert` with three routes —
"Take with guide" (ghost capture), "Take photo" (camera), "Choose from library".
Then a **Photo details** step (`PhotoDetailsSheet`) collects date (defaults to
today, past-only) + optional pose, *before* the photo is finalised, so the
weigh-in snapshot lands on the chosen day.

- **Friction (counted):** action-sheet choice → (permission prompt) → capture →
  details sheet → Save. ~3-5 taps. The details step is a deliberate, well-
  reasoned extra tap (it makes backdating + weight-snapshot correct). Reasonable.
- **Delight (counted and real):** the ghost overlay itself (line-up-your-last-
  shot) is a genuine delight moment; the rule-of-thirds grid; the optional
  horizon level (only if `expo-sensors` already present — no forced dep); the
  live-tier write-guard on the shutter; calm "your own pace" copy. This is a
  premium capture experience.
- **Friction gap:** first-ever add has no lighting/consistency primer at the
  moment of capture (see Q10 / F7). The ghost only helps from photo #2 onward.

### Q3 — Relation to goals/workouts/measurements/habits/weight/milestones/coaching (ACTUAL vs missed).
**The single most important finding.** Traced link-by-link in code:

- **Weight — the ONE real link.** `progressPhotoMeta.upsertPhotoMeta` snapshots
  `getBodyWeightNearestTo(userId, takenAt)` at capture and re-snapshots when the
  date is edited (`progressPhotoMeta.js:104-146`). Viewer shows it (suppression-
  gated), the share card can show it. Genuinely in-domain and well-done.
- **Coaching engine — NONE.** `grep -i photo` over `weeklyCoach.js`,
  `coachApply.js`, `coachingGoals.js`, `mesocycle.js` → **no matches**. The
  weekly coach run never references, requests, or reacts to a photo.
- **Weekly check-in — NONE.** No photo prompt in the check-in flow.
- **Milestones / PB days — NONE.** `PRCelebration.js` and
  `WorkoutSummaryScreen.js` exist and never mention photos; no milestone opens a
  capture moment.
- **Goals / mesocycle phase — NONE.** A photo carries date, pose, weight, note —
  never the goal or the training phase it belongs to.
- **Measurements / habits / routines — NONE.**

So: photos ↔ weight is a wire; photos ↔ everything-else is air. This is exactly
what "bolt-on" means in code terms.

### Q4 — Privacy/reassurance/trust cues: strong enough, at the anxious moments?
Strong, and placed well at *storage* anxiety: the info Card privacy note
(`ProgressPhotosScreen.js:404-410`), the add-sheet subtitle "Stored only on this
device" (`:301`), the "How it works" register (`:311-323`), the share one-time
confirm ("You're creating a shareable image…", `BeforeAfterShareSheet.js:346-364`),
and the on-card privacy line (`:525-527`). Proven non-upload (not in
`SYNC_REGISTRY`, guard-tested `progressPhotoMetaNoSync.guard.test.js`).

Placement gap: the most anxious moment is the **first camera/library permission
grant** — the point where the user hands the app their body. The system
permission dialog fires there with no calm Volyume pre-line reaffirming
"this never leaves your phone". The reassurance is one screen too early.

### Q5 — Emotional value + motivation: story or file-list? Where could it celebrate?
The timeline is a **dated, pose-badged, month-headed grid** (`buildTimeline`,
`:62-85`). It is a well-organised *record*, not yet a *story*. It lists files
elegantly; it does not narrate change. There is no "X weeks on your record",
no gentle "your earliest and most recent, side by side" moment surfaced from
the timeline itself — the elapsed-time framing exists ONLY inside the share card
(`elapsedLabel`) and the compare quick-actions, never on the calm home surface.
Celebration is deliberately (and correctly) muted for ED-safety, but "muted" has
become "absent". There is a safe, calm middle — see F1/loop options.

### Q6 — Comparison / timelines / stories / export / coach-partner visibility.
- **Comparison (`ProgressPhotoCompare`):** excellent. Three modes — side-by-side
  (calm default), in-house reanimated slider (adjustable a11y), Skia onion-skin
  overlay — pose-aware default pair, "earliest and latest" / "latest and N weeks
  back" quick actions, and a hard pinned copy ban (no before/after/delta/weight
  vocabulary). Self-suppressed + entry-gated. High quality.
- **Export (`BeforeAfterShareSheet` → `drawShareCard 'beforeAfter'`):** premium.
  Reuses the house Skia pipeline, single composited PNG (never multi-attach),
  square/portrait/story presets, elapsed badge, per-cell date·weight plates,
  wordmark footer, weight toggle, withheld entirely under suppression.
- **Timeline-as-story:** absent (Q5).
- **Coach/partner visibility:** none, and correctly so — photos never leave the
  device (locked). Any partner/coach visibility is a NEW off-device flow needing
  an explicit founder decision. Presented as a bounded option in F-LOOP-3, with
  the constraint named; NOT recommended over the lock.

### Q7 — Premium or basic feel, surface by surface, vs the Card/BackHeader/token system?
- **Gallery screen:** PREMIUM. Now uses `BackHeader` + `Card` + tokens +
  `edges:['top','bottom']` (the exact guidance-audit fix, `guidance-audit:126,160`
  — resolved). FlashList, pose chips, month headers. On-system.
- **Viewer:** PREMIUM full-screen (own header + close, tokens, spring motion).
- **Compare:** PREMIUM full-screen (own header + close X — appropriate for a
  modal surface, tokens throughout).
- **Ghost capture:** PREMIUM (token overlays, calm copy, real fallback surface).
- **Share sheet:** PREMIUM (tokens, live preview, segmented presets).
- **THE EXCEPTION — small dialogs are hand-rolled.** `PhotoDetailsSheet.js`
  (`styles.backdrop`/`styles.sheet`, `:152-181`), the viewer note editor
  (`ProgressPhotoViewer.js:434-453`, `sheetBackdrop`/`sheet`), and the iOS date
  host (`PhotoDatePicker.js:75-97`) each hand-roll a scrim + centred panel with
  a transparent `Modal`. The app has a shared `BottomSheet` component extracted
  *specifically* "so backdrop darkness and slide timing stop drifting"
  (`BottomSheet.js:5-13`), consumed by ~10 other sheets. These three bypass it.
  The founder's "hand-rolled chrome" suspicion is CORRECT but narrow: it is the
  dialogs, not the main surfaces.

### Q8 — Repeat-use mechanics: what brings a user back for photo #2 in week 2?
**Honest answer: nothing.** There is no reminder (correct — locked), no cadence
suggestion, no gentle "it's been a while, your record is here" surface, no
check-in hook, no home-tab presence. The `referenceName` "set as reference"
plumbing exists to make photo #2 *line up* — but only fires once the user has
already decided, unprompted, to return. The return trigger is 100% user memory.
This is the difference between "we never nag about cadence" (right) and "we give
the user no calm path back" (a gap). See loop options.

### Q9 — Retention-loop options, each with ED analysis. (See LOOP OPTIONS below.)

### Q10 — What do best-in-class do better; integrate / redesign / remove / build next?
From the corpus (P1/P2/P3, M1) + category knowledge:
- **Ghost-overlay capture:** Volyume now MATCHES or beats the dedicated overlay
  cameras and beats every coaching app (none ship it) — P1/M1. Keep, promote.
- **Reliability / "don't lose my photos":** the #1 churn driver across dedicated
  apps (P2 — "app DELETED all my photos"). Volyume has NO backup/export path;
  reinstall silently loses everything (A1 G9, still open). See F5.
- **Consistency-at-capture guidance** (lighting, same distance): dedicated apps
  coach it; Volyume's "How it works" covers pose + pace but not lighting (F7).
- **Weight-beside-photo:** matched (in-domain, gated). Good.
- **Redesign:** timeline → optional calm "your record so far" story header (F1).
- **Remove:** nothing. Resist every transformation/streak/AI-scoring trap (E1/E2)
  — the build already does.
- **Build next:** the connective tissue (F1-F3): a calm return surface, a check-in
  hook, and a device-local backup path.

---

## FINDINGS (contract format)

### F1 · No coaching / weekly-loop integration — the core "bolt-on" cause
- **Area:** Integration / coaching engine · **Severity: P1** · **Complexity: M**
- **Evidence:** `grep -i photo` over `weeklyCoach.js`/`coachApply.js`/
  `coachingGoals.js`/`mesocycle.js` → no matches. No photo prompt in the weekly
  check-in flow or `CoachOutputScreen.js`. `PRCelebration.js`/
  `WorkoutSummaryScreen.js` never reference photos.
- **User impact:** the feature feels detached; the app that coaches everything
  else is silent about the one artefact that shows non-scale change (E1 §1.2:
  the strongest pro-photo argument *in this app's recomposition context*).
- **Business impact:** a premium Pro pillar reads as an orphan; weakens the
  "complete transformation product" story and Pro perceived value.
- **Options (founder decides — all ED-safe, none add cadence pressure):**
  1. **Calm check-in acknowledgement (no capture pressure):** at the weekly
     check-in, IF a photo exists, show a neutral "your photo record is here"
     entry — surfacing, not nagging, and suppressed under calm/ED.
  2. **Coach-output reference (read-only):** when the weekly recap is already
     positive and unsuppressed, offer a passive "see your photos" affordance —
     never "you should take one".
  3. **Do nothing** (accept the island; the lock forbids most integration
     anyway). State the trade explicitly.

### F2 · No return loop — photo #2 depends entirely on user memory
- **Area:** Retention / repeat-use · **Severity: P1** · **Complexity: M**
- **Evidence:** no reminder/cadence surface anywhere; `usePhotoSuppression` +
  the whole design correctly refuse nags, but nothing calm fills the gap. Only
  return path = manual navigation to the tile.
- **User impact:** most users take one photo and never return; the timeline
  (whose entire value is *over time*) never accumulates.
- **Business impact:** the differentiator (ghost-overlay comparison) is inert
  without a second photo; retention value unrealised.
- **Options:** see LOOP OPTIONS (each with ED analysis).

### F3 · Weight is the only data link; goals/phase/workouts unconnected
- **Area:** Data model / integration · **Severity: P2** · **Complexity: M**
- **Evidence:** `progress_photo_meta` columns = name, taken_at, pose, weight_kg,
  note (`progressPhotoMeta.js`). No goal, mesocycle phase, or session reference.
- **User impact:** a photo can't be read in context ("this was mid-cut, week 4").
- **Business impact:** forecloses future calm context ("your record across this
  block") without another schema pass.
- **Options:** (1) additively snapshot goal/phase label at capture (device-local,
  never synced); (2) leave the join to display-time lookups; (3) defer.

### F4 · Discovery misses the two highest-intent weekly moments
- **Area:** Discovery / IA · **Severity: P2** · **Complexity: S**
- **Evidence:** entry points = `AnalyticsScreen.js:627-638`,
  `BodyMetricsScreen.js:822-829`. Absent from Train/Home (`guidance-audit:85`)
  and the weekly check-in.
- **User impact / business impact:** the feature is found by explorers, not by
  the weekly-reflection user who would benefit most.
- **Options:** (1) add a calm check-in entry (pairs with F1-opt-1); (2) a Home
  surface (heavier; watch ED prominence rule E1 §4.2); (3) keep as-is.

### F5 · No backup / cross-device path — the category's #1 churn driver
- **Area:** Reliability / data durability · **Severity: P2** · **Complexity: L**
- **Evidence:** A1 G9 open; photos excluded from sync by constraint; no local
  encrypted export. Reinstall/new device loses the gallery silently.
- **User impact:** catastrophic, silent loss of the most emotionally-valuable
  data (P2: "app DELETED all my photos").
- **Business impact:** trust collapse + churn precisely among the invested users.
- **LOCK NOTE:** photos must never leave the device (no cloud sync). Any backup
  is therefore a **user-initiated, user-controlled local export/import** (e.g.
  encrypted archive to the user's own storage), NOT a Volyume-held copy. This is
  a founder decision because it touches the never-leaves-device posture.
- **Options:** (1) user-initiated encrypted local export + re-import; (2) an
  honest one-time warning that photos are device-only and not backed up; (3)
  accept silent loss (state it).

### F6 · Small dialogs hand-roll chrome instead of the shared BottomSheet
- **Area:** Design-system consistency · **Severity: P3** · **Complexity: S**
- **Evidence:** `PhotoDetailsSheet.js:152-181`, `ProgressPhotoViewer.js:434-453`,
  `PhotoDatePicker.js:75-97` each hand-roll scrim+panel; `BottomSheet.js:5-13`
  is the shared chrome ~10 other sheets use.
- **User impact:** subtle inconsistency in backdrop darkness / motion vs the rest
  of the app — the exact drift `BottomSheet` was extracted to prevent.
- **Business impact:** minor polish gap on a premium feature.
- **Options:** (1) migrate the three to `BottomSheet`; (2) leave (they are
  centred dialogs, not bottom sheets — a defensible stylistic choice); (3)
  extract a shared centred-dialog primitive if that pattern recurs elsewhere.

### F7 · No lighting/consistency primer at first capture
- **Area:** Onboarding / capture quality · **Severity: P3** · **Complexity: S**
- **Evidence:** "How it works" (`ProgressPhotosScreen.js:311-323`) and the empty
  state cover pose + pace + privacy, not lighting/distance (A1 G14 partially
  open). The ghost overlay only helps from photo #2.
- **Impact:** photo #1 is often unusable for later comparison (wrong light/angle),
  quietly undermining the whole record.
- **Options:** (1) one calm line on lighting/same-spot in the empty state; (2) a
  first-capture tip in the ghost view when no reference exists; (3) leave.

### F8 · Reassurance is one screen early at the permission moment
- **Area:** Trust / privacy placement · **Severity: P3** · **Complexity: S**
- **Evidence:** the calm privacy copy sits on the gallery + add-sheet; the OS
  camera/library permission dialog (the actual anxious hand-over) has no Volyume
  pre-line.
- **Options:** (1) a one-line calm pre-permission reassurance before the first
  camera/library request; (2) rely on the add-sheet subtitle (current); (3) leave.

---

## WHAT IS ALREADY GOOD (named precisely — the build has real strengths)

1. **Ghost-overlay capture (`ProgressGhostCapture.js`) is genuinely best-in-
   class and genuinely shipped.** Opacity slider bounded to the AlignShot 15-85%
   range, rule-of-thirds grid, optional horizon level via `expo-sensors` *only
   if already installed* (no forced dependency — `:181-198`), real fallback
   surface when the camera is absent/denied (`:225-259`), live-tier shutter
   guard (`:200-205`), calm non-cadence voice. No coaching competitor ships this.
2. **ED-safety is exemplary and fail-closed.** `usePhotoSuppression` starts
   `suppressed=true`, does dual RAW reads (wellbeing + open-ED flag) with a
   `read_failed`→suppress sentinel (`:44-59`), and every high-risk surface is
   DOUBLE-gated (screen entry `canCompare`/`canShare` + component self-guard in
   Compare `:426-447` and ShareSheet `:437`). The base screen preserves its
   byte-pinned raw wellbeing read. This is safety done right.
3. **Never-leaves-device is proven, not asserted:** absent from `SYNC_REGISTRY`,
   guard-tested (`progressPhotoMetaNoSync.guard.test.js`), metadata deliberately
   device-local.
4. **The weight join is thoughtful:** snapshot-at-capture with re-snapshot on
   date-edit only (never re-derived on a pose/note edit — `progressPhotoMeta.js:121-130`),
   plus lazy one-time backfill for pre-upgrade photos in the viewer and share
   sheet. Correct semantics.
5. **Compare copy ban is hard-pinned** across all three modes and the selection
   bar (no before/after/delta/weight vocabulary) — the E1 accelerant refused
   structurally.
6. **The before/after Skia card reuses the house pipeline** (no new dependency),
   single-file export contract (S2), identical cover-cropped cells regardless of
   source aspect (`drawShareCard.js:492-506`), neutral elapsed badge (never a
   transformation arrow), weight toggle, withheld-under-suppression.
7. **The dated pose-typed timeline** (month headers, pose filter, pose badges,
   date-on-tile) is a complete, on-system replacement for the old flat delete-
   only grid — every core A1 must-have delivered.
8. **The guidance-audit's own findings are resolved:** the screen now uses
   `BackHeader` + `edges:['top','bottom']` (was the founder-flagged hand-rolled
   header) and reuses `Card` surfaces.

---

## LOOP OPTIONS (retention loop, each with ED analysis) — Q9

The design lead picks; every option holds the locks (no cadence nag, no streak,
suppression fail-closed, never-leaves-device) and is presented so the *lighter*
option is never framed as the recommendation.

### LOOP-1 · Gentle cadence *rhythm* offered once, never enforced
A single, user-controlled "would you like a calm reminder roughly every N weeks?"
setting, OFF by default, chosen by the user, delivered through the existing
suppress-under-ED notification budget, and silently withheld whenever a photo-
adjacent ED flag/calm state is open.
- **ED analysis:** HIGH-RISK LEVER. E1 §2.3/§3.1 name cadence/reminders as *the
  single most dangerous lever*. Even opt-in, a recurring body-photo reminder can
  seed body-checking. If built at all it MUST be off-by-default, user-set,
  suppression-gated, and never frequency-rewarded. **Name the risk loudly.** A
  defensible variant is "no reminder ever, only a passive surface" (LOOP-2),
  which carries far less risk. This is a genuine founder call, not a default.

### LOOP-2 · Passive "your record is here" surface (no notification)
No push at all. Instead, a calm, easily-ignored entry that appears only in
already-visited surfaces (the Progress tab and/or the weekly check-in, IF a
photo already exists and the user is unsuppressed): "Your photo record — earlier
and latest, whenever you want to look." Surfacing, never prompting to capture.
- **ED analysis:** LOW-RISK. No cadence, no capture nudge, no comparison forced;
  it only makes the *existing* record findable at a moment the user is already
  reflecting. Fully suppression-gated. Aligns with E1 §4.3 (keep the calm self-
  view available). This is the safest retention mechanic and the strongest
  candidate.

### LOOP-3 · Milestone-*adjacent* moment (opt-in, never body-triggered)
When the user hits a *training/behaviour* milestone the app already celebrates
(e.g. a PB or an N-session streak in `PRCelebration`/`WorkoutSummary`), offer a
one-line, dismissable "add a photo to your record if you'd like" — tied to a
*competence* win, never to body appearance, and suppressed under calm/ED.
- **ED analysis:** MODERATE-RISK, and the framing is everything. Anchoring to a
  *performance* achievement (not "you look leaner") keeps it function-over-
  appearance (E1 §3.2). The risk is that ANY prompt-to-photograph-your-body can
  read as pressure; mitigations: strictly opt-in, never on a weight/body event,
  dismiss-and-never-ask, suppression-gated. Weaker than LOOP-2 on safety,
  stronger on emotional payoff. A real trade for the founder.

**Cross-cutting ED note:** none of the three may reward frequency, show a
streak, manufacture a before/after, or fire under an open ED flag / calm mode.
LOOP-2 is the lowest-risk core loop; LOOP-1 is the highest-risk and should not
be chosen by default. Body-checking amplification is the named hazard for all
three (E1 §2.1-2.3, E2).

---

## SCOPE / METHOD NOTES
- Ran within the time box. Verified every shipped surface against the FIXED spec
  (`_FRAMEWORK-AND-SPEC.md`) and A1's gap list; confirmed the coaching-engine
  absence by direct grep of the four engine modules.
- Did NOT re-run the research corpus (per brief) — verified shipped-vs-spec and
  hunted what the corpus missed (the return-loop hole, the coaching-integration
  hole, the backup hole surfacing as a churn risk, the dialog-chrome drift).
- Read-only throughout. Only file created: this document.
