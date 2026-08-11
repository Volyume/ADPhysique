# AUDIT — CLOCK, SCALE, ROW CAPS, LOCAL-ONLY TRUTH, PARTNERS

Campaign 6, phases **39-43**. Audit agent, 2026-08-11.
Read-only pass. **Nothing in `src/` was changed.** This document is the only
file created.

---

## Authority

The Campaign 6 order, phases 39-43, quoted in the commissioning brief:

- **39 — TIMEZONE / DST / CLOCK CHANGE.** "Long-term users travel and clocks
  change. Audit: DST transition; timezone change; local Monday week
  boundaries; distinct-morning weigh-ins; block-week calculation;
  notification quiet hours; streaks. Do not add travel mode... This is clock
  correctness only. Carry the known UTC day-key debt forward if still
  relevant."
- **40 — DATA SCALE / PERFORMANCE.** "Generate realistic large histories...
  Inspect: obvious N+1 loading; unbounded UI blocking queries; extremely slow
  replay; repeated full-history scans on Home; memory spikes; accidental row
  caps... Do not prematurely optimise." Lead note: measure and report; include
  **R-13** as this lane's first measurement with a measured verdict.
- **41 — ROW-CAP / PAGINATION AUDIT.** "Search all cloud reads used by
  long-term product behaviour for implicit: 1000 row; single-page;
  first-page-only assumptions... A year-long user must not silently lose
  old/new state because a default query cap was reached."
- **42 — LOCAL-ONLY DATA TRUTH.** "Returning/reinstall users must not be
  surprised... If reinstall loses something by design: the UI/privacy copy
  must not imply cloud restore. Do not add photo cloud sync."
- **43 — PARTNER LONG-TERM EXPERIENCE.** "Audit existing partner
  accountability only. Test: long-running partnership; remove partner; invite
  replacement; tier change; lapse; stale partner signal; cheers toggle. No new
  social scope."

Hard bounds honoured: ED-safety untouched, Article 9 untouched, deterministic
engine untouched, no travel mode, no photo cloud sync, no dependencies, no
migrations, no commits. **Characterise-only** (D91-24/25). The lead implements
any fix.

Already-ruled items are **cited, not re-litigated**: D97-22 **R-13** (the
Progress-landing rescan), **R-20** (morning-weight day logic DST-safe),
**R-10** (pause spans that scroll out of the window), **R-12**
(`weeksSinceLighter` accumulation boundary), D97-23 **S-21** (watermarks are
device state and never move backwards), **S-23** (photos and scans never
sync, guard-tested).

## Method

1. Read the clock primitives in full (`dayKey.js`, `mesocycle.js`
   `localDaysElapsed`, `notifications/quietHours.js`,
   `notifications/scheduler.js` timezone re-lay, `streak.js`,
   `streakState.js`, `useWeeklyStreak.js`, `usePartners.js`).
2. Transpiled the pure modules to CommonJS in the scratchpad and ran
   **executable probes** under real `TZ` settings (`Europe/London`,
   `America/New_York`, `America/Los_Angeles`, `Australia/Sydney`, `UTC`) across
   the 25 October 2026 UK fall-back. Every phase-39 defect below was
   *reproduced*, not inferred.
3. Phase 40: built synthetic year/two-year/three-year/five-year histories of
   the exact row shapes (`4 sessions/week x 25 sets`) and replayed the exact
   `useProgressData` loops, instrumented for wall time and predicate count;
   measured `rowToCamel` separately against a 22-column set row. Desktop V8
   (Node 22); Hermes on a mid-range Android device is typically 2-5x slower for
   this class of string/object work, so treat the figures as a **lower bound**.
4. Phase 41: enumerated every `.from('<table>')` read in `src/` (101 call
   sites) and classified each against `fetchAllRows` / `fetchAllUserRows` /
   `fetchByIdsChunked` / `.maybeSingle()`, then cross-checked the watermark
   advancement rule.
5. Phases 42-43: read the local-only inventory (`BACKUP_TABLES`,
   `WIPE_DIRECT_TABLES`, `progress_photo_meta`, `progress_scan_*`) and the
   whole partner surface (`src/lib/partners/*`, `usePartners.js`,
   `PartnerScreen.js`, `sync/tables/partners.js`, migrations 081-107).
6. Ran the existing DST and hooks suites to confirm no finding contradicts a
   pinned test: `dayKey.lsO6.dst`, `mesocycle.f10.dst`, `src/hooks/__tests__`
   — **13 suites, 88 tests, all pass**. No pinned-test conflict found.

Probe sources (scratch, not committed):
`scratchpad/probe-r13.js`, `probe-tz-block.js`, `probe-tz-block2.js`,
`probe-streak-dst.js`.

---

## Findings

