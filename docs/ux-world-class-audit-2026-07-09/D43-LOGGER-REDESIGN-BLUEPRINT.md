# D43 — Workout-logger redesign blueprint (3/10 → 10/10)

**Status: AWAITING FOUNDER APPROVAL (authored 2026-07-11 by the lead from
the full teardown; research evidence in the session log). No build slot
runs until the founder approves this document. Approval unlocks the
staged slots in §7, worked in order per D47.**

Founder order (D43 + amendment): the logger is 3/10 and must become
10/10 — a complete redesign, cohesive with the rest of the app
("one amalgamated application").

---

## 1. The verdict, honestly diagnosed

The teardown (full read of the 4,872-line `ActiveWorkoutScreen.js`,
`SetEntry`, `RestTimer`, `LoggedSetRow`, `WorkoutSummaryScreen`, every
pinned test, and the Hevy/competitive corpus) shows the 3/10 is a
**presentation, information-architecture and cohesion** verdict — NOT a
capability one. Underneath the shell, the logger is strong to standout:
draft auto-save that survives an app kill mid-set (ahead of Hevy),
superset/giant-set logic with D44 cues and round-return, unilateral
two-phase logging, cluster sets, honest PR handling, ED-safe
celebration suppression, and a summary screen already at the world-class
bar. All of that is PRESERVED behind a redesigned shell.

What earns the 3/10:

1. **Up to 8 stacked chrome lines sit above the weight field** —
   group-focus banner, warm-up banner + hint, orientation row, target
   row, beat line, coach line, first-set hint — before the user reaches
   the thing they came to do.
2. **An ambiguous "N notes" accordion** hides the session's WHY
   (superset pairing, deload, coach notes) behind a count, not a name.
3. **A 11-row overflow junk drawer** holds every secondary action, with
   three parallel reorder mechanisms among them.
4. **The primary button swaps identity in the same pixels**
   ("Log set" → "Next exercise" → "Finish workout"), so muscle memory
   can navigate when it meant to log.
5. **The card breaks the house idiom**: 10px corners and 6px padding on
   the app's most-used surface, against the 16px/lg Card every polished
   screen uses; dense micro-type rows that exist nowhere else.
6. **Editing a logged set is a modal round-trip**, not an in-place
   touch.
7. **A 4,872-line monolith** makes every improvement expensive and every
   regression likely (the zeego style-clobber class of bug lives here).

Plus one wire-only feature gap: **the plate calculator is fully built
and tested with zero call sites** — serious lifters get nothing at the
bar. (Two other gaps are decision-bound, §8.)

## 2. Design principles (binding for every slot)

- **House cohesion first.** The logger composes from the same system as
  Diary/Home/Coach: `Card` (radius lg/16), the type roles with
  `type.num()` for every data numeral, the surface ladder, motion
  tokens, the haptics vocabulary. No hand-rolled one-off idioms survive
  unless a pinned test proves they carry function.
- **The set you are doing is the hero.** One glance answers: what
  exercise, which set, what the target is, what you did last time.
  Everything else is one honest tap away, labelled by content.
- **Never break the loop.** Log stays a single stable tap. Keyboard
  "Done" still logs. Prefill-from-last still one tap. Auto-rest
  untouched.
- **Calm voice, tier-blind logging, ED suppression, deterministic
  engine calls — inviolable** (CLAUDE.md §2; the logger only calls pure
  `lib/` functions and that never changes).

## 3. The new shell, top to bottom

1. **Header — kept.** Close, elapsed (`type.num('title')`), Finish with
   its pinned gating.
2. **Exercise navigator — kept, sharpened.** The pill strip stays; each
   pill's set-count badge becomes a thin progress underline (done/total)
   so week-at-a-glance state needs no reading. No behaviour change.
3. **Status strip — replaces the "N notes" accordion.** A single
   horizontal row of content-labelled chips: `Deload`, `Superset A2`,
   `Coach note`, `Starter session`, `Target met`. Each chip is
   tap-to-expand (same content as today, same copy). Nothing is hidden
   behind a count; an empty session shows no strip. Same fold-out
   guarantees, now glanceable.
4. **The Now card — the redesigned heart.** House `Card` (lg/16, proper
   padding), composed as:
   - **Line 1 (title zone):** "Set 2 of 3 · Working" with the set-type
     as the tappable element (same picker sheet), target folded in:
     "Set 2 of 3 · Working · 8–12 reps". One line where four stood.
   - **Line 2 (context, max ONE line, priority-ordered):** group-focus
     flash > warm-up state > coach line (first working set, tappable as
     today). The **beat line dissolves into the inputs**: last session's
     values render as ghost placeholders inside the weight/reps fields
     with the existing one-tap "Use" prefill — the "previous column"
     pattern, without a row of chrome.
   - **Inputs — kept.** The `SetEntry` stepper block is pinned, tested
     and good. One addition: a small **"Plates" affordance on the
     weight row for barbell exercises** opening a plate-loading readout
     (the built-and-tested `calculatePlates()`; the `plateBtn` style
     slot already exists; no new dependency).
   - **Note affordance** (pencil icon in the card corner) replaces the
     overflow's "Add/edit note" row.
