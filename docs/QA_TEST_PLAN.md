# Volyume QA Test Plan

## Stage 1 Verdict

**PARTIAL PASS** (tested on Android, 2026-05-16) — launch and blank workout logging pass; routine-start and active workout UX fixes pending Phase 1.5 APK.

---

## Phase 1.5 — Checklist Structure

Each test lists: Steps · Expected result · PASS/FAIL · Severity (Critical / High / Medium / Low)

---

## A. Smoke Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| A1 | Install APK on Android device | Installs without error | Critical |
| A2 | Tap app icon | Opens within 3 seconds, no crash | Critical |
| A3 | Cold start (after device restart) | Opens correctly | Critical |
| A4 | Tap "Continue without account" | Home screen loads, no backend required | Critical |
| A5 | Kill app, reopen | Returns to correct screen, no crash | Critical |
| A6 | Tap Train tab | Home/Train screen visible | High |
| A7 | Tap Log tab | Workout History visible | High |
| A8 | Tap Progress tab | Progress screen visible, title reads "Progress" | High |
| A9 | Tap You tab | Settings/profile screen visible | High |
| A10 | Navigate all tabs repeatedly | No crash, no blank screens | High |

---

## B. Routine Start Tests

Create with 3 exercises, verify exercises load and data persists.

| # | Step | Expected | Severity |
|---|---|---|---|
| B1 | Navigate to You → My Routines | Routine list visible | High |
| B2 | Create new routine | Routine created, appears in list | High |
| B3 | Add Exercise 1 (e.g. Bench Press) | Appears in routine exercise list | Critical |
| B4 | Add Exercise 2 (e.g. Squat) | Appears in list, order preserved | Critical |
| B5 | Add Exercise 3 (e.g. Cable Row) | Appears in list at position 3 | Critical |
| B6 | Press "Start This Workout" | Active workout opens | Critical |
| B7 | Check active workout exercise tabs | All 3 exercises present in correct order | Critical |
| B8 | Log 2 sets on Exercise 1 | Sets appear in logged list | Critical |
| B9 | Tap Next Exercise | Switches to Exercise 2 | High |
| B10 | Log sets on Exercise 2 and 3 | Each exercise logs independently | High |
| B11 | Press Finish Workout | Confirmation dialog appears | High |
| B12 | Confirm finish | Session Logged screen appears | High |
| B13 | Verify Session Logged summary | Exercises, hard sets, duration shown | High |
| B14 | Tap Save & Return | Returns to main screen | High |
| B15 | Kill and reopen app | App relaunches | Critical |
| B16 | Navigate to Log → History | Completed workout appears | Critical |
| B17 | Open workout from history | All 3 exercises and correct set data shown | Critical |
| B18 | Navigate to Progress | Volume data updated for logged muscles | High |

Empty routine edge case:

| # | Step | Expected | Severity |
|---|---|---|---|
| B19 | Create routine with no exercises | Routine saved | Medium |
| B20 | Press "Start This Workout" | Alert: "This routine has no exercises yet." with "Add Exercise" and "Start Blank Workout" options | High |
| B21 | Tap "Add Exercise" | Exercise picker opens | High |
| B22 | Tap "Start Blank Workout" | Active workout opens empty | High |

---

## C. Sample Routine Tests

Verify [SAMPLE] routines seed once and load correctly.

| # | Step | Expected | Severity |
|---|---|---|---|
| C1 | Navigate to You → My Routines | "[SAMPLE] Day 1 — Width, Rear Delts and Back Detail" visible | Critical |
| C2 | Verify Day 2 also present | "[SAMPLE] Day 2 — Upper Chest, Lateral Delts and Shoulder Refinement" visible | Critical |
| C3 | Open Day 1 routine | All 8 exercises listed in correct order | Critical |
| C4 | Press "Start This Workout" on Day 1 | Active workout opens with 8 exercises loaded | Critical |
| C5 | Verify exercise order | Face Pull first, Machine Lateral Raise last | High |
| C6 | Tap "Info" on Face Pull | Bottom sheet opens showing target and execution notes | High |
| C7 | Check notes content | Notes match Day 1 face pull notes, no pharmacology content | High |
| C8 | Log at least 2 sets on Face Pull | Sets logged correctly | High |
| C9 | Navigate through all 8 exercises | Each exercise accessible, no crash | High |
| C10 | Finish workout | Session Logged screen shows correct muscle groups | High |
| C11 | Kill and reopen, check history | Day 1 workout appears in history | High |
| C12 | Navigate to Progress | Back, Shoulders, Abs reflected in weekly volume | Medium |
| C13 | Repeat for Day 2 | 7 exercises load in correct order | High |
| C14 | Kill and fully reinstall app | [SAMPLE] routines appear exactly once (no duplicates) | Critical |
| C15 | Check Progress after both sessions | All affected muscles updated | High |

---

