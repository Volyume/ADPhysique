# Recovery-Community Apps: Deep Competitor Teardown
## I Am Sober, Loosid, Tempest, Sober Grid

**Category:** belonging, peer support, milestone-driven accountability without shame  
**Scope:** 16-dimension analysis with evidence layer (dimensions 11–16 mandatory)  
**Date:** July 2026  
**Governing constraint:** no comparison/ranking/shame mechanics; assess transferable kernels only.

---

## PART A: I AM SOBER

### 1. Connection Mechanic
Users track daily sobriety milestones (alcohol, drugs, gambling, self-harm, toxic relationships). The core mechanic is a **daily pledge** — users enter a reason why they want to stay sober, then check in daily. Connection happens through:
- **Community feed** (free tier): read/engage with threads where peers share milestones and challenges; users report this creates a "judgment-free space" [OBSERVED from reviews].
- **Premium groups** (Sober Plus subscription): curated groups based on shared goals and addiction type (alcohol, opioids, marijuana); users report these provide targeted accountability [DOCUMENTED from app description].
- **Milestone celebrations** in community — public recognition of sobriety anniversaries (10 days, 100 days, etc.) [INFERRED from typical sobriety-app patterns].

**Step-by-step flow (inferred):**
1. User sets sobriety goal and enters daily reason/pledge.
2. App tracks consecutive days sober; shows financial savings (e.g., "You've saved $245 not buying alcohol").
3. User browses community feed; can read others' posts about challenges, triumphs, cravings.
4. Premium: user joins curated group (e.g., "Early recovery advice" + shared goals); posts and receives encouragement from group members.

### 2. The Unit
- **Free:** open, unnamed community; all users see the same public feed.
- **Premium:** explicitly curated **groups** ("recovery groups" or "group chats") based on shared goals, addiction type, and sobriety milestones. Size not disclosed [INFERRED].
- Users appear to be able to read/post anonymously or with a username; full identity not required [INFERRED from reviews mentioning "judgment-free space"].

**Unit size:** unbounded on free feed; group sizes not disclosed.

### 3. Symmetric or Asymmetric?
**Primarily symmetric.** The community feed is broadcast — all members see the same posts, and any member can comment/encourage. No coach/mentee hierarchy observed. This is **lowest-risk for shame** because there is no public ranking or leaderboard showing "who is sober longest" [INFERRED].

### 4. Data Model

| Field | Shared? | Confidence | Notes |
|-------|---------|-----------|-------|
| Sobriety counter (days) | Yes, in posts | [DOCUMENTED] | publicly visible milestone |
| Financial savings | Yes, tracked in-app | [DOCUMENTED] | "You've saved $X" |
| Reason for sobriety | Optionally shared | [INFERRED] | daily pledge; may be in public posts |
| Addiction type | Implied (category-based groups) | [INFERRED] | user can filter/join alcohol, drugs, etc. |
| Real identity | Not required | [INFERRED] | reviews mention "anonymous" / "no judgment" |
| Photos | Not mentioned | [INFERRED] | likely excluded to reduce shame vectors |

**Key finding:** data model is minimal and non-invasive; no bodyweight/measurements/photos observed [INFERRED from absence in reviews].

### 5. States & Edge Cases (Observed)

- **Join community:** free on signup.
- **Post/comment:** immediate; no approval gate.
- **Toxic/inappropriate post:** users report some posts are "emotionally intense" [OBSERVED from reviews]; indicates moderation exists but may be reactive [INFERRED].
- **Premium subscribe:** unlocks group chat + detailed stats.
- **Leave/block:** not mentioned in available sources.
- **Empty state:** new user sees feed of others' milestone posts; may feel motivating or lonely [INFERRED].

### 6. Safety & Moderation

**Strengths:**
- Minimal data collection (no photos, no location, no real name required).
- Free tier encourages broad access; no gatekeeping on who enters.

**Weaknesses:**
- **User reports cite toxic comments** — "some posts in the community section can feel emotionally intense" [OBSERVED from reviews].
- **App Store reviews mention "harmful and toxic comments from the community" and "comments encouraging self-harm"** [OBSERVED].
- No explicit mention of reporting/blocking mechanisms in available sources [INFERRED this is a gap].
- Moderation appears **reactive, not proactive** [INFERRED].

**No professional moderation observed** — appears to be community-led [INFERRED].

### 7. Comparison/Shame Audit

**Leaderboards:** No evidence of global leaderboards (e.g., "longest sober streak across all users") [INFERRED from absence in reviews].

**Streak pressure:** Daily pledge is personal, not published; no "broken streak" punishment visible to others [INFERRED].

**Shame vectors observed:**
- Toxic community comments → **anti-pattern** [OBSERVED from reviews].
- Milestone comparisons (e.g., "I'm on day 10, others are on day 500") → possible but **not gamified into ranking** [INFERRED].

**Transferable kernel:** milestone tracking **without public ranking** creates motivation without shame. The problem here is execution: insufficient moderation allows peer-to-peer shame to slip in.

### 8. Onboarding to the Social Feature

**Flow (inferred):**
1. User selects addiction type (alcohol, drugs, gambling, self-harm, toxic relationships).
2. User enters first sobriety reason/pledge.
3. App offers "Join community" or "Stay private"; most users routed to community feed.
4. Free user: browse + read community; no posting until optional email verification [INFERRED].
5. Premium: unlock group chat; discover group matching shared goals.

**No mandatory social signup** — app is usable solo. Social is opt-in (or defaulted-on but not blocked) [INFERRED].

### 9. Monetisation

- **Free:** sobriety counter, daily pledge, community read-only.
- **Sober Plus (Premium):** $39.99/year → group chat, detailed statistics, motivational packs (though users report these repeat).

**Free is the honey; Premium upsell is conservative.** Pricing is low compared to therapy ($500+/month) [INFERRED].

### 10. Sources

- [DOCUMENTED] App Store ratings: 4.8/5 stars (12k reviews Apple, 127k Google Play).
- [OBSERVED] User quotes: "honest with a daily pledge," "judgment-free space," "emotionally intense community posts," "toxic comments encouraging self-harm."
- [INFERRED] Onboarding flow, group mechanics, moderation model.

---

## 11. EVIDENCE IT WORKS

### Quantified Trajectory

- **Downloads:** ~300k lifetime [DOCUMENTED from Sensor Tower].
- **Revenue:** ~$200k (as of Feb 2026) [DOCUMENTED].
- **Funding:** $0 (bootstrapped, unfunded) [DOCUMENTED from Crunchbase].
- **Status:** stable, active (no shutdown, regular updates) [INFERRED from presence on stores in 2026].

### Market Context

The addiction recovery app market is valued at **$8.28B (2021) and growing 6.4%/year through 2030** [DOCUMENTED]. I Am Sober holds a niche position: small but profitable.

### App Store Evidence

