# VOLYUME — FINAL GAP-CLOSURE WORKSTREAM
## Comprehensive Disability, Long-Term Condition, Injury & Movement-Path Intelligence

STARTING POINT

Current main: `1259a9f`

CC25–CC32 have landed and the automated gate is green.

However, DO NOT treat the phrase “code-side complete” as proof that the ORIGINAL disability/injury product brief has been fully delivered.

This workstream exists because the founder has explicitly challenged whether the implementation stopped at a generic capability engine and a small number of capability-led routines instead of delivering the COMPLETE product originally requested.

The original binding sources remain:

- `Volyume_Campaign_25_Fable_Kickoff_Prompt.md`
- `Volyume_Campaign_25_Disability_Completeness_Amendment.md`
- `docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md`
- `DECISION-REGISTER.md`
- `ROADMAP-CC26-PLUS.md`
- all CC26–CC32 implementation records

The live repository remains authoritative for what ACTUALLY exists.

The founder’s current instruction is:

> We do not have a panel of real disabled users available to test this now. Do not use that as an excuse to stop short. Investigate the subject exhaustively using authoritative research, disability organisations, adaptive-sport resources, clinical/sports-science guidance, lived-experience sources and the current market, then integrate everything the product can responsibly and deterministically support. Be honest about what is not user-tested, but do not leave major product coverage unbuilt merely because direct user testing is unavailable.

This is NOT permission to make medical claims or invent rehabilitation protocols.

It IS a requirement to make Volyume as comprehensive, evidence-informed, inclusive and mechanically integrated as the available evidence allows.

1. THE QUESTION THIS WORKSTREAM MUST ANSWER

Can Volyume truthfully say that it has done the serious work required to support:

- a very broad range of physical disabilities;
- neurological disabilities and long-term conditions;
- limb difference / amputation;
- wheelchair/seated users;
- permanent asymmetry;
- grip/dexterity limitations;
- restricted standing/floor access;
- chronic/fluctuating capability;
- sensory accessibility needs;
- cognitive/learning accessibility needs where app interaction is affected;
- long-standing physical restrictions;
- specific temporary injuries;
- recurrent injuries/flares;
- user-reported clinician restrictions;
- highly adapted/custom training methods;
- serious intermediate/advanced disabled strength and hypertrophy trainees;

WITHOUT merely saying:

“Tell us what movements you cannot do and we will filter exercises.”

The capability engine is necessary.

It is NOT automatically sufficient.

2. HARD TRUTH-FIRST REQUIREMENT

First perform a REQUIREMENTS-TRACEABILITY REVIEW of the ORIGINAL binding disability amendment against the LIVE implementation.

Do not accept previous completion summaries as evidence.

For every binding requirement in the amendment, classify:

- FULLY IMPLEMENTED
- PARTIALLY IMPLEMENTED
- ARCHITECTURE ONLY
- CONTENT NOT BUILT
- VALIDATION NOT DONE
- DEFERRED
- REJECTED WITH VALID REASON
- MISSED / GAP

At minimum trace all requirements covering:

- free capability-aware support;
- routine library;
- broad disability coverage;
- evidence-informed population routines/guidance;
- evidence dossiers;
- coverage registry;
- builder;
- exercise library coverage;
- routine quality;
- exercise instructions/demonstrations;
- app accessibility;
- population/condition coverage;
- specific injury handling;
- temporary injury lifecycle;
- movement-demand modelling;
- clinical boundary;
- marketing/readiness.

Produce:
`ORIGINAL-SPEC-TRACEABILITY.md`

Do this BEFORE deciding that another implementation is or is not required.

3. EXPECTED GAP — POPULATION / CONDITION KNOWLEDGE LAYER

The original specification explicitly required TWO complementary layers:

LAYER 1:
Capability-led routines and programming.

LAYER 2:
Evidence-informed population/condition routines and guidance where the evidence supports it.

The current implementation appears to have delivered Layer 1 strongly.

Prove whether Layer 2 actually exists.

A ten-routine capability collection is NOT the same thing as a comprehensive population/condition knowledge system.

If Layer 2 is incomplete, build it.

4. BUILD A VERSIONED DISABILITY / CONDITION COVERAGE DIRECTORY

Create a structured, versioned internal coverage registry for relevant disability, impairment and long-term-condition populations.

Do NOT build this from an arbitrary hand-written list.

Research a broad taxonomy using authoritative sources and disability/sport organisations.

The directory must be extensible and must include an explicit OTHER / NOT LISTED path.

Research broad classes such as:

- spinal cord injury;
- wheelchair use from varied causes;
- upper-limb loss / limb difference;
- lower-limb loss / limb difference;
- bilateral limb difference;
- cerebral palsy;
- multiple sclerosis;
- Parkinson’s;
- stroke-related long-term impairment/asymmetry;
- acquired brain injury where training implications are relevant;
- muscular dystrophy / neuromuscular conditions where strength-training guidance exists;
- spina bifida;
- dwarfism / short stature where setup/equipment materially differs;
- arthritis / long-term joint restrictions;
- hypermobility / connective-tissue disorders where strength-training guidance can responsibly inform product questions;
- chronic mobility restrictions;
- permanent balance/stability impairment;
- grip/hand/dexterity impairment;
- visual impairment;
- hearing impairment;
- motor-control impairment;
- cognitive / learning disability where app delivery must adapt;
- other significant categories discovered by the research.

This list is a SEED, not an exhaustive answer.

Fable must research whether important categories are missing.

For each directory profile record:

