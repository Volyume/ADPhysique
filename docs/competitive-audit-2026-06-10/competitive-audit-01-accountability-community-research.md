# Competitive Audit 01 — Accountability & Community Research (Agent 12)

> Phase 2 research, 2026-06-10. Area: accountability and community —
> features that create accountability WITHOUT becoming social media.
> Measured against the baseline (`competitive-audit-00-volyume-baseline.md`
> §3.5, §5): Volyume currently has **zero** social/accountability surface
> (deliberate); share cards (story-format PNG export) are the only
> outward-facing feature; private by design, EU data residency, no PII to
> external services.
>
> Method: web research across vendor documentation, journalism, academic
> studies and community discussion. Every claim carries a source link.
> Where a quote is reproduced it is taken verbatim from the cited source.
> No code was modified.

---

## 1. Case studies

### 1.1 Whoop Teams — consent-first small-group leaderboards

**Mechanics** (from Whoop's own documentation):

- Teams are private groups inside the app. You join by entering an
  invitation code (`Settings > Join team`) or by being invited; there is
  no public discovery feed.
  ([Joining a WHOOP Team](https://support.whoop.com/hc/en-us/articles/360023249553-Joining-a-WHOOP-Team))
- The team **owner specifies at creation which metrics (Strain, Recovery,
  Sleep) are shared, and this cannot be changed once the team is
  created** — members can never be surprised by scope creep.
  ([Teams FAQs](https://support.whoop.com/hc/en-us/articles/360040375353-Teams-FAQs))
- **Before accepting an invite you are shown the team screen with the
  team's description, exactly what metrics are shared, and who is on the
  team.** Data is shared only after you accept.
  ([Team Privacy](https://support.whoop.com/hc/en-us/articles/360058171433-Team-Privacy-))
- A profile-searchability toggle lets you opt out of being findable for
  invitations entirely while still being able to join via code; leaving a
  team stops sharing immediately.
  ([Whoop privacy policy](https://www.whoop.com/us/en/full-privacy-policy/),
  [Team Privacy](https://support.whoop.com/hc/en-us/articles/360058171433-Team-Privacy-))

**Reception.** Reviewers consistently describe Teams as "social
accountability and light competition without punishing beginners", and
note that "community and competition sustain motivation after initial
curiosity fades"
([the5krunner Whoop 5.0 review](https://the5krunner.com/2025/10/31/2026-whoop-5-0-mg-review-discount-accuracy-strain-recovery-athletes/)).
The known failure mode is metric gaming: a Whoop community thread titled
"Easy to cheat my Strain!" documents a user inflating strain simply by
wearing the band close to the wrist bone, "undermining the value" of
strain leaderboards
([Whoop Community](https://www.community.whoop.com/t/easy-to-cheat-my-strain/4291)).
Lesson: any shared metric becomes a target (Goodhart's law) — share
evidence of consistency, not a performance score.

### 1.2 Apple Fitness Activity Sharing — person-to-person, derived signals

**Mechanics.** You share your three rings with chosen individuals; they
see ring closure, completed workouts and awards, and you can run an
optional 7-day head-to-head competition scored on **percentage of your
own rings closed** (relative-to-self, not absolute output). You can hide
your activity from a specific person while still seeing theirs, mute
notifications per person, or remove them
([Apple Support](https://support.apple.com/guide/personal-safety/manage-activity-sharing-on-apple-watch-ips91d58b7ba/web),
[iMore setup guide](https://www.imore.com/activity-sharing)).

**What people love:** "the notifications aren't overwhelming, but they're
enough to spark motivation at the right time — sometimes a simple
notification saying 'John closed all his rings' is exactly what you need"
([AppleMagazine](https://applemagazine.com/apple-fitness-sharing/)).

**What people hate:** a Michigan Daily opinion piece ("You don't have to
close your rings") describes the cost: "because of decreased privacy,
there is now an implicit pressure to stay active", knowing others can
view your habits creates "accountability and guilt when not active", and
constant sharing "leads to constant social comparison" that can harm
mental health
([Michigan Daily](https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/)).
Academic work confirms the mechanism: social support **overload** in
fitness apps "can turn enjoyable activities into annoying virtual
competitions and create social pressure", causing burnout and
discontinuance
([Wang & colleagues, PMC11764542](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11764542/)).

**The telling correction:** after nine years of user requests, watchOS 11
added **rest days that pause rings without breaking award streaks** —
iMore called it "the feature we've been begging for"
([iMore](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks)).
Even the most polished streak system in the industry had to retrofit
shame-free rest.

### 1.3 Strava — the full arc: what works, and every way it goes wrong

**What works — kudos.** Peer-reviewed network analysis of Strava runners
found "receiving kudos induced runners to run more and more often", with
strong reciprocity effects among "kudos-friends"
([Kudos make you run!, Social Networks 2023](https://www.sciencedirect.com/science/article/pii/S0378873322000909)).
A qualitative study of collegiate club runners — titled after the
participant quote **"If it's not on Strava it didn't happen"** — found
three psychosocial themes: self-presentation, social pressure, and
motivation; it supports Strava's ability to connect and motivate while
flagging "potential concerns related to social pressure and
self-presentation that could influence mental or physical health"
([Recreational Sports Journal, 2023](https://journals.sagepub.com/doi/10.1177/15588661221148170)).

**What went wrong, in order:**

1. **Segment leaderboard toxicity and cheating.** Users have complained
   for years about cheaters atop leaderboards. "Digital EPO" GPX-editing
   tools were described as "a cleverly engineered virus in the Strava
   community"
   ([road.cc](https://road.cc/content/news/84868-digital-epo-smash-your-strava-times%E2%80%A6-cheating)).
   Strava eventually had to deploy machine-learning detection, removing
   1.6 m vehicle-assisted activities and 2.3 m apparent e-bike rides and
   reprocessing the top 100 of every global ride segment
   ([Bikerumor](https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/)).
   Some users argue KOM leaderboards are "ridiculous and irresponsible"
   because they "encourage irresponsible behavior on public streets"
   ([Strava community hub](https://communityhub.strava.com/strava-features-chat-5/manipulated-gpx-files-for-kom-cheating-484)).
2. **The 2018 heatmap incident.** Aggregated "anonymous" route data
   exposed the perimeters, patrol routes and supply lines of military
   bases in Syria, Iraq and Afghanistan; Strava had to restrict
   street-level detail and simplify opt-out
   ([Engadget](https://www.engadget.com/2018-03-13-after-exposing-secret-military-bases-strava-restricts-data-visi.html),
   [Mapulus history](https://www.mapulus.com/blog/strava-fitness-tracker-military-secrets-location-data)).
3. **The 2024 Le Monde investigation.** Journalists tracked the
   confidential movements of Biden, Trump, Harris, Macron and Putin via
   the **public-by-default Strava accounts of 44 bodyguards** (26 US
   Secret Service, 12 French GSPR, 6 Russian FSO), including advance
   hotel reconnaissance
   ([Fortune](https://fortune.com/2024/10/29/biden-trump-harris-confidential-movements-fitness-app-strava-le-monde/),
   [The Register](https://www.theregister.com/2024/10/29/macron_location_strava/)).
   Default-public sharing fails even security professionals.
4. **The May 2020 paywall backlash.** Strava moved segment leaderboards —
   free since 2009 — behind the subscription. Community reaction noted
   that "moving previously free features behind a paywall is a harder
   pill to swallow than introducing new paid features outright" and that
   it "removed an incentive for non-subscribers to upload rides"
   ([BikeRadar](https://www.bikeradar.com/news/strava-leaderboards-routes-subscription),
   [Gizmodo](https://gizmodo.com/stravas-best-features-will-now-be-subscription-only-1843540292),
   [the5krunner](https://the5krunner.com/2020/05/18/strava-turn-off-key-features-welcome-to-the-paywall/)).
   Lesson: once a social mechanic exists, it is community property —
   re-gating it burns trust. Pick the free/Pro line before launch, not after.
5. **Culture drift.** Student press now asks "Is Strava just another
   toxic social media platform?", observing that pace "almost becomes a
   symbol of status just like follower count", that some people are "too
   shy to use the app because they're 'too slow'", and that users
   "overcook easy runs just so the pace looks nice"
   ([The Mancunion](https://mancunion.com/2026/02/16/is-strava-just-another-toxic-social-media-platform/)).
   The 2023 addition of direct messaging raised concerns it would become
   "just another social media platform where women, in particular, might
   face unwanted messages"
   ([Yahoo/Tom's Guide privacy guide](https://www.yahoo.com/lifestyle/adjust-strava-privacy-settings-064500592.html)).
   Strava's own safety guidance for women now spans profile privacy,
   per-activity audiences, start-point hiding and privacy zones
   ([Strava privacy FAQ](https://support.strava.com/hc/en-us/articles/360025920332-Strava-s-Privacy-Controls-FAQ),
   [GippSport women's guide](https://gippsport.com.au/community/women-and-girls/managing-your-privacy-on-strava)) —
   an entire defensive apparatus that only exists because sharing
   defaulted to public.

### 1.4 Hevy — the direct competitor's social feed

Hevy (a direct logger competitor; Volyume imports its CSVs,
baseline §3.10) bundles a follow/feed/like/comment network into the free
tier. Comparative reviews and Reddit-thread analyses find:

- The social layer is **a major edge over Strong** and a real driver of
  Hevy's growth alongside its free tier: "follow training partners, view
  their workouts... the app feels alive rather than a static logger, with
  accountability built into the free tier"
  ([Setgraph Reddit analysis](https://setgraph.app/ai-blog/best-gym-app-reddit),
  [gymgod comparison](https://gymgod.app/blog/strong-vs-hevy)).
- For intermediate lifters it creates "low-key accountability and
  occasionally exposes you to exercise variations you hadn't considered.
  It's more like a training log that other serious people can follow"
  ([Setgraph](https://setgraph.app/ai-blog/best-weightlifting-app-reddit)).
- It is **polarising**: "some users love the accountability, others find
  it distracting", and Strong's *absence* of social features "is praised
  as a feature, not a bug"
  ([Setgraph Hevy-vs-Strong](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026),
  [prpath](https://prpath.app/blog/strong-vs-hevy-2026.html)).
- Hevy profiles are **public by default** (Settings > Privacy & Social >
  Private Profile is off); Hevy maintains a dedicated help article — "How
  to keep my information private / Remove Social Media Features" —
  acknowledging that "some people would rather keep their information
  private or not participate in the social media aspect"
  ([Hevy help](https://help.hevyapp.com/hc/en-us/articles/34461853165079-How-to-keep-my-information-private-Account-Single-Private-Workout-Remove-Social-Media-Features),
  [private profile doc](https://www.hevyapp.com/help/how-to-make-a-profile-private/)).

Net read for lifters specifically: a meaningful minority genuinely uses
and values following training partners; a comparable group actively
selects Strong-style apps *because* they have no feed. Nobody credible
claims the feed is why lifters log workouts.

### 1.5 Peloton — the always-on leaderboard as cautionary tale

Peloton's real-time class leaderboard is its signature mechanic, and a
large fraction of its most engaged users **hide it**: "many users find it
demotivating to always be in the bottom third"; some report that if they
don't hide it, it "becomes the only thing they can focus on"; notably,
"some of the most competitive people are among those who adamantly hide
the leaderboard" to avoid burnout
([Anne Helen Petersen, The Counterintuitive Mechanics of Peloton Addiction](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of)).
Instructors actively coach users to ignore the company's own feature —
"put a towel over the metrics", "double tap to hide metrics and let's
have some fun". The comparison is physically meaningless anyway: Peloton
accepts a ±10 % calibration tolerance, so two bikes can read 20 % apart
([ibid.](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of/comments)).
By 2024 Peloton was testing **block-user and hide-leaderboard-tag
moderation tools**
([Pelo Buddy](https://www.pelobuddy.com/feature-block-users-tags-test/)) —
once usernames are visible at scale, you inherit social-network
moderation obligations.

### 1.6 Fitbit — what removing community taught everyone

In March 2023 Google removed Fitbit Challenges, Adventures, trophies and
open groups. The backlash was "immediate and vocal... thousands of posts
from users who felt blindsided"; "many users said challenges were the
only reason they still used their Fitbit devices"
([9to5Google](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/),
[upkeep.social retrospective](https://upkeep.social/blog/fitbit-challenges-alternatives)).
XDA's verdict: "Fitbit is getting rid of the best reasons to use a
Fitbit, which is a big mistake"
([XDA](https://www.xda-developers.com/fitbit-ending-challenges-adventures-big-mistake/)).
Two lessons cut in opposite directions: (a) small, friendly, time-boxed
challenges among family/friends created the deepest loyalty Fitbit had —
deeper than the hardware; (b) the features Google killed first were the
**open** groups and global community surfaces, i.e. the expensive,
moderation-heavy, social-media-shaped parts. The beloved part was the
small-group part.

### 1.7 MyFitnessPal — community drift in a calorie app

MFP's open forums have hosted a decade-plus battle with pro-anorexia
dynamics: community threads titled "Keep MFP ana-free" date to 2012
([MFP community](https://community.myfitnesspal.com/en/discussion/494788/keep-mfp-ana-free)),
academic work documents identity construction on adjacent pro-ana
calorie-counting communities
([CAM/MAC, MyProAna study](http://www.cammac.space/boswell-myproana)),
and critical commentary ("MyFitnessPal is Not Your Pal") describes the
forums amplifying disordered comparison
([Mental Illness Talk](https://mentalillnesstalk.wordpress.com/2015/04/29/myfitnesspal-is-not-your-pal/)).
The structural lesson for any nutrition app: **an open community attached
to a calorie tracker will drift toward ED-adjacent content and impose a
permanent moderation burden.** For Volyume — which ships an ED-pattern
detector, calorie floors and Beat UK signposting (baseline §1) — open
community surfaces are not merely off-brand; they are directly
antagonistic to the safety system.

### 1.8 Duolingo-style streaks and leagues applied to fitness

- **Duolingo's own evidence base:** leagues drive engagement but
  "create pressure to win or even remain in a division", and users "who
  have achieved all of their daily learning goals can be penalized" by
  league mechanics
  ([When Gamification Spoils Your Learning, arXiv](https://arxiv.org/pdf/2203.16175),
  [Duolingo leagues blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)).
- **Transplanted to fitness, the evidence is worse.** A mixed-methods
  study on gamified fitness apps warns of motivation crowding: leaderboard
  competition produces "motivational benefits only for those who are
  already highly active, whereas actually harming the least physically
  active"
  ([PMC10807424](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/)).
- **Who has tried it:** Zwift Racing League runs divisioned, time-boxed
  team leagues (35,000+ racers/season, 1,800 teams) and works because
  entrants self-select as racers and divisions match ability
  ([Zwift](https://www.zwift.com/news/33557-everything-you-need-to-know-about-zwift-racing-league-zrl),
  [WTRL](https://www.wtrl.racing/zwift-racing-league/)); GymRats sells
  private, code-joined fitness challenges with custom scoring (workouts,
  minutes, custom points) among friends
  ([GymRats](https://www.gymrats.app/)); Fitbit's challenges (§1.6) were
  the friendly version. Always-on global leagues for general fitness
  populations have no success story; opt-in, ability-matched, time-boxed
  competition does.
- **The anti-streak correction:** Gentler Streak won the 2024 Apple
  Design Award (Social Impact) and 2022 Apple Watch App of the Year for
  inverting the streak: "taking a day off when your body needs it should
  never break your fitness streak"; the daily goal is a moving band that
  *lowers* after hard days. Users explicitly contrast it with Apple's
  rings, which "feel like high pressure and lead to feelings of failure"
  ([Apple Developer profile](https://developer.apple.com/news/?id=3m0ht22s),
  [Pocket-lint](https://www.pocket-lint.com/how-gentler-streak-app-changed-my-life/),
  [Neura Health review](https://neura.health/insight/gentler-streak-app-hands-on-review)).

### 1.9 Coach-view platforms — the purest accountability that exists

TrueCoach and TrainHeroic monetise exactly one social relationship: a
named coach sees a named client's log. TrueCoach's positioning is blunt:
"the main reason clients weren't consistent with tracking workouts on
their own is that there was no accountability"
([TrueCoach review](https://mypersonaltrainerwebsite.com/blog/truecoach-review));
TrainHeroic's chat is "your secret weapon for keeping athletes engaged
and accountable", with form-check videos and check-ins
([TrainHeroic support](https://support.trainheroic.com/hc/en-us/articles/18156629990797-Can-I-bill-my-personal-training-clients-through-TrainHeroic)).
Hevy has followed the demand into a separate **Hevy Coach** product
([Assistant Coach pricing comparison](https://assistantcoach.fit/blog/real-cost-fitness-coaching-software/)).
One known, consented viewer with a reason to look is the strongest
accountability mechanic in the literature and the market — and it has no
feed, no likes, no leaderboard.

### 1.10 Zombies, Run! — social as event, not feed

Six to Start's virtual races (twice yearly since 2015) are paid,
time-boxed events: training missions, a race window, **leaderboards with
an anonymous option**, and community that famously spilled into 200+
player-organised real-world meet-ups
([Wikipedia](https://en.wikipedia.org/wiki/Zombies,_Run!),
[ZR Wiki](https://zombiesrun.fandom.com/wiki/Virtual_Race)). The
persistent-social spin-off (Racelink) was shut down in 2019; the
event-based format survived a decade. Events create belonging without an
always-on audience.

---

## 2. Where exactly is the accountability vs social-media line?

Across every case above, the same seven dimensions separate the features
users describe as "accountability" from the ones they describe as
"pressure", "toxic" or "social media":

| Dimension | Accountability side | Social-media side | Evidence |
|---|---|---|---|
| **Audience** | Small, named, bounded group (1–~15) you chose | Unbounded followers / global leaderboard | Fitbit small challenges loved, open groups cut (§1.6); Whoop Teams (§1.1) vs Strava segments (§1.3) |
| **Consent** | Opt-in, with a preview of exactly what will be shared before joining | Public/on by default | Whoop's pre-join data preview (§1.1) vs Strava default-public (Le Monde, §1.3) and Hevy public-by-default (§1.4) |
| **Direction** | Mutual commitment (both parties share, or one party is a chosen overseer) | Broadcast, one-to-many performance | Coach view (§1.9), Apple 1:1 competitions (§1.2) vs Strava feed self-presentation (§1.3) |
| **Data granularity** | Derived, minimal signals: "trained / didn't", adherence %, streak | Raw detail: routes, pace, weights, body data, location | Heatmap and bodyguard incidents were raw-data failures (§1.3); ring % is derived (§1.2) |
| **Comparison basis** | Against your *own* plan/goal (relative-to-self) | Against other people's absolute output | Apple scores ring-closure %, not calories (§1.2); Peloton output and Whoop strain invite calibration disputes and cheating (§1.5, §1.1) |
| **Time shape** | Time-boxed events and weekly check-ins | Always-on, persistent rankings | Zwift seasons, GymRats challenges, Zombies races (§1.8, §1.10) vs Peloton live leaderboard (§1.5) |
| **Vanity affordances** | Acknowledgement only (a nudge, a kudos within the group) | Likes, follower counts, public profiles, comments from strangers | Kudos works inside reciprocal ties (§1.3 research); follower-count status drives the "toxic Strava" critique (§1.3) |

**One-sentence definition:** *Accountability is when a small group of
people I chose can see whether I did what I said I would do; social media
is when an audience I don't control can judge how well I did it.*

A feature crosses the line the moment any of these flips: the audience
becomes unbounded, sharing defaults on, the metric becomes absolute
performance, or a public vanity counter appears.

---

## 3. Privacy sentiment in fitness sharing — the numbers and the mood

- 60 % of smartwatch/fitness-tracker users were "somewhat or very
  concerned" about the privacy of their wearable data (Deloitte 2021);
  a later survey put device privacy concern at 48 % and rising
  ([MM+M](https://www.mmm-online.com/features/apps-wearables-and-the-data-privacy-shuffle/)).
- "Less than 15 % of consumers trust companies such as Apple, Fitbit,
  Google and Meta with their digital health data"
  ([MM+M, ibid.](https://www.mmm-online.com/features/apps-wearables-and-the-data-privacy-shuffle/)).
- A Clutch survey headline: "74 % of wearable tech users are concerned
  about data privacy"
  ([Clutch](https://clutch.co/press-releases/wearable-technology-adoption-survey)).
- 63 % of wearable users were found to still be sharing data with at
  least one third-party app they no longer use — consent rot is the norm
  ([PoPETs 2023, "Revoked just now!"](https://petsymposium.org/popets/2023/popets-2023-0004.pdf)).
- Qualitatively: Strava users reported "strangers were liking their runs
  on routes they ran from their front door" during the heatmap affair
  ([Mapulus](https://www.mapulus.com/blog/strava-fitness-tracker-military-secrets-location-data));
  women's-sport bodies now publish dedicated Strava privacy lock-down
  guides ([GippSport](https://gippsport.com.au/community/women-and-girls/managing-your-privacy-on-strava));
  and Strava's messaging launch raised fears of "unwanted messages" for
  women ([Yahoo](https://www.yahoo.com/lifestyle/adjust-strava-privacy-settings-064500592.html)).

Volyume's existing posture (private by default, EU residency, no PII out,
Article 9 consent flow) is already the strongest trust position in the
category — a marketing asset, not a gap.

---

## 4. What users actually ask for (demand evidence)

1. **A buddy/partner who sees whether I showed up** — the entire
   accountability-app micro-industry (GymRats, Fitness Pact, Squaddy)
   sells "see when friends hit the gym", group check-ins and pacts, often
   citing the popular claim that a buddy regularly checking in makes goal
   achievement dramatically more likely
   ([BossAsAService round-up](https://bossasaservice.com/blog/workout-accountability-app/),
   [GymRats](https://www.gymrats.app/)).
2. **Coach view of the log** — a paid market exists purely for this
   (TrueCoach, TrainHeroic, Hevy Coach, §1.9).
3. **Streaks that allow rest without shame** — nine years of Apple Watch
   users "begging" for rest days
   ([iMore](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks));
   Gentler Streak's awards built on the same demand (§1.8).
4. **Small private challenges with friends** — the loudest grief in the
   Fitbit backlash was for friends-and-family step challenges (§1.6).
5. **Following a training partner's actual programme** — the defensible
   kernel of Hevy's feed: "a training log that other serious people can
   follow" (§1.4).

What users do *not* ask for in strength training: global leaderboards,
public profiles, comment sections, or strangers' approval. Where those
exist, the most engaged users hide them (§1.5) or choose apps without
them (§1.4).

---

## 5. Ranked: the 10 best accountability implementations studied

1. **Coach view (TrueCoach / TrainHeroic model)** — one consented viewer,
   zero feed; strongest behaviour effect; cleanest privacy story.
2. **Whoop Teams' consent architecture** — pre-join data preview,
   owner-fixed immutable metric set, invite codes, leave-anytime. The
   best *consent UX* in the industry, regardless of what one thinks of
   strain.
3. **Apple Activity Sharing (mechanics, minus the culture)** —
   person-to-person, derived metric, relative-to-self scoring, per-person
   hide/mute. Flawed only in its always-on, no-rest-day culture, since
   patched.
4. **Gentler Streak's shame-free streak** — award-winning proof that
   "consistency including rest" beats "unbroken chain".
5. **Fitbit friends-and-family challenges (RIP)** — time-boxed, small
   group, steps only; loyalty deep enough that removal caused mass
   defection.
6. **GymRats private challenges** — code-joined groups, custom scoring
   (count workouts, not kilos), time-boxed; the modern heir to Fitbit
   challenges.
7. **Strava kudos *within reciprocal ties*** — peer-reviewed evidence it
   increases training frequency; works precisely because it is
   acknowledgement, not ranking.
8. **Zombies, Run! virtual races** — opt-in paid events, anonymity
   option, community as occasional event rather than daily audience.
9. **Zwift Racing League** — proves leagues can work when entrants
   self-select as competitors and divisions match ability; constant
   sandbagging/verification overhead shows the cost.
10. **Hevy's feed** — included for honesty: it demonstrably helped Hevy
    grow among lifters, but public-by-default profiles and like-counts
    put it on the wrong side of the line this report draws.

Dishonourable mentions: Peloton's always-on leaderboard (hidden by its
own best users), Duolingo-style global leagues (penalise the compliant),
Strava segment leaderboards (cheating arms race), default-public sharing
of any kind (two geopolitical incidents).

---

## 6. Implications for Volyume

### 6.1 What fits a privacy-first, no-feed brand

These are research implications for the founder to prioritise, not a
commitment to build. All are Pro-tier candidates except where noted, and
all require explicit free/Pro placement decisions before any build
(gating is absolute; accountability features are in neither list today).
All sharing below would be **opt-in, off by default, derived-signal only,
revocable, and previewed Whoop-style before consent**.

1. **Training Partner (1:1 link).** Two users pair by code. Each sees
   only: sessions completed vs planned this week, current consistency
   streak, and an optional "trained today" tick with a one-tap
   acknowledgement (a nudge, not a like). No weights, no body data, no
   nutrition, no location, no free text. This is the single
   highest-demand, lowest-risk feature in the evidence (§4.1, §1.2, §1.9).
2. **Coach View (read-only share).** A user grants a named person
   (real-world coach or partner) read access to training log and
   adherence — never nutrition, body weight or check-in answers without a
   separate, explicit grant that the ED safety system can veto. Mirrors
   the TrueCoach demand without building messaging.
3. **Shame-free streak surface.** Volyume already knows planned training
   days; a "consistency" streak counted against *the user's own plan*
   (rest days strengthen it, deloads count) is Gentler-Streak-aligned and
   needs no social component at all. Cheapest win in this report.
4. **Small private challenges (later, optional).** Code-joined groups of
   2–15, time-boxed (2–4 weeks), scored only on adherence-to-own-plan
   percentage — never tonnage, never weight change, never calories.
   GymRats/Fitbit-challenge shaped; ability-independent by construction.
5. **Keep share cards as the only broadcast valve.** The existing
   1080×1920 export already satisfies the "show off occasionally" need
   while keeping the audience on platforms users already chose. Extending
   share cards (e.g. block-end recap card) is safer than any in-app feed.

Engineering note: all of the above conflict gently with offline-first —
any partner-visible signal requires the sync layer and a minimal new
Supabase surface (EU Dublin), plus GDPR purpose-extension consent
(sharing is a new processing purpose under the existing Article 9 flow).
Payloads should be derived booleans/percentages, never raw rows.

### 6.2 What to never build (the trap list)

- **No feed, no followers, no public profiles, no like counts** — the
  defining social-media affordances; every toxicity citation in §1.3–§1.5
  traces to them. Hevy already owns this position for lifters who want it.
- **No global or open leaderboards on any metric** — cheating arms race
  (Strava, Whoop strain), demotivation of the bottom third (Peloton),
  harm to the least active (motivation-crowding research).
- **No sharing of body weight, calories, macros, or check-in data, ever,
  in any group surface** — MFP's decade of pro-ana drift (§1.7) shows
  open comparison of intake/weight is structurally unsafe; it would also
  undermine Volyume's own ED safety system (`src/coaching/safety/` is
  untouchable).
- **No open community/forums/groups** — permanent moderation burden
  (Peloton had to ship block tools; MFP moderates pro-ana content
  14 years on); Google killed Fitbit's open groups first for a reason.
- **No default-on sharing of anything** — the Strava heatmap and Le Monde
  incidents are terminal counterexamples; default-public failed the US
  Secret Service.
- **No Duolingo-style leagues with demotion** — penalises users who hit
  their own plan (§1.8); directly contradicts the coach's "your plan,
  your rate" voice.
- **No messaging/DMs** — the moment strangers can contact users (women
  especially), the safety and moderation cost curve goes vertical (§1.3).

### 6.3 Positioning sentence

Volyume's opportunity is to be the app whose answer to "does it have
social?" is: *"Your coach and your training partner can see that you
showed up. Nobody else sees anything."* That is a differentiator no
big incumbent can copy without dismantling their feed.

---

## 7. Source index

Vendor docs: [Whoop Teams FAQs](https://support.whoop.com/hc/en-us/articles/360040375353-Teams-FAQs) · [Whoop Team Privacy](https://support.whoop.com/hc/en-us/articles/360058171433-Team-Privacy-) · [Whoop privacy policy](https://www.whoop.com/us/en/full-privacy-policy/) · [Apple activity sharing](https://support.apple.com/guide/personal-safety/manage-activity-sharing-on-apple-watch-ips91d58b7ba/web) · [Strava privacy FAQ](https://support.strava.com/hc/en-us/articles/360025920332-Strava-s-Privacy-Controls-FAQ) · [Hevy privacy help](https://help.hevyapp.com/hc/en-us/articles/34461853165079-How-to-keep-my-information-private-Account-Single-Private-Workout-Remove-Social-Media-Features) · [GymRats](https://www.gymrats.app/) · [Zwift Racing League](https://www.zwift.com/news/33557-everything-you-need-to-know-about-zwift-racing-league-zrl) · [TrainHeroic support](https://support.trainheroic.com/hc/en-us/articles/18156629990797-Can-I-bill-my-personal-training-clients-through-TrainHeroic)

Journalism: [Fortune — Le Monde/Strava](https://fortune.com/2024/10/29/biden-trump-harris-confidential-movements-fitness-app-strava-le-monde/) · [The Register — Macron](https://www.theregister.com/2024/10/29/macron_location_strava/) · [Engadget — heatmap](https://www.engadget.com/2018-03-13-after-exposing-secret-military-bases-strava-restricts-data-visi.html) · [Gizmodo — 2020 paywall](https://gizmodo.com/stravas-best-features-will-now-be-subscription-only-1843540292) · [BikeRadar — paywall](https://www.bikeradar.com/news/strava-leaderboards-routes-subscription) · [the5krunner — paywall](https://the5krunner.com/2020/05/18/strava-turn-off-key-features-welcome-to-the-paywall/) · [road.cc — digital EPO](https://road.cc/content/news/84868-digital-epo-smash-your-strava-times%E2%80%A6-cheating) · [Bikerumor — cheat detection](https://bikerumor.com/strava-uses-new-maching-learning-models-to-catch-cheaters/) · [9to5Google — Fitbit removal](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/) · [XDA — Fitbit mistake](https://www.xda-developers.com/fitbit-ending-challenges-adventures-big-mistake/) · [The Mancunion — toxic Strava](https://mancunion.com/2026/02/16/is-strava-just-another-toxic-social-media-platform/) · [Michigan Daily — rings](https://www.michigandaily.com/opinion/you-dont-have-to-close-your-rings/) · [Anne Helen Petersen — Peloton](https://annehelen.substack.com/p/the-counterintuitive-mechanics-of) · [Pelo Buddy — moderation tools](https://www.pelobuddy.com/feature-block-users-tags-test/) · [iMore — rest days](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks) · [Apple Developer — Gentler Streak](https://developer.apple.com/news/?id=3m0ht22s)

Research: [Kudos make you run! (Social Networks)](https://www.sciencedirect.com/science/article/pii/S0378873322000909) · ["If It's not on Strava it Didn't Happen" (Recreational Sports Journal)](https://journals.sagepub.com/doi/10.1177/15588661221148170) · [Social support overload (PMC11764542)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11764542/) · [Motivation crowding in gamified fitness apps (PMC10807424)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10807424/) · [When Gamification Spoils Your Learning (arXiv)](https://arxiv.org/pdf/2203.16175) · [Reflections from the 'Strava-sphere' (QRSEH)](https://www.tandfonline.com/doi/abs/10.1080/2159676X.2020.1836514) · ["Revoked just now!" (PoPETs 2023)](https://petsymposium.org/popets/2023/popets-2023-0004.pdf) · [MM+M — health-data trust](https://www.mmm-online.com/features/apps-wearables-and-the-data-privacy-shuffle/) · [Clutch wearable privacy survey](https://clutch.co/press-releases/wearable-technology-adoption-survey)

Community/comparison: [Whoop Community — strain cheating](https://www.community.whoop.com/t/easy-to-cheat-my-strain/4291) · [MFP — "Keep MFP ana-free"](https://community.myfitnesspal.com/en/discussion/494788/keep-mfp-ana-free) · [Setgraph Reddit analyses](https://setgraph.app/ai-blog/best-gym-app-reddit) · [prpath Strong vs Hevy](https://prpath.app/blog/strong-vs-hevy-2026.html) · [gymgod Strong vs Hevy](https://gymgod.app/blog/strong-vs-hevy) · [Zombies, Run! (Wikipedia)](https://en.wikipedia.org/wiki/Zombies,_Run!) · [upkeep.social — Fitbit alternatives](https://upkeep.social/blog/fitbit-challenges-alternatives)

*End of report. No code was modified.*
