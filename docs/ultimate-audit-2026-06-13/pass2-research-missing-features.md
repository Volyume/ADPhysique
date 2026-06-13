# PASS 2 — RESEARCH: MISSING FEATURES (area code MF)

Method: direct, no agents, provenance-labelled.

## FINDINGS
- **MF-F1** | Wearable integration (Apple HealthKit/Watch, Google Health Connect) is now treated as a
  competitive necessity — removes manual-entry friction and raises retention; HealthKit can surface
  150+ data types. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (ROOK/brocoders) | US-SKEWED. →
  Volyume: CLAUDE.md lists wearable integration as a Pro feature; Pass-1 Section 3 has `watch_telemetry`
  (migrate_084). Actual integration DEPTH = VALUE DEFERRED. ⚠ Volyume's no-PII-to-external + offline-first
  + EU-residency rules constrain HOW wearable data can flow — flag for the wearable blueprint.
- **MF-F2** | 2025-27 trend = deeper AI coaching / "Workout Buddy" / hyper-personalisation across
  device ecosystems. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → ⚠ Volyume no-AI sacred
  rule excludes this whole trend (recurring constraint; Volyume competes on deterministic precision +
  safety instead).
- **MF-F3** | Physique/contest-prep is served mostly by COACHING SERVICES, not apps; standalone-app
  gaps for INDEPENDENT competitors = posing-video review, peak-week adjustments, show-day logistics
  (suit/tan/hair), weekly check-ins with progress photos. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR
  (coaching-service sites) | US-SKEWED. → Volyume serves the competitor end (division plans, check-ins);
  Pass-1 Section 3 shows `peak_week_plans` was CREATED (012) then DROPPED (049) — so peak-week tooling
  was removed. Peak-week/posing tools = a gap/opportunity for the elite end of Volyume's spectrum.

## APPS RESEARCHED (named): Apple Health/HealthKit, Apple Watch, Google Health Connect, Fitbit, +
coaching-service sites (≈4 platforms; competitor-app coverage thin).
- App count ≈4 → **THIN on apps** (this area is trend/service-led, not app-enumeration).

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0, QUANT 0, AGGREGATOR 5, UNREACHABLE (subreddits/forums).
- Representativeness: **US-SKEWED**.
- Plain statement: diffuse area, all AGGREGATOR/PARTIAL/EVIDENCE-THIN. Two grounded Volyume takeaways:
  (1) wearable integration is expected but constrained by no-PII/offline/EU rules (depth VALUE DEFERRED,
  verify watch_telemetry scope); (2) peak-week/posing tooling is a genuine gap for the competitor end,
  and Pass-1 confirms Volyume actually REMOVED peak_week_plans — worth a founder decision on whether the
  elite end is in scope. The AI-everything trend is excluded by Volyume's no-AI rule.

Sources: [ROOK — top wearable APIs 2025](https://www.tryrook.io/blog/top-10-wearable-apis-of-2025) ·
[brocoders — best fitness apps iOS/Android/Watch](https://brocoders.com/blog/best-fitness-apps-for-ios-android-and-apple-watch/) ·
[NASM — getting physique clients competition ready](https://blog.nasm.org/getting-physique-clients-competition-ready) ·
[teamusaphysique — five phases of contest prep](https://www.teamusaphysique.com/post/the-five-phases-of-contest-prep)
