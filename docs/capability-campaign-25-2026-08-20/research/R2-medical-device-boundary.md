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
