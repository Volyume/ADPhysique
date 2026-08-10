# Campaign 5 — lead rulings on the first-use audit evidence (D96)

Ruled 2026-08-10 under D33 on the twelve evidence files in this folder.
Every EXECUTE ruling is implemented only after the executing lane
re-proves the finding's evidence against the current tree; every
Section 2 inviolable binds every ruling. FOUNDER QUESTIONS at the end
are open forks — work continues on unblocked lanes while they stand.
British English.

## Ruling key

EXECUTE(lead) — safety-adjacent; the lead implements hands-on.
EXECUTE(wave X) — assigned to the named implementation wave.
FOUNDER — a structured question in the list at the end; no execution.
RECORD — recorded here / on the taskboard; no code change.

## The spine (lead hands-on, Wave A)

- **C5-P29-01 / C5-P7-01 / E-4 / C5-P1-01 (CRITICAL, the Step 1
  trap): EXECUTE(lead), option (a)** — drop the `if (userProfile)
  return;` guard at ProOnboardingScreen.js:479 so ANY authenticated
  non-local user at step 1 advances (the navigator has already decided
  they belong in the wizard; step 1 exists only to create an account).
  ALSO persist nothing new: option (b) unnecessary once (a) lands.
  New pin for the exact defective combination (non-local user, flag
  false, hydrated profile → step 2). The Free→Pro upgrade path and the
  kill-on-hand-off path both re-verified at implementation.
- **C5-P5-03 (destructive wellbeing write): EXECUTE(lead)** —
  WellbeingCheckScreen adopts the read-merge-write shape its three
  SettingsProfileScreen siblings already use, so completing the SCOFF
  check preserves sex/date_of_birth/height_cm and still writes
  scoffScore identically. NO change to SCOFF scoring, thresholds,
  flags or floors — this repairs accidental data destruction that was
  silently degrading the sex-specific safety inputs. Regression pin:
  wellbeing check completion preserves the body-profile row.
- **C-2 (legacy pullFromCloud bypasses the Article 9 gate):
  EXECUTE(lead)** — apply the SAME consent predicate runner.js already
  enforces at the top of pullFromCloud. Strictly STRENGTHENS the
  fail-closed guarantee (the inviolable forbids weakening; adding the
  gate to a legacy path is defence-in-depth the F2/SC-1 work missed).
  Pin it beside the existing gate pins. C-9 (`!user.isLocal`
  dead-flag condition) executes with it only if removal strictly
  strengthens, per its own evidence.
- **C5-P5-02 (ProGoalSetup silently defaults sex→male, 175cm, 28):
  EXECUTE(lead), option (b)** — remove the silent defaults and let
  the engine's existing `nutrition.sexMissing` path speak, routing the
  user to the profile field where a value is genuinely required
  (option (a) shape at the screen). The onboarding law is "no
  defaults, no tap-through" — a silent male default downstream defeats
  the gate the law built. Floors untouched (they already read the
  same sex value; absent stays the more conservative 1500 path).
- **C5-P17-01 / C5-P17-02 (Close persists untouched default ratings;
  rows pre-select defaults): EXECUTE(lead)** — rating rows start
  unselected; only user-touched answers persist; Close on an
  untouched panel writes nulls. This is Campaign 1's null law
  ("unknown ≠ no") applied to the session ratings; C5-P17-C2 proves
  the engine already handles unrated sessions correctly, so no engine
  change. The block ledger stops ingesting fabricated "moderate/no
  discomfort" evidence.

## Entry / account (Wave B)

- E-1 CTA lands on Sign-in + dead intent param: EXECUTE(wave B) —
  "Start your 14 days" opens the form in create mode; the dead param
  is removed or read, whichever the re-proof shows is smaller.
- E-2 duplicate-email shape: EXECUTE(wave B) — handle the Supabase
  enumeration-protection response so an existing email gets "sign in
  instead" guidance, not a phantom confirmation email.
- E-3 no password reset: EXECUTE(wave B) — minimal "Forgot password?"
  flow on the email form calling the existing (currently uncalled)
  resetPassword(), with calm instructions. Recoverable auth is a
  Phase 40 pin requirement; identity architecture unchanged (no
  anonymous mode, no migration).
- E-5 offline copy: EXECUTE(wave B) — network failures name
  connectivity instead of implying wrong credentials.
