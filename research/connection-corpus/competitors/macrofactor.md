# Competitor teardown: MacroFactor (Nutrition + MacroFactor Workouts)

**Category:** fitness — algorithmic macro/calorie tracker, sold to VOLYUME's
synthesis session as the flagship "no social by design" case study.
**Research method:** web research only (search + fetch). No hands-on use of
the app was performed for this teardown, so there is no [OBSERVED] tag
anywhere below; every claim is [DOCUMENTED] (cited) or [INFERRED] (flagged
explicitly as reasoning, not fact). Direct fetch of reddit.com (both the
r/MacroFactor listing and individual threads), the Google Play Store's
rendered review DOM, and web.archive.org was blocked by the fetch tool in
this environment, matching the constraint already logged in this corpus's
`strong.md`. Where a claim originates from a secondary blog or a
search-tool's own synthesis of multiple pages (rather than a page fetched
and read directly), this is flagged as medium/low confidence so the
synthesis session can weight it correctly.
**Prepared for:** VOLYUME connection-corpus, read-only research phase. This
document does not make a design, placement, pricing or go/no-go call.

---

## Headline finding (read this first)

MacroFactor is the cleanest natural experiment available in this corpus for
VOLYUME's central question. It is a **bootstrapped, subscription-only,
five-owner company that has never raised outside funding**, that has grown
from roughly **35,000 users in September 2022 to 400,000 in September 2025**
[DOCUMENTED — MacroFactor's own 2025 Annual Report,
https://macrofactor.com/annual-report-2025/], that carries **no social feed,
no friends list, no followers, no in-app messaging, no leaderboard, no
streaks, and no badges** [DOCUMENTED across more than a dozen independent
third-party teardowns and the company's own marketing/help-centre copy,
cited throughout], and that has publicly named its design philosophy —
**"adherence-neutral"** — specifically to explain why it refuses to shame,
gamify, or otherwise pressure users [DOCUMENTED —
https://macrofactor.com/adherence-neutral/]. Review-mining in dimension 12
below found **zero** user reviews crediting a social/community mechanic as a
reason for staying, and found **one** independent reviewer explicitly noting
the *absence* of a social/community layer as a felt gap versus MyFitnessPal.
The retention story that repeats constantly across reviews is: the adaptive
algorithm, the accuracy of the food database, the lack of shame/red numbers,
and the quality of human customer support — never the (real, active, but
entirely off-platform) brand community. This is the single most important,
and most nuanced, finding for VOLYUME: **the no-feed decision has not
visibly cost MacroFactor anything, but the "connection" mechanics it does
have (a founder-run brand community, a public feature-voting roadmap) also
show no direct evidence of driving retention themselves** — they read as a
trust/co-creation layer sitting beside a product whose real retention engine
is deterministic, shame-free coaching. See dimension 16 for the full,
confidence-tagged verdict.

---

## 1. The connection / belonging mechanic(s) — step by step

MacroFactor has **no peer-to-peer connection mechanic inside the app at
all**. There is no friend graph, no invite-a-training-partner flow, no
in-app chat, no comment thread on anything. What exists instead are three
separate, weaker mechanics, none of which connect one user to another user
inside the product:

**(a) Algorithmic "check-ins" and "coaching modules" — a human-to-software
relationship, not a human-to-human one.**
1. The app's own algorithm ("MF Coach") reviews the week's logged weight and
   food data and, when a Check-In becomes available, surfaces a notification
   on the Strategy tab. [DOCUMENTED — help.macrofactorapp.com, "Introduction
   to Check-Ins and Coaching Modules," article 247]
2. The user taps in and is presented with one or more of five possible
   automated **Coaching Modules**: Partial Logging, Weigh-In, Fasting,
   Logging Break, and Program Update. [DOCUMENTED, same source]
3. Each module asks clarifying questions (e.g. "was this an unlogged day or
   a fasting day?") and the user can engage or skip.
4. The system then issues updated calorie/macro targets. [DOCUMENTED, same
   source]
   This is a deterministic, no-I/O-with-other-humans coaching loop — closer
   in spirit to VOLYUME's own `weeklyCoach.js` than to any social feature.

**(b) "Manual Mode" — a seam for an external, human nutrition coach, but
built as a data-entry mode, not a connected account.**
1. A user who works with an outside (non-MacroFactor) nutrition coach can
   switch their program to Manual Mode, in which the app's algorithm stops
   auto-adjusting targets. [DOCUMENTED — multiple sources synthesise
   help.macrofactorapp.com's "How do I Adjust my Macro Targets?" and
   "Introduction to Check-Ins" articles]
2. The user manually types in whatever calorie/macro numbers their outside
   coach has told them to hit; MacroFactor still logs food and shows
   analytics/trends against those manually-set numbers. [DOCUMENTED, same]
3. Critically, **there is no coach-side account, portal, or login** —
   MacroFactor "does not have the trainer edition that Cronometer offers,
   which allows trainers to access user data and make changes directly."
   [DOCUMENTED — quoted via feastgood.com/macrofactor-review/, cross-checked
   against multiple comparison articles independently making the same claim
   about the Cronometer Pro gap]
4. If a coach wants to see the client's data, the only path is the client
   manually exporting a spreadsheet of "daily weight, calorie intake, and
   macronutrient intake" and sending it themselves. [DOCUMENTED, same
   source] There is no live sync, no notification to the coach, no shared
   dashboard.
5. Third-party coaching-platform users (e.g. Trainerize) have posted
   feature requests asking MacroFactor to integrate/sync so a coach could
   see client data automatically — as of this research, unaddressed.
   [DOCUMENTED — ideas.trainerize.com forum threads, "Integrate with
   MacroFactor" and "Sync with macro factor app"]

**(c) A founder-run, off-platform "brand community" — the closest thing to
belonging MacroFactor offers, and it is deliberately NOT peer-to-peer.**
1. In-app, the path is **More → Community & Support**, which shows icons
   that link out to the company's Facebook group, subreddit, and Instagram.
   [DOCUMENTED — help.macrofactorapp.com, "Join our Communities," article
   107]
2. These are described by the company itself as places to "Connect with
   other MFers," get news on releases, and "get nutrition and
   fitness-related questions answered quickly." [DOCUMENTED, same source,
   direct quote]
3. The company's own leadership is personally, visibly active inside these
   spaces — "the leadership team maintains direct involvement in community
   spaces, asking questions and gathering feedback." [DOCUMENTED —
   killerstartups.com, "How MacroFactor Made Themselves a Standout in an
   Over-Saturated Fitness Market"]
4. The company has hosted at least one live Q&A (a YouTube livestream
   celebrating MacroFactor's one-year anniversary, September 2022, with
   co-founder Greg Nuckols and collaborator Eric Trexler answering viewer
   questions) [DOCUMENTED —
   https://www.strongerbyscience.com/podcast-bonus-qa2022/] and at least one
   Reddit AMA specifically for the MacroFactor Workouts launch, where "users
   were able to ask questions directly and get clear answers from the
   MacroFactor team." [DOCUMENTED — search-tool synthesis of
   macrofactor.com/mm-dec-2025/, medium confidence, not independently
   re-verified by direct fetch of the AMA thread itself]
5. A monthly email newsletter, "MacroFactor Monthly," recaps new features,
   content, and upcoming work. [DOCUMENTED — help.macrofactorapp.com "Join
   our Communities" and multiple macrofactorapp.com/mm-* monthly digest
   posts found in search]
6. A **public product roadmap with feature voting** exists at
   feedback.macrofactorapp.com (reachable in-app via More → Roadmap): users
   submit and upvote feature requests, and the company has publicly
   committed to "rapid implementation of highly-upvoted user suggestions
   within months" as part of a stated "build in public" philosophy.
   [DOCUMENTED — help.macrofactorapp.com article 106 "View our Public
   Roadmap," article 105 "Request a Feature," and killerstartups.com
   synthesis; the live content of the roadmap board itself could not be
   fetched directly in this session — attempted fetch of
   feedback.macrofactorapp.com returned no content, so specific vote counts
   or currently-listed requests are not independently confirmed]
7. None of (c) creates a relationship *between* two ordinary users. A member
   of the Facebook group does not gain any visibility into another member's
   food log, weight trend, or targets. It is a many-to-one (member-to-brand)
   and many-to-many-but-undifferentiated (member-to-group) space, not a
   peer graph.

**(d) A one-shot, opt-in derived-content share, not an ongoing connection.**
Separately from all of the above, MacroFactor has a **before-and-after photo
share card**: users who have logged progress photos can generate a composite
before/after image (choosing front/side/back angle, light/dark/matched
background) and then push it out through the OS share sheet "to a trainer,
coach, or friend via email or messaging app, or share to social media."
[DOCUMENTED — help.macrofactorapp.com, "How to Create and Share
Before-And-After Photos," article 123, cross-checked against
macrofactorapp.com/progress-photos-and-body-measurement-tracker/] This is
structurally identical to Strong's one-shot workout-template share (see
`strong.md` §1) — a one-way, non-persistent content export, not a
relationship — with one important difference flagged in §4 below: unlike
Strong's plan-only export, MacroFactor's card is explicitly **body/progress
photo content**, which is exactly the class of data VOLYUME's own
share-card rule excludes.

There is no other belonging mechanic anywhere in the product. No challenges,
no group programmes, no cohort-based coaching, no "training partner" pairing
feature.

---

## 2. The UNIT — pair? group? roster? open network? size limits?

None of the standard in-app social units exist. Breaking down what "unit"
each of the four mechanics in §1 actually has:

- **(a) Check-ins/coaching modules:** unit of one — the individual user and
  the deterministic algorithm. No second person involved at all.
- **(b) Manual Mode / external coach:** an informal, entirely
  outside-the-product pairing. MacroFactor does not model this as an
  in-app "pair" object; it is invisible to the software except as manually
  typed numbers. No roster, no coach seat, no size limit because there is no
  container.
- **(c) Brand communities:** open, unbounded networks hosted on third-party
  platforms (Meta, Reddit, Instagram) that MacroFactor does not own or
  moderate as a bounded "unit" — anyone can join Facebook/Reddit and request
  membership; no invite code, no roster, no cap. Approximate scale as of
  early 2024: Facebook group "nearly 10,000 followers," subreddit "almost
  double that size" (so roughly ~20,000). [DOCUMENTED —
  killerstartups.com; independently, honestbrandreviews.com separately cites
  the brand's Instagram at "over 2.9k followers" at the time that review was
  written — different platform, different number, not cross-verified
  against a single dated snapshot, so treat the three numbers as
  independently-sourced approximations rather than a single consistent
  count]
- **(d) Before/after share:** unit of one sender, fanned out to however many
  recipients the OS share sheet allows (a link/image, or a direct social
  post) — same "ad hoc transaction, no persistence" shape documented for
  Strong in this corpus.

There is no "pair" primitive (no 1:1 buddy/partner feature), no "group"
primitive (no cohorts, no teams, no challenges), and no "roster" primitive
(no client list for a coach) built by MacroFactor itself anywhere in the
product.

---

## 3. Symmetric or asymmetric? (the ranking-risk axis)

**There is no user-to-user data channel inside the app, so there is no axis
on which one user could see another user's data, full stop.** This makes
MacroFactor maximally safe on the ranking-risk axis by omission rather than
by design choice within a channel:

- Two ordinary MacroFactor users have **zero visibility** into each other's
  logs, weight, targets, or adherence, in-app or out. The only place two
  users' words could appear near each other is a public Facebook/Reddit post
  and its comments — ordinary social-media visibility, not a MacroFactor
  feature.
- The Manual-Mode/external-coach relationship is asymmetric in principle
  (the coach dictates numbers) but MacroFactor supplies **no software
  channel for that asymmetry at all** — the coach has no login, no view,
  and only sees what the client chooses to export or relay by hand.
  [DOCUMENTED, per §1(b) sources]
- The brand community is asymmetric in one narrow sense: staff visibly
  respond to and are more "present" than an average member (per
  killerstartups.com), but this is a normal customer-support/founder-access
  asymmetry, not a comparison/ranking asymmetry between ordinary members.
- The before/after share (§1d) is one-directional and non-reciprocal, same
  reasoning as Strong's workout-template share: sender pushes a static
  artefact, recipient's own data never flows back.

**Transferable read for VOLYUME:** MacroFactor demonstrates that a fitness
app can scale to 400k users with the ranking-risk axis reduced to zero by
simply not building any user-to-user channel — not even an asymmetric
follow. It does not demonstrate anything about how to build a *safe*
symmetric or asymmetric channel, because it never attempted one.

---

## 4. Data model — what is shared, what is withheld, confidence per field

| Field | Shared with another *person* via any MacroFactor mechanic? | Confidence |
|---|---|---|
| Daily calories/macros logged | No in-app channel. Only leaves the app via a user-initiated manual export (spreadsheet) to an external coach. | [DOCUMENTED — feastgood.com review] |
| Body weight / weight trend | No in-app channel to other users. Same manual-export path to an external coach only. | [DOCUMENTED, same] |
| Progress photos / before-after composite | **Yes, explicitly.** The before/after share card (§1d) is built specifically to push body-progress-photo content out via OS share sheet to "a trainer, coach, or friend... or social media." | [DOCUMENTED — help.macrofactorapp.com article 123] |
| Body measurements (waist, hips, etc.) | Synced between a single user's own MacroFactor Nutrition and MacroFactor Workouts apps (same account, same person) — not shared to any other person. | [DOCUMENTED via search-tool synthesis of brobible.com/gymgod.app comparison content; medium confidence, not independently fetched from a MacroFactor-primary source] |
| Period-tracking data | Same as above: synced cross-app for the same user only, no other-person exposure found in any source. | [DOCUMENTED via same secondary-comparison synthesis; medium confidence] |
| Identity/profile info | No public profile object exists to be shared; the brand communities run on the user's own Facebook/Reddit/Instagram identity, which is that platform's identity system, not a MacroFactor-built profile. | [INFERRED from complete absence of any "MacroFactor profile" feature described in any source] |
| Underlying nutrition/weight data at rest | Stored per-user in MacroFactor's own backend to power the adaptive algorithm (necessarily — the whole product proposition depends on it), but never exposed to other end-users through any in-app surface found. | [INFERRED from product function; no architecture/security document was located to confirm hosting location or encryption specifics] |

Net pattern: MacroFactor's data model has **no ambient sharing** at all —
every data crossing between people is a **user-initiated, one-shot export**
(spreadsheet to a coach, or an image to a friend/coach/social platform).
Nothing is shared by default, continuously, or without an explicit tap. The
one place MacroFactor is *more* permissive than VOLYUME's own share-card
rule is the before/after photo card, which is precisely a body-photo
artefact — a useful negative precedent: VOLYUME's stricter "share cards
never include weight/body/measurements/private notes" stance is a
deliberate divergence from what a comparable no-social competitor considers
acceptable, not an industry-standard floor.

---

## 5. Every state + edge case observed

Because there is no persistent connection object anywhere in the product,
almost none of the standard state machine (invite/accept/decline/block/
leave/expired) applies. What could be found:

- **Joining a brand community:** request to join the Facebook group or
  subscribe to the subreddit via the platform's own native flow (Meta/Reddit
  join mechanics) — MacroFactor's in-app link merely deep-links out.
  [DOCUMENTED — help article 107]
