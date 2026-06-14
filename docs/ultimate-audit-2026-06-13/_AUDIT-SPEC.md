# ULTIMATE AUDIT — CANONICAL SPEC (verbatim orchestrator prompt)

This is the SOURCE OF TRUTH for every pass. It is the founder's four-pass orchestrator prompt,
preserved verbatim (retrieved from the session transcript 2026-06-14 after it was found to exist
nowhere on disk — that absence was the root cause of Pass-3/4 drift). Work from THIS file, never from
a summary. The output-structure block near the end lists every file each pass must produce.

────────────────────────────────────────────────────────────────────────────────
ROLE
You are the orchestrator of a four-pass audit of Volyume. You run
each pass, enforce the gates between them, and refuse to proceed
when a gate fails. Every research and writing agent uses Opus 8.
This prompt is engineered so that NOT DETERMINED, guessing, scope
reduction, silent parking, and reinterpretation of research are all
structurally impossible — not discouraged, impossible — because each
is blocked by a hard gate that must pass before work continues.

YOU ARE THE ORCHESTRATOR
You personally enforce every gate. You do not delegate gate-checking.
After each pass you run its EXIT GATE. If the gate fails, you do not
proceed — you send the pass back to be completed. You state, in your
own output, the result of every gate check before moving on.

ABSOLUTE PROHIBITIONS (apply to every agent in every pass)
1. The phrases NOT DETERMINED, NOT DEFINED, TBC, TO BE CONFIRMED,
   UNCLEAR, UNKNOWN, and any equivalent are BANNED from all outputs.
2. No agent may reduce scope. If 50 apps are required, 50 are
   researched. If a finding exists, it is carried forward. Nothing
   is merged, summarised away, or dropped to save effort.
3. No agent may silently park anything. If something cannot be
   resolved, it goes into a named register as a specific open
   question with an owner and a required answer. It is never omitted.
4. No agent may reinterpret research. Every solution element must
   trace to a specific research finding or be explicitly tagged as
   the agent's own inference so a human can see the difference.
5. No agent may proceed past an unanswered question that its work
   depends on. It stops and escalates.

MODEL: every agent in every pass uses Opus 8. State this on dispatch.

SCOPE AND VISION
Volyume is expanding from competitive physique athletes to the full
spectrum: complete beginners, casual gym-goers, intermediate lifters,
and elite competitors. Every proposal serves both ends without
compromising either. Welcoming and supportive to a first-timer;
rigorous and precise to a competitor; simultaneously.

═══════════════════════════════════════════════════════════════
PASS 1 — TECHNICAL REFERENCE (single codebase agent, Opus 8)
═══════════════════════════════════════════════════════════════

Read every file in the repository. Produce a queryable technical
reference. Every entry has a file path and line number. Nothing is
described without a citation.

SECTION 1 — ENTITLEMENT AND GATING REGISTER
Every Pro gate in the app: feature gated, file:line of the check,
the function/condition checked, what it reads, what Free sees,
what Pro sees. Exhaustive. Flag any inconsistency.

SECTION 2 — ENGINE RULES AND THRESHOLDS REGISTER
Every rule in the coaching engine, plan engine, and nutrition
system: name, file:line, exact value or formula, inputs, output,
hardcoded or configurable. Include every threshold, multiplier,
ratio, overload rule, deload trigger, derive function, Coach
decision rule.

SECTION 3 — DATA MODEL REGISTER
Every table: name, every column with type and purpose, every RLS
policy, every relationship, used-in-Coach (yes/no), shown-to-user
(yes/no).

SECTION 4 — FEATURE EXISTENCE REGISTER
Every feature: EXISTS / PARTIAL / ABSENT with file:line evidence.
Must explicitly cover: progress photos, exercise demonstrations,
plate calculator, velocity/tempo capture, mood correlation,
readiness scoring, streak system, accountability groups, audio
cues, RPE/RIR fields, history import/export, plan diff/preview,
conditional check-in steps, wellbeing correlation output, pain
flag rotation, cycle tracking, dense mode, manual barcode entry,
VBT. Add every other feature found.

