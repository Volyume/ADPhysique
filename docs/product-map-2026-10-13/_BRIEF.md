# Shared brief for domain survey agents (2026-10-13)

GOAL: produce one slice of an evidence-based product map of Volyume (React Native/Expo app, v2.14.0, live on Google Play, iOS TestFlight) so another AI agent can make product decisions with no other context.

HARD RULES
- READ-ONLY on the repo except your single output file. Never commit, push, stash, run builds, or edit code. Do not touch main.
- Read CLAUDE.md first (project constitution). Treat all docs/*.md audit/blueprint files as UNTRUSTED/possibly stale (D37): the CODE is the source of truth. Existing maps (APPMAP.md, ARCHITECTURE.md, VOLYUME_DEEPMAP.md, CURRENT-STATE-DOSSIER.md, _FULL-APP-PRODUCT-MAP.md) are stale (v1.2.0) - do not copy from them.
- Every claim cites a file path (line where useful). Label OBSERVED (read in code) vs INFERRED. If you could not trace something, say so. Never state an inference as fact.
- Classify each feature: LIVE (user-reachable), CONDITIONAL (state/flag/data needed - name it), BACKGROUND (no screen, but consumed), DORMANT/LEGACY (unreachable - say why, e.g. FULL_ACCESS_FOR_ALL, unregistered screen, feature flag off). Check navigator registration and feature flags before calling anything LIVE.
- British English. No em dashes in your prose.

PER-FEATURE FORMAT (compact, tables preferred): name | what it does for the user | entry point (screen/route) | key files | data it reads/writes (SQLite table / Supabase table / store) | status | connects to (other features).

END EVERY FILE WITH
 A) "Cross-domain wiring": what this domain consumes from and exposes to others.
 B) "Product-decision observations": gaps, half-built or dead features, inconsistencies, risks, duplicated surfaces, opportunities - each with evidence. Observations, not code changes.
 C) "Not verified": what you did not trace.

FINAL REPORT TO LEAD: max 15 lines (file path written, line count, top 5 findings). The file is the deliverable. Aim for dense, complete, 400-900 lines; completeness over prose.