- **Rules gate before posting:** the Facebook group's "Welcome to
  MacroFactor" introductory post explicitly instructs new members to "read
  and understand the rules" before posting, and states staff "will closely
  monitor comments on the post that links to this introductory article."
  [DOCUMENTED — macrofactor.com/welcome/] The specific rule text itself was
  not accessible in this session (Facebook group content requires
  authenticated membership), so the substance of the rules is unconfirmed.
- **Leaving:** no MacroFactor-specific leave flow exists; leaving a
  Facebook group or unsubscribing from a subreddit is the host platform's
  standard mechanism, entirely outside MacroFactor's product.
- **Roadmap request → decision:** MacroFactor has publicly answered at
  least one direct ask for a peer-to-peer referral feature by explaining it
  is *not currently built*, that they are "interested in implementing a
  referral program, but the logistics are challenging due to privacy
  concerns," and that they "will announce details in their Facebook group
  and subreddit if they do implement one." [DOCUMENTED — search-tool
  synthesis of help.macrofactorapp.com content on affiliate/referral
  distinctions; medium confidence, exact article not independently
  re-fetched] This is a rare, useful data point: a no-social competitor
  weighing a connection-adjacent feature (referrals) and explicitly citing
  **privacy** as the blocking concern, not user demand or feasibility.
