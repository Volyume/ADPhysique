# Volyume — Apple App Store Connect Listing Correction

_Corrects the stale `docs/APP_STORE_CONNECT_LISTING.md`. Build 14 is in Beta App
Review and going live, so the listing must be current and compliant. This doc is
a copy-paste pack plus an explicit diff/action list so the founder can update App
Store Connect in one pass._

Apple App ID: **6777083702**. Bundle ID: `app.volyume`.

British English throughout. No hype, no em dashes, honest claims, no AI claims.
Pro features labelled Pro. Health-claims-sensitive strings are flagged inline.

---

## A. The headline problem: the stale doc says iOS is out of scope

`docs/APP_STORE_CONNECT_LISTING.md` opens with:

> "Status 2026-05-25: OUT OF SCOPE for v1. Founder confirmed there is no Apple
> Developer account, no App Store Connect entity, no iOS bundle registered."

**This is now false.** Build 14 is in Beta App Review under App ID 6777083702,
i.e. there is an Apple Developer account, an App Store Connect entity, and a
registered bundle. **Action: delete that status banner entirely** (or replace with
"Status 2026-06-11: build 14 in Beta App Review; listing live work"). Leaving the
banner risks the founder treating the prepared copy as hypothetical and shipping
stale fields.

---

## B. The App Name fix (the 30-char limit)

**Current proposed name:** `Volyume - Precision Physique Coach` = **34 characters
-> OVER the 30-char App Name limit.** Cannot be entered as-is.

**Recommended App Name (pick one; all <= 30):**

| Option | String | Chars | Note |
|---|---|---|---|
| **A (recommended)** | `Volyume: Workout & Macros` | 25 | Leads with the #1 search term ("workout") + the macros differentiator. Best discoverability. |
| B | `Volyume: Physique Coach` | 23 | Closest to the brief name; "coach" + "physique" identity. |
| C | `Volyume: Gym & Macro Coach` | 26 | Owns the tracker+macros+coaching combo. |

Recommendation: **Option A** for maximum search coverage on the strongest term,
consistent with the Play title strategy in `PLAY_STORE_LISTING.md`. Launcher name
stays "Volyume". Do not repeat name words in the subtitle or keyword field (no
double-index benefit).

> Trademark note (carry-over from COPY-003): "Precision Coaching" appears with a
> trademark mark in parts of the app UI. None of the App Name options above use
> it, which sidesteps the open trademark-posture decision for the store title.
> Confirm posture before using "Precision Coaching" anywhere in store metadata.

---

## C. Copy-paste pack (all fields, counts verified)

### App Name (limit 30)
```
Volyume: Workout & Macros
```
(25 chars)

### Subtitle (limit 30)
```
Log smarter. Grow faster.
```
(25 chars) — unchanged from the stale doc; still good and within limit.

### Keywords (limit 100, comma-separated, NO spaces after commas)
Reworked to avoid repeating App Name / Subtitle words ("workout", "macros",
"grow" are now in the name/subtitle, so they are dropped here to free up space),
and aligned with the Play keyword set in `PLAY_STORE_LISTING.md`.
```
bodybuilding,hypertrophy,gym log,weightlifting,calorie counter,food diary,strength,coach,physique,cutting
```
(99 chars — verify on a real en-GB profile before locking)

> Diff vs stale doc keywords (`bodybuilding,hypertrophy,gym,workout log,weightlifting,strength,muscle,fitness,training,coach`):
> dropped `workout log` (now covered by App Name "Workout"), `fitness`,
> `training`, `muscle`, `gym`; added `gym log`, `calorie counter`, `food diary`,
> `physique`, `cutting` to claim the nutrition + physique-intent space that the
> companion keyword research flagged as white space.

### Promotional Text (limit 170, updatable without review)
```
Build 14 is live. Pro is free for 14 days, no card needed: coaching, nutrition targets and weekly check-ins. Then a 7-day store trial, then £4.99 a month.
```
(152 chars) — use this field for time-sensitive lines so the Description stays
stable between releases.

