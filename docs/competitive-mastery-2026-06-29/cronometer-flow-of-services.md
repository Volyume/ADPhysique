# Cronometer — Flow of Services (daily-loop mastery)

Competitive teardown for VOLYUME. Goal: pinpoint, in taps and screens, **why
Cronometer's daily food-logging loop feels "very easy"** (founder uses it every
day), so VOLYUME can match it.

**Sources & honesty.** Cronometer is a decompiled Flutter app — code is
OBFUSCATED, so signal comes from string constants, Dart package paths, route
names and the Android manifest, NOT from readable logic. Every claim below is
tagged **[CONFIRMED]** (a literal string / route / manifest entry is quoted) or
**[INFERRED]** (reconstructed from those strings + how the standard Cronometer
product is known to behave). Where the flow genuinely can't be reconstructed
from strings, it says **[CANNOT CONFIRM]**. VOLYUME claims cite real source.

Source files used:
- `scratchpad/libapp_strings.txt` (1.7M Flutter string dump; line numbers cited)
- `scratchpad/cronometer/corpus/AndroidManifest.xml`
- VOLYUME: `src/screens/DiaryScreen.js`, `src/screens/FoodSearchScreen.js`,
  `src/components/food/MacroRings.js`, `src/navigation/RootNavigator.js`

---

## 1. Onboarding / first-run funnel (Cronometer)

Evidence is thinner here than for the diary (onboarding strings are sparse in
the dump), so this section leans **[INFERRED]** and flags gaps.

- **Single-activity Flutter app.** `MainActivity` is the only launcher
  activity; `flutter_deeplinking_enabled=false` — all routing is internal to
  Flutter, not Android intents. **[CONFIRMED]** (manifest).
- **Account / auth.** Strings show email/password plus **Facebook** and
  **Google** sign-in SDKs (`com.facebook.*`, `gms.auth.api.signin.*` in
  manifest; `canSubmitEmail` at libapp:44918). So the funnel is: create
  account (email or social) → profile → goal. **[INFERRED]**
- **Progressive onboarding, not a long wizard.** `show_progressive_onboarding`
  / `showProgressiveOnboarding` (libapp:8635, 33263, 48687) and
  `OnboardingSlide` (libapp:57712) indicate Cronometer drips guidance over the
  first sessions rather than gating entry behind a long setup. **[CONFIRMED]
  strings; [INFERRED] behaviour.**
- **"Complete your profile" is deferred, surfaced from the diary.**
  `diary/complete_profile_popup.dart` and `diary/email_validation_popup.dart`
  (libapp:14786, 25741) — profile completion and email validation are nudged
  **from inside the diary**, i.e. the user reaches the working diary first and
  finishes setup later. This is a key "time-to-first-value" choice. **[CONFIRMED]
  (package paths).**
- **First diary coach-mark.** `Tap the + button to add to your Diary`
  (libapp:38450) is the one explicit onboarding tooltip in the dump — it points
  the brand-new user straight at the add-food affordance. **[CONFIRMED].**
- **Goal/targets wizard wording.** **[CANNOT CONFIRM]** from strings — no
  "Lose weight / Gain / Maintain / activity level" copy surfaced. The standard
  Cronometer flow asks sex/height/weight/activity/goal, but the dump doesn't
  prove the exact screens, so it is not reconstructed here.

**Net read:** the funnel is built to get the user to a usable diary fast and
defer the rest (profile-completion + email-validation popups live in the diary,
not before it). **Time-to-first-value is short: account → land on `/diary` →
"Tap +".**

---

## 2. THE DAILY LOOP — add-food tap counts (KEY SECTION)

### App-open → today → ready to log

- **Cronometer opens directly on the diary.** The launch/landing route is
  `{"route": "/diary"}` (libapp:31832; also `/diary` at 16609 and
  `landingPageBackground` at 17528). The diary IS the home screen. Today is the
  default day (calendar header `diary/diary_calendar_header.dart`,
  `calendar_single_day.dart`). **[CONFIRMED].**
- So **app-open → today's diary = 0 navigational taps.** The user is already
  looking at today's food and targets the instant the app paints. **[CONFIRMED].**