- **Manual-Mode entry/exit:** switching into or out of Manual Mode is a
  toggle within the user's own program settings — no second party is
  notified or involved. [DOCUMENTED — help.macrofactorapp.com program-styles
  content]
- **Before/after share — offline/expired/empty states:** not documented in
  any source found; because the share is a static generated image handed to
  the OS share sheet, there is no server-side link to expire and no "empty"
  state beyond "you have not logged enough progress photos yet to generate
  a composite" (inferred from the feature's dependency on existing progress
  photos, not explicitly confirmed in a support article).
- **No block/report state exists** for anything MacroFactor itself built,
  because there is no peer-to-peer surface to block or report someone on.
  Any blocking/reporting a user might do happens entirely on Facebook/
  Reddit/Instagram's own tooling.

---

## 6. Safety / moderation scaffolding

**MacroFactor has built essentially zero bespoke safety/moderation
scaffolding, because it has built zero in-app stranger-facing (or even
peer-facing) surface for that scaffolding to protect.** This is itself the
finding, not an oversight this teardown can flesh out further:

- The only place strangers can interact with each other in any
  MacroFactor-adjacent space is the Facebook group and subreddit, both of
  which inherit **Meta's and Reddit's own native moderation, reporting, and
  blocking tools** — general-purpose platform moderation, not anything
  MacroFactor engineered. [INFERRED from the complete absence of any
  MacroFactor-specific safety/reporting feature described in any source,
  combined with the fact that these are ordinary Facebook Group/subreddit
  instances]
  - General context (not MacroFactor-specific): Facebook Groups' moderation
    is well-documented elsewhere as inconsistent at scale, e.g. "Facebook's
    Bad Moderation Practices: Abuse and Harassment Left Unchecked"
    [DOCUMENTED — clutchjustice.com, a general commentary piece, not
    MacroFactor-specific — included only to note that MacroFactor is
    relying on a moderation substrate with known industry-wide gaps, not to
    claim any specific incident happened in MacroFactor's own group]
- MacroFactor's own community rules exist ("read and understand the rules")
  but their content was not accessible in this session (gated behind
  Facebook group membership). [DOCUMENTED reference only, content
  unconfirmed]
- No identity verification, no age-gating beyond whatever
  Facebook/Reddit/Instagram themselves require, no harassment-specific
  defence mechanism, and no in-app reporting/blocking pathway was found
  anywhere in MacroFactor's own product.
- Because Manual Mode's "coach" relationship has no in-app account or
  channel at all, there is nothing for MacroFactor to moderate there either
  — the entire relationship, good or bad, happens outside the product.

**Transferable read:** if VOLYUME ever considers a stranger-facing surface,
MacroFactor offers no template to borrow — it is the "opt out entirely"
end of the spectrum, valid evidence that a zero-safety-surface choice is
commercially survivable, but no evidence at all about how to do
safety/moderation well if a surface is later added.

---

## 7. Comparison / shame audit

This is where MacroFactor is most directly relevant to VOLYUME, and the
evidence is unusually explicit and well-documented (a rarity in this
corpus — most competitors' anti-shame claims are inferred; MacroFactor
wrote an entire public article naming the philosophy).

**What MacroFactor explicitly does NOT do**, per its own "adherence-neutral"
article [DOCUMENTED — https://macrofactor.com/adherence-neutral/, all
direct quotes]:
- No red numbers when a user exceeds calorie/macro targets.
- No "good food" vs "bad food" labelling.
- No warning pop-ups before logging energy-dense foods.
- No smiley/frowny-face indicators.
- No streaks anywhere in the product (confirmed independently by
  fitnesstoolsreviewed.com: "No social feeds, no badges, no nonsense" and by
  multiple other comparison articles describing the app as free of
  "gamification, social features, and motivational pop-ups").
- The coaching algorithm itself does not require "perfect adherence" before
  making adjustments — it recalibrates from actual (imperfect) logged data,
  explicitly to avoid punishing lapses or leaving users "stuck with
  inappropriate recommendations for extended periods if their adherence
  slips." [DOCUMENTED, same article, direct quote]

**The company's own stated rationale**, which reads almost like a mirror of
VOLYUME's own CLAUDE.md ED-safety mandate: shame/guilt-based design is
"predictive of higher body weight, more difficulty with weight loss,
disordered eating patterns, and exercise avoidance," while
self-compassion-oriented design is associated with better outcomes; rigid
"cognitive restraint" (the black-and-white "I was good/bad today" framing)
is "predictive of worse dietary adherence and long-term results."
[DOCUMENTED, same article — note: the article summarises research findings
but this teardown was not able to independently verify the underlying
citations, so treat the *research claims* as the company's own
representation of the literature rather than independently confirmed by
this research pass]

**Is there ANY comparison/ranking/shame instance anywhere in the product?**
None was found in any source. No leaderboard, no public rank, no
follower/following counts, no visible "streak" counter, no badge system, no
public profile that could be compared against another user's. This is a
genuinely clean audit — the strongest "zero toxicity" result in this
corpus so far.

**The transferable kernel, stripped of nothing (there is no toxicity to
strip):** a nutrition-coaching product can be commercially successful while
being *actively* anti-shame by design, not merely neutral/absent on shame.
The kernel for VOLYUME is not "omit social" (already VOLYUME's own
starting doctrine) but **"name the anti-shame design decisions
explicitly and publicly, the way MacroFactor did with 'adherence-neutral,'
as a marketed differentiator rather than a silent default."** MacroFactor
treats the absence of shame as a *feature* worth an entire blog article and
sales pitch, not an incidental gap.

---

## 8. Onboarding to the social/community feature

There is no mandatory or embedded "social" onboarding step anywhere in the
core product flow — this is itself notable, since a heavier-handed
competitor might gate progress behind a "invite a friend" or "join the
community" step.

- In-app, the path to any community surface is buried under **More →
  Community & Support**, several taps deep from daily use, not surfaced
  during setup/onboarding itself. [DOCUMENTED — help article 107]
- A post-install "Welcome to MacroFactor" article (surfaced via the
  knowledge base / likely linked from a welcome email, based on its
  framing) invites new users to the Facebook group, subreddit, Instagram,
  and the monthly newsletter, but frames these as optional resources
  alongside the Knowledge Base, not as a required step in reaching a
  working macro plan. [DOCUMENTED — macrofactor.com/welcome/] The core
  onboarding wizard itself is about building the user's own macro plan (TDEE
  estimate, refined over "2-4 weeks of consistently logging"), with
  **no community step embedded in that flow** per any source found.
