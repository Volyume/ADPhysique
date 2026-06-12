# ext-05 — Gym Psychology, Motivation Science & Coaching Communications

**Deep Audit 2026-06-12 · External Research · Slice: Behavioural Science**
Personas: Besa the Beginner / Eddie the Elite
Hard constraints apply throughout (ED safety system untouchable, no LLM/AI, offline-first, British English).

---

## Preamble: what the prior audit covered and what this adds

The 2026-06-10 competitive audit touched motivation and psychology primarily as _onboarding conversion levers_ (COMP-030, the onboarding research doc, COMP-018 streak, COMP-023 day-3 moment). It cited Self-Determination Theory once in passing (the Runna teardown), noted RP Hypertrophy's "jargon-before-value" failure, and flagged the coaching voice as "British, honest, not preachy" without providing behavioural science to back it. The accountability/community doc explored social support mechanics but did not address the underlying motivation science or how different user populations respond to different coaching styles.

This report fills that gap from first principles: the science of why people start, stop, and stick; how they prefer to be spoken to at different levels of experience; and what app design affordances reduce or amplify those effects. Every principle translates to a specific, bounded product change Volyume could make within its existing deterministic architecture.

---

## Part 1 — Gym Anxiety / Gymtimidation

### 1.1 Prevalence and scope

Gymtimidation — the anxiety or intimidation felt when entering a gym environment — is not a niche problem. It is the mass-market default state.

