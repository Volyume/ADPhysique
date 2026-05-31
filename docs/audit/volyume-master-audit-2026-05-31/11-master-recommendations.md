# 11 — Master Recommendations

Status: **COMPLETE** — this is the action plan. **No code has been changed.**
Date: 2026-05-31
Source: every item traces to a Phase 2 finding (A2-xxx) or a later-phase
finding (N3/D9/P10/P6), each line-cited in its own doc. Rule 1 holds: nothing
here is asserted that wasn't verified. **Phase 12 (implementation) starts only
after you approve this plan and we agree scope.**

---

## How to read this
Findings are grouped by **what they cost the user or the business**, then
ordered by severity within each group. "Pre-launch" means it should be fixed
before the project is considered built-out (release policy: the current
closed-test build stays until the whole thing is done). "Anytime" means it's
real but not blocking. Every runtime-critical fix (Rule 5) carries a
**tests-alongside** note.

---

## Tier 1 — Values & trust (decide these first)

These aren't ordinary bugs. They touch user trust and the app's ethics, and
two of them need **your** call, not an engineering default.

### T1-A — A2-063: paywall fires on distress signals *(founder values call)*
`differentialPaywall.js` prioritises **`extreme_soreness` and `energy_crash`**
as the top "Try Pro free" conversion triggers (`TRIGGER_CONTEXTS:56-63`). The
real safety guardrails stay free and the copy is honest, but surfacing a
paywall *because* a user's soreness or energy is crashing can read as
**monetising distress** to a vulnerable person. This is the single most
important non-code decision in the audit.
- **Recommendation:** de-prioritise or remove the safety-adjacent contexts
  from the conversion trigger list, or soften the copy so the paywall never
  rides on a distress signal. Keep the off-target/performance triggers.
- **Why it matters:** it sits directly against the ED/RED-S safety posture
  that is otherwise the app's strongest differentiator (Phase 10 §2). One
  undercuts the other.
- **Decision needed from you.** Then a small, tested change.

### T1-B — A2-043: lbs is label-only, numbers are silently kg-centric *(HIGH product bug)*
Gym weight is stored raw in the display unit with no conversion; progression
increments, plate calculator, bar weight and history are all kg-modelled, so
a lbs user gets wrong-sized jumps and inconsistent reads
(`ActiveWorkoutScreen:748`, `SetEntry` +/- hardcoded 2.5, `PlateCalculator`
kg end-to-end, A2-039/A2-043). For a data app, wrong numbers are the worst
place to lose trust, and a large share of users (US) log in lbs.
- **Recommendation (low-risk):** `units.js` conversion helpers already exist
  and are simply unused for gym weight — route gym-weight I/O, progression
  increments, plates and bar weight through them. **Tests alongside** (Rule 5
  — this is a contract change). This is the highest-value *code* fix found.

### T1-C — A2-016: Apple Sign-In uses browser OAuth, not native *(App Store risk)*
Only true blocker for an iOS submission (Phase 5). Browser OAuth flow where
Apple requires native Sign in with Apple. Pre-launch if iOS ships.

---

## Tier 2 — Correctness & reliability (pre-launch code fixes)

Real defects with user-visible consequences. All low-to-medium risk to fix.

| ID | Fix | Notes / tests |
|---|---|---|
| **A2-040** | `calculate1RM` is Brzycki-only above 20 reps → inflated e1RM, can fire spurious 1RM PRs | Cap the formula or switch above ~12 reps; the live e1RM chip already gates reps 1–15, so blast radius is the PR engine. Tests alongside. |
| **A2-001 / A2-012** | Duplicate sync paths fire on every foreground; cold launch runs full upload + full pull | Route all callers through `syncAll` so `_runLock` covers them. Idempotent today (perf, not corruption), but wasteful and confusing. Tests alongside (runtime-critical: sync). |
| **A2-038** | `getVolumeStatus` + `BodyDiagramHeatmap` regions use hardcoded hex that bypasses the colour-blind / high-contrast palette | Swap to `volumeColors`/tokens so a11y modes actually recolour volume bands. Cheap. |
| **A2-004 / A2-006** | Auth deep-link errors and heavy `.catch(()=>{})` are silently swallowed | Surface auth-deeplink failure to the user; add a quiet "last synced" signal for repeated sync failure (NOT a nag — Phase 8 lesson). Tests alongside (auth + sync). |
| **A2-014 / A2-021** | Health-consent re-prompt inconsistency; 60s "new vs returning" heuristic can skip onboarding for slow email-confirmers | Make consent paths consistent; replace the time heuristic with an explicit flag. Tests alongside (permissions). |
| **A2-019** | Sign-out's `AsyncStorage.clear()` wipes device-wide prefs + other accounts' caches | Scope the clear to this user's keys. Respect the identity lock (sign-out wipes local SQLite is correct; nuking *device* prefs is the over-reach). Tests alongside (identity). |
| **A2-060** | `csvExport.js` doesn't neutralise CSV formula-injection prefixes (`=`,`+`,`-`,`@`) | Prefix-escape on export. Small, security-hygiene. |

---

## Tier 3 — Performance (profile, then tune)

