# Partners — Design & Usability Audit

**Date:** 2026-07-09. **Scope:** feature-completeness, UX quality, ease of use.
**Method:** read against build history (`docs/partners-build-2026-07-03/DESIGN-SPEC.md`,
`docs/volyume-elite-audit/06-partners-deep-dive.md`, `docs/volyume-elite-audit/
WHOLE-APP-FAILURE-REGISTER-2026-07-04.md`, `docs/volyume-launch-audit-2026-07-08/
01-build-wave-plan.md`), then verified line-by-line against CURRENT code in
`src/screens/PartnerScreen.js`, `src/hooks/usePartners.js`, `src/lib/partners/*`,
`src/lib/notifications/partnerBeats.js`, `src/lib/sync/tables/partners.js`,
`src/components/PartnerRow.js`, `src/components/PartnerPrivacyReceipt.js`, and the
call sites in `YouScreen.js`, `AnalyticsScreen.js`, `ConsistencyScreen.js`,
`WorkoutSummaryScreen.js`, `ProgressPhotosScreen.js`, `RootNavigator.js`. All 31
partner test suites / 377 tests were run and pass (`npx jest` targeted run,
2026-07-09). No source code was changed for this audit.

## Headline finding: the code has moved well past both source documents

`06-partners-deep-dive.md` (2026-07-04) diagnosed Partners as "a beautiful shell
around a single weekly boolean" and offered Option A (mutual weekly commitment),
Option B (richer encouragement + lifecycle moments), Option C (real shared
block). The CURRENT code has built **A and B in full, plus more than B asked
for**:

- Option A (shared object): `src/lib/partners/intention.js` — a real mutual
  weekly aim (`weeklyAim`), a shared "You both kept your week" moment
  (`weekKeptTogether`), rest-safe and comparison-proof (own aim vs own result
  only, pinned by `screens/__tests__/partnerComparison.guard.test.js`).
- Option B (reciprocity): `src/lib/partners/acknowledgements.js` — the single
  wordless cheer became a 4-line fixed acknowledgement picker (`ACKSheetBody`,
  `PartnerScreen.js:1250-1279`); `src/lib/partners/moments.js` adds a
  `partner_joined` moment AND `partnerBeats.js:45-51` + `scheduler.js:1477-1479`
  wire an actual **push notification** when a partner accepts — the deep-dive's
  "most glaring dead moment" (P1-11) is fixed, both in-app and as a push.
- Beyond B: a whole new "Share an update" system
  (`src/lib/partners/shareWins.js`, `PartnerScreen.js:1281-1378`) lets a user
  explicitly compose and preview one of four sanitised update types (workout
  summary, PR, training-phase milestone, progress-photo comparison) and send it
  with an approve-before-send receipt, sender-side delete, and a hard
  forbidden-field allowlist (`SHARE_WIN_FORBIDDEN_FIELDS`) — this is the
  "something to screenshot-and-send about the two of you" gap the deep-dive
  flagged as unbuilt, now built.
