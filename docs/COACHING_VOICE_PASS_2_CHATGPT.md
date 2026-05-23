# Coaching voice research, pass 2: ChatGPT

Second of three deep-research passes (Gemini, ChatGPT, Claude) on
`COACHING_VOICE_RESEARCH_BRIEF.md`. Stored verbatim. Naming
("the engine" / "the system") will be normalised to **Precision
Coaching** at synthesis, since the brief sent to ChatGPT predated
the name correction.

---

# Grounding Volyume Complete's Coaching Voice in Evidence

## TL;DR

- The honest, evidence-based voice for Volyume Complete is **engine-as-named-decider**, **numbers-before-narrative**, and **mirror-not-infer**: the engine sets targets and the user logs, trains, eats and weighs in, never "we decide together"; this passes the Ntoumanis et al. (2021) autonomy-support test (non-controlling language plus meaningful rationale produced larger psychological-health effects, B = 0.44 and B = 0.37, p < .01 and p < .05) and the Kaur et al. (2020) explainable-AI honesty test simultaneously.
- For the at-risk subgroup, the safety register must **tighten, not loosen**: shorter sentences, more numbers, plain-mechanism language, and externalisation of the trajectory (not of the user); words "unhealthy", "good food", "bad food", "great job", streak language, and "we've got you" should be removed because Eikey et al. (2019), Cerea et al. (2025) and the FBT clinical literature (Rienecke and Le Grange 2022) identify them as shame-driving or restriction-reinforcing.
- **Voice should be staged by relationship depth**, holding the honesty rule fixed: cold-factual at weeks 0 to 2 (warmth read as marketing), warmed-by-data at week 3 plus, and safety-cold whenever a hold fires; Mayer, Davis and Schoorman (1995) ability-benevolence-integrity model predicts that warmth tolerance grows with demonstrated competence, but the integrity dimension fails the moment a sentence would not be true if the user did nothing but kept logging.

## Key Findings

The research base around fitness-app voice is mature enough to give Volyume confident answers on most questions and to identify five live gaps. Six pillars (autonomy support, plain language, counterfactual framing, app abandonment, ED-app harm, explainable-AI trust) carry strong primary evidence with usable effect sizes and DOIs. Four pillars (motivational interviewing in one-way surfaces, elite-coach communication patterns, the "feel seen" question, and voice calibration to relationship depth) carry weaker, mostly practitioner-observation evidence. Three of the seven user-facing surfaces (safety hold, cleared / recovery, Article 9 consent) are tightly constrained by the literature and should not be A/B tested past a narrow band. Four (paywall, goal-lock, cascade transitions, notifications) have wider design space and should be tested.

Below: ten pillars in prose, then a phrasing pattern set, then surface re-drafts, then failure modes, then open questions.

## Details

### Part 1: Findings, by pillar

#### Pillar 1. Autonomy-supportive vs. controlling language

The strongest evidence base for written coaching tone is the SDT literature. The Ntoumanis et al. (2021) meta-analysis of SDT-informed health interventions found that two specific writing techniques, "using non-controlling language" and "providing a meaningful rationale", produced larger effect sizes on psychological health at end-of-intervention and at follow-up than studies that did not use them (B = 0.44 and B = 0.37, p < .01 and p < .05). The headline effect for need-supportive interventions on health behaviour was Hedges' g = 0.450 (95% CI 0.329 to 0.571). Linguistic markers separating the two registers are well established: autonomy-supportive copy uses "could", "might", "you can choose to"; controlling copy uses "should", "have to", "must", "need to". Second-person prescriptive ("you need to eat more") reliably increases psychological reactance. Inclusive first-person plural ("we will decide together") is autonomy-supportive in face-to-face coaching but becomes a factual lie in a deterministic engine, which is the core tension Volyume must resolve.

Primary citations:
- Ntoumanis, N., Ng, J. Y. Y., Prestwich, A., Quested, E., Hancox, J. E., Thøgersen-Ntoumani, C., Deci, E. L., Ryan, R. M., Lonsdale, C., and Williams, G. C. (2021). A meta-analysis of self-determination theory-informed intervention studies in the health domain. *Health Psychology Review*, 15(2), 214 to 244. DOI: 10.1080/17437199.2020.1718529.
- Deci, E. L., and Ryan, R. M. (2000). The "what" and "why" of goal pursuits. *Psychological Inquiry*, 11, 227 to 268.
- Su, Y., and Reeve, J. (2011). A meta-analysis of the effectiveness of intervention programmes designed to support autonomy. *Educational Psychology Review*, 23, 159 to 188.

Contested: Ntoumanis et al. flag that the "providing rationale" moderator was confounded with the "credible source" technique in sensitivity analyses, and the moderator analyses are hypothesis-generating rather than hypothesis-testing. Treat as direction-reliable, not magnitude-confirmed.

Practical implication: Volyume should default to "the engine has set", "the next target is", "the reason is", with explicit rationale at every decision point. The product should avoid "you should", "you must", "you have to", and avoid plural "we" when describing decisions, because the user did not co-decide.

#### Pillar 2. Motivational interviewing in one-way surfaces

Miller and Rollnick's 3rd edition (2013) technical definition of MI is: "a collaborative, goal-oriented style of communication with particular attention to the language of change. It is designed to strengthen personal motivation for and commitment to a specific goal by eliciting and exploring the person's own reasons for change within an atmosphere of acceptance and compassion." The four processes are engaging, focusing, evoking, planning. The MI spirit is partnership, acceptance, compassion, evocation (PACE). OARS (open questions, affirmations, reflections, summaries) is the skill set.

