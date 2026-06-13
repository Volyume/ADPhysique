# Phase 5 proposals — CLUSTER B: Coaching, plan generation & check-in (2026-06-13)

Cluster sources (read in full):
- `phase3/compare-02-plan-generation.md`, `phase3/compare-03-coaching.md`, `phase3/compare-14-checkin.md`
- `phase1/04-coaching.md`, `phase1/05-checkin-safety.md`, `phase1/06-plans.md`

Sacred-constraint note carried throughout: the Precision Coaching engine is
**deterministic — no LLM, no AI** (compare-03 framing note line 7; CLAUDE.md). No
proposal below introduces AI. Anything that alters engine logic, the
`src/coaching/safety/` system, calorie floors, rapid-loss thresholds, or Beat-UK
signposting is flagged **FOUNDER-GATE** and treated as input only. Several
proposals are deliberately presentation-only (copy, layout, gating) so they can
ship without touching the engine boundary.

British English throughout. NEWBIE and ATHLETE experiences stated separately.

---

```
ID: U-B-1
AREA: Coaching — weekly output presentation
TITLE: Progressive disclosure of the ~14-card Precision Coaching output (one hero decision first)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the cold-start/overload churn point is named the prime churn driver across all three fragments (compare-03 WHERE WE LAG "Cold-start / overload", VERIFIED research 6.4/4.1; compare-14 NEWBIE VERDICT "every extra field is paid in churn, 71% abandon by month 3", F1.4 VERIFIED; review-floor "1-2 numbers + one action", F2.2 VERIFIED).
EFFORT (1-10): 5 — presentation-layer reorganisation of an existing screen; no engine change. The cards already exist and are individually rendered; the work is collapsing/prioritising them, not computing anything new.
CURRENT STATE: CoachOutputScreen renders up to ~14 distinct cards/blocks in one ScrollView (training, nutrition, plan-edit, two cardio notes, macro cycle, refeed, why, focus, rapid-loss, diet-break, forward line, held decisions, paywall, two credential notes) with multiple Apply buttons of identical visual weight and no single emphasised primary action; the most visually prominent control is the dismissive "Done" button (04-coaching.md:48-49,89; CoachOutputScreen.js cards :1561-1809, Done :1799-1801).
THE PROBLEM:
  - Newbie impact: a first-timer is "likely to overwhelm" — they meet "volume", "sets per muscle group", "deload", "refeed", "macro cycle", "maintenance calories" and several equal-weight Apply buttons at once, with no guided "here is the one thing to do" (04-coaching.md:52; compare-03 NEWBIE VERDICT).
  - Athlete impact: lower, but the redundancy and the lack of a primary action still costs scanning time; athletes are well served on substance (compare-03 ATHLETE VERDICT "Strongly served").
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Cold-start / overload on the Pro screen" — VERIFIED (research 6.4 line 223, 4.1 line 127).
  - compare-14 WHERE WE LAG "Length / single-focus … 1-2 numbers + one action" — VERIFIED (F2.2). NOTE: the NUMERIC "too long" time limit is NOT FOUND in the research (compare-14 VERIFICATION); the argument rests on the 1-2-number principle (F2.2 VERIFIED), not a published threshold. Mark evidence-partial on the exact threshold only.
  - Phase-1 weaknesses 04-coaching.md:48-49 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: MacroFactor — surfaces only the modules this week's data triggers and explains why each appeared (compare-14 BEST IN CLASS, F2.1 VERIFIED). Carbon Diet Coach — minimum-friction, adherence-gated (compare-14 BEST IN CLASS, F1.1 VERIFIED). Both reduce the decision count to what actually fired this week.
PROPOSED SOLUTION (presentation only — does NOT change which signals the engine produces):
  Restructure the existing CoachOutputScreen render order into three zones, surfacing the engine's already-computed outputs differently:
  1. A single "This week's main move" hero zone at the top: the engine's highest-priority firing adjustment (its existing primary signal) presented as ONE emphasised Apply action with its one-line "why".
  2. Secondary adjustments collapsed under a "More adjustments (N)" expander, expanded by the user, each retaining its existing Apply button and "Applied" chip exactly as today (confirm-then-apply preserved, CoachOutputScreen.js:1341-1345).
  3. Safety blocks (rapid-loss, diet-break, held decisions) remain ALWAYS-VISIBLE and never collapsed — these are surfaced unchanged.
  Determination of "main move" must use the engine's EXISTING priority/ordering output, NOT a new heuristic added in the screen. If the engine does not already expose a priority, this becomes FOUNDER-GATE (see VERIFICATION).
NEWBIE EXPERIENCE: Opens to one clear thing to do this week with its reason; everything else is one tap away if they want it. Removes the wall of equal-weight buttons.
ATHLETE EXPERIENCE: Taps "More adjustments" once and sees the full set they expect (volume signal, macro cycle, refeed, steps, cardio) — same controls, one extra tap. Could be given a SettingsCoaching "always expand all" preference (ties to U-B-9) so power users skip the collapse.
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachOutputScreen.js. Reorder the card render block (currently :1561-1809) into hero / collapsed-secondary / always-visible-safety groups.
  - Hero card: reuse the existing TrainingNextWeekCard / NextWeekCard / DietBreakCard components (:1648-1749) — do NOT build a new card; promote one to the hero slot.
  - Collapse mechanism: reuse the CollapsibleSection pattern already in the codebase (MethodologyScreen.js CollapsibleSection, 04-coaching.md:184) for visual consistency.
  - Safety blocks NEVER collapse: RapidLossAlert (:1739), DietBreakCard (:1742), HeldDecisionsCard (:1759) stay in the always-visible zone. **This is a hard requirement — FOUNDER-GATE if collapsing any safety block is ever proposed.**
  - Touch targets: while editing, raise the Apply button height to >=44px (currently ~32px, FLAGS <44px, 04-coaching.md:79) and the share/why/held links (all FLAG <44px, :82-85). Cosmetic-adjacent; include since the cards are being touched.
  - Gating: unchanged — screen stays Pro via GatedCoachOutput (RootNavigator.js:152, 04-coaching.md:40).
  - Empty/loaded/error: preserve the existing LoadingView / InsufficientDataView / LoadErrorView split (04-coaching.md:38) untouched.
  - Edge case: a week where only ONE signal fires — the hero zone shows it and the "More adjustments" expander is hidden (count 0), not shown empty.
  - **NOT DETERMINED IN CODE — confirm before building:** whether runWeeklyCoach already returns an ordered priority for adjustments (the Phase-1 fragment lists the cards but not a priority field). If no priority exists, choosing the hero card requires either reading engine internals or adding ordering logic — the latter is engine work and FOUNDER-GATE.
VERIFICATION: Mostly VERIFIED. Evidence-partial on the exact "too long" numeric threshold (compare-14 VERIFICATION, NOT FOUND). FOUNDER-GATE on: (a) any reliance on engine-side priority/ordering not already present; (b) the absolute rule that safety blocks never collapse. Presentation reorder itself does not touch the engine boundary.
```

