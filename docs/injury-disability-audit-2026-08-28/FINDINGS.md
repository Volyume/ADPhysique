# CC33 — Consolidated audit verdict (S3 lead synthesis, 2026-08-28)

Evidence basis: four banked lanes — S1-SURFACE-INVENTORY-BANKED.md (R1),
S1-RESEARCH-EVIDENCE-BANKED.md (R2), S2-T1-GENERATION-TRACE.md (27
findings, lead-verified), S2-T2-LIVE-TRACE.md (33 findings,
lead-verified). 60 findings total; every claim below carries its finding
id, and the banked files carry the file:line evidence. Judged against
`docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md` §11–§27 as the
intent record and the founder's two CC33 directives as the goal.

---

## 1. Verdict against the founder's five beliefs

The founder's stated beliefs were the hypotheses under adversarial test.
All five are CONFIRMED, with evidence; integration is worse than believed.

**1. "Not easy to find" — CONFIRMED.** Seven entry points exist but the
home surface ("How you train") sits three taps deep in Settings
(SettingsScreen.js:34), and the app has ZERO capability presence at the
moments the need actually shows: Home in its ordinary state (T1-14/T2-31
— the constraint line is suppressed whenever the default headline fires),
the coach's weekly output (T2-14 — no CONSTRAINED branch exists),
and the workout summary (T2-07 — 2,489 lines, zero capability matches).
The in-workout capture flow that should catch "this movement is a problem
today" navigates to a cold settings screen with no preselect (T2-11). A
user has to already know the feature exists and go looking for it.

