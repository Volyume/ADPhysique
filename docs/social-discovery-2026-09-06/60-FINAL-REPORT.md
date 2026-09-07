# 60 — Final report: Volyume Community (Social / Community / Discovery)

Founder brief 2026-09-06, delivered on branch
`claude/volyume-social-discovery-h7dknu` and merged to main (see the
verification section for the exact tree and tails). Evidence files `01`..`13`,
synthesis `20`, blueprint `30`, decisions `40`, reviews `51`/`52`,
verification `50`.

## Competitive research
- Hevy, JEFIT and Strong define table stakes (one-way follow, a follow feed,
  reactions and comments, a curated library) and one real differentiator
  each: Hevy strips weights from routine links and gives non-users a web
  preview; JEFIT has per-data-type privacy; Strong proves a whole segment
  wants no feed at all.
- Strava and Garmin teach the privacy lessons: presence must be opt-in
  (Flyby), per-field visibility beats one toggle, under-18 defaults from day
  one, verified clubs earned by activity, cooperative challenges beat
  leaderboards at small scale, and auto-posted or platform-generated
  engagement is the top complaint.
- Boostcamp is fork-then-edit; Juggernaut AI is the only product that
  substitutes equipment; Fitbod has no shareable object; Fitocracy shows
  gamification collapsing when density thins; no product verifies gyms.
- Policy: Apple 1.2 and Play UGC need working report, block, filter and a
  published contact; UK Online Safety Act duties are already live; social
  visibility needs its own consent; body metrics default private; no
  published density thresholds exist.

## Product decision
Volyume Community: one destination with **Following** (human-authored
training stories from people you follow) and **Discover** (programmes,
people, and the dimensions that connect them: style, programme, gym, area),
with search over both. Programmes are the primary shared object and the
recipient can use one as-is or have Volyume adapt it to their kit,
exclusions and limitations with every change explained.

## Partners
Retired. Screens, hook, service module, sync handler, beats and guards are
removed; the six local tables stay for wipe completeness; every cloud
migration and the `partner-cheer` function stay untouched. Active
partnerships become accepted mutual follows when both members create a
profile (server-side, in the profile RPC). Old invite links keep resolving
and land on Community with a plain card. Migration 155 is unblocked once a
build without Partners is in users' hands; it is not applied.

## Information architecture
Not a tab. Community sits in the Today stack, reached from a persistent
header action on Today (with an unseen-activity dot), a one-time
introduction card on Today after the first completed session, the Coach
Support row, a "Programmes from the community" row on Train, a
"Programmes from other lifters" row in the plan library, the Settings
row, and every share surface (plan detail, workout summary, share card,
block complete). A user who never taps any of these never meets it; the
introduction card is dismissed for good by either of its actions.

## What is distinctive (final product pass, SD-02a / SD-07a)
Three things no researched competitor offers: Adapt for me (a shared
programme refitted to your kit, exclusions and limitations by the coach's
own deterministic chain, circuits intact, every change explained);
training stories computed from the coaching model (a completed block with
its weeks, sessions and lift deltas) and always chosen by a human;
discovery through chosen training facts with the reasons shown. The
programme screen and the hub hero now say the first of these at the
moment of choice.

## People discovery
Search by handle prefix or display name over public profiles; suggested
people scored on chosen facts only (same programme 3, same gym 3, shared
style 2, same area 2, mutual follows 2, same goal 1) with the reasons shown;
people through programmes (creator card on every programme), through
dimensions (style, programme, gym, area pages), through comments and
reactions.

## Discovery graph
Story -> person -> profile -> follow -> programme -> use or adapt ->
programme dimension -> people on it -> their programmes. Dimensions are
pages, not rooms: they exist whenever one other person shares the fact and
surface on the hub at three or more (an internal choice, labelled as such).

## Cold start
Useful at one user: publish a programme or story and the link page shows
it to anyone; Volyume's own library plans sit in Discover labelled as
Volyume's. At ten: search and follow. At twenty-five: dimensions appear,
suggestions carry reasons. Nothing is ever fabricated: no seeded users, no
automated posts, no platform reactions, no empty "communities".

