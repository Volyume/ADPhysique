# Forum posts — 2026-07-13

**Lane:** FOUNDER-ONLY (OPERATING-CHARTER §4). Drafts only. The founder
(Allan) reviews, edits into his own words, and posts every item personally
from his own accounts. No agent or scheduler posts any of this, ever.

**Status:** DRAFT — pending compliance-reviewer PASS (recorded at the bottom
of this file once run).

**Research limitation, disclosed up front.** Live Reddit access was
unavailable this session — WebFetch cannot reach any `reddit.com` host
(`www.`, `old.`, `.json` and wiki paths all returned "unable to fetch"), and
web search returned only third-party summaries of Reddit rules, not verbatim
current rule text. Every sub-rule summary below is therefore a **best-effort
read**, not a verified quote, exactly as the playbook anticipates
(`reddit-uk-communities.md`, "Founder actions required": *"Confirm or correct
community-manager's read of each community's rules before first posting
there"*). **Before posting anywhere below, Allan must open the sub himself,
read the current sidebar/wiki rules, and confirm or correct the summary
given.** This is not a formality here — it is the only verification this
pack has had.

---

## Claims table (all five posts)

| Claim used | PRODUCT-FACTS reference |
| --- | --- |
| Volyume is a coaching system for self-coached lifters, live on Google Play (`app.volyume`) | A |
| The weekly coaching decision (change or hold) is deterministic, rule-based and explainable, not conversational AI | A, CLAIMS-STANDARDS §6 |
| The app holds a decision rather than guessing when there isn't enough data yet | A, F |
| Free tier: full workout logging, plan library, custom plan building, training history, progress tracking (training progress — PBs and lift/volume trends, not bodyweight) | B |
| Pro: nutrition/macros, food diary, barcode scanning, meal planning, Progress Scan, weekly Precision Coaching, bodyweight/weight-trend logging | B |
| 551 exercises in the built-in library, plus unlimited custom exercises | D |
| 31 built-in training plans | D |
| Over 29,000 UK foods, searchable offline | D |
| Offline-first: local database is the source of truth, encrypted on device | E |
| Cloud data residency EU (Dublin); no ads; no data sold; no PII to analytics | E |
| Live on Google Play now; iOS is TestFlight only, not yet on the App Store | A, E |
| No exercise demonstration videos, no wearable companion app, no meal-photo AI, no restaurant database, no micronutrient tracking | F |
| Zero users at build date; no marketing done before this system | A |
| Volyume is not a replacement for a human coach | A, CLAIMS-STANDARDS §5 |
| Built with React Native 0.81.5 + Expo SDK 54 (developer-audience posts only) | D |

No trial length or price is stated anywhere in this pack (omitted per the
hard rule — these are feedback/story posts, not conversion pitches, and
omitting keeps them honestly non-salesy). No bodyweight/scale framing is
foregrounded anywhere; where weight logging is mentioned it is one line
inside a Free/Pro feature list, never a hook (CLAIMS-STANDARDS §5). No
competitor app is named or described anywhere in these drafts.

---

## Post 1 — r/androidapps (dev/build post)

**Self-promotion rules summary (best-effort, unverified this session):**
r/androidapps is one of the few subs whose actual purpose is indie
developers posting their own Android apps. General pattern from research:
post your own app, disclose you're the developer, no link shorteners or
affiliate links, respond genuinely to comments, don't repost the same app
repeatedly. Because the sub's whole purpose is app showcases, the
playbook's 90/10 rule doesn't bite the same way it does on a general
community — one on-topic post here isn't off-topic self-promotion the way
it would be on a lifting sub. **Allan must confirm the current sidebar
rules (posting frequency limits, any required flair, account-age/karma
minimums) before posting.**

**Compliance check:** full disclosure as developer, no fake voice, free/pro
boundary accurate, no trial/price numbers, no competitor names. Complies as
drafted.

**Title:** i built a workout + food tracking app that makes the weekly
change-or-hold call instead of leaving it to you (Android, live now)

**Body:**

I'm a solo developer and I've been building this on and off for a while.
It's called Volyume and it's live on Google Play now (`app.volyume`). No
marketing done yet, this is genuinely the first place I'm talking about it,
so I'd rather get honest feedback than pitch it.

The problem I was solving for myself: I log everything, training and food,
but the actual weekly decision, do I change something or keep going as I
am, was still mine to work out by hand every time. So the core of the app
is a weekly check-in that reads what you've logged and tells you change or
hold, with the reasons shown.

The bit I care about most as a developer: it's deterministic, not an AI
chatbot. Same logged inputs give the same decision every time, and the
reasoning is laid out so you can check the logic rather than trust a black
box. If there isn't enough data yet to make a sound call, it says so and
holds rather than guessing.

What's actually free, permanently: full workout logging, the plan library,
custom plan building, training history, and progress tracking (PBs, lift
and volume trends). That's a real product on its own, not a stripped demo.

What's in Pro: the nutrition side (food diary, barcode scanning, meal
planning), the weekly coaching decision itself, and bodyweight/weight-trend
logging.

