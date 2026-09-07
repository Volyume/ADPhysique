# 40 — Final competitive gap closure (lead, 2026-09-07)

Authority: founder prompt "Community — final competitive gap closure and
correction" (in chat). Evidence reused: `07-competitors.md`,
`docs/social-discovery-2026-09-06/10-14`, reports 01-06, judgement `20`.
No new research. Founder product rule: Volyume builds individualised
programmes; the Community programme-sharing layer is the wrong model and
is REMOVED (section 2).

## 1. Decision table (material capabilities only)

| Capability | Competitor advantage | Volyume today | Material gap? | Decision |
|---|---|---|---|---|
| Combinable partner filters (gym, schedule, style, goal, level) | FitMatch filters all at once | Built this campaign (filters sheet, one scored query) | No | KEEP |
| Compatibility shown before contact | FitMatch numeric score | Fixed-wording reasons, no score (SD-24) | No; the score model invites ranking people | REJECT score, KEEP reasons |
| People search tolerance | Hevy/Strava find a person from a partial or misspelled name | Handle prefix, display-name word prefix, no recent searches | Yes | BUILD: substring name match server-side, client fuzzy rank (as gyms have), recent searches on device |
| Follow management | Strava/Garmin: see and remove followers, a connections list | `removeFollower` in the lib, no screen; no connections list | Yes | BUILD: My connections and Followers screens with remove |
| Restrict (soft limit) | Instagram-style restrict | Absent | No; block and mute cover the training-partner case | REJECT |
| Granular privacy | Garmin/JEFIT per-data-type audiences | One connect-from control; gym and place always shown to viewers who can see the profile | Yes, for gym and place specifically | BUILD: "Show my gym" and "Show my place" toggles (default on), enforced in the profile card |
| Moderated-person notice | Strava/Hevy tell a restricted user | Nothing shown to a restricted or suspended person | Yes (fairness and appeal path) | BUILD: in-app notice on the Hub with the reason class |
| Session planning after connecting | No live competitor has it; Gymduoo/Quorfit roadmap only | Message with programme or story reference; nothing for a session | Yes, and it is the point of the partner journey | BUILD: "Suggest a session" reference in a conversation (day, time band, gym), rendered as a tile, accepted with one tap; no reminders in this pass (notifications budget unchanged) |
| Messaging links | JEFIT/Strava render links | Inert text | Yes, small | BUILD: tappable https links, no preview fetch |
| Quiet hours on social pushes | Garmin/Strava honour do-not-disturb | Device-local only; server pushes cannot see them (SD-15a) | Yes | BUILD: quiet-hours projection on `notification_preferences`, held pushes become in-app |
| Message badge | Every competitor separates messages from activity | One dot for everything | Yes, small | BUILD: message count separate from activity in the Hub header and Today |
| Gym finder, branch identity, radius, add gym | JEFIT nearby gyms; none has a canonical directory | Built this campaign | No | KEEP |
| Gym information (opening hours, facilities) | Google-backed apps show hours | Name, town, postcode, brand, type; no hours | No; not a training-partner need and no licensed source | REJECT |
| Feed lens by gym or place | Strava club feeds | Following and Discover, chronological | Not at this density | DEFER by ruling (judgement §6, 1,000+) |
| Reactions variety, replies, mentions, saves | Hevy, Strava | One reaction, flat comments | No; engagement volume is not the goal | KEEP |
| Programme sharing and discovery | Boostcamp, Hevy | Snapshots, Discover, Adapt, People on this programme | Wrong model for Volyume | REMOVE (founder rule) |
| Web previews for non-users | Hevy routine pages | Static pages for profile and story; programme page retired with the layer; store id placeholder | Placeholder only | KEEP; store id is a founder-side value when iOS ships |
| Media | Everyone | None; model written | Founder decision unchanged | DEFER (founder) |
| Groups | Strava clubs | Dimension pages anchor gym and place | Not at this density | DEFER by ruling |
| Challenges, leaderboards, live presence | Strava | Rejected | No | REJECT (stands) |
| Integrations (Strava, wearables) | Strava everywhere | None in Community | Not for the partner proposition | REJECT for Community |

## 2. Programme-social removal
Removed from the client and retired on the cloud (migration 164, additive:
EXECUTE revoked on every programme RPC, programme signal removed from
find_people, suggested_people and the dimension page, `programme_used`
notification kind retired, `p` deep link lands on Community, the
`programme` branch removed from community-public). Tables stay in place
holding no rows (they went live today with no users). The personal
training-plan system is untouched; the story kind "programme" (a person's
own plan start) stays because it is personal activity, not sharing.

## 3. Build record
(filled as lanes land)

## 4. Founder redirection (chat, 2026-09-07): progress and consistency, not programmes
Community is for seeing each other's progress and consistency: who at my
gym trained this week, who trained the most, the most consistent weeks.
Rankings use sessions completed and consistency only (sessions this
week and month, weeks hit in a row, planned sessions completed), NOT
weight lifted or volume (founder narrowed this explicitly). This
reverses the SD-12/SD-29 rejection of person-to-person ranking for
these metrics only. Assumptions stated to the founder and standing:
training data only, never bodyweight or food; a person appears on a
board only by opt-in; boards are withheld under calm mode or an open ED
flag; minors never appear. Research `50`, recon `51`, design and build
follow in section 5.
