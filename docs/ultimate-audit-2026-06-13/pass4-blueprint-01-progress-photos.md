# PASS 4 — BLUEPRINT 01: PROGRESS PHOTOS

Source basis: Pass-3 gap **C14 (progress photos = MISSING; measurements = parity)** ←
`pass3-gap-analysis.md`; market need corroborated 3/3 ← `pass2-adjudication.md` C14 (top user request;
private-by-default norm). This is a BLUEPRINT for founder certification — **no code written yet**. It
records exactly what already exists (with file:line), the decisions only the founder can make, and the
build contract contingent on those decisions. Per CLAUDE.md: present approaches, do not pick silently;
write a plan and wait for "go"; touch nothing safety/billing.

---

## 1. WHAT ALREADY EXISTS (verified this pass — do not rebuild)

- **Cloud table already provisioned:** `progress_photos` in `supabase/schema.sql:261-270` and
  `supabase/setup_complete.sql:251-257`:
  ```
  progress_photos (id UUID PK, user_id UUID→auth.users, photo_url TEXT NOT NULL,
                   photo_date DATE NOT NULL, pose TEXT, notes TEXT, created_at TIMESTAMP)
  ```
- **RLS already correct:** "Users can manage own photos" — `auth.uid() = user_id` USING + WITH CHECK
  (`setup_complete.sql:529-532`; `migrate_005_rls_hardening.sql:168-173`).
- **Index already present:** `idx_progress_photos_user_date ON progress_photos(user_id, photo_date DESC)`
  (`setup_complete.sql:628`).
- **Deletion already wired:** account/data deletion RPCs already DELETE `progress_photos`
  (`migrate_003`, `migrate_006`, `migrate_008` tolerant, `setup_complete.sql:654-657`, `nuke_uid_*`).
- **Sentry scrub already covers it:** scrubber spec asserts "All photo file paths and binary payloads"
  are scrubbed (`src/lib/__tests__/sentryScrub.test.js:10`).
- **Native deps already installed (no new dependency needed):** `expo-file-system ~19.0.23`,
  `expo-image ~3.0.11`, `react-native-vision-camera ^4.7.3` (`package.json:61,64,93`).
- **Measurements UI to attach to:** `src/screens/BodyMetricsScreen.js` (measurements list `:88-94`,
  trend charts `:307`, all-local copy "All data stays on your [device]" `:376`).
- **Sync pattern to mirror:** `src/lib/sync/tables/bodyComposition.js` (registry-key↔table-name split,
  LWW via `updated_at` trigger, soft-delete `deleted_at`, 200-row batched upsert on `(user_id,id)`;
  documented against `SYNC_ARCHITECTURE_LOCKED.md:156-238`).

**Implication:** this is NOT greenfield. The backend anticipated progress photos (table, RLS, index,
deletion, scrub) but **`src/` has ZERO implementation** (grep `progressphoto|photoUri.*progress` → 0 files).
The work is: capture/store UI + local table + sync wiring + gating — to an existing backend contract.

---

## 2. THE LOAD-BEARING DECISIONS (founder-only — they change the whole architecture)