- canonical name;
- aliases / user-facing terminology;
- type/category;
- whether it changes exercise programming, app accessibility, or both;
- common variability within the population;
- functional questions worth asking;
- movement/setup considerations;
- equipment/adaptation considerations;
- fatigue/recovery considerations where well supported;
- asymmetry/laterality considerations;
- accessibility considerations;
- evidence sources;
- what can be generalised;
- what MUST remain individual;
- what Volyume must NEVER infer automatically;
- what requires clinician/user confirmation;
- routine-family relevance;
- exercise-library requirements;
- current coverage;
- known gaps;
- marketing claim status;
- research review date/version.

Do NOT require the user to identify with a diagnosis.

The directory is a KNOWLEDGE/COVERAGE layer, not a compulsory medical intake.

5. FUNCTION-FIRST REMAINS PRODUCT LAW

Do NOT regress into:

DIAGNOSIS -> AUTOMATIC “SAFE EXERCISE” LIST.

The correct pattern remains:

OPTIONAL CONDITION / CONTEXT
+
USER-CONFIRMED FUNCTIONAL CAPABILITY
+
USER / CLINICIAN-REPORTED RESTRICTIONS
+
EXERCISE MOVEMENT DEMANDS
=
DETERMINISTIC ELIGIBILITY / QUESTIONS / EXPLANATION

A named condition may:

- select better questions;
- surface relevant setup considerations;
- point to suitable routine collections;
- explain why Volyume is asking something;
- expose evidence-informed cautions;
- alter UI/accessibility options;
- help the user communicate what applies to them.

A condition must NOT silently create movement bans unless an authoritative rule and product/legal boundary genuinely justify one.

Where individual variability is high, ask and confirm.

6. SPECIFIC INJURY DIRECTORY — THIS MUST BE SERIOUS

The founder specifically requires support for SPECIFIC INJURIES, not merely:

“Shoulder problem -> avoid whatever the user manually enters.”

Build an evidence-informed injury knowledge directory.

Research all major resistance-training-relevant injury/problem families by region.

At minimum investigate:

SHOULDER / SHOULDER GIRDLE
- rotator-cuff-related problems / tendinopathy;
- shoulder instability / dislocation history;
- AC-joint problems;
- labral/biceps-related shoulder considerations;
- frozen/stiff shoulder where relevant;
- other major training-relevant shoulder presentations.

ELBOW / FOREARM
- lateral elbow tendinopathy;
- medial elbow tendinopathy;
- distal/proximal biceps considerations where relevant;
- triceps tendon considerations;
- ligament/instability restrictions where relevant;
- forearm pronation/supination restrictions.

WRIST / HAND
- wrist flexion/extension intolerance;
- grip limitations;
- thumb/hand loading restrictions;
- post-fracture / clinician restrictions;
- other major lifting-relevant categories.

SPINE / TRUNK
- low-back pain/recurrent restriction;
- cervical restrictions;
- thoracic restrictions;
- axial-loading restriction;
- loaded flexion/extension/rotation restrictions;
- post-operative / clinician-directed restrictions.

HIP / GROIN
- hip ROM restrictions;
- adductor/groin issues;
- hip flexion/extension/loading restrictions;
- other major resistance-training-relevant categories.

KNEE
- patellofemoral pain;
- ACL/post-ACL restrictions where clinician-led;
- meniscal restrictions where relevant;
- patellar/quadriceps tendon considerations;
- knee-flexion-depth restrictions;
- impact / loaded-knee-flexion restrictions;
- other major common lifting-relevant categories.

ANKLE / FOOT
- ankle sprain / instability;
- Achilles tendinopathy;
- plantar/foot loading restrictions;
- dorsiflexion limitations;
- post-fracture / clinician restrictions;
- other common training-relevant categories.

MUSCLE / TENDON
- hamstring;
- quadriceps;
- calf;
- adductor;
- pec;
- biceps;
- triceps;
- other common lifting-related strains/tendon problems where evidence can support product questions.

POST-OPERATIVE / FRACTURE / ACUTE TRAUMA
These must remain strongly clinician-directed.
Volyume must not invent a return protocol.

This seed list is NOT exhaustive.

Research what is missing.

7. WHAT AN INJURY PROFILE IS ALLOWED TO DO

An injury profile is NOT a diagnosis engine.

It may contain:

- relevant movement-demand questions;
- commonly relevant positions/actions to ask about;
- body region / side;
- optional known diagnosis supplied by user;
- aggravating movement categories selected by user;
- clinician restrictions;
- equipment/support considerations;
- training-history context;
- relevant check-in questions;
- evidence-informed education;
- return/reintroduction considerations;
- red-flag / professional-review boundary where appropriate;
- source citations/version.

It may use a known injury to say:

“People with this issue can differ. Which of these movements have you been told to avoid or currently find problematic?”

It must NOT say:

“You have X, therefore bench press is unsafe.”

unless an explicit user/clinician restriction supplies that rule.

8. MOVEMENT-PATH INTELLIGENCE — AUDIT THE CURRENT TEN AXES

The existing exercise-demand ontology is good enough for broad compatibility.

Do NOT assume it is good enough for specific injury movement paths.

Audit whether it can deterministically represent the questions specific injury support actually requires.

Investigate whether the exercise model needs a richer MOVEMENT-PATH / JOINT-DEMAND representation such as:

