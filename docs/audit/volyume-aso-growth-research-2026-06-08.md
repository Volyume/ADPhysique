# Volyume — Play Store ASO & growth research (2026-06-08)

Deep-research synthesis on Play Store keywords, listing optimisation, the Play
ranking algorithm, conversion, and user acquisition for Volyume (UK-first
workout tracker + food diary + coaching app for serious lifters and physique
athletes).

**Sourcing caveat:** most findings come from search-snippet summaries of ASO
vendor pages (AppTweak, MobileAction, Phiture, App Radar, Sensor Tower, ASO
World, etc.) because direct page fetches were largely blocked. The Android
vitals / DAU-MAU thresholds and the In-App Review API rules are
**Google-documented** (fetched directly). No tool returned real per-keyword UK
search volumes, so validate the final keyword set with AppTweak / Sensor Tower /
Mobile Action on a real **en-GB** Google Play profile before locking the title
and short description.

---

## 0. The strategic insight

The category is two separate keyword worlds:
- **Workout trackers** — Hevy, Strong, JEFIT own "workout tracker / gym log".
- **Macro / diet apps** — MacroFactor, Cronometer own "macro tracker / calorie counter".

Almost nobody convincingly owns **tracker + macros + coaching in one app**.
That intersection is Volyume's white space. Don't fight Hevy head-on for
"workout tracker"; own "the one app that does lifting, macros and coaching."

---

## 1. How Google Play keyword ranking works (method)

- **No hidden keyword field** (unlike Apple). Play indexes the visible text of
  three fields, in descending weight:
  | Field | Limit | Weight |
  |---|---|---|
  | App title / name | **30 chars** | Highest (first words weigh most) |
  | Short description | **80 chars** | High |
  | Long description | **4,000 chars** | Medium (first ~250-300 chars weigh most) |
  Review text is also indexed; developer name is a minor authority signal.
- **Repetition is allowed and mildly helpful** on Play (~1 exact-match per ~250
  chars). Write natural keyword-bearing prose, not a packed list. Stuffing now
  backfires under intent-based ranking.
- **Process:** seed terms → expand with Play autosuggest → mine competitor
  keywords for gaps → sanity-check demand in Google Keyword Planner → prioritise
  on volume × difficulty × relevancy → favour **long-tail** → iterate.
- **Tools:** AppTweak, Sensor Tower, Mobile Action, App Radar (paid);
  Play autosuggest + Google Keyword Planner + KeywordTool.io (free/cheap).
- **2025/26 shifts:** ranking moving from literal keyword match to **intent
  alignment**; AI-driven, personalised store surfaces (Google I/O 2025);
  Custom Store Listings + Gemini-generated listing variants in Play Console.
  Practical takeaway: state the **problem you solve**, clearly, so intent-based
  ranking and AI surfaces classify you correctly.

Sources: apptweak.com/en/aso-blog/play-store-keyword-research ·
mobileaction.co/blog/google-play-store-ranking-factors ·
phiture.com/asostack/google-play-store-keywords-how-to-find ·
appradar.com/academy/google-play-keywords-optimization ·
sensortower.com/blog/the-biggest-differences-between-google-play-and-apple-app-store-keyword-entry ·
revenuecat.com/blog/growth/google-play-store-ai-revamp-2025

---

## 2. The full keyword list (grouped by priority)

