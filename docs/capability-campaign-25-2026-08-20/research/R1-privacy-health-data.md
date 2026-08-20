# R1 — Privacy law research: capability and restriction data as health data

**Campaign:** Capability Campaign 25 (CC25) — research wave
**Agent:** R1 (research, opus tier)
**Date:** 2026-08-20
**Scope:** UK GDPR / EU GDPR classification and handling of user-declared
training capability and restriction data, with laterality, expiry and
possible free text, where the product design requires **no diagnosis**.

> **This is a research report, not legal advice.** Nothing here is a legal
> opinion, and no conclusion in it is a substitute for advice from a
> qualified data protection lawyer. Every operative conclusion is tagged
> with its evidential weight and repeated in the NEEDS LEGAL REVIEW
> register at the end.

## Sourcing method and honesty notes

- **Primary sources reached directly:** UK GDPR and DPA 2018 as currently in
  force (legislation.gov.uk); Equality Act 2010 (legislation.gov.uk); the
  consolidated EU GDPR text including recitals and two CJEU Grand Chamber
  judgments, retrieved from the EU Publications Office CELLAR repository
  (the official store behind EUR-Lex) because eur-lex.europa.eu and
  curia.europa.eu were both unreachable from this environment (AWS WAF
  challenge / single-page-app shell respectively).
- **Regulator guidance reached directly:** ICO detailed guidance pages
  (fetched and read in full), EDPB Guidelines 05/2020 on consent (official
  PDF), Article 29 Working Party letter annex on health data in apps and
  devices (official PDF on ec.europa.eu).
- **PDF extraction caveat:** the EDPB and WP29 PDFs were extracted with a
  text extractor that introduces line-break and hyphenation artefacts.
  Quotations from those two documents have had obvious artefacts repaired
  and are marked `[PDF-extracted]`. Anyone relying on the exact wording
  should re-read the source PDF.
- **One claim I could not verify against a primary source:** the December
  2025 renewal of the EU adequacy decisions for the UK. Tagged
  PROFESSIONAL COMMENTARY and flagged for review.
- **Currency caveat:** several ICO pages now carry the banner *"Due to
  changes made by the Data (Use and Access) Act, this guidance is under
  review and may be subject to change."* (observed on the ICO consent,
  right-to-be-informed and other pages, 2026-08-20). ICO guidance quoted
  here is the guidance as published on that date.
- **Repo facts used:** `src/screens/Article9ConsentScreen.js` and
  `src/navigation/RootNavigator.js` were read to ground question 3 in the
  gate that actually exists. Those observations are labelled as such.

---

## EXECUTIVE SUMMARY OF FINDINGS

Tags: **[ESTABLISHED]** = primary source (statute or CJEU judgment);
**[REGULATOR]** = ICO / EDPB / WP29 guidance; **[COMMENTARY]** = secondary;
**[INFERENCE]** = my application of the above to this design, not itself
sourced.

### On classification

1. **[ESTABLISHED]** "Data concerning health" is defined by the word
   *reveal*, not by the word *diagnosis*: Art 4(15) UK/EU GDPR — "personal
   data related to the physical or mental health of a natural person …
   **which reveal information about his or her health status**". Absence of
   a diagnosis is legally irrelevant to the definition.
2. **[ESTABLISHED]** Recital 35 GDPR expressly names **"disability"** and
   "the physiological or biomedical state of the data subject **independent
   of its source**" as within data concerning health.
3. **[ESTABLISHED]** CJEU, Case C-21/23 (Grand Chamber, 4 October 2024),
   para 83: "it is **sufficient** that they are **capable of revealing**
   information about the health status of the data subject **by means of an
   intellectual operation involving collation or deduction**." Para 90: this
   holds "even where it is only **with a certain degree of probability, and
   not with absolute certainty**".
4. **[ESTABLISHED]** Same judgment, para 87: the Art 9(1) prohibition "is
   **independent of whether or not the information revealed … is correct**
   and of whether the data controller is **acting with the aim** of
   obtaining information that falls within one of the special categories."
   Under EU law, intent is **not** an element.
5. **[REGULATOR]** ICO's current UK test for *inferred* special category
   data is **intent-based**: it turns on whether "your processing intends to
   make an inference linked to one of the special categories" **or** "you
   intend to treat someone differently on the basis of inferred information
   linked to one of the special categories". The ICO has explicitly
   **withdrawn** its former "reasonable degree of certainty" framing.
6. **[INFERENCE, high confidence]** These two tests diverge on paper but
   converge on this design. The whole product purpose is to treat the user
   differently on the basis of the declared limitation, so the ICO's intent
   test is satisfied squarely; and the EU test is satisfied regardless of
   intent. **A user-declared functional restriction with no diagnosis should
   be handled as Article 9 special category health data on both sides of the
   Channel.**
7. **[REGULATOR]** WP29's three-limb summary test (annex on health data in
   apps and devices, 5 February 2015) puts this beyond serious doubt for app
   data: personal data are health data where, among other limbs,
   "**Conclusions are drawn about a person's health status or health risk
   (irrespective of whether these conclusions are accurate or inaccurate,
   legitimate or illegitimate, or otherwise adequate or inadequate)**".

### On the design's own boundaries

8. **[INFERENCE, high confidence]** Equipment availability ("no barbell")
   and exercise **preference** ("I dislike front squats") are ordinary
   personal data — they do not, standing alone, reveal anything about the
   body. A **capability or restriction** statement does. This is the single
   most consequential architectural finding for CC25: **if preference and
   incapacity share one field, one table or one flag, the ordinary-data lane
   is contaminated and everything in it inherits Article 9.** Keeping
   `preference` structurally separate from `capability`/`restriction` (the
   typed-source idea in H1 of the challenge pass) is what preserves a
   non-Article-9 lane at all.
9. **[INFERENCE, medium-high confidence]** The **existence** of a
   restriction — a bare boolean, or an analytics event named
   `restriction_added` bound to a user or device identifier, with no content
   — is very likely itself data concerning health, because it permits the
   deduction that this identified person has a physical limitation. C-21/23
   paras 83 and 90 make "capable of revealing … with a certain degree of
   probability" the threshold, and the ICO's intent limb is met because the
   product acts on it. **Do not treat content-free restriction telemetry as
   safe by virtue of being content-free.**

### On lawful basis

10. **[ESTABLISHED]** UK GDPR Art 9(2) opens: "Paragraph 1 shall not apply
    if **the processing is based on Article 6(1) and** one of the following
    applies" — the UK text makes the two-layer requirement explicit on its
    face. **[REGULATOR]** ICO: "you must identify **both** a lawful basis
    under Article 6 **and** a condition for processing special category data
    under Article 9."
11. **[ESTABLISHED]** DPA 2018 s.10 attaches Schedule 1 conditions only to
    Art 9(2)(b), (g), (h), (i) and (j). **Art 9(2)(a) explicit consent is
    not in that list**, so relying on explicit consent needs **no Schedule 1
    condition and no appropriate policy document** — a real UK-specific
    simplification for this feature.
12. **[REGULATOR]** ICO: "You need to keep your consents under review and
    **refresh them if your purposes or activities evolve beyond what you
    originally specified**. Consent will not be specific enough if details
    change – **there is no such thing as 'evolving' consent**."
13. **[OBSERVED, repo]** `src/screens/Article9ConsentScreen.js`
    (`CONSENT_VERSION = '2026-08-10'`) enumerates the covered data as
    weight, body composition, food diary, weekly check-ins, ED screening
    answers and progress-photo analysis. **Capability, restriction, injury
    and clinician-instruction data appear nowhere in that list.** The
    agreement statement is "I agree to Volyume using my **health and
    nutrition** data to coach me."
14. **[INFERENCE, high confidence]** Adding capability/restriction data
    therefore requires **both** a refreshed, version-bumped explicit consent
    **and** an updated privacy notice — not one or the other. Art 13(3)
    independently requires prior notice of further processing for a new
    purpose, and ICO requires new uses to be brought to people's attention
    **before** processing starts.
