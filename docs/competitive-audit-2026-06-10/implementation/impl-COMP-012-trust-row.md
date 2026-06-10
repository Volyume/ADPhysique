# impl-COMP-012 — Trust row: "Works fully offline · Your data exports anytime · No ads"

> Blueprint for COMP-012 (approved Tier 3 quick win, effort 1 — copy).
> Round-2 implementation research, 2026-06-10. No code changes in this pass.
> Charter: `impl-00-shared-brief.md`. Seed: `../competitive-audit-03-master-proposals.md` (COMP-012).

---

## 0. THE HONESTY AUDIT FIRST — what is actually true

The approved proposal's draft wording was *"Works fully offline · Your data
exports anytime · No ads, no trackers"*. Claim-by-claim against the code:

| Claim | Verdict | Evidence |
|---|---|---|
| **Works fully offline** | **TRUE** | Offline-first is a locked architecture rule (CLAUDE.md); local DB is source of truth; bundled food DB makes even nutrition logging offline — a category outlier no major nutrition app matches (`../competitive-audit-01-performance-reliability-research.md` §4). Caveats (sync, new-barcode lookups need network) are the same caveats Hevy carries while claiming the identical phrase. |
| **Your data exports anytime** | **TRUE** | `src/screens/SettingsDataScreen.js`: CSV export of the workout log (`buildWorkoutCSV`), whole-database JSON backup + restore (`src/lib/dataBackup.js`), and the existing footer copy "Your data is always yours. Export or back up any time, no account required." Plus "Download my data" CSV bundle as a GDPR Art. 20 right (`docs/PRIVACY_CONSENT_LOCKED.md`). |
| **No ads** | **TRUE** | No ad SDK in `package.json` (verified: no AdMob/Meta/ad-network packages), no ad surfaces anywhere in `src/`. |
| **No trackers** | **NOT TRUE AS WORDED — do not ship** | The app ships `@sentry/react-native ~7.2.0` (`package.json` line 49), initialised in `src/lib/sentry.js`. Exodus Privacy formally classifies Sentry as a **tracker** (crash-reporting category, code signature `io.sentry`): [εxodus tracker profile 447](https://reports.exodus-privacy.eu.org/en/trackers/447/). Anyone running the APK through εxodus — exactly the audience a "no trackers" claim targets — publicly falsifies the claim in one scan. There is also first-party allowlisted telemetry (`src/lib/telemetry/transport.js`, opt-out at Settings → Privacy → "Share usage data") which the Play data-safety form already declares as "App interactions: collected". A listing that says "no trackers" beside a data-safety form declaring analytics collection is a user-trust and Play-policy contradiction. |

**The strongest TRUE claim set** (each independently verifiable):

- *No ads* — true, structural.
- *Your data is never sold* — true and **locked**: `PRIVACY_CONSENT_LOCKED.md`
  Article 9 screen copy already promises "Never sell it. Never share it with
  advertisers. Never use it to train a public AI model." CCPA row: "Sale of
  personal information: never."
- *No ad trackers / never shared with advertisers* — true: no ad network, no
  cross-app tracking, no IDFA/ad-ID use; the (deferred) Apple privacy label
  correctly answers "Data Used to Track You: None" under Apple's definition.

So the honest row drops "no trackers" and replaces it with the data-selling
claim, which is *stronger* with privacy-literate users anyway: "no trackers"
is a technical claim a scanner can dispute; "your data is never sold" is a
business-model claim only Volyume can break, and it is already locked policy.

**Consistency defects found while auditing (mention, not fixed here):**

1. `docs/APP_STORE_CONNECT_LISTING.md` (iOS, deferred) privacy-label section
   lists "Crash data or performance data sent off-device" under **Data Not
   Collected** — contradicted by Sentry. Must be corrected before any iOS
   submission.
2. `docs/PRIVACY_CONSENT_LOCKED.md` names **RevenueCat** as a sub-processor,
   but the build uses Google Play Billing directly (`src/lib/payments/playBilling.js`
   header: RevenueCat was considered and not chosen). The public privacy
   policy should not name a processor that never receives data.
3. The Play data-safety note in `PLAY_STORE_LISTING.md` already flags that
   `setSentryUser` attaches the user's email to crash reports
   (`src/lib/sentry.js` lines 125–137). Claims in this blueprint are worded
   to stay true either way, but switching to id-only would let future copy go
   further. Founder's call; flagged, not changed.

---

## 1. Best-in-market bar

1. **MacroFactor — the single best.** Ties the claim to the *mechanism* that
   makes it credible: "We will never serve ads or use ad networks to track
   you"; "We Don't Sell Your Personal Data"; "No Cross-Behavioral
   Advertising… We are a premium app, and we do not need to engage in such
   practices" ([privacy notice](https://macrofactor.com/privacy/),
   [data-protection page](https://macrofactorapp.com/app-personal-data-protection-information/)).
   The business model *is* the proof: you pay, so you are not the product.
   Round 1 already identified MacroFactor's "honest hard paywall" as the
   category's trust benchmark (`../competitive-audit-01-monetisation-research.md` §2).
2. **FitNotes** — a decade of reputation built on visible data ownership:
   "You are not required to register an account… all workout data you record
   within the application is stored locally on your mobile device"
   ([fitnotesapp.com/privacy](http://www.fitnotesapp.com/privacy/), retrieved
   via search extract — direct fetch blocked 403); "Free to use and no ads -
   ever!" ([fitnotesapp.com](http://www.fitnotesapp.com/)). The privacy page
   doubles as a reliability claim (round-1 research §4).
3. **Hevy** — markets the exact offline phrase: "works fully offline and
   syncs your data when you reconnect… essential for gym use since many gyms
   have poor WiFi" ([hevyapp.com/features](https://www.hevyapp.com/features/)).
   Proof that "works fully offline" is shippable wording with sync caveats.
4. **Signal** — the canonical negative-list formula: "There are no ads, no
   affiliate marketers, and no creepy tracking in Signal"
   ([signal.org](https://signal.org/)). Three short negations, no jargon.
5. **Proton** — "Privacy by default"; no ads, does not sell your data
   ([proton.me](https://proton.me/)). Shows the claim working as a *brand
   position*, not a feature bullet.

**The shared pattern:** (a) verifiable negations in lists of three, (b) the
credibility mechanism stated or implied (local storage / premium model),
(c) plain words — no "military-grade", no "privacy-first" vagueness.

## 2. What fails

- **Over-claiming that scanners falsify.** "No trackers" with a Sentry SDK in
  the APK is one εxodus report away from a Reddit/privacy-community shaming
  thread — the precise inversion of the intended effect. (Exodus classifies
  crash reporters as trackers by design:
  [tracker profile](https://reports.exodus-privacy.eu.org/en/trackers/447/).)
- **Relying on the store privacy label to carry the message.** CMU research:
  privacy labels sit so far below the fold that users rarely see or use them
  ([CyLab, 2022](https://www.cylab.cmu.edu/news/2022/07/25-ios-privacy-labels-miss-mark.html));
  industry analysis agrees labels barely move listing conversion because most
  installs never reach that section
  ([AppMySite](https://blog.appmysite.com/nutrition-labels-on-app-store-how-is-apples-privacy-policy-changing/)).
  Conclusion: the claim must live in the description copy and in the app's
  own first screen, where it is actually read — the label only needs to *not
  contradict* it.
- **Trust copy as decoration.** Vague badges ("100% secure") read as
  marketing fluff and are ignored; specific, checkable statements ("export
  anytime, no account required") do the work. Paywall research finds concrete
  reassurance ("Cancel anytime", clear renewal terms) lifts conversion by
  reducing perceived lock-in ([Apphud paywall guide](https://apphud.com/blog/design-high-converting-subscription-app-paywalls)).
- **Claim/data-safety contradiction.** Saying "no trackers" in the listing
  while the Play data-safety form declares analytics + crash collection is
  both a policy risk and a visible hypocrisy for the one user segment that
  reads both.

## 3. User psychology

- **Moment of need:** Welcome is the decision screen — the baseline names
  account-before-value as the highest-risk drop-off (`../competitive-audit-00-volyume-baseline.md`
  line 384). The trust row answers the three silent objections at exactly
  that moment: *will it work in my basement gym? am I locked in? what's the
  catch?* On the store listing, the same objections precede install.
- **Effort budget:** zero added taps; one line of reading. It *removes* a
  research task (checking reviews/privacy policy for the catch).
- **Habit loop:** none — this is a conversion/positioning surface, not an
  engagement feature. The reward is instant objection-resolution.
- **Emotional safety:** neutral copy; no urgency, no fear framing ("your
  other app is spying on you" is banned — state what Volyume does, never
  attack).
- **Word-of-mouth surface:** "it works with no signal and you can export
  everything, no account" is precisely the sentence basement-gym threads
  trade in (round-1 research §4: presence is rewarded "quietly through
  ratings and never-lost-a-workout word of mouth"). The paywall line "Pro is
  the only way Volyume makes money" is the tellable version of the
  MacroFactor stance.
- **Trust mechanics:** every clause is checkable inside the app within two
  taps (offline: airplane mode; export: Settings → Your data; no ads:
  everywhere). Claims that invite verification compound trust.

## 4. The Volyume implementation

### 4.1 Welcome screen placement — below both tier cards, above the sign-in link

`src/screens/WelcomeScreen.js` currently stacks: hero wordmark → Pro card →
Free card → "Already have an account? Sign in". The trust row goes **between
the Free card and the sign-in link**, as a single centred muted line.

Why there and not above the cards:

- The tier cards are the conversion object; anything above them pushes the
  Pro card down and competes with the hero (the wordmark was already dialled
  150→ down because it "overpowered the Pro card" — comment at line 153–155).
- The claims apply to **both** tiers, so the row belongs to the screen, not
  inside either card.
- Reading order becomes: what you get (cards) → why you can trust it (row) →
  act. It is the closer, hit at the exact moment of CTA hesitation.
- Crowding check: it adds one `fontSize.xs` line inside existing scroll
  padding; no card moves above the fold on a 6.1" baseline device.

**Layout spec:** one `View` row, centred, `gap: spacing.xs`,
three icon+text pairs separated by middle dots. Icons 12–13pt
`colors.textMuted`, text `fontSize.xs` `colors.textMuted` (matches
`trialNote` weight — present but ignorable, the Fitbod pattern).
Iconography from the already-loaded Ionicons set, reusing the app's existing
metaphors: `cloud-offline-outline` (offline), `download-outline` (export —
same icon as the SettingsDataScreen export row), `shield-checkmark-outline`
(no ads / never sold). Non-interactive in v1 (no nav stack surprises
pre-auth); 44pt floor not applicable to non-touch text.

**Accessibility:** single accessible element; icons
`importantForAccessibility="no"`; label reads the full sentence: "Works
fully offline. Your data exports anytime. No ads, and your data is never
sold." Respects reduce-motion by riding the existing `fadeIn` Animated.View
(no new animation).

**Offline/empty/edge states:** static copy — trivially offline, no states.

**Duplication fix on the same screen:** `FREE_BULLETS[0]` is "Unlimited
workout logging, fully offline". With the trust row present, "fully offline"
appears twice. Recommended: trim the bullet to "Unlimited workout logging"
and let the trust row carry offline for the whole app (the row's claim is
broader and better placed). One-line change, same PR.

### 4.2 Copy variants (house voice: plain, terse, honest, British)

- **Variant A (recommended):**
  `Works fully offline · Exports anytime · No ads, ever`
  Screen-reader/long form: "Works fully offline. Your data exports anytime.
  No ads, ever." Tightest; "ever" is the FitNotes echo and is structurally
  true (no ad SDK, premium model).
- **Variant B (data-selling explicit):**
  `Works fully offline · Your data exports anytime · Never sold to advertisers`
  Strongest privacy claim; slightly longer. "Never sold" alone is avoided
  because the app does sell subscriptions — always bind "sold" to *data*.
- **Variant C (two-line, mechanism stated):**
  `Works fully offline · Exports anytime · No ads`
  second line: `Volyume makes money one way: Pro. Your data is never sold.`
  The MacroFactor formula. Use this only if A/B feels thin; it costs a line
  of screen height.

Banned wordings: "no trackers" (falsifiable — §0), "no analytics" (false —
opt-out telemetry exists), "100% private", "military-grade", any competitor
attack.

### 4.3 Store listing rewrites

**Google Play (`docs/PLAY_STORE_LISTING.md`, ASO-optimised draft).** Insert a
short block after the PROGRESS section (keyword-bearing, scannable), and
align the old draft's PRIVATE BY DESIGN section to the same claim set:

```
YOUR DATA, PLAINLY
Works fully offline, food search included: log in a basement gym or on a
flight and it syncs when you reconnect. Export your workout log as a CSV or
back up everything to a file, anytime, no account required. No ads. Your
data is never sold or shared with advertisers.
```

And one sentence appended to the existing closing line: "Made in the UK.
Works in kg and stone. **No ads, and your data is never sold.**"

Notes: "food search included" is the category-outlier differentiator round 1
told us to lead with (offline *nutrition* is rare; offline lifting is
parity). Every sentence is checkable; nothing contradicts the data-safety
form (which correctly declares crash logs + optional analytics as collected,
not shared).

**App Store (`docs/APP_STORE_CONNECT_LISTING.md`, deferred iOS).** Same block
replaces the current PRIVATE BY DESIGN paragraph wording where it overlaps,
keeping its good lines ("No social feed, no public profiles"). **Required
fix before any iOS submission:** remove "Crash data or performance data sent
off-device" from the *Data Not Collected* list and declare Diagnostics
(crash + performance, not linked for advertising) — otherwise the label
contradicts both reality and Play's declaration (§0 defect 1).

### 4.4 Paywall trust line (links to COMP-007)

One muted line above the existing `legalRow` in `src/screens/PaywallScreen.js`
(and mirrored on `ProUpgradeScreen`):

> `No ads, and your data is never sold. Pro is the only way Volyume makes money.`

This is the MacroFactor stance in one sentence, sits beside the existing
cancel-anytime terms text (concrete reassurance is the documented
conversion lever — [Apphud](https://apphud.com/blog/design-high-converting-subscription-app-paywalls)),
and gives COMP-007's social-proof block an honesty anchor. Coordinate with
COMP-007's layout so the footer stays one line; if COMP-007's blueprint
already claims this slot, the line merges into its footer rather than
stacking.

### 4.5 Settings "learn more" anchor — reuse, don't build

The claims need a checkable home, and it already exists:
`SettingsDataScreen` (export/backup + "Your data is always yours" note) and
`SettingsPrivacyScreen` (consent, OFF sharing toggle, "Share usage data"
opt-out, privacy policy link). No new screen. Optional v1.1 nicety: retitle
the privacy policy row sub-line to "Your data, plainly" and add one summary
sentence above it repeating the claim set. The Welcome row stays
non-tappable; the store listing's claims point implicitly at Settings, where
every claim can be exercised. This honours the charter's streamlining rule —
zero new surfaces.

## 5. Whole-package integration

- **COMP-006 (publish methodology)** also wants a Welcome line. Welcome gets
  **one** added row total: COMP-012's. COMP-006's identity line ("Every
  change has a reason…") lands on coach surfaces and the methodology page;
  if the founder wants it on Welcome too, it replaces the tagline slot, not
  a second appended row. Two stacked trust rows read as protesting too much.
- **COMP-007 (paywall social proof):** §4.4 line shares the paywall footer;
  one line, jointly owned.
- **COMP-009 (data-loss guards):** the export/backup claim is only as good
  as restore reliability; COMP-009's pre-migration snapshots make the
  marketing claim safer over time. No copy dependency.
- **COMP-030 (quiz-before-account):** if Welcome is later restructured, the
  trust row moves with the tier cards (it belongs to the moment of tier
  choice, wherever that lives).
- **ED/wellbeing flags:** not applicable — static, emotion-neutral copy on
  pre-auth and store surfaces.
- **Streamlining effect:** net zero new surfaces; one line added, one
  duplicated phrase removed from FREE_BULLETS.

## 6. Retention & word-of-mouth mechanics

This feeds the **acquisition** loop, not retention: listing conversion →
install → Welcome reinforcement → the claims are then *experienced*
(offline session in a dead-signal gym; export that actually works), which
converts into the category's documented word-of-mouth currency ("never lost
a workout", "no account needed to leave") — round-1 research §4. The
tellable sentence: **"It works with no signal, you can export everything,
and they don't sell your data — that's the whole catch."**

## 7. Beating the benchmark

MacroFactor states the honest claim set but only on its website and policy
pages; Hevy states offline but not data-ownership; FitNotes owns
data-ownership but is free-tier-only with no coaching product to fund.
Volyume is the only app in the cohort that can truthfully combine all three
claims **and** the rare one (offline *food* logging) on the decision screen
itself, with every claim exercisable in-app within two taps. Honest scope
("no ads, never sold" rather than the falsifiable "no trackers") makes the
row armour rather than a liability when the privacy-literate audit it —
which, per εxodus, they will.

## 8. Measurement

1. **Play listing conversion** — run the description change as a Play
   Console Store Listing Experiment (the listing doc already plans
   experiments for the title); acquisition conversion is measured by Google,
   no telemetry needed.
2. **Welcome → sign-up start rate** — if a welcome/auth funnel event exists
   in the allowlist, compare pre/post; if not, propose `welcome_cta_tap`
   for the allowlist (flag: allowlist change needs founder sign-off, same
   as COMP-025's extension).
3. **Paywall conversion delta** — existing paywall telemetry (migration
   032) before/after the trust line lands with COMP-007.
4. **Qualitative:** count of store reviews mentioning offline / export /
   no-ads in the 90 days post-change (manual, monthly).

## 9. Build notes

- **Files:** `src/screens/WelcomeScreen.js` (one row + styles, ~20 lines;
  trim FREE_BULLETS[0]), `docs/PLAY_STORE_LISTING.md` (block in §full
  description), `docs/APP_STORE_CONNECT_LISTING.md` (PRIVATE BY DESIGN
  alignment + privacy-label correction), `src/screens/PaywallScreen.js` +
  `ProUpgradeScreen.js` (one footer line, coordinate with COMP-007).
- **No DB, no engine, no billing logic.** The paywall edit is copy-only but
  sits in a billing-adjacent file — per CLAUDE.md, state the exact change
  and wait for explicit "proceed" before touching it.
- **Separate follow-ups (not this task):** RevenueCat removal from the
  privacy-policy sub-processor list; founder decision on Sentry
  `setUser` id-only (would strengthen future claims); iOS privacy-label fix
  rides any future iOS submission.
- **Effort sanity-check:** approved score 1 (copy) — holds. Welcome row +
  doc edits ≈ half a day including copy review; paywall line rides
  COMP-007's PR.
- **Risks:** (1) over-claiming — mitigated by §0's claim table; any future
  SDK addition must re-run that table before the copy survives a release;
  (2) claim drift — if telemetry ever loses its opt-out or a new
  sub-processor lands, the listing copy must be revisited in the same PR
  (add a checklist line to the sub-processor procedure in
  `PRIVACY_CONSENT_LOCKED.md`); (3) Welcome crowding if COMP-006 also adds
  a line — resolved by the one-row rule in §5.

---

*Sources accessed 2026-06-10. FitNotes privacy-page wording obtained via
search extract (direct fetch returned 403); Signal/Proton/MacroFactor/Hevy
wording via search extracts of their live pages; spot-verify exact strings
before quoting them externally. In-repo evidence verified against source
files on branch `claude/main-branch-content-update-dcqicf` lineage.*