**2. "Not easily understandable" — CONFIRMED.** The capability lane and
the preference lane use the same vocabulary for opposite meanings
("set aside": a taste vs an inability — T2-33, T1-19), a capability
exclusion is explained as a preference ("You asked not to be suggested
this." — T1-08), and the one decision the user is asked to make
(Apply/Decline) is a two-button alert whose preview over-promises
substitutions that may actually be omissions (T2-05), cannot be revisited
(T2-23), and whose consequences at promotion are never explained (T2-01).

**3. "Not easy to use" — CONFIRMED.** No per-line control at the diff
(T2-23 vs §14's "as a whole or per line"); no surface anywhere to revisit
an undecided or declined choice (T2-23); the flare "Start this again" path
skips the proposal entirely (T1-05); rules arriving by sync never propose
(T1-06); the mid-workout flow drops the user at the top of a settings
screen with an orphaned swap sheet behind them (T2-11).

**4. "Not explanatory enough" — CONFIRMED.** The plan never explains that
a restriction shaped it (T1-16 — buildWhyThis has no capability key); swap
sheets silently narrow with no count or reason (T2-08); the durable record
of what a restriction did to each session is rendered by no screen
(T2-22); the one-limb user's suppressed per-side prompt is never explained
(T2-20); reintroduction is one toast shown only if the user happens to be
on the settings screen at that instant (T2-25); on most constrained weeks
the coach says nothing about training at all (T2-14).

**5. "Integration possibly imperfect" — CONFIRMED, and worse than
believed.** Four S1 findings — settings stored and honoured nowhere on
whole halves of the lifecycle: constrained blocks are seeded volume
targets their pool cannot deliver, with the §15 honesty line never built
(T1-01); a permanent restriction meeting an already-installed plan
changes nothing, ever (T1-03); "This is how I train now" instantly
reverts every substituted slot to the excluded exercise (T2-01); an
exercise the user explicitly allowed is still substituted out, excused,
and volume-held (T2-02). Plus fail-open postures on the exact surfaces
that must fail safe (T2-19 coach apply, T2-09 swaps, T1-22 free starter).

## 2. What is sound (so the rebuild does not throw it away)

The CC25 engine core is real and holds: the 11-axis demand ontology and
resolver behave deterministically; UNKNOWN fails closed at generation,
picker and install; the AWAITING state is honour-fail-safe everywhere
(T2-24); the reintroduction ramp genuinely reaches live targets (T2-25);
the learning-eligibility shield fires (T1 closed list); serve-time has
exactly one entry point and every start path funnels through it (T2
column E); the notifications lane is clean by enumeration (T2-29); family
plans and the Training considerations directory are live; consent and
erasure reach the capability tables. Migrations 145–149 + 151 are
confirmed live in production (record + read-only column check; the
contrary code comments are stale — see the T2 bank's lead verification).
The defect is not the engine. It is everything between the engine and the
person.

## 3. The six structural causes

Sixty findings reduce to six causes. This is why the feature reads as "a
collection of settings": each cause is a place where one half of a
designed mechanism was built and the other half was not.

**A. The episode lane was built end-to-end; the baseline lane is hollow
past generation.** Episodes get proposal, apply/decline, serve-time
substitution, the strip notice, effects records, adherence excusal, coach
holds and reintroduction. Baseline rules get generation and picker
filtering — and nothing else: no existing-plan handling (T1-03), no
in-session presence even when the plan contradicts them (T2-21's premise
fails), no coaching consultation at all (T2 column F: physicalConstraint
is episode-only — a permanently-disabled user gets zero constraint-aware
coaching), and promotion demotes a working episode into this hollow lane
(T2-01). The app is currently better at working around a sprained wrist
than at serving a permanently disabled user — the exact inversion of the
campaign's purpose.

**B. Honour is enforced at two chokepoints and leaks on every path that
bypasses them.** Generation and the picker filter correctly; but raw
library reaches the engine on two of six division paths (T1-02),
"Similar exercises" ranks the raw library (T2-10), plan reactivation
reuses rows verbatim (T1-11), block review never asks the senior question
(T1-10), the block slope is computed over unfiltered sets so the
restriction manufactures a regression the coach blames on the programme
(T2-12), excusal counts only omissions so substitution-shaped weeks can
never be CONSTRAINED (T2-13), widget and partner denominators are raw
(T2-16), Today's session count is raw (T1-17), custom exercises fall
through the unknown-conflict chain into a false receipt (T1-27), and the
substitute inherits the excluded exercise's load prescription (T2-03).

**C. The visibility layer was specified (§14–§18) and roughly one fifth
of it was built.** Written-but-rendered-nowhere: session_constraint_
effects (T2-22), blockedSlots/near-misses on five of six generation
entries (T1-12). Specified-but-never-built: the post-workout quiet line
(T2-07), the plan-view conflict/substitution markers (T2-32), the
why-this capability line (T1-16), the session-level "unusually reduced"
signal (T2-06), the Today AWAITING prompt (T1-15/T2-24), laterality
naming outside the logger (T1-24/T2-20). Built-but-suppressed: the Home
line in the ordinary state (T1-14/T2-31). Actively wrong: the
receipt/commit contradiction — "kept as it is" rendered beside an empty
slot (T1-07), travel mode silently dropping slots (T1-23), total
capability block surfacing as an engine failure with a retry loop
(T1-13), and the session-length cross-reference that does nothing until
the next generation (T2-27).

**D. Failure postures are inconsistent, and the open ones sit on the
worst surfaces.** Generation fails safe (holds, honestly). Swaps fail
open silently and blame the wrong lane when they mention it at all
(T2-09); the coach's Apply-time hold re-check discards every hold on a
read failure and applies the increase body-wide (T2-19); the free starter
falls back to the unfiltered recommendation (T1-22); pre-flight is
missing on three generation-adjacent paths (T1-21); and the same field is
read fail-safe in one module and fail-open in another (T1-09).

**E. The user's own word is second-class.** Their explicit allowance is
ignored by every consumer except the picker (T2-02); their manual
"Add anyway" is silently overridden (T2-04); their mid-workout report
lands nowhere (T2-11); their "Fine" answer to the one question the app
asks changes nothing (T2-17); the app then tells them they said things
they never said — muscle lists derived from library joins attributed as
their own words (T2-18); the promised §25 "just hold my plan" escape
valve does not exist (T2-26); and the Apply/Decline word they DID give is
one-shot, un-revisitable, and mis-previewed (T2-23, T2-05).

**F. Two lanes, one vocabulary — and inverted strength.** Preference
wording on capability surfaces throughout (T1-08, T1-19, T2-33); the
lanes never cross-reference (T1-20); capability-motivated swaps teach the
preference engine (T2-28); and the clinician-sourced rule — the strongest
restriction in the model — is distinct at the picker, invisible at
generation and block review, and silently overridable at the diff, making
it the weakest exactly where it should be firmest (T1-26, T1-04).

## 4. Full roll-up (finding → cause → S4 wave)

Severity: S1 not honoured · S2 inconsistent · S3 invisible · S4
unexplained · S5 incoherent. Wave key in DESIGN-RULING.md §6.

| id | Sev | Cause | One line | Wave |
|---|---|---|---|---|
| T1-01 | S1 | A | Capability ceilings never enforced on volume seeding; §15 line absent | W1 |
| T1-03 | S1 | A | Baseline rule + installed plan: nothing happens, ever | W1 |
| T2-01 | S1 | A | Promotion reverts every substituted slot, silently | W1 |
| T2-02 | S1 | E | Allowances consulted by picker only; 7 blind consumers | W1 |
| T1-07 | S1 | C | "Kept as it is" rendered beside the emptied slot | W2 |
| T1-11 | S1 | B | Reactivation reuses routine rows verbatim, no capability read | W5 |
| T1-27 | S1 | B | Custom exercises: unknown-conflict → dropped with false receipt | W5 |
| T1-02 | S1 | B | Raw library into engine on 2 of 6 division paths | W5 |
| T1-04 | S2 | F | Clinician rule refuses picker override, diff decline overrides silently | W4 |
| T1-05 | S2 | E | Flare restart never re-proposes | W4 |
| T1-06 | S2 | E | Synced-in rules never propose on arrival | W4 |
| T1-09 | S2 | D | Same field fail-safe in planAutoGen, fail-open in blockAdvisor | W1 |
| T1-10 | S2 | B | Block review never asks the senior question; reviewed verdict wins | W5 |
| T1-21 | S2 | D | Pre-flight missing on starter/travel/dry-run paths | W1 |
| T1-22 | S2 | D | Free starter falls back to unfiltered recommendation | W1 |
| T2-03 | S2 | B | Substitute inherits excluded exercise's load prescription | W1 |
| T2-04 | S2 | E | Blank-session first-add substitutes over a manual "Add anyway" | W1 |
| T2-09 | S2 | D | Swaps fail open on read failure; notice names wrong lane | W1 |
| T2-10 | S2 | B | "Similar exercises" ranks raw library — only unmarked surface | W5 |
| T2-11 | S2 | E | "Note a temporary change" navigates cold, creates nothing | W4 |
| T2-12 | S2 | B | CONSTRAINED unreachable via regression; slope over unfiltered sets | W2 |
| T2-13 | S2 | B | Excusal counts omissions only; substituted weeks never CONSTRAINED | W2 |
| T2-19 | S2 | D | Apply-time hold catch discards holds; increase lands body-wide | W1 |
| T1-12 | S3 | C | blockedSlots/near-misses discarded on 5 of 6 entries | W3 |
| T1-14 | S3 | C | Home constraint line suppressed in ordinary state | W3 |
| T1-15 | S3 | C | §22 AWAITING prompt absent from Today | W3 |
| T1-17 | S3 | B | Today's card counts base rows; logger serves fewer | W3 |
| T1-18 | S3 | C | Plan/routine/manual screens render the base document | W3 |
| T1-23 | S3 | C | Travel mode silently drops filtered slots | W3 |
| T1-25 | S3 | A | Reintroduction inert in the normal case (chain from T1-01) | W2 |
| T2-06 | S3 | C | No session-level "unusually reduced" signal | W3 |
| T2-07 | S3 | C | Post-workout quiet line never built | W3 |
| T2-08 | S3 | C | Swap sheets silently narrowed; no count, reason or toggle | W3 |
| T2-14 | S3 | C | coachStory has no CONSTRAINED branch; holds render nothing | W2 |
| T2-20 | S3 | C | Per-side prompt suppressed without a word | W3 |
| T2-22 | S3 | C | Effects record rendered by no screen | W3 |
| T2-26 | S3 | E | §25 suspension absent everywhere | W5 |
| T2-27 | S3 | C | Session-length cross-reference is cosmetic | W4 |
| T2-30 | S3 | B | Home constraint effect deps miss synced arrivals | W4 |
| T2-31 | S3 | C | Pre-workout quiet line absent on ordinary Home (=T1-14) | W3 |
| T2-32 | S3 | C | Plan view shows conflicted/substituted slots as ordinary rows | W3 |
| T1-13 | S4 | C | Total block surfaces as engine failure + retry loop | W3 |
| T1-16 | S4 | C | buildWhyThis has no capability key | W3 |
| T1-24 | S4 | C | Side-carving never named outside the logger | W3 |
| T2-05 | S4 | E | Apply preview promises swaps that may be omissions | W4 |
| T2-15 | S4 | C | Adherence gate fires before CONSTRAINED; accusatory copy | W2 |
| T2-17 | S4 | E | Check-in "Fine" answer changes nothing | W2 |
| T2-23 | S4 | E | Apply/Decline one-shot, no per-line, no revisit | W4 |
| T2-28 | S4 | F | Capability swaps teach the preference engine; install writes no row | W4 |
| T1-08 | S5 | F | Capability exclusion explained as preference | W4 |
| T1-19 | S5 | F | Preference footnote on capability rows | W4 |
| T1-20 | S5 | F | Lanes never cross-reference | W4 |
| T1-26 | S5 | F | Clinician flag weakest where it should be firmest | W4 |
| T2-16 | S5 | B | Widget/partner mix effective numerator with raw denominator | W3 |
| T2-18 | S5 | E | Muscle lists attributed as the user's own words | W2 |
| T2-33 | S5 | F | "Set aside" shared across both lanes | W4 |
| T2-21 | fact | A | Baseline in-session invisibility correct ONLY once plan is baseline-true | W1 |
| T2-24 | part | C | AWAITING honour fail-safe (closed); Today visibility absent (open) | W3 |
| T2-25 | part | A | Ramp real (closed); copy one toast; block-boundary stamp gap (open) | W2 |
| T2-29 | none | — | Notifications lane clean by enumeration | — |
| — | S5 | F | Stale migration comments (database.js:2703, capabilityConstraints.js:9) | W4 |

## 5. Coverage note

Matrix coverage: columns A–H all traced (T1: A/B/C/G/H; T2: D/E/F +
lifecycle R8–R10). Rows R1–R10 traced across their live columns; R11
(consent/erasure lane) was verified in CC25's gate and re-confirmed only
at the store/export touchpoints this audit crossed (T2-22's reader list);
no regression observed, not re-audited in depth. The design ruling and
build plan are `DESIGN-RULING.md` in this folder; decisions register
entry D112.