| ID | Class | Severity | Phase | One line | Evidence |
|---|---|---|---|---|---|
| T-1 | DEFECT | **MED** | 39 | The weekly-streak strip builds its 12 week keys with a fixed 168-hour step, so across a DST change a prescribed recovery week scores as a MISS and **every paused week is silently discarded** | `useWeeklyStreak.js:29,59-60,91-95,122-131`; producers `database.js:6270`, `streakState.js:66-97`; probe: 0 of 3 pause weeks recovered |
| T-2 | DEFECT | MED-LOW | 39 | A block's `start_date` is written as a **UTC** date and read back as **UTC midnight**, so outside UTC+0 the block's week boundary lands a day early | write `database.js:3770-3775`; read `mesocycle.js:151-152,158-161` via `database.js:4133-4137`; probe: week 2 begins Sunday in `America/Los_Angeles` |
| T-3 | DEFECT | LOW-MED | 39 | The partner "week kept together" moment uses `localWeekStartMs(now) - WEEK_MS` as a **key**, so it misses for the whole week after each DST change | `usePartners.js:37,197-198,215-218,232-243`; same root at `partners/moments.js:42,123-124` |
| T-4 | LATENT | LOW | 39 | Two more fixed-168-hour windows over local-Monday anchors: the trial recap PR loop and the muscle-frequency "last week" bound | `CascadeGateScreen.js:197`; `useProgressData.js:18,444-445` |
| T-5 | LATENT | LOW | 39 | Carried UTC day-key debt: three surviving `toISOString().slice(0,10)` day derivations outside `dayKey.js` | `database.js:6345,6353`; `blockLedgerRunner.js:272`; `algorithms.js:1057-1058` |
| T-6 | LATENT | LOW | 39 | The one-cheer-per-day limit is keyed on the **local** day on both sides, so a westward flight allows two cheers inside 24 hours and an eastward one costs a day | `partners/service.js:291`; `migrate_081_training_partners.sql:191-199` |
| T-7 | LATENT | LOW | 39/43 | The timezone re-lay cancels **all** pending pushes; partner beats are not re-laid and their watermark has already advanced, so a just-laid cheer push is lost for good | `scheduler.js:1235-1247`, `:1249-1258`, `:1497-1500`, `:1622-1626`; only caller `sync/tables/partners.js:242-243`; race at `App.js:985-996` |
| T-8 | DEFECT | **HIGH** | 40 | `rowToCamel` runs a callback regex **per column per row** and dominates every lifetime read: **106 ms per 5,200 set rows, 530 ms per 26,000** on desktop V8, on the JS thread | `database.js:66-78`; callers `database.js:2530-2541,2738-2748`; measured, see detail |
| T-9 | IMPROVEMENT | LOW (was MED-LOW) | 40 | **R-13 measured verdict:** the ~20 rescans are real (131k predicate evaluations at 1 year, 394k at 3) but cost 6.6 ms / 15.5 ms — about **7 %** of the landing's JS cost. Real, but not the bottleneck it was assumed to be | `useProgressData.js:147-148,210-224,276-353`; measured, see detail |
| T-10 | IMPROVEMENT | MED | 40 | The same unbounded lifetime read now sits on the highest-frequency surfaces: the Home readiness card, the post-workout summary, and the notification foreground handler | `ReadinessCards.js:124-125`; `WorkoutSummaryScreen.js:601-603`; `notifications/handler.js:165,192`; `scheduler.js:625,752,981` |
| T-11 | IMPROVEMENT | MED-LOW | 40/32 | Reinstall restore issues **3-4 serial SQLite round trips per set** with no transaction, and the food pull applies one unbounded jsonb blob row by row plus a rollup recompute per distinct day | `database.js:7816-7845`; `sync/tables/foodDomain.js:351-420`; `migrate_016_food_sync_rpcs.sql:42-46` |
| T-12 | DEFECT | MED (latent ~1.4 y) | 41 | `partner_cheers` is pulled unpaginated **and unordered**, so a partnership past ~1,000 cheers silently stops mirroring new ones | `sync/tables/partners.js:167-168`; rate limit `migrate_081:191-199` (2/day/pair) |
| T-13 | DEFECT | MED | 41 | Four **watermarked but unpaginated** pulls advance their cursor past rows a 1,000-row truncation never delivered, so those rows are **permanently skipped** on that device | `sync.js:2212-2225` (coach_outputs), `:2085-2109` (programmes), `:2162-2184` (mesocycles), `:1822-1835` (exercise_user_notes); rule `sync/watermark.js:66-71` |
| T-14 | LATENT | MED-LOW | 41 | Fourteen further per-user cloud reads have no pagination; the reachable ones are `recipe_ingredients` and `workout_notes` | full table below |
| T-15 | LATENT | LOW | 41 | `food_sync_pull` returns the whole delta as one unbounded `jsonb` scalar; no 1,000-row cap applies, but no bound applies either | `migrate_016_food_sync_rpcs.sql:42-46`; `foodDomain.js:351-357` |
| T-16 | IMPROVEMENT | MED-LOW | 42 | Nothing anywhere tells the user that progress photos and scan images **do not come back** after a reinstall or a device change; the copy only ever says "private on this device" | `ProgressPhotosScreen.js:1473`; `PrivacyPolicyScreen.js:31`; `Article9ConsentScreen.js:243`; `SettingsFaqScreen.js:65-67` vs `:72` |
| T-17 | LATENT | LOW | 42 | A JSON backup restores `progress_scan_sessions` / `progress_scan_assets` / `progress_photo_meta` rows whose image files are **not** in the backup, leaving scan history entries with dead URIs | `database.js:5347+` (`BACKUP_TABLES` tail); alert copy `SettingsDataScreen.js:196,207` |
| T-18 | DEFECT | **MED** | 43 | The partner's week signal is read as "the newest row of **any age**" and rendered with the words "this week", so a partner who stopped syncing months ago is reported as a live current week | `database.js:5786-5796` (the no-`weekStart` branch); `usePartners.js:196-197,244-247`; render `PartnerScreen.js:93-98,511` |
| T-19 | IMPROVEMENT | MED-LOW | 43 | Partner beats only ever serve the **first** active pair, so a Pro user with two or three partners gets cheer, streak and join pushes for one of them | `scheduler.js:1525-1529`; cap `partners/signals.js:74-80` |
| T-20 | LATENT | LOW | 43 | The shared streak is fixed at invite time; there is no later toggle, so the only way to turn it off is to end the partnership | `partners/service.js:189-193`; no update path repo-wide |
| T-21 | LATENT | LOW | 43 | `ORDER BY week_start DESC` sorts a **TEXT** epoch-ms column lexicographically | `database.js:5791-5793`; column type `migrate_081:124-135` |
| T-22 | CLEAN | — | 39 | `dayKey.js` itself is correct: `localWeekStartMs` uses local getters and `localWeekEndMs` crosses DST by calendar arithmetic, not +168 h | `dayKey.js:43-77`; `dayKey.lsO6.dst.test.js` passes |
| T-23 | CLEAN | — | 39 | Block-week day counting is DST-safe: `localDaysElapsed` anchors both ends at local midnight and rounds | `mesocycle.js:72-79`; `mesocycle.f10.dst.test.js` passes |
| T-24 | CLEAN | — | 39 | Quiet hours are wall-clock and DST-safe; the shift uses `setHours` on a local Date, and the default 22:00-07:00 window never lands in a spring-forward gap | `quietHours.js:74-129` |
| T-25 | CLEAN | — | 39 | The timezone re-lay is correctly wired and correctly gated on the offset, and a DST change trips it too | `scheduler.js:1233-1247`; `App.js:985-996`; `notifications.scheduler.test.js:784-810` |
| T-26 | CLEAN | — | 39 | Distinct-morning weigh-in logic re-confirmed DST-safe (**R-20**, D97-22); nothing in this pass changes that verdict | `AUDIT-RETURN-AND-HISTORY.md` R-20 |
| T-27 | CLEAN | — | 41 | The heavy training pulls are paginated and throw (rather than half-apply) on a mid-pagination error | `sync.js:127-148,152-190,1601-1612,1624-1626`; `sync/tables/_paginate.js:19-30` |
| T-28 | CLEAN | — | 42 | Photos and scan images never sync (**S-23**), the backup alert says so explicitly, and the privacy policy and Article 9 copy are accurate | `SettingsDataScreen.js:196,207`; `progressPhotoMetaNoSync.guard.test.js` |
| T-29 | CLEAN | — | 43 | Remove-partner, invite-replacement, tier change and lapse all behave: unpair purges both sides, `activeCount` counts only active rows so a replacement can be invited, and a lapsed Pro's outbound signal is forced to `resting` | `partners/service.js:437-462`; `usePartners.js:364-369,535-536`; `partners/tierGate.js:22-38`; `sync/tables/partners.js:40-52` |
| T-30 | CLEAN | — | 43 | The cheers push toggle exists and is reachable in the UI | `scheduler.js:1516-1522`; `CoachingRemindersScreen.js:224,252-253,390,574` |

**Counts:** 6 DEFECT, 6 IMPROVEMENT, 9 LATENT, 9 CLEAN, 0 FOUNDER-GATED,
0 UNCERTAIN. All 21 non-CLEAN findings are **NEW** except T-9, which is the
commissioned measured verdict on the already-recorded R-13.

---

# PHASE 39 — TIMEZONE, DST, CLOCK CHANGE

## T-1 (DEFECT, MED) — the streak strip's week keys drift by an hour across a DST change, and the drift eats pause spans and recovery weeks

**Trace.** Every *producer* of a week key uses the true local Monday:

```
database.js:6270        set.add(localWeekStartMs(r.startedAt))     // getDeloadWeeksInRange
streakState.js:14-16    "the epoch-ms string of the local Monday, String(localWeekStartMs)"
```

The *consumer* does not:

```
useWeeklyStreak.js:29   const WEEK_MS = 7 * 86400000;
useWeeklyStreak.js:59   const currentWeekStart = localWeekStartMs(Date.now());
useWeeklyStreak.js:91-95
      for (let i = WEEKS - 1; i >= 0; i--) {
        const ws = currentWeekStart - i * WEEK_MS;
        ...
        weekStarts.push(ws);
      }
useWeeklyStreak.js:122-123
      const deloadSet = new Set(deloadWeeks);
      const orderedWeekKeys = weekStarts.map(String);
```

`dayKey.js:61-72` records exactly why this is wrong, in the app's own words:

> "the weekly windows added a fixed `7 * 86400000` ms (168h) to a local Monday
> midnight. A UK week that contains a BST/GMT transition is 167h (spring) or
> 169h (autumn), not 168, so the fixed offset landed the boundary an hour off"

**Reproduced** (`probe-streak-dst.js`, `TZ=Europe/London`, "now" =
Wednesday 4 November 2026, after the 25 October fall-back):

```
i   hookKeyLocal                          matches  driftMin
0   Mon Aug 17 2026 01:00:00 GMT+0100     false    60
...
9   Mon Oct 19 2026 01:00:00 GMT+0100     false    60
10  Mon Oct 26 2026 00:00:00 GMT+0000     true     0
11  Mon Nov 02 2026 00:00:00 GMT+0000     true     0
```

Ten of the twelve visible weeks carry a key one hour later than the local
Monday every producer emits. Two consequences, both reproduced:

*Consequence A — a prescribed recovery week is scored as a miss.*

```
deload week produced by getDeloadWeeksInRange : 1788130800000
week key the hook will test with               : 1788134400000
deloadSet.has(hookKey) -> false
states : kept kept repaired kept kept kept kept kept kept kept kept in-progress
runLength: 11  (12 weeks trained, one prescribed recovery week)
```

The deload week fell through to `missed` and only survived because the
`repaired` bridge caught it (`streak.js:48-61`) — which then **spends the one
repair allowed per rolling six weeks**, so a genuine miss in the same window
now lapses the run. Had the deload week sat next to any sub-target week, the
run would have broken outright. `streak.js:17-18` states the rule this
violates: "Engine-prescribed deload weeks are 'resting' and keep the run, even
with zero sessions — recovery is compliance, never a miss."

