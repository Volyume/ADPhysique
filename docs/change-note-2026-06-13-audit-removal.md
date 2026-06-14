# Change note — audit removal + consequent test fix (2026-06-13)

Founder instruction (2026-06-13): delete ALL audit docs from the repo
(`docs/ultimate-audit-2026-06-13/`, `docs/audit/`, `docs/competitive-audit-2026-06-10/`,
`docs/subscriptions-audit-2026-06-06/`). Done in commit `aa4dae6`.

Consequence: six `planengine*` test files wrote a generated markdown report INTO
`docs/audit/volyume-planengine-rebuild-2026-06-01/` as a side-effect, so deleting that
folder made their `fs.writeFileSync`/`existsSync` step fail.

Fix (this change): remove only the obsolete report-export side-effects; keep every
engine assertion untouched. No engine logic, no plan-generation invariant, and no
src/coaching/safety code is changed — only dead doc-export code in test files is removed.
The remove-the-doc-export fix keeps all engine assertions and changes no engine logic.