- E-8 confirm-email as transient toast: EXECUTE(wave B) — persistent
  on-screen state, same copy.
- E-9 no visible back on LoginScreen: EXECUTE(wave B).
- C5-P1-04 / C5-P30-01 Android Back exits app across onboarding:
  EXECUTE(wave B) — BackHandler steps the wizard back a step where a
  step exists; consent and required-data gates stay un-bypassable
  (pins C5-P30-05/06 must stay green).
- C5-P1-05 / C5-P30-02 FreeStarter hardware Back discards the quiz:
  EXECUTE(wave B) — hardware Back mirrors the on-screen chevron.
- C5-P29-02 duplicate starter plan: EXECUTE(wave B) — dedup guard on
  the starter copy (idempotent by plan identity, matching the
  library-copy pattern), plus the kill-before-completeFirstRun replay
  made idempotent.
- C5-P29-03 name re-asked / C5-P1-09 name blocks progress:
  EXECUTE(wave B) — the free path stops BLOCKING on first name (the
  neutral fallback exists); the field stays, optional. (Third law:
  no engine reads it.)
- C5-P29-07 advanceFrom6 replay non-idempotent: EXECUTE(wave B) —
  make the writes idempotent per the evidence; smallest change wins.
- C5-P29-04 healthConsentChecked failsafe: EXECUTE(wave B) —
  investigate first; any failsafe must fail CLOSED (never grants
  consent, only escapes the splash to the gate).
- C5-P1-10 dead intent param: folded into E-1.

## Plan / block / Home / workout surfaces (Wave C)

- C5-P11-01 "5 weeks" vs 6-week block: EXECUTE(wave C) — the
  planEngine explanation states the block length actually created.
- C5-P10-01 nothing says activation starts a block: EXECUTE(wave C) —
  one sentence at the activation decision points (tier-blind).
- C5-P10-02 days-per-week never shown in library: EXECUTE(wave C) —
  render the existing days data in browse/preview.
- C5-P10-04 equipment/exercises invisible pre-activation:
  EXECUTE(wave C) — surface the existing data (no new features; the
  preview shows what the plan already contains).
- C5-P10-03 quiz can hand a no-equipment user a full-gym advanced
  plan: EXECUTE(wave C) — equipment becomes a filter (or the result
  states the mismatch honestly) per the audit's minimal option;
  re-prove before choosing.
- C5-P10-05 silent activation: EXECUTE(wave C) — one consistent
  confirmation beat across the three entry points.
- C5-P10-06 "Go to Train" goes to Today: EXECUTE(wave C) — label or
  destination fixed to agree.
- C5-P10-07/08 edit-answer + activation-meaning: EXECUTE(wave C) —
  copy only.
- C5-P10-09 Pro no-plan inert text: EXECUTE(wave C) — give the Pro
  branch the same real CTA shape the free branch has.
- C5-P10-10 ManualBuilder skips confirmPlanSwitchMidBlock:
  EXECUTE(wave C) — add the same confirm.
- C5-P30-04 goal change rebuilds plan/block without confirm:
  EXECUTE(wave C) — same confirm pattern before the write.
- C5-P11-02/03 block explanation carriers: EXECUTE(wave C) — the
  block-start sheet reachable from the free path too; the "blocks are
  optional" copy corrected.
- C5-P11-05/06/07, C5-P12-01/02/03/04: EXECUTE(wave C) — copy/order
  fixes as evidenced.
- C5-P16-01 finished-week volume verdict after session 1:
  EXECUTE(wave C) — the weekly-volume card states week-in-progress
  ("N of M sessions logged") instead of a finished-week verdict, per
  the audit's minimal option.
- C5-P15-01 warm-up consumes the first-lift guard: EXECUTE(wave C) —
  the guard keys on working sets so the first WORKING set is the
  baseline (warm-ups never become the beatable baseline). PR maths
  otherwise untouched; Campaign 2 definition intact.
- C5-P13-02 finish-confirm false "unlogged set" claim: EXECUTE(wave
  C) — hasInProgressSetEntry compares against the actual seeded
  state.
- C5-P16-02, C5-P17-03: EXECUTE(wave C) — next-step line on first
  summary; purpose sentence visible on the collapsed feedback panel.
