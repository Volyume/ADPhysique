# 07 — Hevy Coach vs Volyume Precision Coaching

> Competitive teardown, 2026-06-29. LEARNINGS ONLY. No Hevy code, copy, or
> assets are copied. Hermes packs strings into concatenated blobs, so every
> string below is corroborated by at least one second signal (screen-component
> name, route/host, SDK fingerprint, or push-notification key) before it is
> treated as fact.
>
> CRITICAL FRAMING: Hevy Coach is a **human personal-trainer marketplace** bolted
> onto the Hevy logging app. It is the OPPOSITE of Volyume's product thesis.
> Volyume's coaching is deterministic, no-LLM, no-AI, no-human (CLAUDE.md SACRED
> RULE: "Never touch the coaching engine AI boundary. The Precision Coaching
> engine is deterministic. No LLM. No AI. No randomness."). Almost everything
> Hevy Coach *is* falls under AVOID for us. The value of this teardown is narrow:
> a few UX/delivery patterns from a human-coach relationship that we can mimic
> with our existing deterministic engine, plus a clear catalogue of what NOT to
> build.

## Hevy Coach — vs Volyume Precision Coaching

### What Hevy Coach is (evidence)

Hevy Coach is a separate **human coach ↔ client** product (its own brand, its own
web app and host) surfaced inside the Hevy mobile bundle. Evidence from the
corpus (`scratchpad/corpus/`):

**Separate product + web property**
- Hosts: `https://hevycoach.com`, `https://app.hevycoach.com` (`routes_hosts.txt`,
  and repeated `hevycoach.com?utm_source=hevymobile` deep-share strings in
  `bundle_strings.txt`).
- Deep links: `hevy://tab/coachClientInvite`, `hevy://tab/coach…`
  (`bundle_strings.txt`).
- Screen/VM names (`screens_components.txt`): `HevyCoachStack`,
  `HevyCoachStackNavigator`, `CoachTab`, `WelcomeToHevyCoachScreen` +
  `WelcomeToHevyCoachViewModel`, `HevyCoachWelcomeScreen`,
  `CoachSettingsScreen` + `CoachSettingsViewModel`, `FileCoachChatScreen`,
  `CoachChatViewModel`, `HevyCoachQuestionScreen`,
  `HevyCoachAudienceQuestionScreen`, `CoachQuestionsScreen`,
  `APartOfACoachProgramNotesScreen`, `HevyCoachClient` / `isHevyCoachClient`.

**Coach ↔ client invite flow (a relationship, not a feature toggle)**
- `acceptCoachInviteFromShortId`, `declineCoachInviteWithShortId`,
  `showCoachClientInviteAlert`, `CoachClientInviteListener`,
  `coachClientInvite.inviteAlert.acceptButtonTitle` /
  `.declineButtonTitle`, `coachClientInvite.inviteAcceptedAlert.title`,
  `coachClientInvite.acceptErrorAlert.title`.
- Analytics keys: `hevyCoach_clientAcceptedInvite`,
  `hevyCoach_clientDeclinedInvite`,
  `hevyCoach_clientEncounteredErrorAcceptingInvite`.
- Relationship copy: "Solo tu e il tuo coach…" / "you and your coach…",
  "so [the coach] can interact with you" — a 1:1 human relationship.

**Real-time chat (text + image + video messages)**
- `CoachChatScreen`, `CoachChatMessagesStoreClass`, `CoachChatViewModel`,
  `sendMessageAndWaitForAck`, `fetchUsersCoachAndMessagesIfAccountIsCoached`,
  `coachChatScreen.messagePlaceholder`, `.sendFirstMessage`,
  `.noPastMessages`, `.errorLoadingMessages`, `.unableToSendMessage`,
  `.messageActions.deleteMessage`, `Continue Workout Discussion`.
- Push-notification keys prove three message media:
  `coachChat.pushNotification.newTextMessage`, `.newImage`, `.newVideo`.
- Transport: **Ably** is the realtime SDK (26 fingerprints in
  `sdk_fingerprints.txt`; `libably`/Ably markers) — this is the most likely
  chat/message-delivery channel. (Not Stream/GetStream — no GetStream
  fingerprint present.)