---

```
ID: U-B-2
AREA: Coaching — full check-in length / conditional surfacing
TITLE: Conditional wizard steps in the Weekly check-in (show a section only when its data triggers it)
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — length/density is the converging market signal and the abandonment economics are explicit (compare-14 WHERE WE LAG, F1.4 VERIFIED 71% abandon by month 3; NEWBIE VERDICT "every extra field is paid in churn").
EFFORT (1-10): 5 — the fast card already proves the auto-derivation path exists; this extends the same conditional logic to the full wizard. No engine change; the check-in already conditionally shows several sections.
CURRENT STATE: The full four-step wizard's step 1 ("This week's data") can stack weight + cycle + nutrition + steps + cardio into a long scroll (05-checkin-safety.md:126; WeeklyCheckInScreen.js step1 :732). Several sections ALREADY render conditionally (cycle only when shouldShowCycleQuestion :769; cardio only when a prescription exists :894; "Which muscles?" only when soreness>=2 :933). A condensed "fast" card already exists when fastEligible (:1071) reducing most weeks to confirming two ratings (compare-14 VOLYUME CURRENT; 05:118-119).
THE PROBLEM:
  - Newbie impact: the full wizard introduces "working sets", "training volume up X%", deload-adjacent and "prescribed cardio" framing in one long step-1 scroll (05:126-133; compare-14 NEWBIE VERDICT). Dense italic derived-note paragraphs add reading load (05:128-129).
  - Athlete impact: minimal — athletes are "well served on substance" (compare-14 ATHLETE VERDICT); the cost is scan time, not capability.
THE EVIDENCE:
  - compare-14 WHERE WE LAG "Conditional surfacing" — MacroFactor shows a module only if triggered, F2.1 VERIFIED/PARTIAL (the app behaviour is VERIFIED; only the numeric time limit is NOT FOUND). Mark evidence-partial on the timing only.
  - compare-14 NEWBIE VERDICT + Phase-1 05:126-133 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: MacroFactor — conditional, explained check-in (compare-14 BEST IN CLASS, F2.1 VERIFIED). Carbon Diet Coach — exactly three questions, adherence-gated (F1.1 VERIFIED).
PROPOSED SOLUTION:
  Extend the existing conditional-render pattern so step 1 sections appear ONLY when relevant, matching what the fast card already auto-reads:
  - Suppress the nutrition-adherence section when no kcal target exists (already routes to NutritionTargets — keep that, but don't show the three Hit/Off/Didn't-track options against a non-existent target). Currently a "no target" note is shown (:818-826); make it a single line, not a section.
  - Suppress the steps section entirely when stepsEnabled is false (already partially conditional at :831) AND no target is set — collapse to nothing rather than a "No step target set" note.
  - When the auto-derived value is confidently read (the fast-card path's auto-derivation, :1114-1123), default the wizard to the fast card and make the full wizard an explicit "Add more detail" expansion (the link already exists, :1427-1437) rather than the default for eligible users.
  This is purely which sections render; it does NOT change what the engine consumes (every field still saved as today via saveWeeklyCheckin :577).
NEWBIE EXPERIENCE: Most weeks = the two-tap fast card. When the full wizard is needed, only the sections with real data to confirm appear; no empty "no target set" prompts.
ATHLETE EXPERIENCE: Unchanged capability — an athlete with targets, steps and cardio set sees all sections (their data triggers them). Can still expand to full detail any time.
IMPLEMENTATION BLUEPRINT:
  - Screen: WeeklyCheckInScreen.js, step 1 render (renderStep1 :732) and the fast/wizard branch (fastEligible :1071, expand link :1427).
  - Reuse the existing conditional guards (shouldShowCycleQuestion :769, cardio-prescription guard :894, kcal-target guard :788/:818) — extend, don't replace.
  - Default-to-fast: when fastEligible is true, render the fast card as the entry and gate the wizard behind the existing "Add more detail" control (:1427-1437) — flip the default, keep the override.
  - Gating: unchanged — Pro via GatedWeeklyCheckIn (RootNavigator.js:149, 05:115).
  - Gate states (loading / wrong_day / too_soon / need_weights / load_error, 05:30-44) untouched — they fail closed on load error and that stays.
  - Empty/loaded/error: the load_error gate (:1276) and need_weights gate (:1245) are unchanged.
  - Edge case: a brand-new Pro user with no targets/steps/cardio set yet — they still get step 0 (feeling) and the training-performance step; the nutrition/steps/cardio sections simply don't render until configured.
  - **NOT DETERMINED IN CODE — confirm before building:** the exact `fastEligible` derivation rule (Phase-1 names the flag at :1071 but not its full condition); confirm it before making fast the default so a week that genuinely needs the wizard isn't forced into the fast card.
VERIFICATION: VERIFIED on the length/conditional principle (F2.1 app-behaviour, F1.4 economics). Evidence-partial on the numeric timing threshold only (NOT FOUND, compare-14 VERIFICATION). No engine boundary touched — presentation/section-visibility only. Confirm fastEligible rule before flipping the default.
```

---

