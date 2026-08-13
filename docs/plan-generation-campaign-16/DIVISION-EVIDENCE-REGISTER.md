# Division shape and exercise intelligence: evidence register

Compiled 2026-08-13 for the founder addition "DIVISION-SPECIFIC SHAPE &
EXERCISE INTELLIGENCE". Research first, as ordered: every rule in
`src/lib/division/profile.js` traces to a line in this file, and every line
here traces to a primary source that was read, not summarised.

Two independent bodies of evidence are needed, and they answer different
questions:

1. **What is judged** — the current NPC / IFBB Pro League criteria. This
   decides which muscles a division emphasises and which it deliberately
   does not. It is a rulebook, not a science claim.
2. **Whether exercise selection can act on that** — peer-reviewed evidence
   that *which* exercise you choose changes *where* a muscle grows. Without
   this, division-specific exercise selection would be decoration.

---

## 1. Judging criteria (primary sources)

All quotes verbatim. NPC News Online is the official website of the
National Physique Committee and NPC Worldwide; ifbbproofficial.com is the
IFBB Pro League's own category page.

### 1.1 The shared female criteria

Source: NPC News Online, "NPC AND IFBB PRO LEAGUE CRITERIA FOR JUDGING
FEMALE PHYSIQUES"
<https://npcnewsonline.com/npc-news-online-update-npc-and-ifbb-pro-league-criteria-for-judging-female-physiques/459427/>

> Criteria for Judging Female Physiques:
> Muscularity – the amount of muscle will vary between the divisions
> Condition- will vary depending on the division
> Symmetry and Balance
> Presentation (Posing)

**Reading.** Muscularity is division-scaled, not division-independent.
Symmetry and balance are judged in every female division, which is why no
division profile may drive any muscle to zero.

### 1.2 Bikini

Same source, and <https://npcnewsonline.com/bikini-rules/>

> Bikini athletes should display-
> A foundation of muscle which gives shape to the female body
> **Full round glutes with a slight separation between the hamstring and glute area**
> Small amount of roundness in the delts
> Conditioned Core
>
> Bikini athletes should NOT display –
> Muscular density seen in a figure physique
> **Squared glutes**
> Muscle separation seen in figure competitors
> Graininess
> Striations anywhere

**Reading.**
- Glutes are the division's named criterion, and the shape word is
  *round*, with the glute-hamstring tie-in explicitly judged. That is hip
  extension and the glute-ham junction, not squat volume.
- "Squared glutes" is a named FAULT. Upper-glute/medius shaping and the
  tie-in are what is wanted; blocky mass is not.
- "Muscular density seen in a figure physique" is a fault, so upper-body
  and quad volume are capped rather than maximised.
- Judged front and back only (contest format, same page), which is why
  waist-thickening work is against the judged outcome.

### 1.3 Figure

Same source.

> Figure athletes should display-
> **An overall balance of muscular development which includes rounded delts, sweep to the quads, back depth, and width – emphasis is on balance and symmetry**
> Small amount of muscle separation
> **A nice "V" taper**
> Tight glutes with separation between the hamstring and glute area
> Balance between the upper and lower body
>
> Figure athletes should NOT display-
> Striations or graininess
> Muscularity thickness associated with Women's Physique

**Reading.** This is the most explicit criteria line in the whole
rulebook, and it names four *within-muscle* targets at once: rounded
delts, **quad sweep**, **back depth**, and **back width**. Back therefore
needs BOTH a vertical-pull role and a row role — depth and width are
different roles of the same muscle. Quads need the sweep role.

> **Gap this closed.** Volyume's division bias table gave Figure
> `{ chest: incline, back: vertical_pull }` and nothing for quads, so the
> one division whose criteria name quad sweep in writing was the division
> not getting it. Recorded here because the research found it, not the code.

### 1.4 Women's Physique

Same source.

> Women's Physique athletes should display-
> More muscular density than seen in figure
> Clear muscle separation – small amount of striations is acceptable
> Emphasis is on muscular development with full muscle bellies
> **Muscular development should be balanced between upper and lower body**
>
> Women's Physique athletes should NOT display –
> An overly striated physique
> Graininess associated with female bodybuilding

**Reading.** Balanced upper/lower is stated as a criterion, so this
division must not be built as an upper-body plan with legs attached.

### 1.5 Wellness

Source: IFBB Pro League, Categories — Women's Wellness
<https://ifbbproofficial.com/categories/>

