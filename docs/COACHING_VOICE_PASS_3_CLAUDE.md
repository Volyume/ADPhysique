# Coaching voice research, pass 3: Claude

Third and final of three deep-research passes (Gemini, ChatGPT,
Claude) on `COACHING_VOICE_RESEARCH_BRIEF.md`. Stored verbatim.
Naming ("the engine" / "the system") will be normalised to
**Precision Coaching** at synthesis since the brief sent to Claude
predated the name correction.

---

# Part 1: Literature Findings by Pillar

**1. Autonomy-supportive vs. controlling language (SDT)** – Self-Determination Theory (Deci & Ryan) distinguishes **autonomy-supportive** (choice-affirming) from **controlling** language. Autonomy-supportive phrasing uses open-ended, permissive words (e.g. "you can," "we suggest," "consider…") and respects the person's agency, whereas controlling phrasing uses directives (e.g. "you must," "you should," "you have to")【90†L540-L549】. Research shows autonomy-supportive contexts increase intrinsic motivation, while controlling contexts undermine it【90†L540-L549】. Notably, a 2024 experiment found that adding ostensibly autonomy-supportive language (even friendly phrasing) *reduced* behavioral intentions in a health message, partly by triggering reactance【91†L72-L80】. This suggests context matters: if users perceive fake "choice," it can backfire.

*Contested:* Some studies assume autonomy-supportive is always better, but evidence shows mixed results in digital messages【91†L72-L80】. Moderators like personal desire for autonomy matter.

*Implications:* Early feedback should **use neutral or choice-framing language** ("you could try X") rather than imperatives. Phrases like "you have to" or "must" should be replaced with "might" or "could." First-person plural ("we") is acceptable if it refers to the app/developers, but not to feign joint decision-making (see pillar 9). Controllers (as in bossy tone) harm motivation【90†L540-L549】. For Volyume surfaces: use permissive or suggestive language (e.g. "consider adjusting…"), avoid phrasing that implies obligation.

**2. Motivational interviewing (MI) in one-way contexts** – MI emphasizes open-ended questions, reflective listening, affirmations, and summaries (the "OARS" model)【33†L328-L337】. Its **spirit** is empathic, non-confrontational, and autonomy-supporting. In two-way settings, MI builds motivation by eliciting "change talk." In a one-way app, we can **draw on MI tone** but not true dialogue. Prior work shows MI-like digital interventions can simulate empathy and support autonomy【21†L795-L804】. In push-only feedback, we cannot ask real questions or reflect user answers, but we *can* mirror user data and affirm effort. For example, acknowledging logged efforts ("You've consistently hit your protein target") is akin to MI affirmations. Empathy can appear as factual empathy ("We know cutting calories is tough"). However, inviting actual choice ("What do you think?") or asking questions is futile since the app won't hear the answer.

*Contested:* Some digital MI/chatbot research suggests that even simulated MI can boost engagement, but authenticity matters【21†L795-L804】. In our context, open questions or "tell me more" have no real effect.

*Implications:* Use MI-like warmth and non-judgment, **affirm factual progress** ("I see you did X"), and **summarize data gently** ("It seems you've had Y for three weeks"). Avoid asking rhetorical questions expecting answers. Keep a guiding-but-not-pressuring tone: e.g., "It sounds like balancing this goal with daily life is challenging." Emphasize empathy and respect autonomy within one-way limits【33†L328-L337】【21†L795-L804】.

**3. Safety-hold communication for at-risk users (ED sensitivity)** – When signaling potential eating-disorder patterns or danger (e.g. under-eating, rapid loss), language must be factual, neutral, and compassionate. CBT-E and family-based ED protocols emphasize **non-shaming, supportive language**. For example, they treat setbacks as information, not personal failure【65†L272-L275】, and **avoid moralizing food choices** ("good vs bad food" terminology)【65†L238-L242】. A qualitative study of dieting apps found users feel "pressure" and guilt from punishing language【51†L94-L100】. The recent IJED commentary on app harm (Cruz et al.) underscores that messaging should preserve users' self-efficacy and avoid stigma.

*Words to avoid:* "Unhealthy," "bad choice," "failure," or labeling foods/behaviors as immoral. Also avoid "must" or "should," which sound paternalistic.

*Implications:* State observations gently: e.g. "Your weight has been falling quickly and your energy is low." Provide a neutral rationale ("A very large calorie deficit can slow metabolism and raise hunger later"). Frame holds as protective, not punitive. Use empathy ("We know this can be challenging") but not false intimacy. Affirm effort ("You've been consistent with your logs"). Focus on recovery and next steps, not blame: "Your calorie target will hold steady this week to let your body recover." This factual-but-caring style avoids shame【65†L238-L242】【65†L272-L275】.