```
ID: U-B-3
AREA: Coaching — top-of-screen redundancy
TITLE: Collapse the three-way status restatement at the top of CoachOutput into one narrated hero number
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — direct PAIR "don't over-explain" violation and the Spotify-Wrapped "hero number" benchmark for feeling personal (compare-03 WHERE WE LAG "Top-of-screen redundancy", VERIFIED 3.3; compare-14 WHERE WE LAG "Story/personal framing", F5.1 VERIFIED).
EFFORT (1-10): 3 — small, contained edit to the top three render blocks; no engine change, no new data.
CURRENT STATE: The headline sentence (:1566), the coach-lead acknowledgement+interpretation (:1571), and the trend chips row (:1587) all restate the same week status in three different forms before the user reaches any decision (04-coaching.md:50). buildHeadline/buildOffItems/buildFocus are LOCAL string builders (:89-165) layered on top of the engine's own coachResponse parts, so two parallel narration systems coexist (04-coaching.md:51).
THE PROBLEM:
  - Newbie impact: reads three near-identical status statements before any action — cognitive load with no payoff (compare-14 F5.1; compare-03 VERIFIED 3.3 PAIR).
  - Athlete impact: same; the wasted vertical space pushes the actual decisions further down.
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Top-of-screen redundancy … against PAIR's 'don't over-explain'" — VERIFIED (3.3 line 120).
  - compare-14 WHERE WE LAG "Story/personal framing … Spotify Wrapped narrative + hero-number" — F5.1 VERIFIED.
  - Phase-1 04-coaching.md:50-51 — VERIFIED in code (two parallel narration systems).
BEST REFERENCE IMPLEMENTATION: Spotify Wrapped — narrative framing + one or two hero numbers + low cognitive load (compare-14 BEST IN CLASS, VERIFIED). Google PAIR — "tie explanations to the user's action; don't over-explain" (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION:
  Reduce the top zone to one hero status: keep the trend chip row (the hero NUMBER — weight delta, sessions, PRs at :1587-1610) plus a single narrated line, and remove the duplicate restatement. Decide ONE narration source — prefer the engine's coachResponse parts (the deterministic source) over the local buildHeadline string builder (:89-106), retiring the duplicate local narration on this screen so only one narration system remains.
  This is a copy/layout consolidation; it does not change what the engine outputs, only which of the two existing narration outputs is shown.
NEWBIE EXPERIENCE: Sees one clear "here's your week" line plus the hero numbers, then goes straight to the decision — no triple restatement.
ATHLETE EXPERIENCE: Same hero numbers (trend/sessions/PRs) they value, less preamble before the levers.
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachOutputScreen.js top zone (:1561-1610).
  - Keep: week header (:1561-1562), trend chips row (:1587-1610).
  - Consolidate: choose engine coachResponse acknowledgement+interpretation (:1571-1584, from buildRegisteredCoachResponse :1517) OR the local buildHeadline (:1566) — not both. Recommend keeping the engine-sourced coach lead and removing the local headline duplicate.
  - **FOUNDER-GATE:** the choice of which narration to keep affects what the user reads as the coach's voice. buildHeadline/buildRegisteredCoachResponse are narration of engine output; removing one is a copy/voice decision the founder owns. Surface as a structured choice: (A) keep engine coachResponse, drop local headline; (B) keep local headline, drop coachResponse lead; (C) keep both but merge into one line. Do NOT pick silently.
  - Gating: unchanged (Pro). Empty/error states unchanged.
  - Edge case: a week with no weights logged — trend chip already shows "No weights logged" (:1511); the single narrated line must still read sensibly with no trend (the coachResponse already handles this path).
VERIFICATION: VERIFIED on the redundancy finding and the hero-number benchmark. FOUNDER-GATE on which narration voice survives (it is a coach-voice/copy decision, not a mechanical merge). No engine LOGIC change — only which existing narration string is displayed.
```

---

```
ID: U-B-4
AREA: Coaching — control spectrum
TITLE: A single Coached / Collaborative / Manual coaching mode switch (presentation + apply-behaviour, not engine logic)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — named best-in-class gap; the single strongest defence against algorithm aversion is letting the user adjust/hand over control, and MacroFactor's three modes are the cited benchmark (compare-03 WHERE WE LAG, VERIFIED 5.2/7.3; MISSING ENTIRELY VERIFIED 5.2).
EFFORT (1-10): 7 — touches how suggestions are presented/applied across CoachOutput and how SettingsCoaching exposes the mode; "Coached" (auto-apply) crosses into apply-behaviour, which is FOUNDER-GATE because it changes the confirm-then-apply contract.
CURRENT STATE: SettingsCoaching exposes a coaching TONE register (Automatic / Supportive / Precise) + a "calmer experience" toggle + step/cardio toggles + "show the science" (04-coaching.md:269-279; SettingsCoachingScreen.js tone block :183-213). These personalise VOICE and individual levers, but there is NO single mode switch that hands a newbie a fully-automated experience or lets an athlete drop to manual override (compare-03 WHERE WE LAG, VERIFIED). The engine is confirm-then-apply throughout — every suggestion needs an explicit Apply, never auto-written (04-coaching.md:42; CoachOutputScreen.js:1341-1345).
THE PROBLEM:
  - Newbie impact: no "do it for me" default; faces the full set of Apply decisions (compare-03 NEWBIE VERDICT; market lesson newbies need decisions made for them, 4.1 VERIFIED).
  - Athlete impact: no single switch to drop the engine to manual override; must use individual toggles (compare-03 WHERE WE LAG).
THE EVIDENCE:
  - compare-03 WHERE WE LAG "No user-selectable control spectrum (Coached/Collaborative/Manual)" — VERIFIED (5.2 line 143, 7.3 line 175, §4 line 204).
  - compare-03 MISSING ENTIRELY "Coached/Collaborative/Manual mode switch (MacroFactor)" — VERIFIED (5.2).
  - Phase-1 SettingsCoachingScreen.js tone block (04-coaching.md:277) — VERIFIED in code as a tone-only lever, not a mode switch.
BEST REFERENCE IMPLEMENTATION: MacroFactor — Coached / Collaborative / Manual program styles, named best-in-class for exactly this (compare-03 BEST IN CLASS + MISSING ENTIRELY, VERIFIED; help.macrofactorapp.com/en/articles/91-program-styles).
PROPOSED SOLUTION (split into a safe presentation part and a FOUNDER-GATE apply part):
  Add a single "Coaching mode" three-way control in SettingsCoaching:
  - **Manual:** the engine still computes everything; CoachOutput shows all suggestions, NONE pre-applied — identical to today's confirm-then-apply. (Safe, no boundary crossed.)
  - **Collaborative:** today's behaviour with the U-B-1 hero/secondary presentation — one emphasised decision, rest one tap away. (Safe, presentation only.)
  - **Coached:** suggestions are PRE-MARKED to apply with a single "Confirm all" action (still one explicit confirm, not silent auto-write) so a newbie does one tap. **This changes the apply interaction and is FOUNDER-GATE** because it edits the confirm-then-apply contract that is a documented WHERE-WE-LEAD trust asset (compare-03 WHERE WE LEAD, VERIFIED 7.3/5.2). It must NOT become silent auto-write — the sacred "never auto-written" rule (04-coaching.md:42) stays; "Coached" is one-confirm-for-all, not zero-confirm.
NEWBIE EXPERIENCE: Picks "Coached" once at setup; each week sees the recommended set and taps "Confirm all" — decisions made for them, still with one consent tap.
ATHLETE EXPERIENCE: Picks "Manual"; sees every suggestion, applies the ones they agree with individually exactly as today, with full override.
IMPLEMENTATION BLUEPRINT:
  - Settings: add a "Coaching mode" three-chip control in SettingsCoachingScreen.js alongside the existing tone chips (:183-213) — reuse the tone-chip component pattern. Store as a local-only profile field that survives sync (mirror the tone field handling, 04-coaching.md:286).
  - CoachOutput: read the mode and switch presentation (Manual=all expanded, Collaborative=U-B-1 hero/secondary). The "Coached" / "Confirm all" affordance is the FOUNDER-GATE part.
  - Gating: the mode switch sits in the Pro block of SettingsCoaching (tier === 'pro', 04-coaching.md:281); free users (who only see Calmer-experience) are unaffected. This keeps Precision Coaching adjustments Pro per CLAUDE.md.
  - Touch targets: toneChip currently minHeight 40, FLAGS <44px (04-coaching.md:302) — raise the new mode chips to >=44px.
  - **FOUNDER-GATE** specifically on "Coached" / "Confirm all" apply behaviour. Manual and Collaborative are presentation-only and safe.
  - **NOT DETERMINED IN CODE — confirm before building:** whether a "Confirm all" batch-apply can reuse the existing per-suggestion apply handlers (CoachOutputScreen.js:1341-1345) or needs new wiring; confirm the apply path before building Coached.
VERIFICATION: VERIFIED on the gap and the benchmark. FOUNDER-GATE on the "Coached" batch-apply (alters the confirm-then-apply contract; must never become silent auto-write). Manual/Collaborative modes are presentation-only.
```

