# Everfit Deep Teardown: Connection, Coaching & Community

**Category:** Coach-led community platform (B2B SaaS for fitness professionals + B2C client experience)  
**Research Date:** 2026-07-03  
**Confidence Tags:** [OBSERVED], [DOCUMENTED], [INFERRED]

---

## 1. THE CONNECTION/BELONGING MECHANIC

Everfit's connection model is **coach-centric and group-structured**. The mechanic flows:

1. **Coach creates a private community** (a Forum with explicit members, not open-network)
2. **Clients are invited** by their coach to join the forum
3. **Within the forum, clients post updates**, ask questions, share progress, and see others' activity
4. **Challenges are layered on top** — coach launches time-bound fitness challenges (e.g. "8-week fat loss challenge") with specific metrics (weight loss %, total volume lifted, steps completed)
5. **Leaderboards rank within the challenge** — clients see ranked results tied to the challenge metric, updated in real-time [OBSERVED from help documentation]
6. **Accountability loop closes** — coach and peers see each client's logged workout/habit data, progress photos, and performance against challenge goals

This is **not social-first** (no feed algorithm, no discovery, no follow/unfollow). It is **accountability-first and coach-mediated**. Belonging emerges from:
- Shared challenge/goal with a cohort
- Visibility of peer effort (leaderboard ranking)
- Direct coach feedback and peer encouragement in forums
- Gamification via badges/awards for milestones

---

## 2. THE UNIT

**Unit type:** Private coaching group (distinct from open social networks).

**Size:** Typical range ~5–100 clients per coach [INFERRED from coaching business models]; Everfit supports team models with 46+ coaches managing 800+ clients in a single account (Redefining Strength case study) [DOCUMENTED].

**Structure:**
- **Per-coach private forums** — each coach can create multiple forums for different cohorts (e.g. one for CrossFit clients, one for online remote clients)
- **Team account model** — large coaching businesses can have multiple coaches within one Everfit workspace, sharing client management, programming, and community infrastructure
- **Leaderboard scope** — leaderboards are **per-challenge, within a forum**, not global across all Everfit users

**Membership model:** Closed / invite-only. Clients are added to forums by their coach; there is no public marketplace or directory of joinable communities [INFERRED from help documentation showing coach-managed invites].

---

## 3. SYMMETRIC OR ASYMMETRIC

**Asymmetric**, with two tiers:

- **Coach:** Creates forums, programmes, challenges; can see all client data (workouts, metrics, photos, habits); broadcasts messages; judges/moderates forum activity
- **Client:** Posts to forum, participates in challenges, sees own metrics and peer rankings in leaderboards, receives coach feedback

**Ranking axis (core finding):** Leaderboards are **public within the forum** — clients see where they rank against cohort members on the selected metric (e.g. weight lost, total volume, steps). This creates **comparison visibility** [DOCUMENTED from leaderboards help article]. However, leaderboards are scoped to the coach's group, not global, which limits stranger-comparison shame.

**Visibility rules [INFERRED]:**
- Coach sees all client data
- Clients see their own data in full detail
- Clients see peer rankings (leaderboard positions) and some peer progress (posted in forums)
- No asymmetric following (you cannot follow one person while they ignore you)
- Forums are explicitly private to invited members

---

## 4. DATA MODEL — WHAT IS SHARED, WHAT IS WITHHELD

**Shared in forums / visible to cohort:**

