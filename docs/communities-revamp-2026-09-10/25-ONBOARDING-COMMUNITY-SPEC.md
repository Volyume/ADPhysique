# 25. Community at onboarding: your gym, a ready profile, one tap (founder order 2026-09-11)

Edit gate for lanes OJ-1 (lib + existing screens), OJ-2 (onboarding step,
lead hands-on), OJ-SQL (migration 173, lead hands-on) and OJ-REV (Opus
review). Register ruling: D158; campaign rulings: CR-15 in `40-DECISIONS.md`.
Recon evidence: lanes R-C (community model) and R-O (onboarding and
identity), 2026-09-11, reported in chat and folded into section 1 below.

## 0. Founder order (chat, 2026-09-11, verbatim)

"we need the gym selection on onboarding so that it's passed through to
community and people can connect to others on community right away without
people having to sign up. I want a user account created for community
automatically using their username / email beginning and that having them
join their gym automatically in community when they onboard but they have
the option to change their user / display name."

Bounds that bind every ruling below (CLAUDE.md section 2; CR-08):
- The Article 9 health-consent gate is never weakened or reordered. It
  already precedes onboarding (`RootNavigator.js` renderNavigator, order
  auth, consent, first run) and every Community RPC re-checks it and fails
  closed (`src/lib/community/transport.js:141-163`).
- Data minimisation. `email` and `firstName` are on Community's refusal
  list (`src/lib/community/validation.js:66-76`) and the privacy source
  guard (`src/__tests__/community.privacy.guard.test.js`) forbids any
  Community lib, component, gyms lib or `Community*` screen from reading
  them. So a handle derived from the email is derived SERVER-SIDE from
  `auth.users.email` (precedent: `migrate_071`, `095`, `108` read
  `auth.users.email` inside SECURITY DEFINER functions); the client never
  sends or receives the address.
- Minors (under 18, `_community_minor`, `migrate_160:826-862`) are
  excluded from cohorts, boards, groups and discovery; onboarding knows
  the age (13 to 100, `ProOnboardingScreen.js:480`).
- RPC-only community tables; every cloud change additive, idempotent,
  headed, guarded, hostile-reviewed, applied only on "run against
  production" through the connector (standing ruling 2026-09-11).
- Onboarding enforcement: no defaults, no tap-through on a required
  answer. The gym and the join decision are ANSWERS with an explicit
  "none" and "not now", never a pre-ticked box.

## 1. Current state (verified 2026-09-11, file:line)

- Joining Community is a separate screen, `CommunityJoinScreen.js`, with a
  typed handle and name, avatar, optional gym (GymPicker), optional
  disciplines, visibility and the sharing toggles; "Create profile" calls
  `upsertProfile` (`profile.js:179-187`), which sends
  `accept_rules_version` and is what writes the `community_visibility`
  consent row (`migrate_170:704-707`). The gym then goes through
  `setGyms` (`src/lib/gyms/index.js:296-301`, RPC `community_set_gyms`).
- Handle rules: `^[a-z0-9_]{3,20}$`, no leading or trailing underscore,
  reserved words (client 78, `validation.js:29-45`; SQL 12,
  `migrate_160:1398-1409`), plain UNIQUE (`migrate_160:109`), collisions
  raise `handle_taken`. The server allows a change every 30 days
  (`migrate_170:586-591`, `HANDLE_CHANGE_DAYS`, `limits.js:70`); creation
  does not stamp `handle_changed_at` (`migrate_170:696-703`), so the first
  change of a never-changed handle is free. No screen offers a handle
  change (pinned by `CommunityEditProfile.test.js:15-17`).
- Display name: editable on `CommunityEditProfileScreen.js:198-206`, no
  cooldown, 40 characters (`DISPLAY_NAME_MAX`).
- Minors: `_community_minor` reads `user_body_profile.date_of_birth` and
  returns NOT minor when the row is absent (`migrate_160:846-848`,
  deliberate per its comment); the client cache defaults `is_minor: true`
  until the server answers (`profile.js:45-53`). A minor may hold a
  followers-only profile, never appears in discovery, never connects,
  messages or joins groups.