---

```
ID: U-B-5
AREA: Coaching — feedback loop / disagreement path
TITLE: A "this didn't fit" feedback control on coach suggestions, recorded to the held-history audit trail
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the unmet user want named across fragments: a coach you can override and "argue with"; PAIR's "let users teach the system"; one unexplained error causes lasting asymmetric distrust (compare-03 WHERE WE LAG + USER SENTIMENT, VERIFIED 6.3/6.1/7.1; 4.2 VERIFIED).
EFFORT (1-10): 6 — adds a UI affordance and a stored feedback record; whether that feedback FEEDS the next decision is FOUNDER-GATE (engine logic). The audit-trail-only version is buildable without touching the engine.
CURRENT STATE: The engine is confirm-then-apply (04-coaching.md:42) and CoachHeldHistory logs every decision AND every hold with reasons plus an EngineLog (04-coaching.md:139,151) — a transparency moat. But the fragment records NO documented feedback loop where a user's disagreement visibly feeds the next decision (compare-03 WHERE WE LAG "No explicit 'this felt wrong / teach the system' override path", VERIFIED).
THE PROBLEM:
  - Newbie impact: limited — newbies rarely disagree with substance; but a "this didn't fit" tap is reassuring.
  - Athlete impact: high — athletes specifically want to override and argue with the algorithm; Garmin lost them precisely by being an unexplained number with "no way in" (compare-03 USER SENTIMENT, VERIFIED 4.2/6.1).
THE EVIDENCE:
  - compare-03 WHERE WE LAG "No explicit 'this felt wrong / teach the system' override path" — VERIFIED (6.3 line 161, 6.1 line 155, 7.1 line 169).
  - compare-03 USER SENTIMENT "disagrees-gracefully" — VERIFIED (4.2/6.1).
  - compare-14 USER SENTIMENT "Decisions that feel like collaboration … not a verdict" — F5.2 VERIFIED; partner caution F6.1/F6.2 ~1/3 of feedback interventions backfire when attention shifts to the self — VERIFIED. (This caution must shape the copy: keep it task-focused, not self-judgemental.)
BEST REFERENCE IMPLEMENTATION: Google PAIR — "give a remittance plan and let users teach the system after a failure" (compare-03 BEST IN CLASS, VERIFIED). MacroFactor — self-corrects visibly off real outcomes so trust compounds (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION (audit-trail version is safe; the "feeds next decision" version is FOUNDER-GATE):
  Add a low-emphasis "This didn't fit" link on each adjustment card. Tapping records a structured feedback note (which suggestion, optional reason chip: "too aggressive" / "not enough" / "didn't apply to me") into the held-history trail so the user can see the coach acknowledged their input, and the founder/engine can later use it. The recorded note appears in CoachHeldHistory as a "you flagged this" row.
  Copy must be task-focused per the backfire caution (F6.1/F6.2 VERIFIED): e.g. "Tell the coach this didn't fit" not "Was the coach wrong about you?".
  Whether this feedback then ALTERS the next week's engine decision is FOUNDER-GATE engine logic and is explicitly OUT of the buildable scope here.
NEWBIE EXPERIENCE: A gentle, optional "this didn't fit" they can ignore; not pushed on them.
ATHLETE EXPERIENCE: Finally a way to register disagreement that the system records and shows back — the "argue with it" affordance they want, even before any engine learning.
IMPLEMENTATION BLUEPRINT:
  - Add a text link (style like the existing whyLearnMore link, CoachOutputScreen.js whyLearnMore :2141, with a >=44px tap target — current FLAGS <44px, 04-coaching.md:83) on each adjustment card (TrainingNextWeekCard :1648, NextWeekCard :1658).
  - Store the feedback note locally (offline-first; no Supabase direct write — sync layer only per CLAUDE.md). Surface it in CoachHeldHistoryScreen as a new row type in buildDecisionRows (CoachHeldHistoryScreen.js:23-76).
  - Gating: Pro (the feedback control lives on the Pro CoachOutput screen).
  - Empty/error: if the write fails, fail visibly (do not silent-catch — note the free-review silent-catch failure-masquerade the fragment flags, 04-coaching.md:113/52, as the anti-pattern to avoid).
  - Edge case: user flags then later applies the same suggestion — record both events in order; do not suppress.
  - **FOUNDER-GATE:** any path where recorded feedback changes a subsequent engine decision (that is engine learning logic, deterministic-engine territory). The audit-trail-only capture is safe and buildable now.
  - **NOT DETERMINED IN CODE — confirm before building:** the held-history storage schema and whether it can carry a new "user-flagged" row type without an engine change (Phase-1 describes buildDecisionRows :23-76 but not the underlying record shape).
VERIFICATION: VERIFIED on the gap and the want. FOUNDER-GATE on feeding feedback into the engine. Capture-and-display-only is buildable without crossing the boundary. Copy must honour the F6.1/F6.2 backfire caution (task-focused, not self-judgemental).
```