Some numbers, since this is the sub for it: 551 exercises in the library
plus unlimited custom ones, 31 built-in training plans, and over 29,000 UK
foods searchable fully offline. The local database on your device is the
source of truth, encrypted, and cloud sync runs through the EU (Dublin). No
ads anywhere, nothing sold.

Honest about what's missing: no exercise demo videos, text cues only. No
wearable companion app. No meal-photo logging. iOS exists but it's
TestFlight only right now, not on the App Store yet.

Genuinely open to criticism here, especially on the deterministic-not-AI
framing, since I know some people will assume "AI" is a feature not a
worry. Ask me anything about how it works.

**When to post:** a weekday evening, UK time, once Allan has edited it into
his own words. Avoid the same day as any of the other four posts below —
spacing posts out across different days reads as a person sharing
naturally, not a coordinated launch.

**Expected replies and how Allan might respond:** questions on why not use
AI/LLM coaching (answer with the deterministic/explainable framing already
in the post, never disparage the idea of AI coaching generally, just
explain the choice); "how is this different from [tracker]" comparisons
(never state what another named app does or doesn't do — answer only in
terms of what Volyume does); pricing questions (answer honestly if asked
directly, quoting only the approved CLAIMS-STANDARDS §3 trial wording and
§4 pricing if it comes up in a reply, never volunteered in the post itself);
requests for exercise videos or wearables (acknowledge honestly as not
built yet, no promises on timeline unless Allan actually has one); mod
removal risk is low here as this is on-topic for the sub, but Allan should
still read the current rules first.

---

## Post 2 — r/naturalbodybuilding (value-first discussion, no app mention)

