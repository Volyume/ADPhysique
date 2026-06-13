# Phase 3 comparison — 07 · Onboarding & first-time experience

AREA: Onboarding & first-time experience

VOLYUME CURRENT:
Volyume routes signed-out users to WelcomeScreen (RootNavigator.js:1117), a
two-tier chooser with Pro visually dominant: hero wordmark, tagline "Less
thinking. More lifting.", a Pro card ("Free for 14 days", 4 bullets) and a Free
card, plus a trust row "Works fully offline · Exports anytime · No ads, ever"
(11-onboarding-auth.md, WelcomeScreen.js:55–163). A quiz-first funnel is LIVE
(`ONBOARDING_QUIZ_FIRST = true`, quizFlow.js:22): the Pro CTA goes
Welcome → QuizScreen (pre-account, chip-based, answers held in-memory only and
never persisted/transmitted, QuizScreen.js docstring 1–12, 48) → PlanPreview →
account wall (11-onboarding-auth.md, ONBOARDING ORDER section). LoginScreen is a
combined sign-in/create-account surface with OAuth above the form; "Continue
without an account" was deliberately removed — there is no anonymous mode
(LoginScreen.js:327–331; WelcomeScreen.js:48–54). Every new account is flipped to
`tier='pro'` (LoginScreen.js:168) and passes through the Article 9 health-data
consent gate, where the 14-day Pro trial is actually granted via
`cascade.startCascade()` (Article9ConsentScreen.js:100–117; RootNavigator.js:1102).
Pro users then get a 5-step guided wizard (account → profile → training logistics
→ goal → recovery/reminders) with an endowed-progress bar (base 12%), "Step X of
5" counters, disciplined 3–5 fields per step, quiz-prefill, and an honest staged
"Building your plan" overlay tied to real generation phases with a 3.2s min dwell
(ProOnboardingScreen.js:50, 196–210, 451–497, 766–807). It ends on
ProSetupCompleteScreen — the reveal: the actual generated plan, a real kcal ring,
macro bars, division/phase chips and a "Why this plan, for you" rationale, framed
as a numbered 1–4 daily routine (ProSetupCompleteScreen.js:138–319). Free users
instead get FirstRunScreen (name + forced-kg units) → FreeStarter
(FirstRunScreen.js:38, 49–101). ImportScreen (Hevy/Strong CSV) lives in the
Profile tab, NOT in the first-run chain (RootNavigator.js:397).

BEST IN CLASS:
- Long-but-valuable onboarding — Noom: ~77–113 screens / 10–15 min that still
  convert because "Length isn't the enemy; emptiness is" — acknowledgement copy on
  nearly every screen, an updating weight-loss projection date, section progress
  bars and inline education (green/yellow/red food teaching inside the questions).
  Status: VERIFIED — growthwaves.substack.com/p/the-113-screen-onboarding-that-doesnt ;
  thebehavioralscientist.com/articles/noom-product-critique-onboarding
- Value-before-signup / fastest time-to-value — Duolingo: lazy registration, a
  translation exercise delivers the aha in 3–4 minutes before any account is asked
  for. Status: VERIFIED —
  medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020
- Fastest expert onboarding — Hevy: account created and first set logged in under
  90 seconds, the cleanest in the logging category. Status: VERIFIED —
  repreturn.com/hevy-app-review/
- Non-condescending level handling — Fitbod (ask experience level then the
  forward-looking weekly goal) and Freeletics (declared level matters less because
  per-workout feedback recalibrates, so a wrong choice self-corrects). Status:
  VERIFIED — fitbod.me/blog/... ;
  fitnessnav.com/insights/madmuscles-vs-fitbod-vs-betterme-vs-freeletics/
- Tangible intelligence artefact as the aha — Fitbod muscle-recovery map built
  from the user's inputs. Status: VERIFIED — autonomous.ai/ourblog/fitbod-app-review
- Beginner intimidation defused — Couch to 5K: run/walk intervals "without asking
  you to run nonstop on day one". Status: VERIFIED — en.wikipedia.org/wiki/Couch_to_5K
- Non-shaming tone as credibility + safety — MacroFactor: "never see warnings, red
  numbers, or shaming". Status: VERIFIED —
  apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471

TOP 50 RANGE:
A wide spectrum across the ~20 VERIFIED-behaviour apps. At the minimal/fast end,
Hevy (<90s to first log) and MyFitnessPal (minimal onboarding) optimise for
speed-to-tool but MFP "drops [beginners] into the app with little guidance" (both
VERIFIED). At the long/value-dense end sit Noom (~77–113 screens), Me+ (~45–50
screens / 7–10 min) and Lose It! (which lengthened onboarding and saw trial starts
rise "double digits") — long flows that convert because every screen returns value
(all VERIFIED, RevenueCat teardown). The generic-friction literature pulls the
other way: completion drops 72%→16% between 3 and 7 steps, and the data-gathering
rule-of-thumb is 7–8 screens (VERIFIED). Mid-spectrum: Freeletics/BetterMe/8fit
(detailed quiz → template plan), Fitbod (level+goal → recovery map), Headspace
(experience/goal → personalised plan recap as the aha), and coach-matched flows
(Ladder, Caliber, Future). The clear anti-pattern is Nike Training Club's bare
3-box beginner/intermediate/advanced segmentation with no follow-up, reviewed as
"one-size-fits-all" (VERIFIED). Whoop sits at the "too dense" extreme (PARTIAL).

