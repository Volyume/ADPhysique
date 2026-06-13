# Volyume — Ultimate Audit 2026-06-13 — Executive Summary

Written last, from the Phase-1 inventory (78 screens + 68 components, file:line-grounded),
Phase-2 research (15 areas, 50+ apps each), the Phase-3 master comparison, and the
70 Phase-4/5 proposals. **Method honesty:** all agent work ran on **Opus 4.8** (Fable 5 is
globally disabled by government directive — see `_AUDIT-STATUS-AND-RESUME.md`). **Reddit was
blocked** in this environment, so user-sentiment claims are secondary-sourced and marked
PARTIAL throughout; nothing was fabricated — every fragment flags VERIFIED / PARTIAL / NOT-FOUND.
Treat PARTIAL/evidence-thin items as needing validation before they drive a build.

## Where Volyume genuinely leads the field (VERIFIED uniques)
- **Explained, deterministic coaching with a full held-decision audit trail** — what changed
  AND what didn't, with reasons. No surveyed competitor does this; in an AI-coaching market it
  is a *sharpened* contrast position, not a gap.
- **ED-safety breadth** beyond every surveyed app (calorie floors, rapid-loss threshold, SCOFF,
  signposting) — and the white-space below confirms it (see "biggest opportunity").
- **Free per-muscle MEV/MAV/MRV volume heatmap**, **gram-level coach→plate narration**,
  **division-specific plan generation**, the **barcode heal-chain**, and **£29.99/yr** bundling
  coaching priced $200–400/mo elsewhere.

## Where it matches the field
- **Workout logging** already implements the best-in-class patterns (Strong-style pre-load,
  Hevy-style tap-to-fill); the issues are polish (banner-stacking, type, targets), not model.
- **Food logging** (recently improved) is competitive on friction; **plan generation** is at or
  above market on personalisation depth.

## Where it lags, and why it matters
- **No exercise demonstration media** — the one clearly below-category-floor gap; a beginner
  literally cannot see how to do a movement (blocks the whole expanded audience).
- **Depth is gated by PAYMENT TIER (Free/Pro), not by ABILITY** — so a newbie meets competition
  jargon (Precision Coaching™, mesocycle, MAV/MRV, "goal lock") on day one. This is the single
  structural barrier to the dual-audience mandate.
- **Coach output overloads** (~14 cards at once); **food search** doesn't guarantee one correct
  UK result; **no progress photos**; brittle/absent form guidance; sub-44px targets; a latent
  light-theme contrast bug.

## The 10 highest-impact changes (→ proposal IDs)
1. Inline **jargon-translation layer** + legends across data/coaching surfaces (M1 / 006).
2. **Progressive disclosure** of the coach output — one hero decision first (005).
3. **"Set it for me"** fast nutrition target before the full form (004).
4. **Exercise demo media** at the exercise slot (021 — *FOUNDER-GATE*: no-AI + licensed media).
5. **Workout screen**: inputs/beat-line above the fold, collapse the banner stack (003).
6. **Curated verified UK best-match** food result (007).
7. **Progress photos** (010) + history **export** (M8).
8. **"You're overreaching → lighter week"** warning (019 — *FOUNDER-GATE* ED-safety).
9. **Coached/Collaborative/Manual** control + a "this didn't fit" feedback loop (017/018 — *FOUNDER-GATE*).
10. **Plan-rebuild preview/diff** before commit (011) + free CoachReview error-vs-empty fix (001).

## 5 things that move a NEW user from confused → committed
1. A usable plan/target in seconds ("set it for me", 004) before any form.
2. Jargon defined inline the first time it appears (M1 / 006).
3. One hero coaching decision, not a 14-card wall (005).
4. See how to do the movement (demo clips / guaranteed form guidance, 021/014).
5. Encouraging empty states + a cold-start bridge over the 7–15 session cliff (008 / U-D-7).

## 5 things that make an ATHLETE upgrade immediately
1. Per-muscle volume truth on the plan (U-B-8) instead of an `exercises×3` heuristic.
2. Readiness + overreach/fatigue signals (022/019 — gated) — autoregulation the field lacks.
3. Persistent plate/timeline logging (013) + longer Food-Insights range (U-C-4).
4. Progress photos + full history export (010 / M8).
5. Selectable contest-prep goal honouring the safety floors (U-C-3 — gated).

## The single biggest opportunity no other app has taken
**An honest "you're overreaching — take a lighter week" intervention** (019). Research found NO
consumer app ships it; it aligns precisely with Volyume's deterministic engine + ED-safety moat,
and it is the clearest credible differentiator for the serious tier. FOUNDER-GATE (it touches the
engine + `src/coaching/safety/`), so it is input-only until you and the safety owner design it.

## The navigation change with the highest psychological impact
Stop gating *depth* by Free/Pro and instead **disclose by ability/achievement** (Phase-4 Part D):
a newbie sees a clean, plain-English surface; the competition vocabulary and dense diagnostics
reveal progressively (the only tenure/achievement gates that exist today are session-10 and
365-day). This converts the app from "feels built for a competitor" to "welcoming and rigorous at
once" without a forked UI — and stays inside the locked 5-tab frame.

## Positioning for the expanded audience
Strong: the engine and safety moat already serve both ends; almost every gap is **surface**
(presentation, language, on-ramp, demo media, sharing) — mostly low-effort and inside the hard
constraints (no-AI, offline-first, ED-safety, EU residency). The risk is not capability; it is
that depth is currently *front-loaded* rather than *progressively revealed*.

## The risk — what must NOT break while improving everything
- The **deterministic engine** (no AI/LLM) and its **confirm-then-apply** contract.
- The **ED-safety system** (`src/coaching/safety/`) — every retention/streak/nutrition-framing/
  overreach proposal that touches it is FOUNDER-GATE, input-only, routed to the safety owner.
- **Billing** (no change without sign-off) and the **free/Pro gating** integrity.
- The **explained-coaching trust** — accessibility/jargon work must simplify *presentation*, never
  dumb down or hide the honesty (held decisions, "why nothing changed").
Every proposal touching these is flagged FOUNDER-GATE in `ultimate-audit-04-proposals-with-blueprints.md`;
none should be built autonomously.
