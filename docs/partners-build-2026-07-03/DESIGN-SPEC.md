# PARTNERS: Design Specification (Step B)
**Date:** 2026-07-03. **Author:** Fable (orchestrator). **Status:** FIXED. Build agents implement this spec verbatim; deviations require the orchestrator, not agent judgement.
**Quality bar:** the free-trial screen standard. Premium means every detail considered: token-pure, generous space, one hero moment per screen, calm always. Never flashy, never gamified, never status-signalling.
**Voice:** British English. No em dash anywhere. No exclamation marks. No guilt, no urgency, no counters-as-pressure. Coach voice: calm, plain, no shame (COACHING_VOICE_SYNTHESIS_LOCKED).

## B0. Vocabulary (the only building blocks allowed)
- Tokens: `colors, spacing, radius, fontSize, fontWeight, type, shadow, alpha, withAlpha, iconSize, hitSlop, stateColors` from `src/styles/theme.js`. ZERO hard-coded colours, sizes, or durations.
- Motion: `motion.micro/state/enter/exit/hero/sheet`, easings `motion.easeStandard/easeDecelerate` (and `cssEase` twins), springs `motion.springs.press/release/settle`. `springs.expressive` is permitted in EXACTLY one place, named below. Reduce Motion: every new animation must flatten (opacity-only or none) under the app's existing reduced-motion handling; match how existing screens consume `applyAccessibility`/reduced-motion prefs.
- Components to reuse, not reinvent: `BackHeader`, `Card`, `Toast`, `AppAlert`, `BottomSheet` idiom, `RollingNumber` (E15), existing lock-style affordances from T6, `NavRow` idiom on YouScreen, `NavTile` on the Progress Explore grid.

## B1. Information architecture (unchanged routes)
One destination: the existing `Partner` route, screen title **Partners**. No new stack screens. The invite journey is a full-screen `Modal` owned by PartnerScreen. Entries: You-tab row, ConsistencyScreen PartnerRow, Progress Explore tile (promoted), post-workout beat (unchanged). NO Home banner. Cross-tab entries use the sanctioned `navigateCrossTab`.

## B2. PartnerScreen: connected state
Anatomy, top to bottom:
1. `BackHeader` title "Partners".
2. **One PairCard per active pair**, stacked vertically, ordered by paired-at date ascending. Never ordered by activity, streak, or anything performance-shaped. Each card is a private world: no cross-card summaries, no totals row, no "most consistent" anything, no count badge. (This is the pair-isolation rule made visible.)
3. If Pro and fewer than 3 active pairs: a quiet text-row affordance under the cards: "Invite another partner" (`type.body`, `colors.primary`, chevron; NOT a filled button). Free tier at its cap of 1: nothing. No upsell here; upsell belongs to the existing differential surfaces.
4. Pending-invite card (if a mint is outstanding): see B5.

### The PairCard (the centrepiece)
- Container: `Card` with `radius.lg`, `spacing.lg` padding, `shadow` per Card default.
- Header row: partner first name (`type.title`), overflow ellipsis button (44pt target, `hitSlop`) opening the Manage sheet (B7).
- **Hero: the shared streak.** "`N` weeks running, together" where N uses `RollingNumber` (E15) and `type.display` scale; sub-line `type.caption` `colors.textSecondary`: "Counted in weeks you both trained against your own plans. Resting never breaks it." When streak is 0 or 1: no hero number; instead one calm line: "Your first shared week is under way." The streak increment animation (RollingNumber tick on a NEW week landing while the screen is open) is the ONE sanctioned use of `motion.springs.expressive`. Reduce Motion: number updates instantly, no roll.
- **Two person-rows** (stacked, NOT side-by-side, NOT arcs, NOT bars; deliberate anti-juxtaposition):
  - Row = small dot icon + name + calm state phrase, `type.body`.
  - "You: trained three of four this week" / "Sam: trained twice this week" (reuse `ticksLabel`) / "Sam: resting this week".
  - Resting renders rest-positive: the dot uses the amber-calm treatment (`stateColors` amber per the deload banner Class C precedent), NEVER red/warning, and the phrase is exactly "resting this week". No tick-versus-tick alignment; the two rows are ordinary list lines.
- **Cheer affordance:** one pill button, right-aligned under the person-rows. Default: "Send a cheer" (icon `hand-left`). After today's cheer: disabled state, label "Sent today", `colors.textSecondary`. Press animation: `springs.press` in, `springs.release` out, `motion.micro` opacity dip. One per local day; the DB constraint is the limiter; UI simply reflects it.
- **Moment slot** (B6): at most ONE moment card per pair per local day, rendered inside the PairCard beneath the person-rows, above the cheer row.
- **Shared block chip** (existing mechanic, restyled): if a shared block is proposed/adopted, one chip row: block name in `type.caption` inside a `radius.pill` chip, `withAlpha(colors.primary, alpha.faint)` background. Tap opens the existing propose/adopt flow.