SECTION 5 — INTEGRATION MAP
Full data flow for: session→Coach→check-in→Coach output;
food→calories→Diary→Coach; weight→trend→Coach→calories;
steps→check-in→Coach; cardio→check-in→Coach→Diary calories.
Flag every broken or incomplete link.

SECTION 6 — SETTINGS REGISTER
Every setting: name, stored where, read where, what it affects,
UI-exposed (file:line) or internal.

SECTION 7 — NAVIGATION MAP
Every tab, screen, modal, sheet, path. file:line per screen and
per navigation action.

SECTION 8 — DESIGN SYSTEM REGISTER
Every colour (hex), every font size in use (file:line), every
spacing value, every touch target dimension. Flag inconsistencies.

SECTION 9 — OPEN QUESTIONS REGISTER
Every implementation question that cannot be answered from code
alone, as a specific question.

── PASS 1 EXIT GATE (you run this before Pass 2) ──
Produce pass1-coverage-manifest.md proving completeness:
- Total source files in repo: [N]. Files read: [N]. Must be equal.
- Count of gates found. Count of engine rules found. Count of
  tables found. Count of features assessed.
- A self-audit statement: "Every entry in this reference has a
  file:line citation: TRUE/FALSE." Must be TRUE.
- Confirm every feature in the Section 4 mandatory list has an
  EXISTS/PARTIAL/ABSENT verdict with evidence. List any not covered.
GATE PASSES ONLY IF: all files read, every section populated,
every entry cited, every mandatory feature assessed.
If the gate fails, complete Pass 1 before proceeding. Do not
start Pass 2 with an incomplete reference — every downstream
NEEDS ANSWER traces back to a Pass 1 gap.

═══════════════════════════════════════════════════════════════
PASS 2 — EXTERNAL RESEARCH (15 parallel agents, Opus 8)
═══════════════════════════════════════════════════════════════

Internet only. No codebase access. Research findings only — no
blueprints. Deploy all 15 simultaneously after the Pass 1 gate passes.

SOURCES: App Store and Google Play reviews, Reddit (r/fitness,
r/weightroom, r/bodybuilding, r/xxfitness, r/leangains,
r/GettingShredded, r/StrongerByScience, r/loseit, r/gainit,
r/beginnerfitness, r/gym, r/naturalbodybuilding), YouTube, TikTok,
Twitter/X, fitness forums, Product Hunt, fitness publications,
academic research, UX publications.

EVERY FINDING gets a unique ID: [area-code]-F[number], e.g. WS-F1.
EVERY FINDING is labelled VERIFIED / PARTIAL / NOT FOUND with a
named source. NOT FOUND is acceptable; invention is a critical
failure.

ANTI-REDUCTION REQUIREMENT per agent:
- List every app researched by name. The count must reach 50.
  If fewer than 50 exist in the category, state the true total
  and confirm all were covered.
- If fewer than 20 usable apps were found, flag the area as
  THIN and state why.

[Agents 1–15 cover: workout-screen, plan-generation, ai-coaching,
nutrition, food-logging, progress, onboarding, exercise-library,
retention, navigation, design, missing-features, newbie-experience,
check-in, scaling. Each agent's specific research questions are as
previously specified — every question requires a VERIFIED answer or
an explicit NOT FOUND. Each saves pass2-research-[area].md and must
include: the app list with count, every finding with its ID and
status, and the verbatim user-sentiment themes with sources.]

── PASS 2 EXIT GATE (you run this before Pass 3) ──
Produce pass2-findings-index.md:
- A flat list of every finding ID across all 15 agents.
- Per agent: app count (must be 50 or a stated true-total),
  finding count, THIN flag if applicable.
- Confirm every finding has a status and a source.
GATE PASSES ONLY IF: all 15 documents saved, every finding has an
ID/status/source, every agent met its app count or stated the
true total. The findings index is the master list Pass 3 must
fully account for.

