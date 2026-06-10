# impl-COMP-030 — Quiz-before-account sequencing (blueprint only)

> **Status: BLUEPRINT ONLY. Gated on founder + DPO/legal approval.**
> COMP-030 touches two locked decisions (`IDENTITY_AND_OWNERSHIP_LOCKED.md`
> decision 1; `ONBOARDING_SEQUENCE_LOCKED.md` / `PRIVACY_CONSENT_LOCKED.md`
> Article 9 gate placement). Nothing in this document is to be built without
> explicit sign-off recorded against the checklist in §10. No code was
> changed in producing this blueprint.
>
> **Method note:** direct page fetches were blocked from this environment
> (403 on publisher domains), so external evidence was gathered via web
> search extraction. Claims marked *(search-extract)* are directionally
> reliable but were not read in full at source. Legal material in §9 is
> presented as **questions for the DPO**, not as legal conclusions.

---

## 0. Current state (code ground truth, verified 2026-06-10)

The most aggressive front door in the comparison set: **all value sits
behind an account AND an un-skippable special-category consent screen.**

Actual sequence today (verified against source, not docs):

1. `WelcomeScreen.js` — tier cards (Pro/Free). Both CTAs route to sign-up
   (`chooseTier` → `Login` with `pro_signup`/`free_signup` intent), per
   `IDENTITY_AND_OWNERSHIP_LOCKED.md` decision 1 (no anonymous mode).
2. Account creation — either `LoginScreen.js` or `ProOnboardingScreen.js`
   **step 1 of 5** (email/password or OAuth; `TOTAL_STEPS = 5` at line 49).
3. `RootNavigator.js` routing priority (lines 1005–1050): `!user` →
   `WelcomeStack`; signed-in + consent unresolved → blocking splash
   (ONB-001 resolver, line 1040); signed-in + `healthConsent === false` →
   `Article9ConsentStack` (line 1043). The consent gate **unmounts whatever
   stack was showing** — the existing `proOnboardingAccountCreated`
   persisted flag (ProOnboardingScreen.js lines 228–249) exists precisely
   because this remount used to wipe the wizard's step state (the OAuth
   loop bug).
