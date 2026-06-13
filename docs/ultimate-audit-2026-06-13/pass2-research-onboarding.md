# PASS 2 — RESEARCH: ONBOARDING (area code ON)

Method: direct, no agents, provenance-labelled. UX-best-practice area (more practice than app-specific).

## FINDINGS
- **ON-F1** | Motivation/single-question routing lifts activation: Peloton asks one question ("What
  draws you to fitness?"); Fitbod asks "What equipment do you have?" → a doable plan. Motivation-matched
  routing = "the single most important decision-making filter in the activation funnel." | CONFIDENCE
  PARTIAL | PROVENANCE AGGREGATOR (UX blogs) | US-SKEWED. → Volyume has Welcome/QuizTraining/ProOnboarding
  (Pass-1 Section 7); validates a quiz-first on-ramp.
- **ON-F2** | Minimise info overload: one question beats many; allow skip-now/remind-later for optional
  data. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → Aligns with U-C-1 ("Set it for me"
  fast nutrition target before the full form — the takeover item).
- **ON-F3** | Deliver immediate value / a "First Win" (a beginner workout that unlocks a badge/marker).
  | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | US-SKEWED. → Volyume has milestones (first_week
  hasThreeInSeven, Pass-1 milestones.js) + first-run cue; aligns.
- **ON-F4** | Retention/drop-off stats (aggregator-cited): Health&Fitness Day-14 retention averages
  ~12% (≈88% abandon within 14 days); ~20-30% complete one workout in week 1, top-tier >50%. |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (digia/posthog citing industry data) | US-SKEWED. ⚠ source
  figures not independently fetched — verify before quoting.
- **ON-F5** | Activation = first workout tracked. Remove feature tours BEFORE the first workout; design
  a genuinely-doable 15-25 min first session, not aspirational. | CONFIDENCE PARTIAL | PROVENANCE
  AGGREGATOR (revenuecat/posthog) | US-SKEWED. → Volyume FreeStarter/FirstRunStack (Pass-1 Section 7);
  validates minimal-friction-to-first-log.

## APPS RESEARCHED (named): Peloton, Fitbod, Trainerize, Virtuagym (+ many UX-research sources) (4 apps).
- App count 4 → **THIN on apps** (this is a UX-best-practice area; evidence is practice-led not app-led).

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0, QUANT 0, AGGREGATOR 5 (UX blogs + analytics vendors), UNREACHABLE
  (subreddits). Retention stats cite industry data via aggregators (not fetched).
- Representativeness: **US-SKEWED**; UX best-practice is fairly geo-neutral but examples are US apps.
- Plain statement: consistent, plausible UX best-practice (quiz-first, single-question, immediate value,
  remove pre-workout tours, doable first session) but all AGGREGATOR → PARTIAL. The drop-off stats are
  the most quotable yet unverified → flag. Volyume already implements most of the pattern (quiz,
  first-run cue, milestones, FreeStarter) per Pass-1 — onboarding is broadly at parity; U-C-1 is the
  one validated improvement (single-question fast target).

Sources: [DEV — fitness onboarding guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0) ·
[posthog — onboarding drop-off](https://posthog.com/blog/how-to-find-and-fix-app-onboarding-drop-off) ·
[revenuecat — onboarding length](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short/) ·
[Airship — habit building](https://www.airship.com/blog/building-a-habit-for-health-fitness-apps/)