*Consequence B — an explicitly chosen pause is silently discarded.*

```
pause startKey stored            : 1789340400000  Mon Sep 14 2026 00:00:00 GMT+0100
ordered key for the same week    : 1789344000000  Mon Sep 14 2026 01:00:00 GMT+0100
weeks recovered by pausedWeekKeys: 0 (expected 3)
```

`pausedWeekKeys` misses on `indexOf`, falls into the R-10 recovery path, and
is stopped dead by its own guard:

```
streakState.js:86    if (startMs > windowStartMs) continue; // future/off-grid key: unchanged
```

The stored key is one hour *later* than the window's first ordered key, so a
pause that starts anywhere inside the visible window is treated as
"future/off-grid" and dropped whole. This is the exact class of failure R-10
(D97-22) was landed to close — "a chosen pause silently converted into a
lapse" (`streakState.js:59-65`) — reopened by the DST hour rather than by
scrolling.

*Third, smaller consequence.* `getWeeklySessionStats` re-snaps its END through
`localWeekEndMs` (`database.js:6278`) but queries `started_at >= weekStartMs`
with the **drifted** start. A session started between 00:00 and 00:59 on a
Monday inside a drifted week falls into no week at all: it is `< weekEnd` of
the previous week's true Monday and `< 01:00` of its own.

**User consequence.** Twice a year, for the ten or eleven weeks on the far
side of the transition, a long-term user's consistency strip re-renders: weeks
they deliberately paused revert to "Quiet week", a coach-prescribed recovery
week reads as a miss, and a run they have held for months can drop or lapse —
with no action of theirs and no explanation. This is the single most
loyalty-damaging finding in this audit.

**Direction sketch (options, not applied).**
(a) Build the strip from the calendar rather than from arithmetic: derive each
older week from the current one with `localWeekStartMs` over a local-date step
(the same technique `localWeekEndMs` already uses at `dayKey.js:73-77`), so
every key is a true local Monday and matches every producer. This is the only
option that fixes all three consequences at once.
(b) Keep the arithmetic but normalise at the boundary —
`weekStarts.push(localWeekStartMs(ws))` — which fixes the keys and the deload
and pause matches, and by construction fixes the stats window too.
(c) Leave the keys and relax the comparisons (snap on both sides of
`deloadSet.has` and inside `pausedWeekKeys`). Cheapest, but it leaves two
representations of "the same week" alive in the codebase, which is how this
class of bug keeps recurring.
The same normalisation should be applied to the sibling call sites in T-3 and
T-4; a shared "previous local Monday" helper in `dayKey.js` would let all five
sites read one rule. No streak rule, threshold or ED gate changes in any
option.

---

## T-2 (DEFECT, MED-LOW) — a block's start date makes a UTC round trip, so outside UTC+0 the block week ticks over on the wrong day

**Trace.** The writer stamps the **UTC** calendar date of "now":

```
database.js:3770   const startDate = new Date().toISOString().slice(0, 10);
database.js:3774-3775
   const endDate = new Date(Date.now() + BLOCK_PLANNED_WEEKS * 7 * 24 * 60 * 60 * 1000)
     .toISOString().slice(0, 10);
```

The reader parses that string as **UTC midnight** and then reinterprets the
resulting instant on the device's local calendar:

```
mesocycle.js:151-152
   const start = typeof startDateMs === 'string' ? new Date(startDateMs).getTime() : startDateMs;
mesocycle.js:158-161
   const daysElapsed = localDaysElapsed(start, nowMs);
   const weekIndex = Math.floor(daysElapsed / 7) + 1;
```

`localDaysElapsed` is itself correct and DST-safe (T-23); the defect is the two
UTC hops on either side of it. `getCurrentMesocycleWeek`
(`database.js:4133-4137`) and `getBlockStatus` both consume it, so the drift
reaches the "Week N of 6" label, the recovery-week highlight and
`awaitingDecision`.

**Reproduced** (`probe-tz-block.js`, activation at 13 July 2026, per local hour):

| Zone | Activation window that drifts | Drift |
|---|---|---|
| `Europe/London` (BST) | 00:00-00:59 local | −1 day |
| `Australia/Sydney` (UTC+10) | before 10:00 local | −1 day |
| `America/New_York` (UTC−4) | before 20:00 local | −1 day |
| `UTC` | none | 0 |

And the pure **travel** case (`probe-tz-block2.js`): a block whose stored start
is a correct `2026-07-13` (a Monday), read on a device now in
`America/Los_Angeles`, advances to week 2 on **Sunday 19 July**; the same row
read in London or Sydney advances on Monday 20 July as intended.

**User consequence.** For a UK user this is small: only a block activated
between midnight and 1 am during British Summer Time is affected, and it then
stays a day out for the whole six weeks. For a user who lives abroad, or a UK
user who travels for a fortnight mid-block, the block's week boundary — and
therefore the recovery week, the RIR target and the end-of-block decision
prompt — moves a day early and then moves back. No data is lost and no ED
threshold is involved; it is a correctness and trust defect in the surface the
whole coaching narrative is anchored on.