- primary joint actions;
- loaded joint positions;
- range/depth requirement;
- overhead requirement;
- horizontal press/pull position;
- shoulder elevation/abduction/flexion demand;
- shoulder internal/external rotation demand where product-useful;
- elbow flexion/extension demand;
- forearm pronation/supination;
- wrist flexion/extension/loading;
- grip type/requirement;
- hip flexion/extension/abduction/adduction demand where useful;
- knee-flexion depth / knee-dominant demand;
- ankle dorsiflexion/plantarflexion demand where useful;
- spinal axial load;
- loaded spinal flexion/extension;
- trunk rotation/anti-rotation;
- open/closed-chain or fixed/free-path ONLY if it changes a deterministic decision;
- body position;
- balance/stability;
- external support;
- impact;
- unilateral/bilateral;
- independently loadable sides;
- floor transfer/access;
- machine/free-weight/cable path where relevant;
- setup burden.

DO NOT blindly add every biomechanics field.

For every field require:

“What product decision cannot be made correctly without this?”

Build the minimum ontology that supports the comprehensive injury/capability question set.

9. TAG THE ENTIRE EXERCISE LIBRARY TO THE REQUIRED FIDELITY

If the movement-path audit proves the current exercise metadata is insufficient:

- add the required schema;
- derive what can be deterministically derived;
- curate what cannot;
- tag ALL relevant built-in exercises;
- support the same fields on custom exercises where users provide them;
- preserve UNKNOWN honestly;
- produce a coverage report;
- set minimum automatic-selection coverage thresholds;
- fail closed for automatic recommendations where required metadata is unknown.

Do not stop after tagging the “popular” exercises.

The whole live library must be accounted for.

10. COMPREHENSIVE ROUTINE LIBRARY — NOT TEN TOKEN ROUTINES

Revisit the original routine-library requirement.

The current ten capability-led routines are a START, not proof of comprehensive coverage.

Research and build the complete useful routine-family set justified by the live exercise library and evidence.

At minimum revisit:

- seated-only full body;
- seated upper-body strength;
- wheelchair gym strength;
- wheelchair home strength;
- no-floor full body;
- no-standing full body;
- externally supported / balance-limited;
- unilateral upper-body;
- unilateral lower-body;
- lower-body with limited upper-limb loading;
- grip-limited pulling;
- grip-light routines;
- machine-supported hypertrophy;
- limited-overhead;
- limited-knee-flexion;
- low-equipment adapted strength;
- resistance-band adapted strength;
- accessible beginner;
- accessible intermediate hypertrophy;
- accessible experienced hypertrophy;
- accessible strength-focused;
- independently loadable unilateral programmes;
- no-floor-transfer programmes;
- support/stability-heavy programmes.

Research additional useful families.

Do not create duplicates for cosmetic breadth.

Each routine must exist because it solves a real training need.

11. POPULATION / CONDITION-SPECIFIC COLLECTIONS

Where evidence is sufficiently specific and responsible, build evidence-informed collections/routine starting points for relevant populations.

Examples to independently assess include:

- chronic spinal cord injury;
- wheelchair users (separate from SCI where appropriate);
- upper-limb difference;
- lower-limb difference;
- cerebral palsy;
- multiple sclerosis;
- Parkinson’s;
- long-term stroke asymmetry;
- dwarfism / short stature;
- other groups research identifies.

Do NOT create one “amputee routine” or one “disabled routine”.

For populations with huge functional variability, the collection may be:

- a capability-informed starting family;
- tailored setup guidance;
- additional questions;
- appropriate exercise variants;

rather than a fixed diagnosis programme.

Every population-labelled collection requires its evidence dossier.

12. EVIDENCE DOSSIER — BUILD THE ACTUAL SYSTEM

For every population-specific or injury-specific profile create a structured evidence dossier containing:

1. target population/problem;
2. purpose;
3. variability;
4. authoritative/high-quality sources;
5. supported strength-training principles;
6. unsupported conclusions;
7. movement/setup considerations;
8. exercise-library requirements;
9. movement metadata requirements;
10. generalisable parameters;
11. parameters that remain individual;
12. clinical boundary;
13. claim/language risks;
14. accessibility considerations;
15. routine implications;
16. check-in implications;
17. reintroduction implications;
18. review date/version;
19. product status;
20. marketing-safe statements;
21. prohibited claims.

This must be machine-readable enough to maintain.

Do not leave it as prose scattered across documents.

13. RESEARCH STANDARD

Use authoritative CURRENT sources first.

Prioritise:

- UK CMO / government guidance;
- WHO / recognised public-health sources;
- peer-reviewed clinical practice guidelines;
- consensus statements;
- recognised professional bodies;
- recognised disability-sport organisations;
- condition-specific charities/organisations with reputable clinical review;
- Paralympic/adaptive-sport sources;
- specialist organisations such as LimbPower;
- primary literature where needed.

Use lived-experience sources SECONDARILY to identify practical gaps such as:

- equipment problems;
- gym setup;
- transfers;
- prosthetic/hook/strap use;
- fatigue realities;
- patronising UX;
- advanced-athlete needs.

Lived experience may generate a question.
It does not turn into a medical rule without appropriate evidence.

Record source quality.

No fake citations.
No uncited medical facts.

14. NO REAL USER PANEL AVAILABLE — NEW VALIDATION LAW

Do NOT block implementation waiting for a disabled-user panel that the founder does not currently have.

Replace “user validation is required before code can be complete” with:

CODE / RESEARCH READINESS:
- exhaustive evidence review;
- deterministic scenario tests;
- accessibility tooling;
- device testing;
- adversarial persona simulation;
- recognised disability-resource comparison;
- expert review where high-risk content requires it.

Keep a separate truth field:

REAL-DISABLED-USER-VALIDATED = NO

until that actually happens.

Do NOT claim user-tested.

Do NOT use lack of direct testers as an excuse to leave known engineering/content gaps unresolved.

15. MASSIVE SCENARIO MATRIX

Build a deterministic scenario suite covering the directory.

