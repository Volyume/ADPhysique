# 05 — Security Audit

Status: **COMPLETE**
Date: 2026-05-31
Method: every security claim traces to code read in Phase 2 (file:line) or
to a command run this session (npm audit, RLS greps over `supabase/*.sql`).
No security property is inferred from general knowledge.

---

## Executive security verdict

**No critical or high client-side security defects found.** The app's
security posture is **strong and deliberate**: parameterised SQL throughout,
encrypted auth-token storage, server-authoritative tier/payments,
comprehensive RLS, and triple-layer PII/health-data scrubbing before
anything leaves the device. The findings are low/medium hardening items.

---

## 1. Authentication & session

- **Tokens stored encrypted** in `expo-secure-store`, not AsyncStorage
  (`supabase.js:3,7-17,33`). The SecureStore adapter wraps Supabase auth
  storage; `detectSessionInUrl:false` (`:36`) — deep-link auth handled
  manually. **Verified strength.**
- **Env-only credentials, no fallback constants** (`supabase.js:27-29`,
  returns `null` when unconfigured). No hardcoded Supabase URL/anon key.
- Sign-out wipes SecureStore tokens + local SQLite + AsyncStorage
  (`useAppStore.clearAuthStateForSignOut`). **But** `AsyncStorage.clear()`
  is over-broad (A2-019) — wipes device-scoped a11y/notif prefs too. Low.
- **A2-016 (medium, compliance):** Apple Sign-In uses the **browser OAuth
  flow**, not native `expo-apple-authentication`. App Store guideline 4.8
  requires native Sign in with Apple when other social logins (Google) are
  offered. **Submission-blocker risk**, not a vuln. → fix before iOS launch.

## 2. SQL injection — **none (verified by full-file scans)**
- `database.js`: **6 of 279** query calls use `${}` interpolation, and all
  6 interpolate **code-controlled identifiers** (table/column names from
  hardcoded whitelists / loop integers), never values; all values bound with
  `?` (A2-034).
- `food/db.js`: **0 of 54** interpolated. `seedExercises`/`seedRoutines`:
  **0**. No screen does string-built SQL (grep of `src/screens` empty).
- **Conclusion: the local SQLite layer is not SQL-injectable.**

## 3. Server / Supabase security
- **RLS is comprehensively applied** (verified by grep of `supabase/*.sql`):
  **102 `CREATE POLICY` statements**, RLS `ENABLE`d on ~40 tables — every
  user-scoped table (users_profile, workouts, workout_sets, food_entries,
  body_metrics, ed_pattern_flags, tier_history, nutrition_targets, …), with
  **40 files using `auth.uid()`-scoped predicates**.
- **Tier is server-owned**: `migrate_005` trigger rolls back client tier
  UPDATEs; `profiles` sync **excludes `tier`** from the push payload
  (`tables/profiles.js:16-19`); tier transitions go through `upgrade_tier`/
  `start_cascade` RPCs. **A user cannot forge Pro by editing local state.**
- **Payments server-authoritative**: receipt validation in the
  `play-billing-rtdn` Edge Function; RTDN webhook is the source of truth for
  renewal/cancel/refund; the client stub throws rather than faking
  entitlement (`playBilling.js:233-235`).
- **Account deletion server-side**: `delete-account` Edge Function +
  fallback RPC + local wipe (SettingsScreen:574). No client-only deletion
  leaving cloud orphans.
- Edge functions present: `delete-account`, `play-billing-rtdn`, `send-push`.
- > Server-side RLS *policy correctness* (the predicates themselves) is
  reviewed at the SQL level here by presence + `auth.uid()` scoping; a
  per-policy logic review is a server-side audit beyond the client scope,
  flagged for the founder's Supabase review.

## 4. PII / health-data exposure — **triple-layer scrubbing (verified)**
1. **`errorLog.redactPII`** (`:52-85`): comprehensive `PII_KEYS` (auth
   secrets, weight/body-fat/measurements, names, DOB, notes) redacted
   **before** the user-exportable ring buffer AND before forwarding to
   Sentry; `sanitizeStack` strips source-frame excerpts.
2. **`observability.redactPII`** (`:92-127`): same on every `track.*` call
   unless `allowPII`; `instrumentSupabase` records **metadata only** (table/
   op/duration/rowcount), never raw rows.
