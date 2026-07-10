⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Move #0: Code corrections (locked)

The smallest move. Three hygiene fixes that don't change behaviour
but clean up citations and copy before the engine code grows.
Locked 2026-05-23.

## Scope

1. Replace the fabricated SportRxiv 2024 citation in
   `nutritionEngine.js`.
2. Extend `JARGON_BLOCKLIST` in `whyThisTemplates.js` with four new
   entries.
3. Audit `src/screens/` for bare researcher surnames in surface
   copy; move citations to `InfoTooltip` patterns.

## Files modified

```
src/lib/nutritionEngine.js
src/lib/whyThisTemplates.js
src/screens/<any screens flagged by the audit>
tests/lib/whyThisTemplates.test.js
```

## Test additions

```
tests/lib/jargonBlocklist.test.js
  - new blocklist terms catch their plain-language alternatives
  - bare-surname strings are flagged
```

## Acceptance check

- `nutritionEngine.js` carries no comment referencing "SportRxiv
  2024."
- `JARGON_BLOCKLIST` contains the four new entries plus the
  original seven.
- `checkJargon('metabolic adaptation')` returns true.
- `checkJargon('your body has adjusted')` returns false.
- A snapshot scan of all string literals in `src/screens/` shows
  no bare researcher surnames (Helms, Schoenfeld, Morton, Mountjoy,
  Eikey, Refalo, Trexler).
- Engine output and surface text snapshots unchanged for all
  existing simulator scenarios (this is a behaviour-preserving
  refactor).

## Implementation order

1. Branch from the current target.
2. Make the citation comment swap in `nutritionEngine.js`. One file,
   single replace.
3. Extend the blocklist + update its tests.
4. Run the snapshot scan: `grep -rn -E "(Helms|Schoenfeld|Morton|Mountjoy|Eikey|Refalo|Trexler)" src/screens/`
5. For each hit, either:
   - Move the citation into an `InfoTooltip` (preferred), or
   - Replace with a plain-English equivalent.
6. Run `npm test`. All snapshots should pass; if any fail because
   surface copy genuinely changed, update the snapshot with a
   clear commit message.
7. Open PR. Move #0 ships in a single PR, no schema changes.

## Why this is move #0 and not part of a larger move

- Zero schema changes.
- Zero new files.
- Touches only docstrings, comments, blocklist constants, and a
  small set of UI strings.
- Cannot break anything that wasn't already broken (the SportRxiv
  citation has been there for months without effect).
- Lets us close out the citation-hygiene debt before any move that
  cites research adds more.

## Estimated effort

Half a day. Maybe a full day if the surname audit catches more than
expected.