1. **Workout completion** — logged set count, reps, weight (from coach's programming)
2. **Habits** — daily habit ticks (e.g. "stretch completed", "hydration logged")
3. **Progress photos** — front/side/back photos with weight and body-fat % displayed [DOCUMENTED from progress photos help article]
4. **Custom posts** — text, photos, videos uploaded by clients to the forum feed
5. **Challenge metrics** — weight loss %, total volume lifted, steps completed (appears on leaderboards) [DOCUMENTED]
6. **Milestone badges/awards** — "Personal record achieved", "7-day streak" [OBSERVED from case study]

**Withheld (coach-only):**

- Injury/limitation notes [DOCUMENTED: "This is not shared with your client"]
- Detailed form responses (onboarding questionnaires, body scans beyond what client posts)
- Other clients' injury data

**Privacy gaps [INFERRED from policy review]:**

- The privacy policy states: "Client information may be shared within Everfit forums or group chats with other Clients and with Trainers other than the Client's designated principal Trainer" [DOCUMENTED]
- **No explicit field-level restrictions on progress photos or body metrics in forums** — responsibility for what is posted falls on the user
- Forum posts are cached/archived; once shared, removal is not guaranteed [DOCUMENTED: "copies of your User Contributions may remain viewable in cached and archived pages"]
- Progress photos include weight and body-fat % displayed prominently, shared in forums; no field-masking or opt-out for sensitive metrics [INFERRED from photo help + forum design]

**Confidence on field visibility:**
- [OBSERVED] Leaderboards show ranked position + metric value
- [DOCUMENTED] Progress photos display weight/BF%
- [INFERRED] Body metrics graph accessible to other cohort members in forums (inferred from "the community feature works like a private social feed where clients can share updates")

---

## 5. STATES & EDGE CASES [OBSERVED / INFERRED]

**Happy path:**
- Coach creates forum → Clients invited → Clients join forum → Clients post/log workouts → Leaderboard updates → Coach + peers see results

**Edge states observed in help docs:**

1. **Invite not accepted** — Help docs show "Public Client Invite Link" [DOCUMENTED] suggesting clients can decline or ignore invites
2. **Empty forum** — Coach creates forum but no clients join yet; leaderboard is empty [INFERRED]
3. **Challenge expired** — Leaderboard is time-bound (start/end date); after end date, it's read-only [INFERRED from "determining the start and end date"]
4. **Offline client** — No explicit offline-first mention in Everfit docs; assumed cloud-sync only [INFERRED]
5. **Client leaves forum** — Help docs do not document a "leave forum" action; assumed coach can remove clients, but no self-removal documented [INFERRED]
6. **Client disables notifications** — Everfit allows "Customize forum notifications" [DOCUMENTED] (mute, opt-out)
7. **Blocked/reported** — No blocking or reporting mechanisms documented in help centre; no mention of user moderation tools [INFERRED absence]

**Critical gap:** The help centre does not document how a client exits a community, what happens if a client wants to hide/leave a challenge, or how disputes/harassment are handled.

---

## 6. SAFETY / MODERATION SCAFFOLDING

**Public documentation:**

Everfit's help centre does **NOT** include articles on:
- Blocking other users
- Reporting inappropriate posts or harassment
- Moderation policies
- Community guidelines
- Identity verification for peers
- Privacy controls for sensitive metrics in forums
- Removing posted photos/data

**Forum management tools (documented):**

- Coaches can manage "forum names, descriptions, cover photos, notifications, and member lists" [DOCUMENTED]
- Coaches can abbreviate last names or hide member lists [DOCUMENTED]
- Coaches are responsible for protecting client data [DOCUMENTED in privacy policy]

**Inferred safety model:**

- Safety is **coach-gatekept**, not peer-moderated
- Large coaching businesses (46+ coaches) lack documented peer-review or trust/safety features beyond coach oversight
- No explicit reporting pathway for peer-on-peer harassment within forums
- No documented blocking mechanism for clients who feel unsafe around specific peers

**RISK FINDING:** For groups with 100+ members or public-facing leaderboards, the absence of peer reporting, blocking, or moderation tools is a significant gap. Everfit relies entirely on coach discretion.

---

## 7. COMPARISON / SHAME AUDIT — ANTI-PATTERN MAPPING

**ANTI-PATTERN FOUND: Leaderboards (primary ranking mechanic).**

**How they work:**

- Coach sets a leaderboard metric: weight loss (total or %), total volume lifted, cumulative volume, total steps, tasks completed, reps, or "push-up challenges" [DOCUMENTED]
- Clients are ranked 1st, 2nd, 3rd… within their cohort based on the metric
- Leaderboards display in forums and are updated in real-time [DOCUMENTED: "AI instantly detecting body position and automatically syncing results to leaderboards"]
- Leaderboards have a start/end date; coaches "motivate clients competitively as they accomplish your fitness challenges" [DOCUMENTED]

**Shame/comparison risks:**

1. **Public ranking within cohort** — Clients see exact rankings; last place is visible [DOCUMENTED]
2. **Body-metric ranking** — Weight loss leaderboards explicitly rank clients by body change; body metrics (weight, BF%) are the metric itself [DOCUMENTED]
3. **Performance leaderboards** — While strength (volume) and activity (steps) are less body-adjacent, they still create public "winners" and "losers"
4. **Comparison incentive** — Marketing materials state "Competition is the key to client motivation!" and "Compete, Commit, Repeat" [DOCUMENTED from blog]
5. **Streak pressure** — Step-based leaderboards can create daily streak anxiety [INFERRED from leaderboard design]

**What can be stripped (non-toxic kernel):**

- Private group accountability (coach + cohort sees effort, not ranking)
- Milestone badges (personal, not comparative)
- Habit streaks (without public leaderboard)
- Shared goal progress (without rank numbers)

**Comparison: Everfit explicitly uses ranking and leaderboards as a retention lever.** Unlike VOLYUME (which has no leaderboards, no public ranking, no comparison), Everfit's core community mechanic depends on visible comparison. This is diametrically opposite to VOLYUME's founding constraint.

**Confidence:** [DOCUMENTED] — Help centre and marketing materials explicitly describe leaderboards as competitive ranking tools.

---

## 8. ONBOARDING TO THE SOCIAL FEATURE

**Coach side:**
1. Coach creates forum via "Create A Forum" dashboard [DOCUMENTED]
2. Coach customizes forum name, description, privacy, member list visibility [DOCUMENTED]
3. Coach uses "Public Client Invite Link" to invite clients via email/SMS/share [DOCUMENTED]
4. Coach sets initial challenge with leaderboard metrics, dates, and rules [DOCUMENTED]

**Client side:**
1. Coach sends invite link or adds client to forum
2. Client logs into app → sees "Welcome" onboarding screen → prompted to answer custom onboarding form (coach-authored)
3. Client fills form → sees 4 main tabs: Today (workouts), Coaching (schedule), Inbox (messages), You (profile/metrics)
4. Client can browse forum → see posted workouts, photos, challenge leaderboards
5. Client first encounter with leaderboard is **automatic** — no opt-in gate; leaderboards appear as part of challenge structure

**Friction:** Onboarding to forums is **not framed as a choice**; the coach controls whether forums are enabled, and clients see them by default if the coach has set up challenges [INFERRED].

**No consent gate documented** for clients before being added to leaderboards [INFERRED]. Clients cannot opt out of a challenge or leaderboard once the coach launches it within their forum.

---

## 9. MONETIZATION

**Model:** Subscription SaaS (B2B → B2C passthrough)

- **Coaches pay Everfit** a monthly subscription (tiered by client count, features)
- **Community/leaderboard features** are included in mid-to-high-tier plans (not entry-level) [INFERRED from "Advanced Features"]
- **Clients access for free** (cost embedded in coach's subscription; coach may charge clients separately)

**Free tier:** Coaches can train first 5 clients free; forums/leaderboards likely gated to paid coaches [INFERRED].

**Pricing:** Everfit doesn't publish exact pricing on the website, but mentions "additional features can increase costs" and "add-ons like advanced automation and higher client limits stacking up" [DOCUMENTED from reviews].

**Forum/leaderboard monetization:** **Not a separate paid feature** — appears bundled into mid-tier coaching plans; the full-suite argument ("all-in-one platform") is a key sales lever [DOCUMENTED from case study].

---

## 10. SOURCES SUMMARY (DIMENSIONS 1–9)

| Claim | Source | Type |
|-------|--------|------|
| Leaderboards rank clients by weight loss, volume, steps | https://help.everfit.io/en/articles/4854106-introducing-leaderboards | [DOCUMENTED] |
| "Competition is the key to client motivation" | https://blog.everfit.io/run-fitness-challenge-with-forums-and-leaderboard | [DOCUMENTED] |
| Forums are private, invite-only | https://help.everfit.io/en/articles/5116334-create-a-forum | [DOCUMENTED] |
| Progress photos display weight/BF% | https://help.everfit.io/en/articles/2836175-progress-photos | [DOCUMENTED] |
| Privacy policy: client data shared in forums | https://everfit.io/privacy/ | [DOCUMENTED] |
| Coach-led forums, client onboarding via custom forms | https://help.everfit.io/en/articles/5555389-onboarding-walkthrough-for-clients | [DOCUMENTED] |
| 200,000+ fitness coaches using Everfit | https://www.getlatka.com/companies/everfit.io | [DOCUMENTED] |
| Redefining Strength grew 50→800 clients; retention 5%→90% | https://everfit.io/case-studies/redefining-strength-grows-from-50-to-800-clients-with-everfit/ | [DOCUMENTED] |
| Community features mentioned in marketing | https://everfit.io/ | [OBSERVED] |
| Leaderboards tied to community forums for accountability | https://blog.everfit.io/forum-and-leaderboards-is-now-available-on-both-web-and-mobile | [DOCUMENTED] |

---

# EVIDENCE IT ACTUALLY WORKS (DIMENSIONS 11–16)

---

## 11. EVIDENCE IT WORKS — RETENTION / ENGAGEMENT / TRAJECTORY

**Business trajectory: GROWING** [DOCUMENTED]

- **Founded:** 2019 (seed funding $900k via convertible note, October 2019)
- **Revenue:** $8.4M ARR in 2025 (3.5× growth over ~5 years)
- **Valuation:** $25.1M (as of latest disclosure)
- **User base:** 200,000+ fitness coaches in 190+ countries
- **Funding:** Bootstrapped after seed; no venture capital raised; revenue-reinvested
- **Growth phase:** Stable, profitable, scaling; not dead, not in decline

**Case study evidence:**

Redefining Strength (coaching business) [DOCUMENTED case study]:
- **Before Everfit:** 50 clients, 5% retention (95% annual churn)
- **After Everfit:** 800 clients, 90% retention
- **Time frame:** ~3 years (inferred from case study date)
- **Credits:** Platform consolidation (no tool-switching), forums + leaderboards for community, tiered coaching (one-to-one and group), team dashboard

**However:** The case study attributes growth to **platform consolidation** ("eliminated the need for multiple software tools", "clients could switch service tiers without leaving the platform") **NOT specifically to leaderboards or challenges**. The community features are mentioned as supporting growth, but are not isolated as the retention driver.

**Public engagement metrics:** NONE found. Everfit does not publish:
- DAU/MAU ratios
- Forum posting frequency
- Leaderboard participation rates
- Challenge completion rates
- Retention curves by feature

**Inference:** Everfit's platform is **working for coaches as a business tool** (they renew, scale clients, make more revenue). Whether the leaderboard/community feature specifically drives **client retention** is unknown.

---

## 12. REVIEW & COMMUNITY MINING — REAL USER VOICE

**Sources:** Capterra (verified reviews), GetApp, SoftwareAdvice, and coach testimonials from case studies.

### What Users Praise (Coaching / Community / Connection)

**On coaching relationships:**
- "Communication and progress tracking are also convenient, which makes remote coaching more structured and efficient." (Urfan I., Capterra)
- "From accessing workouts to tracking progress and staying connected, it creates a smoother experience." (Capterra)
- "It helps us deliver a more complete coaching experience and keeps clients engaged, motivated, and accountable week to week." (coach review, Capterra)

**On community/forums:**
- "The community forum and inbox keep coach-client communication and group engagement in the same ecosystem." (Capterra)
- "My clients find it easy to use and it's helped me to build a great community with the forum." (Capterra review)
- "The ability to change terminology from 'client' to 'athlete,' which better reflects my coaching style and audience." (Stevie M., CEO, GetApp)

**On consolidation (all-in-one):**
- "Perfect, works brilliantly for my coaching business which at the moment is for remote athletes in Olympic lifting and S&C with bespoke programmes." (Scott B., Coach, GetApp)
- Users consistently cite the reduction in tool switching as a retention driver for their own coaching business.

**On support:**
- "Customer support is also fantastic, with responses usually within a few hours." (Katie W., Coach, GetApp)
- "The customer support is fantastic, with responses within a few hours." (Quinsea P., LCSW/Therapist, GetApp)

### What Users Dislike (Bugs, UX, Pricing)

**Critical bugs (ongoing since at least 2023):**
- "The app is buggy, with the messenger function being problematic — messages get stuck or take 30 seconds to appear as sent." (multiple reviews, Capterra)
- "Audio messages cap at 60 seconds per clip, so anything longer has to be broken up." (Capterra review)
- "Excessive clicks required to complete workouts — clients must click to start each section, mark exercises, end sections, move to next section." (inferred from UX complaints, GetApp)

**Pricing concerns:**
- "Pricing feels layered as your business grows, with add-ons like advanced automation and higher client limits stacking up quickly." (SoftwareAdvice)
- "Expensive with costs adding up for features like autoflow, resource collections, personalized meal plans." (Capterra)

**Feature gaps:**
- "Limited messaging features: no ability to react to client messages, voice memos limited to 1 minute without transcription, weak search functionality." (SoftwareAdvice)
- "Mobile app lacks certain desktop capabilities; would like more parity between platforms." (multiple, Capterra)
- "Food tracking within Everfit doesn't recognize most scanned items." (Capterra)

**NOTABLY ABSENT:** No user reviews mention leaderboards as a reason to stay, leave, or complain. Leaderboards are not highlighted as a problem (no shame complaints), nor as a solution (no accountability stories). This suggests leaderboards are **present but not salient to user experience**.

---

## 13. WHAT RETAINS — SPECIFIC MECHANICS USERS CREDIT

**From reviews and case studies, users stay because of:**

1. **Coach relationship** — Direct, responsive communication with their coach; personalised programming [most cited in reviews]
2. **Platform consolidation** — "Everything in one app" eliminates tool-switching, reducing friction [Redefining Strength case study, multiple reviews]
3. **Tiered coaching options** — Ability to move from one-on-one to group coaching without leaving the platform; meets different budgets [Redefining Strength case study]
4. **Effortless logging** — Clean workout logging, habit tracking, progress photos without external tools [multiple reviews]
5. **Accountability within cohort** — Knowing the coach and peers see their effort; group cohesion around shared goals [case study, Capterra quotes]
6. **Milestone recognition** — Badges for PRs, streaks, awards (psychologically reinforcing) [case study mentions "trophies", "data analytics"]

**NOT CITED as a retention driver:**
- Leaderboard rankings
- Competing against peers
- Public performance metrics
- Comparison visibility

**Confidence:** [DOCUMENTED] from reviews; [INFERRED] from case study analysis (absence of leaderboard-specific credit).

---

## 14. WHAT CHURNS — MECHANICS USERS BLAME FOR LEAVING

**From reviews, users leave or consider leaving due to:**

1. **Messaging bugs** — "Stuck" messages, slow delivery (30s+ latency), cannot rely on push notifications for client communication. This is **critical** because coach-client messaging is the core value prop [multiple sources, ongoing since 2023]
2. **Excessive friction in logging** — Too many clicks per workout; clients get fatigued [Capterra]
3. **Pricing opacity and growth costs** — Add-on fees for features that feel foundational (automation, higher client limits, food tracking); price creep as business scales [multiple reviews]
4. **Limited feature parity** — Mobile app missing features present on web; frustrating for clients who log on-the-go [Capterra]
5. **Poor integrations** — Food barcode recognition doesn't work; steps tracking integrations weak [reviews]
6. **Lack of global leaderboard** — One user noted: "Lack of a global leaderboard feature for clients who follow the same program, particularly when coaching CrossFit." [Capterra] — Suggests *some* coaches want more comparison visibility, not less.

**NOT CITED as churn reasons:**
- Leaderboard shame or comparison anxiety
- Feeling judged by peers
- Leaderboards making people quit

**Confidence:** [DOCUMENTED] from reviews; [INFERRED] — absence of shame-churn signals may indicate either (a) leaderboards are scoped small enough to avoid harm, or (b) people who dislike comparison self-select out of Everfit before joining.

---

## 15. FAILURE POST-MORTEM (WHERE APPLICABLE)

**Is Everfit's social feature failing? No.** The app is growing, coaches are renewing, clients are staying.

**Did the community feature ever fail or get removed? Unknown.** No evidence of rollback or deprecation.

**Has Everfit been acquired or shut down? No.** Bootstrapped, independent, actively developing (March 2026 feature releases documented).

**Has the community feature stalled? Unclear.** The last major feature release was "March 2026: Responses comparison, AI Push-up Challenge" [DOCUMENTED blog]. No evidence of abandonment, but also no high-cadence innovation in forums/leaderboards post-2024.

**Inference:** Everfit's community/leaderboard features are **not a retention driver strong enough to warrant heavy investment**, but they are **functional and present**. Coaches use them; clients tolerate them. The feature is in "maintenance mode" — solving for coaches' business needs (community-building) rather than optimising for client experience (accountability, comparison).

---

## 16. VERDICT

**Tagline:** "Works as a coach-business tool; community leaderboards present but not evidenced as a retention driver. Scaled to $8.4M ARR by consolidating coaching workflows, not by winning at comparison-based engagement."

**Detailed verdict:**

1. **Evidence it works:** [DOCUMENTED] Everfit is growing (200,000 coaches, $8.4M ARR, profitable). One case study shows retention jump 5%→90%, but **attributes growth to platform consolidation and coach relationship, not leaderboards** [DOCUMENTED].

2. **What's strong:** All-in-one platform reducing friction; responsive coach support; clean UX for logging workouts/habits; tiered coaching model enabling different client segments; private group accountability without comparison toxicity (small cohorts).

3. **What's weak on retention:** No published evidence that leaderboards specifically increase client retention. No DAU/MAU data. Messaging bugs undermine daily engagement. Food tracking gaps limit nutrition coaching. Mobile/web parity issues.

4. **Leaderboards: The anti-pattern finding:** Everfit uses visible public ranking within cohorts as a core engagement lever. This is **fundamentally misaligned with VOLYUME's constraint** ("no leaderboards, no shame, no comparison"). The mechanic works for coaches (they like running challenges), but the evidence that it works for *clients* is **absence of complaint** (no churn signals), not presence of praise (no "I stayed for the leaderboard" quotes).

5. **Transferable kernel (if removing toxicity):** Private group accountability, coach-led challenges, milestone badges, habit streaks, progress-photo sharing *without ranking*, custom goals aligned to user choice. Strip the leaderboard; keep the group.

6. **Risk for VOLYUME adoption:** Any leaderboard-inspired feature would **violate the founding constraint** (no comparison, no shame, no feed). The case for "small cohorts make leaderboards safe" is plausible but unproven in Everfit's own data.

---

### CONFIDENCE SUMMARY

| Finding | Confidence | Type |
|---------|-----------|------|
| Everfit has 200,000+ coaches; $8.4M ARR; founded 2019, bootstrapped | [HIGH] [DOCUMENTED] | Business |
| Redefining Strength case study: 5%→90% retention | [HIGH] [DOCUMENTED] | Outcome |
| Leaderboards are core feature; rank by weight loss, volume, steps | [HIGH] [DOCUMENTED] | Feature |
| Leaderboards enable comparison/ranking within cohort | [HIGH] [DOCUMENTED] | Design |
| User reviews do NOT credit leaderboards for retention | [MEDIUM] [DOCUMENTED] | Absence signal |
| Messaging bugs are an ongoing churn risk | [HIGH] [DOCUMENTED] | UX problem |
| No public DAU/MAU, churn, or per-feature engagement data | [HIGH] [INFERRED] | Data gap |
| Platform consolidation is the primary retention lever (not leaderboards) | [MEDIUM] [INFERRED] | Analysis |
| Leaderboards work for coaches' business, unclear for client retention | [MEDIUM] [DOCUMENTED + INFERRED] | Verdict |

---

## APPENDIX: KEY SOURCES

- [Everfit Help: Leaderboards](https://help.everfit.io/en/articles/4854106-introducing-leaderboards)
- [Everfit Blog: Run Fitness Challenge With Forums and Leaderboard](https://blog.everfit.io/run-fitness-challenge-with-forums-and-leaderboard)
- [Redefining Strength Case Study](https://everfit.io/case-studies/redefining-strength-grows-from-50-to-800-clients-with-everfit/)
- [Everfit Privacy Policy](https://everfit.io/privacy/)
- [Capterra Reviews](https://www.capterra.com/p/202837/Everfit/reviews/)
- [GetApp Reviews](https://www.getapp.com/recreation-wellness-software/a/everfit/reviews/)
- [Everfit Financials: $8.4M ARR 2025](https://www.getlatka.com/companies/everfit.io)
- [Everfit Progress Photos Help](https://help.everfit.io/en/articles/2836175-progress-photos)
- [Everfit Onboarding Help](https://help.everfit.io/en/articles/5555389-onboarding-walkthrough-for-clients)

---

## RESEARCH NOTES FOR SYNTHESIS SESSION

**Recommend flagging to founder decision:**

1. **Leaderboard anti-pattern is explicit and documented.** Everfit intentionally uses visible ranking as a motivation tool. This directly violates VOLYUME's founding constraint. A design phase exploring "small-cohort leaderboards" would need founder approval to justify the constraint break.

2. **Evidence that leaderboards drive client retention is absent.** Case studies credit platform consolidation, coach relationship, all-in-one convenience — not competition. This is important: Everfit *has* leaderboards, but their own data doesn't prove they're the retention driver.

3. **Smaller cohort size (coach + ~5–100 clients) may reduce shame risk** vs. global social feeds, but this is not evidence-based. No Everfit data compares small vs. large cohort leaderboard efficacy.

4. **Messaging reliability is critical.** Everfit's ongoing messaging bugs (stuck messages, 30s+ latency) undermine the coach-client relationship, which IS proven as a retention driver. If VOLYUME adds any social feature, reliability of core coaching comms must come first.

5. **Forum feature is under-promoted in marketing and reviews.** Leaderboards are pushed harder than forums in Everfit's narrative; user reviews cite coaching relationship over community. This suggests community-as-retention is a hypothesis, not proven.

**Red flags for VOLYUME:**

- Progress photos + body metrics in shared spaces without masking = ED risk if user base includes people with disordered eating concerns
- No moderation tools documented = safety risk at scale
- Leaderboards as weight-loss ranking = direct harm vector for ED population
- Privacy model (client data shared in forums by default) misaligns with Article 9 strict consent model

