# 20 — LEAD JUDGEMENT: is Community best-in-class, and what must change

Authority: founder prompt 2 (2026-09-07) and the gym-onboarding addition
(same day). Evidence: reports 01 to 10 in this folder (every claim below
is traceable to a file:line there; this document does not repeat the
evidence, it rules on it). Standing rulings honoured: SD-01..SD-32,
GD-01..GD-26, and every Section 2 inviolable in CLAUDE.md. Where a
ruling below changes an earlier one it says so and why.

## 0. The governing fact

Nothing in Community exists in production. Migrations 160, 161 and 162,
the gym seed chunks and both edge functions are written, reviewed and
unapplied. The client is on main with no feature flag, so a live user who
opens Community today sees calm "unavailable" states on every read. Every
verdict below is about the mechanism as written. The founder's phrase is
the only thing between the product judged here and the product real
users have, and it is the first item in section 8.

## 1. Capability map (what actually exists, by the brief's taxonomy)

| Area | State | One-line truth |
|---|---|---|
| Identity and profile | Fully (as coded) | Handle, display name, preset avatar, bio, up to three styles, goal, setting, area (free text), gym (directory id + label), visibility, connect-from, show-programmes, training-profile bands |
| Follow / request / accept | Fully | One-way follow; followers-only profiles get a request; accepting creates the edge |
| Connect / accept / remove | Fully | Mutual tie with up to two fixed reasons and a 120-character note; accepting mints follows both ways; removal keeps follows |
| Message | Fully, underpowered | One-to-one text between connected adults only; programme or story reference; 15-minute push collapse; no links, no media, no offline queue, reference lost on existing threads, report control cannot succeed |
| Block / mute | Fully | Block is bidirectional and closes everything; mute silences pushes only and does not remove the person from suggestions |
| Restrict, remove follower, my connections | Unreachable / absent | `removeFollower` and the connections list have no screen; restrict does not exist |
| People search | Partial | Handle prefix and display-name word-prefix, two characters minimum, one page of twenty, no fuzzy, no recent searches |
| Find people doors | Fully, underpowered | Six mutually exclusive doors; goal, style, experience, frequency, schedule are ranking terms only; equipment setting unused; door count uncapped over a 300-row scan |
| Suggestions | Fully, underpowered | Two separate engines with different pools and weights; empty at cold start (score of one required); mutes and connect-from not consulted; the Hub fetches one list and never renders it |
| Training-behaviour bands | Fully | Days, time bands, sessions band, experience band, staple lifts, programme key derived on device from timestamps and exercise ids only; shared by toggle; age band stored and inert |
| Location for people | Absent as a system | Area is a folded string; "Near me" is string equality; no town/city/region tiering; no radius; no coordinate anywhere for a person |
| Gym directory | Infrastructure built, not seeded | 46,817 canonical venues with coordinates, postcode, town, local authority, region, country; search by token, brand alias, exact outward code; radius query written and unreached; hierarchy never returned to the client |
| Gym selection | Fully (as coded) | Picker over the directory; primary gym plus up to three others; confirm and report rows; add gym into a pending state with duplicate offers and second-confirmation visibility |
| Gym intelligence | Partial | Gym dimension page with member count, follows, style and time-band counts, partner count, members' programmes and stories; no nearby gyms; no moderator screen for submissions and reports |
| Programmes | Fully | Publish structure-only snapshots from any plan, versioned; Discover, search by title and style, dimension pages, profile; preview; Use as-is; deterministic explained Adapt; People on this programme; comments; unpublish keeps runners' copies |
| Training stories | Fully | Five kinds built from logged data, always previewed and user-initiated, caption only, no free-text facts, banned fields enforced, calm-mode and ED-flag suppression |
| Feed | Fully, plain | Following and Discover, chronological, keyset cursors, no lens, one reaction kind, flat comments |
| Notifications | Fully, gaps | Nine push kinds in three categories, replay-guarded, content-free message pushes; no quiet hours on Community pushes; no notice to a moderated user |
| Moderation | Fully, one break | Six reasons, priority for body and eating content, auto-hide at three reports, moderator queue and log, reserved handles; message reports rejected by the RPC; gym review RPCs have no screen |
| External links | Partial | Static pages over an allow-listed function; App Store id placeholder in all three pages; no invite or attribution |
| Media, groups, challenges, leaderboards, presence, mentions, saves | Absent | By ruling (SD-12, SD-29); media remains a founder decision with the model written in 71-MEDIA-MODEL |

