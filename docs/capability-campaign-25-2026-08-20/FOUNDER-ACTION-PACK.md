# FOUNDER-ACTION-PACK (end of the capability workstream, 2026-08-21)

Only actions that genuinely cannot be done autonomously. Everything
else is complete and merged. One list, no duplicates; each row names
what it unlocks.

DELIVERY NOTE (founder order 2026-08-21): this file is the internal
record. Every ask in it is delivered to the founder in chat as a
ready-to-use message; never point the founder at this file.

NO-OUTSIDE-PARTY LAW (founder, 2026-08-21, binding): Volyume does not
use solicitors, clinical reviewers, recruited disability panels, paid
experts or outside consultants as product or release dependencies. The
former items D (disabled-user recruitment), E (clinical review) and F
(counsel) are REMOVED: their questions were resolved internally from
published authority or scoped out (rulings in DPIA-COUNSEL-INPUT-PACK
and CLINICAL-REVIEW-PACK; register entry GC-D12). The two forwardable
question messages previously sent in chat are VOID - do not send them
to anyone. Only production, device and credential actions remain.

### A. PRODUCTION

- **Run migrations 145-149 and 151 against production** (your exact
  phrase, per supabase/README). Order: 145 → 146 → 147 → 148 → 149 →
  151 (149 needs 145's table; 151 is the gap-closure demand column).
  **150 is RETIRED and must NOT be run** (Q4 ruling: the capability
  telemetry counters were removed client-side; the file is a no-op kept
  for numbering). Pre-checks per README (backup point; each live file
  is additive + idempotent and was exercised on scratch Postgres).
  Until run: capability rows stay device-local with harmless push
  retries; custom-exercise pushes fail soft (migrate_143 tolerated
  mode). No user-visible breakage in the meantime.

### B. IOS

- **Delete the iOS provisioning profile** (one click, still blocking
  every iOS build): expo.dev → Account `volyume` → Project `volyume` →
  Credentials → iOS → `app.volyume` → App Store → delete the
  Provisioning Profile. KEEP the Distribution Certificate (serial
  4C11E6AEB51102841B0A3D62B64FDA85). Then re-run Build iOS (EAS).

### C. PHYSICAL VALIDATION (device testing - yours or any device you choose)

- **One consolidated device script**: PHYSICAL-VALIDATION-BACKLOG.md,
  organised as eight journeys plus the gap-closure sub-steps (A-plus
  discovery, C-plus adapted setup, D-plus new families, F-plus TalkBack
  discovery walk) (A free baseline user; B temporary episode; C custom
  adapted exercise; D compatible programme/library; E coach/check-in/
  reintroduction; F accessibility; G export/delete/privacy; H
  unaffected training + ED-safety regression). Physical Android device,
  green EAS build. Journey F converts the matrix's A11Y gates from
  PARTIAL; journey H is the do-first regression sweep.

### D. MARKETING READINESS (standing law, no action owed)

- **Every population/support claim remains NO** -
  MARKETING-READINESS-MATRIX.md is the single authority and
  marketingClaimsGuard.test.js enforces it mechanically. Conversion is
  now fully internal/device-side per GC-D12: CONTENT (coverage bar in
  the registry) + A11Y (journey F on a real device) + DOSSIER for any
  population-NAMED claim + the wording laws. EXPERT and USERVAL are
  truth fields, not gates: they stay NO unless such review/validation
  ever actually happens, and no claim may say or imply reviewed or
  user-tested while they are NO. Readiness never unlocks medical
  language.

Standing choices already yours whenever you wish (never blockers): the
Grok/Gemini consultation prompts (EXTERNAL-CONSULTATION-QUEUE.md -
optional ideation only, never a dependency); CC-F2/CC-F8 register
questions (recommendations recorded). DEF-3 closed at gap closure by
mechanism (GC-D7). Optional forever: if you ever choose to run
disabled-user sessions, VALIDATION-PACKAGE.md remains the ready how-to;
it is not required for anything.
