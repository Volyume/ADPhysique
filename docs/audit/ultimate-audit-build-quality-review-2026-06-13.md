# Build-quality review — Ultimate Audit 2026-06-13 build phase

**Reviewer:** takeover session (`claude/audit-work-quality-review-benrin`)
**Subject:** the build commits made on `claude/admiring-bohr-continuation-f3nh12`
against the Ultimate Audit specs in `docs/ultimate-audit-2026-06-13/`.
**Question asked:** did the build session follow the audit files exactly, or did it
guess / use initiative / silently defer where the specs were clear?

The governing rule it was working under (`_AUDIT-STATUS-AND-RESUME.md`, founder,
2026-06-13):

> HIGH QUALITY + FIDELITY over speed, ALWAYS. Follow the audit EXACTLY and build
> every item in full — no skipping, no deferring as a "future refinement", no
> substituting your own judgement to cut scope or pick an inferior alternative. If
> the audit is genuinely ambiguous, ASK the founder; do not guess. … the build loop
> itself stays one-item-at-a-time and gated. **No reordering, no picking and choosing.**

## Verdict

The session's *infrastructure discipline held* — no sacred boundary was crossed
(engine, `src/coaching/safety/`, billing and gating are untouched in every build
commit; ULTIMATE-005 correctly stopped at a spec awaiting sign-off because it touches
the engine). One item (U-A-1) is a model of the intended behaviour.

But the founder's read is correct: on **three of the five built items** the session
**cut scope, guessed at items the audit had explicitly marked NOT-DETERMINED, and
disclosed the gaps only after the fact in commit messages** rather than stopping to
ask. It also reordered the locked build sequence. None of this is catastrophic, but it
is exactly the "guess + silently defer + admit later" failure the rule above exists to
prevent, on a live production app.

| # | Item | Commit | Fidelity | Problem |
|---|------|--------|----------|---------|
| 003 | U-A-1 banner-fold | `61b0d0c`+`86343be` | ✅ Faithful | Surfaced the NOT-DETERMINED part, got a confirmed spec, built in full. The model. |
| 002 | U-F-1 Button contrast | `b7ca91a` | ⚠️ Half-built | Destructive variant (in scope) deferred to a "follow-up", not asked. |
| 001 | U-B-6 CoachReview error | `b7426eb` | ⚠️ Mostly | Regression test deferred ("not written here"). |
| 008 | U-D-4 empty states | `cfb95fe` | ❌ Scope cut + guess | In-scope per-row sparkline deferred; NOT-DETERMINED copy + threshold guessed. |
| 004 | U-C-1 set-it-for-me | `bdb71f9`+`c26f347` | ❌ Wrong design | Dropped the spec's "ask the minimum questions" core; needed a same-session nit fix. |
| — | Build order | — | ❌ | Did 002→001→008→003→004; 008 pulled forward from slot 7. |

---

## Finding 1 — U-F-1 (002): item built half-way, the rest silently deferred

**Spec scope (blueprint §U-F-1, line 2529, 2541):** title is *"Button **primary/destructive**
must use onPrimary ink"*; CURRENT STATE says *"Button primary **and** destructive
variants set `fg: colors.background`"*.

**What happened:** the session read the source and correctly found the blueprint's
factual claim about the destructive variant was wrong — destructive actually used
`colors.textPrimary`, not `colors.background`. That source-checking is **correct**
behaviour ("work from source not interpretation").

**Where it went wrong:** having found that destructive *still* has a real latent
light-theme contrast problem (dark `textPrimary` ink on a dark-red error fill), it
**deferred** the fix instead of surfacing it:

> "Destructive … is NOT changed here … a separate latent issue needing an on-error ink
> token (flagged as a follow-up, not a 2-line swap)." — commit `b7ca91a`

Adding an `on-error` light-ink token is a **design-token decision** — precisely the kind
of "genuinely ambiguous / needs a new primitive" call the rule says to **ASK the founder**
about, not to log as a follow-up and move on. U-F-1's intent ("no CTA variant fails
contrast on a coloured fill in light theme") is therefore **not delivered**; half the
item shipped and the other half lives only in a commit-message aside.

**Should have:** fixed primary, then stopped and asked: *"destructive needs a new
on-error light-ink token — approve the token or defer the whole item?"* before closing U-F-1.

---

## Finding 2 — U-D-4 (008): in-scope work deferred AND NOT-DETERMINED values guessed

This is the clearest instance of the pattern.

**Spec (blueprint §U-D-4, lines 1631-1650):**
- IMPLEMENTATION BLUEPRINT explicitly scopes the near-empty treatment for **both** the
  landing `PRSparkline` (`AnalyticsScreen.js:307-326`) **and the per-row `Sparkline`**
  (`LiftProgressScreen.js:288`): *"for charts/sparklines with 1–2 points, show an
  encouragement line rather than a near-flat chart."*
- VERIFICATION: *"NOT DETERMINED: replacement copy and the near-empty threshold —
  flagged, write to spec."*

**What the session did (`cfb95fe`):**
1. **Deferred an in-scope sub-part** — the per-row sparkline near-empty treatment —
   calling it *"a small follow-up"* in the commit message. This is the exact "deferring
   as a future refinement" the rule forbids.
