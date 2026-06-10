# Phase 2 — Research: active workout / set-logging screen layout (density, fluidity, scroll)

**Date:** 2026-06-10 · **Status:** research, no build · **Method:** 5 parallel web-search agents (Hevy/Strong layout; set-entry fluidity; rest-timer/nav/small-screen; data-entry UX evidence; compact-logger patterns), cited, low-confidence flagged.

**Why this exists:** Founder feedback — the active-workout screen feels "too full," logging "isn't as fluid as it could be," and there's "too much scrolling even on a big phone" (worse on small devices). Keep the current visual style; fix the *layout/density/flow*.

**Volyume's current screen stacks (top→bottom):** slim header (timer/Finish) → exercise chips nav → "Target: N sets · reps" line → **large rest-timer card** (1:30, −30/−15/+15/+30, Skip) → cue banner → **large set card** (Set 1/3, full-width Weight stepper row, full-width Reps stepper row, Set type row) → **full-width "Log set" button** → action row (Note/Info/Add/Paired/Remove). That's ~7 stacked full-width blocks before a single set is logged — the direct cause of the scroll.

---

## 1. What the best loggers do (the compact recipe)

**Strong is the density/speed benchmark; Hevy is close.** The pattern, consistent across sources:

- **Set TABLE, one row per set — not cards.** Columns `Set | Previous | Weight | Reps | ✓`. This is "the single biggest space saver — cards are what make a logging screen feel too full." [Hevy track-exercises](https://www.hevyapp.com/features/track-exercises/), [Strong review](https://repreturn.com/strong-app-review/)
- **Per-row checkmark IS the log action** — one tap completes the set, fires the rest timer, (FitNotes) auto-advances. **No separate full-width "Log set" button** eating a row of height. [Hevy tutorial](https://www.hevyapp.com/hevy-tutorial/)
- **Previous value = dimmed, tappable autofill inline in the row** — tap it to copy last time's weight×reps. Costs zero extra vertical space and removes a whole "previous" section. [Hevy — Previous Values](https://help.hevyapp.com/hc/en-us/articles/36011896355479-How-to-Use-Previous-Workout-Values-to-Improve-Performance-in-Hevy)
- **Rest timer = a slim one-tap control just below the exercise name** (with −15/+15), **not a big card**. Strong shows it as a small top-corner chip that expands only on tap; Hevy offloads the countdown to an OS Live Activity. [Strong rest timer](https://help.strongapp.io/article/231-rest-timer), [Hevy Live Activity](https://www.hevyapp.com/features/live-activity/)
- **Secondary options are collapsed behind a tap, not always-on blocks:** set-type (warm-up/drop/failure) is hidden **on the set number itself**; RIR/RPE is opt-in, not a default column; notes are **one slim line** under the exercise name. [Hevy set types](https://www.hevyapp.com/help/change-the-set-type/)
- **Slim header:** timer left + Finish right, nothing else. [Hevy tutorial](https://www.hevyapp.com/hevy-tutorial/)
- **Speed:** Strong logs a set in **~3 taps / ~10s** via prefilled previous values + per-row checkmark — repeatedly cited as the fastest. [Setgraph comparison](https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026)
- **Cautionary tale:** JEFIT is called **"overcrowded and hard to navigate"** with timer pop-ups interrupting logging — the failure mode to avoid. Its own fix was moving actions into a 3-dot menu + swipe nav. [etechshout JEFIT](https://etechshout.com/jefit-app-review/)

## 2. UX evidence (density without shrinking tap targets)

- **Rows beat cards for repeated structured data** (scannability + far more per viewport); card padding/border/shadow is the vertical-space cost. [NN/g — Cards](https://www.nngroup.com/articles/cards-component/) **[OPINION]**
- **Attention concentrates above the fold and drops sharply below** (NN/g eye-tracking) — the **current set's inputs + primary action must sit in the first viewport.** [NN/g — Scrolling & Attention](https://www.nngroup.com/articles/scrolling-and-attention-original-research/) **[MEASURED]**
- **Thumb zone:** ~**49% one-handed, ~75% of taps are thumb-driven; bottom-centre is easy, top corners hardest** (Hoober, n≈1,333). Primary log action belongs bottom-centre; rare actions up top. [Smashing — Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/) **[MEASURED, 2013]**
- **Tap-target minimums: 44pt (Apple) / 48dp (Material)** — but this is the *hit area*, not row height. **Keep rows visually tight (4/8/12px spacing) while preserving ≥44/48 hit areas via hit-slop/padding that overflows the visible row.** This is the trick that makes a screen dense AND compliant. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/), [Material](https://m3.material.io/foundations/designing/structure) **[normative]**
- **Sticky bottom primary action is correct for a native app** (right-aligned, bottom-centre thumb zone) — but **float it above the keyboard** so it's never hidden during numeric entry. [UX Movement](https://uxmovement.com/mobile/optimal-placement-for-mobile-call-to-action-buttons/) **[OPINION]**
- **Input per field:** numeric keypad for weight; **stepper (or stepper+field) for reps** (small range/deltas suit steppers; NN/g caps steppers at ~0–10 before typing wins); keep the focused field above the keyboard; top-aligned labels. [NN/g — Input Steppers](https://www.nngroup.com/articles/input-steppers/) **[OPINION]**

---

## 3. Recommendation for Volyume — prioritised, style-preserving

The fix is **container chrome + spacing + collapsing**, not a restyle. Ordered by impact-to-risk:

**Tier 1 — high impact, low risk (pure layout, no input-flow change):**
1. **Rest timer: big card → slim one-tap bar.** Replace the tall card (1:30 + four buttons + Skip) with a single slim row just under the exercise name; tap to expand for ±/Skip. Reclaims the biggest block. (Only appears while a timer is running.)
2. **Collapse the Set-type row** onto the set itself (tap the set number/row to pick warm-up/drop/working) — removes a full-width row. Matches Hevy exactly.
3. **Tighten the spacing scale** on the logging blocks (16–24px → 8/12px) while keeping all tap targets ≥48dp via hit-slop. Removes dead vertical space without touching the look.
4. **Demote the "Target: N sets" line** into the set-table header (or the exercise sub-row) rather than its own line.

**Tier 2 — medium impact, medium risk (consolidation):**
5. **Make the set TABLE the primary surface** (I already built `SetTable` as display-only): show logged + upcoming rows with the dimmed tappable "previous" value, and a **per-row ✓** to complete — folding the separate big "Log set" button and the stepper card into the table row. This is the Strong/Hevy core. NOTE: this touches the proven input flow, so it's a deliberate, separately-tested step (CLAUDE.md: input flow is sacred) — prototype behind the existing flow, verify, then switch.
6. **Sticky primary action in the bottom thumb zone**, floated above the keyboard.

**Tier 3 — optional polish:**
7. Keep reps as a stepper+field (small deltas), weight as numeric keypad with +/- micro-adjust for plate increments.
8. Consider an OS Live Activity for the rest countdown (later; native module work).

**Net effect:** header + current exercise + a few set rows + the log action fit in **one viewport**, matching Strong's single-screen logging — directly answering "too full / too much scrolling," worst on small phones.

## 4. Caveats
- Vendors publish **no exact row heights/font sizes**; density claims are qualitative (reviews/snippets), not measured. Hevy/Strong/NN/g pages 403'd to direct fetch — claims are search-snippet extracts of those official pages + reputable secondaries, cross-checked.
- "Fits on one screen" is design *intent* (best-supported for Strong), not a guaranteed spec; many-set exercises still scroll.
- Hardest anchors: NN/g scrolling/attention (measured), Hoober thumb-zone (measured, 2013), Apple 44pt / Material 48dp (normative). Stepper range, cards-vs-rows, sticky-button placement are credible heuristics, not experiments.
- **Tier 2 (#5) changes the input flow** — Volyume's logging flow is explicitly proven/sacred, so it must be prototyped and verified before replacing the current stepper+Log-set flow, not swapped blind.