## B3. PartnerScreen: empty state (never paired, or all ended)
One screen-height composition, generous `spacing.xl` rhythm:
1. Icon `people-outline` at `iconSize.hero` in `withAlpha(colors.primary, alpha.faint)` circle.
2. `type.title`: "Train with a partner".
3. `type.body`, two sentences, exactly: "Training sticks better when someone you trust is in it with you. One partner, one calm weekly signal each way."
4. **The privacy receipt** (B4) rendered in full. Pre-pairing, the receipt IS the pitch.
5. Primary button: "Invite someone you train with" (opens B5 journey). Secondary text-row: "I have a code" (opens the code-entry field, existing redeem path).
No social-proof counters, no illustrations of other people, no urgency line, nothing animated on a loop.

## B4. The privacy receipt (the brand's hero moment)
A single component `PartnerPrivacyReceipt` used in BOTH the empty state and invite Beat 2. Screenshot-worthy by typesetting, not decoration:
- Heading, `type.title`: "What crosses, and what never does".
- Two columns under two column-headers (`type.caption`, `letterSpacing` wide, uppercase): "THEY WILL SEE" / "THEY NEVER SEE". A `StyleSheet.hairlineWidth` vertical rule between columns, `withAlpha(colors.border, alpha.strong)`.
- Left column (each line `type.body`, generous `spacing.md` between):
  - "Whether you trained this week, against your own plan"
  - "Your shared streak, counted in weeks"
  - "A resting week, shown simply as resting"
  - "One cheer a day, if you send it"
  - "The name of a block you choose to share"
- Right column (`type.body`, `colors.textSecondary`, each line prefixed with a small `lock-closed-outline` icon at `iconSize.sm`):
  - "Your weights, sets or reps"
  - "Your body weight or measurements"
  - "Your food or diary"
  - "Anything you tell the coach"
  - "Your location"
- Footer, `type.caption` `colors.textSecondary`: "Either of you can end this at any time. Everything shared is deleted."
- Entry animation: single fade-and-rise, `motion.hero` with `easeDecelerate`, once per mount. Reduce Motion: appears static.
- On narrow widths the columns stack (see column, then never column), never truncate.

## B5. The invite journey (full-screen Modal, three beats)
Full-screen `Modal` matching the app's modal idiom. Three beats, advanced by one primary button each; three quiet progress dots (`circle(6)`, active `colors.primary`, inactive `withAlpha(colors.primary, alpha.faint)`). Beat transitions: `motion.enter`/`motion.exit` with `easeStandard`, content crossfade+slide 16pt. Reduce Motion: crossfade only. A close (X) in the header at every beat; closing mid-journey mints nothing.
- **Beat 1, "A partner, not an audience".** `type.title` heading exactly that. Three `type.body` lines: "One person you already know and trust." "No feed, no followers, no comparing numbers." "Just whether you each showed up for your own plan." Button: "Continue".
- **Beat 2, the receipt as consent.** `PartnerPrivacyReceipt` in full. Above the button, `type.caption`: "Pairing means you both agree to share this, and only this. Notice v1." Button: "Agree and get my code". (This screen is the recorded consent notice; the version constant lives in code per Step A.)
- **Beat 3, the code.** The minted code centred in `type.display` with wide `letterSpacing`; sub-line `type.caption`: "One person can use this code. It expires in seven days." (Adjust wording to the actual expiry the code has; read it from the lib, never hard-code a different number.) Share channels: the existing three buttons (Text, WhatsApp, Email) plus "More options" (share sheet), ALL reusing the single minted code per Step A. After a share fires, dismiss to the pending state.
- **Pending state** (on PartnerScreen): a slim card: "Invitation sent. Waiting for your partner." + `type.caption` expiry line + text-row "Cancel invitation" (confirm via existing AppAlert pattern). Nothing pulses.
- Telemetry: call `trackInviteJourneyStep(1|2|3)` on beat mount and `trackPartnerSurfaceView(source)` on screen mount with the arriving source param (entries pass it).