## 2. Where competitors are genuinely better

1. **Programme browsing (Boostcamp).** Boostcamp browses by goal, level and schedule over a deep catalogue. Volyume searches by title and style only. Structure is there in the snapshot (days per week, style, exercise count, circuits) but is not browsable.
2. **Combinable partner discovery (FitMatch).** FitMatch filters on proximity, timing, goals, style and level together. Volyume's doors are single-axis, so "at my gym, evenings, open to training together" cannot be asked. This is the largest functional gap for the training-partner journey.
3. **Non-user web previews (Hevy).** Hevy's routine page opens with no install and carries a preview. Volyume's pages exist but the store id is a placeholder and the Open Graph tags were not verified in the markup.
4. **Granular privacy (Garmin, JEFIT).** Per-data-type audiences. Volyume folds gym and area visibility into one "who can follow you" control.
5. **Media (everyone).** Every competitor carries photos. Volyume carries none, by an open founder decision, not by omission.

Where competitors are not better, despite appearances: JEFIT's gym chat is capped at one group chat per user; Gymduoo and Quorfit are waitlists; nobody has a canonical gym database, a gym roster, a reliability signal, or a real training-history match. Those are open ground.

## 3. Missing versus underpowered (the distinction the brief demands)

### Missing
- **A location system for people.** Nearby, town, city and region do not exist as concepts; only a string.
- **Use my location.** No dependency, no coordinate from the device, so the radius query is unreachable.
- **Combined filters** in Find people.
- **Cold-start fallback** in either suggestion engine.
- **Message reporting** that works.
- **A gym moderator surface** for pending venues and reports.
- **A notice to a moderated person** (restricted, suspended, content hidden).
- **A notice to runners when a programme is republished.**
- **My connections list**, remove-follower, restrict.
- **Recent searches, typo tolerance.**
- **Quiet hours on Community pushes.**
- **Self-maintenance of the gym directory** (no scheduled diff, no gap detection, ids not stable across re-runs).

### Underpowered
- **Gym search on a postcode** is an exact outward-code match with no radius fallback, so "ML1" finds ML1 venues only and a gym two streets over the district line is invisible.
- **Gym results** are not ranked down when the operator's own feed does not confirm the row (GD-26 unmet), so stale Fitness First rows compete with live ones.
- **The hierarchy** (town, local authority, region, country) is stored and never surfaced.
- **Display-name search** is word-prefix only.
- **Doors** count everything but page only the 300 most recently active.
- **Age band** is a promise with no effect.
- **Mutuals** are a scoring signal never shown as a count or list.
- **Message references** attach only to a brand-new thread; links are inert text.
- **Suggestions** include muted people and people who cannot be connected to.
- **The Today badge** conflates every unseen kind into one dot.
- **Programme discovery** cannot browse by days per week or equipment.
- **The feed** has no gym, place or programme lens (acceptable today, a limit at density).

## 4. Finite UX weaknesses (journeys walked through the evidence)

- **New user → Join → discover → connect:** works in six taps to a first message with one wait on the other person. The Join screen asks for a gym but not "Where do you train?" as a step with a finder; the area field is a free text box.
- **Find someone nearby:** dead end. The "Near me" door needs a typed area and matches the identical string only.
- **Find someone at my gym:** works once a gym is chosen; the gym page lists members and counts. No route to "gyms near this gym" or to broaden.
- **Find a training partner:** gym door or partner door, not both with days and times. A person can be found, connected and messaged, but nothing helps plan a session (no session reference, no reminder). The evidence says no live competitor has that either.
- **Programme discovery → Adapt → run:** complete and honest. Adapt explains each change in fixed wording and proposes nothing when the capability state is unreadable.
- **Story → share → interact:** complete; one reaction kind, flat comments.
- **Missing gym → add:** complete in mechanism; the submitter sees the pending venue at once, others after a second confirmation; no moderator can act on it in the app.
- **Block and report:** block propagates through every read RPC (verified against all three migrations). Reporting a message fails.

