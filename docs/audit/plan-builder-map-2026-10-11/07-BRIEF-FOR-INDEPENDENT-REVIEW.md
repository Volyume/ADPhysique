# 07 Brief for the independent deep research (version 2, 2026-10-11)

Paste this prompt with PLANNER-MAP-FULL.md attached (or PLANNER-MAP-CORE.md if the tool limits upload size).

You are an expert strength and hypertrophy coach, sports scientist and software architect. I run Volyume, a live bodybuilding app. Its training-plan builder has been producing unsafe, unbalanced plans: the same muscles trained on back-to-back days, overhead pressing in three of four sessions, sessions of 9+ exercises running 80 to 130 minutes, and structures that do not match how each physique category actually trains. The attached file is a factual map of the current builder: how it works step by step, what changes plans after they are built, 42 real sample plans, measured problems over 1,440 generated plans, and the same plans built by three versions of the code. Treat its prose as claims and its samples and measurements as evidence.

I want to replace guesswork with a proper STRUCTURE ENGINE governed by a written RULEBOOK and an automatic CHECKER, so that every plan the app can produce is correct by construction and verified before release. Your job is the deep research and the specification. An engineer will implement your output directly, so it must be precise, complete, sourced and machine-readable. Take as long as you need. Do not stop at a few web searches: use peer-reviewed literature (meta-analyses first), recognised federation rulebooks, and named elite coaches' and competitors' published programmes, and reconcile them.

FIXED CONSTRAINTS (product law; design within them, do not change them)
1. Deterministic engine: identical inputs always give an identical plan. No AI or randomness at runtime. It runs offline on a phone in JavaScript.
2. No fixed training days. Sessions run as a rotation, so the next session may be the next calendar day. Recovery rules must hold for that worst case unless you justify otherwise.
3. Categories: general hypertrophy, open bodybuilding, men's physique, classic physique, bikini, wellness, figure, women's physique. Days per week: 2 to 6. Session length chosen by the user: 30 to 90+ minutes. Equipment: full gym, machines and cables, dumbbells only, home gym, barbell and plates, bodyweight. Experience: beginner, intermediate, advanced. Up to three "focus" muscles the user wants to bring up.
4. The category's standard routine is always kept; focus picks add on top and never take from it.
5. No exercise or set is ever removed silently to fit the clock. Rest may be shortened within safe limits, then the real length is shown. If the standard genuinely cannot fit, say what the engine must do instead (for example change the structure, or tell the user the minimum days or minutes needed) and justify it.
6. Men's physique trains legs in one session a week at every day count (founder decision). If the evidence strongly contradicts this, say so with sources, but design for it.
7. Injury risk from poor structure is unacceptable. Recovery is never traded for volume.

WHAT TO RESEARCH AND DECIDE (give the reasoning, the sources and an evidence grade for each: A meta-analysis or several good trials, B one or two good trials, C small or indirect evidence, D expert or coach consensus)

1. Category structures. For each category, its judging criteria (quote the federation rule) and how elite coaches and competitors actually programme it in the off-season. For each category and each of 2 to 6 days: the correct weekly structure (session names, muscles per session, order), which sessions must never be adjacent, and why. Where coaches disagree, show the split of opinion and choose with reasons.

2. Muscle model. The list of muscles the engine should track (for example, should back be split into lats and upper back, should side, rear and front delts be separate, should glutes and adductors be separate) and why.

3. Volume. For each category and muscle: weekly direct sets for an intermediate (minimum to grow, typical, upper limit), sessions per week, and how much a focus pick adds. How beginner and advanced change these. How indirect work counts (for example a chest press for triceps and front delts): the fraction per movement pattern, with sources.

4. Recovery. For each muscle: minimum hours before it is trained directly again, by session load (light, moderate, heavy) and effort (reps in reserve). Whether indirect load counts against that window. Which muscles, if any, may safely be trained on consecutive days and under what limits. Joint and connective-tissue recovery, not only muscle.

5. Session limits. Maximum exercises, working sets, sets per exercise (compound and isolation), direct sets per muscle per session, exercises per muscle per session; how these change with session length and experience; the safe floor for rest per exercise type.