- Onboarding: seven steps, step 1 hidden for a real account
  (`ProOnboardingScreen.js:98-99`, `displayStepOf` at 247); the age is
  step 2; equipment is step 4; step 5 (Injuries) is an entry-choice step;
  the whole completion sequence runs from `advanceFrom7` (1417 to 1904):
  profile, weight, body profile (writes the DOB, 1642-1652), targets,
  plan, `clearDraft`, payoff. The resumable draft persists steps 2 to 6
  (`proOnboardingDraft.js:34-35`). First name is optional (RA-4) and
  lives in `userProfile.firstName` only.
- No username exists anywhere; the handle is the username. Two screens
  already derive a DISPLAY fallback from the email local part inline
  (`YouScreen.js:354-358`, `AthleteProfileScreen.js:282-286`), skipping
  Apple private relay addresses (`appleIdentity.js:45-48`).
- No gym concept exists outside Community; onboarding's `home_gym` is an
  equipment profile, not a venue. Nothing passes any onboarding answer
  into Community today (`setGyms`/`upsertProfile` are called only from the
  three Community screens).
- Community screens are registered in `HomeStack` only
  (`RootNavigator.js:503-532`); `ProOnboardingStack` (836-870) registers
  the routes onboarding taps into, by transitive closure.
- Rules version parity: the client accepts version 3
  (`limits.js:34`) while `_community_rules_version()` still returns 2
  (`migrate_161:474-482`, never re-issued). A finding for the founder
  (section 3, Q4), not part of this order.

## 2. End state

1. Onboarding gains step 5, "Your gym", between Training week and
   Injuries and limitations (steps 5 to 7 become 6 to 8;
   `TOTAL_STEPS = 8`). An adult answers two things there: which gym they
   train at (GymPicker, or "I don't train at a gym"), and whether to join
   Community now, with their profile already filled in: a handle
   suggested by the server from their email local part, their name from
   the first name they gave (or the handle), the four rules, the privacy
   receipt. Two explicit actions: "Join Community" and "Skip for now"
   ("Not now" is reserved on the wizard by the R8-3/R9 guard for the
   capability decline; the wizard's own skip word is used, as on the
   injuries step). Nothing is pre-decided. Under 18 the step does not
   exist (section 3, rule f).
2. On completion the profile is created through the existing
   `community_upsert_profile` (so the consent row, the rules version and
   every server rule are exactly as they are for a Join today) and the gym
   through `community_set_gyms`. Offline or a transient refusal queues a
   pending join that drains on the reconnect edge, on app start and when
   Community is opened; a person who chose "Skip for now" finds the Join screen
   pre-filled with the same suggestion and their onboarding gym.
3. The handle and the display name are both changeable: display name as
   today; the handle from Edit profile, live-checked, with the server's
   30-day cooldown after the first change (an auto-suggested handle the
   person never chose changes free).
4. One additive cloud migration, 173: `community_handle_suggestion()` and
   the reserved-word parity between SQL and client. Written, guarded,
   hostile-reviewed, applied on the founder's phrase.

Elevates because: a person who has just said where they train lands in
Community already connected to that gym instead of meeting a second
sign-up form; the profile is one tap, and the tap is still theirs.

## 3. Rulings (CR-15, register D158). Lead rulings under D33 unless marked OPEN

a. **The join stays an explicit act, one tap, everything pre-filled.**
   OPEN as founder question Q1 (delivered in chat). Provisional ruling A:
   the step offers "Join Community" and "Skip for now" with nothing
   selected.
   Why: the profile is visible to other people (a public profile by
   default, the gym on it with `show_gym` true), the repo records the
   `community_visibility` consent at the create call, and ICO guidance on
   consent (UK GDPR Articles 4(11), 7 and 25) treats pre-ticked boxes,
   inactivity and bundled acceptance as not consent and requires privacy
   by default. Fully automatic creation (option B) would need a recorded
   change of legal basis for Community visibility; that is the founder's
   decision, not the lead's. Under B the only change to this spec is
   section 4.3 step 6 (the action row becomes a notice); every other part
   stands.
b. **Handle source: the email local part, server-side, shown and editable
   before anything is created.** OPEN as founder question Q2 (data
   minimisation: `john.smith83@` becomes `john_smith83`, visible to every
   viewer of a public profile). Provisional ruling: as the founder asked,
   with the person seeing and able to change it on the step (and later).
   Derivation order and rules in section 4.1.
