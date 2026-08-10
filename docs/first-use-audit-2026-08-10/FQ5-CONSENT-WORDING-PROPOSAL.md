# FQ-5 — exact wording proposal for founder review (NOTHING LANDED)

Prepared 2026-08-10 under the FQ-5 ruling: all six directions approved
in principle, exact locked-copy wording gated on this review. Nothing
below is committed to any screen or locked document until you approve
the wording (per item or as a batch). No behaviour changes ride this.
British English; no em dash in user-facing copy.

---

## Item 1 — withdrawal consequence on the consent screen

CURRENT (Article9ConsentScreen.js:237):
> You can withdraw this consent at any time in Settings > Privacy &
> legal.

PROPOSED:
> You can withdraw this consent at any time in Settings > Privacy and
> legal. Because Volyume cannot run health-data coaching without it,
> withdrawing means closing your account and deleting your data, the
> same as the choice below.

Rationale: Art 7(3) informing-before-consent; the decline path already
states the deletion consequence, so this removes an inconsistency
rather than adding new legal theory. "The choice below" refers to the
existing "What if I don't agree?" expander on the same screen. Also
corrects the label to match the actual Settings row ("Privacy and
legal", audit C-8).

---

## Item 2 — locked record vs shipped screen reconciliation

Facts (audit C-4): the shipped screen carries three blocks absent from
PRIVACY_CONSENT_LOCKED.md's locked copy, and the screen's
CONSENT_VERSION = '2026-07-04' claims to mirror a locked-copy date
that does not exist in the document.

The three shipped-only blocks, verbatim:
1. "Anonymous measurement numbers from photo analysis (never the
   photos, never your name or account) to keep scoring accurate for
   every body type" (bullet under "What Volyume looks at")
2. "Volyume Score is a simple progress read, not a medical measure,
   DEXA scan, diagnosis, or medical advice. It may abstain or ask for
   a retake when photo quality is poor."
3. "A safety check that runs in the background: Volyume checks your
   weight trend, energy, and food logs together for signs of
   under-fuelling or disordered eating. If a concerning pattern shows
   up, it pauses your calorie changes and points you to support."

Why they exist: all three arrived with the progress-photos programme
(founder-approved 2026-07-03) and the D81 calibration telemetry
(founder order 2026-07-13) - they describe REAL shipped behaviour and
each has a consent-relevant purpose (naming the calibration upload,
bounding the Volyume Score claim, disclosing the background safety
check). None contradicts the locked copy; the locked record simply
was never updated.

PROPOSED RECONCILIATION: the shipped screen text becomes the
canonical record. PRIVACY_CONSENT_LOCKED.md is updated to print the
shipped copy verbatim (with items 1 and 4 of this proposal applied,
if approved) under a "Locked 2026-05-23, revised 2026-07-04, revised
<landing date>" header, and CONSENT_VERSION is bumped to the landing
date so the audit trail's pointer resolves to the exact text users
see. The screen changes only where this proposal's other items change
it. Alternative if you prefer: rule any of the three blocks OUT of
the consent screen - say which, and the screen loses it instead
(behaviour would then need its own review; none is recommended).

Also in the same pass (approved direction "document what the extras
are"): PRIVACY_CONSENT_LOCKED.md:27's "SCOFF screener responses at
onboarding" corrected (onboarding does not ask; the screener lives in
Coach > Safety checks), matching the FQ-1(c) doc corrections.

---

## Item 3 — scan-calibration upload in the privacy policy

Facts (verified in code): after a photo scan, ONE row of measurement
ratios goes to a cloud table. The stored row carries no user id, no
photo, no note, no exact timestamp (day resolution) and height/weight
only in 5-unit bands (progressScanCalibrationTelemetry.js). The row
is sent over the user's authenticated connection, but no identifier
is stored with it. Founder allow-listed accounts (yours) may attach
extra vision-debug to their OWN rows (D83); ordinary users never do.

NUANCE FOR YOUR CALL: the stored data is unlinkable by construction,
but because the insert arrives on an authenticated session, a claim
of strict anonymity depends on the server not retaining connection-
level attribution. Two wording options:

OPTION A (keeps "anonymous", describes the mechanism so the claim is
verifiable) - add to PrivacyPolicyScreen's data section:
> When you use photo analysis, Volyume sends one set of anonymous
> measurement numbers (body-shape ratios, with height and weight
> grouped into 5-unit bands) to improve scoring accuracy for every
> body type. These numbers are stored without your name, account,
> photo or exact time, and cannot be traced back to you. This is
> separate from the usage-data setting and stops if you stop using
> photo analysis.

OPTION B (more conservative label):
> ...sends one set of de-identified measurement numbers... They are
> stored without your name, account, photo or exact time.
(rest identical)

Recommendation: Option A is defensible on the stored-data test
(recital 26) and matches the consent screen's existing "anonymous"
bullet; Option B is the safer label if you want zero linkage
argument. Either way the policy stops being silent about the upload.

---

## Item 4 — placement of the data-leaving-device bullet

CURRENT: the "Anonymous measurement numbers..." bullet sits under
"What Volyume looks at" (a list otherwise describing on-device
reads).

PROPOSED: the bullet moves to the screen's sharing/transmission
section ("What we never do with it" gains a truthful sibling heading
"What leaves your phone:") with the same text as approved in item 3's
label choice, so transmission is disclosed under transmission. The
"What Volyume looks at" list keeps only on-device reads. No content
removed; one bullet relocated under an accurate heading.

---

## Item 5 — progressive disclosure of the consent block

PROPOSED STRUCTURE (no words removed; the full text remains on the
one screen, available before consent):
1. The headline paragraph and "What Volyume looks at" stay exactly
   where they are, always visible.
2. The three explanatory blocks (Volyume Score bounds, background
   safety check, what-we-never-do) become always-visible SHORT
   headings with their existing full text rendered beneath - the
   restructure is grouping and order only: looks-at → leaves-phone →
   never-do → safety check → withdrawal/decline.
3. The existing "What if I don't agree?" expander stays an expander
   (it already was; precedent for the pattern).
Nothing moves behind a tap that is not already behind one today; the
user scrolls one better-ordered screen. If you want any block
collapsed-by-default instead, say which - default here is NONE
collapsed, so consent stays fully informed on its face.

---

## Item 6 — wellbeing screener storage claim

CURRENT (WellbeingCheckScreen.js:176):
> Your answers are stored on this device and never shared without
> your permission.

FACTS: the five raw answers stay in AsyncStorage on the device; the
derived score syncs to your account's cloud row (it must, so safety
follows the account).

PROPOSED:
> Your answers stay on this device. Only the overall result is saved
> to your account, so your coaching stays adjusted if you change
> phones. Neither is ever shared outside Volyume.

Rationale: truthful split without publishing scoring mechanics or
thresholds; "overall result" names no number and teaches nothing
gameable.

---

## Approval requested

Reply per item (1-6) with: approved as proposed / approved with your
edit / rejected. Item 3 needs the A-or-B label choice. Item 2 needs
the canonical-source confirmation (shipped screen becomes the record)
or your alternative. Nothing lands until then.
