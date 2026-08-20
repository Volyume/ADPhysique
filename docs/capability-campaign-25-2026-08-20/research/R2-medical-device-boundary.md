# R2 — The regulated-software boundary (UK MHRA / EU MDR) for restriction-aware and capability-led training

**Research agent:** R2. **Date:** 2026-08-20.
**Question owner:** Capability Campaign 25 (`docs/capability-campaign-25-2026-08-20/`).
**Method:** public web only (WebSearch/WebFetch/curl of published PDFs). Primary
legal and regulator texts were downloaded and text-extracted locally so that
every quotation below is taken from the document itself, not from a summary of
it. Where a primary text could not be retrieved in this session that is stated
openly in "Retrieval gaps" at the end, and the fallback source is named.

**THIS IS NOT LEGAL ADVICE.** It is a findings report: what the texts say, where
the published examples sit, and which of Volyume's proposed functions land near
a line that only a regulatory professional can rule on. Every item that needs a
human lawyer or regulatory consultant is collected in the NEEDS LEGAL REVIEW
register at the end. Nothing here authorises shipping anything.

## Evidence tiers used throughout

| Tag | Meaning |
|---|---|
| **[ESTABLISHED]** | Text of law: MDR (EU) 2017/745, UK MDR 2002 (as amended). Binding. |
| **[REGULATOR GUIDANCE]** | MHRA guidance, MDCG guidance, MDCG Borderline Manual. Not legally binding (MDCG says so on its own cover) but it is what the assessing authority applies. |
| **[CASE LAW]** | CJEU judgment. Binding interpretation of EU law. |
| **[PLATFORM POLICY]** | Apple / Google store rules. Contractual, not statutory; can remove the app regardless of regulatory status. |
| **[COMMENTARY]** | Law firm / consultancy write-ups. Used only for orientation and dating, never as the basis of a boundary call. |
| **[INFERENCE]** | R2's reasoning applying the above to Volyume's proposed functions. Explicitly labelled every time. Not a regulator's view. |

## Sources (all retrieved 2026-08-20)

| Short name | Document | Version / date | URL |
|---|---|---|---|
| **MDCG 2019-11 rev.1** | MDCG 2019-11 Rev.1, *Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745 (MDR) and Regulation (EU) 2017/746 (IVDR)* | rev.1, **June 2025** (original Oct 2019) | https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=md_mdcg_2019_11_guidance_qualification_classification_software_en.pdf |
| **MDCG 2019-11 (2019)** | Same, original endorsement | October 2019 | https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2019_11_guidance_en_0.pdf |
| **MHRA SaMD guidance** | *Guidance: Medical device stand-alone software including apps (including IVDMDs)* **v1.10f** (43 pp.), plus Appendix 1 (symptom checkers) | page published 8 Aug 2014, **last updated 1 July 2023** | https://assets.publishing.service.gov.uk/media/64a7d22d7a4c230013bba33c/Medical_device_stand-alone_software_including_apps__including_IVDMDs_.pdf (index page: https://www.gov.uk/government/publications/medical-devices-software-applications-apps) |
| **MHRA Appendix 1** | *Appendix 1 — symptom checkers* | with v1.10f | https://assets.publishing.service.gov.uk/media/64a7d235c531eb000c650051/Appendix_1_-_symptom_checkers.pdf |
| **Borderline Manual** | MDCG/BCWG *Manual on borderline and classification for medical devices under Regulation (EU) 2017/745 and Regulation (EU) 2017/746* | **Version 5, April 2026** (served from the Sept-2025 update page) | https://health.ec.europa.eu/document/download/71a87df8-5ca1-4555-b453-b65bdf8de909_en?filename=md_borderline_manual_en.pdf |
| **UK MDR 2002** | The Medical Devices Regulations 2002 (SI 2002/618), reg. 2(1) | as amended | https://www.legislation.gov.uk/uksi/2002/618/regulation/2 |
| **MHRA intended purpose** | *Crafting an intended purpose in the context of Software as a Medical Device (SaMD)* | 22 March 2023 | https://www.gov.uk/government/publications/crafting-an-intended-purpose-in-the-context-of-software-as-a-medical-device-samd |
| **SNITEM** | CJEU C-329/16 *SNITEM and Philips France*, 7 Dec 2017 | judgment | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:62016CJ0329 (operative principle quoted here from MHRA SaMD guidance p.18 — see Retrieval gaps) |
| **Apple ASRG** | App Store Review Guidelines, §1.4.1, §1.4.2, §5.1.1(ix), §5.1.3 | live 2026-08-20 | https://developer.apple.com/app-store/review/guidelines/ |
| **Play health policy** | Google Play *Health content and services* policy | live 2026-08-20 | https://support.google.com/googleplay/android-developer/answer/12261419 |

---

## EXECUTIVE SUMMARY (tagged)

**E1. Qualification turns on the manufacturer's stated intended purpose, not on
what the code does.** [ESTABLISHED + REGULATOR GUIDANCE] MDR Art. 2(12) defines
intended purpose by "the data supplied by the manufacturer on the label, in the
instructions for use or in promotional or sales materials or statements".
MHRA expands "promotional materials" to include, in terms, the **App Store
description and category, the landing page, and the manufacturer's social media
channels**. The same feature can be a device or not a device depending on the
sentence written beside it. This is the single most important architectural
fact in this report.

**E2. A published EU example now sits almost exactly on Volyume's mechanism.**
[REGULATOR GUIDANCE] MDCG 2019-11 rev.1 (June 2025), p.10, lists as *medical
device software*: "MDSW that uses the data of a patient with a specific
musculoskeletal pathology (e.g. X-rays, range of motion, weight, age, etc.) and
is intended to alleviate pain associated with the musculoskeletal pathology by
recommending personalised rehabilitation exercises to be performed." Personalised
exercise recommendation is therefore *not* inherently safe; it becomes MDSW when
the stated purpose is to alleviate a named pathology or its symptoms.

**E3. The same guidance expressly excludes fitness and wellness apps.**
[REGULATOR GUIDANCE] MDCG 2019-11 rev.1 p.9: "software only intended for
non-medical purposes ... such as invoicing, staff planning, e-mailing, web or
voice messaging, data parsing, word processing, and back-up, **wellness or
fitness apps, do not qualify as MDSW**". MHRA agrees: "The monitoring of general
fitness, general health and general wellbeing is not usually considered to be a
medical purpose." The exclusion is drafted around *purpose*, not around app
category, and the word "only" is doing real work.

**E4. Two operative words separate the safe zone from the regulated zone:
"specific" and "symptom".** [REGULATOR GUIDANCE] MHRA repeats, on every medical
purpose page, "There needs to be a link to a **specific** disease, injury or
handicap." A generic capability constraint ("cannot press overhead") carries no
such link. A named condition ("frozen shoulder", "spinal cord injury",
"post-op ACL") supplies it. Separately, "alleviation — includes devices that
reduce **symptoms** or severity of a disease, injury or handicap": the moment
the product is framed as reducing pain/discomfort rather than as scheduling
training, it is on the alleviation limb.

**E5. Volyume's core restriction mechanics (exclude / substitute / reduce volume
/ reintroduce) are LOW risk as long as they are framed as user-directed
programme construction.** [INFERENCE, grounded on E3–E4] None of the four is a
medical purpose in itself. MHRA lists as *unlikely* to be devices: "Apps and
software that simply replace a written diary/log of symptoms"; "Apps and
software that are intended to just provide tips or advice"; "Apps and software
that are intended to make general recommendations to seek further advice". The
risk enters entirely through framing and through symptom-contingency, not
through the algorithm.

**E6. The riskiest single item in the proposal is the discomfort prompt (3e).**
[INFERENCE] Detecting repeated user-reported discomfort and then changing the
programme in response is symptom-contingent adaptation. MDCG 2019-11 rev.1 p.11
lists as MDSW a depression app that "offers exercises and videos, which are
individually chosen based on the patient's input **to reduce** depression-related
symptoms". The structural pattern — collect symptom reports, individually select
content, purpose is symptom reduction — is identical. Volyume can keep the
prompt only if the loop is broken at the *purpose* step: the app must not claim
or imply that the adaptation reduces the discomfort.

**E7. The compensation limb (question 3g) is real, and it is triggered by the
label, not by the sophistication of the software.** [REGULATOR GUIDANCE] MHRA:
"Compensation — includes software that the manufacturer claims can compensate
for an injury or handicap ... **It doesn't include those products that are
intended for general use but can be used to compensate for an injury or
handicap.**" Its paired examples make the point unmissable: text magnification
*specifically for people with visual impairment* may be a device; the same text
magnification with *no mention of visual impairment in the claims* is unlikely
to be. Function identical; claim different; outcome different.

