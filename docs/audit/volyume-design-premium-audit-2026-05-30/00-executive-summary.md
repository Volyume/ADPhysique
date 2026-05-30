# 00 — Executive summary

Volyume design premium audit, 2026-05-30. Full detail in the numbered
files; this is the direction in plain terms.

## The direction, in one paragraph

Volyume already has a genuinely good design foundation — better than its
current finished feel suggests. The reason it reads "good but not elite" is
not missing infrastructure; it's that the best parts of the system the team
already built are barely switched on. The fix is mostly *adoption*: wire in
the typography ramp, the press primitive, and the surface ladder that
already exist, add tabular numerals to the data, and bring everyday motion
up to one consistent standard. The identity stays what the app actually
ships — **amber on near-black, a calm precision instrument for serious
lifters**, in the spirit of Whoop, Linear and Stripe rather than a soft
wellness app.

## What's already premium (preserve, don't touch)

- One centralised, accessibility-aware token file (`theme.js`) with a
  semantic, WCAG-verified, single-accent dark palette.
- An elite spring-press primitive (`PressableCard`) and a clean `Button`.
- A best-in-class, intent-named haptics vocabulary (`haptics.js`).
- Strong `Skeleton`, `EmptyState` and hand-built SVG `Illustrations`.
- First-class reduce-motion discipline on every animation.
- The "no decorative gradient / numbers-are-hero / direct copy" rules —
  research confirms these are genuinely premium, not limiting.

## The core problem (the evidence)

The highest-value tokens are defined and then not consumed:
- The semantic typography ramp (`type.display`…`type.caption`) is used in
  **0 of 61 screens** — every screen hand-assembles fonts, so heading
  tracking and body line-height drift everywhere.
- Data numbers are **not tabular**, despite the app's own "numbers are the
  hero" rule — so columns and changing values jitter.
- The crafted spring-press is in **12 files**; plain touchables are in
  **72**, with **8 different** press-opacity values — two "feels" coexist.
- The `Card` primitive is in **6 files**; **50 screens** hand-roll cards.
- The dark surface ladder is **compressed and pure-neutral** with almost no
  elevation, so the whole app reads flat.
- `motion` token ≈ unused; `shadow` used twice; **Reanimated installed but
  never used**.

## Top 10 highest-leverage changes

1. **Adopt the `type` roles on every screen + tabular numerals on all data.**
   The single biggest perceived-quality lift; the system already exists.
2. **One press feel everywhere** — route the 72 touchable files through the
   existing `PressableCard`/`Button`.
3. **Widen and faintly warm the dark surface ladder** and add a
   `surfaceElevated` tier, so depth finally reads (fixes the flatness).
4. **Deepen large amber fills** (`primaryFill #E08C0B`) so big buttons stop
   optically vibrating; keep bright amber for small marks and key numbers.
5. **Body size 15→16** for premium readability.
6. **Make the Active Workout screen the signature surface** — display-size
   tabular timer, COMPLETE SET as the largest deepest-press amber action,
   the workout-entry hero transition.
7. **Tokenise motion onto Reanimated** with researched curves/durations; add
   a once-on-focus screen entrance and staggered list loads.
8. **Skeletons on the 14 screens still showing bare spinners.**
9. **Widen haptics reach** to everyday toggles/segments/pickers (the
   vocabulary is already excellent; it just doesn't reach far enough).
10. **Lock the system in:** rewrite the stale design doc to amber, add CI
    lint guards against hardcoded hex/font literals, and move the 9 inline
    shadows + stray hex to tokens.

## Decisions you confirmed

Keep amber (retire the blue doc) · stay on the system font for now · warm +
widen the surface ladder · deepen large amber fills · body 15→16 · tabular
numerals on all data · hero-only number animation · one press feel · full
Reanimated migration · skeletons everywhere data loads · CI lint guards ·
exhaustive 61-screen audit · effort/impact tags on the roadmap · plan now,
build the Foundation tier after roadmap approval.

## Two honest call-outs

- **Full Reanimated migration:** you chose to migrate *all* existing
  animations, not just build new ones on Reanimated. I'll do it, but it's
  the one place effort + regression risk exceed the visible payoff (the
  working confetti/splash look the same afterward). It's sequenced last and
  isolated per-commit so it can be deferred or dropped without affecting
  anything else.
- **The amber refinement is a refinement, not a fix** — if you'd rather not
  touch the accent at all, `#F59E0B` everywhere remains acceptable; only the
  surface-ladder flatness is a true must-fix.

## What happens next

This pass changed **no app code** (docs only, per the brief). On your
approval of the roadmap, I implement **Tier 1 (Foundation)** as a separate
signed-off follow-on — token additions, the type-role adoption, the surface
ladder, the Card consolidation, shadow/hex cleanup, CI guards, and the doc
rewrite — each behind the existing mount-sweep and lint, full suite green
before every push. High-visibility and Polish tiers follow in later passes.