**4. Elite-coach communication style (strength & nutrition)** – Evidence-based coaches (e.g. Lyle McDonald, Eric Helms, Greg Nuckols) tend to use a **direct, factual tone**. They cite data ("You hit 4×8 at X load"), keep explanations scientific, and respect clients' autonomy but without over-soliciting input. They rarely use jargon; when they do ("kg, sets, macros"), it's with explanation for a lay audience. Many emphasize stabilizing fundamentals: e.g. consistent meals, sleep, training intensity – rather than drastic measures【65†L164-L172】. They handle setbacks non-judgmentally, focusing on solutions.

*Observed patterns:* Coaches often speak plainly ("Your lifts are down. Could be your intake.") and numerically ("Bench stalled 3 weeks. Next week is deload."). They might use "we" in a team sense ("we'll adjust the plan"), but usually it's understood they, as coach, are leading. Emotional encouragement is measured – they congratulate genuine progress but avoid empty praise.

*Implications:* Volyume voice should mimic this: **no fluff** or hype ("crush it"/"beast mode" banned). Use precise language ("calorie target", "deficit") but in plain terms. Admit limitations ("the data shows…"). Like coaches, present data ("Your energy scores") before interpretation. Keep confidence (competence) but warm (benevolence) once trust builds. This aligns with SDT: intrinsic (health) vs extrinsic goals. Avoid turning into a "guru" voice – we cite science, not hype【65†L164-L172】.

**5. App-specific behavior change & post-mortems** – User churn often spikes at friction points or negative tone. Post-mortems (e.g. Calm/Headspace) advise **empathetic, motivational prompts** over guilt or FOMO pressure. Cronin et al. (2022) reviewed fitness apps: interventions with purely punitive reminders (e.g. scolding for missed goals) tend to lose users. In general, push notifications should feel helpful, not intrusive. The "Drink Less" app study found reminders boost short-term engagement only if well-timed. Differential paywalls (like the Pro prompt) should highlight value (insight) not shame for missing features. For example, framing the Pro trial as "Here's how it can help you" works better than "You failed to log meals, buy now".

*Implications:* On paywalls, use **insight-driven framing** (see Surface 2). On dropouts or missed sessions, messages like "We noticed you've paused. Hope you're okay!" outrank blameful ones. Give quick, relevant information: e.g. "Without meal data, we can't see why your bench stalled" informs upsell. For push notifications, keep them personal (first name if allowed), timely (accounting for context), and brief. Avoid exclamation points or overly cheerleading ("Congrats!") which feel insincere. Data first, positive framing second.

**6. Plain-language health communication** – Health messages must be *clear to a broad audience*. The 2025 JMIR study found most "plain language" summaries still use high jargon and exceed average reading levels【102†L232-L240】. The CDC and NHS advise: use common words, short sentences, active voice, and concrete examples【104†L75-L80】【104†L107-L110】. NHS guidelines specifically recommend a target reading age ~9–11, no medical jargon without explanation, and structure that highlights key info【104†L68-L75】【104†L107-L110】. Avoid polysyllabic terms (e.g. "metabolic adaptation"), favor "body adjustment" instead.

*Implications:* Every surface copy should be **simple and active**. E.g. "Your weight is…" not "Weight is recorded". Spell out acronyms. Break into 2–3 short sentences. Use bullets if needed (see Surface 3 consent). This helps all users, including those in recovery who may have cognitive load issues. Always assume diverse literacy.

**7. Counterfactual framing + autonomy-support** – The xAI literature shows **upward counterfactual explanations** ("if X had been different, Y would improve") boost learning and motivation more than downward or no explanations【109†L80-L87】. In practice, this means telling users *what could have gone better*. In Volyume, we might say "If you had eaten X, your energy would likely be Y." Combined with autonomy-support, do this gently: "Had you kept calories at target, you'd likely have avoided the drop in energy." Frame it as insight, not blame. Upward "what if" helps users see a path forward (regulatory fit)【109†L80-L87】. Avoid phrasing that suggests the outcome is hopeless.

*Implications:* Use counterfactuals as suggestions: e.g. "With 200 more calories, your muscle recovery would have been better." Pair with "consider" language. Don't say "You should have…," but "If you had... something beneficial might have happened." This educates and maintains autonomy support【90†L540-L549】【109†L80-L87】.

