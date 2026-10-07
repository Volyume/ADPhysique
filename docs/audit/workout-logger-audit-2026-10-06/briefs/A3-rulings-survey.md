# Lane A3 (Haiku, read-only): every recorded ruling that touches the logger

Read first: common.md. This lane is a bounded grep-and-quote pass over the
project's decision records, so the redesign proposals never re-propose
something the founder rejected, reverted or locked.

Sources (all under docs/): ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md
(11,896 lines; the register), ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md,
ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md, TASKBOARD.md,
COACHING_VOICE_SYNTHESIS_LOCKED.md, UI_FLOWS_LOCKED.md, NOTIFICATIONS_LOCKED.md,
design-redesign-2026-09-14/ (the reverted redesign; read 20-DIRECTION-AND-PLAN.md
header and the register entry D193 for the verdict), rules/styling.md,
DESIGN_SYSTEM.md, and every folder or file under docs/audit/ whose name or
contents mention the logger.

Search terms (case-insensitive; run each over every source): "logger",
"ActiveWorkout", "active workout", "active-workout", "SetEntry", "set entry",
"set row", "LoggedSetRow", "rest timer", "RestTimer", "PRCelebration",
"PR celebration", "personal best", "WorkoutSummary", "summary screen",
"quick session", "freestyle", "swap", "warm-up", "warmup", "NowCard",
"now card", "WorkoutOutline", "outline", "bottom bar", "WorkoutBottomBar",
"StatusStrip", "status strip", "mini bar", "ActiveSessionMiniBar",
"Live Activity", "rest-timer-live", "widget", "plate", "RPE", "RIR",
"superset", "drop set", "cluster", "AMRAP", "typed", "kept as filled",
"complete set", "Complete Set", "Finish Workout", "finish", "discard",
"celebrat", "confetti", "haptic", "stepper", "numpad", "keyboard",
"exercise picker", "ExercisePickerModal", "reverted", "never re-propose",
"REVERTED".

Write ONE file: docs/audit/workout-logger-audit-2026-10-06/03-rulings-survey.md

Shape: a table, one row per distinct ruling, columns: Decision id (Dnn or
"unnumbered"), date, what it ruled (one line, quote the founder's words
where they are recorded), scope (which surface or behaviour), status words
as the source gives them (live, reverted, superseded, held, locked), source
path:line. Then three lists: (a) rulings that FORBID something on the logger
(never re-propose), (b) rulings that LOCK a behaviour (must be kept in any
redesign), (c) rulings that were REVERTED and the founder's reason, verbatim
where recorded. Then "Ambiguities". Quote; never paraphrase a founder verdict.
Do not interpret or judge; this lane only collects.

Do not touch anything outside your one report file.
