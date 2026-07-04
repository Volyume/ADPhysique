# Coach communication + coach-surface design audit

Read-only audit. No `src/` file was edited. Rubric:
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (the locked voice standard) plus
`CLAUDE.md` (British English, no em/en dash, calm, no shame, no clipped
commands). ED-safety-critical wording is flagged but NEVER rewritten here:
those sit under **HOLD** for a founder decision.

Surfaces read in full: `src/lib/coachResponse.js`, `src/lib/coachRegister.js`,
`src/lib/weeklyCoach.js` (WHY_LIBRARY + output notes), `src/lib/whyThisTemplates.js`,
`src/screens/CoachOutputScreen.js`, `src/screens/ProSetupCompleteScreen.js`,
`src/lib/notifications/` (scheduler, missedCheckin).

---

## 1. Voice verdict

**It largely reads as a real, knowledgeable, calm British coach.** This is one
of the strongest bodies of product copy in the app. `coachResponse.js` and
`coachRegister.js` are exemplary: numbers-before-narrative, the honesty test
visibly applied, mirror-not-infer held, British throughout, no AI tells, and a
dev-time guard that hard-blocks jargon AND em/en dashes on every exported
string. The five-part response ("All 4 sessions trained this week. Your 7-day
average is down 0.3 kg on last week. That is the second week running at the
right rate...") sounds like a competent coach who has read your log, not a
translated template or an LLM.

It is NOT generic, NOT over-explained, and almost never AI-flavoured. The
defects are a small number of genuine breaks, concentrated in the OLDER
`whyThisTemplates.js` library, whose `clean()` guard checks jargon but — unlike
every other coach module — does NOT check for em/en dashes, so two dashes ship
live. A handful of clipped/filler lines survive from an earlier register. The
newer engine copy (coachResponse, coachRegister, weeklyCoach WHY_LIBRARY,
notifications) is clean.

Design: the coach surfaces are broadly on the current token system, but
`CoachOutputScreen.js` is a visible archaeological layering — newer blocks use
the `Card` primitive and `type.*` role tokens, while a cluster of older
hand-rolled `View` boxes duplicate Card's chrome and hand-roll
`fontSize+fontWeight` instead of the type roles. It works, but it reads as two
generations of the design system in one screen.

---

## 2. Flagged lines by surface

### SAFE FIXES — non-ED-safety copy, ready to apply verbatim

#### `src/lib/whyThisTemplates.js` — en-dash violations (highest priority)

`clean()` (lines 73-76) only runs `assertNoJargon`; it does not block em/en
dashes, so these ship to users in breach of the absolute no-dash rule.

- **`whyThisTemplates.js:220`** (`getWeekPhaseDescription`, `build`)
  - Current: `...feeling like you could do 1–2 more reps but chose not to.`
  - Why it breaks: EN DASH in user-facing copy (banned everywhere).
  - Exact fix: `...feeling like you could do 1 to 2 more reps but chose not to.`

- **`whyThisTemplates.js:233`** (`getSplitRationale`, `upper_lower`)
  - Current: `...trained twice a week with 48–72 hours of recovery between.`
  - Why it breaks: EN DASH in user-facing copy.
  - Exact fix: `...trained twice a week with 48 to 72 hours of recovery between.`
  - Systemic note: add an em/en-dash assertion to `clean()` here to match the
    guard already in `coachResponse.clean()` and `coachRegister.clean()`, so
    this class of defect cannot recur in this library. (Founder decision, since
    it is a guard change, not just copy.)

#### `src/lib/whyThisTemplates.js` — clipped / filler register

- **`whyThisTemplates.js:198`** (`getAutoRegMessage`, `continue`)
  - Current: `Your recovery's holding. The plan stays as written. This is what good progress feels like.`
  - Why: "This is what good progress feels like" is motivational filler that
    infers a feeling (breaks Pattern 9: no filler without a data referent, and
    mirror-not-infer).
  - Exact fix: `Your recovery's holding. The plan stays as written.`

- **`whyThisTemplates.js:200`** (`getAutoRegMessage`, `reduce_volume`)
  - Current: `Your recovery's dropped. Next week loses 1-2 sets per exercise. Come back stronger.`
  - Why: "Come back stronger" is a clipped motivational command with no data
    referent (breaks the no-clipped-command rule).
  - Exact fix: `Your recovery's dropped. Next week loses 1-2 sets per exercise, so the next block starts fresher.`

- **`whyThisTemplates.js:199`** (`getAutoRegMessage`, `hold_volume`)
  - Current: `You're showing fatigue this week. Your session content stays the same. Focus on sleep and protein.`
  - Why: "You're showing fatigue" reads as inferred state; "Focus on sleep and
    protein" is a clipped directive. Milder than the above.
  - Exact fix: `Your recovery scores dipped this week, so your session content stays the same. Sleep and protein are the levers.`

#### `src/screens/CoachOutputScreen.js`

- **`CoachOutputScreen.js:2211`** (hold-hero, good-week branch)
  - Current: `Change nothing. The plan is working.`
  - Why: "Change nothing." is a clipped imperative; on the app's best week it
    reads abruptly against the surrounding calm register.
  - Exact fix: `Nothing to change. The plan is working.`

- **`CoachOutputScreen.js:2195` and `:2215`** (hero "why" prefix)
  - Current: `{'Because: '}` prefixing the reason clause.
  - Why: a bare "Because:" label reads slightly mechanical/translated next to
    the fuller `WhyBlock` label "Why this week:".
  - Exact fix: change the prefix to `{'The reason: '}` (matches the
    rationale-attached-prescription phrasing used in the locked doc, e.g.
    "The reason: ...").

- **`CoachOutputScreen.js:571-575`** (`DietBreakCard` body)
  - Current: `...can help restore metabolic rate and improve long-term fat loss.`
  - Why: "restore metabolic rate" is clinical; the plain-mechanism rule
    (Pattern 10) prefers one-clause mechanism. Not jargon-blocklisted, so it
    ships, but it is the most clinical line on a non-safety card.
  - Exact fix: `...can help your body settle back to its normal calorie burn and improve long-term fat loss.`

#### `src/screens/ProSetupCompleteScreen.js`

- **`ProSetupCompleteScreen.js:293-294`** (`targetsNote`)
  - Current: `Hit these most days. Logging your food in your food diary sharpens your coaching, and your weight trend carries the rest.`
  - Why: "your food in your food diary" is a clumsy repeat ("food ... food").
  - Exact fix: `Hit these most days. Logging your meals sharpens your coaching, and your weight trend carries the rest.`

Everything else on ProSetupComplete (headline "You're all set, {firstName}.",
the numbered routine cards, the trial-arc line, "How Precision Coaching works")
is in voice.

#### `src/lib/notifications/` — no defects found

`scheduler.js` (morning/evening weigh-in, weekly coach ready, trial-end,
downgrade) and `missedCheckin.js` are warm, British, calm, no false urgency,
no exclamation marks. Examples that pass cleanly: "Your coaching for the week
is ready" / "Have a look at what's changed for you this week, and the thinking
behind it."; "hop on the scales and log today's weight"; "Have a look at your
options whenever you're ready." These diverge from the locked Surface 6 draft
(which named "Precision Coaching has set new targets") but that is expressly
permitted by the 2026-06-03 founder naming override and Open Question 6 — no
action.

### HOLD — ED-safety-critical wording (flag only; founder decides)

Do not apply these without a founder call. Each touches
`whyThisTemplates.js` ED copy or the rapid-loss caution and is woven into the
locked ED-safety system.

- **`whyThisTemplates.js:541-542`** (`ED_PATTERN_CLEARED_COPY.body`)
  - Current: `...Take this gently. Energy recovery beats rushing back into a deep cut.`
  - Concern: the locked Surface 7 EXPLICITLY REJECTED "Take it gently from here"
    as an autonomy-violating directive, yet a near-identical "Take this gently"
    ships in the cleared copy. This is a direct divergence from the locked
    spec's own rejected-list.
  - Proposed (founder to decide): drop the directive, keep the mechanism —
    `The signals that triggered the hold have settled for two weeks. Standard coach output resumes; new calorie targets land at the next weekly run. Energy recovery is more durable than a fast return to a deep cut.`

- **`whyThisTemplates.js:520-529`** (`ED_PATTERN_LOCKOUT_COPY`) and
  **`:554-556`** (`RAPID_LOSS_CORRECTED_COPY.body`)
  - Current: lead with "We've held your calorie cut..." / "We're not waiting two
    weeks... we've bumped your daily target up".
  - Concern: the locked Surface 1 redraft attributes the hold to "Precision
    Coaching has held your calorie target" and the honesty rule bans an
    implied-shared "we". The shipped copy uses team-"we" throughout. It is
    defensible (Volyume-team "we" is the allowed first-person plural, and the
    2026-06-03 override removes Precision-Coaching naming from body lines), but
    it is a wording divergence from the locked ED redraft and should be a
    conscious founder ratification, not drift.
  - Proposed: no rewrite proposed; founder to either ratify the shipped "we"
    framing as the locked form or align it to the Surface 1 redraft.

- **`CoachOutputScreen.js:548-551`** (`RapidLossAlert` body)
  - Current: `...Consider eating a little more this week.`
  - Concern: weight/food-adjacent safety caution. "Consider" is soft-autonomy
    phrasing on a safety nudge; the register here is advisory (not a locked
    decision), so it may be acceptable, but any change to safety-caution
    wording is ED-safety-critical.
  - Proposed: founder to confirm whether the advisory "Consider..." is the
    intended register or should firm to "Eating a little more this week
    protects muscle while you lose."

**Tally: 8 SAFE copy-fixes (2 of them en-dash breaches) + 1 systemic guard
change; 3 ED-safety HOLDs.**

---

## 3. Coach-surface design findings

All safe unless noted; none touch ED-safety display gating.

**Headline finding — two design generations in one screen.**
`CoachOutputScreen.js` mixes the current `Card` primitive + `type.*` role
tokens (newer blocks) with older hand-rolled boxes and hand-rolled type. It
functions and stays on-palette, but the inconsistency is visible.

- **Hand-rolled boxes that duplicate `Card` chrome instead of using the
  primitive** (surface + `radius.lg` + 1px `border` + `spacing.lg` padding all
  re-declared locally, free to drift from Card):
  - `coachLeadCard` (`:2676-2683`) — byte-identical to Card defaults; should be
    a `<Card>`.
  - `holdHeroCard` (`:2662-2669`) — duplicates the elevated Card the applyable
    hero uses (`Card elevated`); should be `<Card elevated>`.
  - `focusCard` (`:2713-2720`), `planEditCard` (`:2498-2503`),
    `countdownCard` (`:2982-2989`) — hand-rolled surfaced boxes. `focusCard`
    intentionally tints (`primaryBg`); it could still ride `<Card tone>`.
  - The ED/rapid-loss boxes (`edLockoutCard`, `edClearedCard`, `rapidLossCard`)
    legitimately hand-roll because they carry non-default `warning`/`success`/
    `error` borders — leave as-is unless Card grows a `tone` for them. (Their
    display gating is ED-safety; do not restructure without founder sign-off.)

- **Inconsistent type roles** — adjacent text nodes mix `...type.*` roles with
  hand-rolled `fontSize + fontWeight`:
  - `weekLabel` (`:2585-2590`), `sectionHeader` (`:2630-2636`),
    `insufficientTitle` (`:2544-2550`), `statChipValue/Label` (`:2613-2621`),
    `whyLabel/whyText` (`:2867-2877`), and the entire ED block
    (`edLockoutTitle/Body`, `edClearedTitle/Body`, `:3064-3150`) hand-roll
    `fontSize.*/fontWeight.*` while the coach-lead, focus, hero, ledger and
    forward lines use `type.bodyStrong/body/bodySm/h3/caption`. Correction:
    move the hand-rolled ones onto the matching `type.*` role (e.g.
    `insufficientTitle` -> `type.h3` or `type.h2`; `edLockoutTitle` /
    `edClearedTitle` -> `type.bodyStrong` or an `h` role; `whyText` italic
    stays but sizing from `type.bodySm`). This restores one type hierarchy.

- **Off-token raw values** (small, but they are literally the "earlier version"
  smell):
  - `appliedChip` `gap: 3` (`:2785`); `planEditLink` `gap: 4` and
    `paddingVertical: 4` (`:2506`) — should be `spacing.hair/xxs`.
  - Hand-set `lineHeight: 22 / 21 / 18 / 17` recur across the file
    (`coachLeadAck`, `bulletText`, `dietBreakBody`, `edLockoutBody`, etc.)
    where the `type.*` roles already carry a line height — prefer the role's.
  - `letterSpacing` raw floats (`-0.3`, `0.2`, `0.4`, `0.6`) throughout; if the
    theme has no letter-spacing token this is acceptable, but it should be
    confirmed against `theme.js` rather than sprinkled per-style.

**Motion / haptics at meaning-moments — good.** The Apply rows ride the
`Button` primitive's idle->loading->success morph; the reveal is a staged
`FadeInDown` cascade keyed off `motion.enter/hero/micro`; every animated path
self-gates on `reduceMotion`; the safety zone and held decisions are
deliberately NEVER animated; the amber-hero Apply is the screen's single
commit-beat. `ProSetupCompleteScreen` fires `planReady()` once at the reveal
peak and no-ops under reduce motion. This is current-system behaviour, not a
regression — no action.

**Net design read:** the coach surfaces are ~80% on the elevated current
system; the remaining 20% (hand-rolled Card-clones + hand-rolled type in the
insufficient-data and ED blocks) is the older layer. Converting the
non-ED-safety boxes to `<Card>` and the hand-rolled type to `type.*` roles is
a safe, mechanical cohesion pass. The ED/safety boxes should be left to a
founder-supervised change because their borders and display gating are part of
the safety system.
