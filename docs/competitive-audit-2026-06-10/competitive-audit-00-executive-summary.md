# Competitive Audit 2026-06-10 — Executive Summary

The most comprehensive competitive audit run on Volyume to date: a full
codebase baseline, then fourteen parallel research passes covering every
product area against the best apps in the world, drawing on App Store and
Google Play reviews, Reddit, YouTube, Trustpilot, teardowns, forums and
published research. Full evidence is in the 01 reports; the comparison
matrix is document 02; the scored roadmap is document 03.

---

## Where Volyume genuinely leads the market

1. **Safety.** No competitor anywhere has mechanistic eating-disorder
   safeguards — hard calorie floors, a RED-S-aware floor, a rapid-loss
   gate, ED-pattern detection with Beat signposting. The market leader's
   defaults carry a clinical finding that 73% of ED patients said the app
   contributed to their disorder. This is a category-unique, clinically
   relevant moat — currently invisible to prospective users.
2. **Honest, explained coaching.** Volyume is the only product found that
   combines explainability, adherence-forgiveness, confirm-then-apply,
   "not enough data" honesty, and safety floors. 42% of users are
   AI-coaching skeptics; "we show our working, we don't guess" is a
   marketable position the £-leader (Caliber) already proves sells.
3. **Offline everything.** No major competitor offers fully offline food
   search (MacroFactor says it likely never will). Training already works
   offline everywhere. This is provable, rare, and unsaid.
4. **Plan personalisation inputs.** No competitor has named weak-point
   specialisation or a goal taxonomy as deep (V-taper, X-frame, 15 weak
   points). RP and Juggernaut earn "elite programming" reputations while
   charging 7-10x Volyume's price with no offline mode.
5. **Value.** £4.99/month with training + nutrition bundled undercuts
   every coaching comparator, and the 21-day cardless trial is the most
   generous in the researched set.
6. **Privacy-correct accountability.** Training Partners sits on the right
   side of every documented social-feature failure (no feed, no
   leaderboards, derived signals only) — the Apple Activity Sharing
   shape, which is the model proven to retain.

## Where Volyume matches the field

Logging speed and table UX (Hevy/Strong class, just shipped); progress
analytics substance (beats 8 of 10 on analysis, behind on celebration);
check-in machinery (matches MacroFactor on explanation and data-holds);
reliability architecture (Hevy-class, but unproven in users' eyes);
design system discipline (ahead on engineering, behind on expressive
identity); paywall hygiene.

## The 10 improvements with the biggest effect on users

1. **Close the demo gap** (COMP-004) — licence the full MoveKit animation
   library (~$99) + film ~20 flagship lifts. The weakest content area;
   every other ranked app has 350-2,000 demos; Volyume has a handful.
2. **Ship refeeds and high/low-day macros** (COMP-007) — the most
   wished-for nutrition features in the category; the engine scaffolding
   already exists as dead code; even MacroFactor users hand-edit days.
3. **Value-first onboarding** (COMP-008) — show the generated plan before
   the account wall. The category law: users tolerate anything after a
   felt moment of value and resent everything before it. Needs a founder
   decision on the locked identity sequence.
4. **Curated UK food layer** (COMP-006) — first-search success is the
   strongest retention lever in food logging; Nutracheck's 500k verified
   UK foods vs Volyume's ~25k snapshot is the gap.
5. **Rationale-led plan reveal** (COMP-009) — every algorithmic rival
   fails on "feels random, no explanation"; Volyume has the explanations
   and shows a plain list.
6. **Check-in discovery framing + conditional questions** (COMP-010) —
   the exact mechanisms behind MacroFactor's community trust, achievable
   as copy/rules inside the deterministic engine.
7. **Step-trend coach modifier** (COMP-012) — let the coach distinguish a
   NEAT collapse from a metabolic stall; "I walked more and the app
   didn't care" is the felt absence.
8. **Monthly report + 90-day recap** (COMP-013) — Volyume's first real
   celebration currently lands at day 365, after the 3-month churn window
   closes; Hevy celebrates at 10 workouts.
9. **Partner cheer + shared streak** (COMP-014) — Training Partners is
   passive; every winning accountability feature lets partners act.
10. **Lock-screen rest-timer controls** (COMP-017) — the most visible
    logging differentiator Volyume lacks, on the platform (Android) where
    background timer death is the most universal complaint.

## The 5 quick wins that could ship immediately

1. **Say the quiet parts loud** (COMP-001): "No card for 14 days", the
   fairness charter (no retro-paywalls, your data is always yours, works
   offline), and the safety stack — on the welcome screen, paywall and
   store listing. Highest score in the audit (Impact 8 / Effort 2).
2. **Sync-trust indicator** (COMP-002): "All backed up / 3 changes
   waiting" — converts an invisible engineering lead into the trust
   currency the category's worst review narratives are made of.
3. **Insights that end with an action** (COMP-003): every insight states
   what Precision Coaching will do about it — kills the "dashboard that
   doesn't coach" failure at the plateau-churn moment.
4. **Optional body fat with estimate path** (COMP-005): the engine
   already degrades gracefully; the question currently adds friction at
   the most fragile point of the funnel.
5. **Reactive daily narrative** (COMP-011): a yesterday-aware home line
   gives daily "it sees me" presence without touching the weekly engine.

## The single biggest opportunity

**Own "the honest coach".** Across all fourteen areas, one pattern
repeats: competitors lose trust at the exact points where Volyume is
already strong but silent — unexplained AI recommendations, guilt-driven
targets with no safety net, retro-paywalled features, silent data loss,
plans that feel random. Volyume's deterministic engine, confirm-then-apply
model, safety floors, fair pricing and offline-first architecture are the
complete answer to the category's chronic trust failure. No competitor
can assemble that set, because each would have to abandon its business
model or rebuild its architecture to do so.

The audit's consistent finding is that Volyume's deficit is not
intelligence but *expression*: the engine is smarter than it looks, safer
than it says, and more reliable than it shows. The fastest path to
"better than the best" is to make the existing intelligence felt — at the
reveal, in the review, on the lock screen, in the store listing — while
closing the two genuine content debts (exercise demos, UK food depth).

---

*Documents in this audit:*
- `competitive-audit-00-volyume-baseline.md` — what Volyume is today
- `competitive-audit-01-*.md` — fourteen area research reports (sourced)
- `competitive-audit-02-comparison-matrix.md` — per-area lead/match/lag
- `competitive-audit-03-master-proposals.md` — 22 scored proposals in 4 tiers

*No code was changed during this audit.*