5. **Rest timer — kept**, restyled to tokens only (it is functionally
   strong; Android notification actions untouched).
6. **Logged sets — kept rows, new edit ergonomics.** `LoggedSetRow`
   stays a mountable named export (live-theme pin). **Tapping a row now
   edits in place**: the row expands into a compact inline editor using
   the same SetEntry primitives, Save/Cancel inline — no modal
   round-trip. Long-press zeego menu (Edit/Delete) stays. Delete keeps
   its confirm.
7. **Bottom bar — stable identity.** The primary is ALWAYS "Log set"
   (or its pinned variants "Log warm-up"/"Start cluster") while an
   exercise is active. When the target is met, the bar gains a second,
   visually distinct advance action ("Next exercise" / "Finish
   workout") BESIDE the primary — never replacing it in place. The
   pinned target-gating logic is reused; only the placement changes.
   "Log another set" promoted button retires (the stable primary makes
   it redundant).
8. **Overflow diet — 11 rows → 6.** Relocations: Move up/down DELETED
   (the reorder sheet is the one reorder path); Add/edit note → the
   card; Exercise info → tapping the exercise title; Warm-up ramp → the
   set-type flow. Remaining: Swap, Add exercise, Reorder, Log per side,
   Pair superset, Shorten session, Remove.
9. **Summary — untouched.** Already at the bar; ED-suppression pins
   stay byte-identical.

## 4. What is explicitly preserved (behaviour contracts)

Engine calls pure and unchanged; free/tier-blind logging; D44 cues +
round-return; K-1 superset rest; D9 unilateral flow and its storage
shape; cluster flows; draft auto-save + stale recovery; keyboard
"Done" logs; auto-advance countdown with "Stay here"; warm-ups
non-counting; PR re-evaluation on edit/delete; TalkBack
announce-not-live-region; bottom-inset maths; keep-awake; FlashList
picker; reduce-motion collapse; calm copy verbatim where pinned.

## 5. Decomposition (the enabler)

`ActiveWorkoutScreen.js` decomposes into `src/components/workout/`:
`NowCard`, `StatusStrip`, `ExerciseNav`, `LoggedSetsList` (+ inline
editor), `WorkoutOverflowSheet`, with the existing sheets extracted
as-is. The screen becomes the orchestrator (state + wiring, target
~1,500 lines). Every extracted piece becomes mountable, so several
source-guard regex tests can graduate to real mounted assertions — the
pins get STRONGER, not weaker. Each extraction re-pins its guard tests
in the same commit.

## 6. Test strategy

The 20+ pinned suites in the teardown map one of three ways per slot:
(a) survive untouched (engine/behaviour pins), (b) re-pin to the new
structure with the same invariant (source-guards whose string anchors
move), (c) upgrade to mounted tests on extracted components. No pin is
deleted; every re-pin states its D43 slot in the header. Device
checklist per slot, ED cases included where weight-adjacent.

## 7. Staged build slots (worked in order after approval)

- **S1 — Decomposition, zero visual change.** Pure extraction +
  re-pins. Ships silently; proves the shell can move.
- **S2 — Now card + status strip.** The §3.3/§3.4 redesign; chrome
  lines 8 → 2; accordion retired.
- **S3 — Stable CTA + overflow diet + one reorder path.**
- **S4 — In-place set editing + plate readout.**
- **S5 — Cohesion polish.** Token/type/motion/haptics audit of the
  whole surface against Diary/Home; density normalised to the house
  card; adversarial review of the full arc; device walk.

Each slot: lint + full suite + per-feature commit + device checklist +
board/handover update, per standing discipline.

## 8. Explicitly out of scope (decision-bound — not silently dropped)

- **RPE/RIR visible input: STAYS OUT.** Settled-removed by D14 and the
  D19 addendum (held list: "do not re-surface"). The teardown lists it
  as a competitor gap; the standing founder decision overrides. Only a
  founder reversal reopens it.
- **iOS lock-screen rest timer (Live Activity):** code is wired; blocked
  on founder-side App Groups provisioning + EAS build (board §3
  founder ops). Not a shell item.
- **Blur/glass materials:** declined by the standing materials policy
  (Android-first).
- **Engine anything:** never.

## 9. Device checklist (post-S5, the founder's 10/10 walk)

1. Open a planned session → the Now card reads in one glance: set
   position, type, target, ghosted last-time values. **Expect** no
   stack of banners above the inputs.
2. Log 3 sets on a barbell lift → one stable "Log set" tap each; tap
   "Plates" on the weight row → **expect** correct per-side loading.
3. Hit the target → **expect** "Next exercise" appears BESIDE a still-
   present "Log set", never replacing it.
4. Tap a logged row → **expect** inline edit, Save without any modal.
5. Superset A1→B1 → **expect** the D44 cue exactly as today.
6. Status chips show "Deload" / "Superset" by NAME → tap expands.
7. Overflow shows 6 rows; reorder exists in exactly one place.
8. Compare the card corner radius and padding side-by-side with a Diary
   meal card → **expect** they read as one system.
9. Calm mode / open ED flag → complete a workout → **expect** all
   celebration suppressed exactly as today.
10. TalkBack: log a set, rest, advance → **expect** the same announce
    behaviour as today.
