# a-12 — Partner & Social (NEW-002 + rebuild)

Internal audit, code-verified, file:line evidence. British English. No code
changes, no commit. Area 12 of the ULTIMATE-APP MANDATE.

Scope: PartnerScreen, the invite/redeem flow (links + codes), the partnership
state machines (shared streak, week signals), cheers (send/receive, edge
function, pushes), the derived-signals-only privacy model, ED suppression in
partner contexts, every entry point, unpair/teardown (account delete + GDPR),
the free/Pro split, and share artefacts as social surfaces.

Files in the system:
- UI: `src/screens/PartnerScreen.js`, `src/components/PartnerRow.js`,
  partner beat inside `src/screens/WorkoutSummaryScreen.js:794–824`,
  Progress hub tile `src/screens/AnalyticsScreen.js:344`,
  Consistency row mount `src/screens/ConsistencyScreen.js:51`.
- Hook: `src/hooks/usePartners.js`.
- Pure logic: `src/lib/partners/{signals,sharedStreak,link,weekSignalWriter}.js`.
- Online ops: `src/lib/partners/service.js`.
- Notifications: `src/lib/notifications/partnerBeats.js`,
  `scheduler.js:946–1040`, `notificationRoute.js:45`.
- Sync: `src/lib/sync/tables/partners.js`; local writers
  `src/lib/database.js:4241–4370`.
- Server: `supabase/migrate_081_training_partners.sql`,
  `supabase/functions/partner-cheer/index.ts`,
  `supabase/functions/delete-account/index.ts:129–152`.
- Share artefact (solo): `src/screens/ShareCardScreen.js`.

---

## 1. WHAT — the full pair lifecycle and every cross-device signal

### 1.1 Lifecycle (state machine)

The partnership row carries a 3-state status:
`invited → active → ended` (`migrate_081:79–80`,
`CHECK (status IN ('invited','active','ended'))`). There is no `declined`,
`paused`, or `expired` state — expiry is implicit (redeem rejects a row older
than 7 days, `migrate_081:306`, but the stale `invited` row is never reaped).

1. **Create (inviter, ONLINE).** `createPartnerInvite` (`service.js:26`) calls
   the `create_partner_invite(_streak_enabled)` SECURITY DEFINER RPC
   (`migrate_081:239`). The server generates a 10-char uppercase-hex code,
   stores only its sha256 hash (`migrate_081:255–260`), and returns the
   plaintext **once**. Row is inserted `status='invited'`, `member_a=me`,
   `member_b=NULL`. App builds `volyume://partner/<CODE>` +
   `https://volyume.app/partner/<CODE>` (`link.js:27`), opens the OS share
   sheet with `inviteShareMessage` (`PartnerScreen.js:60`). Emits
   `partner_invite_sent`.
2. **Redeem (invitee, ONLINE).** `redeemPartnerInvite` (`service.js:54`) calls
   `redeem_partner_invite(_code)` (`migrate_081:278`). The RPC hashes the code,
   finds the row, and enforces — in one indistinguishable failure path that
   always raises `'invite_invalid'` — not-self, status `invited`, `member_b`
   null, not older than 7 days, and that neither side has blocked the other
   (`migrate_081:302–312`). On success it sets `member_b=me`, `status='active'`,
   `accepted_at=now()`, and **nulls the code hash** (single-use,
   `migrate_081:314–316`). Emits `partner_invite_accepted`.
3. **Active.** Both members write their own derived week signal and may cheer
   (below). The pair is now offline-first: every read is the local SQLite
   mirror (`usePartners.js` header, lines 1–10).
4. **End.** Either side calls `unpairPartner` (`service.js:114`) →
   `partnerships.update({status:'ended', ended_at})`. **Silent and immediate**:
   the other side sees only "Partnership ended" with no reason
   (`PartnerScreen.js:164`, copy at `:193–195`). The cascade hard-deletes the
   pair's signals + cheers server-side (claimed in `service.js:111`; actually
   performed by the delete-account function and by FK cascade on row removal —
   note a **manual unpair only flips status; it does NOT purge signals/cheers**,
   see §4).

