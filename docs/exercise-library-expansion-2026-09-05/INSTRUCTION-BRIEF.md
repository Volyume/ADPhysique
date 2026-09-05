# Instruction-audit agent brief (shared, D151)

Authority: founder brief 2026-09-05 (instruction quality: original,
technically accurate, concise, natural British English, useful while
standing in a gym, free from AI-style prose, consistent in structure) and
the decisions register entry D151; the mechanical contract is
`src/lib/exerciseCorpus/instructionContract.js` and the reviewer's view is
`node scripts/exercise-library/audit-instructions.mjs --family=<family> --no-write`.
Voice rules: `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (calm, plain, no
shame, no clipped commands); CLAUDE.md language rules (British English,
no em dash, no en dash).

## Your lane
Exactly the family file(s) named in your dispatch under
`src/lib/exerciseCorpus/families/`. Edit ONLY the `setup`, `execution`
and `watch` strings of entries in those files. Never touch any other
field, never rename, reorder, add or remove an entry, never touch any
other file. Keep the file's formatting (double-quoted strings, one field
per line, trailing commas). Do not commit, push, stash, or touch main.

## What each row must read like
Three fields, rendered on the sheet as:

    Setup
    <setup>
    Execution
    <execution>
    Watch          (only when a watch line exists)
    <watch>

- `setup` (required, 25-160 chars, at most two sentences): where you are,
  what you hold, how you are set before the first rep. Imperative and
  concrete ("Sit with your chest against the pad, feet flat, handles at
  mid-chest height.").
- `execution` (required, 25-160 chars, at most two sentences): the
  movement itself, both directions where they differ ("Pull the handles
  to your lower ribs, pause, then let them return until your arms are
  straight.").
- `watch` (optional, ONE sentence, 20-120 chars): the single fault that
  most changes this lift, written so the reader knows what it costs or
  what to do instead. Good: "Letting the elbows drift forward takes the
  work off the back, so keep them tucked." Good: "Bouncing out of the
  bottom hides the stretch that makes the rep count." Bad (banned by the
  contract): "Rounding the back is the common fault." A bare label with
  no consequence or correction is the ONE rule the audit currently
  fails, on 264 rows. Rewrite each of those so the line carries its
  consequence or its fix, or DELETE the `watch` line entirely where
  nothing specific earns it (a generic "keep your core tight" earns
  nothing). Aim for roughly the current share of rows with a watch line;
  never add a watch line to a row that has none unless a genuine,
  movement-defining fault is missing.

Every field: starts with a capital letter, ends with a full stop, no
exclamation or question marks, no em or en dash, no set or rep counts,
no words from the banned list (safe, safely, injury, injure, rehab,
arthritis, pain, doctor, physio, therapy, medical, condition, hurt), no
filler ("it is important", "remember to", "make sure to", "in order
to", "this exercise", "this movement", "great for", "essential",
"crucial", "engage your core", "ensure that", "effectively", "optimal",
"proper/good/correct form"). Original text from your own understanding
of the movement; never copied or paraphrased from any app, site or
book. No anatomy essays, no biomechanics claims, no motivation, no Latin
muscle names, no numbers of sets or reps.

## The audit you are running
For EVERY row in your lane, not only the flagged ones:
1. Is the setup what someone at that machine or bar needs before rep one,
   and is it right for this exact variation (grip, stance, angle, which
   attachment)?
2. Does the execution describe this movement and not a sibling (e.g. a
   Pendlay row is not a bent-over row; a sumo deadlift stance is wide,
   toes out)?
3. Is it concise and readable in seconds, with nothing a first-time gym
   goer would not understand?
4. Does the watch line (if any) name a specific fault AND its cost or fix?
Change a row only when one of those fails or the contract flags it;
leave every other row byte-identical. Run the audit command for your
family until it reports 0 violations.

## STOP and report rather than interpret
If a name does not describe a movement you can identify with confidence,
or two rows in your lane read as the same movement, do not guess: leave
the row as it is and list it under "ambiguous" in your report.

## Final report (cap 40 lines, evidence first, no narrative)
1. Rows in lane; rows changed; watch lines deleted.
2. Up to 12 representative before/after pairs (name, old watch, new
   watch) covering your lane's range.
3. "Ambiguous" list: name and one line on why.
4. "Least sure" list: up to 8 rows whose accuracy you are least confident
   in (name and the sentence in question).
5. The audit command's final output line for your family.
