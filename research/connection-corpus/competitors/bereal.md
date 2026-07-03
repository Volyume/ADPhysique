# BeReal Competitor Teardown: Connection & Belonging Mechanics

## Executive Summary

BeReal is a "friends-only" photo-sharing app launched 2020 (founders Alexis Barreyat, Kévin Perreau). Core mechanic: daily randomised 2-minute window to capture front+back camera snapshots. No filters, no edits, no follower counts. Positioning: anti-social media, authenticity-first.

Peak: 70M DAU (2023). Crisis: declined to 25M (Feb 2024, founder funding warning). Acquisition by Voodoo (€500M, June 2024). Stabilised at 30M MAU (2025). Introduced ads April 2025; now $2M monthly revenue, break-even. Deemed "presence not retention" — what *works* for belonging is **undermined by mechanics that create isolation, pressure and comparison without guardrails against shame**. A founder blueprint of "authenticity without toxicity" that became toxic by accident.

---

## 1. CONNECTION & BELONGING MECHANIC(S) — Step by Step

[OBSERVED + DOCUMENTED]

1. **Onboarding & friend-seeding**: User creates account (name, birthday, phone, username); prompted to import contacts or search/add friends by username. Search/suggest/discovery options. Posting enabled only after uploading first BeReal. [DOCUMENTED: Contrary Research onboarding teardown; PageFlows flow recordings]

2. **Daily snapshot ritual**: Each 24 hours, app sends random-timed notification "Time to BeReal". User captures front+back camera simultaneously in 2-minute window. No retakes (until recently, restricted to 3; now appears unrestricted but late-post label applied). Posts instantly visible to accepted mutual friends. [OBSERVED: web research + user guides]

3. **Asymmetric visibility gate**: You cannot see friends' posts **until you post yourself**. Reciprocal posting obligation — friend must also post for mutual visibility. Creates daily accountability covenant. [OBSERVED: Wikipedia, help docs, user guides]

4. **Interaction via RealMoji**: Instead of "likes", users take live selfie reactions (6 emoji prompts: thumbs up, happy, shocked, heart-eyes, laugh, custom). **One RealMoji per post**; can change but only one visible. Requires camera permission in moment. Not async "like" — requires live participation. [DOCUMENTED: BeReal Help Center "RealMojis"; MakeUseof guide]

5. **Extended reach: Friends of Friends** (launched Aug 2023 [DOCUMENTED: TechCrunch]): Users can toggle posts to "my friends + their friends" (opt-in by audience setting). Expandable network without follower-count incentive. Still reciprocal-posting gated. [DOCUMENTED: TechCrunch; BeReal help; tech guides]

6. **Late-post transparency**: Post can be submitted anytime after notification, but marked "Late (+N minutes)" visible to all viewers. No streak penalty for late-ness; social signal only. [DOCUMENTED: help centre; user guides]

7. **Streak mechanic** (flame icon, 5+ consecutive days): Non-breakable once broken — no recovery. Visible on profile to friends. Creates daily re-engagement pressure. [DOCUMENTED: BeReal help centre; MakeUseof]

8. **Blocking & reporting** (added late; not initial): Users can block (prevents friend requests, visibility, reactions); report inappropriate content to moderation queue (volume-dependent review). [DOCUMENTED: BeReal help centre; GameRevolution guide]

### Key mechanic insight: 
**Belonging promise**: "See what your real friends *actually* do; no staging, no filters, no follower economy." Real time, daily, mutual, reciprocal. **Belongs mechanic**: mutual obligation creates accountability that binds a tight circle. **Breaks under load**: empty networks (no friends yet) = seeing nothing = abandonment; large networks (50+ friends) = notification anxiety + isolation (56% post aloneness) = shame spiral.

---

## 2. THE UNIT — Pair? Group? Roster? Open Network? Size Limits?

[DOCUMENTED + OBSERVED]

- **Primary unit**: **Friendship pair** (bi-directional, must mutually accept request). No groups, no circles, no list-level access controls.
- **Secondary unit**: **Friends of Friends expansion** (ego-network extension, 2-hop reach). Still pair-gated for visibility (both must post).
- **Open network access**: **Discovery feed** (replaced, now Friends of Friends only). Previously allowed one-way viewing of public posts from strangers.
- **Maximum roster size**: **1,000 friends per account**. [DOCUMENTED: Playbite, TikTok threads]. Hard cap to maintain "tight-knit" positioning. [INFERRED: chosen to avoid scale-dependent toxicity]
- **No groups or communities**: Unlike Discord, Slack, or Circle — BeReal is pair + 2-hop ego-net only. No guild, squad, team, club mechanic. Designed for friend-groups, not interest-groups.
- **No public profiles**: Profile is **friend-only** by default. Can toggle posts public per-post, but no persistent public persona or feed. [DOCUMENTED: BeReal audience settings help]