c. **Fallbacks when the email is unusable** (Apple private relay
   `@privaterelay.appleid.com`, a local part that sanitises to under three
   characters, a reserved word): the sign-in provider's given name from
   `auth.users.raw_user_meta_data` (`given_name`, else the first word of
   `full_name` or `name`), else the neutral base `athlete`. Collisions
   append an underscore and a number (`base_2`, `base_3`, up to 99), then
   an underscore and four random digits, always inside twenty characters.
   The suggestion is never reserved; the create call still decides.
d. **Display name pre-fill:** the first name the person typed at step 2
   when present, else the suggested handle. Editable on the step
   (`DISPLAY_NAME_MAX`), on Edit profile as today.
e. **The gym is an answer with an explicit "none".** The step's GymPicker
   (search, near me, add a gym) and a tertiary "I don't train at a gym".
   No default. A picked gym is confirmed through GymDetailSheet exactly as
   on Join. A person who joins gets `community_set_gyms(gym_id, [])`; a
   person who chooses "Skip for now" keeps the gym on device for the Join
   screen to pre-select.
f. **Under 18: no Community step at onboarding.** The age is already
   answered at step 2; `advanceFrom4` skips to step 6 for an age under 18,
   `goBack` from step 6 returns to 4, the progress bar counts seven
   visible steps. A minor who later opens Community meets the existing
   Join screen and every minor rule it carries (CR-08). Reason: CR-08
   excludes minors from cohorts, boards and groups; creating a profile for
   every minor who completes onboarding is a wider exposure than today's
   deliberate, adult-skewed opt-in, and the server's minor check fails
   open when the DOB row has not synced yet (section 1). Founder question
   Q3 asks whether that fail-open should become fail-closed in a later
   migration; this order does not depend on it.
g. **The join runs at completion, never mid-wizard.** In the completion
   sequence after the plan build and before `clearDraft`, so the body
   profile (the DOB) is written first, an abandoned wizard never leaves a
   profile behind, and a failed join can never block or fail the
   onboarding itself (best effort, queued; the person still lands on
   their plan).
h. **Offline and refusals queue, never lose, the choice.** A join that
   cannot run (offline, `unavailable`, `rate_limited`, `health_consent_
   unresolved`, `not_signed_in`) is stored per account and retried; a
   `handle_taken` race re-suggests once and retries once; `handle_invalid`
   or `invalid_input` (a server-side rule the client did not know) is
   stored with the handle cleared so the retry suggests afresh. A pending
   join older than 14 days is dropped unsent (the person's wish may have
   moved on; the Join screen is one tap away); a failed retry keeps the
   ORIGINAL decision time, so the expiry is real. The Join screen
   supersedes any pending join. Known and unmitigated (fresh-eyes review
   2026-09-11, N7): a drain in flight while the Join screen's own create
   succeeds can land its update over the typed handle, and a leave while
   a drain is in flight can re-create the profile; both need the same
   account acting in two places inside one network round trip.
   An EXISTING member who reaches the step (a re-run wizard on a new
   device) is told so; a gym they pick goes on their profile with their
   other gyms kept (`applyOnboardingGym`), "none" leaves the profile
   alone, and nothing else is written for them.
i. **Existing accounts** (already onboarded, no profile) are not prompted
   by this order; the Join screen pre-fill (section 4.4) gives them the
   same one tap, and the existing Home intro card after the first session
   stays as it is.
j. **Handle change surfaces on Edit profile**, with the server's cooldown
   copy and the live availability check the Join screen already uses. The
   pinned contract "neither screen sends a handle" changes deliberately
   (founder order: "the option to change their user / display name").
k. **Reserved words: the suggestion excludes the client's list.**
   Migration 173 adds `_community_handle_suggest_reserved()`, byte-for-byte
   the client's `RESERVED_HANDLES` (80 words), and the sanitiser refuses
   any base on it, so a server-suggested handle can never land on `app`,
   `settings` or `login`; a guard pins SQL equal-to client.
   `_community_handle_reserved()` (the 12-word hard rule) is NOT
   re-issued: `community_upsert_profile` re-validates the merged handle on
   every save, a display-name edit included, so widening the hard list
   would refuse every future edit from an existing member whose handle is
   on it. What a person TYPES stays refused by the client's list, as
   today.
