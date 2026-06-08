# Phase 2 — Synthesis (phase2-05)

**Date:** 2026-06-08 · **Status:** synthesis of `phase2-00`…`04`. Decision input for what Phase 2 builds, in what order, and what the test branch must prove.

---

## 1. How the two features relate

| | Training Partners (F1) | Exercise Demonstrations (F2) |
|---|---|---|
| Core value | Adherence via light accountability | Confidence/correct execution |
| Reinforces | "I trained because someone sees the signal" | "I trained *well* because I knew the movement" |
| Tier | **Pro** | **Free** |
| Data flow | **Cross-user, cloud-direct** (new) | **Single-user, additive to existing exercise data** |
| Risk centre | Privacy/ED/social-comparison + new architecture | Content sourcing cost + delivery deps |
| Network | Inherently online (graceful offline cache) | Offline-first (cache/fallback) |

They reinforce the same loop — **show up, and execute well** — but share almost no implementation surface. F2 strengthens the *quality* of the sessions that F1 counts. Neither touches billing, the coaching engine, or the ED safety system; both read existing data and add nullable/parallel structures.

## 2. Shared infrastructure (modest)
- **Both are additive and reversible** (new nullable columns / new isolated tables; no migrations to existing foundations).
- **Both reuse the design system** (`Card`, `BottomSheet`, `Chip`, `Skeleton`, `SettingsPrimitives`, theme tokens) and the `seen_onboarding_hints` one-time-hint mechanism for progressive disclosure.
- **Both want a `feature_flags` table** (none exists today). Building one small, RLS-read-only flags table (default-false, fetched once per session) serves both and any future Phase 2 work — **the one genuinely shared piece of infrastructure**. Recommend building it first.
- Otherwise they are **independent**: F1 needs a new cloud-direct partner service + RLS/RPC layer; F2 needs additive exercise columns + media components. No coupling.

## 3. Risk profile

**Training Partners (higher risk):**
- *Product/ethical:* social-comparison + ED risk for this demographic (Levinson 2017; comparison meta-analysis). Mitigated by sharing only a derived binary, no nutrition/weight/performance, no competition, contest-prep auto-pause, default-off opt-in.
- *Architectural:* first cross-user read path; recursive-RLS pitfall; correct data-layer toggle-off; anti-gaming across the offline boundary. Mitigated by `SECURITY DEFINER` private helpers, server-derived signal, member-scoped RLS proven by test.
- *Legal:* UK GDPR — personal data, borderline special-category; needs explicit consent + DPO sign-off + DPIA.
- *Platform:* remote push is a no-op today (no EAS projectId) → core value must not depend on push (use local digest).
- *Adherence science is moderate and decays* — set expectations; design for re-engagement; beta-gate before GA.

**Exercise Demonstrations (lower risk, higher cost):**
- *Cost/content:* premium owned library is the real expense (six-figure-ish if outsourced); slow to produce. Mitigated by phased rollout + graceful fallback that stands alone.
- *Dependency:* real MP4 needs `expo-video` (new dep, needs approval); avoidable at launch via fallback/animated-WebP.
- *UX backfire:* forcing demos can *reduce* completion for beginners on hard moves (Riedl & Pauwels). Mitigated by on-demand, collapsed-by-default, never-forced.
- *Egress:* free feature served to whole base → model Supabase egress before video-everywhere.

## 4. What the Phase 2 test branch must prove/disprove
**F1:** (a) RLS truly isolates — stranger C cannot read A's signal under any crafted query; (b) toggle-off returns zero rows instantly; (c) `trained` cannot be faked without a real logged session; (d) the signal derives correctly from `getWeeklySessionStats` semantics; (e) contest-prep auto-pause fires from the coaching phase field without touching the engine; (f) it renders/caches offline and never blocks UI; (g) **beta cohort shows positive consistency impact with zero ED-safety events and zero comparison/competition feedback themes** (the GA gate).
**F2:** (a) ExerciseDetailScreen < 1s in cached/cold/absent states; (b) fallback is indistinguishable-quality, never "broken"; (c) no leak over 10 opens; (d) prefetch warms thumbnails without affecting logging perf; (e) cues read well mid-workout; (f) content pipeline can actually produce premium dark-set clips at the target quality before committing to scale.

## 5. Sequencing & build order — recommendation

**Build order: F2 (Exercise Demonstrations) first, then F1 (Training Partners).**

Rationale:
1. **Risk/reward:** F2 is lower-risk, self-contained, Free (helps all users + Pro conversion), and reuses existing systems. It's the "lowest risk, highest polish" opener and proves the additive-migration + media-caching patterns cheaply.
2. **F1 has hard external dependencies** — DPO/GDPR sign-off, a beta cohort, and ideally an EAS projectId for push — that take wall-clock time. Start F1's *legal/flag groundwork* in parallel, but ship F2 first.
3. **Shared prerequisite:** build the small `feature_flags` table during F2 (it needs flagging too), so F1 inherits it.
4. F2 raises session *quality*; F1 then adds accountability on top of sessions users can already execute well — the natural product order.

**Concretely:**
1. `feature_flags` table (shared, default-off).
2. **F2** behind `exercise_demos_enabled`: additive columns + `DemoCard`/`IllustrationCard`/`CoachingNotesPanel` + fallback + cues + thumbnail caching (no new deps). Pilot owned-content production on a handful of exercises to validate the quality bar before scaling. Approve `expo-video` only when real clips exist.
3. **F1** behind `training_partner_enabled` (beta cohort only): schema + RLS + RPCs + `partnerService` + You-tab UI + consent + contest-prep pause + local digest. GDPR sign-off before any real-user data. Advance to GA only on the §4 gate.

## 6. Cross-cutting reminders (apply to both)
British English; `#0D0D0D`/`#F5A623` + existing tokens only; 48dp targets; Reduce-Motion respected; no `console.log` in merged code; RLS on every new table; default-off feature flags; progressive disclosure via one-time hints, no "What's New" modal; **never** touch billing/coaching engine/ED safety/gating; both features read coaching outputs at most, never modify them.

## 7. Decisions needed before build (consolidated)
- **F1:** member cap (2 vs 6 — rec 6); emoji nudges in-app-only now vs deferred (rec in-app-only); confirm `feature_flags` table; DPO sign-off + DPIA; whether to add an EAS projectId for push.
- **F2:** approve `expo-video` now or stay WebP/fallback (rec WebP/fallback now); content route (commission owned — rec — vs Lottie); demo metadata as bundled seed map vs cloud pull.
- **Sequencing:** confirm F2-first.

*All six documents are in `docs/phase2-research/`. Research carries explicit confidence flags; four accountability stats (ASTD figures, Matthews middle-group ordering, "42% more likely", "streaks work") are flagged unverified and must not enter production copy without primary-source checks.*