For each relevant profile, test combinations of:

- beginner/intermediate/experienced;
- hypertrophy/strength/general training;
- home/commercial gym;
- equipment-rich/equipment-poor;
- unilateral/bilateral capability;
- temporary injury on top of baseline disability;
- multiple simultaneous constraints;
- custom exercise;
- missing metadata;
- no-compatible-option;
- free user;
- Pro coach user;
- resolved episode;
- reintroduction;
- promoted durable baseline;
- fluctuating/chronic flare;
- travel/equipment restriction stacked on physical restriction.

The test must prove:

- no incompatible automatic exercise;
- no medically invented restriction;
- useful plan OR honest gap;
- coach interpretation correct;
- learning eligibility correct;
- unaffected evidence preserved;
- no accidental Pro gate;
- no patronising temporary wording for durable baseline.

Generate coverage statistics.

16. SPECIFIC INJURY MOVEMENT TESTS

Create representative movement-path fixtures such as:

- shoulder: overhead restricted but horizontal press allowed;
- shoulder: horizontal press problematic but neutral-grip pulling allowed;
- elbow: loaded elbow flexion restricted, pressing unaffected;
- wrist: bar grip restricted but cuff/strap/cable setup permitted;
- spine: axial load restricted but supported machine work permitted;
- hip: deep hip flexion restricted but other lower-body patterns permitted;
- knee: deep flexion restricted while hip-dominant work remains available;
- ankle: dorsiflexion-limited squat pattern but supported/alternative lower-body work remains;
- unilateral temporary restriction layered on permanent opposite-side difference.

These are MOVEMENT-CONSTRAINT fixtures, not medical prescriptions.

Named injury profiles should select/recommend the QUESTIONS that establish such constraints rather than silently assuming the answer.

17. ONBOARDING / SETTINGS — CONDITION AND INJURY DISCOVERY

Audit whether current “How you train” UX is enough.

Add, where useful, optional routes such as:

- Permanent / normal for me
- Long-term condition or recurring issue
- Temporary injury or change
- Clinician restriction
- Specific movement I avoid
- Specific exercise I avoid
- Accessibility need

The user may optionally select a known condition/injury from the researched directory.

Selecting it must NOT be mandatory.

If selected:
- present only relevant functional questions;
- explain that people differ;
- let user confirm what actually applies;
- support “none of these / something else”;
- preserve manual control.

The user should not need medical vocabulary to obtain the same training result.

18. PLAN GENERATION / BUILDER / LIBRARY INTEGRATION

The comprehensive directory and movement-path layer must feed the existing system rather than live as informational content only.

Prove integration into:

- onboarding before first plan;
- free starter;
- automatic plan generation;
- routine compatibility;
- routine collections;
- builder;
- picker;
- recents;
- swaps;
- custom exercises;
- current active plan;
- temporary effective prescription;
- weekly coach;
- check-in;
- reintroduction;
- learning shield;
- explanation copy.

No parallel “injury app” architecture.

19. COACH KNOWLEDGE

The coach must understand the structured context WITHOUT diagnosing.

Examples:

- a known temporary shoulder problem + user-confirmed overhead restriction;
- chronic MS + user-confirmed fatigue variability;
- permanent limb difference + normal adapted baseline;
- clinician “no loaded knee flexion beyond X” restriction;
- grip-limited user using a custom hook/cuff exercise.

The coach may explain:

- which explicit rule constrained training;
- which muscles/training remained unaffected;
- why it is holding a progression;
- why no substitute was selected;
- why it is asking a follow-up;
- when evidence supports trying a previously restricted movement.

It must not claim:

- tissue healing;
- diagnosis;
- medical safety;
- causation it cannot prove;
- rehabilitation success;
- clinician clearance.

20. INJURY CHECK-IN INTELLIGENCE

Audit the current generic temporary-episode check-in.

For each injury/body-region profile determine whether there are useful STRUCTURED movement questions that improve training decisions without becoming clinical assessment.

Examples:

- previously restricted movement now tolerated?
- additional movement now problematic?
- user/clinician restriction changed?
- modified exercise felt normal / noticeable but stable / worse / stopped?

Do not ask unnecessary questions.

Use profile relevance to keep the burden small.

21. REINTRODUCTION

Keep the current conservative, formula-free model as the default.

Do not add arbitrary percentages.

However, research whether any condition/injury-specific return logic has sufficiently authoritative evidence to justify a bounded rule.

If so:
- flag it for clinical review before activation;
- keep user approval;
- preserve exact evidence source/version.

If not:
- keep the generic evidence-gated reintroduction.

Do NOT invent a rehab engine.

22. ACCESSIBILITY — NOT JUST THE CAPABILITY SCREEN

The original amendment required disability inclusion in the actual product, not merely the capability settings path.

Audit the CRITICAL END-TO-END training experience for:

VISUAL:
- VoiceOver/TalkBack;
- semantic labels;
- focus;
- selected states;
- exercise instructions;
- timers;
- charts/status that affect training.

MOTOR/DEXTERITY:
- touch targets;
- one-handed operation;
- swipe/drag alternatives;
- long-press alternatives;
- rest timer;
- set logging;
- weight/reps steppers;
- custom exercise creation.

HEARING:
- no audio-only critical cues;
- timer equivalence;
- captions/transcripts if media exists.

COGNITIVE/LEARNING:
- plain language;
- progressive disclosure;
- information load;
- understandable exercise/setup guidance.

Do not claim whole-app compliance unless proven.

Fix capability/training-critical gaps now.
Record unrelated whole-app gaps in an actionable backlog.

23. EXERCISE INSTRUCTIONS / ADAPTED SETUP CONTENT