**8. "Feel-seen" personalization cues** – Users trust an app more if it clearly **reflects their actual data** and context. A qualitative study found people dislike generic or "robotic" messages and instead prefer feedback that feels tailored and empathetic【114†L77-L84】. Mentioning specifics ("Your fatigue score is low this week") shows we "see" them. However, avoid inferring unmeasured emotions. For example, say "Your morning energy ratings have been low" instead of "You seem discouraged." Transparency matters: explain *why* you're saying something ("We noticed...") but stick to observed facts.

*Implications:* Incorporate user data: e.g. "Last week you logged 3 workouts." Use "we noticed" statements grounded in data rather than guesses ("we know how you feel" is avoided). Briefly explain the basis for advice: "Based on your logs, we'll adjust…" This balances personal touch with honesty. Avoid overeager personalization (e.g. calling users by intimate nicknames) and respect privacy cues.

**9. Honesty about decision authority** – Crucial: the app *does* make decisions autonomously from user logs. Language implying **shared control** ("we'll work this out together", "your call") is misleading. Research on AI transparency shows that misrepresenting agency erodes trust【114†L77-L84】. Users prefer to know *who/what* decided. Therefore, never claim the user "decided" a plan they did not. Instead, attribute actions to the system or rules: e.g. "Volyume's plan will…" or "based on the rules, your target is set…". Use passive or neutral voice if needed ("Your target will be held for now.").

*Failure modes:* Phrasing like "It's up to you" or "together we choose" are dishonest here. Instead say "the system suggests" or "your data indicates." Show respect for user input ("Your logging matters") but clarify that the engine applies set rules. This candor builds trust.

*Implications:* Review all copy for implied agency. Remove phrases like "you decide" where the user had no input. For example, say "Your calorie target stays the same this week" (neutral) rather than "you choose to keep it steady." Use the first person plural "we" only to mean the company/app ("we've adjusted your plan"), not as co-operation. This avoids the disillusionment of false partnership.

**10. Voice calibration by relationship depth** – Early interactions demand a more **formal, neutral tone**; as trust grows, a slightly warmer voice is acceptable. The trust-formation model (Mayer & Davis 1995) suggests initial trust is based on perceived competence, later on benevolence. Thus, onboarding and week 1–2 messages should be straightforward and factual (establish competence), avoiding overly personal touches. By week 3+, once the user sees the engine "working," copy can be a bit more engaging (still honest). Safety alerts at any stage should err on clarity over warmth, given their seriousness.

*Implications:*
- **Onboarding/early:** Factual guidance, minimal "coaching" flair. E.g. "Your goal is set to X. Here are the targets" (no "we'll work together").
- **Steady state (weeks 3+):** After some successes/stabilization, you may add friendly notes ("Looks like you're back on track!"), but still data-focused.
- **Safety holds (any week):** Always clear and cautious, similar to early-stage tone, since user may feel vulnerable.
- **Post-hold recovery:** Now you can acknowledge improvement ("Your corner-turning is great news"), blending factual and upbeat tone.

Keeping these stages in mind ensures warmth grows only as warranted by the user's journey, while never breaching honesty or sensitivity.

# Part 2: Phrasing Pattern Set

1. **Autonomy-support phrasing**
   *Principle:* Use "could/might" and suggestive language instead of commands【90†L540-L549】. For example, say "You might consider adding a snack" rather than "You must eat more."
   *Example:* "You could try adding 200 calories today to boost energy."
   *Avoids:* Controlling tone ("you have to", "you should"), which can feel bossy.

2. **Observed-state acknowledgement**
   *Principle:* State facts drawn directly from user data instead of guessing emotions. Focus on measurable signals (weight, food log, mood entries).
   *Example:* "Your weight has dropped quickly over the last 3 weeks."
   *Avoids:* Unverified interpretation ("You seem very tired"), which can feel intrusive or patronizing.

3. **Upward counterfactual explanation**
   *Principle:* Frame feedback as "if-then" positives. Show how a different action could improve outcomes【109†L80-L87】. Phrase as "if X, then Y" to motivate constructive change.
   *Example:* "If you had eaten a bit more yesterday, you'd likely feel more energetic today."
   *Avoids:* Downward ("could be worse") or defeatist language. Prevents blame by focusing on improvement.

4. **System-as-agent transparency**
   *Principle:* Clearly attribute decisions to the app/rules, not the user. Use passive voice or name "the system/engine."
   *Example:* "Your calorie target will hold steady this week to let your energy recover."
   *Avoids:* False partnership ("we decide together") or blaming the user. Maintains honesty about authority.

5. **Effort affirmation**
   *Principle:* Acknowledge the user's actual efforts (training, logging) in a factual way. This mirrors MI's affirmation but remains objective.
   *Example:* "You've logged all your workouts this week."
   *Avoids:* Empty praise ("Great job!") which feels insincere and is explicitly banned. Instead use tangible achievements.