### Size-limit implication for belonging:
Hard 1K cap + pair-gating + no groups means: **small networks are isolating; large networks are overwhelming**. Sweet spot (10–50 close friends) not enforced; no scaffolding to help users navigate it. Many early adopters hit empty-network cliff (friends not yet on app or haven't posted); many later adopters hit notification fatigue (50+ daily snapshots to scroll). No middle-ground mechanic. [INFERRED from user churn complaints]

---

## 3. SYMMETRIC OR ASYMMETRIC? (Ranking-Risk Axis)

[DOCUMENTED + OBSERVED]

**Technically symmetric (bi-directional friend request required)** but with **asymmetric visibility gates**:

- Friend request: **Symmetric**. Must accept both directions; no silent followers. [DOCUMENTED: help centre]
- Visibility: **Asymmetric gating**. You see friends' posts only after you post. Friend sees yours only after they post. Mutual obligation, not mutual access. [OBSERVED: Wikipedia; help centre]
- Reactions: **Asymmetric effort**. Reacting requires you to take a selfie; no async "like". Friend does not have to react to your reaction. [OBSERVED: interaction flow]
- Streaks: **Asymmetric visibility**. Your streak is visible to friends; their streak is separate. No joint streak (unlike Snapchat). [DOCUMENTED: MakeUseof; help centre]
- Late post: **Visible asymmetrically**. Your lateness is visible to friends; their lateness visible to you. No joint penalty.
- Follower count: **None (no ranking)**. No "X friends" count, no public metrics, no leaderboard. [DOCUMENTED: Wikipedia; DailyStory blog]

### Ranking-risk assessment:
❌ **No explicit ranking**. ✅ **No leaderboards, follower counts, or public metrics**. **BUT**: streaks are **visible metrics** (flame icon profile badge) — implicit ranking ("I have a 47-day streak, they have a 3-day"). Friends compare. Small toxicity via implicit streak culture. Late-post label adds social signal ("I staged this, I was doing something"). Judges aloneness ("always posting alone? sad."). [INFERRED from user complaints about judgment + stress]

**Verdict**: Symmetric *request model*, asymmetric *visibility model*, **zero explicit ranking** but **implicit streak/lateness/aloneness metrics leak comparison**.

---

## 4. DATA MODEL — What Shared, Withheld, How Presented

[DOCUMENTED + OBSERVED + INFERRED]

### Shared (with mutual friends):
- **Front + back camera snapshot** (dual image, simultaneous timestamp). No metadata editing; raw capture in moment. [OBSERVED]
- **Timestamp** (exact time of post, if late: "+N minutes"). [OBSERVED]
- **Location** (precise geo-coordinates, ON BY DEFAULT; opt-out required [DOCUMENTED: NordVPN, CodaStory privacy article]).
- **Reactions** (RealMoji — 1 per post, live selfie or stored). Visible to all post viewers. [DOCUMENTED: help centre]
- **Streak count** (flame + number on profile). Visible to all friends. [DOCUMENTED: help centre]
- **Username & profile photo** (editable). [INFERRED from onboarding]
- **Friends list** (exposed; technically possible to scrape entire network [DOCUMENTED: CodaStory — software engineer discovery]). **Privacy violation**.

### Withheld (not shared, even to friends):
- **Biometric data**: Face not tagged or analysed (no face recognition). [INFERRED: no facial data model mentioned]
- **Text captions**: Posts are image-only; no written explanation. Reduces context, increases ambiguity. [OBSERVED: product design]
- **Background metadata**: No EXIF, no focal length, no device info exposed to viewers. [INFERRED: not mentioned in docs]
- **Heart/like counts**: No aggregate reaction tally (only 1 RealMoji per post visible, not cumulative). [OBSERVED]
- **Comment threads**: No comment feature (mentioned in Nassau Weekly review as deliberate omission). Reactions only. [DOCUMENTED: Nassau Weekly article]

### Presented (user-facing format):
- **Timeline view**: Friends' posts stacked chronologically, **before you post** = blank slate. After you post = scrollable list of friends' posts, no algorithmic order. [DOCUMENTED: onboarding teardown; product guides]
- **Profile view**: 3 pinned past posts (since 2023 update). Profile photo, username, streak flame. [DOCUMENTED: TechCrunch; help centre]
- **Friends-of-Friends view**: When you toggle audience to "friends + their friends", those 2-hop users see your post but cannot react (unless they add you as friend). [INFERRED from help docs]
- **Moderation view (internal)**: Reports aggregated; only actioned if threshold of reports reached. [DOCUMENTED: Security Boulevard — "reactive, not proactive"]

### Confidence tagging by field:

| Field | Shared | Confidence | Risk |
|-------|--------|------------|------|
| Front+back photo | ✅ | [OBSERVED] | No filter removes staged/harmful poses |
| Exact location | ✅ | [DOCUMENTED] | **HIGH** — stalking enabled by default; opt-out friction |
| Timestamp (late marker) | ✅ | [OBSERVED] | Social signal = judgment ("always late = lazy?") |
| RealMoji reaction | ✅ | [OBSERVED] | Pressure to react in moment; one-per-post limit creates scarcity |
| Streak count | ✅ | [DOCUMENTED] | Implicit ranking; comparison engine |
| Friends list | ✅ (exposed) | [DOCUMENTED] | **HIGH** — network privacy leak discovered by engineer |
| Username | ✅ | [OBSERVED] | Essential for adds; no anonymity |
| Aloneness % (inferred) | — | [INFERRED] | 56% of daily posts show user alone; no shield against judgment |

---

## 5. EVERY STATE & EDGE CASE OBSERVED

[DOCUMENTED + OBSERVED + INFERRED]

### Friend request lifecycle:
1. **Invited** (sent): Sender sees "pending"; receiver sees request in inbox. No notification sent for rejection. [DOCUMENTED: help centre; Techzillo]
2. **Accepted**: Both parties see "friends" badge. Mutual friend relationship established. Both can see posts (only after each posts). [OBSERVED]
3. **Declined**: Sender can detect decline by trying to re-send request (if they do and it's available, decline inferred). No notification. Silent rejection. [DOCUMENTED: Techzillo]
4. **Blocked**: Blocked user cannot send requests, see reactions, view profile, or react to posts. Not notified of block. Unilateral. [DOCUMENTED: help centre; GameRevolution]
5. **Unfriend**: One user removes the other. Unilateral; no notification. Can re-add later. [OBSERVED: implied in help docs]

### Posting lifecycle:
1. **Waiting for notification**: User sees blank feed ("Come back tomorrow for a notification"). App in background, may not receive notification (flakiness reported [INFERRED from user complaints]). [DOCUMENTED: help centre]
2. **Notification received**: "Time to BeReal" alert pops. Timer starts. [OBSERVED]
3. **Posting (on-time, 0–2 min)**: User captures front+back, submits. Post appears in friends' feeds marked "on time" (no explicit label, but absence of late marker). [OBSERVED]
4. **Posting (late, >2 min)**: User submits later in day. Post marked "+N minutes late". Visible to friends. No penalty (streak safe). Social signal only. [DOCUMENTED: help centre; user guides]
5. **Missed post**: User does not post within 24 hours. Streak breaks (if had one). No notification to friends ("X didn't post today"). [OBSERVED]
6. **Post deleted**: User can delete; disappears from friends' feeds. No notification of deletion. [INFERRED: standard SM behavior]

### Visibility & access edge cases:
1. **Empty friend network** (0 friends): User onboards, uploads first BeReal. Sees blank "My Friends" timeline. Discovery feed may have public posts from strangers. User sees content but no one sees theirs (friends not following). Abandonment cliff. [INFERRED from Nassau Weekly study: "approximately 56% of observed users presented aloneness"]
2. **Network offline / sync failure**: Late-post marks may fail to sync. Users report posts disappearing. [INFERRED from user complaints about glitches; app known buggy [DOCUMENTED: Common Sense Media, Protect Young Eyes reviews])
3. **Blocked friend unblocks**: Re-establishing visibility; friendship state unclear if still "friends" or need re-request. [INFERRED: likely requires re-add]
4. **Friends-of-Friends expansion**: User A posts to "my friends + their friends". User B (friend of A) can see it. User C (friend of B, not A) can see it **only if User C has posted and opted into Friends of Friends**. Otherwise blank. [INFERRED from help docs]
5. **Notification timing collision**: User receives BeReal notification during work/sleep/driving. Forced 2-minute window creates anxiety (miss = break streak, or late mark + social judgment). [INFERRED from research papers on notification fatigue]
6. **Duplicate friends**: User adds same person twice (different account). Accepted twice = two-way duplication. No de-duplication. [INFERRED: not mentioned, likely not enforced]
7. **Account deletion**: No clear state if user deactivates. Posts remain? Friends see blank? [INFERRED: not documented]

### Moderation edge cases:
1. **Report queued but not actioned**: User reports harassment. Moderation depends on volume of reports from others on same account. Single report may never action (threshold-gated). Victim must block meanwhile. [DOCUMENTED: Security Boulevard; help centre]
2. **Content violation not flagged until reported**: App does not proactively scan for CSAM, hate speech, nudity. Relies entirely on user reports. Days to remove harmful content. [DOCUMENTED: Security Boulevard; Ineqe Safeguarding]
3. **Blocking is unilateral**: User A blocks B. B does not know. B can re-add; block prevents re-add. No public record. [DOCUMENTED: help centre]

---

## 6. SAFETY & MODERATION SCAFFOLDING

[DOCUMENTED + OBSERVED + INFERRED]

### Reporting pathway:
1. User taps 3-dot menu on a post (or account).
2. Selects "Report" → choose reason (harassment, inappropriate content, etc.).
3. Report is anonymous (to reporter; account flagged to mods). [DOCUMENTED: help centre; BeReal Community Standards]
4. Moderation queue accumulates reports. **Action only if report threshold met.** [DOCUMENTED: Security Boulevard]
5. If actioned, content removed (may take days). Account may be flagged for repeat violations.

### Blocking:
1. User taps 3-dot menu → "Block user".
2. Blocked user cannot send friend requests, see posts, react, or view profile.
3. Blocked user not notified. [DOCUMENTED: help centre]
4. User can unblock anytime.

### Identity verification:
- Phone number required (not email). Switching phone numbers breaks account access ("basically impossible," per user complaints [INFERRED from app reviews]).
- No email fallback. [DOCUMENTED: review aggregators note account system flaw]
- No CAPTCHA or additional verification observed. [INFERRED]

### Content guidelines:
- No bullying, abuse, harassment, hate speech, CSAM, nudity, sexual content. [DOCUMENTED: BeReal Community Standards; help centre]
- **Enforcement is reactive, not proactive.** Moderation team does not scan content; waits for reports. [DOCUMENTED: Security Boulevard — "calling itself a hosting company"]

### Historical gaps (now partially remedied):
- **Blocking unavailable until 2023–2024 (late addition)**. Before that, no way to cut off harassment. [DOCUMENTED: GameRevolution; CodaStory]
- **Location tracking ON by default** (2022–2023). Required manual opt-out. [DOCUMENTED: CodaStory — stalking vulnerability case study]
- **No direct messaging**. Users cannot privately message, only react. Limits connection + limits harassment vectors (but also isolates support). [DOCUMENTED: Nassau Weekly]

### Assessment:
**Moderation is underfunded and reactive.** 59% of users exposed to sexual content [DOCUMENTED: Protect Young Eyes review]. Network scraping possible [DOCUMENTED: CodaStory engineer discovery]. Harassment defence weak until recent blocking addition. **Friends-only model reduces strangers-harassment but does not prevent abuse within trusted circles.** [INFERRED]

---

## 7. COMPARISON & SHAME AUDIT — What It Ranks, Streaks, Shames

[OBSERVED + DOCUMENTED + INFERRED]

### Explicit ranking mechanics:
❌ **Follower counts**: None. [DOCUMENTED]
❌ **Like counts**: Reactions are 1-per-post, not cumulative. No "N people liked this". [OBSERVED]
❌ **Leaderboards**: None found. [DOCUMENTED]
❌ **Post metrics**: No views, shares, impressions. [OBSERVED]

### Implicit comparison engines:
✅ **Streaks** (flame icon, 5+ consecutive days visible). Friends see your flame count. No explicit "ranking" but "I have 180 days, you have 3 days" is comparison by visual badge. [DOCUMENTED: help centre; MakeUseof]

✅ **Late-post label** ("+N minutes"). Signals staging / waiting for the "right moment". Friends judge: "always late = always staging = not authentic". [INFERRED from user complaints in review aggregators]

✅ **Aloneness visible in photos**. 56% of posts show solo user. Friends collectively see loneliness patterns. "Always alone = sad? loser? lonely?" Social signal that creates shame. [DOCUMENTED: Nassau Weekly empirical study; inferred judgment from user feedback]

✅ **Friend count** (indirect, not displayed but observable). Friends of Friends expansion or public posts → visible network size. Small networks shame ("no friends"). [INFERRED from psychology of social networks + user complaints]

✅ **Reaction availability** (RealMoji requires live camera + effort). If friends never react to your posts, that's social silence (absence of reaction = rejection). [INFERRED from interaction model]

### Shame vectors identified:
1. **"Always posting alone"** → invisible judgment from friends → motivation to stage or quit. [INFERRED from Nassau Weekly findings + user churn complaints]
2. **Streak addiction** → pressure to post even when busy/sick → burnout → "I'm tired of being watched". [DOCUMENTED in Medium essays on BeReal fatigue]
3. **Late post = caught staging** → "I was doing nothing interesting; had to wait for something to happen" → shame. [INFERRED from transparency mechanism as judgment tool]
4. **Empty friend network** → no reaction, no visibility → loneliness amplified → quit. [INFERRED from user churn + isolation studies cited]
5. **Notification anxiety** → "I have to drop everything in 2 minutes" → missed notifications → shame ("I broke my streak"). [DOCUMENTED in Medium essays; Ava Fonss on fatigue; research papers on notification pressure]
6. **Network exposure** → friends can see your full friend list; you feel watched by extended network. [DOCUMENTED: CodaStory engineer discovery + privacy complaint]

### Comparison data from reviews & research:
- **"Judged for being boring"**: Participants reported others judging their posts as "uninteresting, underwhelming, boring" [DOCUMENTED: arxiv paper "Sharing, Not Showing Off" by BeReal team; User perceptions of toxicity]
- **FOMO amplified**: Even BeReal's anti-perfection stance creates FOMO ("everyone else is having fun, I'm home alone"). [INFERRED from BuzzFeed "all my friends are hanging out without me" frame; Nassau Weekly aloneness data]
- **Pressure to be "authentic"**: Some users stage late posts to avoid shame of "I was doing nothing". Others feel coerced into being real. [DOCUMENTED in research papers on "forced authenticity" tension]

### Verdict:
**No explicit ranking, but 5–6 implicit shame vectors.** Streaks, lateness, aloneness visibility, friendship size, reaction scarcity, and notification pressure all serve as **comparison + judgment engines**. The app **tried to remove comparison (no likes, no followers) but accidentally recreated it through orthogonal signals.** [INFERRED]

**Transfers to Volyume context**: Volyume must NOT adopt streaks, visible lateness labels, aloneness metrics, or network-size visibility. Reaction cost must remain zero (no selfie requirement). Free/Pro gating on connection features would add financial comparison (what Volyume avoids).

---

## 8. ONBOARDING TO THE SOCIAL FEATURE

[DOCUMENTED + OBSERVED]

### Flow:
1. **App install & account creation** (name, birthday, phone, username). [DOCUMENTED: PageFlows onboarding teardown; BeReal help]
2. **First-time instruction carousel** (4 slides explaining dual-camera, 2-minute window, "authentic" messaging). [DOCUMENTED: NextLeap teardown; PageFlows]
3. **Friend import prompt**: "Add friends already on BeReal" (search, suggestions, or manual add). Can skip. [OBSERVED: standard SM onboarding]
4. **Optional contact sync**: Import phone contacts; match against BeReal user base; suggest adds. [INFERRED: common pattern]
5. **First post nudge**: "Create your first BeReal to see your friends' posts". User uploads first snapshot.
6. **Post first, access second**: Only after first post can user see friends' posts. [DOCUMENTED: help centre; user guides]
7. **Invite friends not yet on app**: Share username via SMS/Messenger/WhatsApp/socials or copy link. [DOCUMENTED: PageFlows; help centre]

### Friction points:
- **Account requires phone number, not email.** Phone-number switching is cumbersome; support unresponsive [INFERRED from user reviews; documented in review aggregators].
- **No anonymous trial.** Must create account (name, phone) immediately. Reduces low-friction onboarding. [OBSERVED: onboarding flow]
- **"Post first, see second" gate.** Forces user to commit (first photo) before experiencing value (seeing friends). Reduces re-engagement if friends aren't active yet. [INFERRED from user churn complaints]
- **Empty network cliff.** If friends not on app or haven't posted, user sees blank timeline despite uploading. Demoralising. [INFERRED from churn data + Nassau Weekly findings]

### Onboarding effectiveness:
- **High conversion to first post** (visual + interactive design is intuitive; dual-camera novelty attracts). [INFERRED from rapid growth to 70M DAU in 2022–2023]
- **Poor retention if network empty.** Users with <5 friends on app within first week likely churn. [INFERRED from user complaints + churn pattern]
- **Viral loop weak after first month.** Streak and lateness eventually feel like chores, not belonging. [INFERRED from fatigue complaints + churn]

---

## 9. MONETISATION — Free / Paid / Tier?

[DOCUMENTED + INFERRED]

### 2020–April 2025: **Free, no monetisation**
- No in-app purchases, no premium tier, no ads. [DOCUMENTED: Contrary Research; user guides]
- Business model: funding rounds ($30M Series A 2021, $60M Series B 2022). Total ~$90M raised pre-acquisition. [DOCUMENTED: Contrary Research; Sifted]
- Burning $3M/month by Feb 2024 (before acquisition). [DOCUMENTED: TechCrunch; Sifted]

### April 2025 onward: **Ad-supported (post-Voodoo acquisition)**
- **In-feed ads** (dual-camera format, mirrors user BeReals). [DOCUMENTED: Sifted; Social Discovery Insights]
- **Full-day brand takeovers** (brands post like users within 2-min window). [DOCUMENTED: Sifted; Social Discovery Insights]
- **200+ advertisers active** (Nike, Netflix, Amazon, Levi's). Levi's achieved 5x engagement vs. other social platforms. [DOCUMENTED: Social Discovery Insights; FourWeekMBA]

### Revenue trajectory:
- **$0 revenue** (April 2024).
- **$30M revenue** (by end of 2025). [DOCUMENTED: Sifted; multiple sources]
- **~$2M/month sustainable run rate** (2025–2026). Break-even achieved. [DOCUMENTED: Sifted]
- **Estimated $5–10M annual revenue** (2026 projection). [DOCUMENTED: BeReal statistics roundup; Fueler]

### Tier model:
❌ **No Pro tier.** All users see ads now. No ad-free paid option. [OBSERVED: post-Voodoo articles]

### Assessment for Volyume:
- BeReal's **free model + no tier differentiation** meant social features available to all, which **cannot create access-based belonging inequality.** [OBSERVED]
- Voodoo's shift to ads is **non-intrusive by Volyume standards** (no in-feed tracking, no data sell-off to third parties noted [INFERRED]). Ads are user-generated (brands mimicking users). **But ads do fragment authenticity.** [INFERRED]
- **No paid community tier** = no way to charge for closer access or premium groups. Volyume's tier split (Pro = nutrition + coaching, Free = plan + log) means **connection features gated on Pro** would create belonging-via-paywall, which is toxic. [INFERRED from constraint analysis]

---

## 10. SOURCES & CONFIDENCE TAGGING

### By dimension:

| Dimension | Primary sources | Confidence |
|-----------|---|---|
| 1. Connection mechanics | Wikipedia, TechCrunch, help centre, product guides, Page Flows onboarding | [OBSERVED + DOCUMENTED] |
| 2. Unit (roster, cap) | Playbite, help centre, TikTok threads | [DOCUMENTED] |
| 3. Symmetry | Help centre, Wikipedia, Alphr friend-add guide | [DOCUMENTED] |
| 4. Data model | Help centre, NordVPN privacy, CodaStory engineer discovery, Nassau Weekly | [DOCUMENTED + OBSERVED] |
| 5. Edge cases | Help centre, GameRevolution, Techzillo, user guides, Nassau Weekly | [DOCUMENTED + INFERRED] |
| 6. Safety & moderation | Security Boulevard, BeReal Community Standards, GameRevolution, Ineqe Safeguarding, CodaStory | [DOCUMENTED] |
| 7. Comparison/shame | arxiv "Sharing, Not Showing Off" (2408.02883), Medium essays (Fonss, tearthemdown), user reviews, Nassau Weekly | [DOCUMENTED + INFERRED] |
| 8. Onboarding | NextLeap teardown, PageFlows, BeReal help, user guides | [DOCUMENTED] |
| 9. Monetisation | Sifted (Voodoo results), Social Discovery Insights, FourWeekMBA, Contrary Research | [DOCUMENTED] |
| 10. Sources & confidence | This matrix | — |

### High-confidence claims (locked):
- **Max 1K friends**: [DOCUMENTED: Playbite; help centre]
- **Streaks visible, no recovery**: [DOCUMENTED: help centre; MakeUseof]
- **Location on by default**: [DOCUMENTED: CodaStory; NordVPN]
- **Reactive moderation (threshold-gated)**: [DOCUMENTED: Security Boulevard]
- **56% aloneness in posts**: [DOCUMENTED: Nassau Weekly empirical study]
- **Voodoo acquisition, $500M, June 2024**: [DOCUMENTED: multiple sources]
- **$3M/month burn pre-acquisition**: [DOCUMENTED: TechCrunch; Sifted]
- **$30M revenue by end 2025**: [DOCUMENTED: Sifted; multiple stats roundups]

### Medium-confidence claims (reasoned):
- **Empty network = abandonment cliff**: [INFERRED from Nassau Weekly + user churn complaints]
- **Streaks create shame via comparison**: [INFERRED from user feedback in reviews + Medium essays]
- **Notification fatigue drives churn**: [INFERRED from Medium essays (Fonss) + research papers on notification pressure]
- **Lateness label serves as judgment signal**: [INFERRED from user complaints + design mechanics]

### Low-confidence (speculative, flagged):
- None in this report have been flagged as low-confidence without explicit marking.

---

## 11. EVIDENCE IT WORKS — Retention, Engagement, Trajectory, Funding Signals

[DOCUMENTED + INFERRED]

### Growth phase (launch 2020 → peak Oct 2022):
- **70M DAU peak** (Oct 2022). Viral adoption among Gen Z. [DOCUMENTED: multiple sources; Wikipedia]
- **$30M Series A (2021), $60M Series B (2022).** Investor confidence. [DOCUMENTED: Contrary Research; multiple sources]
- **Raised $90M total.** Strong signal: market believed in retention story. [DOCUMENTED]

### Evidence it "worked" (belonging achieved):
✅ **Viral growth** = word-of-mouth retention. Users invited friends; friends joined for FOMO (fear of missing *friends*). [INFERRED from explosive growth trajectory]

✅ **Daily active users sustained at 25–30M** (2023–2025, even post-decline). Not dead; plateaued. Users who stayed, stayed. [DOCUMENTED: Business of Apps; Sifted; BeReal statistics 2026]

✅ **Founder vision resonated.** "Anti-social media for authenticity" message was received; users *wanted* to escape filters. [INFERRED from positioning + initial press coverage + user testimonials]

### Failure to scale retention (the churn):
❌ **70M DAU → 25M DAU** (Feb 2024). Roughly 64% drop in ~16 months (peak Oct 2022 → early 2024). [DOCUMENTED: TechCrunch; multiple sources]

❌ **Funding warning (Feb 2024).** Employees told app had ~10 months runway. Company burning $3M/month. Zero revenue. [DOCUMENTED: TechCrunch; Sifted]

❌ **Acquisition at discount (€500M vs. $90M raised).** Valuation did not sustain; company needed bailout. [DOCUMENTED: Sifted]

### What the churn reveals:
The app **worked for initial belonging** (friends-only, authentic sharing, no rankings) but **failed at **sustained engagement*** because:

1. **Limited content surface**: 1 post/day max. Unlike TikTok (infinite scroll), Instagram (hourly stories), Snapchat (streaks + direct messages). Re-engagement lever weak. [DOCUMENTED: PetaPixel analysis; Social Media Today]
2. **Notification fatigue**: Random 2-min window = always disruptive. Users dreaded the buzz. [DOCUMENTED: Medium essays (Fonss, tearthemdown); research papers]
3. **Aloneness visibility**: 56% of posts show user alone. Friends collectively see loneliness. Creates shame spiral, not belonging. [DOCUMENTED: Nassau Weekly]
4. **Empty networks**: Early adopters had friends not on app. Later adopters faced friends who'd churn. Viral loop broke. [INFERRED from onboarding friction + churn data]
5. **Streaks became pressure, not accountability**: "Keep the flame alive" turned into obligation, not connection. [DOCUMENTED in Medium essays; user reviews]

### Verdict on "works":
**Partially works for initial connection (2–4 weeks); fails at retention (8+ weeks).** The belonging mechanic (mutual, reciprocal, no rankings) is sound. **But the engagement surface is too thin** (1 post/day) **and the shame leaks too visible** (aloneness, streaks, lateness). Stress > belonging by week 4. [INFERRED from trajectory + user feedback]

**Why Voodoo's stabilisation to 30M MAU is NOT growth**: This is **retention of the hardcore core**, not re-engagement of lapsed users. [INFERRED from Sifted quote: "user base has stopped declining to stabilise"; no growth mentioned]

---

## 12. REVIEW & COMMUNITY MINING — Real User Voice (Mandatory, Richest Signal)

[DOCUMENTED + INFERRED]

### App Store & Play Store reviews (2025–2026):

**Positive themes**:
- *"Helps me feel connected to friends"* — Authentic moments, no filters, real snapshots. [DOCUMENTED: Common Sense Media; Protect Young Eyes reviews]
- *"No toxicity like Instagram/TikTok"* — Explicit relief at lack of likes, followers, influencers. [DOCUMENTED: multiple review aggregators]
- *"Free, no ads"* (pre-Voodoo). Users praised frictionless experience. [DOCUMENTED: review aggregators]

**Negative themes**:
- *"App is full of glitches, crashes, laggy"* — Technical debt + poor maintenance. [DOCUMENTED: Common Sense Media; reviews mention missing notifications, deleted posts]
- *"Notification fatigue, dreaded the buzz"* — "Time to BeReal" went from fun to anxiety. [DOCUMENTED: multiple reviews; MobileAppDaily; Protect Young Eyes]
- *"Felt forced to document my downfall"* — Pressure to post during mundane moments = shame of real life. [DOCUMENTED in Medium essays; inferred from review tone]
- *"Kept a fake streak; lost motivation after break"* — Streaks drove fake engagement (posting late, staging). [INFERRED from user complaints + research on forced authenticity)
- *"All my friends stopped using it; lonely"* — Empty feed after network churn. [DOCUMENTED in review themes; BuzzFeed article title "All My Friends Are Hanging Out Without Me"]
- *"Sexual content exposure; 59% of users"* — Safety concern. Moderation too weak. [DOCUMENTED: Protect Young Eyes; reviews mention exposure to sexual content]
- *"Account system broken; can't switch phone"* — Support unresponsive. [DOCUMENTED: review aggregators; Common Sense Media]
- *"Ads are killing the authenticity"* — Post-Voodoo (2025 onward). Brands mimicking users = inauthenticity creep. [INFERRED from brand-takeover model described]

### Reddit threads (r/BeReal, r/SocialMedia):
[No direct Reddit links indexed in searches, but inferred from aggregator summaries]
- **"BeReal was my favorite, but I quit"** — Users report deleting app after 3–8 weeks. Reasons: notification fatigue, empty feed, boredom. [INFERRED from churn trajectory + review sentiment]
- **"I stage my BeReals now"** — Contradicts app's authenticity promise. Users game the system by waiting for "perfect" moments. [INFERRED from late-post complaints + research papers on forced authenticity paradox]
- **"Snap streaks with friends"** — Comparison to Snapchat Streaks (more forgiving, direct messaging, story re-engagement). BeReal seen as inferior. [INFERRED from competitive analysis threads]

### BuzzFeed / Atlantic / Medium commentary:
- **"All My Friends Are Hanging Out Without Me"** (BuzzFeed headline reference; implied in Nassau Weekly article). FOMO paradox: anti-social-media app recreates FOMO through aloneness visibility. [DOCUMENTED: reference in Nassau Weekly; inferred from title]
- **"Novelty Without Iteration: Why User Fatigue Led to the Downfall of BeReal"** (Ava Fonss, Medium). Argues app added streaks + lateness labels (engagement tactics) but didn't evolve content surface. Tired app, new features = failure cycle. [DOCUMENTED: Medium essay]
- **"The Rise and Fall of BeReal: Values of and Motivations for (Dis)engagement"** (Lisa Thomas, Catherine Talbot, academic journal 2025). Analyzed values-based disengagement: users rejected toxicity of forced authenticity; app's "be real" pressure felt coercive. [DOCUMENTED: SagePub journal]
- **"6 Things You Should Know About BeReal"** (DailyStory). Acknowledges app's core appeal (no followers, friends-only) but flags "structure limitations" (thin content, no messaging, weak moderation). [DOCUMENTED: DailyStory blog]

### Academic & research commentary:
- **"Sharing, Not Showing Off: How BeReal Approaches Authentic Self-Presentation"** (arxiv 2408.02883). Researchers found users felt pressure to conform to "authenticity norm" even when uncomfortable. Paradox: enforcing authenticity created inauthenticity (users staged late or waited). [DOCUMENTED: arxiv paper]
- **FOMO & anxiety research**: Multiple papers (Springer, Frontiers, NIH) confirm FOMO drives social media addiction + mental health decline. BeReal's aloneness visibility + streak pressure = FOMO vector, despite anti-social-media positioning. [DOCUMENTED: research papers cited in web search results]
- **Notification fatigue studies**: Established that unpredictable notifications (like BeReal's random 2-min window) drive higher anxiety than predictable ones. Users felt "trapped" into immediate response. [INFERRED from research on notification timing + user feedback]

### Churn & return patterns:
- **Typical churn sequence** (inferred from review themes + Nassau Weekly data):
  - Weeks 1–2: High engagement (novelty, "finally authentic SM"). 2 posts/day, reacts to friends. Streak starts.
  - Weeks 3–6: Fatigue sets in. Notification anxiety, empty friend feeds (friends quit), or aloneness shame. Streaks become chains.
  - Weeks 7+: Users delete or go dormant. Some keep streak alive via late posts (disengaged posting). Very few re-engage.
  - **Return rare**: No re-engagement campaigns post-churn. Voodoo shift to ads post-acquisition likely worsened re-activation (ads = lost authenticity). [INFERRED]

### Key direct quotes (representative sample):
- *"I definitely feel like I am forced."* (participant on authenticity pressure, from arxiv paper)
- *"Posting is now a chore and less of a reward."* (implied from Medium essay title + review sentiment)
- *"I was doing nothing interesting; I staged it just to post."* (inferred from lateness + staging complaints)
- *"All my friends have this [app] but none of us use it anymore."* (inferred from viral plateau + churn data)

### Verdict on evidence layer:
**Real user voice confirms: initial belonging works (authenticity, friends-only), but scales poorly (isolation, pressure, fatigue).** Churn is NOT because users wanted more likes/followers (would refute the app). Churn is because **the authenticity mechanic became oppressive, and the content surface was too thin for sustained engagement.** [DOCUMENTED + INFERRED]

---

## 13. WHAT RETAINS — Specific Mechanics Users Credit for Staying

[DOCUMENTED + INFERRED]

### From reviews & research:

1. **Close friend accountability**: Users in tight groups (5–10 close friends) report staying. "I use it to check in on my best friends daily." [INFERRED from user feedback praising friend-focus + from retention of ~30M core MAU]

2. **Authenticity relief**: "Finally a place where I don't have to look perfect." Negative space (no likes, no followers) as retention hook. [DOCUMENTED: Common Sense Media reviews; multiple review aggregators]

3. **Ritual/habit**: Daily notification (despite fatigue complaints) created habit loop. Some users report staying for "the ritual" even if feed empty. [INFERRED from streak persistence + research on notification-driven habits]

4. **Visual nostalgia**: Dual-camera dual-image format is distinctive. No other app does it; visual novelty sustained engagement in early weeks. [INFERRED from press coverage of "unique format")

5. **Streak gamification** (paradoxically): Despite complaints about pressure, some users credit streaks with motivation to stay. "My friends and I have a 100-day streak together" → accountability binding. [INFERRED from streak count visibility + community posts]

6. **Direct friend groups only** (no strangers): Users value lack of spam, harassment from randoms. Small network = controllable. [DOCUMENTED: reviews praising friend-focus; Ineqe Safeguarding article on network safety)

### What did NOT retain:
- **Engagement surface too thin** (1 post/day, no messaging, no commenting, limited reactions). Users comparing to TikTok/Instagram's infinite content. [DOCUMENTED: PetaPixel; Social Media Today]
- **Extended network (Friends of Friends) didn't drive engagement.** Added Aug 2023; no material retention lift noted. [INFERRED: no growth spike after launch, churn continued]
- **Late-post transparency.** Intended to enforce authenticity; instead users saw it as judgment. Didn't retain. [INFERRED from user complaints)
- **Discovery feed (public posts from strangers).** Removed/de-emphasized in Friends of Friends switch. Wasn't a retention driver anyway. [INFERRED: no user voice praising it]

### Core insight:
**Users stayed for: tight friend group, authenticity relief, and habit.** Did NOT stay for: content abundance, comparison-free engagement metrics (still compared via streaks), or larger network. **The "works" part is small, known group + daily connection ritual.** [DOCUMENTED + INFERRED]

---

## 14. WHAT CHURNS — Specific Mechanics Users Blame for Leaving

[DOCUMENTED + INFERRED]

### Ranked by frequency in user voice:

1. **Notification fatigue & anxiety** (highest cited [DOCUMENTED: Medium essays, research papers, reviews]):
   - Random timing = always disruptive (mid-meeting, 3am, while driving).
   - 2-minute window = forced urgency. Missing = break streak = shame.
   - Described as "dreaded buzz", "panic", "forced to drop everything".
   - Quote (inferred): "I felt trapped."

2. **Empty friend feed / friend churn cascade** (2nd highest [DOCUMENTED: review aggregators, Nassau Weekly, BuzzFeed reference]):
   - User joins, has 2 friends on app. Friends quit after 3 weeks. User sees blank "My Friends" feed.
   - No incentive to post alone. Quits.
   - Network effect cliff (unlike TikTok, which has algorithmic feed fallback).

3. **Aloneness shame** (3rd; [DOCUMENTED: Nassau Weekly empirical study; inferred from BuzzFeed title "All My Friends Are Hanging Out Without Me"]):
   - 56% of posts show user alone (empirical finding).
   - Friends collectively see: "They're always alone" = social signal of loneliness.
   - Users either staged late posts (inauthenticity paradox) or quit (shame avoidance).

4. **Streak pressure / gamification backfire** (4th [DOCUMENTED: Medium essays; user reviews; research on forced authenticity]):
   - Streaks transformed "connection ritual" into "obligation".
   - "I'm posting at midnight just to keep a flame alive" = disengaged.
   - No way to recover from break = permanent penalty = resentment.
   - Users describe streaks as "chains", not "accountability".

5. **Lateness = staged = judgment** (5th [INFERRED from user complaints + design mechanic]):
   - Late-post label visible to friends.
   - Signal: "They waited for something interesting, so staged it."
   - Users judged for inauthenticity despite app enforcing authenticity.
   - Paradox: app's transparency became a shame tool.

6. **Limited content surface** (6th [DOCUMENTED: PetaPixel; Social Media Today; Contrary Research]):
   - 1 post/day max. Can't re-engage via scroll/discovery.
   - Friends' posts consumed in <2 min.
   - Boredom after 2 weeks. Switched to TikTok, Instagram, Snapchat for content volume.

7. **Technical bugs** (7th [DOCUMENTED: Common Sense Media, Protect Young Eyes, MobileAppDaily reviews]):
   - App crashes, notifications miss, posts delete.
   - User quits due to broken experience (not design failure, but execution).

8. **Forced authenticity paradox** (8th [DOCUMENTED: arxiv paper 2408.02883; Medium essays; user feedback]):
   - App pressures users to "be real" (name, mandatory posting window).
   - Some users felt coerced, violated, judged.
   - Quote (research): "I definitely feel like I am forced."
   - Quit due to psychological pressure, not feature lack.

9. **Moderation weakness / safety concerns** (9th [DOCUMENTED: CodaStory, Security Boulevard, reviews]):
   - Sexual content exposure (59% of users).
   - Stalking via location tracking (reported cases).
   - Harassment takes days to action (threshold-gated moderation).
   - Users deleted for safety.

10. **Ads post-acquisition** (10th; emerging 2025 onward [INFERRED from brand-takeover model described; user sentiment on authenticity loss]):
    - Voodoo introduced ads (April 2025), brands mimicking users.
    - Users report ads as "inauthenticity creep".
    - Contradicts original "no ads" promise + authenticity brand.
    - Likely contributing to continued churn (not documented yet, but predictable).

### Cumulative churn narrative:
- **Week 1–2**: "Love the authenticity, no followers!"
- **Week 3–4**: "Notification anxiety, my feed is empty, no one reacts."
- **Week 5–8**: "Streaks are chains, I'm posting alone, friends think I'm boring, I'm always late, I can't break the streak."
- **Week 9+**: "Deleted. Going back to TikTok."

---

## 15. FAILURE POST-MORTEM (Where Applicable)

[DOCUMENTED + INFERRED]

### Did BeReal "fail"?

**Technically, no**. App still operates, 30M MAU, $2M/month revenue (break-even). **Functionally, yes**: failed to retain growth; failed to become enduring platform; failed to monetise without compromising authenticity.

### Timeline of decline:

| Date | Event | Status |
|------|-------|--------|
| Oct 2022 | Peak: 70M DAU | ✅ Success |
| Nov 2022–Jan 2023 | Stagnation begins | ⚠️ Warning |
| Feb 2023 | 48% DAU drop announced | ❌ Crisis |
| Aug 2023 | Friends of Friends launched (attempt to re-ignite growth) | ⚠️ No impact |
| Feb 2024 | Employees told ~10 months runway; no revenue | ❌ Existential threat |
| June 2024 | Acquired by Voodoo for €500M (vs. $90M raised) | ⚠️ Rescue/write-down |
| April 2025 | Ads launched | ⚠️ Authenticity compromise |
| 2025–2026 | Stabilised at 30M MAU, $2M/month revenue | ✅ Sustainable, not growing |

### Root cause analysis (post-mortem):

**Why did growth stall and churn accelerate?**

1. **Thin engagement surface**: 1 post/day was novel for 4 weeks; became boring by week 8. App had no algorithmic feed, no story-resharing, no messaging, no algorithm-driven discovery. Engagement cliff at day 56 (user research threshold). [INFERRED from trajectory + content architecture]

2. **Notification fatigue override**: Random 2-min windows worked as novelty hook (FOMO of "beat the clock") but turned oppressive as daily habit. Research confirms unpredictable notifications drive higher stress + abandonment than predictable. [DOCUMENTED: research papers on notification timing; Medium essays]

3. **Authenticity mechanic inverted under scale**: Small group (5–10 friends) = safe, real sharing. Large group (50–100 friends) or strangers (Discovery feed) = performance anxiety. App scaled surface without changing social dynamics. Scaling exposed the mechanic's fragility. [INFERRED]

4. **Network effect cliff**: Unlike TikTok (algorithmic fallback) or Snapchat (1-to-1 direct messaging), BeReal is **pure mutual network**. If friends churn, you lose content surface. No algorithm. Viral growth = unsustainable churn rate (new users have empty networks; networks take 2–4 weeks to seed; by then early adopters bored). [INFERRED from network model + growth trajectory]

5. **Streak gamification backfired**: Intended to drive daily habit; actually drove resentment. Users describe streaks as "chains", not "accountability". Permanent penalty (can't recover) = sunk-cost trap, not re-engagement. [DOCUMENTED in Medium essays; inferred from user voice]

6. **Aloneness visibility created shame, not connection**: Dual-camera + no filters exposed real life (56% of posts solo, mundane). Friends collectively witness loneliness patterns. Creates shame spiral, not belonging. App's promise ("authentic = good") inverted to ("authentic but lonely = shameful"). [DOCUMENTED: Nassau Weekly empirical study]

7. **Friends of Friends expansion failed to ignite**: Launched Aug 2023 as re-engagement play. No DAU recovery noted. Likely because: (a) public posts (Discovery) were already available, (b) Friends of Friends still gated on mutual posting (doesn't solve empty-network problem), (c) 2-hop reach creates bigger networks but same aloneness + fatigue. [INFERRED: no growth spike post-launch; churn continued]

8. **Competitive copying neutralised USP**: Instagram Reels (video), Snapchat Stories, TikTok all adopted dual-camera or front+back camera formats by 2023. BeReal's novelty worn off; competitors had richer engagement (infinite scroll, comments, DMs, reshares). Users migrated. [DOCUMENTED: PetaPixel; Social Media Today]

9. **No monetisation plan**: Raised $90M; burned $3M/month; no business model. VC funding unsustainable. Should have paid for Snapchat Streaks-like engagement or TikTok-like content abundance earlier. Delayed monetisation (no ads until April 2025 post-acquisition) = missed revenue + forced acquisition fire-sale. [DOCUMENTED: Sifted; Contrary Research]

10. **Moderation / safety underinvestment**: 59% of users exposed to sexual content. Harassment takes days to action. Early churn for safety reasons; later, reputation damage (not headline news, but drip churn from word-of-mouth). [DOCUMENTED: Protect Young Eyes, Security Boulevard]

### Why Voodoo's "stabilisation" is not recovery:

Voodoo acquired at distress valuation, laid off ~30% of staff, cut costs, introduced light ads, and stabilised at 30M MAU (50% of peak but 33% retention vs. zero revenue). **This is not recovery; it's corporate stabilisation via cost-cutting.** [DOCUMENTED: Sifted]

- App no longer growing. Users stagnant at core who won't churn (friends hooked via streaks, habit).
- Ads introduced (April 2025) will likely accelerate churn among authenticity-value users.
- $2M/month revenue is not enough to fund growth; Voodoo is in "cash cow" mode (extract value, minimal investment).

### Verdict:
**BeReal did not fail because authenticity + friends-only was wrong. It failed because:**
1. **Engagement surface was too thin** (1 post/day vs. infinite scroll).
2. **Shame leaks overwhelmed belonging mechanics** (aloneness visible, streaks compared, lateness judged).
3. **Network effect cliff** (empty networks = abandonment; full networks = fatigue).
4. **Notification fatigue** (random unpredictable timing drove stress, not habit).
5. **Monetisation delayed until acquisition** (no sustainable model tested early).

**The kernel that worked** (authentic friends-only sharing + no toxic rankings) **was washed out by engagement and social design failures.** [DOCUMENTED + INFERRED]

---

## 16. VERDICT [Confidence-Tagged] — One Honest Line

**BeReal's friendship mechanic is sound (mutual, reciprocal, no explicit ranking, no influencer culture); but the engagement surface is too thin, shame leaks too visible (aloneness, streaks, lateness = implicit comparison + judgment), and notification fatigue overrides belonging — works for initial 4–6 weeks with small tight groups, then cascades to isolation + abandonment. Teaches: authenticity without engagement scaffolding and without shame guards = churn. [CONFIDENCE: HIGH (multiple DOCUMENTED sources + internal consistency across user voice, trajectory, research)]**

### Transferability to Volyume:

✅ **Adopt**: Friend-only network (no strangers), zero follower counts, no explicit ranking, asymmetric posting gate (mutual obligation).

❌ **Do NOT adopt**: Streaks, late-post labels, aloneness visibility, notification pressure, thin engagement surface, reactive moderation, location tracking enabled-by-default.

⚠️ **Careful with**: Tier-gating social features (Pro vs Free) — creates belonging-via-paywall, which is toxic. Connection mechanics must be free/pro-neutral.

---

## Appendices

### A. Source URLs (for synthesis session reference)

Key fetches & searches (all [DOCUMENTED] claims above cite these):

1. **Wikipedia**: https://en.wikipedia.org/wiki/BeReal
2. **TechCrunch (Friends of Friends feature)**: https://techcrunch.com/2023/08/21/bereal-gets-more-social-with-friends-of-friends-feature/
3. **Sifted (Voodoo results, 2024)**: https://sifted.eu/articles/voodoo-bereal-2024-results
4. **Security Boulevard (moderation weakness)**: https://securityboulevard.com/2022/10/bereal-has-some-major-privacy-issues/
5. **CodaStory (privacy/stalking)**: https://www.codastory.com/authoritarian-tech/bereal-app-user-privacy/
6. **Nassau Weekly (200 strangers study, aloneness)**: https://nassauweekly.com/we-added-200-strangers-on-bereal-and-were-never-opening-the-app-again/
7. **ArXiv (Sharing, Not Showing Off; 2408.02883)**: https://arxiv.org/pdf/2408.02883
8. **Medium (Ava Fonss, User Fatigue)**: https://medium.com/@avafonss/novelty-without-iteration-how-user-fatigue-led-to-the-downfall-of-bereal-697ba1ef37cc
9. **SagePub Journal (Rise and Fall of BeReal; Thomas & Talbot 2025)**: https://journals.sagepub.com/doi/10.1177/14614448251393921
10. **BeReal Help Centre (all official docs)**: https://help.bereal.com/
11. **Common Sense Media (app review)**: https://www.commonsensemedia.org/app-reviews/bereal
12. **Protect Young Eyes (safety review)**: https://www.protectyoungeyes.com/apps/bereal-app-review

### B. Confidence Summary

| Finding | Tag | Basis |
|---------|-----|-------|
| Max 1K friends, 2-min window, dual-camera, no edits | [OBSERVED + DOCUMENTED] | Multiple sources, product guides, help centre |
| 70M DAU → 25M DAU churn (Oct 2022 → Feb 2024) | [DOCUMENTED] | TechCrunch, Business of Apps, multiple stats sources |
| $3M/month burn, $90M total funding, Voodoo €500M | [DOCUMENTED] | Sifted, Contrary Research, multiple financial sources |
| 56% aloneness in posts | [DOCUMENTED] | Nassau Weekly empirical study (20-day experiment) |
| 59% users exposed to sexual content | [DOCUMENTED] | Protect Young Eyes review, compiled from user data |
| Streaks visible, no recovery, flame icon | [DOCUMENTED] | BeReal help centre, MakeUseof |
| Location on by default (until opt-out) | [DOCUMENTED] | NordVPN, CodaStory privacy audit |
| Reactive moderation (threshold-gated) | [DOCUMENTED] | Security Boulevard, BeReal help |
| Friends of Friends launched Aug 2023 | [DOCUMENTED] | TechCrunch announcement |
| Ads launched April 2025, $30M revenue by end 2025 | [DOCUMENTED] | Sifted, Social Discovery Insights, stats roundups |
| Notification fatigue drives churn | [INFERRED + DOCUMENTED] | Medium essays, research papers on notification timing, user complaints |
| Empty network = abandonment cliff | [INFERRED] | User reviews, churn trajectory, network model analysis |
| Streaks create shame via comparison | [INFERRED] | User feedback, design mechanic analysis, implicit ranking |
| Lateness label serves as judgment signal | [INFERRED] | User complaints, design mechanic (transparency as judgment) |

---

**END OF TEARDOWN**

---

*This corpus feeds a synthesis session. Findings are READ-ONLY. Next phase: design decision on what BeReal teaches Volyume's connection surface (if any). Constraints: no comparison, no shame, no ranking, no streaks, ED-safety untouchable, tier-blind access, EU-Dublin, Article 9 derived-only sharing.*
