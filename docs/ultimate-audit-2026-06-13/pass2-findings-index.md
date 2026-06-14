# pass2-findings-index.md — MASTER FINDING LIST (the list Pass 3 must fully account for)

Per `_AUDIT-SPEC.md:147-156`. Substrate: the three external reports (`pass2-input-01-chatgpt.md`,
`-02-gemini.md`, `-03-claude.md`) — the founder-directed substitute for 15 browsing agents. Finding IDs
are report-prefixed (CG/GE/CL) so each report's independently-numbered findings stay distinct and nothing
collides or drops. `-Kn` = a report's untagged numbered "KEY FINDINGS" entry, ID-assigned here. Status
maps the report's own confidence+source: VERIFIED = High + real primary/store/academic source;
PARTIAL = Med, or aggregator/vendor/simulated source; NOT FOUND = report stated none; EXCLUDED = fabrication/
contamination flag from `pass2-adjudication.md`. Every row carries a source. Nothing dropped.

## 1 — WORKOUT-SCREEN [WS]
| ID | claim | status | source |
|---|---|---|---|
| CG:WS-F1 | Hevy benchmark logging mechanics | VERIFIED | Play/review |
| CG:WS-F2 | Caliber inline last-session history valued | PARTIAL | store sentiment |
| CG:WS-F3 | mid-workout failure salient (freezing/input/confusing first-use) | VERIFIED | store reviews |
| GE:WS-K1 | <4 taps/set; keyboard "next" mapping preferred | PARTIAL(sim) | reddit r/Hevy |
| GE:WS-K2 | inline historical context non-negotiable | EXCLUDED | pelaris.io (FF1 phantom) |
| GE:WS-K3 | offline-first prevents data loss | PARTIAL(sim) | apps.apple RP reviews |
| CL:WS-F1 | Strong fastest logger ~2 taps, autofill prev | VERIFIED | repreturn.com |
| CL:WS-F2 | Hevy & Strong both ~4.9; social vs minimal | PARTIAL | sensai.fit (vendor) |
| CL:WS-F3 | neither reads recovery; "journals with timers" | PARTIAL | sensai.fit (vendor) |

## 2 — PLAN-GENERATION [PG]
| ID | claim | status | source |
|---|---|---|---|
| CG:PG-F1 | deterministic architecture emphasised/trusted | VERIFIED | review synthesis |
| CG:PG-F2 | Boostcamp = known/expert/community programmes | VERIFIED | store/vendor |
| CG:PG-F3 | users punish arbitrary volume logic (JuggernautAI) | PARTIAL | JuggernautAI review |
| GE:PG-F1 | rejection of generative-AI in strength programming | PARTIAL(sim) | getfitcraft (aggr) |
| GE:PG-F2 | architectural integrity & mesocycles differentiate | PARTIAL(sim) | rpstrength |
| GE:PG-F3 | Ikea-effect in goal-elicitation quiz | PARTIAL(sim) | screensdesign |
| CL:PG-F1 | Fitbod data-driven but lacks weekly volume ramp | VERIFIED | fitbod+mesostrength |
| CL:PG-F2 | most-respected architecture = autoregulated mesocycle (RP/Jugg) | VERIFIED | liftbigeatbig |

## 3 — AI/ALGORITHMIC COACHING [AC]
| ID | claim | status | source |
|---|---|---|---|
| CG:AC-F1 | MacroFactor+Carbon = closest deterministic nutrition-adjust comparators | VERIFIED | store/vendor |
| CG:AC-F2 | RP+JuggernautAI = closest training-coach analogues, expose feedback vars | VERIFIED | vendor/review |
| CG:AC-F3 | competitor pages market adaptation but explicit ED-safety floors NOT displayed | NOT FOUND (guardrails) | listings checked |
| GE:AC-F1 | adherence-neutral (MacroFactor) vs adherence-strict (Carbon) | PARTIAL(sim) | calai blog |
| GE:AC-F2 | competitor FFM ~30kcal/kg + 1200 floor | EXCLUDED | lemon8 (FF2 prompt-reflection) |
| GE:AC-F3 | subjective triggers (soreness 1-4) → objective training adj (RP) | PARTIAL(sim) | rpstrength |
| CL:AC-F1 | MacroFactor adherence-neutral, "no guilt" | PARTIAL | nutriscan (aggr) |
| CL:AC-F2 | Carbon dedicated reverse-diet protocol | PARTIAL | joincarbon/masculinesynergy |
| CL:AC-F3 | deterministic no-LLM is a selling point | PARTIAL | nutrola |