### 1.2 Signals that cross devices (the entire surface area)

Only **three** row types ever leave a device, all pair-scoped, all derived:

| Signal | Table | Shape | Writer | Reader |
|---|---|---|---|---|
| Week signal | `partner_week_signals` | `planned_count, done_count, week_met, state('training'\|'resting')` per (pair,user,week) | `pushWeekSignal` (`service.js:132`), `writeOwnWeekSignals` (`weekSignalWriter.js:76`), sync push (`tables/partners.js:26`) | `getPartnerWeekSignal/getPairWeekSignals` |
| Cheer | `partner_cheers` | `(pair_id, sender_id, sent_on date)` — **no message body** | `partner-cheer` edge fn only (`index.ts:102`) | `getLastCheerReceived/SentOn` |
| Partnership | `partnerships` | lifecycle + `streak_enabled` | RPC / unpair only | `pullPartners` |

The week signal is the keystone. `writeOwnWeekSignals` gathers the current
week the same way COMP-018 does, runs the shared `computeWeekState` seam
(`weekSignalWriter.js:61`), and writes the tiny derived row. **No raw workout,
weight, food, or check-in ever crosses.** This is enforced structurally — the
tables physically have no column for them (`migrate_081:115–126`).

### 1.3 Shared streak (the no-blame engine)

`computeSharedStreak` (`sharedStreak.js:45`) counts in TRAINING WEEKS, riding
`jointWeekState`:
- either partner `resting` → joint `resting`: **streak holds, never grows,
  never breaks** (a wellbeing/ED hold is indistinguishable from a deload).
- both `met` → `met`: increments.
- otherwise → `quiet`: holds at N, no notification, no person attributed.

After 4 consecutive quiet weeks it ARCHIVES (`QUIET_ARCHIVE_LIMIT=4`,
`sharedStreak.js:28,66`) and resumes from 1 on the next met week. `buildSharedWeeks`
(`sharedStreak.js:104`) joins both members' synced weeks by `week_start` and
only counts weeks where BOTH sides have reported. The current in-progress week
must be excluded by the caller (it is — the hook passes finished pair signals).

---

## 2. WHERE — entry/exit map and dead ends

### 2.1 Entry points (3, all inside Progress)

1. **Progress hub tile** — `AnalyticsScreen.js:344`, a `NavTile` labelled
   "Partner", `people` icon, navigates to `Partner`. Always visible; no live
   status on the tile.
2. **Consistency slim row** — `ConsistencyScreen.js:51` mounts `<PartnerRow>`,
   a one-line status (`PartnerRow.js`) that opens `PartnerScreen`. Shows ticks,
   "resting this week", "Invitation sent…", or "Train with a partner", plus a
   cheer dot when a cheer was received.
3. **WorkoutSummary beat** — `WorkoutSummaryScreen.js:794–824`. The post-workout
   moment: a one-line partner status + an inline Cheer button, rendered only
   when paired, on the live (non-readOnly) path, and not calm/ED-suppressed.

All three lead to the SAME `PartnerScreen` (`RootNavigator.js:350`, title
"Training partner"). The notification route for `partner_cheer` lands on the
Progress **Consistency** screen (`notificationRoute.js:48`), i.e. the row, not
the screen.

### 2.2 Placement assessment

Partner lives ENTIRELY inside the Progress tab. There is no Home surface, no
tab, no Settings presence. For the "chosen private circle" framing this is
defensible, but discoverability is low: a user must reach Progress → Consistency
(a sub-screen) or notice one tile among many on the Analytics hub. The
highest-intent moment (WorkoutSummary) is well placed.

### 2.3 Dead ends (verified)

- **The invite link is a dead end.** `link.js` builds `volyume://partner/<CODE>`
  and `https://volyume.app/partner/<CODE>` and the header claims the universal
  link "lands on a web page (web/) that states the promise". **No such page
  exists** — `grep -ril partner web/` returns nothing; there is no
  `app/partner/[code]` route in `web/apps/web`. The universal link 404s.
