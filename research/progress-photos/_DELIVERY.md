# Progress Photos — Delivery
**Date:** 2026-07-03. Programme: research → framework → design → build → hostile review, run as an orchestrated Opus fleet. Branch `claude/codebase-audit-docs-pv6mjd`. Full gate: **425 suites / 5,843 tests, 0 failures; lint 0 errors.** Hostile review: no blockers, one MAJOR fixed.

## What shipped (from worst-in-class to best-in-class)
- **Dated, pose-filtered timeline** replacing the flat delete-only grid: month section headers, each tile shows its date and pose, filter by All/Front/Side/Back.
- **Full-size viewer** (ends delete-only): pinch-zoom, swipe between photos, per-photo pose/date/note editing, set-as-reference, compare-from-here, delete-with-confirm.
- **Per-photo metadata** (device-local): pose, editable date, note, and bodyweight auto-snapshotted from the nearest weigh-in (weight shown only when not suppressed).
- **Comparison**: calm two-up default, an in-house before/after slider, and a Skia onion-skin overlay; pose-aware pairing; neutral "earlier/later + date" copy only.
- **Ghost-overlay capture guide** (`expo-camera`): line up each new shot against the last same-pose photo (opacity 15–85%, rule-of-thirds grid, level) — the headline differentiator.
- **Before/after share card**: one composited PNG (two photos + both dates + both weights + elapsed time + Volyume wordmark), Pro-gated, one-time confirm, square/4:5/story formats.
- **ED-safe throughout**: comparison, weight display, and the share card are all withheld under calm mode or an open ED flag, fail-closed. Nothing scores, idealises, gamifies, ranks, or broadcasts a body. Nothing leaves the device.

## Migration (nothing for you to run manually)
- The only migration is **local**: `database.js` gains `progress_photo_meta` at `user_version 54` (additive, idempotent, `CREATE TABLE IF NOT EXISTS`). It runs automatically on first launch of the new build.
- **There is NO Supabase migration.** Photos and their metadata stay on-device by constraint (`progress_photo_meta` is deliberately absent from the sync registry, pinned by a guard test). The hostile review PROVED no photo path uploads anything.

## On-device checklist (physical Android, EAS build)
1. **Auto-dated capture:** Progress → Progress photos → + → "Take with guide". The camera opens with your last same-pose photo faintly overlaid; take a shot. Expected: it lands in the timeline with today's date and a pose badge, no crash.
2. **Full-size view:** tap a photo — it opens the viewer (NOT a delete prompt); pinch-zoom and swipe between photos work.
3. **Label / pose / date:** in the viewer set the pose (front/side/back), edit the date, add a note — all persist after closing and reopening.
4. **Bodyweight-at-photo:** with normal wellbeing, the viewer shows the weigh-in nearest that photo's date; confirm it's the right one; confirm no weight appears on the grid.
5. **Comparison:** pick two photos — two-up shows older-left/newer-right with dates; switch to the slider (drag the handle) and the overlay (opacity control). Confirm NO "before/after", weight, or measurement words anywhere in compare.
6. **Ghost guide:** at capture, change the overlay opacity and toggle the grid; the previous photo helps you line up the new one.
7. **Before/after card:** from compare tap Share → the one-time confirm appears → generate. Confirm the card shows two photos, both dates, both weights, the elapsed time ("N weeks"), and the Volyume wordmark; share to a chat and confirm it exports as ONE image; try square / 4:5 / story.
8. **Calm / ED suppression:** turn on calm mode — confirm Compare and Share disappear and no weight shows in the viewer, while you can still view and delete your own photos and see the calm note.
9. **Reduce Motion on:** the viewer zoom, the slider, the capture overlay, and the modals do not animate.
10. **Free plan:** as a lapsed/free user who already has photos — view-only (no add, no delete, no editable viewer); Compare still viewable.
11. **Nothing leaves the device:** in airplane mode, capture / view / compare / generate-and-share a card all still work; nothing uploads.
12. **ED red-lines absent:** no reminder or streak to take a photo, no transformation/"before-after" hype, no goal-body image, no number stamped onto a body in the viewer or compare.

## Decisions list (for you)
1. **New dependency `expo-camera` (~17.0.10)** — for the ghost-overlay capture. Adopted under your deps-approval; on-device permission string only.
2. **Weight on the before/after card** — your approved Article 9 exception; recorded in `CLAUDE.md`; the whole card is withheld under calm/ED; name/measurements/notes stay banned.
3. **ED-pattern-flag read added to suppression** for the new comparison/weight/share surfaces — additive, fail-closed, per your "inherit ED-flag suppression" instruction; the base screen's existing calm read is unchanged.
4. **No Supabase migration** — local-only, runs automatically; nothing to apply.
5. **Free/Pro unchanged** — writes (capture, label, delete, share) are Pro; free-with-photos stays view-only (E10).

### Small forks left for your ruling (not blocking; the build is safe as-is)
- **a. Lapsed (free) users get inert tiles** (no full-size viewer), to protect the E10 read-only boundary since the viewer isn't internally tier-gated. If you want lapsed users to view full-size read-only, that's a small follow-up (a read-only viewer mode).
- **b. "Compare from here"** opens comparison on the pose-aware default pair rather than seeded to the exact photo you tapped (the compare component owns its own selection). Minor; a follow-up could thread a seed.
- **c. Mid-modal tier flip:** delete and capture now hard-block on a live pro→free flip; the viewer's non-destructive edits (pose/date/note) do not close on flip (they match the existing open-modal pattern). Say if you want all edits closed on a flip too.
