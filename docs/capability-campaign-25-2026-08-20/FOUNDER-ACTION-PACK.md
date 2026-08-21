# FOUNDER-ACTION-PACK (end of the capability workstream, 2026-08-21)

Only actions that genuinely cannot be done autonomously. Everything
else is complete and merged. One list, no duplicates; each row names
what it unlocks.

### A. PRODUCTION

- **Run migrations 145-150 against production** (your exact phrase, per
  supabase/README). Order: 145 → 146 → 147 → 148 → 149 → 150 (149
  needs 145's table; 150 is independent but batch it). Pre-checks per
  README (backup point; each file is additive + idempotent and was
  exercised twice on scratch Postgres). Until run: capability rows stay
  device-local with harmless push retries; custom-exercise pushes fail
  soft (migrate_143 tolerated mode); the five telemetry counters drop
  server-side. No user-visible breakage in the meantime.

### B. IOS

- **Delete the iOS provisioning profile** (one click, still blocking
  every iOS build): expo.dev → Account `volyume` → Project `volyume` →
  Credentials → iOS → `app.volyume` → App Store → delete the
  Provisioning Profile. KEEP the Distribution Certificate (serial
  4C11E6AEB51102841B0A3D62B64FDA85). Then re-run Build iOS (EAS).

### C. PHYSICAL VALIDATION

- **One consolidated device script**: PHYSICAL-VALIDATION-BACKLOG.md,
  now organised as eight journeys (A free baseline user; B temporary
  episode; C custom adapted exercise; D compatible programme/library;
  E coach/check-in/reintroduction; F accessibility; G export/delete/
  privacy; H unaffected training + ED-safety regression). Physical
  Android device, green EAS build. Journey F converts the matrix's
  A11Y gates from PARTIAL; journey H is the do-first regression sweep.

### D. DISABLED-USER VALIDATION (CC-F5)

- **Recruit and run round 1** using VALIDATION-PACKAGE.md as written
  (cohorts, recruitment wording, session script, severity and blocker
  definitions, capture format). Unlocks: USERVAL=YES per passing
  cohort on MARKETING-READINESS-MATRIX.md - one of the gates between
  every population claim and NO.

### E. CLINICAL REVIEW (CC-F6)

- **Engage the clinical reviewer** with CLINICAL-REVIEW-PACK.md - nine
  exact questions (CLIN-1..9) with the materials list. Unlocks:
  EXPERT gate on the matrix; also the recorded deferred behaviours
  (symptom-gated reintroduction, pacing coaching) become *discussable*,
  never automatic.

### F. PRIVACY / COUNSEL / DPIA (CC-F1)

- **Engage counsel** with DPIA-COUNSEL-INPUT-PACK.md - eight exact
  questions (Q1-Q8) with the processing description, risk register and
  document paths. Until answered, the conservative Article 9 posture
  stays in force (it blocks nothing that is built) and no telemetry
  dashboard may be created (R1 L10).

### G. MARKETING READINESS

- **Every population/support claim remains NO** -
  MARKETING-READINESS-MATRIX.md is the single authority and
  marketingClaimsGuard.test.js enforces it against the store listings
  and PRODUCT-FACTS mechanically. What converts each NO to YES, per
  row: CONTENT (coverage bar in the registry), A11Y (journey F on a
  real device), DOSSIER (CC-F3, populations only), EXPERT (item E),
  USERVAL (item D). Wording stays governed by CLAIMS-STANDARDS 9A and
  the R2 list regardless of readiness - readiness never unlocks
  medical language.

Standing choices already yours whenever you wish (not blockers): the
Grok/Gemini consultation prompts (EXTERNAL-CONSULTATION-QUEUE.md);
CC-F2/CC-F8 register questions (recommendations recorded); DEF-3
grip-limited pulling content (needs new curated content, tracked in
the registry).