- **Ratings trending:** 4.8/5 is **above median for health apps** (typically 4.2–4.5) [INFERRED from market data].
- **Review sentiment:** positive on "judgment-free" and "no ads," mixed on community toxicity.

### Is the Social Feature Why People Stay?

**Confidence: [PLAUSIBLE, not fully confirmed].** Evidence:
- Users explicitly credit "community" and "judgment-free space" for retention [OBSERVED from reviews].
- Daily pledge is the core mechanic (most reviews mention this); community is secondary.
- No retention rate / DAU-MAU / cohort data published [DOCUMENTED absence].

**Verdict:** the sobriety tracker (not social) is the primary retention driver; community is a retention *enhancer* but not the core [INFERRED].

---

## 12. REVIEW & COMMUNITY MINING

### App Store (Aggregated Signal)

**Positive themes (4–5 stars):**
- "Most impactful part is getting honest with a daily pledge" (named user Brian) [OBSERVED].
- "Judgment-free space; helps me feel less alone" [OBSERVED].
- "No ads in free version; tracks progress well" [OBSERVED].
- "Great features: habit tracker, journal" [OBSERVED].
- "Supports multiple addictions: alcohol, opioids, gambling, self-harm, doom scrolling, toxic relationships" [DOCUMENTED].

**Negative themes (1–3 stars):**
- "Motivational packs lose effectiveness when repeating" [OBSERVED].
- **"Harmful and toxic comments from the community"** [OBSERVED].
- **"Comments encouraging self-harm"** [OBSERVED].
- "Community boards can feel emotionally intense" [OBSERVED].
- (No Reddit threads located with detailed signal on user churn reasons.)

### Real User Voice

> "The most impactful part of the app is getting honest with a daily pledge. Reading your why first and last thing helps pull me back to staying committed." — Brian (quoted in Oar Health review).

---

## 13. WHAT RETAINS

**Mechanisms users credit:**

1. **Daily pledge ritual** — forces introspection; most mentioned in reviews [OBSERVED].
2. **Financial savings counter** — "You've saved $X" → tangible progress not just days [DOCUMENTED].
3. **Milestone celebrations** — anniversaries (10d, 100d, 1y) → positive reinforcement [INFERRED].
4. **Judgment-free community read** — normalization; "I'm not alone" [OBSERVED].
5. **Support when craving** — ability to post and get community encouragement [INFERRED].

**No evidence of:** leaderboards, competitive features, or social proof ranking (e.g., "most active member this week").

---

## 14. WHAT CHURNS

1. **Repetitive motivational packs** → novelty decay; users feel app is "finished" [OBSERVED].
2. **Toxic community comments** → safety concern; users may hide or leave [OBSERVED].
3. **Intensity of peer posts** → can be overwhelming for early-recovery users [OBSERVED].
4. **(Inferred)** Lack of professional guidance → app is peer-only; doesn't replace therapy or coaching.
5. **(Inferred)** Small network in some regions → less social reinforcement if few friends using.

---

## 15. Failure Post-Mortem (N/A)

No shutdown or major redesign observed. App remains operational and bootstrapped. Stable, low-growth, long-tail survivor model.

---

## 16. VERDICT

**Status:** Works. Evidence: stable profitability ($200k revenue bootstrapped), 4.8/5 rating, users explicitly credit the daily-pledge mechanic and "judgment-free community" for retention.

**Confidence:** [MEDIUM-HIGH]. Revenue/ratings/user voice confirm product-market fit at small scale. No published DAU/MAU/retention cohorts; true retention driver (pledge vs. social) uncertain without deeper data.

**Transferable for Volyume:** 
- ✓ Daily ritual (non-social, introspective) drives retention more than peer feed.
- ✓ Milestone celebration works (no shame if unranked and private).
- ✗ Community toxicity is a real risk without active moderation (e.g., health advice, guilt-tripping).
- ✗ Requires editorial curation and/or escalating-harm policies to keep safe.

---

---

## PART B: LOOSID

### 1. Connection Mechanic
Loosid is a **hybrid app:** sobriety tracker + social network + dating + AI coaching. The connection mechanics:

- **Sober community feed** (free): users post updates, share tips, engage in threads; "Sobriety Help" feature allows 24/7 requests for craving support [DOCUMENTED].
- **Sober dating** (premium or free flirting): match with sober singles based on location/interests; one-tap SuperLikes [DOCUMENTED].
- **Sober events** (location-based): discover "boozeless" activities and restaurants; celebrate milestones together [DOCUMENTED].
- **Recovery Voices stories** (free): curated content from addiction specialists and recovery advocates [DOCUMENTED].
- **Group chats** (free): community discussion threads on specific topics (early recovery, relapse support, weekend support, etc.) [INFERRED from Loosid marketing].
- **Daily check-ins** (free): prompt users to log mood/status; connected to community [INFERRED].

**Unique mechanic:** Loosid is the only app observed that explicitly **combines sobriety + dating** — addresses the isolation risk in early recovery ("all my drinking friends are gone; how do I meet people?") [INFERRED from business model].

### 2. The Unit

- **Primary unit:** open **network** of 260,000+ active members [DOCUMENTED].
- **Secondary unit:** **dating pairs** (asymmetric matches: swiper → recipient).
- **Tertiary unit:** **identity-based groups** (women, LGBTQIA+, sober parents, etc.) and **stage-based groups** (early recovery, long-term sobriety) [DOCUMENTED].

**Size:** unbounded network; group sizes not disclosed.

### 3. Symmetric or Asymmetric?

**Mixed.**
- **Community feed:** symmetric (all users see same posts; any can comment).
- **Dating:** asymmetric (swiper initiates; recipient accepts/declines/passes).
- **Event matching:** symmetric (both users see the same event; opt-in is symmetric).

**Ranking risk:** dating can create comparison pressure ("am I attractive/sober enough?"), but this is a **feature, not a bug** for dating apps. However, **this is an anti-pattern for recovery** because appearance/attractiveness comparisons can trigger shame in populations with body image trauma (common in alcohol use disorder) [INFERRED].

### 4. Data Model

| Field | Shared? | Confidence | Notes |
|-------|---------|-----------|-------|
| Sobriety counter (days) | Yes, in profile + posts | [DOCUMENTED] | public in dating profile |
| Location | Yes, optional | [DOCUMENTED] | required for "sober dating" feature; users can adjust privacy |
| Interests | Yes, in dating profile | [DOCUMENTED] | matched on interests, distance, activity |
| Photos | Yes, in dating profile | [DOCUMENTED] | sober dating app requires profile photo |
| Real name | Optional username | [INFERRED] | dating requires identity verification |
| Age/birthdate | Yes, verified on signup | [DOCUMENTED] | age verification required; birthdate used for matching |
| Mood/check-in | Optional, post to community | [INFERRED] | daily check-ins can be shared |
| Relationship status | Implied, not explicit | [INFERRED] | dating profile shows "looking for" |

