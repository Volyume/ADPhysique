# Facts (second wave): copy and terminology sweep

Raw fact report saved verbatim from a read-only subagent run on 2026-07-09, second-wave ease-of-use hunt (founder request). Evidence for the ease-of-use strengthening pass. Facts only; judgement stays with the main session.

---

Based on my systematic sweep of `/home/user/ADPhysique/src/screens` and `src/components`, here are the findings:

## 1. TOAST MESSAGE STRINGS (Sample of ~65 unique messages)
- "Pick up to 3 muscles. Deselect one first"
- "Plan rebuilt around your new training setup"
- "Enter a name for your plan"
- "Setting up your profile, try again in a second"
- "Supersets pair two exercises for now."
- "Select at least two exercises to superset"
- "Give your plan a name before saving"
- "Add at least one training day"
- "Plan updated"
- "Open Health settings to turn weight reading off"
- "Could not connect. Try again in a moment."
- "Workouts will appear in your Health log from now on"
- "Add at least one exercise, or start empty from the footer."
- "Sign-in was cancelled."
- "Could not copy plan. Try again."
- "Could not save your session yet. Try Close again."
- "Refresh Partners and try again."
- "Could not save template. Try again."
- "This plan has no workouts yet"
- "A folder with that name already exists"
- "This meal has no foods in it."
- "Couldn't log."
- "Couldn't delete that meal."
- "Couldn't rename that meal."
- "PDF export is not available on this device."
- "Workout history cleared"
- "Partner connected"
- "Cheer sent"
- "Update shared with your partner"
- "Shared update deleted"
- "Partnership ended"
- "Invitation cancelled"
- "Marked as eaten."
- "Planned meals cleared."
- "Higher-calorie day planned. Your weekly total stays the same."
- "Nothing logged that day to copy."
- "Subscription unavailable, try again later"
- "Payment received. Finishing activation, this can take a moment"
- "Purchase did not complete, try again"
- "Saved to your gallery"
- "Profile picture updated"
- "Avatar updated"
- "Couldn't save. Try again." (appears in multiple contexts)

## 2. EMPTYSTATE TITLE PROPS (Unique titles found)
- "No body metrics yet"
- "No consistency data yet"
- "No data found"
- "No entries yet"
- "Couldn't load your review"
- "Add lifts for strength standards"
- "Couldn't load plans"
- "No plans found"
- "No cardio yet"
- "No training trends yet"
- "No data yet"
- "No sessions logged this week"
- "No block running yet"

## 3. TERMINOLOGY COUNTS (UI string literals)
- **"plan"**: 36 occurrences in titles/labels
- **"workout"**: 11 occurrences
- **"session"**: 8 occurrences  
- **"training"**: 8 occurrences (mostly in "Adjust training", "Training review", "Training blocks")
- **"block"**: 8 occurrences (in titles like "Training blocks")
- **"goal"**: 6 occurrences
- **"target"**: 13 occurrences (mostly in "Nutrition targets", "Per-day targets")

## 4. BUTTON LABEL VERB STYLES
- **"Save"**: 67 occurrences (primary CTA for persistence)
- **"Apply"**: 18 occurrences (single confirmed instance: CoachOutputScreen, plus many test references)
- **"Done"**: 6 occurrences
- **"Continue"**: 8 occurrences
- **"Confirm"**: 0 occurrences (not used)
- **"Add"**: 0 literal title="Add" (but appears in copy text)
- **"Start"**: 0 literal title="Start" (but "Start this workout", "Start without a plan")

## 5. EM DASH CHARACTER (—) LOCATIONS (Found 16 instances)
- Most are in test/comment files as part of guard assertions
- Found in: `ProSetupCompleteScreen.js` (comment), multiple test files documenting test purpose, `ProgressScanTrend.js`, `ProgressPhotoViewer.js`, `PhotoDatePicker.js`, `BeforeAfterShareSheet.js` (all in comments or test guards, not user-facing strings)
- **User-facing em dashes in screens/components**: NONE detected in actual UI strings

## 6. ELLIPSIS CHARACTER USAGE
- **"..." (three dots)**: 1,711 occurrences across all screens/components
- **"…" (single ellipsis character)**: 16 occurrences
- **Ratio**: Three-dot version vastly dominates (~99.1% vs 0.9%)