- Net: onboarding to "connection" at MacroFactor is low-pressure, optional,
  and discovered rather than funnelled — a pattern VOLYUME could adopt
  wholesale for any future non-mandatory community surface without
  contradicting the no-feed doctrine.

---

## 9. Monetisation — is the connection feature free / paid / a tier?

- The Facebook group, subreddit, Instagram, monthly newsletter, and public
  roadmap are **entirely free and open regardless of subscription status**
  — no source found gates any of them behind payment. [DOCUMENTED by
  absence of any paywall language across all community-related sources]
- The core app itself, by contrast, has **no free tier at all** — a 7-day
  free trial (extendable to 14 days via a creator/affiliate code such as
  "MFER"), after which pricing is reported by multiple third-party review
  sites as roughly $11.99/month or $71.99/year. [DOCUMENTED via search-tool
  synthesis of multiple independent review sites converging on the same
  figures — nutriscan.app, outlift.com, and others; **medium confidence
  only** — this teardown could not independently fetch and confirm exact
  current pricing from a MacroFactor-primary page in this session, as the
  official "Manage Your Subscription" help article did not surface the
  numbers on fetch]
- MacroFactor explicitly rejects a one-time/lifetime purchase tier, and its
  own stated reason is an *incentive-alignment* argument, not a technical
  one: a lifetime purchase "would run the risk of misaligning incentives" —
  the company wants "continually improving the app... in the users' best
  interests" to also be "in the business's best interests," which breaks
  down if a user can pay once and stop engaging. [DOCUMENTED — direct quote,
  help.macrofactorapp.com article 115]