In a push-only context, true MI is impossible because there is no conversation. Shingleton and Palfai (2016) systematically reviewed 32 technology-delivered MI interventions and concluded that feasibility is demonstrated but efficacy evidence is limited, with most studies including only a subset of MI features and few studies providing complete descriptions of how MI components were delivered via technology. Their bottom line was that "future research is needed to study adherence to MI and impact of TAMIs on behavior change". What is salvageable: affirmations of effort (not outcome), reflections of observed behaviour, and short summaries. Open questions become useless because the system cannot listen.

Primary citations:
- Miller, W. R., and Rollnick, S. (2013). *Motivational Interviewing: Helping People Change* (3rd ed.). Guilford Press. ISBN 978-1609182274.
- Shingleton, R. M., and Palfai, T. P. (2016). Technology-delivered adaptations of motivational interviewing for health-related behaviors. *Patient Education and Counseling*, 99(1), 17 to 35. DOI: 10.1016/j.pec.2015.08.005.

Practical implication: Volyume can borrow affirmations-of-effort and reflective summaries from MI ("you logged 18 of 21 days, your weight is down 0.4 kg, your energy scores held above 6"). It cannot borrow open questions or anything implying dialogue. The product should not write "what do you think?" or "how do you feel?" because it cannot read the answer.

#### Pillar 3. Safety-hold communication for at-risk populations

The Cruz et al. (2025) meta-analysis in *International Journal of Eating Disorders* (DOI: 10.1002/eat.24488) synthesised 14 RCTs of ED-targeted apps and found small but significant effects in non-diagnosed samples, no significant effects on body dissatisfaction or drive for thinness, and only medium-sized effects on objective binge eating when apps were embedded in guided self-help. The Cerea et al. (2025) commentary warned about untested apps in app stores (only 9 of many such apps have been RCT-evaluated) and the methodological weakness of 8 of the 14 included trials. Eikey and Reddy (2017) and Honary et al. (2019, JMIR) found in qualitative work with recovering disordered-eating users that shaming colour-coded visualisations, "good food" and "bad food" framing, and rigid streak systems amplified disordered patterns.

FBT (Lock and Le Grange, 2013, Guilford, ISBN 978-1462506767) uses externalisation: the eating disorder is named as a force acting on the person, not as a character flaw. The canonical formulation (Rienecke and Le Grange 2022, DOI: 10.1186/s40337-022-00585-y) is: "the eating disorder is separated from the patient and externalized... The parents' task is to battle the ED, not their healthy child, who is still there but may be overshadowed by the ED." CBT-E (Fairburn, 2008) avoids the word "unhealthy" because it triggers shame in restrictive users who already use "healthy" as a moral category. Rienecke and Le Grange themselves warn that "although externalization is a critical component of FBT, it should be used carefully, as patients can experience it as dismissive". Words that tend to land in the clinical literature: "we noticed", "the pattern shows", "what your body's data is telling the engine". Words that do not: "unhealthy", "concerning behaviour", "you've been overdoing it", "you need to".

Primary citations:
- Cruz et al. (2025). Smartphone Applications for Eating Disorders: A Systematic Review and Meta-Analysis. *Int J Eat Disord*. DOI: 10.1002/eat.24488.
- Cerea et al. (2025). The Light and Shadow of Smartphone Applications for Eating Disorders. *Int J Eat Disord*, 58(12), 2253 to 2256. DOI: 10.1002/eat.24536.
- Rienecke, R. D., and Le Grange, D. (2022). The five tenets of family-based treatment for adolescent eating disorders. *Journal of Eating Disorders*, 10(1), 60. DOI: 10.1186/s40337-022-00585-y.
- Fairburn, C. G. (2008). *Cognitive Behavior Therapy and Eating Disorders*. Guilford.

Practical implication: When the safety hold fires, Volyume should describe the observed pattern in numbers, name what the engine has decided, give the physiological reason, and ask for nothing the user did not already plan to do. Words "healthy" and "unhealthy" should be replaced by direction language ("steady", "fast", "sharp", "slow"). The user is not externalised from themselves; the trajectory is externalised from the user.

#### Pillar 4. Elite-coach communication patterns in strength and nutrition

The shared voice attributes of evidence-based strength and physique coaches (Eric Helms, Lyle McDonald, Greg Nuckols, Holly Baxter, Renaissance Periodization, Stronger By Science, Paul Carter) are: numbers first, mechanism second, prescription third; no false certainty; explicit acknowledgement of trade-offs; and a strong allergy to before-after marketing. Helms and 3DMJ explicitly cite self-determination theory in their coaching philosophy: Helms in his Wits and Weights podcast appearance (episode 72, October 2022, roughly 18:00 to 24:00) discusses SDT, the experience of coached versus non-coached athletes, and what he would change in his own coaching. Lyle McDonald's voice on refeeds and diet breaks (The Muscle Engineer Podcast episode 30, June 2019, 03:08 to 20:10 and 37:15 to 42:50) keeps the physiological case and the psychological case explicitly separate and resists overclaim.

Where this register tips from coach to guru: when the coach moves from "the data says" to "you need to trust the process", when prescriptive certainty exceeds evidence, when in-group jargon (RIR, MEV, MAV, MRV, stimulus-to-fatigue) replaces plain mechanism, and when the coach claims credit for the client's outcome. Some RP and Stronger By Science content occasionally tips into this. Helms and McDonald are most consistent at staying in the coach register.

