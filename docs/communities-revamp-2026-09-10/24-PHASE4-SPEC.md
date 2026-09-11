# 24 — PHASE 4 SPEC: "A friend trained today" on the home-screen widget (lead, 2026-09-11; the edit gate for lane P4)

Authority: `20-BLUEPRINT.md` section 12 Q6 (CR-13: "in scope as phase 4,
after phases 1 to 3, because it needs the widget data path and the
ambient items to exist first"); `10-research-best-communities.md` lines 84
and 97 (Locket: a friend's moment surfaced on the home screen itself,
outside the app; "a widget showing 'a friend just trained' is the fitness
analogue"); blueprint section 8 safety floor (presence never absence;
nothing ranked; calm mode and an open ED flag withhold social signals);
`docs/NOTIFICATIONS_LOCKED.md` (no new push: the widget is a pull surface).
Existing data path: `src/lib/widgets/snapshot.js` (pure builder),
`writer.js` (gather + persist; triggered on workout finish, history change
and app backgrounding), `storage.js` (AsyncStorage copy the Android task
handler reads; iOS App Group via the `live-activity` module),
`src/widgets/widgets.js` + `widgetTaskHandler.js` (Android RemoteViews),
`modules/live-activity/widget/VolyumeHomeWidgets.swift` (iOS, mirrors the
Android widgets, decodes the same JSON). Board client:
`src/lib/community/boards.js` `loadBoard({ scope: 'following', window:
'week', limit, today })` returns rows `{ card, metric, trainedDays,
trainedToday, isYou, rank }` (server contract migrate_165 + 170).

## 1. Lead rulings (D33 delegated; recorded here and in `40-DECISIONS.md` CR-14)

1. **Count only, never a person.** The home screen is semi-public
   (snapshot.js's binding privacy rule). The widget line is "1 friend
   trained today" / "N friends trained today". No handle, no name, no
   avatar, no gym, nothing that identifies who. The snapshot's new block
   carries exactly three keys: `dayKey`, `count`, `label`.
2. **"Friends" = the people you follow** who share consistency and
   trained today: the `following` scope of `community_board` (the same
   set as the Hub's Following board and feed), excluding the caller's own
   row (`isYou`). Consent is the server's (only people sharing consistency
   appear on a board), so nothing new is disclosed by this surface.
3. **Presence, never absence.** The line appears only when the count is
   1 or more. Zero, unknown, stale, offline, not joined, no consent: no
   line at all. Never "no friends trained today", never a dash.
4. **Same suppression as the consistency block.** Under an open ED flag
   or calm mode (the writer's existing fail-closed `edFlagOpen`) the
   block is omitted entirely: a social presence count is a comparison
   pressure the calm and flagged states withhold everywhere else in this
   campaign. Minors: no extra rule (the line names nobody and counts
   others).
5. **Today only, decided at render time.** The block carries the
   device-local `dayKey` (`todayLocalKey()`, `src/lib/dayKey.js`). Both
   renderers compare it to the day they render on and hide the line when
   it differs, so a widget left untouched overnight never shows
   yesterday's count as today's.
6. **Offline-first stays intact.** `gatherWidgetInputs` stays a local
   read: it reads a small AsyncStorage cache
   (`@volyume_widget_friends_v1`, `{ dayKey, count, fetchedAt }`) and
   includes it only when its `dayKey` is today. The network fetch is a
   separate, best-effort, second stage of `writeWidgetSnapshot`: the local
   snapshot is written first exactly as today, then the count is fetched,
   cached and the snapshot re-persisted once if it changed. A failure of
   any kind (offline, `CommunityError` of any code, no profile) is
   swallowed; nothing is logged at error level for expected refusals
   (`transport.js` already classifies them).
7. **No RPC for a person who has not joined Community.** The fetch runs
   only when the cached me (`readCachedMe(uid)`, `hasProfile(me)` in
   `src/lib/community/profile.js`) says a profile exists; otherwise the
   stage is skipped without a network call. No new RPC, no migration.
8. **Amber on the signal only (D148).** The line is `MUTED` text with a
   6 dp amber presence dot before it, the same presence language as the
   app's avatar ring dot; the text itself is never amber.
9. **No pixel harness exists**; the lead reviews the diff and the tests.
   The iOS Swift change is a minimal optional decode plus one line in each
   home-screen content view; it cannot be compile-verified on Linux (the
   existing accepted state for that file), so it is written defensively
   and kept small. The lock-screen accessory view is unchanged.

## 2. Files and shapes

**`src/lib/widgets/friends.js` (new).** Exports
`FRIENDS_CACHE_KEY = '@volyume_widget_friends_v1'`,
`countFriendsTrainedToday(rows)` (pure: rows with `trainedToday && !isYou`,
clamped 0..999), `readCachedFriends()` (AsyncStorage JSON, shape-checked,
never throws, returns `{ dayKey, count, fetchedAt } | null`),
`fetchFriendsTrainedToday(uid)` (guard 7, then
`loadBoard({ scope: 'following', window: 'week', limit: 50 })`, counts,
writes the cache with today's `dayKey`, returns the cache value or null
on any failure). Imports: `AsyncStorage`, `loadBoard`, `readCachedMe`,
`hasProfile`, `todayLocalKey`. Never imports `../database` (privacy
surface unchanged) and never reads `card.name`, `card.handle`,
`card.avatar_*` or any card field beyond nothing at all: it counts rows.

**`src/lib/widgets/snapshot.js`.** `buildWidgetSnapshot` gains input
`friends: { dayKey, count } | null`. Output `friends: { dayKey, count,
label } | null`, present only when `!edFlagOpen`, `dayKey` matches
`/^\d{4}-\d{2}-\d{2}$/`, and `count >= 1`; `label` is
`"1 friend trained today"` or `` `${count} friends trained today` ``.
`WIDGET_SNAPSHOT_VERSION` stays 1 (an optional field; both renderers
tolerate its absence). `emptyWidgetSnapshot` unchanged (friends null).

**`src/lib/widgets/writer.js`.** `gatherWidgetInputs` reads the cache and
passes `friends` only when `cache.dayKey === todayLocalKey()`.
`writeWidgetSnapshot(userId, { refreshFriends = true } = {})`: unchanged
first stage; then, when `refreshFriends`, awaits
`fetchFriendsTrainedToday(userId)` inside its own try/catch and, when the
fetched count differs from what the first snapshot carried, rebuilds the
snapshot with the same local inputs plus the new `friends` and persists
once more. Returns the LAST snapshot written. The header comment's
trigger list is corrected to what the code does (workout finish,
history change, app backgrounding via `App.js`), and gains the friends
stage. The `VOLYUME_DAILY_SYNC` background-fetch task (registered in
`App.js`; find its `TaskManager.defineTask(VOLYUME_DAILY_SYNC, ...)`
body) does not call the writer today; add one best-effort call after its
sync, in exactly the shape of the App.js backgrounding hook (session
lookup, `require('./src/lib/widgets/writer').writeWidgetSnapshot(uid)
.catch(() => {})`, everything inside try/catch), so a widget left alone
for a day still refreshes its count at most twice a day when the OS runs
the task. Report the exact hunk. If the task body cannot be found in
`App.js` or `index.js`, STOP and report instead of guessing.

**`src/widgets/widgets.js`.** `Shell` gains an optional `friends` prop and
renders, below `children`, a row: 6 dp amber dot + `TextWidget`
`friends.label` (`fontSize: 12`, `MUTED`, `maxLines: 1` if the library
supports it, else nothing). Size ruling (lead, from app.json): the
NextSession widget is 3 cells wide, 180 x 110 dp minimum, resizable, and
has the room (brand row + name + week + one line under 110 dp); the
WeeklyConsistency widget is 2 cells, 110 x 110 dp minimum, `resizeMode`
none, and a 23-character line neither fits its width in one row nor its
height under the count, the dots and the "sessions" caption. So the
Android line renders on `NextSessionWidget` ONLY; `WeeklyConsistencyWidget`
is unchanged (its ED-suppressed fallback renders the NextSession tree,
which then carries the line as any NextSession render does).
`NextSessionWidget` passes `friends` from `snapshot.friends` only when
`snapshot.friends.dayKey === todayKey`, where `todayKey` is a new prop
supplied by the task handler (`todayLocalKey()` at render time). The
root element keeps `clickAction="OPEN_APP"` and its label (the click
action test must still pass). Nothing existing is shrunk or moved.

**`src/widgets/widgetTaskHandler.js`.** Passes `todayKey={todayLocalKey()}`
to both widgets. Still render-only.

**`modules/live-activity/widget/VolyumeHomeWidgets.swift`.**
`VolyumeFriendsData: Decodable { dayKey: String; count: Int; label:
String }`; `VolyumeWidgetSnapshotData` gains `let friends:
VolyumeFriendsData?`. A private `todayLocalDayKey()` using
`DateFormatter` (`dateFormat = "yyyy-MM-dd"`, `Calendar.current`,
`TimeZone.current`, `Locale(identifier: "en_US_POSIX")`). A private
`FriendsLine` view (amber 6 pt circle + `Text(label)` 12 pt `MUTED`,
`.lineLimit(1)`, `.minimumScaleFactor(0.8)`) rendered at the foot of
`NextSessionHomeContent` and `ConsistencyHomeContent` (before the
`Spacer`) only when `friends != nil && friends.dayKey ==
todayLocalDayKey()`; SwiftUI lays the systemSmall family out itself, so
both contents carry it on iOS. `ConsistencyAccessoryContent` unchanged. Header
comment updated (the snapshot now also carries a friends count, never a
person).

**Docs.** `40-DECISIONS.md` gains CR-14 with the rulings above (one row,
the register's existing format). `README.md` of the campaign folder gains
the `24-` entry in its map.

## 3. Tests (Jest, colocated; written to fail; header comment on each)

- `src/lib/widgets/__tests__/friends.test.js`: counting excludes the own
  row and rows without `trainedToday`; clamp; no `loadBoard` call when no
  cached profile; `CommunityError` and a thrown network error both return
  null and leave the cache untouched; a success writes the cache with
  today's `dayKey`.
- `snapshot.test.js` (extend): singular and plural labels; absent when
  count 0; absent under `edFlagOpen`; absent when `dayKey` is malformed;
  the block's keys are exactly `dayKey`, `count`, `label`; existing tests
  untouched.
- `writer.test.js` (extend): the cache is included only when its
  `dayKey` is today; `refreshFriends: false` makes no network call; a
  fetch failure still leaves the first snapshot persisted; a changed
  count persists a second snapshot carrying it.
- `src/widgets/__tests__/widgetFriendsLine.test.js`: the line renders
  only when `friends.dayKey === todayKey` (evaluate the tree the same way
  `widgetClickAction.test.js` does); the label text is the snapshot's;
  the existing click-action test stays green.
- Source-level privacy pin (add to
  `src/__tests__/community.ambient.guard.test.js` or a new
  `widgets.friends.guard.test.js`): `friends.js` never imports
  `../database`, never references `handle`, `name`, `avatar`; the Swift
  file decodes only `dayKey`, `count`, `label` for friends.

## 4. Verification and report

`npx eslint . --max-warnings 0` exit 0 and the targeted suites green
(`npx jest src/lib/widgets src/widgets src/__tests__/community.ambient.guard.test.js src/__tests__/community.copy.guard.test.js src/__tests__/screen-mount.test.js`); the lead runs the full
suite at landing. Device checklist (Android EAS build, physical device):
1. Follow one person who shares consistency and trained today; finish a
   workout; background the app; the home-screen widget shows the amber
   dot and "1 friend trained today". 2. Nobody followed trained today:
   no line. 3. Calm mode on: no line (and the consistency block still
   falls back to next session). 4. Next morning before opening the app:
   the line is gone (day changed). 5. Not joined Community: no line, and
   no Community RPC in the network log. 6. Tap the widget: the app opens.
Report format (capped): files changed with line counts; lint and test
output verbatim (the summary lines); every STOP or ambiguity as a
numbered question; no narrative.