## D. Active Workout Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| D1 | Start workout, navigate to an exercise logged before | "PREVIOUS SESSION" card shows weight × reps in readable size | High |
| D2 | Verify previous performance format | e.g. "80kg × 10 · RIR 2   80kg × 9 · RIR 2" on one line | High |
| D3 | Start workout, first-ever exercise | Previous card shows "No previous logs." | High |
| D4 | Verify RIR is the only effort input visible | No RPE chip row visible | Critical |
| D5 | Select RIR 0 | Chip highlights, value stored | High |
| D6 | Check there is no RPE selector | RPE is not displayed or interactive | Critical |
| D7 | Verify set counter label | "SET 1 / 4 · Working set" (if routine sets defined) or "SET 1 · Working set" | High |
| D8 | Tap "Change" on set type | Bottom sheet opens with Working set, Warm-up, AMRAP, Drop set options | High |
| D9 | Select Warm-up | Label updates to "Warm-up" | High |
| D10 | Complete a warm-up set | Set logged, but should not count as hard set in volume | High |
| D11 | Select AMRAP | Label updates to "AMRAP" | Medium |
| D12 | Tap "Info" button | Bottom sheet opens with exercise name, target, notes | High |
| D13 | Info sheet for [SAMPLE] routine exercise | Shows execution notes from routine | High |
| D14 | Info sheet for non-sample exercise | Shows "No execution notes for this exercise." | Medium |
| D15 | Complete a set | Rest timer starts automatically | High |
| D16 | Verify haptic on set complete | Haptic fires (Medium impact) | Medium |
| D17 | Tap Plates | Plate calculator opens | Medium |
| D18 | Tap Note | Note input appears | Medium |
| D19 | Complete 3 sets, check logged list | All 3 appear with weight, reps, RIR | High |
| D20 | Complete sets up to routine target, check Next Exercise | Button visible for non-last exercises | High |
| D21 | Tap Next Exercise on last exercise | Finish Workout button visible | High |
| D22 | Tap Finish, confirm | Session Logged screen appears | Critical |
| D23 | Tap Finish with no sets logged | Confirmation asks "discard?" | High |

---

## E. Session Complete (Session Logged) Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| E1 | Finish any workout | Screen title: "Session Logged" | High |
| E2 | No large green circle in header | Compact checkmark icon only | Medium |
| E3 | Stats grid shows "Hard Sets" label | Not "Sets" | High |
| E4 | Hard Sets count excludes warm-ups | Warm-up sets not counted | High |
| E5 | Stats shows "Total Volume" (not just "Tonnage") | Label is "Total Volume" | Medium |
| E6 | "THIS WEEK AFTER SESSION" section visible | Muscle rows show correct hard set counts | High |
| E7 | Volume status labels correct | "Below target", "Growth range", "Near recovery ceiling", "Recovery debt" (not "Below MEV", "Optimal", etc.) | High |
| E8 | First session (<4 total) | "RECOMMENDATIONS" shows "Learning your landmarks…" message | High |
| E9 | After 4+ sessions | Auto-reg suggestions shown, language matches spec | High |
| E10 | "SESSION FEEDBACK" section is optional | Can scroll past without interacting | High |
| E11 | Feedback labels correct | "Pump quality", "Soreness coming in" (not "Pump", "Soreness before") | Medium |
| E12 | Tap Save & Return without touching feedback | Saves and returns to main screen | Critical |
| E13 | Verify completed workout in history | Same data visible after save | Critical |

---

## F. Data Consistency Tests

| # | Step | Expected | Severity |
|---|---|---|---|
| F1 | Complete workout, check Train tab Sessions count | Count increments by 1 | High |
| F2 | Train tab "WEEKLY HARD SETS" matches Progress tab | Same muscles, same counts | High |
| F3 | Complete workout with no warm-up sets | Hard set count matches logged working sets | High |
| F4 | Complete workout with mixed warm-up and working sets | Warm-ups excluded from hard set count | High |
| F5 | Volume Heatmap matches weekly volume source | Bars represent same data | High |
| F6 | Kill and reopen, navigate to Log → History | Workout still present | Critical |
| F7 | Routine workout in History | Correct routine name shown | Medium |
| F8 | Start same routine twice in same week | Both sessions appear in history | High |
| F9 | RIR logged → RPE stored correctly | Stored RPE = 10 − RIR (verify via debug if needed) | Low |

---

## G. Compliance and Quality Checks

| # | Check | Expected | Severity |
|---|---|---|---|
| G1 | No medical/injury prevention claims | Absent from all UI copy | Critical |
| G2 | No PED/pharmacology content | Not present in seed data, notes, or UI | Critical |
| G3 | No guaranteed results copy ("build muscle guaranteed") | Absent | Critical |
| G4 | No placeholder copy ("coming soon", "TBD") except explicitly deferred features | Absent | High |
| G5 | No emoji in functional UI copy | Absent | Medium |
| G6 | No broken navigation buttons | All tappable elements navigate correctly | High |
| G7 | No crash across any screen | App stable throughout test session | Critical |
| G8 | Tab labels correct | Train / Log / Progress / You | High |
| G9 | [SAMPLE] prefix on seeded routines | Both routines clearly labelled | High |
| G10 | Hard Sets terminology consistent | Used in Train, Progress, Session Logged | Medium |

---

## Routine Start Regression Test

Run after every change touching routines or active workout:

- [ ] Create routine with 3 exercises → Start → confirm exercises load in order → log sets → finish → verify history/persistence
- [ ] Press Start on [SAMPLE] Day 1 → 8 exercises load in order → log sets → finish → verify
- [ ] Create routine with no exercises → press Start → confirm alert with "Add Exercise" and "Start Blank Workout"

---

## Set Type UX Regression Test

Run after every change to SetEntry or set type picker:

- [ ] Start workout, add exercise
- [ ] Confirm RPE chip row is not visible
- [ ] Confirm default set type label reads "Working set"
- [ ] Tap "Change" → bottom sheet opens with Working set, Warm-up, AMRAP, Drop set
- [ ] Each option has a one-line description
- [ ] Select "Warm-up" → label updates → set logged as warm-up
- [ ] Warm-up does not count in hard set total on Session Logged screen

---

## General Regression Tests

Run after every fix before pushing a new build:

- [ ] App launches without internet
- [ ] Local mode works without Supabase credentials
- [ ] Set data persists after app restart
- [ ] Rest timer fires after set completion
- [ ] Exercise library loads with 100+ exercises
- [ ] Navigation between all tabs works without crash
- [ ] [SAMPLE] routines appear once (no duplication on relaunch)
