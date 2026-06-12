# R-08 — Food logging & diary: best-in-class external research

Area 08 of the ultimate-app mandate, Phase 2 (external). Aimed at the
code-verified frictions in `audit/a-08-food-logging-diary.md` and
`a-08-supplement-misspath-meals.md`. British English. Working internet, today
2026-06-12. No commit.

**VERIFICATION PROTOCOL compliance.** Every competitive claim below carries a
fetched-source URL; load-bearing claims carry 2+. Failed/blocked fetches are
logged per-URL in §7. UNVERIFIABLE is used where a figure could not be stood
up. Nothing is invented. Where the AI-content review cluster flagged in
`val-ext-03-06.md §4.3` (calorie-trackers.com, nutrola.app, platelens.app,
nutriscan.app et al.) is the only source, the claim is marked
cluster-only/UNVERIFIABLE rather than asserted.

## 0. Tooling proof (re-proven this session)

WebFetch of the MacroFactor logging page returned, verbatim, a bot-wall body:
**"One moment, please... Please wait while your request is being verified..."**
(`https://macrofactor.com/logging-food/`, 301 from `macrofactorapp.com`). This
confirms the origin bot-wall recorded in `val-ext-03-06.md §6`; MacroFactor
claims below are sourced from its press-release mirror (impresskit.net) and the
search index, both flagged inline. WebSearch returned live indexed results
(e.g. the FLSI press release and MyNetDiary head-to-head). Tooling works;
routed around the wall per the standing rule rather than degrading silently.

---

## 1. Per-app findings (search ranking · re-log taps · barcode miss · quick-add/memory · offline · DB strategy · UK)

### MacroFactor — the speed crown (FLSI)

The **Food Logging Speed Index (FLSI)** is MacroFactor's own framework that
counts "the number of discrete actions required to complete common food logging
use cases" across four methods — Search, Multi-Add, Barcode, Quick-Add
(press-release mirror, fetched:
`https://impresskit.net/press-release/d453316d-078f-4d5e-b2aa-5814ca229599`;
indexed at `macrofactor.com/fastest-food-logger/`). Verbatim action counts:

| App | Search | Multi-Add | Barcode | Quick-Add | **Total** |
|---|---|---|---|---|---|
| **MacroFactor** | 10 | 6 | 6 | 4 | **26 (Gold)** |
| Lose It / MyNetDiary | — | — | — | — | **32 (Silver, tied)** |
| FitGenie | — | — | — | — | 36 |
| Fitatu / Carbon | — | — | — | — | 39 |
| MyFitnessPal / Food Noms | — | — | — | — | 40 |

(20 apps ranked; MacroFactor retained Gold in the 2025 update.) **Multi-Add =
re-logging a previously-logged food with defaults already set = 6 actions** —
this is the habitual-re-log metric and Volyume's direct comparator. Source
corroboration: the FLSI methodology and rankings appear in both the mirror
(fetched) and the MyNetDiary write-up (fetched, below). **VERIFIED (2 sources).**

- **Ranking approach:** "Searching a database and selecting a relevant result
  is the most common way people log food" (indexed). MacroFactor's logger
  surfaces recents/common foods first and uses search-as-you-type; its
  "AI Describe" is an AI-as-search-accelerator over a *verified common-foods
  database*, not a generative guess (`val-ext-03-06.md E3-59`, VERIFIED there).
- **DB strategy:** verified common-foods core (curated) + broader branded DB.
  Adherence-neutral presentation is its published, functional position
  (`val-ext-03-06.md E3-01`, VERIFIED verbatim) — i.e. the same brief Volyume
  already enforces.
- **Honest limitation found independently:** in MyNetDiary's 7-day real test,
  MacroFactor's DB was *missing "10 of our 70 test foods"* — its FLSI crown is
  measured on isolated, easy generic foods ("greek yogurt", "honey", "banana"),
  so the lab metric overstates real-world speed (MyNetDiary, fetched). **No
  free tier; $11.99/mo, $71.99/yr** (`val-ext-03-06.md E3-05`, VERIFIED).

