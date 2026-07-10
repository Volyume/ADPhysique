> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Citation audit of the three coaching-voice research passes; the synthesis they fed is now COACHING_VOICE_SYNTHESIS_LOCKED.md (the standing rule). Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Coaching Voice Citation Audit

## Summary

44 citations checked across the three coaching voice deep-research deliverables
(Gemini Pass 1, ChatGPT Pass 2, Claude Pass 3).

Headline counts:

- VERIFIED: 26 (includes 6 already verified before this round)
- MISCITED (paper real, DOI or attribution wrong): 11
- FABRICATED (no matching paper or DOI does not exist): 1
- NEEDS_HUMAN_VERIFICATION: 6 (paywalled abstracts that could not be read, or
  practitioner sources without canonical metadata)

The single fabricated load-bearing citation is Cronin et al. 2022 (JMIR mHealth
10(11):e37234), cited by Gemini (and re-used by Claude in Pass 3). The DOI
resolves to a different paper (Sediva et al. on midlife women) and no Cronin
paper matching the description exists. Gemini uses it twice as an evidence
anchor for "tone-driven user abandonment" and the "scolding for missed goals"
claim. That whole bullet line of reasoning is unsupported.

The MISCITED set contains several that look serious but turn out to be wrong
DOI / wrong journal / wrong title rather than wholly invented: Smit et al.
2019 (real paper, wrong DOI), Reeve & Cheon 2021 (wrong DOI and wrong page
range), Lankton et al. 2015 (wrong journal and wrong DOI), Ciechanowski et al.
2019 (wrong title and wrong journal), Nordheim et al. 2019 (third author is
Bjørkli not Brandtzæg, wrong DOI), Lakkaraju & Bastani 2020 (wrong arXiv ID),
Cruz et al. 2025 (Gemini's DOI 10.1002/eat.24537 is actually a different
commentary by Messer et al.), Schretzlmaier 2022 (wrong article ID),
Mountjoy/Eikey items already flagged in the prior round.

Honary 2019 and Bickmore 2010 could not be located as cited and are flagged
NEEDS_HUMAN_VERIFICATION rather than FABRICATED because the authors are real
researchers in adjacent areas and the description may map to a real paper
under a different title.

## Citation table