**Self-promotion rules summary (best-effort, unverified this session):**
research this session could not confirm r/naturalbodybuilding's current
self-promotion policy with any confidence — no verbatim rule text could be
retrieved (Reddit itself unreachable; general web search returned nothing
sub-specific). Bodybuilding-advice subs of this kind commonly restrict or
ban outright any promotional content, including from a genuine
first-person "I built a tool" framing. Given the brief's own instruction
("if their rules forbid any self-promo, write the post WITHOUT the app
mention") and CLAIMS-STANDARDS §7's conservative-by-default principle, the
draft below **omits the Volyume mention entirely**. It is value-only: a
lifter's own reflection on a real training trap, useful and complete on its
own, no product, no link, no ask.

**Compliance check:** no product claim is made at all, so the Claim Rule
doesn't apply; this is educational prose in the sense CLAIMS-STANDARDS §2's
scope clarification describes (general evidence-based training reflection,
no outcome promised, no product named). Complies as drafted. **If Allan
independently confirms the sub does allow a light, on-topic mention, the
closing line below can be swapped in** (kept separate, gated on its own):

> *Optional closing line, only if self-promo is confirmed allowed:* "I ended
> up building a tool around this problem, happy to share if that's alright
> here."

**Title:** the over-adjusting trap: why changing your programme or
calories every week keeps you stuck

**Body:**

Something I had to unlearn: every time progress stalled for a week, my
instinct was to change something. Add a set, drop calories, swap an
exercise. It felt like taking action. Looking back, it was mostly noise
chasing.

One week of data is not a trend. Bodyweight moves with water and salt and
sleep. A single flat week on the bar can be a bad night's sleep or a stressful
week at work, not a stalled programme. If you react to every wobble, you
never actually run the programme or the diet long enough to know if it
was working, because you keep changing the experiment before it's finished.

The pattern I see in myself and in other people's logs: three or four weeks
of holding steady tells you far more than reacting weekly ever does. The
hard part isn't knowing this, it's sitting still when the scale or the bar
doesn't move the way you hoped on week two, and trusting the process for
one more week before touching anything.

What actually changed my behaviour was writing down, in advance, what would
count as a real signal to change something, before I started a block. Not
"if I feel like it's not working" but a specific number of weeks, a specific
size of stall. Deciding the rule before you're in the emotional middle of a
plateau makes it much harder to talk yourself into a change that isn't
warranted yet.

Curious whether others here have a rule for this, or whether it's more
feel-based for most people. What actually stops you from changing things
too often?

**When to post:** any day, no particular timing advantage known; better to
post when Allan has a genuine, current example from his own training to
draw on if replies ask for specifics (this makes the disclosure that it is
personal reflection credible without needing the app mention).

**Expected replies and how Allan might respond:** this is a well-trodden
topic on lifting subs, so expect agreement plus people sharing their own
heuristics (autoregulation, RPE-based rules, fixed block lengths); some
replies may ask "do you use an app for this" organically, at which point
Allan can answer honestly and personally that he built one, exactly the
kind of directly-relevant, reader-initiated mention CLAIMS-STANDARDS and
the playbook treat differently from an unprompted plug — but only if the
sub's rules, confirmed by Allan beforehand, allow it in comments even where
the post itself carries none.

---

## Post 3 — r/Fitness, weekly self-promotion thread (comment, not a standalone post)

**Self-promotion rules summary (best-effort, unverified this session):**
research this session (web search only, Reddit itself unreachable) turned
up a secondary-source claim that r/Fitness runs a scheduled weekly thread
that includes a self-promotion slot, commonly referred to as
"Self-Promotion Saturday," alongside r/Fitness's other themed weekly
threads. **This could not be verified against the sub's actual current wiki
this session and must be confirmed by Allan before use** — if no such
thread currently exists, or r/Fitness's rules ban self-promotion outright
with no carve-out, this draft must not be posted to r/Fitness at all
(reroute to r/workout only if its own current rules confirm a comparable
allowance, or drop this slot). This is written as a **comment inside that
week's live thread**, not a standalone post — most subs that allow
self-promotion only in a megathread require it as a reply, and a standalone
post with this content would very likely be removed.

**Compliance check:** short, honest, no trial/price numbers, free/pro
boundary accurate, no competitor names, no link included by default (see
note). Complies as drafted.

**Title:** *(not applicable — this is a comment reply inside the sub's
existing weekly thread, not its own post. First line below serves as the
opener.)*

**Body (comment):**

I'm the solo developer behind Volyume, a training and food-tracking app,
live on Google Play. The bit that's different from a plain logger: once a
week it reads what you've logged and tells you whether to change something
or hold, with the reasons shown, using deterministic rules rather than an
AI chatbot.

Free tier is a real product on its own: full workout logging, plan
library, custom plan building, training history, progress tracking. The
nutrition side and the weekly coaching decision sit in Pro.

Genuinely early days, no marketing done before this. Would appreciate any
feedback, especially from anyone who's tried and dropped a few trackers
already.

**When to post:** only within that week's live thread, on the day it's
posted (confirm the current day/cadence when checking the rules — the name
suggests Saturday but this must be verified, not assumed). Do not post on
the same day as Post 1 (r/androidapps) if avoidable, to keep the spread
natural.

**Sub-rule caveat, specific:** confirm whether the thread's format permits
a direct Play Store link in the comment, a bare app name only, or neither —
the draft above deliberately omits a link so it is safe by default; Allan
adds one only if confirmed allowed.

**Expected replies and how Allan might respond:** weekly self-promo threads
get lower engagement than front-page posts, so expect few or no replies;
if any arrive they're usually direct questions (platform, price, what makes
it different) — answer honestly and briefly, same guidance as Post 1 on
pricing and competitor names.