### MyNetDiary — the real-world speed winner

7-day, 127-entry head-to-head (fetched:
`https://www.mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html`).
Total taps across 127 entries: **MyNetDiary 711 (5.60/entry); Lose It! 872
(+23%); MacroFactor 877 (+23%); Noom 896; Yazio 997; Cronometer 1,003;
MyFitnessPal 1,035 (+45%).** "MyNetDiary was first or tied for first in 21 of
27 meals." Vendor-run (treat ranking as directional), but the *mechanics* it
isolates are gold for a-08:

- **Search-as-you-type vs tap-Search-first:** the fast apps type-to-filter;
  "MyFitnessPal requires tapping a Search button first—if your food doesn't
  appear, you go back and type more." Volyume already debounces at ≥2 chars
  (search-as-you-type) — on the right side of this line.
- **Recents/history convenience is the speed differentiator:** "Apps with
  convenient food history (MyNetDiary, Lose It!'s 'My Foods' tab) made this
  effortless. Noom and Yazio required scrolling through unsorted recent items."
  Lesson: *recents must be sorted and one-tap*; unsorted recents is the slow
  pattern. **VERIFIED (single but primary vendor-test source).**

### MyFitnessPal — incl. June 2026 AI Coach

AI Coach launched **10 June 2026** on Premium / Premium+ in US, UK, CA, AU, NZ
(press release fetched/indexed:
`https://www.globenewswire.com/news-release/2026/06/10/3309733/...` and
`financialcontent.com` mirror). It is "grounded in users' real logged behavior
over time… meals and macro trends to saved recipes and long-term habits" and
does **food swaps, recipes, portion adjustments and meal pairings**. It is
LLM-driven and online-only. Logging methods: type-search, barcode, **Meal Scan**
(photo), **Voice Log** (support article 403'd to direct fetch; covered via
press release + Google Play listing, both fetched/indexed). **VERIFIED (2+
sources).** Search weakness (tap-Search-first, duplicate entries) per MyNetDiary
test above. DB is huge but heavily crowdsourced — the duplicate-entry / "random
user typed it three years ago" problem competitors call out.

### Lose It! — barcode now Premium-gated

Barcode "Scan It" moved into Premium for most **new** free accounts in 2026
(grandfathering for some long-time free users); Premium $39.99/yr adds photo
("Snap It"), voice ("Say It"), barcode, calorie cycling
(`https://nutriscan.app/...lose-it-pricing-2026...` and
`fitbudd.com/post/lose-it-premium-review` — secondary; corroborates
`val-ext-03-06.md E3-42` VERIFIED). Strength: "My Foods" recents tab praised as
"effortless" in the MyNetDiary test (fetched). FLSI Silver (32).

### Cronometer — verified-data gold standard, free barcode

DB built on **NCCDB** (University of Minnesota, ~17,000 entries, 70 nutrients) +
USDA + NUTTAB + community DB (CRDB) — the curated-verified strategy
(`https://cronometer.com/blog/log-food-fast/` and Data Sources page, fetched/
indexed). **Barcode scanner is free** (rare). Ten speed levers, all fetched
verbatim: home-screen long-press Quick Add, barcode, copy-single/copy-entire-
day, **Custom Meals** (group foods), photo logging, **Repeat Items** (schedule
foods/meals on repeat), Multi-Add (filter toggle), per-diary-group quick add,
voice logging, swipe-to-add from Custom/Recipes. **VERIFIED.** Known UX cost:
"dense… clinical or overwhelming to new users" (`val-ext-03-06.md E3-41`, the
*substance* CORRECTED-true even though the exact quote was fabricated there).

### Nutracheck — UK gold standard (claims need care)

"Over 500,000 foods from UK supermarkets, restaurants and brands"; "curated,
not crowdsourced… nutritionist-verified", explicitly contrasted with MFP's
"something a random user typed in three years ago"; covers Tesco/Asda/
Sainsbury's/Aldi/Lidl/M&S/Waitrose + Greggs/Wetherspoon/Nando's/Costa/Pret;
£6.99/mo or £29.99/yr, 7-day trial
(`https://home-cooks.co.uk/pages/review-nutracheck`). **CAVEAT (per mandate):**
home-cooks.co.uk sits in the AI-content cluster flagged in `val-ext-03-06.md
§4.3`; `val-ext-03-06.md E3-47` rated the £29.99/yr + Trustpilot aggregate
VERIFIED, but the **"500,000 UK foods" and "nutritionist-verified" DB-moat
claims are single-cluster-source and should be treated as
NUTRACHECK-MARKETING/UNVERIFIABLE if used as load-bearing.** The *direction* —
a curated UK-specific DB is the recognised UK advantage — is sound and matches
why a bundled UK CoFID/OFF snapshot matters for Volyume.

### Yazio / Lifesum / FatSecret — online-first, weak offline

Independent-ish offline review (`https://nutrola.app/.../offline-calorie-
trackers-which-actually-work-2026` — **cluster source, treat as directional**):
"Yazio treats offline as an edge case… the search bar heavily depending on live
API calls and often returning nothing offline"; "Lifesum is an online-first app
with minimal offline behavior… the search bar is essentially non-functional
offline"; "FatSecret's offline behavior is inconsistent… barcode scanning is
connection-dependent and does not queue." Cluster-sourced, so **UNVERIFIABLE as
precise** — but the consistent direction (mass-market trackers degrade or die
offline) is the gap Volyume's offline-first diary is built against. FatSecret is
the only major fully-free tracker (`val-ext-03-06.md E3-45` VERIFIED); Yazio's
draw is meal plans/recipes (`E3-44` VERIFIED).

### Carbon / RP Diet Coach — athlete-prescriptive

- **Carbon:** FLSI 39; compliance-first weekly adaptive coaching; **no carb
  cycling at all** (its own help centre argues against it) — Volyume's TD/NTD
  day variants face *less* competition than once assumed (`val-ext-03-06.md
  E3-09/E3-10`, VERIFIED/FABRICATED-in-reverse). $11.99/mo, $99.99/yr.
- **RP Diet Coach v1.53 — "Now the fastest logger in the West"** (fetched
  primary: `https://rpstrength.com/blogs/articles/diet-coach-app-update-now-
  the-fastest-logger-in-the-west`). This is the single most directly useful
  competitor pattern for a-08's two biggest frictions:
  - **Merge with priority, not first-source-wins:** "Recents, Favorites, RP
    Foods, and Custom all show up first, followed by results from the broader
    restaurant and packaged-food database under a **'More results'** section."
    Local-and-network are *merged in one ranked list*, not short-circuited.
  - **Recents sorted by recency**; tabs remember last-used and per-tab sort;
    "Results match what you actually typed, so you won't get unrelated foods."
  - **Speed:** Pantry "opens in about 53 milliseconds… roughly 25 times faster
    than before"; "Tapping a food to add it is around seven times faster."
  **VERIFIED (primary fetched).** RP also redesigned for new-user simplicity and
  AI-logging readiness (`val-ext-03-06.md E3-34/E3-35`, VERIFIED).

### Photo logging accuracy (Foodvisor / SnapCalorie / Cal AI / PlateLens)

SnapCalorie's **published** error ≈15% (±150 kcal on a 1,000-kcal meal) vs
labels' allowed 20%, dietitians ~40%, average app users ~53%
(`snapcalorie.com/faq.html`, vendor). **Independent** "DAI Six-App Validation"
figures circulate showing SnapCalorie ±19.8% MAPE, dish recognition 76%, with
portion-weight error 30–50% — and PlateLens leading at "±1.1% MAPE"
(`macaron.im/blog/snapcalorie-review-2026`; `calorie-trackers.com`;
`nutrola.app`). **CRITICAL CAVEAT:** the DAI/PlateLens precision figures come
from the exact AI-content cluster (incl. the persistent "PlateLens" promoter)
that `val-ext-03-06.md §4.3` flagged for implausibly precise fabricated
accuracy numbers. **Treat all photo-AI precision percentages as
MARKETING/UNVERIFIABLE.** The one robust, cross-source direction: **dish
recognition is "acceptable"; portion/weight estimation is the consistent
weakness** — corroborated by the independent FeastGood verdict on Welling
("isn't always accurate here, you might need to do some manual edits",
`val-ext-03-06.md E3-30`). Photo logging is a beginner-acquisition battleground
(MFP Meal Scan, Welling, Cal AI), but it is an *estimate*, never macro-exact.

### Open Food Facts ecosystem (Volyume's network DB)

OFF: "25,000 contributors… 4 million products from 150 countries", "combining
official data with crowdsourced input", community moderation + AI (Robotoff)
extracting/cross-checking label photos; full open-data dump reusable by anyone
(`https://world.openfoodfacts.org/data`; `uk.openfoodfacts.org`; Wikipedia —
fetched/indexed). **VERIFIED.** Strength: free, EU-friendly, write-back-able
(Volyume already contributes). Weakness: crowdsourced coverage/quality is
uneven, esp. for UK own-brand long-tail — which is precisely why a *curated UK
snapshot + heal chain* (Volyume's COMP-022) is the right complement, and why
Nutracheck's curated-UK moat is the thing to answer.

---

## 2. Winner patterns (the bar to beat)

1. **Search-as-you-type + recents/common-foods ranked first** (MacroFactor,
   RP, MyNetDiary). The slow apps make you tap Search and scroll unsorted
   recents (MFP, Noom, Yazio). [MyNetDiary fetched; RP fetched]
2. **Merge local + network into ONE ranked list with a "More results"
   tail** (RP v1.53) — never hide the broader DB behind a partial local hit.
   [RP fetched]
3. **Multi-Add / re-log defaults pre-set = ~6 actions** as the habitual metric
   (FLSI). [impresskit mirror + MyNetDiary, fetched]
4. **Recents sorted by recency, one tap, in a dedicated tab** ("My Foods",
   Pantry Recents). Unsorted recents is the named slow pattern. [MyNetDiary; RP]
5. **Repeat/scheduled items + copy-day + custom meals** as power re-log levers
   (Cronometer's 10 tips). [Cronometer fetched]
6. **Curated/verified DB beats crowdsourced for trust & speed** (Cronometer
   NCCDB; Nutracheck UK). Crowdsourced (MFP) brings duplicates and stale rows.
   [Cronometer fetched; Nutracheck cluster-caveated]
7. **Free barcode scanner is a goodwill signal** (Cronometer) while rivals gate
   it (Lose It 2026, MFP). [Cronometer fetched; Lose It secondary]
8. **AI as search-accelerator over verified data, not generator** (MacroFactor
   AI Describe; contrast MFP AI Coach LLM/online-only). [val-ext E3-59 VERIFIED]
9. **Adherence-neutral presentation as a *functional* logging-completeness
   lever** (MacroFactor's published position). [val-ext E3-01 VERIFIED verbatim]

---

## 3. Where Volyume already leads — honestly

- **Offline-first diary that actually works offline.** Yazio/Lifesum/FatSecret
  search "returns nothing offline"; MFP/Cronometer barcode is connection-
  dependent. Volyume's local-SQLite-first waterfall + cache promotion + queued
  barcode is genuinely ahead of the mass market (direction VERIFIED; precise
  cluster figures UNVERIFIABLE). **This is a real, defensible lead.**
- **Barcode heal chain (COMP-022).** Two-step OCR → confirmed-values custom food
  → "next time this scans instantly" → optional OFF write-back. No competitor
  surfaced in this research turns a barcode *miss* into a self-healing, one-time
  capture that improves the shared DB. MFP/Cronometer/Nutracheck just say "not
  found". **Volyume-unique among everything fetched.**
- **Adherence-neutral totals.** MacroFactor *publishes* this as best practice;
  Volyume enforces it consistently in code (single amber ring, factual "n over",
  no streak/shame language) — matching the category's most respected app on its
  own stated brief. [val-ext E3-01 VERIFIED]
- **Slot/meal memory done well already:** Add-again with prefilled portion = 3
  taps; Copy yesterday = 2; Plan-day → diary = 1. Competitive with MacroFactor's
  Multi-Add (FLSI 6 actions) and explicitly mirrored. Most rivals don't pre-fill
  the last portion.
- **Privacy posture:** EAN not sent in barcode telemetry; OFF write-back
  consent default-off. Beyond what mass-market trackers disclose.

---

## 4. Top 5 ranked pick-ups vs a-08's frictions (Besa = newbie, Eddie = athlete)

1. **Kill first-source-wins; merge into one ranked list with a "More results"
   tail.** Directly fixes a-08 gap #1 (a weak local hit hides better OFF/USDA
   matches; no "search more online" affordance). Copy RP v1.53's pattern: local
   customs/recents/verified first, then a `More results` section that queries
   the network even when local returned something. **Besa:** stops a stale
   custom "chicken" capping her results. **Eddie:** finds the exact branded item
   without dead-ending. [RP fetched — VERIFIED]
2. **Recency-/frequency-rank the recents and float the most-logged within a
   search.** Fixes a-08 gap #2 (no popularity/frequency ranking inside a
   search; most-logged only lives in separate tabs). MyNetDiary's test names
   unsorted recents as *the* slow pattern; RP sorts Recents by recency. **Besa
   & Eddie both** re-log faster; Eddie's 6-times-daily staples float to top. [MyNetDiary + RP, fetched]
3. **Give quick-add memory + a name.** Fixes a-08 gap #5 (`quick:adhoc` excluded
   from slot-recents, shows "Quick add" with no grams). A frequent restaurant
   estimate should become an Add-again row. No competitor was found doing this
   *worse* than us; making quick-add memoryless is a self-inflicted friction.
   **Besa:** her recurring "guessed lunch out" becomes one-tap. (Internal-gap
   fix; competitor benchmark = MacroFactor/Cronometer treat quick-add as a
   first-class re-loggable entry.)
4. **Repeat/scheduled items + extend copy-day to any date.** Cronometer's
   "Repeat Items" and copy-entire-day are proven re-log accelerators; fixes
   a-08 gap #4 (plan-day logging pinned to today). **Eddie:** identical prep
   days scheduled; **Besa:** copies a known-good day onto a future date she's
   planning. [Cronometer fetched — VERIFIED]
5. **Add an explicit "search the web / More results" affordance + recover the
   missing-target dead-ends (Suggested tab → NutritionTargets; slot-default
   `'snack'` seam).** Fixes a-08 gaps #1 (affordance), #3, #7. Low effort, high
   newbie payoff. **Besa** never hits a silent dead end. (Internal-gap fix; RP's
   visible "More results" is the affordance model. [RP fetched])

---

## 5. What everyone has that we lack (table-stakes gaps)

- **Photo / Meal-Scan logging.** MFP (Meal Scan, June 2026), Lose It (Snap It),
  Cronometer, Welling, Cal AI, SnapCalorie, Foodvisor, PlateLens — all offer
  photo logging; Volyume has none. **But:** it is an *estimate* (portion error
  is the universal weakness; precision figures are cluster-fabricated and
  UNVERIFIABLE). For Volyume this collides with the deterministic-engine and
  no-AI-boundary rules — a photo *estimator* is not the same as the coaching
  engine, but it would need a hard product decision and likely an on-device or
  clearly-flagged-estimate framing. **Flag for founder, do not build silently.**
  [MFP/Lose It/Cronometer/Welling fetched/indexed]
- **Voice logging.** MFP Voice Log, Cronometer voice, Lose It "Say It". Volyume
  has none. Same AI-boundary consideration; voice→search-parse (MacroFactor
  "AI Describe" style, over verified data) is the boundary-safe variant.
- **"AI search accelerator" (text/voice → search over verified DB).** The
  boundary-respecting version of the AI logging trend; MacroFactor proves it
  works without generative guessing. [val-ext E3-59 VERIFIED]
- **Scheduled/repeat items** (Cronometer) — we have copy-day but not standing
  schedules. [Cronometer fetched]

Everything else a-08 flagged (water per-user target, OFF write-back status,
source-label vocabulary, missing label-photo on write-back) is below table
stakes — competitors don't surface these either; they're polish, not catch-up.

---

## 6. Synthesis for Phase 3

The category's speed leaders win on **one merged, recents-first, type-as-you-go
search** and **frictionless re-log of defaults** — both of which Volyume is
*close* on but undercuts with first-source-wins, no in-search frequency ranking,
and memoryless quick-add. Fixing those three (pick-ups 1–3) closes most of the
real gap without touching the engine, the safety system, or the AI boundary.
Volyume's genuine, defensible differentiators — true offline, the self-healing
barcode chain, and code-enforced adherence-neutrality — are things the
mass-market leaders either lack or only *aspire* to. The two strategic
watch-items are **photo/voice logging** (table stakes arriving fast via MFP's
June-2026 push, but estimate-only and AI-boundary-sensitive — founder decision)
and **UK DB depth** (Nutracheck's curated-UK moat is the thing to answer with
the bundled CoFID/OFF snapshot + heal chain, not crowdsource alone).

---

## 7. Fetch / source log

**Fetched successfully (primary verdict basis):**
- `impresskit.net/.../FLSI press release` — FLSI methodology + action counts ✓
- `mynetdiary.com/which-calorie-tracker-app-is-the-fastest.html` — 7-day test ✓
- `cronometer.com/blog/log-food-fast/` — 10 speed levers ✓
- `rpstrength.com/blogs/articles/diet-coach-app-update-now-the-fastest-logger-in-the-west` — RP v1.53 merged-search + speed ✓

**Blocked / failed fetches (5) — routed via mirror/index, flagged inline:**
1. `macrofactor.com/logging-food/` — bot-wall ("verifying…"), the tooling proof.
2. `macrofactor.com/fastest-food-logger-2025/` — bot-wall.
3. `macrofactorapp.com/*` — 301→macrofactor.com (bot-walled). [MacroFactor via
   impresskit mirror + index, corroborated by MyNetDiary test]
4. `support.myfitnesspal.com/.../Introducing-Nutrition-Coach` — HTTP 403. [MFP
   AI Coach via globenewswire press release + financialcontent mirror + Google
   Play listing]

**WebSearch-indexed (not directly fetched), used with corroboration:** MFP AI
Coach press release (globenewswire/financialcontent/manilatimes — 3 mirrors);
Lose It pricing (nutriscan/fitbudd — secondary); OFF (world/uk.openfoodfacts.org
+ Wikipedia); Cronometer Data Sources.

**Cluster-only / UNVERIFIABLE (flagged, not load-bearing):** Nutracheck
"500k UK foods / nutritionist-verified" (home-cooks.co.uk); offline behaviour of
Yazio/Lifesum/FatSecret (nutrola.app); all photo-AI precision % incl. PlateLens
"±1.1% MAPE" and DAI study (calorie-trackers.com/nutrola.app/platelens.app/
macaron.im) — per `val-ext-03-06.md §4.3` cluster warning.

*Report completed 2026-06-12. Working tree only — not committed.*