## 4 — NUTRITION [NU]
| ID | claim | status | source |
|---|---|---|---|
| CG:NU-F1 | UK differentiation = DB localisation, Nutracheck bar | VERIFIED(UK) | review |
| CG:NU-F2 | MacroFactor/Carbon compete on coaching logic not DB size | VERIFIED | synthesis |
| CG:NU-F3 | MFP scale 100M+/2.9M but gates barcode/scan/voice | VERIFIED | Play listing |
| GE:NU-F1 | calorie-planner necessity (weekly redistribution) | PARTIAL(sim) | joincarbon |
| GE:NU-F2 | UK DB verification is a moat | PARTIAL(sim,UK) | nutrola |
| GE:NU-F3 | micronutrient/NRV tracking escalation | PARTIAL(sim) | amyfoodjournal |
| CL:NU-F1 | curated UK DB beats crowdsourced (Nutracheck 500K) | VERIFIED(UK) | home-cooks |
| CL:NU-F2 | NutraSafe vitamins/NRV + allergen scan | PARTIAL(UK) | nutrasafe (vendor) |
| CL:NU-F3 | UK NDNS deficiency context | PARTIAL(UK) | nutrasafe/gov.uk |

## 5 — FOOD-LOGGING [FL]
| ID | claim | status | source |
|---|---|---|---|
| CG:FL-F1 | adherence drops over time; method preference matters | VERIFIED | peer-reviewed |
| CG:FL-F2 | Nutracheck UK retailer DB stronger localisation | VERIFIED(UK) | listing/review |
| CG:FL-F3 | barcode/AI-photo backfire if corrections/search slow | PARTIAL | store sentiment |
| GE:FL-F1 | friction fatality limits LTV (~80% abandon 90d; MFP UI revolt) | PARTIAL(sim) | nutrola/reddit |
| GE:FL-F2 | AI photo logging double-edged | PARTIAL(sim) | snapcalorie |
| GE:FL-F3 | paywalling essential utilities backlash | PARTIAL(sim) | garagegym |
| CL:FL-F1 | ~73% MFP-ED-users perceive contribution (Levinson 2017, N=105 clinical) | VERIFIED(acad) | healthline/mobihealth |
| CL:FL-F2 | logging burden central churn lever (~15min; 21% wk12) | VERIFIED | earth.com/PMC8050748 |
| CL:FL-F3 | AI photo trades accuracy for speed | PARTIAL | home-cooks |

## 6 — PROGRESS [PR]
| ID | claim | status | source |
|---|---|---|---|
| CG:PR-F1 | exercise-level history + aggregate graphs (Hevy benchmark) | VERIFIED | store |
| CG:PR-F2 | coaching apps frame progress as trend not single weigh-in | VERIFIED | vendor docs |
| CG:PR-F3 | Caliber Strength Score/Balance + photos differentiate | VERIFIED | store |
| GE:PR-K1 | trend-weight algorithmic smoothing | PARTIAL(sim) | macrofactor |
| GE:PR-K2 | volume & heatmap visualisations demanded | PARTIAL(sim) | apps.apple Hevy |
| GE:PR-K3 | recomposition paradox — decentralise the scale | PARTIAL(sim) | joincarbon |
| CL:PR-F1 | photos+measurements top demand (MacroFactor 1500+ upvotes each) | VERIFIED | macrofactorapp |
| CL:PR-F2 | privacy-by-default on photos (Hevy) | VERIFIED | hevyapp |

## 7 — ONBOARDING [ON]
| ID | claim | status | source |
|---|---|---|---|
| GE:ON-F1 | Ikea-effect onboarding quizzes aid conversion | PARTIAL(sim) | screensdesign |
| GE:ON-F2 | resolutioner churn (D1 26%→D30 3-10%) | PARTIAL(sim) | digitalyieldgroup |
| GE:ON-F3 | visual tiles > textual dropdowns | PARTIAL(sim) | screensdesign |
| CL:ON-F1 | health/fitness D1 ~26% collapses D28 10% | VERIFIED | businessofapps |
| CL:ON-F2 | ≤3 actions/screen, 3-5 screens | PARTIAL | weareaffective |
| CG:ON-U1 | minimal (StrongLifts) vs questionnaire (Dr.Muscle "5min"); attrition substantial | PARTIAL(untagged) | store/mHealth |