### Description (limit 4000)
Use the EU/UK-correct, exercise-count-correct version. **The stale doc says "150+
movements"; the Play listing says "400+". These disagree — pick the true number
before publishing (flagged in section D).** The text below uses the all-in-one
framing from the current Play description, which is more conversion-aligned than
the stale Apple one, and keeps the "pause your cut" honesty line and the
"Not medical advice" disclaimer.

```
Volyume is a workout tracker, food diary and coaching app for serious lifters and physique athletes. Log every set in the gym, track your macros and calories, and get weekly coaching that adjusts your training and nutrition as your body responds. One app for lifting, food and progress, instead of three.

TRAIN
Build your own training plan or start from the plan library. Log every set, rep and weight with fast gym logging that works fully offline. Browse a full exercise library, follow proven training plans, and watch your strength climb with personal bests, lift progress and volume by muscle.

EAT (PRO)
A food diary with a barcode scanner and a large food database. Track macros, calories, protein, carbs and fat against targets worked out from your body, your training and your goal. Scan a nutrition label and Volyume reads it on your device. Build recipes and log them as one line.

COACHING (PRO)
Every week, a short check-in reads your weight trend, your food and your training. Volyume then adjusts your calories, steps, cardio and training volume, and tells you exactly what changed and why. Built for cutting, lean bulking, maintenance and contest prep, with conservative limits that hold changes until there is real data.

A COACH THAT LOOKS OUT FOR YOU
If your weight drops too fast or your energy stays low for too long, Volyume pauses your calorie cut, tells you why in plain words, and points you to support. Most apps just keep cutting. Volyume would rather pause than push.

PRIVATE BY DESIGN
Your training data belongs to you. No social feed, no public profiles, your data is never sold. Data is stored on your device; if you create an account it syncs to a private cloud backup only you can see. Export your full history as a CSV any time.

FREE
Plan library, custom plan builder, unlimited workout logging, exercise library, personal bests and full progress stats. No time limit.

PRO
Food diary, macros, nutrition targets, cardio, steps, weekly check-ins and coaching. Free for 14 days, plus a 7-day store free trial when you subscribe. Then £4.99 a month or £29.99 a year. Cancel in the App Store.

Made in the UK. Works in kg and stone.

NOT MEDICAL ADVICE
Volyume provides training and nutrition guidance, not medical advice. Consult a qualified professional before making significant changes to your diet or exercise.
```
(~2,150 chars — within 4,000)

> **FLAG (health-claims check):** the "A COACH THAT LOOKS OUT FOR YOU" paragraph
> describes the pause-the-cut behaviour. It is phrased as a product behaviour
> ("pauses your calorie cut", "points you to support") and avoids any
> prevent/treat/diagnose language, which is the compliant framing. Still route
> this paragraph plus the Promotional Text through a final check against Apple
> Review Guideline 1.4.1 / 5.x (health) before submitting. Do NOT add calorie-floor
> numbers or "safe weight loss" outcome claims here.

### What's New (Release Notes, build 14)
```
Volyume on iPhone.

Train: a logbook with an automatic rest timer, PR detection, and your previous set shown inline. Works fully offline.

Pro: weekly check-ins that adjust your training and nutrition, a food diary with on-device barcode and label scanning, and macro targets that move with your phase. The coach pauses your cut if your weight drops too fast or your energy runs low.

Pro is free for 14 days, no card needed.
```

---

## D. Diff / action list vs the stale `APP_STORE_CONNECT_LISTING.md`

Work top to bottom; each line is one App Store Connect edit.

1. **DELETE the "OUT OF SCOPE for v1" status banner** (lines ~3-7 of the stale
   doc). It is factually wrong now that build 14 is in review. **(Highest
   priority — it is the headline stale state.)**
2. **App Name:** replace `Volyume - Precision Physique Coach` (34, invalid) with
   `Volyume: Workout & Macros` (25). [Section B]
3. **Subtitle:** keep `Log smarter. Grow faster.` (25). No change.
4. **Keywords:** replace the old 93-char string with the new 99-char string in
   section C (drops words now in the name, adds nutrition/physique-intent terms).