Cross-referenced against SDT and MI: the best strength-coaching voice is already broadly autonomy-supportive (rationale-led, choice-acknowledging) and broadly MI-compatible (affirms effort, reflects data). The failure mode of this lineage is jargon density, not controlling tone.

Primary references:
- Helms, E. et al. (2014). Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. *J Int Soc Sports Nutr*, 11, 20. DOI: 10.1186/1550-2783-11-20.
- Helms, E. (2022). Wits and Weights podcast, episode 72, October 2022.
- McDonald, L. (2019). The Muscle Engineer Podcast, episode 30: Updated thoughts on refeeds and diet breaks.

Practical implication: Volyume's voice should sound closer to Helms in print than to any guru register. Numbers, mechanism, prescription, and an explicit acknowledgement that the engine is not the user. No jargon (no MEV, MAV, MRV, RIR, RPE, stimulus, adaptation). No claims that Volyume produced the results; the engine set targets, the user did the work.

#### Pillar 5. App-specific behaviour-change literature and post-mortems

The Kidman et al. (2024) scoping review covered 18 studies and 525,824 participants and found a median 70% abandonment within the first 100 days of lifestyle and mental-health apps. The paper organised 22 unique reasons for abandonment into six categories: technical and functional issues, privacy concerns, poor user experience, content and features, time and financial costs, and evolving user needs and goals. The Milne-Ives et al. (2023) systematic review of 28 studies identified six behaviour-change techniques reliably associated with engagement: goal setting, self-monitoring of behaviour, feedback on behaviour, prompts and cues, rewards, and social support. Russell, Potts and Nelson (2023, *Sage Journals*, DOI: 10.1177/15588661221148170) interviewed 18 collegiate club runners about Strava and identified three psychosocial themes (self-presentation, social pressure, motivation) and "some potential concerns related to social pressure and self-presentation that could influence mental or physical health". Industry retention figures (Alchemer 2021 benchmark, citing Apptopia) show Strava's 30-day retention at 16% on iOS and 8% on Android, below the 31% fitness-app 90-day average; the inference that factual tone retains more reliably than coercive tone is plausible but not directly proven in the peer-reviewed literature.

User-reported failure modes of Noom and MyFitnessPal in App Store review analyses and dietitian commentary (Abby Langer RD, 2021) cluster around tedious logging, "good food / bad food" framing, coaching experienced as automated, and aggressive low-calorie defaults: Langer noted that "Noom seems to assign a 1200 calorie budget to a lot of users". These observations are not peer-reviewed and should be treated as user-report signal, not evidence.

Primary citations:
- Kidman, P. G., Curtis, R. G., Watson, A., and Maher, C. A. (2024). When and Why Adults Abandon Lifestyle Behavior and Mental Health Mobile Apps. *J Med Internet Res*, 26, e56897. DOI: 10.2196/56897.
- Milne-Ives, M. et al. (2023). Potential associations between behavior change techniques and engagement with mobile health apps. *Front Psychol*, 14, 1227443. DOI: 10.3389/fpsyg.2023.1227443.
- Eikey, E. V., and Reddy, M. C. (2017). It's definitely been a journey: a qualitative study on how women with eating disorders use weight loss apps. *Proc CHI 2017*, 642 to 654. DOI: 10.1145/3025453.3025591.

Practical implication: Volyume must not punish missed days, must not use "good" or "bad" for foods, must not gamify streaks for the at-risk subgroup, and should default to a factual register at trial transitions and payment failures. The 22-reason abandonment taxonomy from Kidman et al. is a useful checklist for Volyume's churn telemetry.

#### Pillar 6. Plain-language health communication

Lang et al. (2025) analysed 1,241 NIHR plain-language summaries and found only 21.7% met a 5% jargon threshold, only 1.0% met a 2% threshold, and none read at the UK average reading age (DOI: 10.2196/50862). CDC's Everyday Words for Public Health Communication (2016) and NHS plain-language guidance both recommend: short sentences (average 20 words, one idea per sentence), active voice, second person where appropriate, and substitution of jargon for everyday equivalents.

For a clinically-adjacent audience, the prescriptive register should be short declarative sentences, numbers first, mechanism in plain English ("your body holds onto fat" not "energy partitioning shifts toward adipose retention"), and one decision per screen. Sentence structures that increase comprehension failure: nested clauses, passive voice, abstract nouns ("the optimisation of caloric intake"), and conditional stacking.

Primary citations:
- Lang, I. A. et al. (2025). Jargon and Readability in Plain Language Summaries of Health Research. *J Med Internet Res*, 27, e50862. DOI: 10.2196/50862.
- CDC (2016). Everyday Words for Public Health Communication. URL: cdc.gov/ccindex/everydaywords.

Practical implication: Volyume should target one idea per sentence, an average sentence length under 20 words, active voice, and substitution of every jargon term in current copy. "TDEE" becomes "the calories your body uses". "Deficit" stays only where users opt into the term, otherwise becomes "eating below maintenance". "FFM" becomes "lean mass" or "muscle".

#### Pillar 7. Counterfactual framing combined with autonomy-supportive language

