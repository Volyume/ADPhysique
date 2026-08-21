# DPIA / COUNSEL INPUT PACK (CC-F1) — CC32

Everything counsel needs to run the DPIA and the legal register, in one
place. Status: PREPARED, ENGAGEMENT PENDING (founder-external). Nothing
here is legal advice; conservative postures are IN FORCE until counsel
says otherwise.

## 1. Processing description (what the capability lane does)

- Users may record how they train: baseline rules (their normal) and
  temporary episodes, expressed as movement-demand rules (eleven-axis
  ontology since gap closure 2026-08-21), family rules, per-exercise
  rules and allowances. Source is
  self-declared or user-reported-as-clinician-advised (free text never
  stored for clinician identity; no clinician contact, no verification
  claimed).
- Data class: treated as ARTICLE 9 health data BY POSTURE (conservative
  assumption for counsel to confirm), because rules can reveal
  disability/health facts even when functionally worded.
- Storage: device SQLite (SQLCipher-encrypted) as source of truth;
  cloud sync to Supabase EU-Dublin (`capability_constraints`,
  `session_constraint_effects`; migrations 145-151 written, NOT yet in
  production). Weekly conditional check-in answer is DEVICE-LOCAL only
  (never synced).
- Consent: granular, separate from the app's general health-consent
  gate: `record_capability_consent` RPC + local flag; fail-closed reads;
  withdrawal tombstones the lane everywhere (erasure-first design).
  Restore of one's own export re-implies consent by derivation.
- Erasure: account deletion reaches the lane via `delete_user_data()`
  (migrate_145 recreation) + local wipe tables; Article 20 export ships
  in-app (JSON, CC26).

## 2. Purposes and lawful-basis questions for counsel

Q1 Confirm/deny Article 9 classification of demand-rule data as held.
Q2 Explicit-consent adequacy: our granular consent moment (wording in
   HowYouTrainScreen consent card) - sufficient for Art 9(2)(a)?
Q3 The interval-join learning-eligibility provenance (CC30) processes
   historical capability state to EXCLUDE learning - confirm this is
   within the consented purpose as worded.
Q4 Aggregate operational telemetry (section 29; counts + closed-
   vocabulary axis names, per-user keyed transport): acceptable as
   non-Article-9 operational data, or does keying require more?
   (Emission is live client-side; the server allow-list migration is
   NOT applied until this answer.)
Q5 Retention: constraint history is kept indefinitely for provenance
   (ended rows remain, CAP-14). Confirm posture or set limits.
Q6 The "clinician-reported" source label: any implied-verification
   risk in UK law? (We never claim verification anywhere.)
Q7 EAA / EN 301 549 applicability to Volyume (R4/R1 L15) and any
   accessibility-statement duty for the app/store listing.
Q8 Threshold/suppression review for any future telemetry DASHBOARD
   (R1 L10) - none exists yet; flag requirements now.

Q9 (LEG-30, added at gap closure 2026-08-21) The Training
   considerations directory: an optional, user-initiated, in-app
   knowledge surface where condition and injury NAMES appear
   (education + question selection). Selecting a profile stores
   NOTHING (stateless lens, GC-D1); only the confirmed functional
   rules persist, under the existing capability consent. Wording bans
   function/benefit/treatment vocabulary mechanically. Confirm: (a)
   this surface does not change the Article 9 posture (no new data is
   processed); (b) the wording posture is sufficient against the
   medical-device boundary (extends LR-3/LEG-23); (c) no additional
   notice is needed for a browse-only knowledge surface.

## 3. Risk register (pre-assessed, for the DPIA's Part 2)

- Inference risk: rules reveal disability without naming it.
  Mitigations: minimisation (functional vocabulary, no diagnosis
  fields anywhere, CAP-3 guard-tested), no third-party sharing, share
  cards never carry capability data, Sentry scrub covers the lane
  (CAP-20), partner surfaces derived-signals-only.
- Cross-device propagation: EU-Dublin only; registry sync with
  owner-scoped RLS; tolerated-mode (unapplied migrations) fails soft
  with no data loss class.
- Special-category telemetry leak: prevented by the content-free
  counters law (section 29) + capabilityGuards no-telemetry pins on
  lane modules + the events.js closed catalogue.
- Coercion/dignity: consent is optional, decline signposts consent-free
  lanes (33.15); no feature ransom (core accommodation free, CAP-19).

## 4. Documents for counsel (paths)

- ARCHITECTURE.md sections 5 (data model), 22 (state machine), 26
  (privacy), 28 (sync/offline), 29 (observability), 33 amendments.
- DECISION-REGISTER.md sections F (clinical), G (legal), H (founder).
- research/R1-legal-privacy.md, R2-medical-device-boundary.md,
  R4-mobile-accessibility.md.
- supabase/migrate_145..151 (schema + RPCs as written).
- MARKETING-READINESS-MATRIX.md + CLAIMS-STANDARDS.md section 9A.

## 5. What is blocked pending counsel

- Any telemetry dashboard over capability counters (R1 L10).
- Any population-labelled content (also CC-F3/CC-F6 gated).
- Any change to the conservative Article 9 posture.
Building and shipping the capability features themselves is NOT
blocked (architecture assumed the conservative posture throughout).