### The single add-food entry point: the **`+` button**

The diary has one primary action: a `+` that opens a **plus-menu** of log types.
Confirmed menu items (each a `plusMenu*` string):

| Plus-menu item | String (libapp) |
|---|---|
| Food | `plusMenuFood` (20243, 37958) |
| Barcode | `plusMenuBarcode` (38723) |
| Voice log | `plusMenuVoiceLog` (50510) |
| Photo log (AI) | `plusMenuPhotoLog` (6247) |
| Suggest | `plusMenuSuggest` (36957) |
| Note | `plusMenuNote` (59653) |
| Exercise | `plusMenuExercise` (62068) |
| Biometric | `plusMenuBiometric` (50705) |
| Fast (fasting) | `plusMenuFast` (47270) |

**[CONFIRMED]** (all literal strings). The onboarding tooltip "Tap the + button
to add to your Diary" (38450) confirms `+` is THE add entry point.

### Tap counts per add-food path

Counts are **screen-transition taps** to get a food into today's diary. "Set
amount" = optional; the serving editor pre-fills a default serving, so a user
who accepts it skips that tap (`You can adjust the serving size here`,
libapp:17460). All **[INFERRED]** from the strings naming each step unless a
literal button label is cited.

| Path | Tap-by-tap | Taps to logged |
|---|---|---|
| **Search a new food** | `+` → **Food** → type query → tap result (`food_search/search/food_search.dart`, 59792) → serving editor → **Add to Diary** (`Add to Diary`, 25820; `/moveDiary`, 59460) | **~4 + typing** |
| **Recents re-log** | `+` → **Food** → results default-sorted recents-first (`prioritizeRecentlyLogged`, 24297; `SortByHelper.getForRecents`, 7326) → tap recent → **Add to Diary** | **~3** (no typing) |
| **Favourites re-log** | `+` → **Food** → Favourites filter (`Favorites`/`Add to Favorites`, 34382/44926; `prioritizeMyFavorites`, 44155) → tap → **Add to Diary** | **~3** |
| **Most Frequent** | `+` → **Food** → "Most Frequent" list (`Most Frequent`, 32127) → tap → **Add to Diary** | **~3** |
| **Barcode** | `+` → **Barcode** → camera auto-detects → serving editor → **Add to Diary** (`diary/diary_barcode_handler.dart`, 16525) | **~2 + scan** |
| **Custom food** | `+` → **Food** → **Custom Foods** (18748, 32281) / create → fill macros → save → add | **many (rare path)** |
| **Copy a whole day** | diary 3-dot menu → **Copy Previous Day** / **Copy Current Day** (38173, 10853; `diary_header_three_dot_menu.dart`, 24348) | **~2 → whole day** |
| **Multi-add (batch)** | toggle **Enable Multi-Add** (10630) → tap several foods → each drops in without leaving search | **1 toggle + 1/food** |
| **Repeat / favourite-days** | a saved item set to repeat auto-appears with a **`repeat_diary_item_banner`** (16493) the user one-taps to confirm | **~1** |

**The crux of "easy": the fastest everyday path is ~3 taps with zero typing**
(`+` → Food → tap a recent/favourite → it logs at a remembered serving). Search
results are **recents/favourites-first** (`prioritizeRecentlyLogged`,
`prioritizeMyFavorites`), so even a "search" usually needs no query — the food
you eat every day is at the top before you type. **[CONFIRMED sort behaviour;
INFERRED tap count.]**

Two extra accelerators VOLYUME lacks: **voice log** and **AI photo log**
(`plusMenuVoiceLog`, `plusMenuPhotoLog`) collapse the loop to "speak it" /
"photograph it". Treated below under gaps.

---

## 3. What makes the diary glanceable

Cronometer's at-a-glance layer is the **Energy Summary** + per-nutrient
remaining bars, all on the landing `/diary`:

- **Energy Summary header** (`macro_header_view.dart`, 24109; `Energy Summary`,
  31618; `Show Energy Summary`, 18415): **Consumed / Burned / Remaining**, with
  a **user-configurable 3rd circle** (`Select your display preference for the
  3rd circle in the Energy Summary`, 17557). **[CONFIRMED].**