l. **Copy is Community's own voice** (section 5): training facts only,
   nothing about the body, no "sign up", no "automatically", British
   English, no em dash.

## 4. Mechanism

### 4.1 Cloud: `supabase/migrate_173_community_handle_suggestion.sql` (lead, hands-on)

House header (Purpose, Applied locally, Applied remotely, Safe to re-run,
Rollback, Transaction, Depends on 160, 170). Parts:

1. `public._community_handle_suggest_reserved()` IMMUTABLE, SECURITY
   DEFINER, pinned search_path, no client grant: the client's
   `RESERVED_HANDLES` (80 words) as the array, same shape as
   `migrate_160:1398-1409`. `_community_handle_reserved()` is untouched
   (ruling k).
2. `public._community_handle_base(_raw text) RETURNS text` IMMUTABLE,
   SECURITY DEFINER, pinned search_path, no client grant: lower; cut at the
   first `+`; every run of characters outside `[a-z0-9]` becomes one `_`;
   collapse repeated `_`; trim `_` both ends; `left(20)` then trim again;
   NULL when the result is shorter than three characters, fails
   `_community_handle_valid`, or is on the suggestion's exclusion list.
3. `public.community_handle_suggestion() RETURNS jsonb` VOLATILE (it
   writes the rate rail, migrate_167 lesson), SECURITY DEFINER, pinned
   search_path, EXECUTE to `authenticated` only. Body: caller via
   `_community_caller()`; if the caller already has a profile return
   `{handle: existing, source: 'existing'}` BEFORE the rail (a pre-fill
   for someone already in never spends rail; the read is the caller's own
   row); `_community_rate_check(v_uid, 'handle_suggest', 30, 30, interval
   '1 hour')`; read `email` and
   `raw_user_meta_data` from `auth.users`; source 1 the local part unless
   the domain is `privaterelay.appleid.com`; source 2 the given name per
   ruling c; source 3 `athlete`; then the collision loop: candidate,
   `left(base, 20 - len(n) - 1) || '_' || n` for n in 2..99 (a trailing
   `_` trimmed after the cut), then `left(base, 15) || '_' || four random
   digits`, at most 120 tries in all before `unavailable`; every candidate
   re-checked with `_community_handle_valid` and against
   `community_profiles.handle` for any OTHER user. Returns
   `jsonb_build_object('handle', v_candidate, 'source', v_source)`.
   Never returns, logs or raises with the email (the local is nulled as
   soon as the two `split_part` reads are done).
4. Acceptance block (DO): the three functions exist with SECURITY DEFINER
   and the pinned search_path; the suggestion is VOLATILE and the helpers
   IMMUTABLE; `authenticated` may execute the suggestion and no client
   role may execute either helper; the exclusion array contains `app`,
   `settings`, `login`, `me`, `today`; the sanitiser is tested pure on
   five fixed inputs (no data, no accounts).

Guard `src/__tests__/migrate173.rpcOnly.guard.test.js` (model:
`migrate172.rpcOnly.guard.test.js`): header fields; SECURITY DEFINER and
search_path on every function; VOLATILE on the suggestion, IMMUTABLE on
the helpers; grants (authenticated on the RPC only); the SQL exclusion
list equals the client's `RESERVED_HANDLES` (parse both arrays);
`_community_handle_reserved` is not re-issued; the email is read once into
a local and never appears in a RETURN, a jsonb_build_object or a RAISE;
the README status block and the security matrix targets
(`scripts/security/supabase-matrix.targets.json`) know the RPC.

### 4.2 Client lib (lane OJ-1)

`src/lib/community/profile.js`
- `suggestHandle()`: `callCommunity('community_handle_suggestion')`,
  no arguments; returns `{ handle, source }` or throws the CommunityError
  the transport maps. Exported through `index.js`.

`src/lib/community/onboardingJoin.js` (new; a Community lib file, so it
obeys the privacy guard: no `firstName`, `email`, `age`, `dateOfBirth`)
- `pendingJoinKey(uid)`, `onboardingChoiceKey(uid)`: per-account
  AsyncStorage keys.
