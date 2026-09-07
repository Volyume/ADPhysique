# 40: Verification: the UK gym master database

## Pipeline fixture tests
`npx jest scripts/gyms` run directly for this report: **13 suites, 182
tests, all passed** (1.4 s). Suites: `brands`, `chMatch`, `classify`,
`dedupe`, `fold`, `geo`, `gymVenuesSchema`, `jsonl`, `names`,
`operatorCoverage`, `osgb`, `postcode`, `transforms` (all under
`scripts/gyms/__tests__/`).

## Migration and client guards
`npx jest` run directly for this report over the guard and client
suites below: **9 suites, 411 tests, all passed** (6.5 s).
- `src/__tests__/gyms.rpcOnly.guard.test.js`, the four `rpc_only`
  gym tables carry no client-reachable SELECT path.
- `src/lib/__tests__/dbFunctionPrivilege.contract.test.js`, function
  privilege contract, extended to the `gyms_*`/`_gyms_*` set.
- `src/lib/gyms/__tests__/{index,postcode,rank,transport}.test.js` , 
  the pure postcode recogniser, client ranker and transport layer.
- `src/components/community/__tests__/GymPicker.test.js`, the search
  bar, debounce, postcode chip and "Can't find your gym? Add it" row.
- `src/screens/__tests__/CommunityDimension.gymConfirm.test.js`, the
  second-person confirmation row on a pending gym.
- `src/__tests__/community.privacy.guard.test.js`, extended for this
  workstream (GD-13 section, `GYMS_DIR` constant): a source-level guard
  that `src/lib/gyms` carries no coordinate write, no check-in, no
  session-to-venue link, confirmed by reading the guard's own assertions
  rather than trusting its name.