3. **`sentryScrub`** (`beforeSend`/`beforeBreadcrumb`): redacts sensitive
   keys + table-name strings + photo paths/base64; strips `event.user` to
   **id only**; depth-bounded. CI-audited against the schema.
- `DebugLogScreen` shares an **already-redacted** buffer (safe by
  construction). Feedback submissions disclose exactly what's attached and
  strip body measurements + names (`FeedbackSheet:335-337`).
- **Article 9 health-data consent** gate is mandatory for cloud users,
  never-stranded on network failure, logged to `consent_log`.

## 5. Input validation
- Food: `sanityChecks` gates custom-food insert (kcal/macro coherence)
  before it can contaminate the coach's intake average. Weight/reps clamped
  in SetEntry. Backup import validates `format`+`formatVersion`. Quantity/
  kcal bounded in food sheets. CSV import capped (`MAX_CSV_ROWS=100k`).
- **A2-060 (trivial):** CSV export (`csvExport`) doesn't neutralise leading
  `=/+/-/@` (spreadsheet formula injection). Very low — user exports own
  data — but the standard one-line prefix-guard is worth adding.

## 6. Third-party keys / bundle exposure
- **A2-037 (low):** USDA `EXPO_PUBLIC_USDA_API_KEY` is client-bundled
  (inherent to `EXPO_PUBLIC_*`). Free-tier api.data.gov key; risk is quota
  abuse, not data exposure. Recommend a server proxy only if abused.
- No other secrets in the bundle (Supabase anon key is public-by-design;
  service-role key is server-only).

## 7. Deep-link security
- `App.js handleAuthDeepLink` only acts on `volyume://`/`https://volyume.app`
  prefixes (`:135`), exchanges Supabase codes, swallows errors. No arbitrary
  navigation from URLs (there's no `linking` map — N3-003), so the deep-link
  **attack surface is minimal** (the flip side of the coverage gap). The
  notification-tap `routeFor` only maps 2 safe internal types.

## 8. `npm audit` — full output (run 2026-05-31)
**32 vulnerabilities: 18 high, 13 moderate, 1 low, 0 critical.**
The **18 high** are almost entirely the **Expo build toolchain** (dev/build-
time, not shipped runtime): `@expo/cli`, `@expo/config(-plugins/-config)`,
`@expo/prebuild-config`, `@expo/metro-config`, `@expo/plist`,
`@xmldom/xmldom`, `tar`, `cacache`, `expo`, `expo-asset`, `expo-constants`,
`expo-manifests`, `expo-notifications`, `expo-updates`, `@expo/prebuild`,
`jest-expo`, `react-native-health`.
- **The one runtime-relevant high is `xlsx` (SheetJS)** — prototype
  pollution / ReDoS, no fixed version on the npm registry. Used by
  `importExternal`? No — that's a hand-rolled CSV parser; `xlsx` is a
  **devDependency** (`package.json:87`, used by build/seed scripts), so it
  is **not in the shipped bundle**. Risk is build-host only.
- **Recommendation:** these resolve via `expo`/SDK upgrades, gated by the
  founder's "no new closed-test release until built out" rule. Track for the
  next SDK bump; none is a shipped-app runtime exposure today.

---

## Security findings summary

| ID | Finding | Severity |
|---|---|---|
| A2-016 | Apple Sign-In via browser, not native (App Store 4.8) | Medium (compliance) |
| A2-019 | Sign-out `AsyncStorage.clear()` over-broad | Low |
| A2-037 | USDA key client-bundled (quota abuse only) | Low |
| A2-060 | CSV export no formula-injection guard | Trivial |
| npm | 18 high — Expo build-chain (not shipped); `xlsx` is devDep | Low (build-host) |
| — | **No SQLi, encrypted auth, server-authoritative tier/payments, RLS×102, triple PII scrub, Article-9 consent** | **Strong positives** |

**Verdict:** client-side security is **strong**. The only pre-launch
must-fix is **A2-016 (Apple Sign-In)** for App Store compliance. Everything
else is low/trivial hardening. The dependency advisories are build-time, not
shipped-runtime, and resolve on the next Expo SDK upgrade.
