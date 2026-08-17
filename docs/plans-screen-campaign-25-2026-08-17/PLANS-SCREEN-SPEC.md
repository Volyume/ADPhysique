# CAMPAIGN 25 — TRAIN / PLANS SCREEN: HIERARCHY & SCALE REDESIGN

Founder order 2026-08-17. Baseline: main `36e371f3`. Source of truth
read hands-on: src/screens/PlansScreen.js (2,325 lines). Note:
Campaign 24 Wave A passed this screen against the then-current law;
this order sets new product direction for it, which supersedes.

## 1. UX DIAGNOSIS (concise)

The hero is right; everything after it is inverted.

- **Hierarchy inversion.** Current render order: active-plan hero →
  block-advice card → Folders (full cards) → "My plans" (full cards,
  unbounded stack, :1538-1544) → Archived (collapsible, but
  DUPLICATED full-card JSX when open, :1547+) → Training blocks row
  (:1669) → the change-plan action cards (:1698, the very bottom).
  The founder's priority 3 (ways to change plans) renders LAST, below
  an unbounded history; priority 4 (history) occupies the whole
  mid-page.
- **Repetition at hero weight.** Every inactive plan renders through
  renderPlanCard (:961): a full Card with meta row, two-line name and
  a two-button footer ("View plan" / "Set as active") — visually the
  same weight class as the hero. Eight previous plans = eight
  near-heroes. This cannot scale; a year of use makes the Train tab a
  scroll of dead plans.
- **A latent duplication defect.** The archived section duplicates
  renderPlanCard's JSX inline rather than sharing it (its own comment
  admits it, :1571-1574) — two copies of the same card to maintain.
- **What is already right and must not move:** the hero's content and
  CTA set; the block-advice card directly under it (coaching context
  for "next action"); the load-error/empty states; the deleted-folder
  fallthrough that makes plans unreachable-proof; the AX-11 sibling
  a11y pattern for options buttons.

## 2. TARGET SCREEN ARCHITECTURE (top to bottom)

1. **Active plan hero** — UNCHANGED content: Active badge, options
   overflow, name, workout count, week-of-block line, peak-week note,
   Pro coach note, primary CTA "Start next workout", secondary "View
   plan". (No-plan and load-error branches unchanged.)
2. **Block advice card** — unchanged, stays with the hero (it is the
   "what happens next" context).
3. **Plan tools** — MOVED UP from the page bottom; one `SectionLabel`
   "Plan tools" over the existing affordances in this order: the
   Training blocks row, then the existing action cards (Pro:
   adjust/switch set; Free/default set — the tier logic at :944 is
   unchanged). Same components, same destinations; only position and
   the unifying label change.
4. **Previous plans** — NEW collapsed section replacing the open
   Folders + "My plans" stacks. Header: `Previous plans · N`
   (N = filed + unfiled inactive plans), chevron, collapsed by
   default on every mount (session-scoped state, the archived
   section's existing precedent). Expanded content, in order:
   - existing folder headers (same toggle/options/a11y semantics,
     same empty-folder copy), whose bodies now render COMPACT ROWS;
   - unfiled plans as compact rows (no "My plans" sub-label needed —
     the section header covers them; folders remain visually grouped
     above).
5. **Archived plans** — kept as its own section (see §5), same
   header idiom as today, collapsed by default (unchanged), expanded
   content switches from the duplicated full cards to the SAME
   compact row component (archived name styling preserved via a
   variant prop; options open handleArchivedPlanOptions as today).

**The compact row** (one new local component, used by previous +
folder bodies + archived): a single-line-height row —
plan name (numberOfLines={1}) + quiet meta ("N workouts") beneath or
beside it, a tertiary-sm "Set active" button (previous rows only;
archived rows keep activation inside their options sheet exactly as
today), and the options overflow. Row press = View plan
(PlanDetail); long-press = options. AX-11 law: the options button is
a SIBLING of the pressable, never nested. No footer, no card border
per row — rows sit inside one bordered section body (the folder-body
idiom), separated by hairline dividers. That is the entire weight
reduction: one container for the section, not one card per plan.

## 3. IMPLEMENTATION NOTES

- New state `previousExpanded` (default false) mirroring
  `archivedExpanded`; header built on the archivedHeader style pair.
- New `CompactPlanRow` function component in PlansScreen.js (sibling
  scope, own useTheme, matching NavRow's precedent) with props:
  plan, meta, onPress, onLongPress, onOptions, onSetActive (null for
  archived), archived (name styling variant).
- renderPlanCard is RETIRED (both the function and the archived
  inline copy) — the compact row replaces every call site. The
  options sheets (handlePlanOptions / handleArchivedPlanOptions /
  handleFolderOptions) are untouched, so every existing capability
  (duplicate, archive, move to folder, unarchive, delete, set
  active) survives via the same sheets.
- The tools block moves by relocating the existing JSX (training
  blocks row + actionCards map) above the previous-plans section
  under one SectionLabel; no card redesign.
- Count badge: `myPlans.length` (filed + unfiled are both drawn from
  myPlans; archived counted separately as today).
- Skeleton: unchanged (hero + two short cards approximates the new
  geometry fine).

## 4. EDGE CASES TO PRESERVE

- Deleted-folder fallthrough: unfiled list must keep catching plans
  whose folder_id dangles (:946-957) — a plan is never unreachable.
- Empty folder copy ("No plans in here yet...") unchanged.
- AX-11 sibling-pressable pattern on every row and folder header
  (PlansScreen.optionsButtonSiblings.guard.test.js must stay green
  or be re-pinned to the row's identical sibling shape).
- Free/Pro action-card sets and the C8 Pro-no-plan path unchanged;
  FreeStarter/quiz entries unchanged.
- Load-error gating on !activePlan; the three hero-slot branches.
- Long plan names: numberOfLines={1} on rows (2 on the hero).
- handleSetActive's confirm/toast flow unchanged; "Set active" must
  remain a one-tap-visible affordance for previous plans (founder
  rule: preserve activation capability).
- A brand-new user with zero previous plans: the section simply does
  not render (no empty shell).
- Plans created but never activated live under Previous plans too —
  acceptable under the section name (they are non-active plans; their
  metadata row naming workout counts, not dates, avoids the false
  claim "previously used").

## 5. ONE SECTION OR TWO (inactive vs archived)? — RECOMMENDATION

**Two sections, one visual system.** Archiving is a deliberate user
act with a distinct option set (unarchive; no inline Set-active) and
a recorded product meaning: "I am done with this". Folding archived
into Previous plans would erase a user-made distinction and re-grow
the very list the user pruned — the opposite of the founder's intent.
But they must stop being two different DESIGNS: both use the same
compact row and the same collapsed-header idiom, so the page reads as
one system: hero → tools → previous (collapsed) → archived
(collapsed). Archived stays last and quieter (existing muted name
styling).
