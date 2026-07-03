# Competitor teardown: Strong (Workout Tracker & Gym Log)

**Category:** fitness — strength training logger, marketed by the corpus brief as
"lightweight social, sharing"
**Research method:** web research only (search + fetch). No hands-on use of the
app was performed for this teardown — there is no [OBSERVED] tag anywhere below;
every claim is [DOCUMENTED] (cited) or [INFERRED] (flagged as reasoning, not
fact). Direct access to Reddit (reddit.com) and to the Google Play Store's
rendered review DOM was blocked by the fetch tool in this environment; where a
claim originates from a secondary blog that itself quotes Reddit/Play, this is
marked explicitly so the synthesis session can weight it correctly.
**Prepared for:** VOLYUME connection-corpus, read-only research phase. This
document does not make a design, placement, pricing or go/no-go call.

---

## Headline finding (read this first)

The brief's own category tag — "lightweight social, sharing" — turns out to
overstate what Strong actually has. Across every independent source checked
(official help centre, official privacy policy, six-plus third-party teardown
articles, the iTunes review feed, and secondary Reddit/Play summaries), Strong
has **no social graph, no feed, no friends list, no followers, no comments, no
likes, no leaderboard, no clubs and no groups.** The only "connection" surface
is a one-shot, one-directional export of a single Workout or Template through
the device's native OS share sheet — mechanically closer to AirDrop-ing a
recipe card than to any social network primitive. This is arguably the single
most useful data point in this corpus for VOLYUME's no-feed thesis: a
multi-million-user, apparently profitable, decade-plus-old fitness logger
survives and retains with **zero** comparison/ranking/feed machinery, and its
own users' complaints are overwhelmingly about sync bugs and paywall trust, not
about the absence of a social layer. [DOCUMENTED, synthesised from sources
below]

---

## 1. The connection / belonging mechanic — step by step

There is exactly one mechanic, and it is a content export, not a relationship:

1. User builds or completes a **Workout** or a **Template** (a named
   collection of exercises/sets) inside their own local library.
2. User taps the **More (…) button** on that Workout or Template and selects
   **Share**. [DOCUMENTED — Strong Help Center, "How do I share a workout or
   template?", https://help.strongapp.io/article/109-share-workout-or-template]
3. This opens the device's **standard native OS share sheet** (iOS or
   Android) — Strong does not run its own in-app contact picker or messaging
   surface. [DOCUMENTED, same source]
4. If shared via text message, "the contents of the Workout will also be
   included by default" alongside the link. [DOCUMENTED, same source, direct
   quote]
5. The recipient taps the link/URL on their own device. **The recipient must
   already have Strong installed to import the Workout or Template** — there
   is no web preview or account-free viewing path described. [DOCUMENTED,
   same source, direct quote]
6. The Workout/Template content is imported into the recipient's own local
   library as a standalone copy.