## Scaling
The same RPCs page on server cursors; discovery is chronological and
relevance-scored, never popularity-ranked; rate limits and the moderator
queue are in place from day one. The honest scaling risk is moderation
load on the founder, recorded in the runbook.

## Sharing
Posts (PR, session, completed block, milestone, programme) generated from
real logged data with a caption; programmes as versioned structural
snapshots; external pages for programmes, stories and profiles.

## Programme adaptation
Structure only ever travels; every starting weight is written as null on
import. Adapt composes the existing substitution chain (creator's style,
recipient's kit, exclusions, limitations); circuit groups, rounds, round
rest, day order and day count are never changed; every change carries a
reason; the original is untouched; when the limitation state cannot be
read nothing is changed and the screen says so.

## Communities, gyms, local
No rooms. Gyms are honest "Trains at" labels typed by the user, normalised
within an area; no verification, leaderboards or events. Area is a town or
city label; no map, radius, live location or "at the gym now".

## Privacy
Nothing is visible until the user creates a profile and accepts the rules
(its own consent row). Never in Community: bodyweight, body composition,
Progress Scan, nutrition, injuries and limitations, coaching, check-ins,
progress photos, first name, date of birth. Followers-only profiles show
only handle, name, avatar, bio and counts to non-followers. Minors are
forced followers-only and excluded from every discovery surface and the
public web. Blocks are two-way invisibility; mutes are silent.

## Moderation
Report with fixed reasons (including harmful body or eating content, which
is prioritised), block, mute, auto-hide at three distinct reports, an
in-app moderator queue with an audit log, restriction and suspension, rate
limits tighter for new accounts, handle policy, a shared blocked-terms
list, and a rules screen with the published contact. Records on file:
illegal content risk assessment, children's access assessment, DSA size
self-assessment, moderation runbook.

## Growth
Programme and story link pages give a non-user the real content plus
"Open in Volyume" and the store links; no invite mechanics, no urgency.

## Implementation
Cloud: `supabase/migrate_160_community.sql` (fourteen rpc-only tables,
forty-one SECURITY DEFINER RPCs, triggers, consent widening, deletion
re-issued) WRITTEN, NOT APPLIED; `community-notify` and `community-public`
functions. Client: `src/lib/community/` (transport with the three gates,
snapshot, import, adapt, posts, validation, keyword filter, limits, links,
profile, feed, activity, moderation, notify), fifteen screens, twelve
components, two notification categories with settings toggles, deep links
`community`, `u`, `p`, `s`, the legacy partner rewrite, three static link
pages, AASA and intent filters.

## Migration
No cloud data moved. Partnerships are read by the profile RPC to create
mutual follows; nothing is deleted.

## Verification
See `50-VERIFICATION.md` for the settled-tree lint and test tails, the
journeys walked in code by the two adversarial reviews and the fixes each
produced, and the founder device checklist (blueprint §12).

## Deliberate non-changes
Direct messages; challenges and leaderboards; live presence; free image
upload and photo avatars; community rooms; gym verification; automated
adherence broadcast; person-to-person comparison; contacts import.

## Genuine remaining work (not a roadmap)
1. Apply migration 160 (and deploy the two functions) on the founder's
   exact phrase, after a device walk of the checklist on a build.
2. Server-side quiet hours for server-sent pushes (SD-15a).
3. Image upload for posts and avatars: a founder decision (new processor
   dependency, EU residency check, DPA) before any build.
4. App Store id on the three link pages once the iOS app is on the store.
5. A full children's risk assessment follows the access assessment's
   conclusion (recorded in `docs/community-safety/`).

## Campaign 2: discovery, connections and messaging

Founder addition to the Community brief (in chat, 2026-09-06): "make
Volyume the easiest and most intelligent fitness platform for discovering
the right people, programmes and training communities". Spec
`70-DISCOVERY-BLUEPRINT.md`; rulings SD-20..SD-32 and SD-20a in
`40-DECISIONS.md`; landed on `claude/volyume-social-discovery-h7dknu`
across commits `ee8168a`, `a4fe904`, `8560a27`, `b8bae87`, `6fe42da`,
`847167c`, not yet merged to main.

### What shipped
Follow / Connect / Message, a three-tier relationship model (SD-20): a
mutual Connect request carries up to two fixed reasons and a 120-char
note, accepting creates mutual follows, removing a connection ends
messaging and keeps the follows. A training profile of coarse, opted-in
bands (days, time bands, sessions band, staple lifts, experience band,
programme key, age band) derived on device from real completed workouts,
never finer than a band, shown before sharing (SD-22). Find people with
six doors: at my gym, near me, train like me, on my programme, open to
training together, people you might know (SD-23), each with a real count
and an honest zero state, reasons shown instead of percentages (SD-24). A
training-partner opt-in flag with day/time/same-gym preferences (SD-25).
The programme screen as a bridge ("People on this programme", Connect and
Message on the creator, `847167c`). The gym dimension page as a summary
(counts by style, time band, partner flag; a typeahead that de-duplicates
labels, SD-27). One-to-one text messaging between connected people only,
with an optional programme/story reference tile, one push per
conversation per 15 minutes with no content, minors excluded server-side
(SD-21, SD-32).

### What makes this distinctive (blueprint's own list, `40-DECISIONS.md`
"Final product pass")
> (1) Adapt for me: a shared programme refitted to the recipient's kit,
> exclusions and limitations by the same deterministic chain the coach
> uses, circuits intact, every change explained, the original untouched.
> No researched product does this. (2) Training stories are computed from
> the coaching model, not typed... every story is a human choice, never
> an auto-post. (3) Discovery through chosen training facts with the
> reasons shown ("Uses a programme you use", "Trains at PureGym Leeds"),
> honest at 25 people because it needs relevance, not volume. Privacy by
> construction... is the fourth thing, and it is what lets the first
> three exist.