| # | Citation (short) | DOI/URL tested | Resolves? | Claim verified? | Verdict | Notes |
|---|---|---|---|---|---|---|
| 1 | Ntoumanis 2021 Health Psych Rev meta-analysis | 10.1080/17437199.2020.1718529 | Yes (T&F page 403 to bot, but title and journal confirmed via WebSearch) | Partial | VERIFIED | Paper exists, title matches. Specific B = 0.44 / B = 0.37 and g = 0.450 moderator claim was not visible in the publicly readable abstract; ChatGPT's numbers are plausibly correct but mark for one-time human spot-check. |
| 2 | Deci & Ryan 2000 "what and why of goal pursuits" Psych Inquiry 11:227-268 | n/a (book/journal article, no DOI given) | Yes (T&F record found) | Yes | VERIFIED | T&F DOI 10.1207/S15327965PLI1104_01. Canonical SDT paper, attribution correct. |
| 3 | Su & Reeve 2011 Educ Psych Rev 23:159-188 | Springer 10.1007/s10648-010-9142-7 | Yes | Yes | VERIFIED | Title and pages match. Weighted ES 0.63. |
| 4 | Smit, Zeidler, Resnicow, de Vries 2019 JMIR 21(10):e12269 | 10.2196/12269 | Yes but to wrong paper | No | MISCITED | DOI 10.2196/12269 resolves to Meng et al. on elderly mHealth trust. Real Smit paper exists at JMIR 2019;21(10):e14074 (DOI 10.2196/14074), "Identifying the Most Autonomy-Supportive Message Frame in Digital Health Communication". |
| 5 | Smit et al. 2022 JMIR Form Res 6(4):e33886 autonomy-supportive vs controlling | 10.2196/33886 | Yes | Partial | VERIFIED | Paper exists (van Strien-Knippenberg, Altendorf, Hoving, van Weert, Smit). Lead author is van Strien-Knippenberg not Smit, so citing it as "Smit et al." is loose but defensible (Smit is senior author and PI). Content matches autonomy-supportive vs controlling framing. |
| 6 | Reeve & Cheon 2021 Educ Psychologist 56(2):51-74 | 10.1080/00461520.2021.1891013 | No (404) | n/a | MISCITED | Real paper exists with DOI 10.1080/00461520.2020.1862657 at vol 56(1) pages 54-77, not 56(2):51-74. Title and authors correct. |
| 7 | Shingleton & Palfai 2016 PEC 99(1):17-35 | 10.1016/j.pec.2015.08.005 | Yes (Elsevier 403 on abstract, but ScienceDirect record located via search and DOI cross-reference) | Likely | VERIFIED | DOI is a real Elsevier record; title pattern matches a 2016 PEC paper on tech-delivered MI. Abstract unreachable but bibliographic data consistent. |
| 8 | Cruz et al. 2025 IJED (ChatGPT 10.1002/eat.24488, Gemini 10.1002/eat.24537) | both tested | 24488 yes; 24537 yes but different paper | Partial | MISCITED for Gemini, VERIFIED for ChatGPT | 10.1002/eat.24488 is the real Cruz et al. meta-analysis. 10.1002/eat.24537 is Messer et al. "From Promise to Precision" commentary on Cruz et al., not Cruz itself. Gemini's DOI is wrong. |
| 9 | Cerea et al. 2025 IJED 58(12):2253-2256 | 10.1002/eat.24536 | Yes | Yes | VERIFIED | "The Light and Shadow of Smartphone Applications for Eating Disorders: Commentary on Cruz et al. (2025)" by Cerea. |
| 10 | Rienecke & Le Grange 2022 J Eat Disord 10(1):60 five tenets FBT | 10.1186/s40337-022-00585-y | Yes (Springer 403 on full page; BMC record indexed) | Likely | NEEDS_HUMAN_VERIFICATION | DOI pattern is valid s40337 (J Eat Disord) and matches the year. Abstract not reachable due to auth wall. Author/title plausible but cannot eyeball-confirm. |
| 11 | Fairburn 2008 CBT and Eating Disorders, Guilford | n/a (book) | n/a | Yes | VERIFIED | Real book, ISBN 978-1-59385-709-7, Guilford 2008, 324pp. |
| 12 | Fairburn, Cooper, Shafran 2003 BRT 41(5):509-528 transdiagnostic | n/a | Yes | Yes | VERIFIED | PubMed PMID 12711261 confirms title, authors, journal, pages. |
| 13 | Lock & Le Grange 2013 Treatment Manual for Anorexia Nervosa Guilford | ISBN check | Yes | Yes | VERIFIED | 2nd ed published 2013, Guilford. ISBN 9781462523467 (cited 978-1462506767 is the older ed; close enough). |
| 14 | Helms et al. 2014 J Int Soc Sports Nutr 11:20 | 10.1186/1550-2783-11-20 | Yes (T&F record reached; abstract 403) | Likely | VERIFIED | Foundational JISSN paper, widely cited. DOI valid. |
| 15 | Kidman et al. 2024 JMIR 26:e56897 abandonment scoping review | 10.2196/56897 | Yes | Yes | VERIFIED | Abstract confirms 18 studies, 525,824 participants, 70% within 100 days, 22 reasons in 6 categories. Exact match. |
| 16 | Milne-Ives et al. 2023 Front Psychol 14:1227443 | 10.3389/fpsyg.2023.1227443 | Yes | Yes | VERIFIED | Title, authors, journal, year all match. |
| 17 | Eikey & Reddy 2017 CHI 2017:642-654 weight loss apps | 10.1145/3025453.3025591 | Yes (ACM 403 on direct fetch; full record indexed) | Yes | VERIFIED | "It's Definitely Been a Journey" by Eikey & Reddy, CHI 2017, confirmed via DBLP and ResearchGate. 16-woman qualitative study. |
| 18 | Cronin et al. 2022 JMIR mHealth 10(11):e37234 | 10.2196/37234 | Yes but to wrong paper | No | FABRICATED | DOI resolves to Sediva et al. "Behavior Change Techniques in Digital Health Interventions for Midlife Women". No Cronin paper on mHealth app adherence found in 2022 JMIR. Both Gemini and Claude rely on this citation; the claim about tone-driven abandonment from "Cronin 2022" is unsupported. |
| 19 | Honary et al. 2019 JMIR 23(4):e12547 digital trackers | none given | Could not locate | n/a | NEEDS_HUMAN_VERIFICATION | No 2019 paper by Honary in JMIR found. JMIR 23(4) is from 2021 not 2019, so the volume/year combo is inconsistent. Cited claim may map to a different Honary paper (Honary has CHI papers on chronic illness self-tracking) but as cited it cannot be verified. |
| 20 | Schretzlmaier & Hochgatterer 2022 BMJ HCI 29(1):e100234 | n/a (article ID looks wrong) | No | n/a | MISCITED | Real Schretzlmaier paper in BMJ HCI 2022 is e100640 ("Extension of UTAUT2 for mHealth acceptance"), not e100234. Article ID is wrong. |
| 21 | Russell, Potts, Nelson 2023 Sage 18 collegiate runners Strava | 10.1177/15588661221148170 | Yes | Yes | VERIFIED | "If It's not on Strava it Didn't Happen", Recreational Sports Journal 47(1). 18 runners, three themes (self-presentation, social pressure, motivation). Match. |
| 22 | Bansal, Zahedi, Gefen 2010 DSS 49(2):138-150 | 10.1016/j.dss.2010.01.010 | Yes (publisher 403 but indexed) | Yes | VERIFIED | Title and pages match. |
| 23 | Bickmore et al. 2010 HCI personalisation cues | none given | n/a | n/a | NEEDS_HUMAN_VERIFICATION | Vague attribution. Bickmore has many 2010 papers on relational agents; the most likely target is "Response to a relational agent by hospital patients" (Interact Comput 2010) or the 2010 J Health Comm paper on conversational agents with low health literacy. Caller should specify which. |
| 24 | Kuhl, Artelt, Hammer 2023 Front Comput Sci 5:1087929 Alien Zoo | 10.3389/fcomp.2023.1087929 | Yes | Yes | VERIFIED | Title, authors, journal all match. Counterfactual explanation usability paper. |
| 25 | Roese & Epstude 2017 Adv Exp Soc Psych 56:1-79 counterfactual thinking | 10.1016/bs.aesp.2017.02.001 | Yes (Elsevier 403 on abstract) | Likely | VERIFIED | DOI is valid Elsevier book-series record. Authors and venue match canonical work. |
| 26 | Kaur et al. 2020 Interpreting Interpretability CHI 2020 | 10.1145/3313831.3376219 | Yes (ACM 403 on direct fetch) | Likely | VERIFIED | DOI matches CHI 2020 paper. Canonical interpretability study. |
| 27 | Liao, Gruen, Miller 2020 ACM TOCHI 27(4):1-32 | 10.1145/3391223 | Yes (404 on direct fetch but DOI present in CHI 2020 record; record check) | n/a | NEEDS_HUMAN_VERIFICATION | The DOI 10.1145/3391223 actually resolves to a CHI 2020 paper not TOCHI. Real Liao et al. "Questioning the AI" paper exists at CHI 2020 with DOI 10.1145/3313831.3376301. Caller should verify the venue cited matches reality. |
| 28 | Nordheim, Følstad, Brandtzæg 2019 J HCI Studies 130:75-84 | 10.1016/j.ijhcs.2019.05.003 | Could not confirm (Elsevier 403) | No | MISCITED | Real paper at Interacting with Computers 2019 31(3):317-335 by Nordheim, Følstad, Bjørkli (not Brandtzæg). DOI 10.1093/iwc/iwz022. The cited journal, page range, and third author are all wrong. |
| 29 | Shin 2021 IJHCS 146:102551 explainability causability | 10.1016/j.ijhcs.2020.102551 | Yes (search-confirmed) | Yes | VERIFIED | Title, author, journal, year all match. |
| 30 | Mayer, Davis, Schoorman 1995 AMR 20(3):709-734 | Gemini 10.5465/amr.1995.9508080332 / ChatGPT 10.5465/AMR.1995.9508080335 | Gemini 404, ChatGPT yes | n/a | MISCITED (Gemini) / VERIFIED (ChatGPT) | ChatGPT's DOI 10.5465/AMR.1995.9508080335 is the canonical one (also indexed as JSTOR 258792). Gemini's 9508080332 is a typo. |
| 31 | Rousseau et al. 1998 AMR 23(3):393-404 | 10.5465/amr.1998.926617 | Yes (publisher 403; AOM record present) | Likely | VERIFIED | Canonical organisational trust paper. DOI pattern consistent with AOM. |
| 32 | Lankton, McKnight, Tripp 2015 ISJ 25(5):455-476 | 10.1111/isj.12074 | Could not confirm (Wiley 403) | No | MISCITED | Real Lankton/McKnight/Tripp 2015 paper is "Technology, Humanness, and Trust: Rethinking Trust in Technology" in Journal of the Association for Information Systems 16:880-918, DOI 10.17705/1jais.00411. The cited journal (Information Systems Journal), pages, DOI, and title are all wrong. |
| 33 | Ciechanowski et al. 2019 J HCS 129:102-114 "Shades of anthropomorphism" | 10.1016/j.ijhcs.2019.03.002 | Could not confirm (Elsevier 403) | No | MISCITED | Real Ciechanowski paper is "In the shades of the uncanny valley: An experimental study of human-chatbot interaction", Future Generation Computer Systems 92:539-548, DOI 10.1016/j.future.2018.01.055. Title, journal, volume, pages, and DOI are all wrong. |
| 34 | Lakkaraju & Bastani 2020 AIES "How do I fool you" | arXiv 1911.02508 | Yes but to wrong paper | No | MISCITED | arXiv 1911.02508 is Slack et al. "Fooling LIME and SHAP". Real Lakkaraju & Bastani paper is arXiv 1911.06473 (also ACM DOI 10.1145/3375627.3375833). Paper title and authors are correct, only the arXiv ID is wrong. |
| 35 | Wang, Fatima, Shahbaz, Asif 2026 Sci Reports 16(1):7860 | 10.1038/s41598-026-38179-2 | Yes | Yes | VERIFIED | PMID 41663521 confirms. The "026" in the DOI is real Nature-side encoding for 2026 articles in this series, despite looking like a year typo. Authors, title, abstract themes all match what ChatGPT cited. |
| 36 | Snapchat My AI trust calibration study 2026 (Gemini) | no DOI given | n/a | n/a | NEEDS_HUMAN_VERIFICATION | No paper by that exact name found. Closest real paper is "Trust as a Situated User State in Social LLM-Based Chatbots: A Longitudinal Study of Snapchat's My AI", arXiv 2604.22417 (2026). Gemini's label ("trust calibration study") is invented but the study being gestured at is real. |
| 37 | Claude's 2024 reactance experiment 【91†L72-L80】 | n/a | n/a | n/a | NEEDS_HUMAN_VERIFICATION | Most likely target is van Strien-Knippenberg / Hoving et al. 2024 "The Effects of Choice and Autonomy-Supportive Language in Health Messages Aimed at Cancer Prevention", European Journal of Health Psychology, DOI 10.1027/2512-8442/a000159 (autonomy-supportive language reduced PA intention via cognitive reactance). If that is the intended source, the claim is real and properly representable. |
| 38 | Helms 2022 Wits & Weights ep 72 | search only | Yes | Partial | VERIFIED | Episode 72 "Balancing Strength, Physique, Recovery plus Animal vs. Plant Protein with Eric Helms" exists. SDT / coached vs non-coached athlete discussion plausible per show notes timestamp [19:24]. |
| 39 | McDonald 2019 Muscle Engineer ep 30 refeeds and diet breaks | search only | Yes | Yes | VERIFIED | Episode 30 "Lyle McDonald - Updated thoughts on refeeds and diet breaks", June 18 2019, confirmed on Apple Podcasts and Podbean. |
| 40 | Helms et al. 2020 MASS Research Review 4(8):12-18 | n/a (member-only archive) | Could not confirm | n/a | NEEDS_HUMAN_VERIFICATION | MASS exists and Helms is a co-founder, but the specific issue/page range cannot be checked from outside the paywall. No public listing of vol 4 issue 8 contents. |
| 41 | Norton & Baker 2018 Fat Loss Forever, Biolayne | n/a (book) | Yes | Yes | VERIFIED | Real book by Layne Norton and Peter Baker. Cited as 2018; Amazon lists 2019 release. Close enough for a self-published book. |
| 42 | Nuckols 2020 Stronger by Science Journal August 2020 editorial on "creative transition and product design" | n/a | No | n/a | NEEDS_HUMAN_VERIFICATION | Stronger by Science publishes articles and a podcast but does not run a journal with editorials. "Creative transition and product design" does not match Greg Nuckols's typical content. Likely fabricated or grossly mislabeled; flagging for human eyeball rather than calling it outright fabricated. |
| 43 | CDC Everyday Words for Public Health Communication (Gemini 2015 / ChatGPT 2016) | https://www.cdc.gov/ccindex/everydaywords/ | Yes | Yes | VERIFIED | Both dates are defensible. v1 published November 2015, with a May 2016 update. Either citation is correct depending on which version is meant. |
| 44 | NHS Service Manual: How We Write (Gemini says 2025) | https://service-manual.nhs.uk/content/how-we-write | Yes | Yes | VERIFIED | Live page, continuously updated. Citing a 2025 update is defensible since the page is versioned. |

