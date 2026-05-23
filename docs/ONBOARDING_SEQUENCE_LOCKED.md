# Onboarding sequence (locked)

The screens a new user sees from app open to first useful screen, in
order. Locked 2026-05-23.

## Principle

Onboarding is **information collection plus consent**, not feature
discovery. Show the user the smallest set of screens that lets the
engine produce its first useful output. Feature discovery happens
inside the app after onboarding completes.

Existing Volyume onboarding works. The new flow adds three screens
(Article 9 consent, goal lock when triggered, food layer intro) and
otherwise keeps the existing structure intact.

## Sequence

1. **Welcome** (existing, unchanged)
2. **Sign in or create account** (existing, unchanged)
3. **Article 9 health-data consent** (NEW, locked)
4. **Basic stats** (existing, unchanged)
5. **Goal selection** (existing, unchanged)
6. **Goal lock consent** (NEW, only when goal selected is physique
   competition or advanced recomp)
7. **SCOFF screener** (existing, unchanged position)
8. **Activity level** (existing, unchanged)
9. **Equipment + frequency** (existing, unchanged)
10. **Food layer intro** (NEW, locked)
11. **Notifications permission** (existing, unchanged)
12. **First-run summary** (existing, slight extension)

Total screens: 12. The user reaches a useful Train tab + Diary tab
within 2-3 minutes of first launch.

## Screen-by-screen detail (NEW screens only)

### Screen 3: Article 9 health-data consent (NEW)

Locked in `PRIVACY_CONSENT_LOCKED.md`. Re-stating the exact copy here
for the engineer:

```
Title:    Health and nutrition data consent
Subtitle: (none)
Body:     [the full Article 9 consent text from
           PRIVACY_CONSENT_LOCKED.md]
Footer:   [ ] I agree to Volyume using my health and nutrition data
              to coach me.
CTAs:     [ Continue ] (disabled until checkbox ticked)
          [ Read the full privacy policy ] (opens webview)
```

Continue routes to screen 4.

Behaviour:
- The checkbox state and a server timestamp write to
  `profiles.health_data_consent` and `consent_log` at tap-Continue.
- If the user backs out of onboarding before completing screen 3,
  no consent is recorded. They re-enter the flow at screen 1 next
  time.

### Screen 6: Goal lock consent (NEW, conditional)

Only shown if the goal selected on screen 5 is either:
- `physique_competition`
- `advanced_recomp`

For any other goal, this screen is skipped entirely (user goes
straight to screen 7, SCOFF).

Locked copy:

```
Title:    A note about aggressive cuts
Body:     You picked a goal that involves aggressive calorie cuts.
          That's fine. Volyume can support that, but it also has
          safety checks that hold a cut when your body is telling
          us something's wrong. We want you to know they're there.

          Confirm one of these:

          (•) I have prior experience managing aggressive cuts
              safely, or I'm working with a coach.
          ( ) I'm new to this and want Volyume's standard safety
              checks to apply.
CTAs:     [ Continue ]
Note:     You can change this any time from You → Goal lock.
```

If the user selects the first option, `profiles.goal_lock_advanced
= true`. The ED-pattern detector raises its threshold from 2 to 3
signals.

If the user selects the second option, the standard threshold
applies. Even an "advanced recomp" goal gets the standard sensitivity
unless they explicitly opt in.

The FFM floor (30 kcal/kg FFM/day) applies in both cases regardless.

### Screen 10: Food layer intro (NEW)

Locked copy:

```
Title:    Food tracking, made light
Body:     Volyume can use your food data to:

          - Tell you if a stalled lift is training or fuel
          - Catch low-fuelling before it becomes a problem
          - Adapt your calorie target as you go

          You can log foods by scanning a barcode, typing a name,
          or snapping a label. Most things resolve in under a
          second.

          Want to try it now or set it up later?
CTAs:     [ Set it up later ]
          [ Try a barcode now ]
```

"Try a barcode now" opens the scan flow (move #1.5+; before move
#1.5 ships, this button is replaced with "Add a food now" which
opens Search). User can return to the main app from either path.

"Set it up later" closes the intro and continues to screen 11.

Either way, `profiles.food_layer_introduced_at = now()`.

### Screen 12: First-run summary (EXTENDED)

Existing screen, lightly extended. The current screen shows the
user their calculated targets and a Train tab CTA. The extension
adds:

```
Below the existing targets block, a new line:

"Your daily food target: [kcal] / [protein]g protein"

Below the existing CTA:

[ Open Diary ] (secondary CTA)
```

Tapping "Open Diary" lands the user on the Diary tab for today.
Tapping the existing primary CTA lands on Train.

## Behaviour notes

- The flow is linear with a back button. The user can back up one
  step but cannot skip ahead.
- Closing the app mid-flow saves the position. On reopen they
  resume from the last-incomplete screen.
- Auth (sign-in or account creation) happens at screen 2. Screens
  3 onwards write to the user's profile.
- The flow takes 90-180 seconds on average for a careful user.

## Re-entry to the consent screens

Two paths to revisit screens 3 and 6 after onboarding:

- **You → Privacy → Manage health and nutrition consent** reopens
  screen 3. Withdrawing consent at this point triggers account
  deletion (because the engine can't run without Article 9 consent).
- **You → Goal lock** reopens screen 6 if the user is on a goal that
  supports it. Toggle changes apply at the next weekly engine run.

## Empty states and edge cases

- **User declines screen 3 consent**: they see a single follow-up
  screen: "Volyume can't run without consent to use your health and
  nutrition data. We're sorry; that's how the safety side of the
  engine works. You can delete this account and your data hasn't
  been saved." Single button: "Delete and exit."
- **Network failure during sign-up**: screens 3 onwards retry the
  profile write on next foreground. If retry fails twice, surface a
  "Trouble saving your account. Try again later." with retry button.
- **Account already exists** (returning user signing in): skip
  straight to the Train tab. Onboarding screens 3-12 are not
  reshown. (If the user has not completed onboarding, they re-enter
  at the last incomplete screen.)

## Implementation files

```
src/screens/onboarding/
├── WelcomeScreen.js                (existing)
├── SignInScreen.js                 (existing)
├── Article9ConsentScreen.js        (NEW)
├── BasicStatsScreen.js             (existing)
├── GoalSelectionScreen.js          (existing)
├── GoalLockConsentScreen.js        (NEW)
├── ScoffScreenerScreen.js          (existing)
├── ActivityLevelScreen.js          (existing)
├── EquipmentFrequencyScreen.js     (existing)
├── FoodLayerIntroScreen.js         (NEW)
├── NotificationsPermissionScreen.js (existing)
└── FirstRunSummaryScreen.js        (existing, extended)

src/navigation/OnboardingNavigator.js (extended with new screens)
```

## Acceptance check

- A fresh install reaches screen 12 (First-run summary) in 12
  screens with no skip path.
- Article 9 checkbox blocks Continue button until ticked.
- Goal lock screen appears only for physique competition or
  advanced recomp.
- Declining Article 9 deletes the account and exits cleanly.
- Backing out and reopening resumes at the last-incomplete screen.
- Food layer intro shows the right "Try a barcode" or "Add a food
  now" CTA based on whether move #1.5 has shipped (feature-flagged).