The second campaign adds a fifth, its own (SD-20a): real observed
training turned into coarse, opted-in bands is "the differentiator no
competitor has... delivered in the only form that is safe (bands,
chosen)", Garmin dropped mutual requests for one-way follow in 2026,
Strava gates messaging on a Following/Mutuals/No-one setting, no
researched product shows a match percentage, and GymBuddy is the only
app matching on schedule at all, in coarse bands.

### Deliberately not built, and the decision that says so
Media (post photos/video, photo avatars): designed in `71-MEDIA-MODEL.md`
but not built, SD-29 records it as still a founder decision on the
image-moderation processor dependency (new data category, EU residency
check, DPA), so the decision is informed, not deferred. Challenges,
leaderboards, live presence, community rooms, gym verification, contacts
import, person-to-person comparison: reconsidered against the new
connection graph and still rejected (SD-29), "none becomes more honest
at 25 people because a graph exists". Distance bands on the gym page:
recorded as a later question needing a geocoding source (SD-27), not
built.

### Founder-gated
Migration 161 (`supabase/migrate_161_community_connections.sql`) is
WRITTEN, NOT APPLIED, same as 160, both wait for the founder's exact
phrase "run against production" (`supabase/README.md:105-155`). The
image-upload/media-processor decision above (`71-MEDIA-MODEL.md`). The
App Store id on the three static link pages (`p`/`s`/`u`), pending iOS
being on the store.

### Open items
1. Apply migrations 160 and 161 (and deploy the updated `community-notify`
   function) on the founder's exact phrase, after a device walk of
   `50-VERIFICATION.md`'s checklist on a build.
2. Product review `73` findings 6-10 (inert age-band toggle; Training
   profile screen's own band rows have no minor filter unlike Join; gym
   typeahead scoping; a context reference only attaches to a brand-new
   conversation's first message; a sub-44dp header touch target) are not
   reviewed this pass and remain open.
3. Server-side quiet hours for server-sent pushes, unresolved since
   campaign 1 (SD-15a) and now also true of `connect_request`,
   `connect_accepted` and `community_message`.
4. The media decision above.
5. Merge to main once the device checklist has been walked (Section 2 of
   CLAUDE.md: build on a branch, merge continually once green and
   lead-reviewed, this campaign has not yet merged).
