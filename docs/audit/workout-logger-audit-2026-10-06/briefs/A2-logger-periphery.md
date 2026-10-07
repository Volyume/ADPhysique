# Lane A2 (Sonnet, read-only): everything around the logging screen

Read first: common.md. Then read, in full: src/navigation/RootNavigator.js
(the routes that lead into and out of the logger), src/screens/TodayScreen.js
or whatever the home tab is (find it from the navigator), the components
that start a session (src/components/HomeChangeWorkoutSheet.js,
HomeLastSessionCard.js, NowCard-adjacent entry points, anything that
navigates to ActiveWorkout: grep navigate('ActiveWorkout' and the route
name), src/screens/PlansScreen.js, PlanDetailScreen.js,
RoutineDetailScreen.js, BuildWorkoutScreen.js, src/lib/quickSession.js and
quickSessionKit.js (entry side only), src/screens/WorkoutSummaryScreen.js
(all of it), src/screens/WorkoutHistoryScreen.js (all of it),
src/screens/ExerciseDetailScreen.js (all of it),
src/screens/SettingsWorkoutScreen.js, src/lib/sessionReport.js,
sessionShareData.js, volumeLogged.js, plateauSurfacing.js, pastWorkoutPRs.js
(read side), src/lib/database.js (ONLY the session, set, exercise, routine
and PR tables: schema, every read and write function used by the logger and
its periphery; quote the CREATE TABLE columns), the matching sync table
modules under src/lib/sync/tables/, src/widgets/ and
plugins/withVolyumeWidget.js (what the home-screen widget shows about
workouts), src/lib/notifications/ (only the parts that touch workouts:
session reminders, rest timer notification, post-workout), the exercise
corpus (src/lib/exerciseCorpus/index.js, vocab.js, families/: how many
exercises, what metadata each carries, whether there are images or
instructions, custom exercises), and
docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md (the
latest audit of logging correctness; summarise its still-open items).

Write ONE file: docs/audit/workout-logger-audit-2026-10-06/02-logger-periphery-map.md

Sections, in this order:
1. Entry paths: every way a user can arrive at the logging screen, as a
   numbered list (screen, control, what it passes, what the user sees next),
   including deep links, notifications, widgets, the mini bar and resume.
2. Exit paths: every way the user leaves it and where they land.
3. The session and set data model: tables, columns, meaning of every
   column, how a planned target is stored against a logged set, the typed
   versus kept flag, timestamps, ids, soft delete, the sync shape.
4. The summary screen: everything it shows, in order, with the source of
   each number (which lib function), what the user can do from it (share,
   edit, notes, rating), the coach's post-session adjustments if any, the
   community auto-post, and the path back.
5. History: how past sessions are listed, filtered, opened, edited, deleted;
   what a past session's detail shows; the calendar or streak if any.
6. Exercise detail: what a single exercise's page shows (history, charts,
   records, instructions, swap, notes) and from where it opens.
7. Settings that affect the logger: every preference, its default, its
   storage, and what it changes.
8. The exercise corpus: count, families, metadata fields, instructions,
   media, custom exercise support, retired ids handling.
9. Post-session effects: what the finished session feeds (weekly coach,
   recovery heatmap, volume, plateau surfacing, PRs, Community post,
   widget, notifications) with the function that reads it.
10. Widgets, Live Activities and watch: what exists, what it shows.
11. Open items from the 2026-10-03 logging audit still unresolved, with
    their path and status words.
12. Ambiguities.
13. Tests: one line per suite that pins any of the above.

Do not touch: anything outside your one report file. Lane A1 is mapping the
ActiveWorkoutScreen itself and its components; do not duplicate that beyond
naming the hand-off points.
