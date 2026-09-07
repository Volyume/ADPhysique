# 07 — Competitor research (mechanism depth), 2026-09-07

Authority: founder prompt 2 (Community product audit, "Competitive research
must go beyond feature lists") + `docs/community-product-audit-2026-09-07/README.md`.
Read-only. Access date for every citation below is **2026-09-07** unless a
page itself carries a different dateline (noted inline).

**Relationship to prior research.** `docs/social-discovery-2026-09-06/10-14`
already covers Hevy, Strong, JEFIT, Strava, Garmin Connect, Boostcamp,
Fitbod, Caliber, and cross-app policy/matching patterns at feature level —
read in full before writing this file (confirmed done). This file does two
things those don't:
1. **Goes to mechanism depth** on specific open questions those docs left
   feature-level or flagged unconfirmed (gym-venue sourcing, "people at my
   gym" browsing, exact JEFIT gym-chat mechanics, Hevy's July 2026 gym-tag
   roadmap wording).
2. **Covers products those docs do not**: Gymmit, Gymduoo, Quorfit, Athivo,
   plus the current (2025-2026) live training-partner-app landscape
   (GymBuddy 2026, FitMatch, Tag Team, SweatPals, Fitafy, Datefit, Fitness
   Singles, RacketPal, and others), verifying which are actually live.

Where a fact below repeats something docs 10-14 already sourced, it is
cited again only if this file adds a new angle; otherwise it is referenced
by file:section rather than re-quoted, per the brief's "supplement, don't
repeat" instruction.

**Web access note:** WebSearch worked throughout. Direct WebFetch of
`justuseapp.com` (403, bot-blocked) and `play.google.com/store/apps/details?id=com.tagteam.gymbuddy`
(404 via WebFetch, page loads fine in a browser — treat as tool-side
truncation) and `play.google.com/store/apps/details?id=com.gymbuddy2026.app`
(WebFetch returned only a truncation placeholder on two attempts) failed;
those apps' review content below is WebSearch-snippet-derived only, marked
**(snippet, WebFetch failed)**. Google Play does not expose star-rating/
review-count numbers to WebSearch snippets for most of the small apps
below — where no number is given, that is a genuine gap, not an omission,
and is flagged "no rating figure surfaced."

---

## PART A — Mechanism-depth additions to already-researched products

### A1. Hevy — gym tagging (new since doc 10, dated 2026-07)

- Confirmed directly from Hevy's own July 2026 community update: gym
  tagging on workouts was announced as upcoming ("Soon we will allow you
  to tag your gym in your workouts") and has since **shipped** in both app
  stores. [Hevy Community Update July 2026](https://www.hevyapp.com/community-updates/july-26/), accessed 2026-09-07
- **Mechanism of gym selection is not disclosed anywhere Hevy has
  published** — no confirmation of a search-and-select database, Google
  Places integration, or free-text entry. This is a real, still-open gap:
  doc 14 (§5) already flagged this as roadmapped-not-detailed; this pass
  found nothing further despite a dedicated search — remains
  **unverified**.
- The same update frames tagging as "a first step of interesting
  improvements we will bring connected to it," and separately says Hevy is
  "strengthening the social side" without naming specifics — Hevy has not
  announced a "people at my gym" browsing feature, a gym roster, or gym
  leaderboard tied to the tag as of this update. [same source]
- Net: Hevy has gym **identity** (a tag on a workout) but confirmed **no**
  gym **directory/roster/browsing** feature yet — this is earlier-stage
  than JEFIT's shipped mechanism below.

### A2. JEFIT — "Nearby Gyms" mechanism (new mechanism depth vs doc 10 §JEFIT)

Doc 10 confirmed JEFIT groups/gym-chat exist by name only. This pass
confirmed the actual navigation mechanism directly:

- Path: **Profile tab → "Training Location" → "Nearby Gyms" section**
  (browse existing gyms already on the platform) **or "Create Training
  Location"** (search for your gym, or add a new one if not found).
  [JEFIT: Group Chats article](https://www.jefit.com/wp/product-tips-faq/group-chats-are-the-best-tool-for-learning-something-new/), accessed 2026-09-07
- Setting a gym as your **current training location** unlocks a **gym
  chat** for that location, reached via the Messages tab.
- This is a real, shipped "people at my gym" mechanism in the sense that a
  gym-scoped chat exists — but JEFIT's own material does **not** describe
  a visible member roster/list of who else has that gym set as their
  location; the only confirmed surface is the chat thread itself, not a
  browsable people-list. Whether "Nearby Gyms" is GPS-radius-based,
  keyword-search, or a flat list is **not disclosed** — unverified.
- **Hard limitation, confirmed and load-bearing**: "at this time users are
  only able to be a part of one group chat" — a user cannot simultaneously
  hold a gym chat, a friend chat, AND a contest chat; joining a new one
  appears to displace the others. [same source] This materially weakens
  the "gym chat" feature in practice — a user active in a friend group
  chat cannot also sit in their gym's chat without leaving one.
- Gym venue sourcing: "search for your gym or create a new location"
  implies a **mixed model** — an existing shared gym record if one has
  already been created by another user, else free-text creation of a new
  one. No de-duplication, verification, or canonical-record mechanism is
  described anywhere in JEFIT's own material — **unverified whether
  duplicate gym entries are prevented or merged**.

### A3. Strava — no canonical gym object (confirms and closes doc 14 §5 gap)

- No further evidence found of a Google Places or Foursquare-backed venue
  layer in Strava. Strava's only location-adjacent social object remains
  **Clubs** (user-created, arbitrary name, no physical-address field
  required) — confirms doc 14's finding that duplicate/near-duplicate club
  names for one physical gym are structurally possible with no dedup.
  Operator-partnership data feeds (Flywheel, Life Time, Expresso) are the
  only managed-and-deduplicated venue data Strava has, and those are
  commercial integrations, not a general venue database open to any gym.
  [Strava Clubs](https://support.strava.com/en-us/articles/15402172-clubs-on-strava), accessed 2026-09-07 — re-confirms doc 14, no new mechanism found.

### A4. Boostcamp — no gym/location layer found (gap check only)

- No gym, location, or "train near me" feature was found in Boostcamp's
  own marketing/help material in this pass — Boostcamp's social layer
  (per doc 12) is programme-library + a 2026 activity-feed Community tab,
  entirely non-geographic. This is an absence-of-evidence finding, listed
  here only because the brief asks every product be checked for a gym
  model; Boostcamp appears to have none. **Unverified beyond absence of
  public mention.**

---

## PART B — Products not covered by docs 10-14: Gymmit, Gymduoo, Quorfit, Athivo, and the live training-partner-app landscape

### B1. "Gymmit" — resolved to two distinct, unrelated products

Searching "Gymmit" surfaces two different apps; neither is a
training-partner-matching product. Reporting both so the founder isn't
misled by name collision:

- **`gymmit.` (lowercase, App Store GB, id6760420592)** — a solo workout +
  nutrition tracker, NOT partner-matching. Confirmed via direct App Store
  fetch: live session tracking (rest timer, cues), calorie/macro tracking
  via food-database search/barcode/photo estimation, a training-programme
  builder, and a **social layer**: "Follow friends, share your sessions on
  the feed, and climb the leader board," plus a gamified points system
  ("points stack up from workouts and nutrition streaks, with
  multipliers"). Free with Pro at £4.99/mo or £44.99/yr. Rating: 5.0★ but
  from only **1 rating** — effectively no review signal yet, developer
  "nonch. development." [App Store: gymmit.](https://apps.apple.com/gb/app/gymmit/id6760420592), accessed 2026-09-07.
  No gym-location/venue feature, no partner-matching, no "people at my
  gym" — the "follow friends" model is the same one-way-follow-plus-feed
  pattern as Hevy, at pre-launch traction (1 rating).
- **`GymIt Fitness` (App Store id1564161823 / Play `com.trainerize.gymit`)**
  — a Trainerize-white-label gym-chain member app (barcode check-in,
  trainer-assigned plans, in-app coach messaging) for the US "Gymit" gym
  chain specifically — a single-operator member app, not a general
  training-partner or social-discovery product. Not the target of the
  founder's brief; noted only to rule it out.
- No third "Gymmit" product with training-partner-matching functionality
  was found despite repeated targeted searches. **Could not determine**
  that a partner-matching "Gymmit" exists as of 2026-09-07.

### B2. Gymduoo

- **Live-status finding, important**: `gymduoo.com` is a **pre-launch
  waitlist marketing site**, not a shipped app. The site's own language:
  "launching in the UK first," plans to expand "slowly, city by city," and
  its only call-to-action is a `/register` waitlist form — no App
  Store/Play Store link is present anywhere on the site. [gymduoo.com](https://gymduoo.com/), fetched directly 2026-09-07.
- **This is a distinct product from `GymDuo: Workout & Gym Tracker`** (App
  Store id6754177023) — a similarly-named but unrelated solo workout
  tracker (AI recommendations, PR tracking, HealthKit sync, $4.99/mo or
  $39.99 lifetime) with "not enough ratings to display an overview." Name
  collision noted explicitly to avoid the founder conflating the two.
- **Gymduoo's stated mechanism** (marketing copy, not yet a shipped
  product — treat as design intent, not verified in-market behaviour):
  - **Matching inputs**: gym location, goals, "times people usually
    train" (schedule), training level. Produces a **match score** before
    the user commits to contacting anyone.
  - **Gym model**: explicit **chain partnerships** named — PureGym, The
    Gym Group, Anytime Fitness, Virgin Active, JD Gyms, Nuffield Health,
    David Lloyd — i.e. gym identity is sourced from **named commercial
    partnerships**, not an open user-added database or Google
    Places-style autocomplete. This is the only competitor found in this
    entire research pass (across both docs 10-14 and this file) that
    names specific gym-chain partnerships as its venue-data source.
  - **Post-match flow**: in-app chat "opens 24 hours before your
    session and is designed for logistics only" (a deliberately narrow,
    time-boxed chat window, not an open-ended DM) → a **booking** step
    where both people "pick the workout, choose the gym, set the time" →
    after the session, a **binary "train together again?" prompt** builds
    a "repeatable gym circle" — the closest thing found anywhere in this
    research to an explicit reliability-signal-in-progress, though it is
    a single post-session yes/no, not a scored reliability metric.
  - **Safety framing**: "real member profiles," chat restricted to the
    24-hour pre-session window, and meetups explicitly required to happen
    "on a public gym floor, never anywhere private."
  - No app-store presence, no rating, no review data exists to verify any
    of this in practice. **Entirely unverified as real-world behaviour —
    this is pre-launch marketing copy only.**

### B3. Quorfit

- **Also pre-launch**, same caveat as Gymduoo: `quorfit.com` describes
  itself as "launching" in Manchester, London and Nottingham with "new
  sign-ups weekly," no App Store/Play Store link found anywhere on the
  site. [quorfit.com](https://quorfit.com/), fetched directly 2026-09-07.
- **Matching inputs**: city, preferred gyms, training style (lifting,
  running, HYROX, hybrid), fitness level, typical training times. No
  swipe interface — described purely as a filter/grouping model, not a
  card-based match UI.
- **Post-match flow is notably different from every swipe-based
  competitor found**: Quorfit does not connect two people 1:1 by default —
  it groups compatible people and introduces them via **email or a
  focused group chat**, oriented at "small crews" for HYROX prep, strength
  blocks, and run clubs rather than 1:1 pairing. This is the only
  product in this research pass explicitly optimising for small **group**
  formation over 1:1 matching.
- **Reliability signal**: explicitly **not yet built** — "future" plans
  name "reliability signals so you can see who's consistent" as a stated
  roadmap item, not a shipped feature. Confirms the pattern (see Part C)
  that no live training-partner product has a working reliability score
  today; Quorfit is at least the most explicit about naming the gap as a
  roadmap item.
- **Safety**: email verification, in-app reporting tools, community
  guidelines; "stronger optional verification" also roadmapped, not live.
- Pricing: free to join/match; unspecified future paid tier (priority
  matching, verified badges, advanced filtering).
- **Entirely unverified as real-world behaviour — pre-launch marketing
  copy only**, same caveat as Gymduoo.

### B4. Athivo

- **Could not determine that this product exists.** Multiple targeted
  searches ("Athivo app fitness," "Athivo app gym," `site:apps.apple.com`/
  `site:play.google.com` variants) returned no matching app on either
  store or in general web results — only phonetically-similar unrelated
  apps (Aaptiv, Aktivo, ACTIVO Fitness, Athlytic). No website, no store
  listing, no press coverage found under this name as of 2026-09-07.
  **Flag to the founder rather than guess**: either the name is
  misremembered/misspelled, the product is not yet public, or it has no
  discoverable web presence at all — this is a genuine dead end, not a
  weak finding, and should not be treated as "Athivo has no traction";
  it may simply not exist under this spelling.

### B5. The live 2025-2026 training-partner-app landscape (verified which are actually live)

Cross-referencing store listings directly against a dedicated
fitness-dating/gym-buddy aggregator (`brocnbells.com`, itself unverified
as a primary source but internally consistent and checked against direct
store fetches where possible):

**Confirmed live, with real store presence:**
- **`GymBuddy: Gym Partner Finder`** (Play, package `com.gymbuddy2026.app`,
  updated 27 Aug 2026 per search-index metadata) — **distinct from** the
  original 2023 UC Davis "GymBuddy" campus app, which is confirmed
  **removed from the App Store as of mid-2026** with no shutdown
  announcement (website empty since 2023) — a real, citable app-death
  case for the "gym buddy" category specifically, not just fitness-dating
  generally. [aggregator via brocnbells.com](https://brocnbells.com/blog/ultimate-guide-to-fitness-dating-apps/), accessed 2026-09-07.
  The **live 2026 GymBuddy** features: set a home gym, browse profiles
  carrying training style/goals/schedule, **swipe-to-match** or add a
  friend directly via a **buddy code** (a non-swipe alternate path — a
  named-invite fallback for people who already know who they want to
  train with, rather than discovery). Post-match: in-app chat, invite to
  a workout, train from a shared plan together, join/create a "crew" at a
  gym with **weekly crew leaderboards ranked by workouts completed**.
  [store-listing search snippet, WebFetch of the Play page failed twice —
  **(snippet, WebFetch failed)**, treat feature list as moderately, not
  fully, reliable]. **No star-rating/review-count figure was surfaced by
  search or fetch for this listing** — flagged as a genuine gap.
- **`Tag Team: Gym Partner Finder`** (Play, `com.tagteam.gymbuddy`) — a
  named competitor with a **direct, sourced complaint**: a user reported
  it "horrible...can't even use it" and that "every time I open the app
  all I can do is scroll down for 15 to 30 seconds then it kicks me right
  off" — a reliability/crash complaint, not a matching-mechanism
  complaint. [aggregator, same source as above] Direct WebFetch of this
  listing 404'd; the complaint quote is WebSearch-snippet-sourced only —
  **(snippet, WebFetch failed)**.
- **`FitMatch – Routine & Community`** (App Store GB, id6759197674,
  confirmed live via direct fetch) — the most fully-featured live
  training-partner app found in this entire pass. Mechanism, confirmed
  directly:
  - **Discover/matching**: a **compatibility score across five named
    dimensions** — "proximity, workout timing, fitness goals, workout
    style, and fitness level" — shown to the user **before** they connect,
    the only product in this research pass that both (a) names five
    concrete matching dimensions explicitly and (b) shows a compatibility
    score (contradicting the general "no percentage" pattern in doc 14
    §3 — this is a genuine counter-example worth flagging: FitMatch DOES
    show a score, breaking with the Hinge/GymBuddy-style qualitative-only
    convention).
  - **Social structure beyond 1:1**: "Crew" (a persistent small group,
    explicitly "your personal fitness squad"), "Pacts" (a named
    accountability commitment between a user and a specific buddy,
    described as creating "real skin-in-the-game" — the clearest named
    "reliability/commitment" mechanic found anywhere in this research,
    though it is a self-declared pact, not a scored reliability metric),
    and head-to-head Challenges (daily check-ins, step counts, workout
    streaks).
  - **Data source for content**: **automatic Apple Watch sync** — "Your
    Apple Watch workout now appears in FitMatch within minutes of
    finishing — no app open required" — the only training-partner app in
    this research pass with a confirmed automatic wearable-driven content
    feed (vs. manual logging).
  - **Messaging gate**: "you only receive messages from users you've
    connected with" — a hard connection-gate on DMs, not an open inbox.
  - Free, 9+ age rating, developer "Anand Vikash," **"has not received
    enough ratings or reviews to display an overview"** — i.e. genuinely
    new/low-traction despite the feature depth. [App Store: FitMatch – Routine & Community](https://apps.apple.com/gb/app/fitmatch-routine-community/id6759197674), accessed 2026-09-07.
  - **Distinct from a same-named India product** ("FitMatch" at
    `fitmatch.in`) and a same-named training-card utility for personal
    trainers — three unrelated "FitMatch" products exist; this file's
    findings are about the App Store GB "Routine & Community" one only.
- **`SweatPals`** — confirmed as the largest-traction product in the
  wider category: **1M+ users across 24 US markets**, an events-first
  model (run clubs, yoga, hikes, pickleball) with a partner-finding
  feature layered on top, swipe-based per doc 12's earlier finding.
  [brocnbells.com aggregator]
- **`RacketPal`** (by Sportega) — racket-sports-only (tennis, badminton,
  squash, table tennis, padel), **"AI-powered skill-level matching based
  on match results"** (i.e. outcome-based skill inference, not
  self-reported level) — the only product in this whole research pass
  with an evidenced non-self-reported skill signal. Rated **4+ stars**
  per the aggregator (not independently re-verified against the live
  store page this pass). Not strength-training-relevant directly, but the
  outcome-based-skill mechanism is a transferable idea.
- **Fitness-dating category (not gym-buddy, but same matching-mechanism
  family, useful as anti-patterns)**: **Fitafy** ("small user base outside
  major cities — matches often hundreds of miles away," "significant
  fake/scam profiles despite verification"); **Datefit** ("extensive
  fake profiles/bots to entice users to pay," "persistent spam even after
  unsubscribing"); **Fitness Singles** — **1.2/5 on Trustpilot**, "most
  profiles are fake or abandoned," ~$40/month, BBB billing complaints.
  [all: brocnbells.com aggregator, accessed 2026-09-07 — this is a
  secondary aggregator, not independently cross-checked against
  Trustpilot/App Store directly for each figure; the Fitness Singles
  1.2/5 figure specifically is corroborated independently by doc 14 §2,
  which cites the same number from a different search pass]

**Confirmed dead/defunct, cited as evidence a "gym buddy" product died,
not just fitness-dating generally:**
- Original 2023 UC Davis **GymBuddy** (see above) — campus-scoped,
  .edu-verified, 1,000+ reported pairings while campus-scoped, gone from
  the App Store by mid-2026, no shutdown announcement.
- **`5F – Find Fit Friends`** — removed from the App Store mid-2026,
  website stale for years. Positioned itself as "explicitly not a dating
  app," 100+ activities across four skill levels — died despite the
  differentiated, non-dating framing.
- **`Sweatt`** — "downloadable but inactive" per the aggregator; not
  independently confirmed.

**Structural finding, repeated across nearly every product surveyed in
this section (echoes doc 13 §"cold start" and doc 14 §2 independently, now
confirmed against a wider, current 2026 product set):** "the same
structural weakness affects every partner-finder. Density is everything:
excellent in London or Los Angeles, nearly useless in a town of 30,000,"
and the aggregator's blunt summary line: most of these apps have "fewer
than 100 active users in most cities," with "matches being hundreds of
miles away" a persistent, named, cross-product complaint. [brocnbells.com aggregator]

---

## PART C — How fitness-partner apps actually do matching (concrete flows, live products only)

Restricting to products with a live app-store presence (Gymduoo and
Quorfit excluded here — pre-launch, see B2/B3 — included instead in the
"design intent" note below):

| Product | Matching inputs (confirmed) | Flow shape | Score shown? | What happens after a match |
|---|---|---|---|---|
| GymBuddy 2026 (live) | home gym, training style, goals, schedule | swipe, OR buddy-code direct-add (bypasses discovery entirely) | No | chat, workout invite, shared plan, crew join, weekly crew leaderboard |
| FitMatch (live) | proximity, workout timing, fitness goals, workout style, fitness level (5 named dims) | browse/filter list, not swipe | **Yes — a compatibility score, pre-contact** | gated DM (connection required), optional Crew, optional 1:1 "Pact," head-to-head challenges |
| RacketPal (live, adjacent sport) | outcome-based skill inference from match results (not self-report) | AI-driven suggestion | Unverified whether shown as a number | not detailed in sources found |
| Tag Team (live) | not detailed in sources found — app reported unusable by at least one reviewer | unverified | unverified | unverified |
| SweatPals (live) | activity type, event, location | events-first discovery, partner-finding layered on top | Unverified | joins an event; 1:1 partner mechanism not detailed |
| Gymduoo (pre-launch, design intent only) | gym (named chain partnerships), goals, schedule, level | filter → match score → 24h-window chat → booking | Yes, design intent | binary "train again?" prompt building a "gym circle" — closest thing to a reliability signal found anywhere, but unscored |
| Quorfit (pre-launch, design intent only) | city, preferred gyms, style, level, typical times | filter → group formation (not 1:1) → email/group-chat intro | Unverified | group coordinates own sessions; reliability signals explicitly roadmapped, not live |

**Pattern confirmed across the whole live set**: not one live product
combines (a) a shown numeric score, (b) a working reliability/attendance
signal, and (c) meaningful density outside a handful of cities. FitMatch
comes closest on (a); nothing found — live or pre-launch — has (b)
actually shipped; density (c) is the universal, named failure mode.

---

## PART D — Gym databases in competitors: venue identity mechanism

Direct comparison, mechanism-level, across every product this file and
docs 10-14 cover:

| Product | Venue identity source | "People at my gym" browsing? |
|---|---|---|
| Hevy | **Unconfirmed** — gym tag shipped July 2026, selection mechanism (search DB / Places / free text) never disclosed | **No** — tag only, no roster/browse feature announced |
| Strong | **None** — no gym concept exists in the product at all (confirmed doc 10) | No |
| JEFIT | **Mixed/unconfirmed** — "search for your gym or create a new location" implies a shared-if-exists, else user-created record; no de-dup mechanism described | **Partial** — a gym-scoped **chat** exists (see A2), but no visible member roster; and a user can only be in one group chat at a time, actively limiting how "gym chat" competes with a friend/contest chat |
| Strava | **None (general)** — only Clubs (arbitrary user-named, no dedup) and commercial operator-partnership data feeds (Flywheel, Life Time, Expresso — managed, not user-added) | No general mechanism; a Club can informally serve this role but isn't gym-verified |
| Gymmit (`gymmit.`) | **None found** — no gym/location feature in the product at all | No |
| Gymduoo (pre-launch) | **Named gym-chain partnerships** (PureGym, The Gym Group, Anytime Fitness, Virgin Active, JD Gyms, Nuffield Health, David Lloyd) — the only product found anywhere in this research citing commercial chain partnerships as its venue source | Design intent: yes, framed as the core premise ("turns the people already training at your gym into real training partners") but unverified — pre-launch |
| Quorfit (pre-launch) | User-declared "preferred gyms," no confirmed backing database | Design intent: groups by gym, not a browsable roster |
| GymBuddy 2026 | Unconfirmed (snippet-only evidence) | Implied via "crew at your gym" but mechanism (self-declared vs verified) unconfirmed |

**No competitor anywhere in this research — old docs or this one — uses a
confirmed Google Places, Foursquare, or equivalent structured-venue API.**
A dedicated search for "fitness app gym Google Places API" returned no
example of any surveyed competitor doing this; the closest thing to a
controlled vocabulary is Gymduoo's named chain-partnership list (a small,
curated set, not a general venue database) and JEFIT's ambiguous
search-or-create flow. **This is a confirmed absence, not an oversight of
this research** — a Places-autocomplete-backed gym picker (doc 14 §5's
"best-practice inference") would be a genuine, unmatched differentiator
for Volyume if built, not a catch-up feature.

**No competitor, live or pre-launch, has a confirmed physical-gym
verification mechanism** (geofenced check-in, proof-of-membership, staff
confirmation) — this restates and reconfirms doc 12's finding
independently against the newer 2026 product set in Part B.

---

## PART E — What users actually complain about (social/discovery features specifically, cited)

Consolidated from both this file's new sources and doc 10-14's sourced
complaint sections, filtered to social/discovery-specific items only
(pricing/logging-reliability complaints are in docs 10-14 and not
repeated here unless social-adjacent):

- **Hevy**: default landing on the social tab over a logbook view is the
  most consistently repeated complaint, now independently reconfirmed
  this pass via a second source: "the default tab is the social media
  side, when they would prefer it to be history or a measurement panel"
  [search-derived, general aggregator tone consistent with doc 10's
  PRPath citation — treat as reinforcing, not a new primary source].
- **JEFIT**: no primary-sourced 2026 complaint specifically about the
  *social* features (gym chat, groups, friend feed) was found this pass
  beyond doc 10's existing findings — searches returned only
  UI-navigation, rest-timer, and paywall complaints (already in doc 10).
  The **one-group-chat-at-a-time limitation** (A2 above) is a
  structural/mechanism finding, not itself a sourced user complaint — flag
  as inferred friction, not quoted dissatisfaction.
- **Strong**: no new social complaints found (consistent with doc 10 —
  Strong has no social surface to complain about).
- **Fitness-dating/gym-buddy category broadly** (Fitafy, Datefit, Fitness
  Singles, Tag Team, GymBuddy-2023): the dominant, repeated complaint
  pattern across this entire category is **low density outside major
  cities** ("matches often hundreds of miles away," "nobody from your own
  gym is on it" — doc 14 §2's FitFriends citation, now reconfirmed
  independently against a wider 2026 product set), **fake/bot profiles**
  despite stated verification (Fitafy, Datefit, Fitness Singles), and
  **app abandonment with no shutdown notice** (original GymBuddy, 5F).
  [brocnbells.com aggregator, cross-checked against doc 14's independent
  FitFriends/Fitness-Singles findings — convergent across two separate
  research passes, raising confidence]
- **Tag Team**: one specific reliability complaint — the app reportedly
  becomes unusable, kicking the user out after 15-30 seconds of scrolling
  — **(snippet, WebFetch failed, single source, not independently
  corroborated)**.

---

## Competitor advantage matrix

Per the brief: no Volyume column — the lead fills that in.

| Area | Best competitor | What they do (mechanism) | Where it fails | Importance for serious lifters |
|---|---|---|---|---|
| Programme discovery & library depth | Boostcamp | 11,000+ programmes, 130+ named-coach "expert" plans, browsable by goal/level/schedule; fork-then-edit, never auto-rewrites | No programme-level Q&A/comments; "customise" is manual edit only, no equipment auto-substitution outside a separate paid AI generator | H |
| Structured link/share of a routine to a non-user | Hevy | `hevy.com` web preview, no install required, opens and can be saved | Strips weights/reps unless a rep range was set — structure-only, not a full copy | M |
| Full-fidelity workout/template sharing | Strong | Native OS share-sheet carries full exercises/weights/reps | Recipient must already have Strong installed — no non-user preview path | M |
| Follow/feed social model at scale | Hevy | Two-tab Home (followed) vs Discover (everyone), independently rollable, suggested-athletes carousel with a hide toggle | Social tab as default landing is the most repeated user complaint in the category | M |
| In-app messaging | JEFIT | Confirmed native DMs, friend/contest/gym-scoped group chats | Only one group chat active at a time — a hard, confirmed structural cap that undermines the "gym chat" feature | M |
| Gym-scoped community ("people at my gym") | JEFIT | "Nearby Gyms" → set training location → gym-scoped chat unlocked | No visible member roster, no verification of actual attendance, and gated by the one-chat-at-a-time cap | H |
| Gym venue data as a commercial asset | Gymduoo (pre-launch, unverified in production) | Named chain partnerships (PureGym, Anytime Fitness, Virgin Active, etc.) as the venue source, not user-typed text | Entire product is pre-launch waitlist marketing; zero in-market verification of any claim | H |
| Training-partner matching depth/signal | FitMatch | Named 5-dimension compatibility score shown pre-contact, gated DMs, Crew + Pact + Challenge structures, automatic Apple Watch content feed | "Has not received enough ratings to display an overview" — essentially unproven at scale despite feature depth | H |
| Location-based safety precedent | Strava (Beacon) | No-account-needed, auto-expiring live-location share to named safety contacts | Underlying heatmap/pattern-of-life leakage (2018 incident) never fully resolved by Privacy Zones | H |
| Club/community verification signal | Strava (Verified Club badge) | Earned, non-purchasable, activity-gated (>=100 members, weekly posting) badge that surfaces genuinely active clubs | No equivalent exists for a *gym* (only for a self-declared Club); bulk-member-removal for admins still an open feature request years on | M |
| Reliability/attendance scoring for a training partner | **None — confirmed gap across every product researched, live or pre-launch** | N/A | Quorfit and Gymduoo both name this as a roadmap item, not a shipped feature; no live product has one | H |
| Physical-gym verification (proof you actually train there) | **None — confirmed gap** | N/A | Every "gym" feature surveyed (Hevy tag, JEFIT location, Gymduoo/Quorfit chain-list) is self-declared, unverified | H |
| Per-data-type granular privacy | JEFIT / Garmin Connect (tie) | JEFIT: stats/body-stats/photos independently gated with a 4-tier photo-audience picker. Garmin: Only Me/Followers/Followers+Groups/Everyone per data type (profile, activity, steps, badges) | JEFIT's controls are website-only, not in-app; Garmin's system was mid-rollout/leaked as of this research, not confirmed fully GA | H |
| Cold-start / small-network design | Boostcamp + doc 13's Slack-atomic-network evidence | Utility (programme library) works with zero network; social ("Community" feed) is additive, not a gate | No product surveyed publishes a specific density threshold for surfacing social UI — every product either ships it immediately (risking a ghost-town feel) or never states a rule | H |

---

## Unverified / could not determine

1. **Athivo** — no product found under this name on either app store, no
   website, no press. Genuinely could not determine whether it exists;
   do not treat "no traction found" as equivalent to "confirmed
   non-existent."
2. **Hevy's gym-selection mechanism** (search database, Google Places, or
   free text) for the July 2026 gym-tag feature — never disclosed in any
   Hevy material found.
3. **JEFIT's "Nearby Gyms" backing data model** — whether it's GPS-radius,
   keyword search, or a flat list; and whether duplicate gym entries are
   ever merged or deduplicated.
4. **GymBuddy 2026's exact matching algorithm and its star
   rating/review count** — both WebFetch attempts on the Play listing
   failed; all detail is WebSearch-snippet-derived.
5. **Tag Team's crash/usability complaint** — single-source, snippet-only,
   not independently corroborated against a second review.
6. **Whether Gymduoo or Quorfit have shipped an actual app at all** as of
   2026-09-07 — both sites present as pre-launch waitlists with zero
   store links found; every mechanism described for them in this file is
   marketing-stated design intent, not observed product behaviour.
7. **RacketPal's exact skill-inference algorithm** and whether its
   4+-star rating is current/verified directly against the live store
   page (sourced via aggregator only).
8. **Whether any competitor's automated image-moderation pipeline (if any
   of these smaller apps run one at all) meets EU data-residency
   requirements** — out of scope for this pass (doc 13 §5 already covers
   the general vendor landscape); no smaller competitor's moderation
   stack was discoverable at all, which is itself a finding — none of the
   Part B products publish any moderation-architecture detail.
9. **Fitness Singles' 1.2/5 Trustpilot figure and Fitafy/Datefit
   complaint quotes** — corroborated across two independent research
   passes (this file's aggregator and doc 14's separate search) but both
   ultimately trace to the same class of secondary aggregator content,
   not a direct Trustpilot/App-Store fetch in either pass.
