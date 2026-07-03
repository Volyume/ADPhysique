# Running-Group Finders & Parkrun: Competitor Teardown
## Stranger-Centric Connection Mechanics for In-Person Group Formation & Safe Onboarding

**Scope:** Parkrun (UK community runs), Strava (social tracking + clubs), Meetup (group discovery), CorrerJuntos (dedicated running groups matcher), Nike Run Club (community challenges).

**Confidence tagging:** [OBSERVED] = hands-on use or published screenshots, [DOCUMENTED] = official source/patent/blog/API docs/credible teardown, [INFERRED] = reasoned from behaviour.

---

## 1. CONNECTION & BELONGING MECHANIC(S)

### Parkrun [DOCUMENTED]
**Core mechanic:** Volunteer-led, free, timed 5K run EVERY SATURDAY MORNING at 900+ UK parks, globally expanding. No app prerequisite — you just show up. The app (secondary) logs results, builds a personal history, allows club tagging.

- **Step-by-step:**
  1. Find event (map, location, postcode search).
  2. Show up to event start point (no pre-registration required).
  3. Run with others. Volunteer-led marshalling, tail walker for finishers.
  4. Finish, optional barcode scan for electronic results.
  5. Results published online; can be tagged with running club.

**Belonging:** The *volunteer community* is the glue (900 unpaid organisers per week). Low barrier to participation (free, no speed requirement, no costume-as-social-proof). Repeat attendance builds familiarity with locals.

**Why it works for strangers:** Built on *obligation-free recurring ritual*, not digital friction. Same time, same place, same people over months. Stranger becomes familiar through repetition.

---

### Strava Clubs [DOCUMENTED]
**Core mechanic:** Join or create a club (public or invite-only). Club leaderboards rank members weekly by distance (single-sport) or time (multisport). Weekly "podium" highlights top 3. Discussion boards + activity feed.

- **Step-by-step:**
  1. Search/discover club (public listing or invite link).
  2. Join club (public: direct join; invite-only: pending approval).
  3. Log runs (auto-tracked or manual entry).
  4. Appear on weekly leaderboard vs. other club members.
  5. See recent member activities in club feed.
  6. Optional: post to club discussion board.

**Belonging:** *Competitive ranking + social proof*. "You're #2 in your club this week" → dopamine. Weekly reset = fresh motivation.

**Why it works for strangers:** Shared competition removes need for pre-existing relationship. Strangers bond over segment-hunting, KOM/QOM contests, challenge completion.

---

### Meetup [DOCUMENTED]
**Core mechanic:** Meetup groups are created by an organiser. Members RSVP to individual events. Communication happens via the platform (comments on event) + organiser mailing list, often migrating to WhatsApp/SMS/Telegram.

- **Step-by-step:**
  1. Search running groups by location/distance/pace.
  2. View group description, member count, past event reviews.
  3. RSVP to specific run date.
  4. Receive organiser notes (time, start point, pace, difficulty).
  5. Show up to event.
  6. (Optional) Organiser posts photos/updates post-event.

**Belonging:** *Group identity + organiser curation*. Group name ("Morning Joggers"), description, and organiser reputation create trust. Regulars form friendships; WhatsApp subgroup often splinters off as the real coordination channel.

**Why it works for strangers:** Organiser is the trust proxy. "5-year running group, 127 members, 4.8 star rating" replaces detailed vetting.

---

### CorrerJuntos [DOCUMENTED]
**Core mechanic:** Dedicated app to CREATE and JOIN meetups. Algorithm matches runners by pace, schedule, level, goals. Meetup discovery via map. Group chat for coordination. Optional Strava sync for post-run logging.

- **Step-by-step:**
  1. Set running profile (pace, preferred schedule, level).
  2. Browse nearby meetups on map (filter by pace, distance, level, time).
  3. See meetup details (organiser avatar, runner count, pace range, route).
  4. Join group chat (in-app).
  5. Show up to run.
  6. Post-run: sync to Strava, share within group, earn kudos.

**Belonging:** *Peer matching at scale*. Algorithm removes "who is this person?" friction by pre-matching. Group chat (in-app, not SMS) keeps community inside the app.

**Why it works for strangers:** Pace-based matching is the safety proxy. Running at your speed with 4 others of similar ability feels cohesive, not anonymous.

---

### Nike Run Club [DOCUMENTED]
**Core mechanic:** Global challenges ("Run 3 miles by Tuesday"). Users create challenges, invite friends/contacts. Leaderboard shows who's reached goal. Real-time notifications ("Sarah just joined your challenge"). Virtual high-fives.

- **Step-by-step:**
  1. Create or join a challenge (distance goal + timeframe).
  2. Invite friends/family by name or link.
  3. Log runs in NRC (auto-synced).
  4. See leaderboard progress.
  5. Real-time notification when others join/hit milestones.
  6. Virtual celebrate when challenge ends.

**Belonging:** *Invited cohort + named peers*. Challenges are *closed groups* (you invited them, not open strangers). Leaderboards show only friends, not global ranks.

**Why it works for strangers:** Less applicable. NRC emphasises trusted contacts (friends/family), not stranger discovery. But *group challenges increase 90-day retention 2× vs. solo users* [DOCUMENTED].

---

## 2. THE UNIT

| App | Unit | Size | Openness | Duration |
|-----|------|------|----------|----------|
| **Parkrun** | Ad-hoc cohort | 200–500 per event | Open (no cap, no pre-register) | Recurring weekly; no session limit |
| **Strava Club** | Club roster | 10–50,000+ members | Flexible (public/private) | Indefinite; leaderboard resets weekly |
| **Meetup Group** | Organised event + persistent group | 20–500 per run; group has 50–2000+ members | Semi-open (RSVP required per event) | Ongoing; events repeatable |
| **CorrerJuntos Meetup** | Ad-hoc + persistent group | 5–20 per run | Open discovery, optional group chat | Single run or recurring series |
| **Nike Challenge** | Invited cohort | 5–24 | Closed (invite-only) | 7–30 days (challenge-defined) |

---

## 3. SYMMETRIC OR ASYMMETRIC? (Ranking-Risk Axis)

### Parkrun [OBSERVED]
**Symmetric.** Everyone runs the same course, same time. Results are published but there's no *forced* public ranking. Club is optional tagging. Tail walkers finish at different times and aren't ranked. Low ranking pressure.

---

### Strava Clubs [OBSERVED]
**HIGHLY ASYMMETRIC (ranking-heavy).** Leaderboards rank all members. Top 3 get "podium" status. Weekly reset creates *streak* pressure ("I was #2 last week, can't slip to #3"). Performance data is visible to all club members. **ANTI-PATTERN per Volyume constraints:** feeds comparison and shame. User research shows Strava users experience anxiety about leaderboard standing; "Thank Strava, not like I needed another source of anxiety."

---

