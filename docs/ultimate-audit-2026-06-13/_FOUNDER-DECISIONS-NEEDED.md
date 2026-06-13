# Founder decisions needed — Ultimate Audit 2026-06-13

Nothing in the audit builds autonomously. Each decision below names the proposal IDs it
unblocks (see `ultimate-audit-04-proposals-with-blueprints.md`) and my recommendation.
Answer inline; I'll record your verdicts here.

## GROUP 1 — Strategy & locked docs (these shape what gets built)
- **D1 Dual-audience direction.** Adopt "disclose depth by ABILITY/achievement, not by Free/Pro tier"
  as the design principle (the audit's #1 structural finding)? *Rec: yes.* Unblocks the nav restructure + M1.
- **D2 Coaching voice layer.** Add a newbie↔athlete copy/translation layer driven by the EXISTING tone
  register (no engine change)? Amends `COACHING_VOICE_SYNTHESIS_LOCKED`? *Rec: yes, presentation-only.* (M1, U-B-9)
- **D3 Free/Pro line.** Should any on-ramp/jargon-translation/quick-win surfaces that are currently Pro be
  made FREE to widen the funnel? *Rec: make the jargon layer + encouraging empty states free; keep coaching depth Pro.*
- **D4 Coach control modes.** Approve a Coached/Collaborative/Manual switch (U-B-4) — incl. a "Coached"
  auto-apply that changes the confirm-then-apply contract? And a "this didn't fit" feedback control (U-B-5)
  recorded to held-history — and may it FEED the engine? *Rec: build Collaborative/Manual + feedback-to-audit-trail;
  hold "Coached auto-apply" and engine-feed for a deliberate spec.*

## GROUP 2 — ED-safety-adjacent (design WITH the safety owner; go/no-go only)
- **D5 Overreach warning (the standout opportunity).** Approve designing a "you're overreaching → lighter week"
  intervention with the safety owner? (U-G-1 / 019) *Rec: yes — highest differentiator.*
- **D6 Diary anti-shame.** Approve removing punitive over/under colour framing + avoiding pressure streaks?
  (U-C-10 / 020) *Rec: yes.*
- **D7 Consistency reward / streak.** Explore a lenient "showing up" reward within ED-safety limits?
  (U-D-8, U-G-5) *Rec: yes, safety-owner-designed; no loss/again-from-zero framing.*
- **D8 RPE/RIR + readiness.** Re-enable per-set RPE/RIR capture (currently HARD-DISABLED) and add a
  readiness traffic-light? (U-G-3, U-G-4 / 022) *Rec: RPE/RIR opt-in for the serious tier; readiness as a later step.*
- **D9 Pain/joint flag + plan rotation** (U-G-6, engine-adjacent)? *Rec: capture now (free), rotation later (gated).*
- **D10 Log-confirm guard** on an unconfirmed default rep count (U-A-5)? *Rec: yes (data integrity).*
- **D11 Contest-prep goal** selectable, honouring the calorie floors / 1.5%-per-week threshold (U-C-3)? *Rec: yes, floor-clamped.*

## GROUP 3 — No-AI boundary, media & spend
- **D12 Exercise demo media** (the one below-floor gap; U-A-6/G-2/A-8 / 021). Build it — and via which source:
  (a) in-house code/Lottie animation, (b) licensed catalogue (e.g. MoveKit/ExerciseDB/GymVisual — needs licence + spend),
  (c) free open-licensed sets? *Rec: prove an in-house clip + price a licensed set in parallel, then you choose (this is the old NEW-001/H2 question).*
- **D13 No-AI boundary on food logging.** Confirm we stay boundary-safe — barcode + verified UK DB + deterministic
  recents only, NO AI-photo / LLM "describe"? *Rec: confirm yes.*

## GROUP 4 — Navigation / IA / onboarding (locked-doc)
- **D14 Nav restructure.** Approve the proposed relocations within the locked 5-tab frame (U-NAV-1..6)? *Rec: yes.*
- **D15 Locked-name items.** "You" tab rename (UI_FLOWS_LOCKED), Precision Coaching™ / Goal-lock naming
  (IDENTITY/ONBOARDING) — approve, reject, or leave as-is? (U-NAV-7/8) *Rec: keep names; gloss them inline instead.*
- **D16 Onboarding tweaks.** Approve the quiz heading/gate fix + 3-band↔4-band reconcile + surfacing the
  Hevy/Strong import in first-run (U-E-3/4/5)? Touches `ONBOARDING_SEQUENCE_LOCKED`. *Rec: yes (small, safe).*

## GROUP 5 — Process
- **D17 Reddit.** Accept the PARTIAL secondary-sourced sentiment, or re-run sentiment from a Reddit-reachable
  network before any Reddit-dependent proposal is built? *Rec: accept now; re-run only if a specific proposal hinges on it.*
- **D18 Re-audit with Fable** when reinstated — confirm the standing instruction.
- **D19 Build sequencing.** Approve the exec-summary order (quick wins → Tier-1 on-ramp → founder-decision batch → rest)?
- **D20 Start now?** Shall I begin the **Tier-1 UNGATED quick wins** (ULTIMATE-001 CoachReview error-vs-empty,
  002 Button contrast, 003 banner-fold, 004 set-it-for-me, 005 progressive coach output, 006 jargon layer,
  008 empty states, 009 44px pass) — each edit-gated, spec-cited, one at a time? And/or open a PR for the branch?

---
## VERDICTS (founder, 2026-06-13)
- D1 = BY ABILITY (progressive disclosure, not Free/Pro tier).
- D2 = YES — newbie↔athlete translation layer (presentation-only).
- D3 = Jargon layer + empty states FREE; coaching depth stays Pro.
- D4 = FULL — Collaborative/Manual + feedback-to-audit-trail AND "Coached" auto-apply + feedback-to-engine. NB: auto-apply + engine-feed change the confirm-then-apply contract + engine logic → require a careful spec + safety review at build time.
- D5 = YES — design the overreach→lighter-week intervention with the safety owner.
- D6 = YES — remove punitive diary colour framing + no pressure streaks (safety-designed).
- D7 = YES — lenient weekly "showing up" reward (safety-designed, no loss framing).
- D8 = BOTH NOW — re-enable opt-in per-set RPE/RIR + build the readiness signal (engine-reviewed).