6. **Concrete guidance without moral labels**
   *Principle:* Give specific instructions or explanations without calling anything "good" or "bad." Emphasize health or process terms like "safe," "steady."
   *Example:* "Rapid weight loss can be hard to sustain; we'll slow it down to a safer pace."
   *Avoids:* Shaming words ("unhealthy", "failure"). Reduces user guilt by focusing on well-being.

7. **Plain-English simplicity**
   *Principle:* Use short, common words and active sentences【104†L107-L110】. Avoid jargon or technical terms without explanation.
   *Example:* "We adjusted your plan because of your recent data."
   *Avoids:* Complex phrasing or acronyms (e.g. "deficit was MAINT" or "metabolic adaptation"). Improves comprehension.

8. **Data-first structure**
   *Principle:* Lead with important numbers or findings ("You lost 2kg…") before elaboration. This aligns with evidence-based coach style and reader expectations.
   *Example:* "Weight –1.5kg, energy still low. We'll keep calories steady."
   *Avoids:* Burying data after words. This prevents confusion and aligns with the "numbers are hero" rule.

9. **Calibrated warmth**
   *Principle:* Match tone to user's stage: minimal warmth initially, more personal once trust is earned. Always stay factual.
   *Example:* Early: "Welcome to Volyume. Let's begin with your goals." Later: "You've come a long way – great consistency!"
   *Avoids:* Over-familiarity early ("buddy", emojis) and patronizing cheer ("Congrats!") at all times. Respects the user's progress and context.

10. **Option and choice framing**
    *Principle:* When presenting choices (e.g. in paywalls or settings), use neutral descriptions of options. Emphasize how each serves them, not what they "should" do.
    *Example:* "Complete gives full tracking; Free lets you continue workouts only."
    *Avoids:* Guilt-inducing or urgent sales pitches. Keeps control clearly the user's own.

# Part 3: Re-drafted Surfaces

**Surface 1: Safety-hold card (ED-pattern/rapid-loss/FFM hold)**
> **Pause Week.** Your weight has been dropping quickly and your energy is very low. This combination can push the body to conserve energy, break down muscle, and later trigger big hunger increases. To protect your progress, your calorie target will stay the same this week. Keep training, keep logging, and aim for your current target (do not go below it). Once your energy levels stabilize over a couple of weeks, the system will set a new target based on your data.

*(Voice: factual, calm, no false intimacy. Empathetic but data-driven. "Your target stays the same" is honest. We mention the benefit of pausing.)*

