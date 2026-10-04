# D219 lane S: the science behind plan structure, volume and recovery

Lane S (science) of programme D219. Read-only research lane, written 2026-10-04 on branch `claude/plan-builder-science`.
Authority: D219 (end of `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`) and the lead's five addenda received during the run: Q11 (individual differences and the learned recovery rate), Q6 made concrete for a FIXED rotation of unknown spacing, Q12 (standard exercises per muscle), the founder's 27-weekly-biceps-sets case (bands in Q3b, focus plans and the Recovery-screen demonstration in Q8b and F16), and the founder's "biceps recover quicker than back" (per-muscle recovery in Q5b, fed into F5).
No file under `src/` was edited. Nothing was committed, pushed, stashed or switched. The only repo file written is this one. Scratch work (PubMed fetch helper, rotation probe, calibration and recovery-percent scripts, source ledger) lives under the session scratchpad, not in the repo; the four scripts behind the probe, calibration and recovery-percent numbers are reproduced in Appendix B.

Hard bounds respected: every formula below is pure arithmetic on stored inputs (no AI, no randomness, no I/O); nothing touches the ED-safety system, calorie floors, consent, billing or identity; D204 is honoured (section Q11 separates what a plan may prescribe from what a screen may say, and the screen wording only describes).

---

## 0. How to read this report

### 0.1 Grades and tags

| Tag | Meaning |
|---|---|
| **A** | Meta-analysis or systematic review of trials (a preprint is marked "A, preprint") |
| **B** | Controlled trial(s) (randomised, within-subject or crossover) |
| **C** | Mechanistic, acute-response or observational evidence |
| **D** | Expert or practitioner consensus (Renaissance Periodization, Delphi panels, narrative reviews without a new analysis) |
| **INF** | My own inference or arithmetic from verified numbers (the inference is shown) |
| **CONV** | A defensible convention: a number the evidence does not fix, chosen to be conservative and traceable |

Populations matter and are named per source. Most hypertrophy trials are 6 to 12 weeks, in young adults, often untrained; where trained-lifter data exist they are preferred and called out. Untrained data are flagged "untrained".

### 0.2 Verification status (what I actually opened)

