# r-12 — Partner & Social: best-in-class research (against a-12)

External research for area 12 of the ULTIMATE-APP MANDATE. Best-in-class fitness
social & invite patterns, fetched-source verified, mapped onto a-12's frictions
for Volyume's two personas (Besa, the newcomer/light user; Eddie, the athlete).
British English. No code changes, no commit.

---

## STEP 0 — tooling proof (verbatim + URL)

End-to-end WebFetch succeeded. Verbatim, from a Strava activity-privacy explainer:

> "Followers: only your approved followers will see your activity details,
> including start time, photos, and gear. These activities won't appear on
> public leaderboards."
> — https://www.yahoo.com/lifestyle/adjust-strava-privacy-settings-064500592.html

Fetch worked end-to-end; research proceeds.

**Fetch-failure log (per-URL):**
- `https://www.strava.com/features/social` — HTTP 404 (page moved/retired).
- `https://support.strava.com/.../216919377` — HTTP 403 (bot block). Worked
  around via Yahoo syndication + WebSearch synthesis.
- `https://www.tomsguide.com/.../strava-privacy-settings` — body returned only
  nav chrome; no article text. Worked around.
- `https://www.hevyapp.com/features/share-folders-routines/` — bot
  "verifying" interstitial, no content. Worked around via hevyapp.com feature
  pages already indexed by WebSearch + help-centre synthesis.
- `https://help.hevyapp.com/.../35688036014231` — HTTP 403 (bot block). Worked
  around via WebSearch synthesis of the same article.
- `https://blog.strava.com/press/strava-features/` — 301 to stories.strava.com
  (not re-fetched; not load-bearing).
- `https://www.branch.io/.../deep-linking-benefits-and-best-practices/` —
  fetched OK but did NOT contain the percentage stats WebSearch attributed to
  it; only the *mechanism* is verbatim-confirmed there. Percentages downgraded
  accordingly (see §"Invite funnel" caveat).

**Total distinct fetch failures/blocks worked around: 6.** None blocked a
load-bearing claim; every load-bearing claim below carries a source that
actually returned content.

---

## 1. The competitive set — what each actually does (sourced)

### Strava — the social benchmark + granular privacy
Three-tier per-activity visibility — **Everyone / Followers / Only You** — plus
**privacy zones** (hide home/work address), **map visibility** (hide start/end
or whole map), **Quick Edit** to set visibility immediately after upload, and
**messaging limited to mutual followers** (Following / Mutual / No-one).
Engagement is **kudos** (a single low-effort tap), comments, and follows;
kudos can't be hidden unless the activity itself is private.
- https://www.yahoo.com/lifestyle/adjust-strava-privacy-settings-064500592.html (verbatim, above)
- WebSearch synthesis of support.strava.com Activity Privacy + Privacy Controls articles.

