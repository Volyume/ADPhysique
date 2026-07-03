# Competitor Teardown: Hevy (followers, shared workouts, kudos)

Category: fitness (strength-training workout logger with a built-in social layer).
Research phase, READ-ONLY. Source-confidence tags applied to every claim:
`[OBSERVED]` = seen directly in-app during this research pass (not possible here —
no hands-on access was performed in this session; see note below), `[DOCUMENTED]`
= public source cited, `[INFERRED]` = reasoned hypothesis, flagged as such.

**Note on OBSERVED tag**: this teardown was produced via web research only (help
centre docs, feature pages, founder interviews, review mining) — no direct
hands-on app walkthrough was performed in this pass. Nothing below is tagged
`[OBSERVED]`; the Hevy help-centre/feature-page descriptions are treated as
`[DOCUMENTED]` (official first-party source, cited) rather than upgraded to
`[OBSERVED]`. Any synthesis session that wants OBSERVED-grade confidence on
specific flows (follow-request UI, block flow, empty states) should do a live
device walkthrough — this doc tells you exactly which claims still need it.

---

## 1. The connection / belonging mechanic(s) — step by step

Hevy layers several distinct mechanics on top of one social graph:

1. **Follow** — one user follows another (asymmetric, Twitter/Instagram-style,
   not a mutual "friend" request unless the target account is private).
   `[DOCUMENTED]` — help.hevyapp.com Social Guide, via search extraction.
2. **Home feed** — a reverse-chronological feed of workouts posted by people
   you follow: session name, optional description, duration, training volume,
   PR count, optional average heart rate (from a paired wearable), optional
   photos/video (up to 3 photos, or 2 photos + 1 video). `[DOCUMENTED]` —
   hevyapp.com/features/content-feed/.
3. **Kudos-equivalent: likes + comments** — under each feed post, users can
   like the workout and leave a text comment; comments can contain clickable
   links; users can like/reply to individual comments. `[DOCUMENTED]` —
   hevyapp.com/features/social-features/, content-feed/.
4. **Discovery feed** — a second feed tab ("Discover") surfaces recent
   workouts from people the user does *not* follow, i.e. algorithmic stranger
   surfacing, plus a "suggested athletes" carousel injected into the Home
   feed as the user scrolls. `[DOCUMENTED]` — hevyapp.com/features/discovery-feed/,
   content-feed/.
5. **Profile comparison ("Compare")** — from any *public* profile (no follow
   required), a user can open a head-to-head comparison screen: muscle-group
   volume split, workout count, training volume, time spent training, and
   exercises in common, over 30 days / 3 months / 1 year / all-time, with
   per-exercise side-by-side PR comparison. `[DOCUMENTED]` —
   hevyapp.com/features/workout-comparison/.
6. **Leaderboards** — ranks the user's best lift across 38 exercises against
   the people they follow ("friends"), surfaced under Profile > Statistics >
   Leaderboard Exercises. `[DOCUMENTED]` — multiple sources incl.
   hevyapp.com/features/social-features/.
7. **Routine/folder sharing** — a user can share an individual routine or an
   entire folder of routines as a link (in-app or external, e.g. WhatsApp,
   notes); recipients can import it as their own editable routine.
   `[DOCUMENTED]` — hevyapp.com Social Guide / "How to Share Workouts and
   Routines" help article (fetch blocked 403, corroborated by search-snippet
   extraction of the same article, so treat as `[DOCUMENTED]` with a lower
   confidence footnote: primary fetch of the help article itself failed with
   HTTP 403; the description is reconstructed from the search engine's own
   summary of that same URL, not an independent secondary source).