---

## Post 4 — UK-specific sub (target unverified — flagged per instruction, not invented)

**On the target sub, stated plainly:** this session could not verify, with
confidence, an actively-posting UK-specific lifting subreddit distinct from
the large international ones (r/Fitness, r/naturalbodybuilding, etc.).
`r/ukfitness` could not be confirmed to exist or be active — a stats-site
lookup returned no page for it, and web search returned only unverifiable,
low-confidence summaries. Per the instruction not to invent a community:
**no specific subreddit is asserted below as the target.** Two honest paths
for Allan, either is fine:

1. Search Reddit himself for a UK-specific lifting community with real
   recent activity (candidates that may be worth his own check, unverified
   by me: `r/formuk`, which is form-check focused and may not welcome an
   off-topic dev post — check its scope before using it) and confirm its
   rules before posting the draft below there.
2. Use a genuinely UK-specific off-Reddit forum instead — UK-Muscle
   (uk-muscle.co.uk) is a long-standing UK bodybuilding forum outside
   Reddit; if Allan has an account or wants one, the same draft (adapted to
   forum posting conventions, e.g. no subreddit-style title) would fit
   there, subject to reading that forum's own posting rules first, which
   this session has not done.

**Compliance check (of the draft body only, independent of venue):**
UK-voice, Google Play only claimed as live, iOS correctly described as
TestFlight/coming soon, free/pro boundary accurate, no trial/price figures,
no competitor names. Complies as drafted.

**Title:** built a training + food app in the UK, live on Google Play now,
iOS on TestFlight

**Body:**

I'm Allan, UK-based, and I've built a training and food tracking app called
Volyume. It's live on Google Play now. iOS exists and is in testing through
TestFlight, but it isn't on the App Store yet, so I'm not going to pretend
it's there.

The reason I built it: I was already logging training and food properly,
but every week I still had to sit down and work out myself whether to
change anything. Volyume does that weekly call for you and shows the
reasoning, using fixed rules rather than an AI model, so the same data
always gives the same answer and you can check the logic.

The free tier is a genuine product on its own: full workout logging, the
plan library, custom plan building, training history, and progress
tracking. Pro adds the nutrition side and the weekly coaching decision.

Food database is UK-focused, over 29,000 UK foods, searchable fully
offline. Everything's stored locally on your device, encrypted, and any
cloud sync goes through servers in the EU.

Zero users so far and no marketing done, this is genuinely me asking for
honest feedback from people who actually train, not a launch push. What
would make this worth using for you?

**When to post:** weekday evening or weekend morning, UK time, once the
right community is confirmed (see above). Do not post the same week as
Post 3 if both end up targeting an r/Fitness-adjacent audience, to avoid
the appearance of a coordinated push.

**Expected replies and how Allan might respond:** if the venue is a smaller
UK-specific community, expect a slower, more personal thread, possibly UK
lifters asking about UK-specific gym culture fit or GDPR/data questions
(answer honestly using the EU-Dublin residency fact, PRODUCT-FACTS section
E); same guidance as Post 1 on pricing and never describing competitor
apps.

---

## Post 5 — r/SideProject (builder's story, feedback ask)

**Self-promotion rules summary (best-effort, sourced from a third-party
mirror of the sub's stated policy — reddit.com itself unreachable this
session, so still unverified against the live sub):** self-promotion is
explicitly permitted here, provided the post shows the real, working
product rather than gating it behind a waiting list or email signup; posts
should be framed around the building experience (what was built, why, what
tech, what feedback is wanted) rather than a pure marketing pitch; the
poster is expected to engage with every comment; site-wide Reddit guidance
of roughly 1-in-10 posts being self-promotional is cited as the general
norm; recommended posting cadence is roughly once every three to four
weeks per project, not more often. **Allan should confirm this against the
sub's current sidebar before posting, and should not post here again for
several weeks after this one.**

