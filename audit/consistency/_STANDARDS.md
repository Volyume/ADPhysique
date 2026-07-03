# Consistency / copy / professionalism audit — SHARED STANDARDS
Every audit agent reads this. Audit against VOLYUME's OWN standards (CLAUDE.md, docs/rules/styling.md, docs/COACHING_VOICE_SYNTHESIS_LOCKED.md, docs/NOTIFICATIONS_LOCKED.md), not generic ones. Verify every claim against the actual code before fixing; never fix against an assumption.

## SAFE-FIX CLASS (auto-apply within your slice, then guard-test)
1. **UK English** in USER-FACING STRINGS only (JSX text, alert/toast/label/placeholder/accessibilityLabel strings, notification copy). Fix: -ize -> -ise (customise, optimise, personalise, organise, prioritise, maximise, minimise), -yze -> -yse (analyse), -or -> -our (colour, behaviour, favour, labour, honour), -er -> -re (centre, litre, metre, fibre) BUT never in code, never "kilometer" API names, "program" -> "programme" ONLY when it means a training programme (never a computer program / Program-named code symbol), catalog -> catalogue, "math" -> "maths", "gotten" -> "got", MM/DD -> DD/MM in displayed dates, "$"/"lbs" -> "£"/"kg" where UK units are meant. DO NOT touch: variable names, function names, object keys, imported library APIs, CSS/style property names, test fixtures, or any identifier. A spelling fix must change only a quoted human-readable string.
2. **Em dashes and en dashes** (—, –) in user-facing copy AND in comments -> rewrite (comma, colon, "to", or a full stop). Lint forbids them in user copy. This is high-volume; do it thoroughly in your slice.
3. **AI-speak / filler removal** in NON-SAFETY copy only: "I'd be happy to", "Let's dive in", "Here's the thing", "It's worth noting", "Feel free to", "unlock/unleash your potential", "elevate your journey", "seamless", "robust", "leverage", "delve", "supercharge", "empower", "game-changer", "curated"/"tailored" (unless literal), gratuitous exclamation marks, "As an AI"/model/prompt references. Rewrite to plain, calm, direct British-coach voice. If removing filler risks changing MEANING, flag instead.
4. **Hardcoded colour/size literals -> token**: ONLY when the literal EXACTLY equals an existing token value in src/styles/theme.js (verify by reading the token). Replace `#RRGGBB`/`rgba(...)`/bare numeric spacing with the matching `colors.*`/`spacing.*`/`radius.*`/`fontSize.*` token. If no exact-match token exists, FLAG it (do not invent a token, do not edit theme.js). A repo theme-token guard exists; do not break it.
5. **Missing accessibilityLabel/Role** on interactive elements (Touchable/Pressable/Button without a label) -> add a meaningful British-English label. Never add a label that duplicates visible text redundantly in a way the existing lint rule rejects; match how neighbouring rows do it.
6. **Placeholder / TODO / FIXME / lorem / debug / test copy** in any user-facing surface -> remove or replace with real copy. (TODO in comments: leave unless it is user-visible.)
7. **Brand**: "Volyume" spelled and capitalised identically everywhere. Fix any "VOLYUME"/"volyume"/"Voylume" in USER-FACING copy (leave SQL/const identifiers).
8. **Punctuation consistency** where unambiguous: straight quotes in code strings (do not introduce curly quotes), consistent single ellipsis character, no double spaces in copy.

## FLAG-ONLY (never auto-edit; write to your <slice>-decisions.md with file:line + why)
- **ANY ED / safety / calorie-floor / wellbeing / helpline / calm-mode / weight / body-image copy.** Do NOT alter tone, ever. A spelling/em-dash fix on such a line is also FLAG-ONLY (surface the proposed spelling fix as a decision) so the founder ratifies any touch of safety copy.
- **Coaching-voice copy** governed by COACHING_VOICE_SYNTHESIS_LOCKED.md (weeklyCoach verdicts, coachResponse/coachRegister, held-decision copy). Flag; do not edit.
- **Medical / health-claim / results copy** ("guaranteed", "cure", "burn fat", anything advice-like). Flag.
- **Terminology drift** for the SAME concept (workout vs session, plan vs programme, meal vs entry, etc.). Do NOT canonicalise yourself. LIST every drift with both variants and file:line; the orchestrator decides canon.
- **Dead taps**: an interactive-looking element that does nothing. If the intended action is UNAMBIGUOUS (e.g. a row that obviously should open a known screen), wire it (SAFE). If ambiguous, FLAG.
- **Anything that looks deliberate** (an inconsistency that may be intentional design), truncation/overflow needing a layout judgement, and any change that alters BEHAVIOUR or LOGIC.

## HARD BOUNDARIES (violation = failure)
- NEVER edit: `src/lib/nutritionEngine.js`, `edPatternDetector.js`, `wellbeing.js`, `weeklyCoach.js`, `coachApply.js`, `src/styles/theme.js`, any `supabase/migrate_*.sql`, any file outside your assigned slice.
- NEVER change logic, control flow, gating, engine outputs, banner precedence, or the kill-list surfaces. Copy/token/a11y only.
- Do not add dependencies. Do not reformat unrelated code (no drive-by). Touch only what a finding requires.
- British English in everything you write including comments. No em dash in anything you write.

## OUTPUT (per agent)
- Findings: `audit/consistency/<slice>-findings.md` — every finding by area (1 Language / 2 Visual / 3 Professionalism), file:line, severity (blocker/major/minor), and fix-applied vs decision-needed.
- Decisions: `audit/consistency/<slice>-decisions.md` — the FLAG-ONLY items for the founder.
- Apply the SAFE-FIX class in your slice. Then run the jest suites for the files you touched + `npx eslint` on changed files; both must be green. Report exact tails. NO git commits (the orchestrator commits).
