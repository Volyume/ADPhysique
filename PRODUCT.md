# Product

<!-- impeccable:product-schema 1 -->

> **How this file was written.** Impeccable's `init` requires an interview
> round before writing product truth. That round was put to the founder in
> this session and declined, followed by an instruction to work autonomously
> from the brief. Per init's own substitution rule, the record below is
> therefore INFERRED from repository evidence and labelled as such: every
> section cites where its facts come from. Lines marked **[inferred]** have
> not been confirmed by the founder and should be corrected on sight rather
> than trusted. Nothing here is invented — where the repo is silent, the
> field says so instead of guessing.
>
> Sources: `CLAUDE.md` (project constitution), `docs/DESIGN_SYSTEM.md`
> (governing visual document), `src/` (the shipped code), `package.json`,
> `app.json`.

## Platform

android

Primary platform: Android, shipping live on Google Play. iOS ships via
TestFlight from the same React Native codebase, rendering the same design
language rather than adapting per OS — so this is `android`, not `adaptive`.
`app.json` locks orientation to portrait. (Source: CLAUDE.md header;
app.json.)

## Users

People who train with weights seriously and treat it as a craft — the
codebase's own framing is "a serious, private, precision instrument for people
who treat training as a craft", explicitly not a wellness, social or gym-bro
product (docs/DESIGN_SYSTEM.md, "What Volyume Is Not").

A named and deliberately served group: **people training with injuries,
pain, long-term conditions and disabilities.** This is a first-class product
lane with its own engine (`src/lib/capability/`), an 11-axis demand ontology,
baseline vs episode constraint roles, and a configuration surface at
`HowYouTrainScreen`. It is positioned as a differentiator, not an
accessibility afterthought. (Source: CLAUDE.md; docs/TASKBOARD.md; the
capability lane in src/lib.)

Real users are paying today; changes reach them. (Source: CLAUDE.md header.)

## Product Purpose

Plan, run and adjust resistance-training programmes, and log the nutrition
that supports them, with the coaching decisions made by a deterministic
engine the user can inspect rather than by an opaque recommendation.

Success is a user who keeps training productively — progressing within safe
volume landmarks, working around their own constraints, and understanding
why the app suggested what it suggested.

## Positioning

Three things a neighbouring app could not truthfully copy without building
them:

1. **A deterministic coaching engine — no AI, ever.** Pure functions, no LLM
   calls, no randomness; identical inputs always give identical outputs
   (`planEngine.js`, `nutritionEngine.js`, `weeklyCoach.js`, `coachApply.js`).
   This is an inviolable constraint, not an implementation detail.
2. **Training that is genuinely built around injury and disability**, through
   a constraint engine that carves specific movements and laterality out of
   generated plans and live sessions, rather than a blanket "low impact" mode.
3. **Eating-disorder safety woven through the engine**, tier-blind and never
   optional: hard calorie floors (1,500 kcal men / 1,200 women), a fat-free-
   mass energy floor, rapid-loss and max-safe-loss gates, Beat UK signposting,
   and a calm mode that suppresses weight- and food-adjacent prompts.

## Operating Context

- Offline-first. The encrypted on-device SQLite database is the source of
  truth; the cloud is a sync target, never queried directly by a component.
- Used in a gym, mid-session, one-handed, often at arm's length — the active
  workout logger is the highest-traffic surface.
- A weekly rhythm: log sessions -> weekly check-in -> the coach produces a
  decision -> adjustments apply to the next block.
- The founder works from a phone and cannot run a simulator, so every shipped
  change carries a manual device-test checklist. **[inferred: that this
  remains true today — it is stated in CLAUDE.md.]**

## Capabilities and Constraints

Confirmed functionality: plan library and builder, workout logging, exercise
library, personal records, progress stats (free tier); food diary, barcode
scanning, meal suggestions, nutrition targets and macros, weekly check-ins,
Precision Coaching, division plans and wearables (Pro tier).

Hard constraints that any future work must preserve:

- **Free/Pro gating is binary and absolute.** Never expose Pro to free, never
  gate a free feature.
- **EU data residency is absolute** — all user data stays in Supabase
  EU-Dublin. No PII reaches Sentry or any analytics.
- **GDPR Article 9 health-data consent** is an un-skippable gate that fails
  closed for new users; it must not be weakened, reordered or made skippable.
- **Billing**: product IDs `pro_monthly` and `pro_annual` never change; no
  refactor of purchase/restore/entitlement flows without a written test plan.
- **No anonymous mode** and no local-user migration path.
- Schema changes are additive and idempotent; cloud migrations are applied
  only on an explicit founder instruction.
- **No outside-party dependencies** — no solicitors, clinical reviewers or
  paid experts as a product or release gate. Questions resolve internally
  from published authority under a conservative posture, or the behaviour
  stays out of scope.

Terminology: muscle **groups**, not muscles. British English in all
user-facing copy. No em dash in user-facing copy.

## Brand Commitments

- Name: **Volyume**. Wordmark all caps, geometric sans, wide tracking, amber
  or white on dark. A compact `V` mark is the repeated app chrome.
- Amber (`#F5A623`) is the single accent; everything else is achromatic
  except semantic status colours.
- Near-black `#0D0D0D` base, never pure black (halation).
- Voice: calm, plain, direct. No shame, no guilt, no clipped commands, no
  motivational filler, no emoji in functional UI copy, no celebration for
  ordinary actions. (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`.)
- Reference feeling: Whoop / Linear / Stripe — a calm, dense, exact tool.

## Evidence on Hand

- The shipped app: 85 screens, 94 components, a mature token system in
  `src/styles/theme.js`, and 1,112 test suites / ~15,240 tests.
- `docs/DESIGN_SYSTEM.md` — the governing visual document.
- Real production users on Google Play.

Absences that future work must not fabricate: there is **no** user research
corpus, no usage analytics, no testimonials, no press, and no
disabled-user validation on record (`REAL-DISABLED-USER-VALIDATED = NO` is
kept honest as a truth field and must never be converted into a claim).
No design work in this repository has been validated on a physical device by
anyone but the founder.

## Product Principles

1. **Determinism over cleverness.** If a feature seems to need AI, it is the
   wrong feature.
2. **Numbers are the hero.** The interface frames data; the data is the
   product.
3. **Safety is not a tier and not a toggle.** Guardrails never consult
   subscription state and are never presented as optional.
4. **Constraints are first-class input, not an edge case.** Injury and
   disability shape the plan the same way equipment and schedule do.
5. **Explain the decision.** A recommendation the user cannot interrogate is
   worth less than a slightly worse one they can.

## Accessibility & Inclusion

Established requirements, all shipped:

- WCAG contrast ratios are computed and asserted in `theme.test.js` for every
  token at every surface-ladder step, so the palette cannot silently drift
  below its bar.
- A higher-contrast mode, a colour-blind-safe palette (Okabe-Ito swaps), and
  a larger-text mode (×1.2 on every type token) — any layout must survive all
  three.
- Reduce Motion gates every animation.
- Screen-reader labels, roles and heading semantics on shared chrome.

Open gap, recorded not resolved: **touch targets are sized to iOS's 44pt on
an Android-first product.** Material 3 and `docs/DESIGN_SYSTEM.md` both
require 48dp; `touchTarget.android: 48` exists in `src/styles/layout.js` and
has zero references in app code.