## 8 — EXERCISE-LIBRARY [EL]
| ID | claim | status | source |
|---|---|---|---|
| GE:EL-F1 | customization ceiling (Hevy 7-custom free cap) | PARTIAL(sim) | help.hevyapp |
| GE:EL-F2 | intelligent real-time substitutions expected | PARTIAL(sim) | screensdesign |
| GE:EL-F3 | looping soundless GIF/HD = demo gold standard | PARTIAL(sim) | help.hevyapp |
| CL:EL-F1 | Hevy 400+ not "1,000+" | VERIFIED | hevyapp |
| CL:EL-F2 | Fitbod own pages contradict (800/1000/1600) | VERIFIED | fitbod |
| CL:EL-F3 | Strong≠Stronger≠StrongLifts; Strong 200+ | VERIFIED | help.strongapp |
| CG:EL-U1 | size bar: JEFIT 1400+HD, Fitbod 1000+, Alpha 690, Caliber 600+, RP 250+ | PARTIAL(untagged) | store/vendor |

## 9 — RETENTION [RE]
| ID | claim | status | source |
|---|---|---|---|
| GE:RE-K1 | social integration multiplies retention (+30%; 68% share) | PARTIAL(sim) | lucid.now |
| GE:RE-K2 | "recovery moment" / streak-freeze framing | PARTIAL(sim) | zehrasaric medium |
| GE:RE-K3 | annual-subscription lock-in (33% retention) | PARTIAL(sim) | digitalyieldgroup |
| CL:RE-F1 | Business of Apps 3% day-30 retention | VERIFIED | businessofapps |
| CL:RE-F2 | first-2-weeks session frequency = #1 churn signal | PARTIAL | retentioncheck |
| CL:RE-F3 | Strava Challenges 18%→32% 90-day | PARTIAL | sportfitnessapps/lucid |
| CG:RE-U1 | streaks/badges/social/PRs retain; no single universal #1 trigger | PARTIAL(untagged) | store/mHealth |

## 10 — NAVIGATION [NA]
| ID | claim | status | source |
|---|---|---|---|
| GE:NA-F1 | Google Health/Fitbit "AI slop" catastrophe | PARTIAL(sim) | gizmodo |
| GE:NA-F2 | MyFitnessPal overhaul backlash | PARTIAL(sim) | reddit MFP |
| GE:NA-F3 | glanceability is king | PARTIAL(sim) | androidauthority |
| CL:NA-F1 | Fitbit feature-removal → Garmin defection | PARTIAL | gadgetsandwearables |
| CL:NA-F2 | feature overload (JEFIT) = uninstall anti-pattern | VERIFIED | play.google JEFIT |
| CG:NA-U1 | 3-5 bottom tabs; NO Fitbit/Google-Health source opened → no claim made | NOT FOUND (redesign) | (honest exclusion) |

## 11 — DESIGN [DE]
| ID | claim | status | source |
|---|---|---|---|
| GE:DE-K1 | 44×44px physical necessity (sweat/chalk) | PARTIAL(sim) | siteimprove |
| GE:DE-K2 | typography hierarchy — data over text | PARTIAL(sim) | androidauthority |
| GE:DE-K3 | premium cues via progressive disclosure | PARTIAL(sim) | designrush |
| CL:DE-F1 | WCAG 2.2 AA 24px legal floor (EAA 28Jun2025); 44px best practice | VERIFIED(UK/EU) | w3.org/allaccessible |
| CL:DE-F2 | undersized targets ~triple error rates | PARTIAL | webability |
| CG:DE-U1 | WCAG 24×24 / Apple 44pt; colour-blind prevalence NOT FOUND | VERIFIED std + NOT FOUND | w3.org |

## 12 — MISSING-FEATURES [MF]
| ID | claim | status | source |
|---|---|---|---|
| GE:MF-F1 | recovery-data void (no HRV/sleep in top loggers) | PARTIAL(sim) | sensai (vendor) |
| GE:MF-F2 | standalone Apple-Watch independence valued | PARTIAL(sim) | apps.apple Strong |
| GE:MF-F3 | Android feature-parity disparity | PARTIAL(sim) | sensai (vendor) |
| CL:MF-F1 | ACSM 73% abandon wearables "don't know what to do with data" | PARTIAL | corahealth (2ndary) |
| CL:MF-F2 | HealthKit 70+ types; Health Connect equiv | PARTIAL | apptage |
| CL:MF-F3 | Apple 26Mar2026 medical-device declaration rule | PARTIAL(single) | telehealth.org |
| CG:MF-U1 | wearables Wear OS/Health Connect table-stakes; NO posing/peak-week tools found; wishes: barcode-correct/UK-photo/substitutions | NOT FOUND (contest tools) | store/listings |

## 13 — NEWBIE-EXPERIENCE [NE]
| ID | claim | status | source |
|---|---|---|---|
| GE:NE-F1 | jargon barrier (MEV/MRV/RIR) alienates | PARTIAL(sim) | findyouredge |
| GE:NE-F2 | paradox of choice — blank canvas churns | PARTIAL(sim) | loadmuscle |
| GE:NE-F3 | execution confidence via inline video | PARTIAL(sim) | apps.apple Boostcamp |
| CL:NE-F1 | jargon primary barrier; RP/Jugg worst for beginners | VERIFIED | dr-muscle/liftbigeatbig |
| CL:NE-F2 | progressive disclosure + first-session win | PARTIAL | weareaffective |
| CG:NE-U1 | too many decisions/unexplained vars overwhelm; StrongLifts simple | PARTIAL(untagged) | store sentiment |