- **The deep link has no in-app handler.** `app.json` declares the `volyume`
  scheme and `https://volyume.app` intent filters (`app.json:85–110`), but
  `NavigationContainer` has **no `linking` prop** and there is **no
  `Linking.getInitialURL`/`addEventListener`** anywhere in `src/`
  (grep confirms only `Linking.openURL/openSettings` exist). `parseInviteCode`
  (`link.js:40`) is fully written and unit-tested but is **never imported by any
  screen**. Net effect: tapping `volyume://partner/<CODE>` cannot open the app
  to a redeem flow. The ONLY working path to redeem is manual code entry in the
  PartnerScreen text field (`PartnerScreen.js:222–235`).
- **The `partner_streak` push has no route.** `notificationRoute.js` handles
  `partner_cheer` (`:45`) but `partner_streak` (scheduled at
  `scheduler.js:1025`) falls through to `default: return null` (`:66`).
  Tapping a shared-streak push has no defined destination.

---

## 3. FEEL — copy, what a partner sees, and what they cannot

### 3.1 The pitch (empty/ended state, `PartnerScreen.js:170–197`)

> "One person who sees you showed up, and cheers you on. No numbers, no
> comparison, no feed. Just two people keeping the week."

The privacy receipt is the emotional centrepiece, split into two explicit lists:

**What you each see** (`SEES`, `PartnerScreen.js:33`): trained-this-week ticks
("3 of 4"); the shared streak in weeks; "Resting" for a recovery week or break
("Never as a fail"); cheers, one tap once a day.

**What neither of you will ever see** (`NEVER_SEES`, `:39`): weights/sets/reps/
session detail; body weight/measurements/photos; food/calories/diary;
check-ins/anything said to the coach; location. Closed with: "Either of you can
end this at any time. Sharing stops straight away and what was shared is
deleted. The other person sees only 'Partnership ended'."

This list is honest and structurally true — the schema cannot carry any of the
"never sees" items.

### 3.2 What a partner actually sees on the live card

`PartnerScreen.js:95–140`: the partner's first name (but see §4 — it is never
populated, so always "Your partner"), an optional shared-streak chip, a
two-column "You / {partner}" week row with ticks (`ticksLabel`,
`signals.js:12`, "3 of 4" or "N sessions this week"), a moon + "Resting this
week" when the partner's latest week is resting, a Cheer button, and "{partner}
cheered you recently." when a cheer was received.

### 3.3 The cheer experience (both sides)

- **Sender**: one-tap button (`handleCheer`, `:73` / WorkoutSummary `:809`).
  Disables instantly to "Cheer sent" via the client mirror of the daily limit
  (`cheerAllowed`, `signals.js:25`). `reciprocal` boolean is derived (did the
  partner train this week) purely for telemetry — it changes nothing in the UX.
- **Edge function** (`partner-cheer/index.ts`): inserts the cheer AS the caller
  under RLS (proves membership), the `UNIQUE(pair_id,sender_id,sent_on)`
  constraint IS the rate limit — a duplicate returns 429 `already_cheered`
  (`:107–108`), never a second push. Resolves the recipient, checks their open
  ED flag via the service role, and **if a flag is open, downgrades delivery to
  in-app only — no push** (`:129–132`). Otherwise fans out via `send-push` with
  the sender's first name (`:144–156`).
- **Recipient**: receives a push framed FROM the partner, never the app
  ("{name} cheered you on", `partnerBeats.js:22`), deep-linking to the
  Consistency partner row. In-app, the cheer caption appears on next open. The
  push is throttled to FRESH cheers only (< 48h, `cheerToNotify`, `:58`) so a
  backlog synced days later is history, not news.

### 3.4 The tone

Calm, no exclamation marks, no shame, no red/fail words anywhere
(`sharedStreak.js` header and label, `:84`; `partnerBeats.js` header). "Quiet
week" and "Resting" are never attributed to a person. This is a deliberate
inversion of Duolingo's break-and-unpair model and is executed consistently.

---

## 4. GAPS / FRICTION (per code)