- There is no coach/trainer-tier product (unlike Cronometer's Pro/trainer
  edition) — MacroFactor has chosen not to monetise the
  human-coach-connection seam at all, leaving it as an unmonetised, informal
  workaround (Manual Mode + manual export). [DOCUMENTED, per §1(b)]
- MacroFactor Workouts (companion strength-training app, launched ~January
  2026) had, per the last pricing-related source found, an unresolved
  question at the time of an early preview about whether it will be a
  separate subscription, bundled, or a new premium tier — pricing details
  were previewed in a December 2025 company post ("Workouts AMA, Pricing
  Preview...") but the specific numbers were not independently retrieved in
  this session. [DOCUMENTED reference only; content not independently
  confirmed]

---

## 10. Sources

All citations are inlined above at point of use with a confidence tag.
Primary official sources successfully fetched directly in this session:
`help.macrofactorapp.com` articles 106, 107, 115, 123, 247; the
"adherence-neutral" article at `macrofactor.com/adherence-neutral/`; the
"Google Award" article at `macrofactor.com/google-award/`; the "Welcome to
MacroFactor" article at `macrofactor.com/welcome/`; and the "2025 Annual
Report" at `macrofactor.com/annual-report-2025/`; the team page at
`macrofactor.com/team/`. Secondary sources relied on for review-mining and
comparison synthesis (medium confidence unless independently corroborated):
feastgood.com, outlift.com, killerstartups.com, honestbrandreviews.com,
fitnesstoolsreviewed.com, dr-muscle.com, gymgod.app, brobible.com,
nutriscan.app, the Fourscore Business Law client page. Blocked/unavailable
in this session: reddit.com (direct fetch refused by tooling), Google Play
Store rendered review DOM (returned only header/navigation on fetch),
web.archive.org (fetch refused by tooling), strongerbyscience.com (403
Forbidden on direct fetch — its content on philosophy was instead recovered
via a search-tool synthesis pass, medium confidence), feedback.macrofactorapp.com
(returned no retrievable content).

---

## 11. Evidence it works

**MacroFactor's own trajectory is real, documented, and unambiguously
growing** — this is one of the strongest DOCUMENTED trajectory data points
in this corpus:

| Date | Users | Source |
|---|---|---|
| Sept 2022 | ~35,000 | [DOCUMENTED — macrofactor.com/annual-report-2025/] |
| Sept 2023 | ~90,000 (82,000 **paying** customers cited separately as of ~2 years post-launch) | [DOCUMENTED — annual report; paying-customer figure from fourscorelaw.com] |
| Sept 2024 | ~185,000 | [DOCUMENTED — annual report] |
| Sept 2025 | ~400,000 | [DOCUMENTED — annual report] |

Additional corroborating signals: over 200,000 **paying** users cited in the
company's own Google Play "Best Everyday Essential" 2024 award writeup
[DOCUMENTED]; the company has grown its team to roughly 17-20 people and
funded the development and January-2026 launch of a second full app
(MacroFactor Workouts) entirely from its own revenue, with **no outside
funding raised at any point** [DOCUMENTED — Tracxn company profile
synthesis + Fourscore Business Law page, both independently stating a
bootstrapped structure]. App Store/Google Play star ratings cluster at
4.7-4.8 across every aggregator checked (App Store ~4.7-4.8 across ~420+
reviews per one aggregator; Google Play ~4.7-4.8 across ~780-12,000+ reviews
depending on the snapshot cited) [DOCUMENTED via multiple converging
third-party aggregator citations — appgrooves, sensortower-style estimator
pages — medium confidence on the exact review-count figures since these
change constantly and several different numbers were returned by different
sources].

**Is the "connection" layer demonstrably WHY people stay, or just present
alongside retention driven by something else?** Based on everything
gathered in this research pass: **it is something else.** Every specific,
attributable retention reason found in review mining (dimension 12) points
to the algorithm, the food database, the anti-shame design, and support
quality — never the Facebook group, subreddit, roadmap, or any social
mechanic. No case study, funding announcement, or press piece claims the
community drove the growth curve above; the growth narrative the company
itself tells is "word-of-mouth from MacroFactor users" [DOCUMENTED —
annual report, direct quote] — which is adjacent to but distinct from
"the community feature retained people once they arrived." Confidence:
**high** that the growth trajectory is real and undamaged by having no
social feed; **low** that any specific connection mechanic documented here
is a demonstrated cause of that growth (plausible contributor at most, not
evidenced).

---

## 12. Review & community mining (mandatory)

Searches were run against App Store reviews, Google Play reviews (via
aggregators, since direct Play DOM fetch was blocked), Reddit-adjacent
secondary sources, and independent long-form reviews (feastgood.com,
outlift.com, fitnesstoolsreviewed.com, honestbrandreviews.com,
dr-muscle.com, marrastrength.com), specifically filtering for
social/community/coach/accountability mentions per the task brief.

**Representative positive quotes found (retention-relevant):**
- "I've been using MacroFactor for about 6 months now and absolutely love
  it!" — BrenB, App Store, 5 stars. [DOCUMENTED — apps.apple.com review
  page]
