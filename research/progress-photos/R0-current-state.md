# R0 — Progress Photos: current state in code (ground truth)
**Date:** 2026-07-03. **Author:** Fable (main loop), verified against the actual source before any build. This is the baseline the design and build phases improve on. Read this before trusting the founder's from-memory description; two of his points are already handled and must not be "rebuilt".

## Files
- `src/lib/progressPhotos.js` — the data layer (device-local files).
- `src/screens/ProgressPhotosScreen.js` — the only screen.
- `src/lib/__tests__/progressPhotos.test.js` — pure helpers (filename<->timestamp, ordering).
- `src/screens/__tests__/ProgressPhotosScreen.compare.test.js` — the compare + ED-gate invariants (READ before touching the screen; several are safety pins).
- Wiring: `RootNavigator.js` routes it under the Progress stack, gated `withReadOnlyProGuard` (Pro writes; free users who already have photos get a view-only gallery).

## Data model (VERIFIED)
- Photos live ONLY in `${FileSystem.documentDirectory}progress_photos/`. Never synced to Supabase, never uploaded, never auto-shared. **This is the standing architecture and the "never leaves the device" rule is already honoured — do not break it.**
- A photo is a file named `<epochMs>.jpg`. **The capture timestamp IS stored** (the filename), parsed back via `timestampFromName`. So photos are auto-dated at the data layer; the gallery just never shows the date on the thumbnail.
- Only metadata that exists today = the timestamp. No pose, no label, no note, no bodyweight-at-time. Adding those needs a NEW local metadata store (SQLite table keyed by filename, or a JSON sidecar). Because the photos stay on-device, **their metadata should stay on-device too — a LOCAL `database.js` migration (PRAGMA user_version), NOT a Supabase migration.** (See decisions list: syncing body-photo metadata would be a new off-device flow of body-adjacent data and is a flagged founder decision, defaulting to on-device.)
- `owner.txt` sidecar records which signed-in user the photos belong to; the read-only lapse guard fails CLOSED without a match (stops account B seeing account A's body photos on a shared device). Preserve this.

## What EXISTS today (do not rebuild)
- **Gallery:** 3-column `FlashList` grid of square thumbnails, newest-first. Bare thumbnails — **no visible date, no label** on the tile.
- **Add:** `+` opens an alert -> Take photo (camera) / Choose from library. Pro only; on-device save. Live pro-to-free re-check guards the async callback.
- **Compare (minimal, ALREADY BUILT):** a "Compare" affordance appears when >=2 photos exist. Enter selection -> tap exactly two (third tap replaces earliest) -> "Compare" opens a full-screen `Modal` showing the two photos **side by side**, older-LEFT / newer-RIGHT, each captioned "Earlier"/"Later" + date. Bounded decode dimensions + `resizeMethod="resize"` (memory-safe). Reduce Motion collapses the modal animation.
- **ED-safety (present, must preserve):** calm-mode note; the wellbeing read is FAIL-CLOSED (raw `AsyncStorage.getItem(WELLBEING_KEY)` + `read_failed` sentinel, `isCalm(mode) || mode === 'read_failed'`), never `getWellbeingMode()`. Compare copy is deliberately **dates + neutral labels ONLY**: the compare test pins "no deltas, measurements, 'before/after' framing or judgement words". Read-only lapse view for lapsed Pro.

## The real gaps (what to BUILD)
1. **No full-size single-photo viewer.** Tapping a thumbnail (outside compare-selection) opens the DELETE prompt — the founder's "the only action is delete" is correct. Need: tap -> view full-size; delete moves inside the viewer.
2. **No visible dates / timeline in the gallery.** The date exists but isn't shown on tiles. Need dated, scannable organisation (date section headers / timeline).
3. **No labels / tags / poses.** No way to mark front/side/back, phase, a note, or (calm/ED-gated) bodyweight-at-time. Needs the new local metadata store.
4. **No grouping by pose** so like-compares-with-like.
5. **Comparison is side-by-side only.** No before/after SLIDER, no aligned OVERLAY/onion-skin, no time-lapse, no "first vs latest" / "now vs N weeks ago" pickers, no compare-by-pose. (Reconcile with the ED pin: any slider/overlay must stay neutral "earlier/later + date", never dramatic "before/after transformation" framing.)
6. **No consistency aids.** No pose/framing guide, no ghost-overlay of a previous photo at capture so shots line up.
7. **Empty state / capture flow are functional, not premium.** Alert-based add, plain empty state — below the free-trial-screen bar.

## Constraints carried into design/build (from CLAUDE.md + this code)
- On-device only; never upload body photos; metadata on-device too (default).
- ED-safety inherits calm-mode + ED-flag suppression, fail-closed (the exact raw-read pattern above). No number-chasing overlays ungated (bodyweight-at-time is calm/ED-gated). No streaks on photo-taking, no gap-shaming, no goal-body comparison, no dramatic transformation framing.
- Deterministic engine untouched. Existing design tokens + E1 motion + E15 signature elements only; zero new visual vocabulary.
- Free/Pro: today writes (add/delete) are Pro; free-with-photos is view-only (E10). New capabilities inherit that split unless the research says otherwise; genuinely ambiguous gates go to the decisions list.
- Any schema change additive + reversible. Local migration runs once via user_version; no cloud migration expected (photos + metadata stay local).