### D1 — WHERE do the image bytes live? (privacy-critical)
The cloud `progress_photos.photo_url` is `TEXT NOT NULL` but **no Supabase Storage bucket exists anywhere**
(grep `bucket|storage\.|createBucket` across supabase/ + src/ → none). So image bytes must go to ONE of:
- **(A) LOCAL-ONLY** — bytes in `expo-file-system` app sandbox; `photo_url` = local file URI; photos
  NEVER leave the device; cloud row (if any) stores metadata only. **Most aligned with CLAUDE.md** ("no PII
  to any external service", offline-first, local = source of truth). Trade-off: photos lost on
  uninstall/device-loss; no cross-device.
- **(B) EU STORAGE SYNC** — bytes to a NEW Supabase Storage bucket in EU Dublin; `photo_url` = signed/path.
  Enables backup + cross-device. Trade-off: body images (sensitive PII) leave the device to Supabase;
  needs bucket + RLS + encryption decision; closest to what the `photo_url` column implies, but the
  heaviest privacy posture. **Requires explicit founder sign-off given the PII rules.**
- **(C) LOCAL-ONLY now, EU-sync later** — ship A, leave the cloud column unused until a separate decision.

### D2 — GATING tier (Free vs Pro)?
CLAUDE.md FREE includes "progress stats"; PRO includes "check-ins". Progress photos are not named in
either list. `BodyMetricsScreen` already has a Pro-gated behaviour (`pass1-section1-gating.md:44`,
`:460-461`). Decision: photos **Free** (retention hook for all; matches Hevy's free private photos) or
**Pro** (premium body-tracking bundle). I will not guess the tier.

### D3 — Schema authority (Pass-1 open Q1, unresolved)
`progress_photos` appears in BOTH `setup_complete.sql` and `schema.sql`, but Pass-1 Q1 logged that which
of setup_complete.sql / schema.sql / migrations is LIVE in production is **unresolved**
(`pass1-verification-artifact.md` Open Question). **Before any cloud sync (D1-B) is built, confirm the
table actually exists in the production DB.** Local-only (D1-A) does not depend on this.

---

## 3. PROPOSED BUILD (contingent on D1/D2; written for D1-A LOCAL-ONLY as the CLAUDE.md-default)

> If founder picks D1-B/C the sync section expands; everything else holds.

**3.1 Local SQLite table** (mirror `body_metric_log` shape, `database.js:228-247`):
```
progress_photo (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  photo_uri TEXT NOT NULL,        -- expo-file-system app-sandbox path
  photo_date INTEGER,             -- ms, bucketed by LOCAL day (cf useProgressData.js:280)
  pose TEXT,                      -- front|side|back|null
  notes TEXT,
  created_at INTEGER, updated_at INTEGER, deleted_at INTEGER  -- LWW + soft-delete, per migrate_047 pattern
)
CREATE INDEX idx_progress_photo_user ON progress_photo(user_id, photo_date DESC);
```
**3.2 Capture/store flow:** capture via existing `react-native-vision-camera` (or pick existing image);
persist the file into `FileSystem.documentDirectory` (app sandbox, not gallery); insert local row. Private
by default (C14 norm) — no gallery write, no share unless explicit.
**3.3 UI:** add a "Photos" section to `BodyMetricsScreen.js` (alongside measurements `:88-94`): date-sorted
thumbnails (`expo-image`), pose filter, **side-by-side before/after compare** (the recomp-reframing payoff
that pairs with C13/PR-F1), add/delete. Reuse `WindowChips`/trend window idiom already in the screen.
**3.4 Deletion:** local hard-delete removes the file from sandbox AND tombstones the row; account deletion
already covered server-side.
**3.5 Sync (only if D1-B/C):** new `src/lib/sync/tables/progressPhotos.js` mirroring `bodyComposition.js`
(LWW, soft-delete, batched upsert); register in SYNC_REGISTRY; upload bytes to the EU bucket first, then
store the returned path as `photo_url`. NOT built unless D1 selects cloud.

---

## 4. SAFETY / PRIVACY CONSTRAINTS (non-negotiable, carry into build)
- **No PII to third parties / EU residency** (CLAUDE.md ARCHITECTURE). Body photos are the most sensitive
  PII in the app — D1 must honour this; D1-A keeps it trivially compliant.
- **Sentry:** photo URIs/bytes must remain scrubbed — `sentryScrub.test.js:10` already asserts this; the
  build must keep that test green (add the new field if the scrubber enumerates fields).
- **Offline-first:** capture/view must work with no network (D1-A is inherently offline).
- **Coaching/safety engine UNTOUCHED:** photos are display-only; they feed NO coaching decision. Do not
  wire photos into `weeklyCoach`/`nutritionEngine`/`edPatternDetector`.
- **British English** in all UI strings.

## 5. TEST CONTRACT (the contract, written to fail — per CLAUDE.md build model)
- Local CRUD: insert/list/soft-delete round-trips; `photo_date` buckets by LOCAL day (cf
  `useProgressData.js:280-281` BST bug class).
- Privacy invariant: a stored photo URI never appears in a Sentry event (extend `sentryScrub.test.js`).
- File-lifecycle invariant: hard-delete removes the sandbox file (no orphaned bytes).
- Engine isolation invariant: no progress-photo symbol is imported by any `src/lib/*coach*`/`*nutrition*`/
  `*edPattern*` module (assert the boundary).
- (If D1-B) sync invariant: LWW refuses stale writes; tombstones propagate; bytes land in EU bucket only.
- `screen-mount.test.js` stays green with the new section.

## 6. WHAT THIS BLUEPRINT DOES NOT DO
- Does not write code, run migrations, or create a Storage bucket.
- Does not pick D1/D2 — those are founder decisions below.
- Does not assume `progress_photos` is live in production (D3 unresolved).

I have not self-certified. Every "exists" claim above cites a real file:line; the gap and market basis cite
Pass-3/Pass-2. Founder certifies; then I build to exactly the chosen D1/D2 path, one verifiable step at a
time with lint + full test after each.
