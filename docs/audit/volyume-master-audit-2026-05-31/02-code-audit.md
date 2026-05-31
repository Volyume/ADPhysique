# 02 — Line-by-line code audit

Status: **RETRACTED & REBUILDING** — the prior content of this file was
unreliable and has been removed. A trustworthy version is being rebuilt
from real agent output + personally-read code.
Date: 2026-05-31
Branch: `main`

---

## RETRACTION (read this)

An earlier version of this document (commit `45a2220`) presented code
findings as "[VERIFIED]" and attributed others to "four sub-agent
sweeps." That was wrong on two counts and is fully retracted:

1. The four sub-agents were launched **asynchronously and had not
   reported** when the document was written. The "agent findings" were
   therefore not real agent output.
2. Several "[VERIFIED]" claims did not match the source. Confirmed by
   re-reading the actual files:
   - **Migration runner (claimed: failed migrations silently marked
     complete).** FALSE. `database.js:1152-1175` bumps `user_version`
     only *inside* the `try`, after `m.up()` succeeds, and `break`s
     without bumping on error. The runner is correct.
   - **Hardcoded Supabase fallback URL + anon key.** FALSE. `supabase.js`
     (read in full, 1-188) has no fallback constants; line 29 is
     `if (!url || !key) return null;`. Credentials come only from
     `process.env.EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY`.
   - **`bulkUploadLocalData` is a one-line registry wrapper.** FALSE.
     It is a real multi-step function at `sync.js:537` with workout
     upload loops (`sync.js:567-577`).
   - **USDA/OFF fetches may lack a timeout.** FALSE. `usda.js:30` and
     `liveOff.js:24` both implement `_fetchWithTimeout` with
     `AbortController`; the USDA key is read from `process.env`.

This is the same failure mode that opened the session (fabricated a
TypeScript codebase). It has now happened twice. The cause both times:
writing findings before actually reading the cited lines. The
corrective for the rebuild below is absolute: **no finding is recorded
unless the auditor has read the exact lines in this session and can
paste them.**

---

## Genuinely-established facts so far (personally read this session)

These are the only code-level statements currently trustworthy:

- **Migration runner is correct.** `database.js:1152-1175`. Real schema
  evolution is via idempotent per-statement `ALTER ... ADD COLUMN`
  wrapped to swallow duplicate-column errors (comment at
  `database.js:266-273`). *Open question worth a real check later:* that
  ALTER-swallow pattern also swallows non-duplicate errors silently —
  low severity because the ALTERs are additive, but worth confirming
  each catch is scoped to duplicate-column.
- **Supabase client is env-only, lazy, returns null when unconfigured.**
  `supabase.js:24-54`. Auth session stored in `expo-secure-store`
  (encrypted), not AsyncStorage. `supabase.js:5-17`.
- **Food sources have timeouts + env-based keys.** `usda.js:26-48`,
  `liveOff.js:24-30`.
- **One push path / one pull path.** `sync.js` is the legacy facade
  (header `sync.js:1-9`); it imports the modular runner
  (`sync.js:1732` → `./sync/index`), and the modular runner
  (`sync/runner.js:36 syncAll`) calls back into the legacy
  `bulkUploadLocalData` + `pullFromCloud`. So they are layered, not two
  independent engines. *Confirmed by grep of all call sites.* No
  `UPDATE ... SET user_id` in `src/` (identity invariant; CI grep).
- **Static baselines (real):** ESLint 0 errors / 1665 warnings; Jest
  133 suites / 2301 passed / 3 skipped. See `07-error-testing-results.md`.

## Rebuild plan

The four code-audit sub-agents (engine/data, screens, food,
cross-cutting) are running now. When they return, every finding they
report will be re-checked line-by-line before it is written here, with
an explicit quote of the real code. Findings that fail verification
will be listed as "agent-reported, refuted on read" so the record shows
what was checked.

Until then this document records no further findings.
