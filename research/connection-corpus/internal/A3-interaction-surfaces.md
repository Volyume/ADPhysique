# A3 — Every person-to-person / coach-facing interaction surface in Volyume today

Read-only inventory for the connection-corpus synthesis session. Scope: TASK A3
only — no design, placement, pricing or go/no-go judgement is made here.
Source-confidence tags per claim: **[OBSERVED]** = read directly in this
session from the actual source file/migration named; **[INFERRED]** = reasoned
from that source but not executed/verified at runtime (no device or simulator
was used for this task — everything below comes from static code reading).
There is no [DOCUMENTED] tier here because there is no external publication for
our own codebase; "OBSERVED" is used in that role, always with `file:line`.

Governing fact for everything below: Volyume has **no social feed, no
leaderboard, no follower graph, no in-app user search/discovery of any kind**
[OBSERVED `src/lib/partners/link.js:4-5`: "Pairing is code/link based, with NO
in-app user search or discovery of any kind"]. Every surface below was built
against that constraint. Where a surface is Pro-gated or free, that is stated;
none of it is graded for adoption here.

---

## 1. The Training Partner system (NEW-002) — the one real person-to-person feature

This is the only surface where two Volyume users interact with each other's
data at all. It is a single, chosen, private pairing — never a network.

### 1.1 What it is, top to bottom

- **Screen**: `src/screens/PartnerScreen.js` — reached from the Progress hub
  tile and a Consistency slim row [OBSERVED `src/screens/PartnerScreen.js:1-16`
  header comment]. Pro-gated: registered as
  `withProGuard(PartnerScreen, 'Training partner')`
  [OBSERVED `src/navigation/RootNavigator.js:192,430`].
- **Hook**: `src/hooks/usePartners.js` — offline-first read (local SQLite
  mirror), online-only for the mutating actions (invite/redeem/cheer/unpair/
  block/proposeBlock/adoptBlock/leaveBlock) [OBSERVED
  `src/hooks/usePartners.js:1-178`].
- **Pure logic**: `src/lib/partners/link.js` (invite link build/parse),
  `signals.js` (ticks label, cheer-allowed, row state, free/Pro cap),
  `sharedStreak.js` (the joint weekly streak reduction), `weekSignalWriter.js`
  (writes the user's own derived week state into every active pair).
- **Online ops**: `src/lib/partners/service.js` — `createPartnerInvite`,
  `redeemPartnerInvite`, `sendCheer`, `blockPartner`, `unpairPartner`,
  `pushWeekSignal`, `proposeSharedBlock`, `adoptSharedBlock`,
  `leaveSharedBlock`, `fetchPartnerView` [OBSERVED
  `src/lib/partners/service.js:1-252`].
- **Sync**: `src/lib/sync/tables/partners.js` — the one PAIR-scoped registry
  entry (every other table is user-scoped); pulls partnerships + both members'
  week signals/cheers/shared-block for active pairs, prunes locally when the
  cloud no longer returns a pair as mine, and is what fires
  `schedulePartnerBeats` on every pull [OBSERVED
  `src/lib/sync/tables/partners.js:1-195`].
- **Local schema**: `partnerships`, `partner_week_signals`, `partner_cheers`,
  `partner_shared_blocks` tables in `src/lib/database.js:1345-1488`.
  `partner_blocks` is explicitly a server-only write surface, never mirrored
  locally [OBSERVED `src/lib/database.js:1343`].
- **Cloud schema**: `supabase/migrate_081_training_partners.sql` (four tables +
  RLS + `create_partner_invite`/`redeem_partner_invite` RPCs + 4 telemetry
  names), `supabase/migrate_092_partner_end_purge.sql` (the real deletion on
  unpair), `supabase/migrate_100_partner_shared_blocks.sql` (the shared-block
  table + purge trigger + 3 more telemetry names).
- **Edge function**: `supabase/functions/partner-cheer/index.ts` — the one
  cheer-send path (see §1.5).
- **Notifications**: `src/lib/notifications/partnerBeats.js` (pure copy/gates)
  + `schedulePartnerBeats` in `src/lib/notifications/scheduler.js:1338-1460`
  (the OS-facing wiring: quiet hours, `CATEGORY.PARTNER_CHEER` push budget,
  preferences toggle, ED-flag suppression, per-user watermark).
- **Guard test**: `src/lib/partners/__tests__/partnerPrivacy.guard.test.js` —
  a source-level regex/AST guard that fails the build if any partner cloud
  write ever contains a raw-data key (weight, kcal, protein, sets, photo,
  location, etc.) outside an explicit allow-list
  [OBSERVED lines 36-54].

### 1.2 What crosses the wire — the "derived only" contract

Per-pair, per-week: `planned_count`, `done_count`, `week_met` (boolean),
`state` ('training'|'resting') — never a raw workout
[OBSERVED `supabase/migrate_081_training_partners.sql:112-126`]. A cheer is a
timestamped row with a `UNIQUE(pair_id, sender_id, sent_on)` constraint that
**is** the one-per-local-day rate limit, enforced at the database, not client
trust [OBSERVED lines 181-192]. The one piece of genuinely user-authored
content anywhere in the whole system is the shared-block **display name**
(≤80 chars, the proposer's own plan name), explicitly called out as the single
exception to "never raw content" [OBSERVED
`supabase/migrate_100_partner_shared_blocks.sql:14-19`, and
`src/lib/partners/service.js:154-158`].

What a partner is guaranteed to **never** see, verbatim from the in-app
privacy receipt and the identical web landing copy: weights/sets/reps, body
weight, measurements or photos, food/calories/diary, check-ins or anything
told the coach, location [OBSERVED `src/screens/PartnerScreen.js:44-50` and
`public/partner/index.html:74-81` — same five bullets, word for word].

### 1.3 The "no-blame" streak design (worth its own note — an anti-shame pattern already built)

`src/lib/partners/sharedStreak.js` is a deliberate structural inversion of the
Duolingo "break streak" mechanic: a week where either partner is resting
(deload/pause/wellbeing hold) **holds** the streak rather than breaking it —
and a wellbeing/ED hold is indistinguishable from a planned recovery week by
design [OBSERVED lines 9-14]. A week where someone trained but missed target
is a "quiet week": the streak holds, no notification fires, and copy never
attributes the quiet week to a person [OBSERVED lines 14-17]. Only after 4
consecutive quiet weeks does the run "archive" (never described as a failure,
copy: "Start a new run together?") [OBSERVED lines 19-22, 89].

### 1.4 Free vs Pro

`maxPartnersForTier`: free = 1 active partner, Pro = up to 3
[OBSERVED `src/lib/partners/signals.js:56-63`]. The whole feature (screen +
route) is behind `withProGuard` regardless of cap
[OBSERVED `src/navigation/RootNavigator.js:192`].

### 1.5 Pairing mechanics: invite creation, redemption, sending, blocking

- **Create**: `create_partner_invite(streak_enabled)` — SECURITY DEFINER RPC,
  server generates a 10-char uppercase-hex code, stores only its SHA-256 hash,
  returns the plaintext once for out-of-band sharing
  [OBSERVED `supabase/migrate_081_training_partners.sql:239-269`].
- **Redeem**: `redeem_partner_invite(code)` — checks not-self, not-expired
  (7 days), single-use, and neither side has blocked the other; every failure
  raises the identical `invite_invalid` so a blocked person cannot distinguish
  a block from a stale code [OBSERVED lines 278-319].
- **Send**: `PartnerScreen.inviteVia(target)` builds a fresh invite per tap and
  opens `sms:`/`whatsapp://send`/`mailto:` directly (founder decision
  2026-06-30: separate Text/WhatsApp/Email buttons rather than only the OS
  share sheet), falling back to `Share.share` if the target app can't be
  opened [OBSERVED `src/screens/PartnerScreen.js:96-137`]. Android package
  visibility for this is declared via `SENDTO`/`VIEW` intent queries for
  `smsto`, `mailto`, `sms` in `app.json:184-186`.
- **Redeem entry**: manual code paste field, or an incoming deep link
  (`route.params.code`) auto-redeems unless already paired
  [OBSERVED `src/screens/PartnerScreen.js:63-78`].
- **Block**: `blockPartner(userId, blockedId)` upserts into `partner_blocks`
  (server-only; never mirrored locally); the redeem RPC consults it; emits
  `partner_blocked` telemetry [OBSERVED `src/lib/partners/service.js:90-107`].
  There is **no in-app "report" affordance** distinct from block — the only
  moderation primitive is silent blocking plus the identical failure message
  on redemption. [INFERRED from absence: no `report` string anywhere in
  `src/lib/partners/*`.]
- **Unpair**: `unpairPartner` → `end_partnership` RPC; the local mirror is
  cleared immediately client-side rather than waiting for the next pull
  [OBSERVED `src/hooks/usePartners.js:114-122`]. The surviving partner sees
  only "Partnership ended" — the same wording whether the other side unpaired
  or deleted their whole account, deliberately indistinguishable ("no
  death-vs-departure leak") [OBSERVED
  `supabase/migrate_081_training_partners.sql:33-36,68-74`].
- **Cheer**: `supabase/functions/partner-cheer/index.ts` — inserts the cheer
  as the caller (RLS proves membership; the UNIQUE constraint is the rate
  limit, a duplicate returns HTTP 429 as `already_cheered`, not a second
  push); then, with the **service role**, checks the *recipient's* open
  ED/wellbeing flag and if one is open, **downgrades delivery to in-app only**
  — the cheer is still recorded, but no push fires at a flagged user
  [OBSERVED lines 100-131]. Otherwise it fans out via a separate `send-push`
  function with the sender's first name in the push title/body ("X sent you a
  cheer") [OBSERVED lines 134-156] — the one place a partner's actual name (as
  opposed to a derived signal) is used, but only the name of someone the user
  already chose to pair with.

### 1.6 Notifications: exactly two partner pushes, both budgeted and suppressible

`schedulePartnerBeats(userId)` fires on every partner sync pull (the only
moment a cheer/streak resolution can arrive) [OBSERVED
`src/lib/sync/tables/partners.js:179-188`]. It is fully gated: an open
ED/wellbeing flag silences it entirely (return before touching notifications)
[OBSERVED `src/lib/notifications/scheduler.js:1362-1365`]; a
`partnerCheerEnabled` preference toggle (default on) can turn it off
[lines 1367-1374]; each push goes through `requestEventPushSlot` under
`CATEGORY.PARTNER_CHEER`'s budget slot [lines 1395, 1426]; quiet hours shift
the fire time [line 1394]; and a per-user AsyncStorage watermark makes each
distinct cheer/streak-run notify at most once, and a cheer synced more than 48h
late is treated as history, not news, and never fires
[OBSERVED `src/lib/notifications/partnerBeats.js:19,58-64`]. The streak-kept
push only fires on a **growing** run of 2+ weeks — a lapsed or shrinking run
never notifies ("the locked streak rule applies to pushes too")
[OBSERVED lines 72-78].

### 1.7 Deep-link / universal-link mechanics (a wired path with an apparent gap)

- Scheme registered: `volyume://` (iOS scheme + Android `intentFilters`,
  `autoVerify: true`) and universal link `https://volyume.app`
  (`autoVerify: true`) [OBSERVED `app.json:82-103`].
- `apple-app-site-association` restricts the app-link claim to `/partner/*`
  [OBSERVED `public/.well-known/apple-app-site-association:1-11`] — but still
  contains the literal placeholder `REPLACE_WITH_APPLE_TEAM_ID` in the App ID.
- `assetlinks.json` (Android) still contains the literal placeholders
  `REPLACE_WITH_SHA256_OF_PLAY_APP_SIGNING_KEY_CERT` and
  `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT`
  [OBSERVED `public/.well-known/assetlinks.json:1-13`] — i.e. Android App
  Links verification for `volyume.app` cannot currently be cryptographically
  verified with real values. [INFERRED: unverified App Links fall back to a
  disambiguation chooser or plain browser open rather than an auto-open into
  the app, per standard Android behaviour — not confirmed on-device here.]
- A real, finished fallback web page exists at `public/partner/index.html`: it
  states the identical five-bullet derived-signals promise, resolves the code
  from the path/`?c=`/`#fragment`, and offers "Open in Volyume"
  (`volyume://partner/<CODE>`) and a store badge (Play Store live; the Apple
  link still carries the literal placeholder `idREPLACE_WITH_APP_STORE_ID`
  pending iOS launch) [OBSERVED lines 84-118].
- **Apparent gap** [INFERRED from source, not device-tested]: React
  Navigation's own `linking` config in `src/navigation/RootNavigator.js:635-672`
  maps exactly four paths — `workout/start`, `diary`, `routine/:planId`,
  `progress` — and has **no `Partner` / `partner/:code` entry anywhere in its
  `screens` tree**, despite `PartnerScreen.js`'s own header comment and code
  explicitly expecting to be opened via `route.params.code` from
  `volyume://partner/<CODE>` or `https://volyume.app/partner/<CODE>`
  [OBSERVED `src/screens/PartnerScreen.js:63-68`, `src/lib/partners/link.js:6-8`].
  A repo-wide search shows `parseInviteCode` is imported only by
  `PartnerScreen.js` itself and its own tests — nothing in navigation wiring
  calls it. Per RootNavigator's own comment on how unresolvable links behave
  ("React Navigation can't resolve the URL and simply leaves the user on
  whatever stack is mounted" [OBSERVED lines 622-627]), tapping the invite
  link today would very likely **not** land on PartnerScreen with the code
  prefilled — it would resolve to nothing and leave the user wherever they
  already were. This is stated as an observed structural gap in the linking
  config, not a confirmed runtime failure (no device/simulator was used).

### 1.8 Production-readiness caveat — read this before assuming the privacy promises are live

Per `CLAUDE.md`'s own STATUS line: *"Outstanding founder actions: apply
`supabase/migrate_092`..`_099` to EU-Dublin (manual, founder-run...)"*. Both
`migrate_092_partner_end_purge.sql` (the migration that makes "everything
shared is deleted" on unpair actually true — its own comment states the
original 081/service.js code's claim of an automatic cascade "never existed")
and `migrate_100_partner_shared_blocks.sql` (the entire shared-training-block
feature) are marked **"Applied remotely: NO"** in their own file headers
[OBSERVED `supabase/migrate_092_partner_end_purge.sql:1-20`,
`supabase/migrate_100_partner_shared_blocks.sql:37-39`]. Until a founder
manually runs these against EU-Dublin, (a) ending a partnership in production
may only mark it 'ended' without purging the shared signals/cheers rows, and
(b) the "train the same block" feature has no cloud table to write to (the
client code benign-skips a missing table by design, so this degrades
gracefully to "no shared block yet" rather than erroring
[OBSERVED `supabase/migrate_100_partner_shared_blocks.sql:49-52`]).

### 1.9 Telemetry

Seven partner event names exist, counts/booleans only, explicitly never
partner identity: `partner_invite_sent`, `partner_invite_accepted`,
`partner_cheer_sent` (carries a `reciprocal` boolean), `partner_blocked`,
`partner_block_proposed`, `partner_block_adopted`, `partner_block_left`
[OBSERVED `src/lib/telemetry/events.js:179-182`,
`supabase/migrate_100_partner_shared_blocks.sql:275-281`].

---

## 2. Share cards — the only outbound artefacts to people outside the app

`src/screens/ShareCardScreen.js` is one Skia renderer
(`src/lib/shareCard/drawShareCard.js`) used for both the on-screen preview and
the exported PNG, so preview and export can never drift
[OBSERVED `src/screens/ShareCardScreen.js:1-12`]. Four card types: `session`,
`pr`, `milestone`, `weekly` (the "great week" recap). Two export actions exist
on the screen itself: **"Share to Story"** (renders the PNG, opens the native
OS share sheet framed as an Instagram/Facebook Story share — a deliberate
zero-new-dependency choice over a direct-composer intent, which would need a
registered Facebook App ID [OBSERVED lines 299-330]) and **"Save to gallery"**
(`expo-media-library`, asks the add-photos permission, calm failure message on
denial [OBSERVED lines 269-297]). No plain "Share" (generic OS share sheet)
button exists on this screen independent of the Story flow — only Story-share
and gallery-save. A `pdfBtn`/`pdfBtnText` style pair is defined in the
stylesheet [OBSERVED lines 616-621] with no corresponding JSX anywhere in the
file — an orphaned style, not a missing feature (the actual "Save as PDF"
paths live entirely in §3/§4 below, on different screens).

### 2.1 Every entry point into ShareCardScreen, and what each one sends

| Caller | Card type | What it carries | file:line |
|---|---|---|---|
| WorkoutSummaryScreen (`handleShareCard`) | session/pr | session name, duration, working sets, exercise count, tonnage, exercise names, PR count, top set, intensity tier; lets the user pick *which* PR to feature if several were set | `src/screens/WorkoutSummaryScreen.js:595-625` |
| WorkoutSummaryScreen (`handleShareMilestone`) | milestone | an early-win milestone's title/hero value/caption | `src/screens/WorkoutSummaryScreen.js:629-641` |
| WorkoutSummaryScreen (`handleShareBlock`) | milestone | training-block-complete: weeks trained | `src/screens/WorkoutSummaryScreen.js:643-657` |
| CoachOutputScreen (`handleShareWeek`) | weekly (the "great week" recap) | the whole weekly coach `output` object plus the week's standout lift; gated on `isGreatWeek()` and force-stripped under `suppress` (open ED flag or calm mode) | `src/screens/CoachOutputScreen.js:1961-1990`, `src/lib/shareCard/greatWeek.js:1-185` |
| AnalyticsScreen (streak / perfect-month / tonnage milestones) | milestone | weeks-running count, or "Textbook Month" stats, or lifetime tonnage total | `src/screens/AnalyticsScreen.js:129-185` |
| LiftProgressScreen ("Share this PR" row menu) | pr | exercise name, best e1RM-derived weight, date | `src/screens/LiftProgressScreen.js:148-171` |
| YearOfLiftsScreen (`handleShareYear`) | milestone | month/block/year recap: tonnage, sets, PR count or unique-exercise count, session count, date range — comment explicitly: "Factual training stats only... never bodyweight, measurements or notes" | `src/screens/YearOfLiftsScreen.js:491-539` |

`ProgressPhotosScreen.js` has **no** ShareCard entry point at all — confirmed
by direct grep of the file; the only `ShareCard`-adjacent text in it is an
unrelated code comment [OBSERVED
`src/screens/ProgressPhotosScreen.js:20-21`]. Progress photos never leave the
device through any sharing surface found in this search — the strongest
possible reading of the "never photos" rule.

### 2.2 The "great week" gate (`src/lib/shareCard/greatWeek.js`)

A week is only ever offered as shareable when `hasEnoughData`, no ED-safety
signal is open (`edPatternFired`/`ffmFloorHeld`/`rapidWeightLossFlag` all
false), on-target trend, ≥75% of planned sessions hit, no deload suggested,
and at least one of (a PR this week / clean recovery)
[OBSERVED lines 40-65]. When shown, the real weight change is put on the card
**only** for a cut goal that actually lost weight on target — never for
bulk/recomp/maintenance, and never as a bare number without an explicit
heading like "weight lost this week" [OBSERVED lines 98-131]. Under
`suppress` (ED flag or calm mode) every weight/progress number and the
best-lift hero are dropped entirely, leaving only self-referential,
controllable wins (sessions, PRs, recovery) [OBSERVED lines 24-26, 116].

### 2.3 Privacy copy shown to the user at share time

"Name, bodyweight, measurements and private notes are never included" for
session/PR/milestone cards; "Only this week's progress, lifts and sessions are
shown. Your measurements and private notes are never included" for the weekly
recap [OBSERVED `src/screens/ShareCardScreen.js:476-480`].

---

## 3. The coach handover report — the one artefact explicitly meant for a real human coach/GP/physio

`src/lib/coachReport.js` builds a PDF ("Coach handover report") from the
user's own training history, weight trend, current targets and the
deterministic engine's persisted weekly decisions — explicitly contrasted in
its own header comment against share cards: *"share cards are public, outbound
social artefacts and are data-minimised by rule... This report is the
opposite class: the user's OWN complete data... it leaves the device only
through the user's explicit share action"* [OBSERVED lines 1-15]. Exposed from
`SettingsDataScreen.js` ("Coach handover report (PDF)" — sub-label: "Training,
trend, targets and coaching decisions, for a coach or GP")
[OBSERVED `src/screens/SettingsDataScreen.js:263-269`].

**ED-safety inheritance** (directly relevant to the hard constraint that any
connection surface must inherit ED-safety and calm voice): the report has a
**neutral variant** that fires under an open ED-pattern flag, a positive SCOFF
screen (score ≥2), calm mode, **or a failed read of either the flag or the
body profile** — i.e. fail-closed, a transient read error can never produce
the fuller variant [OBSERVED `src/lib/coachReport.js:16-27, 254-267`]. On the
neutral path bodyweight rows are never even read from the database
[OBSERVED line 272: `neutral ? Promise.resolve([]) : getMorningWeights(...)`].
A `DISCLOSURE_PROSE` regex filters every persisted engine sentence in the full
variant so it can never reveal wellbeing screening, safety holds, lockouts or
cycle state to the third party the report is handed to, and whole "held
decision" rows of type `ed_pattern_lockout`/`ed_pattern_cleared`/`ffm_floor`
are dropped entirely rather than rendered redacted-but-visible
[OBSERVED lines 58-70, 208-216]. This is the single most complete existing
model in the codebase for "how do we let something leave the device toward
another human without leaking a safety signal," and is a strong precedent for
whatever a future connection surface needs to inherit.

---

## 4. Data export / backup / import — not person-to-person, but genuine "send" surfaces

These move data off-device via the native OS share sheet (so the destination
is whatever app/contact the user picks — email, Files, AirDrop, WhatsApp,
etc.) or bring a file in. None of them involve another Volyume user; listed
because the task explicitly asked for export/send surfaces.

- **Full local backup** — `src/lib/dataBackup.js`: `exportBackup()` dumps the
  **entire local SQLite database plus every `@volyume_`-prefixed preference**
  into one JSON file, shared via the OS share sheet
  [OBSERVED lines 52-83]. This is the **one export surface with no
  data-minimisation at all** — by design, it is the whole personal database
  (unlike share cards or the coach report), the explicit exception being
  entitlement/tier/trial/billing keys, which are excluded from both dump and
  restore so a crafted backup file can never flip a device to Pro
  [OBSERVED lines 20-31]. `importBackup()` is the reverse path
  (`expo-document-picker` → validate format/version → full restore) — this is
  the closest thing in the app to a full personal-data-interchange format, and
  it is entirely un-redacted.
- **Diary CSV / PDF export** — `src/lib/food/csvExport.js`:
  `exportDiaryCsv`/`exportDiaryPdf`, invoked from `FoodInsightsScreen.js`
  ("Export the last N days as a CSV file" / "...as a PDF report to share with
  a coach or GP" [OBSERVED `src/screens/FoodInsightsScreen.js:526-550`]). The
  CSV neutralises spreadsheet-formula injection on any food/brand name
  originating from an external database [OBSERVED
  `src/lib/food/csvExport.js:18-32`, comment references audit A2-060].
- **Workout log CSV export** — `SettingsDataScreen.exportData()`, builds a CSV
  of all logged sets via `buildWorkoutCSV`, shared via the OS sheet
  [OBSERVED `src/screens/SettingsDataScreen.js:97-123`].
- **Import from another app** — `src/screens/ImportScreen.js`: one-way CSV
  import from Hevy or Strong exports (`src/lib/importExternal.js` does the
  parsing/matching) [OBSERVED lines 1-80]. Inbound only; nothing is sent.

---

## 5. Support / diagnostics channels — app-to-founder, not person-to-person, but "send" surfaces

- **In-app feedback** — `src/components/FeedbackSheet.js` /
  `src/lib/feedback.js`: three triggers (contextual, shake-to-report,
  Settings "Send feedback"), all landing in one Supabase `user_feedback` table
  (EU-Dublin, same residency as everything else). Auto-attaches session id,
  build identity, current screen, recent screen/action breadcrumbs and the
  most recent error in the last 60s [OBSERVED
  `src/lib/feedback.js:1-24`]. The sheet's own copy to the user: "Sent with
  build info, your last few actions, and a recent error if any. Body
  measurements and names are stripped before sending"
  [OBSERVED `src/components/FeedbackSheet.js:346-349`] — this claim was not
  independently verified against the scrubbing code in this pass (out of
  scope for A3; flagged as [INFERRED] from the UI copy only).
- **Debug log share** — `src/screens/DebugLogScreen.js`: `handleShare()` calls
  `exportErrorsAsText()` then the OS `Share.share` sheet with the raw buffered
  error/warn/info log (last 200 entries) and any stored crash log, entirely
  user-initiated from a long-press on the version number
  [OBSERVED lines 8, 48-52].
- **Share build identifier** — `SettingsAboutScreen.js`: tapping the version
  number does `Share.share({ message: 'Volyume vX.X.X (platform build, env)' })`
  — a trivial bug-report convenience, not user data
  [OBSERVED lines 63-81].
- **Store review** — same screen, opens the in-app review sheet
  (`expo-store-review`) or falls back to the platform store URL; not
  person-to-person.

---

## 6. Confirmed absences (searched for, not found — useful negative evidence)

- **No referral/invite-a-friend program of any kind.** A repo-wide
  case-insensitive search for `referral` in `src/` returns zero matches.
  The only "invite" vocabulary anywhere is the training-partner invite (§1).
- **No plan/routine sharing.** `PlanDetailScreen.js` and
  `RoutineDetailScreen.js` contain no `share`/`Share` token at all (grepped
  directly); `ManualBuilderScreen.js`'s only "share" hits are the unrelated
  words "shared supersetGroupId". There is no way today to send a built
  plan/routine to another person, unlike some competitors' public-routine
  sharing.
- **No in-app user search, friend list or discovery surface** — stated as a
  deliberate design decision in source, not merely absent
  [OBSERVED `src/lib/partners/link.js:4-5`].
- **No gift/family-sharing billing path** — `src/lib/payments/` has no
  gift/family/household vocabulary (grepped directly).
- **BodyMetricsScreen** explicitly tells the user body-metric data "is never
  shared or uploaded" [OBSERVED `src/screens/BodyMetricsScreen.js:380`] and
  carries no share affordance.
- **ProgressPhotosScreen** has no share/export path of any kind (§2.1).

---

## 7. One clarification the synthesis session will need: "the coach" is not a person

Every "coach output" surface in this codebase (`CoachOutputScreen.js`, and the
prose builders `src/lib/coachResponse.js`, `src/lib/whyThisTemplates.js`) is
the deterministic engine speaking in a designed voice
(`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`), never a human and never an LLM
[CLAUDE.md §2: "The coaching engine is deterministic. No AI. Ever."]. The
**only** place the app's coaching output is packaged to reach an actual human
professional is the coach-handover PDF in §3 — everything else framed as
"coach" is the app talking to its own single user. Any future connection
surface that reuses "coach" language toward a second person (e.g. a real
trainer, or a training partner) needs to keep this boundary explicit so users
are never misled into thinking a human reviewed anything.

---

## Source index (all files read this session)

`src/screens/PartnerScreen.js`, `src/hooks/usePartners.js`,
`src/lib/partners/{service,link,signals,sharedStreak,weekSignalWriter}.js`,
`src/lib/partners/__tests__/partnerPrivacy.guard.test.js`,
`src/lib/sync/tables/partners.js`, `src/lib/database.js` (partner table DDL +
CRUD, lines ~1340-1490, 4742-4923), `src/lib/notifications/{scheduler,
partnerBeats,categories,budget}.js`, `src/navigation/RootNavigator.js`,
`supabase/migrate_081_training_partners.sql`,
`supabase/migrate_092_partner_end_purge.sql`,
`supabase/migrate_100_partner_shared_blocks.sql`,
`supabase/functions/partner-cheer/index.ts`,
`src/lib/telemetry/events.js`, `app.json`,
`public/partner/index.html`, `public/.well-known/{apple-app-site-association,
assetlinks.json}`, `src/screens/ShareCardScreen.js`,
`src/lib/shareCard/{drawShareCard,greatWeek}.js`, `src/lib/sessionShareData.js`,
`src/screens/{WorkoutSummaryScreen,CoachOutputScreen,AnalyticsScreen,
LiftProgressScreen,YearOfLiftsScreen,ProgressPhotosScreen,BodyMetricsScreen,
PlanDetailScreen,RoutineDetailScreen,ManualBuilderScreen}.js`,
`src/lib/coachReport.js`, `src/lib/dataBackup.js`, `src/lib/food/csvExport.js`,
`src/screens/{SettingsDataScreen,FoodInsightsScreen,ImportScreen,
DebugLogScreen,SettingsAboutScreen}.js`, `src/components/FeedbackSheet.js`,
`src/lib/feedback.js`, `src/lib/payments/` (grep only), `CLAUDE.md`.