**E8. Therefore: capability-led routine families are low risk; population-labelled
routines are NEEDS-REVIEW.** [INFERENCE from E7] "Seated-only", "unilateral",
"grip-limited" describe what the body is being asked to do and are the
"intended for general use" case. "Spinal cord injury programme" names a specific
disability, supplies the link MHRA says is required, and states who the product
is designed to benefit — which MHRA's own intended-purpose guidance says is a
constituent element of an intended purpose. Whether that alone qualifies depends
on whether any compensation/alleviation benefit is claimed; that call is not
R2's to make. It is logged as **LR-3**.

**E9. Words alone can qualify a product, and disclaimers do not save it.**
[REGULATOR GUIDANCE] MHRA: "General disclaimers (for example 'this product is
not a medical device') are not acceptable if medical claims are made or implied
elsewhere in the product labelling or associated promotional literature", and
"Anecdotal quotes and testimonials are considered to be implied claims by the
manufacturer if they are repeated in product literature." A "not a medical
device" line in Settings is worth nothing if the store listing says
"rehabilitation".

**E10. The assessment is made by an objective observer, not by the manufacturer.**
[REGULATOR GUIDANCE] MHRA: "A manufacturer's stated view of their product is not
solely determinative ... it is possible for an objective observer such as the
MHRA or an **averagely informed consumer** to view a product as a medical device."
The test for Volyume's copy is therefore not "did we mean it clinically" but
"would an ordinary user read this as a health claim".

**E11. Qualification is per-function, not per-app.** [CASE LAW as quoted by MHRA;
REGULATOR GUIDANCE] SNITEM: software with a qualifying function is a medical
device "**in respect of that function**". MDCG 2019-11 rev.1 §7 requires the
manufacturer to "clearly delineate the boundaries and interfaces of the various
modules" and to identify explicitly which modules are subject to MDR/IVDR. This
is the architectural instruction: if any part of the restriction system is ever
allowed to cross, it must be a *separable module*, not a diffuse behaviour
smeared across `planEngine`, `weeklyCoach` and the exercise library.

**E12. Red-flag refusal plus signposting is the correct pattern and is supported
by the guidance.** [REGULATOR GUIDANCE] MHRA Appendix 1 lists as unlikely to be a
device: "Software that **only** signposts the user to suitable care e.g. see your
GP, go to A&E", and the main guidance lists "Apps and software that are intended
to make general recommendations to seek further advice". The proposed refusal
behaviour (do not programme around acute trauma; direct to a professional) is
inside the published safe pattern, provided the app does not also grade severity,
rank likelihood, or name a probable condition.

**E13. UK and EU are currently aligned enough that one design satisfies both,
but the UK wording is older.** [ESTABLISHED] UK MDR 2002 reg. 2(1) still uses the
Directive-era limbs ("alleviation of or compensation for injury or **handicap**")
and has **no "prediction" or "prognosis" limb**; MDR Art. 2(1) added "prediction,
prognosis". The stricter of the two for Volyume is the EU text, because
"prediction" reaches forward-looking outputs. Designing to MDR Art. 2(1) covers
UK MDR 2002 on these limbs. [COMMENTARY] A GB pre-market reform (draft *Medical
Devices (Amendment) Regulations 2026*) was published 8 May 2026 for WTO comment
and is reported as expected to come into force in 2027; it is a watch item, not
a present constraint.

**E14. The store layer imposes its own, earlier gate.** [PLATFORM POLICY] Apple
§1.4.1: "Medical apps that could provide inaccurate data or information, or that
could be used for diagnosing or treating patients may be reviewed with greater
scrutiny ... Apps should remind users to check with a doctor". Google Play
requires the Health apps declaration, and requires medical device apps to
"provide proof of approval, clearance or certification by the relevant authority
upon request", while non-medical health apps "should include disclaimers stating
they do not diagnose, treat, cure, or prevent any medical condition". A medical
*claim* in the listing can therefore cost the app its store presence before any
regulator is involved.

---

## Q1 — The qualification test: what makes software a medical device

### 1.1 The definition of "medical device" [ESTABLISHED]

MDR Art. 2(1), quoted verbatim in **MDCG 2019-11 rev.1 §2** (and identically in
the Oct 2019 original, p.4, footnoted to "Article 2(1) of Regulation (EU)
2017/745 — MDR"):

> "medical device means any instrument, apparatus, appliance, **software**,
> implant, reagent, material or other article intended by the manufacturer to be
> used, alone or in combination, for human beings for one or more of the
> following specific medical purposes:
> - diagnosis, prevention, monitoring, prediction, prognosis, treatment or
>   alleviation of disease,
> - diagnosis, monitoring, treatment, alleviation of, or **compensation for, an
>   injury or disability**,
> - investigation, replacement or modification of the anatomy or of a
>   physiological or pathological process or state,
> - providing information by means of in vitro examination of specimens derived
>   from the human body ...
>
> and which does not achieve its principal intended action by pharmacological,
> immunological or metabolic means, in or on the human body, but which may be
> assisted in its function by such means."

Note the three structural features that matter here:

1. The limbs are alternatives. Hitting **any one** qualifies.
2. Limb 1 is about **disease**. Limb 2 is about **injury or disability**, and it
   is limb 2 that carries "compensation for".
3. "prediction, prognosis" are MDR additions relative to the old Directive and
   relative to the current UK text.

Software is expressly an **active device**: MDR Art. 2(4) as quoted in MDCG
2019-11 (2019) p.4 — "Software shall also be deemed to be an active device".

### 1.2 The definition of "intended purpose" [ESTABLISHED]

MDR Art. 2(12), quoted in **MDCG 2019-11 rev.1 §2**:

> "'Intended purpose' means the use for which a device is intended according to
> the data supplied by the manufacturer **on the label, in the instructions for
> use or in promotional or sales materials or statements** and as specified by
> the manufacturer in the clinical evaluation".

### 1.3 How the intended purpose is actually established in practice [REGULATOR GUIDANCE]

**MHRA SaMD guidance, "Intended purpose" page (p.11):**

> "A **medical purpose** is determined by what the manufacturer states in the
> device's labelling, instructions for use and any promotional materials.
> Examples of promotional materials include:
> - Adverts
> - **App store description and category**
> - The landing page
> - The manufacturer's social media channels"

and, on the same page:

> "Care should be taken with the description of what the software is intended to
> be used for. **Simple changes to the description make the difference between a
> product being considered a device or not.**"

> "A number of apps have a disclaimer saying 'for information only' or 'for
> research use only' or other statements that try and reduce the responsibilities
> of the manufacturer. However, if an app qualifies as a medical device and is
> placed on the market for a medical purpose, it will still need to comply with
> UK MDR 2002."

> "General disclaimers (for example 'this product is not a medical device') are
> not acceptable if medical claims are made or implied elsewhere in the product
> labelling or associated promotional literature."

> "Anecdotal quotes and testimonials are considered to be implied claims by the
> manufacturer if they are repeated in product literature."

> "A manufacturer's stated view of their product is not solely determinative as
> to whether their device is or is not a medical device. Based on the surrounding
> circumstances e.g. the labelling, instructions for use, promotional material,
> its mode of action and manner of use as perceived by the consumer, it is
> possible for an objective observer such as the MHRA or an **averagely informed
> consumer** to view a product as a medical device."

The same page reproduces the MEDDEV 2.1/1 formulation:

> "Medical devices are defined as articles which are intended to be used for a
> medical purpose. The medical purpose is assigned to a product by the
> manufacturer. The manufacturer determines through the label, the instruction
> for use and the promotional material related to a given device its specific
> medical purpose."

**MHRA, *Crafting an intended purpose in the context of SaMD* (22 March 2023)**
states that an intended purpose covers "what a product does, **a description of
the people it is designed to benefit**, who should use it, and where it should be
used". [REGULATOR GUIDANCE — quoted from the GOV.UK publication page; the full
HTML guidance was not separately extracted, see Retrieval gaps.] The "people it
is designed to benefit" element is what makes population labelling (question 3g)
non-trivial.

### 1.4 The MDSW qualification decision path [REGULATOR GUIDANCE]

**MDCG 2019-11 rev.1 §3.2:**

> "MDSW is software that is intended to be used, alone or in combination, for a
> purpose as specified in the definition of a medical device or in vitro
> diagnostic medical device in the MDR or IVDR, regardless of whether the
> software is independent or driving or influencing the use of a device."

**MDCG 2019-11 (2019) §3.2, p.6** puts the threshold plainly:

> "**Software must have a medical purpose on its own** to be qualified as a
> medical device software (MDSW). It should be noted that the intended purpose as
> described by the manufacturer of the software is relevant for the qualification
> and classification of any device."

**Figure 1 decision steps** (MDCG 2019-11 (2019) pp.8–9; unchanged in substance
in rev.1):

- **Step 1** — is it software (a set of instructions that processes input data
  and creates output data)?
- **Step 2** — is it an Annex XVI device, an accessory, or software driving or
  influencing a device? (Volyume: no.)
- **Step 3** — does it "perform an action on data, or perform an action beyond
  storage, archival, communication, simple search, lossless compression"?
  Volyume's planning engine plainly does. rev.1 adds: "software would not be
  considered as conducting 'Simple search' if it contributes to achieving a
  medical purpose."