NEWBIE VERDICT:
Mixed-to-good, with jargon as the recurring beginner tax. Volyume hits several
beginner best-practices: the quiz uses plain-language chips ("New to lifting",
"Full gym"), the Free path is deliberately minimal (one name field, FirstRunScreen),
and ProSetupComplete is the strongest newbie screen of the set — numbered "log your
weight / hit your targets / train your split / check in" steps plus an explicit
"New to calories and macros? 5-minute guide" ramp (ProSetupCompleteScreen.js:222–227).
That maps onto F.6.1 (newbies need simple wins, low intimidation) and F.5.2
(personalised plan preview as aha). But jargon arrives before any explanation:
"Precision Coaching™" and "division-specific" appear on Welcome before a beginner
has context (WelcomeScreen.js:25, 66), and ProOnboarding step 4 asks competition
phase (cut/lean-gain/maintain), divisions and protein "optimised/advanced", plus
body-fat methods (BIA/caliper/DEXA), which "assume knowledge a true beginner lacks"
(11-onboarding-auth.md:206) — the opposite of F.3.5 (translate science into the
user's own units) and F.6.1 (no jargon). The QuizScreen heading "Eight quick
questions" mismatches the 5–6 actual asks (11-onboarding-auth.md:138), a small
trust dent against the first-impression physics of F.7.1.

ATHLETE VERDICT:
Strong — this is where Volyume's depth shows. ProOnboarding gives an experienced
competitor exactly the levers F.6.3 says they want immediately: division selection,
weak-point prioritisation (max 3), protein-approach override with ranges, recovery
rating feeding plan volume, and body-fat % + method feeding Katch-McArdle BMR
(11-onboarding-auth.md:207). ProSetupComplete then delivers the credible
data-artefact aha F.5.5/§5 describes — a named split, workout count, per-decision
rationale and macro composition that prove the plan was built to spec
(11-onboarding-auth.md:244). The honest staged build overlay (real phases, min
dwell that never finishes before the work) is genuine operational transparency
(F.3.2), not a mirage. Gaps for the athlete: the pre-account quiz is shallow (3
experience bands, no weak-point/division depth) so the "your plan takes shape as you
answer" promise leans entirely on the preview (11-onboarding-auth.md:140); and the
experience-band mismatch (3 bands in QuizScreen vs 4 incl. "Competitive" in
ProOnboarding) can carry a value the other side never offered (11-onboarding-auth.md:138,
205). Volyume does NOT recalibrate from per-workout feedback at onboarding the way
Freeletics does (F.1.4) — its adaptation is the deterministic coaching engine, a
different mechanism.

WHERE WE LEAD:
- Value-before-signup quiz-first funnel: Welcome → QuizScreen → PlanPreview runs
  the entire teaser BEFORE the account wall, with answers in-memory only and never
  transmitted (11-onboarding-auth.md ONBOARDING ORDER; QuizScreen.js:48). This is
  exactly the Duolingo lazy-registration / aha-before-signup pattern (F.5.3,
  VERIFIED) and directly counters the top abandonment triggers — forced signup and
  early data/permission demands (F.4.2–4.3, VERIFIED).
- Honest operational transparency: the staged "Building your plan" overlay is tied
  to real generation phases with a min dwell, never completing before the work is
  done (ProOnboardingScreen.js:451–497). Noom's labour-illusion works but its own
  critique warns it "can be a mirage" (F.3.2, VERIFIED); Volyume's is real.
- Real plan-preview aha artefact: ProSetupComplete shows the actual generated plan,
  kcal ring, macros and per-decision rationale (11-onboarding-auth.md:241,244) —
  the personalised-plan-preview aha (F.5.2, VERIFIED) and the credible-artefact aha
  an athlete needs (F.5.5/F.6.3, VERIFIED).
- Endowed-progress bar + "Step X of 5" counters across the Pro wizard
  (ProOnboardingScreen.js:766–807): progress indicators lift completion of longer
  flows by ~22% and predictability reduces abandonment (F.2.5, F.7.2, VERIFIED).
- Non-shaming / empathy-aligned design and an explicit ED-safety stance: matches
  MacroFactor's "no shaming" credibility lever (F.3.4) and Noom's vulnerable-input
  empathy (F.7.4), both VERIFIED, and the research itself notes this maps onto
  Volyume's CLAUDE.md ED-safety requirement.

WHERE WE LAG:
- Jargon before explanation on the first screen ("Precision Coaching™",
  "division-specific" on Welcome; phase/division/protein-tier and BIA/caliper/DEXA
  in ProOnboarding step 4): violates F.3.5 (translate into the user's own units)
  and F.6.1 (no jargon for newbies, VERIFIED). Best-in-class teaches science inside
  the questions (Noom green/yellow/red, F.3.1) rather than naming it cold.
- No adaptive/recalibrating level handling at onboarding: Freeletics removes the
  pressure of self-labelling by recalibrating from per-workout feedback (F.1.4,
  VERIFIED); Volyume asks a fixed experience band and the bands even differ between
  quiz (3) and wizard (4) (11-onboarding-auth.md:138, 205).
- Quiz heading/content mismatch ("Eight quick questions" vs 5–6 actual; session
  length/equipment not in the ready-gate) dents the first-impression credibility
  F.7.1 prizes (11-onboarding-auth.md:138, VERIFIED mechanism).
- No just-in-time progressive disclosure for the dense steps: ProOnboarding step 5
  and ProSetupComplete are flagged information-dense (11-onboarding-auth.md:205, 242);
  F.3.3 (progressive disclosure / tooltips) is the named anti-overwhelm pattern
  (VERIFIED), and Whoop's density is a cited downside (PARTIAL).
- Speed-to-tool for experienced free loggers is not Hevy-fast: the no-anonymous-mode
  rule forces account creation before logging, where Hevy reaches first set in <90s
  (F.6.3, VERIFIED). (Volyume's signup wall is a deliberate backup/sync decision per
  LoginScreen.js:270–277, not an oversight.)

MISSING ENTIRELY:
- Behaviour-based recalibration of the declared level during onboarding (Freeletics,
  F.1.4 VERIFIED) — not present; Volyume's adaptation is the post-onboarding
  deterministic engine.
- Coach-matched / pick-a-coach-or-style onboarding (Ladder, Caliber, Future; F.1.5
  VERIFIED/PARTIAL) — absent; Volyume has no human-coach or coach-persona selection
  step.
- An updating live projection during the intake (Noom's moving goal date, F.5.4
  VERIFIED) — Volyume's "your plan takes shape as you answer" promise is delivered as
  a single PlanPreview/ProSetupComplete reveal, not a continuously updating figure.
- Acknowledgement/empathy micro-copy on individual intake answers (Noom "Thank you
  for sharing…", F.7.4 VERIFIED) — Volyume's screens are clean but do not respond to
  each input.
- A branching short-core-plus-optional-deep-intake structure (the INTERPRETATION
  recommendation in §2/§5, explicitly NOT a single sourced claim) — Volyume instead
  branches by tier (Free quick-setup vs Pro 5-step wizard), not by a skippable depth
  toggle.
- Onboarding-time offer of the Hevy/Strong import: ImportScreen exists but lives in
  Profile, outside the first-run chain (11-onboarding-auth.md:312, 318) — a
  switching-cost/migration moment is not surfaced during onboarding.

USER SENTIMENT:
The research's clearest unmet desire is for an onboarding that serves BOTH a
beginner and an expert without one flow shortchanging the other — "the same app
rarely serves both with one flow" (Lose It! friendlier vs MyFitnessPal depth-first,
F.6.4 VERIFIED): beginners want reassurance and a skippable, jargon-free path while
experienced users want <90s to the tool and immediate depth (F.6.1/F.6.3). Reviewers
also voice fatigue at density (Whoop "the information and features are densely
presented", PARTIAL) and at hollow segmentation (Nike Training Club "shoves you into
one of three boxes… no personal touch", VERIFIED). No researched app fully resolves
the dual-audience tension — that gap is the standing user want this area documents.

VERIFICATION STATUS:
This block leans predominantly on VERIFIED findings (Q1–Q7 are each VERIFIED with a
named source; Fitbod, Freeletics, Noom, Duolingo, Hevy, MacroFactor, Couch to 5K,
Nike Training Club, MyFitnessPal, Lose It!, Me+, Headspace all VERIFIED). The
following load-bearing items carry weaker status and are flagged:
- Whoop density complaint — PARTIAL (the5krunner review).
- Coach-matched onboarding — Ladder/Caliber VERIFIED, but Future is PARTIAL.
- The "branching short-core + optional-deep-intake" structure cited under MISSING
  ENTIRELY is INTERPRETATION in the source (§2/§5), NOT a single sourced claim, and
  is carried as such.
- The verbatim user-voice gap: raw first-person onboarding-abandonment quotes were
  NOT FOUND / PARTIAL (research §6); the abandonment statistics (F.4) are the
  load-bearing evidence, and the USER SENTIMENT section leans on those mechanisms
  plus the VERIFIED MFP/Lose It!, NTC and (PARTIAL) Whoop reviews rather than on
  primary onboarding-fatigue threads.