The original amendment required accessible/adapted exercise instructions.

Audit what actually exists.

Where an exercise has materially different setup for:

- seated users;
- wheelchair users;
- one-arm use;
- one-leg use;
- strap/hook/cuff use;
- external support;
- reduced ROM;
- independently loaded sides;

support structured variant/setup guidance.

Do not create medical “injury form” instructions.

This is exercise setup/accessibility content.

Ensure text is accessible to screen readers.

24. ADVANCED DISABLED LIFTERS

Do NOT optimise only for “can this person exercise?”

Test and build for serious lifters.

Ensure:

- progressive overload;
- hypertrophy volume;
- strength specificity;
- exercise familiarity/preference;
- custom adapted movements;
- PRs;
- per-side progression where supported;
- fatigue/overlap;
- session duration;
- advanced routine structures;

remain sophisticated inside disability-adapted training.

No beginner-chair-exercise default.

25. DIRECTORY / DISCOVERY UX

The founder wants comprehensive support discoverable.

Design a user-friendly way to expose relevant support without creating a patronising “special needs” ghetto.

Potential structure:

HOW YOU TRAIN
- functional capability

TRAINING CONSIDERATIONS
- optional condition/injury context

PLAN LIBRARY FILTERS/COLLECTIONS
- Seated
- No floor
- Unilateral
- Supported
- Grip adaptations
- etc.

CONDITION / INJURY INFO
- optional searchable directory of supported profiles
- evidence-informed questions/guidance
- clearly states individual variation

A person must be able to find support for a named issue if they search for it.

They must also be able to obtain equivalent functional support without naming a condition.

26. COVERAGE REGISTRY — MAKE IT REAL

For EVERY profile in the disability/condition/injury directory track:

- researched?
- evidence quality;
- functional question mapping complete?
- movement metadata sufficient?
- exercise coverage;
- plan-generation coverage;
- routine-library coverage;
- builder coverage;
- custom-exercise support;
- logging support;
- coach support;
- check-in support;
- reintroduction support;
- accessibility support;
- content/setup guidance;
- automated scenario tests;
- clinical review required?;
- clinical review status;
- real-user validation status;
- known limitations;
- marketing status.

The registry must be generated/validated from actual product artefacts where possible.

Do not hand-wave coverage.

27. MARKETING TRUTH

The current all-NO matrix may remain NO where external/user validation is still missing.

But the product should move from:

“architecture theoretically supports this”

to:

“we have researched, implemented and mechanically tested this support.”

Create separate statuses:

- ENGINE SUPPORTED
- CONTENT SUPPORTED
- RESEARCH SUPPORTED
- AUTOMATED TESTED
- DEVICE TESTED
- EXPERT REVIEWED
- USER VALIDATED
- MARKETING READY

No false equivalence.

The lack of a user panel does not erase the progress achieved by evidence + implementation, but do not claim “user validated”.

28. AUTHORITATIVE RESEARCH LEADS ALREADY IDENTIFIED

Reverify rather than blindly trust these:

- UK CMO 2026 disabled-adult guidance: resistance/strength activity remains a core recommendation.
- LimbPower: limb/prosthetic configuration changes movement and modifications must be individual.
- Parkinson’s Foundation: strength training is supported but posture, balance, medication timing and other disease-related considerations matter.
- SCI exercise guidelines: condition-specific evidence exists.
- MS sources: there is no universal “MS exercise”; functional variability matters.

Expand substantially.

Do not stop at these examples.

29. HARD COST / AGENT / FABLE-USAGE GOVERNANCE

The founder has already consumed a large amount of weekly Max/Fable allowance.

COST CONTROL IS A HARD EXECUTION REQUIREMENT, NOT A SUGGESTION.

The objective is:

MAXIMUM PRODUCT QUALITY
+
MINIMUM EXPENSIVE-MODEL HANDS-ON WORK
+
MINIMUM NUMBER OF AGENT INVOCATIONS
+
NO DUPLICATE RESEARCH OR IMPLEMENTATION

Do NOT interpret “comprehensive” as “spawn an agent for every disability, injury, body region, routine family or code area”.

The correct model is:

FABLE DECIDES.
LOWEST-COST AGENTS EXECUTE BOUNDED WORK.
FABLE REVIEWS.
DIRECT TOOLS HANDLE EVERYTHING THEY CAN.

--------------------------------------------------
29.1 FABLE'S ROLE
--------------------------------------------------

Fable is the:

- architect;
- product-law owner;
- evidence adjudicator;
- synthesis layer;
- cross-domain decision maker;
- final reviewer.

Fable should NOT personally burn high-value reasoning context doing:

- long repository inventories;
- repetitive source gathering;
- one-condition-at-a-time research;
- mechanical exercise tagging;
- repetitive schema edits;
- migration boilerplate;
- repetitive call-site edits;
- fixture boilerplate;
- accessibility-label sweeps;
- routine data entry;
- coverage table population;
- straightforward documentation edits;
- routine test corrections.

If a task is mechanically defined, delegate it at the lowest reliable tier.

If a direct search/read/script can do it more cheaply than an agent, use the direct tool instead.

--------------------------------------------------
29.2 HARD SUBAGENT BUDGET — ENTIRE WORKSTREAM
--------------------------------------------------

NORMAL MAXIMUM ACROSS THE ENTIRE GAP-CLOSURE WORKSTREAM:

- HAIKU / LOWEST-TIER: MAXIMUM 6 TOTAL DISPATCHES
- SONNET: MAXIMUM 1 TOTAL DISPATCH
- OPUS / HIGHEST-TIER: 0

