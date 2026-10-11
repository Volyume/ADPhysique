# 08 The plan rulebook: framework (to be filled from the founder's research)

Status: framework only, 2026-10-11. No values below are decided except those marked FIXED (founder rules already given). Every value marked TO SET comes from the founder's independent research and is approved by the founder before any code is written. Nothing in the app changes until then.

## Part 1. How the rulebook governs every plan

1. **One rulebook, in one place.** The rulebook becomes a single data module in the app: category structures, numeric limits and the rule list. Every value carries its source. The planner reads it and hard-codes no structure or limit of its own.
2. **One checker, run on every plan the app can produce.** A test builds every combination (every category, 2 to 6 days, every session length, every equipment setting, focus picks, experience levels) with the real exercise library. It also runs every path that changes a plan after it is built: weekly check-ins, swaps, rebuilds and continuity, library and kit plans, and the older generator wherever it can still run. Any rule broken fails the gate, and nothing merges.
3. **Founder sign-off before any build.** A rendered page shows every category's week at every day count, with its measured checks. The founder approves it before an EAS build is started.
4. **Change control.** Changing a rulebook value needs a source and the founder's approval. There is no same-day patch-and-ship: every change runs the full checker first.

## Part 2. FIXED rules (founder decisions already given)

| # | Rule | Source |
|---|---|---|
| F1 | The coaching engine is deterministic: same inputs, same plan. No AI or randomness at runtime. | CLAUDE.md section 2 |
| F2 | The category's standard routine is always kept. Focus picks and emphasis add on top and never take from it. | Founder, 2026-10-10 |
| F3 | No exercise or set is removed to fit the clock. Rest is shortened first, then the real session length is shown. | Founder, 2026-10-10 |
| F4 | Men's physique trains legs in one session a week at every day count. | Founder, 2026-10-10 |
| F5 | Users have no fixed training days. The next session in the rotation may be the next calendar day. | Founder, D219 (2026-10-04) |
| F6 | A plan with poor structure that risks injury is unacceptable. Recovery is never traded for volume. | Founder, 2026-10-11 |

## Part 3. The decisions the research must answer (TO SET)

### A. Category week structures

For each category (general, bodybuilding, men's physique, classic physique, bikini, wellness, figure, women's physique) and each day count (2 to 6):

| Category | Days | Session 1 | Session 2 | Session 3 | Session 4 | Session 5 | Session 6 | Source |
|---|---|---|---|---|---|---|---|---|
| (each) | (2 to 6) | name: muscles | ... | | | | | TO SET |

- A1: May the order of sessions be changed by the planner, or is it fixed? Which pairs must never be adjacent?
- A2: May a muscle not named in a session be added to it, for example to reach a set target? If yes, under what limit?

### B. Weekly volume per muscle, per category

| Category | Muscle | Minimum direct sets a week | Typical | Upper | Sessions a week | Source |
|---|---|---|---|---|---|---|
| (each) | (each) | TO SET | TO SET | TO SET | TO SET | |

- B1: How indirect work counts toward a muscle (for example, does a chest press count as part of a triceps or front-delt set, and at what fraction?).
- B2: Starting volume in week 1 and the climb to the peak week, and the deload week.

### C. Recovery between sessions

| Muscle | Minimum hours before training it directly again | With heavy compound load | Source |
|---|---|---|---|
| (each) | TO SET | TO SET | |

- C1: Does indirect load (for example front delts from chest pressing) count against these hours?
- C2: The rule when the next session may be the next day (F5): is it "no muscle trained directly in two back-to-back sessions", or something weaker for fast-recovering muscles (calves, abs, side delts)?

### D. Session limits

| Limit | Value | Source |
|---|---|---|
| D1 Exercises per session, maximum | TO SET | |
| D2 Working sets per session, maximum | TO SET | |
| D3 Sets per exercise, compound and isolation, maximum | TO SET | |
| D4 Direct sets per muscle in one session, maximum | TO SET | |
| D5 Exercises per muscle in one session, maximum | TO SET | |
| D6 What happens when the standard does not fit the chosen session length (F3 says nothing is removed; the research says how the week should be shaped instead) | TO SET | |

### E. Joint protection

| Rule | Value | Source |
|---|---|---|
| E1 Overhead pressing: sessions a week, maximum | TO SET | |
| E2 Pressing (chest or overhead) in back-to-back sessions | TO SET | |
| E3 Heavy hinge and heavy squat: back-to-back sessions | TO SET | |
| E4 Elbow load: arm isolation in back-to-back sessions | TO SET | |
| E5 Front delts: trained directly at all where chest pressing already loads them? | TO SET | |

### F. Exercise selection

- F-1: Exercises per muscle per session and across the week; how much variety is required.
- F-2: The same exercise in two back-to-back sessions: allowed or not.
- F-3: Equipment fallbacks when a muscle has only one exercise for the person's kit, and whether one exercise may then take more sets than the normal cap.
- F-4: Exercise order inside a session (compounds first, focus muscle first, and so on).

### G. Focus picks

- G1: How many sets a focus pick adds, and in which sessions.
- G2: What a focus pick may never do: break C, D or E, or take from another muscle's standard (F2).

### H. Priority order when goals conflict

An ordered list, most important first, of: recovery between sessions (C), joint protection (E), the category standard (B minimum), focus additions (G), session limits (D), session length (F3), growth above the standard. Each with a reason and a source.

### I. Experience levels

How beginner and advanced change B, C, D and the climb.

### J. After the plan is built

Weekly check-ins (raising, holding, pulling back sets), swaps, rebuilds and library plans must all obey A to H. For each: TO SET what it may change and what it may never change.

## Part 4. The checker: rules in checkable form

Each rule becomes one check over every plan. The numbers come from Part 3.

| Check | Fails when | Values from |
|---|---|---|
| K1 Structure | A session's muscles differ from the category's table for that day count | A |
| K2 Volume | A muscle's weekly direct sets fall outside its category range at the peak week | B |
| K3 Recovery | A muscle is trained directly in two sessions closer than its minimum hours, assuming the next session may be the next day | C, F5 |
| K4 Session limits | A session exceeds an exercise, set, per-muscle or per-exercise limit | D |
| K5 Joint protection | An overhead, pressing, hinge or elbow rule is broken | E |
| K6 Variety | The same exercise appears in two back-to-back sessions, or two sessions are near-copies | F |
| K7 Focus | A focus pick takes sets from another muscle's standard, or breaks K3 to K5 | G |
| K8 Determinism | The same inputs give a different plan | F1 |
| K9 Length | A session is past the chosen length without the plan saying so | F3 |
| K10 After the build | A check-in, swap, rebuild or library plan produces a plan that fails K1 to K9 | J |
