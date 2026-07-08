# Run manifest: Progress Photos / Image Scoring audit and blueprint

Date: 2026-07-08
Lead: Fable (main loop), audit and blueprint lead
Scouts: 7 code scouts + 1 research scout (Sonnet tier, per agent-tier rule in CLAUDE.md)

## Working tree state at start of run

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Commit: `0025e07281fd628a924f343ec66e0ea430a0d939`
- Git status: clean (no dirty files, up to date with `origin/claude/codebase-audit-docs-pv6mjd`)
- Protocol followed: no pull, no reset, no checkout, no branch sync. Audit ran against the working tree as-is.

## Scope

Audit and blueprint ONLY: progress photos, progress scan, image scoring, physique/body/visual score,
photo capture/import, pose/lighting/framing guidance, scoring pipeline, confidence/quality/withhold
logic, score UI/result presentation, photo history/comparison, storage/privacy/reliability/tests,
and FUTURE Coach/check-in integration possibilities.

Out of scope: whole-app audit, nutrition audit, onboarding audit, training audit, generic product
strategy, implementation.

## Founder/product facts binding this run

- Progress photos / progress scan / image scoring are NOT currently linked to Coach or check-ins.
  Any code that appears to link them is to be flagged as a contradiction or hidden dependency, not
  treated as intended current behaviour.
- Scoring accuracy, repeatability, honesty, and confidence-gating come FIRST. Coach/check-in
  integration is future work, blueprinted only after the scoring standard is defined.
- No implementation in this run. Documents only. No app code changed.

## Run plan

1. Scouts 1–7 audit the current code (evidence only, file-path citations, "not evidenced" where absent).
2. Research scout gathers external evidence on image-based scoring limits and coaching practice.
3. Fable synthesises `phase-1-code-audit.md` and `phase-1-evidence-gaps.md` from saved reports only.
4. Fable writes the five Phase 2 blueprints (scoring-first priority order).
5. Fable writes five Sonnet implementation handoff docs.
6. Fable writes README, verifies all files exist with line counts, confirms no app code changed.

## Output tree

```
.volyume-audit/progress-photos/
  00-run-manifest.md
  phase-1-code-audit.md
  phase-1-evidence-gaps.md
  README.md
  evidence/scout-01..07-*.md
  research/image-scoring-progress-photo-research.md
  blueprints/ (5 files)
  implementation/sonnet-wave-01..05-*.md
```