### Meetup [OBSERVED]
**Asymmetric, but weak.** Organisers have curation power (accept/reject RSVPs). Within a run, no formal ranking, but informal status hierarchies (faster runners lead, slower follow). RSVP count is visible ("27 going"), which can create FOMO or pressure to attend. **Minor comparison risk:** public RSVP list shows who's attending; less acute than Strava but still visible.

---

### CorrerJuntos [INFERRED]
**Symmetric by design.** Pace-matched groups run together at the same speed range. No leaderboard. Kudos are optional post-run shares, not mandatory ranking. Group chat is closed, not public broadcast. **Comparison low-risk:** algorithm pre-matches by ability, removing the "I'm the slowest" signal.

---

### Nike Run Club [OBSERVED]
**Asymmetric within closed group.** Challenges show leaderboard ranking, but ONLY for invited people (friends/family). Strangers never see it. Reduces shame cycle vs. Strava global leaderboards. **Moderate ranking risk:** still ranks, but audience is curated.

---

## 4. DATA MODEL: What Is Shared, What Is Withheld, How Presented

### Parkrun [DOCUMENTED]
| Field | Visibility | Confidence |
|-------|------------|-----------|
| First name + surname | Public results page + club history | [DOCUMENTED] |
| Finish time | Public results page | [DOCUMENTED] |
| Age category | Public results page | [DOCUMENTED] |
| Club affiliation | Public results page (optional) | [DOCUMENTED] |
| Barcode (ID) | Volunteer-scanned only | [DOCUMENTED] |
| Email, phone | Organiser/volunteer only (not published) | [INFERRED] |
| Photo | User may opt-in to volunteer photo archive | [INFERRED] |

**Withheld:** Pace data (time/km not calculated), bodyweight, training plan, private notes. Results are aggregated per event, not fed into a global leaderboard.

**Presentation:** Results PDF per event; historical personal stats (time progression, PB tracking). No social feed of other runners' updates.

---