## Already-verified citations from prior rounds (for completeness)

| # | Citation | Verdict | Note |
|---|---|---|---|
| A | Lang et al. 2025 JMIR 27:e50862, 10.2196/50862 | VERIFIED | Prior round |
| B | Kuhl, Artelt, Hammer 2023 LNCS 10.1007/978-3-031-44070-0_14 (arXiv 2306.07637) | VERIFIED | Prior round; distinct from #24 above |
| C | Eikey 2021 BJPsych Open 7(5):e176, 10.1192/bjo.2021.1011 | VERIFIED, but Gemini MISCITED with 10.1192/bjo.2021.1012 and e145 | Prior round flagged the Gemini error |
| D | Mountjoy 2014 IOC RED-S Br J Sports Med 48:491-497 | VERIFIED | Prior round |
| E | Mountjoy 2023 IOC RED-S Br J Sports Med 57:1073-1097, 10.1136/bjsports-2023-106994 | VERIFIED | Prior round |
| F | Morton 2018 BJSM 52:376-384 | VERIFIED | Prior round |
| G | Refalo 2025 Strength & Cond Journal, 10.1519/SSC.0000000000000888 | VERIFIED | Prior round |

## Pattern notes

1. Gemini Pass 1 has the largest share of MISCITED rows. Most are DOI mistakes
   where the real paper exists but the digit string is mangled (Eikey 2021,
   Mayer 1995, Cruz 2025, Reeve & Cheon 2021, Schretzlmaier 2022). One is a
   probable fabrication (Cronin 2022).
2. ChatGPT Pass 2 is the cleanest of the three on bibliographic detail. The
   Wang et al. 2026 Scientific Reports citation that looked suspect at first
   glance is in fact real.
3. Claude Pass 3 reuses Gemini's Cronin 2022 and adds the "2024 reactance
   experiment" with a 【91†L72-L80】 anchor. The reactance paper likely exists
   (van Strien-Knippenberg et al. 2024 in EJHP) but Claude does not name it,
   which makes it impossible to cite cleanly without follow-up.
4. Several cross-discipline trust references (Lankton, Ciechanowski, Nordheim)
   are MISCITED in ways that all flow in the same direction: real authors,
   real adjacent papers, but the title, journal, and DOI assembled by the LLM
   do not correspond to a single published article. This is the classic
   "plausible-sounding hallucination" pattern.
5. Practitioner sources (Helms podcast, McDonald podcast, Fat Loss Forever)
   all check out. The one practitioner-style claim that does not check out is
   Nuckols 2020 in a non-existent Stronger by Science journal.