- **Step 4** — "is the action for the benefit of individual patients?"
  Counter-examples given: software "intended only to aggregate population data,
  provide generic diagnostic or treatment pathways (**not directed to individual
  patients**), scientific literature, medical atlases, models and templates".
- **Step 5** — is it MDSW per the definition, i.e. does it have a medical
  intended purpose?

[INFERENCE] Steps 3 and 4 are already satisfied by any personalised training app
— Volyume performs actions on data and does so for the individual. **The whole
question, for Volyume, collapses onto step 5: is there a medical intended
purpose?** Nothing about being an algorithm, being personalised, or being
health-adjacent qualifies a product; only purpose does. Correspondingly, nothing
about "we didn't intend it clinically" protects a product whose copy reads
clinically (E10).

Two further rev.1 statements bound the analysis:

> "It is important to clarify that **not all software used within healthcare is
> qualified as a medical device**." (§3.1)

> "It must be highlighted that **the risk of harm** to patients, users of the
> software, or any other person, related to the use of the software within
> healthcare, including a possible malfunction **is not a criterion on whether the
> software qualifies as a medical device**." (§3.1)

That second one cuts both ways for Volyume: the fact that a bad exercise
substitution could hurt someone does **not** make the app a device; equally,
"our feature is low-risk" is not an argument against qualification.

### 1.5 Per-function qualification [CASE LAW]

CJEU C-329/16 *SNITEM and Philips France* (7 Dec 2017), operative principle as
quoted verbatim in **MHRA SaMD guidance p.18**:

> "Software, of which **at least one of the functions** makes it possible to use
> patient-specific data for the purposes, inter alia, of detecting
> contraindications, drug interactions and excessive doses, is, **in respect of
> that function**, a medical device within the meaning of those provisions, even
> if that software does not act directly in or on the human body."

**MDCG 2019-11 rev.1 §7 (Modules), p.22–23:**

> "Some products may be segregated into a number of modules, where one or a
> combination of modules may serve a medical or non-medical purpose. For example,
> software used in healthcare may include both medical device and non-medical
> device modules."

> "It is the responsibility of the manufacturer to **clearly delineate the
> boundaries and interfaces of the various modules**. Modules subject to MDR or
> IVDR must be explicitly identified ... This delineation must be communicated in
> a manner that ensures clarity for users, including: Exactly which modules
> constitute the product; Whether the product or any of its modules are subject to
> the MDR/IVDR or under other applicable legislation".

[INFERENCE — architectural] This is the direct answer to "where does the boundary
sit in the codebase". It sits at a **module edge that the manufacturer draws and
publishes**, not at a diffuse behaviour. If Volyume ever wants a regulated
capability, it must be a bounded module with its own inputs, outputs, copy
surface and gate — not a flag threaded through `planEngine.js`, `weeklyCoach.js`
and the exercise library. Conversely, keeping everything non-medical means
keeping every restriction behaviour inside one coherent, uniformly-worded
non-medical purpose.

---

## Q2 — Where fitness and wellbeing apps sit

### 2.1 The EU exclusion [REGULATOR GUIDANCE]

**MDCG 2019-11 rev.1 §3.1, p.9** (this sentence is *new in rev.1*; the 2019
original listed the same non-medical examples but did not name wellness/fitness):

> "In addition, software **only** intended for non-medical purposes (excluding
> MDR Annex XVI devices), such as invoicing, staff planning, e-mailing, web or
> voice messaging, data parsing, word processing, and back-up, **wellness or
> fitness apps, do not qualify as MDSW**."

[INFERENCE] "only" is load-bearing. The exclusion protects an app whose purposes
are *all* non-medical. It does not protect a fitness app that also carries one
qualifying function (which is exactly the SNITEM point, E11).

### 2.2 The UK exclusion [REGULATOR GUIDANCE]

**MHRA SaMD guidance, "Non medical functions" page (p.12)**, under the heading
*Monitors fitness/health/wellbeing*:

> "The monitoring of general fitness, general health and general wellbeing is not
> usually considered to be a medical purpose — see monitoring."

The same page treats these as non-medical functions in the medical-purpose
flowchart: "Patient medical education", "Monitors fitness/health/wellbeing",
"Professional medical education", "Stores or transmits medical data without
change", software that "provides reference information to help a Healthcare
Professional to use their knowledge to make a clinical decision", and purely
administrative functions.

**MHRA, "Monitoring" page (p.20):**

> "Apps and software for monitoring sport or fitness purposes, e.g. heart rate,
> are not considered to be medical devices. **However, in some specific cases,
> where the intention is to investigate the physiological processes they may be.**"

and the marginal rule for that page:

> "There needs to be a link to a specific disease, injury or handicap."

Also on p.20, unlikely to be devices:

> "Apps and software that simply replace a written diary/log of symptoms that can
> be used when consulting with the patient's doctor. **However, the addition of
> features that enhance the data presented may bring it into the remit of the UK
> MDR 2002.**"