- Option C (real shared block / plan sync) was correctly NOT built — it remains
  a shared **name** only ("training phase"), consistent with the deep-dive's
  read that it's the higher-risk, lower-evidence bet. The UI copy is honest
  about this everywhere it appears (`blockStatusCopy`, `PartnerScreen.js:206-228`:
  "shared as a phase name only... workouts, exercises, weights and notes stay
  private").

**Practical implication for this audit:** several items the source docs list as
"deferred" or "gap" are in fact fixed in current code. This report calls that
out explicitly per item below, because the docs are now stale against the
shipped state — worth a housekeeping pass so a future session doesn't
re-diagnose fixed work as broken.

---

## 1. ST-1 (Partners load-failure-as-empty-state) — VERIFIED FIXED, not deferred

`docs/volyume-elite-audit/WHOLE-APP-FAILURE-REGISTER-2026-07-04.md:283-303` logged
ST-1 as major: any load failure collapsed to the "no partner" acquisition pitch,
with no error state and no retry. `docs/volyume-launch-audit-2026-07-08/
01-build-wave-plan.md:77` still lists it as "Deferred (not this build wave)."

**Current code contradicts both documents — ST-1 is fixed, and fixed well
beyond the register's suggested fix direction:**

- `usePartners.js:39-43` — `EMPTY` now carries an explicit `error` and
  `localReadIssue` field, not just a collapse to `rowState: 'empty'`.
- `usePartners.js:108-116` — `readPartnershipsWithCloudRepair` retries via a
  live cloud pull (`pullPartnerMirrorNow`) before treating a local read failure
  as fatal.
- `usePartners.js:301-307` — `safeEnrichPair` wraps each pair's enrichment
  individually, so **one bad pair degrades to a minimal card** rather than
  rejecting the whole `Promise.all` (exactly the register's suggested fix).
- `usePartners.js:449-459` — the catch branch is graduated: if there is any
  usable prior state (pairs/pending invite/partnership) or this is the first
  failure, it sets `localReadIssue: true` and **keeps the last good data
  visible**; only a second consecutive failure with nothing usable shows the
  hard error.
- `PartnerScreen.js:983-998` — a dedicated error branch (`EmptyState` +
  "Couldn't load... Refresh Partners" + retry action), separate from the empty
  state, exactly the register's fix direction.
- `PartnerScreen.js:1009` + `LocalReadNotice` (`:391-407`) — a soft, dismissable
  "Refresh partner data" notice for the `localReadIssue` (degraded but usable)
  case, which the register didn't even ask for.
- Verified by `src/hooks/__tests__/usePartners.loadError.test.js` (7 tests,
  covering first-failure-shows-notice-not-error, cloud-mirror-repair,
  per-pair-detail-failure-does-not-blank-a-pair, capacity-count-failure,
  refresh-failure-keeps-last-good-state, and stale-request-cannot-clobber-a-
  newer-load). All pass.

**Verdict:** ST-1 is not merely fixed but over-delivered relative to the
register's ask. **Action needed:** update
`docs/volyume-launch-audit-2026-07-08/01-build-wave-plan.md:77` and the
WHOLE-APP-FAILURE-REGISTER so a future session doesn't re-open or re-build this.

---

## 2. Invite / join flow, end to end

**Inviter side** (`PartnerScreen.js:539-1247`, `InviteJourney` component
`:1465-1549`):
1. Empty state → "Invite someone you train with" (1 tap) →
2. Beat 1 "A partner, not an audience" → Continue (1 tap) →
3. Beat 2 = `PartnerPrivacyReceipt` in full + explicit consent line ("Pairing
   means you both agree to share this, and only this. Notice v2.") → "Agree and
   get my code" (1 tap; this is also the point the code is minted and the
   consent RPC fires) →
4. Beat 3 = the code, `type.display` scale, wide letter-spacing, three share
   channels (Text/WhatsApp/Email) + "More options" (1 tap to share) → dismiss to
   pending state.

Total: **4 taps** from empty screen to a shared invite. Reasonable for a
consent-bearing flow; matches the spec's three-beat design.

**Single-mint discipline is real**: `usePartners.js:499-511` (`invite`) reuses a
cached pending code (`getCachedInvite`) rather than minting a fresh one on every
share tap — matches DESIGN-SPEC B5's "every share channel reuses the ONE
minted code."

**Pending state** (`PendingCard`, `PartnerScreen.js:1380-1463`): live-checks
automatically while the screen is open (`REDEEM_SYNC_POLL_ENABLED`, 2s poll,
`PartnerScreen.js:672-677`) and offers a manual "Refresh status" with a spoken
result line, "Share invite again," and "Cancel invitation" (confirmed via
`AppAlert`). This is a genuinely well-built pending state — better than a
static "waiting" card.

**Redeemer side**: "I have a code" reveals a field (`PartnerScreen.js:1092-
1129`), 1 tap to reveal + type + 1 tap "Join." Deep links (`volyume://partner/
<CODE>` and the universal link) auto-fire redemption on open
(`PartnerScreen.js:649-666`) — genuine near-zero-friction acceptance for a
partner who already has the app.

**Failure states, verified**:
- Expired/invalid/already-used code → one indistinguishable message: "That
  invite did not work. It may have expired or already been used."
  (`PartnerScreen.js:794`) — correct: the RPC deliberately collapses every
  failure into `invite_invalid` (`service.js:224-227`) so an attacker cannot
  probe which reason applied.
- At-cap redemption → "You are at your partner limit." (`:790`), and the
  redeem path itself re-checks the live active count server-side-adjacent
  before attempting redemption (`usePartners.js:513-519`), not just at the UI
  layer — a genuine defence against a stale `canAdd` flag.
- Consent-write failure on accept → the partnership is **rolled back**
  (`service.js:243-247`, `end_partnership` RPC called) and the user sees "We
  could not record your agreement to share. Please try again." — fail-closed,
  no partial pairing without consent.
- Offline → every online op (`invite`, `redeem`, `cheer`, `unpair`, `block`,
  `shareWin`) returns `{ ok:false, error:'offline' }` defensively
  (`service.js:191, 221, 289...`) and the UI has per-action calm toast copy
  (`cheerFailureMessage`, `partnerWinFailureMessage`, `PartnerScreen.js:97-138`).

**A2 (minor, friction).** The paywall-preserved-invite re-surface
(`usePartners.js:364-399`, "A1 s9.3": a user who bounces at the Pro gate with a
code keeps it, auto-redeemed once eligible) is a nice touch, but it only fires
once per app-session (`pendingTriedRef`) and is silent if it fails — there is no
toast telling the user their held code was tried. Low-traffic path (Free user
with a code, upgrading), low severity.

---

## 3. What partners see of each other; the privacy receipt

**The privacy model is genuinely well-scoped and machine-enforced, not just
documented:**
- `src/lib/partners/__tests__/partnerPrivacy.guard.test.js` — a source-level
  guard with an explicit allowlist of every column any client write may ever
  send to a partner cloud table (`ALLOWED_PARTNER_WRITE_COLUMNS`). Adding a
  raw field (weight, food, notes, location) fails this test.
- `screens/__tests__/partnerComparison.guard.test.js` — bans comparison/ranking
  vocabulary ("ahead," "behind," "beat you," "leaderboard"...) from every
  partner-surface string literal, including the new intention/support-plan/
  moments/acknowledgements files.
- `src/lib/partners/__tests__/partnerNames.guard.test.js` and the shareWins
  `SHARE_WIN_FORBIDDEN_FIELDS` allowlist (`shareWins.js:71-89`) extend the same
  discipline to the new Share-an-update surface.
- The progress-photo before/after card (the one founder-approved exception that
  may include bodyweight, per CLAUDE.md) is correctly double-gated before it
  can ever reach a partner: `ProgressPhotosScreen.js:1082` (`canShare = ...
  &&!suppressed`) and `BeforeAfterShareSheet.js:162,413` (`suppressed` hard-gates
  the whole sheet under calm mode or an open ED flag). Verified in code, not
  just by comment.

**B1 (below par).** DESIGN-SPEC B3 mandates: "The privacy receipt (B4) rendered
in full. Pre-pairing, the receipt IS the pitch." Current empty state
(`PartnerScreen.js:1141-1157`, `howItWorks` Card) does **not** render the
`PartnerPrivacyReceipt` component — it shows an abbreviated 4-line "What your
partner sees" list instead. The full receipt only appears once, buried at Beat 2
of the invite journey (after the user has already tapped "Invite someone you
train with"). `06-partners-deep-dive.md:43-44` calls the receipt "the strongest
trust copy in the app... doubles as the consent notice" — that hero moment is
no longer the pre-conversion pitch it was designed to be; a prospective user
deciding whether to even start the invite flow sees the shorter version. The
shortened version also drops the explicit deletion promise line ("Everything
shared is deleted" in the spec's B4 footer; the shipped receipt's footer is
just "Either of you can end this at any time," `PartnerPrivacyReceipt.js:80-82`)
— note `consent.js:29-31` documents this as a deliberate "v2, shorter, plainer"
copy revision, not an oversight, but the founder should be aware the strongest
trust claim in the app was quietly softened.

**Copy quality**: calm, plain, no exclamation marks, no em dash — verified both
by reading and by the `partnerComparison.guard.test.js` em-dash assertion. The
resting-week framing is genuinely rest-safe throughout ("resting this week,"
never "missed," never red).

---

## 4. Day-to-day value and sync reliability

**What the surface shows day to day**, per active `PairCard`
(`PartnerScreen.js:409-513`):
- Shared streak hero (weeks running together, rest-safe, no-blame quiet-week
  hold, 4-quiet-week auto-archive with a reconnection prompt) —
  `sharedStreak.js`.
- Two stacked person-rows (never side-by-side/bars — deliberate
  anti-comparison layout).
- The mutual weekly-intention line and the "You both kept your week" moment.
- A milestone-moment slot (`streak_week_kept > completed_block > hit_pb >
  partner_joined` priority is actually `partner_joined` topping the rest —
  see `moments.js:53-55`; the report above the code comment is right, the code
  correctly ranks the join welcome highest).
- The guided "what they see" support-plan card with a single primary action
  (cheer, by default).
- "Share an update" entry + a small history of sent/received cards
  (`PartnerWinCards`, up to 3 shown, sender can delete).
- The shared-phase-name chip if one is proposed/active.

**Sync path is genuinely robust**, not cosmetic:
- Local-first reads with an active-pair background refresh every 10s while the
  screen is focused (`usePartners.js:478-487`) and a 2s poll while a pending
  invite exists (`:465-476`) — the surface updates without a manual pull.
- `pullPartners` (`sync/tables/partners.js`) is pair-scoped (both members' rows,
  not just the caller's), handles six sub-resources (partnerships, week
  signals, cheers, shared blocks, weekly intentions, win cards), prunes
  partnerships the cloud no longer returns (the "other side ended it while I
  was offline" case), and re-applies the deletion promise on the puller's own
  device when a partner's pair shows `ended` (`:129-135`).
- `pushPartners` and the local sync are tier-blind and lapse-aware
  (`tierGate.js`): a Pro user who churns to Free stops broadcasting live ticks
  and instead sends a calm `'resting'` state — the partner never sees a
  "your partner vanished" cliff, and the churned user's data-layer honesty is
  maintained even though their UI access is gated off.
- All of this is exercised by `sync/__tests__/sync.partners.test.js` and passes.

**B2 (friction, multi-partner Pro users).** Pro supports up to 3 concurrent
partners (`PRO_MAX_PAIRS = 3`), and `PartnerScreen.js` correctly renders every
active pair as its own isolated `PairCard`. However the **post-workout beat**
(`WorkoutSummaryScreen.js:247-249, 969-1008`) and its cheer/preview-win actions
only ever address the single "primary" pair from `usePartners`'s back-compat
`partnership` field (oldest active, or first pending, or first ended — see
`usePartners.js:84-89`), not the pair the user actually wants to act on. A Pro
user training with 2-3 partners cannot cheer partner B from the post-workout
screen if partner A happens to be "primary" — they must go into the full
Partners screen. Same limitation on the milestone moment shown there
(`WorkoutSummaryScreen.js:257-264`, `moments.find((x) => x.pairId ===
activePairId)` — only checks the primary pair's id). Low-cost fix: surface
whichever pair has a moment/cheer available that day, or a small pair-picker
chip when >1 active pair.

**Table-stakes comparison (Hevy/Strava-style social-lite features)**:
| Affordance | Volyume Partners | Note |
|---|---|---|
| Reactions/kudos | Fixed 4-line acknowledgement set, 1/day | Deliberately narrower than Strava's free kudos-tap — matches the no-shame, no-numbers brand; correct for this product |
| Activity feed | None (by design) | Correct refusal per the deep-dive's "no feed" lock |
| Explicit share of a specific win | Yes — 4 curated types with preview + approve + delete | Exceeds Hevy (no equivalent), matches the "share your PR" instinct Strava serves via its feed |
| Notification on partner joining | Yes — in-app moment + push (`joinPush`) | Closes the deep-dive's flagged gap |
| Streak/consistency signal | Yes — rest-safe, no-blame, auto-archive + reconnect | A real differentiator vs Duolingo-style break-and-shame streaks |
| Multi-partner support | Yes (Pro, up to 3), but the post-workout touchpoint only serves one (see B2 above) | Gap noted above |

---

## 5. Half-wired or dead code

**A3 (confusing to a future maintainer, not a user-facing bug).**
`src/components/PartnerRow.js` is fully dead code. Confirmed by:
- `grep` shows zero import/usage anywhere in the app outside its own file and
  its own test/comment references (`usePartners.js:403` just *mentions* it in
  a comment).
- `ConsistencyScreen.js` (192 lines) has **zero** occurrence of "partner" in
  any casing — the screen it was built for carries no reference to it at all.
- `screens/__tests__/partnerPlacementSpine.guard.test.js:47-51` explicitly pins
  "ConsistencyScreen carries NO Partners row (founder device-walk 2026-07-03:
  three entry points read as duplication; the Consistency row was the most
  out-of-place and was removed)" — so the orphaning is an intentional, tested
  decision, not an oversight.
- But `PartnerRow.js`'s own header comment (`:1-6`) still says "the slim
  training-partner status row on ConsistencyScreen... One line that says where
  the pair stands and opens PartnerScreen" — describing itself as live when it
  is not reachable from anywhere in the app. `06-partners-deep-dive.md:157-159`
  flagged this exact item as an unresolved founder decision
  ("delete / re-home / keep as documented latent asset," P3-5) on 2026-07-04;
  it is still unresolved five days later. The dead file plus its own test
  (`PartnerSurfaces.test.js` still directly renders and asserts on
  `PartnerRow`) is pure maintenance debt: a future session could easily
  "fix" or extend a component nothing shows.

**C1 (polish debt, tracked elsewhere, still open here).** `PartnerScreen.js:
972-980`'s loading state is a bare `ActivityIndicator`, not the app's `Skeleton`
component. `WHOLE-APP-FAILURE-REGISTER-2026-07-04.md:1107-1109` (ST-7)
explicitly scheduled the Partners spinner for the Skeleton sweep "after A1
lands" (A1 included ST-1, which has now landed) — this follow-up has not yet
happened. Low severity, but worth closing while ST-1's fix is fresh context.

**Nothing else was found half-wired.** `momentsApi` is defensively `require`d
(`PartnerScreen.js:61-71`) in case the module were ever missing, but it is
present and fully wired both in `PartnerScreen` and `WorkoutSummaryScreen`; this
defensive pattern is dead insurance now, not a real gap. No computed field was
found that is never rendered (winCards, sharedStreak, weekKept, intentions,
sharedBlock are all consumed on screen).

---

## 6. Visual/copy consistency with the rest of the app

- Tokens-only styling verified by spot-reading `PartnerScreen.js`'s
  `StyleSheet.create` block: every colour/spacing/radius/type reference goes
  through `theme.js` (`colors`, `spacing`, `radius`, `type`, `withAlpha`,
  `alpha`) — no hard-coded hex/pixel values found in the sampled styles.
  `partnerComparison.guard.test.js` also asserts no em dash in any partner
  surface string.
- All touchables carry `accessibilityRole` + a descriptive
  `accessibilityLabel` (spot-checked across `CheerPill`, `SheetRow`,
  `ChannelButton`, `PairCard`'s ellipsis, the journey's close/continue/agree
  buttons) — matches the app-wide a11y lint rule.
- **C2 (polish).** DESIGN-SPEC B2 specifies "Invite another partner" as "a
  quiet text-row affordance... `type.body`, `colors.primary`, chevron; **NOT a
  filled button**." Current code renders it as a bordered `Button` component
  with an icon (`PartnerScreen.js:1042-1052`, `variant="outline"`). It reads as
  a proper button, not the low-emphasis text row the spec called for — a minor
  visual-weight drift from spec, not wrong, just heavier than intended for a
  "quiet" affordance sitting under a Pro user's cards.
- Reduce Motion is honoured throughout (`EntranceView`, `CheerPill`,
  `PartnerPrivacyReceipt`, `InviteJourney`'s `animationType`), all falling back
  to a static/instant render per the app's standard pattern.

---

## Severity-tagged finding index

| ID | Severity | Finding |
|---|---|---|
| F1 | (resolved) | ST-1 load-failure-as-empty-pitch — verified FIXED in current code; docs are stale, need updating |
| F2 | B | Empty state shows an abbreviated privacy summary, not the full `PartnerPrivacyReceipt` the spec calls the pre-pairing "hero moment/pitch" |
| F3 | B | Receipt's v2 copy quietly dropped the explicit "everything shared is deleted" footer line (deliberate revision, but softens the app's strongest trust claim) |
| F4 | B | Post-workout beat/cheer/moment only ever addresses the single "primary" pair; Pro users with 2-3 partners cannot act on a non-primary pair from that screen |
| F5 | A (hygiene, not user-facing) | `PartnerRow.js` is dead code with a stale "this is live on ConsistencyScreen" docstring; unresolved founder decision open since 2026-07-04 |
| F6 | C | Partners loading state still uses a bare `ActivityIndicator`, not `Skeleton` (ST-7 follow-up not yet done) |
| F7 | C | "Invite another partner" renders as a bordered outline Button, heavier than the spec's "quiet text-row, not a filled button" |
| F8 | C | Paywall-preserved-invite auto-redeem (A1 s9.3) fails silently if the held code doesn't redeem; no toast either way |

---

## Prioritised top-10 improvement list

1. **[S] Update the stale docs.** Mark ST-1 fixed with a pointer to
   `usePartners.js:39-459` and `PartnerScreen.js:983-998`, and correct
   `01-build-wave-plan.md:77`. Zero code risk; prevents future re-work.
2. **[S] Force a founder decision on `PartnerRow.js`** (delete / re-home / keep
   as documented latent asset) — it's been open since 2026-07-04 with no
   action. Deleting also removes its now-orphaned direct test coverage in
   `PartnerSurfaces.test.js`. Touches dead code only, no live surface.
3. **[S] Skeleton-ify the Partners loading state** (`PartnerScreen.js:972-981`)
   to match the ST-7 sweep already planned elsewhere in the app.
4. **[S] Restore the "quiet text-row" treatment for "Invite another partner"**
   per DESIGN-SPEC B2, so it doesn't visually compete with the PairCards above
   it.
5. **[M] Render the full `PartnerPrivacyReceipt` in the empty state**, not the
   shortened `howItWorks` list, so the receipt is the pre-pairing pitch the
   spec (and the deep-dive's "strongest trust copy in the app" finding) intends
   — this is the highest-leverage trust-and-conversion fix on the list.
   **LOCKED-adjacent: this touches the GDPR consent-notice copy surface
   (`PARTNER_PRIVACY_NOTICE_VERSION`), so any wording change (including
   restoring the deletion-promise footer line) needs a version bump and
   founder sign-off, not a silent edit** — flag to the founder as a
   multiple-choice: (a) show the full receipt pre-pairing with the current v2
   copy verbatim, (b) show the full receipt AND restore the v1 deletion-promise
   footer line (requires a notice-version bump), (c) leave as is.
6. **[M] Let the post-workout beat and its cheer/preview-win actions target any
   active pair with something to show**, not only the "primary" one — either
   surface whichever pair has a fresh moment/cheer available, or add a small
   pair-picker when the user has more than one active partner.
7. **[M] Give the paywall-preserved-invite auto-redeem a visible outcome**
   (success or failure toast) instead of failing silently
   (`usePartners.js:364-399`).
8. **[S] Confirm with the founder whether the v2 receipt's dropped deletion-
   promise line was intentional** — it is real (deletion-on-unpair is genuinely
   implemented server-side) and was previously the app's strongest trust claim;
   restoring it is a one-line, low-risk copy addition once (5) is decided.
9. **[S] Add a toast/telemetry note when the multi-partner cap blocks a share**
   (e.g. Share-an-update UI already handles "choose who receives it" for
   >1 pair, `PartnerScreen.js:1013-1023` — verify this same multi-pair care is
   applied consistently to the still-primary-pair-only post-workout beat once
   item 6 lands).
10. **[L, optional/founder-gated] Revisit Option C (real shared-plan sync)**
    only as its own dedicated decision, per the deep-dive's own recommendation
    — not folded into this list's other items. Current "phase name only" copy
    is honest and should stay as-is unless the founder wants to commission this
    separately.

**Nothing on this list requires touching the ED-safety suppression, the
consent-fail-closed rollback, the pair-isolation rule, or the deletion-on-unpair
promise — all four are correctly built and test-pinned as-is.**