- `rememberOnboardingChoice(uid, { gym, displayName })`,
  `readOnboardingChoice(uid)`, `clearOnboardingChoice(uid)`: what the
  Join screen pre-selects for a person who chose "Skip for now"; `gym` is the
  minimal venue `{ id, display_name, town, outward }`.
- `writePendingJoin(uid, { handle, displayName, gymId, decidedAt })`,
  `readPendingJoin(uid)` (null when malformed or older than 14 days),
  `clearPendingJoin(uid)`.
- `performCommunityJoin(uid, { handle, displayName, gymId })`: the ONE
  path both onboarding completion and the retry use. Order: handle null
  means `suggestHandle()` first; `upsertProfile({ handle, display_name,
  visibility: 'public' })` (avatar preset stays the client default, as
  Join; the sharing toggles stay OFF, CR-13); then `setGyms(gymId, [])`
  when a gym was chosen (best effort, as Join); then `loadMe({ force:
  true, userId: uid })` so the cached `me` is current; on success
  `clearPendingJoin` and `clearOnboardingChoice`. Refusals per ruling h:
  `handle_taken` re-suggests once and retries once; `handle_invalid` or
  `invalid_input` stores the pending join with the handle cleared;
  `offline`, `unavailable`, `rate_limited`, `health_consent_unresolved`,
  `not_signed_in`, `sign_out_wiping` store the pending join unchanged;
  `profile_suspended` or a profile that already exists (`hasProfile`
  after `loadMe`) clears the pending join. Returns `{ ok, queued,
  error }`, never throws.
- `retryPendingJoin(uid)`: reads the pending join; nothing to do returns
  `{ ok: false, queued: false }`; otherwise `performCommunityJoin`.
  Wired: App.js reconnect edge beside `flushPendingAmbientItems`; the
  daily sync path in App.js that already awaits the widget writer; and
  `CommunityHubScreen` on mount beside `retryPendingSharingPublish`.
- `leaveCommunity` (profile.js) also clears the pending join and the
  onboarding choice (a person who leaves must never be re-joined by a
  stale queue).

### 4.3 Onboarding step 5, "Your gym" (lane OJ-2, lead hands-on)

`src/screens/ProOnboardingScreen.js`
1. `TOTAL_STEPS = 8`; `STEP_LABELS` gains `'Your gym'` at index 4;
   `STEP_OUTCOMES[5]` = gym pin ("Your gym"), people ("People who train
   there"); steps 5 to 7 renumber to 6 to 8 everywhere (state gates,
   `validateStepN`, `advanceFromN`, `attemptedN`, `groupN`, render
   blocks, `emitStepDone(n)`, the draft's `MAX_STEP` moves to 7, keeping
   its existing "last step is not persisted" relationship, unless the
   draft tests pin otherwise: STOP and report).
2. State: `gymVenue` (null | minimal venue), `gymChoice` (null | 'picked'
   | 'none'), `communityHandle` ('' until suggested or typed),
   `communityHandleState` ('idle' | 'invalid' | 'checking' | 'available'
   | 'taken' | 'unknown', as Join), `communityDisplayName`,
   `communityJoin` (null | 'join' | 'later'), `pendingGym` for the
   GymDetailSheet. All but `communityHandleState` and `pendingGym` ride
   the draft.
3. On entering step 5 with an empty handle: `suggestHandle()` once; a
   result fills the handle and runs the live check; a failure leaves the
   field empty with the offline hint (the person may type one; a typed
   handle is checked as on Join, `HANDLE_OFFLINE_HINT` reused).
4. Display name: pre-filled once from `firstName.trim()` when present,
   else from the suggestion; then owned by the person.
