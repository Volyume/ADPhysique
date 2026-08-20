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