These are MAXIMUMS, NOT TARGETS.

Finishing with:

- 3 Haiku;
- 0 Sonnet;
- 0 Opus

is preferable to consuming all available slots.

Do NOT consume an agent slot merely because it exists.

OPUS / HIGHEST-TIER SUBAGENTS ARE FORBIDDEN WITHOUT EXPLICIT FOUNDER APPROVAL.

No automatic escalation.

--------------------------------------------------
29.3 DEFAULT CONCURRENCY
--------------------------------------------------

DEFAULT CONCURRENCY = 1.

Do not run agent waves.

Do not fill available concurrency.

A maximum concurrency of 2 is allowed ONLY when:

- one task is independent external evidence gathering; AND
- the other is independent mechanical repository implementation; AND
- neither depends on the other's output; AND
- parallel execution materially reduces elapsed time without increasing duplicated reasoning.

Otherwise use one agent at a time.

--------------------------------------------------
29.4 NO AGENT-TO-AGENT DELEGATION
--------------------------------------------------

Agents may NEVER spawn or instruct additional agents.

Fable owns all delegation.

No recursive agent tree.

No “research coordinator” agent that spawns researchers.

--------------------------------------------------
29.5 BATCH RESEARCH — NEVER ONE AGENT PER CONDITION
--------------------------------------------------

Do NOT dispatch:

- one agent for MS;
- another for Parkinson's;
- another for SCI;
- another for cerebral palsy;
- another for each injury;
- another for each joint.

That would recreate the usage failure this policy exists to prevent.

Research must be BATCHED BY DOMAIN.

Preferred maximum batching pattern:

HAIKU SLOT 1 — DISABILITY / LONG-TERM-CONDITION EVIDENCE
One structured research batch covering the required population taxonomy, authoritative evidence, accessibility implications and condition variability.

HAIKU SLOT 2 — INJURY / BODY-REGION EVIDENCE
One structured research batch covering the major injury/problem families, relevant movement questions, clinical boundaries and source quality.

HAIKU SLOT 3 — MOVEMENT-PATH / EXERCISE-LIBRARY MECHANICAL AUDIT
Repository inventory, metadata coverage, derivation candidates, missing movement-path fields and mechanical tagging work.

HAIKU SLOT 4 — ROUTINE / CONTENT GAP IMPLEMENTATION
Mechanical routine-family creation, evidence-dossier population, structured setup-content work once Fable defines the contracts.

HAIKU SLOT 5 — UX / INTEGRATION / ACCESSIBILITY IMPLEMENTATION
Bounded implementation of already-decided onboarding/settings/discovery/integration/accessibility changes.

HAIKU SLOT 6 — SCENARIO / COVERAGE / TEST IMPLEMENTATION
Mechanical fixture generation, coverage scripts, directory-wide scenario tests and documentation truth tables.

This is an EXECUTION SHAPE, not a requirement to use all six.

Combine safely where possible.

Do NOT split a single coherent task into several dispatches simply to make prompts smaller.

--------------------------------------------------
29.6 BEFORE EVERY AGENT DISPATCH
--------------------------------------------------

Fable must write a terse internal dispatch record containing:

- SLOT NUMBER being consumed;
- exact unresolved task;
- concrete output required;
- why direct tools are insufficient;
- why existing evidence is insufficient;
- why this model tier is the lowest reliable tier;
- exact files/domains or research batch;
- explicit non-goals.

If this cannot be stated clearly:

DO NOT SPAWN THE AGENT.

Maintain a tiny cost ledger:

| Slot | Tier | Task | Output | Why needed | Result |

No long narrative.

--------------------------------------------------
29.7 HAIKU / LOWEST-TIER DEFAULT
--------------------------------------------------

Use Haiku / lowest-cost tier for:

- structured evidence collection;
- source extraction;
- taxonomy population;
- mechanical comparisons;
- repository inventories;
- exercise metadata audits;
- exercise tagging;
- routine data implementation;
- straightforward schema changes whose contract Fable has already defined;
- migrations whose required structure is already defined;
- call-site integration;
- fixture creation;
- deterministic scenario generation;
- accessibility semantics;
- documentation;
- coverage reports;
- straightforward bug fixes;
- test corrections where expected behaviour is already known.

Haiku does NOT decide:

- product law;
- medical boundary;
- evidence sufficiency for a consequential claim;
- precedence;
- architecture;
- whether diagnosis should cause behaviour;
- new entitlement rules;
- marketing readiness.

Fable decides those.

--------------------------------------------------
29.8 SONNET IS AN EXCEPTION, NOT A ROUTINE REVIEWER
--------------------------------------------------

Maximum Sonnet dispatches across the entire workstream: ONE.

Use Sonnet only if Fable identifies one bounded problem that genuinely requires substantial multi-file or cross-domain reasoning that:

- direct tools cannot reasonably resolve; AND
- Haiku is unlikely to execute reliably; AND
- the decision materially affects correctness.

Before Sonnet, record:

“Haiku/direct tools are insufficient because: ...”

Do NOT automatically use Sonnet for:

- final red team;
- generic code review;
- broad research;
- “find anything wrong”;
- summarisation;
- implementation that is already specified.

The default final review is performed by Fable itself.

--------------------------------------------------
29.9 NO AUTOMATIC RED-TEAM AGENT
--------------------------------------------------

There is NO mandatory red-team subagent for this workstream.

Fable performs a focused final adversarial review using:

- the original binding amendment;
- the traceability matrix;
- product laws;
- evidence dossiers;
- scenario results;
- coverage registry;
- final diff.

Only if that review exposes ONE concrete unresolved cross-domain risk may the single Sonnet slot be used.

