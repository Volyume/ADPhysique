# Deep Feature Audit — Item 3: Article 9 health-data consent screen

**Document:** deep-audit-04-article9-consent.md
**Item:** 3 of master inventory (Group 1, core flows — consent gate in FL1)
**File:** `src/screens/Article9ConsentScreen.js`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

> Note on "locked": founder directed (2026-06-04) that the audit propose freely
> and not defer to locked docs. This screen's copy is marked locked in
> `docs/PRIVACY_CONSENT_LOCKED.md`; proposals below therefore DO touch that copy
> where there is a real compliance or UX reason. Because it is a GDPR Article 9
> consent surface, legally-sensitive changes are flagged "needs legal sign-off"
> — that is accuracy, not deference.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The special-category (health) data consent gate. Rendered by
`Article9ConsentStack` when `user && !user.isLocal && healthConsentChecked &&
healthConsent === false` (`RootNavigator.js:946-950`), i.e. after sign-in,
before onboarding, and it cannot be skipped. On consent it calls
`record_health_consent(true, appVersion, platform)` (`:47-51`), caches the
result locally (`:62`), fires `article9_consent_recorded` telemetry (`:74`),
starts the trial cascade (`:90`), and flips the store via `healthConsentGranted()`
(`:96`) so the navigator re-renders into onboarding.