- FB-03 "Block finished" during recovery week: EXECUTE(wave C).
- FB-04 dead advance-warning copy: EXECUTE(wave C) — make it
  reachable (the audit names the broken gate).
- FB-05 "Skip" pill label: EXECUTE(wave C) — "Got it".
- FB-02 recovery-week banner re-triggers during scheduled recovery:
  EXECUTE(wave C) — suppress the suggestion inside a scheduled
  recovery week (advisor stays otherwise untouched).
- FB-06 weekly coach "Add N sets" during recovery week: EXECUTE(wave
  C) — the coach card acknowledges the scheduled recovery week (copy
  gate, not an engine change).
- FB-15 block summary unreachable while awaiting decision:
  EXECUTE(wave C) — the finished block's summary reachable during the
  decision window (it exists; it is a routing/window defect).
- FB-16 block-best labelled as records: EXECUTE(wave C) — label block
  bests honestly on a first block ("best this block", first-ever
  lifts not "records set").
- FB-17 progress figure compares week 1 to the recovery week:
  EXECUTE(wave C) — compare like-for-like (final build week), per the
  audit's minimal fix.
- FB-18 dead "Start a new block" CTAs + wrong post-recovery advice:
  EXECUTE(wave C).
- FB-20 tooltip promise, FB-23 story timing/outro copy: EXECUTE(wave
  C) — copy truth.
- FB-24 no receipt after Continue-with-adjustments: EXECUTE(wave C) —
  a confirmation state naming what changed/held (reads the ledger
  proposals already computed; no engine change).
- FB-25 research-fallback statement missing: EXECUTE(wave C) — the
  transition surface states where research still filled gaps (data
  already in the ledger).
- FB-26 byte-identical confirm for repeat vs adjust: EXECUTE(wave C)
  — the two confirms describe their actual actions.
- FB-27/28 unchanged-is-a-decision + 3-line cap drops the movers:
  EXECUTE(wave C) — ordering prefers moved muscles; "held steady"
  stated as a decision.
- FB-32 "Continue this plan" wording on the repeat branch:
  EXECUTE(wave C) — says the plan runs again as-is. (The DECISION
  architecture itself is FQ-2 — wave C changes no branch logic.)

## Week / check-in / nutrition / notifications (Wave D)

- C5-P19-01 week-1 shaming prefill: EXECUTE(wave D) — the derived
  training-performance prefill states week-1 honestly (no "your
  usual" before a usual exists; no downgrade verdict from
  structurally unreachable upgrade paths).
- C5-P20-01 Fast Check-In writes cycleOverride:false unasked:
  EXECUTE(wave D) — unasked persists as null (Campaign 1 law); the
  coach's cycle handling of null already exists.
- C5-P20-02 first check-in promises the decision "straight away":
  EXECUTE(wave D) — first-run copy states the baseline outcome
  before submit.
- C5-P20-03/04: EXECUTE(wave D) — why-lines for the two bare groups;
  chip label leads with the word not the digit.
- C5-P18-01/02/03 single-session "running average", 1-3 on a 1-5
  gauge, pre-account "Quiet week" marks: EXECUTE(wave D).
- C5-P18-04/05: EXECUTE(wave D) — "on track" needs evidence
  wording; learned-days promise states its warm-up period.
- C5-P22-01 onboarding weight pre-seeds morning_weights + day-0
  "Logged": EXECUTE(wave D) — the enrolment write is labelled as a
  starting point, not a morning log (or not written into the
  morning series - re-prove which is smaller); day-0 Home stops
  claiming "Logged" for a weigh-in that never happened; the 5-day
  clock starts from real weigh-ins.
- C5-P22-02 raw-row counting lets duplicates create evidence:
  EXECUTE(wave D) — count distinct mornings (dayKey) at the gate and
  label; Campaign 2's distinct-mornings law applied where it was
  missed.
- C5-P22-03 evening backstop invites an evening reading into the
  morning series: EXECUTE(wave D) — copy states tomorrow-morning
  framing per the audit.
- C5-P22-04, C5-P21-01/02/03: EXECUTE(wave D) — provenance line on
  first targets ("from your profile, adjusted as evidence arrives");
  TodayStrip why-line; insights bars honest at one day; a Diary
  route to the primer.
