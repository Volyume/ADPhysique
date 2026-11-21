# Apple featuring nomination: ready to submit with the next build

Task: LOC-662. **Nothing is submitted by this task.** The founder (or an App Store Connect user with the Account Holder, Admin, App Manager or Marketing role) files it in App Store Connect under Featuring > Nominations, once the date of the next build's release is known.

## Rules recorded in `evidence-1-store-search` (section F)

- Apple wants at least two weeks' notice and recommends three; nominations can go in up to three months ahead.
- Nomination types are New Content, App Enhancements and App Launch. Volyume has been listed since 24 August 2026 (release date on the public page), so the right type for the next build is **App Enhancements**, not App Launch.
- Up to five supplemental URLs; selections are regionally curated per storefront, so the nomination names the **United Kingdom**.
- No guarantee, and no install effect for small apps was found in any source. Expect nothing; file one per significant update because it costs nothing.
- The field length limits shown in App Store Connect were not recorded by any source read. Each block below is short; trim to the limit the form shows. Do not add claims when trimming.

## Fields to fill

**App:** Volyume (App Store id 6777083702)

**Nomination type:** App Enhancements

**Storefront / territory:** United Kingdom

**Date the update is available:** the release date chosen for the build that carries the changes below (not yet fixed; file at least three weeks before it)

**Nomination name (one line):**

```
Volyume: a clearer weekly decision for lifters who plan their own training
```

**Describe the app:**

```
Volyume is a free training, nutrition and weekly check-in app for lifters who plan their own training. It builds the training plan, logs every set and the food diary, and once a week makes the training and nutrition decision and shows the reasons. It follows fixed rules, not AI, so the same numbers always give the same decision. Progress photos and workout videos stay on the phone. There are no ads.
```

**What is new in this update:**

```
The app has a new layout: Today, Train, Nutrition, Coach and Community. Progress now sits inside Coach, and Today shows only what needs you. The weekly coaching now says what it saw, what changes and when the coach looks again. Meal plans are easier to read, and adding a plan to the diary fills only the meals not yet logged. Settings are grouped more clearly, with one place for units.
```

**Why this suits UK readers:**

```
Built on UK food data, with lifts in kg and body weight in stone, kg or pounds, in British English. It is made for UK lifters who train without a coach and want one app that explains its decisions in plain words.
```

**Supplemental URLs:** `https://volyume.app` (home). Add a public TestFlight link only if the founder has one; none is recorded in any source read.

**Contact:** support@volyume.app

## What this text leaves out, on purpose

No ratings or user numbers (one UK rating exists and quoting it would be misleading), no awards, no price or trial, no AI claims, no accessibility claims (`REAL-DISABLED-USER-VALIDATED = NO`, `CLAUDE.md` section 2), no weight-loss or health claims, no gym challenge, no coach partnerships.

## Where each statement is proved (base commit `942a44e0d3b282c3f25a9073a95e56c95f956e08`)

| Statement | Proof |
| --- | --- |
| Free, no ads, fixed rules not AI | `src/lib/proGate.js:43`; `src/screens/WelcomeScreen.js:146-148` |
| Builds the plan, logs sets, food diary, weekly decision with reasons | `src/lib/structure/engine.js`; `src/screens/DiaryScreen.js`; `src/lib/weeklyCoach.js`; `src/screens/WeeklyCheckInScreen.js` |
| Photos and videos stay on the phone | `src/screens/WelcomeScreen.js:147`; `app.json:39` |
| New layout of five tabs, Progress inside Coach, Today shows only what needs you | `src/components/WhatsNewSheet.js:174-175` (the 3.4.0 entry, in the founder's approved words); `src/navigation/RootNavigator.js:805-809` (the five tabs); `docs/app-rework-2026-10/SPEC.md` (D231) |
| Weekly coaching says what it saw, what changes and when the coach looks again | `src/components/WhatsNewSheet.js:178` |
| Meal plans easier to read, filling only unlogged meals | `src/components/WhatsNewSheet.js:177`; `src/screens/MealPlanScreen.js:1341` |
| Settings grouped, one place for units | `src/components/WhatsNewSheet.js:179`; `src/screens/SettingsUnitsScreen.js` |
| UK food data, kg and stone, British English | `src/lib/food/waterfall.js`; `src/screens/SettingsUnitsScreen.js:15-21` |

Before filing, confirm the build really carries these changes (the five-tab layout landed on main after the 3.4.0 version bump, dossier section 7, and a build had not been started at the base commit). If the build does not carry a line, delete that sentence.
