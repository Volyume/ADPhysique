# Volyume QA Test Plan

## Stage 1 — Core Logging Flow

**Verdict: PARTIAL PASS** (tested on Android, 2026-05-16) — launch and blank workout logging pass; routine-start and active workout UX fixes pending.

### Pass Criteria

Stage 1 passes when a user can log a real workout locally without crashes or data loss.

### Manual Test Checklist

Run this checklist on every new APK before declaring a stage complete.

#### 1. Install + Launch
- [ ] Install APK on Android device
- [ ] Tap Volyume icon
- [ ] App opens — no "keeps stopping", no black screen, no freeze
- [ ] Login/landing screen visible

#### 2. Local Mode
- [ ] Tap "Continue without account" (or equivalent)
- [ ] App proceeds without requiring internet or credentials
- [ ] Home screen loads within 2 seconds

#### 3. Exercise Library
- [ ] Navigate to exercise library
- [ ] Search for "bench" — Bench Press appears
- [ ] Search for "squat" — Squat appears
- [ ] Filter by muscle group — results filter correctly
- [ ] Clear filter — full list returns

#### 4. Start a Blank Workout
- [ ] Start a new workout (from Home or Workout tab)
- [ ] Active workout screen opens
- [ ] Workout timer starts counting

#### 5. Add 3 Exercises
- [ ] Add Exercise 1: e.g. Bench Press
- [ ] Add Exercise 2: e.g. Squat
- [ ] Add Exercise 3: e.g. Barbell Row
- [ ] All 3 appear in the exercise navigation tabs

#### 6. Log Sets Per Exercise
- [ ] On Exercise 1: log 3 sets (enter weight, reps, RIR each time)
- [ ] Tap COMPLETE SET — set appears in logged list
- [ ] RIR control works (0–4 range)
- [ ] RPE control works (6–10 range)
- [ ] Previous session data shows inline (on second+ workout)

#### 7. Rest Timer
- [ ] After completing a set, rest timer fires automatically
- [ ] Timer counts down visibly
- [ ] Haptic feedback fires on set completion
- [ ] Timer does not block set logging (can log next set before timer ends)

#### 8. Move Between Exercises
- [ ] Tap exercise tab — switches to that exercise
- [ ] Tap "Next Exercise" button — moves to next exercise in order
- [ ] Log 2–3 sets on Exercise 2
- [ ] Log 2–3 sets on Exercise 3

#### 9. Finish Workout
- [ ] On last exercise, "Finish Workout" button is visible and prominent
- [ ] Tap Finish Workout
- [ ] Confirmation shown (if applicable)
- [ ] Workout summary/session complete screen appears
- [ ] Summary shows exercise count, set count, duration

#### 10. Analytics Update
- [ ] Navigate to Analytics tab
- [ ] Volume data reflects the completed workout
- [ ] Muscle group sets counted correctly

#### 11. Kill and Reopen (Persistence Test)
- [ ] Close/kill the app completely
- [ ] Reopen Volyume
- [ ] Navigate to History tab
- [ ] Completed workout appears with correct date, exercises, set count
- [ ] Workout details correct (sets, weights, reps)

#### 12. Edge Cases
- [ ] Log a workout with only 1 exercise — "Finish Workout" shows immediately
- [ ] Add exercise mid-workout — new exercise appears in nav tabs
- [ ] Log a set with weight = 0 (bodyweight) — no crash
- [ ] Log a set with no RIR entered — no crash, no calculation failure
- [ ] Tap Finish immediately with no sets logged — app handles gracefully

---

## Stage 2 QA — Hypertrophy Intelligence
*(Do not run until Stage 1 is confirmed stable)*

- [ ] PR detection fires on new personal best
- [ ] 1RM estimates display without false precision
- [ ] Weekly volume per muscle calculates correctly
- [ ] MEV/MAV/MRV status colours correct
- [ ] Warm-up sets excluded from hard-set volume count
- [ ] Drop sets, rest-pause sets handled in logging
- [ ] Missing RIR does not break volume calculation
- [ ] kg/lb toggle applies across all displays
- [ ] Deload suggestion appears after sustained fatigue signals
- [ ] Exercise substitution returns same primary muscle, lower/equal fatigue cost

---

---

## Routine Start Regression Test

Run after every change to routine or active workout flows:

- [ ] Create a routine with 3 exercises (e.g. Bench Press, Squat, Row)
- [ ] Save the routine
- [ ] Press "Start This Workout"
- [ ] Confirm active workout opens with those 3 exercises (not blank)
- [ ] Confirm exercise order is preserved (Bench Press first, etc.)
- [ ] Log sets across all 3 exercises
- [ ] Finish workout
- [ ] Confirm summary shows all 3 exercises
- [ ] Kill and reopen app
- [ ] Confirm workout persists in history with all 3 exercises and correct set data

Empty routine edge case:
- [ ] Create a routine with no exercises
- [ ] Press "Start This Workout"
- [ ] Confirm alert appears: "No exercises" with "Add Exercise" and "Start Blank Workout" options
- [ ] "Add Exercise" opens the add-exercise picker
- [ ] "Start Blank Workout" opens an empty active workout

---

## Set Type UX Test

Run after every change to SetEntry or set type picker:

- [ ] Start a blank workout, add an exercise
- [ ] Confirm advanced set type chips are not all visible by default
- [ ] Confirm the default set type label reads "Straight set"
- [ ] Tap "Change" next to Set type
- [ ] Confirm bottom sheet opens with Common and Advanced sections
- [ ] Confirm each set type has a short description line
- [ ] Select a non-straight set type (e.g. Drop set)
- [ ] Confirm the set type label updates to reflect the selection
- [ ] Log a set — confirm logging flow remains fast and uncluttered
- [ ] Complete set — confirm logged set row reflects the selected type

---

## Regression Tests

Run after every fix to confirm nothing regressed:

- [ ] App still launches without internet
- [ ] Local mode still works without Supabase credentials
- [ ] Set data persists after app restart
- [ ] Rest timer still fires after set completion
- [ ] Exercise library still loads with 100+ exercises
- [ ] Navigation between tabs works without crash