**Surface 2: Paywall trigger (Move #4 coaching insight)**
> Your bench press has stalled for 3 weeks. This could be due to your training or your nutrition, but without your food log the system can't tell which. With the Pro upgrade, you can log meals and get clearer feedback on whether fuel or training needs to change. Start a free 14-day trial to add food tracking and break through plateaus.

*(Focus on insight: shows value of Pro in solving their problem. Removes "we" except in "the system.")*

**Surface 3: Health-data consent (GDPR Art9)**
> **Health Data Permission**
> Volyume needs your OK to save sensitive health info: weight, body fat %, energy & recovery scores, and food intake. We use this data only to personalize your plan and keep it secure. Volyume will store it safely and not share it outside the app. You can change your permission or withdraw consent at any time. Do you agree to continue?

*(Clear, plain language. Bulleted or short-sentence format (as shown). Stresses security and purpose.)*

**Surface 4: Onboarding goal-lock choice (aggressive goal)**
> **Aggressive Goal Safety**
> You chose a very aggressive cut goal (e.g. contest prep). This raises the risk of unhealthy patterns. We can apply a "Goal Lock" to keep you safer: the calorie cut will be slower and the safety threshold raised (you'd get extra warnings before any hold). This helps protect your energy and muscle mass.
> - **Keep standard plan:** Faster cut, standard safety (ED alerts sooner).
> - **Apply Goal Lock:** Slower cut, stricter safety margin. (Recommended if you want a safer approach.)

*(Explanatory tone. The user explicitly chooses. The wording is transparent about what "goal lock" means. Avoids "we'll work together"; uses explanation.)*

**Surface 5: Cascade trial transitions**
- *Day 14 (Complete trial ends):* "Your Complete trial ends today. To keep personalized nutrition tracking, choose a subscription: **Complete** (all features, including food logging) or **Pro** (workouts only). You can also switch to Free (diet features off)."
- *Day 28 (Pro trial ends):* "Your Pro trial ends today. Subscribe to continue Pro workouts, or switch to Free (limited features). If you want meal tracking later, you'd upgrade to Complete."
- *Payment failure:* "Payment failed. Your subscription is paused. Please update your payment in Settings to continue your plan."

*(Each is factual and urgent without guilt. Options are clearly explained. Consistent with early vs. late user stage: day 28 may assume some warmth, but still straightforward.)*

**Surface 6: Notifications (example bodies, ≤80 chars)**
- Daily check-in reminder: "Time for your daily check-in: log today's weight, energy, and mood."
- Weekly summary nudge: "Weekly summary: update your weight and review this week's progress."
- Cascade trial push: "Your trial ends today. Check app for upgrade options."
- Payment failed push: "Payment did not go through. Open Volyume to update billing."

*(Concise, imperative-flavored but polite. Data cues and urgency are minimal. No hype or "!".)*

**Surface 7: Hold-lifted / recovery card**
> **Hold Lifted**
> The signals that triggered the hold have settled. Your energy levels are back up and weight is moving at a safer pace. We'll start adjusting your calorie target again next week based on your data. Remember: steady, gradual changes usually work better than sharp ones. Keep focusing on consistent eating and training.

*(Acknowledges improvement factually. Encourages caution ("steady, gradual"), which is supportive. No over-celebration, just "remember" advice.)*

# Part 4: Failure-Mode Catalogue

- **"Let's decide this together"** – Implies shared agency. In Volyume, the engine decides; the user cannot jointly negotiate targets. This phrase breaks trust because it's false. *Instead:* State the plan objectively ("Next week the system will recalc your targets").
- **"You should/need to…"** – Prescriptive language triggers resistance. E.g. "You should eat more" feels bossy and controlling【90†L540-L549】. *Instead:* "You might consider…" or "It may help to…" maintains autonomy.
- **Generic praise ("Great job!")** – Banned as "motivational filler." Users notice generic compliments as insincere. *Instead:* Affirm with specifics or neutral tone ("Your logs are complete for the week").
- **"Unhealthy" or moral labels** – Calling something "unhealthy" can shame an at-risk user【65†L238-L242】. It also blames them. *Instead:* Describe the state neutrally ("rapid weight loss" or "very low calories"), or frame as risk ("This level of deficit can be hard on the body").
- **Rhetorical open questions** – E.g. "How do you feel about your progress?" in a one-way context frustrates users (no answer route). *Instead:* Either omit questions or frame them as reflection prompts without expecting reply ("You might wonder how to adjust.") or provide info directly.
- **Overly technical terms** – Using terms like "metabolic adaptation" or acronyms (TDEE, RPE) confuses and alienates non-experts【102†L232-L240】【104†L75-L80】. *Instead:* Use simple analogies or everyday terms (e.g. "body's adjustment to weight loss").
- **False urgency/sales tactics** – E.g. "Act now or lose your chance!" at a paywall can feel manipulative and cause churn. *Instead:* Present choice calmly, focusing on benefit ("Upgrade for more insight") and letting the user decide.
- **Inferring unlogged emotions** – Saying "We know you must be tired" risks backfiring if wrong. *Instead:* "Your logs show fatigue," which is verifiable.
- **Paternalistic tone** – Phrases like "we must protect you" can come off as condescending. *Instead:* Use collaborative language that respects user agency: e.g. "We'll hold your calories steady for now to help you recover." This still takes action but doesn't blame the user.

# Part 5: Open Questions & Limitations

- **MI one-way effectiveness:** There's little direct evidence on using MI techniques in strictly one-way app messages. We infer from chatbot studies and MI principles, but actual A/B tests in this context would be valuable.
- **ED-safe phrasing specifics:** Research on exactly which words trigger or soothe users in ED recovery is sparse. Clinician input and real-world user testing would clarify which phrases avoid denial or shame.
- **Voice calibration timeline:** The week-by-week switch from factual to warmer voice is theoretically grounded (trust formation), but untested. User feedback or experiments could determine the optimal timing and warmth levels.
- **Personalization threshold:** How detailed personalization ("feel seen") can be before it feels intrusive is unclear. We rely on a small qualitative study【114†L77-L84】, but user diversity means more testing is needed.
- **Balance between transparency and simplicity:** Explaining algorithmic decisions vs keeping copy short is a tension. We advocate honesty about "who" decides, but exactly how much explanation users want in brief messages is an open question. Empirical user-research or A/B tests would help refine this balance.

Each recommendation is grounded in evidence where available【90†L540-L549】【91†L72-L80】【102†L232-L240】【114†L77-L84】, but real users should be tested with these phrasings to ensure they land as intended.
