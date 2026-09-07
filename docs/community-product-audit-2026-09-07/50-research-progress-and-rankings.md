# 50 — Progress visibility & rankings: mechanism research

Campaign: `docs/community-product-audit-2026-09-07/`. Founder direction
(verbatim): "The Community isn't for sharing programs, it's for seeing
each other's progress, rankings, who's trained most, most consistent,
things like that. Perhaps we can see people who in our gym has trained
this week, who's trained the most, lifted the most and so on."

Read first (confirmed done, not repeated except where this file adds a
new mechanism-level angle): `docs/social-discovery-2026-09-06/
10-research-hevy-strong-jefit.md`, `11-research-strava-garmin.md`,
`12-research-boostcamp-fitbod-caliber-communities.md`,
`13-research-policy-safety-coldstart.md`,
`docs/community-product-audit-2026-09-07/07-competitors.md`.

**Mid-session founder correction (verbatim, applied throughout this
version of the file):** "rankings are NOT about weight lifted or volume.
Focus the research on sessions completed and consistency: sessions this
week and this month, weeks hit in a row (streaks), planned-sessions-
completed percentage, 'trained this week at my gym', most consistent over
4 and 12 weeks, and how products present these without shaming (ties,
bands, 'you and N others', opt-in). Treat volume, tonnage and strength
rankings as context only... not as candidates." Sections below are
weighted to that instruction — consistency/sessions is the primary
subject; volume/tonnage/1RM is confined to one paragraph in §3 as context.

Read-only research, no repo code touched. WebSearch worked throughout.
Access date **2026-09-07** unless noted.

---

## 1. Strava — club leaderboards ("trained this week" at club scope)

