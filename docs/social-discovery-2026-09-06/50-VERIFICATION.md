# 50 — Verification: Volyume Community

## Settled-tree checks (branch `claude/volyume-social-discovery-h7dknu`)

Filled in from the final run over the settled tree (see the tails block at
the end of this file).

## What was verified, and how

**Cloud schema.** Migration 160 was applied twice (fresh and re-run) to a
throwaway PostgreSQL 16 with stubs for `auth`, `consent_log`,
`user_body_profile` and `partnerships`, then torn down: idempotent; 14
tables with RLS on and zero policies; 72 of 72 functions SECURITY DEFINER
with `search_path` pinned; exactly the 41 `community_*` RPCs executable by
`authenticated`, no helper, nothing by `anon`. Behaviour proven live:
accent folding, area-scoped gym keys, minor forced to followers-only,
partnership to mutual follows both ways, counters, PR payload weight
passing while nested bodyweight raises `forbidden_field`, blocked caption
raising `content_not_allowed`, the 3/day post limit, auto-hide at exactly
the third distinct reporter with an audit row, moderator unhide, block
deleting both edges and hiding the profile, cursor round trip, consent
grant and withdrawal rows, `community_leave`, and `delete_user_data`
clearing every Community row. Guards in `src/__tests__/community.*`
pin the rpc-only shape, the deletion coverage, the consent widening, the
forbidden keys, blocked terms and payload allow-lists against the client
constants, and the client RPC argument names against the migration's real
signatures.

**Client library.** Unit tests over the real database module on in-memory
SQLite: a kettlebell circuit snapshot (3 rounds, 90 s round rest) survives
import and adaptation with those fields intact; every imported row has a
null starting weight; excluded, unreachable-kit and limitation cases each
produce a substitute with the right reason; no alternative keeps the row
with a reason; day mismatch is reported; forbidden keys are rejected; the
payload allow-lists are exact; transport fails closed on unresolved
consent and sign-out wiping; only `transport.js` reaches the Supabase
client.

**Screens.** Mount tests for all fifteen screens; state tests for the hub
(no profile, following-empty with suggestions, discover with Volyume
tiles, offline cached, legacy partner card, params on remount), join
(handle states, offline), edit profile and privacy (partial updates),
programme (structure with circuits, never a weight, Adapt leads, already
using it, reporting a comment, reader without a profile), adapt (reason
copy, days mismatch, unreadable limitations offers actions), compose
hand-off, search programmes paging, moderation queue and note, activity
row, post card per kind.

**Journeys walked in code by the adversarial reviews** (`51`, `52`) and
the fixes each produced: new user with zero connections; find by handle;
discover through a programme; publish then view as another user; use
as-is; adapt with an exclusion and a kit mismatch; circuit programme;
post from workout summary and share card; block then invisibility in
every screen; report a post and a comment; leave; offline open; legacy
partner link; cold deep links `u`, `p`, `s`; account deletion coverage;
minors; suspended and restricted accounts; rate rails; forbidden-key
bypass attempts; push replay; erasure.

**Retirement.** Full suite green after Partners removal; App.js no longer
intercepts partner links; every surviving `partner` reference is
accounted for in the retirement commit.

## Not verified here (device only)
Rendering on a physical device, the OS share sheet, push arrival, the
universal-link association on a signed build, and the public pages
against the deployed function. These are the founder's device checklist
(blueprint §12, sixteen steps) on an EAS build after migration 160 and
the two functions are applied on the founder's exact phrase.

## Tails from the settled tree

Run 2026-09-06 over the settled branch tree (`2d61886` plus the closing
docs), exact outputs:

```
> volyume@1.3.5 lint
> eslint . --max-warnings 0
(no output; exit 0)

npx tsc --noEmit                      (no output; exit 0)
node scripts/check-imports.cjs        check-imports: OK (1863 files, no unresolved imports or missing named exports).
bash scripts/check-identity-invariant.sh
                                      Identity invariant clean: all 'SET user_id' callsites are annotated.

> volyume@1.3.5 test
> cross-env TZ=Europe/London jest --runInBand
Test Suites: 1 skipped, 1211 passed, 1211 of 1212 total
Tests:       16 skipped, 16841 passed, 16857 total
Snapshots:   17 passed, 17 total
Time:        192.671 s
```

Final product pass (blueprint §14), settled tree:

```
> volyume@1.3.5 lint
> eslint . --max-warnings 0
(no output; exit 0)
Test Suites: 1 skipped, 1216 passed, 1216 of 1217 total
Tests:       16 skipped, 16869 passed, 16885 total
Snapshots:   17 passed, 17 total
Time:        280.535 s
```

## Campaign 2: discovery, connections and messaging

Spec `70-DISCOVERY-BLUEPRINT.md`, rulings SD-20..SD-32 and SD-20a in
`40-DECISIONS.md`; lane commits `ee8168a`, `a4fe904`, `8560a27`, `b8bae87`,
`6fe42da`, `847167c` (`git log --oneline dedf7d5..7ca3b76`).

### What was verified, and how