- "The app support is outstanding. I have been using it consistently for
  two years." — Odessa33, App Store, 5 stars. [DOCUMENTED, same]
- "The food database seems the cleanest... It is 100% worth paying for." —
  Prof.Swolio, App Store, 5 stars, comparing favourably to MyFitnessPal and
  Carb Manager. [DOCUMENTED, same]
- "I feel like it's actually telling me more about my body and I've enjoyed
  seeing how it updates each week." — unattributed user review quoted via
  feastgood.com's review roundup. [DOCUMENTED, secondary source]
- "Every month, it gets further ahead of its competitors." — outlift.com
  reviewer, on active development pace. [DOCUMENTED]
- On customer support specifically: the outlift.com reviewer described
  human support as "great" and noted encountering "a fitness YouTuber" on a
  support ticket — i.e., the company staffs support with people who
  themselves have credibility in the fitness space, which reads in the
  review as a trust signal. [DOCUMENTED — outlift.com]

**Representative critical/negative quotes found:**
- On the AI support chatbot (separate from human support): "I hate those
  things so much, and I don't like this one, either." — outlift.com
  reviewer. [DOCUMENTED]
- On the trial/subscription model: aggregated review sentiment described
  the 7-day-trial-into-paid-subscription model as, in some users' words, a
  "predatory sales tactic," and separately, some reviewers felt there
  "aren't enough premium features to justify the paid subscription."
  [DOCUMENTED via search-tool synthesis of aggregated App Store/Play
  reviews; exact reviewer usernames not retrieved, so treat as a
  directional signal rather than a verbatim-sourced quote]