## 5. Best-in-class opportunities (Volyume can win here)

1. **The gym graph.** A canonical, geolocated UK directory with branch identity, people at this gym, programmes at this gym and honest counts is something no competitor has. It only pays off if the finder is effortless and gym selection is universal at Join. This is the founder's addition and it is correct.
2. **Real training-history matching in bands.** Nobody else can say "both usually train evenings, four sessions a week, same staple lifts". The bands exist; they need to become filters as well as reasons.
3. **Deterministic, explained Adapt.** Boostcamp forks and leaves the edit to the user. Volyume adapts to equipment and limitations and says why, without touching structure.
4. **Reasons, never percentages.** FitMatch's score is exactly the model that invites ranking people. Keep SD-24.
5. **Privacy by construction.** RPC-only tables, minors excluded from every surface, bands not observations, day-level times. Extend this to place: a chosen town, never a coordinate of a person.
6. **Honest low density.** Counts and zero states are right. What is missing is a graceful fallback inside a door so the screen is never blank when the graph is thin.

## 6. Cold start, ruled honestly

| Users | Discover | People | Gyms | Programmes | Verdict |
|---|---|---|---|---|---|
| 1 | Library programmes, no posts | Empty doors with the honest line | Directory works fully | Library only | Useful as a directory and library; social is empty and says so |
| 5 to 10 | A few stories | Doors nearly empty unless the same gym or programme; suggestions empty (score of one required) | Same | A handful | Fallback to "recently active" inside a door is needed so the screen shows people at all |
| 25 to 50 | Stories daily | Gym doors light up in cities; area string matching fails across spellings | Same | Dozens | The place system decides whether local discovery works at all |
| 100 to 250 | Steady | Gym and place doors work in cities; partner door meaningful | Add-gym submissions arrive | Hundreds | Programme browsing by structure needed |
| 1,000 | Busy | Radius bands matter; combined filters matter | Corrections arrive; moderator surface needed | Thousands | Feed lens by place or gym becomes valuable |
| 10,000 | Crowded | 300-row scan cap bites on big gyms; keyset paging needed | Directory needs self-maintenance | Ranking by real use | Groups anchored to a gym or programme become honest; leaderboards still no |

Groups before roughly a thousand people would be empty rooms; the dimension pages already do the anchoring job. Challenges and leaderboards are rejected on product grounds, not density (section 9).

## 7. Location and privacy model (ruling, LJ-01)

Location is a discovery mechanism, never tracking. The five relationships the founder named are kept distinct and only three exist in this build:

| Relationship | Exists | Source | Shown as |
|---|---|---|---|
| Selected main gym | Yes | Chosen at Join or Edit profile | "Trains at PureGym Motherwell" |
| Other declared gyms | Yes | Chosen, up to three | Listed on the profile |
| Chosen place | New | Chosen town or district from the gazetteer, or offered from the main gym's town | "In Motherwell", "Near you" |
| Historically used gym | Not built | Would need sessions tied to venues; GD-13 forbids inference in this build | Never |
| Inferred regular gym | Not built | Same | Never |
| Current or live location | Never stored | Device position used at the moment of a "Use my location" tap and discarded | Never |

Rules: a person carries a place key and the place's public centroid, never their own coordinate; "near" for people is a mile band between two town centroids and is shown as a band word, never a distance; distances appear only between the device and a gym at the moment of a search. No map, no "last trained", no "nearby now" (SD-31 holds).

## 8. Priorities