- PM-01 Monday push manufactures a persisted verdict: EXECUTE(wave D)
  — both halves: (b) the push carries the reviewed week's weekStart,
  AND (a) CoachOutputScreen neither computes nor PERSISTS a fresh
  verdict for a week with no check-in (opens the latest completed
  decision instead). No weeklyCoach/coachApply change.
- PM-03 pre-check-in visit retires the week-one ledger: EXECUTE(wave
  D) — retirement keys on a check-in-backed output (PM-06's existing
  predicate), not on any persisted row.
- PM-04 weigh-in pushes have no route: EXECUTE(wave D) — route the
  two weight prompts to the existing weigh-in deep link.
- PM-05 Monday-vs-Sunday default: EXECUTE(wave D) — one default,
  the evidence names the canonical one.
- PM-06/07/08: EXECUTE(wave D) — completed-decision predicate on
  Home's banner; the baseline-first statement surfaces before the
  first check-in; the tier-blind recovery banner acknowledges the
  scheduled block week (shared fix with FB-02/FB-06 and FM-07).
- FM-01 meal-log reminders offered/scheduled for Free: EXECUTE(wave
  D) — the Pro-feature reminder is tier-gated at offer AND at
  scheduling/re-lay (an un-usable daily prompt is a silent Pro
  failure, exactly what Phase 31 forbids).
- FM-02 training reminder schedules nothing for two weeks, silently:
  EXECUTE(wave D) — the toggle states the warm-up honestly.
- FM-03 launch wipes reminders and restoreNotifications never
  re-lays them: EXECUTE(wave D) — restore re-lays training
  reminders; Campaign 1 integrity pins stay green.
- FM-04 lapse copy for never-Pro: EXECUTE(wave D).
- FM-08 missing routes for training_reminder/activation_nudge:
  EXECUTE(wave D) — per that module's own contract.
- C5-P27-01 Settings→Notifications prompts on mount: EXECUTE(wave D)
  — mount reads status (existing non-prompting sibling); prompts
  stay on user action.
- C5-P27-02 onboarding OS prompt timing: EXECUTE(wave D) — prompt
  moves to the intent moment per the audit's minimal option.
- C5-P27-03/04 Open Settings gaps: EXECUTE(wave D) — the two named
  surfaces gain the standard Open Settings affordance (Campaign 3
  pattern).
- C5-P28-01 quiet hours silently move 5/6 AM weigh-in reminders:
  EXECUTE(wave D) — the picker/display states the effective time
  (quiet-hours rule itself unchanged).
- C5-P28-02 onboarding writes only the legacy blob: EXECUTE(wave D)
  — onboarding mirrors to the per-category rows exactly as
  NotificationSettingsScreen already does (FR-C4-2 architecture
  untouched; this uses the existing dual-write pattern).
- C5-P28-03 unnamed 19:30 backstop: EXECUTE(wave D) — named on the
  surface that owns the morning prompt.
- C5-P28-04 lapsed user keeps weigh-in prompts, editor Pro-gated:
  EXECUTE(wave D) — coaching weight prompts cancel on lapse
  (lapseDetect already observes the transition; NOTIFICATIONS_LOCKED
  unsubscribe principle is the authority). The editor's gating is
  unchanged.

## Audiences / density / hierarchy / analytics (Wave E)

- C5-P7-02 SubscriptionPolicy advertises the deleted plate
  calculator: EXECUTE(wave E) — remove; boundary law.
- C5-P7-03 account/sync sold as Pro: EXECUTE(wave E) — truth fix.
- C5-P7-04 two promises broken by hard locks: EXECUTE(wave E) — copy
  states the real behaviour (tier scope unchanged).
- C5-P7-05 / C5-P1-08 HomeWelcomeCard promises a coach to Free:
  EXECUTE(wave E) — tier-aware copy.
- C5-P7-06 named-lift claim: EXECUTE(wave E).
- C5-P7-08 free Coach tab shell: EXECUTE(wave E) — the pitch card
  states what the tab becomes on Pro (copy only; no gating change).
- C5-P7-09 four "what stays free" definitions: EXECUTE(wave E) — one
  canonical list, the wrong one corrected.
- C5-P7-10 tier never named: EXECUTE(wave E) — one calm "You're on
  Free" line where the evidence proposes.