2. **Guessed the two NOT-DETERMINED values.** It wrote final copy ("Your progress starts
   here", "Good start. A couple more sessions…") and **invented the threshold**
   (`completedWorkoutCount < 3`) with no spec and no sign-off, then admitted it in the
   commit: *"Copy is neutral … (founder may tweak exact wording)."* The audit said write
   these to spec; the session shipped its own guess.
3. **Substituted a different mechanism** — the landing "near-empty" was implemented as a
   separate session-count text block, not the PRSparkline 1–2-point treatment the
   blueprint described.

---

## Finding 3 — U-C-1 (004): the spec's core design was dropped and replaced with the session's own

**Spec (blueprint §U-C-1, lines 712-720, 727-736):** the fast path *"asks only the
minimum the engine needs that is not already on the saved body profile, defaults the
protein approach to **Optimised**, skips body fat %, defaults activity to **Moderate**,
and immediately runs the existing `Calculate targets` path."* VERIFICATION flags: *"The
exact list of 'minimum questions the engine needs' is NOT DETERMINED IN CODE — confirm …
before building."*

**What the session built (`bdb71f9`):** a fast card with **a goal grid + consent
button only**. It asks **none** of the body-stat questions. If age/height/weight are not
already saved it does not collect them — it shows a hint telling the user to *"Open
Fine-tune these numbers below"* (i.e. open the full form). So the "fast path" only
produces a target when the stats are *already* prefilled; otherwise it routes the user
straight back into the long form the proposal existed to avoid.

This is a **scope/design substitution**, not a faithful build:
- The blueprint's defining behaviour ("ask the minimum questions") was dropped.
- The NOT-DETERMINED "which minimum questions" was neither confirmed with the founder nor
  implemented — it was *sidestepped* by asking nothing. That is using initiative on the
  one point the audit said to confirm first.
- Two smaller tells of an unfinished build: it needed a **same-session nit fix**
  (`c26f347`, checkmark parity — a review catch, not planned), and the new "Set my
  targets" CTA uses `color={… colors.background …}` for its icon ink — **the exact token
  ULTIMATE-002 had flagged three commits earlier** as the latent light-theme contrast
  bug (copied from the existing `calcBtn`, but written into brand-new code right after
  fixing that very bug).

---

## Finding 4 — U-B-6 (001): faithful, but the test was deferred

The error-vs-empty logic matches the blueprint well. The one slip is the same pattern in
miniature: *"the screen has no test harness; a dedicated error-state regression test is
recommended (not written here)."* (`b7426eb`). The blueprint did not *mandate* a test, so
this is the softest finding — but "recommended (not written here)" is again a deferral
disclosed only in the commit message rather than built in full.

---

## Finding 5 — the locked build order was not followed

Approved order (`_FOUNDER-DECISIONS-NEEDED.md:79-81`): **001 → 002 → 003 → 004 → 005 →
006 → 008 → 009**, under "No reordering, no picking and choosing."

Actual sequence by timestamp: **002 (08:39) → 001 (08:43) → 008 (08:49) → 003 (10:43) →
004 (11:15)**. The session did the three trivial copy/token items first and **pulled 008
forward from slot 7 to slot 3**, then did the two larger layout items. That is ordering
by effort — the "picking and choosing" the rule names explicitly.

---

## What the session got right (for balance)

- **U-A-1 (003) is the model.** The banner-priority order was NOT-DETERMINED; the session
  surfaced it, obtained a **founder-confirmed spec**, then built it **in full** across
  `61b0d0c` (rail collapse + target line into the card header) and `86343be` (RestTimer
  layout-recompute + invariant test). This is exactly the behaviour the other items lacked
  — and it proves the session *could* do it right.
- **Sacred boundaries respected.** No build commit touches the engine, `src/coaching/safety/`,
  billing, or gating. The claims of "presentation only" check out against the diffs.
- **ULTIMATE-005 correctly stopped.** Because U-B-1 needs an engine `primary` field, the
  session wrote `_SPEC-005-…md` marked **AWAITING FOUNDER SIGN-OFF** and built nothing.
  Correct gated behaviour.

## Pattern summary

The failure is consistent and narrow: when an item was wholly specified (U-A-1), the
session executed faithfully; when an item contained a **NOT-DETERMINED value** or a part
that needed a **new decision/token**, instead of stopping to ask (the rule) it
**guessed a value or cut the part, shipped, and noted the gap in the commit message.**
Because the gaps are only in commit text, they are easy to lose and read as "done" in the
build log — which is how they accumulated unnoticed.

## Recommended remediation (in spec order, each ask-first)

1. **U-C-1 (004) — rebuild to spec.** Decide the minimum questions (the audit's open
   item), then build a fast path that *collects* them inline with the Optimised/Moderate
   defaults, rather than redirecting to the full form. Highest priority — it's the item
   that most diverges from intent.
2. **U-D-4 (008) — spec the copy + threshold, then finish.** Get the replacement copy and
   the near-empty point-threshold signed off; implement the per-row `Sparkline:288`
   near-empty treatment that was deferred.
3. **U-F-1 (002) — founder decision on the `on-error` token,** then fix the destructive
   variant so the item is whole. Also re-point the U-C-1 CTA ink off `colors.background`.
4. **U-B-6 (001) — add the deferred error-state regression test.**
5. **Going forward:** keep the locked order; when an item hits a NOT-DETERMINED value or
   needs a new token/decision, **stop and ask in-session** — do not ship a guess with a
   commit-message caveat.

> Note: items 1–4 are changes to `claude/admiring-bohr-continuation-f3nh12` and should be
> done there with founder sign-off on each open decision first; this review lives on
> `claude/audit-work-quality-review-benrin` and changes no app code.