---

```
ID: U-B-6
AREA: Coaching — free-tier reliability
TITLE: Distinguish read-error from no-data on the free CoachReview screen (stop the silent-catch failure-masquerade)
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — a visible wrong/empty output erodes trust disproportionately; the Pro screen already fixed exactly this, so the free screen is an inconsistency that hits the free majority (compare-03 WHERE WE LAG "Free-tier silent-catch failure-masquerade", VERIFIED 6.1/7.1).
EFFORT (1-10): 2 — a small, contained fix to one catch block; no engine change.
CURRENT STATE: CoachReviewScreen's loadData swallows ALL errors and shows the no-data state (CoachReviewScreen.js:339-341), so a genuine read failure is indistinguishable from "no sessions this week" — the same failure-masquerade the Pro CoachOutputScreen explicitly fixed (04-coaching.md:113). CoachOutput distinguishes load error (retryable) from insufficient data (04-coaching.md:43; CoachOutputScreen.js:1448-1463).
THE PROBLEM:
  - Newbie impact: high — the free review is the most newbie-appropriate decision surface (compare-03 NEWBIE VERDICT); a hidden read error tells a beginner "you logged nothing" when they did, which reads as the app losing their work.
  - Athlete impact: low — serious users are on the Pro CoachOutput.
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Free-tier silent-catch failure-masquerade … the same failure the Pro screen explicitly fixed" — VERIFIED (6.1/7.1).
  - Phase-1 04-coaching.md:113 (silent catch :339-341) and 04-coaching.md:43 (Pro fix :1448-1463) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Volyume's own CoachOutputScreen — already does the load-error vs insufficient-data split correctly (04-coaching.md:43); this proposal brings the free screen to parity.
PROPOSED SOLUTION:
  Mirror the CoachOutput pattern on CoachReviewScreen: catch read failures separately from the genuine empty case and render a retryable "Couldn't load your review" state (with a Try again that re-runs loadData) instead of the no-data card. The no-data card stays for genuinely-empty weeks only.
NEWBIE EXPERIENCE: On a real read failure, sees "Couldn't load your review — Try again" rather than a false "no sessions"; trust preserved.
ATHLETE EXPERIENCE: Unaffected (Pro screen already correct).
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachReviewScreen.js loadData catch (:339-341). Add an error state flag distinct from the empty flag.
  - Reuse the CoachOutput error-view pattern (LoadErrorView "Couldn't load your coach" with Try again / Close, 04-coaching.md:38) for visual + behavioural consistency; adapt copy to "review".
  - Keep all computation local/offline (getAllWorkouts etc., 04-coaching.md:108) — offline-first unchanged.
  - Gating: Free, unchanged (no guard, 04-coaching.md:106).
  - Empty/loaded/error: three explicit states — loading (existing SkeletonCards :384-395), genuinely-empty (existing no-data card :410-416), and the NEW error state.
  - Edge case: offline with no cached data — that is genuinely-empty for this week, show the no-data card, not the error state (only show error on an actual read throw).
  - Out of scope (flagged, not fixed, per CLAUDE.md "mention don't fix"): the hardcoded `weeksSinceLastDeload: 99` (:328) and the convoluted warmup filter (:44) — note only.
VERIFICATION: All-VERIFIED. No engine boundary touched — a screen-level error-handling fix bringing the free screen to the Pro screen's existing standard.
```

---