7. Nothing persists afterwards: no relationship object, no "connected"
   status, no notification back to the sender that the recipient imported (or
   ignored) it, and no ongoing visibility into what the recipient does with
   the shared item. [INFERRED from the complete absence of any friend/contact
   list, notification centre, or "shared with" state described anywhere in
   Strong's help centre, privacy policy or ToS]

A second-order detail surfaced in search only (not independently verified
against a primary Strong changelog): "the improved Share Links system is
rebuilt, and links can be used multiple times" — implying an earlier version
of the link mechanism was single-use/expiring and Strong later loosened this
to allow reuse. [INFERRED / weakly sourced — this line appears only inside a
web-search tool's own synthesis of multiple pages, not inside a page fetched
directly; flagging low confidence and no exact release version or date found]

There is no other belonging mechanic. No coach-to-client pairing, no
challenge/event system, no community feed, no comment threads.

---

## 2. The UNIT — pair? group? roster? open network? size limits?

None of the standard social units apply. The "unit" is a **single ad hoc
transaction** between exactly two parties (sender, recipient) with no
persistence. It is not:

- a **pair** (no ongoing bidirectional bond is created — nothing is stored
  after the import)
- a **group/roster** (no multi-person container of any kind exists)
- an **open network** (no discovery, no public profiles, nobody can find
  anybody)

Because the underlying transport is the native OS share sheet, a user could in
principle fan a single link out to many recipients simultaneously (share to a
group chat, broadcast to a contact list, etc.), and the "reusable" link update
noted above would support that — but Strong itself imposes no unit concept, no
size cap, and tracks none of this. [INFERRED from the share-sheet
architecture described in the Help Center article]

---

## 3. Symmetric or asymmetric? (the ranking-risk axis)

**Maximally asymmetric, to the point of being unidirectional.** The sender
pushes a static snapshot of a Workout/Template; the recipient receives a copy
they can use however they like. There is no reciprocal visibility at all:

- The recipient never sees the sender's training history, current stats, body
  data, or PRs (only the shared Workout/Template's exercise/set structure).
- The sender never sees whether the recipient did the workout, how they
  performed on it, or anything else about them post-import.
- There is no follow/follower asymmetry (a la Instagram) because there is no
  persistent account-to-account edge at all.

This is the structural reason Strong cannot produce ranking or comparison
pressure through this mechanic even in principle: there is no channel through
which one person's ongoing results become visible to another. [DOCUMENTED
reasoning from the mechanic's described behaviour in section 1, cross-checked
against PRPath's explicit statement: "Zero social features. No feed, no
friends, no sharing [as an ongoing capability]. This is intentional."
DOCUMENTED, https://prpath.app/blog/strong-vs-hevy-2026.html]

---

## 4. Data model — what is shared, what is withheld, confidence per field

| Field | Shared via the Share mechanic? | Confidence |
|---|---|---|
| Workout/Template name, exercise list, prescribed sets/reps/weight structure | Yes, included by default | [DOCUMENTED — Help Center article 109] |
| Sender's training history / past performance on those exercises | No — only the template/workout snapshot travels, not the sender's log | [INFERRED from absence of any mention; no source describes historical data transfer] |
| Sender's body weight, measurements, progress photos | No — not part of a Workout/Template object per any source found | [INFERRED — no source contradicts this; Strong's core objects are workouts/templates, not body-metric records] |
| Sender's identity/profile/account info | No — Strong has no public profile object to share; recipient does not need a Strong "account" concept to see who sent it beyond normal message-app sender identity | [INFERRED from absence of any profile/account feature in help centre or reviews] |
| Recipient's response/import status back to sender | No — no read receipt or import confirmation flows back | [INFERRED from absence] |
| Underlying personal workout data at rest (outside of an explicit share) | Stored **locally on device**, "not uploaded to Strong servers" unless the user opts into the paid Strong Cloud backup/sync feature | [DOCUMENTED — search-tool synthesis of Strong's privacy policy, https://help.strongapp.io/article/232-privacy-policy; not independently re-verified by direct fetch, so treat as medium-confidence DOCUMENTED] |

Net: the data model is deliberately thin and one-way. What is shared is a
**plan** (forward-looking, prescriptive — "here is a workout to try") rather
than a **result** (retrospective, comparison-inviting — "here is what I
lifted"). See section 7 for why this distinction matters as a transferable
kernel.

---

## 5. Every state + edge case

- **Invite:** does not exist as a concept — there is no friend/contact
  invitation flow, only ad hoc content sharing. [DOCUMENTED by absence across
  all sources]
- **Share (send):** via More (…) → Share → native OS share sheet.
  [DOCUMENTED — Help Center 109]
- **Accept / import:** recipient taps the link; Strong must already be
  installed; one-tap import into their own library. [DOCUMENTED — Help
  Center 109]
- **Decline:** no explicit decline action exists — the recipient simply does
  not tap the link, and no signal returns to the sender either way.
  [INFERRED from absence of any notification/read-receipt feature]
- **Block:** no block feature exists, and none is architecturally necessary,
  because there is no persistent contact/relationship object to block in the
  first place. [INFERRED from absence — this is itself a notable design
  outcome, see section 6]
- **Leave:** no group/roster exists to leave.
- **Empty state:** because there is no social tab, feed, or friends list at
  all, Strong has no "empty network" ghost-town screen to manage — a common
  failure mode in social-feature-bearing fitness apps (e.g. a new user's feed
  showing nothing because they have no connections yet) simply does not
  exist for Strong. [INFERRED — structural absence, confirmed by exhaustive
  search finding no such screen described anywhere]
- **Offline:** core workout logging is fully local-first and offline-capable;
  the Share action itself (opening a link, importing) plausibly needs
  connectivity to resolve the shared link, though this was not directly
  confirmed. [INFERRED, consistent with the general local-first architecture
  described in the privacy policy]
- **Expired link:** the "rebuilt… used multiple times" phrasing implies a
  prior link design did expire or was single-use, but no source gives the
  exact old behaviour, version number, or date of the change. [INFERRED, low
  confidence, flagged above in section 1]

---

## 6. Safety / moderation scaffolding

**None exists, and — critically — none is architecturally required**, because
there is no stranger-facing discovery surface, no public profile, no
messaging system, no comment thread, and no follow mechanic. A search across
Strong's Help Center, Privacy Policy, and Terms of Service, plus every
third-party review/teardown found, turned up **zero** mentions of reporting,
blocking, moderation, identity verification, or harassment defence tooling.
[DOCUMENTED by exhaustive absence across https://help.strongapp.io/,
https://help.strongapp.io/article/232-privacy-policy,
https://help.strongapp.io/article/179-strong-terms-of-service, and all
teardown articles cited in this document]

This is worth stating plainly for the synthesis session: Strong sits at the
**zero-attack-surface end of the spectrum**. It cannot be used to harass,
compare, or shame a stranger because it never puts one user's activity in
front of another user it did not explicitly, individually export to. There is
no "moderation problem" to solve because there is no network. This is a
legitimate design pattern in its own right (see section 16) — not merely an
omission.

---

## 7. Comparison / shame audit

**Result: clean. No ranking, no streaks-vs-others, no public performance, no
shame mechanic of any kind was found.** Every third-party comparison piece
checked explicitly frames this as deliberate: "If you prefer to focus purely
on your own training without comparison or distraction, Strong's absence of
social features is a feature, not a bug" [DOCUMENTED,
https://prpath.app/blog/strong-vs-hevy-2026.html]; "If you find Instagram and
TikTok exhausting… Strong is the relief" [DOCUMENTED,
https://www.sensai.fit/blog/hevy-vs-strong-2026].

**Transferable kernel, stripped of any toxicity (there is none to strip,
which is itself the finding):** sharing a **workout/template** — a
prescriptive plan someone else can choose to run — carries fundamentally
different social risk than sharing a **logged result**. A plan invites "try
this if you want"; a result invites "here's how I compare to you." Strong's
entire sharing mechanic operates exclusively on the plan side of that line.
This is a directly transferable pattern for VOLYUME: a connection mechanic
built around exchanging *forward-looking prescriptive artefacts* (a plan, a
routine, a meal template) rather than *backward-looking performance
artefacts* (a PR, a streak, a weight-loss number) structurally avoids
comparison risk without needing any additional guardrail — the shame vector
simply has nothing to attach to.

---

## 8. Onboarding to the social feature

There is no dedicated onboarding. Share is a **contextual menu action**
(the "…" / More button on any Workout or Template screen) — discoverable only
by exploring that menu, not surfaced during first-run onboarding, not gated
behind any tutorial, and not prompted by any "invite your friends" nudge or
contacts-permission request. [DOCUMENTED — Help Center 109 describes it only
as a per-item menu action; no onboarding-flow description found anywhere]
Consequence: awareness of the feature appears to be low relative to its
existence — one App Store reviewer, four stars, explicitly asked for a
capability ("add my friends… share workouts") that already exists in
skeletal export form, suggesting either the feature is not discoverable or
what the reviewer wants (persistent friends, not one-shot export) genuinely
does not exist. See section 12, review #14.

---

## 9. Monetisation — free / paid / tier?

Sharing (the Share menu action itself) is **free**, available on Strong's
free tier, and not gated behind Strong PRO. [INFERRED — no source lists
Share as a PRO-gated feature; PRO-gated items named across sources are
progress charts/advanced analytics, unlimited custom routines beyond three,
and data export/CSV — Share is never listed among them, e.g.
https://gifit.io/blog/strong-workout-app-review/ and
https://dr-muscle.com/strong-workout-app-review/]

Functionally this makes the mechanic read as a **low-cost organic growth
loop** rather than a monetised feature: because the recipient must install
Strong to import a shared Workout/Template, every share is a soft app-install
prompt. [INFERRED reasoning — Strong itself does not describe the feature
this way in any source found; this is a hypothesis about its business
function, not a stated fact]

Strong's actual pricing structure (for context, not tied to sharing):
Free tier with core logging + 3 custom routines cap; **Strong PRO**
$4.99/month, $19.99/6 months, $29.99/year, or **$99.99 lifetime ("Forever")**
one-time purchase. [DOCUMENTED — App Store listing via WebFetch, and
corroborated by https://gifit.io/blog/strong-workout-app-review/]

---

## 10. Sources (consolidated)

- Strong Help Center — sharing mechanic: https://help.strongapp.io/article/109-share-workout-or-template [DOCUMENTED]
- Strong Help Center — future features / roadmap stance: https://help.strongapp.io/article/242-future-features [DOCUMENTED]
- Strong Help Center — privacy policy: https://help.strongapp.io/article/232-privacy-policy [DOCUMENTED, accessed via search-tool synthesis, not independently re-fetched]
- Strong Help Center — Terms of Service: https://help.strongapp.io/article/179-strong-terms-of-service [DOCUMENTED, referenced]
- Official site: https://www.strong.app/ and https://www.strong.app/love (testimonials) [DOCUMENTED, direct fetch]
- Apple App Store listing: https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 [DOCUMENTED, direct fetch]
- Apple App Store public review RSS feed (50 reviews pulled directly, see section 12): https://itunes.apple.com/us/rss/customerreviews/id=464254577/sortby=mostrecent/json [DOCUMENTED, direct fetch of Apple's own public API]
- Google Play listing: https://play.google.com/store/apps/details?id=io.strongapp.strong [attempted direct fetch, blocked/truncated by tooling — figures below are via search-tool synthesis only, medium confidence]
- PRPath, "Hevy vs Strong (2026)": https://prpath.app/blog/strong-vs-hevy-2026.html [DOCUMENTED]
- SensAI, "Hevy vs Strong (2026)": https://www.sensai.fit/blog/hevy-vs-strong-2026 [DOCUMENTED]
- GiFit, "Strong Workout App Review": https://gifit.io/blog/strong-workout-app-review/ [DOCUMENTED]
- Dr. Muscle, "Strong Workout App Review": https://dr-muscle.com/strong-workout-app-review/ [DOCUMENTED]
- RepReturn, "Strong App Review 2025": https://repreturn.com/strong-app-review/ [DOCUMENTED]
- Cora Health, "Best Workout Tracker per Reddit: 200+ Threads Analyzed": https://www.corahealth.app/blog/best-workout-tracker-reddit [DOCUMENTED as a secondary compilation — the underlying Reddit threads were not independently re-verified by this researcher; treat Reddit quotes relayed through this source as secondhand]
- Setgraph, "Best Strength Training App Reddit Users Recommend": https://setgraph.app/ai-blog/best-strength-training-app-reddit [DOCUMENTED, secondary Reddit compilation, same caveat]
- PonteFuerteAI, "Hevy vs Strong (2025)": https://www.pontefuerteai.com/blog/hevy-vs-strong-vs-pontefuerteai-workout-app-comparison [DOCUMENTED, secondary]
- PaywallScreens.com, Strong revenue/download/rating snapshot: https://www.paywallscreens.com/apps/strong-workout-tracker-gym-log-by-strong-fitness-pte-limited-mobile-paywall-1f78 [DOCUMENTED, but methodology/date/source of the $500K/mo and 100K-download figures is not disclosed on the page — treat as a directional estimate, not verified financials]
- Tracxn company profile: https://tracxn.com/d/companies/strong-fitness/ [DOCUMENTED where quoted via search-tool synthesis; direct fetch returned HTTP 403]
- Singapore company registry data for Strong Fitness Pte Ltd (incorporation date, address, employee count ~19): via search-tool synthesis of sgpbusiness.com / Tracxn [DOCUMENTED, medium confidence — not independently cross-verified against the primary registry filing]

---

## 11. Evidence it works — not vibes

Strong is not a dead or fringe app: **4.9/5 on the App Store (108K ratings)**,
**an estimated 4.3/5 on Google Play**, an estimated **$500K/month** revenue and
**~100K monthly downloads** [DOCUMENTED but single-source, undisclosed
methodology — https://www.paywallscreens.com/apps/strong-workout-tracker-gym-log-by-strong-fitness-pte-limited-mobile-paywall-1f78],
a small but apparently sustainable team (~19 employees, incorporated in
Singapore in 2019 though the app itself has been live considerably longer —
sources disagree on original launch date, one saying 2011, another "since
2014"; flagging this discrepancy rather than resolving it [INFERRED /
unresolved]), and user testimonials spanning **3, 4, 5+ years of continuous
personal use** [DOCUMENTED — https://www.strong.app/love].

But the connection/sharing mechanic is **not** where this evidence points.
Every comparison source checked independently converges on the same
conclusion: Strong's retention is driven by **logging speed, reliability of
the previous-set overlay, and depth of personal history**, while its complete
absence of social features is repeatedly named as its most obvious
competitive gap against Hevy specifically. [DOCUMENTED, convergent across
PRPath, SensAI, GiFit, RepReturn — see section 10 for URLs] This is a
textbook "**presence, not retention**" case for a sharing feature that barely
exists in the first place: the feature that IS present (native OS share of a
workout/template) shows no evidence anywhere of being why people stay: no
testimonial, review, or comparison article credits it with retention. What
retains is documented separately in section 13.

**Confidence:** high that the connection mechanic is not the retention driver
(convergent, independent sourcing); low-to-medium on the precise revenue and
download figures (single undisclosed-methodology source, no time series, no
independent corroboration found).

---

## 12. Review & community mining (mandatory)

### App Store — 50 most recent reviews, pulled directly from Apple's public
review API [DOCUMENTED — https://itunes.apple.com/us/rss/customerreviews/id=464254577/sortby=mostrecent/json]

Categorised by theme (all 50 reviews were read; this is not a cherry-picked
subset):

**Sync/reliability complaints — by far the largest category (at least 15 of
50 reviews):**
- Gator0910 (4★, "Buggy"): "Love the app for the features but it has become
  so buggy when trying to sync with my Apple Watch."
- Icarus1600 (4★): "The Apple Watch / Phone sync has become incredibly buggy
  since the last major update."
- Vvampyr (2★): "This app is incredibly inconsistent, especially when
  syncing up to my Series 11."
- Moogleii (2★): "Lost lots of set information after completing a workout.
  Watch had all sets, app did not."
- Cody (3★): "The Apple Watch app sync has been buggy for years despite many
  promises."
- DDXV (1★): "Last update hosed the syncing between watch and iPhone. Won't
  accept password."
- E Maki (1★): "It used to sync well with my watch. Not anymore. Almost
  useless."
- dpojr1 (2★): "If you use the 'live sync' feature, the app will regularly
  lose sets you saved."
- George the iOS engineer (1★): "There are so many bugs I run into every
  single workout."

**Exactly one review out of fifty explicitly asks for a social/friends
capability:**
- HammmyBo (4★, title "Strong Suggestion"): **"Please make it so I can add my
  friends on this app and we can share workouts."** This is the single
  clearest piece of primary-source evidence in this whole teardown that a
  minority of Strong's own users want a persistent social layer beyond the
  one-shot export that already exists — and tellingly, they rated the app
  4★ anyway, i.e. its absence is not a dealbreaker even for the person asking
  for it.

**Direct unfavourable comparison to Hevy on features (not specifically
social):**
- That-reviewer-guy (3★, "Hevy Free version better"): "Hevy app gives more
  options, insights and charts than this app."

**Paywall/monetisation trust breakdown (churn-adjacent, not social):**
- JC187 (1★, "Update is trash"): "All of my years of data are gone. My
  workouts are gone. Everything requires money now."

**Feature-request noise (unrelated to social), for scale/context:**
- Kevin Shifley (3★): wants Strava integration.
- Chizunt (5★): wants a step metric.
- Southpaw De (4★): wants exercise-target info in the description.
- Cb1087 (2★): notes cannot see set notes in history view.
- Name124674476 (4★): notes all exercise illustrations are male figures,
  requests a setting.

**Long-tenure loyalty testimonials (retention signal, covered in depth in
section 13):**
- SW4322W (5★): "I've been using Strong for over two years… I now have a
  huge record of specific workouts."
- shahahjshaah (5★): "Been using it to track workouts for the past 3 years."
- Dishwndicbdbrss (5★): "Owned/used since 2017."

### Reddit and forum sentiment — accessed only via secondary blog
compilations (direct Reddit fetch was blocked in this environment; the
following are secondhand and should be weighted accordingly)

- "Strong's UI is just faster for actual gym sets," attributed to a user who
  "used Strong for 3 years and tried switching to Hevy twice." [DOCUMENTED
  via secondary compilation, https://www.corahealth.app/blog/best-workout-tracker-reddit
  — original Reddit thread not independently located/verified]
- "r/xxfitness skews toward Hevy for the social accountability angle…
  Strong is less common there — it's more popular in the strength-sport
  communities where speed of logging is the only thing that matters."
  [DOCUMENTED via same secondary source]
- "Hevy's better than Strong for its community and frequent updates,"
  attributed to an r/fitness30plus user. [DOCUMENTED via secondary
  compilation, https://fitlifeway.com/best-fitness-apps-for-tracking/ —
  original thread not independently verified]
- "Multiple users who switched from Strong specifically mention the social
  feed as the reason they stayed with Hevy," alongside a second reason —
  "active development... Strong went through a period of slow development
  before picking back up" — and a third, practical reason: Hevy's import
  path lets a switcher "bring your entire workout history with you."
  [DOCUMENTED via secondary compilation,
  https://www.pontefuerteai.com/blog/hevy-vs-strong-vs-pontefuerteai-workout-app-comparison
  — original Reddit/forum threads not independently verified]
- One review-mining blog claims "the top Reddit thread for Strong-related
  searches asks, 'Is Strong still best workout app?'" as evidence of active
  alternative-seeking. [DOCUMENTED via https://gifit.io/blog/strong-workout-app-review/,
  but this is the blog's own framing/interpretation, not a verified primary
  Reddit thread — treat as INFERRED-strength evidence despite the DOCUMENTED
  citation, because the underlying claim could not be corroborated
  independently]

**Bottom line on review mining:** the volume of primary-source (App Store)
complaint is dominated by **technical reliability** (Watch/phone sync) and
**monetisation trust**, not by the absence of social features. The desire for
a social layer is real but is a minority signal even in secondhand Reddit
compilations, and shows up mainly as a *reason to switch to a competitor that
has it* rather than as *the* driver of Strong's own churn.

---

## 13. What retains

Pulled directly from testimonials and reviews (section 12 and 10):

- **Personal history depth and continuity.** Multiple users cite 2, 3, 4,
  even 9+ years of continuous use and explicitly value having "a huge record
  of specific workouts" (SW4322W) built up over that time. This is a
  self-referential retention loop — the longer you use it, the more costly it
  is to leave (your own history), independent of any other person.
- **Logging speed / low friction in the moment.** "Strong's UI is just
  faster for actual gym sets" is the single most repeated reason cited for
  staying, including by users who tried and rejected a switch to a
  more social competitor (Hevy) specifically because the switch didn't
  improve their actual lifting session. [DOCUMENTED via corahealth.app,
  secondary]
- **The previous-set overlay** (seeing last session's weight/reps
  automatically pre-loaded when starting a new set) is called "the most
  important feature in any strength app" by an independent review.
  [DOCUMENTED — https://repreturn.com/strong-app-review/]
- **Reliability when it works, plus a one-time "forever" purchase option**
  that removes subscription fatigue for long-term users. [DOCUMENTED —
  https://gifit.io/blog/strong-workout-app-review/]

Notably absent from this list: nothing in the retention evidence credits the
Share/export mechanic, or any social/community element, for keeping people in
the app. Retention here is entirely a **solo-habit** story.

---

## 14. What churns

Kept deliberately separate from section 13:

- **Apple Watch / phone sync bugs** — the single largest, most repeated
  complaint theme in the primary App Store sample (section 12), spanning
  years of reviews ("buggy for years despite many promises" — Cody).
- **Paywall/monetisation trust breaks** — JC187's 1★ review ("All of my
  years of data are gone… Everything requires money now") is a sharp,
  concrete instance of a user feeling retroactively locked out of data they
  had already built up, a trust-destroying pattern regardless of category.
- **Perceived stagnation vs a faster-moving competitor** — "the app hasn't
  evolved much over the years… UI feels a bit stale" (Philly RobertH, 4★,
  tellingly titled "Reliable and Effective, But Starting to Feel Stale") and
  "no longer updating… extremely limited" (Bbcggdfjy, 2★). Strong's own Help
  Center corroborates a slower cadence: it currently states the company is
  "no longer taking feature requests" while undergoing an internal
  "architectural overhaul." [DOCUMENTED — https://help.strongapp.io/article/242-future-features]
- **The one real connection-axis churn signal:** per secondary-sourced
  Reddit compilations, some users who switch to Hevy name **the social feed**
  and **more active development** as their reasons, and note that Hevy's
  import path made the switch low-friction because they could bring their
  history with them. [DOCUMENTED via secondary source, see section 12 —
  flagged lower confidence due to no independent primary verification]

The churn evidence, in short, is dominated by **execution quality** (sync
reliability, release cadence, monetisation trust) rather than by the
connection mechanic — but the connection gap is a real, named, if secondary,
reason a specific slice of users leave for a direct competitor.

---

## 15. Failure post-mortem

Strong has **not** failed, faded, or had its social feature removed — it
never built one to remove. The relevant post-mortem question here is
therefore inverted: **why has a decade-plus-old, apparently profitable app
never built a social layer even as its most consistently-named competitive
disadvantage?** Two explanations are supported by the evidence, and they are
not mutually exclusive:

1. **Considered strategic choice.** Multiple independent reviewers describe
   the lack of social features as "intentional" positioning ("This is
   intentional" — PRPath) rather than neglect, aimed at a specific user
   (serious/strength-sport lifters who "don't need the social component" —
   RepReturn) who is well served precisely because the app stays out of
   their way. [DOCUMENTED, convergent across sources in section 10]
2. **Resource-constrained execution priorities.** With a small team (~19
   employees) [DOCUMENTED via secondary company-registry synthesis, medium
   confidence] and a currently-stated internal architectural rebuild
   consuming engineering bandwidth [DOCUMENTED — Help Center 242], and a
   long-running, unresolved Watch-sync reliability problem visibly consuming
   user goodwill (section 12/14), it is plausible the team's finite capacity
   has gone toward fixing what's broken rather than adding what's missing.
   [INFERRED — this is a reasonable but unverified explanation; Strong has
   not stated this directly in any source found]

Either way, the risk this creates for Strong is visible in the evidence:
Hevy is repeatedly and specifically named — by reviewers, by secondhand
Reddit sentiment, and by Strong's own users switching away — as the
destination for anyone who does want community/accountability, and at least
some of those switches are attributed partly to Strong's slower release
cadence rather than to the social gap alone. [DOCUMENTED/INFERRED mix, see
sections 12 and 14]

---

## 16. Verdict

**"Presence, not retention" — and a clean natural experiment for the no-feed
thesis.** Strong is a large, apparently healthy, long-lived fitness logger
that retains users almost entirely through solo-habit mechanics (logging
speed, the previous-set overlay, and multi-year personal history depth), with
a connection mechanic so minimal (one-shot, one-directional workout/template
export via the native OS share sheet, no persistent relationship, no
visibility either direction afterwards) that it barely qualifies as "social"
at all — the corpus brief's "lightweight social, sharing" tag should be read
as **"functionally no social, plan-only content export"** once the evidence is
examined. No comparison, ranking, streak-pressure or public-performance
mechanic exists, and none is needed for retention: the evidence for that
retention is convergent and comes from real, multi-year user testimony, not
vibes. The one place the absence of any connection layer visibly costs
Strong is a documented (if secondhand-sourced) trickle of switchers to Hevy
who explicitly want social accountability — a real but minority churn vector,
dwarfed in review volume by sync-reliability and paywall-trust complaints.

**Confidence:** high on "the sharing mechanic is not why people stay"
(convergent across App Store review mining, six independent teardown
articles, and Strong's own testimonials page, none of which credit sharing
for retention). Medium on the size/significance of the social-gap churn
vector (built from secondary Reddit compilations that could not be
independently re-verified in this environment). Low on precise business
metrics (single-source revenue/download estimate, undisclosed methodology,
no time series to judge trajectory as growing/plateaued/declining with
confidence — the qualitative signals available, such as "feels stale" and
"no longer taking feature requests," lean mildly toward plateaued rather than
either growing sharply or dying).

---

## Notes on hard-constraint bump points (for the synthesis session)

- **No comparison/ranking/shame:** Strong bumps into this constraint
  nowhere — it has no mechanism capable of producing it. This makes it the
  cleanest reference point in the corpus for "what does zero look like and
  does it still retain."
- **Stranger-safety/moderation model:** not applicable to Strong — there is
  no stranger surface. Any VOLYUME connection mechanic modelled after
  Strong's pattern (plan/template export between two known, already-in-
  contact people) would inherit this same reduced need for a
  moderation/blocking system, since it never creates a discoverable public
  surface between non-consenting parties.
- **Article 9 / derived-only sharing:** Strong's shared object (a
  Workout/Template's exercise structure) is a close analogue to VOLYUME's
  "derived-only" share-card precedent — it deliberately excludes personal
  metrics (body weight, measurements) and shares only the
  prescriptive/structural artefact. Worth flagging to the synthesis session
  as a validated precedent for the "share the plan, not the body data"
  pattern, independent of any Strong-specific technical detail.
- **Free/Pro gating:** Strong's Share action is free-tier, not Pro-gated —
  consistent with treating a connection/growth mechanic as a distribution
  lever rather than a premium feature, though note this is this researcher's
  inference about Strong's intent, not a stated fact from Strong.