## 14 — CHECK-IN [CK]
| ID | claim | status | source |
|---|---|---|---|
| GE:CK-F1 | illusion of human accountability (submit week) | PARTIAL(sim) | joincarbon |
| GE:CK-F2 | holistic biofeedback (sleep/stress sliders) | PARTIAL(sim) | trainerize |
| GE:CK-F3 | frictionless affirmation (auto-pull averages) | PARTIAL(sim) | joincarbon |
| CL:CK-F1 | short+conditional (Carbon 3 Qs, branch on adherence, menstrual) | VERIFIED | joincarbon |
| CL:CK-F2 | recovery/wellbeing inputs → rest-day rec (Juggernaut) | VERIFIED | powerliftingtechnique |
| CG:CK-U1 | weekly trend/BW/BF/pump/soreness/readiness; short conditional; wellbeing | PARTIAL(untagged) | vendor/store |

## 15 — SCALING [SC]
| ID | claim | status | source |
|---|---|---|---|
| GE:SC-K1 | power of progressive disclosure (novice↔IFBB) | PARTIAL(sim) | gapsystudio |
| GE:SC-K2 | tiered autonomy: MacroFactor Coached/Collaborative/Manual | PARTIAL(sim) | help.macrofactor |
| GE:SC-K3 | granular override capability for elite | PARTIAL(sim) | help.macrofactor |
| CL:SC-F1 | progressive disclosure = dual-audience mechanism | PARTIAL | strive-workout |
| CL:SC-F2 | no app spans beginner→elite in one product | PARTIAL | liftbigeatbig/dr-muscle |
| CG:SC-U1 | layered complexity (Nike/Freeletics/Boostcamp/Caliber); register switching | PARTIAL(untagged) | store/vendor |

---

## PER-REPORT APP COVERAGE (anti-reduction requirement, `_AUDIT-SPEC.md:131-136`)
Honest statement, not 50/agent: the pivot used 3 cross-area reports, each naming a limited app set per
area plus a shared ~37-competitor list. Distinct apps named across the corpus ≈ 40 (Strong, Hevy, JEFIT,
FitNotes, Boostcamp, StrongLifts, Fitbod, JuggernautAI, RP Hypertrophy, Alpha Progression, Dr.Muscle,
Caliber, Future, MacroFactor, Carbon, MyFitnessPal, Cronometer, Nutracheck, Carbs&Cals, NutraSafe, Cal AI,
SnapCalorie, Fitia, Yazio, Lifesum, Shapez, Strava, NTC, Freeletics, Zing Coach, Trainerize, Muscle
Booster, + Pelaris[EXCLUDED]).
**THIN FLAG: ALL 15 areas are THIN against the 50-app bar** — each area names <20 apps. Reason: the
founder-directed pivot away from 15 internet-browsing agents (this environment cannot browse). This is the
true total stated openly, not a hidden reduction.

## FINDINGS COUNT (for the Pass-3 reconciliation gate)
- Total finding rows in this index: **97** (incl. 6 untagged-consolidated CG rows ON/EL/RE/NE/CK/SC/MF/NA/DE
  marked -U1; counts: WS9 PG8 AC9 NU9 FL9 PR8 ON6 EL7 RE7 NA6 DE6 MF7 NE6 CK6 SC6).
- Of these: **EXCLUDED 2** (GE:WS-K2 pelaris phantom; GE:AC-F2 prompt-reflection) — they remain LISTED
  (not dropped) but carry resolution = EXCLUDED with reason.
- Every row has an ID, a status, and a source. **This is the master list Pass 3 must account for: every
  ID above appears in Pass 3 exactly once with a resolution, including the 2 EXCLUDED.**

## PASS 2 EXIT GATE (orchestrator statement)
- Every finding has ID + status + source: **TRUE.**
- All 15 areas covered by the substrate: **TRUE** (3 cross-area reports).
- 50-apps-per-area sub-criterion: **NOT MET — all 15 THIN**, stated openly with reason (pivot). 
- **GATE Pass 2: CONDITIONAL — findings index complete and ready for Pass 3; the 50-app coverage bar is
  formally unmet due to the founder-directed browse-less pivot.** Founder certifies whether the pivot
  satisfies the gate; I do not self-pass over an unmet spec criterion.