**Tier A — anchor head terms** (must appear in title / short description; you
won't rank #1 but you must be indexed):
`workout tracker` · `gym log` · `macro tracker` · `calorie counter`

**Tier B — winnable mid-tail** (long description + feature copy):
`weight lifting log` · `strength training` · `training log` · `workout planner` ·
`gym workout log` · `workout recorder` · `diet coach` · `nutrition targets` ·
`food diary` · `barcode scanner` · `progress tracking` · `exercise library`

**Tier C — niche identity** (own the audience):
`hypertrophy` · `physique` · `bodybuilding app` · `muscle growth` ·
`progressive overload` · `strength tracker` · `muscle building`

**Tier D — buyer-intent long-tail** (lowest competition, highest conversion;
generic free apps ignore these — this is the cheapest white space):
`bodybuilding coach app` · `online coaching app` · `physique coach` ·
`hypertrophy coach` · `weekly check in app` · `coaching check in` ·
`progress photos tracker` · `contest prep app` · `prep coach app` ·
`all in one fitness app` · `workout and macro tracker` ·
`training and nutrition app` · `macro coaching` · `personalised training plan` ·
`calorie targets` · `cardio and steps tracker`

**Tier E — UK localisation overlay** (separate en-GB listing; US competitors
don't contest these): British spellings (`personalised`, `programme`,
`analyse`) + unit terms (`kg`, `stone`, `bodyweight kg`).

**Competitor keyword ownership** (for gap analysis): Hevy/Strong/JEFIT = workout
tracker, gym log, exercise database, named programs (5x5, StrongLifts, PPL);
Boostcamp = workout programs + nSuns/GZCLP/5/3/1/PHUL/PHAT; Fitbod/Alpha
Progression = personalised/adaptive plan; RP Hypertrophy / MH Physique =
hypertrophy, physique, evidence-based; MacroFactor = adaptive macro tracker,
diet coach; Cronometer = micronutrient accuracy. The **coaching + check-in +
all-in-one** language is largely uncontested.

Sources: statista.com/statistics/1348754 (head terms fitness>workout>gym) ·
hevyapp.com · jefit.com · rpstrength.com/pages/hypertrophy-app ·
mennohenselmans.com/mh-physique-app · macrofactor.com ·
asotools.io/app-analytics/strength-training-gym-log-keyword-monitoring

---

## 3. The Play ranking algorithm (what actually decides visibility)

**Tier 1 — Google-DOCUMENTED quality gates** (breach a threshold and Play
"may reduce the visibility of your title"):
- **User loss rate (uninstalls over time) < 5%**
- **DAU/MAU ratio > 8%** (28-day window) — added to the ranking system early 2025
- **Crash rate < 1.09%** overall (Android vitals core vital)
- **ANR rate < 0.47%** overall
- **Excessive partial wake locks** start affecting visibility **1 March 2026**
- Google also weighs content/feature depth "compared to peers" — thinness vs
  category competitors is itself a signal.

**Tier 2 — practitioner-inferred** (vendor consensus, not Google-confirmed
numbers), by apparent weight: install **velocity** > total installs;
**retention / engagement** (the practitioner name for the DAU-MAU gate); ratings
score + count + sentiment + recency; keyword relevance (necessary, not
sufficient); update cadence; localisation; correct category.

**Featuring / LiveOps:** scale-gated (~1.6-2M MAU reported) — a *later* lever,
not a launch one. **Pre-registration** is the realistic pre-launch velocity play.
Target API 35 is required (since 31 Aug 2025) to stay discoverable on new devices.

**Bottom line:** keywords get you indexed; **retention and stability decide
whether Play shows you to more people.** First-month retention and review
velocity are acquisition inputs, not just product metrics.

Sources (Google-documented): developer.android.com/quality/core-value/user-metrics ·
developer.android.com/topic/performance/vitals ·
support.google.com/googleplay/android-developer/answer/11926878 ·
play.google.com/console/about/programs/promotionalcontent. Practitioner:
mobileaction.co · apptweak.com/en/aso-blog/google-play-ranking-factors ·
asoworld.com/blog/google-play-revamps-app-rankings-with-new-user-engagement-metrics

---

## 4. Listing conversion (views → installs)

- **Screenshots are the #1 lever.** ~70-90% never scroll past the third. First
  3 must be **benefit-captioned** (British English), portrait, value clear in
  ~2 seconds — not bare UI. Order by importance, not app flow.
- **Title + short description:** brand + one high-value keyword; one benefit +
  one keyword. No stuffing.
- **Feature graphic (1024×500):** centre the message, keep content off edges
  (it crops + becomes the video poster with a play button over the middle).
  Policy: no rankings/awards/prices/testimonials in it.
- **Store Listing Experiments** (free, in Play Console): A/B test **one element
  at a time**, ≥7 days. Order: icon → first-3 screenshots → title / short
  description. Good tests lift conversion ~10-25%.
- **Custom Store Listings:** up to 50 per app, targetable by country, **Play
  search keyword**, URL, or user state — show a tracker-led page to someone
  searching "gym tracker".
- **Ratings/reviews:** review *velocity* beats absolute score; a 0.5-star lift
  ~doubles conversion; <3.5 stars loses keyword visibility. Use the **In-App
  Review API** after a satisfying logged session — but you may NOT ask a
  qualifying question first ("do you like the app?"), NOT use a custom trigger
  button, and you can't detect if it showed. Respond to reviews (lowest-star
  first).