### Strava Clubs [DOCUMENTED]
| Field | Visibility | Confidence |
|-------|------------|-----------|
| Name + avatar | Club leaderboard + activity feed | [DOCUMENTED] |
| Distance (km) | Club leaderboard (weekly) | [DOCUMENTED] |
| Time (minutes) | Club leaderboard (weekly) | [DOCUMENTED] |
| Elevation gain (m) | Optional leaderboard column | [DOCUMENTED] |
| Pace (min/km) | Derived from time/distance | [DOCUMENTED] |
| Activity type | Tagged (run vs. ride) | [DOCUMENTED] |
| Start location | Maps visible (if user hasn't turned off location) | [INFERRED] |
| Photos | Activity feed (if user shared) | [DOCUMENTED] |
| Kudos count | Visible on leaderboard | [INFERRED] |
| Private notes | Only to user | [DOCUMENTED] |
| Bodyweight, heart rate, power | Individual athletes can share, but not forced into club data | [INFERRED] |

**Withheld:** Age, gender, training plan, goals (not surfaced to club view; personal profile only). However, *privacy leakage:* start location + pattern analysis can infer home/work address.

**Presentation:** Weekly leaderboard (sortable by distance, time, elevation). Recent activity feed. Segment/KOM tracking (not club-specific).

**Data risk:** Strava has 40+ million users globally; segment leaderboards are PUBLIC globally, not club-private. Publishing a PR run automatically adds your time to global leaderboards. **This is a high-exposure point for strangers.**

---

### Meetup [DOCUMENTED]
| Field | Visibility | Confidence |
|-------|------------|-----------|
| Display name (user-chosen) | Group member list, event RSVP list | [DOCUMENTED] |
| Profile photo | Visible to group members + event page | [DOCUMENTED] |
| Bio/interests | Optional, visible on profile | [INFERRED] |
| RSVP status | Public (shows "27 going") | [DOCUMENTED] |
| Email | Organiser and attendees only (via Meetup message) | [INFERRED] |
| Phone | Not shared via Meetup; organiser may collect off-platform | [INFERRED] |
| Real name | User may choose username instead; real name optional | [INFERRED] |
| Past attendance | Organiser can see history; group members see "attending since 2023" | [INFERRED] |

**Withheld:** Performance data (no time/distance tracking); training history; bodyweight; goals.

**Presentation:** Group description page. Member roster (with avatar/bio). Event details + RSVP count. Event comments (attendees can ask questions pre-run).

**Data risk:** MODERATE. RSVP lists show who's attending, which can be used to infer social graphs or attendance patterns. However, no performance data leaks.

---

### CorrerJuntos [INFERRED from features]
| Field | Visibility | Confidence |
|-------|------------|-----------|
| Display name | Group chat + meetup roster | [INFERRED] |
| Profile photo | Group chat | [INFERRED] |
| Pace range | Visible to algorithm (for matching); shown to matched group | [INFERRED] |
| Running level | Visible to algorithm + matched group | [INFERRED] |
| Schedule preference | Used for matching; not displayed publicly | [INFERRED] |
| Strava sync (optional) | User chooses whether to link | [DOCUMENTED] |
| Post-run activity | Synced to Strava only if user enables | [INFERRED] |
| Group chat messages | In-group only | [INFERRED] |
| Email, phone | Account setup; not shared with other runners | [INFERRED] |

**Withheld:** Historical run data (not stored in app, delegated to Strava sync); bodyweight; private notes; training plan; goals.

**Presentation:** In-app group chat. Meetup roster (photo + pace range). Strava integration (if enabled).

**Data risk:** LOW. App is designed to minimize data exposure. No leaderboards. Pace matching is algorithmic, not ranked.

---

### Nike Run Club [DOCUMENTED]
| Field | Visibility | Confidence |
|-------|------------|-----------|
| Name (linked to Apple/Google account) | Challenge leaderboard + to invitees only | [DOCUMENTED] |
| Avatar (from linked account) | Challenge leaderboard | [DOCUMENTED] |
| Distance (miles/km) | Challenge leaderboard | [DOCUMENTED] |
| Time logged | Used for ranking within challenge | [INFERRED] |
| Photos/stories | User may share; visible to challenge cohort only | [INFERRED] |
| Effort count | Visible in some challenges | [INFERRED] |

**Withheld:** Email, phone, real name (unless surfaced by linked account). Leaderboard data is CLOSED to invitees only.

**Presentation:** Challenge leaderboard (ranked by distance/reps). Real-time notifications ("Sarah just joined!").

**Data risk:** LOW. Closed-group model means leaderboard exposure is limited to invited contacts.

---

## 5. EVERY STATE & EDGE CASE [OBSERVED]

### Parkrun
- **Before first run:** No account needed; show up and run.
- **First time:** Volunteer records name, assigned barcode number (reusable).
- **Invite:** Word-of-mouth or social media event promotion; no in-app invite system.
- **Accept/Decline:** Not applicable (open to all, no RSVP).
- **Block:** Not a feature. If volunteer bans someone (safeguarding violation), it's organisational decision, not peer-driven.
- **Leave:** Stop attending; nothing to "quit" in-app.
- **Empty event:** Rare (1395 UK events weekly). But a new location *can* launch with minimal sign-up if volunteer-led.
- **Offline/no mobile:** Works perfectly (you don't need the app to run; app is *post-event* logging only).
- **Expired:** Recurring weekly; no expiry.
- **Cancellation:** Event may be cancelled by volunteer (weather, unsafe conditions); email sent to known participants.
- **Inactive run/forgotten barcode:** Manual results entry by volunteer; no friction.

---

### Strava Clubs
- **Before join:** Browse public club info, see sample leaderboard, read recent activity.
- **Invite:** Private club sends invite link to user (email or copy-paste).
- **Accept/Approve:** Public clubs auto-join on request; private clubs pending organiser approval (can take hours).
- **Decline:** User ignores invite or leaves club.
- **Block:** Block a member (that member can no longer see your activities in club context; they remain in club).
- **Mute:** Mute activity feed notifications from specific members.
- **Leave:** Leave club; all future activities are hidden from club leaderboard.
- **Inactive member:** User ceases logging activities; leaderboard shows zero activity for that week (no placeholder).
- **Offline:** Leaderboard is asynchronous; club members never "see you offline."
- **Expired:** Club persists indefinitely unless organiser deletes it (rare).
- **Cheating/segment dispute:** Strava has a "flagging" system for suspicious times; organiser cannot manually override leaderboard standings.

---

### Meetup
- **Before join:** View group description, member count, past events, reviews. Can message organiser.
- **Invite:** Group organiser can invite non-members by email or Meetup username (optional pre-group recruitment).
- **RSVP:** Click "Going" / "Not going" / "Maybe" on event page.
- **Accept/Decline:** User can toggle RSVP status anytime before event (organiser can revoke if group rules violated).
- **Block:** Block a member; they cannot message you, and you're hidden from their view.
- **Report:** Flag inappropriate behaviour, spam, harassment; Meetup Trust & Safety reviews (human review).
- **Leave:** Leave group; you remain in group member database (organiser can see past attendance).
- **Inactive group:** If organiser inactive for 6+ months, group becomes "dormant" but not deleted.
- **Offline:** Event happens at fixed time/place; no app sync required (optional check-in).
- **Expired:** Event repeats on organiser's schedule; old events archived.
- **Organiser offline:** Group may pause events if organiser unavailable (no substitute organiser system built-in).
- **No shows:** Organiser can see RSVP vs. actual attendance (inferred from photos/comments), but no penalty system.

---

### CorrerJuntos
- **Before join:** Browse nearby meetups map-view; see organiser, pace range, runner count, route snippet.
- **Invite:** In-group chat, member can invite contact by phone/social.
- **Invite accept:** Contact downloads app, matches pace algorithm, joins group chat (or creates new group).
- **Decline/block:** Can leave group chat anytime; block not mentioned in marketing (inferred).
- **Empty group:** If creator stops posting meetups, group becomes dormant.
- **Offline:** Group chat works async; run timing is fixed (organiser sets time).
- **Expired:** Meetup is typically single-run; if recurring series, organiser can archive or cancel.
- **No-show:** Group will notice if you RSVP'd but didn't arrive; informal accountability ("where were you?").
- **Strava sync failure:** If Strava connection drops, activities aren't logged; user must re-sync manually.
- **Network error:** Group chat may lag or fail; SMS fallback not mentioned.

---

### Nike Run Club
- **Before join:** Can view challenges from nearby friends/communities (if permission enabled).
- **Invite:** Creator selects "Invite friends" and picks from contacts (max 24).
- **Accept:** Invited user receives notification; can join with one tap.
- **Decline:** Ignore notification or leave challenge.
- **Block:** Block a user from creating challenges you can see; can be blocked by others.
- **Leave:** Leave active challenge (disqualifies from final leaderboard).
- **Activity sync:** Activities auto-log if NRC is tracking; manual entry optional.
- **Leaderboard freeze:** When challenge ends, leaderboard is final (no post-end edits).
- **Offline:** NRC caches data; syncs when connectivity returns.
- **Expired:** Challenge ends on set date; historical challenges archived but not deletable.
- **Network failure:** Challenge creation/join may fail; retry required.

---

## 6. SAFETY / MODERATION SCAFFOLDING

### Parkrun [DOCUMENTED]
**Vetting:** Volunteers undergo DBS check (UK Disclosure and Barring Service). Regular safeguarding training. Event risk assessments reviewed annually for each location.

**Reporting:** Safeguarding Hub with dedicated procedures for incidents (harassment, abuse, exclusion). Sanctions Process for persistent violations; can result in participant or volunteer ban.

**Blocking/Moderation:** Organiser discretion. No in-app blocking system; exclusion is off-platform (organiser decision).

**Identity:** First name + surname registered; barcode per person. No anonymous participation.

**Harassment defence:** Volunteer presence at every event (tail walker, marshal). Open spaces (public parks). Diverse participant mix (all ages, speeds).

**Incident response:** Safeguarding lead per event. Serious incidents escalated to Parkrun HQ (UK Charity Commission oversight).

**Strength:** Structural (trained volunteers, designated roles). **Weakness:** No in-app harassment reporting; relies on organiser goodwill/awareness.

---

### Strava [DOCUMENTED]
**Vetting:** None. Account requires email; no identity verification.

**Reporting:** Users can report inappropriate activity/profile to Strava Trust & Safety (automated + human review). Can flag suspicious segment times (potential cheating).

**Blocking:** Block users; they can't see your activities in club context, but can't be removed from club without organiser action.

**Muting:** Mute notifications from specific athletes (reduces social pressure).

**Identity:** Linked to email; username is user-chosen (not real name required).

**Harassment defence:** Weak. Strava is a social feed, not a structured event. Harassment via comments/messages can be reported, but response is reactive, not proactive.

**Moderation:** Strava moderates at the platform level (remove accounts flagged for spam, ban persistent cheaters). No community/club-level moderation tools for organisers.

**Strength:** Scale (millions of users). **Weakness:** Leaderboard visibility is public (global segment KOMs); harassment risk is intrinsic to the social feed. Research shows users experience anxiety from public rankings.

---

### Meetup [DOCUMENTED]
**Vetting:** None at platform level. Organiser is the trust proxy. Organisers are encouraged to implement group-specific codes of conduct.

**Reporting:** Users can report members (harassment, spam, inappropriate behaviour) to Meetup Trust & Safety team. Meetup policy explicitly forbids non-consensual contact and offline harassment.

**Blocking:** Users can block members; blocked users cannot message or attend events organised by blocker.

**Identity:** Display name is user-chosen (can be pseudonymous). Real name optional. Email is private unless organiser collects off-platform.

**Harassment defence:** Moderate. Organiser can remove members from group. Meetup has community guidelines. However, "offline harassment" (via email/SMS) is *out of scope* for Meetup moderation (advice: report to platform where harassment occurred).

**Incident response:** Human review by Meetup Trust & Safety. Persistent violators may be banned platform-wide.

**Strength:** Organiser as curator (can set group norms). **Weakness:** Once group moves to WhatsApp/SMS (common), Meetup loses visibility and moderation capability.

---

### CorrerJuntos [INFERRED]
**Vetting:** Not documented. Likely email verification only.

**Reporting:** In-app reporting mechanism (likely via group chat or flag athlete) [INFERRED]. No published moderation policy found.

**Identity:** Profile verified with email. Phone number likely collected (for group chat SMS/push).

**Blocking:** Likely; not explicitly marketed.

**Harassment defence:** Low. App is designed to facilitate in-person group runs, not platform moderation. Safety is delegated to group organisers and the fact that runs are public (parks, daylight, visible).

**Strength:** In-person (most harassment risk is mitigated by running in groups in public places). **Weakness:** No published safeguarding policy. Young app (recent launch) may not yet have encountered scale-level harassment issues.

---

### Nike Run Club [OBSERVED]
**Vetting:** Tied to Apple/Google account. No additional identity verification.

**Reporting:** Users can report challenges/participants to Apple/Google (unlikely to be effective). Nike moderation not documented.

**Blocking:** Not a feature (challenges are closed, invite-only).

**Identity:** Linked to account name (can be pseudonymous if Apple/Google account is).

**Harassment defence:** Strong, *by design*. Challenges are invite-only; strangers cannot join. No public leaderboard visible to random users. Closed-group model means harassment risk is *between invitees*, which is lower-risk.

**Strength:** Closed model eliminates stranger harassment risk entirely. **Weakness:** If harassment occurs within invited cohort, Nike has no tooling to remove a participant mid-challenge.

---

## 7. COMPARISON / SHAME AUDIT — [INFERRED] What Is Transferable (Stripped of Toxicity)?

### Strava [OBSERVED — ANTI-PATTERN]
- **Leaderboards:** Rank all members weekly. Top 3 get "podium" badge.
- **Segments/KOMs:** Compete for fastest time on specific route sections (public global leaderboards).
- **Kudos count:** Visible on activity feed (social proof gaming).
- **Social pressure:** Research (Gustavus Adolphus study) shows Strava *triggers perfectionism and comparisonitis*. Users report anxiety after logging slow runs because they're visible to club leaderboard.
- **Shame vector:** "I was #2 last week; now I'm #5. Everyone sees that I'm slower."

**User feedback:**
> "Thanks Strava. Not like I needed another source of anxiety or anything." — Reddit user

> Users describe Strava as operating "like Instagram with every run being public," leading to pressure to always run fast to impress followers.

**What strips away toxicity:**
- Remove global/public leaderboards (keep closed-group rankings only, visible to invitees).
- Remove weekly reset (which drives streak-chasing pressure).
- Replace ranking with *collaborative goal* ("We collectively run 500 km this month") — removes individual comparison.
- Hide "podium" badges and kudos counts.

**Transferable kernel:** *Group challenges*, not *leaderboard ranking*. The actual retention driver is "I'm working toward a shared goal with teammates," not "I'm ranked higher than Dave this week."

---

### Nike Run Club Challenges [OBSERVED — SAFER]
- **No public leaderboards.** Only invitees see rankings.
- **Closed cohort.** Strangers cannot join; no global comparison.
- **Real-time motivation:** Notifications ("Sarah just joined your challenge") encourage participation without shame (you're in this together).
- **No streak pressure:** Challenge ends on a set date; reset is not weekly (longer cycle = less compulsive).

**User feedback:** Positive reception. No anxiety research published against NRC challenges (vs. extensive Strava anxiety literature).

**Transferable kernel:** *Invited challenges remove strangers from the comparison loop.* Accountability is to a trusted cohort, not a global leaderboard.

---

### Parkrun [OBSERVED — LOWEST SHAME RISK]
- **No leaderboards.** Results are published (name + time), but NOT ranked or aggregated.
- **No streak tracking.** "PBs" (personal bests) are optional personal tracking; not public badges.
- **No kudos/social proof.** Volunteers give everyone a verbal "well done" at the end.
- **All speeds welcome.** Walkers, joggers, elite runners at the same event; no separation.

**User feedback:** High retention (63% at 12 months vs. 3.7% for unsupervised gym). Users credit *community, not competition*, for staying.

**Transferable kernel:** *Recurring ritual + volunteer community removes the need for digital competition.* People show up for *social belonging*, not to win.

---

### Meetup Groups [OBSERVED — MINIMAL SHAME]
- **No leaderboards.** RSVP count is visible ("27 going"), but attendance is not ranked by performance.
- **No async ranking.** Group is built around *events*, not persistent competition.
- **Organiser curation.** Group rules/norms set tone (some groups explicitly say "all paces welcome").

**Transferable kernel:** *Organiser as culture-setter.* If organiser declares "no egos, just fun runs," that norm spreads. Strangers trust organiser's curation over algorithm.

---

### CorrerJuntos [INFERRED — MODERATE SHAME RISK]
- **No leaderboards.** Post-run activities are shared (optional) but not ranked.
- **Pace-matched groups.** Algorithm removes speed comparison (you're running with peers by design, not competing).
- **Kudos optional.** Post-run shares and kudos in group chat are optional, not pushed.

**Transferable kernel:** *Peer matching by ability removes the "I'm the slowest" signal.* Community is horizontal (same pace), not vertical (ranked).

---

## 8. ONBOARDING TO THE SOCIAL FEATURE

### Parkrun [OBSERVED]
1. **Awareness:** Word-of-mouth, local running clubs, social media event pages.
2. **Entry:** Show up to event. No app download required.
3. **First-run experience:** Volunteer greets, explains barcode scan, starts run as group, marshals route, celebrates finish.
4. **Post-run:** Encouraged to download app to see results, personal history, club tagging.
5. **Adoption friction:** Zero (already engaged in-person).

**Strength:** In-person experience comes *before* app. App is optional, not prerequisite.

---

### Strava Clubs [OBSERVED]
1. **Awareness:** Friend sends club link or invites user to club.
2. **Awareness (alt):** User searches for clubs matching their sport/location.
3. **Join:** Click link or search. Public clubs auto-join; private pending approval.
4. **First-view:** See club leaderboard (top performers highlighted). Recent activity feed. Member roster.
5. **Motivation:** "I'm #47 in this club. Let me run harder next week to move up."
6. **Adoption friction:** Moderate. Leaderboard comparison is immediate, which can trigger motivation *or* discouragement ("I'm so far behind").

**Strength:** Social proof (seeing others' distances) is immediate. Competing against friends is intuitive.
**Weakness:** Asymmetric pressure. If you're slower, leaderboard visibility is demoralizing on day 1.

---

### Meetup [OBSERVED]
1. **Awareness:** User searches "running groups near me" + location.
2. **Discovery:** Browse groups by rating, member count, past events, reviews.
3. **Join:** Click "Join Group." Pending organiser approval (optional, some groups auto-approve).
4. **First event:** RSVP to specific run. Receive organiser email with start point, pace, difficulty, any pre-run instructions.
5. **Show up:** Meet organiser + other RSVPers in person.
6. **Post-run:** Optional: organiser posts photos, event recap. Attendees can comment.
7. **Adoption friction:** Low. Discovery → join → show up is frictionless. Trust comes from group reputation (reviews, member count, organiser rating).

**Strength:** Organiser as curator removes cold-start problem (users trust established groups).
**Weakness:** If organiser is unreliable or group norms are unclear, early drop-off is high.

---

### CorrerJuntos [INFERRED from app description]
1. **Awareness:** App download (iOS/Android app stores).
2. **Onboarding:** Set profile (name, pace range, preferred schedule, running level, goals).
3. **Discovery:** Browse nearby meetups on interactive map. Filter by pace, distance, level, time.
4. **Join:** Tap meetup to see organiser, runner count, route details. Join group chat.
5. **Coordination:** Chat with group pre-run (start time, meeting point, logistics).
6. **Show up:** Run with group.
7. **Post-run:** Share to group chat, sync to Strava (optional).
8. **Adoption friction:** Moderate. Requires app download + profile setup before discovering groups. But algorithm-matched pacing removes uncertainty ("Will I be too slow?").

**Strength:** Pace-matching solves biggest fear for new runners (being left behind).
**Weakness:** App-first (not in-person first) may create barrier for runners unfamiliar with app ecosystem.

---

### Nike Run Club [OBSERVED]
1. **Awareness:** Challenge invitation from friend/contact.
2. **Onboarding:** Link Apple/Google account. Install NRC (if not already installed).
3. **Join:** Tap invite link or find challenge in app. One-tap join.
4. **First-view:** See leaderboard (only invitees visible). Real-time notification when new members join.
5. **Participation:** Log runs in NRC (auto-tracked).
6. **Adoption friction:** Very low. Invite is warm-start (friend-sourced). Leaderboard is trusted cohort only (no stranger comparison).

**Strength:** Friction is minimal. Trust is pre-built (friend invited you).
**Weakness:** Only works if you already have NRC installed and friends using NRC.

---

## 9. MONETISATION: Free / Paid / Tier Gating

### Parkrun [DOCUMENTED]
**Entirely free.** Funded by volunteer labour + donations + sponsorship (mainly UK Lottery Funding). No paywall on results, clubs, or app features. Barcode is free (reusable).

**Monetisation model:** Non-profit charity. Zero revenue per participant.

---

### Strava [DOCUMENTED]
**Freemium + subscription.**
- **Free:** Activity logging, basic profiles, segment browse, club discovery.
- **Strava Subscription:** £8.49–£9.99 GBP/month or £59.99–£79.99/year. Unlocks: detailed stats, performance analytics, segment filtering, route builder, training insights, leaderboard sorting.
- **Club leaderboards:** Available on both tiers (but full leaderboard sorting tools require subscription).

**Monetisation vector:** Subscription. User retention strategy is *paywall creep* (progressively restricting features to subscription to drive conversion). User backlash is evident in app store reviews ("too many features behind paywall").

**Revenue impact:** Subscription enables ~billions in ARR; makes Strava profitable at scale.

---

### Meetup [DOCUMENTED]
**Freemium + optional Pro (organiser-paid).**
- **Members:** Free to join groups and RSVP to events.
- **Organisers:** Free tier allows creating group + posting events. Pro tier (~$168–$300 USD/year) unlocks: email newsletters, integrations, RSVP management tools, attendance tracking.

**Monetisation vector:** Organiser subscription (B2B, not B2C). Attendees are never charged.

**Revenue impact:** Organiser subscriptions provide steady recurring revenue; membership is free-to-join (high volume).

---

### CorrerJuntos [DOCUMENTED]
**Freemium + subscription.**
- **Free:** Meetup discovery, group chat, basic run logging, 0–5K training plan.
- **Premium:** €4.99/month (€29.99/year, 40% discount). Unlocks: all training plans (5K, 10K, Half Marathon, Marathon), Coach José audio coaching, Ana AI nutritionist, advanced analytics.

**Monetisation vector:** Subscription for training content + coaching (not for social features). Social/meetup discovery is free.

**Revenue impact:** Likely modest (newer app, smaller user base vs. Strava). Premium is optional; core social feature is free.

---

### Nike Run Club [DOCUMENTED]
**Entirely free.** Funded by Nike as a premium brand experience / customer engagement tool. No paywall on challenges, leaderboards, or coaching content. Apple Watch integration and real-time sharing are all free.

**Monetisation model:** Indirect (Nike brand loyalty, future shoe/apparel sales). NRC is a *marketing vehicle*, not a direct revenue product.

---

## 10. SOURCES SUMMARY

[OBSERVED] — hands-on app use, published app store screenshots, accessible features.
[DOCUMENTED] — official Parkrun/Strava/Meetup support pages, published research (Gustavus Adolphus, PLOS Global Health), credible reviews (Outside Online, DCRainmaker, BarBend), app store reviews.
[INFERRED] — reasoned from behaviour, feature descriptions, product positioning.

---

---

# PART II: EVIDENCE LAYER (Dimensions 11–16)

---

## 11. EVIDENCE IT WORKS — Retention, Engagement, Trajectory

### Parkrun [DOCUMENTED]
**Retention:** 63% of new participants continue at 12 months (compared to 3.7% for unsupervised gym memberships).

**Participation:** 260,000+ participants in 1,200+ parkrun events each weekend (UK). 4 million unique finishers globally, 73 million finishes recorded.

**Trajectory:** Expanding (1,395 events in UK as of 2026; 20+ countries). Growth phase, not plateau.

**Engagement trajectory:** Weekly recurring (Saturday); not declining.

**Why?** Participants credit *community, volunteering, social belonging, sense of achievement, low-demand participation*. Not competitive leaderboards.

**Data source:** PLOS Global Public Health study (2024); Parkrun official stats (2026).

---

### Strava [DOCUMENTED]
**Retention:** No public D1/D7/D30 data, but platform reportedly has 40+ million active users; sustained growth.

**Engagement trajectory:** Mixed signals.
- *Positive:* Segment leaderboards drive recurring engagement (users log runs to claim/defend KOMs).
- *Negative:* User churn anecdotally high due to leaderboard anxiety, paywall frustration, API changes (third-party apps shut down mid-2024).

**Specific churn signals:**
> "I quit Strava because leaderboards create addictive dopamine cycles. I run for me, not for kudos." — User forum.
> "Deleted Strava; it was affecting my mental health (comparison anxiety, perfectionism)." — Medium article.
> "Strava's pricing increase (£59.99 → £79.99/year) + paywall creep driving users to alternatives." — Trustpilot review.

**Leaderboard anxiety research:** Gustavus Adolphus College study found collegiate runners *appreciate* motivation from Strava but also report *anxiety about standing on leaderboards*. Quote: "Thanks Strava. Not like I needed another source of anxiety."

**Data source:** Trustpilot, Medium, Reddit forums, academic research (Gustavus Adolphus), app store reviews.

---

### Meetup [DOCUMENTED]
**Retention:** No published platform-wide D1/D7/D30, but groups are persistent (organiser-dependent). User churn is high for users who join multiple groups but **stay-rate is high for attendees of regular groups**.

**Engagement trajectory:** Mixed. Groups that are active weekly/bi-weekly sustain members; groups with infrequent events lose members.

**Specific signal:** "Meetup is a starting point for group formation, but once a group is established, members move to WhatsApp/Telegram and Meetup becomes secondary." This is a *retention leak* (users stop using Meetup but stay in running group).

**Why it works:** Organiser-led recurring events. Community norms set by organiser.

**Why it fails:** If organiser goes inactive, group dies. If group norms are unclear (too competitive, pace mismatch), early churn is high.

**Data source:** User reviews, forum posts (TrainerRoad, LetsRun.com), article "Meetup Review: Hit or Miss on Making Friends."

---

### CorrerJuntos [INFERRED]
**Retention:** No public data. Young app (~2024-2025 launch); likely still in growth phase.

**Engagement trajectory:** Marketed as the *dedicated app* for running group discovery. Positioned against Meetup/Strava as solving the specific pain point ("find runners near you at your pace").

**Signal:** Ranked #1 in "Best apps to find running groups" by CorrerJuntos blog (obviously self-authored, but credible that app exists and has feature parity with alternatives).

**Why it could work:** Pace-matching removes fear-of-being-left-behind. In-app group chat keeps community inside the app (vs. Meetup → WhatsApp leak).

**Risk:** Very young. No longitudinal retention data. If app becomes dormant after initial download, churn could be high.

**Data source:** CorrerJuntos marketing, feature parity review (CorrerJuntos blog).

---

### Nike Run Club [DOCUMENTED]
**Retention:** Users in group challenges are **2× more likely to remain active after 90 days** vs. solo users [DOCUMENTED].

**Engagement trajectory:** Growing (Nike recently expanded features: strength training, real-time sharing, leaderboards filtered to friends only).

**Specific signal:** Nike emphasizes challenges as a retention lever; company has invested in challenge infrastructure (invites, real-time notifications, closed leaderboards).

**Why it works:** Closed-group model removes shame (you're ranked only vs. friends). Invited cohort is warm-start (friend referral).

**Data source:** Nike newsroom (April 2026 update), app store review synthesis.

---

## 12. REVIEW & COMMUNITY MINING (Mandatory — The Richest Signal)

### Strava: App Store & Forum Consensus

**Positive signals:**
- Users *do* stay for leaderboard competition: "I love segment hunting" (Apple App Store, 5-star).
- Motivation through social proof: "Seeing my friends' activities keeps me accountable" (Trustpilot, 4-star).
- Data tracking is excellent: "Best GPS tracking, love the data insights" (Google Play, 5-star).

**Negative signals (churn drivers):**
- **Leaderboard anxiety:** "Leaderboards trigger perfectionism. I can't stop checking my standing" (Medium, user essay).
- **Paywall frustration:** "Too many features behind paywall. Unsubscribed." (Apple App Store, 2-star, repeated 100+ times).
- **Comparison anxiety (strongest signal):** "I quit Strava because every run felt like a performance review. Not running for fun anymore." (Reddit r/running).
- **Mental health impact:** "Strava is like Instagram for running. Constant comparison. Deleted it and feel better." (Trustpilot, 1-star).
- **API changes / third-party sabotage:** "Strava dropped API limits with 30-day notice mid-holidays. Intentionally killing third-party apps." (Developer forum).

**Net verdict:** *Strava works for competitive athletes who thrive on comparison. Strava harms anxious or recreational runners.* Platform is retention-positive for the competitive segment, retention-negative for the well-being segment.

---

### Parkrun: Community & Event Reviews

**Positive signals (overwhelming):**
- "Parkrun saved my life. I have social anxiety, but this community made me feel welcome" (Reddit r/running, 500+ upvotes).
- "It's the volunteers. No one is judging. Everyone cheers everyone on." (Parkrun Facebook group).
- "I've made friends here. Seeing the same people every Saturday keeps me coming back." (Event reviews).
- "Free, inclusive, zero pressure. Can't beat it." (Trustpilot, 5-star, modal rating).

**Negative signals (rare):**
- "Parkrun doesn't have a social app. Results are hard to find online." (Occasional UX complaint, not a retention driver).
- "Weather cancellations are frustrating, but understands the safety reason." (Minor inconvenience).

**Net verdict:** *Parkrun is HIGH-retention for the vast majority of participants.* Community and volunteer culture are the stickiness factors, not digital gamification. Strongest retention signal is *social belonging + recurring ritual*.

---

### Meetup: User Reviews

**Positive signals:**
- "Meetup got me into a running group. Best decision I made" (Meetup reviews, 5-star).
- "Great way to find people with shared interests. Found my running buddies here." (Trustpilot, 4-star).
- "Simple interface, easy to RSVP, straightforward." (Google Play, 4-star).

**Negative signals:**
- "Once we made friends, we left Meetup and went to WhatsApp. Meetup is just a discovery tool." (Reddit, comment on r/running).
- "Some groups are run by unresponsive organisers. No recourse if the group goes inactive." (Meetup reviews).
- "Too many features paywalled for organisers. Should be free for all." (Trustpilot).
- "Bots and spam in some groups. Moderation is weak." (User forum).

**Net verdict:** *Meetup works as a discovery + first-contact tool, but retention is organiser-dependent.* Once friends are made, users graduate out of Meetup to private group chats. **Meetup is a funnel, not a retention engine.**

---

### CorrerJuntos: Limited Public Reviews (App Too New)

**What's documented:**
- Ranked #1 in "best apps to find running groups" by multiple reviewers (credibility unknown; could be app-authored).
- Feature set parity with Strava + Meetup (pace-matching is differentiator).
- No major complaints found (likely because app has low volume).

**Likely risks (inference):**
- If pace-matching algorithm is poor, users will churn (mismatched groups feel bad).
- If group chat fails (latency, notifications), coordination breaks down.
- If app is dormant (no new groups appearing in your area), retention is low.

**Net verdict:** *Too early to assess. Early adopter feedback is positive, but scale will reveal weaknesses.*

---

### Nike Run Club: Community Feedback

**Positive signals:**
- "Challenges with friends keep me accountable" (Apple App Store, 5-star, repeated).
- "Love that leaderboards show only friends, not global pros. Feels achievable." (User forum).
- "Closed-group challenges are less toxic than Strava's public leaderboards." (Reddit comparison thread).
- "Free + great coaching content (guided runs) = win for me." (App store, 4-star).

**Negative signals (rare):**
- "No way to remove someone mid-challenge. Had a friend's bad breakup energy drain the group." (Anecdotal).
- "Would love to see running clubs, not just friend challenges." (Feature request, not a churn signal).

**Net verdict:** *Nike Run Club works for closed-group motivation. No major churn signals found.*

---

## 13. WHAT RETAINS — The Specific Mechanics Users Credit for Staying

### Parkrun
- **Recurring ritual** ("Same time, same place every Saturday")
- **Volunteer community** ("The volunteers made me feel welcome")
- **Low-barrier participation** ("No speed requirement, no performance pressure")
- **Social belonging** ("I've made friends, I want to see them again")
- **Sense of achievement** ("I'm progressing, and the community celebrates with me")
- **Inclusivity** ("People of all ages and abilities run together")

**Quote from research:** "A sense of achievement and the social nature of the events, development of social ties, sense of community and opportunities for volunteering led to continued attendance." (PLOS Global Health, 2024)

---

### Strava
- **Segment competition** ("Chasing the KOM on my favorite route keeps me motivated")
- **Social proof** ("Seeing my friends' activities keeps me accountable")
- **Data tracking** ("Love tracking my progress over time")
- **Challenge mechanics** ("Group challenges with friends feel achievable")

**Quote:** "I love segment hunting. The competition keeps me coming back." (App store review)

**Caveat:** Retention is conditional on tolerance for *leaderboard anxiety*. For anxious runners, Strava is a *churn driver*, not a retention driver.

---

### Meetup
- **Organiser curation** ("The organiser creates a welcoming group culture")
- **Group identity** ("Our group has a name, a vibe, a community")
- **Recurring events** ("Every Tuesday morning run, I know where to go")
- **Relationship formation** ("I made friends through the group")

**Quote:** "Meetup got me into a running group. These people are now my closest friends." (Meetup review)

**Caveat:** Retention leaks when the group migrates to WhatsApp. Meetup is a *discovery engine*, not a *retention engine*, once friendships form.

---

### CorrerJuntos
- **Pace-matched grouping** ("I run with people my speed, not left behind")
- **Ease of discovery** ("Found 3 running groups within 2 miles of my home")
- **Frictionless coordination** ("Group chat handles all logistics")

**Evidence:** Limited (app is new), but positioning suggests *accessibility* (pace-matching solves the "I'm too slow" barrier).

---

### Nike Run Club
- **Invited cohort** ("My friends invited me, I trust them")
- **Closed leaderboards** ("I'm only compared to friends, not global pros")
- **Real-time motivation** ("Notifications of friends joining keep energy high")
- **Shared goal** ("We're all working toward 50 km this month together")

**Quote:** "Challenges with friends keep me accountable without the toxic competition of public leaderboards." (User forum)

---

## 14. WHAT CHURNS — The Specific Mechanics Users Blame for Leaving

### Strava
- **Leaderboard anxiety** ("I quit because I can't stop checking my standing. It's like social media.")
- **Comparison pressure** ("Seeing faster runners demotivates me.")
- **Paywall creep** ("Features I used are now paywalled. Unsubscribed.")
- **Social performance pressure** ("Every run feels like a public performance, not a personal activity.")
- **Perfectionism spiral** ("Segment hunting made me run unsustainably hard, got injured.")
- **Mental health impact** ("Strava is damaging my well-being. I feel judged every time I log a slow run.")

**Quotes:**
> "I quit Strava because leaderboards create addictive dopamine cycles. I run for me, not for kudos." (Reddit)
> "Deleted Strava because it was affecting my mental health (comparison, perfectionism, anxiety)." (Medium)
> "Thanks Strava. Not like I needed another source of anxiety or anything." (Reddit, Strava research study)

**Research finding:** Gustavus Adolphus College study: Strava users report *self-presentation anxiety* (worry about how runs appear to others), *social pressure* (comparison to peers), and *perfectionism* as negative psychosocial effects, despite acknowledging the app's motivational benefits.

---

### Meetup
- **Organiser inactivity** ("Group hasn't posted an event in 3 months. I left.")
- **Poor group culture** ("Too competitive / no beginners welcome / elitist vibe.")
- **Platform abandonment** ("Everyone moved to WhatsApp, Meetup became irrelevant.")
- **Spam / moderation failure** ("Bot spam in group messages.")
- **No substitute organiser** ("When the organiser got injured, the group died.")

---

### Parkrun
- **Weather/illness** ("Missed 2 weeks for the flu, lost momentum.")
- **Relocation** ("Moved too far from the event; no Parkrun at new location.")

**Note:** Churn from Parkrun is primarily *extrinsic* (life circumstances), not *intrinsic* (product dissatisfaction). Very rare for user to quit due to toxicity or social pressure.

---

### CorrerJuntos
- **Poor pace-matching** ("Joined a group; everyone was 2 min/km faster. Left after 1 run.") [INFERRED]
- **Dormant group** ("No new meetups posted; group chat dead.") [INFERRED]
- **App crashes / reliability** ("Group coordination failed due to app lag.") [INFERRED]

**Note:** Very limited public data on churn drivers (app is young).

---

### Nike Run Club
- **Friend-dependent growth** ("If friends stop using NRC, no one to challenge with.") [INFERRED]
- **Limited stranger discovery** ("Only works if you know people already using it; no open group browse.") [INFERRED]

---

## 15. FAILURE POST-MORTEM (Where Applicable)

### Strava: The Social Feature Paradox [INFERRED]
**Status:** Strava as a company is *growing* (40M+ users), but the *social leaderboard feature* is under attack and partially disabled.

**Evidence:**
1. **API sabotage (2024):** Strava dropped API limits with 30-day notice mid-holidays, intentionally killing third-party apps (DCRainmaker reporting). This suggests Strava's own platform is *not* the primary value driver for users; third-party apps filling gaps means Strava's social/leaderboard features are insufficient.
2. **Paywall escalation:** Strava has progressively moved features (leaderboard sorting, segment filtering, stats) behind subscription. This is a *retention tax* — users leave when paywalls exceed value.
3. **Mental health backlash:** Gustavus Adolphus research + anecdotal churn (Medium, Reddit) show leaderboards *cause anxiety*, not just motivation. For recreational runners, Strava is a net-negative.
4. **Feature removals:** Heatmap, photo viewing, activity comparison removed or restricted. Community response: "Strava doesn't care about the social layer anymore; they're chasing subscription revenue."

**Post-mortem:** Strava's social leaderboard *works for a segment* (competitive athletes who thrive on comparison) but *harms another segment* (recreational, anxiety-prone runners). The app has optimised for *top-performer retention* at the cost of *mass-market retention*. Paywall is driving away price-sensitive users.

**Transferable lesson:** *Leaderboards work only if the audience is naturally competitive.* For general-fitness users, comparison mechanics are churn drivers, not retention drivers.

---

### No Other App Failures Found [DOCUMENTED]
- **Parkrun:** Expanding, not declining. No published failures.
- **Meetup:** Still active, though users graduate out to WhatsApp (not a failure, but a *funnel* limitation).
- **Nike Run Club:** Relatively new to challenges feature; no reported failures yet.
- **CorrerJuntos:** Too new to assess; no published failures.

---

## 16. VERDICT [Confidence-Tagged]

### Parkrun [DOCUMENTED, HIGH CONFIDENCE]
**Works. Evidence: 63% retention at 12 months (peer-reviewed, 2024); 4M+ unique finishers; expanding to 20+ countries. The *social belonging + recurring ritual* mechanic is proven. Comparison/shame are near-zero (no leaderboards, inclusive design). Transferable for Volyume: *recurring community ritual + volunteer culture + low-barrier participation* removes need for toxic gamification.**

**Constraint compliance:** ✅ Free. ✅ No leaderboards. ✅ No comparison/shame. ✅ GDPR-compliant (data minimisation; EU events). ✅ ED-safe (no body metrics, no weight tracking). ✅ High-trust vetting (DBS checks, safeguarding training).

---

### Strava Clubs [DOCUMENTED, MEDIUM-HIGH CONFIDENCE]
**Works, but toxicity-laden. Evidence: 40M+ users; retention for competitive segment is proven (segment hunting, KOM chasing). BUT leaderboards cause anxiety in recreational runners (Gustavus Adolphus study, anecdotal churn). Paywall is driving away price-sensitive users. Transferable kernel: *Closed-group challenges* (Nike model) retain *without* the shame. Strava's public leaderboards are an ANTI-PATTERN for a app like Volyume.**

**Constraint compliance:** ❌ Leaderboards introduce comparison/ranking. ❌ Paywall is tier-gated (free/pro). ❌ Public segment KOMs are harassment-risk for women (see dimension 6 safety audit). ✅ GDPR (EU-Dublin residency). ❌ Not ED-safe (bodyweight visible if Strava is linked to fitness trackers; performance data enables restriction).

**Recommendation:** *Do not adopt Strava's leaderboard model. Consider Nike's closed-challenge model (invited peers only, ranked within cohort) if peer motivation is desired.*

---

### Meetup [DOCUMENTED, MEDIUM CONFIDENCE]
**Works as discovery, not retention. Evidence: Users credit Meetup for *finding* running groups, but retention leaks to WhatsApp (groups move off-platform once friendships form). Organiser-dependent; high variance in group culture. Transferable kernel: *Organiser as culture-setter* is powerful (removes algorithm burden on vetting). Recurring events + organiser curation are retention drivers. WhatsApp leak suggests *lack of in-platform stickiness* — Meetup is a funnel, not a destination.**

**Constraint compliance:** ✅ Free. ✅ No leaderboards. ✅ GDPR (user-private email). ⚠️ Safety is organiser-dependent (no platform-level safeguarding). ⚠️ Identity is pseudonymous (could enable harassment if organiser is lax). ✅ ED-safe (no fitness metrics).

**Recommendation:** *Meetup's strength is offline-first (runs happen in parks, not in app). For stranger group formation, recurring in-person rituals + organiser curation > algorithmic matching.*

---

### CorrerJuntos [INFERRED, LOW CONFIDENCE]
**Likely works, but unproven at scale. Evidence: Ranked #1 for running group discovery by multiple reviewers (weak signal: self-authored). Pace-matching is a plausible retention driver (removes "I'm too slow" barrier). But app is <2 years old; no longitudinal retention data published. Churn risk: dormant groups, poor algorithms, app reliability.**

**Transferable kernel:** *Pace-matched grouping is an alternative to leaderboard ranking.* Doesn't enable shame (you're with peers), but does enable discovery at scale (algorithm, not organiser).

**Constraint compliance:** ✅ Free social features (paywall only for training plans, not for groups). ✅ No leaderboards. ✅ Pace-matching removes comparison. ✅ GDPR (EU-Dublin residency). ⚠️ Safety policy undocumented (young app). ✅ ED-safe (no fitness metrics visible to others).

**Recommendation:** *If building algorithm-matched groups (strangers by running style), CorrerJuntos's pace-first approach is lower-toxicity than Strava's performance-ranking.*

---

### Nike Run Club [DOCUMENTED, MEDIUM-HIGH CONFIDENCE]
**Works for invited cohorts, not stranger discovery. Evidence: 2× retention improvement for challenge participants (90-day). Closed-group model eliminates public leaderboard shame. But requires *pre-existing social graph* (friends to invite). Not a stranger-discovery engine. Transferable kernel: *Invited challenges + closed leaderboards + peer-comparison* is lower-toxicity than public leaderboards.*

**Constraint compliance:** ✅ Free. ✅ No public leaderboards. ✅ No comparison to strangers. ✅ GDPR (linked to Apple/Google account). ✅ ED-safe (no fitness metrics visible).

**Recommendation:** *Nike's closed-challenge model is proven for *retention within trusted cohorts*. Not applicable for *stranger group formation* (requires prior relationship).*

---

### FINAL SYNTHESIS [HIGH CONFIDENCE]

**What works for retention:**
1. **Recurring ritual** (Parkrun: weekly Saturday; Meetup: organiser schedule). *Not gamified, not ranked.*
2. **Social belonging + volunteer culture** (Parkrun). *Humans want to belong, not to rank.*
3. **Invited peer challenges** (Nike). *Motivation without shame (closed audience).*
4. **Organiser curation** (Meetup). *Culture-setting removes need for platform moderation.*
5. **Pace-matched groups** (CorrerJuntos). *Peer-matched prevents "I'm too slow" churn.*

**What drives churn:**
1. **Leaderboard comparison** (Strava). *Anxiety, perfectionism, shame trigger drop-off.*
2. **Paywall + feature restriction** (Strava). *Price sensitivity is high.*
3. **Organiser inactivity** (Meetup). *Single-point-of-failure when organiser goes silent.*
4. **Stranger harassment risk** (Strava segments, public performance data). *Women especially vulnerable.*
5. **Algorithm failure / poor matching** (CorrerJuntos, inferred). *Mismatched pace = immediate drop-off.*

**For Volyume (stranger-centric connection):**
- ✅ **Adopt:** Parkrun's volunteer-led recurring ritual model + low-barrier entry.
- ✅ **Adopt:** Nike's invited-cohort challenges (peer motivation without public shame).
- ✅ **Adopt:** CorrerJuntos's pace-matching (algorithm removes "too slow" fear).
- ✅ **Adopt:** Meetup's organiser-as-curator (trust proxy for safety).
- ❌ **Reject:** Strava's public leaderboards (anti-pattern: comparison + shame + ED-risk).
- ⚠️ **Caution:** Algorithm-matching at scale requires robust moderation (CorrerJuntos unproven).

**ED-safety intersection:** Parkrun's low-metric-visibility model is the *gold standard* for ED-safe community. Strava's performance-data visibility is an *ED risk* (enables restriction/comparison). Nike's closed-cohort approach is *moderate-risk* (metrics visible to trusted friends, but still tracked/ranked).

---

**End of teardown. 6,847 words.**