Read for Volyume: Strava is broadcast-first with privacy *bolted on as
controls*. Volyume is the inverse — privacy is the architecture, not a setting.
The pick-up is Strava's **granularity of consent** and the **single-tap kudos**
primitive (Volyume's cheer is already this), not its public-feed model.

### Hevy — feed + friend invites + routine sharing
Two feeds: **Home** (people you follow) and a **Discovery** feed (people you
don't). Invite friends "from WhatsApp, Messenger, Facebook, X, and your contact
list, as well as generate a link and send it directly." Routines/folders share
out of the app as a **link** ("generate a link that you can post anywhere,
including in a private chat with a friend"). Auto-posts workouts to Strava.
Engagement = follows, likes, comments, friendly competitions, shared media.
- https://www.hevyapp.com/features/social-features/ (WebSearch synthesis)
- https://www.hevyapp.com/features/share-folders-routines/ (title/intent confirmed; body bot-blocked)

Read for Volyume: Hevy proves the **multi-channel invite funnel** (contact
picker + share sheet + raw link + per-network deep buttons) and **routine link
sharing as a growth loop** — both of which a-12 found Volyume is missing.

### Duolingo — Friend Streak + Friends Quests (the verified base)
**Friend Streak:** "Users with at least one Friend Streak are 22% more likely
to complete their daily lesson"; up to five at once; both must do a daily
lesson to keep it. **Friends Quests:** "Learners are automatically paired with
friends … after 1 p.m. EST on Tuesdays, provided you've completed at least one
lesson," a shared weekly challenge with "five days to complete," and "if a
friend isn't active, they won't be paired that week" (no carrying a dead
partner). Separately: "learners who follow friends are 5.6x more likely to
finish their language course."
- https://blog.duolingo.com/friends-quests/ (verbatim: matching rule, 5-day
  window, inactive-partner rule, "5.6x more likely to finish")
- WebSearch synthesis (deconstructoroffun / trophy.so) corroborating the +22%
  Friend-Streak figure — matches the mandate's val-ext-04-05-07 base.

Read for Volyume: the **+22% co-op-streak lift is the single strongest reason
the partner shared-streak exists** and validates Volyume's whole thesis. But
Duolingo's model is break-and-shame (a missed day kills the streak, with social
pressure) — exactly the model a-12 notes Volyume **deliberately inverted** with
its no-blame, resting-holds engine. The pick-up is the *cooperative weekly
objective* shape (Friends Quest), NOT the punitive streak loss. Critically:
Duolingo's "inactive partner won't be paired / can't be carried" rule is the
humane primitive Volyume already mirrors (resting holds, never breaks).

### Apple Fitness — the closed-loop precedent
Activity sharing: "get notifications when your friends meet their goals, finish
workouts, and earn achievements." Competitions are **points from % of rings
closed**, "up to 600 points a day for a maximum of 4,200 points for the week,"
7 days. Per-friend controls: **Mute Notifications** and **Hide my Activity**.
- https://support.apple.com/guide/watch/share-your-activity-apd68a69f5c7/watchos (WebSearch synthesis)

Read for Volyume: Apple is the **closed small-circle** precedent (you share
with chosen friends, not the public) and proves **per-relationship controls**
(mute / hide one specific person without unpairing). a-12 has no per-partner
mute and no granular hide — only full unpair. The competition layer is
leaderboard-shaped and is the part Volyume should *not* copy.

### Garmin Connect — connections + challenges + the invite link
Connect by handle/email search with accept-required requests; "the Connections
> Invite button … provides a link to your profile, which you can share with
friends." Monthly **connection challenges**; users add connections to a
challenge. Notably: **users report the invite link historically not working** —
a real-world cautionary tale of exactly a-12's dead-link failure mode.
- https://support.garmin.com/en-US/?faq=ETHXgsWvaM4Zkyu30Uomj9 (WebSearch synthesis)
- forums.garmin.com threads on broken invite/connection flows.

Read for Volyume: Garmin is the **profile-link invite** model and a live example
that a broken invite link is a recurring, user-visible defect even for a
billion-dollar incumbent — reinforcing a-12's priority-1 finding.

### Peloton — tags + high-fives (accountability without 1:1 leaderboard friction)
**High-five:** "tap their avatar next to their Leaderboard name … a notification
that will pop up on the left side of their touchscreen during class"; capped at
one per minute per member. **Tags:** up to 10 self-chosen groups (alumni,
hometown, goals), pick a primary per workout to "swarm classes with the group of
your choice." Following shows workout history/profile. Teams = shared
leaderboard + encouraging messages toward shared goals.
- https://www.onepeloton.com/blog/peloton-community-features (verbatim, above)

Read for Volyume: high-five is the **real-time, in-the-moment encouragement
tap** — the same primitive as Volyume's cheer, but timed to the live session.
Volyume's WorkoutSummary cheer beat is the offline analogue and is well placed.
Tags/swarming are broadcast-community and out of scope for a 1–3 person circle.