- **~47% of UK adults** endorsed "I feel uncomfortable at the thought of joining a gym or leisure facility" in PureGym's 2025/26 UK Fitness Report. [PureGym UK Fitness Report 2025/26](https://www.puregym.com/blog/uk-fitness-report-gym-statistics/)
- **~50% of US adults** in a survey of ~2,000 reported feeling too intimidated to start working out around others. [Flex AI Gymtimidation Survey](https://flexfitnessapp.com/blog/gymtimidation-survey/)
- **One-third of Brits** (33%) report experiencing gymtimidation, with 58% saying they feel self-conscious trying new fitness activities. [Gladstone Software](https://blog.gladstonesoftware.com/news/gymtimidation-how-to-help-fitness-newbies-feel-comfortable-in-your-gym)
- **Women more than men**: 17% vs 5% describe it as a significant barrier; the gender gap widened year-on-year from 2024 to 2025. Women aged 25–34 are the most affected cohort — over 80% in this group cite not knowing how to use equipment, not knowing what to do, or fear of judgement. [PureGym UK Fitness Report 2025/26](https://www.puregym.com/blog/uk-fitness-report-gym-statistics/)
- Over **40% of people** have experienced these feelings for more than five years — gymtimidation is not a transient first-visit problem; it is a persistent state that suppresses gym use long-term. [Muscle and Brawn Gym Intimidation Statistics](https://muscleandbrawn.com/statistics/gym-intimidation/)

A 2026 paper in *Frontiers in Sports and Active Living* applied the Power-Threat-Meaning Framework to gym intimidation, identifying it as a genuinely psychological phenomenon with recognisable causes, not simply shyness. [Frontiers — Social Gym Intimidation PTM Framework, 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1712367/full)

### 1.2 Primary causes

Research clusters the causes into three groups:

**Knowledge gaps** — not knowing what to do, not knowing how to use equipment, not understanding the social norms ("gym etiquette"). The 25–34 age group cites these most heavily. This is the highest-leverage intervention surface for an app: Volyume can close the knowledge gap before the person walks through the door.

**Social evaluation anxiety** — exercising in front of others is the primary intimidating factor for **79% of people** who feel anxious. Fear of being watched, laughed at, or judged by more experienced gym-goers. [Gym Anxiety Statistics, ZipDo 2025](https://zipdo.co/gym-anxiety-statistics/) This maps directly to the _social physique anxiety_ construct in academic literature: the apprehension people feel about others evaluating their physique.

**Identity threat** — the gym, its aesthetic, its equipment, and many of its regular users signal a world that Besa does not yet belong to. The gym communicates "this is for people who already know what they're doing." An app that makes Besa feel like a legitimate participant _before_ she arrives — with a plan, with knowledge, with a sense of belonging — attacks the identity threat directly.

### 1.3 What reduces gymtimidation

**Competence acquisition** (knowing what to do) is the strongest lever. Studies show that first-time gym-goers who receive orientation tours and basic instruction report dramatically lower anxiety on return visits. [INTEGRIS Health — Gymtimidation, 2025](https://integrishealth.org/resources/on-your-health/2025/january/gymtimidation-overcoming-gym-anxiety)

Physical gym design helps — spaces that reduce visibility (not one big open floor under fluorescent lights), welcoming imagery showing diverse bodies, and communal areas that dilute the performative workout culture. [Zynk Design — Gym Design and Gymtimidation](https://zynkdesign.com/how-gym-design-can-reduce-gymtimidation/)

**Small group sessions** and guided walkthroughs create social normalisation: seeing others who are also new, also uncertain, reduces the sense of individual exposure. [Gladstone Software Gymtimidation Guide](https://blog.gladstonesoftware.com/news/gymtimidation-how-to-help-fitness-newbies-feel-comfortable-in-your-gym)

**Timing advice** — training at quieter hours for the first few sessions — reduces the audience size and allows competence-building in lower-threat conditions.

**An app's role**: a well-designed fitness app can function as a portable gym orientation. It tells Besa what to do before she arrives, what each exercise looks like, what the plan is for today, and why she belongs in the gym doing it. This is not a luxury; it directly addresses the primary cause of gym avoidance for the mass-market majority.

---

## Part 2 — Motivation Science

### 2.1 Self-Determination Theory (SDT)

SDT (Deci & Ryan, 1985) is the dominant framework in exercise motivation research and the one with the most direct application to app design. It holds that sustained motivation requires satisfaction of three basic psychological needs:

**Autonomy** — feeling that you are the author of your own actions; doing something because you chose to, not because you were told to. In exercise, this means choosing your training days, selecting exercises within a programme, understanding why you are doing something.

**Competence** — feeling effective and capable; experiencing progress and mastery. In exercise, this means lifting heavier, completing reps that felt impossible last month, seeing the coaching engine confirm that your training is appropriate.

**Relatedness** — feeling connected to others; not training in a social vacuum. In exercise, this can be as simple as feeling that a coach (or app) understands you and is in your corner.

Research confirms that SDT need satisfaction directly predicts exercise adherence across populations. A 2025 systematic review in the *International Journal of Sport and Exercise Psychology* confirms SDT as the most empirically supported framework for physical activity motivation research. [ScienceDirect — SDT in Physical Activity Promotion, 2025](https://www.sciencedirect.com/science/article/pii/S1469029225000780)

App design implications from a 2026 Frontiers study specifically on fitness app need support:
- **Autonomy support**: personalised goal-setting, flexible challenge selection, customised workout pathways.
- **Competence support**: progressive feedback, adaptive difficulty, visible achievement tracking.
- **Relatedness support**: social interactions, community events, accountability features. [Frontiers — Fitness App Need Support and Exercise Adherence, 2026](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1752995/full)

A CHI 2023 study on Hispanic fitness app users found that **autonomy-supporting features were preferred across demographics** over competence and relatedness features — participants specifically wanted to modify recommendations and self-select rewards rather than follow a prescribed path. [ACM CHI 2023 — Interactivity and Relatedness in Fitness Apps](https://dl.acm.org/doi/10.1145/3544548.3581200)

**Key SDT finding for Volyume**: the biggest gap in Volyume's current design (relative to SDT evidence) is likely **relatedness** for Besa — she has no sense that the app understands her or is on her side beyond the cold mechanics of a generated plan. The coaching voice and the framing of feedback are the primary relatedness delivery mechanism.

### 2.2 Intrinsic vs Extrinsic Motivation

**Extrinsic motivation** (appearance goals, social approval, weight-loss numbers, competition prep deadlines) gets people started. It is a legitimate entry point and should not be dismissed.

**Intrinsic motivation** (enjoyment, challenge, mastery, identity) predicts long-term adherence. A meta-analysis across 66 studies using SDT showed intrinsic motivation consistently predicted long-term exercise adherence. [RazFit — Intrinsic Motivation in Fitness](https://razfit.app/gamification-fitness/intrinsic-motivation-fitness/)

The SDT view of extrinsic motivation is more nuanced than "extrinsic = bad": motivation exists on a continuum from _external regulation_ ("I do this because I'll look bad otherwise") through _introjected regulation_ ("I do this because I'll feel guilty if I don't") and _identified regulation_ ("I do this because I've decided it matters to me") to _intrinsic regulation_ ("I do this because I love it"). The most stable long-term predictor is **identified regulation** — the sense that exercise aligns with your values and self-concept — which is achievable without full intrinsic enjoyment.

**Timeline for motivation development** (synthesis across several studies):
- Weeks 1–4: willpower and external motivation dominate. This is the highest-risk dropout window.
- Weeks 4–8: competence need satisfaction starts to accumulate — small wins reinforce the habit.
- Weeks 8–16: intrinsic motivation consolidates if competence and autonomy have been supported.

Gamified extrinsic rewards (badges, streaks, leaderboards) can _crowd in_ intrinsic motivation if they signal progress toward a valued identity, but can _crowd out_ intrinsic motivation if they replace the sense of personal achievement with a points game. [Frontiers — Motivation Crowding in Gamified Fitness Apps, 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1286463/full) The risk is highest when rewards are removed — users trained on external rewards stop exercising when the reward disappears.

**For Volyume**: Besa needs extrinsic motivators (clear short-term goals, visible progress) as the entry point, but the design should actively scaffold toward identified/intrinsic motivation ("you're becoming someone who trains") by week 4–6. Eddie is likely already in identified or intrinsic territory; his external motivators are competition results and objective performance data.

### 2.3 Goal-Setting Theory (Locke & Latham)

Specific, challenging-but-attainable goals produce better performance than vague or "do your best" goals. [Goal-Setting Theory Overview, ScienceDirect](https://www.sciencedirect.com/topics/social-sciences/goal-setting-theory) The evidence is robust in sport contexts: a systematic review in *Journal of Sports Sciences* (2021) confirms goal specificity and difficulty effects across sport performance studies, though effect sizes are smaller for complex, sustained behaviours than for discrete tasks. [Tandfonline — Goal Setting in Sport, 2021](https://www.tandfonline.com/doi/full/10.1080/1750984X.2021.1901298)

**Important nuance**: 30%+ of sport studies find specific goals are not superior to vague goals on performance outcomes. The mechanism appears to be that very specific goals can increase anxiety and reduce flexibility, particularly for beginners who lack mastery experience. An "ambitious but doable" framing consistently outperforms both very easy and very hard goals.

**For Volyume**: the engine already generates specific, calibrated training goals (sets, reps, load ranges). The product gap is in how those goals are _presented_ and _reframed_ in language. "You're aiming for 4 sets of 8 at 60 kg" is more adherence-supporting than "train legs today" — but the presentation should also normalise that the range is a target, not a test.

### 2.4 Implementation Intentions

Peter Gollwitzer's implementation intention research shows that "if-then" planning — specifying exactly when, where, and how you will act — substantially increases follow-through on intentions. A 2006 meta-analysis of 94 studies found a medium-to-large effect (d = 0.65) on goal attainment. [The Behavioral Scientist — Implementation Intentions](https://www.thebehavioralscientist.com/glossary/implementation-intentions) For exercise specifically, effects are more modest (d = 0.31) but still meaningful. [PMC — Implementation Intentions and Physical Activity, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6440859/)

The mechanism: if-then plans delegate initiation of behaviour to environmental cues, bypassing the need for conscious deliberation at the moment of action. "If it is Monday morning and I have my kit, I will go to the gym before work" is more effective than "I will go to the gym more often."

Implementation intentions increase follow-through by **two to three times** on average versus goal-setting alone.

**For Volyume**: the scheduling and plan-generation flow is the ideal implementation-intention prompt. When Besa sets up her training schedule, she should be prompted to specify her training _times_ (not just days), and the app should frame this as "locking in the plan" — consistent with the evidence that specificity of when and where is what makes implementation intentions work.

### 2.5 Identity-Based Habits

James Clear's synthesis of habit research (building on SDT and cognitive behavioural science) argues that the most durable habits are identity-based: instead of "I want to lose weight", the goal is "I am becoming someone who trains." Each completed workout is cast as a vote for that identity. [James Clear — Identity-Based Habits](https://jamesclear.com/identity-based-habits)

The evidence base: behaviour–identity alignment is supported by self-perception theory (Bem, 1967) — people infer their beliefs from observing their own behaviour. When Besa completes a workout, she can either think "I made myself do that" (external regulation) or "that's what people like me do" (identity). The latter is more stable. Research confirms that identity-focused framing predicts consistency: "a person who values physical activity continues to prioritise exercise even if life occasionally gets in the way." [Hinge Health — Identity and Habits](https://www.hingehealth.com/resources/articles/identity-and-habits/)

**For Volyume**: Volyume has an unusually powerful identity hook in its physique division and goal system. Telling Besa that she is "a gymgoer" or "someone who trains" is good; telling Eddie that completing his peak week plan makes him a competitor is excellent. The identity frame should be surfaced at milestone moments, not just the first time it's claimed.

### 2.6 Self-Efficacy (Bandura)

Self-efficacy — the belief in one's ability to complete a specific task — is one of the strongest predictors of exercise adoption and adherence. [APA — Self-Efficacy Teaching Tip Sheet](https://www.apa.org/pi/aids/resources/education/self-efficacy) Bandura identified four sources, in descending order of impact:

1. **Mastery experience** — successfully completing the task (most powerful)
2. **Vicarious experience** — watching someone similar succeed
3. **Social persuasion** — being told by a credible source that you can do it
4. **Physiological state** — interpreting arousal/fatigue as signals of capability vs incapability

The implications for beginners are stark: early failures are not just demotivating, they actively lower self-efficacy, which reduces the probability of attempting the task again. This is the mechanism behind the 80% January dropout: people who miss two sessions early in February have lowered self-efficacy, which makes attending the third session feel harder, not easier. A PMC paper on self-efficacy and habit building found a **positive feedback mechanism**: habit-specific self-efficacy predicted automaticity, and automaticity predicted self-efficacy. [PMC — Self-Efficacy in Habit Building, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8137900/) Breaking the chain is hard; initiating it requires careful scaffold design.

**For Volyume**: the first three workouts are not just activation metrics — they are self-efficacy-building events. Each one should be designed to succeed: appropriate load suggestions, clear instructions, a completion moment that is acknowledged. Missing one should trigger not a guilt nudge but a competence-protecting reframe ("even pro athletes take unplanned rest — here's how to pick up where you left off").

---

## Part 3 — Adherence and Retention Science

### 3.1 The January–February drop-off

Approximately **80% of people who join a gym in January stop going by mid-February.** The second Saturday in February has been called "Fall Off the Wagon Day" by Foursquare's location data, the day with the highest rate of gym abandonment. [Glofox — New Year's Resolution Gym Statistics](https://www.glofox.com/blog/6-new-years-resolution-gym-statistics-you-need-to-know/)

The mechanism is not lack of willpower — it is a combination of:

- **Unrealistic expectations**: visible physique change requires months; most beginners expect results in weeks. When the body doesn't change by week 3, motivation collapses. [FitCommit — Why the Fitness Industry is Broken](https://fitcommit.ai/blog/why-fitness-industry-broken/)
- **Decision fatigue**: as initial motivation fades, choosing what to do each session becomes cognitive friction. "Deciding what to do feels harder than skipping." This is why a prescriptive, auto-generated plan is protective — it removes the decision entirely.
- **Habit formation incomplete**: habit automaticity requires an average of **66 days** (range: 18–254 days) for exercise, not the commonly cited 21 days. (Phillippa Lally et al., UCL, 2010). By mid-February, even consistent exercisers are only ~6 weeks in — well short of automaticity.

Fitness apps mirror the gym drop-off curve. Analysis of a large fitness app dataset (PMC, 2025) found training behaviour declines steeply after initial onboarding for a majority of users, with a minority of users maintaining consistent use long-term. [PMC — Analysis of Training Behaviour in Fitness App Users, 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12828317/)

Why people abandon fitness apps specifically:
- Unrealistic expectations
- Complexity and feature overwhelm
- Lack of perceived personalisation
- Motivational language that shames rather than supports
- App failure at moments of friction (missed workout, bad week) — apps that make recovery easy retain better than apps that silently record the missed session [Autentika — Why Users Abandon Fitness Apps](https://autentika.com/blog/why-do-users-abandon-fitness-apps/)

### 3.2 What predicts sticking

**Early wins**: the most consistent predictor across studies. Getting a beginner to complete their first workout (Fitbod's core activation metric) and then their first week of workouts creates the mastery experiences that build self-efficacy. Better sleep, higher energy, improved mood typically arrive within 1–2 weeks — _before_ visible body change — and should be flagged as legitimate evidence of progress. [NASM — Building Habits That Last](https://www.nasm.org/resource-center/blog/building-habits-that-last/)

**Habit specificity**: same time, same place, same sequence. Consistency of context is one of the strongest predictors of whether behaviour becomes automatic. Apps that help users anchor their training to existing routines ("Monday before work at the gym near the office") dramatically outperform apps that leave scheduling vague. [Trainerize — Why Fitness Clients Quit, 2026](https://www.trainerize.com/blog/why-fitness-clients-quit-and-how-to-keep-them/)

**Social support**: meta-analyses confirm social support positively predicts exercise adherence. Peer support specifically shows effect sizes of 42–59% on self-efficacy. [PMC — Peer Support and Exercise Adherence, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9955246/) The mechanism is via self-efficacy and commitment — having a training partner or accountability contact raises perceived capability and raises the cost of quitting.

**Caution on social support**: "social support overload" — too many peer notifications, too much implicit pressure — causes burnout and app abandonment, particularly in people with already-fragile body image. [PMC — Social Support Overload in Fitness Apps, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11764542/) The Apple Fitness ring-sharing critique documents this mechanism: implicit pressure to stay active "leads to constant social comparison that can harm mental health." The design principle is **visible when desired, never ambient** — support that users can invoke rather than support that is constantly present.

**Realistic expectations**: research from Trainerize's analysis of 2026 retention data found clients who received expectations-aligned onboarding (honest timelines for visible results) had materially higher 90-day retention than those given headline promises.

**Personalisation**: perceived personalisation is a retention driver independent of whether the personalisation is objectively "correct." The sense that the plan was made for you raises commitment. This is why Volyume's deterministic precision engine is a retention asset, not just a performance asset — the _feeling_ that the system understands your specific training age, your split, your MRV, is the narrative that supports identified motivation.

### 3.3 The D0–D14 activation window

Based on the research synthesis, here is the psychological trajectory of a new beginner user:

| Day | Psychological state | Highest-risk events | App should do |
|-----|--------------------|--------------------|---------------|
| 0–1 | High motivation, also high anxiety | Overwhelm at setup complexity | Make first session achievable in <10 min of app interaction |
| 1–3 | Curiosity + "will this work?" | No early feedback loop | Acknowledge first workout; flag non-scale wins |
| 3–5 | Novelty wearing off | Life event conflicts with training | Send one supportive reframe if no activity yet |
| 5–7 | First test of habit formation | Missed session → shame spiral | Normalise rest; "pick up" framing, not "get back on track" |
| 7–10 | Motivation dip (documented across studies) | App feels like a chore | Surface a mini-milestone ("you've trained 3× — that's your first week done") |
| 10–14 | Habit starting to form, or already abandoned | No visible body change | Surface non-scale progress (energy, mood, load increases) |

---

## Part 4 — Coaching Style and Communication Science

### 4.1 Autonomy-Supportive vs Controlling Coaching

The evidence on coaching style is unambiguous: **autonomy-supportive coaching produces better motivation outcomes than controlling coaching.** This finding replicates across junior athletes, recreational exercisers, and health behaviour change contexts. [ScienceDirect — Autonomy Support and Self-Determined Motivation, 2006](https://www.sciencedirect.com/article/abs/pii/S146902920600118X)

**Autonomy-supportive coaching behaviours**:
- Providing a meaningful rationale for activities ("here's why this rep range is right for you")
- Acknowledging the athlete's feelings ("this phase is hard — that's by design")
- Offering choice within structure ("you could do this on Tuesday or Thursday — which suits your week?")
- Non-controlling feedback that describes rather than evaluates
- Inviting initiative and self-monitoring

**Controlling coaching behaviours** (to avoid):
- Prescriptive language with no rationale ("do this because I say so")
- Guilt-induced criticism ("you should have done more")
- Controlling statements: "you must," "you have to," "you should," "as I'd expect"
- Tangible rewards as coercion ("if you do this, you get a badge")
- Pressure statements that imply conditional worth ("if you were really serious, you'd...")

A 2024 Frontiers study found autonomy-supportive coaching significantly predicted resilience and optimism in young athletes — effects that transferred beyond the specific coaching context, reinforcing a growth identity. [Frontiers — Autonomy-Supportive Coaching and Resilience, 2024](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1433171/full)

The research consistently shows: **the most positive outcomes arise from high autonomy support _and_ low controlling behaviour simultaneously** — not simply "being supportive" while still using controlling language. [ScienceDirect — Interactive Effects of Autonomy-Support and Control, 2018](https://www.sciencedirect.com/science/article/abs/pii/S1469029218304424)

### 4.2 Feedback Science: Effort vs Outcome Praise

Carol Dweck's research establishes that praising outcome or talent ("you're naturally strong") induces a **fixed mindset** — the person attributes performance to innate ability, becomes risk-averse to protect that self-image, and is fragile in the face of setbacks. Praising effort and strategy ("you pushed through that last set and found a way") induces a **growth mindset** — performance is attributed to controllable factors, setbacks become information rather than verdicts. [Stanford Bing School — Dweck on Intelligence Praise](https://bingschool.stanford.edu/news/carol-dweck-praising-intelligence-costs-childrens-self-esteem-and-motivation)

**Most effective praise structure** (Dweck's updated position): praise effort _and_ strategy _and_ link them to the outcome. "You pushed through those last two reps by bracing harder — and that's exactly how strength improves" is more effective than either "great work" (generic effort praise) or "you're getting so much stronger" (outcome praise).

For a fitness app:
- **Do**: "You completed a volume PR on squats. Three months of consistent progressive overload built that — well done on sticking to the programme."
- **Avoid**: "You're a natural! Your legs are responding brilliantly." (talent/genetics attribution)
- **Avoid**: "You missed your reps today." (outcome focus with no process framing)

### 4.3 Beginner vs Elite: different needs, different languages

Research on coach–athlete communication consistently finds that **prescription preferences differ by experience level.** [HucoSport — Coach Athlete Communication, 2026](https://hucosport.com/en/coach-athlete-communication/)

**Beginners (Besa)**:
- Need more frequent, immediate feedback — they lack the foundation to self-correct
- Benefit from prescriptive, specific guidance ("next time, keep your chest up and hit full depth") rather than open-ended problem-solving prompts
- Are in the **cognitive stage** of motor learning (Fitts & Posner model) — they are consciously processing each movement, need external cues
- Are more sensitive to negative feedback; failure attributions can spiral quickly into self-efficacy erosion
- Respond well to **normalisation** ("everyone finds this awkward at first") and **explicit encouragement** ("you're doing exactly what you're supposed to at this stage")
- Want to feel **safe** — the coaching relationship needs warmth and absence of judgement before technical depth

**Elite athletes (Eddie)**:
- Are in the **autonomous stage** of motor learning — movement is largely automatic; they want data to help them fine-tune, not instruction on how to perform
- Prefer **post-session analysis** over in-session correction
- Can handle, and often prefer, direct challenge and data density
- Are less vulnerable to self-efficacy erosion from hard feedback (established mastery buffers it)
- Want to be taken **seriously as athletes** — patronising reassurance ("you're doing great!") reads as incompetent coaching
- Value the coach's **credibility** highly — unsupported opinions are dismissed; the "why" behind any recommendation must be evidence-based
- Respond well to **precision and accountability**: specific percentages, volume landmarks, recovery metrics with interpretive context

A 2025 *Journal of Sport and Exercise Psychology* study found elite athletes use film-session communication strategically — they seek confirmation that their tactical/technical read matches the coach's, treating disagreement as data rather than failure. [JSEP — Athletes' Participation in Film Sessions, 2025](https://journals.sagepub.com/doi/10.1177/21674795251363419) For Volyume: Eddie expects the engine's outputs to be debatable, not papal. Allowing him to log "felt off" or "went heavier than recommended" without triggering a punishment response respects this.

**Feedback frequency**: providing feedback 50% of the time was more effective for skill learning than 100% feedback. Constant feedback creates dependency — learners stop developing internal monitoring. [Athletic Performance Academy — Are We Talking Too Much, 2024](https://athleticperformanceacademy.co.uk/coaching-feedback-are-we-talking-too-much/) This is particularly important for Eddie: over-coaching an experienced user erodes trust in the system.

### 4.4 Delivering Hard Truths Supportively

The coaching context frequently requires surfacing unwelcome information: "you're under-recovering", "you've had four unlogged sessions", "your weight is dropping faster than is safe."

Research on hard-feedback delivery identifies the following effective pattern ([ICF Blog — Delivering Hard Feedback, 2024](https://coachingfederation.org/blog/delivering-hard-feedback-5-tips-that-fuels-performance/)):

1. **Prime trust first**: the message is more effective when delivered in the context of an established supportive relationship. A cold hard truth from a system the user doesn't trust yet reads as criticism; the same truth from a system they trust reads as care.
2. **Tie to the user's own goal**: "this matters because you told me you want X" — the hard truth becomes service to their declared intention, not an external judgement.
3. **Be specific and concrete**: "your last three sleep logs averaged 5.5 hours and that's suppressing recovery" is more actionable and less shaming than "you're not taking care of yourself."
4. **Avoid controlling language**: never use "should", "must", "have to", "need to." Use "worth considering", "the evidence suggests", "you might want to." [Dynamics Coaching — Autonomy-Supportive Behaviours](https://dynamics-coaching.com/uncategorised/motivation-part-2-supportive-coaching-behaviours/)
5. **Separate the behaviour from the person**: "the load increase was too aggressive" not "you pushed too hard."
6. **Offer the path forward**: hard truth + concrete next step. Never end on the problem.

The ED safety system's boundary conditions (flagging rapid weight loss, surfacing Beat UK) are the hardest truths Volyume delivers. The framing here should be especially careful: these messages should read as "the system is on your side and is flagging something it cares about" — not as alarmism or judgement. The research on body-shaming communication is clear that stigmatising messages predictably worsen the outcomes they intend to prevent.

---

## Part 5 — Physique/Aesthetics Training: Psychological Risks

### 5.1 The specific population Volyume serves

Volyume's Pro user (Eddie) is, by design, an aesthetic physique athlete: someone who trains explicitly for competitive body composition — lean mass maximisation, fat minimisation for competition condition, cyclical bulk/cut phases. Research is consistent that this population carries elevated psychological risk that a responsible app must acknowledge.

### 5.2 Muscle dysmorphia and body image risk

Muscle dysmorphia (bigorexia) is a body image disorder characterised by a core belief that one is not sufficiently muscular, causing distress when the body is seen in public, impairing social and occupational functioning, and associated with disordered eating. [NEDA — Muscle Dysmorphia](https://www.nationaleatingdisorders.org/muscle-dysmorphia/)

Prevalence among competitive bodybuilders: studies report **up to 54% show signs of muscle dysmorphia**. Across male weightlifters and frequent gym-goers, lifetime prevalence rates of 13–44% have been reported depending on measurement criteria. [PMC — Body Image and Eating Disorders in Male Bodybuilders, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6142149/)

Research from a 2024 mixed-methods study (*Journal of Community & Applied Social Psychology*) found that "many participants in weight training found that an aesthetic focus, particularly through activities such as bodybuilding, was a 'breeding ground' for body dissatisfaction and associated risky behaviours." [Wiley — Muscularity, Physique Anxiety and Body Image, 2024](https://onlinelibrary.wiley.com/doi/full/10.1002/casp.2800)

Muscle dysmorphia is associated with higher rates of depression, anxiety, substance use, and suicide risk. The pursuit of a superhero physique ideal makes men feel their bodies are insufficient, and bodybuilding can function as a coping mechanism for pre-existing body distress — reinforcing the behaviour even as the underlying distress worsens.

### 5.3 Eating disorder risk in physique sport

A 2019 narrative review in *Sports* (PMC) on sustainable nutrition in physique sport identified the specific risk pathways:

- Pre-existing predisposition to body image or eating disorders
- Biological effects of energy restriction on eating psychology (caloric restriction increases obsessive food cognitions, binge-eating risk)
- Cyclical bulk/cut phases creating disordered relationships with food
- Physique comparison and judgement culture — in competition, the body is literally judged by strangers [PMC — Sustainable Nutrition Paradigm in Physique Sport, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6681103/)

The review recommends: dietary flexibility (not rigid/weighed-to-the-gram approaches), **slower rates of weight loss** (≤0.5% bodyweight per week is specifically recommended, which aligns with Volyume's existing −1.5%/week safety threshold), structured monitoring, gradual returns to off-season intakes, internal eating cues, appropriate off-season body compositions, and access to mental health support.

Volyume's existing ED safety system (1,200/1,500 kcal floors; −1.5%/week threshold; Beat UK signposting) is consistent with the research consensus. The science supports these floors as psychologically protective, not merely physiologically safe.

### 5.4 Social comparison in fitness apps

Research on fitness app social features confirms significant body image risk from social comparison mechanisms:

- Exposure to images of idealised bodies increases body dissatisfaction among women, partly through appearance-based comparison. Female undergraduates presented with fitness images reported more negative mood, body dissatisfaction, and lower state self-esteem than those shown neutral images. [Tandfonline — Body Satisfaction and Fitness App Use, 2022](https://www.tandfonline.com/doi/abs/10.1080/10410236.2022.2054099)
- A 2025 Frontiers study found that exposure to fitness posts on social media "harms female body esteem" through upward social comparison. [Frontiers — Fitness Posts and Body Esteem, 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1515575/full)
- Self-objectification — perceiving oneself as an object to be evaluated by others — is exacerbated by social media and is associated with eating disorder symptoms. [PMC — Social Media Use and Self-Objectification, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12395811/)

**For Volyume**: progress photos are a double-edged feature. For Eddie in competition prep, they are a legitimate tool. For Besa, unsolicited progress-photo prompts risk triggering precisely the social comparison loops that drive body dissatisfaction. The design principle is: progress photos are opt-in, never prompted as a default, and framed around performance milestones rather than appearance comparison.

### 5.5 What research says protects against ED risk

Body neutrality (as opposed to body positivity or body negativity) shows consistent protective effects: reframing the body around what it _does_ rather than how it _looks_ reduces body dissatisfaction without demanding positive feelings that users may not have. [PMC — Body Positivity and Body Neutrality Research, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC8708647/)

The most protective framing positions in a physique training app:
- **Performance over appearance**: "your squat went up 10% this cycle" rather than "you're looking leaner"
- **Process over outcome**: "you trained 4 sessions this week" rather than "you're x kg from your goal"
- **Functional capability**: "your cardio capacity has improved" rather than "your body composition is changing"

This framing is also more useful for retention: performance improvements are visible within days to weeks, whereas appearance changes take months. Anchoring early motivation to performance wins serves both adherence and wellbeing.

---

## Part 6 — Product Principles (Actionable, Evidence-Led)

Each principle below is tagged by persona (Besa / Eddie / Both), primary effect, estimated effort (S/M/L), and any constraint it touches.

---

### PP-01 — The Pre-Gym Briefing [Besa]
**Principle**: Before Besa's first session, the app should give her a "here's what you're doing today and why" brief that answers the three primary causes of gymtimidation: what am I doing, how do I do it, and do I belong here?

**Evidence**: Gymtimidation prevalence is 47% UK (PureGym 2025); knowledge gaps and social evaluation anxiety account for the majority of avoidance; orientation materially reduces first-visit anxiety.

**Product form**: a "Today's Session" card on the home screen (visible before the workout starts) that shows: exercise list, why each one is in her plan today (one-sentence rationale from the coach), estimated duration, and a phrase normalising beginner experience ("This is a Foundations session — the goal is learning the movements, not lifting heavy.").

**Effect**: activation (D0–D7), retention
**Effort**: S (the plan data and coaching rationale already exist in the engine; this is surface presentation)
**Constraint**: none

**Copy example** (British English, autonomy-supportive voice):
> "Today: Push A — chest, shoulders, triceps. Three exercises, about 45 minutes. This session uses slightly lower weight so you can nail the form — that's by design, not because you're not ready. The load will increase once the movement feels automatic."

---

### PP-02 — Replace Guilt Nudges with Competence-Protecting Reframes [Besa, Both]
**Principle**: When a user misses a session, the app's response should protect self-efficacy, not apply shame. The current category default (implicit "you broke your streak") is the wrong direction.

**Evidence**: self-efficacy erosion after missed sessions is a documented mechanism in the January drop-off; "shame, disappointment, frustration, and futility" from fitness apps was a British Journal of Health Psychology finding (2025) directly linked to abandonment. [BJHP — Commercial Fitness Apps, 2025](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjhp.70026)

**Product form**: when no activity is logged for the expected training day (+24 hours), the notification/card should:
1. Acknowledge that life happens (normalisation)
2. Provide a specific next step (removes decision fatigue)
3. Not mention the missed session again

**Effect**: retention (especially D5–D30), self-efficacy
**Effort**: S (copy change to existing notification logic)

**Copy example (notification)**:
> "Plans change — no worries. Your next Push A session is ready when you are. Tap to pick up where you left off."

**Avoid**:
> "You missed your workout yesterday! Don't break your streak!" (shame + gamification pressure)

---

### PP-03 — Surface Non-Scale Wins as Primary Early Progress [Besa]
**Principle**: For the first 4–8 weeks, the app's primary progress narrative should be performance and lifestyle improvements, not body composition changes. This matches what is actually measurable on that timeline and protects against the expectation–reality gap that drives February dropout.

**Evidence**: visible body changes require months; energy, sleep, mood, and performance improvements are detectable within 1–2 weeks; self-efficacy requires mastery experiences that can only come from what is currently achievable. Realistic expectations are a documented retention predictor.

**Product form**: a "How It's Going" card in the first 30 days that highlights:
- Loads lifted vs first session
- Total volume completed vs starting volume
- Sessions completed (absolute count, not streak)
- A coach observation: "Your form on squats has improved — you're hitting depth consistently now."

**Effect**: retention (D7–D30), self-efficacy, conversion (seeing progress motivates Pro trial continuation)
**Effort**: S–M (load and volume data exist; the "coach observation" can be a deterministic template triggered by RPE trends or load progression)
**Constraint**: none

---

### PP-04 — Identity Framing at Milestone Moments [Besa, Both]
**Principle**: at completion milestones (first session, first week, first month, first PB), frame the achievement in identity terms, not just outcome terms.

**Evidence**: identity-based habits ("the ultimate form of intrinsic motivation is when a habit becomes part of your identity" — James Clear) predict long-term adherence better than outcome goals; self-perception theory confirms that each completed action is evidence for the identity claim.

**Product form**: milestone messages that make explicit identity claims.

**Copy examples**:
- After session 1: "That's your first session done. Gymgoers have first sessions — you're one of them now."
- After first week: "Seven days in. You trained consistently this week. That's what people who train do."
- After first competition prep cycle (Eddie): "Peak week complete. You've been through a full contest prep cycle. That's a competitor's résumé."

**Effect**: retention, virality (shareable moment)
**Effort**: S (triggered copy at existing milestone events)

---

### PP-05 — Implement Schedule Anchoring at Setup [Besa]
**Principle**: when Besa sets up her training schedule, prompt her to specify the _times_ of each session (not just days), and explicitly explain this as "locking in your plan."

**Evidence**: implementation intentions (Gollwitzer) increase exercise follow-through by 2–3× over intention-setting alone; the mechanism requires specificity of when and where, not just that you will exercise. Effect size d = 0.31 for exercise adherence specifically. Consistency of context is the strongest predictor of habit automaticity.

**Product form**: during plan setup, after selecting training days, a screen asks: "What time works best for each day? Setting a specific time makes it far more likely you'll stick to it." Populated times are displayed on the home screen training card: "Tomorrow, Tuesday · 7:00 am · Push A."

**Effect**: activation (D0–D14), retention
**Effort**: S–M (data model may need a time-per-training-day field; display is straightforward)

---

### PP-06 — Autonomy-Supportive Coaching Copy Throughout [Both]
**Principle**: all coaching messages, push notifications, and in-session prompts should follow autonomy-supportive framing: rationale always provided, choice offered where possible, no controlling language.

**Evidence**: autonomy support predicts intrinsic motivation and engagement; controlling language predicts amotivation and dropout across all age groups and experience levels. The "avoid controlling language" guideline applies universally; only the _depth_ of explanation differs between Besa and Eddie.

**Linguistic rules to encode across all coaching copy**:

| Avoid (controlling) | Use instead (autonomy-supportive) |
|--------------------|------------------------------------|
| "You should do more cardio" | "Adding one cardio session this week would support your deficit — worth considering" |
| "You must hit your protein target" | "Hitting your protein target is the single highest-leverage nutrition action right now" |
| "You haven't logged in 3 days" | "Logging consistently gives the coach more to work with — even a quick entry helps" |
| "You're falling behind" | "The plan's here whenever you're ready — pick up from today's session" |
| "Don't eat that" | "That meal would take you over your target today — your call entirely" |

**Effect**: retention, trust, brand differentiation
**Effort**: S (copy audit and rewrite; no architecture change)

---

### PP-07 — Calibrated Hard Truths for Eddie [Eddie]
**Principle**: when the engine surfaces a warning or hard truth (over-reaching, underperformance, safety threshold proximity), deliver it with: (a) the specific data, (b) the reason it matters to Eddie's declared goal, (c) the concrete adjustment.

**Evidence**: elite athletes prefer data-dense feedback and direct challenge; they do not respond well to softened messages that obscure the finding; but even elite athletes respond better when the "why" is tied to their goal, and no-one responds well to shaming language.

**Copy example (recovery warning)**:
> "Your last 3 sessions show RPE consistently 1–2 points above target. That gap usually means systemic fatigue is accumulating faster than you're recovering. Left unchecked, it typically means a deload in 2–3 weeks rather than one in 4. Option: reduce this week's volume by 15% and protect next month's peak. Want to adjust the plan?"

**Versus the wrong approach**:
> "Warning: you may be overtraining. Make sure you're getting enough rest!"

**Effect**: trust (Eddie), safety, Pro retention
**Effort**: S–M (template; the data signals already exist in the engine)

---

### PP-08 — Body-Neutral Progress Language as Default [Both, especially Besa]
**Principle**: the default progress narrative across the app should be body-neutral: framing capability, performance, and consistency — not appearance or weight. Appearance-based metrics remain available but are not surfaced as primary.

**Evidence**: body neutrality shows consistent protective effects vs body positivity or appearance focus; performance improvements are measurable weeks before body changes; functional framing ("what your body does") reduces body dissatisfaction without requiring unrealistic positive feelings. Particularly important given the ED safety posture and the need to welcome Besa without triggering social comparison.

**Product form**:
- Home screen progress banner leads with performance: "Volume this week: 18,400 kg · Up 8% vs last week."
- Check-in summary leads with: "Your consistency this month: 12 of 14 sessions · Recovery trend: stable."
- Weight tracking (Pro) is available but does not appear on the home screen unless the user has navigated to it.

**Effect**: safety (ED posture), retention (Besa), onboarding conversion
**Effort**: M (requires placement decisions on home screen; may touch existing check-in summary design)
**Constraint**: touches check-in which is a Pro feature — verify this doesn't bleed into free surface

---

### PP-09 — Differentiated Explanation Depth by Experience Level [Besa vs Eddie]
**Principle**: the app should calibrate how much jargon and technical depth it uses based on the user's declared experience level. Besa should not encounter MEV/MRV/RIR without a plain-language translation; Eddie should not encounter explanations of these terms every time.

**Evidence**: RP Hypertrophy is the cautionary tale — "jargon-before-value" drove beginners away (competitive audit). MacroFactor was "useful in month six, overwhelming in week one." Calibrated explanation depth maps directly to SDT competence need: beginners experience jargon as competence _threat_, not competence _support_.

**Product form**:
- Training terms shown to Besa on first encounter: plain-language tooltip or inline explanation ("sets in reserve (RIR): how many more reps you could do before failing").
- Same terms shown to Eddie: no explanation. He knows; the tooltip is condescending.
- Beginner onboarding: use plain names ("rest days between sessions") before introducing cycles, MEV, mesocycles.
- Progressive disclosure: advanced terminology becomes available/visible after 4 weeks of consistent use, when some competence base has formed.

**Effect**: activation (Besa), trust (Eddie)
**Effort**: M–L (requires experience-level data from onboarding to conditionally render explanations)

---

### PP-10 — Progress Photo Feature: Opt-In, Performance-Anchored [Both, especially pro-safety]
**Principle**: progress photos should be strictly opt-in, never prompted as a default, and framed around performance milestones rather than appearance comparison.

**Evidence**: progress photos are a legitimate tool for physique athletes (Eddie) but risk social comparison loops and self-objectification for beginners (Besa). Research on social comparison in fitness apps and upward comparison to idealised images consistently shows body dissatisfaction harms; the risk is highest in women aged 18–34, exactly Besa's profile.

**Product form**:
- Progress photos available in Pro, accessible from settings or check-in, never surfaced unprompted
- When a user opts in, the framing is: "Some athletes find comparing photos at the start and end of a phase useful. This is entirely optional and private to you."
- Photos are linked to training phase markers (start of mesocycle, end of mesocycle) not to weight readings
- No in-app comparison tool that surfaces two photos side-by-side with a weight delta

**Effect**: safety (ED posture), trust, brand reputation
**Effort**: S (feature already exists in Pro; this is framing and access-point design)
**Constraint**: review ED safety system interaction — any change to photo prompting near rapid-loss thresholds should be reviewed

---

### PP-11 — Social Support: Available, Not Ambient [Both]
**Principle**: social accountability features (from NEW-002 Training Partners) should be designed to be invoked by the user, not presented as ambient pressure. This follows the "social support overload" research finding that passive ambient social presence causes burnout and app abandonment.

**Evidence**: social support overload in fitness apps causes "burnout and discontinuance" specifically in users who already feel pressure (exactly Besa's profile). Apple Fitness Activity Sharing criticism documents the "implicit pressure to stay active" problem. The protective design principle across the research is consent-first, scope-defined, easy to reduce or exit.

**Product form** (aligned with NEW-002's existing framing):
- Training partner data is shown when you navigate to the partner screen, not pushed to the home screen
- Default notification setting for partner activity is off; user explicitly enables "notify me when my partner trains"
- Partner cheers are a tap-to-send action, not automatic
- Easy one-tap "take a break from partner notifications" without removing the partnership

**Effect**: retention, safety, trust
**Effort**: S (configuration default — this is a settings and default decision, not architecture)

---

### PP-12 — The "Why" Coach Note at Plan Generation [Besa]
**Principle**: when the plan is generated or updated (including after a coaching adjustment), include a brief "why this plan" note in plain language that explains what the engine decided and why.

**Evidence**: autonomy support requires meaningful rationale; the "coach explains decisions in context" is already described in CLAUDE.md as the product's answer to in-app education. Runna's post-generation coach message is the best-in-class example from the competitive audit — "makes users feel seen." SDT competence support requires not just a plan but an explanation that helps the user understand the system logic.

**Product form**: after plan generation, a card from "your Volyume coach":
> "Your plan starts at [X] sets per session for each major muscle group. That's below your long-term capacity — intentionally. Building from a lower volume means your joints and CNS adapt first, and you'll be adding sets in 3–4 weeks rather than burning out in week two. It's a longer game, and it works."

**Effect**: activation, trust, retention, conversion (trial continuation)
**Effort**: S (template copy triggered on plan generation; the engine already has the rationale data)

---

## Part 7 — Copy Patterns Summary

Quick reference for the coaching voice across both personas.

### Besa (Beginner) voice
- Warm, matter-of-fact, normalising
- Explains every technical term on first use
- Celebrates consistency over performance
- Never judges missed sessions; always provides a next step
- Uses "you might" and "worth considering" not "you should" or "you must"
- Explicitly acknowledges that this is hard, early stages are awkward, and that's expected
- Performance frame over appearance frame at all times

**Sample micro-copy**:
- Workout card: "This is a manageable session. The goal today is movement quality, not load."
- After week 1: "Seven sessions in, seven to go this phase. You're right on schedule."
- Rest day: "Rest day — active recovery like a walk is fine, or just rest. Both count."
- Missing session: "No worries. Your next session is ready when you are."

### Eddie (Elite) voice
- Direct, data-dense, no hand-holding
- Technical terms used without explanation
- Performance frame: output, load, volume, recovery metrics
- Treats him as a peer who can evaluate the engine's logic
- Delivers hard truths with specific data and concrete options
- Acknowledges when something is a judgement call vs hard data
- Does not praise completion of ordinary tasks — saves acknowledgement for genuine milestones

**Sample micro-copy**:
- Volume adjustment: "Accumulation phase week 3: MAV for quads reached. Dropping volume 15% this week; MEV for deload. Resume accumulation week 5."
- RPE warning: "RPE trend is running 1.5 points above target across the last three sessions — systemic fatigue flagged. Recommend modifying this week."
- Peak week: "Contest week protocol loaded. Cuts have been sequenced over 7 days. Review and confirm."
- PB: "Deadlift 1RM up 5 kg this phase. Progressive overload is working — on track."

---

## Part 8 — Conflicts with Prior Conclusions / Where This Disagrees

1. **The prior onboarding research recommended framing Volyume's physique division questions as "identity-affirming commitment devices."** This report partially agrees — but adds a caution: for Besa, asking her to select a physique division before she has any sense of belonging to that world can _increase_ intimidation rather than create commitment. The division selection should follow a general goal framing, not lead it. Recommendation: ask Besa "what do you want to achieve?" first, then offer the division as a precision refinement ("if you want to compete, here's what that looks like") rather than forcing a competitive identity onto someone who just wants to get fit.

2. **The prior audit treated streaks (COMP-018) as straightforwardly positive.** The research on gamification crowding-out effects and on shame responses to missed streaks suggests streaks are double-edged: they reward the already-motivated and punish the struggling. For Besa in weeks 1–6, a missed-session shame response from a broken streak may be the most damaging event in the entire early journey. Recommend: for users in their first 30 days, streak display should be suppressed or replaced with a "consistency rate" (3 of 4 sessions this week) that frames the same data without the binary pass/fail of a streak counter. After 30 days, the user has enough mastery experience to tolerate a broken streak without self-efficacy collapse.

3. **The prior audit noted "the coaching voice is British, honest, not preachy" without a principled framework.** This report provides that framework: autonomy-supportive coaching is the scientific underpinning. The guidelines in PP-06 (linguistic rules) give the copywriting team a specific checklist, not just an aspiration.

---

## Part 9 — Source Index

- [PureGym UK Fitness Report 2025/26](https://www.puregym.com/blog/uk-fitness-report-gym-statistics/)
- [Flex AI Gymtimidation Survey](https://flexfitnessapp.com/blog/gymtimidation-survey/)
- [Muscle and Brawn — 17 Gym Intimidation Statistics](https://muscleandbrawn.com/statistics/gym-intimidation/)
- [Gym Anxiety Statistics — ZipDo 2025](https://zipdo.co/gym-anxiety-statistics/)
- [Frontiers — Social Gym Intimidation, PTM Framework, 2026](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1712367/full)
- [Gladstone Software — Gymtimidation](https://blog.gladstonesoftware.com/news/gymtimidation-how-to-help-fitness-newbies-feel-comfortable-in-your-gym)
- [INTEGRIS Health — Gymtimidation, 2025](https://integrishealth.org/resources/on-your-health/2025/january/gymtimidation-overcoming-gym-anxiety)
- [Zynk Design — Gym Design and Gymtimidation](https://zynkdesign.com/how-gym-design-can-reduce-gymtimidation/)
- [ScienceDirect — SDT in Physical Activity Promotion, 2025](https://www.sciencedirect.com/science/article/pii/S1469029225000780)
- [Frontiers — Fitness App Need Support and Exercise Adherence, 2026](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1752995/full)
- [ACM CHI 2023 — Interactivity and Relatedness in Fitness Apps](https://dl.acm.org/doi/10.1145/3544548.3581200)
- [RazFit — Intrinsic Motivation in Fitness](https://razfit.app/gamification-fitness/intrinsic-motivation-fitness/)
- [Frontiers — Motivation Crowding in Gamified Fitness Apps, 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1286463/full)
- [The Behavioral Scientist — Implementation Intentions](https://www.thebehavioralscientist.com/glossary/implementation-intentions)
- [PMC — Implementation Intentions and Physical Activity, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6440859/)
- [James Clear — Identity-Based Habits](https://jamesclear.com/identity-based-habits)
- [Hinge Health — Identity and Habits](https://www.hingehealth.com/resources/articles/identity-and-habits/)
- [APA — Self-Efficacy Teaching Tip Sheet](https://www.apa.org/pi/aids/resources/education/self-efficacy)
- [PMC — Self-Efficacy in Habit Building, 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8137900/)
- [Glofox — New Year's Resolution Gym Statistics](https://www.glofox.com/blog/6-new-years-resolution-gym-statistics-you-need-to-know/)
- [PMC — Analysis of Training Behaviour in Fitness App Users, 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12828317/)
- [NASM — Building Habits That Last](https://www.nasm.org/resource-center/blog/building-habits-that-last/)
- [Trainerize — Why Fitness Clients Quit, 2026](https://www.trainerize.com/blog/why-fitness-clients-quit-and-how-to-keep-them/)
- [PMC — Peer Support and Exercise Adherence, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9955246/)
- [PMC — Social Support Overload in Fitness Apps, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11764542/)
- [ScienceDirect — Autonomy Support and Self-Determined Motivation, 2006](https://www.sciencedirect.com/article/abs/pii/S146902920600118X)
- [ScienceDirect — Interactive Effects of Autonomy-Support and Control, 2018](https://www.sciencedirect.com/article/abs/pii/S1469029218304424)
- [Frontiers — Autonomy-Supportive Coaching and Resilience, 2024](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1433171/full)
- [Stanford Bing School — Dweck on Intelligence Praise](https://bingschool.stanford.edu/news/carol-dweck-praising-intelligence-costs-childrens-self-esteem-and-motivation)
- [HucoSport — Coach Athlete Communication, 2026](https://hucosport.com/en/coach-athlete-communication/)
- [JSEP — Athletes' Participation in Film Sessions, 2025](https://journals.sagepub.com/doi/10.1177/21674795251363419)
- [Athletic Performance Academy — Feedback Frequency, 2024](https://athleticperformanceacademy.co.uk/coaching-feedback-are-we-talking-too-much/)
- [ICF Blog — Delivering Hard Feedback, 2024](https://coachingfederation.org/blog/delivering-hard-feedback-5-tips-that-fuels-performance/)
- [Dynamics Coaching — Autonomy-Supportive Behaviours](https://dynamics-coaching.com/uncategorised/motivation-part-2-supportive-coaching-behaviours/)
- [BJHP — Commercial Fitness Apps and Negative Outcomes, 2025](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjhp.70026)
- [NEDA — Muscle Dysmorphia](https://www.nationaleatingdisorders.org/muscle-dysmorphia/)
- [PMC — Body Image and Eating Disorders in Male Bodybuilders, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6142149/)
- [Wiley — Muscularity, Physique Anxiety and Body Image, 2024](https://onlinelibrary.wiley.com/doi/full/10.1002/casp.2800)
- [PMC — Sustainable Nutrition Paradigm in Physique Sport, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6681103/)
- [Tandfonline — Body Satisfaction and Fitness App Use, 2022](https://www.tandfonline.com/doi/abs/10.1080/10410236.2022.2054099)
- [Frontiers — Fitness Posts and Body Esteem, 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1515575/full)
- [PMC — Social Media Use and Self-Objectification, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12395811/)
- [PMC — Body Positivity and Body Neutrality Research, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC8708647/)
- [Tandfonline — Goal Setting in Sport, 2021](https://www.tandfonline.com/doi/full/10.1080/1750984X.2021.1901298)

---

*Research only — no code changes. All principles are options for the founder; none modifies locked docs.*
*British English used throughout.*