Kuhl, Artelt, and Hammer (2023, N=161, DOI: 10.1007/978-3-031-44070-0_14; arXiv: 2306.07637) showed that upward counterfactual explanations ("with X, this would have been Y, better") outperformed downward counterfactuals and no-explanation conditions on task performance and explicit knowledge gain. Mixed-direction counterfactuals improved performance further. The mechanism is that upward counterfactuals supply actionable information aligned with user goal-direction. Their broader programme (Kuhl et al. 2023, Frontiers in Computer Science 5:1087929, DOI: 10.3389/fcomp.2023.1087929) finds that closeness and computational plausibility matter for novice users.

Combining this with SDT autonomy-support: the upward counterfactual must be delivered without controlling language, without implied nagging, and without sales register. The pattern that works: "With food data over the last three weeks, the engine could have separated training from fuel." The pattern that fails: "You're missing out without Pro."

Primary citation:
- Kuhl, U., Artelt, A., and Hammer, B. (2023). For Better or Worse: The Impact of Counterfactual Explanations' Directionality on User Behavior in xAI. In L. Longo (Ed.), *Explainable Artificial Intelligence* (xAI 2023), CCIS vol. 1903, pp. 280 to 300. Springer. DOI: 10.1007/978-3-031-44070-0_14.

Practical implication: Differential paywall triggers (Surface 2) and coaching insight cards should use upward counterfactuals tied to specific data the user already has, naming the engine as the actor whose certainty would increase, not the user as the deficient party.

#### Pillar 8. The "feel seen" question

HCI work on personalisation cues (Bickmore et al. 2010; Bansal et al. 2010) shows that users feel seen when a system mirrors specific data they recognise, names the pattern, and is honest about what it cannot infer. "We noticed your weight has dropped 1.6 kg over four weeks" lands as acknowledgement; "you've been struggling" lands as intrusion because the system cannot know struggle. The line between acknowledgement and intrusion is the inference layer: mirror data, name patterns, do not infer emotional states. Kaur et al. (2020, CHI, DOI: 10.1145/3313831.3376219) showed that confident-sounding xAI explanations can build false trust; users prefer explanations that acknowledge what the system observed and what it did not.

Wang, Fatima, Shahbaz and Asif (2026, *Scientific Reports* 16(1):7860, DOI: 10.1038/s41598-026-38179-2) conducted semi-structured interviews with 28 participants in Pakistan and China and identified two themes shaping chatbot trust: "human-like interaction and emotional connection" driving affective trust, and "perceived reliability and system competence" with "accuracy, transparency, responsiveness, and data security as core elements of cognitive trust". Their participants explicitly valued chatbots that "openly acknowledged their limitations" over those that "pretended to provide complete knowledge".

Primary citations:
- Kaur, H., Nori, H., Jenkins, S., Caruana, R., Wallach, H., and Wortman Vaughan, J. (2020). Interpreting Interpretability: Understanding Data Scientists' Use of Interpretability Tools for Machine Learning. *Proc CHI 2020*. DOI: 10.1145/3313831.3376219.
- Shin, D. (2021). The effects of explainability and causability on perception, trust, and acceptance. *Int J Hum-Comput Stud*, 146, 102551. DOI: 10.1016/j.ijhcs.2020.102551.
- Wang, S., Fatima, N., Shahbaz, M., and Asif, M. (2026). Building user trust in AI chatbots for customer service through human-like cues and perceived reliability. *Scientific Reports*, 16(1), 7860. DOI: 10.1038/s41598-026-38179-2.

Practical implication: Volyume should mirror data the user logged ("your weight, your energy scores, your food log"), name patterns the engine detected, and avoid inferring emotional state. The product should explicitly name what the engine cannot see (food data, for free users).

#### Pillar 9. Honesty about decision authority

This is the load-bearing pillar. The xAI trust literature, the product-copy ethics literature, and the SDT literature converge on one finding: users develop durable trust when systems are honest about what is automated, what is decided, and what the user did or did not contribute. Kaur et al. (2020) found that data scientists themselves over-trusted xAI tools that sounded confident. Lakkaraju and Bastani (2020, "How do I fool you?", arXiv: 1911.02508) showed that misleading explanations destroyed trust once detected. Wang et al. (2026, *Scientific Reports*) found users valued chatbots that "openly acknowledged their limitations".

Newsletter writers and podcast hosts who feel close despite no reciprocity (Maria Popova at Marginalian, Casey Newton at Platformer, Anne Helen Petersen at Culture Study, Tim Ferriss in shorter pieces) share linguistic markers: first-person singular not plural, named specifics from their own observation, no claims about the reader's inner state, and a clear acknowledgement that they are writing one to many. They do not say "let's work this out together"; they say "here is what I'm thinking, you decide what to do with it".

Practical patterns that pass the honesty test:
- "The engine has set X" (not "we've set X")
- "The engine noticed X in your log" (not "we noticed")
- "The reason: Y" (rationale required)
- "The next step at the next weekly run is Z" (engine names the action)
- "Your work this week: log, train, eat to the target, weigh in"

The test, stated in the brief, is: would this sentence still be true if the user did nothing but kept logging? If no, rewrite. "We'll work it out together" fails. "The engine will reassess at the next weekly run" passes.

Primary citations:
- Kaur, H. et al. (2020). DOI: 10.1145/3313831.3376219.
- Lakkaraju, H., and Bastani, O. (2020). "How do I fool you?": Manipulating User Trust via Misleading Black Box Explanations. *Proc AIES 2020*. arXiv: 1911.02508.
- Mayer, R. C., Davis, J. H., and Schoorman, F. D. (1995). An Integrative Model of Organizational Trust. *Acad Manage Rev*, 20(3), 709 to 734. DOI: 10.5465/AMR.1995.9508080335.

