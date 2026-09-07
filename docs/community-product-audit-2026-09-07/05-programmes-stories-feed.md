# 05 — Programmes, training stories, feed, interactions, media, external sharing

READ-ONLY inventory for the Community product audit
(`docs/community-product-audit-2026-09-07/README.md`, founder prompt 2).
Evidence-first, `file:line` for every claim. Tree at 2026-09-07 on
`main` (Community client lanes merged; see §0 for the single fact that
governs every other finding).

---

## 0. THE GOVERNING FACT: client is complete, cloud is not applied

**No Community RPC exists in production.** `supabase/README.md:565-567`
status column for all three Community migrations:

- `160 | migrate_160_community.sql | ... | **WRITTEN, NOT APPLIED - awaiting the founder's exact phrase.**`
- `161 | migrate_161_community_connections.sql | ... | **WRITTEN, NOT APPLIED - awaiting the founder's exact phrase.**`
- `162 | migrate_162_gym_directory.sql | ... | **WRITTEN, NOT APPLIED - awaiting the founder's exact phrase.**`

`docs/TASKBOARD.md:2437-2440`: "(1) Say 'run against production' for
migration 160 ... and the deploy of `community-notify` and
`community-public`; Claude runs them and re-verifies read-only. Until
then every Community read fails as 'unavailable' and the screens show
their calm error state with Try again (the Volyume library tiles still
render)." The two edge functions
(`supabase/functions/community-notify/index.ts`,
`supabase/functions/community-public/index.ts`) are written but their
own header records deployment as a manual, not-yet-confirmed step
(`community-public/index.ts:33-34`: "Founder deployment: `supabase
functions deploy community-public --no-verify-jwt`").

`docs/TASKBOARD.md:135,110,48`: three client lanes are recorded
"LANDED ... merged to main" while each carries "CLOUD 1NN WRITTEN NOT
APPLIED" in the same header line. So: every screen, hook, client
library function and edge-function *file* described below exists and is
merged on `main`; **none of it can complete a network round trip in
production** because `community_profiles` and the other thirteen/three
tables do not exist in EU-Dublin. This is the single fact that
qualifies almost every classification in §8 — the mechanism is built
correctly, the deployment gate has not been passed. It is a founder
gate, not a defect (`CLAUDE.md` §2 "Database schema": cloud migrations
are founder-run only).

---

## 1. Programme lifecycle

### 1.1 Create — from an existing plan, no bespoke create flow
There is no separate "create a programme for Community" form. Any plan
the user already owns (library-copied, generated, or hand-built) can be
published as-is via **PlanDetailScreen → "Share programme"**
(`src/screens/PlanDetailScreen.js:563-567`):
```js
title="Share programme"
onPress={() => navigateCrossTab(navigation, 'HomeTab', 'CommunityPublishProgramme', { planId })}
```
This opens `CommunityPublishProgrammeScreen` with that `planId`
(`src/screens/CommunityPublishProgrammeScreen.js:99`).

### 1.2 Publish — snapshot content, versioning, who can publish
**Snapshot builder** `buildProgrammeSnapshot({programme, routines,
exercisesByRoutine})` — `src/lib/community/snapshot.js:68-112`, PURE.
Fields captured: `v` (=1), `title` (≤60), `description` (≤500),
`style_key` (from `styleKeyFromTags(programme.tags)`), `split_type`,
`difficulty`, `days_per_week`, and per day: `name`, `position`, and per
exercise: `exercise_id`, `exercise_name`, `order`, `sets`, `reps_min`,
`reps_max`, `rest_seconds`, `notes` (≤200), `superset_group_id`,
`group_kind`, `round_rest_seconds`. **Explicitly never read**:
`starting_weight`, `selection_reason` (module header comment,
`snapshot.js:12-21`; both are on `SENSITIVE_COMMUNITY_KEYS`,
`validation.js:80` — the two names appear verbatim at
`validation.js:80`). Any forbidden key anywhere in the object fails
`validateSnapshot` (`snapshot.js:149`, `hasForbiddenKeys` from
`validation.js:184-196`) and is independently re-checked server-side by
`_community_forbidden_keys` (`migrate_160_community.sql:939` per
blueprint §3).

Caps enforced (`src/lib/community/limits.js:79-81`):
`SNAPSHOT_MAX_BYTES=65536`, `SNAPSHOT_MAX_DAYS=8`,
`SNAPSHOT_MAX_EXERCISES_PER_DAY=20`. Missing/oversized plans are
refused with a specific line, not a generic error
(`CommunityPublishProgrammeScreen.js:68-80`, `publishBlockedLine`).

**Write path**: `publishProgramme(payload)` →
`callCommunity('community_publish_programme', {_p: payload})`
(`src/lib/community/feed.js:214-216`). Server function
`community_publish_programme` — `migrate_160_community.sql:2107`:
validates via `_community_validate_snapshot` (:2038), then **upserts on
`(owner_id, source_plan_id)` bumping `version`**
(`migrate_160_community.sql:151-157` table def UNIQUE constraint per
blueprint §3, and the publish RPC comment "upsert on (owner,
source_plan_id) bumping version" — blueprint §3 line 235-236). Rate:
10/day (`PROGRAMMES_PER_DAY=10`, `limits.js:69`;
`_community_rate_check(uid,'programme',...)` server-side).

**Who can publish**: anyone with a Community profile
(`_community_require_profile(v_uid, true)` inside the RPC), gated only
by the profile-creation step (`CommunityJoinScreen`), not by any tier —
Volyume is fully free (`CLAUDE.md` §1 `FULL_ACCESS_FOR_ALL`).

**Title/description**: pre-filled from the plan's own `name`/
`description`, user-editable before publish
(`CommunityPublishProgrammeScreen.js:103-116`, `title`/`description`
state seeded from the snapshot, `TextField`/`ComposerInput` bound to
them — not shown in the excerpt above but present per screen state
wiring at :103-104 and later render, confirmed by `handlePublish` at
:170-180 sending the edited `title.trim()`/`description.trim()`).

**Notes disclosure**: exercise notes travel with the snapshot and are
shown in the preview with an explicit caption
(`CommunityPublishProgrammeScreen.js:1-16` header comment; constants
`NOTES_TRAVEL_LINE`/`DISCLOSURE_LINE` at :44,47 — "Structure only: days,
exercises, sets, reps, rest and your exercise notes. Never your
weights.").

### 1.3 Discover — where programmes surface
- **Discover tab** inside the Community hub, section "Programmes"
  (community tiles + "By Volyume" library tiles) —
  `docs/social-discovery-2026-09-06/30-BLUEPRINT.md:478-479`; client
  `loadHub('discover')` calls `discoverProgrammes` +
  `loadDiscoverPosts` in parallel (`src/lib/community/feed.js:94-130`).
- **Search**: `CommunitySearchScreen`, segment "Programmes" →
  `searchProgrammes(q, {style})` (`feed.js:158-163`) → server
  `community_search_programmes` (`migrate_160_community.sql:2397`,
  "title prefix match first, then updated_at desc" per blueprint §3
  line 242-244).
- **Dimension pages**: `community_dimension(kind,key,...)` returns
  `{people, programmes}` for a style/gym/area/programme dimension
  (`feed.js:186-196`; blueprint §3 line 272-273); surfaced on the hub
  only at ≥3 other members (`COMMUNITY_DIMENSION_MIN_FOR_HUB=3`,
  `limits.js:41-48`) but the dimension page itself exists below that
  threshold (SD-10, `40-DECISIONS.md:110-116`).
- **Profile**: `CommunityProfileScreen`, segment "Programmes" lists the
  owner's published programmes (blueprint §6 "Segments Posts |
  Programmes", `30-BLUEPRINT.md:504`).
- **Plan library**: one row "Programmes from other lifters" under the
  search/collection chips, routing to Discover focused on programmes
  (`src/screens/PlanLibraryScreen.js:730-734`).
- **Gym page**: NOT a distinct surface — gyms resolve to a `gym` kind
  dimension page (SD-27, `40-DECISIONS.md:283-288`), same
  `community_dimension` mechanism, no separate "gym page" screen file
  found (`find src/screens -iname '*Gym*'` → only
  `CommunityGymAddScreen.js`, an input screen, not a gym listing page).

### 1.4 Preview — what a reader sees before acting
`CommunityProgrammeScreen` (`src/screens/CommunityProgrammeScreen.js`)
renders, above the action row: creator `ProfileCard`, style/days/
exercise-count/circuits chips, description, "People on this programme ·
N" (only when `use_count>0`, :281-297), and the full
`ProgrammeStructure` component — day sections, circuit groups rendered
as "Circuit · N rounds · Ns between rounds" with stations listed,
straight sets as "N x min-max · Ns" (`30-BLUEPRINT.md:456-460`). No
volume/tonnage total is shown (the snapshot carries no load, so none
could be computed); equipment is not itemised on this screen either —
only via the exercise names/notes, consistent with equipment being a
per-exercise, per-user fact, not a plan column (recon
`05-recon-programme-model.md:115-120`).

**Is the preview honest about what Adapt will change?** Yes, by design
and by an explicit product-review fix: `ADAPT_EXPLAINS_LINE` —
`CommunityProgrammeScreen.js:59-60`: "Adapt keeps the creator's
structure and swaps only what your kit, exclusions or limitations rule
out. Every change is shown before anything is saved." This one caption
sits under the action row per the final product pass
(`40-DECISIONS.md:221-224`, SD-07a). It does not enumerate which
exercises WILL change (that requires running the adaptation, §1.6), so
the preview screen is honest about the MECHANISM but not a prediction
of the specific diff — the diff itself is the next screen
(`CommunityAdaptScreen`).

### 1.5 Save — exists as "Use as-is"
`importSnapshotAsPlan(userId, snapshot, {communityId, mode:'use'})` —
`src/lib/community/importProgramme.js:95-179`. Writes through the SAME
functions the library-copy path uses
(`createProgramme`/`createRoutine`/`addExerciseToRoutine`,
`importProgramme.js:24-27`), with two deliberate differences from
`copyPlanFromLibrary`: `startingWeight` is **always** passed `null`
(:149, comment :12-16) and `selectionReason` is always `null` (:153,
comment :17-19). The plan is created inactive; nothing is activated
(header comment :20-22). Confirmation copy on the trigger screen:
`"Copy this programme?" / "It goes to your plans as a new programme.
Nothing is activated and your current plan is untouched."`
(`30-BLUEPRINT.md:513-516`). A reader who already took a copy is told
so before acting again (`CommunityProgrammeScreen.js` header comment
:14-19, product review item 34).

### 1.6 Adapt for me — exact mechanism
Module `src/lib/community/adapt.js`. **Composes only existing pure
engine functions, no new engine code** (header comment :1-39):
1. `blockingConflicts(capState, exercise)` filtered to `!c.unknown`
   (`adapt.js:147`) — imported from `../capability/resolve`
   (`adapt.js:44`).
2. `equipmentReachable(exercise, equipment)` (`adapt.js:148`) — THE
   shared equipment predicate, imported from `../planAutoGen`
   (`adapt.js:42`).
3. `isEligibleRow(exercise)` = `substituteSeniorQuestion(capState,
   intentState)` (`adapt.js:214`, imported from `../sessionEffective`,
   :47) — preference eligibility AND capability, one function.
4. `bestEligibleSubstitute(exercise, library, isEligibleRow, taken,
   isCandidate)` (`adapt.js:156`, imported from `../capability/effective`,
   :43) where `isCandidate` = `substituteCandidateFilter` equivalent via
   `loadSubstituteScope(userId, {planTags: snapshotTags(snapshot),
   equipment})` (`adapt.js:208`) — **creator's style pool** (from the
   SNAPSHOT's tags, not the recipient's plan) **× recipient's kit**
   (`adapt.js` header comment :184-188).

