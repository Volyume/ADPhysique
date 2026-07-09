# Design decisions — 2026-07-09

Context: the founder reviewed the four decision questions raised by the
2026-07-09 design and usability audit (00-MASTER-INDEX.md, section 4) and
explicitly delegated all four to the session's judgement ("Use your
judgement" / "You decide", in-session, 2026-07-09). The decisions below are
therefore authorised, not silent. Each records the call, the rationale, and
the exact scope.

**Standing delegation (founder, in-session, 2026-07-09).** After these
four, the founder extended the delegation to all design/usability/end-user
judgement calls in this campaign: "For all decisions like that, I'm using
you for your judgment... I'll trust your judgment on these things." Every
such decision is still RECORDED here (numbered, with rationale) rather than
made silently. Explicitly NOT covered by the delegation: anything with
legal, safety or money implications — GDPR/Article 9 consent substance,
ED-safety locked-text changes beyond verbatim restoration, billing/trial
mechanics, new dependencies, and cloud schema migrations. Those still go to
the founder as structured questions.

## D1. Card corner radius: 16px is the standard (L02-A1)

**Decision.** `Card`'s default `radius` prop changes from `'md'` (10px) to
`'lg'` (16px). Implemented in `src/components/Card.js`.

**Rationale.** `docs/DESIGN_SYSTEM.md` and `docs/rules/styling.md` both
document 16px as "the card radius", and the 155 hand-rolled card blocks
already render 16px, so the 113 bare `<Card>` usages at 10px were the
minority AND contradicted the docs. Softer corners also read more premium at
the app's card sizes. The 13 sites passing an explicit `radius="md"` chose
that value deliberately and keep it; the 3 explicit `"xl"` sites keep theirs.

**Scope.** One-line default change; no per-screen sweep needed. Follow-up
(batch 2): the 155 hand-rolled blocks migrate onto `<Card>` and inherit the
correct radius automatically.

## D2. Pro-moment amber glow: sanctioned, as one token (L02-A2)

**Decision.** The brand-tinted shadow on the three Pro-moment surfaces
(WelcomeScreen proCard, ProOnboardingScreen offerCard, ProUpgradeScreen
successCircle) is KEPT and sanctioned as a deliberate second glow family,
expressed as a single shared token `shadow.glow` in `src/styles/theme.js`
(opacity 0.18, radius 16, offset {0,4}, elevation 8 — the WelcomeScreen
values, the most restrained of the three). The Materials Policy comment in
`theme.js` records the exception.

**Rationale.** A soft brand halo on upgrade/celebration moments is standard
premium practice; the defect was three sites drifting apart (0.15/0.4
opacity, 12/20 radius), not the existence of the glow. Removing it entirely
would flatten the app's warmest conversion moments for no user benefit.

**Scope.** All three sites move onto `shadow.glow` verbatim (batch 1,
visual-fixes agent). Any future glow outside these three sites remains
banned.

## D3. Letter-spacing: one overline token, one wordmark token (L02-A5)

**Decision.** Two new tokens in `theme.js`: `letterSpacing.overline = 0.5`
(every uppercase section/eyebrow micro-label) and
`letterSpacing.wordmark = 2` (SettingsAbout app name, PRCelebration hero
text). Every other letter-spacing stays 0. All 87 raw `letterSpacing`
literals in screens/components are swept: uppercase-label sites route
through `overline`, the two wordmark sites through `wordmark`, zero-value
literals are deleted (0 is the RN default), and any other non-zero literal
is deleted. An ESLint `no-restricted-syntax` rule then bans raw
`letterSpacing` literals in `src/screens/` and `src/components/` the same
way raw `fontSize`/`fontWeight` are already banned.

**Rationale.** The all-zero table was an Android legibility decision about
running text; slightly-open tracking on 10-12px uppercase labels is the
opposite case (it improves legibility and is standard premium practice).
The real defect was seven different ad-hoc values for one visual role.

## D4. Coaching actor naming: hybrid, precisely ruled (L01-NAME)

**Decision.** Two registers, one rule:

- **"Precision Coaching"** is the branded feature name. Used where the
  feature is being NAMED or SOLD: MethodologyScreen title and body,
  paywall/tier copy, consent explainers, settings labels, the coach
  glossary's title entries.
- **"your coach"** (lowercase, possessive) is the single informal actor in
  running prose: coach output cards, check-in copy, home-screen briefs,
  notifications. Never "The Coach" / "the Coach" / "the coach" as a proper
  noun, never "the engine", never "the system", never "we" for coaching
  actions, and "Volyume" only for app-level (non-coaching) actions.
- **Locked ED-safety surfaces (voice doc Surfaces 1-8) are restored to
  their exact locked text**, which names "Precision Coaching" as the
  decider; those exact words were audited for ED-safety tone and are not
  paraphrased. Restored hands-on (not by an agent), per the constitution.

**Rationale.** The 2026-07-07/08 Codex rename was unauthorised drift and
landed six inconsistent variants, but it pointed at a real weakness:
"Precision Coaching" as the actor of every sentence reads stiff and
marketing-heavy in running prose. Best-in-class products use the branded
name to name the feature and a natural actor in prose. The hybrid keeps
the brand where it earns attention and the human register where the user
lives day to day.

**Scope.** `COACHING_VOICE_SYNTHESIS_LOCKED.md` gains a dated addendum
recording this rule (the doc is locked; this decision is the recorded
founder-delegated authority for the amendment). The copy agent sweeps
non-locked surfaces; locked/ED-safety-adjacent and consent/billing surfaces
are excluded from the agent's scope and handled hands-on.

## D5. Gated-round outcomes (founder, 2026-07-09)

Founder responses to the gated decision round:
- **All trial / paywall / conversion-funnel work: LEAVE ALONE.** Do not touch
  PaywallScreen dead code, trial-length "contradiction", or silent-vs-confirm
  trial start. (Structure is intentional: 14 days free in-app, then 7 days via
  Google Play / Apple.) Lane-08 conversion-funnel set is CLOSED - not built.
- **RIR/RPE per-set entry (L07-F1): DO NOT BUILD.** Prior decision stands (Wave
  D / T4: history-gated progressive disclosure). Not re-litigated.
- **Partners consent footer + notice-version bump (L06-F3): APPROVED.** Restore
  the "everything shared is deleted" footer and bump PARTNER_PRIVACY_NOTICE_VERSION;
  also show the full PartnerPrivacyReceipt on the empty state (L06-F2).
- **iOS Live Activity (L07-F5): APPROVED.** Build using the existing in-repo
  `modules/live-activity` native module. If a NEW dependency is genuinely
  required, name it + licence for a separate yes first (CLAUDE.md dep gate).
- **"Keep going on all" (founder) is the decision-of-record** for the buildable
  product/UX items: ProOnboarding Step-2 split (re-group fields only, sex-gate +
  every required-field enforcement provably preserved), per-day-target
  persistence code (with an additive migration the founder runs), and the
  non-gated polish/feature backlog.

HELD (not covered by "all"; still need an explicit founder call):
- **Nutrition-density redesign (L05-D2/NT2): HELD.** Touches the locked
  adherence-neutral rendering (ED-safety-adjacent, MacroRings remaining-hero /
  no red-green). Not to be freelanced on a blanket instruction. Surface as its
  own question if pursued.
- **Drag-reorder dependency (L07-F9): HELD.** Founder did not approve a new dep
  for it; leave alone unless it can be done with no new dependency.