Practical implication: Volyume's voice should use "the engine" as the named decision-maker when describing automated decisions, second person for the user's actions, and first-person plural only when describing the team behind Volyume (humans, in marketing or support copy). Engine output should not use marketing-we.

#### Pillar 10. Voice calibration to relationship depth

Mayer, Davis, and Schoorman (1995) model trust as a function of perceived ability, benevolence, and integrity. Ability is established by the engine's accuracy of observation; integrity by honest decision authority; benevolence by absence of coercion. Trust accrues over time. App-context downstream work (Bansal et al. 2010 on e-commerce trust formation) shows that warmth tolerance increases with demonstrated competence: at week 0 the user reads warmth as marketing, at week 12 the user reads the same warmth as relationship.

Staged voice specification:

- **Early surfaces (onboarding, week 1 to 2)**: factual, prescriptive, light on warmth. Numbers and rationale are the only currency. "The engine sets your starting target at 2,650 kcal. Reason: your weight, height, activity, and your declared goal." No "welcome aboard", no "we're excited", no inferred-state language. Warmth is shown by accuracy of observation and explicit naming of what the engine cannot yet see.
- **Steady-state surfaces (week 3 plus)**: permitted modest warmth, drawn entirely from the data record. Reflective summaries are appropriate ("you've logged 19 of 21 days this block, your weight is down 1.4 kg, your bench is up 5 kg"). Affirmations of effort are appropriate ("the work this week showed up in the numbers"). Inferred-state language remains banned.
- **Safety surfaces (ED-pattern, FFM floor, rapid-loss, any time)**: warmth tightens, not loosens. The register becomes more clinical, more specific, more anchored to numbers, and uses externalisation of the pattern, not the person. Decision authority is named explicitly. No motivational filler.

Primary citations:
- Mayer, R. C., Davis, J. H., and Schoorman, F. D. (1995). DOI: 10.5465/AMR.1995.9508080335.
- Bansal, G., Zahedi, F. M., and Gefen, D. (2010). The impact of personal dispositions on information sensitivity, privacy concern and trust. *Decision Support Systems*, 49(2), 138 to 150. DOI: 10.1016/j.dss.2010.01.010.

Practical implication: A single tone-of-voice spec is wrong. Volyume needs three: cold-start factual, steady-state warmed-by-data, and safety-cold. All three share the engine-as-decider rule.

### Part 2: Consolidated phrasing pattern set

1. **Engine-as-actor.** Name "the engine" or "the next weekly run" as the decision-maker for any automated decision. The user is the actor for their behaviour. Example: "The engine has held your calorie target steady this week. The reason: your weight has dropped 1.6 kg in three weeks." Avoids false collaboration and false promises.

2. **Numbers-before-narrative.** Lead with the observation in numbers; the prose follows. Example: "Weight down 1.6 kg in three weeks. Energy scores below 5 on 8 of 14 days. Food log: average 600 kcal below target." Avoids vague hand-waving the user cannot verify.

3. **Mirror-not-infer.** State what the user logged, not what the user felt. Example: "Your log shows 600 kcal under target on most days." Not: "You've been pushing too hard." Avoids paternalism and intrusion.

4. **Externalise the pattern, not the person.** The trajectory is the object of concern, not the user. Example: "This pattern, weight falling fast plus low energy plus eating under target, is the one that breaks cuts." Avoids shame and abandonment.

5. **Upward counterfactual without sales register.** State what the engine could resolve with the missing data; name the engine as the beneficiary, not the user as the deficient party. Example: "The engine cannot tell from training alone whether your bench has stalled. With food data, the engine could separate training from fuel." Avoids nagging upsell.

6. **Rationale-attached prescription.** Every prescription has a one-sentence reason in plain English. Example: "Hold the target steady this week. The reason: when the deficit gets too sharp for too long, the body holds onto fat and breaks down muscle." Tracks the Ntoumanis (2021) "meaningful rationale" moderator.

7. **Action-belongs-to-user.** The actions named for the user are only the things the user can actually do. Example: "Your work this week: log, train, eat to the target, weigh in." Avoids implied decision authority the user does not have.

8. **Honesty-test sentence.** Every sentence in engine output passes "would this still be true if the user did nothing but kept logging?". If no, rewrite. Avoids factual lies dressed as warmth.

9. **No motivational filler.** Never affirm without a referent in the data. Example: "Energy scores held above 6 on 12 of 14 days." Not: "You're doing great." Avoids form-letter feel.

10. **Plain-mechanism language.** Substitute jargon with one-clause mechanism. Example: "Your body holds onto fat and starts breaking down muscle to fuel itself." Not: "Metabolic adaptation favours catabolic substrate utilisation." Tracks Lang et al. (2025) and CDC Everyday Words.

11. **One decision per screen.** A surface delivers one engine decision and its reason. A goal-lock screen does not also try to upsell. Avoids cognitive overload under stress.

12. **Cold-start trust by accuracy, not warmth.** In week 0 to 2, the only credibility move is the engine being demonstrably accurate about what it sees and honest about what it cannot. Example: "The engine sets your starting target at 2,650 kcal. The engine cannot yet see your food log; you can add it any time." Avoids premature warmth read as marketing.

13. **Safety-cold register.** When a safety hold fires, warmth tightens. Clinical specificity replaces coaching warmth. No motivational sentences. Avoids minimising a clinical-adjacent signal.

