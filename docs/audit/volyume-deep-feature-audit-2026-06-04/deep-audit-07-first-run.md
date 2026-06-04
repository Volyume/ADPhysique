# Deep Feature Audit — Item 6: First-run screen (Free path)

**Document:** deep-audit-07-first-run.md
**Item:** 6 of master inventory (Group 1 — the Free-tier counterpart to the Pro wizard; navigator routes Free signups to `FirstRunStack`, Pro to `ProOnboardingStack`)
**File:** `src/screens/FirstRunScreen.js` (113 lines), shared `Button`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

> Live-status note: `PRO_BETA_ACTIVE = true` currently forces every signed-in
> user to Pro, so `FirstRunScreen` is not the screen real users hit today. It is
> still shipped code on the live flow (the navigator renders it for
> `tier !== 'pro'`, `RootNavigator.js:956`) and on the master inventory, so it
> gets the same clean audit. Findings are scoped accordingly: correctness and
> tidiness matter; "conversion impact today" is near-zero while the beta flag
> holds.

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The Free-tier first-run. Where Pro gets the 5-step wizard (profile → training →
goal → recovery → plan generation), Free gets the minimum: one field (first
name), then straight into the app. Plan choice is deferred to the Plans tab
(Library or Manual Builder), which the hint card points at. Units are forced to
kg (UK gym weights, no choice — comment `:17`). On submit it saves
`{ units:'kg', firstName }` to the local profile and calls `completeFirstRun()`,
the same exit the Pro complete screen uses.

### Findings
1. **Dead styles from a removed unit picker.** `unitRow`, `unitBtn`,
   `unitBtnActive`, `unitBtnText`, `unitBtnTextActive` (`:97-104`) are unused —
   there is no unit choice anymore (kg-only). Orphaned CSS, should be removed.
2. **Keyboard `returnKeyType="next"` goes nowhere.** The single TextInput
   (`:61`) sets `returnKeyType="next"`, implying a following field, but there is
   none and there is no `onSubmitEditing`. Pressing the keyboard action does
   nothing. For a one-field form it should be a submitting action (`"go"` /
   `"done"`) wired to `finish` so Return submits.
3. **Headline styling diverges from the rest of onboarding.** This title is
   `fontSize.xxl` + `fontWeight.black` (`:88`); the Pro wizard step titles are
   `xxl` + `bold`; the Pro complete headline is `type.h2`. Three slightly
   different headline treatments across one flow. Minor; worth aligning if we
   touch it, not worth a dedicated change.
4. **The hint icon is borderline decoration.** The info Ionicon in the hint card
   (`:74`) sits next to a single contextual hint. The design rules warn against
   generic Ionicons as decoration, but a single hint icon on a single hint is
   defensible (it is not repeated per-row). Leave it, note it.
5. **Copy is on-voice and minimal.** "Almost there." / "Just your name and
   you're ready to start logging." / "What should we call you?" — plain, no AI
   tells, no em dashes, no unearned praise. One footnote (the Plans hint), which
   answers a real question. Good.

### Design assessment (values cited)
- On-system: `background`, `surface2` input, `surface` hint card, single amber
  affordance (`inputActive` border + the `Button`), scale spacing/radii. No
  gradient, no orb, no carousel. The screen is calm and does one thing.
- The minimalism is the design: one field, one CTA, one deferred-action hint.

### UX / flow / integration
- One required field, focus auto-set after 350ms (`:24-27`), CTA disabled until
  the name is non-empty (`:69`), `busy` guards double-submit. `completeFirstRun`
  is the single exit and matches the Pro path. `_navigation` is unused (Free has
  nowhere to branch from here) — fine, underscore-prefixed. Integration is
  clean and minimal.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Single-field onboarding converts.** Typeform's one-field-at-a-time format
  reached a 47.3% average completion rate, more than double the typical rate;
  the pattern is used by Duolingo, Snapchat, Gas and is backed by cognitive-load
  research. Volyume's Free first-run is exactly this pattern. [StartupSpells]
- **Field Reduction Principle.** Collect only the essential field up front and
  gather the rest after the user has seen value (progressive profiling). HubSpot
  cut fields 11→4 for +120% conversions; each extra field costs ~5-7%
  completion. Volyume defers everything except the name. [SaaSFactor; StartupSpells]
- **Mobile input hygiene.** Large tap targets, no horizontal scroll, and the
  right keyboard for the field speed entry. Volyume's input is large and uses
  `autoCapitalize="words"`; the only miss is the unused `returnKeyType` (finding
  2). [Eleken; Lollypop]

---

## STEP C — COMPARISON

### Where Volyume leads
- The Free path is a model single-field onboarding: one question, one CTA,
  value (logging) immediately after. It defers plan choice rather than forcing a
  long setup, which is exactly the Field Reduction / progressive-profiling
  approach the research endorses. [StartupSpells; SaaSFactor]

### Where Volyume lags
- Housekeeping only: dead unit styles (finding 1), a non-functional keyboard
  return action (finding 2), and a slightly inconsistent headline treatment
  (finding 3). Nothing structural.

### Critical gaps
- None. With the beta flag forcing Pro, this screen is also not on the live path
  today, so even the minor items are low-urgency.

---

## STEP D — PROPOSAL

### Summary
Tidy a model screen. Remove the dead unit styles, make the keyboard Return
submit the form, and optionally align the headline with the rest of onboarding.
Keep the single-field minimalism exactly as is.

### Specific changes — one by one

**1. Remove the dead unit-picker styles. [Cleanup — Low] — `:97-104`**
- What: delete `unitRow`, `unitBtn`, `unitBtnActive`, `unitBtnText`,
  `unitBtnTextActive` (no JSX references them).

**2. Make Return submit. [UX — Low] — `:52-62`**
- What: change `returnKeyType="next"` to `"go"` (or `"done"`) and add
  `onSubmitEditing={finish}` + `blurOnSubmit` so the single field submits from
  the keyboard, matching what a one-field form should do.

**3. (Optional) Align the headline. [Design consistency — Low] — `:88`**
- What: use `type.h2` for the title so Welcome/wizard/complete/first-run share
  one headline treatment. Flagged as optional; happy to skip to avoid churn.

### COPY CHANGES
None. The copy is minimal and on-voice.

### What to keep (with evidence)
- The single-field design and deferred plan choice (Field Reduction /
  progressive profiling — Typeform 47.3%, HubSpot +120%). [StartupSpells; SaaSFactor]
- The kg-only decision (UK gym context, removes a needless choice).
- Auto-focus, disabled-until-valid CTA, busy guard, single `completeFirstRun`
  exit, the one Plans hint.

### IMPACT / EFFORT
- **Impact: Low** (housekeeping + a small keyboard-UX fix; screen is off the
  live path while the beta flag forces Pro).
- **Effort: Low.** No logic or contract change.

### SOURCES
- StartupSpells — Typeform one-field onboarding UX:
  https://startupspells.com/p/typeform-one-field-onboarding-ux-gas-snapchat-duolingo-spotify-signup-conversion
- SaaSFactor — Science of SaaS onboarding (field reduction, friction):
  https://www.saasfactor.co/blogs/the-science-of-saas-onboarding-a-comprehensive-framework-for-reducing-friction-improving-activation-and-preventing-churn
- Eleken — Input field design examples:
  https://www.eleken.co/blog-posts/input-field-design
- Lollypop — Text field design:
  https://lollypop.design/blog/2026/january/text-field-design/