**Compliance check:** discloses solo developer status, shows the real
product (Google Play listing, not a waitlist), no trial/price numbers, no
competitor names, no invented metrics or user counts (explicitly states
zero users). Complies as drafted.

**Title:** solo-built a training + food tracking app, live on Google Play, zero marketing so far, looking for honest feedback

**Body:**

Built this alone over the past while, alongside everything else in life. It's
called Volyume, a React Native app for training and food tracking, live now
on Google Play (`app.volyume`).

What it does: standard logging (sets, weights, food), and then the part the
whole product is built around, a weekly check-in that reads what you've
logged and decides change or hold on your training and nutrition, and shows
the reasoning. It's rule-based, not an AI model, on purpose, same inputs
always give the same decision.

Why I built it: I was already tracking everything properly and the actual
decision, what to change this week, was still entirely on me to work out
by hand. That gap is the whole product.

Free tier is real and permanent: full workout logging, plan library, custom
plan building, training history, progress tracking. Nutrition tracking and
the weekly coaching decision are the paid side.

Where it stands: live on Android, iOS in TestFlight testing, zero users as
of writing this, and this post is genuinely the first marketing action I've
taken. No growth hacking, no launch campaign, just asking people who'd
actually use something like this what's missing or wrong with it.

Tech-wise it's React Native with a local encrypted database as the source
of truth on the device, syncing to servers in the EU. Happy to go into any
of that if useful.

What would you want to see before trying something like this?

**When to post:** any weekday, and only once, per the roughly monthly
cadence the sub expects; do not follow up with another r/SideProject post
soon after even if this one performs well, keep the next one for a real
update (a launch milestone or a meaningful change), not a repeat.

**Expected replies and how Allan might respond:** typical r/SideProject
replies are constructive and detail-oriented (monetisation questions, tech
stack questions, UX feedback from screenshots if included, comparisons to
other tools by category not name); answer plainly and specifically;
resist the urge to over-explain or sound defensive about the "no AI"
choice, treat it as a genuine design decision open to challenge; engage
with every comment per the sub's expectation, but never let a reply drift
into a price or trial claim without using the exact CLAIMS-STANDARDS §3/§4
wording if it comes up.

---

## Compliance gate record

**First gate run (compliance-reviewer, 2026-07-13):** Posts 1-4 PASS on all
sections checked (§2 Claim Rule traced per claim, §B Free/Pro boundary, §5
prohibited list including weight-foregrounding, §4 pricing/§3 trial not
engaged, §7 ASA/CAP disclosure present in every app-naming post, §9 human
voice). Post 5 FAIL on two items:
1. "React Native" stated as a product fact but untraced in PRODUCT-FACTS
   (§2 Claim Rule). Fix applied: tech stack verified against root
   `package.json` and added to PRODUCT-FACTS §D (developer-audience posts
   only); claims table above updated.
2. "plus one thing I haven't seen elsewhere in quite this form" — hedged
   uniqueness claim with no substantiation (§5/§7). Fix applied: line
   rewritten to describe the weekly check-in without the comparative.

**Re-gate of corrected Post 5 (compliance-reviewer, 2026-07-13):** PASS.
Both fixed items verified resolved (React Native now traced to
PRODUCT-FACTS §D; no comparative/uniqueness wording remains anywhere in the
body) and a fresh full sweep found no new violation (untraced claims,
Free/Pro accuracy, §5 prohibited list, pricing/trial numbers, competitor
mentions, §9 voice all clear).

**PACK STATUS: all five posts PASS. Staged to `marketing_content`
(status=pending_review, lane=founder_only, channel=community) for the
dashboard. Every item still needs Allan's own read of the target
community's current rules before posting — see each post's caveat above —
and every item is posted personally from his own account, never by an
agent or scheduler.**