## Fresh-cluster migration applications
`supabase/README.md`'s migration table (row 162) and `35-REVIEW-
SECURITY-GYMS.md` record 160+161+162 applied, in dependency order, to a
disposable PostgreSQL 16.13 cluster with `auth`/role stubs: **twice** in
the original review (once for the checklist, once implicitly by the
re-review's fresh cluster) and a **third time** in the 2026-09-07
re-review, which additionally re-applied 162 a second time to the SAME
cluster to test re-runnability, both applies succeeded with no error.
Migration 162 remains **WRITTEN, NOT APPLIED** in production
(`supabase/README.md`), pending the founder's exact phrase.

## Full-tree result at commit `3a3c4ce` (2026-09-07)
Recorded by the lead per the handover and `docs/TASKBOARD.md` ("Full
tree at 3a3c4ce: lint 0, tsc 0, 1245 suites / 17709 tests"); this
report's own commands were run on the current pipeline/guard subsets
only (above), not re-run over the full tree. As given: `npm run lint`
exit 0; `tsc --noEmit` exit 0; **1,245 suites passed, 1 skipped; 17,709
tests passed, 16 skipped.**

## Security review 35: status
`35-REVIEW-SECURITY-GYMS.md` is now two passes on one file: an original
hostile review (20 findings, verdict **NOT SAFE TO APPLY** on findings
1-3) and a 2026-09-07 re-review appended by the lead against
`migrate_162` at commit `f09c612` (2,662 lines, up from 1,780), which
re-probed every finding live on a fresh cluster rather than re-reading
fix claims.

| Findings | Re-review result |
|---|---|
| 1-13, 16, 18 | **CLOSED**, each re-probed live (blocked-term filter on every free-text field incl. report `detail`; 60-char label cap load-bearing with the trigger as sole writer; `_q`/token caps + shared 120/min rail cut the measured 61,224 ms query to 159-168 ms; pending-venue visibility closed on all three read paths; clearing a gym clears its key; suggest's four privacy predicates restored; confirm/report/moderation preconditions enforced; erasure covers `reviewed_by`; grants/acceptance check verified) |
| 14 | **NOT CLOSED, re-rated P3**, the rail now runs before the existence check as intended, but `_community_rate_check`'s row-write is rolled back by the same statement's later RAISE, so refused calls never count (measured: 11 of 12 refused `gyms_report` calls left no rate row). A `migrate_160` property shared by every railed RPC in 160/161/162, not a 162-specific defect; tracked against 160, not blocking this file. |
| 21 (new) | **P2, open product ruling**, the prefix-search branch (fixed safe in finding 3) is gated on a supplied bounding box or recognised outward code; the app sends neither (`expo-location` not a dependency), so partial-token typing returns **zero** results on the exact rows the app calls with (measured: "p"/"pu"/"pur"/"pure"/"purege"/"puregy" → 0 hits; "puregym" complete → 1; "motherw" → 0, "motherwell" → 5). Measured that the narrowing gate itself contributes nothing to the 61s→159ms fix (148 ms ungated vs 168 ms gated at the same token cap), relaxing it is free, but is a product fork for the founder, not a security call. |
| 22-25 (new) | **P3**, two strangers can each confirm the other's identical pending submission into the catalogue (privacy trade-off of fixing 4, moderator queue is the backstop); `reject` has no status precondition (unlike `approve`/`merge`); `_limit` ceiling is 50 against GD-09's stated 40 (client asks 40, so inert today); the read rail's `community_rate_events` growth at 120/min wants a shorter prune for that key. |

**Re-review verdict: see 35, appended by the lead**, headline: "SAFE TO
APPLY on the founder's phrase, on security and privacy grounds", with
finding 21 flagged as the one item to settle first: as landed, the gym
picker matches whole tokens only (a completed brand or town word), not
partial typing, until a location dependency is added or the gate is
relaxed.

## Device checklist (physical Android, EAS build)
Numbers assume migration 162 + the seed chunks are applied (pre-apply,
these screens show the calm "unavailable, try again" state). ED-safety
cases marked **ED**.

1. **Profile editor gym picker, "PureGym Motherwell".** Edit profile →
   gym field → type `PureGym Motherwell`. Expect: "PureGym Motherwell ·
   Motherwell · ML1 · <distance or blank>" in the result list.
2. **Picker, "puregm" (partial word).** Type `puregm` only. Expect,
   per review 35 finding 21 (open, not yet ruled on): **no results**
   while the app sends no location, this is the current shipped
   behaviour, not a bug in this build. Clear and type the full word
   `puregym` instead: expect it to appear.
3. **Picker, "ML1" (postcode outward code).** Type `ML1`. Expect: the
   postcode chip recognises it and results include PureGym Motherwell , 
   this path is unaffected by finding 21 (it matches `outward`, not the
   token prefix).
4. **Picker, "Volt Gym".** Type `Volt Gym`. Expect: "Volt Gym ·
   Burscough · L40 · <distance>" in the results.
5. **Other gyms, up to 3.** Add a fourth gym to "Other gyms". Expect:
   refused with a calm message; the first three remain saved.
6. **Join screen, gym optional.** Start Join, leave gym blank, complete
   the rest. Expect: Join succeeds with no gym set; profile shows no
   gym until added later.
7. **Add a gym, invalid postcode.** "Can't find your gym? Add it" →
   fill name/address/town, postcode `ZZ99 9ZZ` (not a recognised
   outward). Expect: refused, "Check the postcode, then try again."
8. **Add a gym, valid postcode.** Same form with a real postcode in a
   seeded sector. Expect: "Added. It shows for everyone once a second
   person confirms it," and the new gym is immediately selectable by
   the submitter.
9. **Duplicate reply.** Submit a second gym in the same postcode
   sector/outward as an existing OPEN venue with a similar name. Expect:
   offered back ("Did you mean <name>?") instead of creating a
   duplicate; the offered venue must be one you can see (open, or your
   own pending).
10. **Second-account confirm.** From a second account, open the
    first account's pending gym and confirm it. Expect: it becomes
    visible to everyone (`open`); the same account cannot confirm twice,
    and the original submitter cannot confirm their own.
11. **Own-submission refusal.** From the SAME account that submitted a
    pending gym, try to confirm it. Expect: refused (self-confirmation
    is not a second, independent confirmation).
12. **Report a problem.** From a gym page, "Report a problem" → pick a
    kind (e.g. "Closed"), submit. Expect: calm confirmation toast; two
    independent reports of the same kind on the same venue flag it for
    moderator review (not user-visible directly).
13. **Gym page counts and people.** Open a gym with known members.
    Expect: a member count and, where visible under Community rules, a
    people list; a `closed` or `merged` venue's page reflects that
    status rather than looking live.
14. **Find people, gym door.** Set your gym to match another test
    account's gym (or their `other_gym_ids`). Open Find people → "At my
    gym". Expect: that account appears, with reason text either
    "Trains at <gym>" (primary match) or **"Also trains at your gym"**
    (matched via their `other_gym_ids`), never a percentage.
15. **Airplane mode.** Enable airplane mode, open the gym picker or a
    gym page. Expect: the calm "You are offline. Try again when you
    have a connection." state, never a crash or a blank screen with no
    explanation.
16. **ED-safety: blocked term in a submitted gym name.** "Add it" →
    name field containing a known blocked term (e.g. from the
    ED-vocabulary list `_community_blocked_terms`, `migrate_160:568`).
    Submit. Expect: refused with the app's calm fallback message
    ("Could not add that gym just now.", `content_not_allowed` is not
    in `CommunityGymAddScreen.js`'s named `REFUSALS` map, so it falls
    through to this generic, non-shaming copy, observed directly in
    `src/screens/CommunityGymAddScreen.js:41-46,96`), never the blocked
    term itself echoed back, and nothing is created.