**Video calls**
- **Agora** SDK present (4 fingerprints, `agora` markers). Combined with
  `coachChat.pushNotification.newVideo`, Hevy Coach supports video — at minimum
  video messages, plausibly live 1:1 video calls between coach and client.

**Program / routine assignment by the coach**
- `CoachRoutineCell`, `coachProgramNotes.navigation.title`,
  `APartOfACoachProgramNotesScreen` ("This routine is part of a coach program"),
  `hevyCoachProgramId`, `hevyTrainer.availableEquipment`,
  `settings.deleteProgram.title`. The coach builds and assigns programs/routines
  to the client, who trains them inside the normal Hevy logger.

**Onboarding questionnaire + audience segmentation**
- `CoachQuestionsScreen`, `HevyCoachQuestionScreen`,
  `HevyCoachAudienceQuestionScreen`, and segmentation buttons:
  `hevyCoachQuestionsScreen_ImAPersonalTrainer_pressed`,
  `_IHaveAPersonalTrainer_pressed`, `_ImJustCurious_pressed`. They route
  trainers, the coached, and the curious down different funnels.
- Marketing welcome screen with pricing: `hevyCoachLaunch.coachWelcomeScreen.*`
  (`greeting`, `paragraphOne`…`paragraphSix`, `subheadingOne`…`Five`,
  `monthlyPrice`, `numberOfClientsCell`, `getStartedForFree`,
  `showMorePricesButton`, `youCanVisit`) and a feed-cell ad
  (`feed_hevyCoachCell_cta_press`, `hevyCoachLaunch.feedCell.*`).

**Billing — coach-side, OUTSIDE the app store**
- **Stripe** (5 fingerprints) and **Paddle** are both present for the *coach's*
  subscription: `createStripeCustomerPortalSession`,
  `create_stripe_customer_portal_session`, `stripeCustomerPortalUrl`,
  `instructions.stripe.*`, `cancelPaddlePlan`, `instructions.paddle.*`,
  `paddle_plan`/`paddleCancelUrl`.
