# R3 — Training-science evidence base (detraining, re-entry, pain models, unilateral/asymmetry, pacing, minimum dose)

**Campaign:** Capability Campaign 25 (CC25) — capability-aware, disability-inclusive,
restriction- and injury-aware training intelligence.
**Agent:** R3 (research, external literature). **Date:** 2026-08-20.
**Remit:** survey and cite the training-science evidence base. **Not in remit:** writing
product rules, thresholds, formulas or coach copy. Where this report names a number, it is
reporting a published number, not proposing one.

**Method.** Web literature search (PubMed/Europe PMC-indexed reviews, meta-analyses and
RCTs; position stands and consensus documents; authoritative practice sources). Primary
abstracts were retrieved from Europe PMC's REST API where publisher pages were blocked;
two full PDFs (CSCCa/NSCA 2019; Silbernagel 2007) were text-extracted and are quoted
directly. The session's web-search budget (200 calls) was exhausted; items that remain
unverified are listed explicitly in §8.

---

## How to read this report — tier tags

| Tag | Meaning |
|---|---|
| **ESTABLISHED EVIDENCE** | Peer-reviewed, replicated or meta-analysed. Cited to primary literature. |
| **PROFESSIONAL CONSENSUS** | Position stand, consensus statement, national guideline, or authoritative practice document. Authoritative, but consensus is not data. |
| **PRODUCT INFERENCE** | A reasonable extrapolation I am making, clearly labelled. Not sourced. |
| **NEEDS CLINICAL REVIEW** | Must not become app logic without domain (clinical) review. |
| **UNVERIFIED** | Claim found circulating; I could not trace it to a primary source within this brief. |
| **UNKNOWN** | The literature does not answer the question. Stated as such, deliberately. |

Every section ends with **WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS
PRODUCT** — factual boundaries on the evidence, not product design.

---

## 0. Corrections to claims found circulating in secondary sources

Recorded up front because each one is a claim a designer could plausibly pick up and build
on, and each is wrong or unsupported. (CLAUDE.md §4, evidence-before-assertion.)

1. **"The Silbernagel 2007 pain-monitoring group did better than the rest group; 100%
   returned to full activity at 12 months."** FALSE as stated. The primary paper reports
   *"No significant differences in the rate of improvements were found between the
   groups."* Both groups improved. The trial's conclusion is a *non-inferiority /
   no-harm* finding, not superiority. Source of the false claim: a commercial clinic
   page. See §3.2.
2. **"Muscle memory means you regain in about half the time it took to gain."** UNVERIFIED
   / folk claim. No primary study or systematic review I could find supports a numeric
   ratio. Every source offering one was a commercial blog. See §1.5.
3. **"You can maintain muscle on 6–10 sets per muscle group per week."** UNVERIFIED as a
   sourced number. It does not appear in Spiering 2021, Bickel 2011 or the ACSM 2026
   position stand, which are the three best maintenance sources. See §6.4.