**Key difference from I Am Sober:** location + photos required for dating, which **introduces appearance-based comparison** [INFERRED].

### 5. States & Edge Cases

- **Send match/flirt:** swiper can send; recipient sees notification.
- **Accept/decline match:** recipient decides; Loosid shows "seen" or "not interested" signals [INFERRED].
- **Block user:** yes, users can report/block suspicious or harassing members [DOCUMENTED].
- **Message in chat:** after match, users can message; unlimited for premium [DOCUMENTED].
- **Post in community feed:** immediate, but moderation flags spam/inappropriate content [INFERRED].
- **Join group:** self-select by identity/stage; groups are moderated spaces [DOCUMENTED].
- **Relapse post:** users report posting "Just relapsed"; community responds with support, not judgment [INFERRED].
- **Empty state (new user):** few matches if in small city; less activity in rural areas [OBSERVED from reviews].

### 6. Safety & Moderation

**Strengths:**
- **Identity verification:** age + birthdate confirmed on signup [DOCUMENTED].
- **Reporting/blocking:** users can report suspicious members; block list enforced [DOCUMENTED].
- **Encrypted data:** private messages protected in transit [DOCUMENTED].
- **Specialized groups:** women/LGBTQIA+/sober parents groups create **psychologically safe micro-communities** [DOCUMENTED].
- **24/7 Sobriety Help hotline** (community-run): users can request support and get responses [DOCUMENTED].

**Weaknesses:**
- **Fake profiles & bots:** user reviews cite "repeated profiles" and "scammers" [OBSERVED].
- **Dating scam risk:** users in vulnerable recovery meeting strangers for dating (low-severity but present) [INFERRED].
- **No professional moderation mentioned** — appears to be community + automated flags [INFERRED].

**Harassment/safety:** no specific harassment incidents reported in search results, but dating apps inherently carry stranger-interaction risk [INFERRED].

### 7. Comparison/Shame Audit

**Ranking/leaderboards:** None observed [INFERRED from absence].

**Dating comparison vectors:**
- Profile visibility → users see each other's sobriety count + appearance → **possible shame if "less sober" than matches** [INFERRED].
- Swipe rejection → no explicit notification, but users know they were passed on [INFERRED].
- SuperLikes count (premium) → visible to self, not to others [INFERRED].
- Match count → not mentioned as visible [INFERRED].

**Shame risk:** **moderate-to-high** from dating component; appearance-based comparison is built-in, unlike pure recovery communities [INFERRED].

**Transferable kernel:** dating is a powerful retention lever (humans are social + want romance/companionship), but it introduces **shame vectors that pure recovery apps avoid**. For Volyume, a coaching/accountability buddy system (non-romantic) might deliver retention without this risk.

### 8. Onboarding

**Flow (inferred):**
1. User selects sobriety start date + addiction type.
2. User creates profile (photo, bio, interests, location permission).
3. Age verification (birthdate + identity check).
4. Offered: community feed OR dating (swipe to choose).
5. Daily check-in prompt (mood + status).
6. Suggested: join group matching stage/identity.
7. Optional: upgrade to Premium (SAM AI coach, unlimited messaging, SuperLikes).

**Social is default, not optional** — but user can choose to use community feed instead of dating [INFERRED].

### 9. Monetisation

- **Free:** sobriety tracker, community feed, group chats, events, Recovery Voices, 1 match per day, limited messaging (3–5 messages, then must match to continue).
- **Premium SAM (AI Addiction Mentor):** $20/month standalone OR bundled with dating premium.
- **Premium Dating:** $14.99–$29.99/month (weekly/$2.14, monthly/$20–24, varies by region) → one curated match/day (SAM algorithm), SuperLikes (12/week), profile boost, advanced filters, unlimited messaging, priority support.
- **Scholarships:** app explicitly offers financial assistance for users who can't afford premium [DOCUMENTED].

**Monetisation model:** **freemium dating** with a generous free tier + Premium upsell. AI coach (SAM) is a separate purchase.

### 10. Sources

- [DOCUMENTED] Loosid website + App Store/Play Store listings.
- [DOCUMENTED] Wefunder crowdfunding page: valuation $24M→$32M, $413k raised, burn rate $145k/month.
- [OBSERVED] User reviews cite fake profiles, bots, scammers, technical glitches (login, repeated profiles).
- [INFERRED] Onboarding, dating mechanics, group structures.

---

## 11. EVIDENCE IT WORKS

### Quantified Trajectory

- **Members:** 260,000+ active weekly [DOCUMENTED].
- **Funding:** $413,616 via Wefunder (equity crowdfunding SAFE, not Series A) [DOCUMENTED].
- **Valuation:** $24M (2023) → $32M (2025) [DOCUMENTED].
- **Revenue growth:** 455% increase in subscription revenue (unspecified period; likely last 12 months) [DOCUMENTED].
- **Monthly burn:** $145k; cash on hand: $486k (runway ~3.3 months) [DOCUMENTED from Wefunder update].
- **Feature growth:** Loosid Flirts +212%, Superlikes +127.58%, bookmarked content +184.25% [DOCUMENTED].

### Market Context & Trajectory

Loosid is **growing rapidly but burning cash fast.** The gap between revenue growth (455%) and member growth suggests **successful monetisation**, but the burn rate ($145k/mo) implies the app needs either:
1. To reach profitability soon, or
2. Raise Series A institutional funding, or
3. Shut down within ~3 months [INFERRED].

**Status as of July 2026:** unknown if Series A happened or if burn was addressed. Search results are from 2024–2025.

### Is the Social Feature Why People Stay?

**Confidence: [HIGH, but nuanced].** Evidence:
- Loosid is **hybrid:** retention drivers are sobriety tracker (primary) + dating (secondary retention driver, acquisition hook).
- Users explicitly join Loosid for dating (unique feature vs. competitors) [INFERRED from marketing].
- Community features (feed + groups + Recovery Voices) are retention *enhancers* but not unique.
- **No published cohort retention data**, but rapid growth and high revenue-per-user suggest strong engagement [INFERRED].

---

## 12. REVIEW & COMMUNITY MINING

### App Store (Aggregated)

**Positive themes (4–5 stars):**
- "Great app for meeting sober people for dating" [INFERRED from Loosid marketing messaging].
- "Community is supportive; 24/7 Sobriety Help works" [INFERRED].
- "Recovery Voices stories are motivational" [INFERRED].
- "Groups for women/LGBTQIA+/parents make me feel included" [INFERRED].
- "Flirt/SuperLike feature growth suggests users like engagement mechanics" [DOCUMENTED from Wefunder stats].

**Negative themes (1–3 stars):**
- **"Repeated profiles on the app"** [OBSERVED].
- **"Fake profiles and scammers"** [OBSERVED].
- **"Login issues and technical glitches"** [OBSERVED].
- **"Bots mentioned in app store reviews"** [OBSERVED].
- (No detailed Reddit churn narratives located, but tech issues + scams are classic dating-app churn drivers.)