> The assessment should take the whole physique into account. The
> assessment, beginning with a general impression of the physique, should
> take into consideration the hair, **the overall body development and
> shape which should have more muscle size in the lower body than in the
> upper body.**
>
> The body parts should have a nice and firm appearance with a decreased
> amount of body fat, similar to those presented by bikini athletes, but
> **slightly more development in the upper body and a bigger lower body
> than in Bikini**. The physique should not be excessively muscular and
> should be free from excessive muscle separation and any striations.
> **Physiques that are considered too muscular or too hard must be marked
> down.**

**Reading.** Wellness is defined RELATIVE to Bikini in the rulebook
itself: bigger lower body, slightly more upper body. Quads are part of
the judged lower body here in a way they are not in Bikini. The
"marked down" clause is a real ceiling, not a style note.

> NPC News Online's Wellness page reproduces the Bikini criteria bullets
> verbatim under a Wellness heading
> (<https://npcnewsonline.com/wellness/>). The IFBB Pro League category
> text above is used instead because it is the one that actually
> distinguishes the division. Recorded so nobody "corrects" this later
> from the NPC page.

### 1.6 Women's Bodybuilding

Source: IFBB Pro League, Categories <https://ifbbproofficial.com/categories/>;
NPC contest format <https://npcnewsonline.com/official-npc-womens-bodybuilding-division/>

> Competitors are expected to present the overall athletic development of
> the musculature but also **balanced and symmetrical development of all
> muscle groups** as well their sport condition and quality, **with
> visible separation between them.**
>
> Judges shall score competitors according to the "total package", which
> is a balance of size, symmetry, and muscularity.

**Reading.** Everything is judged. There is no de-emphasised muscle, and
both roles of a two-role muscle are wanted.

### 1.7 Men's Physique

Source: NPC News Online, Official NPC Men's Physique Division
<https://npcnewsonline.com/official-npc-mens-physique-division/>

> **Judges will be looking for fit competitors who display proper shape
> and symmetry combined with muscularity and overall condition. This is
> not a bodybuilding contest so extreme muscularity will be marked down.**
>
> The competitor's number must be securely attached to either side of the
> **board shorts** at Judging and Finals.
>
> The head judge shall call the competitors ... to perform the **front and
> back turns.**

**Reading.** Board shorts and front/back turns together mean the legs are
not presented to the judges. That is a rulebook fact, not an opinion, and
it is the entire basis for training legs to a maintenance standard in
this division. "Extreme muscularity will be marked down" is an explicit
ceiling.

### 1.8 Classic Physique

Source: NPC News Online, Official Classic Physique Rules
<https://npcnewsonline.com/classic-physique/>; IFBB Pro League Categories.

> Judges shall score competitors according to the **"total package", which
> is a balance of size, symmetry, and muscularity.**
>
> (Mandatory poses include) **Favorite Classic Pose (no Most Muscular)**
>
> In the Classic Physique division, **the inability of properly performing
> the vacuum pose should relegate the athlete to the last place** as well.
>
> ... looking for **muscular bulk, balanced development, symmetry and
> definition.**

**Reading.** Legs ARE presented (trunks, no footwear, quarter turns), so
they are judged. The vacuum requirement and the explicit exclusion of Most
Muscular are waist-and-line criteria: this is a proportion division, and
the classic-pose set displays calves and quad sweep directly.

### 1.9 Bodybuilding (Men's Open)

Source: NPC News Online, Official Bodybuilding Rules
<https://npcnewsonline.com/official-bodybuilding-rules/>

> Judges shall score competitors according to the **"total package", which
> is a balance of size, symmetry, and muscularity.**
>
> (Mandatory poses include) **Most Muscular**

**Reading.** Every muscle group is judged from every angle. No
de-emphasis, both roles of every two-role muscle, and the highest overall
volume the athlete can recover from.

### 1.10 General (not competing)

No judging criteria exist, and none may be invented. The General profile
is deliberately empty of emphasis: balanced development, the engine's own
landmarks, no division roles beyond the structural coverage every plan
gets. This is the profile most Volyume users receive.

---

## 2. Does exercise selection actually change shape?

The judging criteria above are worthless to a training app unless *which
exercise you pick* changes *where the muscle grows*. Three primary sources,
read in full via PubMed:

### 2.1 PMID 34743671 — exercise selection drives regional hypertrophy

Zabaleta-Korta A, Fernández-Peña E, Torres-Unda J, Garbisu-Hualde A,
Santos-Concejero J. "The role of exercise selection in regional Muscle
Hypertrophy: A randomized controlled trial." *J Sports Sci*
2021;39(20):2298-2304. doi:10.1080/02640414.2021.1929736

> Two randomly allocated groups **with equal training volume and
> intensity** performed squats in the smith machine (SMTH group) or the leg
> extension exercise (LEG group) ... the three regions of RF grew
> significantly in the participants of the LEG group (p < 0.05), while
> **only the central region of VL** grew significantly in the SMTH group
> (p < 0.05). In summary, this study confirms that **exercise selection
> plays a role in regional hypertrophy.**

**Load-bearing point:** volume was EQUAL. The difference came from
selection alone. This is the licence for within-muscle roles: a set is not
a set when shape is the goal.

### 2.2 PMID 41379528 — the same result, larger, in women, with the sweep named

Kassiano W, Costa B, Kunevaliki G, Lisboa F, Prado A, Alves L, Tricoli I,
Stavinski N, Francsuel J, Cyrino ES. "Comparison of Muscle Hypertrophy and
Strength Adaptations Induced by Back Squat and Leg Extension Resistance
Exercises." *J Strength Cond Res* 2026;40(4):367-376.
doi:10.1519/JSC.0000000000005338

> Sixty-three untrained young women ... **The LE experienced greater
> increases in the 3 RF sites** (proximal: +11.4% vs. +2.0%; middle:
> +12.3% vs. +5.7%; distal: 17.5% vs. +7.9%; all p < 0.001). Conversely,
> **the SQ showed greater increases in VL at the distal site** (+18.2% vs.
> +11.2%; p < 0.001) ... the leg extension induce greater rectus femoris
> hypertrophy, while **the back squat promotes greater vastus lateralis
> hypertrophy, particularly at the distal site.**

**Load-bearing point:** the vastus lateralis IS the outer sweep, and the
distal VL is the part the sweep is read from on stage. A division judged on
"sweep to the quads" (Figure, verbatim, §1.3) therefore needs the
squat/press role, and a division wanting overall quad development needs
both roles. This is the strongest single link in the register between a
judging criterion and an exercise choice.

### 2.3 PMID 35438660 — variation must be systematic, not random

Kassiano W, Nunes JP, Costa B, Ribeiro AS, Schoenfeld BJ, Cyrino ES. "Does
Varying Resistance Exercises Promote Superior Muscle Hypertrophy and
Strength Gains? A Systematic Review." *J Strength Cond Res*
2022;36(6):1753-1762. doi:10.1519/JSC.0000000000004258

> Some degree of **systematic variation seems to enhance regional
> hypertrophic adaptations** and maximize dynamic strength, whereas
> **excessive, random variation may compromise muscular gains.** We
> conclude that exercise variation should be approached **systematically
> with a focus on applied anatomical and biomechanical constructs**; on the
> contrary, employing different exercises that provide a **redundant
> stimulus**, as well as **excessive rotation** of different exercises
> (i.e., high frequency of change), may actually hinder muscular
> adaptations.

**Load-bearing point:** this is the sentence that makes ROLES the durable
unit and the EXERCISE the changeable one. Rotating exercises within a role
is systematic variation on an anatomical construct. Rotating the role away
is either redundancy (two exercises doing the same job) or churn (the
change frequency the review warns about). It is also the evidence basis for
the rule the founder wrote independently: personal evidence may pick the
exercise for a role, but must not erase the role.

---

## 3. What the register decides

| Decision | Traces to |
|---|---|
| Nine profiles, one model, no division without a profile | §1.1-§1.10 |
| No division drives a muscle to zero | §1.1 symmetry and balance, judged in every division |
| Within-muscle roles exist at all | §2.1, §2.2 |
| Roles are durable, exercises rotate inside them | §2.3 |
| Personal evidence picks the exercise, never removes the role | §2.3 |
| Bikini: glutes and the glute-ham tie-in, round not squared | §1.2 |
| Bikini: no waist-thickening back work | §1.2 front and back only, no figure density |
| Figure: back depth AND width, quad sweep | §1.3 verbatim |
| Wellness: lower body larger than upper, quads judged | §1.5 verbatim |
| Women's Physique: balanced upper and lower | §1.4 verbatim |
| Men's Physique: legs to maintenance, not zero | §1.7 board shorts, §1.1 balance |
| Classic Physique: legs judged, waist and line protected | §1.8 |
| Bodybuilding / Women's Bodybuilding: everything judged, both roles | §1.6, §1.9 |
| General: no emphasis invented | §1.10 |

## 4. What this register does NOT claim

- No claim that any division's criteria are a health target. Volyume's
  ED-safety floors, the FFM floor and the calm-mode rules are unchanged by
  every line above and take precedence over every one of them.
- No claim that a judging criterion implies an optimal set count. The
  landmarks stay the engine's; divisions only distribute inside them.
- No claim about drug use, contest timing, or peak week. Out of scope.
- No claim that these criteria are stable. They are a rulebook and change.
  Each profile carries its source so a future check has somewhere to start.