4. **"Traffic light" pain models with named arithmetic ("reduce load 10–20% if morning
   pain is 1–2 points above baseline").** UNVERIFIED. Those numeric consequences are not
   in Thomeé 1997, Silbernagel 2007 or Sprague 2021. See §3.5.
5. **"Muscle mass falls ~0.5–0.6%/day when you stop training."** MISATTRIBUTED. That rate
   is from *disuse/immobilisation* studies (Wall 2013), not from ceasing structured
   training while remaining ambulatory. Conflating the two overstates loss by roughly an
   order of magnitude. See §1.4.

---

## 1. DETRAINING AND RETRAINING

### 1.1 Terminology the literature actually uses — ESTABLISHED EVIDENCE (definitional)

Mujika & Padilla split detraining into **short-term (≤4 weeks)** and **long-term
(>4 weeks)** *insufficient training stimulus*. Crucially, "detraining" in this literature
covers both complete cessation **and reduced training**; it is defined by the stimulus
being insufficient, not by training being zero.

- Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance
  adaptations. Part I: short term insufficient training stimulus. *Sports Med.*
  2000;30(2):79–87. https://pubmed.ncbi.nlm.nih.gov/10966148/
- Mujika I, Padilla S. …Part II: long term insufficient training stimulus. *Sports Med.*
  2000;30(3):145–154. https://pubmed.ncbi.nlm.nih.gov/10999420/

### 1.2 Magnitude of loss on full cessation — ESTABLISHED EVIDENCE

Bosquet L, Berryman N, Dupuy O, Mekary S, Arvisais D, Bherer L, Mujika I. Effect of
training cessation on muscular performance: a meta-analysis. *Scand J Med Sci Sports.*
2013;23(3):e140–9. DOI 10.1111/sms.12047. PMID 23347054.
https://onlinelibrary.wiley.com/doi/abs/10.1111/sms.12047

103 of 284 studies included. Standardised mean differences (all P<0.01):

| Outcome | SMD (95% CI) |
|---|---|
| Submaximal strength | −0.62 (−0.80 to −0.45) |
| Maximal force | −0.46 (−0.54 to −0.37) |
| Maximal power | −0.20 (−0.28 to −0.13) |

Moderators, verbatim from the abstract: *"A dose-response relationship between the
amplitude of SMD and the duration of training cessation was identified. The effect of
resistance training cessation was found to be larger in older people (> 65 years old). The
effect was also larger in inactive people for maximal force and maximal power when compared
with recreational athletes."*

**Note the unit.** These are standardised mean differences, not percentages, and not a
per-week rate. The meta-analysis establishes *direction, ordering and moderators*. It does
not yield a decay constant.

### 1.3 Time course — PARTLY ESTABLISHED, PARTLY UNKNOWN

**Up to ~3 weeks, in trained people, strength holds.**
McMaster DT, Gill N, Cronin J, McGuigan M. The development, retention and decay rates of
strength and power in elite rugby union, rugby league and American football: a systematic
review. *Sports Med.* 2013;43(5):367–384. DOI 10.1007/s40279-013-0031-3. PMID 23529287.
Conclusion, verbatim: *"Strength levels can be maintained for up to 3 weeks of detraining,
but decay rates will increase thereafter (i.e. 5–16 weeks)."* Across the pooled detraining
studies (mean duration 7.2 weeks) strength fell 14.5%. (The companion figure of −0.4% for
power over the same window looks anomalous against the rest of the literature; reported as
published, not endorsed.) Population: elite collision-sport athletes, n=1,015 across 27
studies.

Ogasawara R, Yasuda T, Sakamaki M, Ozaki H, Abe T. Effects of periodic and continued
resistance training on muscle CSA and strength in previously untrained men. *Clin Physiol
Funct Imaging.* 2011;31(5):399–404. DOI 10.1111/j.1475-097X.2011.01031.x.
A 3-week detraining block mid-programme produced **no significant decrease** in bench 1RM
or in triceps/pectoralis CSA, and 15-week end-point adaptations matched continuous training.

**Ten weeks off does cost, and costs size more than strength.**
Halonen E, Gabriel I, Kelahaara M, Ahtiainen J, Hulmi J. Does taking a break matter —
adaptations in muscle strength and size between continuous and periodic resistance
training. *Scand J Med Sci Sports.* 2024;34(10):e14739. DOI 10.1111/sms.14739.
PMID 39364857. 55 untrained adults; periodic group did 10 wk RT / 10 wk detraining /
10 wk RT, continuous group did 20 wk RT. During the break, leg-press and biceps-curl 1RM,
vastus lateralis and biceps brachii CSA, and CMJ height all fell. The university's own
summary of the authors' reading: maximum strength was **better preserved than muscle size**
across the break. End-of-study adaptations were equal between groups, but the periodic
group needed 30 weeks of calendar time to reach what the continuous group reached in 20.
https://www.jyu.fi/en/news/breaks-in-resistance-training-do-not-impair-long-term-development-in-strength-and-muscle-size

**In previously untrained older adults, longer cessation clearly costs size.**
Grgic J. Use it or lose it? A meta-analysis on the effects of resistance training cessation
(detraining) on muscle size in older adults. *Int J Environ Res Public Health.*
2022;19(21):14048. DOI 10.3390/ijerph192114048.
https://pmc.ncbi.nlm.nih.gov/articles/PMC9657634/
Pooled effect Cohen's d = −0.83 (95% CI −1.30 to −0.36). By duration: 12–24 weeks
d = −0.60 (−1.21 to 0.01, not significant); 31–52 weeks d = −1.11 (−1.75 to −0.47). Author's
stated limits: only six studies, quadriceps only, all previously untrained older adults,
and *"Future studies are required to establish the time course of muscle size changes during
detraining in older adults."*

**And the field's own verdict on the time course.**
Encarnação IGA, Viana RB, Soares SRS, Freitas EDS, de Lira CAB, Ferreira-Junior JB. Effects
of detraining on muscle strength and hypertrophy induced by resistance training: a
systematic review. *Muscles.* 2022;1(1):1–15. DOI 10.3390/muscles1010001.
https://www.mdpi.com/2813-0413/1/1/1
Conclusion: there is **no sufficient high-quality evidence** to make an unbiased claim about
how long resistance-training-induced strength changes last after detraining, and the effect
of different detraining durations on hypertrophy remains unknown.

> **UNKNOWN, stated plainly:** there is no validated per-week decay curve for strength or
> muscle mass in the general population. Anything of the form "you lose x% per week off" is
> not available from this literature.

### 1.4 Disuse is not the same as stopping training — ESTABLISHED EVIDENCE

Wall BT, Dirks ML, van Loon LJC. Skeletal muscle atrophy during short-term disuse:
implications for age-related sarcopenia. *Ageing Res Rev.* 2013;12(4):898–906.
DOI 10.1016/j.arr.2013.07.003. PMID 23948422.
Disuse studies of 10–42 days show roughly **0.5–0.6% of total muscle mass lost per day**;
thigh atrophy is detectable within **2 days** of leg immobilisation and progresses at
roughly 0.8%/day.

This is limb immobilisation and bed rest — not a person who stops going to the gym but
keeps walking around. The distinction is load-bearing for CC25: *a restriction that
immobilises a body part is a physiologically different event from a restriction that merely
stops that body part being trained.*

### 1.5 "Muscle memory" — CONTESTED

**The cellular claim has support.**
Cumming KT, Reitzner SM, Hanslien M, Skilnand K, Seynnes OR, Horwath O, Psilander N,
Sundberg CJ, Raastad T. Muscle memory in humans: evidence for myonuclear permanence and
long-term transcriptional regulation after strength training. *J Physiol.*
2024;602(17):4171–4193. DOI 10.1113/JP285675. PMID 39159314.
12 untrained adults; 10 wk unilateral elbow-flexor training, 16 wk de-training, 10 wk
re-training of both arms. Myonuclei rose during training (type 1 +13±17%, type 2 +33±23%),
fibre CSA fell during de-training while **myonuclei were maintained**, leaving 33% higher
myonuclear number in the previously trained versus control muscle in type 2 fibres.

**The functional claim does not.** Same paper, authors' own words:

> *"the previously trained muscle showed larger type 2 fCSA compared to the control
> (P = 0.035). However, delta change in type 2 fCSA was not different between muscles."*
> … *"Increased myonuclear number and differentially expressed genes … did not translate
> into a clearly superior response during re-training. Because of the unclear effect on the
> subsequent hypertrophy and muscle strength gain with re-training, the physiological
> benefit remains to be determined."*

**The review position is agnostic.**
Snijders T, Aussieker T, Holwerda A, Parise G, van Loon LJC, Verdijk LB. The concept of
skeletal muscle memory: evidence from animal and human studies. *Acta Physiol (Oxf).*
2020;229(3):e13465. DOI 10.1111/apha.13465. PMID 32175681. The concept rests mainly on
rodent models; *"Whether the postulated mechanism also holds true in humans remains largely
ambiguous."*

**And there is an active dispute.** Psilander et al.'s secondary analysis of human
detraining data (J Appl Physiol, 2019, "'Muscle memory' not mediated by myonuclear number?")
could not demonstrate a myonuclear-mediated memory; the training protocol did not raise
myonuclear number enough to test it. A published letter exchange followed ("Muscle memory:
are myonuclei ever lost?", J Appl Physiol 2019).
https://journals.physiology.org/doi/full/10.1152/japplphysiol.00506.2019
https://journals.physiology.org/doi/full/10.1152/japplphysiol.00761.2019

**The closest thing to a direct functional test.**
Halonen 2024 (above) found the periodic group regained pre-break levels within about
5 weeks of retraining, and that their first 5 retraining weeks out-gained the continuous
group's weeks 10–15. But: the two comparisons that matter for a "faster regain" claim are
(a) retraining versus *the same group's own initial* training rate, and (b) total calendar
time — and on (b) the break cost time overall. Neither the authors nor the university
release claim retraining beat initial training.

Older supporting data, small n: Staron RS, Leonardi MJ, Karapondo DL, Malicky ES, Falkel JE,
Hagerman FC, Hikida RS. Strength and skeletal muscle adaptations in heavy-resistance-trained
women after detraining and retraining. *J Appl Physiol.* 1991;70(2):631–640.
n=6 women; 20 wk training, 30–32 wk detraining, 6 wk retraining. Strength fell but not to
pre-training levels; fibre CSA was relatively preserved through detraining; 6 weeks of
retraining significantly increased fast-fibre CSA.

> **UNVERIFIED:** the "regain takes about half as long as the original gain" heuristic. No
> primary source located.

### 1.6 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform (factual boundaries):**
- That an interruption of a few weeks and an interruption of several months are materially
  different physiological states, and that any product treating them identically is at odds
  with the evidence.
- That **strength is retained better than muscle size** across a break (Halonen 2024;
  Bickel 2011 in §6.1), so a return that re-tests strength will generally find less loss
  than a user expects from how they look or feel.
- That loss is **larger in older users and in previously inactive users** (Bosquet 2013),
  and that this ordering is meta-analytically supported.
- That **immobilisation is a distinct, much faster category of loss** than cessation
  (Wall 2013), so "the limb was in a cast" and "I skipped leg day for six weeks" are not
  the same input.
- That reduced-but-not-zero training is inside the same literature as cessation and is
  handled in §6, not here.

**Cannot inform:**
- **No per-week decay coefficient.** Encarnação 2022 says the high-quality evidence to
  support one does not exist. Any decay constant in the app would be an invention.
- **No "regain multiplier."** Cumming 2024, the best human myonuclear study, explicitly
  says the physiological benefit of muscle memory "remains to be determined."
- **No transfer from whole-body detraining to a single restricted joint, muscle or limb.**
  The detraining literature is whole-body or whole-limb, in non-disabled participants, with
  training cessation as the exposure. A local restriction while the rest of the body trains
  on is not studied.
- **Nothing about myonuclei belongs in prescription logic.** The evidence is histological
  (muscle biopsy). It does not convert into a load, a set count or a progression rate.
- **Nothing here is population-general for disabled users.** Every study cited recruited
  participants able to complete the standard protocol.

---

## 2. RETURN TO TRAINING AFTER A LAYOFF OR LOCAL RESTRICTION (non-clinical S&C practice)

Reporting the **range** of professional practice, as briefed. No synthesis, no formula.

### 2.1 The one formal consensus document — PROFESSIONAL CONSENSUS

Caterisano A (co-chair), Decker D (co-chair), Snyder B (co-chair), Feigenbaum M, Glass R,
House P, Sharp C, Waller M, Witherspoon Z. **CSCCa and NSCA Joint Consensus Guidelines for
Transition Periods: Safe Return to Training Following Inactivity.** *Strength Cond J.*
2019;41(3). DOI 10.1519/SSC.0000000000000477.
https://www.nsca.com/about-us/position-statements/safe-return-to-training/
(Full text extracted from the publicly posted PDF at
https://www.nsca.com/contentassets/202023e9d6c440dab582d9d87c0f3729/cscca_and_nsca_joint_consensus_guidelines_for.1.pdf )

**Why it exists — and this framing matters more than the numbers.** The abstract states the
driver is the increased incidence of injuries and deaths from **exertional heat illness
(EHI), exertional rhabdomyolysis (ER) and cardiorespiratory failure** in college athletes,
concentrated in transitions from relative inactivity to regular training. The document sets
**upper limits**, not a prescription for adaptation. Adherence is paired with
pre-participation medical evaluations and emergency action plans.

**Three scenarios it covers:**
1. Returning athletes after a break of **2 weeks or longer**, or athletes starting under a
   new head sport coach.
2. New athletes (freshman/transfer) coming off inactivity, or all athletes starting under a
   new head strength and conditioning coach.
3. Athletes returning after an incident of **ER or EHI** — this one *"will involve a 6- to
   8-week rehabilitation program."*

**The 50/30/20/10 rule (conditioning volume/workload):** weekly reductions from the
uppermost conditioning volume on file. Verbatim: *"the conditioning volume for the first
week would be initially reduced by at least 50% of the uppermost conditioning volume on
file, and by 30, 20, and 10% in the following 3 weeks, respectively."* Applied over
**2 weeks** for scenario 1 (50/30, then standard loads) and **4 weeks** for scenarios 2
and 3. Testing carries its own reductions (20% in week 1, 10% in week 2 for returning
athletes; 50% on day 1 for new athletes).

**The FIT rule (resistance training specifically)** — Frequency, Intensity relative volume,
Time of rest interval:

| Component | Recommendation (first 2 weeks after inactivity) |
|---|---|
| **F**requency | Not more than **3 days** in week 1, not more than **4 days** in week 2, *per muscle group or movement type* |
| **I**RV | **IRV = sets × reps × %1RM as a decimal.** Committee recommends **IRV 11–30** per muscle group/movement type. *"IRVs of greater than 30 are contraindicated in the 2 weeks following period of inactivity."* |
| **T**ime of rest | Work:rest of **≥1:4 in week 1** and **≥1:3 in week 2**, for all weight-training activity |

The IRV bands are imported from McMaster 2013 (§1.3): IRV 11–20 gave the greatest strength
increases, 21–30 somewhat lower, below 11 possibly inadequate.

**The committee's own honesty about the evidence, verbatim:** *"Although some studies
indicate that previously trained athletes undergoing short periods of detraining (1–4 weeks)
do not exhibit a large detraining effect …, the preponderance of evidence supports at least
a brief period of lower workload to offset detraining effects that might appear, especially
with longer periods of inactivity."* And an explicit discretion clause: *"each coach may
decide to reduce the volume and/or intensity by a greater amount based on environmental
conditions and/or individual athletes' needs."*

### 2.2 Individual coaching practice — PROFESSIONAL PRACTICE (weaker tier)

Mannie K, Lambrinides T. Powerline: returning to action after a layoff. *Coach & Athletic
Director*, 7 December 2017.
https://coachad.com/articles/powerline-returning-action-layoff/
- *"Strength training workouts upon return should be no higher than 60 percent of the
  highest achieved training load prior to the layoff."*
- Conditioning relief:work minimum 4:1 (weeks 1–3), 3:1 (weeks 4–7), 2.5:1 (weeks 8–10).
- RPE monitored throughout, with immediate adjustment if athletes struggle.
Mixed provenance: four peer-reviewed references (NATA position statements, rhabdomyolysis
and sickle-cell trait papers) plus applied coaching experience at one institution. **This is
one practice, not a standard.**

### 2.3 RPE/RIR-based and autoregulated re-entry — the method is supported, the *protocol* is not

Greig L, Stephens Hemingway BH, Aspe RR, Cooper K, Comfort P, Swinton PA. Autoregulation in
resistance training: addressing the inconsistencies. *Sports Med.* 2020;50:1873–1887.
DOI 10.1007/s40279-020-01330-8. PMID 32813181.
Verbatim: autoregulation *"has been established as a training framework since the 1940s"*
but *"there has been limited systematic research investigating its broad utility"*, with
*"inconsistent use of key terminology (e.g., adaptation, readiness, fatigue, and response)
and associated ambiguity of how to implement different autoregulation strategies."*

Currier BS, D'Souza AC, Fiatarone Singh MA, et al. **ACSM Position Stand: Resistance
Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy
Adults: An Overview of Reviews.** *Med Sci Sports Exerc.* 2026;58(4):851–872.
DOI 10.1249/MSS.0000000000003897. https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
- An adequate stimulus *"can be accomplished by completing sets with various RTx and
  completion of 'near-failure' or a target of 2–3 repetitions in reserve (RIR)."*
- But: *"there is insufficient evidence to quantify exact RIR and perceived exertion
  targets."*
- And: *"relative load can also be sustained when regular strength testing is performed or
  perceived exertion scales are used to increase absolute load commensurate with strength
  gains."*

Also located but not independently verified in this brief: Hickmott et al., "Effects of
subjective and objective autoregulation methods for intensity and volume on enhancing
maximal strength during resistance-training interventions: a systematic review", *PeerJ*
(https://peerj.com/articles/10663/), reported to find autoregulated approaches equal or
superior to fixed loading in the clear majority of included studies.

**Reading:** letting the user's performance set the load on re-entry is a legitimate,
supported *method*. There is **no published, validated RIR or RPE schedule for re-entry
after a layoff** from any body I could find.

### 2.4 Where practice crosses into rehabilitation — NEEDS CLINICAL REVIEW

Ardern CL, Glasgow P, Schneiders A, Witvrouw E, Clarsen B, Cools A, Gojanovic B, Griffin S,
Khan KM, Moksnes H, Mutch SA, Phillips N, Reurink G, Sadler R, Silbernagel KG, Thorborg K,
Wangensteen A, Wilk KE, Bizzini M. **2016 Consensus statement on return to sport from the
First World Congress in Sports Physical Therapy, Bern.** *Br J Sports Med.*
2016;50(14):853–864. DOI 10.1136/bjsports-2016-096278. PMID 27226389.
- Return to sport is *"a continuum, paralleled with recovery and rehabilitation"*, not a
  gate at the end.
- Decisions are *"an exercise in risk management"*, made collaboratively between clinician,
  athlete and coach.
- The **StARRT** framework (Strategic Assessment of Risk and Risk Tolerance) is offered to
  synthesise information; clearance depends on the risk assessment sitting below an
  explicitly chosen risk-tolerance threshold.
- Verbatim: *"Research evidence to support return to sport decisions in clinical practice is
  scarce."*

Anything keyed on an **injury, diagnosis, surgery, clinician-prescribed immobilisation, or a
clinician's restriction** is in this territory, not in §2.1–2.3. So is CSCCa/NSCA
scenario 3 (post-ER/EHI), which the guideline itself routes into a 6–8 week rehabilitation
programme.

### 2.5 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform:**
- That a **reduced first block after an interruption is normal professional practice**, and
  that a product offering one is following, not inventing, the field.
- The **shape** professionals use: several weeks of reduced volume/workload, restored later;
  longer rest between efforts early; a cap on weekly frequency per muscle group or movement;
  a graded return to testing.
- That the strongest formal document in this space (a) is a **safety ceiling**, (b) is
  motivated by rhabdomyolysis and heat illness rather than adaptation, and (c) is written
  for **supervised collegiate athletes with medical screening and emergency plans in place**.
- That **performance-led (autoregulated) re-entry is defensible** as a method, and is what
  the current ACSM position stand points at for sustaining relative load.
- That professional practice varies widely on the numbers: 50%-of-volume reductions
  (CSCCa/NSCA) versus ≤60%-of-load ceilings (Mannie & Lambrinides) are different quantities
  applied to different variables. There is no single professional number.

**Cannot inform:**
- **No validated re-entry formula for the general adult population.** The 50/30/20/10 rule
  is a consensus committee's upper bound for a specific supervised athletic population; it
  was not derived from a dose-response study.
- **IRV thresholds (11–30) must not be ported as a hard gate.** They come from a systematic
  review of elite rugby and American football players (McMaster 2013), and were adopted by
  the committee as a safety ceiling for a 2-week window.
- **No re-entry rule may be keyed on injury, pain, surgery or clinician instruction.** That
  is §2.4 territory. **NEEDS CLINICAL REVIEW.**
- **Nothing addresses re-entry after a *local* restriction** — one joint, one limb, one
  movement pattern — while the rest of the body carried on training. I found no source at
  any tier that addresses this. **UNKNOWN.** This is precisely the CC25 case, and the
  literature does not cover it.

---

## 3. PAIN-MONITORING MODELS

**Tag the whole section: NEEDS CLINICAL REVIEW.** Reported for accuracy about what these
models are and are not; none of it is a candidate for app logic without domain review.

### 3.1 What the model actually is — ESTABLISHED EVIDENCE (as a description)

**Origin.** Thomeé R. A comprehensive treatment approach for patellofemoral pain syndrome in
young women. *Phys Ther.* 1997;77(12):1690–1703. DOI 10.1093/ptj/77.12.1690. PMID 9413448.
40 women aged 15–28, 12 weeks of treatment comprising an **education component and a
training programme**, evaluated at 3 and 12 months.

**Adapted for tendinopathy.** Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. Continued
sports activity, using a pain-monitoring model, during rehabilitation in patients with
Achilles tendinopathy: a randomized controlled study. *Am J Sports Med.* 2007;35(6):897–906.
DOI 10.1177/0363546506298279. PMID 17307888.

The rules, quoted **verbatim from the Silbernagel 2007 paper** (extracted from the PDF):

> *"According to the pain-monitoring model, the pain was allowed to reach level 5 on the
> visual analog scale (VAS), where 0 is no pain and 10 is the worst pain imaginable, during
> the exercise training. The pain after the exercise program was allowed to reach 5 on the
> VAS but should have subsided by the following morning. Pain and stiffness in the Achilles
> tendon were not allowed to increase from week to week."*

Three structural rules: a **during-session ceiling**, a **next-morning return to baseline**,
and **no week-to-week escalation**.

### 3.2 What the trial actually showed — ESTABLISHED EVIDENCE, narrower than usually claimed

Silbernagel 2007, verbatim from the abstract:

> Results: *"No significant differences in the rate of improvements were found between the
> groups. Both groups showed, however, significant (P < .01) improvements, compared with
> baseline, on the primary outcome measure at all the evaluations."* (Exercise group VISA-A-S
> 57 → 85 at 12 months; active-rest group 57 → 91.)
>
> Conclusions: *"No negative effects could be demonstrated from continuing Achilles
> tendon-loading activity, such as running and jumping, with the use of a pain-monitoring
> model, during treatment."*

This is a **no-harm / permission-to-keep-loading** finding at level-1 evidence, n=38. It is
**not** a demonstration that pain-monitored loading beats rest. See §0 item 1.

### 3.3 The only trial of the model as an *intervention* is a pilot — WEAK

Sprague AL, Couppé C, Pohlig RT, Snyder-Mackler L, Grävare Silbernagel K. Pain-guided
activity modification during treatment for patellar tendinopathy: a feasibility and pilot
randomized clinical trial. *Pilot Feasibility Stud.* 2021;7:58.
DOI 10.1186/s40814-021-00792-5. https://pmc.ncbi.nlm.nih.gov/articles/PMC7905015/
Pain-guided activity (n=9) versus pain-free restriction (n=6), 12 weeks, both with
standardised heavy-slow resistance training. Compliance 86.1% vs 67.1%; VISA-P 75.1 vs 60.8.
The authors state the impact of activity modification on clinical outcomes *"ha[s] not been
directly investigated nor compared"* and that this feasibility study does not assess
efficacy.

### 3.4 The broader question — painful vs pain-free exercise — ESTABLISHED EVIDENCE, small effect

Smith BE, Hendrick P, Smith TO, Bateman M, Moffatt F, Rathleff MS, Selfe J, Logan P. Should
exercises be painful in the management of chronic musculoskeletal pain? A systematic review
and meta-analysis. *Br J Sports Med.* 2017;51(23):1679–1687. DOI 10.1136/bjsports-2016-097383.
PMID 28596288.
7 trials, 385 participants. **Short-term pain: SMD −0.27 (−0.54 to −0.05) favouring painful
exercise, moderate-quality evidence.** No significant difference for pain at medium or long
term, nor for function/disability at any time point. Conclusion, verbatim: *"Pain during
therapeutic exercise for chronic musculoskeletal pain need not be a barrier to successful
outcomes."*

### 3.5 "Traffic light" framings — UNVERIFIED

Green/amber/red versions with named arithmetic (e.g. "morning pain 1–2 points above
baseline → reduce volume or intensity 10–20% next session") appear on clinic and commercial
pages. Those numeric consequences do **not** appear in Thomeé 1997, Silbernagel 2007 or
Sprague 2021. Likewise, a commercial page's claim that the rule "has been adopted by the
BJSM's clinical practice guidelines for Achilles tendinopathy and is referenced in the 2018
Dutch multidisciplinary guideline for lower-extremity tendinopathy" could not be verified
against a primary guideline document within this brief. Treat the traffic-light arithmetic
as unsourced.

### 3.6 The clinical context the model presupposes — NEEDS CLINICAL REVIEW

Every study above is a **treatment study**, in a **diagnosed condition** (patellofemoral
pain; midportion Achilles tendinopathy; patellar tendinopathy; chronic MSK pain), delivered
inside a **supervised physiotherapy programme**, with a **progressive loading protocol
prescribed alongside**. The pain rule was one component of a package. Thomeé's own
conclusion attributes the improvement to the combination: *"the education given to the
subjects, the pain monitoring system, the gradually progressing training program, and the
adjusted physical activity."*

### 3.7 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform (factual boundaries only):**
- That in supervised care of specific tendinopathies and chronic MSK pain, **training with
  some pain has not been shown to be harmful**, and pain-free-only is not required for good
  outcomes (Silbernagel 2007; Smith 2017). This is a factual counter-boundary to a design
  that treats every reported discomfort as a hard stop.
- That the three structural questions clinicians ask are **intensity during**, **next-morning
  response**, and **week-to-week trend** — a description of an existing clinical framework,
  useful for understanding what a clinician reviewer will expect to see.
- That the "no pain, no gain" and "any pain means stop" poles are both unsupported.

**Cannot inform:**
- **The 5/10 threshold must not become app logic.** It is a treatment-protocol parameter for
  supervised tendinopathy rehabilitation. Using it to permit or forbid a set is a clinical
  decision. **NEEDS CLINICAL REVIEW.**
- **The app cannot treat a pain report as a tissue-tolerance signal.** The model presupposes
  a diagnosis. Without one, the same number means different things in different people.
- **No traffic-light arithmetic.** The percentages have no primary source (§3.5).
- **No extension beyond exercise-related musculoskeletal pain.** Neuropathic pain, central
  sensitisation, visceral pain, inflammatory arthritis flares and post-exertional symptom
  exacerbation (§5) were not studied and are not covered by any of it.
- **No claim of benefit.** Silbernagel 2007 found no between-group difference; Sprague 2021
  is a feasibility study; Smith 2017's benefit is small and short-term only.

---

## 4. UNILATERAL TRAINING, ASYMMETRY, BILATERAL DEFICIT, CROSS-EDUCATION

### 4.1 Unilateral vs bilateral for hypertrophy and strength — ESTABLISHED EVIDENCE

Kassiano W, Nunes JP, Costa B, Ribeiro AS, Loenneke JP, Cyrino ES. Comparison of muscle
growth and dynamic strength adaptations induced by unilateral and bilateral resistance
training: a systematic review and meta-analysis. *Sports Med.* 2025.
DOI 10.1007/s40279-024-02169-z. PMID 39794667.
9 studies from 703 retrieved.

| Outcome | Effect size (95% CI) | Reading |
|---|---|---|
| Hypertrophy | −0.21 (−3.56 to 3.13), P=0.57 | **No difference** — but note the very wide CI; this is a weak null, not a demonstrated equivalence |
| Bilateral strength | 0.56 (0.16 to 0.96), P=0.01 | Favours **bilateral** training |
| Unilateral strength | −0.65 (−0.93 to −0.37), P=0.001 | Favours **unilateral** training |

Strength gains follow the **principle of specificity**: the test resembles the training.

Zhang W, Chen X, Xu K, Xie H, Li D, Ding S, Sun J. Effect of unilateral training and
bilateral training on physical performance: a meta-analysis. *Front Physiol.*
2023;14:1128250. DOI 10.3389/fphys.2023.1128250.
Unilateral training favoured single-leg jump (ES 0.61, 0.23–0.99) and single-leg maximal
force (ES 8.95, 2.30–15.61 — an implausibly large point estimate reflecting heterogeneous
units; reported as published). No clear advantage on bilaterally measured outcomes.
Change-of-direction and balance results inconclusive. Authors list four substantive
limitations including insufficient subdivision of intervention modalities and heterogeneous
instruments.

### 4.2 Bilateral deficit — ESTABLISHED phenomenon, uncertain significance

Železnik P, Slak V, Kozinc Ž, Šarabon N. The association between bilateral deficit and
athletic performance: a brief review. *Sports (Basel).* 2022;10(8):112.
DOI 10.3390/sports10080112. https://pmc.ncbi.nlm.nih.gov/articles/PMC9413577/
- Definition: bilateral maximal force is **lower than the sum of the separate left and right
  efforts**.
- Typical magnitude **around 10%** in concentric/eccentric contractions, increasing with
  movement speed; more pronounced in explosive/ballistic actions than isometric.
- Leading mechanism: **interhemispheric inhibition**; also antagonist coactivation and
  spinal excitability.
- **Plastic:** unilateral exercises *increase* BLD; bilateral exercises *decrease* it. In one
  cited dataset the bilateral index moved +4.2% (3 wk) / +3.7% (6 wk) with bilateral
  training, and −3.0% / −5.4% with unilateral training.
- Association with performance is inconsistent across sports (positive for
  change-of-direction in volleyball/basketball/tennis; inconclusive in soccer; negative in
  judo jumping; neutral for sprinting). Authors stress substantial research gaps.

### 4.3 Asymmetry — WEAK AND INCONSISTENT

Bishop C, Turner A, Read P. Effects of inter-limb asymmetries on physical and sports
performance: a systematic review. *J Sports Sci.* 2018;36(10):1135–1144.
DOI 10.1080/02640414.2017.1361894. PMID 28767317. 18 studies.
Verbatim: *"inter-limb differences in strength may be detrimental to jumping, kicking and
cycling performance"*; jump-derived asymmetries have *"mixed findings"* for change-of-direction
speed; anthropometry, sprinting, dynamic balance and sport-specific findings are
*"inconsistent"*. Critically: *"all results have been reported using associative analysis
with physical or sport performance metrics with no randomised controlled trials included."*

The commonly quoted 10% and 15% thresholds appear in the wider review literature as
**arbitrary and test-specific** (Parkinson et al., "The calculation, thresholds and reporting
of inter-limb strength asymmetry: a systematic review" — **located but abstract not
independently verified in this brief**;
https://www.researchgate.net/publication/353794974 ).

> **UNKNOWN, and important for CC25:** there is **no evidence base establishing that a stable
> asymmetry impairs hypertrophy or strength progress**. The asymmetry literature is about
> *performance associations* and *injury associations*, mostly cross-sectional, mostly in
> athletes. The question "does someone with a permanently weaker, differently shaped or
> absent limb make worse progress on the other side" is not answered by it.

### 4.4 Cross-education — ESTABLISHED effect, bounded application

Manca A, Dragone D, Dvir Z, Deriu F. Cross-education of muscular strength following
unilateral resistance training: a meta-analysis. *Eur J Appl Physiol.* 2017;117(11):2335–2354.
DOI 10.1007/s00421-017-3720-z. PMID 28936703. 31 RCTs, 785 participants.

| Subgroup | Contralateral strength increase |
|---|---|
| **Pooled** | **+11.9% (95% CI 9.1–14.8), P<0.00001** |
| Upper limb | +9.4% |
| Lower limb | +16.4% |
| Isometric training | +8.2% |
| Concentric | +11.3% |
| Eccentric | +17.7% |
| Isotonic-dynamic | +15.9% |

The authors' own caveat, verbatim: *"although a high risk of bias was detected across the
studies."* Earlier meta-analyses a decade before estimated 7.8%.

**Under immobilisation specifically** (much smaller evidence base):
Haggert M, Pearce A, Frazer A, Rahman S, Kidgell D, Siddique U. Determining the effects of
cross-education on muscle strength, thickness and cortical activation following limb
immobilization: a systematic review and meta-analysis. *J Sci Med.* 2020;2(4):1–16.
DOI 10.37714/josam.v2i4.54.
5 RCTs, n=78. Strength SMD **1.60 (0.62–2.59, P=0.001)**; muscle thickness SMD **1.52
(0.22–2.81, P=0.02)** versus immobilisation-only control. No difference in muscle activation
(SMD 0.08), cortical activation regions (MD 31.8, ns) or corticospinal excitability
(MD 5.2, ns). Authors' conclusion: training the free limb *"maintains muscle strength and
muscle thickness of the immobilized limb compared to control (immobilization only)"*.
Small, heterogeneous evidence base in a small journal — treat as promising, not settled.

### 4.5 Training around a non-functional limb — LARGELY UNKNOWN (and mostly R5's remit)

- I found **no general evidence base** on "training around a non-functional limb" as a
  category. What exists is population-specific (spinal cord injury, stroke, limb difference,
  cerebral palsy) and belongs to R5.
- One authoritative anchor, for orientation only: **Martin Ginis KA et al. Evidence-based
  scientific exercise guidelines for adults with spinal cord injury: an update and a new
  guideline.** *Spinal Cord.* 2018;56:308–321. DOI 10.1038/s41393-017-0017-3.
  https://www.nature.com/articles/s41393-017-0017-3 — for fitness and strength benefits,
  ≥20 min moderate-to-vigorous aerobic exercise twice weekly **plus 3 sets of strength
  exercises for each major *functioning* muscle group** at moderate-to-vigorous intensity
  (commonly cited as 3 × 8–10 reps with 2–3 min rest). The guideline explicitly weighs
  SCI-specific adverse events: upper-body overuse injury, skin breakdown, autonomic
  dysreflexia, overheating. **NEEDS CLINICAL REVIEW** before any product use. Note the
  phrasing "each major *functioning* muscle group" — the guideline is written around what
  the person has, not around a whole-body template.
- **Ptomey L, Morgan KA, Blauwet CA, Boudreaux BD, Fernhall B, Hauck J, Legg D, Tow S,
  Martin Ginis KA. ACSM Expert Consensus Statement: Considerations and Recommendations for
  Prescribing Exercise and Designing Physical Activity Programs for People with
  Disabilities.** *Med Sci Sports Exerc.* 2025;57(11):2588–2598.
  https://journals.lww.com/acsm-msse/fulltext/2025/11000/acsm_expert_consensus_statement__considerations.24.aspx
  This is the current authoritative statement. It contains three consensus statements and
  five practical recommendations. **I could not obtain the full text (paywalled).**
  **GAP flagged for R5** — this document should be obtained.
- The 2026 ACSM resistance-training position stand explicitly excludes this population:
  *"Reviews included in this overview of reviews were limited to healthy adults. Provided
  sufficient evidence, future guidelines can be developed for additional subpopulations
  (e.g., older adults and clinical populations)."*

### 4.6 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform:**
- That **unilateral training is a first-class training mode, not a degraded fallback**: no
  hypertrophy penalty versus bilateral (Kassiano 2025), and superior for unilateral strength
  expression. A product that treats "you can only do one side" as an inferior state is
  contradicted by the evidence.
- That **unilateral and bilateral loads are not interchangeable by arithmetic.** Bilateral
  force is roughly 10% below the sum of the two unilateral efforts, the gap varies with
  contraction type, speed and training history, and it *moves in response to training
  modality* (Železnik 2022). Any conversion between per-side and total load is not a doubling
  or halving.
- That **training an unaffected limb produces measurable strength gain in the untrained
  side** (~11.9% pooled, Manca 2017), and that under immobilisation this **attenuates loss**
  on the immobilised side (Haggert 2020).
- That effect magnitude varies systematically by contraction type (eccentric highest) and by
  limb (lower > upper), so a single "cross-education number" would be false precision.

**Cannot inform:**
- **No claim to users that training one side maintains or rehabilitates the other.** The
  immobilisation evidence is 5 RCTs, n=78, and *attenuating loss* is not *maintenance*.
  Manca's own meta flags high risk of bias throughout. Any such user-facing claim would be
  **NEEDS CLINICAL REVIEW** and, in a marketing context, a compliance issue.
- **No target asymmetry percentage, and no treating asymmetry as a defect.** Thresholds are
  arbitrary and test-specific; the evidence is associative with no RCTs; and for a user whose
  asymmetry is anatomical or neurological, "correcting" it is not a goal and framing it as one
  is harmful.
- **No numeric conversion factor** between per-hand and total load, or between one-side and
  two-side performance.
- **No extension of cross-education findings to multi-joint gym lifts.** The effect estimates
  come from short trials in healthy young adults using isolated-joint MVIC and 1RM measures.
- **No extension to disabled populations without R5's population evidence.**

---

## 5. SYMPTOM-CONTINGENT PACING FOR CHRONIC / FLUCTUATING CONDITIONS

**Tag the whole section: NEEDS CLINICAL REVIEW.** General principles only, as briefed. This
is the section most likely to be misread as a licence to build.

### 5.1 "Pacing" is not one measurable thing — ESTABLISHED EVIDENCE (a measurement problem)

Hadzic R, Sharpe L, Wood BM. The relationship between pacing and avoidance in chronic pain:
a systematic review and meta-analysis. *J Pain.* 2017;18(10):1165–1173.
DOI 10.1016/j.jpain.2017.04.008. PMID 28479209. 16 studies.
Pacing and avoidance measures correlate: overall r = .290 (P<.001); multiple-item measures
r = .410; single-item measures r = .105 (the difference between measure types is itself
significant). Conclusion, verbatim: *"Existing measures of pacing — particularly
multiple-item measures — may partially confound pacing with avoidance. Further research is
required to ensure that a reliable measure of pacing that distinguishes this construct from
avoidance is available to adequately evaluate pacing instruction."*

### 5.2 What the correlational evidence shows — ESTABLISHED EVIDENCE, and uncomfortable

Andrews NE, Strong J, Meredith PJ. Activity pacing, avoidance, endurance, and associations
with patient functioning in chronic pain: a systematic review and meta-analysis. *Arch Phys
Med Rehabil.* 2012;93(11):2109–2121.e7. DOI 10.1016/j.apmr.2012.05.029. PMID 22728699.
41 studies.

| Approach to activity | Association with functioning |
|---|---|
| **Avoidance** | Consistently associated with **increased pain, poorer psychological functioning, greater physical disability** |
| **Endurance (persisting)** | Correlated with **enhanced functioning** — but dependent on measurement; **overactivity** measures linked to **poorer** outcomes |
| **Pacing** | Associated with **better psychological functioning** but **more pain and disability** |

Authors' own reading: causation cannot be determined; the unexpected pacing result *"may
reflect ineffectiveness if not used to gradually increase activity"*, or reverse causation
(people with more pain and disability who are psychologically well-functioning may be more
inclined to pace).

> **This is the single most important honest finding of the section.** Pacing, as measured in
> chronic pain, is **not** straightforwardly beneficial. The "boom-bust is bad" narrative is
> better supported at the *overactivity* end than the "pacing is the cure" end.

### 5.3 Where pacing *is* the guideline position: ME/CFS — PROFESSIONAL CONSENSUS

**NICE guideline NG206 (2021).** *Myalgic encephalomyelitis (or encephalopathy)/chronic
fatigue syndrome: diagnosis and management.* https://www.nice.org.uk/guidance/ng206

- **Graded exercise therapy is not to be offered.** NICE defines GET as establishing a
  baseline then making **fixed incremental increases** in activity, and states that any
  programme using fixed incremental increases should not be offered, as it can worsen
  symptoms.
- The recommended approach is **energy management within the person's energy limits**;
  people should not push through symptoms.
- **Recommendation 1.11.13**, as published by NICE, for anyone who does take up a
  personalised physical activity or exercise programme — the programme must involve, and be
  reviewed regularly against:
  - establishing their **physical activity baseline at a level that does not worsen their
    symptoms**;
  - **initially reducing physical activity to below their baseline level**;
  - **maintaining this successfully for a period of time before attempting to increase it**;
  - making **flexible adjustments up or down as needed**, to gradually improve physical
    abilities while staying within energy limits;
  - **recognising a flare-up or relapse early** and outlining how to manage it.
- Such a programme should only be offered **on the basis that it is delivered or overseen by
  a physiotherapist in an ME/CFS specialist team**.

Note the **shape**: baseline → *down* → hold → bidirectional flexible adjustment. That is
structurally different from the ramp in §2 and from ordinary progressive overload.

Contested, and worth recording: the 2021 guideline's evidence handling has been publicly
critiqued in the academic literature (e.g. a systematic critique from King's College London
researchers). It nonetheless remains the applicable UK guideline.

### 5.4 Long COVID and post-exertional symptom exacerbation — PROFESSIONAL CONSENSUS, evolving

WHO 2021 rehabilitation guidance for post COVID-19 condition advises that rehabilitating
patients be educated to resume everyday activities **conservatively, at a pace safe and
manageable for energy levels within the limits of current symptoms**, and **should not be
pushed for post-exertional fatigue**.
Physiotherapy guidance (Long COVID Physio, https://longcovid.physio/exercise) recommends
**screening for post-exertional symptom exacerbation (PESE) before any exercise-based
intervention**, on the basis that exercise is not a safe rehabilitation intervention for
fatigue in people experiencing PESE.

### 5.5 Fibromyalgia and chronic widespread pain — MIXED, and reported directionally only

Multicomponent self-management programmes that include pacing **alongside** exercise and
psychological strategies show improvements in pain, function, fatigue and mental health, at
**low quality of evidence**; pacing as a standalone intervention is less consistent.
**I was unable to retrieve the underlying reviews' full text within this brief** — treat this
paragraph as directional signposting for a follow-up search, not as a citation-backed claim.

### 5.6 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform (factual boundaries only):**
- That **a fixed incremental progression rule is contraindicated by a UK national guideline**
  for at least one population (ME/CFS, NICE NG206), and that this population overlaps with
  people who will install a training app. This is a fact about the guideline landscape, not a
  product instruction.
- That **bidirectional adjustment (down as well as up) and an explicit hold phase are
  recognised clinical structures**. A system that can only ratchet upward is therefore not
  merely suboptimal for some users, it runs against published guidance for them.
- That **"recognising a flare early and having a plan" is a named component** of the
  recommended clinical approach, so the *shape* of letting a person record a downturn and
  reduce is consistent with clinical structure.
- That **the evidence for pacing as a treatment is weak and contested** (Andrews 2012;
  Hadzic 2017), so the product must not present pacing as effective.

**Cannot inform:**
- **The app must not deliver, or describe itself as delivering, pacing therapy, energy
  management, or an activity programme for ME/CFS, long COVID or chronic pain.** NG206
  requires specialist physiotherapist delivery and oversight. **NEEDS CLINICAL REVIEW.**
- **No computed "energy envelope", "baseline" or symptom-contingent dose from logged data.**
  No validated algorithm exists, and Hadzic 2017 shows the construct itself is not yet
  cleanly measurable.
- **No inferring a condition from behaviour, and no nudging based on an inferred condition.**
- **No claim, anywhere in the product or its marketing, that pacing improves pain or
  function.** Andrews 2012 found pacing associated with *more* pain and disability.
- **No transfer of §2's re-entry ramps into this territory.** The shapes are opposites: §2
  ramps up from a reduced start; NG206 goes *below* baseline and holds.

---

## 6. MINIMUM EFFECTIVE / MAINTENANCE DOSE

This is the strongest and most directly transferable evidence in the report.

### 6.1 How little maintains what was built — ESTABLISHED EVIDENCE

**Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining physical performance: the minimal
dose of exercise needed to preserve endurance and strength over time.** *J Strength Cond Res.*
2021;35(5):1449–1458. DOI 10.1519/JSC.0000000000003964. PMID 33629972.
Narrative review; only studies with >4 weeks of reduced training. Verbatim:

> *"Strength and muscle size (at least in younger populations) can be maintained for up to 32
> weeks with as little as 1 session of strength training per week and 1 set per exercise, as
> long as exercise intensity (relative load) is maintained; whereas, in older populations,
> maintaining muscle size may require up to 2 sessions per week and 2–3 sets per exercise,
> while maintaining exercise intensity."*
>
> *"Our primary conclusion is that exercise intensity seems to be the key variable for
> maintaining physical performance over time, despite relatively large reductions in exercise
> frequency and volume."*

Stated limit: *"Insufficient data exists to make specific recommendations for athletes or
military personnel."*

**Bickel CS, Cross JM, Bamman MM. Exercise dosing to retain resistance training adaptations
in young and older adults.** *Med Sci Sports Exerc.* 2011;43(7):1177–1187.
DOI 10.1249/MSS.0b013e318207c15d. PMID 21131862.
n=70. Phase 1: RT 3 d/wk for 16 weeks. Phase 2: 32 weeks at **one-third dose**, **one-ninth
dose**, or **detraining**. Young 20–35, older 60–75.
- *"Both maintenance prescriptions preserved phase 1 muscle hypertrophy in the young but not
  the old."* The one-third dose produced **further** myofibre hypertrophy in the young.
- *"Strength gained during phase 1 was largely retained throughout detraining with only a
  slight reduction at the final time point"* — in **both** age groups.
- Conclusion: older adults need a **higher** weekly dose than the young to maintain myofibre
  hypertrophy, *"yet gains in specific strength among older adults were well preserved."*

This is the cleanest experimental separation of **strength retention from size retention**,
and of **young from old**, that I found.

**McMaster 2013** (§1.3) adds the athlete-population data point: 2–4 resistance sessions per
muscle group per week develop strength and power; strength holds for up to 3 weeks of
detraining, with decay rates increasing over 5–16 weeks.

### 6.2 How little still *improves* strength — ESTABLISHED EVIDENCE, narrow population

**Androulakis-Korakakis P, Fisher JP, Steele J. The minimum effective training dose required
to increase 1RM strength in resistance-trained men: a systematic review and meta-analysis.**
*Sports Med.* 2020;50(4):751–765. DOI 10.1007/s40279-019-01236-0. PMID 31797219.
6 studies, meta of 5. Conclusion, verbatim: *"performing a single set of 6–12 repetitions
with loads ranging from approximately 70–85% 1RM 2–3 times per week with high intensity of
effort (reaching volitional or momentary failure) for 8–12 weeks can produce suboptimal, yet
significant increases in SQ and BP 1RM strength in resistance-trained men."*
Meta-analytic increases: overall 1RM +12.09 kg (8.16–16.03); squat +17.48 kg (8.51–26.46);
bench +8.25 kg (0.68–15.83).
Stated limits: **no deadlift data, no data in trained women, no data in highly trained
strength athletes.**

### 6.3 The current authoritative dose-response position — PROFESSIONAL CONSENSUS (2026)

**Currier BS, D'Souza AC, Fiatarone Singh MA, et al. ACSM Position Stand: Resistance Training
Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults:
An Overview of Reviews.** *Med Sci Sports Exerc.* 2026;58(4):851–872.
DOI 10.1249/MSS.0000000000003897. https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
First update in 17 years.
- Primary recommendation: resistance training with **high effort, at least twice weekly, all
  major muscle groups**.
- **Strength**: enhanced by higher volumes (≥10 sets/wk) and heavier loads (≥80% 1RM).
- **Hypertrophy**: enhanced by higher volumes (≥10 sets/wk) and eccentric overload;
  *"RT did not influence hypertrophy performed with low (1 d/wk) versus high (>5 d/wk)
  frequency when total volume was equated."*
- *"'minimal doses' of RT are able to bring about substantial strength, hypertrophy, and
  physical functional gains."*
- *"individualizing programs to increase RT participation is … more important than conforming
  to specific RTx criteria."*
- *"there is insufficient evidence to quantify exact RIR and perceived exertion targets."*
- **Scope: healthy adults only.**

### 6.4 One widely circulated number that is not sourced — UNVERIFIED

"You can maintain muscle on 6–10 sets per muscle group per week" is ubiquitous in coaching
content. It does not appear in Spiering 2021, Bickel 2011 or the ACSM 2026 stand. If used, it
is **PRODUCT INFERENCE**, not evidence.

### 6.5 WHAT THIS CAN AND CANNOT INFORM IN A DETERMINISTIC FITNESS PRODUCT

**Can inform:**
- That a **reduced-but-not-zero mode is well supported**: in younger adults, roughly
  **one session per week and about one set per exercise, at maintained relative load,
  retained strength and size for up to 32 weeks** (Spiering 2021), and a **one-third dose**
  preserved hypertrophy over 32 weeks (Bickel 2011).
- That **older users need more to maintain size** (up to 2 sessions and 2–3 sets per exercise)
  while **strength is retained comparatively easily at any age** (Spiering 2021; Bickel 2011).
- That **intensity (relative load) is the variable to protect when volume is cut.** This is the
  single most transferable finding in this report, and it is stated as the primary conclusion
  of the dedicated review.
- That the retention window is measured in **months, not weeks**, so a constrained period is
  not an emergency.
- That **a little continued training is materially different from none** — every maintenance
  study contrasts reduced dose against detraining, and the reduced doses win.

**Cannot inform:**
- **No maintenance dose for a specific muscle under a partial restriction.** Every maintenance
  study reduces the *whole programme*; none reduces one region while others continue. The CC25
  case is unstudied. **UNKNOWN.**
- **No maintenance dose for athletes** (Spiering says so explicitly) **or for anyone with a
  disability or chronic condition** (ACSM 2026 restricts itself to healthy adults).
- **The central condition may not be satisfiable.** All of it depends on *maintaining relative
  load*. For a user whose restriction is precisely what prevents high relative load, the
  literature's premise fails and none of these numbers apply. This is a real and likely CC25
  case and the evidence does not cover it.
- **No sourced set-count maintenance number** (§6.4).
- **Nothing about how these numbers interact with a pain-, symptom- or flare-contingent
  reduction.** §5 and §6 do not compose.

---

## 7. NEEDS CLINICAL REVIEW REGISTER

Every item below must not become app logic, coach copy, or a user-facing claim without
domain (clinical) review. Ordered by risk.

| # | Item | Why it needs review | Source anchor |
|---|---|---|---|
| CR-1 | **Any numeric pain threshold governing whether a set proceeds** (the 5/10 VAS rule and every variant) | A treatment-protocol parameter from supervised tendinopathy rehabilitation, validated for nothing else. Presupposes a diagnosis. | Thomeé 1997; Silbernagel 2007 §3.1 |
| CR-2 | **The next-morning and week-to-week pain rules as automated logic** | Same package, same presupposition; the model was one component of a supervised, progressively loaded programme. | Silbernagel 2007 §3.6 |
| CR-3 | **Any "traffic light" load-adjustment arithmetic** | The percentages have no traceable primary source. | §3.5 (UNVERIFIED) |
| CR-4 | **Interpreting a user's pain report as a tissue-tolerance or safety signal** | Requires a diagnosis to be meaningful; the studied populations were all diagnosed. | §3.6 |
| CR-5 | **Anything resembling pacing therapy, energy management, an energy envelope, or a computed activity baseline** | NG206 requires delivery/oversight by a physiotherapist in an ME/CFS specialist team; the construct is not cleanly measurable. | NICE NG206; Hadzic 2017 §5.1, §5.3 |
| CR-6 | **Any claim that pacing, flare-aware modification or symptom-contingent training improves pain, fatigue or function** | Correlational evidence associates pacing with *more* pain and disability; causation undetermined. | Andrews 2012 §5.2 |
| CR-7 | **Fixed incremental progression applied to a user who reports post-exertional symptom exacerbation** | Explicitly contraindicated for ME/CFS; PESE screening is recommended before exercise interventions in long COVID. | NICE NG206 §5.3; WHO 2021 / Long COVID Physio §5.4 |
| CR-8 | **Any re-entry rule keyed on injury, pain, surgery, clinician-prescribed immobilisation or a clinician's restriction** | This is return-to-sport / return-to-activity decision-making: risk management, biopsychosocial, shared decision, criteria-based. Not an algorithm. | Ardern 2016 §2.4; CSCCa/NSCA scenario 3 §2.1 |
| CR-9 | **Any claim that training one limb maintains, preserves or rehabilitates the other** | Cross-education under immobilisation rests on 5 RCTs, n=78; "attenuates loss" is not "maintains". Manca's meta reports high risk of bias throughout. | Haggert 2020; Manca 2017 §4.4 |
| CR-10 | **Treating inter-limb asymmetry as a defect, or setting a symmetry target** | Thresholds arbitrary and test-specific; associative evidence only, no RCTs; for anatomical or neurological asymmetry the framing is wrong and potentially harmful. | Bishop 2018 §4.3 |
| CR-11 | **Any resistance-training prescription for a user with a disability or chronic condition derived from general-population dose-response** | ACSM 2026 explicitly limits itself to healthy adults; SCI guidance carries condition-specific adverse-event considerations (autonomic dysreflexia, skin breakdown, overuse, overheating). | ACSM 2026 §6.3; Martin Ginis 2018 §4.5 |
| CR-12 | **Porting the CSCCa/NSCA 50/30/20/10 and IRV 11–30 caps into consumer logic** | Safety ceilings for supervised collegiate athletes with medical screening and emergency action plans; motivated by rhabdomyolysis and heat illness. | Caterisano 2019 §2.1 |
| CR-13 | **Any product framing that treats a disabled user's baseline as a "restricted" or "reduced" version of a non-disabled template** | Not a clinical-safety point but a clinical-and-lived-experience judgement; the SCI guideline's own phrasing is "each major *functioning* muscle group". | Martin Ginis 2018 §4.5 |

---

## 8. HONEST UNKNOWNS AND UNRETRIEVED SOURCES

**Genuinely unknown in the literature (not merely unsearched):**
1. **Re-entry after a *local* restriction** while the rest of the body kept training. No
   source at any tier addresses it. This is the central CC25 case.
2. **Maintenance dose for a specific muscle or region under partial restriction.** All
   maintenance studies reduce the whole programme.
3. **A per-week decay rate for strength or muscle** in the general population. Explicitly
   disclaimed by the field (Encarnação 2022).
4. **A retraining-speed multiplier.** The best human study says the physiological benefit
   "remains to be determined" (Cumming 2024).
5. **Whether stable asymmetry impairs training *progress*** (as opposed to correlating with
   performance measures). Not studied.
6. **How §5 (symptom-contingent) and §6 (maintenance dose) interact.** They do not compose in
   the literature.

**Sources located but not retrieved within this brief (recommended follow-ups):**
- ACSM Expert Consensus Statement 2025 on prescribing exercise for people with disabilities
  (Ptomey et al., MSSE 57(11):2588–2598) — **paywalled; highest-value gap; hand to R5.**
- Parkinson et al. (2021), calculation/thresholds/reporting of inter-limb strength asymmetry
  — abstract not independently verified.
- Hickmott et al. (PeerJ), autoregulation systematic review — publisher blocked.
- Fibromyalgia / chronic widespread pain multicomponent self-management reviews (§5.5).
- Whether the pain-monitoring rule is genuinely referenced in the BJSM Achilles tendinopathy
  clinical practice guideline and the 2018 Dutch multidisciplinary tendinopathy guideline
  (claimed by a commercial page; unverified).

**Process note.** The session's WebSearch budget (200 calls) was exhausted before these could
be closed. Publisher paywalls (Wiley, LWW, ScienceDirect, Springer, NSCA, NICE, PubMed HTML)
returned 402/403 repeatedly; abstracts were recovered via the Europe PMC REST API, and two
PDFs were text-extracted locally. Everything quoted verbatim in this report came from a
retrieved primary document or a publisher-hosted abstract, not from a search summary.

---

## 9. FULL REFERENCE LIST

**Detraining and retraining**
1. Mujika I, Padilla S. Detraining… Part I: short term insufficient training stimulus. *Sports Med.* 2000;30(2):79–87. https://pubmed.ncbi.nlm.nih.gov/10966148/
2. Mujika I, Padilla S. Detraining… Part II: long term insufficient training stimulus. *Sports Med.* 2000;30(3):145–154. https://pubmed.ncbi.nlm.nih.gov/10999420/
3. Bosquet L, Berryman N, Dupuy O, Mekary S, Arvisais D, Bherer L, Mujika I. Effect of training cessation on muscular performance: a meta-analysis. *Scand J Med Sci Sports.* 2013;23(3):e140–9. DOI 10.1111/sms.12047. https://onlinelibrary.wiley.com/doi/abs/10.1111/sms.12047
4. McMaster DT, Gill N, Cronin J, McGuigan M. The development, retention and decay rates of strength and power in elite rugby union, rugby league and American football: a systematic review. *Sports Med.* 2013;43(5):367–384. DOI 10.1007/s40279-013-0031-3. https://link.springer.com/article/10.1007/s40279-013-0031-3
5. Grgic J. Use it or lose it? A meta-analysis on the effects of resistance training cessation (detraining) on muscle size in older adults. *IJERPH.* 2022;19(21):14048. https://pmc.ncbi.nlm.nih.gov/articles/PMC9657634/
6. Encarnação IGA, Viana RB, Soares SRS, Freitas EDS, de Lira CAB, Ferreira-Junior JB. Effects of detraining on muscle strength and hypertrophy induced by resistance training: a systematic review. *Muscles.* 2022;1(1):1–15. https://www.mdpi.com/2813-0413/1/1/1
7. Ogasawara R, Yasuda T, Sakamaki M, Ozaki H, Abe T. Effects of periodic and continued resistance training on muscle CSA and strength in previously untrained men. *Clin Physiol Funct Imaging.* 2011;31(5):399–404. https://onlinelibrary.wiley.com/doi/10.1111/j.1475-097X.2011.01031.x
8. Halonen E, Gabriel I, Kelahaara M, Ahtiainen J, Hulmi J. Does taking a break matter — adaptations in muscle strength and size between continuous and periodic resistance training. *Scand J Med Sci Sports.* 2024;34(10):e14739. https://onlinelibrary.wiley.com/doi/10.1111/sms.14739 ; summary: https://www.jyu.fi/en/news/breaks-in-resistance-training-do-not-impair-long-term-development-in-strength-and-muscle-size
9. Staron RS, Leonardi MJ, Karapondo DL, Malicky ES, Falkel JE, Hagerman FC, Hikida RS. Strength and skeletal muscle adaptations in heavy-resistance-trained women after detraining and retraining. *J Appl Physiol.* 1991;70(2):631–640. https://journals.physiology.org/doi/abs/10.1152/jappl.1991.70.2.631
10. Wall BT, Dirks ML, van Loon LJC. Skeletal muscle atrophy during short-term disuse: implications for age-related sarcopenia. *Ageing Res Rev.* 2013;12(4):898–906. https://pubmed.ncbi.nlm.nih.gov/23948422/
11. Cumming KT, Reitzner SM, Hanslien M, Skilnand K, Seynnes OR, Horwath O, Psilander N, Sundberg CJ, Raastad T. Muscle memory in humans: evidence for myonuclear permanence and long-term transcriptional regulation after strength training. *J Physiol.* 2024;602(17):4171–4193. https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP285675
12. Snijders T, Aussieker T, Holwerda A, Parise G, van Loon LJC, Verdijk LB. The concept of skeletal muscle memory: evidence from animal and human studies. *Acta Physiol (Oxf).* 2020;229(3):e13465. https://onlinelibrary.wiley.com/doi/abs/10.1111/apha.13465
13. Psilander N, et al. "Muscle memory" not mediated by myonuclear number? Secondary analysis of human detraining data. *J Appl Physiol.* 2019. https://journals.physiology.org/doi/full/10.1152/japplphysiol.00506.2019
14. Murach KA, et al. Muscle memory: are myonuclei ever lost? (Letter) *J Appl Physiol.* 2019. https://journals.physiology.org/doi/full/10.1152/japplphysiol.00761.2019

**Return to training practice**
15. Caterisano A, Decker D, Snyder B, Feigenbaum M, Glass R, House P, Sharp C, Waller M, Witherspoon Z. CSCCa and NSCA Joint Consensus Guidelines for Transition Periods: Safe Return to Training Following Inactivity. *Strength Cond J.* 2019;41(3). https://www.nsca.com/about-us/position-statements/safe-return-to-training/ ; PDF: https://www.nsca.com/contentassets/202023e9d6c440dab582d9d87c0f3729/cscca_and_nsca_joint_consensus_guidelines_for.1.pdf
16. Mannie K, Lambrinides T. Powerline: returning to action after a layoff. *Coach & Athletic Director*, 7 Dec 2017. https://coachad.com/articles/powerline-returning-action-layoff/
17. Greig L, Stephens Hemingway BH, Aspe RR, Cooper K, Comfort P, Swinton PA. Autoregulation in resistance training: addressing the inconsistencies. *Sports Med.* 2020;50:1873–1887. https://pubmed.ncbi.nlm.nih.gov/32813181/
18. Ardern CL, Glasgow P, Schneiders A, et al. 2016 Consensus statement on return to sport from the First World Congress in Sports Physical Therapy, Bern. *Br J Sports Med.* 2016;50(14):853–864. https://ifspt.org/wp-content/uploads/2025/05/2016-Consensus-statement-on-return.pdf

**Pain-monitoring models**
19. Thomeé R. A comprehensive treatment approach for patellofemoral pain syndrome in young women. *Phys Ther.* 1997;77(12):1690–1703. https://academic.oup.com/ptj/article-pdf/77/12/1690/10761598/ptj1690.pdf
20. Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy: a randomized controlled study. *Am J Sports Med.* 2007;35(6):897–906. https://journals.sagepub.com/doi/10.1177/0363546506298279
21. Sprague AL, Couppé C, Pohlig RT, Snyder-Mackler L, Grävare Silbernagel K. Pain-guided activity modification during treatment for patellar tendinopathy: a feasibility and pilot randomized clinical trial. *Pilot Feasibility Stud.* 2021;7:58. https://pmc.ncbi.nlm.nih.gov/articles/PMC7905015/
22. Smith BE, Hendrick P, Smith TO, Bateman M, Moffatt F, Rathleff MS, Selfe J, Logan P. Should exercises be painful in the management of chronic musculoskeletal pain? A systematic review and meta-analysis. *Br J Sports Med.* 2017;51(23):1679–1687. https://pubmed.ncbi.nlm.nih.gov/28596288/

**Unilateral / asymmetry / bilateral deficit / cross-education**
23. Kassiano W, Nunes JP, Costa B, Ribeiro AS, Loenneke JP, Cyrino ES. Comparison of muscle growth and dynamic strength adaptations induced by unilateral and bilateral resistance training: a systematic review and meta-analysis. *Sports Med.* 2025. https://link.springer.com/article/10.1007/s40279-024-02169-z
24. Zhang W, Chen X, Xu K, Xie H, Li D, Ding S, Sun J. Effect of unilateral training and bilateral training on physical performance: a meta-analysis. *Front Physiol.* 2023;14:1128250. https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1128250/full
25. Železnik P, Slak V, Kozinc Ž, Šarabon N. The association between bilateral deficit and athletic performance: a brief review. *Sports (Basel).* 2022;10(8):112. https://pmc.ncbi.nlm.nih.gov/articles/PMC9413577/
26. Bishop C, Turner A, Read P. Effects of inter-limb asymmetries on physical and sports performance: a systematic review. *J Sports Sci.* 2018;36(10):1135–1144. https://pubmed.ncbi.nlm.nih.gov/28767317/
27. Manca A, Dragone D, Dvir Z, Deriu F. Cross-education of muscular strength following unilateral resistance training: a meta-analysis. *Eur J Appl Physiol.* 2017;117(11):2335–2354. https://link.springer.com/article/10.1007/s00421-017-3720-z
28. Haggert M, Pearce A, Frazer A, Rahman S, Kidgell D, Siddique U. Determining the effects of cross-education on muscle strength, thickness and cortical activation following limb immobilization: a systematic review and meta-analysis. *J Sci Med.* 2020;2(4):1–16. https://www.josam.org/josam/article/view/54
29. Martin Ginis KA, et al. Evidence-based scientific exercise guidelines for adults with spinal cord injury: an update and a new guideline. *Spinal Cord.* 2018;56:308–321. https://www.nature.com/articles/s41393-017-0017-3
30. Ptomey L, Morgan KA, Blauwet CA, Boudreaux BD, Fernhall B, Hauck J, Legg D, Tow S, Martin Ginis KA. ACSM Expert Consensus Statement: Considerations and recommendations for prescribing exercise and designing physical activity programs for people with disabilities. *Med Sci Sports Exerc.* 2025;57(11):2588–2598. https://journals.lww.com/acsm-msse/fulltext/2025/11000/acsm_expert_consensus_statement__considerations.24.aspx **(not retrieved — paywalled)**

**Pacing**
31. Hadzic R, Sharpe L, Wood BM. The relationship between pacing and avoidance in chronic pain: a systematic review and meta-analysis. *J Pain.* 2017;18(10):1165–1173. https://www.sciencedirect.com/science/article/pii/S1526590017305709
32. Andrews NE, Strong J, Meredith PJ. Activity pacing, avoidance, endurance, and associations with patient functioning in chronic pain: a systematic review and meta-analysis. *Arch Phys Med Rehabil.* 2012;93(11):2109–2121.e7. https://www.sciencedirect.com/science/article/abs/pii/S0003999312004273
33. NICE. Myalgic encephalomyelitis (or encephalopathy)/chronic fatigue syndrome: diagnosis and management. NG206, 2021. https://www.nice.org.uk/guidance/ng206/chapter/recommendations
34. ME Association summary of NG206 physical activity recommendations. https://meassociation.org.uk/nice-guidelines/items/incorporating-physical-activity-and-exercise/
35. Long COVID Physio. Exercise (PESE screening guidance; cites WHO 2021 rehabilitation guidance). https://longcovid.physio/exercise

**Minimum effective / maintenance dose**
36. Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining physical performance: the minimal dose of exercise needed to preserve endurance and strength over time. *J Strength Cond Res.* 2021;35(5):1449–1458. https://journals.lww.com/nsca-jscr/fulltext/2021/05000/maintaining_physical_performance__the_minimal_dose.35.aspx
37. Bickel CS, Cross JM, Bamman MM. Exercise dosing to retain resistance training adaptations in young and older adults. *Med Sci Sports Exerc.* 2011;43(7):1177–1187. https://pubmed.ncbi.nlm.nih.gov/21131862/
38. Androulakis-Korakakis P, Fisher JP, Steele J. The minimum effective training dose required to increase 1RM strength in resistance-trained men: a systematic review and meta-analysis. *Sports Med.* 2020;50(4):751–765. https://link.springer.com/article/10.1007/s40279-019-01236-0
39. Currier BS, D'Souza AC, Fiatarone Singh MA, et al. ACSM Position Stand: Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews. *Med Sci Sports Exerc.* 2026;58(4):851–872. https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/

---

*End of R3 report. Written for CC25 synthesis; no product rules proposed, no thresholds
recommended. Numbers quoted are published findings, cited to source.*