5. **Description:** replace the stale description. Two substantive corrections:
   - **Exercise count:** stale doc says "150+ movements"; Play says "400+".
     **Confirm the real number and use it.** Mismatched counts across stores look
     careless and a wrong count is a (minor) factual claim. The text above omits
     a number in the TRAIN block to avoid shipping a wrong one — insert the
     verified figure.
   - Adds the offline-first, "data never sold", on-device-scan, and pause-the-cut
     lines that the stale Apple description was missing but the Play one has.
6. **Promotional Text:** replace the stale trial-only line with the section C
   version (now also flags build 14 is live; updatable without review).
7. **In-App Purchase product IDs — CRITICAL MISMATCH:** the stale doc lists
   `app.volyume.pro.monthly`. CLAUDE.md states the live product IDs are
   **`volyume_pro_monthly`** and **`volyume_pro_annual`** and that these "never
   change". **Do not edit billing — flag only.** Confirm the App Store Connect
   subscription product IDs match the live IDs before relying on this doc's IAP
   section. This is a billing-adjacent discrepancy; per CLAUDE.md it needs founder
   confirmation, not a silent change here.
8. **Screenshots:** the stale doc lists 6 generic UI captions. Replace with the
   8-panel caption-led sequence in `store-creative-spec.md` (panels 1-3 are the
   conversion core). Note: Apple indexes screenshot text since June 2025, so bake
   captions into the PNGs.
9. **App Preview video:** the stale 27-30s script is fine as a fallback, but
   prefer the tighter 15-25s muted shot list in `store-creative-spec.md` (first 3
   seconds must read with no sound). Ship at least one preview.
10. **Custom Product Pages:** the stale doc has none. Add the default + 4 CPPs from
    `store-creative-spec.md` section 8. Note Apple now allows **up to 70** CPPs
    (the original brief's "35" is outdated) and CPPs surface in organic search
    since July 2025.
11. **Age rating:** stale doc marks "Medical/Treatment Information:
    Infrequent/Mild" -> 4+. Keep as-is; it is the honest answer given the nutrition
    guidance + disclaimer. No change.
12. **Privacy Nutrition Label:** the stale doc's label is thinner than the live
    Play Data Safety section. **Reconcile against `PLAY_STORE_LISTING.md`'s Data
    Safety table** — in particular the stale Apple label says "Crash data /
    performance data: not collected", but the Play declaration confirms Sentry
    DOES collect crash + performance data (with a PII scrub, id + email attached).
    The Apple privacy label must reflect this (Diagnostics / Crash data: collected,
    not linked to tracking). **Flag — privacy-label accuracy, fix before submit.**

---

## E. Flags summary (do not silently change these)

- **Billing (CLAUDE.md SACRED):** IAP product ID mismatch in item 7. Founder
  confirmation required; no billing edit made here.
- **Health-claims compliance:** the pause-the-cut paragraph and Promotional Text
  need a guideline check (section C flag). No calorie-floor numbers or outcome
  claims in store fields.
- **Factual accuracy:** exercise count 150+ vs 400+ (item 5); crash-data privacy
  label says "not collected" but Sentry collects it (item 12).
- **Trademark:** confirm "Precision Coaching" posture before any store use
  (section B note).

---

## Sources

- Apple App Name / Subtitle / metadata claim rules & health guidelines:
  https://developer.apple.com/app-store/review/guidelines/ (2026)
- Custom Product Pages limits (up to 70, organic search, deep links):
  https://developer.apple.com/app-store/custom-product-pages/ (fetched 2026-06-11)
- In-repo facts: `CLAUDE.md` (calorie floors, product IDs, gating);
  `docs/PLAY_STORE_LISTING.md` (Data Safety, keyword set, 400+ count,
  product IDs `volyume_pro_monthly` / `volyume_pro_annual`);
  `src/lib/nutritionEngine.js` and `docs/MOVE_3_UPWARD_GATE_COMPRESSION.md`
  (1.5%/week rapid-loss gate).
