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

## Item 4 — Pro onboarding wizard — APPROVED 2026-06-04 ("Approved", scope: Full split + polish)
Doc: `deep-audit-05-pro-onboarding.md`. Founder picked "Full split + polish"
when asked to resolve the split-vs-polish fork.
Approved changes:
1. Split overloaded Step 3 into two (Logistics + Goal); TOTAL_STEPS 4 -> 5.
2. Unify sex + body-weight-unit pickers onto the shared SegmentedControl.
3. Fix morning/check-in toggle accessibility (switch role + state + label).
4. Progress bar starts partially filled (Endowed Progress Effect).
5. Correct the under-stated "30 seconds" copy.
6. Step-1 account redundancy flagged only, not changed (routing decision).
Impact High (1) / Medium (3) / Low (2,4,5); Effort Medium (split) / Low (rest).

## Item 5 — Pro setup complete screen — APPROVED 2026-06-04 ("Approved")
Doc: `deep-audit-06-pro-setup-complete.md`. Approved.
Approved changes:
1. Match the progress bar to the new wizard (continuous track, drawn full) —
   fixes the regression Item 4 introduced.
2. Split card announces expanded/collapsed to screen readers.
3. "New to macros?" pointer marked as a link.
4. Keep (with evidence): activation content (ring/macros/split/rationale),
   founder note, single CTA, reduce-motion animation, graceful fallbacks, copy.
Impact Medium (1) / Low (2-3); Effort Low.

## Item 6 — First-run screen (Free path) — APPROVED 2026-06-04 ("Approved")
Doc: `deep-audit-07-first-run.md`. Approved incl. optional headline alignment.
Approved changes:
1. Remove the dead unit-picker styles (+ unused TouchableOpacity import).
2. Make the keyboard Return submit (returnKeyType "go" + onSubmitEditing).
3. Align the headline to type.h2 (optional, included).
Kept: single-field design + deferred plan choice, kg-only, auto-focus,
disabled-until-valid CTA, busy guard, single exit, Plans hint.
Impact Low; Effort Low. (Off the live path while PRO_BETA_ACTIVE forces Pro.)

## Item 7 — Train tab (HomeScreen) — APPROVED 2026-06-04 ("Approved")
Doc: `deep-audit-08-train-home.md`. Approved all three, banner priority
coach > deload > phase.
Approved changes:
1. Remove the 26 verified-dead style keys (~150 lines).
2. Close the a11y gaps on the secondary controls (roles + labels).
3. Cap/prioritise the banner stack: at most one of coach-review / deload /
   phase shows at once (coach > deload > phase); lower ones resurface later.
Kept: load orchestration + safety timers, crash recovery, optimistic weight
logging, skeletons, start/intent flows, mesocycle chip + coach brief.
Impact Low (1) / Low (2) / Medium (3); Effort Low (1-2) / Medium (3).

## Item 8 — Plans tab (PlansScreen) — APPROVED 2026-06-04 ("A")
Doc: `deep-audit-09-plans-tab.md`. Approved.
Approved changes:
1. Remove 23 verified-dead style keys (cardio cluster, local header, goals
   pointer, Pro-lock variant, training-days picker, sectionDeemphasised).
2. Add a11y roles/labels to the inline action controls; expanded state on the
   archived header.
3. De-duplicate one audience comment.
Kept: active-plan-first hierarchy, block advisor, archive + templates, decision
hub, skeletons, PeekMenu, mid-block switch guard.
Impact Low; Effort Low.

## Item 9 — Diary tab (DiaryScreen) — APPROVED 2026-06-04 ("Approved")
Doc: `deep-audit-10-diary-tab.md`. Approved.
Approved changes:
1. Add accessibilityRole="button" to the labelled secondary controls (day-pager
   chevrons, Today pill, insights icon, selection-bar actions) + role/label on
   the water +/- buttons.
2. Per-user water target — flagged only, no code.
3. Photo/voice quick-log — flagged only, no code.
Kept: search-first add, copy-yesterday, save-as-meal, flexible meal ladder,
multi-select tools, macro-cycle/refeed awareness, local-day correctness.
Impact Low; Effort Low. Attribute-only.

## Item 10 — Progress tab (AnalyticsScreen) — APPROVED 2026-06-04 ("Approved")
Doc: `deep-audit-11-progress-tab.md`. Approved.
Approved changes:
1. Remove dead styles (header, pageTitle) + the dead units store-read/prop pass.
2. Add a11y roles/labels to the All-sessions link, PR window toggle, insight
   dismiss, and both volume-summary cards.
3. Copy: drop "Keep pushing." from the PR empty state (voice rule).
Kept: recent-sessions-first, volume summary -> heatmap, PR sparkline + gold,
dismissible insights, locked Year-of-Lifts tile, useProgressData split.
Impact Low; Effort Low.