6. Joint protection. Shoulder (overhead pressing frequency, pressing on consecutive days, front-delt overload in men's physique and bodybuilding), lumbar spine (heavy hinges and squats close together), elbows (arm isolation frequency), knees. Each rule with reasons and sources.

7. Exercise selection. A movement-pattern taxonomy per muscle (for example vertical pull, horizontal pull, fly, overhead press, hinge, squat, knee flexion); what counts as the same exercise or the same pattern for variety rules; whether the same exercise may appear in back-to-back sessions; exercise order within a session; equipment substitutions when a muscle has only one exercise available, and whether one exercise may then take extra sets.

8. Progression. Block length, week-1 starting volume, the weekly climb, the deload, and how weekly check-ins may raise, hold or reduce volume, all bounded by sections 4 to 6.

9. Conflicts. A strict priority order for when these goals conflict: recovery, joint protection, the category standard, focus additions, session limits, session length, growth above the standard. Mark each item HARD (never broken; the engine must restructure) or SOFT (an objective). Explain what the engine does when the hard rules cannot all be met.

10. Engine design. The stages of a deterministic structure engine (for example: choose the template, place muscles into sessions, check adjacency, choose exercises by pattern, allocate sets, order the session, validate, report), with each stage's inputs, outputs, the rules it enforces, and deterministic tie-breaks. Say which parts of the current builder and of the older generator (both described in the map) are worth keeping, and whether to repair, revert or replace.

11. Post-build changes. For each path that changes a plan after it is built (weekly serving, check-ins, swaps, rebuilds, library plans, next block), what it may change and which rules it must re-check.

12. Diagnosis. Using the map's samples and measurements, list what is structurally wrong and which mechanism causes each fault.

OUTPUT FORMAT (follow exactly; the engineer will load Part B directly)

Part A, the report: sections 1 to 12 above, in order. Plain language, sources inline, evidence separated from your judgement, uncertainty stated.

Part B, the machine-readable rulebook: fenced JSON blocks, one per item below, using these keys. Every numeric value carries "grade" and "sources".
- "muscles": [{ "key", "name", "notes" }]
- "patterns": [{ "key", "muscle", "name", "kind": "compound|isolation", "credits": { "<muscle>": fraction }, "joint_load": ["shoulder_press" | "spinal_axial" | "elbow" | "knee" | ...] }]
- "volume": { "<category>": { "<muscle>": { "min", "typical", "max", "sessions_per_week": { "2": n, "3": n, "4": n, "5": n, "6": n }, "focus_add", "beginner_factor", "advanced_factor", "grade", "sources" } } }
- "recovery": { "<muscle>": { "min_hours": { "light", "moderate", "heavy" }, "indirect_counts": true|false, "indirect_threshold_sets", "consecutive_days_allowed": true|false, "grade", "sources" } }
- "session_limits": { "max_exercises", "max_working_sets", "max_sets_per_exercise": { "compound", "isolation" }, "max_direct_sets_per_muscle", "max_exercises_per_muscle", "min_rest_seconds": { "heavy_compound", "moderate_compound", "machine", "isolation" }, "by_session_length": {...}, "grade", "sources" }
- "joint_rules": [{ "id", "rule", "check", "severity": "hard|soft", "grade", "sources" }]
- "templates": { "<category>": { "<days>": { "sessions": [{ "name", "muscles": [...], "primary_patterns": [...] }], "never_adjacent": [[session, session]], "grade", "sources" } } }
- "priority_order": [{ "goal", "type": "hard|soft", "reason" }]
- "progression": { "block_weeks", "week1_fraction_of_peak", "weekly_step", "deload": {...}, "checkin": {...}, "grade", "sources" }
- "checks": [{ "id", "description", "formula", "severity" }]: every rule as a pass-or-fail test over a generated plan, written so a program can evaluate it (for example "for every pair of back-to-back sessions, for every muscle, direct_sets(a) >= 2 and direct_sets(b) >= 2 implies false unless recovery.consecutive_days_allowed").
- "golden_plans": at least one complete reference plan for every category at 3, 4 and 5 days (60 minutes, full gym, intermediate, no focus), plus men's physique at 4 days with focus side delts and biceps, general at 2 days, bikini at 4 days with focus glutes, and one dumbbells-only and one 45-minute case. Each: sessions in order, each exercise slot as a movement pattern with sets in week 1 and at the peak, rep range and rest, and a line confirming it passes every check.
- "edge_cases": [{ "inputs", "expected_behaviour", "reason" }]: the hardest input combinations (for example 2 days, 30 minutes, bodyweight, beginner, three focus muscles) and exactly what the engine should do.

Before you finish, verify that every golden plan passes every check in "checks", that no template breaks a joint rule or recovery rule, and that the JSON is valid. List anything you could not resolve.