- **"Remaining" is the headline number** — `Remaining`, `getRemainingKcals`,
  `DashboardRemaining`, `_consumedRemaining` (27060, 8077, 14852, 17750). Eat
  food → the remaining number ticks down. The whole diary answers one question:
  *how much have I got left today?* **[CONFIRMED].**
- **Per-nutrient fill bars with remaining** (`NutrientTargetFillBarRemaining`,
  19015; `Target (Net Carbs)`, 20189) — every tracked nutrient shows
  eaten-vs-target as a bar, not just macros. **[CONFIRMED].**
- **Diary entries are grouped** (`diary_list_header.dart`, `diaryGroup*`,
  `_buildGroupRow`, 18530; e.g. Breakfast/Lunch/Dinner or custom groups) with a
  macro sub-total per group. **[CONFIRMED].**
- **Home-screen widget**: a **"Remaining" Glance widget** (small + large,
  `HomeWidgetRemainingSmallProvider`/`...LargeProvider`, 15470/32780;
  `RemainingGlanceWidgetReceiverSmall`, 5936) puts the remaining number on the
  Android home screen — glanceable without opening the app. **[CONFIRMED].**

**Net read:** one persistent, configurable "Remaining" headline + per-nutrient
remaining bars, always on the screen you open into. Nothing to navigate to.

---

## 4. VOLYUME's equivalent today (post-merge state)

File-referenced, current `main`.

**App-open landing.** VOLYUME's first/default tab is **"Train"** (`HomeTab`,
title `'Train'`, `RootNavigator.js:459`) — a workout home (`HomeScreen.js`
imports `getActivePlan`, `TodayStrip`, session cards). The **food diary is a
separate third tab** (`DiaryTab`, `RootNavigator.js:461`) and is **Pro-gated**
(`GatedDiary = withProGuard(DiaryScreen, 'Food diary')`, line 160).
→ **App-open does NOT land on today's food.** Reaching today's diary =
**1 tap** (tap the Diary tab), vs Cronometer's **0**.

**Daily-loop tap counts** (`DiaryScreen.js` + `FoodSearchScreen.js`):

| Path | Tap-by-tap (VOLYUME) | Taps to logged |
|---|---|---|
| Open today's diary | tap **Diary tab** (already today, `selectedDate` defaults to today, `DiaryScreen.js:71`) | **1** |
| Add a searched food | meal card **+** → `navigate('FoodSearch')` (`addFood`, 361-365) → type → tap result → **FoodDetailSheet** serving picker → save (`confirmLog`, 436) | **~4 + typing** |
| **Recents re-log (NEW)** | meal **+** → FoodSearch opens on **Recents** tab → **one tap on a row logs it** at remembered portion (`quickLogRelog`, 311-352; `RELOG_TABS`, 66) | **~2** (no sheet, no typing) |
| Favourites / Frequents re-log (NEW) | meal **+** → tap Favourites/Frequents tab → one-tap row log | **~3** |
| Barcode | Diary **scan FAB** (`scanFab`, 900-908) → camera → sheet → save | **~2 + scan** |
| Quick add (no food) | meal card flash icon → `QuickAddSheet` → save (`confirmQuickAdd`, 374) | **~2** |
| Multi-add "plate" | FoodSearch: tap each row's **+** to build a plate → **Log N** (`addToPlate`/`logPlate`, 283/357) | **1/food + 1** |
| Copy yesterday | empty-state CTA `Copy yesterday` (`copyYesterday`, 634) or copy-day picker icon (`openCopyPicker`, 654) | **~2 → whole day** |

**At-a-glance.** `MacroRings.js` is strong and arguably richer than
Cronometer's: a **kcal ring with a "remaining" / "over" readout**
(`kcalRemaining`, lines 273-282), **protein/carbs/fat/fibre bars** with
"Ng to go" remaining (94-128), a **%-of-calories split** (299-304), planned-food
overlay, and protein g/kg. It lives on the Diary tab (`DiaryScreen.js:711`).
**But it is one tab away, not on the app's landing screen**, and there is **no
home-screen widget** equivalent to Cronometer's "Remaining" Glance widget.

