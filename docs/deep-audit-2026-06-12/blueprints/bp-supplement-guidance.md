# Blueprint: Basic Supplement Guidance
**Deep audit 2026-06-12 — Research agent report**
**Topic:** Should Volyume include a basic supplement-guidance section, and if so what, where, and how?

---

## Verdict up front

**Build it — but build it small, once, and static.**

The evidence is clear enough, the founder's framing is rare enough in the market, and the trust signal is strong enough that a short supplement guide is worth having. The key insight: the anti-spend, evidence-only posture is itself the differentiator. Every other app either ignores supplements or nudges users toward them. A coach who tells you *what not to buy* is trustworthy in a category defined by hype. That said, the answer is one calm reference screen, not a feature — and there is a precise list of what goes in and what never does.

---

## 1. The evidence base

### 1.1 What clears the bar (for the general gym population)

**Creatine monohydrate — Tier 1, strongest evidence**

The single most evidence-supported ergogenic supplement in existence for resistance-training athletes. The International Society of Sports Nutrition (ISSN) position stand (2017, reaffirmed in principle repeatedly since) concluded it is "the most effective ergogenic nutritional supplement currently available to athletes in terms of increasing high-intensity exercise capacity and lean body mass during training." Over 680 peer-reviewed trials, >12,800 participants, dosages up to 30 g/day for up to 14 years: no clinically significant adverse events in otherwise healthy individuals.

Key facts for Volyume's copy:

- **Dose:** 3–5 g/day (0.1 g/kg). Daily maintenance, no loading phase required. Loading (20 g/day in four doses for 5–7 days) saturates muscles ~1 week faster but is identical in outcome at 28 days; the GI discomfort risk is higher. For most users: skip loading, just take it daily.
- **Who benefits:** Anyone doing resistance training or high-intensity sport. Meta-analyses consistently show ~5–15% improvement in high-intensity exercise capacity and meaningful lean mass gains in interventions ≥8–12 weeks.
- **Form:** Monohydrate only. Creatine HCl, buffered creatine, creatine nitrate — all tested head-to-head against monohydrate, none show superior outcomes. Monohydrate is also the cheapest form. A 500 g tub (≈100 days) typically costs £8–15 from a reputable UK retailer.
- **Water weight:** Creatine is osmotically active and draws water into muscle cells. Beginners typically gain 1–2 kg of intracellular water in the first 2–4 weeks. This is normal and expected; it will briefly affect the weight trend. Volyume should note this so users are not alarmed when the scale moves unexpectedly (relevant to the weight-trend coach logic already in the app — see impl-COMP-024-cycle-smoothing.md, which already cites creatine as a known weight-trend confounder).
- **Safety:** Long-term use at 3–5 g/day does not impair kidney function in healthy people. Claims about kidney damage are not supported by evidence. The ISSN explicitly states "there is no compelling scientific evidence that short- or long-term use of creatine monohydrate has any detrimental effects on otherwise healthy individuals."
- **Under-18 note (see §3):** The ISSN's 2017 position notes creatine is acceptable for adolescent athletes engaged in serious supervised training with adequate diet and guidance, and that manufacturer warnings against under-18 use are driven by liability rather than evidence. However, long-term data specifically in developing adolescents is virtually nonexistent. Volyume's copy should recommend adults consult a GP if under 18 — this is the cautious, defensible line.

Sources: ISSN 2017 position stand (PMC5469049); Lanhers et al. 2017 meta-analysis; Antonio & Ciccone 2013; Rawson & Volek 2003; Forbes et al. 2021 systematic review; Examine.com research breakdown.

---

**Caffeine — Tier 1 evidence, contextual use**

The ISSN's 2021 position stand (PMC7777221) confirms caffeine enhances aerobic endurance (moderate-to-large effects, most consistent), muscular endurance, sprinting, and in many subjects strength. Effect size is genuinely meaningful.

Key facts:

- **Dose:** 3–6 mg/kg body mass. For most gym-goers that is 200–400 mg, roughly 2–3 cups of coffee or one strong pre-workout. Higher doses do not add benefit and increase side effects (anxiety, insomnia, GI issues).
- **Timing:** 45–60 minutes pre-training for peak blood concentration.
- **Tolerance and habituation:** Daily use blunts the effect. The science-backed position is that cycling (e.g. avoiding caffeine on non-training days, or taking a 2-week break every few months) restores sensitivity. But for casual users, even habituated caffeine provides some benefit.
- **Practical point for Volyume:** Most users already consume caffeine. The guidance here is framing: a cup or two of coffee before training is legitimate performance nutrition; expensive pre-workout supplements contain the same caffeine plus marketing at 10× the cost.
- **Avoid for Volyume:** Fat-loss marketing of caffeine (e.g. "thermogenic" claims). Caffeine has a tiny acute metabolic effect; positioning it as a fat burner is prohibited under the founder's hard lines and is not supported as a primary mechanism anyway.

Source: ISSN 2021 caffeine position stand (PMC7777221, doi: 10.1186/s12970-020-00383-4).

---

**Vitamin D — Tier 1 for the UK specifically**

The Department of Health and Social Care recommends that all UK adults take 400 IU (10 µg) of vitamin D during autumn and winter. NICE extends this to year-round supplementation for adults at risk of deficiency. The UK is at latitude 51–58°N; from October to March, UVB is too weak for meaningful cutaneous synthesis. Vitamin D deficiency in the UK is extremely common, including among physically active people.

Key facts:

- **Why it matters for gym-goers:** Vitamin D receptors exist in skeletal muscle; deficiency is associated with reduced muscle strength and function, higher injury risk, and impaired recovery. It is also essential for calcium absorption and bone health.
- **Dose:** 400 IU (10 µg) daily is the DHSC universal recommendation. For most people aiming for optimal athletic performance, 1,000–2,000 IU (25–50 µg) daily throughout the year is a widely recommended practical target, well within the safe upper limit (4,000 IU/day per NHS guidance). Cost: pennies per day.
- **UK specific:** This is genuinely more important in the UK than in most markets. Framing it as "the UK one most people actually need" is accurate and useful.
- **Not a performance supplement in the ergogenic sense** — it restores a baseline that most UK gym-goers are below, rather than taking performance above a well-nourished baseline.

Sources: DHSC recommendation (Public Health England 2016, reaffirmed 2024); NHS vitamin D guidance; multiple IDs of NHS regional formulary PDFs.

---

**Omega-3 (EPA/DHA) — Tier 2, general health rationale**

The evidence on omega-3 for muscle-specific outcomes in healthy young adults is genuinely mixed. A 2024 systematic review and meta-analysis (Therdyothin et al., Nutrition Reviews, PMC11723138) found equivocal results on muscle protein synthesis in healthy adults, with more consistent benefits in older adults (≥50) and clinical/inflammatory populations.

Where the evidence is stronger:
- Reduces exercise-induced muscle damage and DOMS (particularly relevant for competitors in high-volume phases)
- General cardiovascular health (well-established)
- Joint health and inflammation modulation

Verdict for Volyume: include as a general health note for both audiences, but frame it honestly — "the evidence is mixed for muscle building specifically, but consistent for general health and recovery." Cost: £5–10/month for a quality fish oil.

Sources: Therdyothin et al. 2024 (Nutrition Reviews); OCL journal 2024 dietary omega-3 review; GSSI athlete review.

---

**Protein powder (as a food, not a supplement) — Tier 1 framing issue**

The evidence for adequate protein intake (1.6–2.2 g/kg/day) for resistance-training individuals is extremely robust (ISSN position stand on protein, Stokes et al. 2018 meta-analysis). Protein powder is simply a food source — whey, casein, pea, rice protein are concentrated dietary protein, not a pharmacological supplement. The 2024 JISSN paper on protein misconceptions (Tandfonline 2024) emphasises that "there is no scientific basis for treating protein powder differently from protein foods such as chicken, milk, or eggs."

Key guidance for Volyume:

