# Brand typeface shortlist (D25 decision round)

**Status: AWAITING FOUNDER PICK (authored 2026-07-11). D25 approved the
mechanism (a brand variable font via expo-font, bundled as an asset —
no external font package, so no new dependency beyond what D25 already
approved); the founder retains taste on the final typeface.**

## What the typeface must do (binding criteria)

1. **Real tabular figures (the `tnum` OpenType feature).** The app's
   numerals-as-hero system (`type.num()` on every data number — weights,
   reps, kcal, timers) depends on digits that align in columns. React
   Native applies `fontVariant: ['tabular-nums']` only if the font file
   carries the feature. Any candidate fails without it.
2. **A variable weight axis** covering the type ladder (roughly 400-800)
   in ONE file, keeping the bundle small.
3. **Open licence (SIL OFL)** — shippable in a paid app, no fees.
4. **Calm, plain, confident** — matches the locked coaching voice. Not
   techy, not shouty, clearly distinct from the system fonts users see
   all day (SF on iOS, Roboto on Android).
5. **Dense-UI legibility** — the logger and diary set numerals small.

## The shortlist

| # | Typeface | Character in one line | Weight axis | tnum | Note |
|---|----------|----------------------|-------------|------|------|
| 1 | **Manrope** | Geometric with a humanist warmth; distinctive but never loud; numerals have real personality | 200-800 variable | **Verified** | The strongest calm-but-ownable fit for the brand voice |
| 2 | **Schibsted Grotesk** | Editorial, newsroom-bred trust; digital-first UI design; quietly distinctive a/g | 400-900 variable | Verify in file | Reads "credible and calm"; slightly more serious tone |
| 3 | **Plus Jakarta Sans** | Warm, friendly geometric; open counters, very legible small | 200-800 variable | Verify in file | The most approachable of the five; risks reading soft |
| 4 | **Instrument Sans** | Neo-grotesque with subtle personality; also has a width axis for display moments | 400-700 variable (+wdth) | Verify in file | Modern and composed; width axis is a bonus, not a need |
| 5 | **Inter** | The benchmark UI font; superb at every size; full feature set | full variable | **Verified** | The zero-risk baseline — but ubiquitous, weakest brand distinction |

Considered and dropped: Space Grotesk (techy/display tone, wrong for a
calm coach), Geist (strongly associated with another brand), Satoshi
(Fontshare licence, not OFL).

## Recommendation

**Manrope**, on the criteria: verified tabular figures, a full variable
weight range, and the best balance of calm and ownable — it will read as
VOLYUME's voice rather than "an app font", while Inter stays the
fallback if the founder wants zero risk. (Recommendation only; the pick
is the founder's by D25.)

## Adoption plan (one build slot after the pick)

1. Download the official variable TTF; verify `tnum` and the weight
   range in the actual file (fontTools check) — the verify-in-file
   candidates get confirmed or eliminated here.
2. Bundle as an asset; load via expo-font at the RootNavigator gate
   (blocking font load before first paint, no flash of system font).
3. Wire through `theme.js` type roles ONLY (one fontFamily source of
   truth; `type.num()` keeps `fontVariant: ['tabular-nums']`).
4. Dynamic-type + dense-surface device walk (logger numerals, diary
   macros, charts) on the founder's phone before it ships anywhere.
5. Regression: snapshot tests re-baselined in the same commit; lint +
   full suite; the usual landing discipline.

## The ask

Reply with a number 1-5 (or "none, stay system"). Everything else in
the plan is mechanical after the pick.