15. **[INFERENCE, high confidence — the sharpest risk found]** The existing
    gate is **all-or-nothing and pre-onboarding**: `RootNavigator.js` routes
    every signed-in non-local user through it, and the copy states that
    withdrawing "means closing your account and deleting your data". If
    accessibility-essential capability data is folded into that same bundle,
    a disabled user cannot obtain accommodation without also consenting to
    nutrition/ED-screening health processing they may not want. That sits
    badly against recital 43 ("Consent is presumed **not** to be freely
    given if it does not allow **separate consent** to be given to different
    personal data processing operations despite it being appropriate"), ICO
    ("consent should be unbundled … including giving separate granular
    consent options for different types of processing — wherever possible")
    and founder decision FD-1 (capability accommodation is free-tier core).
    **A separate, granular explicit consent for the capability purpose is
    the low-risk reading.**

### On minimisation, retention and downstream systems

16. **[REGULATOR]** ICO, data minimisation: "For special category data …
    it is **particularly important** to make sure you collect and retain
    **only the minimum** amount of information", and "You **must not**
    collect personal data on the off-chance that it might be useful in the
    future."
17. **[REGULATOR]** The closest ICO analogue to "store the restriction, not
    the reason" is its sickness-vs-absence distinction: "A simple absence
    record, **without any details of a worker's health condition**, is not
    likely to be special category data … You could, and you may prefer, to
    use absence records instead of sickness records where practical. These
    are generally **less intrusive**." The analogy supports storing the
    functional rule and *not* the reason — but note the analogy's limit: an
    absence record carries no bodily information at all, whereas "avoid
    overhead loading" does. It reduces sensitivity; it does not exit
    Article 9.
18. **[REGULATOR]** ICO ADM checklist, verbatim: "We **delete any special
    category data accidentally created**." That is the cleanest regulator
    hook for a policy of not persisting volunteered diagnoses.
19. **[ESTABLISHED]** Art 5(1)(e) storage limitation plus recital 39
    ("time limits should be established by the controller for erasure **or
    for a periodic review**") is the anchor for expired restrictions: an
    expiry date that only stops *use* while retaining the record
    indefinitely does not by itself satisfy storage limitation.
20. **[ESTABLISHED + REGULATOR]** Consent withdrawal has teeth. EDPB
    Guidelines 05/2020 paras 117 and 119 `[PDF-extracted]`: "the controller
    must stop the processing actions concerned. If there is no other lawful
    basis justifying the processing (e.g. further storage of the data), they
    should be deleted"; "Controllers have an **obligation to delete** data
    that was processed on the basis of consent once that consent is
    withdrawn, assuming that there is no other purpose justifying the
    continued retention." Art 17(1)(b) mirrors this and expressly names
    Art 9(2)(a).
21. **[INFERENCE, high confidence]** An **append-only constraint timeline is
    not an erasure exemption.** Art 17(3) lists the exemptions exhaustively
    (freedom of expression, legal obligation, public interest task, public
    health under Art 9(2)(h)/(i), archiving/research under Art 84B, legal
    claims). "We need the history so the coaching engine's learning stays
    consistent" is **not** among them. A versioned history of Article 9 data
    must be erasable on request, and must not be the only thing keeping the
    data alive after consent withdrawal.
22. **[ESTABLISHED]** Art 20(1)(a) names **Art 9(2)(a)** explicitly — if
    explicit consent is the Article 9 condition and Art 6(1)(a) or 6(1)(b)
    is the lawful basis, capability data is **portable**, and the export
    must be structured, commonly used and machine-readable.
23. **[REGULATOR]** ICO DPIA screening list includes "**Denial of
    service**: Decisions about an individual's access to a product, service,
    opportunity or benefit that is based to any extent on automated
    decision-making (including profiling) **or involves the processing of
    special category data**." Capability-driven filtering of exercises,
    plans and library content is squarely described by that criterion.
    **[INFERENCE, high confidence]** A DPIA is required before launch.
24. **[REGULATOR]** DUAA 2025 relaxed solely-automated decision-making
    generally but "**keeps the restriction on the use of special category
    personal information**": such decisions still need explicit consent or a
    substantial-public-interest condition. **[INFERENCE, medium]** Exercise
    substitution is unlikely to be a "significant decision" with legal or
    similarly significant effect, but the analysis should be recorded rather
    than assumed, especially if capability state ever gates access to paid
    features or content.

### On UK law beyond GDPR

25. **[ESTABLISHED]** Equality Act 2010 s.29(1)+(7) applies the reasonable
    adjustments duty to service providers, and Schedule 2 para 2(2) makes it
    **anticipatory**: "the reference in section 20(3), (4) or (5) to a
    disabled person is to **disabled persons generally**." The duty does not
    wait for a disabled user to ask.
26. **[ESTABLISHED]** s.20(6): where the adjustment relates to the provision
    of information, reasonable steps "include steps for ensuring that … the
    information is provided in an **accessible format**."
27. **[INFERENCE, medium-high]** The two regimes pull in opposite
    directions and the tension is real, not rhetorical: the Equality Act
    pushes towards knowing enough to accommodate; GDPR pushes towards
    holding as little as possible. The reconciliation the sources support is
    **functional granularity** — collect the accommodation-relevant
    capability, never the underlying condition.

---

## Q1 — Is user-declared functional-limitation data without a diagnosis "data concerning health" (Art 4(15)) and special category data (Art 9)?

**Short finding: yes, on the evidence, it should be treated as such.**
Confidence: high. The absence of a diagnosis affects sensitivity and
minimisation, not classification.

### The operative definitions

**UK GDPR Art 4(15)** (legislation.gov.uk, as in force):

> "(15) 'data concerning health' means personal data related to the physical
> or mental health of a natural person, including the provision of health
> care services, **which reveal information about his or her health
> status**;"

`[ESTABLISHED]` — https://www.legislation.gov.uk/eur/2016/679/article/4

**UK GDPR Art 9(1)**:

> "1. Processing of personal data revealing racial or ethnic origin,
> political opinions, religious or philosophical beliefs, or trade union
> membership, and the processing of genetic data, biometric data for the
> purpose of uniquely identifying a natural person, **data concerning
> health** or data concerning a natural person's sex life or sexual
> orientation shall be prohibited."

`[ESTABLISHED]` — https://www.legislation.gov.uk/eur/2016/679/article/9

**Recital 35 GDPR** (consolidated EU text, EU Publications Office):

> "Personal data concerning health should include all data pertaining to the
> health status of a data subject which reveal information relating to the
> past, current or future physical or mental health status of the data
> subject. … and **any information on, for example, a disease, disability,
> disease risk, medical history, clinical treatment or the physiological or
> biomedical state of the data subject independent of its source**, for
> example from a physician or other health professional, a hospital, a
> medical device or an in vitro diagnostic test."

`[ESTABLISHED]` — CELEX 32016R0679, recital 35. Two phrases matter for this
design: **"disability"** is named, and **"independent of its source"** means
self-declaration by the user is as much health data as a clinician's note.
Recital 35 was quoted and relied on by the Court in C-184/20 at para 124 and
C-21/23 at para 76, so it is not merely soft interpretive material.

### What the ICO actually says

**ICO, "What is special category data?" — health data section:**

> "Health data can be about an individual's **past, current or future**
> health status. It not only covers specific details of medical conditions,
> tests or treatment, but includes **any related data which reveals anything
> about the state of someone's health**."

and the list beneath it opens with:

> "- any information on **injury, disease, disability** or disease risk,
> including medical history, medical opinions, diagnosis and clinical
> treatment;
> - medical examination data, test results, data from medical devices, or
> **data from fitness trackers**;"

`[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/

The same page pre-empts the "but a restriction isn't very sensitive"
argument:

> "These special categories of personal data are framed broadly and may also
> catch information that is not seen as particularly sensitive. For example,
> details about an individual's mental health are likely to be much more
> sensitive than whether they have a broken leg – **but both are data
> concerning health**. Given the potential risks to fundamental rights, it
> is important that you identify any special category data and approach it
> carefully, **even if you don't think it is particularly sensitive**."

And, directly linking disability to Article 9:

> "It is also important to be aware that some of the protected
> characteristics outlined in the Equality Act are classified as special
> category data. These include race, religion or belief, and sexual
> orientation. **They may also include disability, pregnancy, and gender
> reassignment in so far as they may reveal information about a person's
> health**."

`[REGULATOR]`, same page.

The ICO's employment guidance lists, among examples of processing workers'
health information, "**information about their impairment or disability**",
and states: "As this personal information reveals or concerns a person's
health, it is a type of special category data."
`[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/information-about-workers-health/data-protection-and-workers-health-information/

### What the regulators say about health inference from non-diagnostic app data

The Article 29 Working Party's annex "health data in apps and devices"
(letter to the European Commission, 5 February 2015) is the most on-point
regulator text that exists for a fitness app. Key passages `[PDF-extracted]`:

> "For data to qualify as health data it is **not always necessary to
> establish 'ill health'**."

> "Raw, relatively low privacy impact personal data can quickly change into
> health data when the dataset can be used to determine the health status of
> a person. To assess this, it does not suffice to look at the character of
> the data as is. **Their intended use must also be taken into account**, by
> itself, or in combination with other information."

> "It is critical to underline that this type of information is not neutral.
> **When conclusions are drawn about someone's health, regardless of their
> reliability, these conclusions are to be treated as health data.**"

> "In summary, personal data are health data when:
> 1. The data are inherently/clearly medical data
> 2. The data are raw sensor data that can be used in itself or in
>    combination with other data to draw a conclusion about the actual
>    health status or health risk of a person
> 3. **Conclusions are drawn about a person's health status or health risk**
>    (irrespective of whether these conclusions are accurate or inaccurate,
>    legitimate or illegitimate, or otherwise adequate or inadequate)"

`[REGULATOR]` —
https://ec.europa.eu/justice/article-29/documentation/other-document/files/2015/20150205_letter_art29wp_ec_health_data_after_plenary_annex_en.pdf

Note the same annex's contrasting example, which is the strongest available
argument *against* automatic classification of low-content fitness data:

> "if a diet app only counts the calories as calculated from input provided
> by the data subject, and the information about the specific foods eaten
> would not be stored, it would be unlikely that any meaningful conclusions
> can be drawn with regard to the health of that person"

`[REGULATOR]`, same annex. **[INFERENCE]** That carve-out does not reach
capability data. A calorie count is a number about behaviour; "cannot train
standing" is a statement about the body's function. Limb 1 and limb 3 of the
summary test are engaged directly.

**Caveat on status:** WP29 is the EDPB's predecessor and this annex pre-dates
the GDPR (it construes Directive 95/46 and the then-draft Regulation). I did
not find it in the EDPB's formal endorsement list. Treat it as persuasive
regulator reasoning, not binding guidance. Flagged for review.

### Applying it

**[INFERENCE, high confidence]** Each of the brief's example statements
reveals something about the physical state of the data subject's body:

| Declared statement | What it reveals |
|---|---|
| "cannot train standing" | a lower-limb, balance, or systemic functional impairment |
| "avoid overhead loading" | a shoulder/spine limitation or clinician restriction |
| "left-arm capability differs" | asymmetric physical function — laterality is itself a clinical-shaped signal |
| "physio said no overhead loading until September" | the above **plus** the provision of health care services, which Art 4(15) names in terms |

The fourth is the clearest of all: it is not merely a functional statement,
it is a report of a healthcare interaction, which Art 4(15) brings inside
"data concerning health" on the face of the text.

---

## Q2 — Does a disability/limitation flag differ legally from an equipment preference? How broadly is "reveals" read?

### The word "reveals" is read broadly, and the CJEU has said so twice

**Case C-184/20, OT v Vyriausioji tarnybinės etikos komisija**, Grand
Chamber, 1 August 2022, EU:C:2022:601. The relevant reasoning is paras
117–128. Verbatim:

> **Para 120.** "That being so, it should be determined whether data that are
> capable of revealing the sexual orientation of a natural person **by means
> of an intellectual operation involving comparison or deduction** fall
> within the special categories of personal data …"

> **Para 123.** "As the Advocate General has observed … whilst the use, in
> those provisions, of the verb '**reveal**' is consistent with the taking
> into account of processing not only of inherently sensitive data, **but
> also of data revealing information of that nature indirectly, following an
> intellectual operation involving deduction or cross-referencing**, the
> preposition 'concerning' seems, on the other hand, to signify the
> existence of a more direct and immediate link …"

> **Para 124.** "Such an interpretation, which would result in a distinction
> being drawn according to the type of sensitive data at issue, would not,
> however, be consistent with a contextual analysis of those provisions, **in
> particular with Article 4(15) of the GDPR**, according to which 'data
> concerning health' are personal data related to the physical or mental
> health of a natural person … which '**reveal**' information about his or
> her health status, and with **recital 35** …"

> **Para 125.** "Furthermore, **a wide interpretation** of the terms 'special
> categories of personal data' and 'sensitive data' is confirmed by the
> objective of … the GDPR … which is to ensure a high level of protection of
> the fundamental rights and freedoms of natural persons …"

> **Para 127.** "Consequently, those provisions **cannot be interpreted as
> meaning that the processing of personal data that are liable indirectly to
> reveal sensitive information concerning a natural person is excluded** from
> the strengthened protection regime …"

`[ESTABLISHED]` — CELEX 62020CJ0184, retrieved from the EU Publications
Office CELLAR (object `73030d0a-117c-11ed-8fa0-01aa75ed71a1`); ordinarily
displayed at
https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62020CJ0184

Para 124 is the load-bearing one for this campaign: the Court used the
**health** definition to justify reading *all* the categories broadly, and
in doing so confirmed that "data concerning health" is itself a *reveal*
test rather than an inherency test.

### The health-specific application: Case C-21/23

**Case C-21/23 (Lindenapotheke)**, Grand Chamber, 4 October 2024 — the Court
applied the C-184/20 doctrine directly to health data:

> **Para 78.** "Thus, where the data on purchases of medicinal products
> **allow conclusions to be drawn as to the health status** of an identified
> or identifiable person, they must be regarded as data concerning health
> within the meaning of Article 4(15) of the GDPR."

> **Para 83.** "Therefore, in order for personal data to be classified as
> data concerning health … **it is sufficient that they are capable of
> revealing information about the health status of the data subject by means
> of an intellectual operation involving collation or deduction**."

> **Para 87.** "That fundamental prohibition is **independent of whether or
> not the information revealed by the processing operation in question is
> correct** and of whether **the data controller is acting with the aim** of
> obtaining information that falls within one of the special categories …
> the objective of those provisions is to prohibit such processing,
> **irrespective of its stated purpose and the accuracy of the information**
> in question."

> **Para 90.** "Consequently, the information which customers … enter when
> ordering online pharmacy-only medicinal products the sale of which does
> not require a prescription constitutes data concerning health … **even
> where it is only with a certain degree of probability, and not with
> absolute certainty**, that those medicinal products are intended for those
> customers."

`[ESTABLISHED]` — Case C-21/23, judgment of 4 October 2024; CELEX
62023CJ0021, retrieved from CELLAR (object
`c3c3e732-8238-11ef-a67d-01aa75ed71a1`). (I did not verify the ECLI number
from a primary source and therefore do not state it.)

**Why this case matters more than any other for CC25:** the data at issue
were a **name, a delivery address and a product identifier** — no diagnosis,
no clinical record, no prescription, and not even certainty that the product
was for the purchaser. The Court still held it to be Article 9 health data.
The distance between that fact pattern and "user X declared: avoid overhead
loading" is, if anything, in the direction of *more* clearly health-related,
not less.

### The ICO's UK position on inference — and where it diverges

The ICO changed its position and says so on the page:

> "We have updated our guidance on inferred special category data. **The
> guidance no longer focuses on the certainty of an inference** as a
> relevant factor to decide whether it counts as special category data. Our
> underlying policy position has not changed, but we're explaining it in a
> different way to make our position clearer."

The operative current test:

> "Whether or not inferred data counts as special category data and triggers
> Article 9 depends on whether:
> - **your processing intends to make an inference** linked to one of the
>   special categories of data; or
> - **you intend to treat someone differently** on the basis of inferred
>   information linked to one of the special categories of data.
>
> If this is the case, then you are processing special category data
> **regardless of how confident you are that the inference is correct**."

and:

> "If you carry out any form of profiling which infers things like ethnicity,
> beliefs, politics, **health status (condition or risks)**, sexual
> orientation or sex life, you will be processing special category data and
> **must identify an Article 9 condition** for processing."

The ICO also preserves a genuine safe harbour, which is the one place a
"preference" lane could live:

> "However, you do not have to treat all such names or images as special
> category data in every instance. For example, you do not need a special
> category condition just to hold these names or images on a customer
> database."

`[REGULATOR]` — ICO, "What is special category data?", section "What about
inferences?".

**The divergence, stated plainly.** `[INFERENCE, high confidence]` UK (ICO)
= intent-gated: no intent to infer and no differential treatment → possibly
outside Article 9. EU (CJEU C-21/23 para 87) = intent-irrelevant: capability
to reveal is enough. For a UK controller with EU users, the EU reading is
the binding constraint on the EU-facing analysis and is also the safer
single standard to build to. Building to the ICO's looser test alone would
leave the EU exposure unaddressed.

### So: does a restriction flag differ from an equipment preference?

**[INFERENCE, high confidence] Yes, and the difference is real, but it is
fragile.**

- **Equipment availability** ("no barbell", "home gym, dumbbells only")
  describes the user's environment, not their body. Nothing about health
  status follows. It sits inside the ICO's "you do not need a special
  category condition just to hold these" safe harbour, and there is no
  intellectual operation of deduction that reaches health status from
  "owns dumbbells".
- **Exercise preference** ("I dislike front squats") describes taste.
  Same analysis — **provided** the controller does not use it to infer
  anything about the body.
- **Capability / restriction** ("cannot train standing", "avoid overhead
  loading") describes the body's function. Deduction to health status is
  immediate.

Three ways the distinction collapses, all of which the sources support and
all of which are live risks in the CC25 design as sketched:

1. **Field collapse.** If C31's `PATTERN_AVOID` intent continues to carry
   both "I don't like this" and "I can't do this" in one undifferentiated
   record, then every row in it is capable of revealing incapacity, and the
   whole table inherits Article 9. C-21/23 para 87 removes any argument that
   the *majority* of rows being preferences saves the minority.
2. **Aggregation.** WP29: raw data "can quickly change into health data when
   the dataset can be used to determine the health status of a person …
   in combination with other information". A preference set that happens to
   exclude every overhead, every unilateral-right and every standing
   movement reveals by its shape what no single row states.
3. **Purpose.** The ICO's intent limb bites on *use*. If preference data is
   ever fed into a capability inference ("this user avoids everything
   overhead — flag a possible shoulder limitation"), the preference data
   becomes special category data at that moment. **[INFERENCE]** Any
   "observed discomfort discovery prompt" of the kind floated in the
   challenge pass is exactly such an inference and must be designed as
   Article 9 processing from the start.

---

## Q3 — Lawful basis and Article 9 condition; explicit consent mechanics; what adding capability data requires

### Two layers, always

**UK GDPR Art 9(2)**, opening words as amended for the UK:

> "2. Paragraph 1 shall not apply if **[the processing is based on Article
> 6(1) and]** one of the following applies:
> (a) the data subject has given **explicit consent** to the processing of
> those personal data for **one or more specified purposes**, except where
> [domestic law provides] that the prohibition referred to in paragraph 1
> may not be lifted by the data subject;"

`[ESTABLISHED]` — https://www.legislation.gov.uk/eur/2016/679/article/9

**ICO:**

> "you must identify **both** a lawful basis under Article 6 **and** a
> condition for processing special category data under Article 9."

> "Your choice of lawful basis under Article 6 does not dictate which
> condition you must apply, and vice versa. … if your lawful basis is
> consent, it is likely to make sense to use explicit consent for special
> category data."

`[REGULATOR]` — ICO, "What are the rules on special category data?"
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/

### Which Article 9 condition is realistically available

**[INFERENCE, high confidence]** For a commercial fitness app, the realistic
options collapse to one:

- **9(2)(a) explicit consent** — available. ICO: "Explicit consent is the
  only condition that can apply to a wide range of circumstances, and in
  some cases may be your only option."
- **9(2)(h) health or social care** — not available. It requires processing
  "by or under the responsibility of a professional subject to the
  obligation of professional secrecy" (Art 9(3), and DPA 2018 s.11(1)).
  Volyume has no such professional in the loop. **A restriction the user
  attributes to their physio does not import the physio's status.**
- **9(2)(f) legal claims**, **9(2)(c) vital interests**, **9(2)(g)
  substantial public interest** — none fit routine coaching. ICO on vital
  interests: "This condition only applies if the individual is physically or
  legally incapable of giving consent."

### The UK-specific simplification

**DPA 2018 s.10(1)** lists the Article 9(2) points that require a Schedule 1
condition:

> "(1) Subsections (2) and (3) make provision about the processing of
> personal data described in Article 9(1) of the UK GDPR … in reliance on an
> exception in one of the following points of Article 9(2)—
> (a) point (b) (employment, social security and social protection);
> (b) point (g) (substantial public interest);
> (c) point (h) (health and social care);
> (d) point (i) (public health);
> (e) point (j) (archiving, research and statistics)."

`[ESTABLISHED]` — https://www.legislation.gov.uk/ukpga/2018/12/section/10

**Point (a) — explicit consent — is absent from that list.** `[INFERENCE,
high confidence]` Relying on Art 9(2)(a) therefore requires **no** Schedule 1
condition and **no** appropriate policy document. ICO confirms the APD
requirement attaches to Schedule 1 conditions ("Schedule 1 (at paragraphs 5
and 38 to 41) also includes additional requirements for you to keep an
appropriate policy document"). The documentation duty (records of
processing, documented categories) still applies.

### What "explicit" adds

**ICO:**

> "'Explicit consent' is not defined in the UK GDPR, but must meet the usual
> UK GDPR standard for consent. In particular, it must be **freely given,
> specific, affirmative (opt-in) and unambiguous, and able to be withdrawn
> at any time**. In practice, the extra requirements for consent to be
> 'explicit' are likely to be:
> - explicit consent must be **confirmed in a clear statement (whether oral
>   or written)**, rather than by any other type of affirmative action;"

> "The 'explicit' element of any consent should also be **separate from any
> other consents you are seeking**, in line with the guidance in Recital 43
> on appropriate **granular control**."

`[REGULATOR]` — ICO, "What are the conditions for processing?" (special
category data).
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/

ICO, employment guidance: "**You cannot infer explicit consent from
someone's actions.**" `[REGULATOR]`

**EDPB Guidelines 05/2020, para 93** `[PDF-extracted]`:

> "The term *explicit* refers to the way consent is expressed by the data
> subject. It means that the data subject must give an **express statement
> of consent**. An obvious way to make sure consent is explicit would be to
> expressly confirm consent in a written statement."

https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf

### Granularity

**Recital 43 GDPR:**

> "Consent is **presumed not to be freely given** if it does not allow
> **separate consent to be given to different personal data processing
> operations** despite it being appropriate in the individual case, or if
> the performance of a contract, including the provision of a service, is
> dependent on the consent despite such consent not being necessary for such
> performance."

`[ESTABLISHED]` — CELEX 32016R0679, recital 43.

**ICO:**

> "consent should be **unbundled** from other terms and conditions
> (including giving **separate granular consent options for different types
> of processing**) wherever possible."

> "recital 43 says separate consent will be needed for different processing
> operations wherever appropriate – so you need to give granular options to
> consent separately to separate purposes, **unless this would be unduly
> disruptive or confusing**. And in every case, a consent request must
> specifically cover all purposes for which you seek consent."

`[REGULATOR]` — ICO, "What is valid consent?"
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/what-is-valid-consent/

**EDPB Guidelines 05/2020, para 60** `[PDF-extracted]`: "Consent mechanisms
must not only be granular to meet the requirement of 'free', but also to
meet the element of 'specific'. … **Granular consent options should be
provided to allow data subjects to consent separately to separate
purposes**."

### Consent as a condition of service

ICO leaves a door open, and this matters for a feature that genuinely cannot
work without the data:

> "If you need to process special category data to **provide a service to
> the individual**, explicit consent may be available as your condition for
> processing that data **even if it is a condition of service**. However,
> you must be confident that you can demonstrate consent is still freely
> given. In particular, that the processing is **actually objectively
> necessary** to perform the contractual service, and not just included in
> your terms for broader business purposes."

`[REGULATOR]` — ICO, conditions for processing.

**[INFERENCE, high confidence]** This is per-purpose, not per-app. Capability
data is objectively necessary for capability-aware training; it is **not**
objectively necessary for nutrition coaching, and nutrition/ED-screening data
is not objectively necessary for capability-aware training. That asymmetry is
precisely what recital 43 and the ICO's unbundling guidance target.

### What adding capability data to the existing gate requires

**Observed repo facts (2026-08-20).** `src/screens/Article9ConsentScreen.js`:

- `CONSENT_VERSION = '2026-08-10'`; the file comment states
  `PRIVACY_CONSENT_LOCKED.md` prints this screen's copy.
- The enumerated "what we use" list is: bodyweight and its change over time;
  body-fat percentage and lean mass; everything logged to the food diary;
  weekly check-ins including energy, recovery and feeling; the ED screening
  questions; progress photos plus photo-analysis derivatives.
- The agreement statement: *"I agree to Volyume using my health and
  nutrition data to coach me."*
- Withdrawal copy: *"You can withdraw this consent at any time in Settings >
  Privacy and legal. Because Volyume cannot run health-data coaching without
  it, withdrawing means closing your account and deleting your data …"*
- `src/navigation/RootNavigator.js` routes every signed-in, non-local user
  through `Article9ConsentStack` when `healthConsent !== true`, before
  onboarding and irrespective of tier.

**Nothing in that enumeration covers capability, restriction, injury,
laterality, or clinician-attributed instructions.**

Against that, the ICO is unambiguous:

> "You need to keep your consents under review and **refresh them if your
> purposes or activities evolve beyond what you originally specified**.
> Consent will not be specific enough if details change – **there is no such
> thing as 'evolving' consent**."

> "Even if your new purpose is considered 'compatible' with your original
> purpose, this does not override the need for consent to be specific. If
> you were relying on consent you therefore need to **either get fresh
> specific consent, or else identify a new lawful basis** for the new
> purpose."

`[REGULATOR]` — ICO, "What is valid consent?"

**EDPB Guidelines 05/2020** `[PDF-extracted]`: "controllers **do need to
obtain a new and specific consent** if purposes for data processing change
after consent was obtained or **if an additional purpose is envisaged**."

Separately and independently, the transparency duty bites:

**UK GDPR Art 13(3):**

> "3. Where the controller intends to further process the personal data for
> a purpose other than that for which the personal data were collected, the
> controller shall provide the data subject **prior to that further
> processing** with information on that other purpose …"

`[ESTABLISHED]` — https://www.legislation.gov.uk/eur/2016/679/article/13

**ICO:** "If you plan to use personal data for a new purpose, we **update our
privacy information and communicate the changes to individuals before
starting any new processing**." and "Inform people about any new uses of
personal data **before** you actually start the processing."
`[REGULATOR]` — ICO, right to be informed.
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/

**Answer to the question as asked — [INFERENCE, high confidence]: both, not
either.**

1. **Fresh explicit consent** covering the capability purpose and naming the
   capability data categories, with a bumped `CONSENT_VERSION`, recorded
   per-user with timestamp and version (the existing `record_health_consent`
   RPC pattern already supports versioned recording).
2. **Updated privacy notice** deployed and surfaced **before** any capability
   data is processed.
3. **[INFERENCE, high confidence]** A **separate, granular** capability
   consent rather than an extension of the existing bundle, for three
   reasons that stack:
   - recital 43's presumption against non-separable consents;
   - the ICO unbundling guidance, which is only relaxed where separation
     would be "unduly disruptive or confusing" — hard to argue for a
     distinct feature with a distinct purpose;
   - the withdrawal asymmetry. The current bundle's withdrawal consequence
     is **account closure**. Attaching accessibility-essential data to a
     consent whose withdrawal destroys the account means a disabled user's
     only route to accommodation runs through an all-or-nothing health
     consent — which sits directly against ICO's "people must be able to
     refuse consent **without detriment**" and against FD-1's decision that
     capability accommodation is free-tier core.
4. **[INFERENCE, medium]** A separate capability consent needs its own,
   proportionate withdrawal consequence: withdrawal should disable
   capability-aware filtering and delete the capability records, **not**
   close the account. Under Art 17(1)(b) and EDPB paras 117–119 the deletion
   is mandatory anyway once consent goes and no other basis applies.

**Open dependency:** whether the existing consent is legally capable of
covering the new purpose depends on the exact wording in
`docs/PRIVACY_CONSENT_LOCKED.md` and the privacy policy as published, which
Audit K owns. My reading of the on-screen enumeration says it does not.

---

## Q4 — Data minimisation applied to this design

### The principle and the special-category emphasis

**Art 5(1)(c) UK GDPR:** "adequate, relevant and limited to what is
necessary in relation to the purposes for which they are processed ('data
minimisation')". `[ESTABLISHED]`
https://www.legislation.gov.uk/eur/2016/679/article/5

**ICO, data minimisation guidance:**

> "you should identify the **minimum** amount of personal data you need to
> fulfil your purpose. You should hold that much information, **but no
> more**."

> "**For special category data or criminal offence data, it is particularly
> important to make sure you collect and retain only the minimum amount of
> information.**"

> "You **must not collect personal data on the off-chance that it might be
> useful in the future**."

> "If you are **holding more data than is actually necessary** for your
> purpose, this is likely to be **unlawful** (as most of the lawful bases
> have a necessity element) as well as a breach of the data minimisation
> principle. Individuals will also have the right to erasure."

`[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/

The ICO's own worked example is close to this design's fact pattern:

> "A recruitment agency places workers in a variety of jobs. It sends
> applicants a general questionnaire, which includes **specific questions
> about health conditions that are only relevant to particular manual
> occupations. It would be irrelevant and excessive to obtain such
> information** from an individual who was applying for an office job."

`[REGULATOR]`, same page. **[INFERENCE]** Read across: asking every user
health-shaped questions in onboarding, when only some users need
accommodation, is the failure mode this example describes. Capability
questions should be reachable, offered and unmissable — but not compulsory
inputs for users with nothing to declare. Note the tension with the Equality
Act anticipatory duty (Q6): the resolution is *offer prominently, require
nothing*.

### "avoid overhead loading" vs the free-text reason vs a diagnosis

There is no ICO guidance addressing this exact triad. The closest published
regulator reasoning is the ICO's sickness-vs-absence distinction:

> "**Sickness record** … **Absence record**: This is a record that may give
> the reason for absence as 'sickness' or 'accident' but **does not include
> any reference to specific medical conditions**. You could, and you may
> prefer, to use absence records instead of sickness records where
> practical. These are generally **less intrusive** to workers' privacy. **A
> simple absence record, without any details of a worker's health
> condition, is not likely to be special category data.**"

> "Where possible, you should keep sickness and injury records containing
> details of a worker's illness or medical condition **separate** from other
> less sensitive information, for example a simple record of absence."

> "You should **not use sickness or injury records when you only need
> information about the length of an absence**. Similarly, you should not
> use sickness records for a particular purpose when you can use records of
> absence instead."

`[REGULATOR]` — ICO,
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/information-about-workers-health/how-do-we-handle-sickness-and-injury-records/

**[INFERENCE, high confidence]** The structural lesson transfers cleanly and
supports a three-tier design:

| Tier | Example | Position |
|---|---|---|
| **Store** | structured functional restriction: `avoid_overhead_loading`, laterality `left`, expiry `2026-09-30` | The minimum needed to deliver the accommodation. Still Article 9. |
| **Avoid storing** | free-text "reason" field | Not necessary to resolve the prescription. Unbounded sensitivity. Every extra clause is data the minimisation principle asks you to justify. |
| **Never store** | diagnosis a user typed voluntarily | Not necessary for any product purpose; maximally sensitive; increases breach severity for no functional gain. |

Where the analogy **stops**, stated honestly: an absence record contains no
bodily information at all, which is why ICO says it is "not likely to be
special category data". A functional restriction *does* contain bodily
information. **The tiering reduces sensitivity, breach severity and DPIA
risk; it does not move the structured restriction out of Article 9.**

### Declining to store volunteered data

There is no ICO guidance that squarely addresses "a user volunteered a
diagnosis; may we decline to keep it?". The supporting material is:

- **Minimisation is a hard limit, not a floor set by the data subject.**
  Art 5(1)(c) is expressed as an obligation on the controller; nothing in it
  is waivable by the data subject offering more. ICO: holding more than
  necessary "is likely to be **unlawful**". `[ESTABLISHED + REGULATOR]`
- **ICO's ADM checklist, verbatim:** "☐ We don't use special category data
  in our automated decision-making systems unless we have a lawful basis to
  do so, and we can demonstrate what that basis is. **We delete any special
  category data accidentally created.**" `[REGULATOR]` —
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/rights-related-to-automated-decision-making-including-profiling/
- **Art 25(2) data protection by default:** "the controller shall implement
  appropriate technical and organisational measures for ensuring that, **by
  default, only personal data which are necessary for each specific purpose
  of the processing are processed**. That obligation applies to **the amount
  of personal data collected, the extent of their processing, the period of
  their storage** and their accessibility." `[ESTABLISHED]` —
  https://www.legislation.gov.uk/eur/2016/679/article/25

**[INFERENCE, high confidence]** The sources support declining to persist a
volunteered diagnosis, and support it as the *default-correct* behaviour,
not merely a permitted one. Two design consequences:

1. **Structured input beats free text.** A closed vocabulary of functional
   demands (H4 in the challenge pass) is not just an engineering
   convenience; it is the minimisation control. A free-text field is a
   channel through which users will type diagnoses, medication, mental
   health information and third-party data, and the controller will then be
   processing all of it.
2. **If free text ships at all**, `[INFERENCE, medium]` it needs: an
   explicit in-context warning not to include diagnoses or names; a length
   cap; exclusion from analytics and crash payloads by construction; and a
   documented retention/review rule. None of that makes it minimal — it
   makes it defensible.

### Retention and deletion of expired restrictions

**Art 5(1)(e):** "kept in a form which permits identification of data
subjects **for no longer than is necessary** for the purposes for which the
personal data are processed". `[ESTABLISHED]`

**Recital 39:** "**This requires, in particular, ensuring that the period for
which the personal data are stored is limited to a strict minimum.** …
In order to ensure that the personal data are not kept longer than
necessary, **time limits should be established by the controller for erasure
or for a periodic review**." `[ESTABLISHED]`

**ICO, storage limitation:** "You need a **policy setting standard retention
periods** wherever possible"; "You should **review whether you still need
personal data at the end of any standard retention period, and erase or
anonymise it** unless there is a clear justification for keeping it for
longer. **Automated systems can flag records for review, or delete
information after a pre-determined period.** This is particularly useful if
you hold many records of the same type."; "If you don't have a set retention
period for the personal data, you must **regularly review** whether you still
need it." `[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/

**[INFERENCE, high confidence]** For CC25 specifically:

- An `expires_at` that only stops the restriction being *applied*, while the
  row lives on indefinitely, is a **use** control, not a **storage** control.
  Art 5(1)(e) asks about storage.
- Expired restrictions need a defined post-expiry life with a stated
  justification. A defensible justification exists (a user's shoulder
  restriction recurring seasonally; explaining why a past block looked as it
  did) — but it must be **written down, bounded and reviewed**, not implicit
  in an append-only table that never deletes.
- **[INFERENCE, medium]** The append-only design and storage limitation can
  be reconciled by tiering the history: keep the *fact* that a constrained
  interval existed (needed for evidence-eligibility of past training data)
  for the life of the training history, while purging the *content* of the
  restriction (which functional demand, which side, what reason) on a
  shorter clock. Whether the residual interval marker is still Article 9
  data is itself a question for counsel — my view is that a bare "training
  during this interval was constrained" marker, still attached to the user,
  probably remains capable of revealing health status under C-21/23 para 83
  and so remains Article 9, but with much lower sensitivity.

---

## Q5 — Special category data in crash reporting, analytics, support logs, export and erasure

### 5a. Is the *existence* of a restriction special category data?

**[INFERENCE, medium-high confidence: yes, very likely.]** Reasoning chain,
each step sourced:

1. An analytics event carrying a user id, installation id or device id is
   **personal data**: Art 4(1) includes identification "**indirectly**, in
   particular by reference to an identifier such as a name, an
   identification number, location data, an **online identifier**"
   `[ESTABLISHED]`; recital 26: "Personal data which have undergone
   pseudonymisation, which **could be attributed** to a natural person by
   the use of additional information **should be considered to be
   information on an identifiable natural person**." `[ESTABLISHED]`
2. Classification does not require content: it is "sufficient that they are
   **capable of revealing** information about the health status of the data
   subject by means of an intellectual operation involving collation or
   deduction" (C-21/23 para 83), and probability suffices (para 90).
   `[ESTABLISHED]`
3. An event named `restriction_added` for user X supports exactly one
   deduction: user X has declared a limitation on what their body can do.
4. On the UK test, the ICO's second limb — "you intend to **treat someone
   differently** on the basis of inferred information linked to one of the
   special categories" — is satisfied by the product's core behaviour.
   `[REGULATOR]`
5. WP29 limb 3: conclusions drawn about health status are health data
   "irrespective of whether these conclusions are accurate or inaccurate".
   `[REGULATOR]`

**Practical consequence [INFERENCE]:** stripping the *value* from a telemetry
event does not declassify the event. Options that actually work:

- **Do not emit** per-user capability telemetry at all.
- **Emit only genuinely anonymous aggregates** — recital 26: "The principles
  of data protection should therefore not apply to anonymous information …
  personal data rendered anonymous in such a manner that the data subject is
  **not or no longer identifiable**." `[ESTABLISHED]` The bar is
  identifiability including by **singling out**, so per-user event rows with
  a stable pseudonymous id do **not** clear it; a nightly cohort count with
  a suppression threshold plausibly does. **[INFERENCE, medium]** — the
  anonymisation assessment is exactly the sort of thing counsel and a DPIA
  should sign off, not an engineer.
- If per-user capability telemetry is genuinely needed, treat it as Article
  9 processing inside the same explicit consent, and say so in the notice.

### 5b. Crash reporting (Sentry)

Findings, not advice:

- **Classification is unchanged by the destination.** If a crash payload's
  breadcrumbs, state snapshot, redux/zustand dump, request body or error
  message contains restriction data, that payload contains Article 9 data.
  Nothing in Art 9 or Art 4(15) turns on whether the data is in a database
  or a stack trace. `[INFERENCE, high confidence]`
- **The crash reporter is a processor.** Art 28(1): "the controller shall
  use **only processors providing sufficient guarantees** to implement
  appropriate technical and organisational measures in such a manner that
  processing will meet the requirements of this Regulation and ensure the
  protection of the rights of the data subject." Art 28(2): no sub-processor
  without authorisation. `[ESTABLISHED]` —
  https://www.legislation.gov.uk/eur/2016/679/article/28
- **Security is proportionate to sensitivity.** Art 5(1)(f) requires
  "appropriate security … using appropriate technical or organisational
  measures"; recital 51 explains that special categories "merit specific
  protection as the context of their processing could create significant
  risks to the fundamental rights and freedoms". `[ESTABLISHED]`
- **Default-off is the Art 25(2) position.** "by default, **only** personal
  data which are necessary for each specific purpose of the processing are
  processed. That obligation applies to the **amount** of personal data
  collected, the **extent** of their processing …" `[ESTABLISHED]`
- **[INFERENCE, high confidence]** The defensible engineering position is
  **allow-list scrubbing, not deny-list scrubbing**: capability/restriction
  fields must be unable to reach the reporter by construction (excluded at
  serialisation), rather than removed by a regex that a future field name
  will slip past. The repo already has `sentryScrub.js`; **[INFERENCE]** it
  should be extended and, more importantly, pinned by a source-level
  regression guard of the kind CLAUDE.md §3 already describes, because a new
  capability field added six months from now is exactly the failure this
  guards against.
- **Residency.** EU-Dublin residency is a founder inviolable, so any
  reporter region setting is a hard constraint rather than a preference. I
  make no finding on any particular vendor's actual data flows — that is a
  vendor-contract and DPA question for counsel, not something I can
  establish from regulator sources.

### 5c. Support logs

**[INFERENCE, high confidence]** A support conversation in which a user
explains their limitation is Article 9 data in a support system, with the
same classification and the same erasure/access obligations, and typically
weaker access controls and longer retention than the product database. ICO's
access-control guidance for health information transfers directly: "You
should **not make the sickness, injury or absence records** of individual
workers **available to others, unless it is necessary for them to do their
jobs**" and "You should make it clear to those accessing … records **when it
is and is not necessary** to access the full … records." `[REGULATOR]`

### 5d. Access (Art 15) and portability (Art 20)

**Art 15(1)** requires confirmation, access to the data, and the purposes,
categories, recipients, envisaged storage period, rights information, source
and ADM logic. **Art 15(3):** "The controller shall **provide a copy of the
personal data undergoing processing**". `[ESTABLISHED]` —
https://www.legislation.gov.uk/eur/2016/679/article/15

**DUAA change, now in force in the UK text — Art 15(1A):** "Under paragraph
1, the data subject is only entitled to such confirmation, personal data and
other information as the controller is able to provide **based on a
reasonable and proportionate search**." `[ESTABLISHED]` — same URL.

**Recital 63** expressly contemplates health data in access requests and
endorses self-service: "**Where possible, the controller should be able to
provide remote access to a secure system** which would provide the data
subject with direct access to his or her personal data." `[ESTABLISHED]`

**Art 20(1)(a)** grants portability where "the processing is based on consent
pursuant to point (a) of Article 6(1) **or point (a) of Article 9(2)** or on
a contract pursuant to point (b) of Article 6(1)" and is carried out by
automated means. `[ESTABLISHED]` —
https://www.legislation.gov.uk/eur/2016/679/article/20

**[INFERENCE, high confidence]** Because explicit consent (Art 9(2)(a)) is
the realistic condition, **capability and restriction data is portable**, and
the export must include it in a structured, commonly used, machine-readable
form. An export that emits workouts and nutrition but silently omits the
capability timeline would be incomplete for both Art 15 and Art 20.
**[INFERENCE, medium]** Art 20(4) ("shall not adversely affect the rights and
freedoms of others") is the hook for withholding any third-party content a
user typed into free text — another reason free text is a liability.

### 5e. Erasure versus append-only / audit-trail retention

**Art 17(1)** grounds relevant here: "(a) the personal data are **no longer
necessary** in relation to the purposes …; (b) the data subject **withdraws
consent** on which the processing is based according to point (a) of Article
6(1), **or point (a) of Article 9(2)**, and where there is no other legal
ground for the processing". `[ESTABLISHED]` —
https://www.legislation.gov.uk/eur/2016/679/article/17

**Art 17(3)** exemptions, in full: freedom of expression and information;
compliance with a legal obligation under domestic law or a public-interest
task; public health under Art 9(2)(h)/(i) and 9(3); archiving in the public
interest / scientific or historical research / statistics in accordance with
Art 84B where erasure would render it impossible or seriously impair it; and
the establishment, exercise or defence of legal claims. `[ESTABLISHED]`

**ICO** restates the same list and adds two special-category-specific
carve-outs (public health; preventive/occupational medicine and health/social
care **where processed by or under the responsibility of a professional
subject to a legal obligation of professional secrecy**). `[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/

**[INFERENCE, high confidence] There is no "audit trail" or "model integrity"
exemption.** The closest is Art 17(3)(d) archiving/research, which requires
compliance with Art 84B (UK) / Art 89 (EU) safeguards and is aimed at
research and archiving in the public interest — not at a commercial
recommender keeping its training history tidy. A design that treats the
append-only constraint timeline as immutable will be unable to answer a valid
erasure request.

**On backups**, ICO is workable and specific:

> "If a valid erasure request is received and no exemption applies then you
> will have to take steps to ensure erasure **from backup systems as well as
> live systems**. … You must be **absolutely clear with individuals** as to
> what will happen to their data when their erasure request is fulfilled,
> including in respect of backup systems. … **The key issue is to put the
> backup data 'beyond use'**, even if it cannot be immediately overwritten.
> You must ensure that you do not use the data within the backup for any
> other purpose …"

`[REGULATOR]`, same page. **[OBSERVED]** The existing Article 9 consent copy
already promises "backup copies are purged within 30 days", which is
consistent with this approach and should be honoured for capability data too.

**[INFERENCE, high confidence] Design implications for the append-only
model:**

1. Erasure must be able to **hard-delete the whole constraint timeline** for
   one user, on all devices and in Supabase, not merely tombstone it.
2. Withdrawal of the capability consent is an Art 17(1)(b) trigger in its own
   right — deletion is not discretionary once no other basis applies (EDPB
   paras 117, 119).
3. Any derived artefact that **encodes** the restriction — a cached
   "effective plan" that omits every overhead movement, a per-set evidence
   tag, a learning weight derived from constrained blocks — is itself
   personal data derived from Article 9 data, and erasure must reach it or
   render it non-attributable. **[INFERENCE, medium-high]** This is the
   sync-and-derivation problem H3 in the challenge pass already identified,
   arriving from the legal side.
4. Multi-device append-only sync creates a fan-out erasure surface: an
   interval written on device B and pulled to device A must be erasable from
   both. **[INFERENCE]** Worth an explicit test.

### 5f. DPIA

**Art 35(3)(b)** automatically requires a DPIA for "processing **on a large
scale** of special categories of data referred to in Article 9(1)".
`[ESTABLISHED]`

**ICO's Art 35(4) list** includes, without any "in combination" qualifier:

> "**Denial of service**: Decisions about an individual's access to a
> product, service, opportunity or benefit that is based to any extent on
> automated decision-making (including profiling) **or involves the
> processing of special category data**."

and, with an in-combination qualifier, "**Innovative technology**",
"**Data matching**: combining, comparing or matching personal data obtained
from multiple sources", and "**Risk of physical harm**: where the processing
is of such a nature that a personal data breach could jeopardise the
[physical] health or safety of individuals."

`[REGULATOR]` —
https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/

**[INFERENCE, high confidence]** Capability-aware filtering of exercises,
plans and library content is a decision about a person's access to features
and content that involves special category data. A DPIA is required, and it
must be completed **prior to** the processing (Art 35(1): "the controller
shall, **prior to the processing**, carry out an assessment").

### 5g. Automated decision-making after the DUAA

**ICO, DUAA summary:**

> "The pre-DUAA law also restricted the use of special category personal
> information in automated decision-making. An organisation could only use
> this information: with consent; or where necessary for reasons of
> substantial public interest, on the basis of UK law that includes suitable
> safeguards. **This section keeps the restriction on the use of special
> category personal information.**"

> "a decision is **based solely on automated processing** if there is **no
> meaningful human involvement** in taking it; … a decision is a
> **significant decision** if it has a legal effect, or a similarly
> significant effect …"

`[REGULATOR]` —
https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-duaa-summary-of-the-changes/data-protection/

**[INFERENCE, medium]** Substituting an exercise is unlikely to be a
"significant decision" in the Art 22 sense — ICO's examples are "automatic
refusal of an online credit application, and e-recruiting practices without
human intervention". But the analysis should be **recorded in the DPIA**
rather than assumed, and it changes if capability state ever determines
access to paid content, eligibility for a programme, or anything with a
commercial consequence. Note also that the user chooses to accept or
override each substitution — that user agency is itself a relevant fact for
the "solely automated" limb and is worth designing in deliberately.

---

## Q6 — UK law beyond GDPR: Equality Act 2010 and digital services

**Definition — s.6(1) Equality Act 2010:**

> "(1) A person (P) has a disability if—
> (a) P has a **physical or mental impairment**, and
> (b) the impairment has a **substantial and long-term adverse effect** on
> P's ability to carry out **normal day-to-day activities**."

`[ESTABLISHED]` — https://www.legislation.gov.uk/ukpga/2010/15/section/6

**Services — s.29(1) and (7):**

> "(1) A person (a '**service-provider**') concerned with the provision of a
> service to the public or a section of the public (**for payment or not**)
> must not discriminate against a person requiring the service by not
> providing the person with the service."

> "(7) A **duty to make reasonable adjustments** applies to— (a) a
> service-provider …"

`[ESTABLISHED]` — https://www.legislation.gov.uk/ukpga/2010/15/section/29

**The three requirements — s.20(3)–(6):**

> "(3) The **first requirement** is a requirement, where a **provision,
> criterion or practice** of A's puts a disabled person at a **substantial
> disadvantage** in relation to a relevant matter in comparison with persons
> who are not disabled, to take such steps as it is **reasonable** to have
> to take to avoid the disadvantage."

> "(5) The **third requirement** is a requirement, where a disabled person
> would, but for the provision of an **auxiliary aid**, be put at a
> substantial disadvantage …, to take such steps as it is reasonable to have
> to take to provide the auxiliary aid."

> "(6) Where the first or third requirement relates to the provision of
> **information**, the steps which it is reasonable for A to have to take
> include steps for ensuring that in the circumstances concerned the
> information is provided in an **accessible format**."

> "(7) A person (A) who is subject to a duty to make reasonable adjustments
> is **not … entitled to require a disabled person … to pay to any extent
> A's costs of complying with the duty**."

`[ESTABLISHED]` — https://www.legislation.gov.uk/ukpga/2010/15/section/20

**The anticipatory character — Schedule 2, paragraph 2(2):**

> "(2) For the purposes of this paragraph, the reference in section 20(3),
> (4) or (5) to **a disabled person is to disabled persons generally**."

and para 2(3) modifies the second requirement so that A may "**adopt a
reasonable alternative method of providing the service**".

`[ESTABLISHED]` — https://www.legislation.gov.uk/ukpga/2010/15/schedule/2

### Findings

1. **[INFERENCE, high confidence]** Volyume is a service provider under Part
   3 (s.29(1) expressly covers services provided "for payment or not", so
   both the free and Pro tiers are in scope), and the reasonable-adjustments
   duty is **anticipatory** by virtue of Schedule 2 para 2(2). It is owed to
   "disabled persons generally" — it does not begin when a disabled user
   complains.
2. **[INFERENCE, high confidence]** s.20(7) is a direct constraint on
   product commercials: a service provider cannot require a disabled person
   to pay for compliance with the adjustments duty. That is independent
   statutory support for founder decision **FD-1** (core capability
   accommodation is not Pro-gated) — FD-1 is not merely generous, it is the
   posture that avoids arguing about s.20(7).
3. **[INFERENCE, medium-high]** A "provision, criterion or practice" plainly
   includes a plan generator that prescribes only standing, bilateral,
   overhead-capable movements. Capability-aware selection is, in Equality
   Act terms, the adjustment.
4. **[INFERENCE, medium]** s.20(6) (accessible format for information)
   reaches the *presentation* layer, not only exercise selection — screen
   reader labelling, dynamic type, contrast, timer accessibility. That is
   R4's territory; noted here only to record that it is a statutory duty in
   the UK and not merely best practice.
5. **[INFERENCE, high confidence] The two regimes pull against each other,
   and the tension must be resolved deliberately.** The Equality Act pushes
   towards knowing enough about a user to accommodate them; GDPR pushes
   towards holding as little as possible. The reconciliation the sources
   support: collect the **functional** fact required to make the adjustment,
   never the condition behind it; make declaring optional and prominent
   rather than compulsory (ICO's recruitment-questionnaire example above);
   and design the un-declared path to be usable, since the anticipatory duty
   is owed to users who never tell you anything.
6. **[REGULATOR]** ICO itself links the two regimes: "You should check
   whether your purposes for using sickness records may be further
   restricted by other legislation, such as the **Equality Act 2010** …" —
   confirming the interaction is real rather than theoretical.
7. **Out of scope but flagged:** the Public Sector Bodies (Websites and
   Mobile Applications) Accessibility Regulations 2018 apply to public sector
   bodies and do not bind Volyume. **[INFERENCE, low-medium]** The EU
   European Accessibility Act (Directive (EU) 2019/882), applicable from
   28 June 2025, may reach consumer-facing "e-commerce services" including
   mobile applications that conclude consumer contracts — which an in-app
   subscription arguably does. I did **not** research this to primary-source
   depth; it belongs to R4 and to counsel. Flagged, not concluded.

---

## PRACTICAL CLASSIFICATION TABLE

Confidence is my assessment of how firmly the cited sources support the
classification, not a legal opinion. "Art 9" means: treat as special
category data requiring an Art 6 basis **and** an Art 9 condition.

| # | Data element | Likely classification | Confidence | Key source |
|---|---|---|---|---|
| 1 | Structured functional restriction, e.g. `avoid_overhead_loading` | **Art 9 health data** | High | Art 4(15); Recital 35 ("disability"); C-21/23 §83, §90; ICO health-data list ("injury, disease, disability") |
| 2 | "Cannot train standing" (capability baseline) | **Art 9 health data** | High | As #1 |
| 3 | Laterality flag ("left-arm capability differs") | **Art 9 health data** | High | As #1; asymmetric function is a bodily fact |
| 4 | Clinician-attributed restriction ("physio said no overhead until September") | **Art 9 health data — highest sensitivity in the set** | Very high | Art 4(15) expressly includes "the provision of health care services"; Recital 35 |
| 5 | Expiry date attached to a restriction | **Art 9 (as an attribute of #1–#4)** | High | Inseparable from the record it qualifies |
| 6 | Free-text reason field (unconstrained) | **Art 9, unbounded scope; may capture third-party data** | High | Art 4(15); ICO minimisation ("only the minimum"); Art 20(4) third-party limit |
| 7 | Diagnosis a user volunteered into free text | **Art 9, maximal sensitivity; not necessary for any product purpose** | Very high | Recital 35 ("disease"); ICO "delete any special category data accidentally created" |
| 8 | Equipment availability ("no barbell") | **Ordinary personal data** | Medium-high | ICO safe harbour ("you do not need a special category condition just to hold these"); no deduction to health status |
| 9 | Exercise preference/dislike, stored separately from capability | **Ordinary personal data — conditional on separation** | Medium | ICO intent test; loses this status if merged with #1–#4, aggregated into a capability inference, or used to infer limitation |
| 10 | C31 `PATTERN_AVOID` as currently built (preference and incapacity in one record) | **Art 9 — the whole record type inherits it** | Medium-high | C-21/23 §87 (intent and correctness irrelevant); ICO intent limb met by product behaviour |
| 11 | Boolean "user has ≥1 active restriction" on the profile | **Art 9 health data** | Medium-high | C-21/23 §83, §90 ("capable of revealing", "certain degree of probability") |
| 12 | Analytics event `restriction_added`, user/device id, **no** content | **Art 9 health data** | Medium-high | Art 4(1) + Recital 26 (pseudonymous = personal); C-21/23 §83; ICO intent limb |
| 13 | Analytics event carrying the restriction taxonomy value | **Art 9 health data** | High | As #12, plus content |
| 14 | Genuinely anonymous aggregate (cohort counts, suppression threshold, no singling out) | **Outside GDPR if truly anonymous** | Medium | Recital 26; anonymisation must be assessed, not asserted |
| 15 | Crash report whose payload includes restriction state or breadcrumbs | **Art 9 health data, in a processor's systems** | High | Art 4(15); Art 28(1); Art 5(1)(f); Art 25(2) |
| 16 | Crash report with stack trace only, no capability state | **Ordinary personal data (device/user ids)** | Medium-high | Recital 26; classification depends on payload contents, which must be enforced by construction |
| 17 | Support-ticket transcript describing the limitation | **Art 9 health data** | High | Art 4(15); ICO access-control guidance for health records |
| 18 | Append-only constraint history (superseded versions) | **Art 9 health data; fully subject to Art 17** | High | Art 17(1)(a),(b); Art 17(3) exemptions are exhaustive and none apply |
| 19 | Derived "effective plan" that visibly omits a movement class | **Art 9-derived; erasure and access must reach it** | Medium-high | C-21/23 §83 (deduction from the shape of the output) |
| 20 | Per-set evidence tag marking "logged under constraint" | **Art 9-derived** | Medium-high | As #19 |
| 21 | Per-side (left/right) set logging values | **Ordinary personal data in isolation; Art 9 where joined to a laterality restriction** | Medium | WP29 aggregation reasoning; C-184/20 §123 (cross-referencing) |
| 22 | Pain / discomfort rating logged per set | **Art 9 health data** | High | Recital 35 ("physiological … state … independent of its source"); WP29 limb 2 |
| 23 | Consent record: version, timestamp, purpose granted | **Ordinary personal data; required accountability evidence** | High | Art 5(2); Art 7(1) |
| 24 | Backup copies of any of #1–#22 | **Same classification; erasure means "beyond use" then purge** | High | ICO right to erasure, backups section |

---

## NEEDS LEGAL REVIEW — register

Every item below is a conclusion or a fork that real counsel must confirm.
Ordered by how much of the CC25 architecture depends on it.

| # | Question for counsel | Why it matters | My provisional reading |
|---|---|---|---|
| L1 | Confirm that user-declared functional restrictions **without diagnosis** are Article 9 data under **both** UK GDPR and EU GDPR. | Determines the entire storage, consent, telemetry and erasure design. | Yes, high confidence (Art 4(15); Recital 35; C-21/23 §83/§90; ICO). |
| L2 | Confirm the **ICO intent test vs CJEU intent-independent test** divergence, and that building to the stricter CJEU standard satisfies both for a UK controller with EU users. | Determines whether a "no-intent" lane exists at all. | Build to the CJEU standard. |
| L3 | Confirm that **preference** data kept structurally separate remains outside Article 9, and confirm the separation conditions (no shared field, no capability inference, no aggregation into a limitation signal). | Decides whether CC25 can keep a non-Article-9 lane, and whether C31 `PATTERN_AVOID` must be split. | Separation works but is fragile; the current merged design likely does not qualify. |
| L4 | Confirm that **adding capability data requires fresh explicit consent, not an amended notice alone** — assessed against the actual wording in `docs/PRIVACY_CONSENT_LOCKED.md` and the published privacy policy, which I did not review. | If wrong in either direction, either unnecessary re-consent friction or unlawful processing. | Both fresh consent and an updated notice. |
| L5 | Confirm whether capability consent must be **separate and granular** from the existing all-or-nothing Article 9 gate, given that withdrawal of the existing gate closes the account and capability support is free-tier accessibility (FD-1). | The single highest-risk finding in this report. Bundling may make the consent not freely given, and may itself raise Equality Act questions. | Separate granular consent, with a proportionate withdrawal consequence. |
| L6 | Confirm that **Art 9(2)(a)** is the only realistic condition, and that **DPA 2018 Schedule 1 and the appropriate policy document are not engaged**. | Removes or imposes a documentation workstream. | Only 9(2)(a); no Schedule 1, no APD (s.10(1) omits point (a)). |
| L7 | Confirm the retention and deletion rule for **expired restrictions**, and whether a residual "constrained interval" marker with the content purged is still Article 9. | Decides whether the append-only timeline can survive storage limitation. | Tiered: purge content on a shorter clock; the residual marker probably remains Article 9 but at much lower sensitivity. |
| L8 | Confirm that **no Art 17(3) exemption** covers retaining an append-only capability history for coaching-model integrity. | If wrong, the erasure design is over- or under-built. | No exemption; erasure must reach the whole timeline and its derivatives. |
| L9 | Confirm the classification of **content-free capability telemetry** (`restriction_added` with a user or device id). | Decides whether any per-user capability analytics can ship. | Article 9; either drop it or bring it inside the consent and notice. |
| L10 | Confirm the **anonymisation threshold** for aggregate capability metrics (cohort size, suppression, singling-out risk). | Decides whether any capability product analytics exist at all. | Aggregates with a suppression threshold are plausible; the assessment must be documented, not asserted. |
| L11 | Confirm the **crash-reporting** posture: allow-list scrubbing, region, processor terms and sub-processor authorisation for Article 9 payloads. | Breach severity and Art 28/32 exposure. | Exclude capability data by construction; pin with a regression guard. |
| L12 | Confirm that a **DPIA is mandatory** before launch and identify who signs it. | Art 35(1) requires it *prior to* the processing. | Mandatory (ICO "denial of service" criterion; likely Art 35(3)(b)). |
| L13 | Confirm the **Art 22 / DUAA analysis**: is capability-driven selection a "significant decision" based solely on automated processing? | Would impose explicit-consent-plus-safeguards obligations on the engine. | Probably not significant; record the reasoning; re-test if capability ever gates paid content. |
| L14 | Confirm the **Equality Act s.20(7)** reading — that core accommodation cannot be charged for — and its boundary against legitimately Pro features. | Determines the free/Pro line for accessibility features. | Supports FD-1; the boundary between "adjustment" and "premium feature" needs counsel. |
| L15 | Confirm whether the **European Accessibility Act** applies to Volyume as an e-commerce service in the EU from 28 June 2025. | A whole compliance regime if it applies. | Not researched to depth; flagged only. Belongs with R4. |
| L16 | Confirm the **status and weight of the WP29 mHealth annex** (2015, pre-GDPR, EDPB endorsement not confirmed). | Several classification arguments lean on it. | Persuasive, not binding; the CJEU authorities carry the weight regardless. |
| L17 | Confirm the current **EU adequacy position for the UK** (reported renewal 19 December 2025, term to 27 December 2031) against the Commission's own decision. | Affects the EU-Dublin ↔ UK flow analysis. | Reported by secondary sources only; I could not reach the primary text (EUR-Lex blocked). |
| L18 | Confirm whether **free text should ship at all**, and if so its controls (warning copy, length cap, analytics/crash exclusion, retention). | Minimisation, breach severity, Art 20(4) third-party data. | Prefer a closed structured vocabulary; free text only with the full control set. |
| L19 | Confirm the **withdrawal consequence** for capability consent (disable and delete, not account closure) and its interaction with the existing gate. | User-facing and hard to change later. | Proportionate, capability-scoped withdrawal. |
| L20 | Confirm the treatment of **third-party data** users may enter (a named physio, a family member's condition). | Art 5(1)(a) fairness, Art 14 notice to third parties, Art 20(4). | Design it out; do not accept third-party identifiers. |

---

## Source list

**Primary — UK statute** (all legislation.gov.uk, as in force 2026-08-20)

- UK GDPR Art 4 — https://www.legislation.gov.uk/eur/2016/679/article/4
- UK GDPR Art 5 — https://www.legislation.gov.uk/eur/2016/679/article/5
- UK GDPR Art 9 — https://www.legislation.gov.uk/eur/2016/679/article/9
- UK GDPR Art 13 — https://www.legislation.gov.uk/eur/2016/679/article/13
- UK GDPR Art 15 — https://www.legislation.gov.uk/eur/2016/679/article/15
- UK GDPR Art 17 — https://www.legislation.gov.uk/eur/2016/679/article/17
- UK GDPR Art 20 — https://www.legislation.gov.uk/eur/2016/679/article/20
- UK GDPR Art 25 — https://www.legislation.gov.uk/eur/2016/679/article/25
- UK GDPR Art 28 — https://www.legislation.gov.uk/eur/2016/679/article/28
- UK GDPR Art 35 — https://www.legislation.gov.uk/eur/2016/679/article/35
- Data Protection Act 2018 s.10 — https://www.legislation.gov.uk/ukpga/2018/12/section/10
- Data Protection Act 2018 Schedule 1 — https://www.legislation.gov.uk/ukpga/2018/12/schedule/1
- Equality Act 2010 s.6 — https://www.legislation.gov.uk/ukpga/2010/15/section/6
- Equality Act 2010 s.20 — https://www.legislation.gov.uk/ukpga/2010/15/section/20
- Equality Act 2010 s.29 — https://www.legislation.gov.uk/ukpga/2010/15/section/29
- Equality Act 2010 Schedule 2 — https://www.legislation.gov.uk/ukpga/2010/15/schedule/2

**Primary — EU law and case law**

- Regulation (EU) 2016/679 (GDPR), consolidated text with recitals — CELEX
  32016R0679; canonical ELI https://eur-lex.europa.eu/eli/reg/2016/679/oj
  (retrieved via EU Publications Office CELLAR, `Accept:
  application/xhtml+xml`, because EUR-Lex was WAF-blocked)
- Case **C-184/20**, *OT v Vyriausioji tarnybinės etikos komisija*, Grand
  Chamber, 1 August 2022, EU:C:2022:601 — CELEX 62020CJ0184; CELLAR object
  `73030d0a-117c-11ed-8fa0-01aa75ed71a1`
- Case **C-21/23** (*Lindenapotheke*), Grand Chamber, 4 October 2024 — CELEX
  62023CJ0021; CELLAR object `c3c3e732-8238-11ef-a67d-01aa75ed71a1`

**Regulator guidance — ICO**

- What is special category data? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/
- What are the rules on special category data? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/
- What are the conditions for processing? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/
- Consent — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/
- What is valid consent? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/what-is-valid-consent/
- Principle (c): data minimisation — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/
- Principle (b): purpose limitation — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/purpose-limitation/
- Principle (e): storage limitation — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- Right to be informed — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/
- Right of access — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-of-access/
- Right to data portability — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/
- Right to erasure — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/
- Rights related to automated decision making including profiling — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/rights-related-to-automated-decision-making-including-profiling/
- When do we need to do a DPIA? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/
- DUAA 2025 — summary of the changes: data protection — https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-duaa-summary-of-the-changes/data-protection/
- Employment: data protection and workers' health information — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/information-about-workers-health/data-protection-and-workers-health-information/
- Employment: how do we handle sickness and injury records? — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/information-about-workers-health/how-do-we-handle-sickness-and-injury-records/

**Regulator guidance — EDPB / WP29**

- EDPB Guidelines 05/2020 on consent under Regulation 2016/679, v1.1 — https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf
- Article 29 Working Party, annex to the letter to the European Commission
  on mHealth: "health data in apps and devices", 5 February 2015 — https://ec.europa.eu/justice/article-29/documentation/other-document/files/2015/20150205_letter_art29wp_ec_health_data_after_plenary_annex_en.pdf

**Secondary / unverified**

- Reported renewal of the EU adequacy decisions for the UK on 19 December
  2025, six-year term to 27 December 2031, with a four-year mid-point
  review. Reported by law-firm and specialist commentary; **not verified
  against the Commission's decision** because EUR-Lex was unreachable.
  `[COMMENTARY]` — see NEEDS LEGAL REVIEW L17.

**Repo files read for grounding (not modified)**

- `/home/user/ADPhysique/src/screens/Article9ConsentScreen.js`
- `/home/user/ADPhysique/src/navigation/RootNavigator.js`