- Protein powder is useful if — and only if — a user struggles to hit their daily protein target from whole foods alone. It is a convenience food, not a magic ingredient.
- No performance benefit above adequate total protein. If targets are being met from whole food, powder adds nothing.
- Beginner framing: "If hitting your protein target each day is hard, a protein shake is just food in powder form — it is not special."
- Practical point: whey protein is the cheapest gram-for-gram protein source available in the UK, cheaper than most meats. This supports the anti-spend framing: it may actually save money compared to hitting protein targets with expensive whole foods.

---

**Electrolytes — Tier 2, conditional**

For most gym-goers doing 1-hour resistance sessions, electrolytes are not needed as a supplement. Sweat losses during moderate gym training are adequately replaced by a balanced diet and water.

Electrolyte supplementation becomes relevant for: training sessions >90 minutes, training in heat, high-sweat-rate individuals, and athletes on very low-sodium diets.

Volyume's guidance: water is enough for most sessions; electrolyte products are relevant for endurance and extended competition-prep training. The founder's old-coach spreadsheet listed "EAA/creatine/glutamine" as intra-workout — the EAA component there was probably functioning partly as a flavoured electrolyte-type product (common in 2015–era bodybuilding). Volyume need not replicate this framing.

---

### 1.2 What does NOT clear the bar

This is the most important section for the anti-spend positioning.

**Glutamine — does not clear the bar for gym population**

The founder's old coach embedded EAA/creatine/glutamine as a standard intra-workout item. This was a common 2010s-era coaching practice. The evidence does not support it.

A 2018 systematic review and meta-analysis (Gleeson et al., PubMed 29784526, Clinical Nutrition) across 47 studies found that glutamine supplementation has **no effect on athletic immune function, aerobic performance, or body composition** in the general athletic population. The body synthesises glutamine endogenously in sufficient quantities; supplementing it in healthy individuals on adequate total protein does not raise muscle glutamine above saturated levels. The only evidence of benefit is in clinical populations (ICU patients, severe burns, gut-barrier dysfunction) — not gym-goers.

The verdict: glutamine in an intra-workout shake for a gym-goer is wasted money. It tastes bad, it is expensive, and the founder's old coach was wrong on this one. Volyume should explicitly name it in the "save your money" list as one of the highest-profile overhyped supplements — this is exactly the kind of honest guidance that builds trust.

Sources: PubMed 29784526 (Gleeson et al. 2018 meta-analysis); 3DMJ Podcast #249 on supplement risks; ISSN position stand on protein (which makes clear endogenous glutamine synthesis is more than adequate with protein-replete diets).

---

**BCAAs/EAAs alongside adequate protein — does not clear the bar**

BCAAs (leucine, isoleucine, valine) and EAA blends are among the best-selling gym supplements. The evidence for them in users who are already hitting adequate total protein is essentially nil.

The mechanistic argument for BCAAs (leucine triggers mTOR/protein synthesis) is real — but it is already fully activated by any complete protein meal. Adding BCAAs on top of a protein-replete diet is like adding a booster to an already full tank. A 25 g serving of whey protein already contains ~5.5 g of BCAAs and ~11 g of total EAAs. The 2024 Nutrition Reviews meta-analysis (Therdyothin) and multiple earlier analyses confirm: EAA supplementation shows benefit in older adults with anabolic resistance or inadequate total protein — not in healthy adults already at adequate intake.

Cost perspective: BCAA/EAA powders typically cost £25–40/kg of product, for ingredients that are already present in any protein-containing food. This is the classic high-margin supplement: expensive packaging of something redundant.

Volyume's line: "If your protein target is met, BCAAs and EAAs add nothing — you are paying supplement-industry prices for nutrition you already have."

---

**Test boosters — does not clear the bar, not PED-adjacent**

D-aspartic acid, tribulus terrestris, ashwagandha (sold as testosterone boosters) — the evidence is weak to absent for any meaningful testosterone increase in healthy adults with normal testosterone levels. Not PED-adjacent in the pharmaceutical sense, but the marketing language edges toward that territory. Volyume should not include these in any positive framing.