14. **Volyume-alongside-coach.** When a user has a linked coach, the engine references the coach as the other adult in the room; when not, the engine does not pretend to be one. Example: "Your coach will see this hold in their dashboard." Or, for unlinked users: "If you have a clinician or coach, this is the kind of pattern they would want to know about." Avoids Volyume implying replacement of a human coach.

15. **Cleared-without-praise.** When a hold lifts, name what changed in the data; do not congratulate. Example: "Energy scores back above 6. Weight loss rate slowed to 0.3 kg per week. The hold lifts at the next weekly run." Avoids reinforcing restriction in the at-risk subgroup.

### Part 3: Re-drafts of the seven surfaces

#### Surface 1: Safety hold cards (ED-pattern lockout)

Voice register: safety-cold. Patterns used: 1, 2, 3, 4, 6, 7, 8, 13.

"Pause week. The engine has held your calorie target steady.

What the engine sees. Weight down 1.6 kg in three weeks. Energy scores below 5 on 8 of the last 14 days. Food log: most days under target.

Why this matters. This pattern, weight falling fast plus low energy plus eating under target, is the one that breaks cuts. When the deficit gets too sharp for too long, the body holds onto fat and starts breaking down muscle to fuel itself. Training quality drops. Recovery slows. Hunger that has been quiet so far catches up, often all at once.

The engine has held your calorie target at its current number this week. Your work this week: keep logging, keep training, eat to the target (not under it), weigh in as normal.

Next step. The engine will reassess at the next weekly run. If energy scores hold above 6 and the weight loss rate slows for two weeks, the engine will release the hold and move the target again. If you have a coach or clinician, this is the kind of pattern they would want to see."

Notes: "Let's give your body a moment" deleted (false collaboration). "We'll work out the next step together" deleted (factual lie). The line "If you have a coach or clinician" recommended for A/B testing for hold-abandonment in unlinked users.

#### Surface 2: Differential paywall triggers

Voice register: steady-state, warmed by data. Patterns used: 1, 2, 5, 14.

Stalled-lift context (example):

"Your bench has not moved in three weeks. Last 1RM estimate: 102.5 kg, unchanged since 28 April.

The engine cannot tell from training data alone whether the cause is training load or fuel. With your food log, the engine could separate the two.

Pro includes food log integration. 14 days, free, cancel any time. Decide later."

The six contexts (stalled lift, extreme soreness, deload, missing TDEE, block summary, energy crash) all use the same structure: data observation, what the engine cannot resolve without food data, the Pro offer in factual register. A/B test recommended on whether "Decide later" outperforms an explicit button.

#### Surface 3: Article 9 health-data consent screen

Voice register: cold-start factual. Patterns used: 2, 7, 11, 12.

"Volyume needs your explicit consent before storing your health data.

What the engine will store, if you consent:
- Weight
- Food intake
- Body-fat percentage, if you log it
- Energy and recovery scores
- Eating-pattern signals (used by the engine for safety holds)

What the engine does with this data:
- Sets your weekly calorie and training targets
- Detects patterns that need a safety hold (rapid loss, low energy, eating-pattern signals)
- Shows your linked coach, if you have one

Your rights:
- Withdraw consent any time, in Settings
- Download or delete all your data, any time
- This consent is separate from the Volyume terms of service

This is required by UK GDPR Article 9. Health data has stricter rules than other personal data. Tap I consent to continue. Tap Not now to use Volyume without the health features."

Notes: separates consent from terms of service (Article 9 requirement); plain language as required by Article 7. The "Not now" path is essential because Article 9 consent must be freely given. A/B test: whether inline examples of engine use reduce drop-off without bloat.

#### Surface 4: Onboarding goal-lock screen (aggressive cut)

Voice register: cold-start factual, with one explicit acknowledgement of the at-risk frame. Patterns used: 1, 2, 6, 7, 11, 12, 14.

"You have selected an aggressive cut. Target: 0.9 kg per week, sustained.

The engine treats aggressive cuts differently. The safety threshold for an eating-pattern hold is normally 2 signals. For an aggressive cut, the engine raises the threshold to 3 signals so a competition prep or advanced recomp is not flagged unnecessarily.

What this means for you:
- The engine will let your weight drop faster than the default before flagging
- The engine will still hold the target if 3 signals fire (rapid loss plus low energy plus eating well under target, for example)
- A coach or clinician, if you have one, can see all signals in their dashboard

You can switch goals any time. The engine resets the threshold at the next weekly run.

Lock the aggressive-cut goal. Or, choose a steady cut instead."

Notes: explicit two-option close; raised threshold named honestly, not hidden. A/B test: whether the explicit "0.9 kg per week" number alters aggressive-cut selection rates.

#### Surface 5: Cascade trial transitions

Voice register: steady-state for day-14 modal; warmed for day-28 modal; cold and factual for the subscription-failure banner. Patterns used: 1, 2, 5, 7, 11, 14, 15.

**Day 14 ("Complete trial ends, choose Pro or pay"):**

"Your Complete trial ends today. 14 days used.

What the engine has done in those 14 days:
- 2 weekly target updates
- 1 deload recommendation
- Food log integrated on 11 of 14 days

What changes if you choose Pro:
- All of the above continues
- Adaptive calorie and training updates each week
- Eating-pattern safety holds stay on

What changes if you choose Free:
- The engine still sets a starting target
- Weekly adaptive updates stop
- Food log integration stops
- Safety holds stay on

Choose Pro: GBP 12 per month. Choose Free: no payment, fewer features."

