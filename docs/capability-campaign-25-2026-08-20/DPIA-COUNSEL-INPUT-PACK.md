# DPIA INTERNAL RECORD — capability lane (CC-F1 CLOSED INTERNALLY)

STATUS (founder law 2026-08-21, no-outside-party dependencies): the
former counsel questions Q1-Q9 are RESOLVED INTERNALLY below, each from
published authority (ICO UK GDPR guidance, MHRA software guidance,
platform policy) under a deliberately conservative posture, or scoped
out of the product. No solicitor engagement is pending, required or
awaited; nothing in this file is legal advice and none is needed to
operate the conservative postures recorded here. The filename is kept
so existing references resolve.

## 1. Processing description (what the capability lane does)

- Users may record how they train: baseline rules (their normal) and
  temporary episodes, expressed as movement-demand rules (eleven-axis
  ontology since gap closure 2026-08-21), family rules, per-exercise
  rules and allowances. Source is self-declared or
  user-reported-as-clinician-advised (free text never stored for
  clinician identity; no clinician contact, no verification claimed).
- Data class: treated as ARTICLE 9 health data DEFINITIVELY (ruling Q1
  below), because rules can reveal disability/health facts even when
  functionally worded.
- Storage: device SQLite (SQLCipher-encrypted) as source of truth;
  cloud sync to Supabase EU-Dublin (`capability_constraints`,
  `session_constraint_effects`; migrations 145-149 and 151 written, NOT
  yet in production; 150 RETIRED unapplied under ruling Q4). Weekly
  conditional check-in answer is DEVICE-LOCAL only (never synced).
- Consent: granular, separate from the app's general health-consent
  gate: `record_capability_consent` RPC + local flag; fail-closed reads;
  withdrawal tombstones the lane everywhere (erasure-first design).
  Restore of one's own export re-implies consent by derivation.
- Erasure: account deletion reaches the lane via `delete_user_data()`
  (migrate_145 recreation) + local wipe tables; Article 20 export ships
  in-app (JSON, CC26).

## 2. INTERNAL RULINGS Q1-Q9 (2026-08-21, published-authority basis)

Q1 ARTICLE 9 CLASSIFICATION - RULED: the demand-rule data IS treated as
   Article 9 special-category health data, permanently, not as a
   pending assumption. Basis: ICO special-category guidance counts data
   from which health status can be INFERRED; functional restriction
   rules support exactly that inference. This is the conservative end
   of the published position and it costs the product nothing.

Q2 EXPLICIT CONSENT - RULED SUFFICIENT after one copy correction. The
   consent moment meets the ICO's explicit-consent criteria: specific
   (names the exact data), informed (purpose, storage, deletion),
   affirmative and separate (its own agree step, decline keeps the app
   usable). CORRECTED the same day: "never shared" was technically
   loose because an EU processor stores the synced copy; the card now
   reads "never shared with anyone beyond the secure EU service that
   stores your Volyume data" (HowYouTrainScreen consent card). The
   privacy policy remains the full processor disclosure.

Q3 LEARNING-EXCLUSION PURPOSE - RULED IN PURPOSE: excluding
   capability-affected weeks from on-device learning is processing FOR
   the consented purpose ("build training around your body") and is
   protective of the user; it introduces no new purpose. Basis: ICO
   purpose-limitation guidance (compatible processing).

Q4 OPERATIONAL TELEMETRY - RULED AGAINST, RETIRED: the five capability
   counters, though content-free, would land in a per-user table where
   their PRESENCE reveals capability-lane use. Conservative resolution
   per ICO minimisation: no capability-derived event leaves the device
   at all. Client emission sites and catalogue entries removed;
   migrate_150 retired unapplied. Any future capability telemetry must
   be aggregate-only and identity-free by design, as a new migration.