Single-sport clubs rank the weekly leaderboard by **total distance**;
multisport clubs by **total time** — fixed by club sport type, not
user-chosen. Window is the **current week only** (Strava keeps no
historical weekly snapshots beyond one "Last Week" view). Website shows
top 100; mobile shows **top 10** for clubs ≤500 members, with the
viewer's own row appended below the cut rather than hidden. Scope is
club-only (open-join or admin-approved membership), never global.
Leaderboard participation is tied to activity **visibility settings**,
not a separate toggle — a private activity never surfaces. No confirmed
anti-cheat on club leaderboards beyond general Community Standards +
admin removal (already in doc 11). [Clubs on Strava](https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava), accessed 2026-09-07; [community-hub thread confirming no leaderboard-ordering customisation](https://communityhub.strava.com/the-club-hub-3/order-running-club-leaderboard-by-pace-instead-of-distance-8345), accessed 2026-09-07

---

## 2. Garmin Connect — challenge groups, step leaderboards, badges

Weekly step **challenges** run in small groups of **7–12 participants**
drawn from confirmed **connections** (never global), auto-refreshing
Sunday-night to Monday-noon local time. Winning earns a **badge** (of
~200 available, spanning running/cycling/strength/yoga/steps/even in-app
actions like creating a workout) — badges reward engagement, not just
performance. A separate always-on **connections leaderboard** ranks
steps/distance among connections; Garmin's own support article confirms
a documented **visibility bug** where connections sometimes can't see a
user's steps depending on sync/privacy state — even an opt-in,
connections-only model has shown real sync-reliability problems, a
caution for any "who's trained this week" board depending on reliable
underlying sync. Connecting a social account itself earns 1 point + a
badge (Garmin gamifies building the graph, not just training). No
global or gym/venue scope exists anywhere in Garmin Connect. [How Do
Step Challenges Work](https://support.garmin.com/en-US/?faq=fU0T2AppaJ68D0sQEdlDK7); [Garmin Connect Challenges](https://www.garmin.com/en-US/blog/general/garmin-connect-challenges/); [25 Garmin Connect Badges](https://www.garmin.com/en-US/blog/fitness/the-25-garmin-connect-badges-you-never-knew-you-needed/); [Connections Leaderboard Visibility Issue](https://support.garmin.com/en-GB/?faq=5BwfM3zENM4qZX3T7fX2BA) — all accessed 2026-09-07

---

## 3. Hevy, Strong, JEFIT — profile stats and points (extending docs 10/07)

**Hevy** (doc 10, doc 07 §A1): leaderboard ranks **best lift across up to
38 exercises against people you follow** — not workouts-per-week, not a
"most active" metric. No "most consistent"/"trained most this week"
metric found anywhere. Gym **tagging** shipped July 2026 with **no gym
roster/browsing/leaderboard tied to it** — identity without ranking.

**Strong**: confirmed again — **no leaderboard, no ranking, no
comparative stat**, purely personal profile stats. Clearest
"opt-out by absence" data point in the research set.

**JEFIT — points and contests.** **Iron Points**: Lifetime (permanent
cumulative total) vs Consumable (spendable, redeemable for Elite paid-tier
credit) — the same currency is simultaneously a ranking metric and an
in-app purchase currency, a monetisation-adjacent design Volyume's D137
fully-free posture rules out replicating. [JEFIT: Group Exercise Contest](https://www.jefit.com/blog/introducing-the-jefit-group-exercise-contest), accessed 2026-09-07. A **seasonal contest** plus a separate **monthly
challenge contest** produce badges/Iron Points; leaderboard stats update
**once daily**, not real-time — the only product researched anywhere in
this campaign built on a batch/daily refresh rather than live updates.
**Unverified / could not determine**: any anti-cheat or contest-data
validation mechanism — none found despite a direct FAQ check.

**Volume/tonnage/strength rankings — context only, per founder
direction.** Every documented leaderboard-complaint pattern in this
campaign clusters around absolute-performance metrics, not attendance:
Strava's distance/time club ranking ties to the anxiety findings in §8;
JEFIT's Iron Points conflate ranking with spendable currency, the most
gameable metric found; no product researched ranks users by absolute
weight lifted/tonnage against each other at all (Hevy's is per-exercise
best-lift against followed users only, still favouring training age and
frame size with no normalisation found anywhere). These are not
researched further as ranking candidates in this file.

## 4. JEFIT gym chat as a proto-"who's trained at my gym" mechanism

Doc 07 §A2: Profile → Training Location → Nearby Gyms/Create Training
Location → gym-scoped chat via Messages — a **chat thread, not a ranked
roster**; no "who's trained this week at this gym" view exists, and the
one-group-chat-at-a-time limit means a user in a friend chat can't
simultaneously see their gym's chat. **No product researched across this
entire campaign has a shipped gym-scoped leaderboard** — Hevy has gym
tagging without ranking, JEFIT has gym chat without ranking, Strava has
no gym concept (clubs are topic-scoped, not venue-verified). The
founder's requested feature has no existing reference implementation.

---

## 5. Peloton — leaderboard opt-out and the real-names incident

The in-class leaderboard ranks by live **output**; a genuine one-tap
full opt-out exists ("hide it with the tap of a button"). [Understanding
the Peloton Leaderboard](https://theclipout.com/how-does-the-peloton-leaderboard-work/), accessed 2026-09-07. Separately, Peloton
switched its leaderboard to show **real names publicly by default**, as
an **opt-out** (not opt-in) change — users who had joined specifically
under a pseudonym reported being "blindsided." [Peloton Leaderboard Real
Names Are Now Public](https://theclipout.com/peloton-leaderboard-real-names-are-now-public/), accessed 2026-09-07 — the clearest documented case
in this whole campaign of a fitness-social identity default causing user
backlash; direct evidence for defaulting any Volyume gym-board identity
to opt-in, never retrofitting real names in as an opt-out change. A
related "Here Now" live-attendance feature (showing who is *currently*
working out) was itself repeatedly revised, including removing names as
workouts complete, after member feedback — evidence that even a mature
product team iterated multiple times on a live-presence board's
privacy/visibility balance rather than getting it right first try.
[Here Now Leaderboard updated to remove names](https://www.pelobuddy.com/here-now-leaderboard-updated-to-remove-names-as-workouts-are-completed/), accessed 2026-09-07

---

## 6. Technogym Mywellness — the closest thing to a real "gym leaderboard"

The one confirmed **verified-venue** leaderboard in the whole campaign:
Technogym's is tied to **operator-installed hardware** (UNITY consoles,
in-club screens), solving the "did this person actually train here"
verification gap every consumer app (Hevy, JEFIT, Strava) leaves
unresolved. Progress is displayed on screens **inside the physical
facility**, not just on-phone; activity is captured automatically via
equipment usage or linked trackers, so verification is a hardware
byproduct, not self-report; challenges are operator-created and
facility-scoped by construction. [Technogym CHALLENGE app](https://www.technogym.com/int/challenge-professional-app.html); [Mywellness engagement page](https://www.mywellness.com/en-INT/engagement/), accessed 2026-09-07 — but this model is only
available to operators with Technogym hardware contracts; Volyume, like
every consumer competitor, would need self-declared gym identity (a
text field/list-pick) absent its own hardware/geofence integration,
confirming doc 12 §6's "no consumer product has real gym verification"
finding still holds, with Technogym as the sole non-consumer exception.

---

## 7. Consistency metrics that reward showing up, not volume

A cross-sectional habit-formation study found roughly **50% of gym
members did not maintain their attendance streak past the 6-week mark**,
and that 6 weeks (~9 visits, ~2/week) is where a habit is "solidified or
abandoned" — the one academically-sourced figure here (weight this above
the industry-blog claims below). [Habit Formation Insights](https://arxiv.org/pdf/2501.01779), accessed 2026-09-07. This suggests a "trained this week"/"weeks hit
this month" metric maps directly onto the window that actually decides
retention, more so than a lifetime-volume or PR metric.

Streaks "run on loss aversion" and only motivate once a user has already
built one up — a **new user with a zero-length streak gets none of the
retention benefit and can only see how far behind everyone else's streak
is**, a direct newcomer-disadvantage risk for any streak-based ranking.
Industry (not peer-reviewed) guidance recommends showing consistency as a
**trend over time** ("more consistent this month than last") rather than
a bare count, paired with reducing week-one friction rather than adding
mechanics. [Fitness App Retention Statistics 2026](https://fitnessrefined.co/fitness-app-retention-statistics/), accessed 2026-09-07

---

## 7b. Presenting consistency without shaming: bands, ties, small groups

**Duolingo Leagues — the most fully worked non-shaming ranking mechanism
found in this campaign.** Not a lifting product, but directly on-point.
Each competing group ("league") holds roughly **20–30 users**, refreshed
weekly, pairing users of similar pace so someone doing 5 lessons a week
isn't ranked against someone doing 100 — small enough that top-five is
plausible for anyone who shows up. [Duolingo Leagues: How Weekly
Leaderboards Drive +25% Lesson Completion](https://duolingo.deconstructoroffun.com/mechanics/leagues), accessed 2026-09-07. Ten **bands** (Bronze
through Diamond) exist; a user is promoted or relegated **one band at a
time** per week regardless of margin — a runaway week only moves someone
up one tier, capping how much a single good or bad week swings standing.
A user must complete at least one lesson to be ranked at all — non-
participants are simply excluded, not shown at the bottom. [Duolingo
Wiki: League](https://duolingo.fandom.com/wiki/League), accessed 2026-09-07. General UX literature independently
agrees: small groups (cited range 10–200) beat one global board, and a
global all-time ranking is "unwinnable for the majority" and hurts
retention for everyone outside the top band. [UX Collective: Building
better leaderboards](https://uxdesign.cc/building-better-leaderboards-a5013d19cbd7?gi=8d242692e58b), accessed 2026-09-07

**"You and N others" / tie-grouping.** No product researched carries this
literal UI string — **unverified as a named pattern**. The underlying
mechanism it would express is precedented: Duolingo's bands group many
users into one tier without a strict ordinal rank inside it, and Strava's
mobile club view shows only a top-10 cut with the viewer's own row
appended below rather than a full list (§1) — partial precedents for
"group people together" rather than confirmed tie-display examples.

Because "weeks hit in a row," "planned-sessions-completed %," and "most
consistent over 4/12 weeks" are all bounded percentages or counts, a
banded presentation (or simpler "on track / building / getting back into
it" bands) fits naturally — Duolingo's evidence says capping movement to
one band per period and excluding non-participants from the ranked view
are the mechanisms doing the actual shame-reduction work, not any single
wording choice.

## 8. Documented harms of comparison-based leaderboards (peer-reviewed + press)

- Two **peer-reviewed papers** confirmed to exist and be on-topic, but
  not full-text-read this pass (effect sizes **unverified**): "Technostress
  in Motion: How Social Features in Running Apps Trigger Anxiety through
  Social Comparison" [ResearchGate](https://www.researchgate.net/publication/401597822_Technostress_in_Motion_How_Social_Features_in_Running_Apps_Trigger_Anxiety_through_Social_Comparison), and "Associations between leaderboard usage in
  physical activity apps and perceived stress among university students"
  [Frontiers in Public Health](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2026.1794299/full) — both accessed 2026-09-07.
- **Documented behaviour change from leaderboard pressure**: athletes
  reported running more miles than intended, and **not posting certain
  runs** because of how they might be perceived — a "hidden
  non-participation" pattern relevant to any board that could incentivise
  under- or over-logging to manage appearance. [Running for Kudos](https://triplethreatlife.substack.com/p/running-for-kudos-the-double-edged), accessed 2026-09-07. A Minnesota research programme
  studying Strava's mental-health effects cites user sentiment like
  "Thanks Strava. Not like I needed another source of anxiety." [Star
  Tribune](https://www.startribune.com/what-minnesota-researchers-found-after-studying-stravas-effects-on-mental-health/601165108), accessed 2026-09-07
- **Generic gamification critique** (industry, not academic): leaderboards
  can produce shame/inadequacy for underperformers and invite
  metric-gaming/sandbagging over genuine effort toward the underlying
  goal. [Growth Engineering](https://www.growthengineering.co.uk/dark-side-of-gamification/), accessed 2026-09-07
- **Fitocracy's founder** (secondary-sourced) said streaks/points
  "encourage the wrong strategy," intending focus on real progress
  instead — an insider admission a points/streak layer can undercut a
  product's own purpose. [Gamify List: Fitocracy](https://gamifylist.com/app/fitocracy), accessed 2026-09-07. Per doc 12 §6, Fitocracy's actual death was
  gamification failing once peer density thinned, not a named
  sandbagging scandal; **unverified / could not determine** whether a
  specific sandbagging incident was ever documented for Fitocracy.

---

## 9. Metric table

| Metric | Products using it | Pros | Cons | Safe for a weight-training product with ED safeguards (Y/N and why) |
|---|---|---|---|---|
| Sessions this week (count) | Hevy (profile), implied by most trackers | Simple, hard to game meaningfully, directly maps to the founder's "who's trained this week" ask | Rewards frequency over recovery if presented as a straight ranked ladder | **Y, with care** — count sessions, present as a roster/band (§7b, §10 pt 4), never as an ordinal "most" without a cap; never imply skipping rest days is virtuous |
| Sessions this month (count) | Not confirmed as shipped anywhere researched at this exact grain; extrapolated from the weekly pattern above | Smooths out single-week noise (illness, travel) vs a week-only view | Longer window dilutes the immediacy of "who trained this week"; needs pairing with the weekly count, not replacing it | **Y** — same reasoning as the weekly count, useful as a secondary/monthly view alongside it |
| Weekly/monthly consistency % (sessions hit vs a personal target) | Not confirmed as shipped anywhere researched; industry-guidance only (§7) | Rewards showing up regardless of ability; self-referential (against own target, not others), naturally normalises across experience levels | Needs a defined personal target to compare against, which the engine already has (planEngine MEV/MRV) so is buildable | **Y** — safest metric in the table; compares a person only to their own plan, not to peers' absolute numbers, so it cannot become a body/weight comparison surface |
| Planned-sessions-completed percentage | Not confirmed as shipped anywhere researched by this exact name; same family as the consistency % above and directly requested by the founder | Ties the metric to the user's own written plan (already generated by planEngine/mesocycle), so "consistent" means "did what I set out to do," not "did more than someone else" | Needs the plan to exist and be current — a stale or abandoned plan would understate the metric; requires product logic to keep it fair, not a research gap | **Y** — structurally the same safety profile as the consistency % row; arguably the single best-fit metric for a deterministic-engine product since it is derived from data the engine already produces |
| Weeks-hit-in-a-row / attendance streak (consecutive weeks/sessions) | Garmin (steps), general gamification pattern, Duolingo (daily) | Loss-aversion effect once built up (§7); simple to display | Newcomer disadvantage (zero streak looks like failure, §7); a hard reset-to-zero on a missed week can read as a public "failure" — tension with the calm/no-shame voice mandate | **Y, if framed as a rolling count with a soft landing, N if it publicly resets-and-shames** — see §10 pt 6 for the specific "rolling weeks active" alternative to a hard streak counter |
| Most consistent over 4 weeks / 12 weeks | Not confirmed as shipped by any product researched under this exact framing; closest precedent is Duolingo's weekly-refresh banded league (§7b) generalised to a longer window | A medium/long window is far more resistant to single-week noise or a single missed session than any weekly-only metric; naturally rewards the exact behaviour ("showing up over time") the founder named | No existing product to benchmark the presentation against at this window length — genuinely novel among everything researched in this campaign | **Y** — same self-referential safety logic as the weekly consistency %, and the longer window is the best fit for "who's the most consistent" read literally, since it can't be won by one big week |
| Band/tier presentation (not a strict 1-to-N rank) | Duolingo Leagues (§7b) | Caps how much one good or bad week can move a person (Duolingo: max one band per week); groups people of similar consistency together instead of a single ladder; participation-gated (non-participants aren't ranked at all, just excluded) | Needs enough users per gym/group to fill a band meaningfully — thin groups (a small gym) may only ever have one band populated | **Y** — this is a presentation pattern, not a metric, and it is the mechanism the evidence most directly supports for showing any of the above without shaming (§7b, §10) |
| Roster/"trained this week" list, unordered | Implied by Strava's top-10-plus-own-row club view (§1) as a partial precedent; no exact unordered-roster example confirmed | Answers "who's trained" literally without introducing a ranked ladder at all; zero risk of an "unwinnable" bottom-of-list position | Does not itself convey "who trained the most" — needs pairing with a consistency % or band if the founder wants that dimension too | **Y** — the safest possible answer to "who's trained this week at my gym," and the most literal read of the founder's own wording |
| Real name / public identity on a board (default) | Peloton (opt-out real names, caused backlash) | None found — every source treats this as a cautionary example, not a benefit | Documented user backlash from an opt-out (not opt-in) identity change; directly conflicts with Volyume's GDPR consent-must-be-separate-and-opt-in posture (doc 13 §4) | **N as opt-out; Y only as an explicit, separate, revocable opt-in** — matches doc 13's GDPR finding exactly (social visibility must be its own consent toggle) |
| Points/currency (redeemable, gamified) | JEFIT (Iron Points, dual-purpose currency+leaderboard metric) | Simple single number to rank by | Conflates ranking with a spendable reward, which is monetisation-adjacent — direct conflict with Volyume's fully-free (D137) posture; also most exposed to gaming per general leaderboard critique (§8) | **N** — dual currency/ranking design is out of scope given D137, and points-as-abstraction obscure what's actually being rewarded, worse for an ED-aware product than a transparent metric |
| Best lift/1RM, total volume/tonnage, absolute kg moved | Hevy, JEFIT (context only — see §3b; the founder has ruled these out as ranking candidates) | N/A — excluded from candidacy per founder direction | Structurally favour longer training age, larger frames, heavier absolute loads; closest of all metrics researched to a body-comparison risk under Volyume's Article-9 posture (§3b, §8) | **N — not researched further as a candidate per founder direction; included here only so the table is a complete record of what was excluded and why** |

---

## 10. What a gym-scoped board should show — synthesis grounded in the evidence above

Grounded strictly in the findings above; each line cites the section it
comes from.

1. **Scope it to a self-declared "my gym" group, opt-in, not verified** —
   no consumer competitor (Hevy, JEFIT, Strava) has real physical-gym
   verification (§4, confirming doc 12 §6); Technogym's real verification
   depends on gym hardware (§6), out of reach for a software-only build.
   Call it something honest like "training circle" rather than implying
   verified attendance, matching doc 12's own recommendation.
2. **Default the whole surface to opt-in, identity opt-in separately from
   participation** — Peloton's opt-out real-names change caused a
   documented backlash (§5) and directly conflicts with doc 13's GDPR
   finding that social visibility needs its own consent toggle, separate
   from bodyweight/health-data consent.
3. **Lead with self-referential consistency metrics (sessions this week/
   month, planned-sessions-completed %, weeks hit in a row, most
   consistent over 4/12 weeks), never an absolute leaderboard** — these
   are the only metrics in §9 rated safely "Y" without caveats: they map
   directly onto the 6-week habit-formation window that actually predicts
   retention (§7), several are derivable straight from data the engine
   already produces (planEngine/mesocycle targets), and none can become a
   body/appearance comparison surface because none compares one person's
   absolute numbers to another's — each is scored against the person's
   own plan or own history.
4. **Present rankings in bands, not a strict ordinal ladder** — Duolingo's
   Leagues mechanism (§7b) is the strongest precedent found in this whole
   campaign for "how to rank without shaming": small matched groups
   (~20-30), promotion/relegation capped at one band per period regardless
   of margin, and non-participants simply excluded from the ranked view
   rather than shown at the bottom. For a "trained this week" surface,
   pair this with an unordered roster (§9) as the literal, safest
   interpretation of the founder's own wording — e.g. "6 people at [gym]
   trained this week," listed with no ranking at all, plus an optional
   banded consistency view (e.g. "on track / building / getting back into
   it") for anyone who wants the "most consistent" dimension too.
5. **Volume/tonnage/1RM rankings are out of scope, not merely gated** —
   per the founder's mid-session direction (§3b), these are excluded as
   ranking candidates entirely, not offered as an opt-in secondary
   feature; they remain useful only as personal progress charts (already
   within Volyume's existing non-social feature set), never as a ranked
   comparison surface.
6. **Give streaks and consistency bands a soft landing, never a public
   reset-to-zero** — §7's loss-aversion finding cuts both ways: it retains
   engaged users but structurally disadvantages newcomers and turns a
   missed week into a visible "failure," which is in tension with the
   calm/no-shame coaching voice mandate. Favour a rolling "weeks hit in
   the last N weeks" or a banded consistency tier (point 4) over a hard
   consecutive-streak counter that can snap to zero and be seen by others
   doing so.
7. **Update on a batch cadence, not live** — JEFIT's daily-batch refresh
   (§3) avoids a live "who's ahead right now" feel; Strava's weekly (not
   live) club window works the same way — competitive pressure is lower
   off a real-time scoreboard.
8. **Provide a full opt-out that also hides the user from others'
   boards**, not just a personal view toggle — Peloton's leaderboard-hide
   only changes what the viewer sees, not whether others see them (§5);
   Volyume's opt-out must cover both directions per ED-safety and GDPR.
9. **Never let the board be the only social object** — Fitocracy's death
   (doc 12 §6, §8) shows gamification cannot carry a social feature alone
   once peer density thins; a small gym group with genuine roster/
   consistency visibility is more durable than a points ladder alone.

---

## Unverified / could not determine

- Whether Hevy or JEFIT plan a gym-scoped leaderboard (as opposed to
  gym tagging/chat) on any near-term roadmap — nothing found beyond
  Hevy's vague "strengthening the social side" language (§1/doc 07 §A1).
- JEFIT's contest anti-cheat/validation mechanism, if any — no source
  found despite a direct FAQ check (§3).
- The specific effect sizes or statistical findings inside the two
  peer-reviewed leaderboard/anxiety papers cited in §8 (ResearchGate,
  Frontiers) — topics and existence confirmed, full text not fetched
  this pass.
- Whether Fitocracy specifically had a documented sandbagging scandal, as
  opposed to the general gamification-critique pattern — no named
  incident found (§8).
- The exact mechanism (GPS-radius vs keyword search vs flat list) behind
  JEFIT's "Nearby Gyms" feature — flagged unverified in doc 07 §A2 and
  not resolved this pass.
- Garmin's connections-leaderboard visibility bug's root cause (sync
  timing vs privacy-setting conflict vs something else) — Garmin's own
  support article documents the symptom, not the cause (§2).
- Whether Peloton's leaderboard opt-out (view-hide) also removes the user
  from *others'* boards, or only changes what that user personally sees —
  sources describe the personal-view toggle only; the reciprocal question
  is not addressed by any source found (§5/§10 point 8).