4. `Article9ConsentScreen.js` — locked copy; on Continue it calls
   `record_health_consent` RPC (migration 019, audit row in `consent_log`),
   caches `@volyume_health_consent_<uid>`, fires `article9_consent_recorded`
   telemetry, then **awaits `cascade.startCascade()`** — the 14-day cardless
   trial grant (lines 104–117; `start_cascade` RPC, migration 030; rule in
   `SUBSCRIPTION_AND_PAYMENT_LOCKED.md`: "Article 9 consent starts the
   trial"). Trial grant and consent are welded together today.
5. `ProOnboardingScreen.js` steps 2–5: **step 2 = body stats** (name,
   weight, height, age, sex, optional BF% — the first special-category
   collection, correctly after consent), step 3 = training logistics
   (experience, session length, days/week, equipment), step 4 =
   goal/division/phase/weak points, step 5 = recovery + reminders +
   steps/cardio toggles → plan + nutrition generation → `ProSetupComplete`.
6. Free path: `FirstRunScreen.js` — name only, then straight to logging.

So a brand-new user gives **email + password + an explicit health-data
consent before seeing a single personalised pixel.** Round 1 called this
"the set's most aggressive front door" and scored fixing it the single
strongest conversion finding (impact 9 — `../competitive-audit-03-master-proposals.md`
COMP-030).

---

## 1. Best-in-market bar

1. **Flo — the proof that special-category data does not force
   account-first.** Flo's onboarding runs the full personalisation quiz
   first and asks for an account at the end, framed as saving progress
   ([Medium/Bootcamp](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7),
   round-1 §3.3). Privacy International's traffic analysis confirmed the
   architecture: "After completing the onboarding questionnaire, users were
   able to proceed on the app without having to create an account with
   their name or email" — and, critically, that **quiz responses were sent
   to Flo's API before any account existed**, under technical identifiers,
   with mandatory privacy-consent checkboxes shown *before* the quiz
   ([Privacy International](https://privacyinternational.org/long-read/5561/flo-research-findings),
   [Flo help](https://help.flo.health/hc/en-us/articles/4406826484500-Setting-up-your-Flo-account);
   *search-extract*). Flo's GDPR posture is therefore **consent-first,
   account-last, server-side pre-account processing as controller** — not
   "local-only until account". They invest at industrial scale: ~400
   branching onboarding screens, a dedicated Survey Engine platform team
   ([Flo Health engineering](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce)),
   and since 2022 an open-sourced Anonymous Mode (Oblivious HTTP relay via
   Cloudflare so no party holds identity + health data together)
   ([Flo Anonymous Mode white paper](https://flo.health/media/6925/download/Flo%20Anonymous%20Mode%20White%20paper_September2022.pdf?v=1);
   *search-extract*) — evidence that privacy architecture itself is
   marketable in this category.
2. **Duolingo — the published A/B data.** Moving sign-up back a few steps
   so users complete a lesson first produced **~+20% DAU**; replacing
   "Discard my progress" with a softer "Later" button helped; the winning
   configuration was **two soft walls then one hard wall**, and the
   eventual wall converted *better* because users were invested
   ([First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/);
   *search-extract*). This is the cleanest published causal evidence for
   deferring the account wall.
3. **Runna — quiz-as-trust-builder for a coached-plan product.** 25
   screens/~12 minutes raises trust because every question visibly feeds
   the plan; account arrives during the flow, paywall at the end
   ([Growth Dives](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study),
   round-1 §3.1). The lesson Volyume needs: the quiz IS the value preview
   when questions are identity-affirming.
4. **Noom — commitment-before-payment, account late.** Up to 113 screens
   in the web funnel; sensitive asks softened with reassurance copy; price
   only after heavy effort investment
   ([RevenueCat teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)).
   Converts, but sentiment punishes the length (round-1 §3.5).
5. **Cal AI — the anti-pattern with receipts.** Quiz → hard paywall with
   hidden pricing and card-on-file; biggest complaint themes are the hidden
   price and trial-end lockout
   ([eesel](https://www.eesel.ai/blog/cal-ai-pricing),
   [Nutrola](https://nutrola.app/en/blog/cal-ai-free-vs-paid-what-do-you-actually-get)).
   Volyume's cardless trial + visible price is already the antidote; the
   resequence must not dilute it.

**The single best reference is Flo** — same data class (special-category
health), same regulatory regime, quiz-first at scale, with a published
privacy architecture. Note carefully though: Flo achieves it by processing
pre-account data server-side under consent obtained up front. Volyume's
Variant B below is deliberately **more conservative than Flo's actual
practice** (nothing leaves the device pre-account).

Supporting benchmarks (round-1, re-cited): first sign-up screen drop-off
38.4%, reduced to 24.1% by a progress bar; cutting a 7-field form to 3 cut
abandonment 44.7%; social login lifts completion ~60%
([Amra & Elma](https://www.amraandelma.com/funnel-drop-off-rate-statistics/));
health/fitness day-one onboarding completion ~26% vs ~8–9% global
([Digia](https://www.digia.tech/post/app-onboarding-rates-statistics));
quiz + "customising your experience" loader: +8.5% trial starts, +17%
paying, +22% ARPU ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)).

## 2. What fails

- **Account wall before any value (the current Volyume pattern).** Works
  only for apps with a structural excuse — social graph (Strava), hardware
  (Whoop), or near-zero friction (Hevy's <90s). Volyume sells a coached
  experience and has neither excuse (round-1 §4.1).
- **Quiz theatre that doesn't visibly feed the output** (Noom's "so many
  questions before… how they're going to help" critique —
  [The Behavioral Scientist](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)).
  Every pre-account question must visibly shape the preview.
- **Hidden price after invested effort** (Cal AI). The resequence must keep
  Volyume's localised price on Welcome and the "no card, nothing charged"
  message at consent.
- **"Discard my progress" framing at the wall** (pre-fix Duolingo). The
  account screen must be framed as *keeping* something that now exists
  ("Save your plan"), never as a toll booth.
- **Jargon before value** (RP Hypertrophy — beginners told to start
  elsewhere; round-1 §3.11). The quiz copy stays in the house voice: no
  MEV/MRV/RIR.

## 3. User psychology

- **Moment of need:** a fresh installer wants to know "will this work for
  *me*?" within the first minute. The quiz answers that question by asking
  it back; the account wall answers nothing.
- **Habit loop:** cue = install curiosity; action = 8 taps of
  self-description; reward = a visible plan shape with their division and
  schedule in it, within ~90 seconds. Today the first reward is gated
  behind email + consent + 4 more steps.
- **Effort budget:** the resequence adds zero questions — it reorders
  existing ones. The endowment effect then works *for* us: at the wall the
  user owns a plan-in-waiting, and the account is how they keep it
  (Duolingo's progress-loss mechanism, Flo's "save your progress").
- **Commitment & consistency:** the division question is the most
  identity-affirming ask in the category (round-1 implication 7 — "no
  ranked app asks anything as identity-affirming as a physique division").
  Moving it pre-account turns Volyume's most demanding input into its
  best hook.
- **Emotional safety:** the pre-account quiz contains no body-weight, no
  food, no screening questions — nothing that can shame. SCOFF and ED
  machinery remain exactly where they are, post-consent. Calorie floors,
  thresholds, signposting untouched (hard constraint 3).
- **Trust mechanics:** Article 9 consent lands at the moment health data
  is actually about to be requested, which makes the consent screen read
  as honest context rather than legal toll — the consent asks permission
  for something the user is about to *do*, not something abstract.

---

## 4. The Volyume implementation — two variants for the founder

The founder chooses one. Both keep: no anonymous *identity* (no uid, no
rows, no `anon:` anything pre-account), the locked Article 9 copy
verbatim, the trial grant welded to consent (`startCascade()` stays inside
`Article9ConsentScreen.handleContinue`), the Free path untouched
(`FirstRunScreen` name-only flow), and the localised price on Welcome.

### 4A. VARIANT A — conservative: pre-account value preview

**What changes:** one new screen between Welcome and Login. Account-first
is retained; the wall simply stops being the first interaction.

Sequence: Welcome → **GoalPreview (NEW)** → Login (sign-up) → Article 9
(+ trial grant, unchanged) → ProOnboarding steps 2–5 with step 4 prefilled.

- **GoalPreview screen:** "What are you training for?" — the
  division/goal chips (from `PHYSIQUE_GOALS` / the step-4 picker) and the
  phase segment (lean gain / cut / maintain). Two taps. Below the fold, a
  static preview line that updates with selection, e.g. division picked →
  "Your plan biases shoulders and back width. 4 days, built around your
  schedule — next step takes 2 minutes." CTA: **"Create an account to
  build your plan"**.
- **Data class:** division + phase choice only. Held in a non-persisted
  zustand slice and passed as route params into Login → ProOnboarding;
  written to the profile only at the existing step-5 save (post-consent).
  Nothing written to SQLite or AsyncStorage pre-account.
- **Navigation changes:** `WelcomeStack` gains one screen. `renderNavigator`
  untouched. `ProOnboardingScreen` step 4 reads the prefill and renders as
  a confirm ("Still training for Classic Physique?") instead of a blank
  picker.
- **Locked-rule disturbance:** smallest possible. `IDENTITY_AND_OWNERSHIP`
  decision 1 is arguably untouched (both CTAs still route to sign-up; one
  screen earlier the user expressed a preference). `ONBOARDING_SEQUENCE_LOCKED`
  says "Welcome (existing, unchanged)" — that line needs a founder
  amendment either way.
- **Abandonment:** selection lost on process kill. Cost: two taps. Accept.
- **What it does NOT capture:** the account wall is still screen 3 of the
  funnel and still precedes all personalised output. Duolingo/Flo evidence
  is about *completing an experience* pre-account; Variant A delivers a
  taste, not an experience. Expected effect is the Adapty
  "personalisation question" class of lift (single-digit %), not the
  Duolingo class (+20% DAU).

### 4B. VARIANT B — full resequence: quiz → preview → "save your plan" → consent at first health input

**Sequence (Pro path only; Free path unchanged):**

| # | Screen | Inputs | Data class | Where it lives |
|---|--------|--------|-----------|----------------|
| 1 | Welcome (slimmed) | none | none | — |
| 2 | Quiz: training profile | experience, days/week, session length, equipment | personal-when-linked; **not special-category**; pre-account: volatile memory only, never transmitted | non-persisted zustand slice |
| 3 | Quiz: goal | division/goal, phase (lean gain/cut/maintain), weak points (≤3) | as above — **DPO Q2: is "cut" health data?** (§9) | volatile memory |
| 4 | Plan preview ("labor illusion" + reveal-lite) | none — derived | derived from above, computed locally and deterministically (split shape, weekly structure, volume focus by division; **no kcal/macros — those need body data**) | volatile memory |
| 5 | **"Save your plan"** — account wall | email/password or OAuth | account essentials — Art 6(1)(b) per `PRIVACY_CONSENT_LOCKED.md` "what does NOT need explicit consent" | Supabase auth |
| 6 | Article 9 consent (locked copy, **unchanged position relative to health data: still "between sign-in and the basic stats step"**) + trial grant (`startCascade`, unchanged) | checkbox | consent record | `consent_log` via RPC, as today |
| 7 | Body stats (current step 2) | name, weight, height, age, sex, BF% | **special-category begins here — after consent** | SQLite + cloud, as today |
| 8 | Recovery + reminders (current step 5) | recovery, notification prefs, steps/cardio toggles | personal / special-category | as today |
| 9 | Generation → `ProSetupComplete` | — | — | as today |

After step 5 succeeds, quiz answers (none special-category, pending DPO
Q2) may be persisted under the real uid pre-consent — same Art 6(1)(b)
class as the email itself — which protects them across the consent-gate
remount and any process death during email confirmation.

**The privacy-by-design position (the headline for the DPO):** pre-account
quiz answers exist only in JavaScript process memory. Not AsyncStorage,
not SQLite, no device identifier attached, no network call. Volyume's
servers receive nothing until an account exists, and receive no health
data until explicit consent exists. This is strictly tighter than Flo's
audited practice (PI found Flo shipping pre-account quiz answers to its
API). The deliberate trade: a process kill mid-quiz loses ~60–90 seconds
of taps (§4B-abandonment).

**Navigation state machine changes** (`RootNavigator.js`):

- `WelcomeStack` becomes the pre-account flow: `Welcome → QuizTraining →
  QuizGoal → PlanPreview → SaveYourPlan` (the auth screen reuses
  `OAuthButtons` + `EmailPasswordFields` and the sign-up logic currently in
  `ProOnboardingScreen.advanceFrom1` / `LoginScreen.handleEmailAuth`,
  including `noteSignupPendingOnboarding` for confirm-later email signups).
  "Already have an account? Sign in" stays on Welcome and skips the quiz.
- `renderNavigator` priority order is **unchanged** (signed-out →
  pre-account stack; consent resolver splash; Article 9 gate; tier branch;
  MainTabs). The only structural change is *inside* the signed-out stack.
- `ProOnboardingScreen` shrinks: step 1 (account) and steps 3–4 (training
  + goal) leave the post-account machine; it becomes body stats → recovery
  → generate, hydrating from the quiz slice. `TOTAL_STEPS` 5 → 3; the
  progress bar spans the whole journey (quiz steps count), preserving the
  endowed-progress effect already coded at lines 629–642.
- The quiz slice lives in `useAppStore` **without persistence** — this is
  load-bearing: the Article 9 gate unmounts the visible stack on auth
  events (the documented OAuth-loop failure mode at
  `ProOnboardingScreen.js:220-249`); component-local state dies, store
  memory survives within the process.

**Abandonment recovery (quiz answers lost on kill — acceptable?)**

- Pre-account, pre-signup: lost on process death. Re-entry starts the quiz
  again (~8 inputs). Duolingo and Flo accept identical loss; the quiz is
  deliberately short. **Recommend: accept.** Persisting pre-account would
  spend the exact privacy argument that makes this design defensible.
- Post-signup, pre-consent (email-confirm gap, OAuth activity death):
  quiz answers persisted under the uid at account creation (above), so the
  user resumes at the consent gate with nothing lost — riding the existing
  `noteSignupPendingOnboarding` machinery.
- Mid-quiz backgrounding without kill: store memory survives; no work.

**Migration risk list (Variant B):**

1. **Consent-gate remount wipe** — mitigated by the store slice; must be
   covered by a mount test (the `proOnboardingAccountCreated` bug class).
2. **Email confirm-later loop** — user leaves app to tap the link;
   `App.js handleAuthDeepLink` (line ~143) exchanges the code; if the
   process was killed, quiz answers must already be under the uid (see
   above) or the user re-enters the quiz. Test both orders.
3. **OAuth return path** — in-app browser sheet normally keeps the process
   alive; Android low-memory kill is the same recovery as (2).
4. **Splash gates** — bootstrap's stale-tier cleanup (RootNavigator
   ~669–675) and the ONB-001 consent resolver are unchanged but must be
   re-verified: a quiz-completed-not-signed-up user who relaunches must
   land on Welcome (clean), not a half-state.
5. **`healthConsentChecked` logic** — untouched (keyed on signed-in user);
   verify the resolver still ends in all three branches.
6. **Tier branch after consent** — `start_cascade` still flips tier to
   'pro' at consent, so quiz users route to the (shrunken)
   `ProOnboardingStack`. If any consent-passed user lands in
   `FirstRunStack` (tier edge cases), the name prefill from the quiz slice
   must not crash an empty slice.
7. **Notification deep links / cold-start routing** — `routeForNotificationType`
   targets assume MainTabs; unchanged, but re-run the routing tests since
   the signed-out stack is renamed.
8. **Trial-abuse ledger (migration 071)** — unaffected; the email hash is
   written at the same place (account + consent), and the quiz grants
   nothing.
9. **Telemetry cannot fire pre-account** — `record_engine_telemetry`
   raises on `auth.uid() IS NULL` (migration 036) and the client transport
   drops events without a userId (`telemetry/transport.js:62-63`). See §8.
10. **Locked-copy version** — if any consent-screen framing copy changes,
    bump `CONSENT_VERSION` (Article9ConsentScreen.js:34) and reconcile
    `PRIVACY_CONSENT_LOCKED.md`.

**Copy direction (house voice, British English):**

- Quiz intro: "Eight quick questions. Your plan takes shape as you answer."
- Account wall: "Your plan is ready to build. Create an account to keep
  it." (Never "sign up to continue".)
- Consent intro line (framing only, locked body untouched): "Next we ask
  for your weight and a few body details. Here's how that data is treated."
- Preview honesty: "Calories and protein come after — they need your
  weight, and we'll ask permission first."

**Accessibility:** every quiz chip honours the 44pt floor; progress bar
exposes `accessibilityValue`; Reduce Motion skips the preview build
animation (existing pattern); the account wall must be reachable by
keyboard/screen-reader in one pass.

---

## 5. Whole-package integration

- **Strengthens COMP-013 (reveal moment):** the pre-account preview is
  reveal-*lite*; the full reveal (plan + first session) stays post-
  generation. The two must share visual language so the preview reads as
  a promissory note the reveal then honours — not a duplicate.
- **Strengthens COMP-007/COMP-012 (paywall proof, trust marketing):** the
  consent screen keeps "No card. Nothing charged unless you choose" —
  round-1 implication 4 — now delivered at the moment of maximum
  investment.
- **Duplication to avoid:** the quiz must not re-ask anything
  `ProOnboarding` asks later; the step-4 goal picker is *moved*, not
  copied. One source of truth for the options (`coachingGoals.js`).
- **Streamlining:** net screens for a Pro signup are unchanged (reordered,
  one preview added, one wizard step removed from the post-account leg).
  Welcome itself gets *simpler* (the tier comparison moves its weight to
  the preview + consent moments).
- **ED/wellbeing flags:** not applicable pre-account by construction —
  the quiz contains no weight, food, or screening inputs. SCOFF position
  (post-consent) unchanged.

## 6. Retention & word-of-mouth mechanics

The loop this feeds is **activation**: more installers reach the plan
reveal, which round 1 identified as the app's "built for me" moment — the
sentence users repeat ("created a program… that is perfect for me",
Runna's review pattern). Secondary loop: the privacy posture itself is
tellable — "it built my plan before asking for anything, and it asked
permission before my weight" is a gym-friend sentence no competitor in
the set can produce (Flo's Anonymous Mode shows privacy architecture
generates press in this category).

## 7. Beating the benchmark

Flo defers the account but ships quiz answers to its servers first; Cal AI
defers nothing and hides the price; Duolingo proved the mechanism but
carries no sensitive data. Variant B combines Duolingo's wall placement,
Flo's "save your progress" framing, and a stricter-than-Flo data posture
(nothing leaves the device pre-account, consent exactly at first health
input, cardless trial with visible pricing). No app in the round-1 set
holds all four properties; that combination — not any single screen — is
what beats the bar.

## 8. Measurement — funnel instrumentation plan

Existing pipe: `engine_telemetry` allowlist (migrations 035/036) already
carries `sign_in`, `account_created` (created_at <5 min heuristic,
RootNavigator.js:764–787), `article9_consent_recorded`
(Article9ConsentScreen.js:87–98), plus cascade events (migration 038).

Constraint: **no pre-account events can reach the server** — the RPC
requires `auth.uid()` and the client transport requires a userId. Plan:

1. Record per-step entry/exit timestamps in the volatile quiz slice.
2. On `account_created`, emit one consolidated `onboarding_quiz_completed`
   event (step timings, variant flag, entry point) — requires one additive
   allowlist migration in the migration-036 pattern. True pre-account
   abandonment is not directly observable (by design); it is inferred from
   install→account ratios per store console.
3. Baseline first: two weeks of the current funnel
   (`account_created → article9_consent_recorded → cascade_started`)
   before any flag flips.

Success metrics (2–4): (a) install→`account_created` rate (store installs
vs telemetry), (b) `account_created`→`article9_consent_recorded` rate,
(c) consent→plan-generated completion, (d) D7 retention per variant.
Kill criterion: variant ships behind a flag and reverts if (b) or (d)
degrade — a consent-rate drop is a compliance smell, not just a funnel one.

**Rollback strategy:** both front doors ship in the bundle behind a local
config flag read at `WelcomeStack` mount; rollback is a flag flip. No
schema change, no consent-copy change, no cascade change to unwind; the
only migration is the additive telemetry allowlist event. Pre-account data
is volatile by design, so rollback strands nothing.

## 9. Legal crux — questions for the DPO (not conclusions)

Anchors: UK GDPR Art 9(2)(a) explicit consent for health data, with the
condition identified **before** processing begins
([ICO, rules on special category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/));
the ICO's 2023–24 period/fertility app review closed with consent and
transparency as the live issues and "privacy by design" as the demand on
app developers
([ICO news](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/02/ico-urges-all-app-developers-to-prioritise-privacy/)).

- **Q1 — controllership over volatile, device-only quiz data.** If quiz
  answers exist only in app memory, are never transmitted, and carry no
  identifier, is Volyume processing personal data as controller at all?
  Tension to resolve: WP29 Opinion 02/2013 treats app developers as
  controllers of data processed "from and about" users, but also noted
  device-local-only processing may fall outside parts of the framework
  ([WP29 02/2013](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf);
  *search-extract*); EDPB Guidelines 07/2020 say a controller **need not
  have access** to the data — determining purposes and essential means can
  suffice ([EDPB 07/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en));
  recent scholarship says current practice "typically excludes" the
  provider for purely local processing under user control, while arguing
  the point is unsettled
  ([Computer Law & Security Review](https://www.sciencedirect.com/science/article/abs/pii/S0267364922001054);
  *search-extract*). The blueprint does not rely on a "no" — it relies on
  the pre-account data not being health data (Q2).
- **Q2 — classification of quiz fields.** Experience, days/week, session
  length, equipment, division: fitness preferences. Is the **phase choice
  ("cut")** health data within Art 9 (information "about health status")
  or a goal preference? If the DPO classes it as health data, Variant B
  moves the phase question behind the consent gate (the quiz still works:
  division + logistics drive the preview).
- **Q3 — PECR Regulation 6.** Volatile memory involves no storage on
  terminal equipment; if post-signup persistence (or any pre-account
  AsyncStorage fallback) is adopted, does it sit within the "strictly
  necessary for a service requested by the user" exemption
  ([PECR reg 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6/made),
  [ICO storage-and-access guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-pecr-rules/))?
- **Q4 — consent record integrity.** `consent_log` is keyed to
  `auth.uid()`; consent continues to be captured post-account, pre-health-
  data. Does the DPO confirm the resequence leaves the Art 7
  record/withdrawal posture unchanged (it should — the screen, copy, RPC
  and `CONSENT_VERSION` pinning are untouched)?
- **Q5 — DPIA addendum.** Variant B is a processing-sequence change for a
  health app: does the existing DPIA need an addendum describing the
  volatile pre-account stage as an Art 25 data-protection-by-design
  measure?
- **Q6 — children.** Age is asked at the body-stats step (post-consent),
  unchanged; the under-13 rejection remains a policy not a verified gate
  (per `PRIVACY_CONSENT_LOCKED.md` §Children). Confirm the quiz adds no
  new obligation (it collects nothing age-revealing).
- **Q7 — Flo as precedent, not licence.** Flo processes pre-account quiz
  data server-side under up-front consent; Volyume is choosing not to.
  Does the DPO agree the volatile-memory design needs no pre-account
  consent screen at all (since nothing is stored, accessed, or received)?

## 10. Sign-off checklist

**Locked rules touched (named precisely):**

| Locked doc | Rule | Variant A | Variant B |
|---|---|---|---|
| `IDENTITY_AND_OWNERSHIP_LOCKED.md` | Decision 1, sentence 2: "Tapping Free on Welcome routes to sign-up" + impl rule 6 (Welcome routes both CTAs to sign-up) | untouched in substance (one preference screen before sign-up) — founder to confirm | **amendment required:** "Welcome routes to the quiz; no identity, row, or persisted key exists pre-account; account creation precedes the first persisted row." Anti-pattern list ("no sign-in-skip path") needs the same precision |
| `ONBOARDING_SEQUENCE_LOCKED.md` | Sequence list + "Welcome (existing, unchanged)" | amendment (one inserted screen) | **rewrite of the sequence** (steps 2–5 reordered as §4B) |
| `PRIVACY_CONSENT_LOCKED.md` | "Appears at onboarding, between sign-in and the basic stats step" | untouched | **untouched in letter** (consent remains between sign-in and basic stats) — DPO to confirm reading |
| `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | Trial starts at Article 9 consent | untouched | untouched (grant moves with consent, later in funnel) |

**The DPO must confirm:** Q1–Q7 above; minimum viable set for build
approval is Q2 (field classification), Q3 (storage), Q7 (no pre-account
consent screen needed), Q5 (DPIA addendum or not).

**The founder must accept:** (1) the locked-doc amendments above;
(2) quiz answers lost on pre-account process kill; (3) Welcome's tier
cards giving way to quiz-led framing on the Pro path (price stays
visible); (4) the two-week baseline-measurement delay before flipping the
flag; (5) Variant B's effort is at the top of the approved score (6) —
roughly: 2 quiz screens + preview + auth-screen reuse + wizard shrink +
mount tests + 1 telemetry migration.

## 11. Recommendation

**Variant B**, gated exactly as above, with Variant A held as the fallback
if the DPO classifies the phase question as health data *and* rejects
moving it post-consent, or if the founder declines the
`IDENTITY_AND_OWNERSHIP` amendment. Reasoning: the audit's strongest
single conversion finding (impact 9) is specifically about completing a
personalised experience before the wall — Duolingo's +20% DAU and Flo's
category-proof both attach to the full resequence, not to a taster screen.
Variant A spends most of the political cost (it still amends a locked
sequence doc) for a small fraction of the evidence-backed upside. Variant
B's volatile-memory design is simultaneously the stronger conversion play
and the stronger privacy story — stricter than the best-in-market
reference's own audited behaviour — and it is fully reversible by flag.

---

### Source index

In-repo: `src/navigation/RootNavigator.js` (routing priority 1005–1050,
consent resolver 1040–1045, funnel telemetry 764–787),
`src/screens/ProOnboardingScreen.js` (step machine, resume flag 220–249),
`src/screens/Article9ConsentScreen.js` (consent + `startCascade` 104–117),
`src/screens/WelcomeScreen.js`, `src/screens/LoginScreen.js`,
`src/screens/FirstRunScreen.js`, `src/lib/payments/cascade.js`,
`src/lib/telemetry/transport.js`, `supabase/migrate_036_signup_funnel_telemetry.sql`,
`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`, `docs/PRIVACY_CONSENT_LOCKED.md`,
`docs/ONBOARDING_SEQUENCE_LOCKED.md`, `docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md`,
`../competitive-audit-01-onboarding-research.md`,
`../competitive-audit-03-master-proposals.md` (COMP-030).

External (all *search-extract* unless noted in round 1):
[Privacy International — Flo research findings](https://privacyinternational.org/long-read/5561/flo-research-findings) ·
[Flo Anonymous Mode white paper](https://flo.health/media/6925/download/Flo%20Anonymous%20Mode%20White%20paper_September2022.pdf?v=1) ·
[Flo help — setting up your account](https://help.flo.health/hc/en-us/articles/4406826484500-Setting-up-your-Flo-account) ·
[Flo engineering — onboarding evolution](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce) ·
[Medium/Bootcamp — Flo & Zoe funnels](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7) ·
[First Round Review — Duolingo A/B testing](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/) ·
[Growth Dives — Runna onboarding](https://www.growthdives.com/p/how-to-nail-onboarding-a-case-study) ·
[RevenueCat — Noom web-to-app teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/) ·
[The Behavioral Scientist — Noom critique](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding) ·
[Superwall — Cal AI case study](https://superwall.com/case-studies/cal-ai) ·
[eesel — Cal AI pricing](https://www.eesel.ai/blog/cal-ai-pricing) ·
[Nutrola — Cal AI free vs paid](https://nutrola.app/en/blog/cal-ai-free-vs-paid-what-do-you-actually-get) ·
[Amra & Elma — funnel drop-off statistics](https://www.amraandelma.com/funnel-drop-off-rate-statistics/) ·
[Digia — onboarding rates](https://www.digia.tech/post/app-onboarding-rates-statistics) ·
[Adapty — onboarding A/B data](https://adapty.io/blog/how-to-fix-your-onboarding-flow/) ·
[ICO — rules on special category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/) ·
[ICO — app developers urged to prioritise privacy (femtech review close-out)](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/02/ico-urges-all-app-developers-to-prioritise-privacy/) ·
[WP29 Opinion 02/2013 on apps on smart devices](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf) ·
[EDPB Guidelines 07/2020 — controller and processor](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en) ·
[Computer Law & Security Review — device manufacturers as controllers](https://www.sciencedirect.com/science/article/abs/pii/S0267364922001054) ·
[PECR Regulation 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6/made) ·
[ICO — storage and access technologies guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-pecr-rules/)