```
ID: U-B-7
AREA: Plan generation — preview/diff before a Pro rebuild commits
TITLE: Show a preview/diff of the rebuilt plan before PlanUpdate commits (parity with ProGoalSetup's change summary)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — best-in-class apps make the reveal a felt-understood moment; editability/visibility before commit underpins trust; PlanUpdate currently only shows a post-hoc toast + goBack (compare-02 WHERE WE LAG, VERIFIED 8.1-8.3/7.4).
EFFORT (1-10): 5 — ProGoalSetup ALREADY routes to a GoalChangeSummary diff screen; this brings PlanUpdate to the same pattern by reusing that surface for training changes. Deterministic generation is unchanged.
CURRENT STATE: PlanUpdate rebuilds the plan (generateAndSavePlan), commits the training profile on success, surfaces a toast, then goBack — NO preview/diff before commit (06-plans.md:223,227,229; PlanUpdateScreen.js:83-140). By contrast ProGoalSetup routes to GoalChangeSummary, a full diff of what changed with plain-language reasons (06-plans.md:268; GoalChangeSummaryScreen.js:126; 05-checkin-safety.md:439-466). GoalChangeSummary handles training goal, phase, calories, macros, protein.
THE PROBLEM:
  - Newbie impact: moderate — a less-experienced Pro user doesn't see how the rebuild reshaped the plan before it's done (06-plans.md:228).
  - Athlete impact: high — "Missing: a preview/diff of the rebuilt plan before saving" is explicitly the athlete gap (06-plans.md:229); athletes want to see the reveal before committing (compare-02 ATHLETE VERDICT, WHERE WE LAG).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "No plan preview/diff before a Pro rebuild commits … Volyume only shows a post-hoc toast + goBack" — VERIFIED (8.1-8.3, 7.4).
  - Phase-1 06-plans.md:227,229 (PlanUpdate) and :268 (ProGoalSetup → GoalChangeSummary) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Plan-reveal onboarding (Zing Coach, Planfit) — quiz → felt-understood tailored plan, reveal kept un-paywalled (compare-02 BEST IN CLASS, VERIFIED 8.2). Volyume's OWN GoalChangeSummary is the internal best reference — it already does narrate-then-number diff (compare-14 WHERE WE LEAD, F3.1/F3.2 VERIFIED).
PROPOSED SOLUTION:
  Before PlanUpdate commits, present a training-change diff (days/week, session length, split, equipment, recovery, estimated volume) as a confirmation step, then commit on user confirm. Reuse the GoalChangeSummary diff/reason pattern (struck-through prev → highlighted next + a plain-language reason per change, 05-checkin-safety.md:480-483) rather than building a new surface. Because PlanUpdate explicitly does NOT touch nutrition (06-plans.md:211,214), the diff shows training fields only; calorie/macro rows stay absent.
  IMPORTANT: this must follow the existing safe-failure model — PlanUpdate currently rebuilds FIRST and only commits the profile on success (06-plans.md:226; FF-002). The preview must be computed from the would-be rebuild result without permanently committing until the user confirms, preserving that safety property.
NEWBIE EXPERIENCE: Sees "here's how your plan changes" before it's applied, with one-line reasons; can back out.
ATHLETE EXPERIENCE: Gets the pre-commit reveal/diff they explicitly want, in their own terms (days, session length, split, volume), before the rebuild lands.
IMPLEMENTATION BLUEPRINT:
  - Reuse GoalChangeSummaryScreen.js (:126) ChangeCard/diff pattern (:190-248) OR factor its diff component for a training-only variant. Do NOT invent a new screen if the existing one can carry a training-only payload.
  - PlanUpdate flow: change handleSave (PlanUpdateScreen.js:83-140) to (1) compute the rebuild result, (2) navigate to the diff/preview with before/after training params, (3) commit + toast + goBack only on explicit confirm — preserving rebuild-first/commit-on-success (06-plans.md:226).
  - Volume figure shown in the diff is the existing "~N Est. sets/week" heuristic (exerciseCount × 3, 06-plans.md:94,104) — label it approximate; see U-B-8 for improving it.
  - Gating: Pro, unchanged (GatedPlanUpdate, 06-plans.md:225).
  - Empty/loaded/error: if the rebuild fails, keep the user on PlanUpdate with the existing partial/shortfall/error toasts (06-plans.md:223) — do NOT navigate to a diff of a failed rebuild.
  - Edge case: a rebuild that changes nothing meaningful — GoalChangeSummary already handles the no-change case ("Nothing meaningful changed", 05-checkin-safety.md:448) — reuse that.
  - **NOT DETERMINED IN CODE — confirm before building:** whether generateAndSavePlan can produce a preview WITHOUT persisting (Phase-1 says it rebuilds then commits on success, 06-plans.md:223,226, but not whether a dry-run/preview-only mode exists). If generation always persists, a preview-before-commit needs a non-persisting generation path — confirm this; it must NOT alter the deterministic engine's output, only defer the write.
VERIFICATION: VERIFIED on the gap and the internal reference. The deterministic generator is unchanged; the only open question is whether a non-persisting preview path exists (NOT DETERMINED — confirm). Not a coaching-engine LOGIC change; a commit-ordering + presentation change. Flag the dry-run question to the founder before building.
```

---

```
ID: U-B-8
AREA: Plan generation — volume detail
TITLE: Replace the "~N Est. sets/week" heuristic with a per-muscle volume breakdown on PlanDetail
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — athletes want individualised volume detail; the current figure is an approximate exerciseCount × 3 with no per-muscle breakdown and is "potentially misleading for an athlete" (compare-02 WHERE WE LAG, VERIFIED 5.1; 06-plans.md:94,104).
EFFORT (1-10): 5 — requires reading actual set counts per exercise/muscle from the plan's routines rather than the multiplier; the data exists (routines carry exercises with sets) but must be aggregated; not an engine change.
CURRENT STATE: PlanDetail shows per-plan volume only as "~N Est. sets/week" computed as exerciseCount × 3 (06-plans.md:94, PlanDetailScreen.js:180-183), "accurate only if every exercise is 3 sets; potentially misleading for an athlete" (06-plans.md:104). Per-muscle set targets require drilling into RoutineDetail (compare-02 ATHLETE VERDICT; 06-plans.md:106). CoachOutput likewise summarises rather than showing per-muscle set targets (compare-03 ATHLETE VERDICT, 04-coaching.md:53).
THE PROBLEM:
  - Newbie impact: low — a beginner "may not know what a set target implies" anyway (06-plans.md:105); a per-muscle breakdown is athlete-facing detail.
  - Athlete impact: high — an experienced competitor wants set/rep schemes and per-muscle volume; the approximate single number is the gap (compare-02 ATHLETE VERDICT; 06-plans.md:106).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "Per-plan volume shown only as an approximate '~N Est. sets/week' (exerciseCount × 3), no per-muscle breakdown" — VERIFIED (5.1 on individualised quality; PlanDetailScreen.js:180-183).
  - Phase-1 06-plans.md:94,104,106 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Fitbod — per-muscle recovery 0-100% (compare-14 TOP 50 RANGE, VERIFIED) — the precedent for per-muscle granularity. (Volyume already uses a per-muscle volume grammar on CoachReview — getVolumeStatus / volume landmarks, 04-coaching.md:100,110 — so the internal grammar exists.)
PROPOSED SOLUTION:
  On PlanDetail, replace the single "~N Est. sets/week" stat with an actual per-muscle weekly set breakdown computed from the plan's routines (sum real set counts per muscle across all workouts in the plan), reusing the existing volume-landmark grammar already used on CoachReview (status labels Good range / Just enough / Getting close / Too much / Below target, 04-coaching.md:100). Keep a single headline total too. For library plans where set data may be templated, show the real count where available and fall back to the approximate only when actual sets are absent (labelled "~" only then).
NEWBIE EXPERIENCE: Sees a simple total plus, if they look, a per-muscle list with the same plain status badges the free review uses — consistent grammar, not new jargon.
ATHLETE EXPERIENCE: Gets the per-muscle weekly volume they want directly on PlanDetail without drilling into each RoutineDetail.
IMPLEMENTATION BLUEPRINT:
  - Screen: PlanDetailScreen.js stats row (:235-254) and the volume computation (:180-183) — replace exerciseCount × 3 with a per-muscle aggregation over the plan's workouts/exercises/sets.
  - Reuse the shared volume-landmark helpers used by CoachReview (getVolumeStatus, statusDotColor, status labels, 04-coaching.md:100,110, CoachReviewScreen.js:14-33) for consistent grammar — do NOT invent new status labels.
  - Present as a compact expandable section (consistent with the screen's existing card hierarchy, 06-plans.md:103) so newbies aren't forced to read it.
  - Gating: Free screen, unchanged (PlanDetail is free, no guard, 06-plans.md:102) — this is plan structure, a free feature; do NOT gate it behind Pro.
  - Empty/loaded/error: if a plan has workouts but exercises carry no explicit set counts, fall back to the existing approximate with the "~" label and a note; if no workouts, the existing empty card stays (06-plans.md:96).
  - Edge case: library plans (isLibrary) — show real per-muscle counts if the seeded plan carries them; otherwise the labelled approximate. Library plans intentionally have no start/edit affordance (06-plans.md:104), but the volume readout still applies.
  - **NOT DETERMINED IN CODE — confirm before building:** whether plan/routine records store explicit per-set/per-muscle data accessible at PlanDetail level, or only an exercise list (Phase-1 says set/rep schemes live in RoutineDetail, 06-plans.md:106, implying the data exists but its shape at PlanDetail is not confirmed). Confirm the data model before building the aggregation.
VERIFICATION: VERIFIED on the gap. The volume grammar already exists internally (reuse, not invent). NOT DETERMINED: the per-set data shape at PlanDetail — confirm before building. No coaching-engine boundary crossed (this reads plan structure, it does not change generation).
```