Note: ashwagandha has some evidence for stress/cortisol reduction and moderate evidence for strength gains in some trials, but the effect sizes are small and inconsistent. It does not belong in a tightly-curated minimal list.

---

**Fat burners, appetite suppressants, diuretics — NEVER**

These are explicitly prohibited under the founder's hard lines and the ED safety mandate. They are also unsupported, potentially harmful, and frequently contaminated with banned substances (see §2). Nothing to add except that the guidance screen should not name them at all — naming "banned categories" still directs user attention to them. Simply don't include.

---

**Greens powders — does not clear the bar as a supplement**

No robust evidence that greens powders provide meaningfully more benefit than eating vegetables. The framing that "this replaces vegetables" is not supported. If users are eating an adequate diet, redundant. If they are not eating vegetables, the answer is eating vegetables, not a powder. Volyume should not include greens powders in any list, positive or negative — they are irrelevant to the physique-coaching context.

---

**Pre-workout blends — mixed evidence, unnecessary**

Pre-workouts are largely caffeine (with evidence), beta-alanine (modest evidence for muscular endurance in longer sets, causes harmless tingling, not a priority), citrulline malate (some evidence for endurance performance, modest), plus marketing ingredients. The message for Volyume: a coffee achieves most of what a £40 tub of pre-workout achieves, at a fraction of the cost. Not worth a dedicated positive entry.

---

## 2. Drug-tested athlete needs (Eddie)

Eddie the Elite may be competing in federations with anti-doping programs (WADA, UKAD, NFBB, WBFF with drug testing, natural federations such as BNBF, INBA/PNBA, or IPF/IPL in powerlifting).

**The contamination problem is real and quantified.** Research cited by the International Testing Agency and UK Anti-Doping shows up to 1 in 10 supplements on the general market are contaminated with a substance prohibited by WADA. Contamination can occur through cross-contamination in manufacturing facilities that also handle pharmaceutical or other supplement compounds. A 2005–2022 study by the Anti-Doping Knowledge Centre found product contamination responsible for 8% of all anti-doping violations.

**Under WADA's strict liability rule, athletes bear full responsibility for what they ingest.** The athlete cannot claim ignorance of a contaminated product as a complete defence — only as mitigation (Article 10.6.1.2 of the WADA Code allows sanction reduction if contamination is demonstrated, but a ban still typically occurs).

**Informed Sport** is the leading batch-testing programme for UK athletes. Developed in 2008 with UK Anti-Doping support, it requires every single batch of a certified product to be tested before market release. The programme is now global. Informed Choice is an earlier version; Informed Sport is the stricter, higher standard for competitive athletes.

**Volyume's guidance for Eddie:**
- If drug-tested: use only Informed Sport-certified products. Every supplement, every batch.
- The certification does not guarantee safety (no programme can test every banned compound) but substantially reduces risk.
- Creatine monohydrate from an Informed Sport-certified supplier is the lowest-risk, highest-evidence approach for tested athletes.
- Sources for checking certification: sport.wetestyoutrust.com (Informed Sport product database).

This guidance is specific, useful, actionable, and available nowhere else in the app. It is a genuine service to the Eddie persona.

Sources: wetestyoutrust.com (Informed Sport programme overview, FAQ); International Testing Agency athlete hub; WADA Code Article 10.6.1.2.

---

## 3. Age considerations (under-18)

The app holds age data on the Pro path only. Free-tier users who have not completed Pro onboarding may be under 18 without the app knowing.

**The evidence on creatine and under-18s:** The ISSN's 2017 position states creatine is acceptable for adolescents (16+) engaged in serious, supervised training with a balanced diet and appropriate guidance. A 2023 systematic review (13 studies, 268 participants aged 11–18) found no consistent performance effects and no safety signals, but also acknowledged that long-term data on growth, bone development, and organ systems in adolescents is "virtually nonexistent." Manufacturer under-18 warnings are driven by legal liability rather than documented harm.