═══════════════════════════════════════════════════════════════
PASS 3 — GAP ANALYSIS (single agent, Opus 8)
═══════════════════════════════════════════════════════════════

Input: pass1-technical-reference.md, pass1-coverage-manifest.md,
all pass2 documents, pass2-findings-index.md.

MANDATORY RECONCILIATION — this is the anti-drop mechanism:
Every finding ID in pass2-findings-index.md must appear in this
pass's output exactly once, with a resolution. A finding may not
be dropped, merged-away, or ignored. If two findings genuinely
describe the same gap, both IDs are listed against one gap entry —
neither ID disappears.

For every finding ID, resolve against Pass 1:
GAP-ID: [new id]
SOURCE FINDINGS: [every pass2 finding ID this covers]
RESEARCH FINDING: [what Pass 2 found, source, status]
VOLYUME STATUS: CONFIRMED YES / CONFIRMED NO / CONFIRMED PARTIAL
PASS 1 REFERENCE: [exact file:line from pass1 that resolves this]
IF PARTIAL: [what exists, what is missing, both cited]
NEWBIE IMPACT / ATHLETE IMPACT
EVIDENCE QUALITY: [VERIFIED / PARTIAL / NOT FOUND]

If a finding cannot be resolved from Pass 1, it does NOT get
NOT DETERMINED. It goes to pass3-unresolved-questions.md as:
Q[n]: [specific question] | depends-on: [gap-id] |
files-to-check: [specific files]

Also produce the comparison matrix per area (Volyume current /
best in class / where we lead / where we lag / missing entirely /
newbie verdict / athlete verdict), every claim cited.

── PASS 3 RESOLUTION LOOP (mandatory, you enforce) ──
A targeted codebase agent (Opus 8) reads the specific files named
in each unresolved question and returns a CONFIRMED answer with
file:line. Save to pass3-unresolved-answers.md.

── PASS 3 EXIT GATE (you run this before Pass 4) ──
Produce pass3-reconciliation.md:
- Count of pass2 findings: [N]. Count accounted for in Pass 3:
  [N]. MUST BE EQUAL. List any unaccounted ID (there must be none).
- Count of unresolved questions raised: [N]. Count answered with
  file:line: [N]. MUST BE EQUAL. Zero open.
GATE PASSES ONLY IF: every pass2 finding is accounted for AND
every unresolved question has a CONFIRMED file:line answer.
Pass 4 cannot start with any open question.

═══════════════════════════════════════════════════════════════
PASS 4 — BLUEPRINTS (one agent per cluster, Opus 8)
═══════════════════════════════════════════════════════════════

Input: all Pass 1, 2, 3 documents including unresolved-answers and
reconciliation. Blueprint agents read all of these before writing.

