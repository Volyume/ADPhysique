# Campaign 2, Phase 1 — Comprehension classification (LEAD RULING)

Ruled 2026-08-10 under D33 delegation on the single criterion: the best
outcome for an ordinary end user. Authority: the founder's Campaign 2
order, Phase 1 (A-H scheme, 40-concept minimum list). Evidence: the
read-only verification sweep against main `0a552cc4`, preserved in the
session scratchpad (`c2/P1-comprehension-verify.md`); its verbatim
strings and file:line cites are the factual basis for every row here.
Registered as D93-1. British English throughout.

Classes (a concept may carry more than one):
A must be understood at first use · B must be understood when it affects
the user · C optional education only · D internal, should not be
surfaced · E currently over-explained · F currently misleading ·
G currently undefined · H terminology collision.

Verdict column: OK = adequately served today, no Campaign 2 change;
FIX-Pn = actioned in the named phase of this campaign.

| # | Concept | Class | Current state (verified) | Verdict |
|---|---|---|---|---|
| 1 | Training block | A, G, H | Chip explains position; sheet explains shape; the authored definition (`GLOSSARY.mesocycle`) is orphaned and the word is jargon-blocked, so the concept has no reachable definition. | FIX-P4 |
| 2 | Progressive week / ramp | A, G | Magnitude named ("The planned climb adds N sets next week"); the WHY of the climb is never stated anywhere. | FIX-P4 |
| 3 | Recovery week | A, H | Well served at the decision row (gloss + deloadNote + post-apply share). First encounter can be the bare Home chip "Deload week, pull effort back." — which renders the jargon-adjacent word "Deload" raw. | FIX-P4/P8 |
| 4 | Working sets | A, F | TWO live definitions disagree: the glossary counts by set TYPE; the WorkoutSummary tooltip still carries the effort framing ("Training close to your limit ... is what makes a working set effective") that the glossary comment records as the WRONG framing (O27). | FIX-P2/P13 |
| 5 | Training volume | A, H | Defined at every first-encounter surface, but one word carries weekly-sets, tonnage and session senses across screens. | FIX-P2 |
| 6 | Total weight moved / tonnage | B, H | Well explained on its hero tile ("Total lifted"); BlockReflection still labels tonnage "Volume" (with the tonnage tooltip as a patch). | FIX-P2 |
| 7 | Reps | A, G | Definition exists but is reachable ONLY via a screen-reader hint. Sighted novices never see it. | FIX-P16 |
| 8 | Sets | A, G | Same as reps. | FIX-P16 |
| 9 | Reps short of failure | A, G | The chip says "stop 2 short of failure" from week 1; the only definition is body text inside the block sheet. No in-session (SetEntry/ActiveWorkout) route to it. | FIX-P5 |
| 10 | PR | B, G | The app's most-repeated achievement term has no glossary entry and no inline definition on any of ten surfaces. Celebration explains nothing. | FIX-P3 |
| 11 | Estimated max | B | Well served (tooltip at the moment it first renders). Four independently authored definitions exist; wordings are compatible but should not drift further. | FIX-P19 (single source) |
| 12 | Progression / progressive overload | C, G | Never named; the only authored explanation (`getProgressionMessage`) is dark. The CONSEQUENCE is what the user needs (covered by the ramp why, row 2); the principle's name is optional education. Do not surface the term on level-1 surfaces. | FIX-P4 (via ramp why) |
| 13 | Readiness | B, G, H | Purpose sentence exists ("Helps us read your sessions better over time") but what the answers feed is unstated; no definition; "readiness" also means profile completeness elsewhere. | FIX-P6, P2 |
| 14 | Soreness | B | Asked twice (pre-workout, check-in) with no at-ask consequence. Feeds recovery grade directly (soreness >= 4 alone can trigger the deload branch) — consequence wording must avoid response-bias (no "answer X to get Y"). | FIX-P6 |
| 15 | Recovery | B, H | Consistency gauges carry a full scale note. The engine's recovery grade is a different quantity (internal, D). "Recovery" the user word vs "recovery grade" the engine word stays split — user word canonical. | OK (P2 records canon) |
| 16 | Joint discomfort | B | Check-in row has a good discriminator hint; WorkoutSummary row has none; consequence (a yes caps progression) is only visible after the fact. Safety-adjacent: at-ask copy must not teach gaming. | FIX-P6 |
| 17 | Training adherence | B | Well served at the ask (provenance line) and at the hold. The why-it-matters line shows once ever — acceptable; Methodology carries the durable statement. | OK |
| 18 | Nutrition adherence | B | Well served (diary provenance at ask, plain hold reason when it bites). | OK |
| 19 | Confidence | B | Captions name level + consequence + missing input; pinned by test. Threshold maths stays internal (D). | OK |
| 20 | Weight trend | B, F | Defined well at every surface. TWO defects: (a) the displayed 7-day trend is not the decision trend (robust tracking) — undisclosed; (b) the screen counts raw weigh-in rows while the engine counts distinct mornings, so the receipt can contradict the hold. | FIX-P10 |
| 21 | Calorie target | A | Extensively explained at creation with personalised prose. | OK |
| 22 | Maintenance calories | B | Well served; glossary entry's only trigger is the conditional DietBreakCard — acceptable, NutritionEducation carries the durable definition. | OK |
| 23 | Calorie adjustment | B | Exemplary: pre-tap line states exactly what the tap writes; holds carry reasons. | OK |
| 24 | Calorie safety floor | B | Deliberately explained only when it bites, with the user's own numbers; floor values deliberately unpublished (Methodology states the design). Keep. | OK |
| 25 | Macro targets | B | Served by NutritionTargets prose + NutritionEducation. `GLOSSARY.macros` orphaned. | FIX-P15 (orphan ruling) |
| 26 | Protein target | B | Well served twice (onboarding gloss, targets tooltip); wordings compatible. | OK |
| 27 | Learned training range | B, G | No definition; the closest sentences (WorkoutSummary volume tooltip "adjusted to your own logged response") are good but unreachable from the surfaces where learning shows up. | FIX-P7 |
| 28 | Personalised block start | B | Source clauses exist for ledger/learned/manual; research/template seeds render NOTHING (silent). The founder's Phase 7 set (research-start / learned / last-block / retain / increase / reduce / insufficient / manual) is only partly covered. | FIX-P7 |
| 29 | Block-end learning | B | Well served: per-muscle rationale rows rendered only above the button that honours them (D91-22). | OK |
| 30 | Manual override | B, G | "Your edits always win" exists in one tooltip. The second consequence — a manually-overridden block stops teaching the learned range (`learnedRange.js:44`) — is disclosed nowhere. | FIX-P7 |
| 31 | Repeat programme | A, F | `consider_rebuild` ("Might be worth a fresh look") puts its PRIMARY button as "Continue this programme" — same label as the repeat recommendation, performing a true repeat. A recommendation to reconsider shares its main CTA label with the recommendation to repeat. | FIX-P12 |
| 32 | Continue with adjustments | B | Best-explained decision on the card. | OK |
| 33 | Recovery dose | B, D | Post-apply share stated (D91-23). Strain scaling stays internal (D) — the order forbids strain-score exposure. Optional deeper line ("scaled from what you completed") allowed by the order. | FIX-P8 |
| 34 | Delayed / held recommendation | B | Best-in-class: eleven plain-English hold reasons, many with the user's own numbers; Methodology "Why holds happen" pins the principle. | OK (P11 pins it) |
| 35 | Coach proposal | A | Rows state pre-tap consequences; Methodology states "suggestions until you apply them". The only definition of Precision Coaching itself lives pre-auth (WelcomeScreen). | OK (gap noted for the later discoverability campaign) |
| 36 | Auto-applied behaviour | B, G | Mode picker explains each mode in one line. The D16 rule — a safety hold always forces confirm-first even in Coached mode — exists ONLY as a source comment; a Coached user whose week reverts to confirm-first is told nothing. | FIX-P12 |
| 37 | Calm coaching mode | B, H | FAQ answer is good. Naming drifts ("Calmer coaching" / "a calmer experience"); full suppression scope undisclosed (acceptable: listing every suppressed surface would itself be noise — the FAQ's "quieter progress prompts and coaching that never pushes for more" is the honest umbrella). | FIX-P2 (name canon), P14 (copy audit) |
| 38 | Safety hold | B, D | Joint-pain and illness holds carry plain reasons naming the action. Free-text note parsing stays internal (D): disclosing which words matter would teach both gaming and self-censorship; the hint at the ask ("Illness, travel, big life stress, anything unusual") is already an honest signal that the note is read. | OK (P9 records the keep-hidden ruling) |
| 39 | Volyume Score | B | Exemplary (meaning moment + persistent gloss on all three surfaces). | OK |
| 40 | Streaks | B | Exemplary (shared gloss, all rules named, forgiveness stated). | OK |

## Cross-cutting rulings

1. **No concept is over-explained (class E is empty).** The app's failure
   mode is under-explanation and inconsistency, never walls of text. No
   copy is removed for length in this campaign.
2. **Class D (keep internal), ruled now and binding for later phases:**
   recovery/performance grades, the autoregulation matrix mapping, the
   on-target band width, the robust-tracking smoother's name and maths,
   the off-target weeks confidence dependency, strain scores and the
   60→40 share formula, note-parsing keywords, plateau-ranking order,
   insight thresholds (the empty state may say "a few more weeks of
   sessions" without numbers), photo-corroboration mechanics, scan
   classification enums, ED/SCOFF detector mechanics and thresholds.
   Consequence-level copy may reference RESULTING reasons only.
3. **The two STOP-AND-REPORT findings are accepted as in-scope defects:**
   (a) Working-sets double definition — the WorkoutSummary tooltip's
   effort sentence contradicts the type-based count and is factually
   wrong about what the number measures (F); fix in Phase 2/13.
   (b) Weigh-in receipt/caption raw row counts vs the engine's
   distinct-morning count (F); fix in Phase 10. Both are copy/display
   corrections, not engine changes.
4. **Campaign 1 additions are part of the baseline being explained**
   (insufficient-feedback hold, intake-read-failed hold, tri-state joint
   answers); no Phase may weaken them.
5. **Map corrections** (stale rows: readiness purpose sentence,
   MEV/MAV/MRV unnamed definition, deload share post-apply, jointPain
   tri-state, held-decision range/new reason, glossary counts) are
   recorded for the map update at campaign end.