**Deeplinks/routes.** VOLYUME has `volyume://diary` → Diary tab
(`RootNavigator.js:563-567`), but FoodSearch/add-food is **not** deep-linkable;
Cronometer's add flow is internal too, but its `+` is one tap from the always-on
landing diary.

---

## 5. Gaps where Cronometer's loop is easier (ranked)

1. **App opens on the food diary; VOLYUME opens on Train.** Cronometer = 0 taps
   to today's food + targets; VOLYUME = 1 tap (Diary tab) and only after Pro.
   For a daily food logger this is the single biggest "feels easy" difference.
   **[GATED]** — VOLYUME's home is deliberately training-first and the diary is
   Pro; a forced diary-home would break Free/Pro and the app's identity. A
   *configurable* default tab, or a Today food summary surfaced on Home for Pro
   users, is the safe shape. (Tag GATED.)
2. **Recents/favourites-first so logging needs no typing.** Cronometer
   default-sorts results recents/favourites-first (`prioritizeRecentlyLogged`,
   `prioritizeMyFavorites`). VOLYUME now has one-tap re-log tabs (just merged)
   but **search still opens on the Recents tab with an empty query** — good —
   yet a *live search* (2+ chars) is not recents-weighted. **[SAFE-TO-BUILD]** —
   weight live-search results by the user's own logged foods.
3. **Persistent "Remaining" home-screen widget.** Cronometer surfaces remaining
   kcal on the OS home screen (Glance widget). VOLYUME has none. **[GATED]** —
   a widget showing calorie targets is a Pro nutrition surface; also touches
   ED-safety (a remaining-calorie number on the home screen is exactly the
   colour/deficit-salience pattern the adherence-neutral brief guards). Founder
   decision required. (Tag GATED.)
4. **Voice log + AI photo log** (`plusMenuVoiceLog`, `plusMenuPhotoLog`)
   collapse the loop to one action. **[GATED]** — AI photo log would breach the
   "no AI / deterministic" rule and "no PII to external services"; voice log via
   on-device dictation is less clear-cut. Founder decision. (Tag GATED.)
5. **One unified `+` menu vs scattered entry points.** Cronometer has ONE `+`
   that fans out to food/barcode/quick/etc. VOLYUME splits these: meal-card `+`
   (search), a separate scan FAB, a flash quick-add icon, copy icons. More
   surface area = more to learn. **[SAFE-TO-BUILD]** — consolidating is a pure
   IA/UI change, no gating or safety impact.
6. **"Repeat" / scheduled-favourite items auto-appear with a one-tap confirm
   banner** (`repeat_diary_item_banner`). VOLYUME has planned-meal confirm
   banners but no "this food repeats on these days" automation.
   **[SAFE-TO-BUILD]** (adherence-neutral if framed as a convenience, no
   streak/score). Lower leverage.
7. **In-diary deferred profile completion.** Cronometer drops the user into a
   working diary and nudges profile/email-validation from inside it
   (`complete_profile_popup`). VOLYUME front-loads onboarding. **[GATED]** —
   touches the Pro onboarding + Article-9 consent gates; not a pure UI change.

---

## 6. Single highest-leverage SAFE flow win

**Make the live food search recents/favourites-weighted and land "Add food"
truly on the user's own foods (gap #2 + #5 combined, the part that is
[SAFE-TO-BUILD]).**

Why this one: Cronometer's daily ease is *not* mainly the 0-tap home (that's
gated for VOLYUME) — it's that **the food you eat every day is the first thing
you tap, with no typing**, because results are personal-history-first
(`prioritizeRecentlyLogged`). VOLYUME already merged one-tap re-log on the
Recents/Favourites/Frequents tabs, so the rails exist; the remaining gap is that
a *typed* search ignores personal history and the multiple add entry points
dilute the path. Weighting live search by the user's logged foods, and pointing
every "add" affordance at the same recents-first picker, gets VOLYUME's everyday
loop to **~2 taps, no typing** — matching Cronometer's ~3 — **without touching
the Train-home decision, Free/Pro gating, ED-safety, or the no-AI boundary.**
It is pure ranking + IA work on `FoodSearchScreen.js` / `lib/food/waterfall` and
the diary's add entry points.