**Inputs from the user profile**: `userProfile.equipment` and
`userProfile.daysPerWeek` read from the Zustand store via a lazy
`require` (`adapt.js:194-202`); capability state via
`loadCapabilityResolveState(userId,{})` (:205); intent/exclusions via
`loadScopedIntentState(userId)` (:206); the full local exercise library
via `getAllExercises()` (:207).

**Determinism guarantee**: every function is PURE (no I/O, no
`Date.now()`, no randomness) except the context loader
(`loadAdaptationContext`, explicitly I/O, :194); `planAdaptation` itself
is PURE (doc comment :65, "every answer is injected"). Same snapshot +
same recipient state ⇒ same output, always.

**What is NOT adapted** (never touched, per SD-08 and the code):
`superset_group_id`, `group_kind`, `round_rest_seconds`, day order, and
day count (`adapt.js` header :19-24). A day-count mismatch between the
snapshot and the recipient's own `daysPerWeek` is computed and returned
as `daysMismatch: {snapshot, yours}` (`adapt.js:170-174`) but never
acted on — no re-mapping exists in the engine (recon
`05-recon-programme-model.md:308-312`, confirmed zero grep hits for
`remapDays|redistributeDays|refitPlan|adaptPlan`).

**Explained to the user, in what words**: `CommunityAdaptScreen`
(per blueprint §6, `30-BLUEPRINT.md:517-524`) shows a summary line "N
exercises kept, N swapped, N kept with a note", the days-mismatch notice
("This programme is 4 days a week. Your setup says 3. Volyume keeps the
creator's structure; you can drop a day in the plan editor."), and a
change list with reason strings mapped from `ADAPT_REASON`
(`adapt.js:57-62`): `'limitation'` → "Clashes with a limitation",
`'equipment'` → "Not in your equipment", `'excluded'` → "Excluded by
you", `'unknown_exercise'` → implicitly "kept, not in your library"
(exact reason-to-copy mapping lives in the screen, not re-quoted here —
not opened in full; see Ambiguities).

**CC33 CLASS 1 safety gate**: if the recipient's capability state could
not be read (`capabilityKnown(capState)` false), `planAdaptation`
proposes **nothing** and returns `capabilityChecked:false`
(`adapt.js:94-110`) rather than treating an unreadable state as "no
restrictions" — comment :30-38 explains this explicitly as an
ED/safety-adjacent correctness rule, not a UX nicety. `applyAdaptation`
re-checks the same flag at the write (`adapt.js:249-252`).

**Save**: `applyAdaptation(userId, snapshot, changes, {communityId})`
(`adapt.js:246-282`) imports the snapshot as-is first, then for each
change with a substitute calls `updateRoutineExerciseExercise(rowId,
to.id)` — the SAME function every ordinary swap in the app uses, which
re-derives reps/rest for the new movement's tier and clears
`starting_weight` (comment :230-234, confirmed against recon
`05-recon-programme-model.md:296-299`) — then records provenance via
`recordExerciseSwap(..., scope: SWAP_SCOPE.PROGRAMME)` (:267-271). Best
effort per row (:236-238): one failed swap never abandons the rest.
**The original programme is never touched** (asserted in the doc
comment and structurally true: `applyAdaptation` never writes to
`community_programmes`).

### 1.7 Use as-is / Run
"Use as-is" → import → toast "Added to your plans" → navigate to
`PlanDetail` (`30-BLUEPRINT.md:513-516`). Running it is identical to
running any other locally-owned plan — no Community-specific run
mechanism; Community involvement ends at the copy.

### 1.8 Share — link and card
- **Link**: `programmeUrl(id)` = `https://volyume.app/p/?id=<id>`
  (`src/lib/community/links.js:33-35`), surfaced as a "Share link"
  tertiary action on `CommunityProgrammeScreen` and on the publish
  screen (`30-BLUEPRINT.md:511-512,529`); native `Share.share` (import
  present, `CommunityPublishProgrammeScreen.js:20`).
- **Card**: no dedicated visual "programme share card" — the
  external-facing artefact for a programme is the static web page
  (`public/p/index.html`, §6 below), not a `ShareCard` image. `ShareCard`
  image generation (`drawShareCard.js`) is used for training-session/
  block/PR/milestone cards, not programmes (`buildProgrammePayload`
  produces a Community POST payload — id/title/style/days/exercise
  count — not an image, `posts.js:288-296`).

### 1.9 Follow author
`FollowButton` on `ProfileCard` (`30-BLUEPRINT.md:449-450`); states
Follow / Requested / Following / Follow back. `community_follow(target)`
/ `community_respond_follow` etc. (`migrate_160_community.sql:1741-1857`
per grep above). Reachable directly from the programme screen's creator
card (`CommunityProgrammeScreen.js:260-265`, `onFollowChange`).

### 1.10 See other users on this programme
**Exists.** `CommunityProgrammeScreen.js:281-297`: a pressable row
"People on this programme · N" (shown only when `use_count>0`) routes
to `CommunityPeopleListScreen` with `{mode:'programme', programmeId}`
(:283-287). Server: `community_programme_people(...)` —
`migrate_161_community_connections.sql:2105`. **Privacy**: gated by the
per-profile `show_programmes` toggle (default **on** for public
profiles, SD-26 `40-DECISIONS.md:280-282`); toggled via
`community_set_show_programmes` — `src/lib/community/connections.js:203`
→ `migrate_161_community_connections.sql:1785`; a person who turns it
off "is removed from every 'People on this programme'" list
(`connections.js:200-203` comment). The list itself is of profile cards,
not raw counts-only — it is a real list, not just a number, per SD-26's
"identities on a programme only behind the toggle" framing
(`40-DECISIONS.md:320-323`).

### 1.11 Stories linked to a programme
**Exists**, one direction: a *programme* post kind exists
(`POST_PAYLOAD_KEYS.programme`, `validation.js:105`) built by
`buildProgrammePayload(programmeRow)` (`posts.js:288-296`) and a
published programme also carries a `programme_id` FK on
`community_posts` for OTHER post kinds to reference the plan that
produced them (`community_posts.programme_id`,
`30-BLUEPRINT.md:162`). There is no reverse "stories about this
programme" feed/tab on `CommunityProgrammeScreen` distinct from the
comments section — a story that references a programme surfaces only in
the ordinary Following/Discover feed, not pinned under the programme.
(Not fully confirmed — see Ambiguities.)

### 1.12 Discuss — comments
**Exists**, on both posts and programmes. `target_kind IN
('post','programme')` (`migrate_160_community.sql`
`community_comments` table def per blueprint §3 line 167-169).
`CommunityProgrammeScreen.js:299-304` renders a "Comments" section with
composer directly on the programme screen (`addComment('programme',
programme.id, body)` — imported at :53). Body ≤500
(`COMMENT_MAX`, `validation.js:54`); rate 10/hour new, 30/hour
established (`limits.js:63-64`); target must be viewable
(`community_comment` RPC, `migrate_160_community.sql:2785`); writes an
activity row to the target owner unless self.

### 1.13 Update/version — author edits
Re-publishing the SAME `planId` (`source_plan_id`) upserts the existing
`community_programmes` row and bumps `version`
(`migrate_160_community.sql` publish RPC, §3 of blueprint). The screen's
own state machine treats a plan already published as "Update" not a
second "Publish" (`CommunityPublishProgrammeScreen.js:117-132`, "Cold-
open truth" comment). **Runners are NOT told.** No notification kind
for "a programme you copied changed" exists in
`COMMUNITY_NOTIFY_KINDS` (`src/lib/community/notify.js:23-30`: `follow,
follow_request, follow_accepted, reaction, comment, programme_used,
connect_request, connect_accepted, message` — no `programme_updated`).
A recipient's copy is a point-in-time snapshot import; it never re-syncs
against the source. This is explicit in the unpublish copy quoted next
and is a structural fact of `community_programme_uses` recording
`use_count`/`mode` once, not a live link.

### 1.14 Remove/unpublish/report
`unpublishProgramme(id)` → `community_unpublish_programme`
(`migrate_160_community.sql:2213`). Confirmation copy
(`CommunityPublishProgrammeScreen.js:196-198`): **"Stop sharing this
programme?" / "It disappears from Community. Anyone who already copied
it keeps their own copy, and your plan is untouched."** — i.e. people
already running it are unaffected; the programme simply stops appearing
in Discover/search/profile from that point. Report: `ReportSheet`
targets `programme` (`REPORT_TARGET_KINDS` includes `'programme'`,
`moderation.js:29`); 3 distinct open reports auto-hide
(`AUTO_HIDE_REPORTS=3`, `limits.js:76`), a moderator can
`hide_content`/`unhide_content`/`delete_content`
(`MODERATION_ACTIONS`, `moderation.js:20-23`).

### 1.15 Counts / rate limits
- Publish: 10/day (`PROGRAMMES_PER_DAY`, `limits.js:69`).
- Posts: 3/day new account, 10/day established
  (`POSTS_PER_DAY_NEW/ESTABLISHED`, `limits.js:57-58`).
- Comments: 10/hour new, 30/hour established (`limits.js:63-64`).
- Follows: 30/day new, 100/day established, 2,000 following cap
  (`limits.js:53-55`).
- Reports: 20/day (`limits.js:66`).
- Profile upserts: 5/day (`limits.js:70`).
- No cap found on the NUMBER of distinct programmes one user may have
  published simultaneously (only the 10/day rate on the publish action
  itself; a user could accumulate many plans and publish 10/day over
  successive days with no total ceiling in any file read). Not
  contradicted by any evidence found — recorded as a gap in
  Ambiguities.
- "New account" = first 7 days (`NEW_ACCOUNT_DAYS=7`, `limits.js:38`),
  fail-closed to "new" on an unreadable `createdAt`
  (`isNewAccount`, `limits.js:83-89`).

---

## 2. Training stories

### 2.1 How generated — trigger events and kinds
**Nothing is auto-posted anywhere** (`posts.js` header comment :17-18,
independently asserted as SD-06,
`docs/social-discovery-2026-09-06/40-DECISIONS.md:70-77`: "No session is
ever auto-posted"). Every story is user-initiated from an existing
share surface into `CommunityComposeScreen`:

| Kind | Trigger UI | file:line |
|---|---|---|
| `pr` | ShareCardScreen (PR share) | `src/screens/ShareCardScreen.js:153` builds `{kind:'pr', pr:...}`; posted via :843 `navigateCrossTab(...,'CommunityCompose', communityComposeParams)` |
| `session` | WorkoutSummaryScreen, "Post to Community" button | `src/screens/WorkoutSummaryScreen.js:1267-1272` |
| `block` | HomeScreen, "Share this block" (shown when a mesocycle week is complete) | `src/screens/HomeScreen.js:2436-2448` |
| `milestone` | ShareCardScreen (great-week / recap card) | `src/screens/ShareCardScreen.js:155` builds `{kind:'milestone', milestone:...}` |
| `programme` | implicitly reachable via `buildProgrammePayload`, though the primary programme-sharing path is Publish (§1), not Compose | `src/lib/community/posts.js:280-296` |

No weekly/scheduled auto-trigger exists. `WeeklyStoryScreen.js`
(`src/screens/WeeklyStoryScreen.js`) is a **separate, unrelated,
Pro-gated feature** — a private "Your week" recap screen (training +
eating + weigh-in + coach decision narrative) with no import of, or
reference to, `src/lib/community` anywhere in the file (confirmed by
`grep` returning zero `community` hits in that file) and no "Post to
Community" action found in it. It must not be confused with Community
training stories.

### 2.2 Source rows / facts included per kind
Built by pure-shaping + local-read functions in
`src/lib/community/posts.js`, each restricted to
`POST_PAYLOAD_KEYS[kind]` (`validation.js:98-107`):
- **pr**: `exerciseName, weight, reps, units, previousBest, date`
  (`buildPrPayload`, `posts.js:70-79`).
- **session**: `sessionName, workingSets, duration, tonnage,
  exerciseCount, exercises (≤8 names), prCount, topSet, intensityTier,
  units, planName, date` (`buildSessionPayload`, `posts.js:96-155`),
  read from `getWorkoutById`/`getWorkoutSetsForWorkout` and reusing
  `summariseWorkoutSets`/`sessionShareData` helpers — "the SAME functions
  the share card uses, so a story and a share card ... can never
  disagree" (header comment :14-16).
- **block**: `planName, weeks, sessions, sessionsPerWeek, completedAt,
  lifts` (≤3, each `{exerciseName, deltaKg, units}`, only a genuine gain
  over a prior best — `bestLiftsForBlock`, `posts.js:242-266`).
- **milestone**: `eyebrow, title, heroValue, heroUnit, caption, stats`
  (≤3) shaped from an existing recap object (`buildMilestonePayload`,
  `posts.js:269-282`).
- **programme**: `id, title, style_key, days_per_week, exercise_count`
  (`buildProgrammePayload`, `posts.js:288-296`).

### 2.3 What the user approves/edits before publish; free text
`CommunityComposeScreen` shows a live `PostCard` **preview** of the
exact payload (`src/screens/CommunityComposeScreen.js:133-155`), a
**caption field** (free text, ≤280 chars,
`CAPTION_MAX`/`ComposerInput`, :157-169) run through
`_community_clean_text`/keyword filter server-side, and a
**visibility choice** (Public / Followers, :172-184). **The generated
facts themselves are NOT editable** — there is no field to change the
weight, reps, tonnage, etc. shown in the preview; the only user-authored
content is the caption. This matches SD-06's "computed, not typed"
framing (`40-DECISIONS.md:229-232`).

### 2.4 Privacy — banned fields, enforcement
Banned fields list `SENSITIVE_COMMUNITY_KEYS` — `validation.js:80-84`:
`weight_kg, bodyweight, body_weight, bodyWeight, body_fat, bf_pct, ffm,
fm_kg, height, height_cm, age, date_of_birth, dateOfBirth, dob, kcal,
calories, protein, carbs, fat_g, fibre, first_name, firstName,
last_name, email, phone, scan, progress_scan, volyume_score,
capability, constraint, limitation, injury, ed_pattern, scoff,
starting_weight, startingWeight, selection_reason, selectionReason,
user_id, userId`. Enforced twice: client `hasForbiddenKeys`
(recursive, depth-bounded at 12, fails closed beyond that —
`validation.js:184-196`) and server `_community_forbidden_keys`
(`migrate_160_community.sql:939`), pinned to match by
`community.privacy.guard.test.js` per blueprint §10
(`30-BLUEPRINT.md:620-625`, not independently re-opened here but the
list and the guard's stated purpose are directly evidenced by
`validation.js:1-16` header comment). A PR post is the one place a
**weight number appears** — that is training performance the user chose
to share, not body data (`posts.js` header comment :19-21) — but it is
never bodyweight (there is no bodyweight field anywhere in
`POST_PAYLOAD_KEYS`).

### 2.5 ED-safety gating
- **Media exclusion under calm/ED flag**: designed in
  `71-MEDIA-MODEL.md:40-43` ("media stories are excluded from the
  Discover chronological stream under calm mode and while the viewer
  has an open wellbeing flag ... No engagement ranking anywhere") but
  **media does not exist in the shipped payloads at all** (§5) — no
  `media` key in `POST_PAYLOAD_KEYS`, so this specific gate has nothing
  to gate yet; it is a designed rule for a feature not built.
- **Push suppression**: `community-notify` "checks the recipient's open
  ED flag exactly as `partner-cheer` does (fail closed: any read error =
  in-app only)" (`30-BLUEPRINT.md:312-314`, edge-function source not
  independently re-opened here but the client-side notify wrapper
  documents the same contract: `src/lib/community/notify.js` header
  comment :1-16, "checks their open ED flag exactly as `partner-cheer`
  does").
- No calm-mode/ED-flag check found in the STORY GENERATION path itself
  (`posts.js` has no import of `wellbeing.js` or
  `getOpenEdPatternFlag`) — the payload builders read only training data
  (workouts/sets/mesocycles), which is out of ED-safety's scope by
  construction (no weight, no food, no coaching output ever enters a
  payload per §2.4), so an explicit gate on the builders themselves
  would be redundant given the allow-list design, not a hole in it.

### 2.6 Sharing scope and discovery beyond followers
Posts carry `visibility IN ('public','followers')`
(`POST_VISIBILITIES`, `validation.js:112`; table def
`30-BLUEPRINT.md:163`). Public posts surface in **Discover** for anyone
(`community_discover_posts`, `migrate_160_community.sql:2687`, §3.3
above); a public post is also reachable via a bare link
(`storyUrl(id)`, `links.js:39`) to a **non-user** through the static
`/s/?id=` page and the `community-public` edge function's `kind=post`
branch, which additionally requires the AUTHOR's profile to be public
(`supabase/functions/community-public/index.ts:160-193`). Followers-only
posts are never exposed through the public link path (the edge function
checks `row.visibility !== 'public'` and 404s otherwise, :161).

### 2.7 Interactions on a story
**Reactions**: single kind, "Respect" (`thumbs-up-outline` /
`thumbs-up` filled) — `30-BLUEPRINT.md:709-711` (lead visual ruling 3:
"No hearts"). `reactToPost(postId, on)` toggles
(`feed.js:249-251`) → `community_react`
(`migrate_160_community.sql:2740`).
**Comments**: `addComment('post', postId, body)` (`feed.js:253-256`),
≤500 chars, rate-limited as §1.15. **No reply/thread nesting** — no
`parent_id`/`reply_to` column on `community_comments` in the table
definition quoted in blueprint §3 (`30-BLUEPRINT.md:167-169`); comments
are a flat list.

### 2.8 Deletion
`deletePost(id)` → `community_delete_post`
(`migrate_160_community.sql:2572-2587`; author-only, `WHERE id=_id AND
author_id=v_uid`, raises `not_found` otherwise) — cascades to that
post's comments and activity rows in the same function
(:2578-2580). Confirmation copy: "Delete this story? It is removed for
everyone. Your training is untouched." (`CommunityPostScreen.js:201-
205`). Comment deletion: author or target owner
(`community_delete_comment`, per blueprint §3 line 257,
`CommunityPostScreen.js:183-198`).

---

## 3. Feed

### 3.1 Following — exact composition
`community_feed(_cursor, _limit)` — `migrate_160_community.sql:2627-
2681`. Rows: `community_posts` where `status='visible'` AND (`author_id
= caller` OR an ACCEPTED `community_follows` edge from caller to
author), AND NOT muted by caller, AND NOT blocked either direction
(`_community_is_blocked`), AND the author's profile `status <>
'suspended'` (SD-11a, `40-DECISIONS.md:179-180`). Order: `created_at
DESC, id DESC` (**chronological**, no ranking). Cursor is a
`(created_at, id)` tuple opaque string minted server-side
(`_community_cursor_of`); the client never builds one
(`feed.js:56-65` comment; `_community_cursor_parts` refuses a client-
built cursor, `migrate_160_community.sql:977`).

### 3.2 Discover — exact composition
`community_discover_posts` — `migrate_160_community.sql:2687-2739`.
Rows: `community_posts` JOIN `community_profiles` WHERE post
`status='visible'` AND post `visibility='public'` AND author
`status='active'` AND author `visibility='public'` AND author
`is_minor=false` AND not blocked/muted. Same chronological ordering and
cursor mechanism as Following. **No local/gym/programme lens on the
Discover POSTS list itself** — those facets appear as separate
sections (dimensions, programme tiles) on the same hub screen, not as
filters on the posts feed (`loadHub`, `feed.js:94-130`, assembles
`programmes`, `posts`, `people`, `dimensions` as four independently
paged/settled reads, not one filtered query).

### 3.3 Pagination, refresh, offline
`DEFAULT_PAGE_SIZE=20` (`feed.js:22`); `FlatList`/`FlashList` with
`onEndReached` paging and pull-to-refresh per house style
(`30-BLUEPRINT.md:444-446`). Offline: `loadHub` caches the last hub
payload per user (`@volyume_community_hub_<uid>`,
`hubCacheKey`/`writeCachedHub`/`readCachedHub`, `feed.js:23-49`); on any
read failure it falls back to the cache and returns `{fromCache:true,
error: e?.code}` (`feed.js:139-142`) so the UI can show "Showing what
you last saw. You are offline." (`30-BLUEPRINT.md:477-478`). **In the
current production state (§0), every live call fails**, so in practice
every user without a prior successful load sees the calm
`unavailable`/"Try again" error state, and every user with a stale
cache sees only that cache, permanently, until the migration is
applied.

### 3.4 Hide/mute effects
Muting removes the muted author's posts from Following AND Discover for
the muter (`NOT EXISTS ... community_mutes`, both feed functions above).
Muting is silent — the muted person is not told (per SD-11 design,
`40-DECISIONS.md:118-121`, "mute (silent)"; not independently re-derived
from a mute RPC body in this pass — see Ambiguities). Blocking is
two-way invisible and additionally strips existing follows (SD-11,
same line; mechanism: `_community_is_blocked` checked in both feed
functions and `community_block` in `migrate_160_community.sql:1928-
1957`, not fully re-opened here).

### 3.5 Spam prevention
Rate limits per §1.15; new-account tightening (§1.15); keyword filter on
every free-text field (`_community_clean_text` server-side,
`containsBlockedTerm`/`BLOCKED_TERMS` client-side —
`keywordFilter.js`, not independently re-opened but imported by
`validation.js:16` and referenced by name in the SD-11 register line
`40-DECISIONS.md:123`); handle policy (reserved words, ASCII lowercase,
`RESERVED_HANDLES`/`HANDLE_REGEX`, `validation.js:20-46`); report auto-
hide at 3 distinct reports (`AUTO_HIDE_REPORTS=3`).

### 3.6 Empty states at 0 follows
`CommunityHubScreen` Following empty state: `EmptyState` "Nothing here
yet" / "Follow a few people and their training stories will appear
here." with action "Find people" plus a "People you may want to follow"
strip when suggestions exist (`30-BLUEPRINT.md:474-476`). No-profile
state: hero card with "Create my profile" / "Browse first", with
Discover still rendered read-only below it (SD-04a, browse-before-
joining, `40-DECISIONS.md:204-206`).

### 3.7 Content types — automatic vs user-selected
All five post kinds (`pr, session, block, milestone, programme`) are
**user-selected** in the sense that the user always taps a specific
"Post"/"Share" action to create one; none is emitted by a background
process. There is no distinct "text-only" post kind — every post is one
of the five typed kinds, with an optional free-text caption layered on
top (§2.3). No image or video post kind exists (§5).

---

## 4. Reactions/comments — consolidated

| Feature | Exists? | Detail |
|---|---|---|
| Reaction kinds | One: "Respect" (thumbs-up) | `30-BLUEPRINT.md:709-711`; `community_react`, `feed.js:249-251` |
| Comments | Yes, flat, on posts and programmes | `community_comment`, `feed.js:253-256`; ≤500 chars |
| Replies (threaded) | No | No parent/reply column found in the comments table definition |
| Mentions | No | Zero grep hits for "mention" anywhere under `src/lib/community`, `src/screens/Community*.js`, `src/components/community/*.js` |
| Saves/bookmarks | No | Zero grep hits for "bookmark"/"saved_post"/"community_save" in client or SQL |
| Shares (in-app re-share of a post) | No dedicated re-share action found; only the external link share (native `Share.share`) | `links.js:storyUrl`; no "repost"/"share to feed" RPC found in the migration function list (§ full function list captured in this file's research, no `community_repost`/`community_share_post` name present) |
| Notifications | `COMMUNITY_FOLLOW` and `COMMUNITY_ACTIVITY` categories cover follow/request/accept and reaction/comment/programme_used | `40-DECISIONS.md:155-162`; `notify.js:23-30` |
| Deletion | Post: author-only, cascades comments+activity. Comment: author or target owner | §2.8 above |
| Moderation | Report on profile/post/comment/programme(/message); 3-report auto-hide; moderator queue with dismiss/hide/unhide/delete/restrict/suspend | `moderation.js:1-77`; `migrate_160_community.sql` `community_moderate` |
| Rate limits | Comments 10/hr new, 30/hr established; reports 20/day | `limits.js:63-66` |

---

## 5. Media

### 5.1 Avatars
**Preset-only, no upload, anywhere in Community.** `ProfileAvatarMark`
(`src/components/ProfileAvatarMark.js`) supports an `avatarUri` prop for
a real image (:16, rendered :50-64), but grep across
`src/screens/CommunityJoinScreen.js`, `CommunityEditProfileScreen.js`,
`CommunityProfileScreen.js` for `avatarUri`/`ImagePicker`/
`expo-image-picker` returns **zero hits**; Community always renders via
`presetKey`/`avatar_preset` (grep across all `src/components/community/
*.js` files shows every avatar usage passes `presetKey`, never
`avatarUri` — `PostCard.js:132-133`, `ProfileCard.js:122-123`,
`ActivityRow.js:76-77`, `CommentRow.js:96-97`,
`ConversationRow.js:71-72`). The `avatarUri` code path in
`ProfileAvatarMark` is used elsewhere in the app
(`src/screens/AthleteProfileScreen.js`, `src/screens/YouScreen.js`,
confirmed by grep) for the general app profile, **not** Community. This
matches SD-12/71-MEDIA-MODEL: "free image upload (posts and photo
avatars)" is listed as deliberately not built
(`40-DECISIONS.md:130-136`).

### 5.2 Photos / video / workout media / programme media / progress media
**None exist in Community.** No `media`/`photo`/`video`/`image` key
appears in any `POST_PAYLOAD_KEYS` entry (`validation.js:98-107`); the
programme snapshot carries no media field (`snapshot.js:102-111`);
Progress photos (a separate, private app feature) are explicitly
excluded by construction — `71-MEDIA-MODEL.md:22-24`: "Progress photos
feature stays private and its images can never be attached (enforced by
construction: the picker never reaches that directory)." No community
storage bucket exists (no Supabase Storage reference found under
`src/lib/community/` or in `migrate_160_community.sql`/
`migrate_161_community_connections.sql`).

### 5.3 External shareables — ShareCard
`ShareCardScreen.js` is the pre-existing (non-Community) share-card
image generator for PRs, sessions, weekly recaps and great-week
milestones (`drawShareCard.js`, `shareSessionName`, `greatWeek.js` per
recon §6 in `05-recon-programme-model.md:406-419`). It is the SOURCE of
the `pr`/`milestone` Community post payloads (§2.1 table) but the card
IMAGE itself is a general external-share artefact (saved/shared via the
OS share sheet), not a Community-native object — Community stores and
displays the structured `payload` data via `PostCard`, not the
rendered PNG. `ShareCardScreen.shareTargets.test.js`,
`campaign30Format.guard.test.js` and related guard tests (file names
only, `src/screens/__tests__/ShareCardScreen.*`) were not opened in
this pass; the ban list for these cards (no bodyweight/measurements/
private notes, with the single founder-approved progress-card exception)
is `CLAUDE.md` §2 GDPR/Article 9 paragraph, not re-derived from code
here.

### 5.4 71-MEDIA-MODEL summary (five lines)
Status: **DESIGNED, NOT BUILT** (`71-MEDIA-MODEL.md:1-6`). (1) Media
would attach only to a training story (one photo or ≤30s video clip)
and a profile avatar — never a comment, message, or programme
(`:19-21`). (2) It may show the training only (a lift, gym, set-up,
finished session), never a progress photo, enforced by construction
(`:22-24`). (3) Every image would pass an automated SafeSearch/
Sightengine check pre-visibility, fail-closed hidden on any failure or
error, then the same report/auto-hide/moderator path as text (`:26-
30`). (4) Storage would be one private Dublin Supabase bucket,
`community/<user_id>/<post_id>/<uuid>`, EXIF-stripped, served via
signed URLs; deletion cascades on post delete, leaving Community, and
account deletion (`:31-39`). (5) Media stories would be excluded from
Discover under calm mode or an open wellbeing flag, checked on device,
fail closed; no engagement ranking anywhere; no media to/from under-18
accounts (`:40-44`). The founder decision is still open (image-
moderation processor dependency + new data category, `:49-56`;
restated as an outstanding founder action, `docs/TASKBOARD.md:2445-
2447`).

---

## 6. External sharing / growth

### 6.1 Links
Three query-form static addresses (`src/lib/community/links.js:14-16,
27-38`): `https://volyume.app/u/?h=<handle>` (profile),
`.../p/?id=<id>` (programme), `.../s/?id=<id>` (story). App-scheme
mirrors: `volyume://u/?h=`, `.../p/?id=`, `.../s/?id=` (:41-51).
Exact-host parsing, never `startsWith` (`parseCommunityLink`,
:78-116, comment :17-20 citing the same house rule as
`authDeepLink.js`). Workout links specifically: not found as a fourth
Community link kind — a finished workout is shared only via the
`session` post kind's own story link (`storyUrl`), not a separate
"workout" URL scheme.

### 6.2 `community-public` for a non-user
`supabase/functions/community-public/index.ts`. Anonymous GET, service-
role internally, but returns **only an explicit field allow-list built
literal-by-literal** (comment :9-12): `programme` → title, description,
style_key, days_per_week, exercise_count, has_circuits, **full
snapshot** (structure only, never load — comment :139-141), use_count,
updated_at, creator `{handle, display_name, avatar_preset}` (:78-149).
`post` → kind, payload, caption, created_at, author card (:152-181).
`profile` → handle, display_name, avatar_preset, bio, styles, goal,
setting, area_label, gym_label, follower_count, up to 20 public
programmes, up to 10 public posts (:183-232). **404, never a partial
record**, when: creator is a minor, creator not active, creator's
profile not public, content hidden (moderation/auto-hide), or the
content's own visibility is not public (`publiclyVisible`, :90-92, and
per-branch checks :119-124,164-166). Programme visibility `'link'` is
accepted here too — unlisted but shareable (:121: `row.visibility !==
'public' && row.visibility !== 'link'`).

### 6.3 Web preview — OG tags, image
**Not confirmed present.** The blueprint specifies the static pages
render "dark house style ... fetch community-public ... 'Open in
Volyume' and 'Get Volyume'" with profile/story pages `noindex`
(`30-BLUEPRINT.md:572-579`), but this pass did not open
`public/u/index.html`, `public/p/index.html`, or `public/s/index.html`
to verify Open Graph meta tags or a preview image are actually present
in the markup — flagged in Ambiguities.

### 6.4 Store fallback
"Get Volyume" button with store links "from the partner page"
(`30-BLUEPRINT.md:577-578`); `docs/TASKBOARD.md:2449-2450` notes "the
three link pages carry the App Store id placeholder until the iOS app
is on the store" — i.e. the iOS store link is a known placeholder today,
not yet a real App Store URL.

### 6.5 Invite / attribution
**No invite-code mechanism anywhere in Community** — SD-20 states this
directly: "No codes exist anywhere" (`40-DECISIONS.md:249-250`,
replacing the old Partners invite-code model). SD-28: "Density is
handled by counts and honest zero states, not by hiding doors; the
invite path is the profile link and programme pages"
(`40-DECISIONS.md:289-291`) — i.e. the profile/programme LINK is the
entire "invite" mechanism; there is no referral tracking, invite credit,
or attribution parameter found in `links.js` (the query string carries
only `h`/`id`, no `ref`/`utm`/inviter parameter).

### 6.6 What a non-user can do from a link
Per `community-public`'s design: view a public programme's full
structure, view a public post, or view a public profile with its public
programmes/posts (§6.2). No action is possible beyond viewing and
tapping through to the app/store — no comment, no react, no follow from
the web page (the edge function is read-only GET; no write endpoint is
exposed anonymously).

---

## 7. Integrations

Grepped `src/`, `supabase/` for each:

- **Strava**: two unrelated hits only —
  `src/components/food/TodaysPlateTeaser.js` and
  `src/lib/shareCard/drawShareCard.js` /
  `src/lib/shareCard/__tests__/drawShareCard.test.js` — neither is a
  Strava integration; almost certainly coincidental string matches
  (not opened further; likely a comment or unrelated identifier — see
  Ambiguities). **No Strava integration exists.**
- **Apple HealthKit / Health Connect**: real, substantial integration
  exists app-wide (`src/lib/health.js`, `src/lib/activitySteps.js`,
  wired into `src/screens/SettingsHealthScreen.js`,
  `src/screens/ProOnboardingScreen.js`, `src/screens/
  WorkoutSummaryScreen.js`, `src/lib/database.js`) for **bodyweight and
  step-count** reads feeding TDEE/coaching — confirmed by
  `src/lib/health.js:1-19` header ("Unified wrapper over Apple HealthKit
  (iOS) and Health Connect (Android) ... Read scopes supported: weight,
  steps"). **Zero connection to Community**: no `community` string
  appears in `health.js` or `activitySteps.js` (grep confirmed empty).
- **Wearables generically**: no grep hits for garmin/fitbit/whoop in
  `src/`; the only wearable-adjacent hits are the two health.js/
  activitySteps.js files above (HealthKit/Health Connect, not a
  discrete wearable SDK) plus three social-discovery RESEARCH docs
  (`docs/social-discovery-2026-09-06/11-research-strava-garmin.md`,
  `README.md`, `14-research-connections-messaging-matching.md`) — these
  are competitor research, not implementation.
- **External social sharing**: the only mechanism is the OS native
  share sheet (`Share.share`, `react-native`'s `Share` API) used for
  Community links and for `ShareCardScreen`'s generated images — no
  first-party Instagram/X/Facebook SDK integration found.

**Conclusion: no Strava, HealthKit, Health Connect, or wearable
integration exists inside Community in any form** — training-story data
is sourced exclusively from Volyume's own locally-logged workouts/sets/
mesocycles (§2.2), never from an external health platform.

---

## 8. Classification table

Legend: **Fully** = built client+server, matches spec, reachable once
160/161 are applied. **Backend-only/blocked** = code complete on both
sides but the cloud objects do not exist in production (§0) — used
instead of a plain "Fully" wherever the finding depends on migrations
160/161/162. **Partial** = mechanism exists but is narrower than the
full spec. **Absent** = no evidence found. **Not discoverable** = exists
but no UI path surfaces it. **Privacy-incomplete** = a gap between the
stated privacy promise and the enforced mechanism.

| Capability | Classification | Basis |
|---|---|---|
| Programme publish | Backend-only/blocked (client+RPC complete) | §1.2, §0 |
| Programme discover | Backend-only/blocked | §1.3, §0 |
| Programme preview | Backend-only/blocked | §1.4, §0 |
| Programme save (Use as-is) | Backend-only/blocked | §1.5, §0 |
| Adapt for me | Backend-only/blocked (engine composition itself is real and testable offline) | §1.6, §0 |
| Run (adopted programme) | Fully (once saved, running is ordinary local plan execution, no cloud dependency) | §1.7 |
| Share (link/card) | Backend-only/blocked for the link's remote render; native share sheet itself works offline | §1.8, §6.2 |
| Follow author | Backend-only/blocked | §1.9, §0 |
| See other runners | Backend-only/blocked | §1.10, §0 |
| Programme stories (linked) | Partial — a `programme` post kind and a `programme_id` FK exist; no dedicated "stories about this programme" surface found | §1.11 |
| Discuss (comments) | Backend-only/blocked | §1.12, §0 |
| Versioning (update/republish) | Backend-only/blocked; and Privacy/continuity-incomplete by design — runners are never notified of a new version (§1.13) | §1.13 |
| Unpublish | Backend-only/blocked; existing copies explicitly preserved | §1.14 |
| Story generation | Backend-only/blocked for posting; the PAYLOAD BUILDERS are pure/local and testable offline | §2.1-2.2, §0 |
| Story approval (preview before post) | Fully at the client mechanism level (preview always shown); blocked end-to-end by §0 | §2.3 |
| Story free text | Partial — caption only (≤280 chars); the generated facts are not editable | §2.3 |
| Story sharing (visibility) | Backend-only/blocked | §2.6, §0 |
| Story discovery (Discover/link) | Backend-only/blocked | §2.6, §0 |
| Reactions | Backend-only/blocked; single kind only (no reaction variety) | §2.7, §0 |
| Comments | Backend-only/blocked | §2.7, §0 |
| Replies (threaded) | Absent | §4 table |
| Mentions | Absent | §4 table |
| Saves/bookmarks | Absent | §4 table |
| Shares (in-app repost) | Absent (only external link sharing exists) | §4 table |
| Avatars upload | Absent by design (preset-only) | §5.1 |
| Photos (posts) | Absent (designed, not built — 71-MEDIA-MODEL) | §5.2, §5.4 |
| Video | Absent | §5.2, §5.4 |
| Workout media | Absent | §5.2 |
| Programme media | Absent | §5.2 |
| Progress media | Absent by construction (deliberately walled off even from the designed model) | §5.2 |
| Web previews (OG tags/image) | Not discoverable/unconfirmed — page markup not opened this pass | §6.3 |
| Invite flow | Absent as a distinct mechanism (link itself is the "invite") | §6.5 |
| Attribution | Absent | §6.5 |
| Strava | Absent | §7 |
| Apple Health | Infrastructure-only, unconnected to Community (exists for TDEE/coaching elsewhere in the app) | §7 |
| Health Connect | Infrastructure-only, unconnected to Community | §7 |
| Wearables (generic) | Absent | §7 |

---

## Ambiguities / could not determine

1. **§1.6** — the exact reason-string-to-copy mapping shown on
   `CommunityAdaptScreen` (e.g. whether `unknown_exercise` renders as
   "No alternative in this style, kept" or a distinct line) was not
   independently re-opened from the screen file itself; the blueprint
   quotes four reason strings (`30-BLUEPRINT.md:521-522`) but this pass
   read `adapt.js`'s `ADAPT_REASON` enum, not the screen's render
   function line-by-line.
2. **§1.11** — whether a "stories about this programme" list exists
   anywhere beyond the programme's own comment thread was not settled
   with certainty; `CommunityProgrammeScreen.js` was read in relevant
   sections but not exhaustively end-to-end, and no dedicated component
   file (e.g. `ProgrammeStoriesRow`) was found by name, which is
   suggestive but not conclusive of absence.
3. **§3.4** — the mute/block RPC bodies
   (`community_mute`/`community_block`/`community_unmute`) in
   `migrate_160_community.sql` were located by line number via `grep`
   but their full bodies were not opened; the "silent" mute claim and
   "follows removed on block" claim rest on the SD-11 decision text
   (`40-DECISIONS.md`) rather than a re-derivation from the SQL body.
4. **§6.3** — `public/u/index.html`, `public/p/index.html`,
   `public/s/index.html` were not opened in this pass; presence/absence
   of actual `<meta property="og:...">` tags and a preview image in the
   rendered markup is unconfirmed (the blueprint's spec is quoted, not
   the shipped file).
5. **§7** — the two Strava string hits
   (`src/components/food/TodaysPlateTeaser.js`,
   `src/lib/shareCard/drawShareCard.js` and its test) were not opened to
   confirm what they actually match (e.g. a "Strava-style" comment vs. a
   real string constant); classified as almost-certainly-unrelated on
   the strength of file purpose (food teaser, share-card drawing) but
   not textually verified line-by-line.
6. **§1.15** — no per-user ceiling on TOTAL simultaneously-published
   programmes was found in `limits.js` or the publish RPC (only the
   10/day rate on the publish action); this is reported as an absence
   of evidence, not a confirmed "no limit exists" — a ceiling could
   exist in a part of `migrate_160_community.sql` not opened by line
   number in this pass (function bodies beyond the `community_publish_
   programme` header were not fully read).
7. **Deployment status of edge functions independent of migrations** —
   `community-notify` and `community-public` could theoretically be
   deployed to Supabase even while migrations 160/161 are unapplied
   (deployment and migration application are separate operations), but
   they would fail on every query against nonexistent tables regardless;
   no evidence was found either way on whether `supabase functions
   deploy` has actually been run for either function (TASKBOARD groups
   both together with "run against production" as a single founder
   action still outstanding, treated here as "not yet done" on that
   basis, consistent with §0).