- **en-GB localised listing:** Play does not pool keyword indexing across
  locales, so a UK listing (British spelling + UK screenshot copy) is a free,
  on-brand win.

Sources: developer.android.com/guide/playcore/in-app-review (documented) ·
play.google.com/console/about/store-listing-experiments ·
support.google.com/googleplay/android-developer/answer/9867158 (custom listings) ·
asomobile.net/en/blog/screenshots-for-app-store-and-google-play-in-2025 ·
appfollow.io/blog/ratings-and-reviews-what-affects-your-conversion-rate

---

## 5. User-acquisition playbook (organic-first, indie UK budget)

1. **Founder-led short-form video** — TikTok-first, repurpose to Reels/Shorts.
   Highest-leverage free channel for fitness; captions/hashtags = search.
2. **Authentic Reddit** — r/Fitness, r/bodybuilding, r/naturalbodybuilding,
   r/leangains, r/gainit. Build credibility before mentioning the app; consider
   a **branded subreddit** (Caliber did this).
3. **Shareable progress / PR cards** with brand + download link (the Strava loop).
4. **Double-sided referral**, non-cash reward (extra free month / premium),
   hooked to challenges (Fitbit pattern).
5. **Pre-registration** (free) 3-6 weeks before a relaunch push — manufactures
   the install-velocity spike Play rewards.
6. **Micro-influencer / coach gifting** as a cheap creative-testing engine
   (micro reportedly out-ROIs macro) before any paid spend.
7. **Only then Google App Campaigns** — judged on **Cost per Subscription**
   (`CPI ÷ install→trial% ÷ trial→paid%`), not CPI. Don't scale until CPS < LTV.
   CPI benchmark ~£1.20-3.50-ish (UK likely below the US $1.50-4.50 range).

**The flywheel:** retention + review velocity → higher organic ranking →
cheaper acquisition → paid UA economics work. Build the loop before buying ads.
The notification-channel fix (re-engagement) feeds DAU/MAU directly.

Sources: businessofapps.com/ads/cpi/research/cost-per-install ·
airbridge.io/blog/cost-per-trial-cost-per-subscription (CPS metric) ·
stackinfluence.com/fitness-micro-influencer-case-study ·
appradar.com/academy/google-play-pre-registration · growsurf.com/examples/fitness-app-referral-programs

---

## 6. Prioritised action list for Volyume

1. **Fix the title** to ≤30 chars with a head keyword (it's currently 34). Test
   `Volyume: Workout Tracker` vs `Volyume: Gym & Macro Coach`.
2. **Rewrite the short description** around one benefit + keywords (replace "The
   intelligent bodybuilding logbook").
3. **Rewrite the long description** keyword-weighted, problem-first (draft in
   `PLAY_STORE_LISTING.md`).
4. **Stand up an en-GB localised listing** with British spelling + UK copy.
5. **Redo the first 3 screenshots** as benefit-captioned, value-in-2-seconds.
6. **Run Store Listing Experiments** (icon → screenshots → title), ≥7 days each.
7. **Protect retention + vitals** (crash <1.09%, ANR <0.47%, DAU/MAU >8%,
   uninstalls <5%) — this is the real ranking lever.
8. **Wire the In-App Review API** correctly (no qualifying question, fire after a
   logged milestone).
9. **Validate the keyword shortlist** on a real en-GB profile in AppTweak /
   Sensor Tower before locking title + short description.
10. Growth: founder short-form video + Reddit + shareable cards + referral +
    pre-registration before any paid UA.