**Direction sketch (options, not applied).**
(a) Store the **local** day at activation (`localDayKey(Date.now())` from
`dayKey.js:17-25`) and parse it back with `parseLocalDay`
(`dayKey.js:37-41`, which exists precisely because "`new Date(isoStr)` parses
as UTC"). Both halves then speak the user's calendar. Existing rows keep
working: a legacy UTC-stamped date parsed by `parseLocalDay` is at worst the
same one-day offset it already has, never worse.
(b) Store an epoch-ms `started_at` alongside the date and read the ms, leaving
the text column for display and for the cloud NOT NULL constraint. More
faithful, but it is a schema addition (additive and idempotent, per Section 2)
and a migration.
(c) Read-side only: keep the UTC write and parse with `parseLocalDay`. Fixes
the traveller case and every user west of UTC; leaves the eastern early-morning
write window wrong.
Note that `blockLedgerRunner.js:272` writes `blockEndDate` the same way and
should move with whichever option is taken (see T-5).

---

## T-3 (DEFECT, LOW-MED) — the partner "week kept together" moment misses for a week after every DST change

**Trace.**

```
usePartners.js:37     const WEEK_MS = 7 * 86400000;
usePartners.js:197-198
   const thisWeek = String(localWeekStartMs(Date.now()));
   const lastWeek = String(localWeekStartMs(Date.now()) - WEEK_MS);
usePartners.js:215-218
   getPartnerWeekSignal(partnership.id, userId, lastWeek)
   getPartnerWeekSignal(partnership.id, partnerId, lastWeek)
   getPartnerWeeklyIntention(partnership.id, userId, lastWeek)
   getPartnerWeeklyIntention(partnership.id, partnerId, lastWeek)
```

`lastWeek` is used as an **exact key** in a `WHERE ... week_start = ?` lookup,
but the rows it must match were written during that week with
`String(localWeekStartMs(Date.now()))` (`usePartners.js:277`, `:651`;
`sync/tables/partners.js:56`). In the week following a UK transition the two
differ by an hour, all four reads return `null`, and:

```
usePartners.js:232-243
   const weekKept = weekKeptTogether({
     myAim: myPrevAimRow?.weeklyAim, partnerAim: partnerPrevAimRow?.weeklyAim,
     myDone: myPrevSignal?.doneCount, partnerDone: partnerPrevSignal?.doneCount,
     ...
   });
```

collapses to `false`, which the surrounding comment describes as the safe
HOLD path — so the failure is silent by design.

The same root cause sits at `partners/moments.js:42,123-124`
(`prevWeekStart = currentWeekStart - WEEK_MS`), which feeds the moment
derivation.

**User consequence.** Twice a year, every pair loses the one celebratory beat
the partner feature has for a completed week, and each side's aim for the
just-closed week reads as zero. It fails quietly, which is why it has not been
noticed.

**Direction sketch.** Same options as T-1; the minimal change is
`String(localWeekStartMs(localWeekStartMs(Date.now()) - WEEK_MS))`, or better a
shared `previousLocalWeekStartMs` helper in `dayKey.js` used by
`useWeeklyStreak`, `usePartners`, `moments` and `useProgressData` so no caller
does week arithmetic itself again.

---

## T-4 (LATENT, LOW) — two further fixed-168-hour windows over local-Monday anchors

```
CascadeGateScreen.js:197
   for (let ws = localWeekStartMs(startMs); ws < endMs; ws += WEEK_MS) {
     prCount += await getWeeklyPRCount(userId, ws);
   }
useProgressData.js:444-445
   const thisWeekStart = localWeekStartMs(Date.now());
   const lastWeekStart = thisWeekStart - WEEK_MS;
```

Neither uses the value as a key, so the failure mode is a one-hour boundary
error, not a lost row: a PR set in the first hour of a Monday can be counted
twice or dropped in the trial recap when the 14-day trial spans a transition
(about a 4 % chance per trial), and one Monday-morning session can land in the
wrong column of the muscle-frequency "this week vs last" comparison. Recorded
so the T-1 fix sweeps them rather than leaving two survivors.

---

## T-5 (LATENT, LOW) — the carried UTC day-key debt, current inventory

Phase 39 asked for the known UTC day-key debt to be carried forward if still
relevant. Outside `dayKey.js` itself, three UTC day derivations remain live:

| Site | What it does | Relevance |
|---|---|---|
| `database.js:6345,6353` | `getFirstWorkoutDateOnOrAfter` snaps to UTC midnight and returns a UTC `YYYY-MM-DD` | Self-documented as UTC (`:6338-6342`). Resolves which day an applied refeed lands on. A session trained in the first hour of a BST day resolves to the previous date. |
| `blockLedgerRunner.js:272` | `blockEndDate: new Date(blockEnd).toISOString().slice(0, 10)` | Same class as T-2; should move with whichever T-2 option is taken. |
| `algorithms.js:1057-1058` | `_defaultFormatDay` names the weekday from `getUTCDay()` | Injectable (`formatDay`, `algorithms.js:1087`) but **no production caller injects a local formatter** (repo-wide grep). So `computeSessionAdjustments` copy can name "Sunday" for a session trained just after midnight on a BST Monday. |

Two nearby sites were checked and are **not** debt:
`nutritionEngine.js:260` (`ewmaCoverageWeeks`) round-trips a `Date.parse` of the
same string it re-serialises, so it is stable for day-key inputs; and
`nutritionEngine.js:455` deliberately uses `Date.UTC` for a difference, which is
timezone-stable and documented as such at `:450`.

---

## T-6 (LATENT, LOW) — the cheer-per-day limit is local on both sides

```
partners/service.js:291   const sentOn = todayLocalKey();
migrate_081_training_partners.sql:191-199
   -- The UNIQUE(pair_id, sender_id, sent_on) constraint is the rate limit — one
   -- cheer per partner per local day, enforced at the database, not by vibes.
```

The client computes the day key from the **sender's device**, so a westward
flight can produce two `sent_on` values inside 24 hours and an eastward one can
skip a day. Benign — the cap is a kindness, not a safety control — and the
alternative (a server-side UTC day) would be worse for the ordinary user. Noted
for completeness only; **no change recommended**.

---

## T-7 (LATENT, LOW) — the timezone re-lay can destroy a just-laid partner-cheer push permanently

**Trace.** The re-lay calls `restoreNotifications`, which opens with a full
cancel:

```
scheduler.js:1243-1246
   if (stored === null) return;
   const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
   if (raw) await restoreNotifications(JSON.parse(raw), userId);
scheduler.js:1256   await cancelAllNotifications();
```

`restoreNotifications` re-lays eleven families (weight, check-in, coach-ready,
cascade, trial day 3, win-back, missed check-in, planned meal, activation
nudge, meal reminders, training reminders) — the accumulated record of past
wipe regressions. **Partner beats are not among them.** Their only caller is
the partner pull:

```
sync/tables/partners.js:242-243
   const { schedulePartnerBeats } = require('../../notifications/scheduler');
   schedulePartnerBeats(userId).catch(() => {});
```

and the beat is laid at `now + 5 s` with the watermark advanced regardless of
outcome:

```
scheduler.js:1543-1545   const { date } = shiftDateOutOfQuietHours(new Date(Date.now() + 5000), quiet);
scheduler.js:1622-1626
   // Watermarks advance even when the budget said no: a capped beat is
   // dropped for the episode, never re-queued later as stale news.
```

On foreground, `App.js:985-996` fires `callSyncAll('foreground')` (unawaited)
and then `rescheduleForTimezoneIfChanged` in the same tick. On a DST day or
after travel, the re-lay's `cancelAllNotifications()` can land inside that
5-second window and cancel the cheer push — and because the watermark has
already moved, nothing ever re-lays it.

**User consequence.** Rare (needs a timezone or DST change to coincide with an
unseen cheer), silent, and it costs the partner feature its single most
important beat. Classified LATENT because reproducing it requires the race.

**Direction sketch.** Either add `schedulePartnerBeats` to the
`restoreNotifications` re-lay list — the same fix this file has applied eleven
times before, and its helper already self-guards on ED flag, preference and
budget — or advance the beat watermark only after
`scheduleNotificationAsync` resolves. The first is more in keeping with the
existing pattern.

---

# PHASE 40 — DATA SCALE AND PERFORMANCE

Method: synthetic histories at 4 sessions/week x 25 sets, 48 exercises across
12 muscles, replaying the exact `useProgressData` loops. Node 22 on desktop
V8; Hermes on a mid-range Android device is typically 2-5x slower for this
work, so read every figure as a floor.

## T-9 (IMPROVEMENT, LOW) — R-13, the measured verdict

R-13 (D97-22) recorded the Progress landing as re-scanning lifetime history
about twenty times per focus, estimated at "~100,000 synchronous predicate
evaluations per focus", classified MED-LOW. The measurement confirms the
**count** and contradicts the **cost**.

| History | Workouts | Sets | JS time for the whole landing's derivation | Predicate evaluations |
|---|---|---|---|---|
| 3 months | 52 | 1,300 | 4.0 ms | 32,864 |
| **1 year** | **208** | **5,200** | **6.6 ms** | **131,456** |
| 2 years | 416 | 10,400 | 10.0 ms | 262,912 |
| 3 years | 624 | 15,600 | 15.5 ms | 394,368 |
| 5 years | 1,040 | 26,000 | 16.2 ms | 657,280 |

The 90-day PR-window toggle, which re-runs `computePRsPerWeek` over all-time
history, costs 2.0 ms at three years.

**Verdict.** R-13's arithmetic was right — 131k predicate evaluations at one
year, 394k at three, growing linearly — but the wall cost is single-digit to
mid-teens milliseconds even at five years, roughly **7 % of the landing's JS
cost**. Its own classification of "a cost curve, not a correctness bug" holds,
and its severity should be **lowered from MED-LOW to LOW**. Its direction
sketch (bucket the sets once by week key) remains valid but would recover only
that 7 %. **The other 93 % is T-8, which R-13 did not identify.**

## T-8 (DEFECT, HIGH) — `rowToCamel` runs a callback regex per column per row, and it dominates every lifetime read

**Trace.**

```
database.js:66-78
   function rowToCamel(row) {
     if (!row) return null;
     const result = {};
     for (const [key, value] of Object.entries(row)) {
       const camelKey = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
       ...
```

Every row of every SQLite read goes through this, and the regex plus its
callback runs **once per column per row**, recomputing the identical mapping
for a fixed column list millions of times. The two lifetime readers feed it the
whole history:

```
database.js:2530-2541  getAllWorkouts        — SELECT w.*, r.name ... ORDER BY w.started_at DESC
database.js:2738-2748  getCompletedWorkoutSets — SELECT ws.* ... JOIN workouts ... ORDER BY ws.created_at DESC
```

**Measured** (22-column set row, warm JIT, median of five runs):

| Rows | ≈ history | `rowToCamel` |
|---|---|---|
| 1,300 | 3 months | 25.4 ms |
| **5,200** | **1 year** | **106.2 ms** |
| 10,400 | 2 years | 217.4 ms |
| 15,600 | 3 years | 320.1 ms |
| 26,000 | 5 years | 530.4 ms |

For scale, the same 26,000 rows mapped through a **precomputed key map**
instead of a per-cell regex take **111.4 ms** — a 4.8x reduction with
byte-identical output.

**User consequence.** Every Progress-tab focus does at least 106 ms (one year)
to 530 ms (five years) of *pure key-renaming* on the JS thread on desktop V8,
before the ~7 ms of actual analysis and before any React work. On device that
is plausibly a quarter-second at one year and one to two and a half seconds at
five — a visibly janky landing that gets worse every month the user stays,
which is precisely the long-term-loyalty failure Campaign 6 exists to find.
It also lands on the surfaces in T-10.

**Direction sketch (options, not applied).**
(a) Memoise the key mapping: a module-level `Map<string,string>` consulted
before the regex. One-line change, output identical, no call-site touched,
measured at ~4.8x. Lowest risk and the obvious first move.
(b) (a) plus bounding the *other* consumers to the widest window they need —
noting R-13's constraint that `computePRsPerWeek` genuinely requires all-time
history for its running-max replay (`useProgressData.js:23-61`) and must keep
it, so the bound belongs on the other consumers, not on the fetch.
(c) Return snake_case rows from the heavy readers and let each consumer read
the column it wants — most already dual-read (`s.createdAt ?? s.created_at`).
Fastest, but it changes the shape of `allSets` which the Progress tab exports,
so it is a wider blast radius for a smaller marginal gain over (a).
No metric definition, threshold or ED gate changes in any option.

## T-10 (IMPROVEMENT, MED) — the unbounded lifetime read has spread to the highest-frequency surfaces

`getCompletedWorkoutSets` and `getAllWorkouts` are no longer confined to the
Progress tab:

| Caller | Frequency | Read |
|---|---|---|
| `ReadinessCards.js:124-125` | Home, every focus | both |
| `WorkoutSummaryScreen.js:601-603` | after **every** session | both |
| `AthleteProfileScreen.js:298-299` | profile focus | both |
| `MesocycleBuilderScreen.js:89-90` | builder focus | both |
| `CoachReviewScreen.js:310-311` | coach review | both |
| `VolumeHeatmapScreen.js:149` | heatmap focus | sets |
| `LiftProgressScreen.js:21` | lift progress | sets |
| `EngineLog.js:76` | engine log | sets |
| `notifications/handler.js:165,192` | **per foreground notification** | workouts |
| `scheduler.js:625,752,981` | trial / win-back / activation scheduling | workouts |

`handler.js:165` is the sharpest example: `_trainedToday()` reads *every
workout ever* and maps it through `rowToCamel` purely to answer "did they train
today", on a path that runs whenever a notification arrives with the app open.
`getWorkoutSetsSince` already exists for the bounded case
(`database.js:2756-2775`, added as LB-7) and is used by Home block progress and
the insights engine, so the bounded primitive is present and simply not used
here.

**Direction sketch.** T-8(a) alone makes all ten call sites 4.8x cheaper with
no behavioural change and should land first. After that, the clearly bounded
questions — "did they train today", "how many completed sessions",
"earliest completed workout" — deserve their own SQL (`SELECT COUNT(*)`,
`SELECT MIN(started_at)`, `SELECT 1 ... LIMIT 1`) rather than a full history
read; each is a small, independently testable change.

## T-11 (IMPROVEMENT, MED-LOW) — reinstall restore is serial and untransacted

Two structural costs, reported as static analysis because they need the real
SQLite bridge to time.

*Workout sets.* `insertWorkoutSetFromCloud` issues **three to four separate
awaited statements per set** — an `exercises` existence check, optionally a
name lookup, an `updated_at` read for last-write-wins, then the
`INSERT OR REPLACE` — and the caller loops serially:

```
sync.js:1624-1636
   const allSets = await fetchByIdsChunked('sync.pullFromCloud.sets', 'workout_sets', 'workout_id', workoutIds);
   for (const s of allSets) {
     try { await insertWorkoutSetFromCloud(supabaseUserId, s); setCount++; }
```

There is no `withTransactionAsync` on this path (the helper exists at
`database.js:2361-2372` and is used elsewhere). A one-year reinstall is roughly
**15,600 bridge round trips**; three years, ~47,000.

*Food domain.* The reinstall pull passes an epoch watermark
(`foodDomain.js:351-357`), so `food_sync_pull` returns the user's entire food
history as one `jsonb` scalar, and `applyGroup` applies it with a serial
`for ... await` (`foodDomain.js:379-397`), followed by one `recomputeRollup`
per distinct date (`:410-420`) — about 365 extra read-modify-write cycles for a
one-year user.

**User consequence.** The first sign-in after a reinstall is the moment a
returning user decides whether their history survived. Today that moment is a
long serial grind with no batching. Nothing is lost; it is slow, and it gets
slower every year.

**Direction sketch.** Wrap each apply loop in one transaction per chunk
(`database.js:2361-2372`); hoist the per-set exercise-existence check into one
`SELECT id FROM exercises` set built once per pull rather than per row; and
batch the rollup recompute per date rather than per entry. All three are
mechanical and preserve the per-row failure accounting that F2/LS-03 depend on
(`foodDomain.js:373-380`) — which is the constraint any implementation must
respect, since a transaction that swallows a per-row failure would undo those
fixes.

---

# PHASE 41 — ROW-CAP AND PAGINATION AUDIT

PostgREST caps every response at 1,000 rows. Three paginating helpers exist and
are correct (**T-27**): `fetchAllRows` (`sync.js:127-148`),
`fetchByIdsChunked` (`sync.js:152-190`) and `fetchAllUserRows`
(`sync/tables/_paginate.js:19-30`). All three throw or return
`{data: null, error}` on a mid-pagination failure rather than presenting a
partial set as complete.

## The row-cap table — every cloud read on the named long-term tables

| Table | Read site | Pagination | Watermark | Growth | Rows to hit 1,000 | Verdict |
|---|---|---|---|---|---|---|
| `workouts` | `sync.js:1601-1612` | `fetchAllRows` | yes | ~208/yr | — | **CLEAN** |
| `workout_sets` | `sync.js:1624-1626` | `fetchByIdsChunked` (paginates within each 200-id chunk) | via parent | ~5,200/yr | — | **CLEAN** (the Campaign 1 truncation; fixed and commented at `sync.js:161-168`) |
| `morning_weights` | `sync.js:2196-2205` | `fetchAllRows` | yes | ~365/yr | — | **CLEAN** |
| `planned_muscle_volume` | `sync.js:1925-1930` | `fetchAllRows` | no | per block | — | **CLEAN** (fixed in Campaign 1 review finding 3) |
| `adaptation_events` | `sync.js:1943-1948` | `fetchAllRows` | no | per decision | — | **CLEAN** |
| `exercises` | `sync.js:1773-1777` | `fetchAllRows` | no | library | — | **CLEAN** |
| `routines` | `sync.js:2117-2126` | `fetchAllRows` | yes | plans | — | **CLEAN** |
| `routine_exercises` | `sync.js:2138-2141` | `fetchByIdsChunked` | via parent | — | — | **CLEAN** |
| `mesocycle_weeks` | `sync.js:2175-2178` | `fetchByIdsChunked` | via parent | — | — | **CLEAN** |
| `body_metrics` | `sync/tables/bodyComposition.js:128-130` | `fetchAllUserRows` | no | ~365/yr | — | **CLEAN** |
| `daily_steps` | `sync/tables/dailySteps.js:97-99` | `fetchAllUserRows` | no | 365/yr | — | **CLEAN** |
| `cardio_log` | `sync/tables/cardioLog.js:42-44` | `fetchAllUserRows` | no | varies | — | **CLEAN** |
| `nutrition_targets` | `sync/tables/nutritionTargets.js:85-88` | `.maybeSingle()` | — | 1 | — | **CLEAN** |
| `perday_target_offsets` | `sync/tables/perDayTargetOffsets.js:87-90` | `.maybeSingle()` | — | 1 | — | **CLEAN** |
| `users_profile` | `sync/tables/profiles.js:192-195` | `.maybeSingle()` | — | 1 | — | **CLEAN** |
| `user_body_profile` | `sync.js:1791-1792` | `.maybeSingle()` | — | 1 | — | **CLEAN** |
| **`coach_outputs`** | `sync.js:2212-2217` | **none** | **yes** | 1/week (UNIQUE `user_id,week_start`, `database.js:2099`) | ~19 yr | **T-13 DEFECT** — watermark poisoning |
| **`programmes`** | `sync.js:2084-2088` | **none** | **yes** | per plan created | user-driven | **T-13 DEFECT** |
| **`mesocycles`** | `sync.js:2159-2165` | **none** | **yes** | ~8/yr | ~125 yr | **T-13 DEFECT** (cap unreachable; the *rule* is the defect) |
| **`exercise_user_notes`** | `sync.js:1820-1825` | **none** | **yes** | per exercise | user-driven | **T-13 DEFECT** |
| **`partner_cheers`** | `sync/tables/partners.js:167-168` | **none**, **no `ORDER BY`** | no | up to 2/day/pair | **~1.4 yr** | **T-12 DEFECT** — the most reachable cap in the app |
| `recipe_ingredients` | `sync/tables/recipeIngredients.js:95-97` | **none** | no | recipes x ingredients | ~100 recipes | **T-14 LATENT (MED-LOW)** — reachable |
| `workout_notes` | `sync.js:1840-1843` | **none** | no | 1 per annotated session | ~5 yr | **T-14 LATENT (LOW-MED)** |
| `weekly_checkins_v2` | `sync/tables/weeklyCheckins.js:107-109` | **none** | no | 1/week | ~19 yr | **T-14 LATENT (LOW)** |
| `user_insights` | `sync.js:1802-1805` | **none** | no | dismissed rows are never pruned (`database.js:4783-4798`) | slow | **T-14 LATENT (LOW)** |
| `exercise_goals` | `sync.js:1857-1860` | **none** | no | per exercise | unlikely | **T-14 LATENT (LOW)** |
| `custom_exercises` | `sync.js:1874-1877` | **none** | no | user-created | unlikely | **T-14 LATENT (LOW)** |
| `peak_week_plans` | `sync.js:1901-1904` | **none** | no | rare | unlikely | **T-14 LATENT (LOW)** |
| `user_prefs` | `sync.js:2033-2036` | **none** | no | one row per synced key | bounded | **T-14 LATENT (LOW)** |
| `ed_pattern_flags` | `sync/tables/edPatternFlags.js:23-25` | **none** | no | per episode | unlikely | **T-14 LATENT (LOW)** — no ED behaviour depends on the tail |
| `tier_history` | `sync/tables/tierHistory.js:25-27` | **none** | no | per tier change | unlikely | **T-14 LATENT (LOW)** |
| `plan_folders` | `sync/tables/planFolders.js:98-100` | **none** | no | user-created | unlikely | **T-14 LATENT (LOW)** |
| `meal_plans` | `sync/tables/mealPlans.js:85-98` | **none** | no | one row per generated plan (`onConflict: 'id'`) | many years | **T-14 LATENT (LOW)** — and the `reduce`-to-newest at `:95-98` would pick from a truncated page |
| `notification_preferences` | `sync/tables/notificationPreferences.js:77-78,141-142` | **none** | stamp-based | one row per category | bounded | **CLEAN** |
| `partnerships` | `sync/tables/partners.js:99-101` | **none** | no | ≤3 active + one `ended` tombstone per past pair | unlikely | **CLEAN** |
| `partner_week_signals` | `sync/tables/partners.js:154-155` | **none** | no | 2/week/pair | ~9.6 yr | **T-14 LATENT (LOW)** |
| `partner_weekly_intentions` | `sync/tables/partners.js:207-208` | **none** | no | 2/week/pair | ~9.6 yr | **T-14 LATENT (LOW)** |
| `partner_win_cards` | `sync/tables/partners.js:222-223` | **none** | no | user-initiated | unlikely | **T-14 LATENT (LOW)** |
| `partner_shared_blocks` | `sync/tables/partners.js:184-185` | **none** | no | 1 per pair | never | **CLEAN** |
| food domain (`food_entries`, `custom_foods`, `saved_meals`, `recipes`, `food_favourites`, `daily_water`, `daily_intake_rollups`) | RPC `food_sync_pull`, `foodDomain.js:357` | **n/a** — `RETURNS jsonb`, a single scalar, so the 1,000-row cap does not apply | shared watermark | ~1,800 entries/yr | — | **T-15 LATENT (LOW)** — no cap, but no bound either |

## T-12 (DEFECT, MED; latent until ~1.4 years) — a long partnership silently stops receiving cheers

```
sync/tables/partners.js:167-168
   const { data: cheers, error: cErr } = await sb.from('partner_cheers')
     .select('*').in('pair_id', activePairIds);
```

No `.range()`, no `.limit()`, and — the part that makes it worse — **no
`ORDER BY`**. The rate limit is one cheer per sender per pair per local day
(`migrate_081:191-199`), i.e. up to two rows per pair per day, and there is no
retention policy: `partner_cheers` is purged only when the partnership ends
(`migrate_092:53`, `migrate_100:192`, `migrate_105:170`, `migrate_107:125`). A
pair that cheers most days crosses 1,000 rows in about fourteen months.

Past that point PostgREST returns an arbitrary, unordered 1,000 of them. The
pull mirrors that page locally; the newest cheer is not guaranteed to be in
it. `getLastCheerReceived` then feeds `schedulePartnerBeats`
(`scheduler.js:1537-1539`) and `cheerAllowed`
(`partners/signals.js:38-41`), so the observable behaviour is: **a partnership
that has lasted more than about a year stops reliably showing and notifying
new cheers**, intermittently, with no error anywhere.

**Direction sketch (options, not applied).**
(a) Route this read through `fetchAllUserRows` and add
`.order('created_at', { ascending: false })`. Correct but unbounded: it also
means mirroring thousands of historical cheers no surface reads.
(b) Bound the read to what the product actually needs — the partner beats
consider a cheer fresh for 48 hours (`partnerBeats.js:19`) and the row caption
shows only the last one — so
`.order('created_at', {ascending:false}).limit(50)` per pair is both correct
and cheaper, and the "last cheer received" and "cheered today" questions are
answered from the top of that ordered slice.
(c) Add a server-side retention rule to `partner_cheers`. Effective, but it is
a new cloud migration and a data-deletion policy, which is a founder decision,
not a lead one.
Option (b) is the smallest change that makes the surface correct at any
partnership age. Whichever is taken, the **`ORDER BY` is not optional**: an
unordered `.limit()` reintroduces the same bug.

## T-13 (DEFECT, MED) — four watermarked pulls can advance their cursor past rows they never received

The advancement rule is:

```
sync/watermark.js:66-71
   export function nextWatermark(existingMs, receivedRows, field = 'updated_at') {
     return Math.max(toMs(existingMs), maxUpdatedAtMs(receivedRows, field));
   }
```

That is safe **only if `receivedRows` is the complete delta**. For the four
pulls that combine a watermark with an unpaginated query —

```
sync.js:2212-2217   coach_outputs
sync.js:2084-2088   programmes
sync.js:2159-2165   mesocycles
sync.js:1820-1825   exercise_user_notes
```

— a 1,000-row truncation delivers an arbitrary subset, `maxUpdatedAtMs` takes
the highest `updated_at` **among the rows that did arrive** (which for a broad
delta will be at or near the true maximum), the cursor jumps past the rows that
did not, and `.gte(cursorIso)` never asks for them again. They are **skipped
for good on that device** until sign-out clears the cursor
(`sync/watermark.js:14-18`).

This is the same hazard LS-03/H-12 fixed inside the paginating helpers
(`sync.js:136-142`: "a transport error mid-pagination means this is an
INCOMPLETE view... Throw so the caller holds its cursor and retries"). The
truncation case is the one the helpers do not see, because a capped response is
not an error.

**Reachability.** `coach_outputs` is one row per week by unique index
(`database.js:2099`), so 1,000 rows is ~19 years; `mesocycles` ~125 years;
`programmes` and `exercise_user_notes` are user-driven and in principle
unbounded but unlikely. So the *consequence* is remote today. The *rule* is
wrong now, it is the exact pattern the campaign has already fixed twice
(Campaign 1's 1,000-row PostgREST truncation, LS-03b's `fetchAllUserRows`), and
the cost of correcting it is four one-line changes.

**Direction sketch.** Wrap each of the four in `fetchAllRows` exactly as
`_pullMorningWeights` (`sync.js:2199-2205`) already does — same watermark
closure shape, same clean-pass gate — so a truncation becomes a second page
rather than a lost row. Alternatively, if the lead prefers not to touch four
sites, the narrower rule "never advance a watermark from a query that was not
paginated" could be enforced by a source-level guard test, but that pins a
prohibition rather than fixing the reads.

## T-14 (LATENT, MED-LOW) — the remaining unpaginated per-user reads

Fourteen further reads have no pagination (see the table). They have **no
watermark**, so there is no cursor to poison: the first 1,000 rows arrive on
every pull and the tail simply never does. The two with a realistic path to
1,000 rows are:

- **`recipe_ingredients`** (`sync/tables/recipeIngredients.js:95-97`) — rows are
  recipes x ingredients. A user with a hundred ten-ingredient recipes is at the
  cap. This is precisely the shape `fetchByIdsChunked`'s own comment records as
  having been *observed in production*: "a 200-routine chunk returning exactly
  1000 routine_exercises" (`sync.js:158-163`). Consequence: after a reinstall,
  some recipes restore with missing ingredients — silently, since the recipe
  row itself arrives.
- **`workout_notes`** (`sync.js:1840-1843`) — one row per annotated session,
  about five years for a four-session-a-week user. Consequence: the oldest (or
  an arbitrary set of) session notes never restore on a new device.

**Direction sketch.** `fetchAllRows` on both, matching the existing call sites.
The remaining twelve are recorded for completeness and need no action now; the
`meal_plans` `reduce`-to-newest (`sync/tables/mealPlans.js:95-98`) is worth a
comment noting it assumes a complete page.

## T-15 (LATENT, LOW) — the food pull has no cap and no bound

`food_sync_pull` is `RETURNS jsonb` (`migrate_016:42-46`), so it is a single
scalar and PostgREST's row cap does not apply — the whole delta always arrives.
The flip side is that a reinstall pull passes the epoch
(`foodDomain.js:351-355`) and the function then aggregates the user's entire
food history into one JSON value in one statement. For a one-year Pro user that
is roughly 1,800 `food_entries` plus 365 rollups, 365 water rows and the
library tables; at three years, triple. There is no chunking, and the RPC runs
under the `authenticated` role's statement timeout. Recorded as the correct
counterpart to the row-cap sweep: this table family cannot be *truncated*, but
it can *time out*, and the failure mode of a timeout here is a whole failed
food restore.

**Direction sketch.** No change recommended now. If it ever needs one, the
shape is a `_limit`/`_since_id` parameter on the RPC with the client looping
until a short page — which is a cloud migration and therefore a founder-gated
decision, not a lead one.

---

# PHASE 42 — LOCAL-ONLY DATA TRUTH

## The local-only inventory (verified)

| Data | Storage | Syncs? | In JSON backup? | Survives reinstall? |
|---|---|---|---|---|
| Progress photo **image files** | app documents dir, `<epochMs>.jpg` (`progressPhotos.js:303-323`) | **No** — no registry entry, guard-tested (S-23) | **No** | **No** |
| `progress_photo_meta` (date, pose, weight snapshot, note) | local SQLite (`database.js:1582-1596`) | **No**, deliberate | **Yes** (`BACKUP_TABLES`) | No (backup only) |
| `progress_scan_sessions` / `progress_scan_assets` | local SQLite | **No** | **Yes** | No (backup only) |
| Progress scan **preferences** | `progressScanPreferences.js`, device-local | No | No | No |
| Quiet hours, notification prefs | AsyncStorage, guarded stamps (S-2) | Yes, via `user_prefs` | No | Yes |
| Streak state (pauses, high-water, milestones) | AsyncStorage per user (`streakState.js:26`) | Yes, guarded (R-11) | No | Yes |
| Sync watermarks, active-workout crash snapshot, timezone baseline | AsyncStorage | **No**, excluded by design (`sync.js:1316-1326,1340-1341`) | No | No (correct — device state, S-21) |

## T-16 (IMPROVEMENT, MED-LOW) — the copy promises privacy but never warns about impermanence

Every piece of copy about progress photos says the same true thing — they are
private and never uploaded — and none of it says the consequence:

```
ProgressPhotosScreen.js:1473    Private on this device
PrivacyPolicyScreen.js:31       ...the photo files stay on this device unless you choose
Article9ConsentScreen.js:243    Progress photo image files stay on this device unless you choose to share or export them
SettingsFaqScreen.js:65-67      "Are my progress photos private?" -> "Yes. Progress photos are private on this
                                device: they are never uploaded anywhere. A full data backup includes your photo
                                metadata but not the image files themselves..."
```

The FAQ answer is the closest to honest and still frames the fact as a
*privacy* property. Meanwhile the general data answer sets the opposite
expectation:

```
SettingsFaqScreen.js:72   'Your data lives on your device first, and syncs to a European (Dublin) server
                           so it follows you across devices.'
```

The preservation route is also narrower than a user would guess: the JSON
backup carries only metadata (`SettingsDataScreen.js:196` — "Private photo
image files are not bundled", which is honest), and the only export path in the
app is a **single-photo** share (`ProgressPhotosScreen.js:1207`, `Sharing.shareAsync(fileUri)`). There is no "save all to gallery".

**User consequence.** A Pro user who has taken a physique photo every month for
a year, changes phone or reinstalls, signs in, watches every workout, weight
and check-in come back — and finds the photo timeline empty, with no warning
given at any point and no bulk export they could have used. This is the exact
"returning/reinstall users must not be surprised" case the phase names.

**Direction sketch (options, not applied). No photo cloud sync — bounded.**
(a) Copy only. Add one plain line beside the photo grid and repeat it in the
FAQ answer. Suggested wording, British English, no em dashes:
"These photos are saved only on this phone. They are never uploaded, so they
will not come back if you reinstall Volyume or move to a new phone. Save any
you want to keep."
And amend `SettingsFaqScreen.js:72` so the "follows you across devices" claim
names its exception ("...your progress photos are the one thing that stays on
this phone").
(b) (a) plus a bulk "Save all photos to your gallery" action in the photo
screen, reusing the existing `MediaLibrary` path already present in
`BeforeAfterShareSheet.js:441`. This turns the warning into something the user
can act on, which is the difference between honest and useful.
(c) (a) plus surfacing the warning once, contextually, at the moment it
matters — the first time a photo is saved.
Option (b) is the one that actually removes the surprise; (a) alone only
relabels it. Either way this is copy plus an existing capability, not new
storage, and touches nothing in the sync layer.

## T-17 (LATENT, LOW) — a JSON restore brings back scan rows whose images are gone

`BACKUP_TABLES` (`database.js:5347+`, tail) deliberately includes
`progress_photo_meta`, `progress_scan_sessions` and `progress_scan_assets`,
with the comment: "The backup carries the SQLite metadata and scan rows so a
restore does not drop the user's own history; image files themselves remain
private app documents, not JSON rows."

The photo **timeline** is file-driven (`progressPhotos.js:323`
`readDirectoryAsync`), so orphan `progress_photo_meta` rows are harmless — they
simply never join to anything. The scan **library** is not: it reads
`listProgressScanEntries` straight from SQLite
(`ProgressPhotosScreen.js:281,712,861`), so after a restore-without-files the
scan history renders entries whose `progress_scan_assets.uri` points at files
that no longer exist.

Not verified on device (the render path needs the real filesystem), so the
visible symptom — blank tiles, broken images, or a caught error — is
**UNCERTAIN**; the data condition is not.

**Direction sketch.** Either filter the scan list on asset existence at read
time, or accept the rows and give the entry an explicit "image no longer on
this device" state rather than a broken thumbnail. The second is more honest
and keeps the numeric scan history the restore deliberately preserved.

---

# PHASE 43 — PARTNER LONG-TERM EXPERIENCE

Existing accountability only; no new social scope proposed.

## T-18 (DEFECT, MED) — a partner who left months ago is still reported as this week

**Trace.** The accessor's no-`weekStart` branch returns the newest row of any
age:

```
database.js  getPartnerWeekSignal(pairId, userId, weekStart)
   ... : await d.getFirstAsync(
       `SELECT * FROM partner_week_signals WHERE pair_id = ? AND user_id = ? ORDER BY week_start DESC LIMIT 1`,
       [pairId, userId]);
```

`enrichPair` calls it **without** a week, for the partner:

```
usePartners.js:196-197 (and :203-204)
   const thisWeek = String(localWeekStartMs(Date.now()));
   ...
   optionalPartnerRead(() => getPartnerWeekSignal(partnership.id, partnerId), null),
```

and hands the result straight to the row state and the card:

```
usePartners.js:244-247   rowState: partnerRowState({ partnership, partnerWeek }), partnerWeek,
PartnerScreen.js:93-98
   function weekPhrase(name, week, resting) {
     if (resting) return `${name}: resting this week`;
     ...
     return `${name}: ${ticksLabel({ done: week?.done, planned: week?.planned })}${hasPlan ? ' this week' : ''}`;
PartnerScreen.js:511   <PersonRow phrase={weekPhrase(name, pair.partnerWeek, partnerResting)} ... />
```

`thisWeek` is computed three lines above and used for the *intentions* lookup
and the shared-streak filter (`usePartners.js:225` correctly excludes the live
week), but it is **not** applied to the week signal itself. There is no
freshness gate anywhere in `partners/*`, `usePartners.js` or `PartnerScreen.js`
(repo-wide grep for staleness handling returns only `inviteCache.js:29`, which
is about invite codes).

**User consequence.** A partner who uninstalls, churns to Free, or simply stops
opening the app keeps their last-ever week signal on the card **forever**, with
the words "this week" attached. If their last week was a good one the user sees
"Alice: 4 of 4 this week" indefinitely and cheers a ghost; if it was a rest week
they see "Alice: resting this week" indefinitely, which is indistinguishable
from the lapsed-Pro `resting` state the tier gate deliberately produces
(`partners/tierGate.js`, `sync/tables/partners.js:40-52`). In a feature whose
entire value is a truthful weekly signal from another human, the app is stating
something it does not know. This compounds with T-12: on a partnership old
enough to hit the cheer cap, the freshest partner data is also the least likely
to arrive.

**Direction sketch (options, not applied). No new social scope.**
(a) Pass `thisWeek` to the partner's signal read, exactly as the intentions
reads already do (`usePartners.js:211-212`), and give `partnerRowState` a
fourth state for "no signal this week". The honest line is a quiet one, e.g.
"We have not heard from Alice this week." — never a fail, never attribution,
matching the existing voice at `partners/signals.js:22-30`.
(b) Keep the newest-row read but stamp its age and let the card decide: fresh
(this week) renders ticks, one week old renders the quiet line, older renders
the empty state. Slightly more code, but it lets the card distinguish "quiet
this week" from "gone for months", which (a) cannot.
(c) Add an explicit dormancy state to the pair row after N quiet weeks,
mirroring `sharedStreak.js:19` which already archives a run "after 4
consecutive quiet weeks" because "a stale number is..." — the same principle,
applied one level up.
Options (a) and (c) compose well. Note the privacy property that must survive
any of them (`streak.js:72-75`): a partner can never tell a wellbeing hold from
a planned recovery week, so a new "we have not heard from them" state must be
derived from **signal absence**, never from anything that could distinguish
those two.

## T-19 (IMPROVEMENT, MED-LOW) — partner beats only ever serve one pair

```
scheduler.js:1525-1529
   const partnerships = await db.getPartnershipsLocal(userId).catch(() => []);
   const pair = (partnerships || []).find((p) => p.status === 'active');
   if (!pair) return;
```

`.find` takes the first active partnership. Pro allows three
(`partners/signals.js:74-76`, `maxPartnersForTier`), and the whole beats
block — cheer received, shared-streak kept, partner joined — runs for that one
pair only. The shared push identifier `NOTIF_ID_PARTNER_CHEER`
(`scheduler.js:1487`) and the single watermark record
(`PARTNER_BEATS_KEY(userId)`) reinforce the single-pair assumption.

**User consequence.** A Pro user with two or three partners is notified about
one of them and silently never about the others. Cheers still arrive in-app on
the next pull, so nothing is lost — the reciprocity loop the feature depends on
is simply absent for pairs two and three.

**Direction sketch.** Loop the active pairs, key the identifier and the
watermark record per pair (`${NOTIF_ID_PARTNER_CHEER}_${pair.id}`), and let the
existing event push budget arbitrate — it already evicts by priority and is
designed for exactly this contention (`budget.js:200-218`). The ED gate,
preference toggle and quiet-hours shift stay where they are, once per beat, so
no safety property moves.

## T-20 (LATENT, LOW) — the shared streak cannot be turned off after pairing

`streakEnabled` is chosen once, by the **inviter**, at invite creation:

```
partners/service.js:189-193
   export async function createPartnerInvite(userId, { streakEnabled = true } = {}) {
     ... c.rpc('create_partner_invite', { _streak_enabled: streakEnabled });
```

There is no update path anywhere in the repo — no RPC, no `partnerships`
update, no UI. A user who finds the shared run more pressure than motivation a
year in can only end the partnership. The cheers push toggle, by contrast, is
properly surfaced (T-30). Recorded as an asymmetry, not proposed as new scope;
whether a per-pair streak toggle is worth building is a product question, not a
lead ruling.

## T-21 (LATENT, LOW) — `week_start` is ordered lexicographically

`partner_week_signals.week_start` is `TEXT` (`migrate_081:124-135`) holding an
epoch-ms string, and `getPartnerWeekSignal`'s fallback orders it
`ORDER BY week_start DESC`. Epoch-ms values are 13 digits until the year 2286,
so lexicographic and numeric order coincide today. Recorded because the
codebase has already been bitten once by an epoch-string key format
(`streakState.js:74-82`, the R-10 `Number()`-then-`Date.parse` fallback), and
because T-18's fix touches this exact query.

## What was tested and is CLEAN (T-29, T-30)

- **Long-running partnership.** Signals, intentions, win cards and shared
  blocks all mirror both members for active pairs
  (`sync/tables/partners.js:151-233`); the shared streak correctly excludes the
  live in-progress week (`usePartners.js:222-225`) and archives after four
  quiet weeks (`sharedStreak.js:19`).
- **Remove partner.** `unpairPartner` calls the server RPC, which purges
  signals, cheers, intentions, win cards and shared blocks for the pair
  (`migrate_092:52-53`, `migrate_105:169-170`, `migrate_107:124-125`), and the
  hook clears the local mirror immediately rather than waiting for the pull
  (`usePartners.js:661-677`). The other side learns of it on its next pull and
  clears its own mirror (`sync/tables/partners.js:133-135`).
- **Invite replacement.** `activeCount` counts only `status === 'active'`
  (`usePartners.js:366`, `:535`), so an `ended` tombstone does not consume a
  free user's single slot. A replacement can be invited immediately.
- **Tier change and lapse.** `isLapsedPartner` resolves only an explicit
  `'free'` as lapsed and deliberately treats an unresolved tier as *not*
  lapsed, so a paying Pro is never muted by a transient read
  (`partners/tierGate.js:13-18,35-38`); both push paths force `resting` and
  clamp the milestone booleans for a lapsed user
  (`sync/tables/partners.js:40-52`).
- **Cheers toggle.** `partnerCheerEnabled` is read at send time
  (`scheduler.js:1516-1522`) and is a real, reachable switch
  (`CoachingRemindersScreen.js:224,252-253,390,574`).
- **Consent.** Partner-sharing consent is recorded on the accept act and
  **fails closed** — a failed consent write rolls the just-redeemed partnership
  back (`partners/service.js:243-248`).

---

## Cross-references and non-conflicts

- **R-13** (D97-22) — measured verdict at T-9; severity recommendation
  MED-LOW → LOW, with the real cost relocated to T-8.
- **R-20** (D97-22) — re-confirmed, not re-litigated (T-26).
- **R-10** (D97-22) — T-1 shows the same failure class reopened by DST rather
  than by scrolling; the R-10 fix itself is intact and is what limits the
  damage to "dropped" instead of "corrupted".
- **R-12** (D97-22) — the `weeksSinceLighter` accumulation-boundary rule was
  replayed verbatim in the phase-40 probe and behaves as pinned.
- **S-21** (D97-23) — watermarks confirmed clean as *device state*; T-13 is a
  separate defect about *advancing* one over an incomplete page, not about the
  watermark design.
- **S-23** (D97-23) — photos and scans confirmed never to sync; T-16 is about
  the copy around that fact, and proposes no sync.
- **Pinned tests.** `dayKey.lsO6.dst`, `mesocycle.f10.dst` and all of
  `src/hooks/__tests__` pass (13 suites, 88 tests). No finding here
  contradicts a pinned assertion; `useWeeklyStreak.guard.test.js` pins the
  ED-safety fail-closed reads only, which T-1's directions leave untouched.

## Suggested order of work (for the lead, not a ruling)

1. **T-8(a)** — memoise the `rowToCamel` key map. One change, ~4.8x on ten
   surfaces, byte-identical output.
2. **T-1** — the streak week keys. The clearest user harm in this audit, and it
   silently breaks a promise the product makes in writing.
3. **T-18** — the stale partner signal. The app is stating something it does
   not know, on a social surface.
4. **T-12** — `partner_cheers` ordering and bound. Cheap, and the cap is
   already reachable for the app's earliest partnerships.
5. **T-13** — the four watermark-over-unpaginated pulls. Four one-line changes
   closing a rule the campaign has already fixed twice.
6. **T-2, T-3** — the remaining clock drifts, ideally behind one shared
   `dayKey` helper so this class stops recurring.
7. **T-16** — the photo permanence copy (and, if the lead rules for it, the
   bulk gallery save).
