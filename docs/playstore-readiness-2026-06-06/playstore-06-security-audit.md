# playstore-06 — security audit (OWASP MASVS-aligned)

Status: COMPLETE. Date: 2026-06-06. Corroborated by independent checks this
session + `docs/audit/volyume-master-audit-2026-05-31/05-security-audit.md`.

**Verdict: no critical or high client-side security defect.** Findings are
hardening items.

- **M1 Credentials — PASS.** No hardcoded keys/tokens/passwords (grep clean).
  Supabase URL/anon key from `EXPO_PUBLIC_*` env, null when unset. Anon key is
  public by design.
- **M2 Supply chain — see Phase 1.** 18 audit findings, all build-time tooling,
  none in the runtime bundle; remediation is breaking upgrades. No runtime CVE
  exposure. `@xmldom/xmldom` (the highs) is reached only through the iOS
  react-native-health config plugin.
- **M3 Auth — PASS.** Supabase `autoRefreshToken: true`, `persistSession: true`,
  `detectSessionInUrl: false` (deep-link auth handled manually). OAuth via the
  Supabase/Expo web flow.
- **M5 Communication — PASS.** All endpoints HTTPS; no `http://` in `src`.
  Certificate pinning not implemented (accepted trade-off for this profile).
- **M9 Data storage — PASS.** Auth tokens in expo-secure-store (Keystore-backed),
  not AsyncStorage. AsyncStorage holds only name/tier/flags/push-token. Health +
  training data in expo-sqlite. `allowBackup` is true but SecureStore is excluded
  from backup; setting `allowBackup=false` would harden further (Document A M-2).
- **M7 Binary protections — PARTIAL.** Hermes ships JS as bytecode (PASS). R8
  Java/Kotlin obfuscation is OFF (Document A L-1, decision). `transform-remove-console`
  not configured → debug logs ship (Document A M-1).
- **PII scrubbing — PASS (triple layer):** `errorLog.redactPII`,
  `observability.redactPII`, and Sentry `beforeSend` all strip health/PII before
  anything leaves the device; Supabase calls are instrumented as metadata only.
- **Server — PASS (client-visible):** RLS on all user-scoped tables, tier
  server-owned (trigger reverts client tier writes; profile push excludes tier),
  payments server-authoritative (RTDN), account deletion server-side. Per-policy
  RLS predicate review is a server-side task beyond client scope (flagged).

## Deep links — verify
- Handlers: scheme `volyume://` + `https://volyume.app` (App Links, autoVerify).
  Trace every `Linking` handler for input validation before navigation (no
  evidence of a deep link forcing a privileged state was found, but a full trace
  is recommended as a follow-up).
- **App Links broken until fixed (H-1):** `public/.well-known/assetlinks.json`
  contains the literal placeholder `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT`.
  Until it holds the real Play App Signing SHA-256, `https://volyume.app` links
  will not verify and won't open the app. Not a rejection, but a broken feature
  and a security/trust item (any site could otherwise claim the link). → Document
  A H-1 (file) + Document B (fingerprint comes from Play Console).