- C5-P8-01 hardcoded £0: EXECUTE(wave E) — render the tier word, not
  a currency amount (PLAY-002's own rule is the authority).
- C5-P8-05 unreachable no-account branch copy: EXECUTE(wave E).
- FM-05 permanent undismissible teaser: EXECUTE(wave E) — becomes
  dismissible like every sibling (frequency law, no scope change).
- FB-13 free-user "Precision Coaching is holding a lighter week":
  EXECUTE(wave E) — the differential copy stops attributing an
  action to an engine the user does not have (upsell framing stays;
  price/trial claims untouched).
- C5-P36-01/02/03 double-layer explanations, quadruple restatement,
  onboarding-as-advertising: EXECUTE(wave E) — deduplicate per the
  audit; safety/legal copy untouched.
- C5-P37-01 two same-weight CTAs, weigh-in above the session hero:
  EXECUTE(wave E) — hierarchy only.
- C5-P37-02 stacking instructional modals: EXECUTE(wave E) — mutual
  guard, first-relevant wins, the other defers to its next natural
  moment.
- C5-P34-01 dead Welcome gloss gate: EXECUTE(wave E) — fix the gate
  so the intended gloss renders.
- C5-P34-02 PR unglossed at first exposure: EXECUTE(wave E) — reuse
  GLOSSARY.pr at the summary.
- C5-P34-04 stop-short-of-failure cue: EXECUTE(wave E) —
  accessibility label names the term; definition stays one tap away.
- C5-P35-01 Progress empty state promises Pro-locked destinations to
  Free: EXECUTE(wave E) — tier-aware line.
- C5-P35-06 guaranteed-bounce CTA: EXECUTE(wave E) — the empty state
  states the unlock condition instead of routing to a gate.
- C5-P13-01 stop-short-of-failure absent from the logger: EXECUTE
  (wave E) — the session header carries the effort line the Home
  chip already owns (one line, no tutorial).
- C5-P13-03 set/rep gloss affordance: EXECUTE(wave E) — the deferred
  Campaign 2 item now has first-use evidence; the "…" button gains a
  visible label and the pulse survives until opened once. One-time,
  optional, no tutorial wall.
- C5-P13-04 warm-ups invisible: EXECUTE(wave E) — discoverability of
  the existing sheet per the audit's minimal option (B8 decision
  unchanged: still never prompted automatically).
- C5-P14-02 top-of-band prefill on first-ever set: EXECUTE(wave E) —
  prefill the bottom of the band on zero history.
- C5-P14-03 "from your recent sets" on one set: EXECUTE(wave E) —
  provenance copy matches evidence count.
- C5-P33-04 no fast lane: RECORD — a structural wizard change is a
  design fork; noted for the founder list (FQ-8 option), not
  executed.
- C5-P33-06 manual landmarks unreachable until first set: RECORD —
  consistent with advanced-stays-advanced; noted.