**1. The invite link is completely non-functional end-to-end.** Both the
universal link (`https://volyume.app/partner/<CODE>` — no web landing page
exists) and the deep link (`volyume://partner/<CODE>` — no `linking` config, no
`getInitialURL` handler, `parseInviteCode` never imported) are dead. The share
message (`inviteShareMessage`, `link.js:57`) sends a recipient a URL that 404s
on web and does nothing if they have the app. **The only working redemption
path is manually typing/pasting the code** into the PartnerScreen field. For a
word-of-mouth growth feature this is the single most material gap — the entire
"link is a word-of-mouth asset" thesis in `link.js:9–12` is unrealised.

**2. The partner's name is never populated — every partner is "Your partner".**
`partnerFirstName` is read in 4 places (`PartnerScreen.js:87`, `PartnerRow.js:17`,
`WorkoutSummaryScreen.js:805–806`, `scheduler.js:972`) but is **written
nowhere**. `getPartnershipsLocal` (`database.js:4241`) returns raw partnership
rows with no profiles join; `upsertPartnershipFromCloud` (`:4313`) stores no
name; the sync pull (`tables/partners.js`) never fetches the partner's profile.
So the named-destination design (PartnerScreen header, row line, cheer push
title from `partnerBeats`) always falls back to the generic "Your partner". The
edge-function push DOES resolve the real name server-side (`index.ts:135–140`),
creating an inconsistency: the PUSH says "Sam cheered you on" but the in-app
card says "Your partner". A real, live, user-visible defect.

**3. a-11's finding confirmed: the partner view cannot get server-side pause
state.** Streak/pause/manual-goal state lives in AsyncStorage only
(`a-11:402–411`); `streakState.js` and `milestones.js` themselves flag "MUST
move to a synced table before NEW-002". `writeOwnWeekSignals` reads pauses from
local `loadStreakState` (`weekSignalWriter.js:46,56`) to compute the
`resting`/`paused` state it pushes — so the partner-facing signal IS pause-aware
on the originating device, **but a pause set on device B is invisible to the
week signal written from device A** until that device re-derives. Multi-device
users get an inconsistent "Resting" signal. The dependency note a-11 cites is
real and unmet.

**4. The shared-streak push has no tap destination, and there is no user-facing
notification toggle.** `partner_streak` is scheduled (`scheduler.js:1021–1029`)
but unrouted (`notificationRoute.js` → `default: null`). Separately, the prefs
gate `partnerCheerEnabled` (`scheduler.js:966`) is read but **never written by
any UI** — no Settings screen exposes a partner notification toggle
(`grep partnerCheerEnabled src/screens/Settings*` is empty; the scheduler
comment at `:959–960` admits "can surface later"). Users cannot turn partner
pushes off, and one of the two pushes dead-ends on tap.