- Plainest signal: "Your subscription was through HevyCoach! If you'd like to
  modify it, contact hell[o@hevy…]" and
  `subscription.activeSubscription.hevyCoach.title`,
  `coachClientInvite.inviteAcceptedAlert.noPro.body` ("…as long as you have an
  active coach…"). So **being coached can confer Pro-equivalent access**, billed
  by the coach via Stripe/Paddle, not via Play Billing.

Net: Hevy Coach = a B2B2C human-coaching marketplace (trainer signs up, pays
Stripe/Paddle, invites clients by short-ID, chats text/image/video over Ably,
runs video over Agora, assigns programs, and the client gets Pro while coached).

### How Volyume's coaching works today (file:line)

Volyume's "coach" is a **pure deterministic function** plus a rendering layer. No
human, no network conversation, no AI.

- **The engine.** `src/lib/weeklyCoach.js:368` `runWeeklyCoach(inputs)` — pure,
  side-effect-free. Maps check-in + EWMA weight trend + training data to a
  unified card: data-confidence gate (`assessDataConfidence`,
  `weeklyCoach.js:103`), autoregulation matrix recovery×performance →
  volume signal (`autoregulationMatrix`, `weeklyCoach.js:174`), calorie
  adjustment with ±5% cap and 2-week cooldown (`weeklyCoach.js:663`), steps
  (`:864`), cardio (`:906`), deload (`:969`), diet break (`:984`), macro cycle
  (`:1012`), refeed (`:1038`). All maths, no randomness.
- **Safety, woven in.** FFM/RED-S floor (`weeklyCoach.js:826`,
  `computeFFMFloor`), rapid-loss compression (`:670`), rapid-loss flag (`:961`),
  ED-pattern detector (`edPatternDetector.js`, wired at `weeklyCoach.js:1071`).
  Tier-blind by design.
- **Chat-like DELIVERY (already built).** `src/lib/coachResponse.js:312`
  `buildCoachResponse` renders a **five-part coach response** elite human coaches
  use: (1) specific data-referenced acknowledgement (`coachResponse.js:62`),
  (2) plain-language trend interpretation (`:120`), (3) the decision + reason
  (`:182`), (4) one cue, (5) a **forward-pull line that anchors the next
  check-in** — "See you Sunday." (`coachResponse.js:281`). This is the key
  finding: Volyume already simulates the *relational cadence* of a coach without
  a human.
- **Register adaptation (persona voice).** `src/lib/coachRegister.js:80`
  `resolveRegister` + `buildRegisteredCoachResponse` (`:~242`) renders the SAME
  facts in `supportive` (default, beginner-safe) or `precise` (figure-led)
  tone; safety copy is register-blind (`coachRegister.js:21`). Jargon blocklist
  enforced in `__DEV__` (`coachRegister.js:47`).
- **Check-in cadence.** `src/screens/WeeklyCheckInScreen.js` — a weekly,
  multi-step check-in; `FIRST_CHECKIN_MIN_DAYS` / `MIN_WEIGH_INS` gate
  (`WeeklyCheckInScreen.js:~41`); reminders + "your plan is ready" notification
  (`scheduleNextCheckinReminder`, `scheduleWeeklyCoachReady`,
  `scheduleMissedCheckinFollowups`).
- **Delivery surface.** `src/screens/CoachOutputScreen.js` — renders the card,
  **confirm-then-apply** cards for every change (calories `:783`, training volume
  `:835`, steps `:870`, cardio `:893`, deload `:928`, diet break `:964`, macro
  cycle `:992`, refeed `:1026`). Nothing writes until the user taps Apply.
- **Trust / "why" surface.** `src/screens/MethodologyScreen.js` — "How Precision
  Coaching works", a static, offline, copy-only page reached from the coach card's
  `WhyBlock` and the held-decisions card. Every decision links to "Understand how
  this decision was made" (`CoachOutputScreen.js:356`).

### Gaps

These are gaps **relative to the relational warmth of a human coach**, not
product holes — and every candidate fix must stay inside the deterministic,
no-LLM, no-human boundary.

1. **No persistent message thread / history feel.** Hevy's `CoachChatScreen` is a
   running conversation a client can scroll back through ("`noPastMessages`",
   "Continue Workout Discussion"). Volyume's five-part response is rendered fresh
   per week; held-decision history exists (`HeldDecisionsCard`,
   `CoachOutputScreen.js:515`) but it reads as a ledger, not a back-scrollable
   "thread" of weekly notes from the coach.
2. **No between-check-in touchpoint.** Hevy's coach can message mid-week. Volyume
   speaks only at the weekly check-in. There is no deterministic, data-triggered
   nudge between check-ins (e.g. "3 sessions logged, nice — see you Sunday").
3. **No coach "identity"/continuity cue.** Hevy clients have a named human and an
   avatar. Volyume's voice is excellent but anonymous; the relationship is
   carried entirely by copy, with no persistent "from your coach" framing on the
   weekly card header.
4. **Onboarding questionnaire is thinner on "what kind of athlete are you".**
   Hevy's `HevyCoachAudienceQuestionScreen` segments hard up front. Volyume
   personalises via experience signals (`resolveRegister`) but does not present a
   confident "this is your coach, tuned to you" onboarding moment.

### Recommendations (adopt / adapt / AVOID)

Legend: **S/M/L** effort, **P1/P2/P3** priority. Every "adopt/adapt" item is
checked against the SACRED RULE — none introduce an LLM, AI, randomness, a human,
or a network conversation.

#### ADOPT (already aligned; cheap reinforcements)
- **A1 — Lean harder into the existing five-part "coach is talking to you"
  framing on the weekly card.** It is our single biggest moat vs Hevy's logger
  and our cheapest answer to "but I want a real coach". Surface
  acknowledgement→interpretation→decision→forward more prominently; it's already
  built (`coachResponse.js`). **S, P1.** Pure copy/layout; deterministic.
- **A2 — Keep the forward-pull anchor and make it concrete.** Hevy's relationship
  lives on "see you next session". We already render "See you Sunday."
  (`coachResponse.js:281`) — ensure it always renders when the check-in day is
  known. **S, P1.**

#### ADAPT (mimic the human-coach UX with the deterministic engine)
- **B1 — A back-scrollable "weekly notes" thread, rendered from saved coach
  outputs.** Reframe the existing held-decision + weekly-output history
  (`getCoachOutputHistory`, `HeldDecisionsCard`) as a chat-style timeline of past
  weekly five-part responses, newest at the bottom, so the user can scroll back
  through "what my coach told me". 100% from already-persisted deterministic
  output — no live messaging, no Ably, no transport. **M, P2.**
- **B2 — Deterministic, data-triggered mid-week touchpoint (notification only,
  no thread reply).** A local, rules-based nudge between check-ins fired off
  existing data ("You've logged all 4 sessions — strong week. See you [check-in
  day]."). Reuses the notification scheduler already in
  `WeeklyCheckInScreen.js`. STRICTLY templated/deterministic — NOT a chat reply,
  NOT generated text. **M, P2.** Founder decision needed: does a mid-week nudge
  fit the "weekly cadence" thesis, or does it dilute it? Ask before building.
- **B3 — Persistent "from Precision Coaching" header/identity on the weekly
  card.** A small, consistent coach-identity treatment (icon + name "Precision
  Coaching", not a fake human) so the weekly response reads as *from* a continuous
  coach. Copy/visual only; British English. **S, P3.**
- **B4 — A confident "your coach, tuned to you" onboarding beat.** Borrow Hevy's
  *audience-segmentation idea* (not its copy) to make the experience-level
  question that already drives `resolveRegister` feel like meeting your coach.
  **S, P3.**

#### AVOID (violates the product thesis and/or CLAUDE.md SACRED RULES)
- **AVOID-1 — Human coaches / a coach marketplace / coach↔client invites.**
  Hevy's entire `HevyCoachStack`, `coachClientInvite`, `isHevyCoachClient`. This
  is the opposite of Volyume. Our coach is the deterministic engine; there is no
  human on the other end. Do not build invites, coach accounts, or a B2B side.
  (Note: a separate, scoped B2B exploration exists at
  `docs/B2B_COACH_PHASE_2_SCOPED.md` — that is a *different, gated* track and is
  out of scope here; nothing in this teardown should be read as greenlighting it.)
- **AVOID-2 — Live chat / real-time messaging (Ably-style) where a human or an
  AI replies.** A free-text two-way thread implies either a human or an LLM
  answering. Both are forbidden (SACRED RULE: no LLM/AI; product has no humans).
  B1's "thread" is render-only history of deterministic output — never a reply
  box.
- **AVOID-3 — Video calls / Agora.** No human to call. Also adds a heavy native
  dependency (Agora) — and per CLAUDE.md, no dependency without explicit founder
  approval, and Expo-managed/no-eject constraints apply.
- **AVOID-4 — Coach-side Stripe/Paddle billing or any path where being "coached"
  grants Pro outside Play Billing.** Volyume's billing is Google Play only
  (`pro_monthly`/`pro_annual`), live, and SACRED. Do not introduce a second
  billing rail or a "coached → free Pro" entitlement.
- **AVOID-5 — Any "AI coach" framing or generated chat copy.** Tempting to answer
  "I want to talk to my coach" with an LLM. FORBIDDEN. All coach text stays
  templated and deterministic, passing the jargon blocklist
  (`coachRegister.js:47`).

### Quick wins
1. **A1/A2 (S, P1):** Make the five-part response the visual lead of the weekly
   card and guarantee the "See you [day]." forward line renders. Pure copy/layout
   over `coachResponse.js` output. No engine change.
2. **B3 (S, P3):** Add a quiet, persistent "Precision Coaching" identity header to
   the weekly card so the response reads as *from your coach*. Visual/copy only.
3. **Methodology cross-link reinforcement (S, P1):** Hevy sells trust via a human;
   we sell it via transparency. Ensure every weekly card prominently links to
   `MethodologyScreen` ("Understand how this decision was made",
   `CoachOutputScreen.js:356`) — our answer to "is this coach any good?".

> Before B1/B2 (and absolutely before anything resembling AVOID-1): structured
> founder decision required, per BUILD OPERATING MODEL. B2 in particular changes
> the weekly-only cadence and must be confirmed, not assumed.