**Day 28 ("Pro trial ends, choose Free or pay"):**

"Your Pro trial ends today.

The engine has run 4 weekly updates, held the target steady once (energy was low in week 2; the engine paused for one week), and your weight is down 1.2 kg.

If you continue on Pro: GBP 12 per month, weekly updates continue. If you switch to Free: you keep your data, the weekly updates stop, safety holds stay on."

**Subscription failure banner:**

"Payment did not go through. The engine kept your data and your current targets. Update payment in Settings. The engine will not change anything until you do."

Notes: the day-28 modal can use modestly warmer language because the user has 28 days of demonstrated engine competence. The failure banner uses cold factual register: a 3am payment failure should not feel like a punishment. A/B test: whether the day-28 modal benefits from a single user-contribution sentence ("you logged on 24 of 28 days").

#### Surface 6: Notifications (push, max 80 char body)

Voice register: cold factual. Patterns used: 1, 2, 7, 11. The ED-pattern flag fires in-app only, never push.

- Daily check-in reminder: "Today's check-in is open. Weight, energy, sleep. Two minutes."
- Weekly check-in nudge: "Weekly check-in is open. The engine runs your update on Sunday night."
- Cascade gate notification (day 13 of 14): "Complete trial ends tomorrow. Choose Pro or Free in the app."
- Payment failure alert: "Payment did not go through. The engine kept your data. Update in Settings."
- Block summary: "Block complete. The engine has logged 4 weeks of data. Read the summary."

Notes: no exclamation marks, no inferred state. The 3am user reads these as factual; the post-workout user reads them the same. A/B test: whether removing "The engine" from some 80-char pushes (in exchange for character budget) breaks the honesty principle in a way users notice.

#### Surface 7: Cleared / recovery copy

Voice register: safety-cold tipping into steady-state. Patterns used: 1, 2, 3, 6, 15.

"Hold lifts at the next weekly run.

What the engine sees. Energy scores back above 6 for two weeks. Weight loss rate slowed to 0.3 kg per week. Food log shows you eating to the target.

What changes. The engine will move your calorie target down again at the next weekly run, by a smaller step than before. The reason for a smaller step: the body responds more durably to a steady pull than a sharp one.

Your work stays the same. Log, train, eat to the target, weigh in.

If you have a coach or clinician, they can see the cleared status in their dashboard."

Notes: "You've turned a corner" deleted (motivational filler that risks reinforcing restriction in the at-risk subgroup, per Eikey et al. 2019 and the Rienecke and Le Grange 2022 externalisation caveat). "Take it gently from here" deleted (autonomy-violating). The cleared message is factual; no congratulation.

### Part 4: Failure-mode catalogue

1. **"We'll work this out together."** Factual lie. The engine decides, the user logs. Mayer, Davis and Schoorman integrity dimension destroyed once the user notices. Use instead: "The engine will reassess at the next weekly run."

2. **"You've been doing amazingly."** Motivational filler without a data referent; reads as form letter; for the at-risk subgroup, "amazing" applied to weight loss reinforces restriction. Use instead: "Weight down 1.4 kg in four weeks. Energy scores held above 6 on 12 of 14 days."

3. **"You're being too hard on yourself."** Inferred state. The engine cannot read self-criticism. Reads as intrusion. Use instead: name the data the engine sees, do not name the user's inner state.

4. **"Unhealthy pattern detected."** "Unhealthy" is a moral category the at-risk subgroup uses against themselves; CBT-E (Fairburn 2008) avoids it. Use instead: "This pattern is the one that breaks cuts" or "rapid weight loss with low energy".

5. **"Don't worry, we've got you."** False promise. Volyume does not "have" the user. The engine sets targets and the user does the work. Volyume sits alongside coaches, never above them or in place of them. Use instead: "The engine has set X. Your work this week is Y."

6. **"Crush this week."** Marketing register, banned by spec, and contraindicated for the at-risk subgroup. Use instead: name the work in factual terms.

7. **"Let's decide your next step."** Factual lie; the user does not decide the next step in a deterministic engine. Use instead: "The engine will set the next step at the weekly run."

8. **"Streak broken."** Shame trigger. In the qualitative ED-and-app literature (Eikey and Reddy 2017; Cerea et al. 2025 commentary on Cruz et al. 2025), streak language drives abandonment and reinforces rigidity in the at-risk subgroup. Use instead: "You logged on 19 of 21 days this block."

9. **"AI has analysed your data."** Violates the deterministic-engine spec; users may infer the engine learns about them in ways it does not. Trust collapses when the user discovers. Use instead: "The engine has applied its rules to your data."

10. **"You need to eat more."** Controlling language (Ntoumanis 2021); paternalistic; for the at-risk subgroup, triggers reactance. Use instead: "The engine has held your target. The reason: rapid weight loss plus low energy plus eating under target. Eat to the target this week."

### Part 5: Open questions

Where the literature is thin, contested, or recommendations rely on practitioner observation:

1. Whether "the engine" as a named actor is read as cold by users who otherwise prefer warmth. The xAI trust literature (Kaur 2020, Wang et al. 2026) predicts honesty trumps warmth, but no direct study has tested "engine" as a label versus alternatives ("the system", "Volyume", "your weekly update"). A/B test recommended.

2. Whether externalisation of the pattern (rather than of the illness, as in FBT) carries the same protective effect for the at-risk subgroup in an app context. Rienecke and Le Grange (2022) explicitly warn externalisation can be experienced as dismissive. A small qualitative study with recovered ED users in the UK fitness population would close the gap.