No second review wave.

No Opus.

--------------------------------------------------
29.10 DIRECT TOOLS FIRST
--------------------------------------------------

Before an agent is considered, use direct tools for:

- repository search;
- file reads;
- exact symbol tracing;
- git history;
- schema inspection;
- deterministic scripts;
- test execution;
- generated coverage reports;
- primary source lookup where tools can retrieve it directly.

Do not pay an agent to perform grep.

Do not pay an agent to read a file Fable already knows how to locate.

Do not pay an agent to summarise existing Campaign 25 documents.

--------------------------------------------------
29.11 REUSE EXISTING EVIDENCE
--------------------------------------------------

Do NOT commission fresh research merely to reconfirm already-banked Campaign 25 evidence.

Existing authoritative research counts.

New research should fill:

- missing disability populations;
- specific injuries;
- movement-path questions;
- exercise/setup gaps;
- condition-specific content gaps;
- accessibility gaps;
- evidence changes/currentness.

Use:

EXISTING EVIDENCE
→ TARGETED REVERIFICATION
→ GAP RESEARCH

not:

START AGAIN FROM ZERO.

--------------------------------------------------
29.12 RESEARCH OUTPUT MUST BE COMPACT AND STRUCTURED
--------------------------------------------------

Research agents must return structured evidence tables / machine-consumable records.

No long essays unless a specific ambiguity genuinely requires explanation.

Each research item should contain only what is needed, such as:

- profile/injury;
- source;
- authority level;
- relevant training implication;
- relevant functional question;
- what cannot be inferred;
- clinical boundary;
- product implication;
- confidence/limitations.

Fable synthesises across the batch.

Do not spawn another agent to summarise the first one.

--------------------------------------------------
29.13 SMALL IMPLEMENTATION CONTRACTS
--------------------------------------------------

Before delegating implementation, Fable should define the contract briefly:

- affected files/domain;
- exact behaviour;
- invariants;
- tests;
- non-goals.

Do NOT paste the full 1,000+ line Campaign 25 architecture into every agent prompt.

Pass only the laws needed for that task.

This reduces both cost and drift.

--------------------------------------------------
29.14 FABLE CONTEXT / READING DISCIPLINE
--------------------------------------------------

Do NOT repeatedly reread entire large architecture documents.

Use:

- traceability references;
- exact section reads;
- decision register IDs;
- campaign handoffs;
- current tracker.

Do not burn Fable context reconstructing already-recorded facts.

When a conclusion is already explicitly banked and still current, reuse it.

--------------------------------------------------
29.15 TEST-COST DISCIPLINE
--------------------------------------------------

During implementation:

- run targeted tests for the touched behaviour;
- run affected-domain suites at meaningful phase gates;
- do not run the full suite repeatedly;
- do not rerun expensive unchanged suites after documentation-only work.

Run ONE full settled-tree suite at the final gate.

If the final suite fails:

1. identify failures;
2. run/fix only the affected suites;
3. prove those green;
4. then rerun the full suite once.

Do not repeatedly run the full suite while debugging.

--------------------------------------------------
29.16 NO LONG INTERNAL PROGRESS ESSAYS
--------------------------------------------------

During the workstream, internal checkpoint records should contain only:

- current SHA;
- phase completed;
- tests;
- important decisions;
- remaining phase;
- agent slots consumed;
- blocker if any.

No long prose progress reports.

Founder-facing output occurs only when:

A. the full workstream is complete;
B. a genuine founder decision is required;
C. production migration permission is required;
D. the Sonnet exception needs a product decision;
E. Opus approval would be required;
F. a real architectural/clinical/legal blocker prevents safe continuation.

--------------------------------------------------
29.17 SESSION / CONTEXT-LIMIT MANAGEMENT
--------------------------------------------------

If approaching the current session/context limit:

- stop spawning agents;
- finish the current bounded operation;
- commit safe work;
- write a concise continuation file;
- preserve exact next action;
- preserve agent-slot usage.

Do NOT increase concurrency to “finish before the limit”.

Do NOT restart completed research in a later session.

The continuation artefact must include:

- current SHA;
- phase;
- completed slices;
- evidence banked;
- tests;
- exact remaining checklist;
- Haiku slots consumed;
- Sonnet slots consumed;
- next exact action.

Resume from that state automatically.

--------------------------------------------------
29.18 COST FAILURE CONDITIONS
--------------------------------------------------

The following are orchestration defects and must NOT occur:

- more than 6 Haiku dispatches without founder approval;
- any Opus dispatch without founder approval;
- more than 1 Sonnet dispatch;
- an agent per condition/injury;
- broad parallel agent waves;
- duplicated research for confidence;
- agent-to-agent delegation;
- agents summarising agents;
- expensive agents doing grep/inventory;
- repeated full test suites;
- restarting a completed phase because context was lost;
- Fable personally doing large mechanical implementation that was already fully specified and suitable for Haiku;
- consuming agent slots because the maximum exists.

If a planned task would breach the budget:

STOP AND REPLAN THE TASK MORE EFFICIENTLY.

Do not ask the founder for more agent budget merely because the work was fragmented poorly.

Only ask if the remaining task genuinely cannot be completed safely within the defined architecture and budget.

--------------------------------------------------
29.19 QUALITY MUST NOT BE SACRIFICED
--------------------------------------------------

Cost control is NOT permission to half-build the feature.

The optimisation is:

EXPENSIVE MODEL DECIDES.
CHEAP MODEL EXECUTES.
DIRECT TOOLS VERIFY.
EXPENSIVE MODEL ADJUDICATES.

Never:

EXPENSIVE MODEL DOES EVERYTHING.