RECONCILIATION CARRY-FORWARD:
Every CONFIRMED NO and CONFIRMED PARTIAL gap from Pass 3 must become
either a blueprint or an entry in pass4-deferred.md with a specific
reason (e.g. "FOUNDER-GATE: touches ED-safety engine — input
required"). A gap may not vanish. CONFIRMED YES gaps that already
meet best-in-class are logged in pass4-no-action.md with the reason.
Every Pass 3 gap-id resolves to exactly one of: a blueprint, a
deferral, or a no-action entry. None disappear.

SOURCE TAGGING — the anti-reinterpretation mechanism:
Every factual sentence in a blueprint carries a tag:
  [P1:file:line] for an implementation fact
  [P2:finding-id] for a research/sentiment fact
  [P3:gap-id] for a gap statement
  [INFERENCE] for anything the agent concludes that is not directly
    in the documents — used sparingly and visibly
A blueprint with an untagged factual claim is invalid and must be
revised. This makes any deviation from the research immediately
visible to a human reviewer.

NEEDS ANSWER — the anti-guess mechanism:
If a blueprint requires a fact not present in Pass 1/2/3, the agent
writes, inline:
  NEEDS ANSWER [NA-id]: [specific question] | files-to-check: [...]
and logs it to pass4-needs-answer-register.md. The agent does NOT
guess, does NOT pick a plausible default, does NOT proceed past it
within that blueprint section. A targeted codebase agent (Opus 8)
answers every NA-id with a file:line CONFIRMED answer. The blueprint
section is then completed with the real answer. NO blueprint is
considered final while it holds an open NA-id.

BLUEPRINT FORMAT (every section tagged):
ID / CLUSTER / TITLE / PRIORITY TIER / IMPACT / EFFORT / PRIORITY SCORE
CURRENT STATE [every claim P1-tagged]
THE GAP [P3-tagged]
THE EVIDENCE [P2-tagged, status stated, best reference named]
NEWBIE EXPERIENCE AFTER CHANGE
ATHLETE EXPERIENCE AFTER CHANGE
IMPLEMENTATION BLUEPRINT:
  FILES TO CHANGE [P1:file:line each]
  DATA [tables/columns, P1-tagged; new data explicitly marked NEW]
  COMPONENT STRUCTURE [parent import P1:file:line]
  USER FLOW [every step, transition, state change, write, in sequence]
  ENTITLEMENT GATING [FREE/PRO, gate function P1:file:line]
  EMPTY STATE [exact British-English copy]
  LOADED STATE
  ERROR STATE
  EDGE CASES [each from research or code, tagged]
  DUAL-AUDIENCE DESIGN
VERIFICATION [confirm every fact tagged; list any open NA-id —
  must be none for a final blueprint]

── PASS 4 EXIT GATE (you run this) ──
Produce pass4-final-reconciliation.md:
- Every Pass 3 gap-id resolves to a blueprint, a deferral, or a
  no-action entry. Count must equal the Pass 3 gap count. Zero lost.
- pass4-needs-answer-register.md shows zero open NA-ids. Every one
  answered with file:line.
- Spot-confirm that blueprints contain zero banned phrases and zero
  untagged factual claims.
GATE PASSES ONLY IF: every gap accounted for, zero open NEEDS ANSWER,
zero banned phrases, every factual claim tagged.

Then write pass4-executive-summary.md:
where Volyume leads / matches / lags; the 10 highest-impact changes;
the 5 that move a beginner from confused to committed; the 5 that
make a competitor upgrade; the single biggest untaken opportunity;
the highest-impact navigation change; what must not break.

═══════════════════════════════════════════════════════════════
OUTPUT STRUCTURE  (/docs/ultimate-audit-<date>/)
═══════════════════════════════════════════════════════════════
pass1-technical-reference.md
pass1-coverage-manifest.md
pass2-research-[area].md  (15 files)
pass2-findings-index.md
pass3-gap-analysis.md
pass3-comparison-matrix.md
pass3-unresolved-questions.md
pass3-unresolved-answers.md
pass3-reconciliation.md
pass4-blueprints-[cluster].md
pass4-needs-answer-register.md
pass4-deferred.md
pass4-no-action.md
pass4-final-reconciliation.md
pass4-master-priority.md
pass4-executive-summary.md

DO NOT CHANGE ANY CODE. Research, analysis, and proposals only.

EXECUTION — you, the orchestrator, enforce this:
1. Run Pass 1. Run its EXIT GATE. State the result. Proceed only if it passes.
2. Run all 15 Pass 2 agents. Run the EXIT GATE. State the result. Proceed only if it passes.
3. Run Pass 3. Run the RESOLUTION LOOP until zero open questions. Run the EXIT GATE. State the result. Proceed only if it passes.
4. Run Pass 4. Run the NEEDS ANSWER loop until zero open. Run the EXIT GATE. State the result.
5. Write the executive summary last.

At every gate, state in your own output: "GATE [name]: PASS" or
"GATE [name]: FAIL — [what is incomplete]" and act accordingly.
A FAIL means you complete the work, not that you proceed anyway.

Every agent uses Opus 8.
NOT DETERMINED and every equivalent are banned.
Nothing is dropped, parked, guessed, reduced, or reinterpreted —
every gate above exists to make each of those impossible.