3. Whether upward counterfactuals retain their performance advantage in monetised contexts. Kuhl et al. (2023) did not test commercial framings. Specific A/B testing on Surface 2 phrasings is recommended.

4. Whether the staged-warmth schedule (cold week 0 to 2, warmed week 3 plus, cold during holds) corresponds to user expectations. Mayer, Davis and Schoorman predicts yes, but app-context longitudinal data is thin. An NPS-by-week analysis on existing Volyume users would help.

5. Whether removing "The engine" from 80-character notifications breaks the honesty principle in a way users notice. Recommended test: retain "The engine" in all in-app surfaces; vary in some pushes; compare opt-outs and reported trust.

6. Whether the safety hold message lands differently for unlinked users versus coach-linked users. The brief notes most users do not have a linked coach. Whether adding "if you have a coach or clinician" is sufficient is unproven.

7. Whether the deterministic-engine spec should be disclosed plainly to users in onboarding ("Volyume's engine follows rules; it is not AI") or only on request. The xAI literature suggests proactive disclosure builds durable trust, but it adds onboarding friction. Recommended A/B test.

The Lang et al. (2025) jargon evidence, the Ntoumanis et al. (2021) SDT moderator evidence, the Kuhl et al. (2023) counterfactual evidence, the Kidman et al. (2024) abandonment taxonomy, and the Cruz et al. (2025) plus Cerea et al. (2025) fitness-app harm evidence are the strongest legs of the table. The voice calibration to relationship depth and the engine-as-actor pattern are the weakest, evidentially, and should be the first to A/B test.

## Recommendations

1. **Ship the phrasing-pattern set first as a non-negotiable copy spec, then A/B test the warmth dial.** The honesty rule (engine-as-actor, action-belongs-to-user, honesty-test sentence) is supported by convergent evidence from SDT (Ntoumanis 2021), xAI trust (Kaur 2020, Wang 2026), and product-copy ethics (Lakkaraju and Bastani 2020); it should be locked. The warmth dial (cold-start to warmed-by-data) is the part to test.

2. **Rewrite the safety hold and cleared surfaces immediately and do not A/B test them.** The Cruz et al. (2025) meta-analysis, the Cerea et al. (2025) commentary, the Eikey and Reddy (2017) CHI qualitative work, and the FBT externalisation literature all converge: in safety surfaces, motivational filler is a measurable risk to the at-risk subgroup. Treat the Part 3 re-drafts of Surface 1 and Surface 7 as a one-way migration.

3. **A/B test the four wide-design-space surfaces.** The paywall (Surface 2), goal-lock (Surface 4), cascade transitions (Surface 5), and notifications (Surface 6) have legitimate variation room. Recommended specific tests: counterfactual phrasing vs. control in Surface 2; explicit "0.9 kg per week" number in Surface 4; presence or absence of a user-contribution sentence in the day-28 modal of Surface 5; presence of "The engine" in the body of notifications (Surface 6).

4. **Build the failure-mode catalogue (Part 4) into the copy review process.** Treat the ten phrases as hard-blocks in code review for copy strings. A linter would catch them.

5. **Threshold for changing the recommendations.** If post-launch telemetry shows hold-abandonment above 30% in safety-hold surfaces, soften the safety-cold register slightly (more "your work" sentences, more "if you have a coach or clinician" framing). If trial conversion at day 14 falls below 25%, test a warmer day-14 modal with a single user-contribution sentence. If self-report trust on the engine-as-actor framing scores below 6/10 in a usability study, run the named-actor A/B test (Open Question 1) before any wider deployment.

6. **Close the highest-leverage open questions empirically.** Open Questions 1 (named actor), 2 (pattern externalisation), and 7 (proactive deterministic disclosure) drive the largest design choices. Run small qualitative studies (n = 8 to 12) on each within the next two release cycles.

## Caveats

- Many of the strongest claims rest on small or hypothesis-generating studies. Ntoumanis et al. (2021) flag the non-controlling-language and rationale moderators as hypothesis-generating, with the rationale finding confounded by "credible source". Kuhl et al. (2023) tested N = 161, not commercial contexts. Wang et al. (2026) interviewed 28 participants in Pakistan and China, not UK fitness-app users. Treat effect sizes as directional, not deployment-tunable.
- The Cruz et al. (2025) meta-analysis includes 14 RCTs with methodological concerns in 8 of them, and most use waitlist controls. Volyume is not an ED-treatment app, but the at-risk subgroup overlaps with the populations studied. The cleared / recovery and safety hold redrafts are conservative by design.
- Several frequently-repeated industry observations (Strava and Streaks retention by tone, Noom 1,200-kcal defaults, MyFitnessPal "coaching feels automated") rest on app-store review aggregations and dietitian commentary, not peer-reviewed evidence. They are treated as user-report signal in this report and should not be cited as if they were RCT findings.
- The deterministic-engine framing is unusual in the fitness-app market; most competitors describe themselves as AI. The honesty-by-disclosure recommendation is supported by the xAI trust literature but introduces onboarding friction that has not been measured in this specific market. Open Question 7 should be closed before scale-up marketing.
- The brief's hard constraints (no em dashes, British English, no AI tells, no marketing jargon, no emoji, no motivational filler, numbers as hero, deterministic-rules framing only, plain English) have been applied to every line of recommended copy in Part 3 and to this report. Any future copy should be linted against the same constraints.
