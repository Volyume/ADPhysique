# Deep Feature Audit — Approved Proposals Log

Running log of every proposal approved by the founder. Append-only.

---

## Item 1 — Welcome screen (tier selection) — APPROVED 2026-06-04
Doc: `deep-audit-02-welcome-screen.md`. Approved in full ("Approved").
Approved changes (copy-only):
1. Rewrite the Free-card backup note so it no longer implies local-first /
   sign-up-later (truthful about the required free account).
2. Add a muted expectation line under the cards: both tiers are a free
   account, no card, ~1 minute.
3. Soften the disqualifier's hardest line (drop "there are faster ones out
   there"), keeping the "who it's for" framing.
4. Value preview was flagged only, not approved for build in this pass.
Impact High / Effort Low.

## Item 2 — Login / sign-up screen — APPROVED 2026-06-04 ("Ok")
Doc: `deep-audit-03-login-screen.md`. Approved.
Approved changes:
1. Route any *_signup intent (incl. free_signup) to the Create Account tab.
2. Show the reassurance prompt for every create-account view (gate on
   !isSignIn), with refined copy.
3. Trust line "No subscription required" colour textDisabled -> textMuted.
4. Touch targets: mode-switch minHeight 44; forgot-password hitSlop.
5. Email-confirmation round trip flagged only (auth-architecture decision),
   not changed.
Impact High (1) / Medium (2) / Low (3-4); Effort Low.

## Item 3 — Article 9 health-data consent screen — APPROVED 2026-06-04 ("Ok")
Doc: `deep-audit-04-article9-consent.md`. Approved (founder: propose freely,
not deferring to the locked copy doc).
Approved changes:
1. Add an Art 7(3) "you can withdraw" notice before consent (copy) — wording
   in place, flagged for legal sign-off.
2. Show the policy in-app (navigate to PrivacyPolicyScreen) instead of the
   external browser.
3. Pin the consent-text version (CONSENT_VERSION) in telemetry now; RPC/
   consent_log server column flagged as a server-side item.
4. Announce the disabled Continue button to screen readers. Bullet-text font
   bump judged unnecessary (AAA contrast + lineHeight already adequate).
5. "Freely given" hard-gate + withdrawal=deletion: flagged for legal, not
   changed.
Impact High (1-2) / Medium (3) / Low (4); Effort Low.
