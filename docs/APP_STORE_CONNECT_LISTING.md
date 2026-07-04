# Volyume — App Store Connect Listing

> **Status 2026-05-25: OUT OF SCOPE for v1.** Founder confirmed there
> is no Apple Developer account, no App Store Connect entity, no iOS
> bundle registered. iOS is deferred indefinitely under the Android-only
> Phase B decision. This doc is preserved as the prepared listing copy
> for if/when iOS lands at a later phase; it is NOT current work.

_Production-ready. Paste each field directly into App Store Connect._
_All character counts verified against Apple's limits._

---

## App Information

| Field | Value |
|---|---|
| **Bundle ID** | app.volyume |
| **Primary Language** | English (United Kingdom) |
| **Primary Category** | Health & Fitness |
| **Secondary Category** | Sports |
| **Support URL** | https://volyume.app/support |
| **Marketing URL** | https://volyume.app |
| **Privacy Policy URL** | https://volyume.app/privacy |

---

## Localisation: English (United Kingdom)

---

### App Name
**Limit: 30 characters**

```
Volyume - Precision Physique Coach
```

> Character count: 34 ✗ — over the 30-character App Name limit. The founder
> brief's store name is "Volyume - Precision Physique Coach"; it does not fit
> the title field. Pick a compliant short form (for example "Volyume: Physique
> Coach" at 23, or App Name "Volyume" with the Subtitle carrying "Precision
> Physique Coach"). Launcher name stays "Volyume".

---

### Subtitle
**Limit: 30 characters**

```
Log smarter. Grow faster.
```

> Character count: 25 ✓

---

### Promotional Text
**Limit: 170 characters — can be updated without a new submission**

```
Pro is free for 14 days, no card needed. Personalised coaching, nutrition targets, weekly check-ins. Keep it for a 7-day store free trial, then £4.99 a month.
```

> Character count: 156 ✓

---

### Description
**Limit: 4000 characters**

```
Volyume is the bodybuilding logbook built around one idea: your training should get smarter every session.

LESS THINKING. MORE LIFTING.

Open the app, start your session, and log each set as you go. Volyume handles the rest — tracking your progress, spotting patterns, and surfacing exactly what you need to keep growing.

BUILT FOR SERIOUS TRAINING

Volyume is designed for anyone who trains with intent. Whether you're building your first programme or competing on stage, the tools adapt to where you are.

Log weight, reps, and effort for every set. See your previous performance alongside the current set, so you always know whether you're progressing. A rest timer starts automatically after each working set so you never lose track.

PRECISION COACHING (PRO)

The Pro tier builds your personalised training plan based on your goal, schedule, recovery capacity, and available equipment. It adjusts week to week based on how your body responds.

Set your physique goal — whether that's building muscle, staying lean, competing, or improving your strength. Choose your training phase: building, cutting, maintaining, or contest preparation. Your plan and nutrition targets update immediately.

Nutrition targets are calculated from your body weight, age, height, and activity level using established scientific principles. Protein, carbohydrate, and fat targets adapt to your phase — more carbs when you're building, controlled deficits when you're cutting.

Check in once a week. Tell us how your training felt. Volyume adjusts your plan for the next week based on your feedback.

PRIVATE BY DESIGN

Your training data belongs to you. No social feed. No public profiles. No sharing your stats with anyone.

All data is stored on your device. If you create an account, it syncs to your private cloud backup with row-level security; support access is limited to helping with your account. Progress photo and Physique Scan image files stay on your device unless you choose to share or export them. Export your workout sets as CSV or create an app-data JSON backup at any time.

FEATURES

Training
• Log every set with weight and reps
• See last session's performance inline
• Automatic rest timer after each set
• PR detection — know when you hit a lifetime best
• Exercise library with 150+ movements
• Swap exercises mid-session without losing progress
• Build custom training programmes
• Warm-up set tracking (separate from working sets)

Progress
• Weekly training volume by muscle group
• Personal records for every exercise
• Strength-to-bodyweight comparisons
• Workout history with session details
• Muscle group volume trends over time

Body
• Body weight log with trend chart
• Body measurements tracking (waist, chest, arms, and more)
• Progress photos stored on your device
• Physique Scan visual leanness score, confidence and progress signal

Nutrition (Pro)
• Daily calorie and macro targets
• Adjusts automatically to your training phase
• Three protein levels: Standard, Optimised, and Advanced
• Targets adapt as your weight changes

Coaching (Pro)
• Personalised plan generation
• Weekly check-ins and plan adjustments
• Recovery week detection
• Volume adjustment based on your response

YOUR FREE TRIAL

Try Pro free for 14 days. No card needed. Keep it after that for a 7-day store free trial before your first payment, then £4.99 a month or £29.99 a year. Cancel anytime. The Free tier stays free with no time limit.

NOT MEDICAL ADVICE

Volyume provides training and nutrition guidance based on established scientific principles. This is not medical advice. Consult a qualified professional before making significant changes to your diet or exercise programme.
```

> Character count: 2,888 ✓ (well within 4,000)

---

### Keywords
**Limit: 100 characters — comma-separated, no spaces after commas**

```
bodybuilding,hypertrophy,gym,workout log,weightlifting,strength,muscle,fitness,training,coach
```

> Character count: 93 ✓

---

### What's New (Release Notes)
**Limit: 4000 characters — plain text**

```
The full release of Volyume.

WHAT'S IN THIS RELEASE

Training logbook with automatic rest timer after every set, inline previous-session performance so you always know if you're progressing, and PR detection that tells you when you hit a lifetime best.

Pro Coaching with personalised plan generation based on your goal, schedule, recovery capacity, and equipment. Weekly check-ins let the app adjust your plan based on how training actually felt.

Nutrition targets calculated from your body stats and training phase. Protein, carbohydrate, and fat targets update automatically as your weight or phase changes.

Pro starts with a 14-day free trial, no card needed. Keep it for a 7-day store free trial, then £4.99 a month or £29.99 a year. The Free tier stays free with no time limit.

Found a bug or something that does not feel right? The in-app feedback button goes directly to the developer.
```

> Character count: ~820 ✓ (within 4,000)

---

## In-App Purchases

### Subscription: Volyume Pro

| Field | Value |
|---|---|
| **Reference name** | Volyume Pro Monthly |
| **Product ID** | app.volyume.pro.monthly |
| **Type** | Auto-Renewable Subscription |
| **Subscription group name** | Volyume Pro |
| **Duration** | 1 Month |
| **Price** | £4.99 / month (annual plan £29.99 / year) |
| **Free trial** | 14-day in-app cardless trial, then a 7-day store intro free trial on subscribe |

**Display name (shown to users):**
```
Volyume Pro
```

**Description (shown in App Store and on purchase sheet):**
```
Unlock personalised coaching, weekly check-ins, and nutrition targets. Your plan adjusts every week based on how you train and recover.
```

> Character count: 138 ✓

---

## Screenshot Captions

_Captions appear below each screenshot in the App Store listing. Keep them short and benefit-driven._

**Screenshot 1 — Home screen, weekly volume overview**
```
See your weekly volume at a glance. Know exactly where you stand before you start training.
```

**Screenshot 2 — Active workout, set logging with rest timer**
```
Log each set in seconds. Previous performance shown inline. Rest timer starts automatically.
```

**Screenshot 3 — PR celebration screen**
```
Volyume detects every personal record. You'll always know when you've hit a lifetime best.
```

**Screenshot 4 — Volume tracking per muscle group**
```
Track weekly volume by muscle group. Spot imbalances and adjust before they become problems.
```

**Screenshot 5 — Coaching plan screen**
```
Your personalised training plan. Adjusts every week based on your check-in and recovery.
```

**Screenshot 6 — Nutrition targets screen**
```
Calorie and macro targets built for your phase. More carbs when building. Controlled when cutting.
```

---

## App Preview Video

_30-second script outline — for production by video editor. Do not produce video here._

**Duration:** 27–30 seconds
**Aspect ratio:** 9:16 (portrait, iPhone)
**Audio:** Optional background music (instrumental, low-energy). No voiceover required — on-screen text carries the message.

**Script outline:**

| Seconds | What's on screen | On-screen text overlay |
|---|---|---|
| 0–4 | App icon animates in on dark background | "Train with intent." |
| 4–9 | Home screen — weekly muscle volume rings fill up | "See your volume. Spot gaps." |
| 9–14 | Active workout — user logs a set, rest timer counts down, previous weight shown inline | "Log smarter. Know if you're progressing." |
| 14–18 | PR screen animates in with confetti/highlight | "Every personal record. Automatically detected." |
| 18–23 | Coaching plan screen — structured weekly programme visible | "Your personalised plan. Adjusts every week." |
| 23–27 | Nutrition targets screen — macros displayed cleanly | "Targets that move with your training phase." |
| 27–30 | App icon + name + "Free for 14 days, no card" + App Store badge | "Volyume. Log smarter. Grow faster." |

---

## Content Advisory / Age Rating

Complete the Age Rating questionnaire in App Store Connect with these answers:

| Question | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humour | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | Infrequent/Mild |
| Alcohol, Tobacco, or Drug Use or References | None |
| Gambling and Contests | None |
| Sexual Content or Nudity | None |
| Graphic Sexual Content and Nudity | None |
| User-Generated Content | No |
| Unrestricted Web Access | No |
| Apple TV-only Gambling | No |

**Target age rating: 4+**

> Note: "Medical/Treatment Information" is marked Infrequent/Mild because the app displays fitness and nutrition guidance derived from established scientific principles. A disclaimer clarifies this is not medical advice.

---

## Privacy Nutrition Label

_Complete the App Privacy section in App Store Connect using the answers below._

### Data Used to Track You

None. Volyume does not track users across apps or websites owned by other companies.

---

### Data Linked to You

These data types are collected and linked to the user's account (only if the user creates an account):

| Category | Data Type | Purpose | Optional? |
|---|---|---|---|
| Contact Info | Email Address | Account creation, app functionality | Yes — account is optional |
| Contact Info | Name (first name only) | Personalisation within the app | Yes |
| Health & Fitness | Fitness Information (workouts, sets, weights, reps) | Core app functionality | No — required for the app to work |
| Health & Fitness | Health Information (body weight, measurements, entered body fat, cardio, steps, check-ins) | App functionality, coaching calculations | Yes |
| Health & Fitness | Nutrition / food logs | Food diary, calorie and macro targets | Yes |
| Health & Fitness | Progress photo metadata and Physique Scan outputs | Progress tracking; image files stay device-local unless user shares/exports | Yes |
| Usage Data | Product Interaction | First-party usage telemetry; opt-out in Settings | Yes |
| Diagnostics | Crash Data and Performance Data | Crash reporting and app reliability through scrubbed Sentry events | No |

---

### Data Not Linked to You

None. All data collected is linked to the user's account if an account is created. Without an account, all data stays on-device only and is not collected by Volyume servers.

---

### Data Used to Track You

None.

---

### Data Not Collected

Volyume does not collect:

- Precise or coarse location
- Browsing history or search history
- Financial information or payment card data
- Sensitive info (racial or ethnic data, sexual orientation, religious beliefs, etc.)
- Contacts
- Emails or text messages
- Gameplay content or customer support data
- Precise photo image files collected by Volyume servers

---

### Privacy Practices Summary

- All workout data is stored locally on-device by default.
- Cloud sync is optional and requires account creation.
- Cloud-synced data is private to the user and protected by row-level security; support access is limited to account help.
- Progress photo and Physique Scan image files stay device-local unless the user chooses to share or export them.
- Users can delete their account and all associated data from within the app.
- Data is encrypted in transit and at rest.

---

## App Store Connect Checklist

Before submitting for review, confirm each item:

- [ ] App name set to a compliant form of "Volyume - Precision Physique Coach" (the full brief name is 34 chars, over the 30-char limit; launcher stays "Volyume")
- [ ] Subtitle set: `Log smarter. Grow faster.` (25 chars)
- [ ] Promotional text set and reviewed
- [ ] Description pasted and reviewed
- [ ] Keywords set (93 chars, no spaces after commas)
- [ ] What's New pasted for this build
- [ ] 6 screenshots uploaded (iPhone 6.9" required; 6.5" recommended)
- [ ] App Preview video uploaded (optional but recommended)
- [ ] Screenshot captions entered for each screenshot
- [ ] In-App Purchase `app.volyume.pro.monthly` created and approved
- [ ] Subscription group `Volyume Pro` created
- [ ] Age rating questionnaire completed — target 4+
- [ ] Privacy Nutrition Label completed
- [ ] Support URL confirmed live: https://volyume.app/support
- [ ] Marketing URL confirmed live: https://volyume.app
- [ ] Privacy Policy URL confirmed live: https://volyume.app/privacy
- [ ] Build archived in Xcode and uploaded via Organizer → Distribute App (no iOS CI workflow exists yet; the Android-only GitHub Actions build does not produce an `.ipa`)
- [ ] TestFlight internal testing confirmed before external submission