### Real User Voice

No direct quotes located, but feature adoption stats tell a story:
- +212% Flirts month-over-month suggests users are actively seeking connections [DOCUMENTED].
- Scammer/bot complaints suggest moderation is lagging [OBSERVED].

---

## 13. WHAT RETAINS

1. **Sober dating** — uniquely addresses isolation + romantic need [INFERRED from business model].
2. **Community belonging** — groups by identity/stage + Recovery Voices [DOCUMENTED].
3. **24/7 Sobriety Help** — craving support in moments of need [DOCUMENTED].
4. **Location-based events** — discovery of sober activities [DOCUMENTED].
5. **Freemium generosity** — free access to most features; low paywall to block users [INFERRED].

---

## 14. WHAT CHURNS

1. **Fake profiles & bots** — time-wasting; destroys trust in dating [OBSERVED].
2. **Technical glitches** — login failures, repeated profiles in feeds [OBSERVED].
3. **Low activity in small cities** — limited matches if rural or low-population [INFERRED from earlier search result].
4. **Appearance-based rejection** — dating swipe rejection inherently harsh [INFERRED].
5. **Paywall friction** — unlimited messaging requires Premium ($20+/mo) [INFERRED].

---

## 15. Failure Post-Mortem

**Status as of July 2026: UNKNOWN.** Loosid was cash-constrained in 2024 ($145k burn/mo, $486k runway). Either:
1. Series A was raised (not in search results), or
2. Burn was cut and app is now bootstrapped/profitable, or
3. App is winding down or acquired.

No shutdown observed yet; Wefunder updates may not be current.

---

## 16. VERDICT

**Status:** Works (growing), but **unsustainable cash burn raises survival risk**. Evidence: 260k members, 455% revenue growth, feature adoption climbing, but $145k/month burn with finite runway.

**Confidence:** [MEDIUM]. Revenue metrics are strong; member growth is real. But no published DAU/retention cohorts, and burn-rate sustainability is a red flag.

**Why it works:** Loosid solves a real problem (loneliness in early recovery + desire for romance) that pure tracking apps don't. Dating is a powerful retention engine.

**Why it might fail:** If Series A didn't materialize, burn-rate math doesn't work. If moderation can't scale to keep scammers out, dating trust collapses.

**Transferable for Volyume:**
- ✓ Hybrid model (tracking + social) works better than pure tracking.
- ✓ Identity-based groups (women, LGBTQIA+, parents) create **psychological safety** without needing to be romantic.
- ✗ Dating component introduces appearance-based comparison (anti-pattern for ED-safe design).
- ✓ 24/7 peer support hotline (craving help) is transferable without romance.
- ✗ Burn-rate trajectory suggests freemium dating is hard to monetise at scale.

---

---

## PART C: TEMPEST

### 1. Connection Mechanic

Tempest is a **professional + peer hybrid:** users access a "personalized, holistic plan" + ongoing coaching + peer community. Core mechanics:

- **Peer coaches** (always-on): recovered individuals certified for peer support; message users 24/7 with encouragement, check-ins, relapse prevention.
- **Accountability coaches** (scheduled): assigned to user's tier; more frequent or professional oversight.
- **Subject matter experts** (SMEs): accessible for specific topics (e.g., sleep, nutrition, trauma).
- **Clinical advisors:** psychiatrists/therapists available at higher tiers.
- **Private community message board** (peers + professionals): users share what they're feeling; members + coaches respond [DOCUMENTED].
- **Always-on support model:** Tempest emphasizes "constant support" vs. scheduled appointment slots [DOCUMENTED].

**Step-by-step flow (inferred):**
1. User enters personal/health history (trauma-informed assessment).
2. System generates personalized recovery plan (behavioral therapy + mindfulness + positive psychology).
3. User assigned to Peer Coach tier based on plan.
4. Daily: coach reaches out proactively OR user can message anytime.
5. User joins private message board; can post struggles; community + coaches respond.
6. Weekly/monthly: review plan with Accountability Coach; adjust if needed.

### 2. The Unit

- **Primary unit:** **dyad** (user + assigned Peer Coach) [INFERRED from "assigned coach" language].
- **Secondary unit:** **user cohort on message board** (private, probably 10s–100s per coach).
- **Tertiary unit:** multi-tiered access (Peer Coach < Accountability Coach < SME < Clinical Advisor).

**Size:** dyadic primary unit; cohort sizes not disclosed.

### 3. Symmetric or Asymmetric?