**Volyume's safe line:** The supplement guidance screen should include a brief note: "If you are under 18, check with your GP before taking any supplement." This is the same posture as any responsible health publication. It does not prohibit anything — the evidence does not clearly prohibit creatine for teenagers — but it is the defensible, responsible position.

**ED flag behaviour (see §6):** Under the ED safety system, if a user is flagged, the supplement section should either be suppressed entirely or stripped of any framing that could reinforce restriction behaviours. Vitamin D and creatine are safe to show (no caloric content, no weight-loss framing); any text around protein targets should be reviewed in that context. The safest implementation: suppress the entire section for users with an active ED flag and show a note to speak with a registered dietitian instead.

---

## 4. How competitors and the market handle this

**RP Strength (Renaissance Periodization):** Publishes extensive supplement content — blog posts, YouTube videos, "The Creatine Handbook." Their approach is evidence-led and they positively recommend creatine monohydrate (3–5 g/day), fish oil, and protein powder. They also publish "most overrated supplements" content (2025 video). The tone is credible and matches their science-based positioning. However, RP does sell supplements and has commercial interests. This is the key difference: Volyume has no product to sell.

**MacroFactor:** Deliberately abstains from supplement guidance entirely. The app focuses exclusively on nutrition tracking and macro targets. Users report this as a feature (clean, focused product) not a gap. The argument for abstention is that it keeps the product sharp. However, MacroFactor's abstention is also commercially convenient — they have nothing to gain from guiding users away from spending. Volyume's anti-spend framing is a different proposition.

**3DMJ (3D Muscle Journey):** The gold standard for natural bodybuilding coaching ethics on supplements. They waited until episode 86 of their podcast before covering supplements at all, to convey how minor a role they play. Their framework: protect your wallet, protect your health, expect very little. They reference Examine.com as the credible third-party source. Their ethos maps exactly onto what the founder described.

**Examine.com:** The most trusted third-party supplement database in evidence-based fitness. No products sold, no affiliates. Grades supplements by evidence level per outcome (e.g. creatine: A-grade for lean mass in resistance-trained adults). This is the kind of source Volyume should cite or reference if the founder wants a "read more" link.

**What apps get praised for:** Honest "skip this" guidance. Users frequently cite trust when an app tells them what not to buy, especially when it costs the app nothing and saves the user money. The absence of affiliate links is worth stating explicitly in the UI — it is a differentiator.

**What apps get criticised for:** Any supplement section that becomes a revenue pathway. Even the appearance of affiliate-driven recommendations destroys trust rapidly. The fitness affiliate space has numerous examples of backlash (the Louise Thompson detox incident being a widely-cited cautionary case). The founder's instinct to have no affiliates is commercially suboptimal but trust-maximising — and trust is the long-term moat.

**UK regulatory context:** Health claims in the UK are governed by the Great Britain Nutrition and Health Claims (NHC) Register (post-Brexit successor to EC 1924/2006). Only authorised health claims are permissible. Volyume is not selling supplements and the guidance screen is not labelling or advertising a product, so the health claims regulation does not directly apply to in-app educational content. However, the posture should match the spirit of the regulation: accurate, factual, not exaggerated, not disease-preventive claims. The existing CoachOutput disclaimer model ("This is not medical advice. Volyume's coaching is informational, not a substitute for medical or clinical advice.") covers the supplement screen by extension, but a brief inline disclaimer is advisable. ASA CAP Code Section 15 covers food and supplement advertising claims — again, Volyume is not advertising a product, but the accuracy standard should be at least as rigorous.

---

## 5. The "save your money" framing — evidence

The UK dietary supplements market was valued at approximately USD 4.79 billion in 2024 (GrandView Research), growing at ~8% CAGR. UK consumers spend significantly on supplements, many with minimal evidence. Research by Informed Sport's parent body indicates up to 10% of supplements on the open market are contaminated with prohibited substances; a far higher proportion contain ingredients with limited or no evidence for the claims made.