Structure (`:111-172`): title; intro paragraph; three labelled bullet groups —
"The information Volyume uses…", "What we never do with it…", "Where it lives…";
a single unticked checkbox ("I agree to Volyume using my health and nutrition
data to coach me."); a Continue button disabled until ticked; and a "Read the
full privacy policy" link.

The on-screen copy matches `PRIVACY_CONSENT_LOCKED.md` verbatim. Failure
handling is resilient: a cloud-RPC failure still records consent locally so the
user is never stranded (`:52-63`).

### Findings
1. **No "right to withdraw" notice before consent (GDPR Art 7(3) gap).** The
   screen never tells the user, *before* they tick the box, that they can
   withdraw consent or how. GDPR Art 7(3): "Prior to giving consent, the data
   subject shall be informed thereof." The locked doc mentions revocation exists
   (You → Privacy) but that information is **not** on the consent screen the user
   actually sees. This is the most material finding. [GDPR Art 7; noyb]
2. **The policy link leaves the app.** `openPrivacyPolicy` →
   `Linking.openURL(LINKS.privacyPolicy)` (`:107-109`) opens the external browser
   to `https://volyume.app/privacy`. This diverges from (a) the locked spec
   itself ("opens a webview"), and (b) the fact that a full in-app
   `PrivacyPolicyScreen` already exists (139 lines, renders the policy natively).
   Sending the user out of the app mid-consent is a known abandonment point.
   [TermsFeed; EDPB layered-notice]
3. **The audit record does not pin the consent-text version.** `record_health_consent`
   receives `_app_version` + `_platform` (`:48-50`) but not which version of the
   consent copy was shown. Art 7(1)/EDPB best practice: the consent record
   "should include … which version of the consent text was presented." App
   version is a weak proxy (copy can change without a version bump).
4. **Minor accessibility:** the Continue `TouchableOpacity` sets
   `accessibilityRole="button"` (`:162`) but no `accessibilityState={{ disabled }}`,
   so a screen reader does not announce it as disabled while the box is unticked.
5. **Readability:** bullet text is `fontSize.sm` (13) (`:218`) while the intro
   body is `fontSize.md` (16) (`:198`). For legally-important content the smaller
   bullets are defensible (lineHeight 22, contrast AAA) but on the small side.

### Design assessment (values cited)
- On-system: `colors.background`, `surface` card for the checkbox row, amber
  checkbox + CTA, scale spacing/radii. Title `type.h2`; subheads `type.bodyStrong`;
  amber bullet dots. No brand hero — correct for a focused legal screen.
- Hierarchy is clear and calm; the checkbox row is a contained card that reads as
  the decision point. CTA disabled at opacity 0.5.

### UX / usability
- **Strong:** single unticked checkbox (no pre-tick — Recital 32), Continue
  disabled until ticked, large tappable checkbox row (`paddingVertical: md`),
  `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}` (`:146-147`).
- **Weak:** the missing withdrawal notice (#1), the external policy bounce (#2),
  and the CTA disabled-state semantics (#4).

### Flow assessment
- Reached post-sign-in, pre-onboarding; single-screen stack; cannot skip
  (correct). On consent → store flip → onboarding/MainTabs. The only flow leak is
  the external policy link (#2).

### Integration assessment
- Well-integrated: RPC audit trail + local cache + telemetry + cascade start +
  resilient failure path. The divergences are the external link vs the existing
  in-app policy screen, and the missing withdrawal notice.

---

## STEP B — RESEARCH (live web, 2026-06-04)

### GDPR / EDPB requirements for health-data consent
- **Explicit, separate consent for health data**, distinct from general ToS — a
  dedicated consent interaction. (Volyume ✓.) [Momentum; DPO Consulting]
- **No pre-ticked boxes** (Recital 32: "silence, pre-ticked boxes or inactivity"
  are not consent). (Volyume ✓.) [Momentum]
- **Plain language; layered notice** — "a concise first layer at the point of
  consent, with links to detailed information." (Volyume ✓ — the copy is
  exemplary plain language.) [EDPB via Momentum]
- **Inform of the right to withdraw BEFORE consent, and make withdrawal as easy
  as giving it (Art 7(3)).** "Before consent is given, the data subject must be
  informed of their right to withdraw consent, and it must be as easy to withdraw
  as to give consent." (Volyume ✗ — not on the screen.) [GDPR Art 7; noyb]
- **Document the consent** (Art 7(1)): store what was consented to, when, by what
  mechanism, and **which version of the consent text** was presented. (Volyume
  partial — no consent-text version.) [Momentum]
- **Freely given:** "Consent is not free if access to the service depends on
  agreeing to health data processing that is not necessary for the service to
  function." (Volyume hard-gates the whole app — defensible only because the data
  is integral to the core coaching service; a legal-posture call.) [Momentum]

### In-app vs external policy
- Forcing users out of the app to read the policy is discouraged; in-app
  native/webview access is the recognised practice and reduces abandonment, "rather
  than forcing users to leave the app." [TermsFeed; Usercentrics]

---

## STEP C — COMPARISON

### Where Volyume leads
- Exemplary plain-language, honest consent copy ("Never sell it. Never share it
  with advertisers. Never use it to train a public AI model."), a dedicated
  explicit-consent screen, no pre-tick, layered notice, a real recorded audit
  trail, and resilient failure handling that never strands the user. This is
  better than most health apps, which bury consent in a ToS checkbox. [Momentum; EDPB]

### Where Volyume lags
- **Missing the Art 7(3) withdrawal notice** before consent (compliance gap).
- **External policy link** vs the in-app policy screen it already has (spec +
  best-practice divergence; abandonment risk).
- **No consent-text version** in the audit record (Art 7(1) best practice).
- Minor: CTA disabled-state semantics; bullet readability.

### Critical gaps
- The withdrawal-notice omission is the one I would not ship without addressing,
  because it is a named GDPR requirement, not a preference.

---

## STEP D — PROPOSAL

### Summary
Keep the (excellent) consent copy and mechanics. Close the one real compliance
gap (inform of the right to withdraw, before consent), keep the policy in-app
using the screen that already exists, strengthen the audit record with a consent
version, and fix two minor a11y/readability points. Legally-sensitive wording is
flagged for sign-off.

### Specific changes — one by one

**1. Add a "you can withdraw" line before consent. [Copy — needs legal sign-off] — near `:153-156`**
- What: a short line by the checkbox/CTA, e.g. "You can withdraw this consent at
  any time in You → Privacy." Satisfies Art 7(3)'s "informed prior to consent".
- Evidence: GDPR Art 7(3); noyb. This is currently absent from the on-screen copy.
- Caveat: confirm exact wording AND that the described withdrawal mechanism is
  accurate (the locked doc says withdrawal signs out + queues deletion — see
  change 5) with legal before shipping.

**2. Keep the privacy policy in-app. [Code/flow] — `:107-109` + `RootNavigator.js:397-403`**
- What: replace `Linking.openURL` with either (a) navigate to the existing
  in-app `PrivacyPolicyScreen` (register it in `Article9ConsentStack`), or (b)
  `WebBrowser.openBrowserAsync(LINKS.privacyPolicy)` (expo-web-browser is already
  a dependency, already used in `supabase.js`/`ProUpgradeScreen`).
- Recommendation: **(a)** — native, offline, already written, matches the locked
  "webview" intent, and keeps the user in-app during consent.
- Evidence: TermsFeed/Usercentrics (don't force users out); EDPB layered notice.

**3. Pin the consent-text version in the audit trail. [Code now + server flag]**
- What: add a `CONSENT_VERSION` constant; include it in the
  `article9_consent_recorded` telemetry immediately (client-only, no migration);
  FLAG adding a `_consent_version` param to `record_health_consent` + a column on
  `consent_log` as a server-side migration (founder/legal).
- Evidence: Art 7(1) / EDPB documentation best practice.

**4. Announce the disabled CTA to screen readers. [A11y] — `:158-165`**
- What: add `accessibilityState={{ disabled: !agreed || busy }}` to the Continue
  button. Optional: bump bullet text `fontSize.sm` → `fontSize.md` for legal
  readability.

**5. (Flag — legal, no code) "Freely given" + withdrawal = deletion.** Two
posture questions for legal, not for me to redesign: (a) the whole-app hard gate
vs "freely given"; (b) whether withdrawal must offer a path short of full account
deletion to satisfy "as easy to withdraw as to give" + proportionality. Surface;
do not change unilaterally.

### COPY CHANGES
Add (new line near the checkbox/CTA) — wording subject to legal sign-off:
Proposed: "You can withdraw this consent at any time in You → Privacy."

(No change to the locked body copy is proposed; it is strong and compliant. The
addition closes the Art 7(3) gap.)

### What to keep (with evidence)
- The plain-language, honest copy and layered notice (EDPB best practice).
- No pre-tick + Continue-disabled-until-ticked (Recital 32).
- The dedicated explicit-consent screen separate from ToS.
- The recorded audit trail + local cache + resilient failure handling.
- The trial-cascade start on consent.

### IMPACT / EFFORT
- **Impact: High** for change 1 (named GDPR requirement) and 2 (spec + best
  practice + abandonment); Medium for 3; Low for 4.
- **Effort: Low** — one copy line (pending legal), one nav/flow change, one
  constant + telemetry field, one a11y prop. Change 3's server leg and change 5
  are flagged, not built here.

### SOURCES
- GDPR Art 7 (conditions for consent): https://gdpr-info.eu/art-7-gdpr/
- noyb — Right to withdraw consent (Art 7(3)): https://noyb.eu/en/your-right-withdraw-your-consent-article-73
- Momentum — GDPR consent requirements for health data: https://www.themomentum.ai/blog/gdpr-consent-requirements-health-data
- DPO Consulting — GDPR data consent: https://www.dpo-consulting.com/blog/gdpr-data-consent
- TermsFeed — Privacy guidelines for health apps: https://www.termsfeed.com/blog/privacy-guidelines-health-apps/
- Usercentrics — Best practices for mobile app consent: https://usercentrics.com/knowledge-hub/best-practices-for-mobile-app-consent/