- On ownership/authenticity: some reviewers expressed being "disappointed by
  Jeff Nippard's promotion of the app" [DOCUMENTED via search-tool
  synthesis, medium confidence] — notable because Nippard is in fact a
  co-owner (§ below), not merely a paid endorser, which suggests some users
  feel a parasocial-trust breach when a "recommendation" from a fitness
  influencer turns out to be an ownership stake rather than an independent
  opinion. This is a direct cautionary data point about parasocial/founder-
  proximity connection mechanics: they can build trust (per the community
  section) but can also curdle into a *specific* trust complaint if the
  audience feels the relationship was not transparently disclosed.
- **The one directly on-target "what churns" signal for the social axis
  specifically:** an independent reviewer (outlift.com, running their own
  fitness community/coaching practice) wrote plainly: "Macrofactor doesn't
  have a social component," and noted missing MyFitnessPal-style community
  recipe-sharing; the same reviewer added that their own team maintains a
  separate community for exactly this reason, but conceded "most people
  won't" have access to an alternative like that, making solo tracking the
  default MacroFactor experience. [DOCUMENTED — outlift.com/macrofactor-review/,
  direct paraphrase/quote]
- On database gaps: "the database doesn't have enough items they eat daily
  to move from MyFitnessPal" (a developer's aggregated review comment) and
  general commentary that barcode/database accuracy is "geographically
  uneven at best and completely absent in large markets" outside
  US/UK/Canada/Australia core markets. [DOCUMENTED via search-tool
  synthesis of aggregated reviews]
- On the "if you need a live coach" gap: a review synthesis paraphrased
  (not verbatim-quoted) that MacroFactor is not the right app for "someone
  who needs a live coach for accountability" [DOCUMENTED via dr-muscle.com,
  medium confidence — this is a paraphrase surfaced by the search tool, the
  exact original sentence was not independently isolated in this session].

**What was conspicuously absent from every review-mining pass:** no review
found, across any source checked, praised MacroFactor's Facebook group,
subreddit, or roadmap as a *reason they stayed subscribed*. The community
appears in marketing/company-authored material far more than in
independent user reviews, which is itself informative: it suggests the
brand-community layer is a company-prioritised investment (staff time,
AMAs, newsletters) that has not yet produced an independently-observable
retention signal in the wild, at least not one visible through
publicly-indexed review text.

---

## 13. What retains

Pulled directly from the "I stayed because..." signal in §12:
- **The adaptive, accurate algorithm** — reviewers repeatedly credit the
  weekly recalibration against real, individual data (not population
  averages) as the single biggest differentiator and the reason for
  multi-year retention (6 months, 2+ years cited directly in reviews).
  [DOCUMENTED, §12]
- **The anti-shame, "adherence-neutral" design** — not just tolerated but
  actively cited across third-party reviews and the company's own marketing
  as a source of sustained, less-stressful engagement ("MacroFactor doesn't
  stress people out" is a recurring framing across multiple independent
  articles). [DOCUMENTED, §7 and §12]
- **Food database trust/cleanliness and fast logging** — cited as "100%
  worth paying for" and central to why users don't revert to MyFitnessPal
  despite MacroFactor's higher price and lack of a free tier. [DOCUMENTED,
  §12]
- **Human customer support quality**, including staff with credible
  fitness-industry backgrounds. [DOCUMENTED, §12]
- **Founder/company transparency and responsiveness** (public roadmap,
  annual reports, monthly newsletters, AMAs) is presented by the company and
  by at least one secondary source (killerstartups.com) as a trust-building
  practice, though — per §12 — no independent review was found directly
  crediting this as *the* reason for staying, only as context/colour in
  business-trajectory pieces. Treat this as a plausible secondary retention
  contributor, not a proven one. [DOCUMENTED for existence of the practice;
  INFERRED for its causal effect on retention]

