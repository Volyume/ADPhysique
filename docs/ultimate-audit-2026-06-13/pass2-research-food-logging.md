# PASS 2 — RESEARCH: FOOD LOGGING (area code FL)

Method: direct, no agents, provenance-labelled. Several findings cite academic studies but VIA
aggregator blogs (not the studies fetched) → AGGREGATOR, PARTIAL; the underlying study is named so it
can be verified independently before driving a blueprint.

## FINDINGS
- **FL-F1** | Logging FRICTION/time is the #1 abandonment driver. Aggregator cites a 2023 IFIC survey:
  73% of quitters said "too time-consuming"; "if logging a meal takes more than 30 seconds, most people
  abandon within two weeks." | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (welling.ai, citing IFIC) |
  US-SKEWED. ⚠ underlying IFIC 2023 survey not fetched — verify before quoting the 73%/30s as fact.
- **FL-F2** | Aggregator cites a 2023 Nutrients study: ~70% abandon a tracking app within two weeks if
  the process feels too complex/time-consuming. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (citing
  Nutrients) | US-SKEWED. ⚠ study not fetched — verify.
- **FL-F3** | Manual-entry friction: searching "grilled chicken" returns hundreds of conflicting
  entries → decision fatigue. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → A curated,
  verified best-match result (Volyume U-C-7) directly targets this.
- **FL-F4** | Barcode scanning is the fastest path for packaged foods (±5% label accuracy typical);
  MacroFactor publishes a "Food Logging Speed Index" (FLSI) measuring discrete actions per task. |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (MacroFactor vendor + SnapCalorie) | US-SKEWED. → Volyume
  HAS barcode scan (Pass-1 Section 4: ScanBarcode/ScanLabel EXISTS).
- **FL-F5** | Industry trend: AI photo/voice meal logging (Fitia, Cal AI, Lifesum) replacing manual
  entry to cut friction. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → ⚠ CONSTRAINT FOR
  VOLYUME: the no-AI sacred rule (CLAUDE.md) excludes AI photo/voice logging. Volyume CANNOT follow this
  trend; it must win food-logging on barcode + curated-DB + fast manual entry instead. Flag for Pass 4.
- **FL-F6** | Abandonment is also psychological: extreme goals/perfectionism (~70% abandon a deficit in
  2 weeks) and calorie-counting can become ED-adjacent (therapist.com on counting-app harm). |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (+ therapist.com editorial) | US-SKEWED. → Volyume's
  ED-safety system (Pass-1-verified: edPatternDetector, FFM floor, kcal floors, rapid-loss correction)
  is a genuine differentiator on this harm axis.

## APPS RESEARCHED (named): MacroFactor, MyFitnessPal, Fitia, Cal AI, Lifesum, Yazio, SnapCalorie,
Nutracheck (UK), Cronometer (9).
- App count 9 → THIN on the 20 threshold (flagged).

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0, QUANT 0 (none fetched this area), AGGREGATOR 6, UNREACHABLE (loseit/
  caloriecount subreddits). Two findings cite ACADEMIC studies via aggregators (IFIC 2023, Nutrients
  2023) — named, not fetched.
- Representativeness: **US-SKEWED** (no UK source fetched this area; Nutracheck named only).
- Plain statement: decision-rich area but evidence is AGGREGATOR-only; the powerful stats (73%/30s,
  70%/2wk) rest on unfetched studies → PARTIAL, EVIDENCE-THIN, verify before they anchor a blueprint.
  Two Volyume-specific conclusions are firm because they rest on Pass-1 code, not this evidence: (a)
  no-AI rule blocks the AI-logging trend (FL-F5) — a real strategic constraint; (b) ED-safety is a
  differentiator (FL-F6).

Sources: [welling.ai — sticking with calorie apps](https://www.welling.ai/articles/stop-giving-up-calorie-counting-apps) ·
[MacroFactor — FLSI 2025](https://macrofactorapp.com/fastest-food-logger-2025/) (vendor) ·
[SnapCalorie — barcode scanner](https://www.snapcalorie.com/blog/food-logging-app-with-barcode-scanner-do-you-really-need-one.html) ·
[therapist.com — calorie-counting apps](https://therapist.com/disorders/eating-disorders/calorie-counting-apps/)