* **Opened to the abstract via PubMed efetch (plain-text abstract by PMID):** every PubMed-indexed source in Appendix A (about 125), unless marked otherwise. Numbers quoted from these are from the abstract text.
* **Opened in full text:** Pelland et al. (published PDF and the v2 preprint) and the Remmert et al. per-session preprint (both PDFs, converted with `pdftotext`, so the numbers are from the raw text); Schoenfeld et al. 2019, McMahon and Onambele-Pearson 2024 and Gomirato and Grenier 2023 (full-text XML from Europe PMC; Schoenfeld's Table 1 is an image and was read as an image). A first pass through the web-fetch tool (a small-model summary) gave wrong elbow-flexor percentages for Schoenfeld 2019 and described McMahon's between-condition differences as deficits; both were corrected against the raw text. I then checked every decimal, percentage and sample size in this report that sits beside a PubMed-indexed citation against that source's abstract with a script; every mismatch was either corrected or is a figure from a full text, a computation of mine, or a repo constant.
* **Renaissance Periodization (RP) pages and one app blog:** opened through the web-fetch tool, which returns a small-model extraction of the page, not raw text. Numbers are as extracted; the back table was illegible in the extraction; no RP page gave an hours-per-muscle recovery table. Treat all RP figures as D and as extractions. On 2026-10-04 I re-opened the guides for biceps, chest, triceps, quads, hamstrings, side delts, calves, glutes, rear delts, traps and front delts a second time: every landmark table and weekly frequency in the Q3 table matched (the back guide's table is an image the extraction cannot read, only its "2-4 sessions" sentence; abs was confirmed only through a search-result summary). The same applies to the RP podcast page of 27 Apr 2026 (11-set rule; it cites no study for the figure) and to the app blog that quotes "biceps 36 h, back 72 h" (secondary and commercial; links no number to a paper).
* **Not opened beyond the abstract page:** Korak 2015 (Int J Exerc Sci 8(1):85-96; not in PubMed; the publisher's full-text PDF returned HTTP 403, so only the abstract on the journal's repository page was read). Full texts of most papers were not opened (abstract-level only); Pelland's OSF supplements (the "about 31 weekly fractional sets" point of undetectable superiority is Remmert's reading of them); the repo's claim that in Ferreira 2017 "perceived fitness recovered at 72 h while torque and soreness took 96 h" (the abstract says DOMS lasted 72 h, peak torque returned at 96 h and total work had not returned by 96 h; the "perceived fitness" result is not in the abstract); any claim in a search-engine summary that I did not re-open at the source (several were wrong or over-reaching, for example a summary that called an acute abdominal-ultrasound study evidence of hypertrophy; none is used).
* **Retracted, excluded (two papers):** (1) Barbalho et al., "Evidence for an Upper Threshold for Resistance Training Volume in Trained Women", Med Sci Sports Exerc 2019;51(3):515-522 (PMID 30779716); the PubMed record carries the retraction (MSSE 2021;53(6):1318, doi 10.1249/MSS.0000000000002672) and an earlier expression of concern (MSSE 2020;52(11):2490). (2) Barbalho et al., "Evidence of a Ceiling Effect for Training Volume in Muscle Hypertrophy and Strength in Trained Men - Less is More?", Int J Sports Physiol Perform 2020;15(2):268-277 (PMID 31188644); the record is marked RETRACTED (IJSPP 2020;15(6):914, doi 10.1123/ijspp.2020-0372). The lane brief names Barbalho; neither paper may be used as evidence, and the "upper threshold" or "ceiling" claims sometimes quoted from them are excluded here. The repo does not cite either (a case-insensitive search of `src/`, `docs/`, `supabase/` and `scripts/` for "Barbalho", and of `src/` and `docs/` for "ceiling effect" and "upper threshold", found nothing).
* **Preprints (not peer reviewed as far as I could verify):** Remmert et al. 2025 per-session meta-regression (SportRxiv, doi 10.51224/SRXIV.537; not indexed in PubMed). Pelland et al. is no longer a preprint: it is Sports Med 2026;56(2):481-505 (accepted 14 Oct 2025, epub 4 Dec 2025).

### 0.3 The findings that change the design

1. **"3 to 4 sets per exercise" is a good convention, not a measured threshold.** No trial isolates sets per exercise at fixed per-muscle volume. The best-supported ceiling is per MUSCLE per SESSION: about 8 direct (11 fractional) sets, beyond which returns fall and data thin out (Remmert preprint, A preprint; RP says 8 to 12, D). The only meta-regression on sets per exercise (Krieger 2010, A) found 4 to 6 sets not significantly better than 2 to 3 (effect size 0.44 vs 0.34, p = 0.29) and not worse. See Q1, Q2.
2. **Weekly volume has a published dose-response now** (Pelland, Sports Med 2026, A): 4 fractional sets a week is the minimum effective dose; each further detectable gain costs more sets (about 6 extra at 5 to 10 sets, 8.5 at 11 to 18, 10.75 at 19 to 29, 12.5 at 30 to 42); no plateau was found; the half-credit for synergist sets ("fractional") is the best-supported way to count. The repo's 0.5 is evidence-backed. See Q3.
3. **Frequency has no meaningful independent effect on hypertrophy at equal volume** (Schoenfeld 2019, A; Pelland 2026, A). So spacing, not frequency, should be the design variable: use the fewest exposures that respect the per-session cap, and spread them as evenly as the rotation allows. See Q4, Q6.
4. **No per-muscle recovery table in the literature.** The repo's hours are conventions (D) with partial support (B) from high-dose, to-failure protocols; the intensity factor is far narrower than the failure vs non-failure gap in trials; "compounding" of overlapping sessions is unproven (Kataoka 2022, A/C). "Recovered by tomorrow" can honestly be a band, plus a plan-structure fact ("at least N hours since this muscle was last trained if you follow the order"), never a measured fact. See Q5, Q11.
5. **Exercise order inside a session does not change hypertrophy** (Nunes 2021, A, effect size 0.03); it changes strength and volume of the first exercise. Put the priority muscle first. See Q7.
6. **A fixed rotation must be scored circularly and against more than one spacing.** My probe (section F7, Appendix B; not literature) shows that when session types repeat (4-session upper/lower, 5-session push/pull/legs plus upper/lower, 6-session push/pull/legs twice or upper/lower three times) the worst order scores about 8 to over 800 times worse than the best, that a 3-session push/pull/legs rotation is order-insensitive (either direction ties), and that "full body on every session" cannot be made safe for back-to-back days. The repo sequencer scores overlap linearly (no wrap) and uses one typical-week gap pattern (`sequenceSessions.js:334-345`); both stop being safe assumptions once the order is fixed and days are free. See Q6, F7.
7. **Weak points:** raise weekly sets for the lagging muscle into the upper productive tier (about 20 to 24 fractional, screen range 20 to 30) by adding an exposure and a complementary exercise, ramping about 2 to 3 sets a week; keep other muscles at 4 to 6 or more. No controlled trial of a "specialisation phase" was found. See Q8, Q8b.
8. **Progression:** the tested set ramps are +2 and +3 weekly sets per muscle per week (Enes 2024, B); individualising weekly volume to 1.2 times the lifter's logged volume beat a fixed 22 sets in one within-subject trial (Scarpelli 2022, B, n = 16). A scheduled deload did not improve hypertrophy in a 9-week trained trial (Coleman 2024, B). See Q9, Q10.
9. **Individual differences are real and large, partly noise** (Hubal 2005; Ahtiainen 2016; Damas 2019; Hammarström 2020; Hecksteden 2015, Atkinson 2015). A learned recovery factor should move the spacing clock and the per-session cap, at block boundaries, never weekly volume or frequency directly. See Q11, F14.
10. **Exercise choice has trial evidence for quads, hamstrings, triceps, biceps, calves, chest (upper), glutes, adductors and side delts; none was found for lats/upper back, rear delts, traps, abs, forearms, neck or tibialis.** First and second standard choices per muscle are in Q12 and F13.
11. **The repo's weekly landmark table (`algorithms.js:25-59`) differs from RP's current muscle guides** (for example hamstrings repo 4/6/14/20 vs RP 0-2/2-4/2-8/8-14 for MV/MEV/MAV/MRV) and, for biceps and triceps, judges fractional counts against numbers that sit inside RP's direct-set ranges. See Q3, Q10.
12. **Source hygiene:** the repo's per-session cap comment cites "Brigatto/Nippard"; Brigatto 2019 did not show a ceiling (16 sets in one session did not differ from 8 + 8). The number 8 is right, the basis is wrong. See Q10.
13. **The founder's 27 weekly biceps sets is a defensible focus, and the evidence does not say "overtrained".** In the tracker's own units (direct 1.0, synergist 0.5) 27 sits in the 20 to 30 band that Pelland's tiers support for a deliberate focus; counted as 27 direct sets plus about 7 indirect it is 34, still under the 43 where data thin out and no study shows harm; "overtraining" is a clinical state a set count cannot diagnose (Meeusen 2013 consensus). The two retracted Barbalho papers are the only ones I found that claimed an upper threshold or a downturn. The tracker's "Too much" label for a muscle above its MRV ignores the plan role and judges fractional totals against a biceps ceiling (22) no higher than RP's direct-set one (20 to 26). What the evidence does not support is the shape (27 sets in one session). See Q3b, Q8b, F16.
14. **"Biceps recover quicker than back" is a reasonable default, not a measured fact.** No study measured lat or upper-back recovery; the measured comparisons between other muscles disagree in direction; what replicates is dose, effort, exercise type, novelty and training status. At the doses that were measured the repo's clocks run 15 to 70 h long for elbow-flexor force and the quadriceps and match chest and triceps work capacity. See Q5b, F5.

---

## Q1. Sets per exercise per session: is there a ceiling near 3 to 4?

**Best current answer.**

* **No trial isolates "sets of one exercise" at fixed per-muscle volume, so a hard physiological ceiling at 3 or 4 sets per exercise cannot be cited.** The founder's rule (cap 4 for compound or machine-compound, 3 for isolation; already built as `CAP_COMPOUND`/`CAP_ISOLATION`, `planEngine.js:1445-1446`) is a defensible convention [CONV], consistent with three bodies of evidence below. The only meta-regression on sets per exercise found 4 to 6 sets numerically better than 2 to 3, not significantly (Krieger 2010 [A]).
* **What the evidence does support**, in order of strength: (1) a per-muscle, per-session ceiling of about 8 direct (11 fractional) sets (Q2) [A, preprint]; (2) acute fatigue and rep loss across sets, and the higher recovery cost of sets taken close to failure [A/B]; (3) regional hypertrophy differs between exercises at equal volume, so a second, complementary exercise reaches tissue the first under-loads [B].
* **Is a different exercise better than more sets of the same one?** For regional coverage, yes (B). For whole-muscle size at equal total sets, varied and fixed selections give similar growth (Baz-Valle 2019, Kassiano 2025, Fonseca 2014) [B]. So the defensible statement is: sets beyond the cap on one lift have no trial support and a known cost; the same sets on a complementary lift have trial support for regional coverage and no known extra cost, except time and exercise count (INF).
* **Floor per exercise:** 2 to 3 sets. More than one set per exercise beats a single set (Krieger 2010 [A]: effect size 0.24 for 1 set, 0.34 for 2 to 3; Hammarström 2020 [B, untrained]: 3 sets beat 1 set per exercise, thickness gain 5.2% vs 3.7%). The repo floor of 3 (`MIN_SETS_PER_ENTRY`, `planEngine.js:1447`) is a convention; 2 would also be evidence-consistent for a second or third exercise.

**Evidence.**

| Source | Design and population | Result (as in the abstract unless marked) | Grade |
|---|---|---|---|
| Krieger 2010, J Strength Cond Res 24(4):1150-1159 | Meta-regression, 8 studies, 19 treatment groups, trained and untrained | Per exercise: 1 set effect size 0.24; 2 to 3 sets 0.34; 4 to 6 sets 0.44. 2 to 3 vs 4 to 6: difference 0.10 (CI -0.09 to 0.30, p = 0.29) | A |
| Schoenfeld 2019, MSSE 51(1):94-103 (full text via Europe PMC; Table 1 read from its image) | RCT, 34 resistance-trained men (4.4 y), 8 wk, 3 sessions a week, 7 multi-joint exercises (bench press, military press, lat pulldown, seated cable row, back squat, leg press, leg extension), 1 vs 3 vs 5 sets per exercise | Weekly sets per region, counted in full: upper limbs 6/18/30, lower body 9/27/45 (per session: elbow flexors 2/6/10 from pulldown and row, quadriceps 3/9/15). Thickness change in mm for 1/3/5 sets (percent computed from the group means in Table 1): elbow flexors +0.7/+2.1/+2.9 (1.6/4.7/6.9%; group effect p = 0.02), elbow extensors +0.6/+1.4/+2.6 (1.1/2.9/5.5%; NS, p = 0.19), mid-thigh (rectus femoris) +2.0/+3.0/+6.8 (3.4/5.4/12.5%; p = 0.02), lateral thigh (vastus lateralis) +2.9/+4.6/+7.2 (5.0/8.1/13.7%; p = 0.006). After adjustment only 1 vs 5 sets differed significantly (3 sets did not differ from either). Sessions took about 13, 40 and 68 min. Strength and endurance did not differ | B |
| Heaselgrave 2019, IJSPP 14(3):360-368 | RCT, 49 resistance-experienced men, 6 wk, biceps only: 9 sets once a week, 18 or 27 sets twice a week | Thickness +4.3%, +9.5%, +5.4% (no significant difference); 27 sets (13.5 a session) did not beat 18 (9 a session) | B |
| Aube 2022, J Strength Cond Res 36(3):600-607 | RCT, 35 resistance-trained (squat 2.09 x body mass), 8 wk, 2 sessions a week, 12/18/24 weekly lower-body sets (6/9/12 a session) | No difference in thickness or fat-free mass; 18 sets best for squat 1RM (p = 0.052) | B |
| Remmert 2025 preprint, SportRxiv 537 (full text read) | Meta-regressions of per-session volume | Point of undetectable outcome superiority (PUOS) about 11 fractional (8.2 direct, 13.8 total) sets per muscle per session for hypertrophy; about 2 direct sets for strength | A, preprint |
| Willardson and Burkett 2006, J Strength Cond Res 20(2):400-403 | 15 men with training experience, 5 sets at 15RM, rest 30 s, 1 min, 2 min | Reps fell significantly from set 1 to set 5 at every rest; set-1 reps were never sustained | B |
| Willardson and Burkett 2005, J Strength Cond Res 19(1):23-26 | 15 men, 4 sets of squat and bench at 8RM, rest 1, 2, 5 min | Total reps 5 min > 2 min > 1 min | B |
| Singer 2024, Front Sports Act Living 6:1429789 | SR with Bayesian meta-analysis, 9 studies, 19 measurements | Short vs longer rest: 0.48 vs 0.56 standardised difference with large overlap; small benefit to resting more than 60 s, no appreciable difference beyond about 90 s | A |
| Refalo 2023, Sports Med 53(3):649-665 | SR with meta-analysis, 15 studies | Training to set failure vs non-failure: effect size 0.19 (0.00 to 0.37); momentary failure vs non-failure 0.12 (-0.13 to 0.37), no advantage | A |
| Robinson 2024, Sports Med 54(9):2209-2231 | Exploratory meta-regressions, estimated RIR | Hypertrophy rose as sets ended closer to failure (RIR slope negative, interval excludes zero); strength flat across RIR; RIR was estimated, so cautious | A (exploratory) |
| Vieira 2022, Sports Med 52(5):1103-1125 | SR with meta-analysis, 20 studies (12 pooled), crossover | Failure vs non-failure: larger biomechanical drop (SMD -0.96, CI -1.43 to -0.49), more muscle damage (SMD 0.76), higher RPE (SMD 1.93) | A |
| Kassiano 2022, J Strength Cond Res 36(6):1753-1762 | SR, 8 studies, 241 young men | "Some degree of systematic variation seems to enhance regional hypertrophic adaptations... excessive, random variation may compromise muscular gains"; redundant stimulus or high rotation may hinder | A |
| Baz-Valle 2019, PLoS One 14(12):e0226989 | RCT, 21 resistance-trained men, 8 wk, 3 x 6 exercises, 4 a week; exercises random each session vs fixed | Similar strength and thickness; variation raised intrinsic motivation | B |
| Kassiano 2025, Res Q Exerc Sport 96(2):371-381 | RCT, 70 untrained young women, 10 wk, 2 sets of 10 to 15RM per exercise; constant vs systematically varied leg exercises | Similar thickness (+7.8 to +17.7% vs +7.5 to +19.3%) and strength | B (untrained) |
| Fonseca 2014, J Strength Cond Res 28(11):3085-3092 | RCT, 49 active people, 12 wk, twice a week | Quadriceps area +11.6/12.0% (constant) vs +11.6/12.2% (varied exercise); varied groups grew all quadriceps heads, constant groups did not grow vastus medialis or rectus femoris; varied exercise gave the largest strength gain | B |
| Zabaleta-Korta 2021, J Sports Sci 39(20):2298-2304 | RCT, equal volume and intensity, Smith-machine squat vs leg extension | All three regions of rectus femoris grew with leg extension; only the central vastus lateralis grew with squats | B |
| Kassiano 2026, J Strength Cond Res 40(4):367-376 | RCT, 63 untrained young women, 8 wk, 3 sets, twice a week | Leg extension: rectus femoris +11.4/+12.3/+17.5% (proximal/middle/distal) vs squat +2.0/+5.7/+7.9%; squat: distal vastus lateralis +18.2% vs +11.2% | B (untrained) |
| Kinoshita 2026, MSSE 58(7):1566-1580 | RCT within-subject, 17 untrained adults, 12 wk, 5 sets, twice a week; knee extension vs leg press | Rectus femoris +13.2% (extension) vs +1.1% (press); vasti and whole quadriceps comparable; leg press also grew gluteus maximus (+15.4%) and adductor magnus (+6.2%) | B (untrained) |
| Costa 2021, Int J Sports Med 42(9):803-811 | RCT, 22 detrained men, 9 wk | Varied exercises raised all 8 sites measured; constant exercises did not significantly grow mid lateral thigh or proximal elbow flexors | B |
| Gentil 2017, Sports Med 47(5):843-855 | Review of 23 studies, single- vs multi-joint | Adding single-joint work to multi-joint work gave no extra upper-limb size; one study found single-joint work more fatiguing and sore | A/D (narrative) |

**Still uncertain.** (1) No trial compares 6 sets of one lift against 3 + 3 on two lifts at identical per-muscle volume. (2) Many studies count sets at "failure" loosely; Pelland reports only about 30% of hypertrophy effects had a clear momentary-failure definition. (3) Rep loss across sets is shown (Willardson) but a falling rep count is not itself "junk": sets taken within a few reps of failure keep their stimulus (Robinson 2024, exploratory) while costing recovery (Vieira 2022). (4) Per-session volumes above about 10 fractional sets are rare in the trials (12 studies in Remmert's data), so every ceiling in this area is an extrapolation.

---

## Q2. Per-session volume per muscle: is there a productive ceiling, and how to count indirect sets

**Best current answer.**

* **Ceiling per muscle per session: about 8 direct sets, about 11 fractional sets (direct 1.0, synergist 0.5)** [A, preprint]. This is a point beyond which "no comparison to a higher per-session volume had more than a 50% probability of exceeding the smallest detectable effect"; the authors state it is NOT an upper limit and that data above about 10 sets are sparse (12 included studies with 10 or more sets; the studies averaged 5.95 +/- 4.49 fractional sets per session).
* RP (practitioner) gives "8 to 12 sets per muscle per session maximum, beyond which systemic fatigue makes more training within that session very inefficient" on its triceps, quads, hamstrings, back, biceps, side delt and calf guides [D, extracted]. The engine's 8 (`planEngine.js:2020`) agrees; its weak-point 12 sits at the top of both ranges.
* **Counting indirect sets:** half a set is the best-supported rule. Pelland 2026 compared counting synergist sets as 1 (total), 0.5 (fractional) and 0 (direct only) across 67 studies: "the relative evidence for the fractional quantification method was strongest" [A]. Direct comparisons agree in direction: unilateral dumbbell row grew the elbow flexors 5.16% vs 11.06% for biceps curl (Mannarino 2021, untrained, n = 10, within-subject [B]); bench press alone did not produce a significant triceps cross-sectional area gain while groups with direct triceps work did, although the between-group difference was not significant (Brandão 2020, 43 young men [B]); fatigue after 8 sets of rows was about 0.56 of the loss after 8 sets of preacher curls (peak torque -15.1% vs -26.8%) and recovered within 24 h (Soares 2015, highly trained men [B]).
* **Muscle-specific caveat (INF):** half a set is a population-level convention. In untrained adults a deep leg press grew gluteus maximus by 15.4% against 4.4 to 6.2% for the vasti (Kinoshita 2026 [B]), so glutes credited at 0.5 on squats and presses are probably under-counted; bench press grew the anterior deltoid and triceps but less than the pectoralis (Lanza 2024 [B]). Treat 0.5 as a default, not a law.

**Evidence not already in Q1.**

| Source | Design and population | Result | Grade |
|---|---|---|---|
| Pelland 2026, Sports Med 56(2):481-505 (doi 10.1007/s40279-025-02344-w; full text read) | SR with Bayesian multilevel meta-regressions, 67 studies, 2,058 participants (79.1% male, mean age 25.2) | Fractional counting best supported; per-set marginal slope 0.24% at the mean (12.25 fractional sets); see Q3 for tiers | A |
| Brigatto 2019, J Strength Cond Res 33(8):2104-2116 | RCT, 20 trained men, 8 wk, 16 sets once a week vs 8 sets twice a week | No significant difference in thickness or strength; effect sizes slightly favoured twice a week for some outcomes | B |
| Schoenfeld 2015, J Strength Cond Res 29(7):1821-1829 | RCT, 20 well-trained men: split (several exercises per muscle once a week) vs total body (one exercise per muscle, 3 times a week) | Forearm-flexor thickness (the abstract's label for the arm flexors) greater with total body; strength similar | B |
| Ochi 2018, Front Physiol 9:744 | RCT, 20 untrained, 11 wk, knee extension 6 sets once a week vs 2 sets 3 times a week | Size similar; strength +43.5% vs +65.2% (3 times a week better); perceived exertion higher with 6 sets in one session | B (untrained) |
| **Barbalho 2019** | **RETRACTED (MSSE 2021;53(6):1318)** | Excluded | n/a |

**Still uncertain.** The PUOS comes from a preprint; the best-fit per-session function was logarithmic and weekly was root, so the two are not interchangeable. Studies with high per-session volume nearly always also have high weekly volume, so per-session and weekly effects are confounded (Schoenfeld 2019: 10 to 15 sets per muscle per session still gave the largest 8-week gains in trained men, at 68 minutes a session).

---

## Q3. Weekly volume per muscle: dose-response and the landmark ranges

**Best current answer (fractional sets per muscle per week).**

| Quantity | Number | Basis | Grade |
|---|---|---|---|
| Minimum effective dose for hypertrophy | 4 | Pelland 2026: the volume at which the model first exceeds the smallest detectable effect (2.05%) | A |
| "Higher efficiency" tier | 5 to 10; about 6 extra weekly sets per further detectable gain | Pelland 2026 Table 3 | A |
| "Intermediate efficiency" | 11 to 18; about 8.5 extra sets | same | A |
| "Lower efficiency" | 19 to 29; about 10.75 extra sets | same | A |
| "Lowest efficiency" | 30 to 42; about 12.5 extra sets | same | A |
| Beyond | 43 and above: insufficient data or possibly less | same; "few studies have explored about 25+ fractional weekly sets"; no plateau found | A |
| Point of undetectable superiority | about 31 | Remmert's reading of Pelland's OSF supplement (not opened by me) | A, secondary |
| Per added set at the mean (12.25 sets) | +0.24% muscle size (95% CrI 0.15 to 0.33) | Pelland 2026; Schoenfeld 2017 found +0.37% per set (34 groups, 15 studies) | A |
| Practical productive band | 10 to 20, priority muscle up to about 24 to 30 | INF from the tiers; Baz-Valle 2022 (7 trials, trained men 18 to 35): no difference 12 to 20 vs more than 20 sets for quadriceps and biceps, triceps favoured more than 20 | A/INF |
| Maintenance | 2 to 6, plan at 4 | Bickel 2011 [B]: after 16 weeks of training, one-ninth or one-third of the dose for 32 weeks preserved young adults' hypertrophy (not older adults'); Spiering 2021 [D, narrative]: 1 set per exercise, 1 session a week, intensity kept; RP MV "about 6" [D] | B/D |

Marginal return (INF, derived by me from the published square-root form and the published slope at the mean; intercepts were not read, so treat as approximate): d(gain)/d(set) is about 0.84/sqrt(W) percent per set, so about 0.42 at 4 sets, 0.34 at 6, 0.24 at 12, 0.19 at 20 and 0.15 at 30. It says where an extra set pays most (low-volume muscles) without claiming a plateau.

**Trained vs novice.** Pelland adjusts for training status and reports its moderators as hypothesis-generating only. Individual trials: untrained, 3 sets per exercise beat 1 (Hammarström 2020 [B]); trained men gained more with 32 than 16 weekly sets in the lower body and triceps over 8 weeks (Brigatto 2022 [B]), but showed no difference between 12, 18 and 24 weekly lower-body sets in lifters squatting twice body mass (Aube 2022 [B]), and no significant difference between 9, 18 and 27 biceps sets (Heaselgrave 2019 [B]). Net: the marginal benefit of volume above about 12 to 20 sets is small and muscle-specific in trained lifters (A), and the plan should not assume trained lifters need a different number, only that they sit further along the same curve (INF).

**RP landmarks (practitioner, D) against the repo.** RP's current guides (priority = "P" columns) as extracted; the repo's table is `algorithms.js:25-59` (tracker) with generator overrides `planEngine.js:302-318`.

| Muscle | Repo MV / MEV / MAV / MRV | RP MV / MEV / MAV / MRV | RP priority MAV / MRV |
|---|---|---|---|
| Chest | 4 / 6 / 14 / 22 | 2-4 / 4-6 / 6-16 / 16-24 | 16-24 / 24-32+ |
| Back | 8 / 10 / 16 / 25 | table illegible in extraction | not read |
| Front delts | 0 / 0 / 8 / 14 | 0-2 / 0-2 / 4-8 / 8-12 | 12-16 / 16-20+ |
| Side delts | 0 / 8 / 16 / 26 | 2-6 / 6-8 / 8-24 / 24-30 | 24-30 / 30-40+ |
| Rear delts | 0 / 6 / 16 / 24 | 0-4 / 0-4 / 4-12 / 12-20 | 24-30 / 30-40+ |
| Biceps | 5 / 6 / 14 / 22 | 6-8 / 8-10 / 14-20 / 20-26 | 20-26 / 26-35 |
| Triceps | 4 / 6 / 14 / 22 | 0-4 / 4-6 / 6-16 / 16-20 | 16-20 / 20-26+ |
| Quads | 6 / 8 / 14 / 20 | 2-4 / 4-6 / 6-14 / 14-18 | 10-18 / 18-24+ |
| Hamstrings | 4 / 6 / 14 / 20 | 0-2 / 2-4 / 2-8 / 8-14 | 8-14 / 14-20 |
| Glutes | 0 / 4 / 14 / 22 (generator: MV 4, MEV 6, MRV 16) | 2-6 / 6-8 / 8-24 / 24-30 | 24-30 / 30-40+ |
| Calves | 6 / 8 / 14 / 20 | 2-4 / 4-6 / 6-16 / 16-24 | 16-24 / 24-32+ |
| Abs | 0 / 4 / 16 / 25 | 0-4 / 0-4 / 4-12 / 12-20 | 16-24 / 24-32+ |
| Traps | 0 / 4 / 14 / 24 | 0-4 / 0-4 / 4-12 / 12-20 | 16-24 / 24-32+ |

RP states these are "starting points, not gospel", apply to "intermediate lifters with 3 to 7 years of training" and, for delts and traps, assume concurrent compound training (so they lean toward direct sets). The repo counts synergists at 0.5, so comparing its totals with RP's direct-leaning ranges mixes two systems (flagged in Q10); the tracker documents its arm, delt and trap landmarks as totals that include indirect credit (`algorithms.js:28-35`), but its biceps and triceps numbers sit inside RP's direct-set ranges all the same. **MRV has no empirical determination**: Pelland found no plateau up to 42 fractional sets, so "hard ceiling before accumulated fatigue impairs recovery" (`algorithms.js:15-23`) describes a convention.

**Still uncertain.** Most trials are 6 to 12 weeks and in young adults (Pelland excluded over-70s); muscle-specific curves are barely resolved (calves responded to 12 vs 6 weekly sets in untrained young women, Kassiano 2024 [B]; triceps and quadriceps behave differently in Baz-Valle's review); whether 30-plus sets help in the long run is open. Bands for maintenance, normal growth, focus and likely excess, the reading of 27 weekly biceps sets, and the honest screen wording are in Q3b (immediately below).

---

### Q3b. Bands for maintenance, normal growth, focus and likely excess; the biceps-at-27 question (founder addendum, 2026-10-04)

All bands are in **fractional sets per muscle per week** (the tracker's unit: a direct set 1.0, a synergist set 0.5). Pelland's tiers are in the same unit, so they are the evidence backbone; RP's ranges are D and lean toward direct sets (Q3 table), so they are shown converted.

**General bands (the evidence allows these for every muscle; it does not resolve them muscle by muscle).**

| Band | Fractional sets per week | What the research says | Grade |
|---|---|---|---|
| (a) Maintenance | 2 to 6 (plan 4) | One-third or one-ninth of the training dose preserved young adults' hypertrophy for 32 weeks (Bickel 2011); 1 set per exercise once a week if the load is kept (Spiering 2021, narrative); at least 4 weekly sets (Iversen 2021, narrative); RP MV about 6 | B/D |
| (b) Normal growth target | 10 to 20 | Tiers "higher efficiency" 5 to 10 (about 6 extra weekly sets per further detectable gain) and "intermediate" 11 to 18 (about 8.5); no difference between 12 to 20 and more than 20 sets for quadriceps and biceps in trained men (Baz-Valle 2022) | A |
| (c) Deliberate focus or specialisation | 20 to 30 | Tier "lower efficiency" 19 to 29 (about 10.75 extra sets per further detectable gain); point of undetectable superiority about 31 (Remmert's reading of Pelland) | A |
| (c+) Top of the studied range | 30 to 42 | Tier "lowest efficiency" 30 to 42 (about 12.5 extra sets per detectable gain); "few studies have explored about 25+ fractional weekly sets"; no plateau and no decline found, but the best-fit form is compatible with a plateau or an inverted U | A |
| (d) Above anything the evidence supports | 43 or more weekly; or more than 11 fractional (8 direct) sets in one session | Pelland: "43+: insufficient data to inform efficiency or potentially less hypertrophy"; Remmert: no data on very high per-session volumes | A |

**What "likely excess" means, and what it does not.** Band (d) says "outside the range the research covers", not "harmful". I found no non-retracted trial in which a higher weekly volume made hypertrophy significantly worse (the nearest is Aube 2022: with 12, 18 and 24 weekly lower-body sets, squat 1RM was best at 18, p = 0.052, and some thickness and fat-free-mass changes were numerically smaller at 24, none significant): trained men gained most at 30 to 45 total sets per muscle a week over 8 weeks (Schoenfeld 2019), at 32 over 16 sets (Brigatto 2022), and in a 6-week trial that escalated to 32 sets per exercise a week, gains after correcting for muscle water were "dampened, but still positive" beyond about 20 sets per exercise a week (Haun 2018, 31 resistance-trained men). The two papers I found that claimed an upper threshold or an inverted U (Barbalho 2019, MSSE; Barbalho 2020, IJSPP) are both RETRACTED. "Overtraining" is a clinical state: non-functional overreaching and overtraining syndrome mean a sustained performance fall with prolonged recovery, diagnosed by exclusion, and "none" of the proposed markers "meet all the criteria to make their use generally accepted" (Meeusen 2013, ECSS and ACSM consensus [D]). A weekly set count cannot diagnose it, so the screen must never say or imply "overtrained".

**By muscle: where the evidence allows, and where it does not.**

| Muscle | RP direct-set bands (D): maintain / normal (MAV) / priority (MAV*P to MRV*P) | Muscle-specific trials | What can be said |
|---|---|---|---|
| Biceps | 6-8 / 14-20 / 20-26 to 26-35 | Trained men, direct sets 9, 18, 27 a week: +4.3%, +9.5%, +5.4%, no significant difference between groups, effect sizes moderate to large for 18 and 27 against 9 (Heaselgrave 2019 [B], 6 weeks); trained, 12 to 20 vs more than 20: no difference (Baz-Valle 2022 [A]); trained, pulling-only elbow-flexor work (pulldown and row) at 3, 9, 15 fractional sets a week (6, 18, 30 total sets counted fully): thickness +0.7, +2.1, +2.9 mm (about 1.6%, 4.7%, 6.9%), only 1 vs 5 sets significantly different (Schoenfeld 2019 [B]) | Gains rose with volume up to 15 fractional sets (the highest tested in the pulling-only trial) and up to 18 direct sets (Heaselgrave); no trial shows more from 27, or harm from it. Focus band 20 to 30 fits; (c+) begins at 30 |
| Triceps | 0-4 / 6-16 / 16-20 to 20-26+ | More than 20 weekly sets beat 12 to 20 for the triceps (Baz-Valle 2022 [A], p = 0.01) | The one small muscle where more than 20 helped in the pooled trials; the general focus band fits |
| Quads | 2-4 / 6-14 / 10-18 to 18-24+ | 32 weekly sets beat 16 in the lower body (Brigatto 2022 [B]); no difference among 12, 18, 24 weekly lower-body sets in lifters squatting twice body mass (Aube 2022 [B]); no difference 12 to 20 vs more than 20 (Baz-Valle 2022) | Mixed by population; RP's ceiling is lower than the general focus band |
| Calves | 2-4 / 6-16 / 16-24 to 24-32+ | 12 weekly sets beat 6 for lateral gastrocnemius, soleus and the sum, untrained, 6 weeks (Kassiano 2024 [B]) | Responds to more than 6; nothing tested above 12 |
| Chest, back, hamstrings, glutes, side, front and rear delts, traps, abs, adductors, forearms | see the Q3 table | No muscle-specific volume trial found (searches for volume trials by muscle returned only the studies above) | The general bands apply; RP's per-muscle differences are D only |

**Does fractional counting change the number for biceps?** Yes, by the amount of pulling volume. Tracker count = direct curl sets + 0.5 x (rows, pulldowns, pull-ups and other sets that name the biceps as a synergist). A plan with 12 to 16 weekly rows and pulldowns adds 6 to 8.

| What the 27 is | Fractional total | Band | Reading |
|---|---|---|---|
| 27 is the tracker's total (for example 20 direct curl sets plus 14 pulling sets) | 27 | (c) focus, middle | Inside the focus range. In RP's own terms 20 direct is the top of normal (MAV 14 to 20), inside its MRV 20 to 26 |
| 27 are direct curl sets, with 14 pulling sets on top | about 34 | (c+) top of the studied range | Not beyond the evidence (it is below 43) but each extra set adds little; inside RP's priority band (direct 26 to 35); Heaselgrave's 27 direct sets in trained men grew the biceps no more than 18 and no less than 9 (NS), and nothing bad |
| 27 direct sets in 2 sessions (13.5 each) | per-session 13.5 direct | (d) per session | Past the per-session ceiling; Heaselgrave's 13.5-a-session group did no better than the 9-a-session group |
| 27 direct sets in one session | 27 in one session | (d) per session | Past anything studied in a session (Remmert: 12 studies with 10 or more sets) |

**Why the tracker called it "Too much" (read, not changed).** `getVolumeStatus` (`algorithms.js:391-418`) labels anything above a muscle's MRV "Too much" (biceps MRV 22, `algorithms.js:25-59`; the plan generator's override is 20, `planEngine.js:312`), and the app's own glossary says "Too much means past the point of extra benefit, not dangerous" (`coachGlossary.js:42, 47`). Two things combine. The tracker's comment (`algorithms.js:28-35`) says the biceps, triceps, delt, forearm and trap landmarks were raised to mean totals including the 0.5 indirect credit, yet the biceps MRV of 22 sits inside RP's direct-set MRV range of 20 to 26, so a fractional total is judged against a ceiling no higher than the direct-set one (INF). And the label takes no account of whether the muscle is a plan focus. A person at 27 fractional sets on a biceps focus block is inside both RP's priority band and Pelland's focus tier.

**Honest wording for each band (describing, never instructing, never "overtrained"; British English, no em dash).**

| Band | The muscle IS a focus in the plan | The muscle is NOT a focus in the plan |
|---|---|---|
| below (a), under 2 | "Below maintenance for this muscle." | same |
| (a) 2 to 6 | "Maintenance range: studies find this holds the size you have." | same |
| (b) 10 to 20 | "Normal growth range. Your plan is building [muscle] towards its focus range." | "Normal growth range." |
| between (a) and (b) | "Between maintenance and the normal growth range." | same |
| (c) 20 to 30 | "Within your focus range for [muscle]: you picked it to bring up. Studies have found small extra gains at weekly totals like this." | "Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan." |
| (c+) 30 to 42 | "Top of your focus range. This is near the most that studies have tested, and each extra set adds little." | "Near the top of what studies have tested. Each extra set adds little." |
| (d) 43 or more | "Beyond the range studies have tested, so the research cannot say what extra sets add." | same |
| per session over 11 fractional (8 direct) | "More than most studies have tested in one session (about 11 sets). The same sets spread over more sessions are counted the same in the weekly total." | same |

Never say: "overtrained", "too much" (it reads as blame), "junk volume", "you should cut back" (D204), or anything about injury risk from volume (no evidence found).

**Still uncertain.** Muscle-specific upper bounds (the pooled data do not separate muscles); whether a focus block of 20 to 30 sets stays productive beyond 6 to 12 weeks; whether the true curve turns down above 42 (cannot be excluded); how many pulling or pressing sets a given person's plan carries (it changes the fractional total by 6 to 10 sets for biceps, triceps, front delts).

---

## Q4. Frequency per muscle per week, and what a per-session ceiling forces

**Best current answer.**

* **At equal weekly volume, frequency does not meaningfully change hypertrophy** [A]. Schoenfeld 2019 (SR and meta-analysis, 25 studies): no significant difference between higher and lower frequency when volume is equated, including trained lifters and upper and lower body separately; "individuals can choose a weekly frequency per muscle group based on personal preference". Pelland 2026: frequency slope on hypertrophy 0.32% per added weekly session (95% CrI -0.14 to 0.82; probability above zero 91.3%), "compatible with negligible effects"; for strength the effect is real but with strong diminishing returns (about 12.7% at 1 session vs 17.3% at 2, preprint v2 text). The older "twice beats once" conclusion (Schoenfeld 2016, 10 studies, effect size 0.49 vs 0.30) is superseded by the 2019 review (same first author, 25 studies instead of 10) and by Pelland.
* **Trained-lifter trials agree** (all B): Brigatto 2019 (1 vs 2 sessions, same sets): no difference. Zaroni 2019 (18 well-trained men, split once a week vs total body 5 days a week, 8 wk): total body gave greater thickness in the elbow flexors and vastus lateralis, same strength. Schoenfeld 2015: total body 3 times a week beat split once a week for forearm-flexor thickness (the abstract's label). Bartolomei 2021 (21 trained men, 10 wk): total body better for one strength measure, split better for vastus lateralis thickness. Evangelista 2021 (67 untrained, 2 vs 4 sessions a week, equal weekly sets): no difference. Ochi 2018 (untrained, equal volume): spreading sets across 3 sessions gave larger strength gains and lower perceived exertion.
* **Practical consequence of the per-session ceiling (INF, arithmetic):** the minimum number of weekly exposures for a muscle is `k = ceil(W / C)`, with C = 8 direct (or 11 fractional) sets.

| Weekly sets W | Sessions needed at C = 8 direct | at C = 11 fractional |
|---|---|---|
| 6 to 8 | 1 | 1 |
| 10 to 12 | 2 | 1 to 2 |
| 16 | 2 | 2 |
| 18 to 20 | 3 | 2 |
| 24 | 3 | 3 |
| 28 to 32 | 4 | 3 |

  So frequency is forced by volume, not chosen for its own sake; a muscle at 16 weekly direct sets needs two exposures, at 24 three. Above that, extra exposures buy nothing proven and shorten the spacing (Q6).
* **Soft rule (CONV, from D):** RP quotes 2 to 4 weekly sessions for chest, back and triceps, 2 to 5 for quads and glutes, 2 to 3 for hamstrings, 3 to 6 for biceps, side and rear delts, calves and abs [D, extracted]; these describe what people tolerate, not what grows more.

**Still uncertain.** No study crosses per-session volume with frequency directly (Remmert says it would need four groups per variable); the "frequency helps only when per-session volume is low" and "frequency helps when per-session volume would otherwise be excessive" hypotheses are both open.

---

## Q5. Recovery time course after a session, per muscle; what "recovered by tomorrow" can honestly mean

**Best current answer.**

* **There is no validated per-muscle recovery table.** What exists are group-mean time courses for a few doses and muscles, mostly young men, mostly very hard sessions. For a typical hypertrophy session (up to about 8 hard sets for the muscle, stopped 1 to 3 reps short of failure) function is probably mostly restored by 24 to 48 h; to failure or at high volume, 48 to 72 h for the lower body and up to 96 h for 8 sets of bench press to failure [B, INF]. The "not to failure" arms of the trials were about 5 reps short of failure, not 1 to 3; the 1-to-3 case is interpolated between them and failure (INF). Soreness, force, work capacity and protein synthesis recover on different clocks, so "recovered" must be defined before it is claimed.
* **Per-muscle times, and the test of the founder's claim "biceps recover quicker than back", are in Q5b immediately below.** Short version: reasonable default (D), unmeasured for lats and upper back, with measured comparisons between other muscles disagreeing in direction.
* **Honest forecast language:** a model estimate with a band (central T, "likely" at 1.25 T [CONV]) and a plan-structure fact (hours between logged sessions). Never "your chest will be recovered" as a measurement. Recovery of function is also not permission or prohibition: training a muscle before it has recovered has not been shown to reduce hypertrophy at modest per-session volume (Q4, Q6), so the label describes (D204).

**Time course evidence.**

| Source | Population and protocol | Result | Grade |
|---|---|---|---|
| Goulart 2021, Eur J Sport Sci 21(7):935-943 | 14 resistance-trained men; 5 sets of 8 to 10RM squat plus 5 of leg press, to failure; second session after 24, 48 or 72 h | Volume load down at 24 h; first-set volume load still down at 48 h (ES -0.63); jump and isometric strength above baseline at 72 h; "at least 48 h" for performance, better perceptual response at 72 h | B |
| Morán-Navarro 2017, Eur J Appl Physiol 117(12):2387-2399 | 10 resistance-trained men; bench and squat; 3 x 5 and 6 x 5 with a load that allows 10 reps (about 5 reps in reserve) vs 3 x 10 (failure); to 72 h | Failure gave larger acute jump and velocity loss; non-failure protocols recovered significantly faster between 24 and 48 h | B |
| Pareja-Blanco 2020, J Strength Cond Res 34(10):2867-2876 | 10 men; 10 protocols, 3 sets, 5 min rest, bench and squat | Failure, especially high-rep, kept mechanical function reduced up to 48 h; protocols stopped short recovered sooner | B |
| Vieira 2022, Sports Med 52(5):1103-1125 | SR and meta-analysis, 20 studies | Failure vs non-failure: biomechanical drop SMD -0.96; damage SMD 0.76; RPE SMD 1.93; training status did not moderate (p = 0.92); velocity loss greater in upper limbs than lower | A |
| Ferreira 2017, Physiol Behav 179:143-147 | 26 resistance-trained men; 8 sets of bench press to failure, 2 min rest; to 96 h | Immediate losses: total work -25%, peak torque -17%; DOMS lasted 72 h; peak torque back at 96 h, total work NOT back at 96 h | B |
| Soares 2015, J Strength Cond Res 29(9):2594-2599 | 16 highly trained men; 8 sets of 10RM unilateral seated row vs preacher curl (other arm) | Peak torque loss -15.1% (row) vs -26.8% (curl); row back to baseline at 24 h, curl still -8.4% at 24 h; curl soreness up at 24, 48, 72 h | B |
| Bartolomei 2017, Eur J Appl Physiol 117(7):1287-1298 | 12 trained men (6.3 y); 8 x 10 vs 8 x 3, lower-body tests, to 72 h | High-volume gave larger losses; isometric strength still impaired at 72 h after high-volume only | B |
| Chen 2011, Eur J Appl Physiol 111(2):211-223 | 17 sedentary men; maximal eccentrics on four limb muscles | Elbow muscles more damaged than knee muscles; knee flexors more than knee extensors | B (untrained, unaccustomed) |
| Jamurtas 2005, Eur J Appl Physiol 95(2-3):179-185 | 11 untrained men; 6 x 12 submaximal eccentrics at 75%, legs vs arms | Soreness and range of motion similar; enzyme release and strength loss larger and slower for the arms (legs fully recovered by 96 h, arms not) | B (untrained) |
| McMahon 2024, J Appl Physiol 136(4):889-900 (full text via Europe PMC) | 8 young adults (4 men, 4 women), not resistance-trained; 4 x 8 maximal isometric knee extensions at long (90 degrees knee flexion) vs short (50 degrees) length, crossover | The reduction in torque at the 50 degree test angle was larger after long-length work by 27% post, 25% at 24 h and 32% at 48 h (mean differences between the two conditions, not absolute deficits); creatine kinase and soreness rose with no difference between conditions | B (n = 8) |
| Nosaka and Sakamoto 2001, MSSE 33(1):22-29 | 10 male students; 24 maximal eccentrics of the elbow flexors from a long or short length | More damage when the action started at the longer length | B |

**Modifiers.**

| Modifier | Evidence | Grade |
|---|---|---|
| Proximity to failure | Largest and best-replicated effect: failure adds roughly 24 to 48 h and a large acute deficit (rows above) | A |
| Volume | More sets, larger and longer deficit (Bartolomei); shape of the curve unknown | B |
| Single- vs multi-joint | Same sets: single-joint curls gave 1.8 times the immediate loss and slower recovery for the elbow flexors than rows did (Soares; a prime-mover versus synergist contrast on one muscle, so a fractional credit of 0.5 already explains most of it). Whole-exercise repetition performance runs the other way: multi-joint lifts were less recovered than single-joint at 24 h (-1.7 vs -0.5 repetitions) and bench press and deadlift were the slowest at 48 h (Korak 2015, 10 recreational lifters, abstract only) | B (n = 16 and n = 10) |
| Muscle length | Lengthened-position work is more damaging and recovers later (Nosaka 2001; McMahon 2024). This is the same property that makes long-length exercises grow more (Q12): the benefit has a recovery price | B/C |
| Region (arms vs legs, upper vs lower) | Per unit of eccentric work arms are at least as susceptible as legs (Chen, Jamurtas; untrained); velocity loss to failure is larger in the upper limbs (Vieira). Standard sessions in trained people: larger peak-force loss in the lower body (Margoni 2025, 16 recreationally trained), no upper vs lower difference in repetition recovery (Korak 2015), no difference between squat, bench press and deadlift in damage markers with bar velocity down longer after squat (Belcher 2019). Lower-body sessions are usually longer and heavier, which may explain the common view that legs need longer; equal-dose evidence for "legs recover slower" was not found (Margoni shows a larger loss, not a longer one) | B/C |
| Training status and the repeated-bout effect | One bout protects against damage in later bouts (McHugh 2003 review; Hyldahl 2017 review [D/A narrative]); with two bouts of 70 maximal eccentrics 6 weeks apart, soreness, range-of-motion and enzyme changes were smaller and strength recovered faster; with 10 weeks apart only range-of-motion and enzyme changes were smaller; at 6 months only the enzyme change was still smaller, in 6 people (Nosaka 1991 [B], 14 young women, training status not stated). In 10 young men followed through 10 weeks of resistance training, muscle damage was highest in the first week, lower at week 3, minimal at week 10 (Damas 2016 [B]; training status is not in the abstract, fibre size only rose by week 10, consistent with novices). Training status did not moderate acute fatigue after failure in the meta-analysis (Vieira, p = 0.92) | B/A |
| Sex | Untrained: women's peak-torque recovery was LONGER than men's after 8 sets of elbow flexion (Flores 2011 [B], n = 30), immediate loss and soreness similar. Meta-analysis of 23 trials: no sex difference in relative strength loss or soreness after maximal eccentrics, though women tended toward a larger relative loss immediately afterwards (Morawetz 2020 [A]). Menstrual phase had minimal effect on training performance in 28 resistance-trained women (differences about 0.01 to 0.02 m/s); motivation predicted performance (Munteanu 2026 [B]) | A/B mixed |
| Age | 21.8 vs 47.0 years, recreationally trained: no difference in recovery (Gordon 2017 [B]); 25.5 vs 50.3 years: no age by time effect (Trivisonno 2021 [B]); trained young vs trained 39.9 years after 10 x 10 squats: middle-aged showed more damage and a worse recovery profile (Fernandes 2019 [B]) | B mixed; no consistent effect to about 50 years |
| Non-local spill-over | Meta-analysis of 52 studies: no general effect of fatiguing one muscle on another (-0.02, CI -0.14 to 0.09) (Behm 2021 [A]); after an extreme lengthening protocol (5 sets of 25 drop jumps) bench-press force and power were still impaired at 72 h (Meira 2026 [B], 16 active men). So cross-muscle fatigue is not a general rule | A/B |
| Subjective vs objective | Peak torque and total work recover on different clocks (Ferreira); perceived recovery tracked jump (r = 0.84) and velocity (r = 0.80) after 8 x 10 squats but the relationship is individual (Tolusso 2022 [B], n = 11) | B |
| Accumulation across sessions | "Evidence for fatigue accumulation with resistance training is equivocal"; muscle damage is the one credible candidate (Kataoka 2022 [A/C]) | A/C |

**Muscle protein synthesis (MPS), for completeness.** Untrained, 8 sets of 8 at 80%: synthesis +112% at 3 h, +65% at 24 h, +34% at 48 h (Phillips 1997 [B]); 12 sets of elbow flexion: +109% at 24 h and back within 14% (not significant) at 36 h (MacDougall 1995 [B], 6 men). After 8 weeks of training the trained leg's synthesis was back to resting at 28 h while the untrained leg was still +70% (Tang 2008 [B], 10 men), and MPS responses are "shorter lived and peak earlier in the trained state" (Damas 2015 [A/D review]). MPS is not a recovery-of-function clock: early MPS after a first bout is unrelated to later hypertrophy while damage is high (Damas 2016), and Pelland and Remmert both caution that MPS timelines "do not necessarily represent hypertrophic effects".

**What can honestly be predicted, and with what uncertainty.**

* Central estimates, with a band of about +/-25% [CONV], are defensible; point predictions for a person are not. The only large-sample dispersion I found is for unaccustomed maximal eccentrics (n = 286: after the exercise, strength fell to 82%, 61% and 42% of baseline in the low, moderate and high responder clusters, Damas 2016 [B]); no study I opened gives the spread of recovery TIME in trained lifters after ordinary sessions.
* A claim of the form "tomorrow is chest and arms, and by tomorrow they will be recovered" can be built from two honest parts: (a) arithmetic on the plan and the log ("the last chest work ended 31 hours before the start time you usually train; this order guarantees at least 47 hours between chest sessions even on consecutive days"), which needs no biology; and (b) a labelled estimate ("estimated recovered from a session of this size at this effort; individual recovery varies a lot"). The second part is a model output, never a measurement.

**What a defensible readiness model looks like.**

1. One decaying residual per exposure (muscle, session), zero at a clock T that depends on dose, effort, exercise type, muscle length, novelty and a bounded person factor (F5). The shape between the session and T (linear in the repo, `muscleRecoveryModel.js:120-128`; exponential in fitness-fatigue models) is unvalidated for muscle function; choose the simpler and show a band.
2. Subjective ratings may lengthen T but not shorten it (Ferreira: they recover sooner than torque; the repo's lengthen-only rule `constants.js:115-126` is conservative).
3. The classic fitness-fatigue (Banister) structure predicts individuals poorly even where it is best studied: with 9 elite swimmers the fatigue time-constant interval was 19 days (6 to 32) and some parameters were so correlated that interpretation was "worthless" (Hellard 2006 [B]); with 11 swimmers the two top-ranked models gave "relevant approximations" of the training-performance relationship (mean absolute percentage error on the validation data 2.0 to 2.7%) but "their ability to predict future performance from past data was not satisfactory for individual training planning" (Busso 2023 [B]); a 2022 review calls prediction "mitigated" (Imbach 2022 [D]). I found no validated muscle-level resistance-training version. So no individual fitting beyond the bounded person factor.
4. Compounding of overlapping sessions (`muscleRecoveryModel.js:134-140`) is a conservative modelling choice, not an established effect (Kataoka 2022).

**Still uncertain.** The shape of the recovery curve; per-muscle times at equal relative dose; the spread among trained lifters; whether lengthened-position training's extra recovery cost offsets its extra growth.

---

### Q5b. Per-muscle recovery times, and the claim "biceps recover quicker than back" (founder addendum, 2026-10-04)

**Verdict on the claim, stated plainly.**

* **A reasonable default, not an established fact.** Practitioners say it. RP's article of 18 Mar 2025 (credited to Trevor): "Small muscles (biceps, triceps, delts): Often good to go in 1-2 days. Big boys (quads, glutes, lats): Might need 3-5 days to bounce back." [D, web-fetch extraction]. RP's own per-muscle guides are less specific: the triceps, quads, side delt, calf, glute, trap and front delt guides (Dec 2023 to Jan 2024) all carry the same sentence, "fatigue will take between 1-2 days to come back down enough to restore or improve on past performance" at per-session MEV-MRV volumes, so in those guides the muscle difference lies only in the weekly frequency ranges (Table 3). The repo already encodes the ordering (biceps 48 h, back 60 h, `src/lib/recovery/constants.js:68-94`).
* **Nobody has measured the latissimus dorsi or the upper back.** I found no study of recovery of either muscle after any resistance session (PubMed searches combining latissimus with fatigue, and pull-up, pulldown or row with recovery or damage, returned only cardiac-assist, electromyography and unrelated records). So no measured comparison between biceps and back exists. The absence of a study is not evidence of no difference.
* **The measured comparisons between other muscles do not agree on direction** (Table 1): the triceps recovered sooner than the pectoralis major after the same bench session (B, trained); arms recovered later than legs after matched eccentric work (B, untrained); lower-body sessions cost more peak force than upper-body sessions (B, recreationally trained); and upper-body and lower-body exercises did not differ in repetition recovery (B, n = 10).
* **What is replicated is not muscle identity.** Dose, proximity to failure, exercise type, novelty of the exercise and training status each move recovery by a factor of about 1.5 to 3 (Q5 modifiers). Heavy multi-joint barbell lifts were the slowest to come back (Korak 2015: at 48 h only 70% of lifters were within one repetition of baseline on bench press and 60% on deadlift, against 80% on every other exercise), and rows load the elbow flexors only lightly (Soares 2015). So part of what looks like "back is slower than biceps" is plausibly an exercise-type effect: back is trained with heavy multi-joint lifts, biceps with single-joint work (INF, not tested as such). The model should apply dose, effort, exercise and novelty first (F5) and treat the muscle base as a prior with a band.
* **Where the popular "biceps 36 h, back 72 h" figures come from.** A web search surfaced an app's blog page quoting biceps about 36 h and back about 72 h. I opened it (web-fetch extraction, not verbatim): it says its windows combine studies with "practitioner consensus", cites frequency, volume and bench-and-squat recovery studies (Schoenfeld 2016, Brigatto 2019, Morán-Navarro 2017, among others) and links no number to a paper. I found no primary study behind those figures [D, secondary, commercial].

**Table 1. Every measured comparison between muscles or exercise types that I found (trained populations unless stated).**

| Comparison | Study, population and dose | Result | Reading | Grade |
|---|---|---|---|---|
| Triceps vs pectoralis major, same session | Ferreira 2017, Muscle Nerve 56(5):963-967; 18 resistance-trained men; 8 sets of bench press to failure | Chest peak torque below baseline for 72 h, total work for 96 h. Triceps peak torque different only immediately after; total work different immediately and at 48 h. Normalised peak torque differed between the muscles only at 48 h; the authors call the difference "small and nonsignificant" and read the stress as similar | The smaller muscle recovered sooner, modestly, as a synergist | B |
| Elbow flexors after a curl vs after a row | Soares 2015, JSCR 29(9):2594-2599; 16 highly trained men; 8 sets of 10RM, other arm | Peak torque loss 26.8% (curl) vs 15.1% (row); curl still 8.4% down at 24 h, row back at 24 h; curl soreness raised at 24, 48 and 72 h, row soreness back by 72 h | Exercise and role (prime mover vs synergist), not muscle size | B |
| Single- vs multi-joint and upper vs lower body, whole-exercise repetition performance | Korak 2015, Int J Exerc Sci 8(1):85-96; 10 male recreational weightlifters; 6 single-joint and 4 multi-joint exercises (5 upper, 5 lower); 8 reps at 85% of 10RM then a set to failure; repeated at 24 or 48 h (abstract only, full text blocked) | Performance improved from 24 to 48 h in every category. The only between-category difference was multi-joint (-1.7 +/- 1.5 reps) vs single-joint (-0.5 +/- 1.8 reps) at 24 h (p = 0.037); none between upper and lower body. At 48 h, 80% of lifters were within 1 rep of baseline on every exercise except bench press (70%) and deadlift (60%) | Exercise type matters; no upper vs lower difference; authors suggest 72 h for multi-joint barbell lifts "in slower recovering lifters" | B (n = 10) |
| Upper vs lower body, standard sessions | Margoni 2025, JSCR 39(6):625-633; 16 recreationally trained men and women; power, strength and hypertrophy (4 x 10 at 70%) protocols with squat and bench press plus 4 accessories | Neuromuscular fatigue (peak-force loss) higher in the lower body than the upper body in every protocol; men and women alike; the abstract gives no recovery duration | Size of the loss, not its duration | B |
| Squat vs bench press vs deadlift | Belcher 2019, Appl Physiol Nutr Metab 44(10):1033-1042; 12 well-trained men (training age 7.1 y); 4 sets to failure at 80% 1RM | No between-lift difference in swelling, range of motion, soreness, creatine kinase or lactate dehydrogenase. Bar velocity stayed down up to 72 h after squat (-8.6%) but only immediately after bench press (-26.7%); no decline after deadlift | Not separable on damage markers; velocity came back sooner after the upper-body lift | B |
| Arms vs legs, matched eccentric work | Chen 2011, Eur J Appl Physiol 111(2):211-223 (17 sedentary men, 5 x 6 maximal eccentrics); Jamurtas 2005, Eur J Appl Physiol 95(2-3):179-185 (11 untrained men, 6 x 12 at 75% of maximal eccentric torque) | Elbow muscles more damaged than knee muscles; knee flexors more than knee extensors. Strength still down at 96 h for the arms, fully back at 96 h for the legs (Jamurtas). Chen's authors suggest the cause "seems to be associated with the use of muscles in daily activities" | Opposite to "small recovers faster", in untrained people doing unaccustomed work | B (untrained) |
| Lats or upper back vs anything | none | none | Not measured | none |
| Delts, glutes, calves, abs, traps, forearms vs anything | none | none | Not measured | none |

**Table 2. Measured anchors against the recovery model (INF: my arithmetic).** "Implied base" is the clock at the reference dose (6 fractional sets, 2 reps in reserve) that would reproduce the measured time through the model's own structure (time = base x sqrt(sets / 6) x effort factor, effort factor 1.25 for failure as in F5). The repo's own factors (1.15 for 1 rep or fewer) give nearly the same figures. Sets are fractional (direct 1.0, synergist 0.5).

| Anchor (all to or near failure) | Measured time to recover | Implied base | Repo clock at that dose | F5 clock | Reading |
|---|---|---|---|---|---|
| Chest: 8 bench sets, 18 and 26 trained men (Ferreira 2017, two papers) | Peak torque back at 72 to 96 h; total work not back at 96 h | 50 to 67 h by force; 67 h or more by work | 80 h | 87 h | Consistent |
| Triceps: same session, 4 fractional sets (Ferreira 2017) | Force back immediately after; total work down at 48 h | under 24 h by force; 47 to 71 h by work | 45 h | 49 h | Consistent with work, long for force |
| Elbow flexors: 8 sets of 10RM preacher curl (Soares 2015) | Force 8.4% down at 24 h and not reported down later; soreness up to 72 h | 17 to 33 h by force; 50 h or more by soreness | 64 h | 69 h | Long for force, consistent with soreness |
| Elbow flexors: 8 sets of 10RM row, 4 fractional sets (Soares 2015) | Force back at 24 h; soreness back by 72 h | 24 h or less by force | 45 h | 49 h | Long for force |
| Quadriceps: 5 squat plus 5 leg-press sets, 14 trained men (Goulart 2021) | First-set volume load still down at 48 h; jump and isometric strength above baseline at 72 h | 30 to 45 h (37 to 56 h even with no extra time for failure) | 107 h | 116 h | 35 to 70 h longer than measured |

OBSERVED: at the doses that were measured, the repo clocks match chest and triceps work capacity, run about 15 to 45 h long for elbow-flexor force and 35 to 70 h long for the quadriceps. INF: wherever the clocks can be checked they err long, which is safe for a readiness statement and costly for spacing (it makes rotations look worse than they are). Two cautions: each anchor is one study with a failure-level dose, and "recovered" meant force or performance, not soreness. The repo's header comment (`constants.js:22-25`) and the lower-body line (`constants.js:69`, "Goulart 2021 (to failure, back at 72 h)") take Goulart's failure-dose recovery as the base for a standard-dose session (`constants.js:63-67` defines the base that way) and the dose and effort factors then scale it up again, which double counts (INF). The same header cites Soares 2015 for "per-muscle baselines differ" (`constants.js:37-40`); Soares compared two exercises on one muscle, so it supports an exercise effect, not a muscle effect.

**Table 3. Per-muscle priors for the model (the feed into F5).** The clock is hours from the end of a session, at the reference dose (6 fractional sets, 2 reps in reserve, the muscle's usual exercise). The centre is the repo's value (CONV). "Range" is what I can defend from the anchors in Table 2 and from practitioner sources, rounded to 12 h; it is a band for the model to carry, not a measured spread. RP gap is 168 h divided by RP's quoted weekly frequency at maintenance-to-maximum volumes (D; what practitioners say people tolerate, not a recovery measurement).

| Muscle | Centre (h) | Range (h) | Measured anchor | RP weekly frequency, even gap | Grade of the centre |
|---|---|---|---|---|---|
| Biceps | 48 | 24 to 72 | Curl and row, trained (Soares 2015): force 24 to 48 h after curls, soreness 72 h or more | 3 to 6, 28 to 56 h | D (range B) |
| Triceps | 48 | 24 to 72 | Bench session (Ferreira 2017): force immediate, work 48 h; triceps soreness gone by 72 h after barbell or Smith bench, none after dumbbell (Ferreira 2017, JSCR, 27 men) | 2 to 4, 42 to 84 h | D (range B) |
| Chest | 60 | 48 to 96 | 8 bench sets to failure: force 72 to 96 h, work 96 h or more; pectoral thickness still altered at 48 h without active recovery (Bartolomei 2021, 25 men) | 2 to 4, 42 to 84 h | D (range B) |
| Back (lats, upper back) | 60 | 36 to 96 | none | 2 to 4, 42 to 84 h; RP: lats "3 to 5 days" | D only |
| Front delts | 48 | 24 to 72 | none | 2 to 3, 56 to 84 h | D |
| Side delts | 48 | 24 to 72 | none | 3 to 6, 28 to 56 h | D |
| Rear delts | 48 | 24 to 72 | none | 3 to 6, 28 to 56 h | D |
| Traps | 48 | 24 to 72 | none | 2 to 4, 42 to 84 h | D |
| Quads | 72 | 36 to 96 | 10 failure sets: 48 to 72 h (Goulart 2021); heavy 3RM sets in strength athletes: back by 33 h (Raastad 2000, 10 men); 8 x 10 still impaired at 72 h (Bartolomei 2017) | 2 to 5, 34 to 84 h | D; measured-implied 30 to 45 h |
| Hamstrings | 72 | 48 to 96 | 24 Nordic reps, 13 trained men: strength down to day 3 on the first bout, day 1 on a repeat bout 4 weeks later (Coratella 2025); untrained: knee flexors damaged more than extensors (Chen 2011) | 2 to 3, 56 to 84 h | D (one exercise B) |
| Glutes | 72 | 48 to 96 | none | 2 to 5, 34 to 84 h | D |
| Adductors | 60 | 36 to 96 | none | not stated | D |
| Calves | 36 | 24 to 60 | none | 3 to 6, 28 to 56 h | D |
| Abs | 36 | 24 to 60 | none | 3 to 6, 28 to 56 h | D |
| Forearms, neck, tibialis | 36 | 24 to 60 | none | not stated | D |

**How strong is the evidence for differences between muscles?** Weak. Three small measured comparisons exist and disagree (triceps sooner than chest; arms later than legs in untrained eccentric work; lower body larger force loss in standard sessions); one found no upper-versus-lower difference (Korak); none concerns lats, upper back, delts, glutes, calves, abs or traps. The ordering "small before large" is practitioner consensus (D) plus one pairwise measurement; the ordering "legs slowest" has no equal-dose support (Q10 row 1) and the one direct leg-versus-arm test points the other way for unaccustomed work. What the centres in Table 3 can honestly carry is "a starting estimate, with a band of at least 24 h", never "this muscle takes N hours".

**Lab studies versus ordinary sets (why unaccustomed elbow-flexor work and a gym session disagree).**

| Dose and person | Elbow-flexor result |
|---|---|
| Young women, two bouts of 70 maximal eccentric actions of the forearm flexors (Nosaka 1991, 14 women; Q5 table) | All damage markers changed over the 5 days measured after the first bout; a repeat bout 6 weeks later gave smaller soreness, range-of-motion and enzyme changes and faster strength recovery, and 10 weeks later only the range-of-motion and enzyme changes were smaller |
| Young men, unaccustomed maximal eccentrics of the elbow flexors, n = 286 (Damas 2016, IJSM) | Isometric torque fell to 82%, 61% or 42% of baseline in the low, moderate and high responder clusters |
| Resistance-trained men (7.7 years), 10 sets of 6 maximal eccentrics (Newton 2008, 15 trained vs 15 untrained) | Trained: strength back to baseline by 3 days. Untrained: about 40% below baseline at the example time point in the abstract. Trained men were "less susceptible" and recovered faster |
| Highly trained men, 8 sets of 10RM preacher curls (Soares 2015) | Torque 26.8% down immediately, 8.4% at 24 h; soreness through 72 h |
| Same men, 8 sets of 10RM rows (elbow flexors as synergist) | 15.1% down immediately; back at 24 h |

Three differences explain the conflict. (1) Dose: the lab protocols are maximal eccentric-only work through a long range at a fixed speed; an ordinary set is submaximal, concentric plus eccentric, and the non-failure trial arms stopped about 5 reps short (Morán-Navarro 2017), so a set at 1 to 3 reps in reserve sits between the two (INF). (2) Training status and the repeated-bout effect: one earlier exposure shortens and softens the response, and the protection is specific to the exercise (Nosaka 1991; Hyldahl 2017; Coratella 2025: hamstring strength recovered in about 1 day on the repeat bout against about 3 days on the first). Chen's authors attribute arms being more susceptible than legs to daily use of the muscles, which is the same protection by repetition. (3) The exercise: a curl loads the elbow flexors as prime mover, a row as synergist (Soares). INF: susceptibility is mostly how unaccustomed the exact exercise is, not which muscle it is; so the novelty factor (F5, f_novel) matters more than a per-muscle difference, and untrained or returning users should get longer clocks than trained ones doing familiar work.

**Four clocks: measured data against consensus.**

| Clock | Measured in trained people after hard sets | Muscles with data | Consensus (RP, D) |
|---|---|---|---|
| Force and performance (peak torque, jump, bar velocity, first-set load) | 24 to 72 h; to 96 h after 8 sets of bench to failure | chest, triceps, elbow flexors, quadriceps | "so long as you're recovered to train again (can perform at or above normal levels), training is a better idea than waiting to train" (triceps guide) |
| Work capacity (total work, volume load over a session) | Later than peak torque: chest 96 h or more; quadriceps first set still down at 48 h | chest, triceps, quadriceps | not stated |
| Soreness | 72 h or more after curls and chest work; hamstrings days 2 to 3 after Nordics | biceps, chest, triceps, hamstrings | "note when soreness has abated and when you feel recovered enough psychologically to attempt another overloading workout" (triceps guide) |
| Damage markers (creatine kinase, swelling, range of motion) | 48 to 96 h; smaller after a repeated bout; they dissociate from function | many | not used |
| Protein synthesis | Elbow flexors back within 14% (not significant) at 36 h after 12 sets (MacDougall 1995, 6 men); quadriceps +65% at 24 h and +34% at 48 h after 8 sets of 8 in untrained people (Phillips 1997); 28 h in a trained leg (Tang 2008) | arm, leg | "Muscle protein synthesis remains elevated for approximately 24-48 hours post-workout" (RP, 27 Apr 2026); the guides add "a reliable 24-48 hour increase in muscle growth" |

Protein synthesis is not a recovery-of-function clock (Q5). Soreness is not a readiness gate in the RP sources themselves. The model's "recovered" is function (ready for another hard session of this size); the screen should say so.

**How session volume and effort change each muscle's time (from F5; the measured doses are in Table 2).** The same arithmetic applies to every muscle, scaled by its centre. Examples at the model's centres (hours): biceps at 9 fractional sets in a session: 59 at 2 reps in reserve, 47 at 3, 65 at 1, 74 at 0; back at 8 fractional sets: 69 at 2, 55 at 3, 76 at 1, 87 at 0. The model's gap between biceps (9 sets) and back (8 sets) at equal effort is about 10 h, the same size as moving one muscle from 2 to 3 reps in reserve (12 to 14 h). So the per-muscle prior is the smaller lever, and the dose and effort the plan chooses move the answer more than the choice between biceps and back.

**What changes in the rotation if the lower-body clocks are re-centred (probe, Appendix B).** Scaling only the quads, hamstrings, glutes and adductors clocks by 0.6 (about the measured-implied value) leaves the best order unchanged in 10 of the 11 template families (the remaining one, six sessions of upper/lower three times, becomes a tie at a penalty of 0.002 between the previous best order and plain alternation U1, L1, U2, L2, U3, L3). Penalties fall sharply (for example two-session upper/lower 0.231 to 0.048; four-session upper/lower 0.111 to 0.002; five-session push/pull/legs plus upper/lower 0.204 to 0.035). Scaling biceps and triceps by 0.67 also leaves 10 of 11 unchanged (exception: four sessions of push/pull/legs plus arms and delts with rear-delt work in two sessions, where the previous best order scores 0.057 against 0.037 for the new one, both small). So the choice of lower-body centre decides how many rotations look acceptable, not which order is best.

**What the app may say (describes the model; no instruction, no ranking of muscles as fact).** Allowed: "Estimated recovery after this session: about 2 days for biceps, about 2.5 days for back. Estimated from the size of the session and how hard it was; not a measurement." Not defensible: "biceps recover faster than back" (unmeasured), "back needs N hours" (no measurement), "you are recovered" without the word "estimated" (F6).

**Still uncertain.** Recovery of the lats and upper back (no data); the spread of recovery time among trained lifters after ordinary sessions; whether the lower-body centre should be 72 h (conservative) or nearer 40 to 55 h (measured-implied); whether force, work capacity or soreness is the right definition of "recovered" for a hypertrophy session; whether the hamstrings recover more slowly than the quadriceps outside eccentric-emphasis exercises; how fast familiarity protects after a block change.

---

## Q6. Split design by days available (2 to 6), and sequencing a FIXED rotation of unknown spacing

### 6a. Split type, volume equated

* No split type beats another when weekly volume per muscle is equal [A]: frequency has no meaningful independent effect (Schoenfeld 2019 SR, Pelland 2026), and trained-lifter trials show no consistent winner: total body 5 days a week beat once-a-week split for two of three thickness sites (Zaroni 2019); 3 sessions a week beat a once-a-week split for forearm-flexor thickness (the abstract's label; Schoenfeld 2015); a total-body routine was better for one strength measure, a split for vastus lateralis thickness (Bartolomei 2021); same weekly sets over 2 or 4 sessions: no difference in untrained people (Evangelista 2021). RP's own article says "your training split doesn't matter" if you train hard, recover and progress (18 Mar 2025) [D].
* So the split is chosen for the things the evidence does constrain: the per-session ceiling (Q2), the spacing arithmetic (below), time per session (Schoenfeld 2019: 13, 40 and 68 minutes for 1, 3, 5 sets per exercise) and adherence.
* Overlapping fatigue: the evidence supports LOCAL overlap only. There is no general non-local fatigue effect (Behm 2021 [A]); adding leg work did not reduce arm growth in 105 untrained people over 6 weeks of low-load work to failure (Kataoka 2026 [B]); the overlap that matters is shared muscles including synergists. Rows left the elbow flexors recovered by 24 h (Soares), so biceps-after-rows overlap is small and short; bench press does load the anterior deltoid and triceps (Lanza 2024). I found no study of spinal-erector or grip fatigue across squat, deadlift and rows, so treat the hinge-to-back credit (the repo credits back 0.5 on hinges) as an assumption [D].

### 6b. The problem as stated by the founder (2026-10-04): the order is fixed when the plan is built; spacing is unknown

A plan is a cyclic rotation of N session templates (N = 2 to 6). The calendar gap between consecutive sessions is whatever the person chooses: 24 h (back to back), a typical week (the repo prior `TYPICAL_WEEK_GAP_HOURS`), or even (168/N). Every muscle's consecutive exposures, INCLUDING the one that wraps from the last session to the first, are separated by `d` session slots (1 to N). Back to back, `d` slots is only `24 d - 1` hours (a one-hour session assumed).

### 6c. Rules the arithmetic and the evidence support (INF on a B/D base)

* **R1. Alternate; never place two sessions that both load a muscle directly (2 or more direct sets) in adjacent slots, counting the wrap (slot N next to slot 1).** If the split cannot avoid it, put the lower-dose exposure after the heavier one.
* **R2. For a muscle trained k times per rotation, space exposures as evenly as the rotation allows: gaps of floor(N/k) or ceil(N/k) slots.**
* **R3. The longest-clock muscles (quads, hamstrings, glutes, about 72 h at 6 sets) get the largest gaps.** Back to back, only a rotation of 6 gives them 3 slots (71 h); with N = 4 or 5 and two leg exposures the gap is 2 slots (47 h), so the leg exposure that follows the shorter gap should carry fewer sets or a higher RIR (or the muscle gets one exposure per rotation if its weekly volume is 8 sets or fewer).
* **R4. Indirect-only exposures (fewer than 2 direct sets and fewer than 6 fractional sets) do not constrain the order** (Soares: rows leave the biceps recovered at 24 h).
* **R5. When every session would train every muscle (full body on every slot), the rotation is only safe if the person leaves 48 hours or more.** In the probe below a full-body rotation scores 0.72 to 0.77 penalty units against 0.005 for push/pull/legs, driven mostly by the back-to-back scenario. A full-body rotation is acceptable only as an emphasis rotation in which each muscle has one heavy exposure and the others are light (each at about 2 to 3 direct sets), and even then secondary credit keeps adjacent exposures overlapping.
* **R6. Frequency is the minimum that fits the per-session cap (Q4)**, because extra exposures shorten gaps for no proven hypertrophic gain.

**How many exposures per rotation can be back-to-back safe (INF; the average gap, `24 N / k - 1` hours, is at least T for 8 fractional sets at neutral effort; where k does not divide N the gaps are uneven and the shortest is `24 floor(N/k) - 1` hours):**

| Sessions per rotation N | small (calves, abs, forearms; T about 42 h) | arms, delts, traps (T about 55 h) | chest, back (T about 69 h) | quads, hamstrings, glutes (T about 83 h) |
|---|---|---|---|---|
| 2 | 1 | 0 | 0 | 0 |
| 3 | 1 | 1 | 1 | 0 |
| 4 | 2 | 1 | 1 | 1 |
| 5 | 2 | 2 (1 strictly, see note) | 1 | 1 |
| 6 | 3 | 2 | 2 | 1 |

Note for N = 5, arms, delts, traps: two exposures give gaps of 2 and 3 slots (47 h and 71 h); the 47 h gap is shorter than T (55 h), so the strict count is 1. Every other cell is the same under the strict rule. A zero means that on back-to-back days even one exposure per rotation leaves less than T (47 h, or 71 h for N = 3, against 55 h or 83 h). That is not a reason to avoid such rotations (people rarely train every day), it is the size of the shortfall the plan should be judged against.

### 6d. Probe results (my computation, NOT literature; method in Appendix B)

Templates are typical standard-exercise sessions; clocks are the repo's own D201 constants; three spacing scenarios are weighted 0.5 back to back, 0.35 typical week, 0.15 even (F7). "d" is the smallest number of session slots between two direct exposures of a muscle (wrap included). Lower penalty is better.

| N | Grouping | Best order found | Penalty best | Worst order | Penalty worst | What drives it |
|---|---|---|---|---|---|---|
| 2 | Full body A/B | A, B (only order) | 0.773 | same | same | quads, hamstrings, back, chest all d = 1 (back-to-back shortfall 0.53 to 0.62) |
| 2 | Upper / Lower | Upper, Lower | 0.231 | same | same | all d = 2; quads and hamstrings shortfall 0.40 on consecutive days |
| 3 | Push / Pull / Legs | either direction | 0.005 | tie | 0.005 | every muscle d = 3 |
| 3 | Full body x 3, rotating emphasis | A, C, B | 0.723 | A, B, C | 0.737 | quads, back, chest, biceps d = 1 |
| 4 | Upper/Lower/Upper/Lower | U1, L1, U2, L2 (alternate) | 0.111 | U1, U2, L1, L2 | 0.925 | adjacent same-type sessions give d = 1 |
| 4 | Push/Pull/Legs/Arms+delts (rear delts only in Pull) | Push, Pull, Arms+delts, Legs | 0.004 | Push, Arms+delts, Legs, Pull | 0.247 | each major muscle d = 4 (triceps d = 2) |
| 5 | Push/Pull/Legs + Upper/Lower | Push, Legs, Upper, Lower, Pull | 0.204 | Push, Upper, Pull, Legs, Lower | 1.812 | listed order scores 0.219; quads twice per rotation at d = 2 (shortfall 0.40) whatever the order |
| 5 | Body-part (chest+triceps, back+biceps, quads+calves, shoulders+abs, hamstrings+glutes) | any order | 0.000 | tie | 0.000 | every muscle d = 5; but one exposure a week caps weekly volume at the per-session ceiling |
| 6 | Push/Pull/Legs twice | P1, Pu1, L1, P2, Pu2, L2 (repeat the 3-cycle) | 0.003 | P1, P2, Pu2, Pu1, L1, L2 | 2.525 | every muscle d = 3 |
| 6 | Upper/Lower three times | U1, L1, U2, L3, U3, L2 | 0.040 | U1, U3, U2, L3, L1, L2 | 1.496 | legs d = 2 (shortfall 0.20) |

Sensitivity: scaling every clock by 0.75 or 1.25 leaves the best order unchanged for every family except two near-ties (a 4-session push/pull/legs plus arms variant with rear-delt work in two sessions at 0.75, and 6-session push/pull/legs twice at 1.25, where the alternative best order scores 0.007 and 0.084), so the ranking of orders is robust to a 25% error in the clocks; the absolute penalty is not. Turning off the hinge-to-back credit changes only the two full-body scores (0.773 to 0.714 and 0.723 to 0.663).

**Where this differs from the repo sequencer (`src/lib/recovery/sequenceSessions.js`):** the recovery-pair term is circular but uses only the typical-week gap vector (lines 334-336); the adjacency term is linear and "never the wrap pair" (lines 339-345) on the premise that "the week boundary nearly always holds a rest day". With a fixed rotation and free days, neither premise is safe. Its qualifying rule (2 or more primary sets, line 149) matches the probe's direct-set rule.

**Still uncertain.** The probe uses my template choices and the repo's unvalidated clocks; the ranking is robust, the absolute numbers are illustrations. Whether back-to-back days leave a muscle "recovered" at 71 to 96 h is itself the Q5 uncertainty.

---

## Q7. Exercise order within a session

**Best current answer.**

* **Order does not change hypertrophy** [A]: Nunes 2021 (SR and meta-analysis, 11 studies): effect size 0.03 (p = 0.862) for site-specific plus indirect measures. **It changes strength and volume for the exercise placed first**: multi-joint first favoured multi-joint strength (effect size 0.32, p = 0.034), single-joint first favoured single-joint strength (-0.58, p = 0.032). Simão 2012 [D, narrative review]: total repetitions and volume are greater for an exercise at the beginning of a session regardless of muscle mass; "exercises be ordered based on priority of importance".
* Trained-lifter detail (B): Avelar 2019 (36 young men, 6 wk): biceps +14.2% (multi-joint first) vs +13.8% (single-joint first), mid-thigh +7.2% vs +3.9% (only the multi-joint-first group significant).
* **Rule:** the priority (weak-point) muscle's first exercise goes first; within a muscle, multi-joint before single-joint; heavier compounds earlier in the session. This costs nothing in hypertrophy and gives the priority work the freshest repetitions.

**Still uncertain.** Order was tested over 6 to 12 weeks, mostly in men; the clinical significance of the mid-thigh difference is unclear.

---

## Q8. Weak-point focus

**Best current answer.**

* **To raise a lagging muscle, raise its weekly fractional sets into the upper productive tier (about 20 to 24; the screen treats 20 to 30 as the focus range)** (Pelland tiers [A]) by adding an exposure and a complementary exercise, not by stacking sets on one lift (Q1, Q2, Q4). RP's "priority" landmarks sit at 16 to 24 MAV and 24 to 32+ MRV for chest, calves, abs and traps, 20 to 26 and 26 to 35 for biceps, 24 to 30 and 30 to 40+ for side delts, glutes and rear delts (Q3 table) [D].
* **Put its work first in the session** (Q7) and give it the longest recovery gaps in the rotation (Q6).
* **Keep the others at or above maintenance, 4 to 6 fractional sets** (Bickel 2011 [B]: one-third or one-ninth of training volume preserved young adults' hypertrophy for 32 weeks; Iversen 2021 [D, narrative]: minimum 4 weekly sets per muscle; Spiering 2021 [D]: 1 set per exercise once a week if the load is kept). Muscles do not compete for growth in the trial that tested it (adding leg work did not reduce arm growth, 105 untrained people, 6 weeks of low-load work to failure, Kataoka 2026 [B]), so prioritising one muscle does not require starving the rest, only fitting the time, per-session ceilings and recovery.
* **Ramp, do not jump:** the tested step is +2 to +3 weekly sets per week (Enes 2024); the engine's one-pass bonus that closes 70% of the gap to MRV (`planEngine.js:218`, for back from 10 to 21) is a larger first step than anything tested [INF].
* **Specialisation phases:** no controlled trial of a specialisation phase was found in PubMed or web searches (search terms as typed: "specialization hypertrophy program prioritization", "high volume specialization block", "muscle group prioritization"). The rule above is assembled from dose-response (A), order (A) and maintenance (B) evidence, not from a specialisation trial [INF].
* **Limits:** per-session ceiling (about 8 direct sets), time (Schoenfeld 2019: 68-minute sessions at 5 sets per exercise), recovery spacing, joint tolerance; two or three priority muscles at once is a time and recovery question, not a proven interference.

**Still uncertain.** Any evidence on how long a specialisation block should last and what happens to maintained muscles over many months; the repo caps weak points at three muscles (`ProGoalSetupScreen`), a UX choice. Role-based targets, per-session limits for a focus muscle and the Recovery-screen demonstration are in Q8b.

---

### Q8b. Focus plans: bands, caps, and what the Recovery screen can demonstrate (founder addendum, 2026-10-04)

The founder's case: 27 weekly biceps sets, "upper tier", and a screen that suggested overtraining; he wants recovery to show that the muscle was selected to be brought up and that the volume is within that. The evidence for the bands and the biceps reading is in Q3b; this section turns it into plan roles, caps, recovery numbers and screen fields.

**Best current answer.**

* **A focus is a plan role with its own target, per-session cap and wording, and the screen should read the role, not only the number.** The evidence bands (Q3b) are the same for every muscle; what changes with role is what the plan intended, and so what an honest sentence can say. Roles: focus (the person picked the muscle to bring up), raised (a check-in added sets, F12; worded like a focus while its target sits above the normal range and says why), standard, maintenance.
* **Numbers (fractional sets per week, tracker units; grades from Q3b):**

| Role | Plan target | Band the screen may call "within range" | Per-session limit (direct / fractional) | Basis |
|---|---|---|---|---|
| Maintenance | 4 (2 to 6) | 2 to 6 | 8 / 11 | B/D (Bickel 2011; Spiering 2021; RP) |
| Standard | 10 to 16 (up to 20) | 10 to 20 | 8 / 11 | A (Pelland tiers 5 to 10 and 11 to 18; Baz-Valle 2022) |
| Focus or raised | 20 to 24, ramp to it | 20 to 30; 30 to 42 is "top of the studied range" | 10 / 12 [CONV, top of RP's 8 to 12] | A (Pelland tier 19 to 29 and 30 to 42); target is CONV |

  A weekly total of 27 on a focus muscle is inside the focus range even though it sits above the plan's own default target (20 to 24); the screen states both ("your plan targets 20 to 24; this week 27"), which is a description of the plan and the log, not a judgement.
* **Is 27 weekly biceps sets a defensible focus? Yes, counted the way the tracker counts (Q3b).** As a tracker total it is band (c); as 27 direct sets plus about 7 indirect it is 34, band (c+), still below the 43 where the data thin out; nothing I found shows harm, and the direct-biceps trial that tested 27 direct sets (Heaselgrave 2019, 49 resistance-experienced men, 6 weeks) found no significant difference from 9 or 18 sets (+5.4% against +4.3% and +9.5%). What the same evidence does not support is the shape: 27 sets in one session, or 13.5 in each of two (past the per-session ceiling, Q2).
* **Splitting the weekly focus volume across sessions is the lever that keeps each session's recovery clock short** (clock grows with the square root of the session's sets, F5). Biceps at the repo centre of 48 h:

| Plan for 27 to 28 weekly fractional sets | Sets per session | Estimated recovery at 2 reps in reserve (range) | at 3 reps in reserve | Inside the focus per-session limit (12)? |
|---|---|---|---|---|
| 4 sessions of 7 | 7 | 52 h (39 to 65) | 42 h | yes |
| 3 sessions of 9 | 9 | 59 h (44 to 73) | 47 h | yes |
| 2 sessions of 13.5 | 13.5 | 72 h (54 to 90) | 58 h | no |
| 1 session of 27 | 27 | 72 h or more: the model caps the dose factor at 1.5 (unclamped 102 h) | 58 h or more (unclamped 82 h) | no |

  I reproduced the repo's residual and percent arithmetic for these plans (scratch simulation of `muscleRecoveryModel.js:107-140, 188-194`, F5 clocks; Appendix B). Three sessions of 9 spaced evenly (56 h apart) read about 96% recovered before the next session at 2 reps in reserve ("ready", 90% or more), 88% at 1 and 81% at 0 ("nearly", 75% or more), and 100% at 3. At the typical-week gaps of 48, 48 and 72 h the two 48 h gaps read 82% and 85% at 2 reps in reserve ("nearly") and 100% at 3. So the model will often say "nearly" rather than "ready" before a focus muscle's next session when sessions are close; that is a statement about spacing under an unvalidated clock (Q5), not a warning, and shorter gaps between sessions did not impair growth in the frequency trials at equal weekly volume (Zaroni 2019, Schoenfeld 2015, Ochi 2018). Two sessions of 13.5 at 84 h gaps read ready at every effort except 0 reps in reserve (94%): recovery between sessions does not separate that plan from 3 x 9, the per-session ceiling (Q2) does. Above 13.5 sets in a session the model's dose factor is clamped, so its hours are a minimum, and the screen should say the session is larger than the estimate covers.
* **Ramp to a focus target:** the tested step is +2 to +3 sets a week (Enes 2024); from 12 to 22 weekly sets that is five weeks. The repo's block ramp tops out at 1.25 times the starting volume (`mesocycle.js:42-47`), so a focus target of 20 to 24 from a starting volume of 12 to 16 needs a larger step than that ramp gives, but one that is within the tested rate (INF).

**What the Recovery screen can demonstrate for a muscle (F16 gives the exact fields).** Each field is a fact from the plan or the log, or a labelled estimate; none instructs.

| Field | Source | Example for the founder's case (illustrative numbers) |
|---|---|---|
| Role | plan | "Focus: you picked biceps to bring up." |
| This week | log (or plan) | "27 sets counted: 20 direct and 14 rows and pulldowns at half credit." (20 + 14 x 0.5) |
| Band | F16, Q3b table | "Within your focus range for biceps (20 to 30). Studies have found small extra gains at weekly totals like this." |
| Plan target | plan | "Your plan targets 20 to 24 a week." (shown when the total is above it) |
| Per session | log | "Most in one session: 9 sets (limit for a focus muscle: 12)." |
| Spacing | log, F7 | "Sessions were 56 to 72 hours apart." |
| Recovery | F5, F6 | "Estimated recovery after the last session: about 59 hours (range 44 to 73); 60 hours have passed. Estimated, not measured." |
| Status | F6 | ready (90% or more), nearly (75% or more), still recovering; the role never changes T or the status (no evidence that a focus needs a different clock) |

**What the screen must not do:** show a warning state, a "too much" label or an "overtrained" claim for a muscle whose weekly total is in bands (a) to (c+) or whose sessions are inside the per-session limit; claim a cause for how a person feels; imply injury risk from volume (none found). For a muscle that is not a focus and sits in (c), the honest sentence is "Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan." (Q3b wording table).

**Still uncertain.** How long a 20 to 30 set focus block stays productive (6 to 12 weeks tested); muscle-specific tolerance above 20 (triceps responded to more than 20, quads and biceps did not differ between 12 to 20 and more than 20 in trained men, Baz-Valle 2022); whether the per-session limit for a focus muscle should be 12 or 10 fractional (STOP item 1).

---

## Q9. Progression of volume across a block, and where added sets should go

**Best current answer.**

* **Adding sets week to week is tested and not harmful in the ranges used.** Enes 2024 (31 resistance-trained men, 5.1 y, lower limb twice a week, 12 weeks): adding 4 or 6 sets every 2 weeks (+2 or +3 a week) gave greater squat strength than constant volume (6-set > 4-set > constant); thickness and area did not differ significantly (p = 0.067 and 0.076) but the intervals suggested a dose-response that plateaus at the higher volumes [B]. Step size defensible: +1 to +3 weekly sets per muscle per week, at most one step per week, to the block's target; the engine's ramp (1.00, 1.07, 1.14, 1.20, 1.25 of weekly sets across the build weeks, then 0.50, `mesocycle.js:42-47`) is about +6% a week, below the tested range [INF].
* **Individualising volume is plausible but thinly tested.** Scarpelli 2022 (16 trained participants, within-subject, 8 weeks): a leg trained at 1.2 times the lifter's own logged weekly sets grew vastus lateralis 1.08 cm2 more than the leg trained at a fixed 22 sets (p = 0.042; effect size 0.75), and more people exceeded the typical measurement error [B]. In 34 untrained people, 13 showed a clear hypertrophy benefit and 16 a clear strength benefit from 3 sets per exercise over 1 (Hammarström 2020 [B]); benefit tracked early ribosome biogenesis (total RNA).
* **Load progression matters, not just sets:** progressive overload doubled arm thickness gain against holding load and reps constant (+22.9% vs +11.6%, 55 untrained young women, within-arm, Kassiano 2026 [B]).
* **Deloads:** a one-week complete break at the midpoint of a 9-week high-volume programme in 39 resistance-trained people did not change lower-body hypertrophy and slightly reduced strength gains (Coleman 2024 [B]); cutting volume and frequency in weeks 4 and 8 changed nothing in 19 untrained men (Pancar 2026 [B]); a Delphi panel of 34 coaches proposed design principles (Bell 2023 [D]). Scheduled deloads are not needed for hypertrophy over these horizons; a reactive recovery week is a comfort and fatigue decision, not an evidence-based growth lever.
* **Where added sets should go (rule in F12):** (1) to sessions with headroom under the per-session cap, preferring the exposure with the longest gap before it is trained again; (2) inside a session, to exercises below their per-exercise cap, role priority first; (3) a new standard exercise only when no existing exercise has headroom and the session has room for the floor (2 to 3 sets); (4) a new exposure only when no session has headroom and spacing allows (Q6); (5) otherwise hold the target at the achievable total and say so.

**Still uncertain.** Whether a 12-week or longer ramp beyond the tested steps helps; hypertrophy differences between ramps were not significant; individualised-volume and responder data come from small trials, many untrained.

---

## Q10. Deloads and readiness signals already in the model; where Q1 to Q9 disagree with the repo docs

Verdicts: **CONSISTENT** (evidence agrees), **PARTLY** (right direction or number, basis or size off), **CONTRADICTED** (evidence points the other way or the size is clearly off), **CONVENTION** (no evidence either way; label it so), **SUPERSEDED/STALE** (newer evidence or a newer repo value). File:line are from my own reads of this branch; "(read)" means I read the lines, not just grepped them.

| # | Repo statement (file:line) | What the evidence says | Verdict |
|---|---|---|---|
| 1 | Base recovery hours: quads, hamstrings, glutes 72; back, chest 60; arms and delts 48; small muscles 36 (`recovery/constants.js:68-94`, read) | No hours-per-muscle table exists. Lower body to failure at 10 sets: "at least 48 h", 72 h for perceptual recovery (Goulart). Per unit of eccentric work arms are at least as susceptible as legs (Chen, Jamurtas); velocity loss is larger in the upper limbs (Vieira). RP (D): small muscles 1 to 2 days, large "3 to 5" (18 Mar 2025). The ordering legs longer than arms has no equal-dose support. Per-muscle ranges and grades: Q5b Table 3 | CONVENTION (D prior, keep with a plus or minus 25% band) |
| 2 | Dose factor sqrt(sets / 6), clamp 0.7 to 1.5, reference 6 sets (`constants.js:103-107, 242-246`, read) | Direction supported (Bartolomei: 8 x 10 hurt more and longer than 8 x 3); shape unknown | CONVENTION |
| 3 | Intensity factor: RIR 0 or 1 = 1.15, RIR 2 = 1.0, RIR 3 or more = 0.90 (`constants.js:258-268`, read) | Failure vs not: biomechanical SMD -0.96, damage SMD 0.76 (Vieira); "recovery from the 3 x 5 and 6 x 5 protocols was significantly faster between 24 and 48 h" than failure (Morán-Navarro). A 10 to 15% spread is much narrower than a 24 to 48 h gap on a 48 to 72 h clock | CONTRADICTED in size (see F5: 1.25 / 1.10 / 1.0 / 0.80) |
| 4 | First-week factor 1.10 "for week 1 of a block or the first week after a recovery week", citing Damas 2016 (`constants.js:113`, `00-SPEC.md:169-170`) | Damas 2016 followed 10 young men through their first 10 weeks of training; damage fell by week 3. For trained lifters repeating familiar exercises the protection already exists; it lasts weeks to months (Nosaka 1991; McHugh 2003). The supportable effect is NOVELTY (a new exercise or range, or a layoff of several weeks), not "week 1 of a block" | PARTLY (re-key to novelty, F5) |
| 5 | Ratings may lengthen a session's recovery, never shorten it (`constants.js:115-126`, read) | Subjective and objective recovery dissociate (Ferreira) and the relationship is individual (Tolusso) | CONSISTENT (conservative) |
| 6 | Linear decay to zero at T; overlapping windows compound (`muscleRecoveryModel.js:12-38, 120-140`, read) | No validated curve shape; "evidence for fatigue accumulation... is equivocal" (Kataoka 2022). Fitness-fatigue shapes predict individuals poorly (Hellard, Busso) | CONVENTION (keep, show a band) |
| 7 | Goulart 2021 reading: volume load down at 24 h, first-set volume down at 48 h, jump and isometric strength at or above baseline at 72 h; used as the lower-body base (`constants.js:22-25, 69`) | The reading matches the abstract. The dose was 10 failure sets across two lifts, yet 72 h is then the base for a 6-set, 2-reps-in-reserve session (`constants.js:63-67`) and the dose and effort factors scale it up again: the model predicts about 107 h for the Goulart dose against 48 to 72 h measured (Q5b Table 2) | PARTLY (reading right; base scaled twice, errs long) |
| 8 | Ferreira 2017: "perceived fitness recovered at 72 h while torque and soreness took 96 h" (`constants.js:30-36`) | Abstract: DOMS lasted 72 h; peak torque back at 96 h; total work not back at 96 h. The perceived-fitness result is not in the abstract; "soreness took 96 h" does not match "DOMS lasted 72 h" | UNVERIFIED (full text not opened) |
| 9 | Soares 2015 reading: torque 8.4% down at 24 h after single-joint, baseline after multi-joint (`constants.js:37-40`) | Matches | CONSISTENT |
| 10 | Performance sensitivity 4 to 15% between fully fatigued and fully recovered (`constants.js:176-187`) | Immediate losses in the cited studies were larger (peak torque -15 to -27%, total work -25%); losses at 24 to 48 h are smaller (first-set volume load ES -0.63 at 48 h). 4 to 15% is plausible as a residual, but it is an assumption | CONVENTION |
| 11 | "8 sets/muscle/session is the productive ceiling (Brigatto/Nippard)" (`planEngine.js:2011-2013`, read) | The number agrees with Remmert's 8.2 direct sets (preprint) and RP's 8 to 12. The cited basis does not: Brigatto 2019 found 16 sets in one session no different from 8 + 8 (n = 20), and Nippard is a practitioner | PARTLY (number right, basis wrong) |
| 12 | Weak-point session cap 12 (`planEngine.js:2020`) | Above the 8.2 direct / 11 fractional point (Remmert) and at the top of RP's 8 to 12. Not harmful per se, but past the knee of the curve | PARTLY |
| 13 | Per-exercise caps 4 (compound) and 3 (isolation); floor 3 (`planEngine.js:1445-1447`, read) | Convention consistent with Krieger 2010 and within-session fatigue; no trial of a 3-to-4-set ceiling. A floor of 2 would also be supportable | CONVENTION |
| 14 | Synergist credit 0.5 (`planEngine.js:337`; tracker `allocateExerciseVolume`) | Best-supported counting method (Pelland A); direct comparisons agree (Mannarino, Soares, Brandão). Muscle-specific: gluteus maximus grew 15.4% in a deep leg press (Kinoshita) | CONSISTENT (default, not a law) |
| 15 | Landmark table and wording: MAV "productive sweet spot", MRV "hard ceiling before accumulated fatigue impairs recovery" (`algorithms.js:15-59`, read) | MRV has no empirical determination (no plateau up to 42 fractional sets, Pelland); values differ from RP's current guides (Q3 table: hamstrings 4/6/14/20 vs 0-2/2-4/2-8/8-14; quads MRV 20 vs 14-18; MEV 8 vs 4-6); the repo counts synergists at 0.5 while RP's ranges are direct-leaning, so the comparison mixes two systems (the tracker comment, `algorithms.js:28-35`, documents the arm, delt and trap landmarks as totals; the biceps and triceps values still sit inside RP's direct-set ranges); the first research brief (`docs/VOLYUME_RESEARCH_BRIEF.md`) still shows the older table (chest 6/14/20, quads 8/14/20) | SUPERSEDED/STALE; wording CONVENTION |
| 16 | Weak-point bonus closes 70% of the gap to MRV in one pass (`planEngine.js:206-222`, read) | Largest tested step is +2 to +3 weekly sets a week (Enes); individualised volume 1.2 x logged beat a fixed 22 (Scarpelli) | PARTLY (aggressive first step) |
| 17 | Systemic ceiling 0.40 (0.34 at 3 days) x sum of MRVs (`planEngine.js:244-272`, read) | No evidence for a systemic set budget; muscles do not compete for growth in the one trial (Kataoka 2026); time and recovery are real limits | CONVENTION |
| 18 | Recovery answer scales MEV and MRV (poor 1.10 / 0.80, good 0.95 / 1.15); age scales MRV (0.92, 0.85, 0.75) (`planEngine.js:99-127`, read) | Age did not change responses (Ahtiainen 2016, 287 untrained, 19 to 78 y) or recovery (Gordon 2017; Trivisonno 2021), except Fernandes 2019 (middle-aged worse); older adults need a higher maintenance dose (Bickel 2011). No evidence maps a 3-level self-rating to MRV | CONVENTION; age factor weakly supported |
| 19 | Sequencer: recovery-pair term circular but typical-week gaps only; adjacency linear, "never the wrap pair"; qualifying = 2 or more primary sets (`sequenceSessions.js:149, 334-345`, read) | Fixed rotation, free days: wrap and back-to-back must be scored (Q6, F7). Non-local "systemic" overlap is not a general effect (Behm); shared-muscle overlap is local | PARTLY |
| 20 | Block ramp 1.00, 1.07, 1.14, 1.20, 1.25 then 0.50 recovery week (`mesocycle.js:42-47`, read) | Ramp below tested steps (Enes). A 50% week is evidence-neutral for hypertrophy (Coleman: a full week off changed nothing for size and trimmed strength; Pancar: reduced weeks changed nothing) | CONSISTENT |
| 21 | "Each major muscle at least twice a week beats once" (`00-SPEC.md:119-123`, citing Schoenfeld 2016) | Superseded by Schoenfeld 2019 SR (25 studies: no volume-equated difference) and Pelland 2026 (negligible, probability above zero 91%) | SUPERSEDED |
| 22 | Personal learner: one factor per person, bounds 0.75 to 1.40, gates (`14-PERSONAL-LEARNING-V2.md`; `constants.js:149-232`) | Its own calibration is the honest part: in 12 weeks it found 123 of 600 slow and 11 of 600 fast recoverers on varied schedules and none on fixed schedules or inside plans. Between-person differences are real (Damas 2019) and partly noise (Atkinson, Hecksteden); bounds are conventions | CONSISTENT (reach is small, say so) |
| 23 | Division register: exercise choice changes regional growth (`DIVISION-EVIDENCE-REGISTER.md` section 2) | I re-opened Zabaleta-Korta 2021, Kassiano 2026 and Kassiano 2022: all three say what the register says. Newer trials (Kinoshita 2026, Maeo 2021 to 2024, Kassiano 2023) extend the same logic to triceps, hamstrings, calves, biceps | CONSISTENT (extendable, Q12) |
| 24 | `RESEARCH_FINDINGS_SYNTHESISED.md` | Nutrition and safety only; no training-volume or recovery claims. Its tier and price decisions are superseded by D137 (not a science matter) | n/a |
| 25 | `plan-B-weak-point-sets.md`: founder's "3 to 4 sets per exercise" | Built as D8 (caps 4/3). Science: convention, not threshold (Q1) | CONVENTION |
| 26 | Soares 2015 cited for "arms carry their own baseline; per-muscle baselines differ" (`constants.js:37-40`) | Soares compared a curl and a row on the same muscle (elbow flexors): an exercise-role effect (prime mover vs synergist), not a difference between muscles. No study compares biceps with lats or upper back; measured comparisons between other muscles disagree in direction (Q5b Table 1) | PARTLY (basis does not show a muscle difference; the per-muscle ordering is D) |
| 27 | Volume status labels: above a muscle's MRV the label is "Too much"; the landmarks are documented as totals including 0.5 indirect credit (`algorithms.js:28-35`) yet the biceps MRV of 22 is inside RP's direct-set MRV range of 20 to 26; no input for the plan's role for the muscle (`algorithms.js:25-59, 391-418`, `coachGlossary.js:42, 47`; generator override biceps MRV 20, `planEngine.js:312`) | A focus muscle at 27 tracker sets is inside Pelland's 19 to 29 tier and RP's biceps priority band (direct 20 to 26 MAV, 26 to 35 MRV); no study shows harm; "overtraining" is a clinical state a set count cannot diagnose (Meeusen 2013). D219 asks every judging surface to read the same bands and the plan's own intent (Q3b, F16) | CONTRADICTED for focus muscles (the label reads as a fault); CONVENTION otherwise |
| 28 | Status thresholds: "ready" at 90% recovered, "nearly" at 75% (`constants.js:139-141`) | Under linear decay these are 0.9 T and 0.75 T; they sit inside a plus or minus 25% band. No evidence fixes them | CONVENTION |

**Readiness signals and deloads already in the app.** (a) `FEEDBACK_FACTOR` and the rating EMAs: reasonable, lengthen-only. (b) `shouldDeload` triggers (soreness above 3.5 for 3 or more weeks, energy below 3.0 for 2, performance declining, fatigue): no validated resistance-training deload trigger was found; thresholds are D. (c) The recovery-week multiplier 0.5: evidence-neutral for hypertrophy. (d) The recovery label "recovered" at 90% (`constants.js:139-141`): a function-recovery estimate, not an adaptation gate (Q4, Q6).

---

## Q11. Individual differences, and what a learned recovery rate may legitimately change

### 11a. How large are between-person differences?

| Quantity | Number | Source | Grade |
|---|---|---|---|
| Hypertrophy response, untrained, 12 weeks of elbow-flexor training | Size change from -2% to +59%; strength 0 to +250%; coefficient of variation about 0.5 for size (n = 585) | Hubal 2005 | B |
| High and low responders, untrained, 19 to 78 y | Size +4.8 +/- 6.1% (range -11 to +30); 14% high responders (more than 1 SD above the group mean) and 29% low responders (below the upper 95% limit of the non-training controls) for size; age and sex did not affect response (n = 287, 72 controls) | Ahtiainen 2016 | B |
| Stability of the response within a person, resistance-trained men | Between-subject variability 37.8% vs between-leg 0.9% for area (about 40 times); all 20 men responded to every protocol; extrinsic manipulation of load, volume and rest changed nothing, "intrinsic individual factors are key" | Damas 2019 | B |
| Volume response, untrained, 3 sets vs 1 set per exercise, contralateral | Mean +5.2% vs +3.7% area; 13 of 34 clear hypertrophy benefit, 16 of 34 clear strength benefit; linked to early ribosome biogenesis | Hammarström 2020 | B |
| Damage susceptibility, unaccustomed maximal eccentrics, n = 286 young men | Strength fell to 82%, 61%, 42% of baseline in the low, moderate and high clusters (61, 152, 73 men) | Damas 2016 (IJSM) | B (untrained, extreme dose) |
| Perceived vs actual recovery | Strong within-person correlation with jump and velocity (r = 0.84, 0.80); equal scores in two people "are not indicative of similar recovery" | Tolusso 2022 | B (n = 11) |
| How much is noise | Within-subject random variation is "sometimes so substantial that it explains all apparent individual response differences"; true individual response differences exist only if the SD of change in the intervention arm exceeds that of a comparator arm; measurement error limits individual-level estimates | Atkinson 2015, Hecksteden 2015, Swinton 2018 | A/D (methods reviews) |
| Mechanisms of high vs low response | Ribosome biogenesis, satellite cells, androgen-receptor content; single gene variants explain little | Roberts 2018 | D (perspective) |

No study I opened gives the distribution of recovery TIME in trained lifters after ordinary sessions. The repo's person-factor range (0.75 to 1.40, `constants.js:170-174`) is therefore a convention; it is conservative relative to the three-fold spread in damage susceptibility.

**Repeated-bout effect, age, training status.** The repeated-bout effect shortens and softens recovery after familiar work and persists for weeks to months (Nosaka 1991; McHugh 2003; Hyldahl 2017); it is exercise-specific, so it is lost for a new exercise or range [C/D, INF on specificity]. Age to about 50 years showed no consistent recovery effect (Q5 table); older adults need a higher dose to maintain hypertrophy (Bickel 2011). Training status did not moderate acute fatigue after failure (Vieira 2022 A).

### 11b. What a learned personal recovery rate may change in a plan

The learner estimates ONE quantity: how much shorter or longer than the first estimate this person's performance needs after a session (`personalRecovery.js`, `14-PERSONAL-LEARNING-V2.md`). It should change only what that quantity governs.

| Plan element | May the learned factor change it? | By how much | Why (evidence) |
|---|---|---|---|
| Recovery clock T (hours) in the rotation score and the readiness estimate | Yes | Scale T by the learned factor, bounded 0.75 to 1.40 [CONV] | It is exactly what was learned; changes the ordering and the spacing statements |
| Session order and grouping | Yes, indirectly through T, at plan (re)build only | At most one session slot of spacing for a muscle (T/24 spans 1.5 to 4 slots; a factor of 0.75 to 1.4 moves a boundary by about 1 slot) [INF] | Spacing is the free variable (Q4, Q6) |
| Per-session cap C (direct sets) | Yes, for slower recoverers only | C = 8 x min(1, 1 / factor), floor 6 [CONV] | Per-session ceiling is a fatigue limit (Q2); frequency is hypertrophy-neutral, so shifting sets to another exposure costs nothing (Schoenfeld 2019, Pelland) |
| Weekly volume | NO, not from recovery speed | none | Volume response is a different trait (Hammarström: responders identified by outcome); personalise volume from logged volume and performance (Scarpelli 1.2 x logged), not from recovery speed |
| Frequency | Only as a consequence of C | via k = ceil(W / C) | Frequency itself has no independent effect |
| Exercise selection | No | none | Selection is by role and region (Q12) |
| Deload or recovery-week timing | No | none | No evidence (Coleman 2024); the existing reactive rules stay |
| Anything calorie, weight, food or notification related | Never | none | ED-safety lane, out of bounds |

### 11c. Safeguards (what to require before any change, and how to undo it)

1. **Evidence gate before any change:** the repo's existing gate (at least 8 comparable pairs, enough spread, likelihood-ratio statistic of at least 10 from its simulation) stays; add: at least 12 weeks of history and at least 3 distinct muscles contributing [CONV].
2. **Bounds:** factor 0.75 to 1.40; the plan never uses a clock below 24 h or above 168 h, the repo's own clamp (`constants.js:129-130`) [CONV].
3. **Hysteresis:** act on a change in the factor only if it moves by at least 0.10 from the value the current plan was built on; otherwise keep the structure [CONV]. Exercise rotation that is too frequent may hinder gains (Kassiano 2022), so plan structure should move at block boundaries or on regeneration, not mid-block.
4. **Reverting:** if the next evaluation fails the gate, or the factor returns within 0.05 of the starting value, the next build uses the starting value; nothing is carried silently [CONV].
5. **Exclusions:** the learner's own (recovery weeks, injury limits and return periods, assisted and timed lifts, drop sets, lifts logged exactly as prescribed).
6. **Never** use the learned factor to change weekly volume, calorie or weight targets, or ED-safety behaviour.

### 11d. What can honestly be said to a user

Allowed (describes the measurement and the plan; no instruction, no label):

* "Your lifts held up after shorter breaks than the first estimate assumed. Based on 11 comparisons of the same exercise on the same day of the week."
* "Recovery is now estimated at about 15% less time than the first estimate. Leg sessions in this plan sit 3 sessions apart, which is about 71 hours or more even if you train on consecutive days."
* "Learned from your logged lifts only. It is not a measurement of your muscles, and it can change as you log more."
* When the learner has not moved: "Not learning yet: too few comparisons of the same lift." (its calibration says this will be most people inside a plan: 123 of 600 slow and 11 of 600 fast recoverers found in 12 weeks, none on fixed schedules or plans)

Not defensible: "you recover faster than most people" (no population comparison was made); "you are a high responder" (responder labels are mostly noise unless repeated, Atkinson); "your chest will be recovered tomorrow" (a prediction, not a measurement); anything telling a person to train more or less (D204); any claim about hypertrophy from recovery speed.

**Still uncertain.** The size of true between-person differences in recovery time among trained lifters; whether performance-based inference separates recovery from motivation, sleep and progression (the learner's own simulations say it separates them only weakly); whether the 0.75 to 1.40 range is too wide or too narrow.

---

## Q12. Standard exercises per muscle: which have the best evidence, and which pairs cover a muscle best

Standard = recognisable by name to an ordinary gym-goer and present in almost every gym (barbell, dumbbell, cable, common machines, bodyweight). Machine vs free weight did not matter in trained men for strength or size of the quadriceps, pectoralis major and rectus abdominis (Hernández-Belmonte 2023 [B], 38 resistance-trained men, 8 weeks), so equipment variants are interchangeable unless noted.

**Length and range of motion, in one paragraph.** Several single trials show more growth when a muscle is trained at long length (triceps, hamstrings, gastrocnemius, biceps distal region, rectus femoris) but the meta-analysis of regional effects found trivial average differences (Varovic 2025 [A], 12 studies: standardised differences 0.05 to 0.09, ratio 0.57 to 1.88%, with a small difference in mean length between conditions), the systematic review found full or initial-range work beat final-range partials for several muscles (Kassiano 2023 [A], 11 studies) and full range beat partial range for the lower body (Schoenfeld and Grgic 2020 [A], 6 studies), and a 2025 review concludes longer-length training "may be superior... though evidence is mixed" (Wolf 2026 [A], 8 studies). Practical rule: among standard exercises prefer the lengthened-position variant as a tie-breaker, accept the extra recovery cost (Q5), and do not treat it as a law.

| Muscle | Standard exercise and evidence | Grade |
|---|---|---|
| **Chest** | Bench press (barbell, dumbbell or machine): 10 weeks of bench press raised pectoralis major, pectoralis minor, anterior deltoid and triceps area in healthy men, not the medial deltoid (Lanza 2024 [B]). Incline press: in 47 untrained men, 8 weeks, once a week, incline gave the largest gain at the second intercostal space (upper chest) vs flat (+0.62 cm) and vs the combined group (+0.50 cm), with similar strength (Chaves 2020 [B, untrained]). Fly or pec deck: no hypertrophy trial found | B (untrained for incline), fly D |
| **Back (lats, upper back)** | Lat pulldown or pull-up (vertical) and seated cable row, barbell or dumbbell row (horizontal): **no trial of back hypertrophy by exercise was found** (PubMed and web searches for pulldown, pull-up and row comparisons returned only electromyography work). Roles come from muscle action and the physique criteria (division register, Figure: "back depth, and width") [D]. Rows give the biceps about half the credit of a curl (Mannarino) | C/D |
| **Front delts** | Direct work is rarely needed: bench press grew the anterior deltoid (Lanza); RP: no more than one exercise, low direct need with normal chest training [D]. Overhead press if wanted (no trial) | B (indirect), D (direct) |
| **Side delts** | Lateral raise: dumbbell and cable versions grew the lateral deltoid equally in 24 resistance-trained people, 8 weeks, within-participant (+3.3 to +4.6%; Larsen 2025 [B]) | B |
| **Rear delts** | Reverse pec deck or reverse fly, face pull: **no hypertrophy trial found**; rows credit 0.5. Choose by availability | D |
| **Traps** | Shrug, rows and deadlift variants: **no hypertrophy trial found** | D |
| **Biceps** | Preacher curl (barbell, EZ-bar, dumbbell, cable or machine): preacher curls grew the distal region while incline curls grew no region in 38 recreationally trained women, 9 weeks, 4 x 12 to failure (Zabaleta-Korta 2023 [B]); training the extended-elbow part of a preacher curl grew the distal biceps more than the flexed part in 19 young women (Pedrosa 2023 [B]); cable vs barbell preacher gave +7% vs +8% (Nunes 2020 [B]); preacher vs Bayesian cable curl similar (Attarieh 2025 [B], 15 young men). Curl vs row: curl 11.06% vs row 5.16% elbow-flexor thickness (Mannarino 2021 [B], untrained, n = 10) | B |
| **Triceps** | Overhead triceps extension (cable, dumbbell or EZ-bar): +19.9% vs +13.9% whole triceps and +28.5% vs +19.6% long head vs neutral-arm extension in 21 adults, 12 weeks, 5 sets, twice a week (Maeo 2023 [B]). Pushdown is the standard neutral-arm option. Bench press alone did not significantly raise triceps area (Brandão 2020 [B]) | B |
| **Quads** | Squat or leg press with deep range, plus leg extension: leg extension grew the rectus femoris far more than leg press (+13.2% vs +1.1%) while the vasti and whole quadriceps were comparable (Kinoshita 2026 [B], 17 untrained, 12 weeks); the same split in 63 untrained women: extension rectus femoris +11.4/+12.3/+17.5%, squat distal vastus lateralis +18.2% vs +11.2% (Kassiano 2026 [B]); deep squat beat shallow squat for front-thigh area by 4 to 7% (Bloomquist 2013 [B], 17 men, 12 weeks); full vs half squat: knee extensors similar (+4.9% vs +4.6%) (Kubo 2019 [B]); leg extension trained only in the lengthened part of the range (100 to 65 degrees of knee flexion) raised rectus femoris and vastus lateralis areas more at the 50 to 70% sites of femur length than full-range, final-range or no training in 45 untrained women (Pedrosa 2022 [B]) | B |
| **Hamstrings** | Seated leg curl: +14% vs +9% whole hamstrings vs prone leg curl (biarticular muscles +8 to 24% vs +4 to 19%; monoarticular similar) in 20 adults, 12 weeks, 5 sets, twice a week (Maeo 2021 [B]); a lengthened-state hip-flexed weight-stack curl beat Nordic curls for hamstrings (+18% vs +11%) and biceps femoris long head (+19% vs +5%), while Nordics grew the non-hip-extending knee flexors more (Maeo 2024 [B], 42 young men); stiff-leg deadlift grew whole hamstrings +7.0%, selectively semimembranosus (Morin 2025 [B], untrained). Pair: seated leg curl plus Romanian or stiff-leg deadlift (knee flexion at length plus hip extension) | B |
| **Glutes** | Deep squat or leg press: leg press grew gluteus maximus +15.4% and adductor magnus +6.2% (Kinoshita 2026 [B]); full squat +6.7% vs half squat +2.2% (Kubo 2019 [B]). Hip thrust: gluteal area similar to back squat in volume-equated 9 weeks, squat larger for quads (+3.6 cm2) and adductors (+2.5 cm2) (Plotkin 2023 [B], 34 untrained) | B (untrained) |
| **Calves** | Standing calf raise: gastrocnemius +12.4% lateral and +9.2% medial vs +1.7% and +0.6% seated, soleus similar (+2.1% vs +2.9%) in 14 untrained adults, 12 weeks (Kinoshita 2023 [B]); the lengthened part of the range grew the medial gastrocnemius most (+15.2% vs +6.7% full vs +3.4% final) in 42 young women (Kassiano 2023 [B]); 12 weekly sets beat 6 for lateral gastrocnemius, soleus and the sum (Kassiano 2024 [B], 61 untrained women). Seated calf raise adds little for the gastrocnemius; soleus emphasis is by theory (knee flexed) | B |
| **Abs** | Cable or machine crunch, hanging leg raise: **no hypertrophy trial of abdominal exercises found**; in a 15-person acute ultrasound study the crunch thickened the upper rectus abdominis and the leg raise the lower segment (Gomirato 2023, **acute only** [C]); rectus abdominis area rose after 8 weeks of compound lifts in trained men (Hernández-Belmonte 2023 [B]), so squats and presses already load it | C/D (B indirect) |
| **Adductors** | Deep squat or leg press: adductor volume +6.2% vs +2.7% (full vs half squat, Kubo 2019 [B]); +6.2% with leg press (Kinoshita 2026 [B]); squat > hip thrust by +2.5 cm2 (Plotkin 2023 [B]). Hip adduction machine: no trial found | B (indirect), D (direct) |
| **Forearms, neck, tibialis** | Wrist curl, neck machine, tibialis raise: **no hypertrophy trial found** (grip is loaded by rows, pulldowns and deadlifts) | D |

**Pairs that cover a muscle best, from standard exercises (F13 uses this):** chest = flat press + incline press; back = pulldown or pull-up + row; side delts = lateral raise (one variant is enough); biceps = preacher curl + standing curl; triceps = overhead extension + pushdown; quads = squat or leg press + leg extension; hamstrings = seated leg curl + Romanian deadlift; glutes = deep squat or leg press + hip thrust; calves = standing calf raise (full stretch) + seated calf raise; abs = crunch + leg raise; adductors = squat or leg press at depth + hip adduction.

**Still uncertain.** Most of the growth trials are 8 to 12 weeks, many untrained or in women only; regional "better" is a statement about where the muscle grows, not that total muscle is larger; no data for several muscles. Lengthened-position benefits are strongest in single trials and weakest in the pooled estimate.

---

## Formulas the evidence supports

All rules are deterministic arithmetic on stored plan and log data (no randomness, no I/O). Each carries the question it comes from, a grade for the evidence under it, and a basis tag: **[E]** the value comes from evidence, **[CONV]** a defensible convention (the evidence does not fix it; the number is chosen to be conservative and traceable), **[INF]** derived by me from verified numbers. Notation: m = muscle; D = direct hard sets of m in a session; I = indirect credit (0.5 per synergist set); F = D + I (fractional sets); W = weekly fractional sets; N = sessions in the rotation (2 to 6).

### F0. Counting rule (Q2)

* A set counts as a working set when it ends within about 3 reps of failure. Users' reps-in-reserve estimates are accurate to about +/-0.65 reps near failure and better closer to failure (Refalo 2024, 24 trained, bench press; Remmert 2023), so the boundary between RIR 2 and 3 is inside the noise [B, E].
* Direct set = 1.0 for the muscle the exercise is built for; synergist set = 0.5 [E: Pelland 2026 A; Mannarino, Soares, Brandão B]. Allow a muscle-specific override table later (glutes in deep squat and leg press look under-credited, Kinoshita 2026) but do not adopt one from a single untrained trial [INF].

### F1. Per-exercise set cap and floor (Q1)

```
cap_ex = 4  if the exercise is compound or machine-compound,  3  if isolation        [CONV; tolerated range 3-5 / 2-4]
min_ex = 3  for the first exercise of a muscle in a session; 2 for a second or third  [CONV; Krieger 2010 and Hammarstrom 2020: 2-3 sets beat 1]
thin-equipment relaxation: if no other standard exercise exists for the muscle, the LAST exercise may take up to cap_ex + 2 sets and the shortfall is flagged   [CONV; already the D8 rule]
exercises per muscle per session: at most 3 (2 for side delts, rear delts, glutes; 1 for front delts, traps, hamstrings)   [D: RP guides]
```

Why: no trial supports a 3-to-4 ceiling per exercise (Krieger: 4 to 6 sets not significantly better than 2 to 3, and not worse); the cap rests on within-session fatigue (Willardson), recovery cost per set near failure (Vieira A), and the value of a complementary exercise (B).

### F2. Per-session muscle cap (Q2)

```
D(s,m) <= 8       direct sets          [E: Remmert preprint A, 8.2 direct; RP 8-12 D]
F(s,m) <= 11      fractional sets      [E: Remmert preprint, 11]
focus muscle:     D <= 10 and F <= 12  [CONV: top of RP's 8-12; beyond the knee of the curve, uncertain]
person scaling:   C_dir = max(6, 8 * min(1, 1 / f_person))      (F14)
```

The cap is a diminishing-returns point, not a safety limit; it is applied as a hard limit for planning because spacing, time and recovery all worsen above it.

### F3. Weekly targets and bands (Q3, Q3b, Q8)

```
maintain          W_mv  = 4   (range 2-6)                           [B: Bickel 2011; D: RP MV, Spiering 2021]
minimum to grow   W_min = 6   (Pelland minimum effective dose 4)    [A + CONV margin; RP MEV 4-6 D]
default grow band W in [10, 16]                                      [A: Pelland tiers 5-10 and 11-18]
upper productive  W up to 20                                         [A: Baz-Valle 2022 12-20; tiers 11-18 and 19-29]
focus or raised   target 20-24 (default 22); screen range 20-30; 30-42 is "top of the studied range"; the plan never targets above 30
                  [A: tiers 19-29 and 30-42 (Pelland); the target and the stop at 30 are CONV; PUOS about 31 is secondary]
allocation among muscles (when budgeting extra sets): give the next set to the muscle with the largest priority_weight * 0.84 / sqrt(W)   [INF from Pelland's square-root form, slope 0.24%/set at 12.25 sets]
start of a block with history:  W0 = max(W_min, round(1.2 * mean weekly fractional sets logged over the last 4 weeks))   [B: Scarpelli 2022, n = 16]
```

Bands, for display only (the screen describes; F16 selects the wording; Q3b has the evidence and the by-muscle caveats):

```
band(W):  W < 2 below maintenance | 2 <= W <= 6 maintenance | 6 < W < 10 between | 10 <= W <= 20 normal growth
          | 20 < W <= 30 focus | 30 < W <= 42 top of the studied range | W > 42 beyond the studied range     [A: Pelland tiers; B/D: maintenance]
session_flag: D(s,m) > 8 or F(s,m) > 11 (focus: 10 and 12)                                                   [A preprint: Remmert; CONV for the focus values]
```

Counting is fractional (F0). The repo's landmark table needs reconciling with RP's current guides before any of these are wired to it (Q3 table, Q10 rows 15 and 27); the bands above do not use the landmark table at all.

### F4. Exposures per rotation (Q4)

```
k_min(m) = ceil( D_week(m) / C_dir )            D_week = weekly DIRECT sets
k(m)     = clamp( k_min(m), 1, N )
if W(m) >= 12 and N >= 4: prefer k >= 2          [CONV: spreads load, lowers perceived exertion (Ochi 2018, untrained)]
extra exposures beyond k_min only if every consecutive gap still satisfies F7 with no new shortfall
```

Frequency is NOT chosen for its own hypertrophic effect (none at equal volume, A); it is the smallest number that respects the per-session cap, with the spacing as the optimisation variable.

| Weekly direct sets | 6 to 8 | 10 to 16 | 18 to 24 | 26 to 32 |
|---|---|---|---|---|
| k_min at C_dir = 8 | 1 | 2 | 3 | 4 |

### F5. Recovery clock T for one exposure (Q5, Q5b)

```
T = clamp( 24, 168,  B_m * f_dose * f_prox * f_mod * f_len * f_novel * f_person )   hours from the END of the session
    (24 and 168 are the repo's own clamp, constants.js:129-130; nothing in the evidence moves them)

B_m (hours at F = 6, RIR 2, the muscle's usual exercise). Centre = the repo's value (constants.js:68-94) [CONV]; range = what I can defend (Q5b Table 3):
   quads 72 [36-96]      hamstrings 72 [48-96]   glutes 72 [48-96]    adductors 60 [36-96]
   back 60 [36-96]       chest 60 [48-96]
   biceps 48 [24-72]     triceps 48 [24-72]      front, side and rear delts 48 [24-72]      traps 48 [24-72]
   calves 36 [24-60]     abs 36 [24-60]          forearms, neck, tibialis 36 [24-60]
   grade of the centres: D (RP consensus: small muscles 1-2 days, large 3-5; weekly frequencies 2-6), with B anchors for chest, triceps, biceps and
   quads (Q5b Table 2). The anchors imply 17-33 h (biceps force), 50-67 h (chest), 47-71 h (triceps work) and 30-45 h (quads) at the reference dose;
   the quad, hamstring and glute centre of 72 h is therefore the conservative end (STOP item 10). Differences BETWEEN muscles are weak evidence (Q5b).
f_dose  = clamp(0.7, 1.5, sqrt(F / 6))                                   [CONV; direction B (Bartolomei 2017); same as constants.js:106-107, 242-246]
          above F = 13.5 the clamp binds: report the hours as a minimum and flag the session as larger than the model covers
f_prox  : RIR 0 = 1.25 | RIR 1 = 1.10 | RIR 2 = 1.00 | RIR >= 3 = 0.80   [CONV sized from A/B: failure vs non-failure SMD -0.96 (Vieira); 24-48 h gap (Moran-Navarro, Pareja-Blanco);
          plausible ranges RIR>=3 0.6-0.9, RIR 0 1.15-1.4; the repo has 1.15 / 1.15 / 1.0 / 0.90, constants.js:258-268]
f_mod   : 0.85 when more than half of the exposure's F is indirect (synergist) credit; 1.0 for prime-mover sets of any exercise   [C: Soares 2015, one muscle; no data for the prime mover of a compound lift]
f_len   : 1.0; exercise built around a long muscle length (overhead extension, seated leg curl, deep RDL or squat, full-stretch calf raise, preacher curl) 1.10 to 1.20   [C/D: Nosaka 2001, McMahon 2024]
f_novel : 1.15 for the first two exposures after a NEW exercise or range, or after 3+ weeks without the muscle; else 1.0   [C/D: repeated-bout effect, Nosaka 1991; Coratella 2025 (hamstring strength: about 3 days first bout, about 1 day repeat); replaces the repo's first-week factor]
f_person: 0.75-1.40, default from the recovery answer (poor 1.15, average 1.0, good 0.9), replaced by the learned factor when F14 allows   [CONV]
band: T_lo = 0.75 T, T_hi = 1.25 T                                        [CONV; the repo's NEARLY 75% maps to 0.75 T]
```

Minimum hours between sessions for a muscle, as a function of its fractional sets (neutral effort, no other modifier; the F5 clock, centres as above):

| Centre B_m | Muscles | F = 3 | F = 6 | F = 9 | F = 12 |
|---|---|---|---|---|---|
| 36 | calves, abs, forearms, neck, tibialis | 25 | 36 | 44 | 51 |
| 48 | biceps, triceps, delts, traps | 34 | 48 | 59 | 68 |
| 60 | chest, back, adductors | 42 | 60 | 73 | 85 |
| 72 | quads, hamstrings, glutes | 51 | 72 | 88 | 102 |

Effort at F = 6 and F = 8 (hours; compare the repo's effort factor):

| Centre B_m | F | RIR 0 | RIR 1 | RIR 2 | RIR 3 or more |
|---|---|---|---|---|---|
| 36 | 6 / 8 | 45 / 52 | 40 / 46 | 36 / 42 | 29 / 33 |
| 48 | 6 / 8 | 60 / 69 | 53 / 61 | 48 / 55 | 38 / 44 |
| 60 | 6 / 8 | 75 / 87 | 66 / 76 | 60 / 69 | 48 / 55 |
| 72 | 6 / 8 | 90 / 104 | 79 / 91 | 72 / 83 | 58 / 67 |

Model check against the measured anchors (Q5b Table 2): at the Goulart dose (F = 10, RIR 0) the quad clock is 116 h against 48 to 72 h measured; at the Ferreira dose (F = 8, RIR 0) the chest clock is 87 h against 72 to 96 h measured (force) and 96 h or more (work). Where it can be checked the clock errs long.

### F6. Reading readiness (Q5, Q5b; screen wording stays descriptive, D204)

```
residual R(m,t) = sum_i  u_i * max(0, 1 - (t - e_i) / T_i),  u_i = clamp(0.25, 2.0, sets_i / 6)      (the repo model, muscleRecoveryModel.js:107-140; shape is a convention)
for a session due at time t_next, and last exposure ended at e:  H = t_next - e   (a FACT from the log)
recoveredPercent = 100 * (1 - R(t_next) / R(e))                  (R(e) = the residual when the latest session ended, at least 0.25; muscleRecoveryModel.js:188-194; ready at 90, nearly at 75, constants.js:139-141)
   single exposure:  ready if H >= 0.9 T,  nearly if H >= 0.75 T,  otherwise still recovering          (labels carry the word 'estimated')
   band statement:   "likely ready" only if H >= T_hi = 1.25 T;  "not yet" only if H < T_lo = 0.75 T
plan fact shown beside it: "at least H_B2B hours between sessions that train this muscle, even if you train on consecutive days"   (F7)
the muscle's plan role never changes T or the status (F16)
```

The word "recovered" means function: ready for another hard session of this size (Q5b: force, work capacity, soreness and damage markers recover on different clocks; soreness is not a readiness gate in the RP sources).

### F7. Rotation score for a FIXED, cyclic rotation with unknown spacing (Q6)

```
Exposure set E_m = { i : D(i,m) >= 2  or  F(i,m) >= 6 }        (indirect-only exposures with F < 6 do not constrain order)
for i in E_m: j = next member of E_m after i in CYCLIC order (wrap included); d = ((j - i - 1) mod N) + 1; d = N if E_m = {i}
H_sigma(i,d) = sum_{k=0..d-1} g_sigma[(i+k) mod N]  -  1          (one-hour session convention)
   g_B2B  = 24 h per slot
   g_TYP  = TYPICAL_WEEK_GAP_HOURS[N]    (recovery/constants.js:385; D201 prior)
   g_EVEN = 168 / N
shortfall_sigma = max(0, 1 - H_sigma / T(i,m))                     (T from F5, person factor included)
penalty(order)  = sum_m sum_{i in E_m} w * ( 0.5 * shortfall_B2B^2 + 0.35 * shortfall_TYP^2 + 0.15 * shortfall_EVEN^2 ),   w = clamp(F(j,m)/6, 0.25, 2)
choose the cyclic order with the lowest penalty; ties keep the authored order; any session may lead
```

Scenario weights 0.5 / 0.35 / 0.15 are [CONV]; the structure (three spacings, wrap, dose-weighted) is [INF] from Q5 and the founder's constraint. N is at most 6, so with the lead fixed there are at most 120 orders. Probe results for the canonical splits are in Q6d and Appendix B.

### F8. Grouping rule for back-to-back safety (Q6)

1. Compute k(m) with F4. 2. List the longest-clock muscles first (quads, hamstrings, glutes, then chest and back). 3. Assign each muscle's k exposures to sessions so the cyclic gaps are floor(N/k) or ceil(N/k) slots. 4. Where the table in Q6c shows a muscle cannot be back-to-back safe at its k, make the exposure that follows the shorter gap the lighter one (about 2 to 4 direct sets, or RIR 3) and the other the heavy one (6 to 8 direct sets). 5. For N of 3 or fewer, use disjoint direct groups (push, pull, legs style) unless the person can keep 48 hours between sessions; for N of 5, a body-part style grouping is order-insensitive but caps weekly volume per muscle at the per-session cap. 6. Keep each muscle's exercise list fixed within a block (random rotation may hinder gains, Kassiano 2022).

### F9. Order inside a session (Q7) [A for "hypertrophy-neutral"]

```
sort key: (1) priority (weak-point) muscle first; (2) within a muscle, multi-joint before single-joint; (3) heavier compounds earlier; ties by library order
```

### F10. Weak-point (focus) rule (Q8, Q8b)

```
role in { focus, raised, standard, maintenance }   focus: chosen by the person; raised: a check-in added sets (F12) and the target is above 20
focus / raised muscle: W_target = clamp( 20 .. 24 ), never planned above 30; k = max(k_min, current k + 1 when the target needs it)
per-session limits: D <= 8 and F <= 11 standard; D <= 10 and F <= 12 focus (STOP item 1)
ramp: +2 to +3 weekly sets per week (F11), not a one-pass jump to 70% of the gap to MRV
others: W >= max(W_mv, 6) for muscles the division judges; 4 for maintained non-judged muscles
placement: the focus muscle's exercises first in the session (F9); longest gap after its heavy exposure (F7)
split the focus volume across sessions so each session stays inside its limit (clock grows with sqrt of the session's sets, F5): 27 to 28 weekly sets = 3 sessions of 9 or 4 of 7
```

### F11. Progression within a block (Q9)

```
weekly set ramp per muscle: +1 to +3 sets per week (tested: +2 and +3 a week, Enes 2024 [B]); default +2; at most one step a week; stop at the block target W_target
load progression: raise load when the top of the rep range is reached (progressive overload doubled gains in untrained women, Kassiano 2026 [B])
recovery week: optional and reactive (fatigue, joint, motivation); if used: volume x 0.5 to 0.75, load kept, never zero    [Coleman 2024, Pancar 2026, Bell 2023: no hypertrophy benefit from a scheduled deload; evidence-neutral]
```

### F12. Redistribution when a check-in adds sets (founder goal 3) [A/B/INF]

```
input: muscle m, extra weekly sets delta (integer)
1. sessions that train m, ordered by: longest gap after the session (F7) first, then fewest current direct sets, then programme order
   headroom(s) = min(C_dir - D(s,m), C_frac - F(s,m))        (priority muscle: +2 / +1)
2. remaining = delta
3. for each session in order while remaining > 0:
   a. room = min(headroom(s), remaining)
   b. add ONE set at a time to the exercise of m in s with the most per-exercise headroom (cap_ex - sets), role not yet covered or lengthened-position first   (water-filling)
   c. if room is left, no exercise of m in s has headroom, room >= min_ex, the session has fewer than the allowed exercises for m, and a standard exercise for an uncovered role exists (F13):
        add it with sets = min(room, cap_ex), then rebalance so no two exercises of m in the session differ by more than 1 set
   d. remaining -= sets placed
4. if remaining > 0: add an exposure only if k + 1 <= N and the F7 penalty does not worsen beyond a tolerance (0.05 absolute); otherwise hold the target at what was placed and report the shortfall.   Never exceed F1/F2 caps.
```

Worked example. Back, two sessions: A = pulldown 4 + row 4 (D = 8), B = row 3 + pulldown 3 (D = 6); the check-in adds 3. Headroom: A 0, B 2 (cap 8). Step b in B: row 3 to 4, pulldown 3 to 4 (+2). Remaining 1: no session has headroom, a new exercise would need at least 2 sets; the extra exposure is not feasible without worsening the rotation penalty, so the target becomes +2 and the plan reports "1 set not placed". Second example, quads: A = squat 4 + leg extension 3 (D = 7), B = leg press 4 (D = 4), the check-in adds 3. B has the longer following gap and headroom 4; leg press is at its cap of 4; B has room 3 for a new exercise, leg extension (uncovered rectus femoris role, Q12) is added with 3 sets: B = leg press 4 + leg extension 3. Nothing exceeds a cap.

### F13. Exercise choice: first and second standard choice per muscle (Q12)

Pick the first choice when the equipment exists, the second to cover the role the first leaves (and as the first when the first is unavailable). Keep the pair fixed for the block. Equipment variants are interchangeable (Hernández-Belmonte 2023 B).

| Muscle | First choice | Second choice | Role the pair covers | Grade |
|---|---|---|---|---|
| Chest | Flat bench press (barbell, dumbbell or machine) | Incline press | mid and upper pectoralis (Chaves 2020, untrained) | B |
| Back | Lat pulldown or pull-up | Seated cable row or barbell or dumbbell row | vertical and horizontal pull (no trial; roles from action and physique criteria) | D |
| Front delts | none (bench and overhead work credit 0.5) | Overhead press if needed | | B indirect, D direct |
| Side delts | Dumbbell lateral raise | Cable or machine lateral raise (equal) | | B |
| Rear delts | Reverse pec deck or reverse fly | Face pull | | D |
| Traps | Shrug | rows credit 0.5 | | D |
| Biceps | Preacher curl (any variant) | Standing barbell or dumbbell curl | stretched distal region plus general | B |
| Triceps | Overhead triceps extension (cable, dumbbell, EZ-bar) | Pushdown | long head at length plus lateral and medial | B |
| Quads | Squat or leg press, deep range | Leg extension | vasti, glutes, adductors plus rectus femoris | B |
| Hamstrings | Seated leg curl | Romanian or stiff-leg deadlift (other session) | knee flexion at length plus hip extension | B |
| Glutes | Deep squat or leg press (shared with quads) | Hip thrust | | B (untrained) |
| Calves | Standing calf raise, full stretch | Seated calf raise | gastrocnemius plus soleus emphasis | B |
| Abs | Cable or machine crunch | Hanging or captain's-chair leg raise | upper and lower segments (acute data only) | C/D |
| Adductors | Squat or leg press at depth | Hip adduction machine | | B indirect, D direct |
| Forearms, neck, tibialis | optional, low priority: wrist curl, neck machine, tibialis raise | | no trials found | D |

Tie-breaker among standard variants: prefer the lengthened-position variant (Q12 paragraph), accept the longer recovery clock via f_len, and do not rotate exercises within a block.

### F14. The learned personal recovery factor (Q11)

```
use the learned factor f_L only if the repo gate passes (>= 8 comparable pairs, spread, LR statistic >= 10) AND >= 12 weeks of history AND >= 3 muscles contribute   [CONV]
f_person = f_L if |f_L - f_built| >= 0.10, else f_built; bounded 0.75-1.40; applied at plan (re)build and block boundaries only
effects: scales T in F5/F7 (spacing); scales C_dir = max(6, 8 * min(1, 1/f_person)) (slower recoverers); NOTHING else
revert: if the gate fails at the next evaluation, or |f_L - f_start| < 0.05, rebuild with the start value
never: weekly volume, calories, weight, food, notifications, ED-safety behaviour
copy: describe what was measured and what the plan did (Q11d); no instruction, no label
```

### F15. Deloads and recovery weeks (Q9, Q10)

Scheduled deloads are not a growth lever (Coleman 2024 B). Keep the existing reactive triggers (D) and the 0.5 recovery week as an option; never cut to zero; keep load.

### F16. Role, band and the Recovery-screen demonstration (Q3b, Q5b, Q8b)

```
inputs per muscle m, for the plan week (planned) or the last 7 days (logged):
  role(m) in { focus, raised, standard, maintenance }     (plan; "raised" = a check-in added sets and the target is above 20)
  W = weekly fractional sets;  for each session s: D_s and F_s;  gaps between sessions that train m (hours, from the log)
      or H_B2B and H_TYP from F7 (from the plan);  T and its band from F5 for the latest session;  H = hours since it ended (log)
outputs (a record the screen renders; every sentence describes, none instructs; D204):
  role_line      focus: "Focus: you picked [muscle] to bring up."   raised: "Raised at your check-in."   maintenance: "Maintained."   standard: none
  total_line     "[N] sets counted: [D] direct and [I] indirect at half credit."          (N = D + 0.5 * I)
  band_line      the Q3b wording for band(W) and (role in {focus, raised} or not)
  target_line    only when W is above the plan's target:  "Your plan targets [a] to [b] a week."
  session_line   "Most in one session: [max F_s] sets (limit for this muscle: [11 or 12])."
  spacing_line   log:  "Sessions were [min gap] to [max gap] hours apart."     plan:  "At least [H_B2B] hours between sessions, even on consecutive days."
  recovery_line  "Estimated recovery after the last session: about [T] hours (range [T_lo] to [T_hi]); [H] hours have passed. Estimated, not measured."
  status         ready / nearly / still recovering (F6); never altered by role
rules:
  - no warning state, colour or word ("too much", "overtrained", "junk", "cut back") for any band up to "top of the studied range", or for sessions inside their limit
  - one session above F = 13.5: add "This session was larger than the estimate covers; the hours shown are a minimum."   (the dose factor is clamped there, F5)
  - one band function and one wording table feed every surface that judges weekly sets (heatmap, Progress strip, Recovery, summary, check-in)    (D219 addition)
  - never use a band or a status to change weekly volume, calories, weight or notifications (the ED-safety lane is out of bounds)
```

Evidence for each piece: bands A (Pelland tiers) with B/D at maintenance (Q3b); per-session limits A preprint (Remmert) plus CONV for the focus values (Q2, Q8b); clocks D with B anchors and a stated band (Q5b); the role changes wording only because no study shows a focus muscle needs a different clock (Q8b); "overtrained" excluded because it is a clinical state diagnosed by exclusion (Meeusen 2013 [D]).

### Which numbers are evidence and which are convention (summary)

| Parameter | Value | Basis |
|---|---|---|
| Synergist credit | 0.5 | Evidence (A: Pelland 2026; B: Mannarino, Soares, Brandão) |
| Minimum effective weekly dose | 4 fractional sets | Evidence (A) |
| Efficiency tiers 5-10 / 11-18 / 19-29 / 30-42 | about 6 / 8.5 / 10.75 / 12.5 extra sets per detectable gain | Evidence (A) |
| Frequency effect at equal volume | negligible | Evidence (A) |
| Order effect on hypertrophy | none; strength favours first | Evidence (A) |
| Per-session ceiling | 8 direct, 11 fractional | Evidence (A, preprint); RP 8-12 (D) |
| Per-exercise cap | 4 / 3 | Convention (indirect support) |
| Per-exercise floor | 3 first, 2 later | Convention (B: more than 1 set beats 1) |
| Weekly productive band, focus target | 10-20; focus 20-24 (screen range 20-30, stop 30) | Evidence-shaped (A: Pelland tiers) plus convention |
| Bands (a) 2-6, (b) 10-20, (c) 20-30, (c+) 30-42, (d) over 42 | fractional sets per week | Evidence (A tiers; B/D maintenance); display only |
| Per-session limit, focus muscle | 10 direct / 12 fractional | Convention (top of RP's 8-12) |
| Maintenance | 4 (2 to 6) | B / D |
| Recovery base hours B_m (per muscle, centre) | 36 / 48 / 60 / 72 by muscle (Q5b Table 3), ranges 24-60 / 24-72 / 36-96 / 36-96 | Convention (D prior); B anchors imply 17-33 (biceps force), 50-67 (chest), 47-71 (triceps work), 30-45 (quads) |
| Differences between muscles at equal dose | none established | Weak (Q5b Table 1): three measured comparisons disagree; none for lats, upper back, delts, glutes, calves, abs, traps |
| Recovery clamp | 24-168 h | The repo's own (constants.js:129-130) |
| f_dose | sqrt(F/6), 0.7-1.5 | Convention |
| f_prox | 1.25 / 1.10 / 1.0 / 0.80 | Convention sized from A/B |
| f_mod (indirect-dominated exposures only), f_len, f_novel | 0.85, 1.10-1.20, 1.15 | Convention from single trials (C/D) |
| f_person | 0.75-1.40 | Convention |
| Band | +/-25% | Convention |
| Rotation scenario weights | 0.5 / 0.35 / 0.15 | Convention |
| Set ramp | +1 to +3 a week | Evidence-shaped (B: Enes) |
| Start volume 1.2 x logged | | B (one trial, n = 16) |
| Exercise pairs (F13) | | B for quads, hamstrings, triceps, biceps, calves, chest-upper, glutes; D for back, rear delts, traps, abs, forearms, neck, tibialis |

---

## STOP items and questions for the lead (not interpreted by me)

1. **Per-session cap number.** 8 direct / 11 fractional rests on a preprint (Remmert); RP says 8 to 12. The engine already uses 8 and 12 for weak points. Decide whether the weak-point 12 stays (above the 11 fractional point) or becomes 10 direct / 12 fractional (F2).
2. **Landmark table.** The repo's `VOLUME_LANDMARKS` differ from RP's current guides, and the repo counts synergists while RP's ranges lean direct. Which reference should the plan use, and should MV and MEV follow Pelland's minimum effective dose (4) rather than 6 to 8? Not changed here.
3. **Fatigue credit for synergists.** 0.5 is supported for growth counting (A) and for the size of the immediate loss (Soares 0.56); fatigue after rows was gone by 24 h, i.e. shorter than a pure dose-scaling would give. F5 and F7 treat indirect-only exposures as non-constraining (F less than 6); confirm.
4. **Sequencer rulings.** D201 lead ruling 2 (adjacency never wraps) and the single typical-week gap vector conflict with a fixed rotation and free days (Q6). The sequencer is code-lane territory; flagged only.
5. **"Recovered" wording.** The label is function recovery, not adaptation or permission (Zaroni 2019, Schoenfeld 2015 and Ochi 2018 show training before full recovery does not impair growth at modest per-session volume). Decide the screen wording under D204; section Q11d offers describing sentences. Also decide which clock the word means: force and performance, work capacity, soreness and damage markers recover on different clocks (Q5b); the model's clock is function (ready for another hard session of this size).
6. **Learned factor and the plan.** F14 lets the learned factor change spacing and the per-session cap at block boundaries, never volume. If the founder wants it to change anything else (for example frequency), that is a product fork and has no evidence behind it.
7. **Division structures.** Disjoint-direct-group rotations (push, pull, legs; body-part) score best for back-to-back safety but cap weekly volume per muscle at the per-session cap; a division with a hand-authored matrix may prefer more exposures. Lead decision.
8. **Evidence gaps to say plainly:** no trial for back (lats, upper back), rear delts, traps, abs, forearms, neck or tibialis by exercise; no trial of specialisation phases; no study of recovery time spread in trained lifters; spinal-erector and grip overlap unstudied.
9. **Working tree.** During the run `git status --short` showed untracked `zzR1Probe*` and `zzR2Probe*.test.js` files under `src/` that belong to the probe lanes, not to me; I did not create, edit or delete them. When this report was written the tree showed only this file as new.
10. **Lower-body clock.** The repo centre of 72 h for quads, hamstrings and glutes is above what the one measured anchor implies (30 to 45 h at the reference dose; Goulart's 10 failure sets read 48 to 72 h, the model says 107 to 116 h). Keep the conservative 72 h, or re-centre nearer 40 to 55 h inside the 36 to 96 h range? The choice decides how many rotations look acceptable (re-centring leaves the best order unchanged in 10 of 11 template families but cuts penalties sharply; Q5b). Lead decision; the evidence allows both.
11. **Volume status labels.** `getVolumeStatus` (`algorithms.js:391-418`) takes no input for the plan's role and calls anything above MRV "Too much"; D219 wants every judging surface to read the same bands and the plan's intent (Q3b, Q10 row 27, F16). This is code-lane territory; flagged only.
12. **Focus per-session limit.** 10 direct and 12 fractional (F10) follows item 1; both are CONV.
13. **"Raised" role.** A check-in that adds sets would label the muscle "raised" for wording while its target sits above the normal range (F16, Q8b). Confirm the product wants the screen to say so.
14. **Per-muscle statements on screen.** Do not state that one muscle recovers faster than another as a fact: unmeasured for the lats and upper back, and the measured comparisons between other muscles disagree (Q5b). "Estimated, from the size of the session and how hard it was" is supportable.

---

## Appendix A. Sources (citations generated from PubMed records; design and population from the abstract unless stated)

Opened = `abs` (abstract read via PubMed) or `full` (full text or PMC page read). Every PMID below was fetched and its author, year and journal read back; none is from memory. Non-PubMed sources follow the table.

| Key used in this report | Citation (as PubMed records it) | PMID | DOI | Opened | Design and population |
|---|---|---|---|---|---|
| Pelland 2026 | Pelland JC et al. 2026. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. Sports Med 56(2):481-505. | 41343037 | 10.1007/s40279-025-02344-w | full | SR with Bayesian multilevel meta-regressions; 67 studies, 2,058 participants (79.1% male, mean age 25.2). Full text read (published PDF; preprint v2 doi:10.51224/SRXIV.460 also read) |
| Schoenfeld 2017 | Schoenfeld BJ et al. 2017. Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. J Sports Sci 35(11):1073-1082. | 27433992 | 10.1080/02640414.2016.1210197 | abs | SR and meta-regression, 34 groups from 15 studies |
| Schoenfeld 2019 | Schoenfeld BJ et al. 2019. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. Med Sci Sports Exerc 51(1):94-103. | 30153194 | 10.1249/MSS.0000000000001764 | full | RCT, 34 resistance-trained men, 8 wk, 1/3/5 sets per exercise; PMC6303131 read |
| Krieger 2010 | Krieger JW 2010. Single vs. multiple sets of resistance exercise for muscle hypertrophy: a meta-analysis. J Strength Cond Res 24(4):1150-9. | 20300012 | 10.1519/JSC.0b013e3181d4d436 | abs | Meta-regression, 8 studies, 19 groups, sets per exercise |
| Baz-Valle 2022 | Baz-Valle E et al. 2022. A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy. J Hum Kinet 81:199-210. | 35291645 | 10.2478/hukin-2022-0017 | abs | SR with meta-analysis, 7 RCTs, trained men 18-35 y |
| Heaselgrave 2019 | Heaselgrave SR et al. 2019. Dose-Response Relationship of Weekly Resistance-Training Volume and Frequency on Muscular Adaptations in Trained Men. Int J Sports Physiol Perform 14(3):360-368. | 30160627 | 10.1123/ijspp.2018-0427 | abs | RCT, 49 resistance-experienced men, 6 wk, biceps 9/18/27 weekly sets |
| Brigatto 2022 | Brigatto FA et al. 2022. High Resistance-Training Volume Enhances Muscle Thickness in Resistance-Trained Men. J Strength Cond Res 36(1):22-30. | 31868813 | 10.1519/JSC.0000000000003413 | abs | RCT, 27 resistance-trained men, 8 wk, 16/24/32 weekly sets |
| Brigatto 2019 | Brigatto FA et al. 2019. Effect of Resistance Training Frequency on Neuromuscular Performance and Muscle Morphology After 8 Weeks in Trained Men. J Strength Cond Res 33(8):2104-2116. | 29528962 | 10.1519/JSC.0000000000002563 | abs | RCT, 20 trained men, 8 wk, 16 sets once vs 8 sets twice a week |
| Aube 2022 | Aube D et al. 2022. Progressive Resistance Training Volume: Effects on Muscle Thickness, Mass, and Strength Adaptations in Resistance-Trained Individuals. J Strength Cond Res 36(3):600-607. | 32058362 | 10.1519/JSC.0000000000003524 | abs | RCT, 35 resistance-trained, 8 wk, 12/18/24 weekly lower-body sets |
| Enes 2024 | Enes A et al. 2024. Effects of Different Weekly Set Progressions on Muscular Adaptations in Trained Males: Is There a Dose-Response Effect?. Med Sci Sports Exerc 56(3):553-563. | 37796222 | 10.1249/MSS.0000000000003317 | abs | RCT, 31 resistance-trained men, 12 wk, set progressions |
| Barbalho 2019 (RETRACTED) | Barbalho M et al. 2019. Evidence for an Upper Threshold for Resistance Training Volume in Trained Women. Med Sci Sports Exerc 51(3):515-522. | 30779716 | 10.1249/MSS.0000000000001818 | abs | RETRACTED 2021 (MSSE 53(6):1318); expression of concern 2020; NOT used as evidence |
| Kassiano 2024 | Kassiano W et al. 2024. Bigger Calves from Doing Higher Resistance Training Volume?. Int J Sports Med 45(10):739-747. | 38684187 | 10.1055/a-2316-7885 | abs | RCT, 61 untrained young women, 6 wk, calf 6/9/12 weekly sets |
| Scarpelli 2022 | Scarpelli MC et al. 2022. Muscle Hypertrophy Response Is Affected by Previous Resistance Training Volume in Trained Individuals. J Strength Cond Res 36(4):1153-1157. | 32108724 | 10.1519/JSC.0000000000003558 | abs | Within-subject RCT, 16 trained, 8 wk, individualised vs fixed volume |
| Hammarstrom 2020 | Hammarström D et al. 2020. Benefits of higher resistance-training volume are related to ribosome biogenesis. J Physiol 598(3):543-565. | 31813190 | 10.1113/JP278455 | abs | Contralateral RCT, 34 untrained, 12 wk, 3 vs 1 sets |
| Damas 2019 | Damas F et al. 2019. Myofibrillar protein synthesis and muscle hypertrophy individualized responses to systematically changing resistance training variables in trained young men. J Appl Physiol (1985) 127(3):806-815. | 31268828 | 10.1152/japplphysiol.00350.2019 | abs | Within-subject RCT, 20 resistance-trained men, 8 wk, variable vs standard |
| Kassiano 2026 (progressive overload) | Kassiano W et al. 2026. Progressive Overload Affects the Magnitude of Muscle Hypertrophy. Med Sci Sports Exerc 58(7):1556-1565. | 41718594 | 10.1249/MSS.0000000000003968 | abs | Within-arm RCT, 55 untrained young women, 8 wk |
| Schoenfeld 2019 (frequency) | Schoenfeld BJ et al. 2019. How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency. J Sports Sci 37(11):1286-1295. | 30558493 | 10.1080/02640414.2018.1555906 | abs | SR and meta-analysis, 25 studies |
| Schoenfeld 2016 (frequency) | Schoenfeld BJ et al. 2016. Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med 46(11):1689-1697. | 27102172 | 10.1007/s40279-016-0543-8 | abs | SR and meta-analysis, 10 studies |
| Schoenfeld 2015 | Schoenfeld BJ et al. 2015. Influence of Resistance Training Frequency on Muscular Adaptations in Well-Trained Men. J Strength Cond Res 29(7):1821-9. | 25932981 | 10.1519/JSC.0000000000000970 | abs | RCT, 20 well-trained men, split vs total body |
| Zaroni 2019 | Zaroni RS et al. 2019. High Resistance-Training Frequency Enhances Muscle Thickness in Resistance-Trained Men. J Strength Cond Res 33 Suppl 1:S140-S151. | 31260419 | 10.1519/JSC.0000000000002643 | abs | RCT, 18 well-trained men, split vs total body 5 days a week, 8 wk |
| Evangelista 2021 | Evangelista AL et al. 2021. Split or full-body workout routine: which is best to increase muscle strength and hypertrophy?. Einstein (Sao Paulo) 19:eAO5781. | 34468591 | 10.31744/einstein_journal/2021AO5781 | abs | RCT, 67 untrained, split vs full body, 8 wk |
| Bartolomei 2021 | Bartolomei S et al. 2021. A Comparison Between Total Body and Split Routine Resistance Training Programs in Trained Men. J Strength Cond Res 35(6):1520-1526. | 32168178 | 10.1519/JSC.0000000000003573 | abs | RCT, 21 resistance-trained men, total body vs split, 10 wk |
| Ochi 2018 | Ochi E et al. 2018. Higher Training Frequency Is Important for Gaining Muscular Strength Under Volume-Matched Training. Front Physiol 9:744. | 30013480 | 10.3389/fphys.2018.00744 | abs | RCT, 20 untrained, 11 wk, 6 sets once vs 2 sets 3 times a week |
| Behm 2021 | Behm DG et al. 2021. Non-local Muscle Fatigue Effects on Muscle Strength, Power, and Endurance in Healthy Individuals: A Systematic Review with Meta-analysis. Sports Med 51(9):1893-1907. | 33818751 | 10.1007/s40279-021-01456-3 | abs | SR and meta-analysis, non-local muscle fatigue, 52 studies, 303 participants |
| Kataoka 2026 | Kataoka R et al. 2026. Skeletal Muscles Do Not Compete for Growth: Activating Additional Muscle Mass Does Not Compromise Changes in Muscle Size. J Strength Cond Res 40(9):1043-1049. | 42647752 | 10.1519/JSC.0000000000005439 | abs | RCT, 105 untrained, 6 wk, arm only vs arm plus leg exercise |
| Kassiano 2022 | Kassiano W et al. 2022. Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review. J Strength Cond Res 36(6):1753-1762. | 35438660 | 10.1519/JSC.0000000000004258 | abs | SR, 8 studies, 241 young men |
| Baz-Valle 2019 | Baz-Valle E et al. 2019. The effects of exercise variation in muscle thickness, maximal strength and motivation in resistance trained men. PLoS One 14(12):e0226989. | 31881066 | 10.1371/journal.pone.0226989 | abs | RCT, 21 resistance-trained men, 8 wk, random vs fixed exercises |
| Costa 2021 | Costa BDV et al. 2021. Does Performing Different Resistance Exercises for the Same Muscle Group Induce Non-homogeneous Hypertrophy?. Int J Sports Med 42(9):803-811. | 33440446 | 10.1055/a-1308-3674 | abs | RCT, 22 detrained men, 9 wk, varied vs same exercises |
| Fonseca 2014 | Fonseca RM et al. 2014. Changes in exercises are more effective than in loading schemes to improve muscle strength. J Strength Cond Res 28(11):3085-92. | 24832974 | 10.1519/JSC.0000000000000539 | abs | RCT, 49 active people, 12 wk, varied exercise and loading |
| Kassiano 2025 | Kassiano W et al. 2025. Muscle Hypertrophy and Strength Adaptations to Systematically Varying Resistance Exercises. Res Q Exerc Sport 96(2):371-381. | 39388663 | 10.1080/02701367.2024.2409961 | abs | RCT, 70 untrained young women, 10 wk, varied vs constant leg exercises |
| Zabaleta-Korta 2021 | Zabaleta-Korta A et al. 2021. The role of exercise selection in regional Muscle Hypertrophy: A randomized controlled trial. J Sports Sci 39(20):2298-2304. | 34743671 | 10.1080/02640414.2021.1929736 | abs | RCT, equal volume, Smith squat vs leg extension; also described in the division register |
| Kassiano 2026 | Kassiano W et al. 2026. Comparison of Muscle Hypertrophy and Strength Adaptations Induced by Back Squat and Leg Extension Resistance Exercises. J Strength Cond Res 40(4):367-376. | 41379528 | 10.1519/JSC.0000000000005338 | abs | RCT, 63 untrained young women, 8 wk, squat vs leg extension |
| Kinoshita 2026 | Kinoshita M et al. 2026. Hypertrophic Effects of Single- versus Multi-Joint Exercise: A Direct Comparison between Knee Extension and Leg Press. Med Sci Sports Exerc 58(7):1566-1580. | 41630124 | 10.1249/MSS.0000000000003957 | abs | Within-subject RCT, 17 untrained adults, 12 wk, knee extension vs leg press |
| Gentil 2017 | Gentil P et al. 2017. A Review of the Acute Effects and Long-Term Adaptations of Single- and Multi-Joint Exercises during Resistance Training. Sports Med 47(5):843-855. | 27677913 | 10.1007/s40279-016-0627-5 | abs | Review, 23 studies, single- vs multi-joint exercise |
| Refalo 2023 | Refalo MC et al. 2023. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. Sports Med 53(3):649-665. | 36334240 | 10.1007/s40279-022-01784-y | abs | SR and meta-analysis, 15 studies, proximity to failure |
| Robinson 2024 | Robinson ZP et al. 2024. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med 54(9):2209-2231. | 38970765 | 10.1007/s40279-024-02069-2 | abs | Exploratory meta-regressions, estimated RIR |
| Refalo 2024 | Refalo MC et al. 2024. Accuracy of Intraset Repetitions-in-Reserve Predictions During the Bench Press Exercise in Resistance-Trained Male and Female Subjects. J Strength Cond Res 38(3):e78-e85. | 37967832 | 10.1519/JSC.0000000000004653 | abs | 24 resistance-trained men and women, RIR prediction accuracy, bench press |
| Remmert 2023 | Remmert JF et al. 2023. Accuracy of Predicted Intraset Repetitions in Reserve (RIR) in Single- and Multi-Joint Resistance Exercises Among Trained and Untrained Men and Women. Percept Mot Skills 130(3):1239-1254. | 37036795 | 10.1177/00315125231169868 | abs | 27 men and 31 women, RIR prediction accuracy, machine single-joint |
| Willardson 2005 | Willardson JM et al. 2005. A comparison of 3 different rest intervals on the exercise volume completed during a workout. J Strength Cond Res 19(1):23-6. | 15705039 | 10.1519/R-13853.1 | abs | 15 men, 4 sets squat and bench, rest 1/2/5 min |
| Willardson 2006 | Willardson JM et al. 2006. The effect of rest interval length on the sustainability of squat and bench press repetitions. J Strength Cond Res 20(2):400-3. | 16686571 | 10.1519/R-16314.1 | abs | 15 men with experience, 5 sets at 15RM, rest 30 s/1/2 min |
| Schoenfeld 2016 (rest) | Schoenfeld BJ et al. 2016. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res 30(7):1805-12. | 26605807 | 10.1519/JSC.0000000000001272 | abs | RCT, 21 resistance-trained men, 8 wk, 1 vs 3 min rest |
| Singer 2024 | Singer A et al. 2024. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living 6:1429789. | 39205815 | 10.3389/fspor.2024.1429789 | abs | SR with Bayesian meta-analysis, 9 studies, rest interval |
| Mannarino 2021 | Mannarino P et al. 2021. Single-Joint Exercise Results in Higher Hypertrophy of Elbow Flexors Than Multijoint Exercise. J Strength Cond Res 35(10):2677-2681. | 31268995 | 10.1519/JSC.0000000000003234 | abs | Within-subject, 10 untrained men, 8 wk, curl vs row |
| Brandao 2020 | Brandão L et al. 2020. Varying the Order of Combinations of Single- and Multi-Joint Exercises Differentially Affects Resistance Training Adaptations. J Strength Cond Res 34(5):1254-1263. | 32149887 | 10.1519/JSC.0000000000003550 | abs | RCT, 43 young men, single- and multi-joint combinations for chest and triceps |
| Lanza 2024 | Lanza MB et al. 2024. Muscle hypertrophy response across four muscles involved in the bench press exercise: Randomized 10 weeks training intervention. J Bodyw Mov Ther 40:1417-1422. | 39593465 | 10.1016/j.jbmt.2024.07.054 | abs | 24 healthy males (13 trained, 11 control), 10 wk bench press, MRI area of four muscles |
| Goulart 2021 | Goulart KNO et al. 2021. Time-course of changes in performance, biomechanical, physiological and perceptual responses following resistance training sessions. Eur J Sport Sci 21(7):935-943. | 32594858 | 10.1080/17461391.2020.1789227 | abs | 14 resistance-trained men, squat plus leg press to failure, 24/48/72 h recovery |
| Moran-Navarro 2017 | Morán-Navarro R et al. 2017. Time course of recovery following resistance training leading or not to failure. Eur J Appl Physiol 117(12):2387-2399. | 28965198 | 10.1007/s00421-017-3725-7 | abs | 10 resistance-trained men, failure vs non-failure, to 72 h |
| Pareja-Blanco 2020 | Pareja-Blanco F et al. 2020. Time Course of Recovery From Resistance Exercise With Different Set Configurations. J Strength Cond Res 34(10):2867-2876. | 30036284 | 10.1519/JSC.0000000000002756 | abs | 10 males, 10 protocols, failure vs not, to 48 h |
| Vieira 2022 | Vieira JG et al. 2022. Effects of Resistance Training to Muscle Failure on Acute Fatigue: A Systematic Review and Meta-Analysis. Sports Med 52(5):1103-1125. | 34881412 | 10.1007/s40279-021-01602-x | abs | SR and meta-analysis, failure vs non-failure acute fatigue, 20 studies |
| Ferreira 2017 | Ferreira DV et al. 2017. Dissociated time course between peak torque and total work recovery following bench press training in resistance trained men. Physiol Behav 179:143-147. | 28595855 | 10.1016/j.physbeh.2017.06.001 | abs | 26 resistance-trained men, 8 sets bench press to failure, to 96 h |
| Soares 2015 | Soares S et al. 2015. Dissociated Time Course of Muscle Damage Recovery Between Single- and Multi-Joint Exercises in Highly Resistance-Trained Men. J Strength Cond Res 29(9):2594-9. | 25807025 | 10.1519/JSC.0000000000000899 | abs | 16 highly trained men, row vs preacher curl, to 96 h |
| Bartolomei 2017 | Bartolomei S et al. 2017. Comparison of the recovery response from high-intensity and high-volume resistance exercise in trained men. Eur J Appl Physiol 117(7):1287-1298. | 28447186 | 10.1007/s00421-017-3598-9 | abs | 12 trained men, high-volume vs high-intensity, to 72 h |
| Chen 2011 | Chen TC et al. 2011. Comparison in eccentric exercise-induced muscle damage among four limb muscles. Eur J Appl Physiol 111(2):211-23. | 20852880 | 10.1007/s00421-010-1648-7 | abs | 17 sedentary men, maximal eccentrics, four limb muscles |
| Jamurtas 2005 | Jamurtas AZ et al. 2005. Comparison between leg and arm eccentric exercises of the same relative intensity on indices of muscle damage. Eur J Appl Physiol 95(2-3):179-85. | 16007451 | 10.1007/s00421-005-1345-0 | abs | 11 untrained men, legs vs arms eccentric, to 96 h |
| Flores 2011 | Flores DF et al. 2011. Dissociated time course of recovery between genders after resistance exercise. J Strength Cond Res 25(11):3039-44. | 21804429 | 10.1519/JSC.0b013e318212dea4 | abs | 30 untrained (14 women, 16 men), 8 sets elbow flexion, to 4 days |
| Morawetz 2020 | Morawetz D et al. 2020. Sex-Related Differences After a Single Bout of Maximal Eccentric Exercise in Response to Acute Effects: A Systematic Review and Meta-analysis. J Strength Cond Res 34(9):2697-2707. | 30908366 | 10.1519/JSC.0000000000002867 | abs | SR and meta-analysis, 23 trials, sex differences after maximal eccentrics |
| Gordon 2017 | Gordon JA 3rd et al. 2017. Comparisons in the Recovery Response From Resistance Exercise Between Young and Middle-Aged Men. J Strength Cond Res 31(12):3454-3462. | 28859014 | 10.1519/JSC.0000000000002219 | abs | 19 recreationally trained men, young vs middle-aged, to 48 h |
| Fernandes 2019 | Fernandes JFT et al. 2019. Exercise-Induced Muscle Damage and Recovery in Young and Middle-Aged Males with Different Resistance Training Experience. Sports (Basel) 7(6):. | 31146445 | 10.3390/sports7060132 | abs | 27 men, young trained vs middle-aged trained and untrained, 10 x 10 squats, to 72 h |
| Trivisonno 2021 | Trivisonno AJ et al. 2021. The influence of age on the recovery from worksite resistance exercise in career firefighters. Exp Gerontol 152:111467. | 34237392 | 10.1016/j.exger.2021.111467 | abs | 38 male firefighters, 25.5 vs 50.3 y, to 72 h |
| Munteanu 2026 | Munteanu G et al. 2026. The Effect of Menstrual Cycle Phase, Symptoms, Motivation, and Readiness to Perform on Resistance Training Performance. Sports Med 56(9):2325-2339. | 42177355 | 10.1007/s40279-026-02459-8 | abs | 28 resistance-trained women, two mesocycles, menstrual phase and performance |
| Damas 2016 | Damas F et al. 2016. Resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage. J Physiol 594(18):5209-22. | 27219125 | 10.1113/JP272472 | abs | 10 young men, 10 wk of training, damage and myofibrillar protein synthesis |
| Damas 2015 | Damas F et al. 2015. A review of resistance training-induced changes in skeletal muscle protein synthesis and their contribution to hypertrophy. Sports Med 45(6):801-7. | 25739559 | 10.1007/s40279-015-0320-0 | abs | Review, protein synthesis with resistance training |
| Phillips 1997 | Phillips SM et al. 1997. Mixed muscle protein synthesis and breakdown after resistance exercise in humans. Am J Physiol 273(1 Pt 1):E99-107. | 9252485 | 10.1152/ajpendo.1997.273.1.E99 | abs | 8 untrained volunteers, 8 x 8 at 80%, to 48 h |
| MacDougall 1995 | MacDougall JD et al. 1995. The time course for elevated muscle protein synthesis following heavy resistance exercise. Can J Appl Physiol 20(4):480-6. | 8563679 | 10.1139/h95-038 | abs | 6 healthy young men, 12 sets elbow flexion, to 36 h |
| Tang 2008 | Tang JE et al. 2008. Resistance training alters the response of fed state mixed muscle protein synthesis in young men. Am J Physiol Regul Integr Comp Physiol 294(1):R172-8. | 18032468 | 10.1152/ajpregu.00636.2007 | abs | 10 young men, 8 wk unilateral training, protein synthesis at 4 and 28 h |
| Nosaka 2001 | Nosaka K et al. 2001. Effect of elbow joint angle on the magnitude of muscle damage to the elbow flexors. Med Sci Sports Exerc 33(1):22-9. | 11194107 | 10.1097/00005768-200101000-00005 | abs | 10 male students, eccentrics at long vs short length |
| Nosaka 1991 | Nosaka K et al. 1991. Time course of muscle adaptation after high force eccentric exercise. Eur J Appl Physiol Occup Physiol 63(1):70-6. | 1915336 | 10.1007/BF00760804 | abs | 14 young women, two bouts of 70 maximal eccentrics 6 or 10 weeks apart |
| McHugh 2003 | McHugh MP 2003. Recent advances in the understanding of the repeated bout effect: the protective effect against muscle damage from a single bout of eccentric exercise. Scand J Med Sci Sports 13(2):88-97. | 12641640 | 10.1034/j.1600-0838.2003.02477.x | abs | Review, repeated bout effect |
| Hyldahl 2017 | Hyldahl RD et al. 2017. Mechanisms and Mediators of the Skeletal Muscle Repeated Bout Effect. Exerc Sport Sci Rev 45(1):24-33. | 27782911 | 10.1249/JES.0000000000000095 | abs | Review, repeated bout effect mechanisms |
| McMahon 2024 | McMahon G et al. 2024. Joint angle-specific neuromuscular time course of recovery after isometric resistance exercise at shorter and longer muscle lengths. J Appl Physiol (1985) 136(4):889-900. | 38450425 | 10.1152/japplphysiol.00820.2023 | full | 8 young adults, isometric knee extension at long vs short length; PMC11286269 read |
| Meira 2026 | Meira Â et al. 2026. Neuromuscular Performance Impairment: Exploring the Power-Force-Velocity Recovery Profiles in Local and Nonlocal Muscles. J Strength Cond Res 40(1):e9-e16. | 41172137 | 10.1519/JSC.0000000000005266 | abs | 16 physically active men, repetitive lengthening protocol, local and non-local recovery |
| Tolusso 2022 | Tolusso DV et al. 2022. The Validity of Perceived Recovery Status as a Marker of Daily Recovery Following a High-Volume Back-Squat Protocol. Int J Sports Physiol Perform 17(6):886-892. | 35255478 | 10.1123/ijspp.2021-0360 | abs | 11 resistance-trained men, perceived recovery status after 8 x 10 squats |
| Kataoka 2022 | Kataoka R et al. 2022. Is there Evidence for the Suggestion that Fatigue Accumulates Following Resistance Exercise?. Sports Med 52(1):25-36. | 34613589 | 10.1007/s40279-021-01572-0 | abs | Review, fatigue accumulation |
| Hellard 2006 | Hellard P et al. 2006. Assessing the limitations of the Banister model in monitoring training. J Sports Sci 24(5):509-20. | 16608765 | 10.1080/02640410500244697 | abs | 9 elite swimmers, Banister model accuracy |
| Busso 2023 | Busso T et al. 2023. Validity and Accuracy of Impulse-Response Models for Modeling and Predicting Training Effects on Performance of Swimmers. Med Sci Sports Exerc 55(7):1274-1285. | 36791017 | 10.1249/MSS.0000000000003139 | abs | 11 swimmers, impulse-response model validity |
| Imbach 2022 | Imbach F et al. 2022. The Use of Fitness-Fatigue Models for Sport Performance Modelling: Conceptual Issues and Contributions from Machine-Learning. Sports Med Open 8(1):29. | 35239054 | 10.1186/s40798-022-00426-x | abs | Review, fitness-fatigue models |
| Nunes 2021 | Nunes JP et al. 2021. What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis. Eur J Sport Sci 21(2):149-157. | 32077380 | 10.1080/17461391.2020.1733672 | abs | SR and meta-analysis, 11 studies, exercise order |
| Simao 2012 | Simão R et al. 2012. Exercise order in resistance training. Sports Med 42(3):251-65. | 22292516 | 10.2165/11597240-000000000-00000 | abs | Narrative review, exercise order |
| Avelar 2019 | Avelar A et al. 2019. Effects of order of resistance training exercises on muscle hypertrophy in young adult men. Appl Physiol Nutr Metab 44(4):420-424. | 30248269 | 10.1139/apnm-2018-0478 | abs | RCT, 36 young men, 6 wk, multi-joint first vs single-joint first |
| Bickel 2011 | Bickel CS et al. 2011. Exercise dosing to retain resistance training adaptations in young and older adults. Med Sci Sports Exerc 43(7):1177-87. | 21131862 | 10.1249/MSS.0b013e318207c15d | abs | RCT, 70 adults, young vs old, 16 wk training then 32 wk maintenance at 1/3 or 1/9 dose |
| Spiering 2021 | Spiering BA et al. 2021. Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time. J Strength Cond Res 35(5):1449-1458. | 33629972 | 10.1519/JSC.0000000000003964 | abs | Narrative review, minimal dose to maintain performance |
| Iversen 2021 | Iversen VM et al. 2021. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. Sports Med 51(10):2079-2095. | 34125411 | 10.1007/s40279-021-01490-1 | abs | Narrative review, time-efficient training |
| Coleman 2024 | Coleman M et al. 2024. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. PeerJ 12:e16777. | 38274324 | 10.7717/peerj.16777 | abs | RCT, 39 resistance-trained, 9 wk, 1-week deload vs continuous |
| Pancar 2026 | Pancar Z et al. 2026. Effects of deload periods in resistance training on muscle hypertrophy and strength endurance in untrained young men using a randomized within subject design. Sci Rep 16(1):. | 41730991 | 10.1038/s41598-026-40612-5 | abs | Within-subject RCT, 19 untrained men, 8 wk, reduced weeks 4 and 8 |
| Bell 2023 | Bell L et al. 2023. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. Sports Med Open 9(1):87. | 37730925 | 10.1186/s40798-023-00633-0 | abs | Delphi consensus, 34 coaches (round 1) |
| Hubal 2005 | Hubal MJ et al. 2005. Variability in muscle size and strength gain after unilateral resistance training. Med Sci Sports Exerc 37(6):964-72. | 15947721 |  | abs | 585 untrained, 12 wk unilateral elbow-flexor training |
| Ahtiainen 2016 | Ahtiainen JP et al. 2016. Heterogeneity in resistance training-induced muscle strength and mass responses in men and women of different ages. Age (Dordr) 38(1):10. | 26767377 | 10.1007/s11357-015-9870-1 | abs | Pooled data, 287 untrained (19-78 y), 72 controls |
| Damas 2016 (IJSM) | Damas F et al. 2016. Susceptibility to Exercise-Induced Muscle Damage: a Cluster Analysis with a Large Sample. Int J Sports Med 37(8):633-40. | 27116346 | 10.1055/s-0042-100281 | abs | 286 young men, unaccustomed maximal eccentrics, cluster analysis |
| Hecksteden 2015 | Hecksteden A et al. 2015. Individual response to exercise training - a statistical perspective. J Appl Physiol (1985) 118(12):1450-9. | 25663672 | 10.1152/japplphysiol.00714.2014 | abs | Methods review, individual response |
| Atkinson 2015 | Atkinson G et al. 2015. True and false interindividual differences in the physiological response to an intervention. Exp Physiol 100(6):577-88. | 25823596 | 10.1113/EP085070 | abs | Methods review, true and false individual differences |
| Swinton 2018 | Swinton PA et al. 2018. A Statistical Framework to Interpret Individual Response to Intervention: Paving the Way for Personalized Nutrition and Exercise Prescription. Front Nutr 5:41. | 29892599 | 10.3389/fnut.2018.00041 | abs | Methods review, individual response framework |
| Roberts 2018 | Roberts MD et al. 2018. Physiological Differences Between Low Versus High Skeletal Muscle Hypertrophic Responders to Resistance Exercise Training: Current Perspectives and Future Research Directions. Front Physiol 9:834. | 30022953 | 10.3389/fphys.2018.00834 | abs | Perspective review, low vs high responders |
| Maeo 2023 | Maeo S et al. 2023. Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position. Eur J Sport Sci 23(7):1240-1250. | 35819335 | 10.1080/17461391.2022.2100279 | abs | Within-subject, 21 adults, 12 wk, overhead vs neutral cable triceps extension |
| Maeo 2021 | Maeo S et al. 2021. Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths. Med Sci Sports Exerc 53(4):825-837. | 33009197 | 10.1249/MSS.0000000000002523 | abs | Within-subject, 20 adults, 12 wk, seated vs prone leg curl |
| Maeo 2024 | Maeo S et al. 2024. Hamstrings Hypertrophy Is Specific to the Training Exercise: Nordic Hamstring versus Lengthened State Eccentric Training. Med Sci Sports Exerc 56(10):1893-1905. | 38857522 | 10.1249/MSS.0000000000003490 | abs | RCT, 42 young men, 12 wk, lengthened-state eccentric vs Nordic |
| Kinoshita 2023 | Kinoshita M et al. 2023. Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training. Front Physiol 14:1272106. | 38156065 | 10.3389/fphys.2023.1272106 | abs | Within-subject, 14 untrained adults, 12 wk, standing vs seated calf raise |
| Kassiano 2023 (calf) | Kassiano W et al. 2023. Greater Gastrocnemius Muscle Hypertrophy After Partial Range of Motion Training Performed at Long Muscle Lengths. J Strength Cond Res 37(9):1746-1753. | 37015016 | 10.1519/JSC.0000000000004460 | abs | RCT, 42 young women, 8 wk, calf raise ROM |
| Pedrosa 2022 | Pedrosa GF et al. 2022. Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths. Eur J Sport Sci 22(8):1250-1260. | 33977835 | 10.1080/17461391.2021.1927199 | abs | RCT, 45 untrained women, knee extension ROM |
| Pedrosa 2023 | Pedrosa GF et al. 2023. Training in the Initial Range of Motion Promotes Greater Muscle Adaptations Than at Final in the Arm Curl. Sports (Basel) 11(2):. | 36828324 | 10.3390/sports11020039 | abs | Within-arm, 19 young women, 8 wk, preacher curl initial vs final ROM |
| Zabaleta-Korta 2023 | Zabaleta-Korta A et al. 2023. Regional Hypertrophy: The Effect of Exercises at Long and Short Muscle Lengths in Recreationally Trained Women. J Hum Kinet 87:259-270. | 37559762 | 10.5114/jhk/163561 | abs | RCT, 38 recreationally trained women, 9 wk, incline vs preacher curl |
| Attarieh 2025 | Attarieh P et al. 2025. Comparison Between Shoulder Flexed and Extended Positions in Elbow Flexion Resistance Training on Regional Hypertrophy and Maximum Strength: Preacher versus Bayesian Cable Curls. Eur J Sport Sci 25(4):e12279. | 40082069 | 10.1002/ejsc.12279 | abs | Within-subject, 15 young men, 10 wk, preacher vs Bayesian cable curl |
| Nunes 2020 | Nunes JP et al. 2020. Placing Greater Torque at Shorter or Longer Muscle Lengths? Effects of Cable vs. Barbell Preacher Curl Training on Muscular Strength and Hypertrophy in Young Adults. Int J Environ Res Public Health 17(16):. | 32823490 | 10.3390/ijerph17165859 | abs | RCT, 35 young adults, 10 wk, cable vs barbell preacher curl |
| Larsen 2025 | Larsen S et al. 2025. Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study. Front Physiol 16:1611468. | 40692697 | 10.3389/fphys.2025.1611468 | abs | Within-participant, 24 resistance-trained, 8 wk, dumbbell vs cable lateral raise |
| Chaves 2020 | Chaves SFN et al. 2020. Effects of Horizontal and Incline Bench Press on Neuromuscular Adaptations in Untrained Young Men. Int J Exerc Sci 13(6):859-872. | 32922646 | 10.70252/FDNB1158 | abs | RCT, 47 untrained men, 8 wk, horizontal vs incline vs combined bench press |
| Plotkin 2023 | Plotkin DL et al. 2023. Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. Front Physiol 14:1279170. | 37877099 | 10.3389/fphys.2023.1279170 | abs | RCT, 34 untrained, 9 wk, hip thrust vs back squat |
| Kubo 2019 | Kubo K et al. 2019. Effects of squat training with different depths on lower limb muscle volumes. Eur J Appl Physiol 119(9):1933-1942. | 31230110 | 10.1007/s00421-019-04181-y | abs | RCT, 17 men, 10 wk, full vs half squat |
| Bloomquist 2013 | Bloomquist K et al. 2013. Effect of range of motion in heavy load squatting on muscle and tendon adaptations. Eur J Appl Physiol 113(8):2133-42. | 23604798 | 10.1007/s00421-013-2642-7 | abs | RCT, 17 male students, 12 wk, deep vs shallow squat |
| Schoenfeld and Grgic 2020 | Schoenfeld BJ et al. 2020. Effects of range of motion on muscle development during resistance training interventions: A systematic review. SAGE Open Med 8:2050312120901559. | 32030125 | 10.1177/2050312120901559 | abs | SR, 6 studies, full vs partial ROM |
| Kassiano 2023 (ROM) | Kassiano W et al. 2023. Which ROMs Lead to Rome? A Systematic Review of the Effects of Range of Motion on Muscle Hypertrophy. J Strength Cond Res 37(5):1135-1144. | 36662126 | 10.1519/JSC.0000000000004415 | abs | SR, 11 studies, ROM and hypertrophy |
| Varovic 2025 | Varovic D et al. 2025. Does Muscle Length Influence Regional Hypertrophy? A Systematic Review and Meta-Analysis. Int J Sports Med 46(14):1027-1036. | 40570881 | 10.1055/a-2615-4935 | abs | SR with Bayesian meta-analysis, 12 studies, muscle length and regional hypertrophy |
| Wolf 2026 | Wolf M et al. 2026. Does longer-muscle length resistance training cause greater longitudinal growth in humans? A systematic review. Sports Med Health Sci 8(1):34-42. | 41646176 | 10.1016/j.smhs.2025.03.001 | abs | SR, 8 studies, longer-muscle-length training and longitudinal growth |
| Hernandez-Belmonte 2023 | Hernández-Belmonte A et al. 2023. Free-Weight and Machine-Based Training Are Equally Effective on Strength and Hypertrophy: Challenging a Traditional Myth. Med Sci Sports Exerc 55(12):2316-2327. | 37535335 | 10.1249/MSS.0000000000003271 | abs | RCT, 38 resistance-trained men, 8 wk, free weight vs machine |
| Morin 2025 | Morin T et al. 2025. Minimal Role of Hamstring Hypertrophy in Strength Transfer Between Nordic Hamstring and Stiff-Leg Deadlift: A Blinded Randomized Controlled Trial. J Strength Cond Res 39(9):924-932. | 40644669 | 10.1519/JSC.0000000000005159 | abs | RCT, 36 untrained, 9 wk, Nordic vs stiff-leg deadlift |
| Gomirato 2023 | Gomirato AP et al. 2023. Diagnostic Ultrasound Shows Preferential Activation of Rectus Abdominis Segments with Exercises Targeting Upper Versus Lower Segments. Int J Exerc Sci 16(1):1077-1086. | 38288259 | 10.70252/BZWN2771 | full | ACUTE ultrasound study, 15 people; PMC10824285 read |
| Barbalho 2020 (RETRACTED) | Barbalho M et al. 2020. Evidence of a Ceiling Effect for Training Volume in Muscle Hypertrophy and Strength in Trained Men - Less is More?. Int J Sports Physiol Perform 15(2):268-277. | 31188644 | 10.1123/ijspp.2018-0914 | abs | RETRACTED (IJSPP 2020;15(6):914); NOT used as evidence |
| Haun 2018 | Haun CT et al. 2018. Effects of Graded Whey Supplementation During Extreme-Volume Resistance Training. Front Nutr 5:84. | 30255024 | 10.3389/fnut.2018.00084 | abs | 31 resistance-trained men, 6 wk, volume escalated from 10 to 32 sets per exercise per week; lean-mass change corrected for extracellular water |
| Meeusen 2013 | Meeusen R et al. 2013. Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the European College of Sport Science and the American College of Sports Medicine. Med Sci Sports Exerc 45(1):186-205. | 23247672 | 10.1249/MSS.0b013e318279a10a | abs | Consensus statement (ECSS and ACSM) on overtraining syndrome; grade D |
| Ferreira 2017 (Muscle Nerve) | Ferreira DV et al. 2017. Recovery of pectoralis major and triceps brachii after bench press exercise. Muscle Nerve 56(5):963-967. | 28029681 | 10.1002/mus.25541 | abs | 18 resistance-trained men, 8 sets of bench press to failure, pectoralis major vs triceps recovery |
| Ferreira 2017 (JSCR) | Ferreira DV et al. 2017. Chest Press Exercises With Different Stability Requirements Result in Similar Muscle Damage Recovery in Resistance-Trained Men. J Strength Cond Res 31(1):71-79. | 27100318 | 10.1519/JSC.0000000000001453 | abs | 27 resistance-trained men, Smith machine, barbell or dumbbell chest press, 8 x 10RM, to 96 h |
| Belcher 2019 | Belcher DJ et al. 2019. Time course of recovery is similar for the back squat, bench press, and deadlift in well-trained males. Appl Physiol Nutr Metab 44(10):1033-1042. | 30779596 | 10.1139/apnm-2019-0004 | abs | 12 well-trained men (training age 7.1 y), 4 sets to failure at 80% 1RM, squat vs bench press vs deadlift, to 96 h |
| Raastad 2000 | Raastad T et al. 2000. Recovery of skeletal muscle contractility after high- and moderate-intensity strength exercise. Eur J Appl Physiol 82(3):206-14. | 10929214 | 10.1007/s004210050673 | abs | 10 male strength athletes, 90 min of high- vs moderate-intensity leg strength exercise, to 33 h |
| Newton 2008 | Newton MJ et al. 2008. Comparison of responses to strenuous eccentric exercise of the elbow flexors between resistance-trained and untrained men. J Strength Cond Res 22(2):597-607. | 18550979 | 10.1519/JSC.0b013e3181660003 | abs | 15 resistance-trained vs 15 untrained men, 10 sets of 6 maximal eccentrics of the elbow flexors, to 5 days |
| Bartolomei 2021 (recovery) | Bartolomei S et al. 2021. Upper-Body Resistance Exercise Reduces Time to Recover After a High-Volume Bench Press Protocol in Resistance-Trained Men. J Strength Cond Res 35(Suppl 1):S180-S187. | 30844990 | 10.1519/JSC.0000000000002960 | abs | 25 resistance-trained men, 8 x 10 bench press at 70% 1RM, active vs passive recovery, to 48 h |
| Margoni 2025 | Margoni M et al. 2025. Muscle Soreness and Neuromuscular Fatigue After Three Different Resistance Exercise Protocols: Comparison Between Men and Women. J Strength Cond Res 39(6):625-633. | 40267413 | 10.1519/JSC.0000000000005103 | abs | 16 recreationally trained men and women, three protocols, upper vs lower body soreness and peak-force loss, to 72 h |
| Coratella 2025 | Coratella G et al. 2025. Muscle Damage and the Repeated-bout Effect After a Typical Nordic Hamstring Exercise Session. Int J Sports Med 46(10):759-767. | 40280182 | 10.1055/a-2595-3622 | abs | 13 trained men, 24 Nordic hamstring repetitions, repeated bout 4 weeks later, to 4 days |

**Non-PubMed sources (how opened).**

* Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. Preprint v2, SportRxiv, 4 Oct 2024, doi 10.51224/SRXIV.460: full text read (PDF), identical abstract to the published version.
* Remmert JF, Pelland JC, Robinson ZP, Hinson SR, Zourdos MC. "Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength". Preprint v1, SportRxiv, 2 Apr 2025, doi 10.51224/SRXIV.537: full text read (PDF). Not found in PubMed; treated as unreviewed.
* Renaissance Periodization (RP), rpstrength.com, opened through the web-fetch tool (small-model extraction of the live pages, not raw text): "Training Volume Landmarks for Muscle Growth" (4 Jan 2017), muscle guides for chest, triceps, quads, hamstrings, biceps, side delts, calves, front delts, traps, abs, glutes, rear delts (the back table was illegible), and "Your Training Split Doesn't Matter" (18 Mar 2025, credited to Trevor). Grade D. Guide dates: hamstrings and back 29 Dec 2023; biceps 31 Dec 2023; chest, triceps, quads, side delts, glutes, rear delts, traps and front delts 3 Jan 2024; calves 4 Jan 2024; abs through a search-result summary only. No hours-per-muscle recovery table was found on these pages; seven guides (triceps, quads, side delts, calves, glutes, traps, front delts) carry one sentence, "fatigue will take between 1-2 days to come back down enough to restore or improve on past performance", in the same wording; the extraction found no such sentence in the other guides.
* Renaissance Periodization podcast page "Training Frequency Decoded: The 11-Set Rule Every Lifter Should Know", rpstrength.com, 27 Apr 2026, Dr Milo Wolf: web-fetch extraction. It states that more than about 10 to 11 sets per muscle in one workout "doesn't reliably produce additional growth", frames it as diminishing returns rather than a limit, gives "72-96 hour recovery window between sessions for the same movement pattern" and cites no study for the 11-set figure. Grade D.
* Korak JA, Green JM, O'Neal EK. "Resistance Training Recovery: Considerations for Single vs. Multi-joint Movements and Upper vs. Lower Body Muscles". Int J Exerc Sci 2015;8(1):85-96. doi 10.70252/PNGM5741; https://digitalcommons.wku.edu/ijes/vol8/iss1/10. Not found in PubMed (searches by author and by title). Only the abstract on the journal's repository page was read (the full-text PDF returned HTTP 403). Grade B, n = 10.
* arvo.guru blog page "How Long Does Each Muscle Actually Need to Recover? (And Why Your App Gets It Wrong)" (https://arvo.guru/blog/muscle-recovery-windows-evidence): web-fetch extraction. A commercial app's page; gives biceps about 36 h and back about 72 h; says the windows combine studies with "practitioner consensus"; links no number to a paper. Not used as evidence; cited only to say where the popular figures come from. Grade D.
* Repo documents read: `docs/RESEARCH_FINDINGS_SYNTHESISED.md`, `docs/VOLYUME_RESEARCH_BRIEF.md`, `docs/recovery-programme-2026-09-25/00-SPEC.md` and `14-PERSONAL-LEARNING-V2.md`, `docs/exercise-planning-2026-07-09/plan-B-weak-point-sets.md`, `docs/plan-generation-campaign-16/DIVISION-EVIDENCE-REGISTER.md`, `src/lib/recovery/constants.js`, `muscleRecoveryModel.js`, `sequenceSessions.js`, `personalRecovery.js` (header), `src/lib/planEngine.js` (header, caps, session builder, generator landmark overrides at 302-318), `src/lib/algorithms.js` (landmarks and `getVolumeStatus`), `src/lib/coachGlossary.js` (the volume-band glossary lines), `src/lib/mesocycle.js` (ramp).

## Appendix B. Probes and arithmetic (my computation, not literature)

Four small Python scripts, kept outside the repo in the session scratchpad, produced the probe, calibration and recovery-percent numbers in this report (other INF figures are plain arithmetic shown where they appear). They import nothing from the repo and are reproduced below with their outputs so any of those figures can be re-derived. The recovery constants they copy come from `src/lib/recovery/constants.js:68-130, 242-268, 385` (read, not changed).

**B1. Rotation probe (Q6d, F7).** Method: each session template is a list of standard exercises with muscle credits (direct 1.0, synergist 0.5; the hinge credits the back 0.5, the squat credits glutes and adductors 0.5). A muscle is "exposed" in a session when it gets 2 or more direct sets or 6 or more fractional sets. The clock for an exposure is `BASE[m] * clamp(0.7, 1.5, sqrt(F/6))` at neutral effort (the repo's own D201 hours). For every rotation the next exposure of each muscle is found in cyclic order, wrap included, and the hours available are summed under three spacings (24 h per slot, the repo's typical-week gaps, an even 168/N), less one hour for the session. Shortfall is `max(0, 1 - H/T)`, weighted by the dose of the later session (`clamp(F/6, 0.25, 2)`), and penalty is `sum w * (0.5 S_b2b^2 + 0.35 S_typ^2 + 0.15 S_even^2)`. With the first session fixed there are at most 120 orders (N = 6). What it cannot show: the templates are my choices, the clocks are unvalidated conventions, and the scenario weights are CONV; the ranking of orders held under a 25% clock error (listed per family below), the absolute penalties did not. Turning off the hinge-to-back credit (`--noback`) changes only the two full-body base scores (0.773 to 0.714 and 0.723 to 0.663).
**B1 output (all template families; penalty lower is better)**

```
====================================================================================================
N=2  FB x2 (mirrored emphasis)
  listed order ['FB-A', 'FB-B']: penalty 0.773
  BEST  ['FB-A', 'FB-B']: penalty 0.773
  WORST ['FB-A', 'FB-B']: penalty 0.773
  # orders tying best: 1 of 1
  clock x0.75: best ['FB-A', 'FB-B'] penalty 0.411  (same order as base best: True)
  clock x1.25: best ['FB-A', 'FB-B'] penalty 1.057  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:1/0.61, hamstrings:1/0.61, back:1/0.62, chest:1/0.53, side_delts:2/0.00, front_delts:2/0.00, calves:2/0.00, abs:2/0.00
====================================================================================================
N=2  Upper/Lower
  listed order ['Upper', 'Lower']: penalty 0.231
  BEST  ['Upper', 'Lower']: penalty 0.231
  WORST ['Upper', 'Lower']: penalty 0.231
  # orders tying best: 1 of 1
  clock x0.75: best ['Upper', 'Lower'] penalty 0.045  (same order as base best: True)
  clock x1.25: best ['Upper', 'Lower'] penalty 0.510  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:2/0.40, hamstrings:2/0.40, back:2/0.27, chest:2/0.04, triceps:2/0.06, biceps:2/0.06, side_delts:2/0.00, front_delts:2/0.00, calves:2/0.00, abs:2/0.00
====================================================================================================
N=3  PPL
  listed order ['Push', 'Pull', 'Legs']: penalty 0.005
  BEST  ['Push', 'Pull', 'Legs']: penalty 0.005
  WORST ['Push', 'Legs', 'Pull']: penalty 0.005
  # orders tying best: 2 of 2
  clock x0.75: best ['Push', 'Pull', 'Legs'] penalty 0.000  (same order as base best: True)
  clock x1.25: best ['Push', 'Pull', 'Legs'] penalty 0.095  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:3/0.09, hamstrings:3/0.01, back:3/0.00, chest:3/0.00, triceps:3/0.00, biceps:3/0.00, side_delts:3/0.00, front_delts:3/0.00, rear_delts:3/0.00, traps:3/0.00, calves:3/0.00, abs:3/0.00
====================================================================================================
N=3  FB x3 (rotating emphasis)
  listed order ['FB-A', 'FB-B', 'FB-C']: penalty 0.737
  BEST  ['FB-A', 'FB-C', 'FB-B']: penalty 0.723
  WORST ['FB-A', 'FB-B', 'FB-C']: penalty 0.737
  # orders tying best: 1 of 2
  clock x0.75: best ['FB-A', 'FB-C', 'FB-B'] penalty 0.351  (same order as base best: True)
  clock x1.25: best ['FB-A', 'FB-C', 'FB-B'] penalty 1.091  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:1/0.65, hamstrings:3/0.00, glutes:3/0.00, back:1/0.62, chest:1/0.53, triceps:3/0.00, biceps:1/0.37, side_delts:3/0.00, front_delts:3/0.00, calves:3/0.00, abs:3/0.00
====================================================================================================
N=4  Upper/Lower x2
  listed order ['U1', 'L1', 'U2', 'L2']: penalty 0.111
  BEST  ['U1', 'L1', 'U2', 'L2']: penalty 0.111
  WORST ['U1', 'U2', 'L1', 'L2']: penalty 0.925
  # orders tying best: 1 of 6
  clock x0.75: best ['U1', 'L1', 'U2', 'L2'] penalty 0.017  (same order as base best: True)
  clock x1.25: best ['U1', 'L1', 'U2', 'L2'] penalty 0.339  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:2/0.40, hamstrings:2/0.35, back:2/0.04, chest:2/0.04, triceps:4/0.00, biceps:4/0.00, side_delts:4/0.00, front_delts:4/0.00, calves:2/0.00, abs:4/0.00
====================================================================================================
N=4  Push/Pull/Legs/Arms+Delts
  listed order ['Push', 'Pull', 'Legs', 'ArmsDelts']: penalty 0.148
  BEST  ['Push', 'Pull', 'ArmsDelts', 'Legs']: penalty 0.061
  WORST ['Push', 'ArmsDelts', 'Pull', 'Legs']: penalty 0.291
  # orders tying best: 1 of 6
  clock x0.75: best ['Push', 'Legs', 'ArmsDelts', 'Pull'] penalty 0.007  (same order as base best: False)
  clock x1.25: best ['Push', 'Pull', 'ArmsDelts', 'Legs'] penalty 0.151  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:4/0.00, hamstrings:4/0.00, back:4/0.00, chest:4/0.00, triceps:2/0.09, biceps:4/0.00, side_delts:4/0.00, front_delts:4/0.00, rear_delts:1/0.48, traps:4/0.00, calves:4/0.00, abs:4/0.00
====================================================================================================
N=4  PPL+ArmsDelts (rear delts only in Pull)
  listed order ['Push', 'Pull', 'Legs', 'ArmsDelts']: penalty 0.148
  BEST  ['Push', 'Pull', 'ArmsDelts', 'Legs']: penalty 0.004
  WORST ['Push', 'ArmsDelts', 'Legs', 'Pull']: penalty 0.247
  # orders tying best: 2 of 6
  clock x0.75: best ['Push', 'Pull', 'ArmsDelts', 'Legs'] penalty 0.000  (same order as base best: True)
  clock x1.25: best ['Push', 'Pull', 'ArmsDelts', 'Legs'] penalty 0.058  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:4/0.00, hamstrings:4/0.00, back:4/0.00, chest:4/0.00, triceps:2/0.09, biceps:4/0.00, side_delts:4/0.00, front_delts:4/0.00, rear_delts:4/0.00, traps:4/0.00, calves:4/0.00, abs:4/0.00
====================================================================================================
N=5  Push/Pull/Legs + Upper/Lower
  listed order ['Push', 'Pull', 'Legs', 'Upper', 'Lower']: penalty 0.219
  BEST  ['Push', 'Legs', 'Upper', 'Lower', 'Pull']: penalty 0.204
  WORST ['Push', 'Upper', 'Pull', 'Legs', 'Lower']: penalty 1.812
  # orders tying best: 1 of 24
  clock x0.75: best ['Push', 'Legs', 'Upper', 'Lower', 'Pull'] penalty 0.038  (same order as base best: True)
  clock x1.25: best ['Push', 'Legs', 'Upper', 'Lower', 'Pull'] penalty 0.555  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:2/0.40, hamstrings:2/0.08, back:2/0.00, chest:2/0.27, triceps:2/0.06, biceps:2/0.00, side_delts:2/0.00, front_delts:5/0.00, rear_delts:5/0.00, calves:2/0.00, abs:5/0.00
====================================================================================================
N=5  5-day body-part (disjoint direct groups)
  listed order ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes']: penalty 0.000
  BEST  ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes']: penalty 0.000
  WORST ['Chest+Tri', 'Hams+Glutes', 'Shoulders+Abs', 'Quads+Calves', 'Back+Bi']: penalty 0.000
  # orders tying best: 24 of 24
  clock x0.75: best ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes'] penalty 0.000  (same order as base best: True)
  clock x1.25: best ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes'] penalty 0.000  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:5/0.00, hamstrings:5/0.00, glutes:5/0.00, back:5/0.00, chest:5/0.00, triceps:5/0.00, biceps:5/0.00, side_delts:5/0.00, front_delts:5/0.00, rear_delts:5/0.00, traps:5/0.00, calves:5/0.00, abs:5/0.00
====================================================================================================
N=6  PPL x2
  listed order ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2']: penalty 0.003
  BEST  ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2']: penalty 0.003
  WORST ['Push1', 'Push2', 'Pull2', 'Pull1', 'Legs1', 'Legs2']: penalty 2.525
  # orders tying best: 4 of 120
  clock x0.75: best ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2'] penalty 0.000  (same order as base best: True)
  clock x1.25: best ['Push1', 'Legs1', 'Pull2', 'Push2', 'Legs2', 'Pull1'] penalty 0.084  (same order as base best: False)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:3/0.09, hamstrings:3/0.01, glutes:6/0.00, back:3/0.00, chest:3/0.00, triceps:3/0.00, biceps:3/0.00, side_delts:3/0.00, front_delts:3/0.00, rear_delts:3/0.00, traps:6/0.00, calves:3/0.00, abs:6/0.00
====================================================================================================
N=6  Upper/Lower x3
  listed order ['U1', 'L1', 'U2', 'L2', 'U3', 'L3']: penalty 0.046
  BEST  ['U1', 'L1', 'U2', 'L3', 'U3', 'L2']: penalty 0.040
  WORST ['U1', 'U3', 'U2', 'L3', 'L1', 'L2']: penalty 1.496
  # orders tying best: 4 of 120
  clock x0.75: best ['U1', 'L1', 'U2', 'L2', 'U3', 'L3'] penalty 0.000  (same order as base best: True)
  clock x1.25: best ['U1', 'L1', 'U2', 'L3', 'U3', 'L2'] penalty 0.313  (same order as base best: True)
  min exposure distance d (sessions) in BEST order / worst b2b shortfall:
   quads:2/0.20, hamstrings:2/0.20, glutes:6/0.00, back:2/0.04, chest:2/0.04, triceps:2/0.00, biceps:2/0.00, side_delts:6/0.00, front_delts:6/0.00, rear_delts:6/0.00, calves:2/0.00, abs:6/0.00
```

**B2. Sensitivity to the lower-body and arm clocks (Q5b).** Same probe with only quads, hamstrings, glutes and adductors scaled by 0.6 (about the measured-implied value of Q5b Table 2), and separately biceps and triceps scaled by 0.67.

**B2 output**

```
N=2 FB x2 (mirrored emphasis)
   base   best ['FB-A', 'FB-B'] 0.773  worst 0.773
   lowerx0.6 best ['FB-A', 'FB-B'] 0.489  worst 0.489   same best order: True
   armsx0.67 best ['FB-A', 'FB-B'] 0.773  worst 0.773   same best order: True
N=2 Upper/Lower
   base   best ['Upper', 'Lower'] 0.231  worst 0.231
   lowerx0.6 best ['Upper', 'Lower'] 0.048  worst 0.048   same best order: True
   armsx0.67 best ['Upper', 'Lower'] 0.227  worst 0.227   same best order: True
N=3 PPL
   base   best ['Push', 'Pull', 'Legs'] 0.005  worst 0.005
   lowerx0.6 best ['Push', 'Pull', 'Legs'] 0.000  worst 0.000   same best order: True
   armsx0.67 best ['Push', 'Pull', 'Legs'] 0.005  worst 0.005   same best order: True
N=3 FB x3 (rotating emphasis)
   base   best ['FB-A', 'FB-C', 'FB-B'] 0.723  worst 0.737
   lowerx0.6 best ['FB-A', 'FB-C', 'FB-B'] 0.484  worst 0.498   same best order: True
   armsx0.67 best ['FB-A', 'FB-C', 'FB-B'] 0.672  worst 0.688   same best order: True
N=4 Upper/Lower x2
   base   best ['U1', 'L1', 'U2', 'L2'] 0.111  worst 0.925
   lowerx0.6 best ['U1', 'L1', 'U2', 'L2'] 0.002  worst 0.541   same best order: True
   armsx0.67 best ['U1', 'L1', 'U2', 'L2'] 0.111  worst 0.925   same best order: True
N=4 Push/Pull/Legs/Arms+Delts
   base   best ['Push', 'Pull', 'ArmsDelts', 'Legs'] 0.061  worst 0.291
   lowerx0.6 best ['Push', 'Pull', 'ArmsDelts', 'Legs'] 0.061  worst 0.291   same best order: True
   armsx0.67 best ['Push', 'Pull', 'Legs', 'ArmsDelts'] 0.037  worst 0.134   same best order: False
N=4 PPL+ArmsDelts (rear delts only in Pull)
   base   best ['Push', 'Pull', 'ArmsDelts', 'Legs'] 0.004  worst 0.247
   lowerx0.6 best ['Push', 'Pull', 'ArmsDelts', 'Legs'] 0.004  worst 0.247   same best order: True
   armsx0.67 best ['Push', 'Pull', 'ArmsDelts', 'Legs'] 0.000  worst 0.089   same best order: True
N=5 Push/Pull/Legs + Upper/Lower
   base   best ['Push', 'Legs', 'Upper', 'Lower', 'Pull'] 0.204  worst 1.812
   lowerx0.6 best ['Push', 'Legs', 'Upper', 'Lower', 'Pull'] 0.035  worst 1.354   same best order: True
   armsx0.67 best ['Push', 'Legs', 'Upper', 'Lower', 'Pull'] 0.201  worst 1.453   same best order: True
N=5 5-day body-part (disjoint direct groups)
   base   best ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes'] 0.000  worst 0.000
   lowerx0.6 best ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes'] 0.000  worst 0.000   same best order: True
   armsx0.67 best ['Chest+Tri', 'Back+Bi', 'Quads+Calves', 'Shoulders+Abs', 'Hams+Glutes'] 0.000  worst 0.000   same best order: True
N=6 PPL x2
   base   best ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2'] 0.003  worst 2.525
   lowerx0.6 best ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2'] 0.000  worst 2.114   same best order: True
   armsx0.67 best ['Push1', 'Pull1', 'Legs1', 'Push2', 'Pull2', 'Legs2'] 0.003  worst 2.097   same best order: True
N=6 Upper/Lower x3
   base   best ['U1', 'L1', 'U2', 'L3', 'U3', 'L2'] 0.040  worst 1.496
   lowerx0.6 best ['U1', 'L1', 'U2', 'L2', 'U3', 'L3'] 0.002  worst 0.947   same best order: False
   armsx0.67 best ['U1', 'L1', 'U2', 'L3', 'U3', 'L2'] 0.040  worst 1.237   same best order: True
```

**B3. Model check against measured anchors and per-muscle clock tables (Q5b Tables 2 and 3, F5).** "Implied B" divides the measured time by the dose factor and the effort factor (F5 factor 1.25 for failure, or the repo's 1.15); "repo-style" and "F5" are the model's predictions at the anchor dose with the repo's base hours.

**B3 output**

```
anchor | B repo | F | RIR | T_obs(h) | implied B (F5 prox) | implied B (repo prox) | repo-style pred | F5 pred
Chest, 8 bench sets to failure (Ferreira 2017 x2) | 60 | 8.0 | 0 | 72-96 | 50-67 | 54-72 | 80 | 87   # PT 72-96 h; work not back at 96 h
Triceps, same session (indirect 0.5 x 8 = 4) | 48 | 4.0 | 0 | 48-72 | 47-71 | 51-77 | 45 | 49   # work down at 48 h; force back immediately
Elbow flexors, 8 preacher-curl sets at 10RM (Soares 2015) | 48 | 8.0 | 0 | 24-48 | 17-33 | 18-36 | 64 | 69   # force -8.4% at 24 h; soreness to 72 h
Elbow flexors, 8 row sets at 10RM, indirect (0.5 x 8 = 4) | 48 | 4.0 | 0 | 0-24 | 0-24 | 0-26 | 45 | 49   # force back at 24 h; soreness gone by 72 h
Quads, 5 squat + 5 leg-press sets to failure (Goulart 2021) | 72 | 10.0 | 0 | 48-72 | 30-45 | 32-48 | 107 | 116   # first-set volume down at 48 h; strength above baseline at 72 h

muscle | F3 RIR2 | F6 RIR2 | F9 RIR2 | F12 RIR2 | F6 RIR0 | F6 RIR1 | F6 RIR3 | F9 RIR3 | F9 RIR0
quads | 51 | 72 | 88 | 102 | 90 | 79 | 58 | 71 | 110
hamstrings | 51 | 72 | 88 | 102 | 90 | 79 | 58 | 71 | 110
glutes | 51 | 72 | 88 | 102 | 90 | 79 | 58 | 71 | 110
adductors | 42 | 60 | 73 | 85 | 75 | 66 | 48 | 59 | 92
back | 42 | 60 | 73 | 85 | 75 | 66 | 48 | 59 | 92
chest | 42 | 60 | 73 | 85 | 75 | 66 | 48 | 59 | 92
triceps | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
biceps | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
side_delts | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
front_delts | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
rear_delts | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
traps | 34 | 48 | 59 | 68 | 60 | 53 | 38 | 47 | 73
forearms | 25 | 36 | 44 | 51 | 45 | 40 | 29 | 35 | 55
calves | 25 | 36 | 44 | 51 | 45 | 40 | 29 | 35 | 55
abs | 25 | 36 | 44 | 51 | 45 | 40 | 29 | 35 | 55
neck | 25 | 36 | 44 | 51 | 45 | 40 | 29 | 35 | 55
tibialis | 25 | 36 | 44 | 51 | 45 | 40 | 29 | 35 | 55

biceps 9 per session RIR2: f_dose 1.225 (raw sqrt 1.225) T 58.8 h  (unclamped 58.8)  band 44-73
biceps 9 per session RIR3: f_dose 1.225 (raw sqrt 1.225) T 47.0 h  (unclamped 47.0)  band 35-59
biceps 9 per session RIR1: f_dose 1.225 (raw sqrt 1.225) T 64.7 h  (unclamped 64.7)  band 48-81
biceps 9 per session RIR0: f_dose 1.225 (raw sqrt 1.225) T 73.5 h  (unclamped 73.5)  band 55-92
biceps 7 per session RIR2: f_dose 1.080 (raw sqrt 1.080) T 51.8 h  (unclamped 51.8)  band 39-65
biceps 7 per session RIR3: f_dose 1.080 (raw sqrt 1.080) T 41.5 h  (unclamped 41.5)  band 31-52
biceps 13.5 per session RIR2: f_dose 1.500 (raw sqrt 1.500) T 72.0 h  (unclamped 72.0)  band 54-90
biceps 27 in one session RIR2: f_dose 1.500 (raw sqrt 2.121) T 72.0 h  (unclamped 101.8)  band 54-90
biceps 27 in one session RIR3: f_dose 1.500 (raw sqrt 2.121) T 57.6 h  (unclamped 81.5)  band 43-72
biceps 6 per session RIR2 (x4=24): f_dose 1.000 (raw sqrt 1.000) T 48.0 h  (unclamped 48.0)  band 36-60
biceps 4.5 per session RIR2: f_dose 0.866 (raw sqrt 0.866) T 41.6 h  (unclamped 41.6)  band 31-52
back 8 per session RIR2 multi-joint: T 58.9 h band 44-74
back 8 RIR2 isolation-equivalent: T 69.3 h band 52-87
back 6 RIR2 multi-joint: T 51.0 h band 38-64
back 6 RIR3 multi-joint: T 40.8 h band 31-51
back 10 RIR1 multi-joint: T 72.4 h band 54-91
```

**B4. Recovery percent for repeating biceps sessions (Q8b).** A reproduction of the repo's residual and percent arithmetic (`muscleRecoveryModel.js:107-140, 188-194`) with F5 clocks; the percent is read just before each next session, in the last of six cycles.

**B4 output**

```
biceps 3x9 even 56 RIR0: T=73.5h  recovered% before next sessions (last cycle): [80.8, 80.8, 80.8]
biceps 3x9 even 56 RIR1: T=64.7h  recovered% before next sessions (last cycle): [88.2, 88.2, 88.2]
biceps 3x9 even 56 RIR2: T=58.8h  recovered% before next sessions (last cycle): [95.5, 95.5, 95.5]
biceps 3x9 even 56 RIR3: T=47.0h  recovered% before next sessions (last cycle): [100.0, 100.0, 100.0]
biceps 3x9 typical 48/48/72 RIR0: T=73.5h  recovered% before next sessions (last cycle): [66.0, 74.2, 98.5]
biceps 3x9 typical 48/48/72 RIR1: T=64.7h  recovered% before next sessions (last cycle): [74.2, 79.5, 100.0]
biceps 3x9 typical 48/48/72 RIR2: T=58.8h  recovered% before next sessions (last cycle): [81.6, 84.5, 100.0]
biceps 3x9 typical 48/48/72 RIR3: T=47.0h  recovered% before next sessions (last cycle): [100.0, 100.0, 100.0]
biceps 4x7 typical 24/48/24/72 RIR0: T=64.8h  recovered% before next sessions (last cycle): [37.0, 84.1, 50.0, 100.0]
biceps 4x7 typical 24/48/24/72 RIR1: T=57.0h  recovered% before next sessions (last cycle): [42.1, 90.0, 50.0, 100.0]
biceps 4x7 typical 24/48/24/72 RIR2: T=51.8h  recovered% before next sessions (last cycle): [46.3, 95.2, 50.0, 100.0]
biceps 4x7 typical 24/48/24/72 RIR3: T=41.5h  recovered% before next sessions (last cycle): [57.9, 100.0, 57.9, 100.0]
biceps 4x7 even 42 RIR0: T=64.8h  recovered% before next sessions (last cycle): [74.0, 74.0, 74.0, 74.0]
biceps 4x7 even 42 RIR1: T=57.0h  recovered% before next sessions (last cycle): [79.1, 79.1, 79.1, 79.1]
biceps 4x7 even 42 RIR2: T=51.8h  recovered% before next sessions (last cycle): [84.0, 84.0, 84.0, 84.0]
biceps 4x7 even 42 RIR3: T=41.5h  recovered% before next sessions (last cycle): [100.0, 100.0, 100.0, 100.0]
biceps 2x13.5 even 84 RIR0: T=90.0h  recovered% before next sessions (last cycle): [93.8, 93.8]
biceps 2x13.5 even 84 RIR1: T=79.2h  recovered% before next sessions (last cycle): [100.0, 100.0]
biceps 2x13.5 even 84 RIR2: T=72.0h  recovered% before next sessions (last cycle): [100.0, 100.0]
biceps 2x13.5 even 84 RIR3: T=57.6h  recovered% before next sessions (last cycle): [100.0, 100.0]
```

**B5. The scripts.**

`rotation_probe.py (B1)`

```python
#!/usr/bin/env python3
"""
Scratch probe for D219 lane S (NOT repo code, NOT evidence): scores fixed rotations of session templates
against per-muscle recovery clocks when calendar spacing is unknown.
Recovery clock T(m, sets) = BASE[m] * dose(sets) (the repo's own D201 constants, copied for the probe),
neutral RIR/rating. Spacing scenarios: B2B (24 h start-to-start), TYP (repo TYPICAL_WEEK_GAP_HOURS), EVEN (168/N).
"""
import itertools, math, sys, json

BASE = {'quads':72,'hamstrings':72,'glutes':72,'adductors':60,'back':60,'chest':60,'triceps':48,'biceps':48,
        'side_delts':48,'front_delts':48,'rear_delts':48,'traps':48,'forearms':36,'calves':36,'abs':36}
REF = 6
def dose(s): return min(1.5, max(0.7, math.sqrt(s/REF)))
def T(m, s, scale=1.0): return min(168, max(24, BASE[m]*dose(s)))*scale

TYP = {1:[168],2:[72,96],3:[48,48,72],4:[24,48,24,72],5:[24,24,24,24,72],6:[24,24,24,24,24,48]}
SESSION_H = 1.0   # session length convention (hours) between "end" and next "start"
QUAL = 2.0        # a session 'loads' a muscle directly when it gives >= 2 DIRECT sets
INDIRECT_ONLY_EXPOSURE = 6.0   # or when indirect credit alone reaches 6 fractional sets (= 12 compound sets)

EX = {
 'squat':{'quads':1,'glutes':.5,'adductors':.5},'leg_press':{'quads':1,'glutes':.5},'leg_ext':{'quads':1},
 'rdl':{'hamstrings':1,'glutes':.5,'back':.5},'leg_curl':{'hamstrings':1},'hip_thrust':{'glutes':1},
 'calf':{'calves':1},'bench':{'chest':1,'front_delts':.5,'triceps':.5},'incline':{'chest':1,'front_delts':.5,'triceps':.5},
 'fly':{'chest':1},'ohp':{'front_delts':1,'side_delts':.5,'triceps':.5},'lat_raise':{'side_delts':1},
 'pushdown':{'triceps':1},'oh_ext':{'triceps':1},'pulldown':{'back':1,'biceps':.5},
 'row':{'back':1,'rear_delts':.5,'biceps':.5,'traps':.5},'face_pull':{'rear_delts':1,'traps':.5},
 'shrug':{'traps':1},'curl':{'biceps':1},'crunch':{'abs':1},
}
def sess(name, lst, no_back_from_rdl=False):
    d = {}
    for ex, n in lst:
        cr = dict(EX[ex])
        if no_back_from_rdl and ex == 'rdl': cr.pop('back', None)
        for m, c in cr.items():
            dd, ii = d.get(m, (0.0, 0.0))
            if c >= 1: dd += n
            else: ii += c*n
            d[m] = (dd, ii)
    return (name, d)

def families(no_back=False):
    s = lambda n, l: sess(n, l, no_back)
    F = {}
    F[2] = {
     'FB x2 (mirrored emphasis)': [s('FB-A',[('squat',4),('bench',4),('row',3),('leg_curl',3),('lat_raise',3),('crunch',3)]),
                                  s('FB-B',[('rdl',4),('incline',4),('pulldown',4),('ohp',3),('leg_ext',3),('calf',3)])],
     'Upper/Lower': [s('Upper',[('bench',4),('row',4),('ohp',3),('pulldown',3),('lat_raise',3),('curl',3),('pushdown',3)]),
                     s('Lower',[('squat',4),('rdl',4),('leg_press',3),('leg_curl',3),('calf',4),('crunch',3)])],
    }
    F[3] = {
     'PPL': [s('Push',[('bench',4),('incline',3),('ohp',3),('lat_raise',3),('pushdown',3)]),
             s('Pull',[('pulldown',4),('row',4),('face_pull',3),('curl',3),('shrug',2)]),
             s('Legs',[('squat',4),('rdl',3),('leg_press',3),('leg_curl',3),('calf',4),('crunch',3)])],
     'FB x3 (rotating emphasis)': [
             s('FB-A',[('squat',5),('bench',4),('row',3),('curl',2),('crunch',3)]),
             s('FB-B',[('rdl',4),('leg_ext',3),('pulldown',4),('ohp',3),('pushdown',3),('calf',3)]),
             s('FB-C',[('leg_press',3),('hip_thrust',3),('incline',4),('row',3),('lat_raise',4),('curl',3)])],
    }
    F[4] = {
     'Upper/Lower x2': [s('U1',[('bench',4),('row',4),('ohp',3),('curl',3)]),
                        s('L1',[('squat',4),('rdl',3),('leg_curl',3),('calf',3)]),
                        s('U2',[('incline',4),('pulldown',4),('lat_raise',4),('pushdown',3)]),
                        s('L2',[('leg_press',4),('rdl',3),('leg_ext',3),('calf',3),('crunch',3)])],
     'Push/Pull/Legs/Arms+Delts': [
                        s('Push',[('bench',4),('incline',4),('fly',3),('oh_ext',3)]),
                        s('Pull',[('pulldown',4),('row',4),('face_pull',3),('shrug',2)]),
                        s('Legs',[('squat',4),('rdl',4),('leg_press',3),('leg_curl',3),('calf',4),('crunch',3)]),
                        s('ArmsDelts',[('ohp',3),('lat_raise',4),('curl',4),('pushdown',4),('face_pull',3)])],
    }
    F[4]['PPL+ArmsDelts (rear delts only in Pull)'] = [
                        s('Push',[('bench',4),('incline',4),('fly',3),('oh_ext',3)]),
                        s('Pull',[('pulldown',4),('row',4),('face_pull',4),('shrug',2)]),
                        s('Legs',[('squat',4),('rdl',4),('leg_press',3),('leg_curl',3),('calf',4),('crunch',3)]),
                        s('ArmsDelts',[('ohp',3),('lat_raise',4),('curl',4),('pushdown',4)])]
    F[5] = {
     'Push/Pull/Legs + Upper/Lower': [
                        s('Push',[('bench',4),('incline',3),('lat_raise',3),('pushdown',3)]),
                        s('Pull',[('pulldown',4),('row',4),('face_pull',3),('curl',3)]),
                        s('Legs',[('squat',4),('rdl',3),('leg_press',3),('calf',3),('crunch',3)]),
                        s('Upper',[('ohp',3),('incline',3),('row',3),('lat_raise',3),('oh_ext',3),('curl',3)]),
                        s('Lower',[('leg_press',4),('rdl',3),('leg_curl',3),('leg_ext',3),('calf',3)])],
     '5-day body-part (disjoint direct groups)': [
                        s('Chest+Tri',[('bench',4),('incline',3),('fly',3),('pushdown',3),('oh_ext',3)]),
                        s('Back+Bi',[('pulldown',4),('row',4),('face_pull',3),('curl',4)]),
                        s('Quads+Calves',[('squat',4),('leg_press',3),('leg_ext',3),('calf',4)]),
                        s('Shoulders+Abs',[('ohp',4),('lat_raise',4),('shrug',3),('crunch',3)]),
                        s('Hams+Glutes',[('rdl',4),('leg_curl',3),('hip_thrust',3)])],
    }
    F[6] = {
     'PPL x2': [s('Push1',[('bench',4),('ohp',3),('lat_raise',3),('pushdown',3)]),
                s('Pull1',[('pulldown',4),('row',4),('face_pull',3),('curl',3)]),
                s('Legs1',[('squat',4),('rdl',3),('leg_curl',3),('calf',3),('crunch',3)]),
                s('Push2',[('incline',4),('ohp',3),('lat_raise',4),('oh_ext',3)]),
                s('Pull2',[('row',4),('pulldown',3),('face_pull',3),('curl',3),('shrug',2)]),
                s('Legs2',[('leg_press',4),('rdl',3),('leg_ext',3),('calf',3),('hip_thrust',3)])],
     'Upper/Lower x3': [s('U1',[('bench',4),('row',4),('curl',3)]),
                        s('L1',[('squat',4),('leg_curl',3),('calf',3)]),
                        s('U2',[('ohp',3),('pulldown',4),('pushdown',3),('lat_raise',3)]),
                        s('L2',[('rdl',4),('leg_press',3),('crunch',3)]),
                        s('U3',[('incline',4),('row',3),('face_pull',3),('curl',3),('oh_ext',3)]),
                        s('L3',[('leg_ext',3),('hip_thrust',3),('leg_curl',3),('calf',4)])],
    }
    return F

def gaps(N, mode):
    if mode == 'B2B': return [24.0]*N
    if mode == 'EVEN': return [168.0/N]*N
    return [float(x) for x in TYP[N]]

def analyse(order, scale=1.0, alpha=(0.5,0.35,0.15)):
    """order: list of (name, loads). Returns penalty, per-muscle min d, details."""
    N = len(order)
    pen = 0.0; dmin = {}; worst = {}
    for m in BASE:
        tot = lambda l, m: (l[m][0] + l[m][1]) if m in l else 0.0
        dire = lambda l, m: l[m][0] if m in l else 0.0
        idx = [i for i,(n,l) in enumerate(order) if (dire(l,m) >= QUAL or tot(l,m) >= INDIRECT_ONLY_EXPOSURE)]
        if not idx: continue
        for a in idx:
            nxt = None
            for step in range(1, N+1):
                j = (a+step) % N
                if j in idx: nxt = j; d = step; break
            Tm = T(m, tot(order[a][1], m), scale)
            hs = {}
            for mode in ('B2B','TYP','EVEN'):
                g = gaps(N, mode)
                H = sum(g[(a+k) % N] for k in range(d)) - SESSION_H
                hs[mode] = H
            sh = {k: max(0.0, 1 - hs[k]/Tm) for k in hs}
            # weight by the dose the LATER session walks in with (needs to be recovered for it)
            wt = min(2.0, max(0.25, tot(order[nxt][1], m)/REF))
            pen += wt*(alpha[0]*sh['B2B']**2 + alpha[1]*sh['TYP']**2 + alpha[2]*sh['EVEN']**2)
            dmin[m] = min(dmin.get(m, 99), d)
            worst[m] = max(worst.get(m, 0.0), sh['B2B'])
    return pen, dmin, worst

def best_orders(sessions, scale=1.0):
    N = len(sessions)
    first = sessions[0]
    res = []
    for perm in itertools.permutations(sessions[1:]):
        order = [first] + list(perm)
        p, dm, w = analyse(order, scale)
        res.append((p, [n for n,_ in order], dm, w))
    res.sort(key=lambda r: r[0])
    return res

if __name__ == '__main__':
    no_back = '--noback' in sys.argv
    for N, fam in families(no_back).items():
        for fname, sessions in fam.items():
            listing_order = [n for n,_ in sessions]
            base_pen, base_dm, base_w = analyse(sessions)
            res = best_orders(sessions)
            best, worst = res[0], res[-1]
            print('='*100)
            print(f'N={N}  {fname}')
            print(f'  listed order {listing_order}: penalty {base_pen:.3f}')
            print(f'  BEST  {best[1]}: penalty {best[0]:.3f}')
            print(f'  WORST {worst[1]}: penalty {worst[0]:.3f}')
            ties = [r[1] for r in res if abs(r[0]-best[0]) < 1e-9]
            print(f'  # orders tying best: {len(ties)} of {len(res)}')
            # sensitivity: does the best order change if clocks are scaled
            for sc in (0.75, 1.25):
                rr = best_orders(sessions, sc)
                same = abs(rr[0][0] - [r for r in rr if r[1]==best[1]][0][0]) < 1e-9
                print(f'  clock x{sc}: best {rr[0][1]} penalty {rr[0][0]:.3f}  (same order as base best: {same})')
            dm = best[2]; w = best[3]
            print('  min exposure distance d (sessions) in BEST order / worst b2b shortfall:')
            print('   ' + ', '.join(f'{m}:{dm[m]}/{w[m]:.2f}' for m in dm))
```

`rotation_probe_lowerbody.py (B2; imports rotation_probe.py)`

```python
#!/usr/bin/env python3
"""Scratch sensitivity (NOT repo code, NOT evidence): scale ONLY the lower-body clocks (quads, hamstrings, glutes, adductors)
to see whether the best rotation order in each family changes. Imports the main probe."""
import sys, importlib.util
spec = importlib.util.spec_from_file_location('rp', 'rotation_probe.py'); rp = importlib.util.module_from_spec(spec); spec.loader.exec_module(rp)
base_copy = dict(rp.BASE)
def run(label, factors):
    for m, f in factors.items(): rp.BASE[m] = base_copy[m] * f
    out = {}
    for N, fam in rp.families(False).items():
        for fname, sessions in fam.items():
            res = rp.best_orders(sessions)
            out[(N, fname)] = (res[0][1], res[0][0], res[-1][1], res[-1][0])
    for m in base_copy: rp.BASE[m] = base_copy[m]
    return out
base = run('base', {})
low = run('lower x0.6', {'quads':0.6,'hamstrings':0.6,'glutes':0.6,'adductors':0.6})
arm = run('arms x0.67 (biceps/triceps 32 h)', {'biceps':0.67,'triceps':0.67})
for k in base:
    b, l, a = base[k], low[k], arm[k]
    print(f"N={k[0]} {k[1]}")
    print(f"   base   best {b[0]} {b[1]:.3f}  worst {b[3]:.3f}")
    print(f"   lowerx0.6 best {l[0]} {l[1]:.3f}  worst {l[3]:.3f}   same best order: {b[0]==l[0]}")
    print(f"   armsx0.67 best {a[0]} {a[1]:.3f}  worst {a[3]:.3f}   same best order: {b[0]==a[0]}")
```

`calib.py (B3)`

```python
#!/usr/bin/env python3
"""Scratch (NOT repo code): model check of recovery clocks against measured anchors, and per-muscle T tables."""
import math
def fd(F): return min(1.5, max(0.7, math.sqrt(F/6.0)))
REPO_PROX = lambda r: 1.15 if r <= 1 else (1.0 if r < 3 else 0.90)
F5_PROX   = lambda r: 1.25 if r <= 0 else (1.10 if r == 1 else (1.0 if r == 2 else 0.80))
anchors = [
 ('Chest, 8 bench sets to failure (Ferreira 2017 x2)', 'chest', 60, 8.0, 0, (72, 96), 'PT 72-96 h; work not back at 96 h'),
 ('Triceps, same session (indirect 0.5 x 8 = 4)', 'triceps', 48, 4.0, 0, (48, 72), 'work down at 48 h; force back immediately'),
 ('Elbow flexors, 8 preacher-curl sets at 10RM (Soares 2015)', 'biceps', 48, 8.0, 0, (24, 48), 'force -8.4% at 24 h; soreness to 72 h'),
 ('Elbow flexors, 8 row sets at 10RM, indirect (0.5 x 8 = 4)', 'biceps', 48, 4.0, 0, (0, 24), 'force back at 24 h; soreness gone by 72 h'),
 ('Quads, 5 squat + 5 leg-press sets to failure (Goulart 2021)', 'quads', 72, 10.0, 0, (48, 72), 'first-set volume down at 48 h; strength above baseline at 72 h'),
]
print('anchor | B repo | F | RIR | T_obs(h) | implied B (F5 prox) | implied B (repo prox) | repo-style pred | F5 pred')
for name, m, B, F, rir, (lo, hi), note in anchors:
    d1 = fd(F) * F5_PROX(rir); d2 = fd(F) * REPO_PROX(rir)
    print(f"{name} | {B} | {F} | {rir} | {lo}-{hi} | {lo/d1:.0f}-{hi/d1:.0f} | {lo/d2:.0f}-{hi/d2:.0f} | {B*d2:.0f} | {B*d1:.0f}   # {note}")
print()
# per-muscle T table
BASE = {'quads':72,'hamstrings':72,'glutes':72,'adductors':60,'back':60,'chest':60,'triceps':48,'biceps':48,'side_delts':48,'front_delts':48,'rear_delts':48,'traps':48,'forearms':36,'calves':36,'abs':36,'neck':36,'tibialis':36}
print('muscle | F3 RIR2 | F6 RIR2 | F9 RIR2 | F12 RIR2 | F6 RIR0 | F6 RIR1 | F6 RIR3 | F9 RIR3 | F9 RIR0')
for m, B in BASE.items():
    def T(F, r, mod=1.0): return min(168, max(24, B*fd(F)*F5_PROX(r)*mod))
    print(f"{m} | {T(3,2):.0f} | {T(6,2):.0f} | {T(9,2):.0f} | {T(12,2):.0f} | {T(6,0):.0f} | {T(6,1):.0f} | {T(6,3):.0f} | {T(9,3):.0f} | {T(9,0):.0f}")
print()
# biceps focus cases
B = 48
for label, F, r in [('9 per session RIR2', 9, 2), ('9 per session RIR3', 9, 3), ('9 per session RIR1', 9, 1), ('9 per session RIR0', 9, 0), ('7 per session RIR2', 7, 2), ('7 per session RIR3', 7, 3), ('13.5 per session RIR2', 13.5, 2), ('27 in one session RIR2', 27, 2), ('27 in one session RIR3', 27, 3), ('6 per session RIR2 (x4=24)', 6, 2), ('4.5 per session RIR2', 4.5, 2)]:
    T = min(168, max(24, B*fd(F)*F5_PROX(r)))
    raw = B*math.sqrt(F/6.0)*F5_PROX(r)
    print(f"biceps {label}: f_dose {fd(F):.3f} (raw sqrt {math.sqrt(F/6):.3f}) T {T:.1f} h  (unclamped {raw:.1f})  band {0.75*T:.0f}-{1.25*T:.0f}")
# back
B = 60
for label, F, r, mod in [('back 8 per session RIR2 multi-joint', 8, 2, 0.85), ('back 8 RIR2 isolation-equivalent', 8, 2, 1.0), ('back 6 RIR2 multi-joint', 6, 2, 0.85), ('back 6 RIR3 multi-joint', 6, 3, 0.85), ('back 10 RIR1 multi-joint', 10, 1, 0.85)]:
    T = min(168, max(24, B*fd(F)*F5_PROX(r)*mod)); print(f"{label}: T {T:.1f} h band {0.75*T:.0f}-{1.25*T:.0f}")
```

`recov_sim.py (B4)`

```python
#!/usr/bin/env python3
"""Scratch (NOT repo code): reproduce muscleRecoveryModel.js residual and recoveredPercent for repeating exposures."""
import math
def unit(F): return min(2.0, max(0.25, F/6.0))
def fd(F): return min(1.5, max(0.7, math.sqrt(F/6.0)))
PROX = {0:1.25, 1:1.10, 2:1.00, 3:0.80}
def T(B, F, r): return min(168, max(24, B*fd(F)*PROX[r]))
def percent_before_next(B, F, r, gaps, cycles=6):
    t_h = T(B, F, r)
    # sessions end times; gaps list repeats; return recovered percent at the instant just before each next session (start == previous end + gap)
    ends = [0.0]
    out = []
    for c in range(cycles*len(gaps)):
        g = gaps[c % len(gaps)]
        t_next = ends[-1] + g
        def R(t, upto):
            s = 0.0
            for e in ends[:upto]:
                s += unit(F)*max(0.0, min(1.0, 1 - (t-e)/t_h))
            return s
        peak = max(0.25, R(ends[-1], len(ends)))
        pct = 100*(1 - R(t_next, len(ends))/peak)
        out.append(pct)
        ends.append(t_next)
    return t_h, out[-len(gaps):]
for label, B, F, rs, gaps in [
    ('biceps 3x9 even 56', 48, 9, (0,1,2,3), [56,56,56]),
    ('biceps 3x9 typical 48/48/72', 48, 9, (0,1,2,3), [48,48,72]),
    ('biceps 4x7 typical 24/48/24/72', 48, 7, (0,1,2,3), [24,48,24,72]),
    ('biceps 4x7 even 42', 48, 7, (0,1,2,3), [42,42,42,42]),
    ('biceps 2x13.5 even 84', 48, 13.5, (0,1,2,3), [84,84]),
]:
    for r in rs:
        th, pcts = percent_before_next(B, F, r, gaps)
        print(f"{label} RIR{r}: T={th:.1f}h  recovered% before next sessions (last cycle): {[round(p,1) for p in pcts]}")
```