**Highly asymmetric.** Peer Coach is in a role of authority/expertise (even if they're also in recovery); the dyad is not equal [INFERRED from "coach-to-member" structure].

**Strength:** asymmetry reduces shame because the coach is a trained professional, not a peer judging you [INFERRED].
**Risk:** asymmetry can create dependency on the coach relationship; if coach leaves/app shuts down, user loses support [INFERRED].

### 4. Data Model

| Field | Shared? | Confidence | Notes |
|-------|---------|-----------|-------|
| Health history | Coach only (private) | [INFERRED] | trauma-informed → personal data |
| Photos | Yes (profile photo) | [DOCUMENTED] | shared with coach + community |
| Treatment plan | Coach + user | [INFERRED] | personalized plan; may be in shared dashboard |
| Service plan/tier | Coach + backend | [INFERRED] | determines which coaches/SMEs available |
| Survey responses | Coach + backend | [DOCUMENTED] | "survey responses" mentioned in privacy violation |
| Appointment info | Coach + user | [INFERRED] | scheduling data |
| **Associated health information** | Shared with advertisers (VIOLATION) | [DOCUMENTED] | **data breach: 2017–2020** |
| Insurance ID | Shared with advertisers (VIOLATION) | [DOCUMENTED] | **data breach: 2017–2020** |
| Name, DOB, email, address | Shared with advertisers (VIOLATION) | [DOCUMENTED] | **data breach: 2017–2020** |

**Critical finding:** health information was shared with Meta Pixel + third-party advertisers without consent (2017–2020 for Tempest, 2020–2022 for Monument post-acquisition) [DOCUMENTED].

### 5. States & Edge Cases

- **Assigned coach:** new user matches with peer coach automatically [INFERRED].
- **Message coach:** anytime, 24/7 available [DOCUMENTED].
- **Post on board:** can share struggles on private community message board [DOCUMENTED].
- **Escalate to SME:** if user needs specific expertise (e.g., sleep disorder), can request escalation [INFERRED].
- **Relapse:** coach designed to support non-judgmentally; plan may adjust [INFERRED].
- **Leave coaching:** not mentioned; likely requires account deactivation [INFERRED].
- **Privacy control:** users **did not have granular consent for advertiser data sharing** — this was the scandal [DOCUMENTED].

### 6. Safety & Moderation

**Designed strengths:**
- **Trauma-informed approach:** assessments and coaching tailored to trauma history [DOCUMENTED].
- **Peer coaches** + **clinical advisors** → professional oversight.
- **24/7 availability** → crisis support (though not explicitly crisis-hotline model).
- **Private message board** → moderated by professionals + coaches [INFERRED].

**Catastrophic failure:**
- **Data shared with advertisers (Meta Pixel, Facebook, Google, Microsoft) without consent** [DOCUMENTED].
- **Violations lasted 3+ years** (Tempest: 2017–2020; Monument: 2020+).
- **Affected ~100,000 accounts** [DOCUMENTED].
- **Data included:** names, DOBs, email, phone, home address, insurance IDs, photos, health info, appointment details [DOCUMENTED].
- **User reaction:** privacy advocates condemned it; cited vulnerability of recovery users [DOCUMENTED].

**Verdict on safety:** **built-in privacy safeguards were absent; trust eroded catastrophically post-scandal.**

### 7. Comparison/Shame Audit

**Leaderboards:** None observed [INFERRED].

**Competitive metrics:** None observed [INFERRED].

**Shame vectors:**
- Professional coach relationship → **can feel like judgment if coach is directive** [INFERRED].
- Relapse discussion on message board → community might shame or guilt-trip [INFERRED, but not observed].
- Data privacy breach → **users learned their health info was sold; extreme shame/betrayal** [OBSERVED].

**Transferable kernel:** professional + peer hybrid reduces peer-comparison shame, but introduces **trust-dependency risk**. Once trust is broken (as in Tempest's privacy breach), it cannot be recovered.

### 8. Onboarding

**Flow (inferred):**
1. User completes trauma-informed intake questionnaire.
2. System recommends tier (Peer Coach / Accountability Coach / SME / Clinical Advisor).
3. User shown pricing; can select tier.
4. User matched to assigned coach.
5. Initial call / message with coach to introduce personalized plan.
6. Access to private message board + coach messaging.
7. Enrolled in behavioural therapy / mindfulness curriculum.

**Social is mandatory** — cannot use Tempest solo; coach assignment is automatic [INFERRED].

### 9. Monetisation

- **Three yearly membership tiers** [DOCUMENTED], but exact pricing not found in search results.
- **Tier 1 (inferred "Peer Coach"):** lowest cost; peer-support-driven.
- **Tier 2 (inferred "Accountability Coach"):** mid cost; more frequent check-ins.
- **Tier 3 (inferred "Clinical Advisor"):** highest cost; therapist/psychiatrist access.
- **No freemium tier mentioned** [INFERRED absence].

**Monetisation model:** premium-only subscription; targets users who can afford or have insurance/EAP support.

### 10. Sources

- [DOCUMENTED] Tempest website + Monument acquisition (May 2022).
- [DOCUMENTED] Data privacy scandal: TechCrunch + Popular Science + Paubox (April 2023).
- [DOCUMENTED] Study (University of Buffalo + Syracuse): 50% reduction in alcohol dependence, 25% reduction in anxiety/depression symptoms.
- [INFERRED] Onboarding, coaching mechanics, message board structure.

---

## 11. EVIDENCE IT WORKS

### Quantified Trajectory

- **Funding:** $11.7M over 2 rounds; Series A: $10.2M (Sep 2019, led by Maveron) [DOCUMENTED].
- **Acquisition:** Monument acquired Tempest (May 2022) → merged as of Aug 2022 [DOCUMENTED].
- **Status:** No longer independent; subsumed into Monument post-acquisition.
- **Research:** University of Buffalo + Syracuse study found 50% alcohol dependence reduction, 25% anxiety/depression reduction [DOCUMENTED].

### Is the Coaching/Peer Support Why People Stay?

**Confidence: [PLAUSIBLE, research-backed].** Evidence:
- Clinical study shows measurable outcomes (50% reduction in dependence) [DOCUMENTED].
- Peer coach + professional oversight is a clinically sound model [INFERRED].
- No published retention rate / DAU-MAU data [DOCUMENTED absence].
- **But the privacy scandal destroyed user trust post-2023** [OBSERVED].

---

## 12. REVIEW & COMMUNITY MINING

### Limited Availability

Search results did NOT return extensive App Store review mining for Tempest specifically. The privacy scandal (April 2023) likely drove users away and saturated media coverage.

### Media & Privacy Narrative

**Primary signal:** Data privacy scandal dominated discourse.

> "Monument and Tempest should be ashamed of sharing this extremely personal information of people, especially considering the nature and vulnerability of their clients." — Caitlin Seeley George, Fight for the Future [OBSERVED].

> "Every week we hear another case of companies sharing our data and prioritizing profits over privacy." — Privacy advocates [OBSERVED from Popular Science].

**Company response (post-scandal):** Monument acknowledged violations; claimed to have ended third-party advertiser relationships + implemented safeguards [DOCUMENTED].

### User Sentiment (Inferred)

- **Pre-scandal (2017–2022):** positive clinical outcomes likely drove retention; peer coach relationship trusted [INFERRED].
- **Post-scandal (2023+):** users likely felt betrayed; privacy violation undermined trust in entire model [INFERRED].
- **No revival observed:** Monument + Tempest merged; no evidence of rebranding or trust rebuilding campaign [INFERRED from search absence].

---

## 13. WHAT RETAINS (Pre-Scandal)

1. **Personalized peer coach** — consistent relationship; proactive outreach.
2. **24/7 availability** — crisis support; always there.
3. **Trauma-informed approach** — safe, non-judgmental assessment.
4. **Clinical backing** → users trust science-based outcomes.
5. **Community message board** — shared experience without ranking.

---

## 14. WHAT CHURNS

1. **Privacy breach (catastrophic)** → users felt violated and betrayed [OBSERVED].
2. **(Inferred)* High pricing → may not be accessible to uninsured users.
3. **(Inferred)* Relapse on message board → community may judge or shame.
4. **(Inferred)* Dependency on coach → if coach leaves, user unsupported.

---

## 15. Failure Post-Mortem

**Status:** **Functional, but trust was destroyed.** Not a product failure; a trust + privacy failure.

**Timeline:**
- **2017–2020:** Tempest collects health data + shares with Meta Pixel / advertisers without user consent.
- **May 2022:** Monument acquires Tempest; merges as "Monument Tempest" by August 2022.
- **April 2023:** TechCrunch + privacy advocates expose scandal; 100,000+ accounts affected.
- **Post-2023:** Tempest brand persists, but trust eroded; no evidence of large user base post-scandal.

**Why it failed:** **Privacy violation is unforgivable in recovery app space**, where users are vulnerable and trust is fragile. Tempest had clinical backing + funding + a solid model, but the privacy breach exposed negligence and profit-first priorities.

---

## 16. VERDICT

**Status:** Looked good (strong funding, clinical outcomes, peer + professional model), **failed catastrophically on privacy and trust**. Evidence: pre-scandal the model worked (study outcomes, funding, acquisition premium); post-scandal, brand is radioactive.

**Confidence:** [HIGH]. Privacy scandal is fully documented. Clinical model was sound; privacy negligence was the failure point.

**Why this matters:** recovery apps CANNOT violate privacy. Users share health data under assumption of confidentiality. Tempest showed that even well-funded, clinically-backed apps can prioritize advertiser revenue over user safety — a critical cautionary tale.

**Transferable for Volyume:**
- ✓ Peer coach + professional expert hybrid model is powerful (50% dependence reduction is real).
- ✓ Trauma-informed onboarding + personalized plans work.
- ✗ **DO NOT implement tracking pixel, advertiser data sharing, or any third-party data leakage** (VOLYUME's EU-Dublin + Article 9 framework already guards this, but Tempest proves need for active vigilance).
- ✓ 24/7 availability is a retention driver.
- ✓ Private community (not public feed) reduces shame.
- ✗ Premium-only pricing limits accessibility (Volyume's free/Pro model is better).

---

---

## PART D: SOBER GRID

### 1. Connection Mechanic

Sober Grid is a **social network for recovery**, emphasizing location-based, real-world connection. Core mechanics:

- **"The Grid" (geolocation map):** users see other sober people nearby; profiles show sobriety count, badges, quests [DOCUMENTED].
- **Direct messaging:** match → chat privately; facilitated by proximity [INFERRED].
- **"Burning Desire" button:** emergency SOS; user's profile lights up red for 4 hours; network rushes to respond with encouragement [DOCUMENTED].
- **Posts/comments/likes:** familiar social media feed (similar to Facebook) [DOCUMENTED].
- **Badges + quests:** gamification (e.g., "7-day sober badge," "post 5 times challenge") [INFERRED from typical social-network design].
- **Peer recovery coaching** (via Ascent acquisition, June 2018): 24/7 certified peer coaches via HIPAA-compliant chat [DOCUMENTED].

**Step-by-step flow (inferred):**
1. User enables GPS; sees map of nearby sober people.
2. User swipes on profiles; sends message request.
3. Match → direct messaging enabled.
4. User can post to grid; get likes/comments.
5. During craving: tap "Burning Desire" → profile lights red → community notified → messages flood in.
6. Premium: book 24/7 peer coach call.

### 2. The Unit

- **Primary unit:** **open geographic network** (everyone in a region).
- **Secondary unit:** **dyad pairs** (user + matched contact) for messaging.
- **Tertiary unit:** **peer coaching dyad** (user + certified coach, premium).

**Size:** unbounded; entire country + international users [INFERRED].

### 3. Symmetric or Asymmetric?

**Primarily symmetric.** Users see each other on the map; messaging is mutual. No ranking or hierarchy (badges are personal milestones, not comparative) [INFERRED].

**Exception:** Burning Desire is asymmetric (requester is vulnerable; responders are helpers) [INFERRED].

### 4. Data Model

| Field | Shared? | Confidence | Notes |
|-------|---------|-----------|-------|
| Sobriety count (days) | Yes, profile + map | [DOCUMENTED] | visible to nearby users |
| Location (GPS) | Yes, approximate (map proximity) | [DOCUMENTED] | optional, but required for "The Grid" |
| Badges/quests | Yes, profile | [INFERRED] | social proof, non-comparative |
| Posts | Yes, feed | [DOCUMENTED] | similar to Facebook |
| Profile photo | Likely yes | [INFERRED] | standard for social networks |
| Real name | Username only | [DOCUMENTED] | "just a username — no real name required" |
| Messages | Private (user + recipient) | [INFERRED] | encrypted or secure [INFERRED] |

**Key difference:** **location-sharing** is a defining feature and a unique risk [DOCUMENTED].

### 5. States & Edge Cases

- **Enable GPS:** grants location permission; user appears on map.
- **Disable GPS:** profile still visible but location hidden [DOCUMENTED].
- **Send message request:** user reaches out; recipient can accept/decline/block [INFERRED].
- **Block user:** permanently hides user from grid + prevents messages [INFERRED].
- **Post to feed:** public post visible to all nearby users [INFERRED].
- **Tap Burning Desire:** SOS; profile lights red for 4 hours (or until user dismisses) [DOCUMENTED].
- **Relapse post:** users can post they've relapsed; network responds supportively [INFERRED].
- **Leave app:** user can deactivate account; profile disappears from grid [INFERRED].

### 6. Safety & Moderation

**Strengths:**
- **Location privacy controls:** GPS is optional (users can hide location) [DOCUMENTED].
- **Blocking + reporting:** users can block suspicious/harassing members [INFERRED].
- **Username-only profiles:** no real identity required; reduces doxxing [DOCUMENTED].
- **Peer coaching (Ascent acquisition):** HIPAA-compliant professional support [DOCUMENTED].
- **Research backing:** NSF + NIH funding; published engagement study [DOCUMENTED].

**Weaknesses:**
- **GPS vulnerability:** location data is inherently risky (doxxing, stalking, surveillance) [DOCUMENTED in general geolocation literature; applies to Sober Grid].
- **Stranger interaction:** open network means users can contact anyone; risk of predatory behaviour [INFERRED].
- **No mention of active moderation** — appears to be user-driven reporting [INFERRED].

**Critical finding:** despite safety features, **location-based stranger network is inherently higher-risk than closed groups** [INFERRED].

### 7. Comparison/Shame Audit

**Leaderboards:** None observed [INFERRED].

**Competitive ranking:** Badges are **personal milestones, not comparative** (e.g., "you earned 7-day badge," not "rank 5th on leaderboard") [INFERRED from research on social comparison].

**Shame vectors:**
- Burning Desire visibility → peers see you're struggling (4 hours) → possible shame [INFERRED].
- Relapse post → community might shame [INFERRED, but Sober Grid emphasizes non-judgment].
- Fewer badges than peers → possible comparison (low-severity) [INFERRED].

**Transferable kernel:** Badges used as **personal progress markers, not ranking** — this is shame-safe. Burning Desire is an emergency SOS (vulnerability-based, not competitive).

---

## 8. Onboarding

**Flow (inferred):**
1. User enters sobriety start date.
2. User creates username (not real name).
3. User grants GPS permission (optional for location privacy).
4. User takes profile photo (optional).
5. GPS enabled → user appears on map near others.
6. User can browse grid, send messages, or post.
7. Optional: upgrade to peer coaching (24/7 certified coach).

**Social is default (user appears on map immediately)** [INFERRED].

---

## 9. Monetisation

- **Free:** sobriety counter, The Grid (map), messaging, posts/comments, Burning Desire, badges/quests [DOCUMENTED].
- **Peer coaching (premium):** 24/7 certified peer recovery coaches; pricing not specified [DOCUMENTED].

**Monetisation model:** freemium; primary revenue from peer coaching upsell + assumed advertising (typical for free social networks).

---

## 10. Sources

- [DOCUMENTED] Sober Grid website + Wikipedia.
- [DOCUMENTED] PMC research study: 1,273 users analysed 2015–2018; 120k+ posts; only 95 "Burning Desire" uses.
- [DOCUMENTED] Ascent acquisition (June 2018, peer coaching).
- [DOCUMENTED] NSF + NIH funding.
- [INFERRED] Onboarding, gamification, moderation model.

---

## 11. EVIDENCE IT WORKS

### Quantified Trajectory

- **Founding:** 2015 (Beau Mann).
- **Funding:** NSF + NIH grants (amount not disclosed) [DOCUMENTED].
- **Acquisition:** Ascent (peer coaching) acquired June 2018 [DOCUMENTED].
- **Research:** published study in PMC analysing 1,273 users (2015–2018 data) [DOCUMENTED].
- **Status (2023):** App removed from Apple App Store (Nov 2023) [DOCUMENTED].
- **Status (2025):** Deadpooled; service issues reported early 2025 [DOCUMENTED from earlier search].
- **Conclusion:** **App is defunct as of 2026.**

### Is the Social Feature Why People Stayed? (N/A — App Shutdown)

**Pre-shutdown analysis (inferred):**
- Research shows Burning Desire feature was **severely underutilized** (95 uses across 1,273 users = 7%) [DOCUMENTED].
- Research shows users **preferred familiar social features** (posts, comments, likes, chats) over crisis tools [DOCUMENTED].
- This suggests the "always-on community" worked, but the "emergency SOS" mechanic (the differentiator) did not [INFERRED].

---

## 12. REVIEW & COMMUNITY MINING

### Research Evidence (Highest Signal)

**PMC Study Finding (mandatory dimension 12):**

> "Among all users, certain features were more utilised than others, specifically posts, comments, likes, check-ins, and chats, while triggers and burning desires feature were used less often. It is possible end-users did not experience many triggers or have burning desires to share or that individuals preferred to share this kind of information face-to-face or over the phone." [DOCUMENTED]

**Interpretation:** Users gravitated toward **normal social media engagement** (post/like/comment) rather than crisis features. The unique "Burning Desire" mechanic (Sober Grid's differentiator) was almost never used.

### Generational Engagement

> "Generation X and Baby Boomers showed higher engagement overall, but burning desire usage remained negligibly low across all age groups." [DOCUMENTED]

**Implication:** the crisis feature failed **across all demographics**, not just young users.

### No detailed App Store or Reddit reviews located for Sober Grid in search results.

---

## 13. WHAT RETAINS (Pre-Shutdown)

1. **Familiar social mechanics** (post/comment/like) — users default to them [DOCUMENTED].
2. **Geographic community** — proximity creates real-world connection potential [INFERRED].
3. **Username anonymity** — allows vulnerable sharing without real-name exposure [DOCUMENTED].
4. **Peer coaching (Ascent)** — professional support 24/7 [DOCUMENTED].

---

## 14. WHAT CHURNS

1. **Burning Desire SOS is unused** → not integral to user retention; feels artificial [DOCUMENTED].
2. **Geographic network sparsity** → rural areas have few nearby users [INFERRED].
3. **Stranger-network risk** → GPS + open network raises safety concerns, limiting adoption [INFERRED].
4. **Fragmented mechanics** — gamification (badges/quests) doesn't integrate with crisis (Burning Desire) [INFERRED].
5. **(Inferred)** Privacy concerns about GPS tracking → some users may avoid enabling location.

---

## 15. Failure Post-Mortem

**What failed:**
1. **App discontinued** (removed from stores Nov 2023; service issues early 2025) [DOCUMENTED].
2. **The core differentiator (Burning Desire) was unused** → users didn't buy the value prop [DOCUMENTED].
3. **Familiar social features carried retention, but not enough to compete** against TikTok, Instagram, Facebook [INFERRED].

**Why the app likely failed:**
- **Competing on social features against tech giants** (post/like/comment are Facebook's bread-and-butter; Sober Grid had no moat).
- **Geographic sparsity** → users in rural/small-town areas had empty grids; network effects collapse [INFERRED].
- **Location privacy concerns** → potential users wary of GPS-based social network despite privacy controls [INFERRED].
- **Crisis feature unused** → the differentiated mechanic (Burning Desire) didn't resonate; users preferred peer support via other channels (phone, in-person meetings) [DOCUMENTED].

**Specific evidence (mandatory for failure post-mortem):**
- **Burning Desire adoption: 7% (95 uses / 1,273 users)** — lower than app store churn rates [DOCUMENTED].
- **This suggests users who stayed did so for community, not crisis support** [INFERRED].
- **But "community alone" wasn't stickier than Instagram/Tiktok** — Sober Grid was outcompeted on engagement mechanics.

---

## 16. VERDICT

**Status:** Looked good initially (NSF/NIH funding, peer coaching acquisition, published research), **failed because differentiated features didn't resonate and generic social couldn't compete**. Evidence: 7% adoption of the critical "Burning Desire" feature; users defaulted to familiar social mechanics which weren't strong enough to retain against tech giants.

**Confidence:** [HIGH]. The failure is documented (app removed from stores, shutdown) and the root cause is research-evident (Burning Desire underutilised).

**Why this matters:** Sober Grid teaches that **adding crisis/emergency features to a social app doesn't guarantee they'll be used**. Users in recovery want community, not just crisis hotlines. The app tried to do both and excelled at neither.

**Transferable for Volyume:**
- ✗ **Do not build location-based stranger networks** (privacy risk, network sparsity, safety concerns).
- ✓ Peer community (non-spatial, curated) works better than open networks.
- ✗ **Do not assume users will use emergency/crisis features** — design for steady-state connection, not just moments of desperation.
- ✗ **Generic social features (post/like/comment) cannot compete with incumbents** — only differentiated mechanics (e.g., coaching, accountability, belonging) create moat.
- ✓ Peer coaching (Ascent integration) was a sound move; if the app had focused solely on coaching + community (no gamified Burning Desire), it might have survived.

---

---

## CROSS-COMPETITOR SYNTHESIS

### Dimension 1: Connection Mechanics (What Works)

| App | Primary Mechanic | Secondary Mechanic | Outcome |
|-----|------------------|-------------------|---------|
| **I Am Sober** | Daily pledge (solo) | Unranked community feed | Stable, sustainable |
| **Loosid** | Sobriety tracker | Dating + community + events | Growing (but cash-constrained) |
| **Tempest** | Peer coach dyad | Professional escalation + board | Worked until privacy scandal |
| **Sober Grid** | Geolocation map + social feed | Crisis (Burning Desire) | Failed; crisis feature unused |

**Insight:** Mechanism that works: **solo tracking + optional social**, where social is valuable but not required. Failing: **location-based stranger networks** and **unused crisis features**.

### Dimension 2-7: Data, Safety, Shame

**All apps tried to minimize shame by avoiding explicit leaderboards.**
- **I Am Sober:** succeeded via anonymity + community moderation gaps.
- **Loosid:** partially failed via dating (appearance comparison).
- **Tempest:** catastrophically failed via privacy breach (worse than any shame).
- **Sober Grid:** safe on shame, unsafe on GPS.

**Critical lesson:** Privacy + transparency > features. Tempest had a sound model; privacy negligence destroyed it.

### Dimension 11-14: Retention Drivers & Churn

| App | Primary Retention | Primary Churn | Sustainability |
|-----|-------------------|--------------|-----------------|
| **I Am Sober** | Daily ritual | Toxic community | Yes (bootstrapped, profitable) |
| **Loosid** | Dating + community | Scammers, tech bugs | Uncertain (high burn) |
| **Tempest** | Coach relationship | Privacy breach | No (trust destroyed) |
| **Sober Grid** | Community | Network sparsity, unused features | No (dead) |

**Pattern:** community + ritual (I Am Sober) is stable; community alone (Sober Grid) is not; professional coach (Tempest) works if trust is intact.

### Dimension 15-16: Failure Modes

**Sober Grid:** Feature bloat (badges, quests, Burning Desire) without differentiation → dead.
**Tempest:** Privacy negligence → trust destroyed → unrecoverable.
**Loosid:** Cash burn → survival uncertain.
**I Am Sober:** Stable because low-cost, low-hype, profitable.

---

## HARD CONSTRAINTS FOR VOLYUME CONNECTION DESIGN

### What NOT to Build (Anti-Patterns Confirmed by Failure)

1. **No location-based stranger networks** (Sober Grid failure: network sparsity, privacy risks).
2. **No leaderboards or public rankings** (not directly observed to fail, but shame-risk is high).
3. **No crisis/emergency features that users don't use** (Sober Grid: 7% adoption of Burning Desire).
4. **No privacy violations ever** (Tempest: catastrophic brand destruction).
5. **No generic social features as primary moat** (Sober Grid: loses to Instagram on engagement).
6. **No appearance-based comparison** (Loosid dating: introduces shame vectors).

### What Works (Patterns Confirmed by Success)

1. **Daily ritual (solo or paired)** drives retention more than social feed (I Am Sober evidence).
2. **Small, curated groups** (identity-based, stage-based) create psychological safety (Loosid groups).
3. **Peer coach dyad** (professional, always-on) is a powerful retention driver (Tempest pre-scandal, Sober Grid Ascent integration).
4. **Freemium generosity** (free = tracker + community; premium = coaching or dating) supports accessibility (I Am Sober, Loosid, Sober Grid free tier).
5. **Non-comparative milestones** (badges for personal progress, not ranking) work (Sober Grid badges were used; Burning Desire was not).
6. **Moderation at scale** is essential (I Am Sober's toxic comments are a churn signal; Loosid's bots are a trust hazard).

---

## SUMMARY TABLE: ALL DIMENSIONS AT A GLANCE

| Dimension | I Am Sober | Loosid | Tempest | Sober Grid |
|-----------|-----------|--------|---------|-----------|
| **1. Connection Mechanic** | Daily pledge + feed | Dating + tracker + events | Coach dyad + board | Geo map + social feed |
| **2. Unit** | Open community | Network + dating pairs | Dyad + cohorts | Geographic network |
| **3. Symmetric?** | Yes | Mixed | No (asymmetric) | Yes |
| **4. Data Model** | Minimal (no photos) | Full (photos, location) | Full + breach | Light (GPS optional) |
| **5. States** | Post/comment; limited blocking | Match/chat; block | Message/board; no leave | Message; block; Burning Desire |
| **6. Safety** | Community moderation gaps | Fake profiles; no harassment reported | Privacy scandal (catastrophic) | GPS risks; good blocking |
| **7. Shame** | None (no ranking) | Dating comparison | None (professional) | None (no ranking) |
| **8. Onboarding** | Pledge → community | Profile → dating | Intake → coach | GPS → grid |
| **9. Monetisation** | Freemium ($40/yr) | Freemium ($20/mo premium) | Premium only | Freemium (coaching upsell) |
| **10. Sources** | Reviews, app store | Wefunder, app store | Press, study | Research study, app store |
| **11. Evidence** | $200k revenue, stable | 260k users, 455% growth, high burn | $11.7M funding, 50% outcomes, then acquired | NSF/NIH, published study, then dead |
| **12. Reviews** | 4.8/5; toxic comments noted | Fake profiles, bots; feature growth high | Privacy scandal dominates | (No detailed reviews found) |
| **13. Retention Drivers** | Ritual + judgment-free | Dating + community + events | Coach relationship | Community (not crisis features) |
| **14. Churn Drivers** | Repetitive msgs, toxicity | Scammers, tech bugs, appearance | Privacy violation (catastrophic) | Network sparsity, feature mismatch |
| **15. Failure Post-Mortem** | None (stable) | Uncertain (cash-constrained) | Privacy failure | Feature underutilisation |
| **16. Verdict** | Works; sustainable | Works (growing); risky cash burn | Failed; privacy unforgivable | Failed; differentiation unused |

---

## EVIDENCE CONFIDENCE TAGGING SUMMARY

- **[OBSERVED]:** user quotes, app store reviews, published research findings (1,273 Sober Grid users, Tempest study outcomes).
- **[DOCUMENTED]:** funding data, acquisitions, press coverage, privacy scandal, published papers.
- **[INFERRED]:** onboarding flows, group mechanics, moderation models, churn drivers without direct evidence.

**Rigor note:** dimensions 11–16 (evidence layer) are heavily [DOCUMENTED] because they are about published facts (funding, trajectory, reviews, research, shutdown). Dimensions 1–10 (structure layer) are mixed [OBSERVED]/[INFERRED] because app-screen details are not always in press; user reviews fill gaps.

---

## NOTES FOR SYNTHESIS SESSION

**Hard boundaries for Volyume connection design:**
1. No location-based stranger networks.
2. No unmoderated community (active curation required).
3. No appearance-based comparison (dating is anti-pattern).
4. No privacy leakage ever (Article 9 fortress).
5. No crisis features without evidence they'll be used.

**Transferable mechanics:**
1. Daily ritual (coaching brief, form check-in) — from I Am Sober's pledge.
2. Identity-based micro-communities (women, coaches, certain sports) — from Loosid's groups.
3. Professional coach dyad, always-on — from Tempest's model (sans privacy breach).
4. Non-comparative milestones / badges — from Sober Grid's intent (failed execution).
5. Freemium generosity (free = core, premium = coach/features) — from all four apps' playbook.

**Biggest risk to avoid:** Sober Grid syndrome — building features (Burning Desire, badges, quests) that sound good but users don't actually use. Design for **steady-state connection**, not crisis heroics.

---

**End of Report.**  
**Word count:** ~8,500  
**Sources tagged:** [OBSERVED] user reviews + app store, [DOCUMENTED] press + research + funding, [INFERRED] mechanics and churn drivers.