| ID | Fix | Severity |
|---|---|---|
| **A2-048** | RestTimer drives a dead JS-thread `Animated.timing` every rest that renders nothing | Low–med — remove/rewire. Clearest perf win, zero UX risk. |
| **A2-013** | Fixed 2.5s splash every cold launch | Medium UX — make it a *max*, not a *min*, or shorten. Your brand call. |
| **A2-008** | `lazy={false}` mounts all 5 tab stacks at entry | Low — consider `lazy` for the heaviest non-Home tabs; quantify on device first. |
| **A2-055** | N+1 `updated_at` lookups on pull | Low — batch with `IN (…)`. |
| **P6-001/002** | FlatList `windowSize` tuning + `React.memo` on heavy rows | Low — profile-driven only. |

**Before deep tuning:** run a Sentry-traces pass on cold-start and large-list
scroll (Phase 6 — no on-device profiling was in static scope).

---

## Tier 4 — Maintainability & dead code (anytime, lowers future risk)

- **A2-046:** planEngine emits two divergent progression models; only
  mesocycle's MESO_SCHEDULE is live. Remove the dead output so the live model
  is unambiguous. *(Runtime-adjacent — confirm no consumer, tests alongside.)*
- **A2-029 / A2-061:** two coexisting sync architectures + two offline-queue
  systems, deliberately mid-migration. Not a bug; finish or document the
  migration so the next session doesn't trip on it.
- **A2-036:** four copies of a `Math.random` `uid()` (store, food/db,
  syncQueue, +1). Consolidate to one CSPRNG helper (also closes A2-020). Low.
- **A2-067 / N3-002 / A2-066:** dead legacy `OnboardingScreen` (live path is
  `FirstRunScreen`) with a non-canonical goal taxonomy. Remove for one clear
  front door (Phase 10 §1).
- **Confirmed dead vars / trivia (A2-042, A2-049, A2-052, A2-003, A2-024,
  A2-025, A2-058, A2-062, A2-065, A2-053/054):** batch-clean. Pairs with the
  ESLint quick win below so they stop hiding.
- **A2-045 / A2-011:** `runWeeklyCoach` (~740 lines, 40+ inputs) and the
  cold-launch bootstrap are the two highest-complexity units. Don't refactor
  speculatively, but add characterisation tests before any future change
  (Rule 5/7).

---

## Tier 5 — Tooling & gates (cheap, high-leverage protection)

These make every future session safer and are mostly config:

1. **Add `eslint-plugin-react` (jsx-uses-vars)** so the 1,613 unused-vars
   false-positive collapses and genuine dead code stops hiding (Phase 7 §A.1).
2. **Add a copy-lint grep gate** for em dashes + the CLAUDE.md AI-tell word
   list in `src/**` JSX strings — guard the *voice* rule the way the hex gate
   guards the *colour* rule (D9-004).
3. **Consider a `tsc`/JSDoc-checked gate or incremental TS** — there is no
   static type checking on ~84k LOC (Phase 7 §A.4). Long-term, not urgent.
4. **`--detectOpenHandles` pass** to localise the Jest open-handle warning
   (Phase 7 §A.2). Low.
5. **Resolve `npm audit` highs on the next Expo SDK bump** — they're
   build-chain + `xlsx` devDep, not shipped runtime (Phase 5 §8 / Phase 7).

---

## Tier 6 — On-device judgement (yours to eyeball)

Static analysis can't make these calls:
- **D9-001:** YearOfLifts paging — confirm it doesn't read as an onboarding
  template.
- **D9-002 + TODO-1:** HomeScreen card composition / the parked steps-pill +
  week-card merge.
- **D9-003:** screen-reader pass on ActiveWorkout/Analytics for unlabeled
  nodes.
- **P10-001:** the streak headline editorial ("doing the heavy lifting") vs
  the no-encouragement rule — keep the fact, your call on the warmth.
- **A2-027:** extreme text-scaling overflow on dense screens.

---

## Suggested Phase 12 sequence (for approval)

If you approve, the order that minimises risk and maximises trust-recovery:

1. **T1-A** (paywall distress trigger) — your decision, then a tiny tested change.
2. **T1-B** (A2-043 units) — highest-value code fix, tests alongside.
3. **Tier 2 correctness batch** (A2-040, A2-001, A2-038, A2-019 first), each
   with tests, committed separately.
4. **Tier 5 gates** (eslint-plugin-react + copy-lint) — cheap, protects the rest.
5. **A2-048** (dead animation) + the dead-code batch.
6. Everything else as scoped follow-ups.

**I will not start any of this until you confirm scope.** The release policy
(no new closed-test build until the project is built out) and the identity /
`user_id` / no-`--no-verify` locks all still apply to every change.

---

## One-line verdict
The codebase is **genuinely well-built**; the real work is a **small,
cross-cutting cluster** — a values call on the paywall (T1-A), a units-trust
fix in the core loop (T1-B), an Apple-Sign-In blocker if iOS ships (T1-C), a
handful of correctness fixes, and cheap tooling gates. There is no structural
rot and no fabricated finding in this audit.