### P0 — required for best-in-class (and the founder's addition)
- **P0-A Cloud applied.** Founder phrase for 160 + 161 + 162 + seed chunks and the two functions. Nothing below reaches a user until this.
- **P0-B "Where do you train?" at Join.** A real step with the finder: Use my location (device position, approximate accuracy, explicit tap only, discarded), a 5-mile first band with "Search further" stepping through 10, 25 and 50 miles, and an always-present "Search by gym, town or postcode". Results carry name, town, outward code and distance when a position is known. "Can't find your gym? Add it" on every empty and every list end. Main gym plus other gyms. Skippable, with the Find people gym door pointing back to it.
- **P0-C Gym search that finds the gym.** A recognised postcode resolves to its sector centroid and searches by radius (5 miles, widening), not by exact district; a town name searches that town and its radius; results rank confirmed-operator rows above unconfirmed ones (GD-26); the client shows town and outward code on every row.
- **P0-D Place, not string.** Area becomes a chosen place from the gazetteer already in 162 (postcode sectors carry a centroid; towns and districts derive from them), with a coarse centroid on the profile. The "Near me" door becomes a mile band over place centroids (same place, then within 5, 10, 25 miles as bands). A profile with a main gym is offered the gym's town as its place. Migration 163, additive.
- **P0-E Combinable Find people.** One scored query with optional filters: scope (my gym, my place band, anyone), partner-open only, days, time bands, style, goal, experience band. Doors remain as presets over the same query. Count and paging made consistent (keyset over score and id, count capped to what is reachable).
- **P0-F Fix what is broken or dishonest.** Message report RPC accepts messages; age band becomes real for adults who opted in (a chip on the card and a like-me signal) and is hidden for minors post-join; the reference attaches to an existing thread; muted people and people whose connect-from excludes the viewer are excluded from suggestions and doors, or their card shows the true state; the unrendered suggested-people fetch is either rendered or removed.

### P1 — major product improvement
- Programme browsing by days per week, style and equipment setting on Discover and search.
- A gym moderator surface (pending venues, reports, corrections) reusing the moderation screen; ranking already uses verification status from P0-C.
- Runners told when a programme they use is republished (activity kind, in-app first).
- My connections list; remove a follower; a notice to a restricted or suspended person.
- Recent searches; substring display-name matching; client fuzzy ranking over people candidates as gyms already have.

### P2 — valuable
- Quiet hours honoured for Community pushes via the projection row.
- Separate Today badge for messages versus activity.
- Links in messages rendered as tappable text with no preview fetch.
- Directory hygiene: stable canonical ids across re-runs, scheduled source diff.

### Future — density or infrastructure
- Feed lens by place or gym (1,000+).
- Gym or programme anchored groups (10,000+, only if dimension pages prove insufficient).
- Session planning between connected people (a shared session reference and reminder) once partner matching shows real use.
- Media, on the founder's decision over the processor dependency (71-MEDIA-MODEL stands).

### Reject — deliberately not built
- Leaderboards and any person-to-person ranking (comparison harm, ED-adjacent, SD-12).
- Challenges (gamification without a training rationale; block completion is already a story).
- Live presence, "training now", exact distance to a person, maps.
- Match percentages and swipe matching.
- Contacts import.
- Free-text area or free-text gym as a primary field.

## 9. What is implemented in this campaign

P0-B, P0-C, P0-D, P0-E and P0-F in full, on the existing architecture: one additive migration 163 over 160 to 162, the existing `src/lib/gyms` and `src/lib/community` modules extended, the existing screens changed rather than duplicated. P0-B's "Use my location" path is built behind the founder's answer on the dependency; the no-location path ships regardless. P1 items are queued on the board with their specs in 30-IMPLEMENTATION.md; they are not silently parked, they are ordered after P0 by the lead under D33 and every one is listed with its recovery path.

## 10. Verdict against the final standard

Can Volyume compete with the strongest fitness-social products and be better where it matters to serious lifters? As written: on programmes, stories, connections, safety and privacy, yes, and in places better. On finding people it cannot yet, because place is a string, doors do not combine, and the finder cannot use a position. On gyms the asset is real and unmatched, but selection is not yet effortless and the finder is postcode-exact. With P0 landed and the cloud applied, the honest answer becomes yes at every density from one user upward, and materially better than any competitor at the gym and training-history layer.