**5. Manual unpair leaves orphaned signals/cheers; and several lifecycle holes.**
`unpairPartner` (`service.js:114`) only flips `status='ended'` — it does NOT
delete `partner_week_signals`/`partner_cheers` (only the delete-account function
does, `delete-account/index.ts:143–148`). The migration comment claims unpair
"hard-deletes the pair's signals + cheers" (`service.js:111`) but the code does
not; those rows persist until an account is deleted (RLS then hides them since
the SELECT policy requires `status='active'`, `migrate_081:138`, so they are
inert but not purged — a GDPR-data-minimisation smell). Additional holes:
(a) **stale `invited` rows are never reaped** — a never-redeemed invite lingers
forever (redeem rejects it after 7 days but nothing deletes it), and it counts
toward nothing but clutters; (b) **no re-pair / re-invite affordance after
'ended'** beyond returning to the empty pitch; (c) `fetchPartnerView`
(`service.js:158`) is written but appears **unused** — the hook reads local only
(`usePartners.js:13–16`), so this online reader is dead code; (d) the Pro
**3-partner** path is unbuilt: `usePartners` surfaces a single `pickPrimary`
partnership (`:33`, header "v1 surfaces a single primary partnership… the Pro
three-partner list is a follow-on"), so `canAddPartner` correctly gates the cap
(`signals.js:65`) but a Pro user with 2–3 partners can only ever SEE one of them.

**6. Discoverability and free-user dead end.** Partner is buried in Progress →
Consistency. A free user at the cap sees "You can have one partner on Free. Go
Pro for up to three." (`PartnerScreen.js:211`) — but since the 3-partner UI is
unbuilt (finding 5d), upselling to a capability that does not yet render is a
broken promise.

**7. No abuse/reporting surface beyond block.** `blockPartner` (`service.js:95`)
exists and is wired into the hook (`usePartners.js:116`) but is **never called
from any screen** — there is no Block button in PartnerScreen. The migration
explicitly designed-out moderation ("no free text… nothing punitive… no
moderation surface beyond the pairing handshake", `migrate_081:7–9`), which is
reasonable given derived-signals-only, but the block primitive is then
unreachable by users.

---

## 5. SURFACE INVENTORY

In-app surfaces and artefacts that constitute "partner & social":

| # | Surface | Location | Type |
|---|---|---|---|
| 1 | PartnerScreen — live paired card | `PartnerScreen.js:95–147` | screen |
| 2 | PartnerScreen — pending invite card | `:150–158` | screen state |
| 3 | PartnerScreen — empty/ended pitch + privacy receipt + pairing | `:161–239` | screen state |
| 4 | PartnerRow slim status (Consistency) | `PartnerRow.js` / `ConsistencyScreen.js:51` | component |
| 5 | Progress hub "Partner" tile | `AnalyticsScreen.js:344` | nav tile |
| 6 | WorkoutSummary post-workout partner beat + inline cheer | `WorkoutSummaryScreen.js:794–824` | inline surface |
| 7 | Invite share sheet (OS share, `inviteShareMessage`) | `PartnerScreen.js:60`, `link.js:57` | share artefact |
| 8 | Manual code-entry redeem field | `PartnerScreen.js:222–235` | input |
| 9 | Shared-streak chip | `PartnerScreen.js:100–102`, `sharedStreak.js:84` | derived label |
| 10 | Cheer received caption / cheer dot | `PartnerScreen.js:137`, `PartnerRow.js:36` | derived label |
| 11 | Cheer-received push | `partnerBeats.js:22`, `scheduler.js:984–1002` | notification |
| 12 | Shared-streak-kept push (unrouted on tap) | `partnerBeats.js:31`, `scheduler.js:1006–1030` | notification |
| 13 | Invite link (deep + universal) — non-functional | `link.js:27` | artefact (dead) |
| 14 | Solo workout share card (Instagram/TikTok story PNG) | `ShareCardScreen.js` | social share artefact |

**Count: 14 surfaces** — 11 functional (1–12 minus the two caveats), 1 dead
(13, the invite link), 1 partially broken (12, the streak push has no tap
route), plus the solo ShareCardScreen (14), which is a true social-export
surface but is NOT a partner surface (no partner data, no plan-share link;
solo workout stats only — there is **no plan-share link feature anywhere** in
the codebase).

---

## Appendix — privacy & safety verification (ED suppression)

- **Outbound week signal**: an open ED flag or positive wellbeing screen freezes
  the signal to `resting` (`weekSignalWriter.js:57`, `edSuppressed`), making a
  wellbeing hold indistinguishable from a deload. ✓
- **Cheer delivery**: recipient's open ED flag downgrades to in-app only, no
  push (`partner-cheer/index.ts:129–132`). ✓
- **Partner pushes**: an open ED flag silences all partner beats entirely
  (`scheduler.js:956–957`). ✓
- **Indistinguishability**: unpair and account-deletion both present as
  "Partnership ended" with no reason; the `member_a/member_b` FKs are
  `ON DELETE SET NULL` so the tombstone survives a deletion (no
  death-vs-departure leak, `migrate_081:76–86`, `delete-account:129–152`). ✓
- **Block invisibility**: redeem raises a single `invite_invalid` on every
  failure path (`migrate_081:302–312`), so a block is indistinguishable from a
  stale code. ✓

The privacy/safety model is structurally sound and consistently enforced at the
schema, RLS, edge-function and client layers. The gaps in §4 are functionality
and polish gaps, not privacy leaks.