## B6. Milestone moments
**Engine contract (C3 builds `src/lib/partners/moments.js`; C2 consumes it):**
- `getVisibleMoments(userId) -> Promise<Array<Moment>>` where `Moment = { id, pairId, kind: 'streak_week_kept' | 'completed_block' | 'hit_pb', line: string, atMs: number }`. The engine returns AT MOST ONE moment per pair per local day, already suppression-checked, priority `streak_week_kept > completed_block > hit_pb`.
- `markMomentSeen(id) -> Promise<void>` (local persistence; a seen moment never returns).
- Derivation is LOCAL + already-synced pair data only: `streak_week_kept` from the shared streak advancing (weeks >= 2); `completed_block` and `hit_pb` from the two weekly booleans on the partner's week signal (Step A columns). No new sync surface, no push notifications, weekly cadence by construction.
- Frequency caps (ED-owner mandate, applies to NON-flagged recipients too): max 1 rendered moment per pair per day (engine-enforced); `hit_pb` additionally capped at 2 surfaced per pair per rolling 7 days; a moment older than 7 days is never surfaced.
- Suppression, fail-closed, both directions: inbound rendering suppressed when the recipient has an open ED flag, SCOFF >= 2, calm mode, or a FAILED flag/wellbeing read (the repo's standard raw AsyncStorage + `read_failed` sentinel pattern, exactly as in useWeeklyStreak.js). Outbound: Step A already forces the booleans false under the sender's ED freeze.
- Copy (the `line` field, exact strings): streak: "Another week you both showed up." block: "`Name` finished their training block." pb: "`Name` set a new personal best." First names only, no numbers, no exercise names, full stop endings.
**Rendering (C2):** the moment card sits inside the PairCard: `withAlpha(colors.primary, alpha.faint)` background, `radius.md`, the line in `type.body`, a small cheer affordance on the right that consumes the day's single cheer (disabled + "Sent today" if already used). Entry: fade-rise `motion.state`; Reduce Motion static. Seen on unmount or cheer, via `markMomentSeen`.
**Post-workout beat (C3):** unchanged gating (`!readOnly && !calmSuppressed && tier === 'pro'`, active pair). Additive line only: when `getVisibleMoments` has a moment for that pair, the beat shows the moment line with the inline cheer instead of the generic tick line. No new beat for unpaired users.

## B7. Manage sheet and Block UI (C2)
Ellipsis on PairCard opens a bottom sheet (existing BottomSheet idiom): rows "Suggest a training block", "End partnership", "Block `Name`". Block row `colors.danger` text. Block confirm via AppAlert, copy: title "Block `Name`", body "This ends the partnership, deletes everything you shared, and stops them pairing with you again. They will not be told." Buttons "Block" (danger) / "Cancel". Wires the EXISTING `blockPartner` primitive. Unpair keeps its existing confirm + deletion promise copy.

## B8. Placement spine (C1)
- **You tab:** a `NavRow` (existing idiom) in the main list, after the coaching rows, before settings: icon `people-outline`, label "Partners", sub-line from live pair state: reuse PartnerRow's line derivation (extract that tiny derivation into `src/lib/partners/signals.js` if not already exported; do not duplicate strings). Free tier: same row with the T6 Pro-lock affordance (matches every other locked row). Navigates via `navigateCrossTab` to `Partner`.
- **ConsistencyScreen:** render the existing `PartnerRow` exactly where its header comment intends, wired `onOpen` to `navigateCrossTab('Partner')`. Pass `userId`/`tier` per its props. Do not restyle it beyond token compliance.
- **Progress Explore grid:** move the Partner `NavTile` from last to directly after the insight-stack section; label "Partners"; keep the existing `pro` lock prop. If NavTile supports a sub-line, use "One partner, one calm weekly signal"; if not, label only, no component surgery.
- Each entry calls `trackPartnerSurfaceView('you_row' | 'consistency_row' | 'progress_tile')` on press.
- NOTHING added to HomeScreen. The one-banner invariant stands.

## B9. Accessibility
Every touchable: `accessibilityRole` + descriptive `accessibilityLabel` (existing lint rule enforces). The receipt columns read in DOM order under TalkBack ("They will see... They never see..."). RollingNumber hero gets `accessibilityLabel="N weeks running together"`. Cheer disabled state announces "Cheer sent today". Journey beats announce as pages. All new type respects `allowFontScaling` defaults; no fixed-height text containers.

## B10. File ownership (collision control)
- C1: `YouScreen.js`, `ConsistencyScreen.js`, `AnalyticsScreen.js` ONLY.
- C2: `PartnerScreen.js`, new `src/components/PartnerPrivacyReceipt.js`, `usePartners` hook (list-of-pairs extension), `RootNavigator.js` only if strictly unavoidable.
- C3: `src/lib/partners/moments.js` (+ tests), `WorkoutSummaryScreen.js` (beat lines only).
- Nobody edits: the five ED-locked engine files, `partnerBeats.js` push copy, notification scheduler, HomeScreen.