---

```
ID: U-B-9
AREA: Coaching — newbie/athlete dual presentation
TITLE: Use the existing tone register (Automatic/Supportive/Precise) to drive a newbie-vs-athlete copy layer on coaching surfaces
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — the tone register is named the foundation for the dual-audience translation layer the research argues for; newbies need softened/translated terms while athletes want native units (compare-14 WHERE WE LEAD "Tone register already exists … the foundation for the dual-audience translation layer", F3.3/F3.4 VERIFIED; INTERPRETATION §5).
EFFORT (1-10): 5 — the tone field already exists and is read; the work is wiring it to swap copy on the coaching screens; no engine change.
CURRENT STATE: SettingsCoaching exposes Automatic / Supportive / Precise tone chips + "show the science" (04-coaching.md:277, SettingsCoachingScreen.js:183-213,217-232), documented as local-only profile fields that survive sync (04-coaching.md:286). But the fragments note the coaching screens still confront newbies with "volume", "deload", "refeed", "macro cycle", "maintenance calories" regardless (compare-03 NEWBIE VERDICT; 04-coaching.md:52; 05-checkin-safety.md:130-133). The tone lever currently personalises VOICE but is not described as swapping the technical-term copy. An explicit "athlete mode" units switch is MISSING (compare-14 MISSING ENTIRELY — labelled INTERPRETATION §5).
THE PROBLEM:
  - Newbie impact: high — even on "Supportive", a beginner meets unexplained jargon (compare-03 NEWBIE VERDICT; 05:130-133).
  - Athlete impact: moderate — "Precise" already implies numbers-first (04-coaching.md:293), but the engine "summarises rather than showing per-muscle set targets / RPE-style detail" (compare-14 WHERE WE LAG "Athlete-native units", F3.3 VERIFIED).
THE EVIDENCE:
  - compare-14 WHERE WE LEAD "Tone register already exists … foundation for the dual-audience translation layer" — VERIFIED (F3.3/F3.4); the "one engine + two presentation layers / athlete mode" framing is INTERPRETATION (compare-14 MISSING ENTIRELY + VERIFICATION) — mark evidence-thin on the "athlete mode units switch" specifically.
  - compare-03 NEWBIE VERDICT + Phase-1 04-coaching.md:52, 05-checkin-safety.md:130-133 — VERIFIED in code (jargon present).
BEST REFERENCE IMPLEMENTATION: JuggernautAI / RP Hypertrophy — decisions delivered in the athlete's own units (RPE, %1RM, sets) (compare-14 BEST IN CLASS, VERIFIED) for the athlete end; MacroFactor's plain-data explanation for the newbie end (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION (copy/presentation layer only — no engine change):
  Wire the EXISTING tone field to a copy-translation layer on the coaching surfaces:
  - "Supportive" (newbie-leaning): coaching terms carry an inline plain-language gloss on first appearance (e.g. "training volume (the total work for a muscle)"), softened phrasing already partially present on CoachReview (04-coaching.md:117).
  - "Precise" (athlete-leaning): show the native numbers the screen already summarises where the underlying value exists (e.g. surface the per-muscle set figure from U-B-8 inline rather than a summary).
  - "Automatic": pick based on the existing experience signal the engine already has.
  This is a copy/format swap keyed off an existing field; it does NOT change engine logic or outputs.
NEWBIE EXPERIENCE: On Supportive, every technical term is glossed in plain words the first time it appears on the screen — no need to leave for Methodology.
ATHLETE EXPERIENCE: On Precise, sees the underlying numbers (per-muscle sets, deltas) inline instead of summaries, in their own units.
IMPLEMENTATION BLUEPRINT:
  - Read the existing tone field (SettingsCoachingScreen.js tone block :183-213) on CoachOutputScreen, CoachReviewScreen and WeeklyCheckInScreen.
  - Build a copy map: term → {supportive gloss, precise form}; apply at render. Do NOT generate copy dynamically (no LLM); a static deterministic map only.
  - Reuse the "show the science" toggle (04-coaching.md:278) semantics for the Precise end where it already adds technical terms.
  - Gating: tone is in the Pro block of SettingsCoaching (04-coaching.md:281); free CoachReview can use the same static glosses without the tone toggle (default to Supportive glosses for free, since the lever is Pro). Keep the free screen's existing softened copy.
  - Empty/error states unchanged.
  - Edge case: long glosses must not break layout on small screens or under the Larger-text 1.2× toggle (theme.js:325, 04-coaching.md:9) — keep glosses short.
  - **Evidence-thin:** the "athlete mode units switch" is INTERPRETATION (compare-14 §5), not a finding. The buildable, evidence-VERIFIED part is the copy-gloss layer keyed off the EXISTING tone field; a separate units-presentation toggle beyond tone is the thin part — treat as optional/FOUNDER input.
  - **NOT DETERMINED IN CODE — confirm before building:** the exact stored values of the tone field and whether "Automatic" already resolves to an experience signal the screens can read (Phase-1 names the chips but not the resolved values).
VERIFICATION: VERIFIED that the tone register exists and that jargon hits newbies. EVIDENCE-THIN on the dedicated "athlete mode units switch" (INTERPRETATION §5). The copy-gloss layer keyed off the existing tone field is the safe, sourced build. No engine boundary touched.
```

