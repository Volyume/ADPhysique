# Phase 2 — Research: How the best apps surface "training partners" / social accountability

**Date:** 2026-06-10 · **Status:** research, no build · **Method:** 5 parallel web-search agents (WHOOP/Apple/Garmin; Strava/Peloton; Hevy/Strong/Fitbod; Duolingo/Gentler Streak; invite-flow + placement UX evidence), claims cited, low-confidence items flagged.

**Why this exists:** Volyume's Training Partners shipped buried in a `You → settings` list (and was additionally hidden by a tier-read bug). The founder was right that this is wrong. This report establishes, from the market and from UX evidence, **where the feature should live, how partners should link up, what the shared signal should be, and how to drive re-engagement** — within Volyume's hard constraints (privacy-first, EU residency, no PII to external services, ED-aware: no leaderboards / no shame mechanics, share only a minimal weekly "trained" signal).

---

## 1. Per-app: where it lives + how partners link

| App | Where social lives (nav path) | How two people link | Shared signal | Re-engagement hook |
|---|---|---|---|---|
| **WHOOP** | Dedicated **Community** icon in the **bottom nav** | @username search **+ numeric invite code + referral link** for non-users | Team leaderboard (Strain/Recovery/Sleep) | Team Chat |
| **Apple Fitness** | Dedicated **Sharing tab** in the Fitness app | "Add a Friend" (top-right) → **Contacts / Apple ID**; max 40 | List of friends' 3 ring %s; 7-day detail; opt-in Competitions | Push when a friend closes rings / finishes a workout / wins a competition |
| **Garmin Connect** | Spread across **Connections / Groups / Challenges** menus (not one tab) | **Profile invite link** + username search + contacts; LiveTrack via emailed link | Challenge/step leaderboards | Challenge invitations |
| **Strava** | **Feed = Home tab**; dedicated **Groups tab** for Clubs/Challenges | You tab → search (magnifying glass): **name search, suggested, contact sync, QR code**; "Invite" for non-users | Feed activity cards with **kudos + comment counts**; club/segment leaderboards | **Kudos** + bell-icon notifications |
| **Peloton** | Dedicated **Community tab** (Teams); **following lives in Profile**; leaderboard embedded **in the workout** | Name search, **contact sync**, invite-to-class (must already follow) | Class leaderboard row; Team weekly leaderboard | **High-fives** (push) + weekly Team stats |
| **Hevy** | **Home tab IS the feed** (+ Discover toggle); Profile shows followers/following | **Magnifying glass (top-right)** → username search; **"Invite a friend" → share link / contacts / WhatsApp etc.** | Workout card with **like + comment counts** | **Per-user "Workout Notifications" toggle**; likes/comments; Live PR |
| **Strong** | **None** — pure logger | — (OS share-sheet export only) | None | None |
| **Fitbod** | **None** — solo AI coach | **Deep-link "partner workout"** (share link auto-adapts to recipient's history) | None (share-out image/link only) | Share-to-Instagram only |

Sources: WHOOP [Teams FAQs](https://support.whoop.com/hc/en-us/articles/360040375353-Teams-FAQs), [Nav Bar](https://support.whoop.com/hc/en-us/articles/360056034814-WHOOP-App-Navigation-Bar) · Apple [Share your activity in Fitness](https://support.apple.com/guide/iphone/share-your-activity-iph0b826155d/ios) · Garmin [Managing Friends](https://support.garmin.com/en-US/?faq=ETHXgsWvaM4Zkyu30Uomj9), [LiveTrack](https://support.garmin.com/en-US/?faq=HbqxxbiBGA3mDhlLX4GUw8) · Strava [Finding Friends](https://support.strava.com/hc/en-us/articles/216917377-Finding-Friends-and-Managing-Contacts-on-Strava), [Following](https://support.strava.com/hc/en-us/articles/115000173484-Following-Athletes-on-Strava), [Kudos](https://support.strava.com/hc/en-us/articles/216918397-What-is-Kudos) · Peloton [Teams](https://support.onepeloton.com/s/article/Peloton-Teams), [Find & Add Friends](https://support.onepeloton.com/s/article/Peloton-Member-Profiles-How-To-Find-And-Add-Friends), [Community features](https://www.onepeloton.com/blog/peloton-community-features) · Hevy [Social Guide](https://help.hevyapp.com/hc/en-us/articles/35688036014231-Hevy-App-Social-Guide-Connect-Follow-and-Share-Your-Workouts), [Social Features](https://www.hevyapp.com/features/social-features/), [Discovery Feed](https://www.hevyapp.com/features/discovery-feed/) · Strong [strong.app](https://www.strong.app/), [Setgraph review](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph) · Fitbod [Sharing a Workout](https://fitbod.zendesk.com/hc/en-us/articles/360006427453-Sharing-a-Workout-Gym-Profile-Settings), [Arvo: no gym crews](https://arvo.guru/blog/gym-crew-vs-hevy-strong)

### The single biggest pattern
**Every app that takes social seriously gives it a top-level, persistent home** — a bottom-tab item (WHOOP Community, Apple Sharing, Strava Feed/Groups, Peloton Community, Hevy Home-feed). **None of them bury it in settings.** The two apps with social *in a menu/none at all* (Strong, Fitbod) are explicitly the "solo" tools — and reviewers single them out for having "no gym crew." Burying = the solo-tool signal.

---

## 2. Measured UX evidence (the part that proves the founder right)

- **Hiding a feature ~halves discoverability.** NN/g: only **17%** of users found a hidden (hamburger/menu) item vs **42%** for visible navigation; hidden nav also raised perceived difficulty **+21%** and took longer to find. [NN/g — Hamburger Menus](https://www.nngroup.com/articles/hamburger-menus/) **[MEASURED]**
- **Tab bars are for primary, frequently-used sections (3–5 items); settings/help belong in the hidden menu.** A feature you want adopted is *primary*. [onething.design](https://www.onething.design/post/hamburger-menu-vs-tab-bar) **[OPINION, consistent w/ NN/g]**
- **Invite links via the OS share sheet are the lowest-friction primitive**; QR is best for in-person; **contact sync has the highest privacy/friction cost** (and conflicts with Volyume's no-PII rule). [Referral Factory](https://help.referral-factory.com/en/articles/9854740), [Branch — deferred deep linking](https://www.branch.io/glossary/deferred-deep-linking/) **[OPINION/synthesis]**
- **Deferred deep links** route a not-yet-installed partner through the store and into the exact pairing on first open; Branch's **NativeLink** does this **on-device (clipboard), no PII** — fits Volyume's rules. [Branch iOS deferred linking](https://www.branch.io/resources/blog/how-to-set-up-deferred-deep-linking-on-ios/) **[OPINION/technical]**
- **Opt-in, self-chosen accountability beats imposed accountability long-term**; supportive social-norm nudges work but **backfire if framed as comparative pressure**. [Public Choice review](https://link.springer.com/article/10.1007/s11127-019-00684-6), [Behavioral Scientist](https://behavioralscientist.org/why-triggering-emotions-wont-lead-to-lasting-behavior-change/) **[review evidence]**

---

## 3. The mechanics worth borrowing (and the ones to refuse)

**Borrow — kind, cooperative, non-ranked:**
- **Duolingo Friend Streak** — a shared streak that advances only when **both** partners train; hung off your own streak object on the home screen (not a separate tab). [Duolingo — Friend Streak](https://blog.duolingo.com/friend-streak/) This is almost exactly Volyume's "shared weekly pact."
- **Duolingo Friends Quests** — one **combined progress bar** both partners feed (co-op, not head-to-head). The cooperative framing is the most transferable.
- **Gentler Streak** — **rest counts**, "Go Gentler" makes resting a rewarded choice, no broken-streak guilt; recaps are **private-by-default, non-comparative**. [MakeUseOf](https://www.makeuseof.com/gentler-streak-ios-app-help-improve-fitness/), [Gentler docs](https://docs.gentler.app/using-insights-and-recaps/understand-your-monthly-recap) This matches Volyume's rest-week-keeps-the-streak design.
- **Lightweight peer acknowledgement** — Strava kudos / Peloton high-fives / Apple ring notifications: a one-tap "nice work" is the re-engagement currency, not data comparison.

**Refuse — documented to backfire and against ED-safety rules:**
- **Guilt/shame notifications.** Duolingo's own product lead celebrated the "passive-aggressive reminder"; its pushes are widely called "emotional blackmail" (*"It looks like you've learned how to say 'quitter'…"*) — and commentary notes sustained guilt **backfires** commercially too. [Medium — guilt mechanics](https://medium.com/@Smyekh/how-duolingo-uses-ai-and-guilt-to-keep-you-learning-a-language-6ac3e11b3e44), [BusinessGhana](https://www.businessghana.com/site/news/technology/310891/Emotional-blackmail-How-Duolingo-manipulates-its-31-million-users)
- **Leaderboards / ranking partners** (WHOOP, Peloton, Strava segments) — quantified comparison is exactly the intersection Volyume's ED-safety stance forbids.
- **Partner-blame on a miss** ("you let your partner down") / severing the partner on a break (Duolingo removes the friend) — loss-aversion escalation. Avoid.
- **Contact-book upload** (Apple/Peloton/Garmin contact sync) — PII to external service; against Volyume's rules.

---

## 4. Recommended pattern for Volyume (grounded in the above)

1. **Placement — give it a visible, persistent home, not a settings row.**
   Best fit without adding a 6th bottom tab: a **fixed Training Partners card on the Home/Train screen** (the home dashboard), plus **contextually surface the partner's weekly "trained" signal after a workout is logged**, when accomplishment is top-of-mind (the Apple/Strava model of showing the signal where you already are). This follows the measured rule: primary feature → visible entry, never hidden. The current `You →` row can remain as a secondary entry, but it must not be the *only* one.

2. **Linking — one-tap invite link + QR, no PII.**
   Generate a **single-use invite link** shared via the **OS share sheet** (WhatsApp/Messages/etc.) — the Hevy/Strava model — plus a **QR code** for in-person pairing (you're often standing next to your training partner). Use a **deferred deep link** so a partner without the app installs and lands straight in the pairing. **No contact sync.** This stays inside Volyume's existing invite-token design (single-use, hashed token, `accept_*` RPC) and the no-PII rule.

3. **Shared signal — keep the minimal weekly pact, framed kindly.**
   The existing **Shared Weekly Pact** ("N sessions each this week") + **rest weeks keep the streak** + **"back this week"** reframe already matches the best-in-class kind pattern (Friend Streak mechanic + Gentler Streak framing). Display it as a **co-op signal** (both partners toward the shared pact), **never a ranking**.

4. **Re-engagement — opt-in, supportive, low-frequency.**
   One **one-tap acknowledgement** ("nice work" / a kudos-style nudge) and at most a **supportive** weekly nudge ("Your partner trained this week — you're in it together"). **No streak-loss threats, no guilt copy, no comparison.** All opt-in with user-controlled frequency.

---

## 5. Confidence & caveats
- support.apple.com, support.garmin.com, support.strava.com, support.onepeloton.com, blog.duolingo.com, gentler.app, NN/g and Branch primary pages all returned **HTTP 403** to direct fetch; navigation paths and figures come from **search-engine extracts of those official pages** plus reputable secondaries, cross-checked across sources. Paths are consistent across multiple references but were not re-read line-by-line on the live pages.
- **WHOOP invite-code length** (8 vs 10 digits) is inconsistent in WHOOP's own docs — unresolved.
- **Exact push-notification wording** for most apps could not be verified from official docs (the *existence* of the hooks is confirmed).
- Duolingo's **"22% more likely to complete"** is self-reported marketing. The **friend-removed-on-break** detail is fan-wiki-sourced (lower confidence).
- Branch's "≥100% lift" is **vendor self-reported**; referral conversion benchmarks come from eCommerce contexts and are directional only.