The 3DMJ framework (and Examine.com's grading system) both converge on the same conclusion: the vast majority of gym supplement spending is unnecessary. The evidence-backed short list (creatine monohydrate, vitamin D in the UK winter, protein powder if not hitting protein targets from food) is very short. Adding caffeine (which most users consume anyway) and fish oil (health, not performance) covers the credible territory.

Volyume's differentiated framing: "A coach with nothing to sell who tells you what NOT to buy." This is genuinely rare. It is the positioning equivalent of a financial advisor who only charges fees rather than taking commission — the independence is itself the value.

---

## 6. The recommendation: what to build

### Verdict: BUILD — one static, offline reference screen

**What to call it:** "Supplement basics" — calm, factual, no hype word in the title.

### 6.1 Content scope

**The short list (what passes the bar):**

| Supplement | Verdict | Who | Dose | Monthly cost (approx. UK) |
|---|---|---|---|---|
| Creatine monohydrate | Strong evidence | Both | 3–5 g/day, daily, no loading needed | £3–5 |
| Vitamin D (Oct–March) | Strong evidence, UK-specific | Both | 1,000–2,000 IU/day | £2–4 |
| Protein powder | Food, not supplement | Both, if struggling to hit targets | To fill the gap to protein target | £1–3/day |
| Caffeine (coffee) | Strong evidence | Both, optional | ~200 mg pre-training | £0–3 |
| Omega-3 / fish oil | General health evidence, mixed for muscle | Both, optional | 1–2 g EPA+DHA/day | £5–10 |

**Eddie-specific addition:**
- Batch-tested products only (Informed Sport logo) — link or note for any tested athlete.

**The "save your money" list (what doesn't pass):**

| Supplement | Verdict |
|---|---|
| Glutamine | No benefit for healthy athletes on adequate protein. Expensive. Skip it. |
| BCAAs / EAAs | No benefit over meeting your protein target. You are already paying for these in your food. |
| Pre-workout blends | The caffeine works. The rest is largely inert or irrelevant. Coffee is cheaper. |
| Test boosters | No meaningful evidence in healthy adults. |
| Greens powders | Eat the vegetables. |

**Never mentioned (not listed, not named, category excluded):**
- Fat burners
- Appetite suppressants
- Diuretics
- Anything PED-adjacent
- Protein/calorie-restricting supplements of any kind

### 6.2 Tone and voice (British English, Volyume style)

Calm, grounded, gently sardonic about industry hype. Anti-sell. No exclamation marks. No "power up your gains." No star ratings. The model is the NutritionEducationScreen already in the app — the same Section/KeyPoint/Body component structure can be reused almost directly.

**Example copy (intro):**

> "Supplements are a big industry. Most of it is noise. This page covers the short list of things that have genuine evidence behind them, and the longer list of things that don't — because knowing what to skip is worth as much as knowing what to take. We have nothing to sell you."

**Example copy (creatine):**

> "Creatine monohydrate is the most studied performance supplement in existence — over 680 clinical trials. The evidence is clear: 3–5 g a day increases high-intensity exercise capacity and supports lean muscle development when combined with training. It works by increasing the phosphocreatine available in muscle, which matters most for explosive efforts: heavy sets, sprints, anything where you're pushing hard for under 30 seconds.
>
> One thing to expect: in the first few weeks your weight will likely go up by 0.5–1.5 kg. That is water moving into your muscle cells — it is normal and is part of how creatine works. Your trend will settle. No loading phase is needed; just 3–5 g a day is fine.
>
> The cheapest form — monohydrate — is also the best-evidenced form. A 500 g tub from a reputable UK supplier typically costs £8–12 and lasts about three months."

**Example copy (glutamine — save your money):**

> "Glutamine. Your body makes it in quantities that already saturate your muscles when you're eating enough protein. The evidence for athletic benefit in healthy people is essentially nil. It was popular in bodybuilding coaching circles in the 2010s. It should have been dropped then. Skip it."

**Example copy (disclaimer footer):**

> "This page is general educational information, not medical advice. If you have a health condition, are pregnant, or are under 18, speak with your GP before taking any supplement."

### 6.3 Placement — ranked options

**Option A (Recommended): You tab — static education row, everyone**

Add a NavRow to YouScreen.js under the existing "How Precision Coaching works" row:

```
icon="leaf-outline"
label="Supplement basics"
sub="The short list of things with genuine evidence — and the longer list of things that don't."
onPress={() => navigation.navigate('SupplementBasics')}
```

This is the right placement for three reasons:
1. It mirrors the pattern of the Methodology screen (static trust content, available to everyone, not a Pro feature)
2. It is discoverable without being intrusive — users find it when exploring the You tab, not via push notification or pop-up
3. It is consistent with the existing NutritionEducationScreen model (linked from NutritionTargetsScreen, same component pattern)

**Free vs Pro:** FREE for everyone. This is educational content, not coaching functionality. A free user deciding whether to spend money on supplements benefits from this information as much as a Pro user. It reinforces Volyume's credibility as an honest guide, which is part of the conversion case for Pro. Gating it behind Pro would be a mistake — it signals commercial intent rather than trust.

**Option B (Secondary / additional entry point): Link from NutritionTargetsScreen**

NutritionEducationScreen is already linked from NutritionTargetsScreen as a "read before you fiddle with numbers" resource. A similar "See also: Supplement basics" link at the bottom of NutritionEducationScreen would reach Pro users in the nutrition onboarding flow. This is a low-effort secondary entry point, not a primary placement.

**Option C (Rejected): Meal plan line-items**

The founder's old coach listed EAA/creatine/glutamine as intra-workout meal-plan items. This is not recommended for Volyume because: (a) it validates supplement use as a meal-plan component rather than an optional addition, (b) it would require the app to track/log supplements as food items which creates false macros/calories, (c) it would make the guidance feel like a prescription rather than optional education, and (d) creatine has no caloric value and does not belong in a meal plan. The meal plan should be food only.

**Option D (Rejected): Recurring check-in prompt**

Any supplement check-in or recurring prompt would violate the "no spam" principle immediately. One reference screen is the answer.

### 6.4 Free vs Pro call

**Free tier: accessible to all.** No gating. Rationale: this is trust-building and educational content, not coaching functionality. Consistent with the existing Methodology screen pattern (also free). Eddie the Elite, who is most likely to be a paying Pro user, gets an additional note about Informed Sport batch testing — but the entire screen is free.

### 6.5 ED safety system behaviour

Under the ED safety system, if a user has an active ED-flag (from the WellbeingCheck or edPatternDetector):

- **Recommended behaviour:** Suppress the SupplementBasics NavRow from YouScreen entirely, or replace it with a compassionate signposting note directing the user to a registered dietitian.
- **Rationale:** Even though the content avoids fat burners and appetite suppressants, the ED safety ethos is to minimise any supplementary focus on body composition when a user is in a vulnerable state. A person navigating disordered eating patterns does not need to engage with supplement guidance, however well-intentioned.
- **Implementation:** Same suppression logic as the WellbeingCheck and GoalLock rows in YouScreen.js — conditional on `isPro && wellbeingFlagged` (or however the ED flag is surfaced in the store). If the age-data gap means the flag is not available for free users, the safe default is to show the screen but ensure the footer disclaimer is prominent.

### 6.6 Under-18 handling

Since the app holds age data only on the Pro path, the practical implementation is:
- For Pro users where `userProfile.age < 18` (or equivalent field): display a note at the top of the screen — "Some of the supplements below are studied mainly in adults. If you are under 18, check with your GP before starting anything new."
- For free users: the footer disclaimer ("If you are under 18, speak with your GP") covers this adequately without requiring age data.

### 6.7 Informed Sport / Eddie integration

For Pro users where the profile indicates a tested federation (if/when that data is held): surface a highlighted callout at the top of the screen:

> "Competing in a drug-tested federation? Use only Informed Sport-certified products. Look for the Informed Sport logo on the batch. This applies to creatine, protein powder, and anything else you take. You can check certified products at sport.wetestyoutrust.com."

If no federation data is available, this can be a collapsible section ("Competing in a tested federation?") or a generic note — but it should be there for Eddie.

---

## 7. What NEVER to include (hard lines)

To be stated clearly in any implementation ticket:

1. No affiliate links. No product links of any kind. No brand names in positive recommendations.
2. No fat burners, appetite suppressants, diuretics, or any supplement marketed primarily for weight loss.
3. No PED-adjacent content of any kind — not even educational framing about what they are.
4. No "coming soon" placeholders for supplement products, store integrations, or partnerships.
5. No recurring prompts, push notifications, or nudges about supplements.
6. No per-supplement "buy" buttons, external shop links, or partner codes — even unpaid.
7. No calorie-counting of supplements in the food diary.
8. No claims about disease prevention, treatment, or cure.
9. No language quantifying promised physique improvements from supplements ("gain X lbs of muscle with creatine").
10. Under active ED flag: suppress the screen entirely.

---

## 8. Implementation summary

| Item | Detail |
|---|---|
| Screen name | `SupplementBasicsScreen` |
| Route name | `SupplementBasics` |
| Component pattern | Reuse `NutritionEducationScreen.js` Section/KeyPoint/Body building blocks exactly |
| Navigation entry | `YouScreen.js` — NavRow under "How Precision Coaching works" |
| Secondary entry | Bottom of `NutritionEducationScreen.js` ("See also") |
| Pro/Free | Free for all |
| ED flag | Suppress NavRow (and screen) when ED flag active |
| Under-18 (Pro) | Conditional note at screen top |
| Eddie (tested) | Informed Sport callout — collapsible or conditional on federation data |
| Offline | Fully static, no network dependency |
| Disclaimer | Footer on screen; reuse CoachOutput disclaimer pattern |
| Effort | Low-medium. Static screen, no data dependencies, existing component patterns. ~0.5–1 sprint |

---

## 9. Prior audit note

The June 2026-06-10 competitive audit (42 agents) produced no supplement-related findings or implementations. This blueprint covers new territory entirely. The COMP-024-cycle-smoothing implementation brief already acknowledges creatine as a weight-trend confounder — the supplement screen should link back to that awareness (i.e. tell users creatine will move the scale temporarily, and that Volyume's trend engine already accounts for exactly this kind of noise). This cross-link strengthens both the supplement guidance and the methodology trust content.

---

## Sources

- ISSN 2017 creatine position stand: https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/
- ISSN 2021 caffeine position stand: https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/
- Glutamine meta-analysis (Gleeson et al. 2018): https://pubmed.ncbi.nlm.nih.gov/29784526/
- Omega-3 and protein synthesis systematic review (Therdyothin et al. 2024): https://pmc.ncbi.nlm.nih.gov/articles/PMC11723138/
- Creatine common questions and misconceptions (PMC 2021): https://pmc.ncbi.nlm.nih.gov/articles/PMC7871530/
- Creatine safety in adolescents (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC6279854/
- Informed Sport programme: https://sport.wetestyoutrust.com/
- International Testing Agency — supplements: https://ita.sport/athlete-hub/supplements/
- NHS / DHSC vitamin D guidance: https://britishvita.co.uk/blogs/blogs/vitamin-d-in-the-uk-nhs-winter-supplement-guide
- UK ASA CAP Code Section 15 (food and supplement health claims): https://www.asa.org.uk/type/non_broadcast/code_section/15.html
- UK GB NHC Register guidance: https://www.gov.uk/government/publications/nutrition-and-health-claims-guidance-to-compliance-with-regulation-ec-1924-2006
- Examine.com creatine research breakdown: https://examine.com/supplements/creatine/research/
- RP Strength creatine handbook: https://rpstrength.com/expert-advice/everything-you-need-to-know-about-creatine
- 3DMJ podcast #249 (supplement hidden risks): https://www.youtube.com/watch?v=0dxRo582uhM
- 3DMJ podcast #86 (supplements overview): https://3dmusclejourney.com/podcast/86/
- Protein supplementation evidence (PMC 2018): https://pmc.ncbi.nlm.nih.gov/articles/PMC6142015/