---

```
ID: U-B-10
AREA: Plan generation — library recommendation quiz payoff
TITLE: Give the Plan Library recommendation quiz an explained, felt-understood result (not a bare single "best")
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — the quiz→reveal payoff is praised (Zing/Planfit) but Volyume's quiz returns a single "best" with little explanation, weaker than the felt-understood moment (compare-02 WHERE WE LAG, VERIFIED 8.2).
EFFORT (1-10): 3 — the quiz, scoring and result step already exist; the work is adding an explanation ("why this plan for you") to the existing result card. Free feature, no engine change.
CURRENT STATE: PlanLibrary's 2-question recommendation quiz scores by a simple tag-weight heuristic (goal + equipment) and returns a single suggestion in a result step with Add/Preview/Browse actions (06-plans.md:135-141; PlanLibraryScreen.js:82-142, result :828-850). The scoring "can return a single 'best' with little explanation" (06-plans.md:147; compare-02 WHERE WE LAG). Generated active plans DO carry a "Why this plan, for you" rationale (compare-02 VOLYUME CURRENT; PlanDetailScreen.js:317-332) — but the LIBRARY quiz result does not.
THE PROBLEM:
  - Newbie impact: high — the quiz is "an excellent beginner on-ramp" (06-plans.md:148) but the payoff lands flat without a reason; newbies are exactly who the felt-understood reveal serves (compare-02 NEWBIE VERDICT, 8.2 VERIFIED).
  - Athlete impact: low — athletes bypass the quiz and filter to their division (06-plans.md:149).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "Library recommendation quiz uses a simple tag-weight heuristic returning a single 'best' with little explanation … weaker than the felt-understood quiz→reveal payoff praised for Zing/Planfit" — VERIFIED (8.2).
  - Phase-1 06-plans.md:141,147 (quiz scoring :122-142, result :828-850) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Zing Coach / Planfit — quiz → felt-understood tailored plan, reveal kept un-paywalled (compare-02 BEST IN CLASS, VERIFIED 8.2). Volyume's OWN "Why this plan, for you" rationale (PlanDetailScreen.js:317-332) is the internal pattern to mirror onto the quiz result.
PROPOSED SOLUTION:
  Add a short "why this matches you" explanation to the quiz RESULT step, derived deterministically from the user's two answers (goal + equipment) that produced the match — e.g. "You picked build muscle + full gym, so this hypertrophy split fits." Mirror the existing "Why this plan, for you" rationale style (06-plans.md:97) but built from the quiz answers. This is a deterministic string from the existing tag-weight inputs; no AI, no new scoring engine.
NEWBIE EXPERIENCE: The quiz result now SAYS why it picked this plan, turning a bare suggestion into a felt-understood reveal — the praised pattern.
ATHLETE EXPERIENCE: Unaffected (they skip the quiz, 06-plans.md:149).
IMPLEMENTATION BLUEPRINT:
  - Screen: PlanLibraryScreen.js quiz result step (:828-850), under quizResultName/quizResultDesc (06-plans.md:161).
  - Build the reason from the existing quiz answers (goal/equipment, :82-102) and the matched plan's tags — a deterministic template, NOT generated copy.
  - Keep the result's existing actions (Add this plan filled amber button :840-844, Preview, Browse all) — the reveal stays un-paywalled (Library is free, 06-plans.md:145), honouring the explicit counter-praise that the reveal must NOT be paywalled (compare-02 WHERE WE LEAD, 8.2 VERIFIED).
  - Gating: Free, unchanged.
  - Touch targets: addBtn currently paddingVertical spacing.xs (4), FLAGS <44px (06-plans.md:165); raise while editing the result card.
  - Empty/loaded/error: the no-result step ("Browse all plans", 06-plans.md:141) is unchanged; only the positive result gains the reason line.
  - Edge case: if two answers map to multiple equally-scored plans, the reason should reference the shared criteria honestly rather than implying a unique fit (the heuristic returns one "best", 06-plans.md:147 — keep returning one, just explain the basis).
VERIFICATION: All-VERIFIED on the gap and the un-paywalled-reveal requirement. Deterministic reason from existing inputs — no AI, no engine change. No NOT-DETERMINED facts.
```

---

## Status

1. **Proposals written: 10** (U-B-1 … U-B-10) covering coaching output presentation (U-B-1, U-B-3, U-B-6, U-B-9), check-in length (U-B-2), control spectrum (U-B-4), feedback loop (U-B-5), and plan generation (U-B-7, U-B-8, U-B-10).
2. **FOUNDER-GATE: U-B-3** (which narration voice survives — a coach-voice/copy decision), **U-B-4** (the "Coached" batch-apply alters the confirm-then-apply contract; must never become silent auto-write), **U-B-5** (any path feeding user feedback into the engine = engine logic); plus the absolute rule in **U-B-1** that safety blocks never collapse. **Evidence-thin: U-B-9** (the dedicated "athlete-mode units switch" rests on INTERPRETATION §5; the copy-gloss layer is the VERIFIED build) and the exact "too long" numeric thresholds in **U-B-1 / U-B-2** (NOT FOUND in research; the principle is VERIFIED).
3. **NOT-DETERMINED implementation facts flagged:** U-B-1 (does runWeeklyCoach expose adjustment priority?); U-B-2 (the full `fastEligible` derivation rule); U-B-4 (can "Confirm all" reuse existing per-suggestion apply handlers?); U-B-5 (held-history record schema / new row type); U-B-7 (does generateAndSavePlan have a non-persisting preview/dry-run path?); U-B-8 (per-set/per-muscle data shape at PlanDetail level); U-B-9 (stored tone-field values and whether "Automatic" resolves to a readable experience signal).