Q5 RETENTION - RULED JUSTIFIED WITH A BOUND: constraint history
   (ended rows) is kept for the life of the consented lane because the
   learning shield's interval join NEEDS history to keep excluding
   affected periods correctly, and flare re-start needs saved shapes -
   a genuine, recorded product necessity (ICO storage-limitation:
   retain while necessary for the stated purpose). The bound: consent
   withdrawal or account deletion erases it all (tombstone + wipe).
   "Indefinite" beyond the lane's life is not claimed.

Q6 CLINICIAN-REPORTED LABEL - RULED KEPT: the label is the user's own
   report; no verification is claimed anywhere, no clinician identity
   is stored, and the precedence it earns is conservative (harder to
   override, never looser). Honest self-report labelling with no
   implied endorsement.

Q7 EAA / EN 301 549 - RULED: treat the European Accessibility Act as
   applicable to the EU offering (the app sells subscriptions; the
   conservative reading of the e-commerce scope applies from June
   2025). Product consequence: an accessibility statement will be
   drafted and published with the store listing as ordinary product
   work, and platform accessibility guidance continues to govern the
   build (R4 basis). No compliance is CLAIMED until the device walk
   passes; the statement will describe the honest state.

Q8 FUTURE DASHBOARDS - STANDING LAW: no telemetry dashboard over
   capability data exists or is planned; with Q4's retirement there is
   nothing to dashboard. If aggregate telemetry is ever rebuilt, any
   internal view must be aggregate-only with minimum-cohort
   suppression (published anonymisation practice: small groups are
   identifying) and no per-user drill-down.

Q9 DIRECTORY SURFACE (LEG-30) - RULED, three parts: (a) browsing and
   selecting stores NOTHING (GC-D1 statelessness, guard-tested), so no
   new personal data is processed and the Article 9 posture is
   unchanged; (b) the surface stays outside the medical-device
   boundary because its intended purpose is general fitness education
   and setup guidance - no diagnosis, treatment, monitoring or
   prediction function - with the vocabulary mechanically enforced
   (MHRA "Medical device stand-alone software including apps" guidance:
   intended purpose decides; R2 research basis); (c) no additional
   privacy notice is owed for a browse-only surface that collects
   nothing.

## 3. Risk register (DPIA part 2, maintained)

- Inference risk: rules reveal disability without naming it.
  Mitigations: minimisation (functional vocabulary, no diagnosis
  fields anywhere, CAP-3 guard-tested), no third-party sharing, share
  cards never carry capability data, Sentry scrub covers the lane
  (CAP-20), partner surfaces derived-signals-only.
- Cross-device propagation: EU-Dublin only; registry sync with
  owner-scoped RLS; tolerated-mode (unapplied migrations) fails soft
  with no data loss class.
- Special-category telemetry leak: ELIMINATED at source (Q4: no
  capability-derived events leave the device) + capabilityGuards
  no-telemetry pins on lane modules + the events.js closed catalogue.
- Coercion/dignity: consent is optional, decline signposts consent-free
  lanes (33.15); no feature ransom (core accommodation free, CAP-19).

## 4. Source documents (the rulings' evidence base)

- ARCHITECTURE.md sections 5 (data model), 22 (state machine), 26
  (privacy), 28 (sync/offline), 29 (observability), 33 amendments.
- DECISION-REGISTER.md sections F (clinical), G (legal), H (founder);
  GC-D12 records this closure.
- research/R1-legal-privacy.md (ICO guidance extracts),
  R2-medical-device-boundary.md (MHRA guidance extracts),
  R4-mobile-accessibility.md (EAA/EN 301 549 findings).
- supabase/migrate_145..149, 151 (schema + RPCs as written); 150
  retired.
- MARKETING-READINESS-MATRIX.md + CLAIMS-STANDARDS.md section 9A.

## 5. Standing conservative laws (previously "blocked pending counsel")

- No telemetry dashboard over capability data (nothing to dashboard
  after Q4; the Q8 law governs any future rebuild).
- Population-labelled marketing stays governed by the matrix and
  CLAIMS-STANDARDS (internal gates; see GC-D12 population ruling).
- The Article 9 posture is permanent product law, not a holding
  position.
