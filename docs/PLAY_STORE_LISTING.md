# Volyume — Google Play Store Listing

_Ready to paste into Google Play Console. All fields comply with Play Store policies._

---

## App Details

| Field | Value |
|---|---|
| **App name** | Volyume: Hypertrophy Logbook |
| **Default language** | English (United Kingdom) |
| **App category** | Health & Fitness |
| **Content rating** | Everyone (PEGI 3) |
| **Package name** | app.volyume |
| **Contact email** | allansdouglas1983@gmail.com |
| **Privacy Policy URL** | https://volyume.app/privacy |

---

## Short Description (80 characters max)

```
The intelligent bodybuilding logbook. Log smarter. Grow faster.
```

---

## Full Description (4000 characters max)

```
Volyume is the bodybuilding logbook built around one idea: your training should
get smarter every session.

LESS THINKING. MORE LIFTING.

Open the app, start your session, and log each set as you go. Volyume handles
the rest: tracking your progress, spotting patterns, and surfacing exactly what
you need to keep growing.

---

BUILT FOR SERIOUS TRAINING

Volyume is designed for anyone who trains with intent. Whether you're building
your first programme or competing on stage, the tools adapt to where you are.

Log weight, reps, and effort for every set. See your previous performance
alongside the current set, so you always know whether you're progressing. A rest
timer starts automatically after each working set so you never lose track.

---

PRECISION COACHING (PRO)

The Pro tier builds your personalised training plan based on your goal, schedule,
recovery capacity, and available equipment. It adjusts week to week based on how
your body responds.

Set your physique goal, whether that's building muscle, staying lean, competing,
or improving your strength. Choose your training phase (building, cutting,
maintaining, or contest preparation). Your plan and nutrition targets update
immediately.

Nutrition targets are calculated from your body weight, age, height, and activity
level using established scientific principles. Protein, carbohydrates, and fat
targets adapt to your phase: more carbs when you're building, controlled deficits
when you're cutting.

Check in once a week. Tell us how your training felt. Volyume adjusts your plan
for the next week based on your feedback.

---

A COACH THAT LOOKS OUT FOR YOU

If your weight starts dropping too fast, or your energy stays low for too long,
Volyume pauses your calorie cut, tells you why in plain words, and points you to
support. Most apps just keep cutting. Volyume would rather pause than push.

---

PRIVATE BY DESIGN

Your training data belongs to you. No social feed. No public profiles. No sharing
your stats with anyone.

All data is stored on your device. If you create an account, it syncs to your
private cloud backup that is visible only to you.

Export your full workout history at any time as a CSV. Take it with you wherever
you go.

---

FEATURES

Training
- Log every set with weight and reps
- See last session's performance inline
- Automatic rest timer after each set
- PR detection: know when you hit a lifetime best
- Exercise library with 400+ movements
- Swap exercises mid-session without losing progress
- Build custom training programmes
- Warm-up set tracking (separate from working sets)

Progress
- Weekly training volume by muscle group
- Personal records for every exercise
- Strength-to-bodyweight comparisons
- Workout history with session details
- Muscle group volume trends over time

Body
- Body weight log with trend chart
- Body measurements tracking (waist, chest, arms, etc.)

Nutrition (Pro)
- Daily calorie and macro targets
- Adjusts automatically to your training phase
- Three protein levels: Standard, Optimised, and Advanced
- Targets adapt as your weight changes

Coaching (Pro)
- Personalised plan generation
- Weekly check-ins and plan adjustments
- Recovery week detection
- Volume adjustment based on your response

---

YOUR FREE TRIAL

Try Pro free for 14 days. No card needed. Keep it after that and Google Play adds
a further 7 days free before your first payment. Then it's £4.99 a month, or
£29.99 a year. Cancel anytime. The Free tier stays free with no time limit.

---

NOT MEDICAL ADVICE

Volyume provides training and nutrition guidance based on established scientific
principles. This is not medical advice. Consult a qualified professional before
making significant changes to your diet or exercise programme.
```

---

## What's New (Release Notes, v1.2.0)

```
The full release of Volyume.

A training logbook with an automatic rest timer, PR detection, and your previous
performance shown inline. Pro adds Precision Coaching: a personalised plan,
weekly check-ins that adjust your training and nutrition, and a coach that pauses
your cut if your weight drops too fast or your energy runs low.

Pro starts with a 14-day free trial, no card needed.
```

---

## Graphic Assets Required

| Asset | Size | Notes |
|---|---|---|
| App icon | 512 × 512 px PNG | No alpha, no rounded corners (Play applies mask) |
| Feature graphic | 1024 × 500 px PNG | Used at top of store listing |
| Phone screenshots | Min 2, max 8 | 16:9 or 9:16. Min 320 dp short side |
| Tablet screenshots | Optional | 7" and 10" if supported |

**Minimum screenshot set (recommended 6):**
1. Home screen — weekly volume overview
2. Active workout — set logging with rest timer
3. PR celebration screen
4. Volume tracking per muscle group
5. Coaching plan screen
6. Nutrition targets screen

---

## Content Rating Questionnaire

Answer these in the Play Console content rating questionnaire:

| Question | Answer |
|---|---|
| Violence | None |
| Sexual content | None |
| Language | None |
| Controlled substances | None |
| User-generated content | No |
| Personal / sensitive data collected | Yes (body measurements, workout data) |
| Data shared with third parties | No |
| Data encrypted in transit | Yes |
| Data deletion available | Yes (in-app account deletion) |

**Final rating target: PEGI 3 / Everyone**

---

## Data Safety Section (Play Console)

Complete the Data Safety form with these answers:

**Data collected:**
| Data type | Collected | Shared | Required | Encrypted | Deletable |
|---|---|---|---|---|---|
| Email address | Yes (if account created) | No | No (optional) | Yes | Yes |
| Name | Yes (first name only) | No | No | Yes | Yes |
| Fitness info (workouts, sets, weights) | Yes | No | Yes | Yes | Yes |
| Health info (body weight, measurements) | Yes | No | No (optional) | Yes | Yes |

**Data not collected:** Financial info, messages, location, contacts, app activity beyond the app itself.

---

## Distribution

| Setting | Value |
|---|---|
| Countries | All countries (or restrict as needed) |
| Devices | Phones only (tablet not tested) |
| Android version | 7.0+ (API 24) |
| Managed Google Play | No |

---

## Internal Test Track Setup

Builds are produced by GitHub Actions, not EAS Build. The workflow at `.github/workflows/build-android.yml` runs on every push to `main` or `claude/**` and produces two artifacts:

- `volyume-release-apk-<run>` — for sideload testing
- `volyume-release-aab-<run>` — for Play Store upload

Steps:

1. Push the release commit to the configured branch and wait for the CI workflow to finish (green)
2. Download the `volyume-release-aab-<run>` artifact from the workflow run page
3. Go to Play Console > Internal Testing > Create new release
4. Drag-and-drop the AAB into the release
5. Add testers by email (up to 100 for internal track)
6. Share the opt-in URL with testers
7. Testers install from Play Store directly

**Build command:** none — the build is triggered by a push.
To force a build without code changes, re-run the latest workflow run from the GitHub Actions UI.

**Submit command:** none for the first upload — drag-and-drop the AAB into Play Console. Automated submission via the Play Developer API can be added later (service account creation is covered in `docs/SUBMISSION_CHECKLIST.md`).

Full keystore + signing details and the per-step pre-launch checklist live in `docs/SUBMISSION_CHECKLIST.md`.