Never:

CHEAP MODEL MAKES UNSUPERVISED PRODUCT/MEDICAL DECISIONS.

Never:

SAVE TOKENS BY OMITTING A REQUIRED ORIGINAL-SPEC FEATURE.

The completion gate remains unchanged.

30. AUTONOMOUS EXECUTION — ONE FOUNDER HANDOFF

Do NOT stop after:
- research;
- ontology audit;
- directory creation;
- routine expansion;
- injury layer;
- accessibility;
- tests.

This is ONE autonomous gap-closure workstream.

Internally phase and commit work safely.

Only stop for:
- genuine new founder product law;
- production migration approval;
- unavoidable legal/clinical decision that changes implementation;
- Opus approval;
- irreconcilable architecture conflict.

Otherwise continue.

The founder does NOT want to relay dozens of messages.

31. REQUIRED INTERNAL PHASES

PHASE A — ORIGINAL SPEC TRACEABILITY
Prove gaps.

PHASE B — RESEARCH / TAXONOMY
Build disability + condition + injury coverage directories and evidence dossiers.

PHASE C — MOVEMENT-PATH MODEL
Audit/extend ontology and fully tag exercise library.

PHASE D — UX / DISCOVERY
Onboarding, settings, named-condition/injury lookup, function-first mapping.

PHASE E — ROUTINES / LIBRARY
Expand capability families + evidence-supported population collections.

PHASE F — DEEP INTEGRATION
Generation, builder, picker, swaps, workout, coach, check-in, reintroduction, learning.

PHASE G — ACCESSIBILITY / CONTENT
Critical journeys + adapted setup/instructions.

PHASE H — MASSIVE SCENARIO / COVERAGE GATE
Directory-wide automated proof.

PHASE I — FINAL TRUTH PASS
Coverage registry, marketing statuses, docs.

At each phase:
- targeted tests;
- atomic commit;
- continue automatically.

ONE final full suite at settled-tree gate.

32. FINAL GATE

Do NOT call this workstream complete until:

1. Original amendment has a line-by-line traceability matrix.
2. Every gap is fixed, explicitly deferred for a defensible external reason, or rejected with rationale.
3. Disability/condition coverage directory exists.
4. Injury directory exists.
5. Evidence dossiers exist where appropriate.
6. Condition/injury selection is optional, never required.
7. Functional constraints remain the deterministic core.
8. Specific injury profiles select relevant QUESTIONS, not automatic diagnosis bans.
9. Movement ontology is proven sufficient for the supported questions.
10. Entire exercise library is covered at required fidelity.
11. UNKNOWN remains explicit.
12. Custom exercises support required metadata.
13. Routine-family library is materially broader than the current starter set where research justifies it.
14. Evidence-supported population collections exist where appropriate.
15. Grip-limited pulling gap is either solved or has a hard evidence/content reason.
16. Builder is integrated.
17. Generation is integrated.
18. Library is integrated.
19. Workout is integrated.
20. Coach is integrated.
21. Check-in is integrated.
22. Reintroduction is integrated.
23. Learning integrity remains intact.
24. Stable disability remains normal evidence.
25. Temporary injury cannot contaminate durable learning.
26. Critical app accessibility journey is audited/fixed.
27. Adapted setup/instruction support exists where materially needed.
28. Advanced disabled lifter scenarios pass.
29. Multi-constraint scenarios pass.
30. Directory-wide coverage statistics exist.
31. No unsupported medical claims.
32. No unsupported marketing claims.
33. Real-user-validation status remains honestly NO where not done.
34. Production migrations are NOT run unless separately authorised.
35. Lint green.
36. targeted/affected suites green.
37. ONE final full suite green.
38. docs/registers updated.
39. main merged/pushed.
40. no major original-spec requirement is silently left behind.

33. FINAL RESPONSE

Return ONE founder-facing report only after the full workstream finishes:

# COMPREHENSIVE DISABILITY / INJURY GAP-CLOSURE COMPLETE

## ORIGINAL SPEC TRACEABILITY
- implemented
- newly fixed
- defensibly deferred

## DISABILITY / CONDITION DIRECTORY
- profile count
- categories
- evidence coverage

## INJURY DIRECTORY
- profile count
- regions/types
- movement-question mapping

## MOVEMENT-PATH INTELLIGENCE
- ontology
- exercise coverage
- custom exercise support

## ROUTINE LIBRARY
- capability families
- population collections
- levels/goals

## ONBOARDING / SETTINGS / DISCOVERY

## PLAN GENERATION / BUILDER

## WORKOUT / COACH / CHECK-IN / RETURN

## ACCESSIBILITY / ADAPTED INSTRUCTIONS

## ADVANCED-LIFTER SUPPORT

## TEST / SCENARIO COVERAGE

## MARKETING / EVIDENCE STATUS
Explicitly separate:
- research supported
- code supported
- device tested
- expert reviewed
- real-user validated
- marketing ready

## MIGRATIONS
Explicitly state production status.

## COST
- Fable hands-on architectural/review work
- direct-tool work
- Haiku dispatches used / 6 maximum
- purpose/result of each Haiku slot
- Sonnet dispatches used / 1 maximum
- Opus dispatches used / 0 permitted without founder approval
- any avoided/combined dispatches
- confirmation that no agent-to-agent delegation or broad swarm occurred

## GIT
- commits
- final main SHA

## REMAINING EXTERNAL-ONLY ITEMS
Only things that genuinely cannot be completed without a human/external professional.

Do NOT create another development campaign unless this gap-closure work itself proves one is genuinely necessary.

BEGIN FROM MAIN `1259a9f`.