- C5-P38-05 once-only defects in existing events: EXECUTE(wave E) —
  dedupe the re-fire on Back (verifying the order's "fires exactly
  once"); no new events, no payload change.
- C5-P38-01/02/03/04 instrumentation gaps: RECORD only (no new
  telemetry; the gaps go to the founder items list).
- C5-P39-04 nothing pins the rollback switch: EXECUTE(test wave) —
  pins land in campaign5.firstUse.test.js.
- W-3/W-4 calm-mode description + same-rules statement: EXECUTE(wave
  E) — the SettingsCoaching calm row description says what calm
  changes and that safety limits are identical in both modes
  (wording only; no gate, no detector text).
- W-8 / C5-P7-07 SCOFF screener unreachable for Free: EXECUTE(wave E)
  — the Safety checks section moves outside the isPro branch.
  AUTHORITY: the tier-blind guardrail mandate (proGate.js /
  CLAUDE.md Section 2: guardrails never consult tier). A self-report
  safety surface is a guardrail input, not a Pro feature. If this
  reading is wrong the founder can reverse one commit; recorded
  prominently in the handover.
- E-7 why-an-account line: EXECUTE(wave E) — the approved sentence
  (already written, currently unrendered) surfaces on the live form.

## FOUNDER RULINGS on FQ-1..FQ-8 (received 2026-08-10 — the questions
## below are CLOSED; this block is the operative record)

Side rulings only: Campaign 5 continues exactly as commissioned; each
ruling integrates into its existing workstream; no re-scope. Tier law
restated by the founder and binding everywhere: **FREE DOES NOT HAVE
COACHING. PRO owns adaptive coaching and Continue-with-adjustments.**

- **FQ-1 = (c).** No new first-run wellbeing screen; calm stays edited
  in Settings → Coaching. ADD: a light neutral pointer on the existing
  setup-complete/hand-off surface ("Prefer gentler coaching? You can
  switch to Calm anytime"-equivalent), linking to the canonical
  setting if it fits without navigation awkwardness. Standard remains
  the default; nothing medicalising; no suggestion Standard is unsafe.
  CORRECT the three documents claiming a dedicated first-run wellbeing
  question exists (wellbeing.js header, ONBOARDING_SEQUENCE_LOCKED,
  PRIVACY_CONSENT_LOCKED's line) to describe actual behaviour. ED
  detection/SCOFF/floors/thresholds/D92-11 untouched.
- **FQ-2 = (a) WITH PRO-ONLY ADAPTIVE COACHING.** At block completion
  PRO always sees BOTH Repeat and Continue-with-adjustments as
  side-by-side legitimate choices; the advisor may recommend and
  explain but never hides, gates or forces; Continue-with-adjustments
  consumes the Block Ledger (a successful block never silently
  discards it). FREE does not receive adaptive next-block coaching;
  if the option renders for Free at all it is truthfully Pro-gated
  through the existing entitlement UX. The accidental entitlement
  logic MUST GO: no placeholder DB row, no incidental presence/absence
  of Pro check-in data may decide the branch — tier eligibility comes
  from the real Free/Pro entitlement system. The ledger may stay
  tier-blind internally (workout evidence is not a Pro data type);
  the coaching decision built on it is Pro. Preserve explicit
  confirmation, true Repeat, no auto-transition, Stage 6-8
  invariants. Tests pinned both sides (Pro: both reachable, advisor
  recommends-not-gates, adjustments consume ledger; Free: no adaptive
  coaching, explicit entitlement, no placeholder-row gating).
- **FQ-3 = (b) WITH CONSTRAINT.** Post-session difficulty becomes a
  SEPARATE session-level coarse effort signal the progression engine
  may consume deterministically and conservatively. NEVER converted
  into fabricated per-set RIR; the silent rir:2 stamp stops counting
  as genuine effort evidence; the picker stays removed. Rep
  progression continues from performance evidence; top-of-band load
  progression may use real session difficulty as corroboration
  ("very hard" session → do not aggressively add load); skipped
  difficulty → effort unknown → conservative hold with honest copy
  ("You've topped the range. Add weight when you're ready."-
  equivalent, voice rules apply; never an instruction to log RIR).
  This ruling also properly resolves FR-C4-4: bodyweight exercises
  must not receive micro-load instructions through the
  fabricated-effort path. Dedicated test plan; determinism pinned.
- **FQ-4 = (a). WIRE IT.** Confirm-then-apply becomes true
  end-to-end: coach proposal → Apply → persisted applied target →
  plan/volume allocation → workout generation/set targets → the
  actual next session. Includes weekly per-muscle changes (both
  directions) and applied recovery-week per-muscle reductions.
  Unapplied ordinary proposals must NOT alter session prescriptions
  (explicitly-automatic hard safety behaviour may stay automatic, but
  no normal proposal may masquerade as safety). Pinned law: UNAPPLIED
  = no coaching change to session prescription; APPLIED = the change
  reaches session prescription; WRITE FAILURE = no success receipt
  and no partial change. Test restart/sync/retry/double-tap/recovery
  week/per-muscle divergence/Manual mode/Repeat/adjustments/stale-
  device conflicts. Adaptive mesocycle architecture unweakened.
- **FQ-5 = APPROVED 1-6 IN PRINCIPLE, WORDING GATED.** Exact
  proposed wording for all six consent/privacy corrections is
  prepared and PRESENTED FOR FOUNDER REVIEW BEFORE LANDING (see
  FQ5-CONSENT-WORDING-PROPOSAL.md in this folder). Directions:
  withdrawal-consequence disclosed pre-consent; canonical consent
  content established then record and screen reconciled to identical
  substance (the three extra shipped blocks documented, not assumed
  correct either way); scan-calibration upload disclosed with
  technically accurate language ("anonymous" only if genuinely
  unlinkable, else the accurate term); data-leaving-device
  disclosures placed under sharing/transmission; progressive
  disclosure allowed with no substance removed or hidden
  pre-consent; wellbeing storage claim corrected (raw answers local,
  derived score synced) without publishing detector mechanics. No
  behaviour change rides this ruling.
- **FQ-6.1 = APPROVED.** Idempotent trial-grant retry consistent
  with the cascade architecture: never pretend the trial is active
  before authoritative confirmation; calm "will retry" state; no
  duplicate grant, no extension abuse, no repeated trial creation;
  failure distinguishable from ineligibility; abuse controls intact;
  no locally-invented Pro entitlement. Dedicated billing test plan.
- **FQ-6.2 = APPROVED.** The authoritative trial end date surfaces on
  Account/subscription status and the active trial banner, from ONE
  entitlement source; no derived conflicting dates; no notification
  additions.
- **FQ-6.3 = RESOLVED (founder verification supplied 2026-08-10).**
  The founder confirmed, with emphasis that this is a repeated
  confirmation: the trial is 14 days free in-app, then the FIRST 7
  DAYS of a store subscription are free through BOTH Apple and
  Google. Per the ruling's own branch ("both stores → copy may
  remain"), the existing in-app claim stands unchanged. The
  verification is permanently recorded in docs/rules/billing.md so
  no future audit or review re-raises it; the console-check row
  beside H4 on the taskboard is closed.
- **FQ-6.4 = APPROVED, truthful semantics.** The fake local "Switch
  to Free" is replaced by truthful platform subscription management
  ("Manage subscription"-equivalent): cancellation stops renewal via
  the store, Pro remains until the paid/trial entitlement expires,
  Free follows the authoritative expiry. Never locally forge Free;
  product IDs/pricing/trial length/provider untouched; billing
  invariants pinned.
- **FQ-7 = (a), PER EXERCISE.** First qualifying completed exposure
  to an exercise establishes the BASELINE; records begin from the
  next comparable exposure — even for a veteran account meeting a
  brand-new exercise. Set 2 beating set 1 inside the first exposure
  is not a PR. The three record types stay (Est. max / Heaviest /
  Most reps); exercise identity follows existing semantics (no fuzzy
  matching); substitution inherits no unrelated baseline; historical
  users keep legitimate records. Test matrix per the ruling.
- **FQ-8 = (b).** Wizard structure stays; no experienced branch, no
  advanced/beginner modes, no hidden required inputs, rollback
  architecture untouched. Reopen only on funnel/device evidence.

Implementation discipline (founder): focused tests + affected
campaign 1-4 suites + full gate before merging each ruling's work; no
migrations, no EAS, no cardio, no AI/social, no D92-11 change, no ED
threshold change, no billing price/product change. FQ-5 stops at
wording; FQ-6.3 stays open.

## FOUNDER QUESTIONS (RESOLVED ABOVE — kept for the evidence trail)

**FQ-1 — First-run wellbeing choice (W-1).** Three documents
(including wellbeing.js's own header) say first run asks the wellbeing
mode; the shipped flow never asks, so calm mode is discoverable only
in Settings. Options: (a) add the first-run choice as the docs
describe (one screen, both tiers, skippable-to-standard); (b) rule
the docs wrong and correct them (calm stays Settings-only); (c) a
lighter first-run mention (one line on the hand-off screen pointing
at the setting). ED-adjacent onboarding surface — your call.

**FQ-2 — The next-block decision architecture (FB-19/31/36 + FB-33).**
Today: one option is offered, chosen by weekly check-in readiness
(Pro-gated data), not by the block; a block that went WELL routes to
"repeat", which silently discards the ledger; whether the adaptive
path is reachable at all flips on a placeholder row for free users.
Options: (a) always offer BOTH Repeat and Continue-with-adjustments
side by side (advisor becomes advice, not a gate) — declares the
adaptive path's tier reachability explicitly, your ruling on which
tier(s); (b) keep one primary but always render the alternative as a
secondary action; (c) status quo + copy honesty only. Also rules
FB-33's wording tension. This is the single highest-leverage
first-use decision in the campaign.

**FQ-3 — Effort truth in progression (C5-P14-01 + FR-C4-4).** Every
set is stamped rir:2 (never asked — the picker was removed by D14/D19
and must not return). Honest null would permanently stall top-of-band
load progression behind an impossible "log RIR" instruction. Options:
(a) rir stays defaulted but the engine treats DEFAULT-sourced effort
as unknown for the overload guard (progression by reps continues;
load-adds pause; copy says why); (b) map the existing post-session
difficulty rating onto the session's sets as coarse effort evidence
(deterministic, no new input, engine change needs its own tests);
(c) accept the fabricated 2 and record it. (b) is the best-product
candidate but changes engine semantics; FR-C4-4's 0.25kg-on-bodyweight
exposure is unlocked by the current state and closed by (a) or (b).

**FQ-4 — Closing the Apply loop (PM-02 + FB-01/FB-10).** "Apply: add
N sets" writes a number the logger never reads, while "pull back"
reaches sessions without Apply — confirm-then-apply inverted both
ways, and recovery-week per-muscle reductions never reach set targets
either. Wave D executes the COPY honesty half (the card says what
Apply actually does and links where the numbers live). The real fix —
the session reading the applied weekly target / recovery reductions —
is an engine-adjacent behaviour change: (a) wire it (with its own
test plan); (b) copy honesty only for now. Recommend (a) as the
best-product answer; your call on timing.

**FQ-5 — Consent and privacy copy (C-3, C-4, C-5, C-10, C-6, W-7).**
Six corrections touching locked legal copy, each strengthening
informed consent, none shortening content: (1) the withdrawal line
states withdrawal deletes the account (the decline path already says
so); (2) the shipped screen carries three blocks absent from the
locked record — reconcile record vs screen; (3) the privacy policy
does not mention the anonymous scan-calibration upload; (4) the
"anonymous measurement numbers" bullet sits under "what Volyume looks
at" though it describes data leaving the device; (5) progressive
disclosure restructure of the ~340-word block (no content removed);
(6) the screener's "stored on this device" line vs the synced
scoff_score. Approve individually or as a batch; wording drafts ready
on request.

**FQ-6 — Trial/billing first-use items (C5-P1-02, C5-P8-02/03/04).**
(1) A failed start_cascade at consent silently downgrades a new user
to Free forever — proposal: retry queue + one calm line; cascade code,
so billing-gated. (2) No surface names the trial end date — proposal:
one line on SettingsAccount + the trial banner. (3) "Your store adds
a further 7 days free" is true only if both store consoles carry the
intro offers (H4-adjacent: verify in consoles). (4) "Switch to Free"
writes tier locally only and the next cloud refresh restores Pro —
proposal: route to Play's cancellation surface instead. All four are
billing-locked; each has an exact minimal change ready.

**FQ-7 — Within-session PR (C5-P15-02).** Set 2 beating set 1 inside
the same first session counts as a full PR ("1 new PR" on the
summary). Intended, or should the first session count as baseline
only? No recorded ruling either way; PR maths untouched until you
rule.

**FQ-8 — Experienced-lifter fast lane (C5-P33-04).** The wizard is
identical for a ten-year lifter and a novice. Options: (a) reorder so
experience is asked first and prunes later steps; (b) status quo
(progressive disclosure already keeps it light). Structural change to
onboarding — recorded, not executed.

## New founder items (carried to the handover)

FR-C5-1 instrumentation gaps (no check-in-completion or
block-completion event; free path emits zero telemetry; final wizard
step unmeasured — new telemetry needs your privacy ruling) ·
FR-C5-2 within-session PR semantics (=FQ-7) · FR-C5-3 E-10's recorded
trial-first entry (Free reads as post-trial residue by design OB-1 —
revisit only if you choose) · FR-C5-4 FB-12 fully-rested recovery
week undetectable · FR-C5-5 C5-P33-06 manual landmarks gated on
hasData (consistent with advanced-stays-advanced; recorded).

FR-1..5, FR-C4-1..11, FR-PW-1, H4 carried unchanged. Evidence updates:
FR-C4-4's exposure is live in first use (see FQ-3); FR-C4-2's
consolidation case is strengthened by C5-P28-02 (the dual-family
drift now demonstrably loses onboarding prefs across devices — the
wave D fix uses the existing dual-write pattern, the architecture
question stays open).