8. **Shareable stat cards** — auto-generated, brandable image cards (PR
   cards, monthly summary cards, muscle-distribution charts, "weight lifted
   equivalents", **active-streak cards**) that a user exports to Instagram
   Stories/feed or saves as an overlay for a gym photo/video, with
   light/dark/transparent background options. `[DOCUMENTED]` —
   hevyapp.com/features/shareable/.
9. **Invite mechanic** — invite via WhatsApp, Messenger, Facebook, X, phone
   contacts, or a generated link; entry point is a "+ Invite a friend" button
   above the suggested-athletes carousel. `[DOCUMENTED]` —
   hevyapp.com/features/social-features/, search-extracted onboarding detail.
10. **Strava auto-post** — completed workouts can auto-post to Strava, with a
    review/edit step before it goes out. `[DOCUMENTED]` —
    hevyapp.com/features/social-features/.
11. **Separate B2B layer: Hevy Coach** — a distinct paid product for
    trainers, not the consumer app's social graph, but relevant as a second,
    asymmetric connection unit (see §2/§9). A coach sees a client's feed,
    programme, stats, measurements, weight, body fat and progress photos in
    a dashboard, and can direct-message the client with video/image exchange.
    `[DOCUMENTED]` — hevycoach.com feature pages.

## 2. The unit — pair? group? roster? open network? size limits?

Primarily an **open, asymmetric follow network** (like Instagram/Twitter, not
like Strava "clubs" or WhatsApp groups) — anyone can follow anyone with a
public profile; no numeric follow/follower cap is documented anywhere found.
`[INFERRED]` (absence of a stated cap across help docs and reviews is weak
but suggestive evidence there isn't one; not confirmed).

A secondary, narrower unit exists inside **Hevy Coach**: a 1-to-many
**coach-roster** relationship (one coach, many clients) that is asymmetric
and permissioned (coach sees everything client logs; client does not see
other clients). `[DOCUMENTED]` — hevycoach.com.

A tertiary unit: **Hevy Coach Teams** — multiple coaches pooled under one
team, with full cross-visibility of every team member's programme library
(not client data specifics beyond what's stated). `[DOCUMENTED]` —
help.hevycoach.com "Create your Team", hevycoach.com/features/coaching-team/.

No evidence found of a "small group" / "squad" / capped-roster unit in the
*consumer* app (no clubs, challenges-with-a-fixed-roster, or capped-size
groups). `[DOCUMENTED]` (absence noted explicitly by a third-party comparison
piece: "features lacking from Hevy that competitors have implemented[:] group
messaging" — bitletics.com fitness-competition-apps roundup, 2026).

## 3. Symmetric or asymmetric? (the ranking-risk axis)

**Asymmetric by default, with an opt-in symmetric mode.**

- Public profile (default): anyone can follow, anyone can view workouts,
  anyone can open the Compare screen against you — **without you following
  them back and without you being notified of the comparison** (comparison
  only requires the target profile being public, not a mutual follow).
  `[DOCUMENTED]` — hevyapp.com/features/workout-comparison/: "So long as the
  user has a public profile, you can explore their workouts to compare
  specific exercises." This is the single highest ranking-risk finding in
  this teardown: a stranger can quietly benchmark themselves against you, or
  you against a stranger, with no consent step and (per the same source) **no
  documented opt-out short of going fully private.**
- Private profile (opt-in): follow becomes a request/accept gate,
  Instagram-style — asymmetric-follow-with-consent rather than symmetric
  mutual-friending. `[DOCUMENTED]` — hevyapp.com/help/how-to-make-a-profile-private/.
- Leaderboards are scoped to "your friends" (i.e. people you follow, or who
  follow you — exact scoping rule not found in any source) rather than
  global, which caps but does not eliminate ranking exposure.
  `[DOCUMENTED, scope ambiguous — INFERRED that it's follow-graph-scoped]`.

## 4. Data model — what's shared, what's withheld, confidence per field

| Field | Visible to followers (public profile) | Visible to strangers (public profile, no follow) | Confidence |
|---|---|---|---|
| Workout name/description | Yes | Yes (via Discover feed) | `[DOCUMENTED]` |
| Duration, volume, PR count | Yes | Yes | `[DOCUMENTED]` |
| Average heart rate (if paired wearable) | Yes | Unclear — likely yes, same feed rules | `[INFERRED]` |
| Photos/video attached to workout | Yes | Yes (public profile) | `[DOCUMENTED]` |
| Follower/following counts, bio, social links | Yes | Yes | `[DOCUMENTED]` |
| 3-month activity graph | Yes | Yes (profile page) | `[DOCUMENTED]` |
| Saved routines (as shareable templates) | Yes | Yes | `[DOCUMENTED]` |
| Muscle-split / volume / exercises-in-common comparison data | Yes | Yes (Compare works on any public profile) | `[DOCUMENTED]` |
| Best-lift leaderboard placement | Only among people in your follow graph | No | `[DOCUMENTED, scope inferred]` |
| Body weight, body fat %, circumference measurements, progress photos | Not part of the consumer social feed at all — these flow to a **coach dashboard** only under Hevy Coach, not to followers/strangers | N/A | `[DOCUMENTED]` — hevycoach.com client-management page; the consumer-to-consumer follow graph does not appear to expose body-metric fields anywhere in the sources found |
| Private/hidden individual workouts | Withheld entirely, even on a public profile, if the user marks a specific workout private before saving | N/A | `[DOCUMENTED]` — hevyapp.com/features/social-features/ |

Presentation: feed cards (chronological), profile pages (aggregate stats +
media gallery), a dedicated side-by-side Compare screen, and exported
image "shareable" cards for external social platforms.

**Relevant precedent for VOLYUME's share-card field-list discipline**: Hevy's
own shareable-card generator already excludes body weight/body-fat/measurement
fields from anything designed for external export (those live only in the
Coach dashboard, gated to an explicit coach relationship) — i.e. even Hevy,
which has no ED-safety mandate, drew a line between "training performance
data" (shareable) and "body data" (coach-only, never exported). That line
happens to land close to where VOLYUME's Article-9 share-card precedent
already sits. `[INFERRED]` synthesis of two `[DOCUMENTED]` facts above; the
alignment itself is an inference, not a stated Hevy design principle.

## 5. Every state + edge case found

- **Invite**: via WhatsApp/Messenger/Facebook/X/contacts/link;
  entry point is a dedicated "+ Invite a friend" affordance next to the
  suggested-athletes carousel. `[DOCUMENTED]`.
- **Follow (public target)**: immediate, no approval step. `[DOCUMENTED]`.
- **Follow (private target) → pending**: sends a follow request; target must
  accept before requester sees any profile content. `[DOCUMENTED]` — exact
  in-app pending/accept/decline UI (badge, notification copy, whether a
  declined request can be resent, whether the requester is told about a
  decline) was **not found in any source** — flag as an open question for a
  hands-on walkthrough.
- **Accept**: unlocks profile content and feed visibility for that follower.
  `[DOCUMENTED]`.
- **Decline**: mechanism exists implicitly (request/accept implies a
  decline path) but no source describes what the requester sees, or whether
  they can be told "declined" vs silently ignored. `[INFERRED]` gap.
- **Block**: available from the profile's three-dot menu ("Block User").
  Exact consequence (does blocking retroactively hide historical
  likes/comments? can a blocked user still see cached feed data? is blocking
  silent or notified?) — **not documented anywhere found.** `[DOCUMENTED]`
  that the control exists; `[INFERRED]`/unknown for its behaviour.
- **Report**: "Report User" exists in the same three-dot menu.
  No documented reporting taxonomy (spam / harassment / impersonation /
  explicit content categories), no documented moderation SLA, no documented
  outcome communication to the reporter. `[DOCUMENTED]` that the control
  exists; everything downstream is an evidence gap.
- **Unfollow**: available from the same menu; no confirmation-dialog detail
  found. `[DOCUMENTED]` existence only.
- **Leave/remove a follower**: not explicitly documented as a user-facing
  control (i.e. can *you* remove someone following *you*, versus only
  blocking them?) — gap.
- **Go private after being public**: toggle in Settings > Privacy & Social;
  the fetched help article does not state what happens to *existing*
  followers or previously public content at the moment of the switch (are
  existing followers grandfathered in, or does everyone get demoted to
  "must request"?). `[DOCUMENTED]` mechanism, **undocumented transition
  behaviour** — explicit gap, flagged.
- **Single-workout privacy**: a per-workout private toggle exists independent
  of overall profile visibility — the most granular privacy control found.
  `[DOCUMENTED]`.
- **Hide suggested users**: a dedicated toggle turns off the
  suggested-athletes carousel without going fully private. `[DOCUMENTED]`.
- **Empty state (new user, zero follows)**: not documented in any source
  found — what the Home feed shows a brand-new user with nobody followed
  yet (empty feed? forced onto Discover? prompted to follow suggested
  athletes?) is an evidence gap requiring hands-on walkthrough.
- **Offline**: workouts log fully offline and sync once reconnected
  (`[DOCUMENTED]` — Hevy Coach client-app help page, phrased for the
  coach-client context but describing the same underlying sync engine).
  Whether the **feed itself** is browsable offline from a local cache, or
  simply unavailable, is **not documented anywhere found** — explicit gap.
- **Expired invite links**: no expiry policy found in any source — gap.
- **Account deletion's effect on followers/social graph**: not documented in
  any source found — gap.

## 6. Safety / moderation scaffolding

- **Reporting**: "Report User" control exists (profile three-dot menu).
  `[DOCUMENTED]` existence; no taxonomy, SLA, or escalation path documented
  publicly.
- **Blocking**: "Block User" control exists in the same menu. `[DOCUMENTED]`
  existence; behaviour undocumented (see §5).
- **Identity checks**: none found. No age verification, no photo/selfie
  verification, no phone-number-required-to-be-visible gating found for the
  consumer social graph. `[DOCUMENTED absence]` (searched specifically; only
  hits were generic anti-fake-follower tooling for *other* platforms,
  nothing Hevy-specific) — treat as `[INFERRED]` that no such system exists,
  since absence-of-evidence is not proof, but it was searched for directly
  and nothing surfaced.
- **Harassment defence**: Terms & Conditions prohibit uploading content that
  is "unlawful, threatening, abusive, harassing, defamatory, libelous,
  deceptive, fraudulent, invasive of another's privacy" and content that
  "victimizes, harasses, degrades, or intimidates an individual or group... on
  the basis of religion, gender, sexual orientation, race, ethnicity, age, or
  disability." `[DOCUMENTED]` — hevyapp.com/app-terms-conditions/ (quoted
  verbatim by the fetch).
- **Moderation model**: Terms state Hevy "generally does not pre-screen,
  monitor, or edit" user-generated content, but reserves discretionary
  removal rights for content that "does not comply with these Terms" or is
  "harmful, objectionable, or inaccurate," and reserves account termination
  "without prior notice" for violations, with a commitment to cooperate with
  law enforcement. `[DOCUMENTED]` — same source, quoted verbatim. This is
  **reactive, discretionary, unstaffed-scale moderation language** typical of
  a small team (13 people as of 2026, per Latka) rather than a resourced
  trust-and-safety function — no dedicated moderation team, headcount, or
  response-time commitment found anywhere.
- **Stranger-surface risk**: the Discover feed and cross-profile Compare
  (§3) both expose users to/from strangers with **no moderation gate at the
  point of exposure** — the only defence is post-hoc report/block after
  contact has already happened (e.g. an unwanted comment). No pre-emptive
  filtering (e.g. keyword filters on comments, comment-permission settings
  restricting who can comment) was found documented.
- **No evidence found** (searched directly) of any publicised safety
  incident, harassment case, catfishing report, or fake-follower/bot problem
  specific to Hevy — either genuinely rare, or simply not surfaced in
  indexed sources. `[DOCUMENTED absence of coverage]`, not proof of absence
  of incidents.

**Net for VOLYUME's "mandatory safety/moderation/blocking model for any
stranger surface" constraint**: Hevy's Discover feed + open Compare is
exactly the shape of stranger-surface the constraint is written to prevent
shipping without a moderation model — and Hevy's own moderation model for it
is thin (report/block only, reactive, undocumented SLA). This is a clear
"what NOT to copy as-is" data point: the mechanic (discovery of and by
strangers) is popular and plausibly retentive, but the safety scaffolding
around it is the minimum viable, not a model to emulate wholesale.

## 7. Comparison / shame audit

Explicit ranking/comparison mechanics found, each marked:

- **Leaderboards (38 exercises, ranked against people you follow)** — RANKING.
  `[DOCUMENTED]`.
- **Cross-profile Compare screen, including against strangers with public
  profiles** — COMPARISON, no consent gate, no notification to the compared
  party. `[DOCUMENTED]`. This is the most exposed comparison mechanic found:
  it works on people who haven't agreed to be followed, compared, or even
  contacted.
- **Shareable "active streak" cards** — STREAK-PRESSURE-adjacent (external,
  optional, user-initiated export rather than an in-app forced streak
  counter/flame icon, but still normalises a streak as something worth
  publicising). `[DOCUMENTED]` — hevyapp.com/features/shareable/.
- **PR push notification vibration** ("I love that feeling when my phone
  vibrates because I've said a personal record" — App Store review, 2025)
  is positive-only reinforcement, not shame — no evidence found of Hevy
  notifying anyone about a *missed* workout, a broken streak, or being
  *outperformed* by someone they follow. `[DOCUMENTED, absence]` — searched
  directly for shame/guilt-adjacent notification copy and found none; this
  looks like a genuine design choice (positive-only social notifications)
  rather than an oversight, though it's `[INFERRED]` that it's deliberate
  since no source states the rationale.
- **Marketing testimonial framing** ("turned the gym into almost a game
  where I can collect ribbons and compete against my friends") is
  company-selected promotional copy, not organic/independent review
  evidence — flagged separately because it shows Hevy's own marketing leans
  into gamified competition framing even where the product mechanics
  (leaderboard, streak card) are opt-in and mostly non-forced. `[DOCUMENTED]`
  as a marketing artefact; treat as lower evidentiary weight than organic
  App Store/Reddit sentiment.
- **One organic negative signal found**: a 3-star App Store review
  (HappytoBow, 09/09/2023) — "since they don't have impressive figures or
  stats, the social sharing features are 'more or less a blah and sometimes
  a distraction'" — the closest thing to a comparison-fatigue complaint
  found in review mining, and it is mild (disinterest/distraction, not
  reported shame or anxiety).

**Transferable kernel, stripped of the ranking risk**: what people actually
credit (see §12-13) is *not* the leaderboard or the compare screen — it's
(a) low-friction visibility into what a specific person they already know is
training (accountability-by-visibility, not accountability-by-ranking), and
(b) frictionless routine/programme sharing from someone you trust (a coach,
a training partner, a "popular lifter"). The ranking and stranger-compare
layers are additive risk without matching evidence of being the retention
driver (see §11) — they appear to be present because they were easy to build
on top of an existing follow graph, not because review-mining shows people
asking for a leaderboard specifically.

## 8. Onboarding into the social feature

- Account setup asks onboarding questions first (goals etc., typical
  fitness-app quiz), before social is introduced. `[DOCUMENTED]` —
  himanshuprodesign.medium.com UX teardown (secondary source, treat as
  `[DOCUMENTED]` for structure, `[INFERRED]` for exact screen order since the
  teardown itself didn't quote screen-by-screen social onboarding).
- Once in the app, discovery of the social layer happens via: (a) a
  suggested-athletes carousel injected into the Home feed, (b) an explicit
  "+ Invite a friend" button next to that carousel, (c) a Discover tab
  reachable by tapping the grey "Home" button. `[DOCUMENTED]` — search-engine
  extraction of hevyapp.com's own social-features/onboarding copy.
  **Not found**: whether onboarding forces a "follow N people" or "sync
  contacts" step before reaching the main app (a common growth-hack pattern
  elsewhere) — the one UX teardown found explicitly says the reviewed
  onboarding does *not* surface social/follow features during setup at all
  ("the content does not mention social or follow features during
  onboarding" — Medium teardown, direct quote from the fetch), which
  contradicts a "forced follow" pattern and suggests social is opt-in,
  discovered post-onboarding rather than gated into it. Treat this as
  `[DOCUMENTED]` for that one reviewer's read of the flow, but not
  independently corroborated by a second source — flag for hands-on check.
- Founder framing (podcast interview) describes the social layer as
  something that "doesn't feel like it makes that much sense as a new
  user... but then you get into it" — i.e. Hevy's own founder frames social
  onboarding as intentionally *not* front-loaded, expecting it to click
  later once the user has some workout history to show and compare.
  `[DOCUMENTED]` — subclub.com podcast transcript extraction, direct quote.

## 9. Monetisation — free, paid, or a tier?

**Entirely free**, on both iOS and Android, across the follow graph, feed,
comments, likes, Discover, Compare, and leaderboards. Multiple independent
sources converge on this: "Hevy's leaderboards rank your best lift on 38
exercises against your friends... all for free" and "no social features
locked behind the paywall." `[DOCUMENTED]` — hevyapp.com feature pages,
corroborated independently by push-pull.app and sensai.fit pricing
comparisons.

Pro ($2.99–3.99/month, ~$24–36/year, or a lifetime option around $75) gates:
unlimited routines/history (free tier: 4 routines, 3 months history, 7
custom exercises), advanced analytics/chart types, an algorithmic programme
generator ("Hevy Trainer"/"HevyGPT"), custom exercise categories, and ad
removal — none of it social. `[DOCUMENTED]`, multiple sources.

**Strategic read**: the founder explicitly frames the free social layer as a
*growth* mechanism, not a monetisation one — the social graph is what
produces organic virality (word-of-mouth, invites, "little influencers"
forming inside the app), while Pro monetises the solo power-user surface
(routines, analytics, programming). `[DOCUMENTED]`/`[INFERRED]` blend: the
free-vs-paid split itself is `[DOCUMENTED]`; the strategic rationale
("social is for growth, Pro is for monetisation") is `[INFERRED]` from
founder quotes about pricing-for-word-of-mouth plus the observed feature
split, not a single stated sentence saying exactly that.

**Separate monetisation unit**: Hevy Coach is a distinct paid B2B product
($XX/month per coach, not researched in depth here as it's out of scope for
the consumer connection mechanic) that monetises the *coach-client* pairing
directly — i.e. Hevy has proven that a connection unit (coach-roster) *can*
be a paid tier, just not the consumer follow-graph.

## 10. Sources

- `[DOCUMENTED]` hevyapp.com/features/social-features/
- `[DOCUMENTED]` hevyapp.com/features/content-feed/
- `[DOCUMENTED]` hevyapp.com/features/discovery-feed/
- `[DOCUMENTED]` hevyapp.com/features/user-profiles/
- `[DOCUMENTED]` hevyapp.com/features/workout-comparison/
- `[DOCUMENTED]` hevyapp.com/features/shareable/
- `[DOCUMENTED]` hevyapp.com/features/trainer-platform/, hevycoach.com feature pages (client-management, personal-trainer-app, coaching-team, client-chat, client-app)
- `[DOCUMENTED]` hevyapp.com/app-terms-conditions/ (quoted verbatim via fetch)
- `[DOCUMENTED]` hevyapp.com/privacy-policy/ (partially — cookie/third-party retention detail only; full GDPR/health-data clauses not retrieved, page rendered mostly navigation to the fetcher)
- `[DOCUMENTED]` help.hevyapp.com Social Guide article and "How to keep my information private" article (both returned HTTP 403 to direct fetch; content reconstructed only from the search engine's own indexed summary of the same URLs — lower-confidence secondary reconstruction, flagged inline where used)
- `[DOCUMENTED]` hevyapp.com/help/how-to-make-a-profile-private/ (fetched directly, verbatim quote captured)
- `[DOCUMENTED]` getlatka.com/companies/hevyapp.com (2023 revenue/team-size figures)
- `[DOCUMENTED]` starterstory.com/hevy-breakdown ($160K MRR Nov 2024, growth-driver narrative, pricing)
- `[DOCUMENTED]` revenuecat.com/blog/growth/guillem-ros-hevy-podcast/ (founder quotes on social/network-effect retention, downloads trajectory, ad spend)
- `[DOCUMENTED]` subclub.com/episode/cultivating-organic-growth-with-viral-loops-guillem-ros-salvador-hevy (founder quotes on viral loops, community formation, K-factor)
- `[DOCUMENTED]` hevyapp.com/how-we-built-hevy/ (founding narrative, "follow their friends" as original inspiration)
- `[DOCUMENTED]` linkedin.com/posts/vasyl-sergienko (third-party claim of $800K MRR, undated precisely — "4 months ago" relative to an unspecified post date; treat as a single unverified third-party claim, not confirmed by Hevy directly)
- `[DOCUMENTED]` sensortower/search-engine-surfaced figures: ~9 million "athletes" as of 2026, ~400k monthly downloads and ~$600k monthly revenue estimate (Feb 2026 snapshot), 132% YoY in-app revenue jump Q3 2023 — all via search-engine summarisation of Sensor Tower data, not a direct Sensor Tower page fetch (the direct app.sensortower.com overview page was not successfully retrieved in full) — flag as secondary-sourced
- `[DOCUMENTED]` corahealth.app/blog/best-workout-tracker-reddit (200+-Reddit-thread synthesis piece, secondary source aggregating Reddit sentiment, not raw Reddit threads — Reddit itself (reddit.com) could not be fetched directly in this research session, which is a material gap; see §12)
- `[DOCUMENTED]` corahealth.app/compare/hevy
- `[DOCUMENTED]` App Store review quotes extracted via search-engine summarisation of apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 reviews (named reviewers, star ratings, dates included where available — see §12)
- `[DOCUMENTED]` repreturn.com/hevy-app-review/
- `[DOCUMENTED]` producthunt.com/products/hevy/reviews (review-quote extraction with named reviewers/dates)
- `[DOCUMENTED]` dr-muscle.com/hevy-workout-app-review/ (independent reviewer; explicitly did not cover social features)
- `[DOCUMENTED]` himanshuprodesign.medium.com onboarding UX teardown
- `[DOCUMENTED]` indiehackers.com Product Hunt launch post
- `[DOCUMENTED]` bitletics.com/blog/fitness-competition-apps/ (competitor gap analysis noting Hevy lacks group messaging)
- `[DOCUMENTED, attempted, failed]` trustpilot.com/review/hevy.com — direct fetch returned HTTP 403; only search-engine-summarised snippets available (2 reviews visible in index, low sample)
- `[DOCUMENTED, attempted, failed]` play.google.com Google Play listing — direct fetch truncated before reaching the review section; Google Play review mining for this teardown is therefore weaker than App Store review mining (gap, flagged in §12)
- `[DOCUMENTED, attempted, failed]` reddit.com — could not be fetched directly at all in this session (tool restriction); all Reddit-sourced sentiment in this document is secondary, via corahealth.app's synthesis of "200+ threads", not raw thread text. This is the single largest evidence gap in this teardown and should be patched by a session with direct Reddit access before being treated as fully settled.

---

## 11. Evidence it works

**Growing, not dead or plateaued**, on every trajectory signal found:

- Downloads: "single-digit downloads" at launch (2019/2020) → 2 million
  downloads over 4 years, with 1 million of those (50%) in a single 5-month
  window `[DOCUMENTED]` — revenuecat.com podcast interview with founder
  Guillem Ros.
- User base: ~9 million "athletes" as of 2026 per search-engine-surfaced
  Sensor Tower data `[DOCUMENTED, secondary-sourced]` — up roughly 4.5x from
  the ~2M downloads figure a few years prior (note: "downloads" and
  "athletes"/registered accounts are different units, so this is a
  directional signal, not an apples-to-apples multiple).
- Revenue: 2023 ARR ~$240K (Latka) → Nov 2024 MRR ~$160K (Starter Story,
  implying ~$1.92M annualised) → a third-party LinkedIn claim of $800K MRR
  "4 months" before an unspecified 2026 post date → Sensor Tower-derived
  ~$600K/month estimate as of Feb 2026. These numbers are **not from a single
  consistent methodology** (ARR vs MRR vs third-party claim vs
  platform-estimate) and should be read as "strongly up and to the right
  over 2023→2026" rather than a precise curve. `[DOCUMENTED, multiple
  secondary sources, methodologically inconsistent — flagged]`.
- Team: grew from 1 person to 13 people between 2023 and 2026 (Latka).
  `[DOCUMENTED]`.
- Q3 2023 in-app revenue was up 132% YoY. `[DOCUMENTED, secondary-sourced
  via search summary of Sensor Tower data]`.
- Achieved this on under $15,000 of lifetime ad spend, i.e. growth is
  overwhelmingly organic/word-of-mouth rather than paid-acquisition-driven.
  `[DOCUMENTED]` — founder direct quote, revenuecat.com and subclub.com.
- Recognised by Apple ("Apps We Love" feature, March 2020) — a platform
  co-sign, not proof of retention but a credibility signal. `[DOCUMENTED]`.

**Is the social feature demonstrably *why* people stay, or just present
alongside retention driven by something else?**

Founder testimony is the strongest available evidence and it directly credits
the social/follow graph as a *primary* retention driver, in the founder's own
words: "different users following new users who were also following each
other, creating one of the biggest pulls for people to come back"
`[DOCUMENTED]` — revenuecat.com podcast. And separately: "social doesn't feel
like it makes that much sense as a new user. But then, you get into it...we
can compete with each other. And it actually becomes a pretty important
retention driver." `[DOCUMENTED]` — subclub.com podcast, direct quote.

However, this is **founder self-report, not an independently measured
retention metric** — no public D1/D7/D30 retention curve, no cohort
comparison (social users vs non-social users), no churn-rate breakdown by
feature usage was found anywhere. The founder himself admits he can't cleanly
measure it: "Even now, it's really hard to measure that K-factor."
`[DOCUMENTED, direct quote]`. Independent reviewers (repreturn.com, the Cora
app comparison piece) independently converge on calling the social layer "a
genuine differentiator" and note it makes the app "feel alive rather than a
static logger" — corroborating direction, but again not a number.

**Confidence**: MEDIUM. The qualitative signal (founder attribution +
independent-reviewer corroboration + organic-growth-with-near-zero-ad-spend
context, which *requires* some kind of strong word-of-mouth loop to explain)
is consistent and points the same direction. But there is no disclosed
quantitative retention metric isolating the social feature's contribution
from the core logging-tool value (fast set-logging, free unlimited routines,
clean analytics) which independent reviews (Cora, RepReturn) equally credit
as retention drivers in their own right. It would be inaccurate to say "the
social feature alone is proven to retain" — the fairer read is "the social
feature is one of several credited, mutually-reinforcing retention drivers,
and the founder ranks it highly, but it is not proven in isolation."

## 12. Review & community mining (mandatory)

**App Store (apps.apple.com), quotes with reviewer handle/rating/date where
available, via search-engine extraction:**

- Mrs. Wallker, 5★, 18 Jun 2025: *"You also have a community on here although
  it is small it is still something that is absolutely fantastic"*; and
  separately, *"I really love this app for the duality of having it like a
  social media platform strictly for working out."*
- el-jefe-kyle, 5★, 2 May 2022: *"The social feature — being able to follow
  other members — is also nice."*
- Crafted from craft, 5★, 27 Feb 2025: *"I love that it creates a community
  of people. I love that I can compete with my friends."* Also: *"I love that
  feeling when my phone vibrates because I've said a personal record."*
- Twggihdyingyib, 5★, 26 Mar (year not captured): *"I've personally had my
  mom, brothers, and friends all download this app and we follow each other
  and track each other['s] progress."* Also: *"You can compare each other['s]
  workouts, save others['] workouts if you would like to make it your own
  routine."*
- HappytoBow, 3★, 9 Sep 2023: *"the social sharing features are more or less
  a blah and sometimes a distraction to spending time on workouts or other
  better things in life"* — attributed by the reviewer to not having
  "impressive figures or stats" themselves. This is the clearest organic
  signal of comparison-adjacent disengagement found in this research pass
  (not framed as distress/shame — framed as "not for me, mildly a
  distraction" — but it is the one negative data point directly on point).
- Outthere18, 5★, 16 Jul 2024: *"I also don't use the social piece too much
  but I have taken some other people's workouts"* — i.e. a 5-star user who
  ignores the social layer entirely and still stays, using it only
  passively (importing routines) — evidence that the logging/routine core
  can retain independently of the social layer for at least some users.

**Product Hunt reviews (producthunt.com/products/hevy/reviews), named
reviewers with elapsed time-since-post:**

- Krishan Patel, ~2yr ago: *"I love Hevy and love recruiting gym members to
  there so I can see their routines!"* Patel separately proposed (as a
  feature request, not a complaint) building **gym-specific, location-verified
  communities** — i.e. an organic user request for a bounded/verified-local
  unit rather than the current open network, which is a notable signal for
  synthesis: at least one vocal user independently wants *more* structure/
  verification than Hevy currently offers, not less.
- Gionna Quin, ~8mo ago: *"the community side adds a nice boost when i need
  extra push."*
- Sky Morrell, ~3yr ago: *"I don't use the friend function much, but that
  does work well for those who want that interactivity."*
- Kim Lasatin, ~2yr ago: *"The community aspect is a fantastic bonus,
  providing motivation and tips from fellow fitness enthusiasts."*
- Adda Twigg, ~3yr ago: *"Great community and support from the developers."*

**Reddit (secondary-sourced only — see gap noted in §10):**

Per corahealth.app's synthesis of 200+ analysed Reddit threads: *"Reddit
users have polarized reactions to Hevy's social components... some users
find these features motivating for accountability, while others view them as
distracting noise."* The same synthesis separately documents Hevy vs Strong
switching behaviour driven by **logging speed, not social features**: *"users
switch from Strong to Hevy for features, then switch back to Strong because
logging is faster mid-workout"* — i.e. in this secondary source's read of
Reddit sentiment, the churn-and-return cycle is about core logging UX
friction, not about the social layer specifically (positive or negative).
Also: *"Hevy's free tier is actually free... Strong limits you to 3 routines
on free"* is cited as the more consistently-mentioned retention driver than
any social mechanic, in this source's reading of the Reddit corpus.

A separate secondary source (setgraph.app blog, itself citing Reddit
discussion) frames the three-way Reddit debate as: *"FitNotes for absolute
simplicity and privacy, Strong for speed and modern UX, and Hevy for social
features"* — i.e. social is Hevy's acknowledged Reddit-perceived
differentiator versus its two nearest competitors, but that same framing
implies the tradeoff cuts both ways: choosing Hevy is implicitly choosing
*more* social surface area than FitNotes/Strong offer, for users who
specifically want privacy-first logging.

**Gap disclosure**: direct Reddit fetch was not available in this research
session (tool restriction). Every Reddit-attributed claim above is
second-hand, via a third-party blog's synthesis, not verified against raw
thread text. This is the weakest-sourced dimension in this teardown and
should be redone with direct Reddit access before being treated as settled.

## 13. What retains — the "I stayed because..." signal

Pulling directly from §11/§12:

1. **Visibility into people you already know** ("my mom, brothers, and
   friends all download this app and we follow each other and track each
   other's progress" — organic App Store review) — the retention driver is
   *specific, known-person accountability*, not generalised community or
   ranking.
2. **Low-key, ambient community presence** even at small scale ("although it
   is small it is still something that is absolutely fantastic" — organic
   review) — suggests the mechanic doesn't need Instagram-scale density to
   register as valuable; a handful of people you recognise is enough.
3. **Routine/programme borrowing from people you follow** ("compare each
   other['s] workouts, save others['] workouts... make it your own routine";
   "I have taken some other people's workouts") — the transferable value
   isn't the social interaction itself but the *utility payload riding on
   top of it* (a usable programme), which works even for users who "don't
   use the social piece too much."
4. **Founder-attributed network formation**: unprompted micro-communities of
   mutual-followers forming around specific engaged users ("little
   communities were forming on the app of people that we had no idea who
   they were... little almost influencers are forming inside the app") —
   this is the strongest single piece of DOCUMENTED evidence that a
   follow-graph, left alone, self-organises into durable belonging units
   without Hevy designing "groups" as a feature.
5. **Non-social baseline retention**: free unlimited routines/history and
   fast logging are independently and repeatedly credited (Cora synthesis,
   organic reviews) as retention drivers that don't depend on the social
   layer at all — important for VOLYUME's read: Hevy's core retention is not
   *purely* social-graph-driven; the social layer is additive on top of an
   already-sticky utility.

## 14. What churns — the "I left when..." signal

This dimension has the thinnest evidence in the whole teardown — genuinely
churn-attributed-to-social complaints are rare in what was findable:

1. **Comparison-adjacent disengagement (mild, not distress-framed)**: the
   HappytoBow 3★ review — social features become "blah" and "a distraction"
   specifically *because* the reviewer feels they lack "impressive figures or
   stats" to show. This is the one organic signal of the comparison mechanic
   backfiring for someone who feels they don't measure up — notably it reads
   as quiet disengagement/indifference, not anger, shame language, or an
   explicit "I felt judged."
2. **Feature-bloat churn, social-adjacent but not social-specific**: per the
   Cora Reddit-synthesis, users who prioritise raw logging speed report the
   app "gotten heavier over time" and cycle back to Strong for that reason —
   this implicates the *cumulative surface area* of Hevy (social + analytics
   + everything else) as a mid-workout friction cost, without singling out
   social as the specific offender.
3. **Stranger-compare exposure (no organic complaint found, but a structural
   risk flagged by this research, not by users)**: no review or thread found
   in this pass explicitly complains "a stranger compared themselves to me,"
   but the mechanic (§3) exists with no consent/notification step, which is
   exactly the kind of silent harm that under-reports in review mining
   (people who feel uneasy about a stranger benchmarking them are more likely
   to quietly disengage or never articulate why than to write a public
   review naming the mechanic) — flagged as an `[INFERRED]` risk, not an
   `[OBSERVED]`/`[DOCUMENTED]` churn cause, precisely because review mining
   came up empty on it.
4. **Notification/motivation-tool gaps** (not comparison-shame, but adjacent):
   multiple review-aggregation sources note recurring requests for
   "stronger notifications and motivation tools" — read together with the
   observed absence of any negative/shame-toned notification copy (§7), this
   suggests Hevy's actual complaint is "not motivating/naggy *enough*" for
   some users, the opposite direction from a shame-pressure complaint.

**Explicit honesty check**: unlike a leaderboard-heavy app like Strava (not
covered in this document), this research pass did not surface a single
organic review, forum post, or documented case describing Hevy's social
layer causing shame, harassment, or a stated reason for quitting the app
entirely. That absence could mean (a) it's genuinely a low-friction,
well-designed mechanic at Hevy's current scale, (b) the harms exist but
under-report (quiet disengagement rather than public complaint, as argued in
point 3), or (c) this research pass's tooling gaps (no direct Reddit access,
blocked App Store/Play Store full-review fetches, no hands-on device
walkthrough) simply didn't surface them. Treat "no churn evidence found" as
"no churn evidence found in this pass," not "no churn exists."

## 15. Failure post-mortem

**Not applicable in the strong sense** — Hevy's social feature has not been
removed, and the app is not dead, faded, or failed; all trajectory signals in
§11 point to sustained growth as of 2026. `[DOCUMENTED]`.

The closest thing to a "near-failure" moment found: the March 2020 Apple
"Apps We Love" feature — the single biggest organic-growth catalyst
available to a bootstrapped app at the time — landed the day before COVID-19
gym closures hit the US, i.e. Hevy's core use case (gym workout logging)
was existentially threatened by the pandemic at almost the exact moment its
biggest growth break arrived. `[DOCUMENTED]` — search-engine synthesis of the
founder narrative. The company did not pivot to at-home workouts and
maintained focus on its core gym-lifter market through the disruption,
which the sources treat as a deliberate, patience-driven bet that paid off
rather than a failure. `[DOCUMENTED]`/`[INFERRED]` blend — the "why it worked
out" causal story is the source's framing, not independently verified
against, e.g., a counterfactual of what would have happened had they
pivoted.

No evidence found of the *social feature specifically* ever being scaled
back, removed, or identified by Hevy as a mistake.

## 16. Verdict

**Works, evidence is founder-attributed and reviewer-corroborated but not
independently quantified; it is one of several mutually-reinforcing
retention drivers, not a solitary silver bullet — and it carries a
specific, real ranking-risk (stranger-compare with no consent gate) that has
not yet visibly caused a public backlash but is a structurally exposed
"apply the VOLYUME lens here" flag.** `[Confidence: MEDIUM]` — driven by
consistent qualitative signal across founder interviews and independent
reviews, discounted for the absence of any disclosed quantitative retention
metric isolating the social feature, and for this pass's evidence gaps
(no direct Reddit access, two blocked full-review-page fetches, no hands-on
device walkthrough).

**Transferable kernel for the next phase, stripped of ranking risk (per the
governing lens — this is description, not a recommendation)**: what
Hevy's organic reviews actually credit is *specific-known-person visibility*
("my mom, brothers, and friends... we follow each other and track each
other's progress") and *low-friction routine borrowing from someone you
trust*, not the leaderboard or the open stranger-compare screen. The
self-organising micro-community effect the founder describes ("little
communities... little almost influencers") emerged from an open follow
graph without Hevy designing "groups" as a product feature — an unplanned
emergent-belonging effect, not an engineered one, which is itself a data
point about how little top-down design was needed for *that* particular
effect once *a* follow mechanic existed. Separately and cleanly: the
stranger-facing surfaces (Discover feed, cross-profile Compare with no
consent step) are the parts of Hevy's model that most directly collide with
VOLYUME's "no comparison/ranking/shame among friends OR strangers" and
"mandatory safety/moderation model for any stranger surface" constraints —
Hevy ships them with only reactive report/block moderation and no
consent gate on being compared, which is the clearest concrete "how a real
competitor bumps into this constraint" evidence gathered in this teardown.