5. Layout, top to bottom: `ProOnboardingHeader` (title and sub, section
   5); QuestionGroup "Where do you train?" with GymPicker (header off,
   `navigation` for "Add it") or the picked-gym row with "Change gym", and
   the tertiary "I don't train at a gym" (state 'none', copy line "No gym
   chosen. You can add one any time from Community."); QuestionGroup
   "Your Community profile" with the handle field and its live line, the
   name field, `PrivacyReceipt`, the four rules card (the `RULES` list
   moves to `src/lib/community/rulesSummary.js` and Join imports it too),
   and a "Community rules" secondary link to `CommunityRules`.
6. Actions: primary "Join Community" (never greyed out, the D146 rule: a
   tap with a gap marks the step attempted and surfaces the first missing
   answer, `surfaceGaps` pattern: gym, then handle, then name); secondary
   "Skip for now" (a tap needs only the gym answered). Each sets
   `communityJoin` and advances
   to step 6. Under founder answer B this row becomes the one notice line
   and the step's Continue; nothing else changes.
7. Minor: `isMinorAnswer(age)` (`parseInt < 18`, the same parse the
   validators use). `advanceFrom4` goes to step 6; `goBack` at step 6
   returns to step 4; `displayStepOf(step, minor)` counts six visible
   steps (step 1 is hidden for every real account, and the gym step is
   gone) and shifts the shown index for steps 6 to 8; the draft resume
   clamps a minor's step 5 to 4. No copy about age appears anywhere on
   the step.
8. Completion (`advanceFrom8`, the renamed `advanceFrom7`): after the plan
   block and before `clearDraft`: if `communityJoin === 'join'` and not a
   minor, `await performCommunityJoin(user.id, { handle: communityHandle
   || null, displayName: communityDisplayName.trim() || communityHandle,
   gymId: gymVenue?.id ?? null })` inside its own try; the result never
   changes the sequence, the payoff or the alert path. If `communityJoin
   === 'later'`, `rememberOnboardingChoice(user.id, { gym: gymVenue,
   displayName })`. Both best effort, logged through `errorLog` on throw.
9. Navigation: `ProOnboardingStack` registers `CommunityGymAdd` and
   `CommunityRules` (headerShown false), with the same "transitive
   closure" note the stack already carries for HowYouTrain.
10. The email is never read on the step or in the join path: no
    `user.email`, no `appleIdentity` import for this purpose. The step
    shows the handle the server suggested, nothing about where it came
    from.

### 4.4 Existing screens (lane OJ-1)

`CommunityJoinScreen.js`: on mount, when the handle is empty and no
pending join exists, `suggestHandle()` fills it and runs the live check
(failure: unchanged behaviour). `readOnboardingChoice(uid)` pre-selects
the primary gym ('picked' state) and the display name when present. A
pending join, when present, pre-fills handle, name and gym instead and
is cleared on a successful create (the screen supersedes the queue). No
other behaviour changes.

`CommunityEditProfileScreen.js`: a "Handle" TextField above "Name",
initialised from the profile, lowercase and whitespace-stripped on
change, live-checked as Join when it differs from the current handle
(`isValidHandle` first, then `checkHandle`); hint line as Join plus
"You can change your handle once every 30 days." (`HANDLE_CHANGE_DAYS`);
`save` sends `handle` only when it differs from the profile's handle;
`not_allowed` maps to "You changed your handle less than 30 days ago."
Save stays disabled while the changed handle is 'taken' or 'invalid'.

### 4.5 What does not change

The Article 9 gate, the minor rules, the sharing toggles (OFF), the
avatar presets, discipline, visibility (public by default, minors forced
to followers server-side), the Rules screen, `leaveCommunity` semantics,
the Home intro card, the widget, every board and feed.

## 5. Copy (British English, no em dash, Community's voice)

- Step title: "Where do you train?"
- Step sub: "Pick your gym and Volyume connects you with the people who
  train there. Only training facts are ever shared: never your body, your
  food or your location."
- Gym none row: "I don't train at a gym"; after choosing it: "No gym
  chosen. You can add one any time from Community."
- Picked gym caption: "Only the gym you choose. Never your location."
- Community group label: "Your Community profile"; hint: "Ready to go.
  Change either now or any time from Edit profile."
- Handle line states: as Join (`HANDLE_HINT`, available, taken, offline).
- Actions: "Join Community", "Skip for now" (the onboarding step; the
  Join screen's own gym "Not now" is unchanged).
- Edit profile handle hint: "Letters, numbers and underscores. You can
  change your handle once every 30 days."; on an invalid shape: "Use 3
  to 20 letters, numbers or underscores."
- Edit profile refusal: "You changed your handle less than 30 days ago."

Notes for whoever reads the onboarding funnel: `onboarding_step_completed`
step numbers 5 to 8 shift by one from this landing (5 is now "Your gym",
emitted by adults only). A tap on "Join Community" while the live handle
check is still running surfaces "Checking that handle. Try again in a
moment." rather than joining blind, the same posture as the Join screen's
disabled Create during its check (fresh-eyes review N1, held).

## 6. Tests (written to fail)

- `src/screens/__tests__/ProOnboardingScreen.communityStep.guard.test.js`:
  `TOTAL_STEPS = 8`; `'Your gym'` at index 4 of `STEP_LABELS`; the step
  renders both actions and neither is a default (`communityJoin` starts
  null); `advanceFrom4` skips to 6 for an age under 18 and `goBack` from 6
  returns to 4; the completion runs `performCommunityJoin` only for
  `communityJoin === 'join'` and after the plan block, before `clearDraft`;
  `rememberOnboardingChoice` for 'later'; the step and the join path never
  read `user.email` or `.email`; `CommunityGymAdd` and `CommunityRules`
  registered in `ProOnboardingStack`.
- `src/lib/community/__tests__/onboardingJoin.test.js` (mocked transport,
  database-free): success order (suggest when null, upsert with
  `accept_rules_version`, set gyms, me refresh, queue cleared); each
  refusal class per ruling h; the 14-day expiry; `handle_taken`
  re-suggests once; `retryPendingJoin` with nothing pending is a no-op;
  no uid sends nothing.
- `src/lib/community/__tests__/profile.suggestHandle.test.js`: RPC name,
  no arguments, shape; the privacy guard covers the new file by location.
- `CommunityEditProfile.test.js`: re-anchored (handle sent only when
  changed; unchanged saves carry none); `CommunityJoin.test.js`: the
  pre-fill and the pending-join precedence.
- `src/__tests__/migrate173.rpcOnly.guard.test.js`: section 4.1.
- The existing onboarding pins (sexGate, heightGate, gaps, buildCard,
  notificationPrefs, libraryKit, capabilityVocabulary, campaign5 firstUse)
  stay green under the renumbering; any pin that conflicts is a STOP.

## 7. Device checklist (Android, EAS build from main; no build until the founder says)

1. New account, age 30, Google sign-in: after Training week the step
   "Where do you train?" shows a suggested handle from the email local
   part and the first name as the name. Expected: both editable; "Join
   Community" disabled until a gym or "I don't train at a gym" is chosen.
2. Search a gym by postcode, confirm it, tap "Join Community", finish
   setup. Expected: the plan payoff as before; Community opens on your
   profile with the gym shown; the Home intro card never appears.
3. Airplane mode before step 5. Expected: the handle field is empty with
   the offline hint; typing a handle and joining still completes setup;
   once online the profile appears without any action (reconnect edge).
4. New account, age 16. Expected: no gym step; the progress bar shows
   six steps; Community later shows the Join screen with its under-18
   note.
5. "Skip for now" on the step with a gym chosen, then open Community and tap
   Join. Expected: handle suggested, gym pre-selected, name pre-filled.
6. Edit profile: change the handle. Expected: live availability line, the
   change saves; a second change the same day is refused with the 30-day
   line.
7. Apple sign-in with Hide My Email. Expected: the suggested handle is
   built from the given name or reads `athlete` with digits, never from
   the relay address.
8. ED-safety: nothing on the step mentions weight, food or body; the
   privacy receipt lists them under "Never shared".

## 8. Lanes and order

- OJ-SQL (lead): migration 173 + guard + README row and status block +
  matrix target. Then OJ-REV-SQL (Opus, read-only, hostile).
- OJ-1 (Sonnet): sections 4.2 and 4.4 with their tests. Do not touch
  `ProOnboardingScreen.js`, `RootNavigator.js`, `App.js` beyond the two
  retry hooks named, or any SQL.
- OJ-2 (lead): section 4.3 after OJ-1 lands (it imports OJ-1's module).
- OJ-REV (Opus): fresh-eyes review of the landing against this spec.
- Landing: `npm run lint && npm test` on the settled tree, small commits,
  merge to main, checklist in chat. No build until the founder says.