[INFERENCE] That last caveat is directly relevant to any Volyume "discomfort
history" view. A raw log the user can show a physio is the safe pattern; a
*derived* view (trend lines, flare frequency scores, "your shoulder is worse
than last block") is the "features that enhance the data presented" case MHRA
warns about.

### 2.3 Published examples closest to exercise / training [REGULATOR GUIDANCE]

These are the examples the guidance itself gives. They are the most valuable
material in this report because they show the regulator's own line-drawing on
exercise content.

**(a) Personalised exercise recommendation to alleviate a pathology — IS MDSW.**
MDCG 2019-11 rev.1, §3.2 Note 1, p.10:

> "MDSW that uses the data of a patient with a specific musculoskeletal pathology
> (e.g. X-rays, range of motion, weight, age, etc.) and is intended to **alleviate
> pain associated with the musculoskeletal pathology by recommending personalised
> rehabilitation exercises to be performed**."

**(b) Software aiding rehabilitation of a disability — IS MDSW.**
Same page:

> "MDSW intended to work in combination with a virtual reality headset as an aid
> in the **rehabilitation of persons with amputations** by alleviating phantom
> limb-related phenomena."

**(c) Symptom-contingent exercise selection to reduce symptoms — IS MDSW.**
MDCG 2019-11 rev.1, §3.2 Note 4, p.11:

> "MDSW intended to assess, monitor, and manage depression. The MDSW provides
> patients with questionnaires to track their mood, symptoms, and activities. It
> also **offers exercises and videos, which are individually chosen based on the
> patient's input to reduce depression-related symptoms**."

**(d) Software alleviating eating-disorder behaviours — IS MDSW.**
MDCG 2019-11 rev.1, §3.2 Note 1, p.9:

> "MDSW intended to alleviate certain eating disorder behaviours such as bulimia
> and anorexia. The MDSW reacts on different patient inputs related of the disease
> (diet, physical activity, body image, etc.) via personalized psycho-educational
> interactive and immersive workshops."

[INFERENCE — flag for the lead] (d) is not about the restriction feature but it
is about **Volyume as it exists today**. The app already reacts to diet, physical
activity and body-image-adjacent inputs and already has an ED-safety subsystem.
The distinguishing fact is that Volyume's ED system **suppresses, withholds and
signposts**; it does not offer interventions intended to alleviate an eating
disorder. That distinction is currently carried by behaviour and by copy, not by
any explicit non-qualification statement. Recommending it be made explicit in the
architecture doc, and logged as **LR-6**.

**(e) Non-medical fitness/health monitoring — NOT a device.** §2.1, §2.2 above.

**(f) Behaviour-based risk advice that is not based on physiological
parameters — NOT a device.** Borderline Manual v5 §1.1.9.1 (an STI notification
and risk app):

> "the risk calculation is based on indirect criteria and not on physiological
> parameters. It appears to be an epidemiologic tool rather than a prevention tool
> within the meaning of the [definition] ... The product does not therefore fulfil
> the definition of medical device, according to Regulation (EU) 2017/745, and
> should not be qualified as such."

[INFERENCE] Useful analogue: a decision derived from what the *user chose to
declare and how they behaved* sits further from qualification than a decision
derived from measured physiological parameters. Volyume's restriction inputs are
declarations and training logs, not physiological measurements. That helps, but
it is not on its own decisive — the STI app also lacked any alleviation claim.

**(g) Calculation for an individual clinical decision — IS a device.**
Borderline Manual v5 §1.1.9.2 (medical calculators): calculation "is an action on
data beyond the use of 'simple search'", "the calculation is for the benefit of
individual patients", therefore "The presented device meets the definition of a
medical device", classified "at least class IIa" under Rule 11. The qualifying
feature there is that the output feeds a diagnosis/therapy decision, not that a
calculation happened.

---

## Q3 — Applying the definitions to the proposed functions

Each item states: what the function does, which limb it could touch, what the
sources say, and the resulting risk rating. Risk ratings are R2's [INFERENCE]
throughout, tied to the quoted sources.

### (a) Excluding exercises a user asked to avoid — **LOW**

No limb is engaged. The user states a preference/constraint; the app honours it
when building a programme. There is no claim about disease, injury or disability,
no symptom is being reduced, nothing is monitored against a condition.
Supporting: MDCG rev.1 p.9 wellness/fitness exclusion; MHRA p.12 non-medical
functions. Nothing in either source treats "respecting a user-stated content
filter" as a medical purpose.

**Fails to LOW only if** the exclusion is captured as a *clinical* input —
i.e. if the UI collects the reason ("why are you avoiding this?" → "rotator cuff
tear") and stores/acts on the diagnosis. Collecting a named condition supplies
MHRA's required "link to a specific disease, injury or handicap" and moves the
whole feature onto the assessment side. See the wording rules in Q5.

### (b) Suggesting substitutes for an excluded movement — **LOW**

Substitution is programme construction: given that this movement is out, here is
another that trains the same pattern. It is the kind of "action on data" that
passes step 3 but does not, without more, reach step 5.

**Contrast** with MDCG rev.1 p.10 (musculoskeletal example): there the exercise
recommendation is medical because it is "intended to alleviate pain associated
with the musculoskeletal pathology". The substitution logic is the same; the
purpose is different. Volyume's purpose must therefore stay "keep your training
stimulus intact within the movements you can do", never "protect the injury",
"offload the joint", "unload the shoulder", or "so it can heal".

**Watch item:** substitution rationale copy is where the medical framing will
leak. "Swapped because overhead pressing aggravates shoulders" is a claim about
symptom causation. "Swapped because you excluded overhead pressing; this trains
the same muscles" is not.

### (c) Reducing training volume while a restriction is active — **LOW**

Volume reduction is a training-programme decision, exactly the sort of thing the
planning engine already does for fatigue, adherence and mesocycle phase. No limb
is engaged by "you have fewer available exercises, so the weekly set target for
that muscle group falls".

**Fails to LOW** if the reduction is presented as a therapeutic dose — "reduced
to let it recover", "deloaded to protect the injury", "capped until it settles".
Those are alleviation/treatment framings; MHRA's alleviation indicative words
include "Controls", "Counteracts", "Reduce pain", "Heals". See Q5.

### (d) Stepping a movement back in gradually ("reintroduction") — **MEDIUM**

This is the first item where the mechanism itself starts to resemble published
device examples, because it is (i) staged, (ii) gated on entry criteria, and
(iii) has hold/regression rules that respond to the user's reported state.

- Pointing towards LOW: it is user-initiated and user-approved at each step;
  progressive loading is ordinary training practice; no condition is named; no
  symptom is claimed to be reduced.
- Pointing towards MEDIUM/NEEDS-REVIEW: MDCG rev.1 p.10 and p.11 both show that
  *staged, individually-selected exercise content responding to patient input*
  is the shape of MDSW when the purpose is clinical. The word "reintroduction"
  is neutral; the words that usually travel with it ("return to play", "graded
  exposure", "load tolerance", "progression protocol") are not.
- MHRA "Treatment / Alleviation" p.21 lists as unlikely to be devices: "Apps and
  software that are intended to just provide tips or advice or link to support
  groups" — but a *protocol with entry criteria and regression rules* is more
  than a tip, and is closer to "Apps and software that are intended to automate
  the treatment pathway for an individual patient", which p.21 lists as one that
  **may** be a device.

[INFERENCE] Volyume's stated framing — "reintroduction as a controlled
experiment" — is helpful because "experiment" frames it as the user testing their
own capability rather than the app administering a protocol. The design should
keep the *user* as the decision-maker at every gate and should avoid presenting
entry criteria as clinical readiness thresholds. Logged as **LR-2**.

### (e) "You've reported discomfort several times — want Volyume to account for it?" — **NEEDS REVIEW (highest risk item)**

Three separate things are happening: (1) the app is **collecting symptom
reports**; (2) it is **detecting a pattern** across them; (3) it is **offering to
change the programme in response**.

- (1) alone is fine: MHRA p.20 — "Apps and software that simply replace a written
  diary/log of symptoms" are unlikely to be devices.
- (2) is where MHRA's own caveat bites: "the addition of features that **enhance
  the data presented** may bring it into the remit of the UK MDR 2002" (p.20).
  Pattern detection over symptom reports is enhancement of the data presented.
- (3) is the structure of the depression example (MDCG rev.1 p.11): symptom
  input → individually chosen content → purpose of reducing symptoms. Volyume
  breaks the chain only at the last link, and only if the purpose is genuinely
  not symptom reduction.

Also relevant, MHRA "Diagnosis" p.19 lists as *may be devices*: "Apps and
software that provide medical condition advice based on user entered data", and
its indicative words include "Detects", "Spots", "Finds", "Risk of", "Predicts",
"Symptom Checker". A prompt that says "we've detected a pattern in your
discomfort" is using the regulator's own diagnosis vocabulary.

[INFERENCE] The feature is not automatically a device — nothing here diagnoses,
and no claim of symptom reduction need be made — but it is the one function where
a single copy choice decides the outcome, and where the *aggregation* step adds
regulatory weight that (a)–(c) do not carry. **This needs the professional review
before build, not after.** Logged as **LR-1**.

Design directions that keep it defensible [INFERENCE]:
- The prompt reports back only what the user themselves entered ("you've logged
  discomfort on overhead pressing in 4 of your last 6 sessions") rather than
  asserting a finding about their body.
- The offer is a *programme* offer ("want to exclude it for now?"), never a
  *clinical* offer ("want us to help it settle?").
- No severity grading, no probability, no naming or hinting at a cause or
  condition, no trend/forecast of the symptom itself.
- Red-flag routing (see E12) stays as pure signposting.

### (f) Vocabulary: "recovery", "rehabilitation", "injury management", "flare" — see Q5

Short answer: **"rehabilitation" and "injury management" are high risk;
"flare" is high risk; "recovery" is context-dependent and mostly safe in its
training sense.** Full evidence in the wording section below.

### (g) The compensation limb — programmes around permanent disability, and population-labelled routines

This is the subtlest question in the brief, so it is treated at length.

**The text.** [ESTABLISHED] MDR Art. 2(1) limb 2: "diagnosis, monitoring,
treatment, alleviation of, or **compensation for, an injury or disability**".
UK MDR 2002 reg. 2(1): "diagnosis, monitoring, treatment, alleviation of or
compensation for injury or **handicap**". There is no definition of
"compensation" in either instrument.

**The only substantive published gloss is MHRA's.** [REGULATOR GUIDANCE] MHRA
SaMD guidance, "Compensation" page (p.22), reproduced in full:

> "**Compensation** — includes software that the manufacturer claims can
> compensate for an injury or handicap or claims that the sensors and output from
> the physical device can be used for this purpose.
>
> **It doesn't include those products that are intended for general use but can be
> used to compensate for an injury or handicap.**
>
> Examples that may be devices include:
> - Apps and software that are intended to magnify text **specifically for people
>   with visual impairment**.
> - Apps and software that are intended to amplify sounds **for people with reduced
>   hearing**.
>
> Examples that are unlikely to be devices include:
> - Apps and software that are intended to magnify text but **there is no mention
>   of visual impairment in the manufacturer's claims**.
> - Apps and software that are intended to amplify sounds but the manufacturer's
>   claims **do not mention reduced hearing ability**.
>
> Indicative words and phrases: **Corrects**, **Helps**"

and the page's marginal rule:

> "There needs to be a link to a **specific** injury or handicap."

**What this establishes.** [INFERENCE, tightly grounded]

1. **The compensation limb is claim-driven, not capability-driven.** Two products
   with byte-identical behaviour fall on opposite sides purely because one
   *names the impairment* and the other does not. This is the clearest published
   statement anywhere in the UK/EU material that **the label is the regulated
   artefact**.
2. **"Intended for general use" is a recognised safe harbour** — and it is
   phrased as intent, not as usage. Products that *can* be used by disabled
   people to work around their impairment are outside the limb; products
   *intended* to do so are inside it.
3. **"Helps" is an indicative word for this limb.** That is a very low bar and
   it is worth taking literally: "helps wheelchair users train" is closer to a
   compensation claim than it may feel.

**A second data point on the limb, from the EU side.** [REGULATOR GUIDANCE]
Borderline Manual v5 §1.1.7.1 (rescue bag for patient transport) — a product with
no software and no cleverness at all — was qualified as a device because:

> "The intended purpose of the product **corresponds to the medical purpose of
> alleviation of, or compensation for, an injury or disability, according to Art.
> 2(1) of the MDR**. It should be therefore qualified as a medical device."

[INFERENCE] Confirms that the limb is applied at the level of the *stated
intended purpose*, with no threshold of technical sophistication and no
requirement that the product act physiologically.

**A third, and the most directly threatening, data point.** [REGULATOR GUIDANCE]
MDCG 2019-11 rev.1 p.10 qualifies as MDSW software that is "an aid in the
**rehabilitation of persons with amputations**". That example combines a named
population defined by a permanent physical disability with a stated benefit to
that population's condition. It is MDSW. The population label alone is not what
qualifies it — the alleviation of phantom-limb phenomena is — but the two arrive
together, and that pairing is exactly the pattern a "spinal cord injury routine
family" risks reproducing if any benefit-to-the-condition language attaches.

**Applying it to the two proposed things:**

**(g-i) Building a programme AROUND a permanent disability (capability-led
routine families: seated-only, wheelchair-based, unilateral, grip-limited).**
Risk: **LOW**, conditional on framing. [INFERENCE]

These labels describe **movement capability**, not a condition. A seated-only
routine is intended for anyone who trains seated — including a user with a
temporary lower-limb cast, a user in a wheelchair, a user with vestibular
issues who prefers not to stand, and a user who simply wants a seated session.
That is MHRA's "intended for general use" case in its purest form. Nothing about
it claims to compensate for, alleviate, treat or monitor any injury or
disability; it claims to give a good training stimulus within a movement
constraint. Nothing in MDCG rev.1 or the Borderline Manual suggests that
selecting exercises a person can physically perform is a medical purpose.

Guardrails that keep it there [INFERENCE]:
- Name the routine family by the **movement constraint**, never by the
  **condition**: "Seated training", not "Wheelchair-user training", and
  certainly not "SCI training".
- Do not attach benefit-to-the-impairment copy. "Builds pressing strength without
  standing" is fine. "Helps wheelchair users maintain shoulder health" mixes
  the compensation indicative word ("Helps") with a named population and a
  health outcome.
- Do not derive the routine from a declared diagnosis. Derive it from declared
  capability. The data model matters here as much as the copy: if the profile
  field is `condition: 'spinal_cord_injury'`, the product has recorded a
  clinical fact and acts on it. If it is `canTrainStanding: false`, it has
  recorded a capability.

**(g-ii) Population-labelled curated routines (e.g. referencing spinal cord
injury), gated by evidence dossiers.** Risk: **NEEDS REVIEW**. [INFERENCE]

Against qualification:
- Curated content directed at a population is arguably closer to MDCG's step-4
  exclusion — "generic diagnostic or treatment pathways (**not directed to
  individual patients**) ... models and templates" — since a published routine
  family is not individualised to a patient. That exclusion is a genuine
  argument, and it is worth putting to a regulatory professional.
- MHRA "Diagnosis" p.19 makes a parallel distinction that supports population-
  level content: risk stated for "a **broad group** of the population" is
  unlikely to be a device, whereas risk stated for "a **specific patient**" may
  be.
- Publishing content *for* a group is not the same as claiming a benefit *to*
  their condition. Mainstream publishers issue training material for named
  populations without being regulated.

For qualification:
- The population label supplies precisely the "link to a specific injury or
  handicap" that MHRA says is required, on the same page that says the limb is
  triggered by the manufacturer's claims.
- MHRA's intended-purpose guidance makes "a description of the people it is
  designed to benefit" a **constituent element of an intended purpose**. A
  routine whose identity *is* a clinical population has stated that element in
  clinical terms.
- An **evidence dossier** cuts against Volyume here, not for it: a dossier
  assembled to justify the routine for a clinical population reads as
  substantiation of a health benefit to that population. It is the sort of
  artefact an objective observer (E10) would treat as evidence of intent. If
  dossiers exist, their stated purpose should be *content quality and safety of
  selection*, not *clinical effectiveness for the condition*.
- The app is individualised elsewhere. Volyume does not merely publish a
  template; it assigns and adapts. The step-4 "not directed to individual
  patients" argument weakens the moment the population-labelled routine is
  auto-suggested to a user because of something the app knows about them.

**R2's read [INFERENCE]:** capability-led families are the design that stays
clearly outside the limb, and they lose almost nothing in user value, because a
wheelchair user searching for training content is searching for *seated,
upper-body, grip-adapted* content. Population labels buy discoverability and
credibility, and they buy it by moving onto the limb's territory. If they are
used at all, the defensible minimum shape appears to be: population words used
only as **discovery/search metadata** ("often used by: wheelchair users") with no
benefit claim, no dossier framed as clinical evidence, no auto-assignment from a
recorded diagnosis, and no clinical-population naming in the store listing or
marketing. That shape has not been validated by any regulator and must not be
treated as cleared. **LR-3.**

### Summary of a distinction that runs through all of (a)–(g) [INFERENCE]

Every safe version of these functions shares one property: **the app acts on what
the user can and will do, and says so in those terms.** Every risky version shares
the opposite: **the app acts on what is wrong with the user, and says so in those
terms.** Capability in, training out. Condition in, health outcome out. The
architecture should make the first easy to express and the second hard — in the
data model, in the copy pipeline, and in the store listing.

---

## Q4 — MHRA specifics: the current UK position

### 4.1 The operative UK instrument [ESTABLISHED]

Great Britain still regulates under **the Medical Devices Regulations 2002
(SI 2002/618), as amended** — the Directive-era transposition, not the EU MDR.
Regulation 2(1), retrieved verbatim from legislation.gov.uk:

> "'medical device' means any instrument, apparatus, appliance, software,
> material or other article, whether used alone or in combination, together with
> any accessories, including the software intended by its manufacturer to be used
> specifically for diagnosis or therapeutic purposes or both and necessary for its
> proper application, which—
> (a) is intended by the manufacturer to be used for human beings for the purpose
> of-
> (i) diagnosis, prevention, monitoring, treatment or alleviation of disease,
> (ii) diagnosis, monitoring, treatment, **alleviation of or compensation for an
> injury or handicap**,
> (iii) investigation, replacement or modification of the anatomy or of a
> physiological process, or
> (iv) control of conception; and
> (b) does not achieve its principal intended action in or on the human body by
> pharmacological, immunological or metabolic means, even if it is assisted in its
> function by such means ..."

and:

> "'intended purpose' means— ... (b) in relation to any other medical device, the
> use to which the device is intended according to the data supplied by the
> manufacturer on the labelling, the instructions for use and/or the promotional
> materials".

**Differences from MDR Art. 2(1) that matter to Volyume** [INFERENCE from the two
texts side by side]:

| | UK MDR 2002 | MDR (EU) 2017/745 |
|---|---|---|
| Disease limb | diagnosis, prevention, monitoring, treatment or alleviation | adds **prediction, prognosis** |
| Injury limb wording | "injury or **handicap**" | "injury or **disability**" |
| Software named in definition | yes (as article and as accessory) | yes, plus Art. 2(4) deems software an active device |

The EU text is the stricter of the two for a forward-looking feature such as
reintroduction readiness, because "prediction" has no UK counterpart. **Designing
to the EU text covers both.** [INFERENCE]

### 4.2 Territorial split [REGULATOR GUIDANCE]

MHRA SaMD guidance, application note:

> "This guidance is applicable to standalone software and apps placed on the Great
> Britain market. Great Britain is England, Wales and Scotland. The UKCA (UK
> Conformity Assessed) mark is used for certain goods, including medical devices,
> being placed on the Great Britain market."

> "For Northern Ireland, different rules apply to those in Great Britain."

[INFERENCE] Northern Ireland follows the EU regime under the Windsor Framework,
so an app distributed UK-wide is exposed to **both** the UK MDR 2002 and the MDR
analysis. This is not a choice of one regime.

### 4.3 What the MHRA guidance actually is, and its status [REGULATOR GUIDANCE]

- Document: *Guidance: Medical device stand-alone software including apps
  (including IVDMDs)*, **v1.10f**, 43 pages, on the GOV.UK page *Medical devices:
  software applications* (published 8 Aug 2014, **last updated 1 July 2023**).
  Verified 2026-08-20: the current attachment is byte-identical to the version
  analysed here.
- It is expressly the UK reading of the EU material: "This guidance is to be used
  in addition to MEDDEV 2.1/6 and is the UK's interpretation of the guidance."
- It is built as a set of flowcharts plus one page per medical purpose, each page
  carrying: a definition, "Examples that may be devices", "Examples that are
  unlikely to be devices", an **Indicative words and phrases** box, and a marginal
  rule. The indicative-words boxes are introduced as: "Words and phrases listed in
  this box are all likely to contribute to a determination by the MHRA that the app
  they were associated with is a medical device."
- Its stated scope explicitly contemplates the fitness sector: "As well as medical
  device apps becoming a growth area in healthcare management in hospital and in
  the community settings, the role of apps used as part of **fitness regimes** and
  for social care situations is also expanding."

### 4.4 Published MHRA examples nearest this boundary [REGULATOR GUIDANCE]

Collected here because they are the closest thing to a decided case that exists
for a UK fitness app.

| MHRA page | Unlikely to be a device | May be a device |
|---|---|---|
| Non-medical functions (p.12) | "The monitoring of general fitness, general health and general wellbeing is not usually considered to be a medical purpose"; software offering "only lifestyle treatment choices or referral advice (e.g. see your GP)" | — |
| Prevention (p.18) | "Apps and software that just provide tips or advice on prevention" | "Apps and software that claim that the output from the physical device can prevent disease". Marginal rule: "There needs to be a link to specific disease/s to qualify as a device." Note: prevention limb "does not include products that claim to prevent injury or handicap" |
| Diagnosis (p.19) | "Apps and software that are intended to make **general recommendations to seek further advice**"; risk stated for "a **broad group** of the population ... e.g. males aged over 50 have X% chance of heart disease" | "Apps and software that provide medical condition advice based on user entered data"; risk stated for "a **specific patient** ... e.g. people with the same risk factors as you have a X% chance of heart disease" |
| Monitoring (p.20) | "Apps and software for monitoring sport or fitness purposes, e.g. heart rate"; "Apps and software that simply replace a written diary/log of symptoms" | Monitoring apps where "the output is intended to affect the treatment of an individual"; "**the addition of features that enhance the data presented** may bring it into the remit of the UK MDR 2002"; sport/fitness monitoring may be a device "where the intention is to investigate the physiological processes" |
| Treatment / alleviation (p.21) | "Apps and software that are intended to treat non-medical conditions e.g. non-specific stress"; "Apps and software that are intended to just provide tips or advice or link to support groups"; medication reminders | "Apps and software that are intended to **automate the treatment pathway for an individual patient**"; insulin dose calculators; software "intended for the treatment of neurotrauma, neurodegenerative and neuropsychiatric conditions" |
| Compensation (p.22) | Text magnification / sound amplification **with no mention of the impairment in the claims** | The same functions **claimed for visual impairment / reduced hearing**. "It doesn't include those products that are intended for general use but can be used to compensate" |
| Appendix 1 (symptom checkers) | "Software that **only** signposts the user to suitable care e.g. see your GP, go to A&E"; "Software that offers **only** reference information about the conditions listed"; listing all matching conditions in an order "independent of likelihood, e.g. in alphabetical order" | Outputting a subset of matching conditions; indicating likelihood of a match; providing treatment recommendations; offering "filters by red flag/severity/probability of a match" |

[INFERENCE] Two structural lessons for Volyume from this table. First, the word
**"only"** appears in nearly every safe example: the safe versions are safe
because they do *one* modest thing and stop. Second, **ordering and ranking are
regulated acts**: an alphabetical list is safe, a likelihood-ordered list is not.
Any "most likely cause of your discomfort" or "top recommended adaptations for
your issue" ranking inherits that problem.

### 4.5 UK reform in flight [COMMENTARY — dating only]

Post-market surveillance requirements were strengthened in 2024/2025, and on
8 May 2026 the MHRA published a draft *Medical Devices (Amendment) Regulations
2026* on the WTO notification portal, covering pre-market requirements,
international reliance, and Predetermined Change Control Plans for software and
AI devices; commentary reports an expected 2026 adoption and 2027 commencement,
plus proposals to recognise CE marking in GB indefinitely. None of this changes
the **qualification** limbs analysed above, which are the only part that decides
whether Volyume is in scope. Treat as a watch item, and re-check the MHRA SaMD
guidance version before any launch of the restriction feature. [Sources are
secondary; the draft SI itself was not retrieved. Logged as **LR-7**.]

---

## Q5 — Language and claims discipline

### 5.1 Why wording is the control surface [REGULATOR GUIDANCE]

Established above (E1, E9, E10, §1.3): the intended purpose is read off the
label, IFU and promotional materials — and MHRA counts the **App Store
description and category**, the **landing page** and **social media channels** as
promotional materials. MHRA states outright that "Simple changes to the
description make the difference between a product being considered a device or
not", that disclaimers do not cure medical claims made elsewhere, that repeated
testimonials count as implied manufacturer claims, and that the reader is an
"averagely informed consumer".

[INFERENCE] For Volyume this means the wording rules cannot live only in the app.
They must cover: in-app copy, coaching-voice strings, notification text, the
Play Store and App Store listings (title, subtitle, category, description,
screenshots), volyume.app pages and blog posts, social posts, support macros,
and any testimonial the marketing pipeline republishes. The existing
`marketing-claims-check` skill and CLAIMS-STANDARDS are the natural enforcement
point, and the vocabulary below should be folded into them.

### 5.2 BLACKLIST — words and phrases MHRA lists as indicators of medical intended purpose

These are transcribed **verbatim** from the "Indicative words and phrases" boxes
in MHRA SaMD guidance v1.10f. The MHRA introduces them as "likely to contribute
to a determination by the MHRA that the app they were associated with is a
medical device". Grouped by the limb whose page they appear on.

| Limb (page) | Indicative words and phrases (verbatim) |
|---|---|
| **Prevention of disease** (p.18) | Avoids… · Can benefit those who suffer from… · Combats… · Controls… · Protects against… · Stops… |
| **Diagnosis** (p.19) | Spots · Detects… · Finds · Prognosis · Screening · Symptom Checker · Triage · Risk of… · Measures · Predicts |
| **Monitoring** (p.20) | Check · Alarms |
| **Treatment / alleviation** (p.21) | Calculates… · Can benefit those who suffer from… · Clears · Combats · Controls · Counteracts · Cure/cures · Eliminates · Fights · Heals · Help/help with · Reduce pain |
| **Compensation for an injury or handicap** (p.22) | Corrects · Helps |
| **Control of conception** (p.24) | Fertility · Ovulation · Menstruation · Contraception · IVF |
| **Accessory** (p.9) | Can be used with… · Helps… |
| **Intended purpose / evidence claims** (p.11) | Clinical Trials Evidence · Clinically proven… · Medical research… |
| **Self-identification as SaMD** (p.8) | Software as a medical device · Standalone software · Medical apps · SaMD · Macro · Script |
| **Symptom checkers** (Appendix 1) | Triage · Self assessment · Medical Information · Health Information · Working diagnosis · Differential diagnosis |

[INFERENCE — note the awkward ones] "Helps", "Controls", "Check", "Measures" and
"Calculates" are ordinary product words that a fitness app uses without thinking.
MHRA's own framing is that they *contribute to* a determination, not that they
decide it; a word in this list beside a **specific disease, injury or handicap**
is what does the damage. The practical rule that falls out is: these words are
usable about **training** ("checks your set volume", "calculates your weekly
sets"), and unusable about **the body's condition** ("helps your shoulder",
"controls your flare-ups", "measures your recovery from the injury").

### 5.3 Answering 3(f) directly: "recovery", "rehabilitation", "injury management", "flare"

| Term | Verdict | Evidence |
|---|---|---|
| **rehabilitation** | **BLACKLIST — do not use in any surface** | MDCG 2019-11 rev.1 p.10 uses the word in two of its MDSW examples: recommending "personalised **rehabilitation** exercises" to alleviate pain, and an aid "in the **rehabilitation** of persons with amputations". The word is the regulator's own label for the qualifying activity. |
| **injury management** | **BLACKLIST** | Combines a specific-injury link (MHRA's stated requirement on the monitoring, treatment/alleviation and compensation pages) with a claim to manage it. "Manage" is the verb MDCG rev.1 p.11 uses for the depression MDSW ("assess, monitor, and manage depression"). |
| **flare / flare-up** | **BLACKLIST** | A flare is a symptom episode of an underlying condition; using it imports the disease/injury link and the symptom frame that the alleviation limb turns on (MHRA p.21: "Alleviation — includes devices that **reduce symptoms** or severity of a disease, injury or handicap"). |
| **recovery** | **GREYLIST — allowed only in its training-science sense** | Not in any MHRA indicative list. In strength training, "recovery" is a standard term for between-session readiness and is already used throughout Volyume. It becomes risky when attached to an injury or condition ("recovery from your shoulder injury", "recovery plan for your back"), which supplies the specific-injury link. Rule: recovery *of training capacity*, never recovery *from an injury*. |
| **physio / physiotherapy** | **BLACKLIST as a claim; permitted only as attribution of the user's own external advice** | Naming a profession that treats injuries positions the product in that space. "Physio said no overhead until September" as a *user-entered note* is a record of what the user told the app; "physio-designed programme" or "follows physio guidelines" is a claim. |
| **prehab / rehab** | **BLACKLIST** | Same as rehabilitation; the abbreviation carries the same meaning to an averagely informed consumer (E10). |
| **pain** | **GREYLIST — logging yes, outcome no** | "Reduce pain" is on MHRA's treatment/alleviation indicative list (p.21). Volyume may let users record pain/discomfort (diary is safe, p.20) but must never claim to reduce it or present pain reduction as an outcome of using the app. |
| **treat / treatment / therapy / therapeutic** | **BLACKLIST** | Directly on the treatment limb. |
| **diagnose / assess / screen / triage** | **BLACKLIST** | MHRA diagnosis indicative words; "assess" is the verb of the depression MDSW example. |
| **heal / healing / repair / restore** | **BLACKLIST** | "Heals" is on MHRA's treatment/alleviation list. |
| **safe for / protects / prevents injury** | **BLACKLIST** | "Protects against" and "Avoids" are on the prevention list; MHRA notes the prevention limb "does not include products that claim to prevent injury or handicap" — which means a prevent-injury claim does not qualify the app under *that* limb, but it is still a health claim that an objective observer may read as a medical benefit, and it is not defensible as a training statement. |
| **clinically proven / evidence-based for [condition]** | **BLACKLIST** | "Clinically proven…", "Clinical Trials Evidence", "Medical research…" are all MHRA indicative phrases (p.11). This directly constrains how any "evidence dossier" behind a routine family may be described. |
| **condition names** (spinal cord injury, MS, arthritis, frozen shoulder, ACL, sciatica, hypermobility, etc.) | **BLACKLIST in product/marketing copy; NEEDS REVIEW for discovery metadata** | Every MHRA medical-purpose page carries the marginal rule "There needs to be a link to a **specific** disease, injury or handicap." Naming the condition is that link. See LR-3. |

### 5.4 GREENLIST — the vocabulary that stays inside "fitness"

[INFERENCE, constructed to sit inside the exclusions quoted at §2.1–2.2 and to
avoid every term in §5.2]

- Capability and constraint: *available movements*, *movements you've excluded*,
  *can train standing / seated*, *overhead available*, *grip-limited*,
  *unilateral*, *equipment you have*.
- Programme mechanics: *swap*, *substitute*, *same muscle group*, *same movement
  pattern*, *weekly sets*, *volume target*, *deload*, *progression*, *training
  block*, *stimulus*.
- Reintroduction: *try it again*, *add it back*, *test set*, *see how it goes*,
  *keep it out for now* — user-agency verbs, not protocol nouns.
- Logging: *you logged discomfort*, *you marked this exercise as one to avoid* —
  reporting the user's own input back to them.
- Signposting: *we can't build a programme around this — please speak to a
  doctor or physiotherapist* (this is the MHRA-safe "only signposts" pattern,
  Appendix 1).

### 5.5 Structural claim patterns to avoid, independent of individual words [INFERENCE]

1. **Condition → benefit sentences.** Any sentence of the shape "[condition]:
   [what Volyume does for it]". This is the intended-purpose statement MHRA looks
   for.
2. **Ranked or likelihood-ordered health outputs.** Appendix 1 treats
   likelihood-ordering and severity filtering as qualifying; alphabetical or
   user-chosen ordering as not.
3. **Derived symptom analytics.** Trends, scores, forecasts or comparisons built
   on discomfort reports — MHRA p.20's "features that enhance the data presented".
4. **Prediction of a bodily state.** MDR Art. 2(1) includes "prediction"; UK does
   not. "You'll be ready to press overhead in two weeks" is a prediction about
   the body. "Your reintroduction plan has three steps left" is a statement about
   the plan.
5. **Testimonials describing recovery from injury.** MHRA: repeated testimonials
   are implied manufacturer claims.
6. **Category and keyword choices in the stores.** MHRA lists "App store
   description **and category**". A Medical category, or ASO keywords naming
   conditions, is a claim.

---

## Q6 — App store layer (brief)

### 6.1 Apple [PLATFORM POLICY]

App Store Review Guidelines (retrieved 2026-08-20):

- **§1.4.1** — "Medical apps that could provide inaccurate data or information, or
  that could be used for diagnosing or treating patients may be reviewed with
  greater scrutiny." Apps "must clearly disclose data and methodology to support
  accuracy claims relating to health measurements, and if the level of accuracy or
  methodology cannot be validated, we will reject your app." Apps "should remind
  users to check with a doctor in addition to using the app and before making
  medical decisions. **If your medical app has received regulatory clearance,
  please submit a link to that documentation with your app.**"
- **§1.4.2** — drug dosage calculators must come from an approved entity or hold
  regulatory approval. (Not applicable to Volyume; noted because it shows Apple
  will demand provenance for calculation features in a clinical frame.)
- **§5.1.3** — health/fitness/medical-research data may not be used or disclosed
  "for advertising, marketing, or other use-based data mining purposes other than
  improving health management"; "You must disclose the specific health data that
  you are collecting from the device"; apps "must not write false or inaccurate
  data into HealthKit"; and health-related human subject research needs informed
  consent and ethics-board approval.
- **§5.1.1(ix)** — apps providing services in "highly regulated fields (such as
  ... healthcare ...)" "should be submitted by a legal entity that provides the
  services, and not by an individual developer."

### 6.2 Google Play [PLATFORM POLICY]

*Health Content and Services* policy (retrieved 2026-08-20), verbatim:

> "All developers must complete the health apps declaration form on the App
> content page (Monitor and improve > Policy > App content) in Play Console."

> "If your app is not primarily a health app, but has health-related features and
> accesses health data, **it is still in scope of the health app policy**."

> "We don't allow apps with health and medical-related functionalities that are
> misleading or potentially harmful."

> "Apps that are regulated because they are a medical device must be declared as
> such ... These apps will be identified as a 'medical device' on Google Play.
> Apps that are regulated as a medical device **must provide proof of approval,
> clearance or certification by the relevant authority upon request**. **Other
> health and medical apps must include a clear disclaimer in their app description
> indicating that the app is 'not a medical device and does not diagnose, treat,
> cure or prevent any medical condition'.**"

> "Apps must also remind users to consult a healthcare professional for medical
> advice, diagnosis or treatment."

> "Permissions that are not required for a health app to perform its core
> functionality should not be requested and unused permissions must be removed."

### 6.3 The one tension worth noticing [INFERENCE]

Google **requires** the "not a medical device and does not diagnose, treat, cure
or prevent any medical condition" disclaimer in the store description. MHRA says
a disclaimer like that "is not acceptable if medical claims are made or implied
elsewhere". These are not in conflict, but they must both be satisfied and they
must be satisfied in the right order: **first remove the claims, then add the
disclaimer.** A disclaimer added to a listing that also says "manage your injury"
satisfies Google's tick-box and hands MHRA the evidence of an implied claim in
the same document.

[INFERENCE] Also worth an explicit decision: Volyume's store listings, category
and screenshots are currently written by the marketing pipeline. If the
restriction/capability feature ships, the listing copy becomes a regulatory
artefact under MHRA's own definition of promotional material. That should be a
gated surface, not an autonomous-lane one.

---

## BOUNDARY TABLE

Risk ratings: **LOW** = the sources point clearly away from qualification for the
described framing; **MEDIUM** = defensible but the framing does real work and a
single copy change flips it; **NEEDS REVIEW** = R2 cannot responsibly call it,
regulatory professional required before build. All ratings are R2 [INFERENCE]
against the cited controlling source.

| # | Feature function | Limb it could touch | Risk | Controlling source |
|---|---|---|---|---|
| 1 | Exclude exercises the user asked to avoid (capability/preference input) | none | **LOW** | MDCG 2019-11 rev.1 §3.1 p.9 (wellness/fitness apps not MDSW); MHRA p.12 (fitness/wellbeing not a medical purpose) |
| 2 | Suggest substitutes for an excluded movement, framed as same pattern / same muscles | alleviation, if framed as protecting a body part | **LOW** | MDCG rev.1 p.10 (contrast: exercise recommendation *to alleviate pain* IS MDSW); MHRA p.21 |
| 3 | Reduce training volume while a restriction is active, framed as fewer available exercises | alleviation / treatment, if framed as therapeutic dose | **LOW** | MHRA p.21 indicative words ("Controls", "Counteracts", "Reduce pain") |
| 4 | Time-boxed restriction ("no X until September") entered as a user note and honoured | none, if the app does not act on the clinical reason | **LOW** | MHRA p.11 (intended purpose read from claims, not from user-entered data) |
| 5 | Staged reintroduction with entry criteria and hold/regression rules, user-approved at each gate | treatment pathway automation; MDR "prediction" | **MEDIUM** | MHRA p.21 ("automate the treatment pathway for an individual patient" MAY be a device); MDCG rev.1 p.10–11 |
| 6 | Logging user-reported discomfort per exercise/session (raw diary) | none | **LOW** | MHRA p.20 ("simply replace a written diary/log of symptoms" unlikely to be a device) |
| 7 | Detecting a pattern across discomfort reports and prompting to adapt | monitoring (enhanced data); alleviation (symptom-contingent adaptation) | **NEEDS REVIEW** | MHRA p.20 ("addition of features that enhance the data presented"); MDCG rev.1 p.11 (symptom-input → individually chosen exercises → reduce symptoms IS MDSW) |
| 8 | Derived symptom analytics: discomfort trends, flare-frequency scores, comparisons over time | monitoring | **NEEDS REVIEW** | MHRA p.20 |
| 9 | Ranking or likelihood-ordering any health-related output | diagnosis | **NEEDS REVIEW → avoid** | MHRA Appendix 1 (likelihood ordering / severity filters qualify; alphabetical does not) |
| 10 | Red-flag refusal + signposting to a professional, with no severity grading | none | **LOW** | MHRA Appendix 1 ("only signposts the user to suitable care"); MHRA p.19 ("general recommendations to seek further advice") |
| 11 | Capability-led routine families: seated-only, unilateral, grip-limited, standing-free | compensation, if labelled by condition | **LOW** | MHRA p.22 ("intended for general use but can be used to compensate" is outside the limb) |
| 12 | Population-labelled curated routines (e.g. "spinal cord injury") | **compensation for an injury or disability** | **NEEDS REVIEW** | MHRA p.22 (paired magnification examples; "link to a specific injury or handicap"); MDCG rev.1 p.10 (rehabilitation-of-amputees MDSW); Borderline Manual v5 §1.1.7.1 |
| 13 | Evidence dossiers described as clinical evidence for a population | treatment/alleviation substantiation | **NEEDS REVIEW → reframe** | MHRA p.11 indicative phrases "Clinically proven…", "Clinical Trials Evidence", "Medical research…" |
| 14 | Storing a declared diagnosis in the profile and deriving programmes from it | all limbs (supplies the specific-condition link) | **NEEDS REVIEW → avoid** | MHRA marginal rules on pp.18–22; MHRA p.19 ("medical condition advice based on user entered data" MAY be a device) |
| 15 | Predicting when a movement will be tolerable again | MDR "prediction" (EU only) | **NEEDS REVIEW → avoid** | MDR Art. 2(1) as quoted in MDCG rev.1 §2; MHRA p.19 indicative word "Predicts" |
| 16 | Copy using "rehabilitation", "injury management", "flare", "prehab", "therapy" anywhere | all limbs | **NEEDS REVIEW → avoid** | MDCG rev.1 p.10; MHRA pp.18–22 indicative word boxes |
| 17 | Store listing / category / ASO keywords naming conditions or clinical benefit | all limbs | **NEEDS REVIEW → avoid** | MHRA p.11 ("App store description and category" is promotional material); Play health policy; Apple §1.4.1 |
| 18 | Existing ED-safety subsystem (suppression + Beat UK signposting), unchanged | alleviation of an eating disorder | **LOW as built; MEDIUM if it ever gains interventions** | MDCG rev.1 p.9 (ED-alleviation MDSW example); MHRA Appendix 1 (signposting-only safe) |

---

## WORDING BLACKLIST / GREYLIST — evidence index

For enforcement, the tables at §5.2 and §5.3 are the deliverable. This index maps
each list back to its source so the claims-check skill can cite it.

| List | Source of authority |
|---|---|
| Blacklist by limb (§5.2 table) | MHRA SaMD guidance v1.10f, "Indicative words and phrases" boxes, pp.8, 9, 11, 18, 19, 20, 21, 22, 24 and Appendix 1. Introduced as "likely to contribute to a determination by the MHRA that the app they were associated with is a medical device." |
| "rehabilitation" | MDCG 2019-11 rev.1 p.10, twice, as the label of MDSW activity |
| "manage [condition]", "assess", "monitor" applied to a condition | MDCG 2019-11 rev.1 p.11 ("assess, monitor, and manage depression") |
| "alleviate", "reduce symptoms" | MDR Art. 2(1) limbs 1–2; MHRA p.21 definition of Alleviation |
| "compensate", "helps", "corrects" applied to an impairment | MHRA p.22 |
| "clinically proven", "clinical trials evidence" | MHRA p.11 |
| Condition names as the required "specific link" | MHRA marginal rules, pp.18, 20, 21, 22 |
| Disclaimers do not cure claims | MHRA p.11 |
| Testimonials are implied claims | MHRA p.11 |
| Store listing and category are promotional material | MHRA p.11 |
| Greenlist (§5.4) | R2 [INFERENCE], constructed to avoid every term above and to sit inside MDCG rev.1 §3.1 p.9 and MHRA p.12 |

---

## NEEDS LEGAL REVIEW REGISTER

Each item states the question a regulatory professional (UK medical devices /
digital health) must answer, why R2 cannot, and what is blocked until it is
answered. Founder decision required on whether to obtain the review before build
or accept the risk; per CLAUDE.md Section 4 this is surfaced as a question, not
parked.

| ID | Question for review | Why R2 cannot answer it | Blocks |
|---|---|---|---|
| **LR-1** | Does symptom-pattern detection over user-reported discomfort, followed by an offer to change the programme, create a medical intended purpose if no symptom-reduction benefit is claimed? | Turns on how an "objective observer / averagely informed consumer" (MHRA p.11) reads the prompt, and on how close MHRA considers it to MDCG rev.1 p.11's depression example. That is a judgement call reserved to the regulator or a professional advising on it. | Feature 3(e); boundary-table rows 7, 8 |
| **LR-2** | Does a staged reintroduction protocol with entry criteria and hold/regression rules amount to "automating the treatment pathway for an individual patient" (MHRA p.21) when no condition is named? | The MHRA example is stated without elaboration; no published case distinguishes a training progression from a treatment pathway. | Feature 3(d); row 5 |
| **LR-3** | Can routines be labelled with a clinical population (e.g. spinal cord injury) as discovery metadata only, without engaging the compensation limb? If not, what labelling is permissible? | MHRA p.22 makes the limb turn on whether the claim links the product to a specific injury or handicap; whether search metadata counts as a "claim" is untested in the published material. | Population-labelled routine families; rows 12, 13 |
| **LR-4** | May Volyume store a user-declared diagnosis at all (even for the user's own reference, never acted on), without that recording becoming evidence of intended purpose? | Interacts with GDPR Art. 9 as well as device qualification; needs both privacy and regulatory input. Coordinate with R1 (privacy/Art. 9). | Row 14; data model for restrictions |
| **LR-5** | Do the app-store listings, category choice and marketing site copy need a gated compliance review before the capability feature ships, and who signs it off? | MHRA treats these as promotional materials determining intended purpose; today they are produced through the marketing pipeline. | Marketing autonomous lane; §6.3 |
| **LR-6** | Does Volyume's existing ED-safety subsystem (suppression + Beat UK signposting) sit outside MDCG rev.1 p.9's ED-alleviation example, and should that non-qualification be documented explicitly? | Concerns live, shipped, safety-critical behaviour that CLAUDE.md Section 2 forbids altering without founder approval; R2 must not touch it, only flag it. | Nothing (documentation only), unless the answer is negative |
| **LR-7** | Confirm the current MHRA SaMD guidance version and whether the draft *Medical Devices (Amendment) Regulations 2026* alters qualification for software before Volyume's launch date. | Draft SI not retrieved; commentary only. | Launch readiness check |
| **LR-8** | Northern Ireland: does UK-wide distribution require the MDR analysis in parallel with UK MDR 2002, and does that change any of the above ratings? | MHRA guidance states NI rules differ but does not analyse this case. | Territorial scope of the feature |

---

## Retrieval gaps (evidence honesty)

Stated so no claim above is mistaken for something it is not.

1. **EUR-Lex was unreachable from this session.** Every attempt to fetch
   `eur-lex.europa.eu` (HTML and PDF, via WebFetch and via curl) returned
   HTTP 202 with a zero-byte body. MDR Art. 2(1), 2(4) and 2(12) are therefore
   quoted **as reproduced verbatim, with Article-number footnotes, in MDCG
   2019-11 and MDCG 2019-11 rev.1** — a Commission-hosted MDCG document quoting
   the Regulation. The wording should be re-verified against EUR-Lex before any
   external use.
2. **MDR Art. 7 ("Claims") was not retrieved from a primary source** and is
   therefore not quoted or relied on in this report. It prohibits misleading
   claims *about devices*, so it bites only after qualification; it is noted here
   for completeness, not used.
3. **CJEU C-329/16 SNITEM** could not be retrieved from curia.europa.eu (the
   document endpoint redirected to infocuria and returned no content) or from
   EUR-Lex. The operative principle is quoted **as it appears verbatim in MHRA
   SaMD guidance p.18**. The underlying judgment should be read before any
   external reliance.
4. **MHRA *Crafting an intended purpose in the context of SaMD*** — the GOV.UK
   landing page was retrieved (title, date 22 March 2023, HTML link); the full
   HTML guidance was not separately extracted. The one phrase quoted from it is
   attributed to the landing page rendering, not to the guidance body.
5. **Borderline Manual version drift.** The download URL published on the
   Commission's 12 September 2025 update page currently serves **Version 5,
   April 2026**. Both the version number and the URL are recorded above so the
   discrepancy is visible rather than silently resolved.
6. **PDF text extraction.** All PDF quotations were produced by a local
   zlib/stream text extractor, so hyphenation and line breaks were normalised by
   hand when quoting. Wording was not altered; where a ligature or dash was lost
   in extraction it has been restored to the obvious reading. Any quotation
   intended for external or legal use should be checked against the original PDF.
7. **No FDA / US analysis was performed** — outside the brief (UK/EU users).
   Note only that the US "general wellness" policy is a different framework and
   must not be borrowed as a defence in a UK/EU assessment.
8. **Nothing here was reviewed by a lawyer.** Everything tagged [INFERENCE] is
   R2's reading of the quoted material and carries no authority.
