# CC25 COST GOVERNANCE LEDGER (founder order 2026-08-20, §17)

Budget: max 2 pre-synthesis subagents (lowest suitable tier); max 2
red-team subagents post-architecture. Opus subagents forbidden without
explicit founder approval. Direct tools before agents.

| # | Agent | Question | Tier | Why lowest suitable | Result | Follow-up |
|---|---|---|---|---|---|---|
| — | (none yet post-order) | | | | | |

Direct-tool resolutions (no agent spent):
- I-1..I-4 sync contract: read conflict.js (102 ln), registry.js head,
  tables/weeklyCheckins.js head. Questions closed.
- K-1/K-2 consent + telemetry: R1 had already read Article9ConsentScreen;
  greps located record_health_consent RPC, consent_log migrations 019/024,
  engineTelemetry re-export. Closed.
- J-1..J-3 entitlements + a11y + Health surface: withProGuard call-site
  grep (18 sites, all nutrition/coaching), a11y prop counts (1,564 labels
  / 686 roles), SettingsHealthScreen read (device-health integrations,
  not capability). Closed at architecture grain.
- H-1 nutrition training-reads: grep of nutritionEngine + food/* — no
  direct workout reads in decision paths (display-level recompReframe
  already mapped by AUDIT-L). Closed.
- Subagent budget spent pre-synthesis: 0/2.
