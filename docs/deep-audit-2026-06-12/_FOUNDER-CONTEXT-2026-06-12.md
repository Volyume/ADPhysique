# Founder context update (2026-06-12) — reduced-caution posture

Two founder steers during the deep audit that change how it runs:

1. **"True dual-market repositioning"** — beginners (mass market) and elite
   physique competitors are co-equal target audiences. Wholesale change is on the
   table to win the broad gym population without losing elite credibility.

2. **"No live users right now; happy to make wholesale changes in the guise of
   massively improving the product I launch. No caution needed on flipping things
   on."** This supersedes the CLAUDE.md framing of "a live production app, real
   users are paying." The product is effectively PRE-LAUNCH.

## What this unlocks
- The "live paying users" caution that gated billing edits and behaviour changes
  is lifted. Feature flags can be flipped (incl. `ONBOARDING_QUIZ_FIRST`), defaults
  changed, flows resequenced, and ambitious repositioning proposed and built.
- The deliverable can move from "blueprints you review before any code" toward
  "blueprints + build the high-confidence changes on the working branch," to be
  confirmed at synthesis.

## What still stands REGARDLESS (these are principled, not caution-about-users)
These are architectural / safety / brand invariants, not "be careful because
users are watching," so they are NOT relaxed by the above:
- **Never touch `main`.** All work stays on `claude/main-branch-content-update-dcqicf`.
- **ED safety system untouchable** — calorie floors (1,200 women / 1,500 men),
  −1.5%/wk rapid-loss threshold, Beat UK signposting, `edPatternDetector` thresholds.
- **Coaching engine stays deterministic** — no LLM, no AI, no randomness.
- **Offline-first; no PII to third parties; EU data residency; Expo managed (no eject).**
- **Free vs Pro gating** stays coherent (we may re-draw the line deliberately as a
  repositioning decision, but never leak Pro to free by accident or re-gate a free
  feature silently).
- **British English; billing product IDs `pro_monthly` / `pro_annual` unchanged.**

Anything that touches the genuinely sacred items above (ED safety presentation,
billing product IDs, locked-doc amendments) is still surfaced for explicit
sign-off before it lands — not out of caution about users, but because they are
deliberate invariants.
</content>
