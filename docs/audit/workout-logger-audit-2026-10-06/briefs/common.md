# Workout logger audit 2026-10-06: common brief for every lane

Authority: founder order 2026-10-06, verbatim: "audit the workout logger ...
build a complete picture of the workout logger all facilities paths, how it
fits together, the look and feel and everything else. Then ... investigate
all other similar workout loggers. What do they have that we don't that
brings value. How are they fit together. ... bring me proposals and options
before going to work". This is an AUDIT: read-only on the code. Nothing is
built in this round.

Hard bounds (CLAUDE.md section 2): you never edit, create or delete a file
under src/, modules/, plugins/, supabase/ or any test. You never commit,
push, stash, or touch main. You write ONLY the one report file your lane
names, under docs/audit/workout-logger-audit-2026-10-06/.

Evidence rule (CLAUDE.md, "evidence before assertion"): every finding is
file:line, quoting the line where it matters. Say what you OBSERVED, then
what it suggests, labelled. Read to the end of the mechanism before
concluding (a constant is not behaviour; find its consumer). Never describe
a feature from a comment or a name alone; find the code that does it. If a
path is ambiguous, or two parts of the code disagree, STOP on that point
and record it under "Ambiguities" rather than interpreting.

Report shape (D41 cap): structured, evidence-first, no narrative padding.
Headings as the lane brief lists them. Bullets of one to three lines, each
carrying its file:line. A detail-bearing map IS the deliverable, so be
complete rather than short: every facility, every path, every state.

British English. No em dashes.