**Cloud schema (migration 161).** Verified twice (fresh and re-run)
against a throwaway PostgreSQL 16 with 160 applied and stubs for `auth`,
`consent_log`, `notification_preferences`, `user_body_profile`,
`partnerships` (`supabase/README.md:148-155`): idempotent; 3 new tables
with RLS on, zero policies; every function SECURITY DEFINER,
`search_path` pinned; `authenticated` executing exactly the 23 new RPCs,
no helper. Guards: `community.rpcOnly.guard.test.js` (161: no
connection/message row reachable directly; every function pinned
SECURITY DEFINER; erasure covers connections and messaging completely;
CHECK widenings keep every existing value; SD-30 guard; "security review
2026-09-06 - push replay, programme door, block"); `community.migrationShape.test.js`
(161 header, re-runnability, tracker registration); `community.privacy.guard.test.js`
(no Community file reads personal data; client/SQL closed sets agree).

**Client library**, `src/lib/community/__tests__/`: `trainingProfile.test.js`
(SD-22 bands from fixtures, day bands need six-plus sessions and a
quarter share, time bands a 35% share and at most two, sessions band
rounds to nearest whole including a fortnight off, staple lifts capped at
five with custom exercises excluded, only opted-in bands sent with an off
toggle absent not null); `findPeople.test.js` (six doors in blueprint
order/wording, honest counts, zero states that never pretend);
`connections.test.js` (four fixed reasons, 120-char keyword-filtered
note, `connect_from`'s three values, accept/decline as one call with a
boolean); `messages.test.js` (composer placeholder by origin, 1-1,000
char body, a ref travelling as kind+id together, minor and not-connected
refusals as codes the screen maps).

**Screens**, `src/screens/__tests__/`: `CommunityFindPeople.test.js`,
`CommunityConnect.test.js` (ConnectButton/ConnectSheet states),
`CommunityTrainingProfile.test.js` (seven band rows, the minor gate on
the partner section, `rules_outdated` revert/redirect),
`CommunityConversation.test.js` / `CommunityConversations.test.js` (a
send carries only the one ref the screen opened with; offline
distinguished from a generic failure), `CommunityProgramme.test.js`
(creator header offers Connect and Message), `CommunityEditProfile.test.js`
(`changeConnectFrom` `rules_outdated` revert/redirect).

**Security review (`72`), fixed in `6fe42da`:** P0 (minors could receive
connection requests/messages via a stale `is_minor` flag); 2×P1
(programme door leaked any programme's title; block-then-unblock erased
the 30-day re-request bar); P1 (connect push replay); P1 ("same gym only"
partner preference ignored); 3×P2 ("Show which programmes I use" ignored
by the programme door; gym enumeration with no profile/rail;
`tp_programme_key` accepted any uuid); P2 (`community_remove_follower`
left a connection one-sided); P2 (no rate rail on eight RPCs), all
fixed. Findings 11-13 (P3: unused helpers, a removal-closed conversation
readable by id, `ws.*` selecting weight though unread further) left open
per the review's own verdict (out of scope for the P0-P2 pass).

**Product review (`73`), findings 1-5 fixed in `847167c`:** P0 (no way to
message a programme creator from the programme screen); P0 (a minor could
see and operate the partner section, UI lying about the result); P1 (a
message's story reference always showed "A lifter" not the real author);
P1 (`rules_outdated` mishandled on Training profile and Privacy saves);
P1 (duplicated Message/Remove-connection controls), all fixed.
**Findings 6-10 are not reviewed this pass**, marked by the review itself
"out of scope: only findings 1-5 were assigned" (inert age-band toggle;
Training profile band rows have no minor filter unlike Join; gym
typeahead reads the saved area not the one just typed; a context
reference only attaches to a brand-new conversation's first message;
sub-44dp Messages header glyph), remain open.

**Full-tree result**, lead, 2026-09-07, commit `7ca3b76`:
```
npm run lint                         exit 0
Test Suites: 1243 passed, 1 skipped
Tests:       17661 passed, 16 skipped
```

### Device checklist (Android EAS build; two accounts, one under 18)
Not verified above: rendering, push arrival, the `m` deep link on a signed build (blueprint §13 items 17-24 apply too).

1. Find people from the hub. Expected: all six doors (At my gym, Near me,
   Train like me, On my programme, Open to training together, People you
   might know) show a live count or honest zero state; a door needing a
   gym/area label says so and opens Edit profile.
2. Account one: Connect on account two's card with "Same gym" and "Want
   to train together?" plus a note. Expected: sheet allows up to two
   reasons and a 120-char note.
3. Account two, Activity. Expected: "Jamie wants to connect" with reasons
   and note, Accept / Decline. Decline it. Expected: account one still
   shows "Requested" (silent decline); no activity row on account one;
   re-sending within 30 days is refused.
4. Connect again (fresh pair or after 30 days), Accept on account two.
   Expected: both show "Connected" and a Message action; both now follow
   each other.
5. Account one: open a programme published by account two, press Message
   on the creator header. Expected: composer opens with the programme
   tile above it, placeholder "Ask about this programme".
6. Send the message. Expected: appears with the tile on both devices;
   account two gets one push "New message from @handle", no content. A
   second message inside 15 minutes: no second push.
7. Account one, Training profile: a real preview line from derived bands;
   turning a band off and saving removes it from preview. Switch on
   "Open to training together" with a day/time preference. Expected: a
   chip appears on the profile and account one now appears in account
   two's "Open to training together" door.
8. Under-18 test account, own profile and Training profile screen.
   Expected: no Connect or Message control anywhere; the partner section
   shows "Training partner matching opens at 18." with no switch/chips.
   An adult account searching for the minor: it never appears in any Find
   people door, search, or gym summary.
9. Trigger `rules_outdated` (accept updated rules on one device only, act
   from the other): a training-profile toggle, a privacy toggle, then a
   connect request. Expected: each redirects to Community rules, never a
   generic "could not save" toast.
10. Account one, Community privacy: set "Who can send me connection
    requests" to "People who follow me". Expected: account two (not
    following) gets "Not available" on Connect; works once following.
    Then open a gym dimension page with two or more members. Expected: a
    plain "Trains at" label, member count, counts by style and time band,
    and an "Open to training together" count, nothing precise.