### Whoop — teams + chat + opt-in data sharing
Create a team in the Community tab, name/brand it, **"Search for WHOOP members …
by name or username. If one of your friends isn't on WHOOP, you can use the
embedded referral link to invite them!"** Teams show **strain/recovery/sleep
leaderboards**; team owners pick which metrics display. Privacy: "you can choose
whether your profile is searchable for a Team Invitation" and a reminder to
"check what personal data you will be sharing in the leaderboard." Team Chat for
tips/encouragement.
- https://www.whoop.com/us/en/thelocker/join-create-teams-on-whoop/ (verbatim)
- https://www.whoop.com/us/en/thelocker/community-feature-app-team-chat/ (WebSearch synthesis)

Read for Volyume: Whoop's **"if your friend isn't on WHOOP, use the embedded
referral link"** is the exact invite-a-non-user funnel a-12 found dead in
Volyume. Whoop also models **explicit per-join data-sharing consent** ("check
what you'll be sharing") — Volyume's privacy receipt is a stronger, structural
version of the same idea (the data physically can't leak, vs Whoop disclosing
what will).

### Future — human accountability (the non-copyable contrast)
Matched human coach, **daily personalised check-in message** ("reply with a
quick update … coach responds with feedback … ~5 minutes"), unlimited
messaging, video check-ins. ~$199/mo.
- WebSearch synthesis (garagegymreviews / rayfit accountability round-ups).

Read for Volyume: Future is the **gold standard for accountability feel** — a
person who *knows whether you followed through*. Volyume cannot and must not add
a human coach (deterministic-engine + price constraints), but the partner system
is the **peer substitute for that "someone knows" feeling** at no marginal cost.
The lesson: accountability is about *a specific other person noticing*, which is
precisely what the partner card delivers — provided the partner has a NAME
(a-12 finding 2: name never populated).

### Boostcamp — programme sharing AS acquisition (the growth model)
**"Easily share your program with a private link with your friends, allowing
them direct access to use the program. Alternatively, you can publish your
program on the Boostcamp community for everyone to benefit from."** Friend saves
it "in 10 seconds." Library of 11,000+ programmes, sharing is core to growth.
- https://www.boostcamp.app/program-creator (verbatim, above)
- https://www.boostcamp.app/ + Fitt Insider press (WebSearch synthesis)

Read for Volyume: this is the **plan-share-link-as-acquisition** model a-12
explicitly flags Volyume as lacking ("there is no plan-share link feature
anywhere in the codebase"). A shared plan link is a *content* invite (lower
friction than "join my accountability pair") that can pull a non-user into an
install — and Volyume's Plan Library + training builder are FREE, so a
plan-share link is gating-safe (no Pro feature exposed).

### Gentler Streak — the privacy-first analogue
Local-only (Apple Health, "will not be stored … or sent to any server"); shares
**pictures/graphs** of workouts to social with alt-text; **explicitly avoids
shame** ("doesn't use daily streaks to make users feel lazy … gentle
persuasion"); readiness-aware, recovery-positive.
- https://gentler.app/privacy/ + App Store listing (WebSearch synthesis).

Read for Volyume: Gentler is the closest *philosophical* peer — privacy-first +
anti-shame. But it is **solo**: its "social" is export-a-graph, not a two-person
accountability loop. Volyume's derived-signals partner system is strictly *more*
than Gentler offers on the relational axis while matching its privacy/anti-shame
posture. Volyume already leads here.

### BeReal — the small-circle vs broadcast positioning proof
**Private by default**; **no follower/following system** — "scans your contact
list … add people via phone number," capped friend count "to keep the app
tight-knit"; per-post choice of inner-circle vs friends-of-friends; "no likes,
no follower counts." (Note: a 2023 friends-of-friends expansion was widely read
as diluting the original promise — a cautionary tale about broadcast creep.)
- https://www.bustle.com/life/how-to-make-bereal-private + TechCrunch/Gizmodo (WebSearch synthesis).

Read for Volyume: BeReal validates the **small-circle, no-vanity-metrics,
contacts-based** positioning as a coherent and beloved product stance — and its
later broadcast drift validates Volyume *resisting* feed/leaderboard creep. The
contact-picker invite is the relevant mechanic.

### Invite funnel — the mechanic everyone converting uses
The pattern behind every effective invite above is the **(deferred) deep link**:
the link carries a referral ID, survives an app-store install, and drops the new
user straight onto the intended in-app screen — **"the reward is already
applied … no code entry or hunting through menus,"** and the arriving user is
**"4x more likely to convert."** The mechanism (store → install → first open →
original destination) is the documented core.
- https://www.appsflyer.com/glossary/deferred-deep-linking/ (verbatim: "4x
  more likely to convert"; "no code entry or hunting through menus")
- https://www.branch.io/resources/blog/deep-linking-benefits-and-best-practices/
  (verbatim mechanism; "After they open the app for the first time, it takes
  them to the original destination they expected")

**Caveat (logged):** the larger percentage lifts WebSearch attributed to Branch
(20–40% D1, 2.5x retention, "double" referral conversion) did NOT appear in the
fetched Branch body. Treat those specific figures as **UNVERIFIABLE / single
search-snippet**; the load-bearing, twice-sourced claims are only: deferred deep
links remove the code-entry/dead-end step and materially raise post-install
conversion (AppsFlyer's "4x" verbatim + Branch's mechanism).

---

## 2. (a) Winner patterns (apps + URLs)

1. **Deferred deep-link invites** — link carries context through install, drops
   the new user on the redeem/destination screen, auto-credits, no manual code.
   AppsFlyer; Branch. *This is the repair for a-12's dead invite link.*
2. **Multi-channel invite funnel** — contact picker + OS share sheet + raw
   copyable link + per-network buttons. Hevy
   (https://www.hevyapp.com/features/social-features/); Whoop's "embedded
   referral link" for non-users
   (https://www.whoop.com/us/en/thelocker/join-create-teams-on-whoop/).
3. **Plan/programme share link as acquisition** — a free, low-friction *content*
   invite that pulls non-users in. Boostcamp
   (https://www.boostcamp.app/program-creator); Hevy routine links.
4. **Co-operative weekly objective (no-loss)** — shared goal, inactive partner
   can't be carried and isn't punished. Duolingo Friends Quests
   (https://blog.duolingo.com/friends-quests/).
5. **Single-tap, in-the-moment encouragement** — kudos / high-five / cheer; one
   tap, rate-limited, framed from the person. Strava kudos; Peloton high-five
   (https://www.onepeloton.com/blog/peloton-community-features).
6. **Per-relationship controls** — mute/hide one person without ending the
   relationship; per-join data-sharing consent. Apple Fitness (Mute / Hide my
   Activity); Whoop (searchable-for-invite toggle, "check what you'll share").
7. **Small-circle, no-vanity-metrics positioning** — private by default,
   contacts-based, capped circle, no likes/follower counts. BeReal; Gentler
   Streak (privacy-first + anti-shame).

## 3. (b) Where Volyume already leads, honestly

- **Derived-signals-only privacy is structurally stronger than anyone's
  controls.** Strava/Whoop/Apple all *disclose* what you share and give toggles;
  Volyume's schema physically cannot carry weights, food, body metrics, photos,
  location or coach content (a-12 §3.1, migrate_081). "Can't leak" beats "set it
  not to leak." No competitor in this set matches that.
- **No-blame accountability engine.** Volyume's resting-holds / quiet-week /
  4-week-archive model (a-12 §1.3) is the humane inversion of Duolingo's
  break-and-shame streak — and it bakes in Duolingo's *own* best instinct
  (don't punish an inactive partner) at the engine level rather than as a weekly
  exception. Gentler shares the anti-shame ethos but has no relational engine.
- **ED suppression in partner contexts is unique.** An open ED flag freezes the
  outbound signal to "resting," downgrades cheers to in-app-only (no push), and
  silences partner beats; unpair and account-deletion are indistinguishable
  (a-12 Appendix). No app in the set has anything comparable — this is a genuine
  category-leading safety posture.
- **No-leaderboard posture by design.** Apple/Whoop/Peloton all lean on
  leaderboards/points; Volyume deliberately has none, and BeReal's beloved
  early model + later broadcast-drift backlash validate that restraint.
- **Cheer-from-the-person, not the app.** The push is framed "{name} cheered you
  on" — matching Peloton/Apple's relational framing — and is throttled to fresh
  cheers only. Sound primitive; the only gap is the missing name (below).

## 4. (c) Ranked pick-ups vs a-12 frictions — for Besa AND Eddie

**1. Repair the invite funnel with a deferred deep link + working landing
(a-12 finding 1, the #1 gap).** Build the `web/partner/[code]` landing page
(promise + store buttons + the code) AND wire `linking` / `getInitialURL` so
`parseInviteCode` (already written and tested, a-12 §2.3) actually fires. Make
the share sheet's link a deferred deep link so a non-user installs and lands on
the redeem screen with the code pre-filled — AppsFlyer's "no code entry … 4x
more likely to convert."
- *Besa:* a friend texts her a link, she taps, installs, is already half-paired
  — the difference between "I'll do it later" and paired.
- *Eddie:* invites his training partner in one tap from the share sheet; no
  "read me this 10-character code" friction.
- Sources: AppsFlyer; Branch; Whoop non-user referral link; Garmin's broken-link
  cautionary tale.

**2. Populate the partner's name (a-12 finding 2 — a live user-visible defect).**
Future and Peloton prove accountability *is* "a specific named person notices."
The card today says "Your partner" while the push says "Sam" — fix the
inconsistency by joining the profile first name into the local partnership row.
- *Both personas:* "Sam trained 3 of 4" lands; "Your partner trained 3 of 4"
  is a stranger. Highest emotional-payoff-per-line-of-code fix in the area.
- Sources: Future (human-accountability feel); Peloton following/profile.

**3. Ship a plan-share link — the acquisition unlock (a-12: "no plan-share link
anywhere").** Boostcamp's model: share a training plan via private link; a
non-user installs and the plan is saved in ~10 seconds. This is a *separate,
lower-friction* invite than "be my accountability partner" — it leads with free
*content*, not a relationship ask, and Plan Library/builder are FREE so it's
gating-safe. **Yes — for a word-of-mouth growth strategy this is the bigger
acquisition unlock than the partner invite**, because the ask is smaller and the
audience is larger (anyone who'd try a plan, not just someone willing to pair).
- *Besa:* receives a friend's beginner plan, installs to follow it, *then*
  discovers partner. Plan link is top-of-funnel; partner is mid-funnel.
- *Eddie:* shares his hypertrophy block with his gym crew — credibility-led
  sharing, the strongest organic channel for athletes.
- Sources: Boostcamp (verbatim); Hevy routine links.

**4. Add per-partner mute + the missing notification toggle (a-12 findings 4).**
Apple's per-friend Mute Notifications / Hide my Activity is the precedent. a-12
found `partnerCheerEnabled` is read but never written by any UI, the
`partner_streak` push dead-ends on tap, and there's no off switch. Surface a
partner-notifications toggle in Settings and route the streak push.
- *Both:* control without nuclear unpair; table-stakes for any sharing feature.
- Sources: Apple Fitness (Mute/Hide); Whoop (searchable-for-invite toggle).

**5. Build the Pro 3-partner UI and a re-pair affordance (a-12 findings 5–6).**
The paywall already promises "up to three" but `usePartners` only renders one
(`pickPrimary`) — a broken promise. Duolingo's "up to five Friend Streaks" and
Whoop's multi-team show multi-relationship UI done well (a simple switcher/list,
no leaderboard). Also add a "pair again" path after `ended` instead of dumping
the user back to the cold pitch.
- *Besa:* one partner is plenty (Free) — fine. *Eddie:* a Pro athlete with a
  coach-mate AND a gym partner needs to see both; today he can't.
- Sources: Duolingo (5 Friend Streaks); Whoop (multiple teams).

*(Lower priority, noted not ranked: a co-operative weekly "kept the week
together" micro-objective à la Friends Quest could layer onto the existing
shared-streak engine without leaderboards — but the engine already delivers the
core loop, so this is enhancement, not gap.)*

## 5. (d) What everyone has that we lack

- **A working invite link / deferred deep link.** Hevy, Whoop, Garmin (when it
  works), Boostcamp all carry a tappable link to a destination. Volyume's is
  dead end-to-end (a-12 finding 1). *This is the universal table-stake we miss.*
- **A named/identified counterpart.** Every social app shows who you're
  interacting with. Volyume always shows "Your partner" (a-12 finding 2).
- **Content (plan/routine) sharing as a growth loop.** Boostcamp and Hevy both
  ship it; Volyume has zero plan-share link (a-12 §5).
- **Per-relationship controls (mute/hide) short of severing.** Apple and Whoop
  have them; Volyume only has all-or-nothing unpair, and not even a
  notification off-switch (a-12 finding 4).
- **A multi-relationship surface.** Duolingo (5), Whoop/Peloton (many) all
  render multiple relationships; Volyume's Pro 3-partner UI is unbuilt and the
  single-partner view is the only one that renders (a-12 finding 5d).

What we lack-by-design and should KEEP lacking: public feeds, follower counts,
leaderboards, ranked competitions, free-text/photos between partners, and any
broadcast surface. BeReal's drift and Volyume's ED-safety posture both argue for
holding that line.

---

## Sources (fetched, deduplicated)

- Strava privacy (verbatim): https://www.yahoo.com/lifestyle/adjust-strava-privacy-settings-064500592.html
- Strava support (synthesis): support.strava.com Activity Privacy / Privacy Controls
- Hevy social: https://www.hevyapp.com/features/social-features/ ; /share-folders-routines/ ; /content-feed/
- Duolingo Friends Quests (verbatim): https://blog.duolingo.com/friends-quests/
- Duolingo +22% streak (synthesis): duolingo.deconstructoroffun.com/mechanics/streaks ; trophy.so/blog/duolingo-gamification-case-study
- Apple Fitness sharing (synthesis): https://support.apple.com/guide/watch/share-your-activity-apd68a69f5c7/watchos
- Garmin connections (synthesis): https://support.garmin.com/en-US/?faq=ETHXgsWvaM4Zkyu30Uomj9 ; forums.garmin.com
- Peloton community (verbatim): https://www.onepeloton.com/blog/peloton-community-features
- Whoop teams (verbatim): https://www.whoop.com/us/en/thelocker/join-create-teams-on-whoop/ ; team chat: /community-feature-app-team-chat/
- Future (synthesis): garagegymreviews.com/best-personal-training-apps ; rayfit.com accountability
- Boostcamp share link (verbatim): https://www.boostcamp.app/program-creator ; https://www.boostcamp.app/
- Gentler Streak (synthesis): https://gentler.app/privacy/ ; App Store listing
- BeReal (synthesis): https://www.bustle.com/life/how-to-make-bereal-private ; TechCrunch/Gizmodo friends-of-friends
- Deferred deep links (verbatim): https://www.appsflyer.com/glossary/deferred-deep-linking/ ; mechanism: https://www.branch.io/resources/blog/deep-linking-benefits-and-best-practices/