None of the above is a peer-to-peer connection mechanic. **What retains
users at MacroFactor is the relationship between the user and the
deterministic coaching system, and the user and the brand — not the user
and other users.**

---

## 14. What churns

Pulled directly from the "I left when..." / "what's missing" signal in §12:
- **No free tier**, a 7-day-trial-to-paid conversion some reviewers call
  "predatory," cited as the single most common complaint category across
  aggregated reviews. [DOCUMENTED, §12]
- **Database/regional gaps** — barcode and food-item coverage uneven or
  absent outside core English-speaking markets, and, for at least one
  reviewer, insufficient overlap with their existing MyFitnessPal habits to
  justify switching. [DOCUMENTED, §12]
- **Absence of a social/community layer specifically** — the one directly
  on-topic finding: at least one dedicated independent reviewer explicitly
  named the lack of a social component (in the MyFitnessPal-comparison
  sense of community recipe-sharing) as a gap, though they did not frame it
  as a reason they personally churned — only as a felt absence relative to
  a competitor. [DOCUMENTED, §12] No source found ties MacroFactor
  cancellations causally to the absence of social features; the closest
  first-party churn-reason data found was generic ("medical issues,"
  "high time investment," "too much app for their needs") rather than
  social-feature-specific. [DOCUMENTED via search-tool synthesis, low-medium
  confidence, thin evidence]
- **No coach/trainer portal** — an explicit, repeatedly-cited gap versus
  Cronometer's trainer edition; this is the closest thing to a "missing
  connection feature churns people" signal found, but it is about a
  professional (paid coaching relationship) seam, not a peer/friend one.
  [DOCUMENTED, §1(b), §12]
- **AI support chatbot dissatisfaction** — a minor, support-quality
  complaint, not connection-related, included for completeness since it
  came up during the review-mining pass. [DOCUMENTED, §12]

**Net: nothing found in this research ties MacroFactor's no-social-feed
choice to any documented churn.** The churn signals that exist are about
pricing model, database coverage, and the missing *professional* coach
portal — never about missing peer/friend features.

---

## 15. Failure post-mortem

**Not applicable — no failure was found.** Every trajectory signal gathered
(user count growth 35k→400k over three years, ~200k+ paying users cited in
a 2024 award writeup, a second product line launched in January 2026, star
ratings holding at 4.7-4.8 across stores, zero funding raised yet
apparently profitable enough to have grown headcount to ~17-20) points to a
healthy, still-growing, bootstrapped business as of the most recent sources
checked (into 2026). [DOCUMENTED, synthesised across sources cited in §11]
There is therefore no "the social feature was removed/flopped" story to
extract here, because MacroFactor never built a social feature to fail —
this is a case of **deliberate omission from day one**, not a built-and-
abandoned feature. The closest thing to a cautionary note found is the
Jeff Nippard ownership-disclosure friction noted in §12 (some reviewers
feeling misled that an "endorsement" was actually an ownership stake) —
worth flagging as a risk specifically for any future parasocial/founder-
proximity connection mechanic VOLYUME might consider, but this is a minor,
review-level friction point, not a business failure.

---

## 16. Verdict [confidence-tagged]

**"Works — but not because of any connection mechanic; the omission of
social features is real evidence that a no-feed nutrition app can grow
fast and profitably, while the company's own connection-adjacent
investments (brand community, roadmap, AMAs) read as trust/support
infrastructure with no independently observed retention effect of their
own."**

- **High confidence:** the business is genuinely growing (35k→400k
  users/3 years, bootstrapped, second product launched), and this growth
  has occurred with zero social/comparison/ranking features anywhere in
  the product — so the no-feed choice has demonstrably not capped growth
  at MacroFactor's current scale. [DOCUMENTED]
- **Medium confidence:** the explicit, publicly-argued "adherence-neutral"
  anti-shame design philosophy is a genuine differentiator that reviewers
  independently credit for sustained engagement — this is the strongest,
  most directly transferable evidence in this teardown for VOLYUME's calm-
  voice/no-shame mandate, because it is a company *choosing* to market the
  absence of shame as a selling point, not merely omitting a feature.
  [DOCUMENTED, plausible causal read, not independently proven via
  controlled comparison]
- **Low confidence / largely unproven:** that the founder-run brand
  community, public roadmap, or AMAs are themselves retention drivers.
  Real, staffed, and actively invested in — but no review-mining evidence
  found in this pass ties them causally to why anyone stays subscribed.
  Treat this specific layer as **"presence, not demonstrated retention"**
  pending any better data.
- **One clear anti-pattern-adjacent caution, not from MacroFactor's design
  but from its business structure:** the Jeff Nippard co-ownership/
  endorsement friction is a specific, small but real signal that
  parasocial/founder-proximity connection mechanics carry a transparency
  risk if the audience later feels the "relationship" was commercially
  motivated rather than genuine — worth flagging for any VOLYUME mechanic
  that leans on founder-to-user closeness as a belonging substitute for
  peer-to-peer social.
