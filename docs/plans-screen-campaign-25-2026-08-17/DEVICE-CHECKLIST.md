# CAMPAIGN 25 — PLANS SCREEN: DEVICE CHECKLIST (physical Android, EAS build)

Built from PLANS-SCREEN-SPEC.md; landed with the founder device-fix batch
of 2026-08-17. Walk top to bottom on the Train tab.

1. Open Train with an active plan. Expected: active plan hero FIRST
   (Active badge, name, workout count, Start next workout / View plan),
   block-advice card directly beneath it when one is due.
2. Below the block card: a "Plan tools" section label over the Training
   blocks row, then the change-plan action cards (Pro: adjust/switch;
   Free: default set). Expected: same destinations as before, just
   higher on the page.
3. Below Plan tools: "Previous plans · N" on one quiet header row,
   collapsed. Expected: N equals your non-active, non-archived plan
   count; chevron down; nothing else rendered.
4. Tap the header. Expected: it expands to folders (if any) then
   unfiled plans as COMPACT single-line rows inside one bordered body —
   name, workout count, "Set active", options dots. No hero-weight
   cards anywhere in this section.
5. Tap a row. Expected: opens that plan's detail. Long-press: the same
   options sheet as before (move to folder, archive, etc.).
6. Tap "Set active" on a previous plan. Expected: identical activation
   flow to the old card's "Set as active" (block-start confirmation
   where applicable).
7. Folder behaviour: collapse/expand a folder, folder options via the
   dots, empty-folder copy unchanged. Delete a folder elsewhere and
   confirm its plans fall through to the unfiled rows (never hidden).
8. "Archived plans · N" stays last, collapsed. Expand: same compact
   rows, muted name, NO inline Set-active. Options sheet still offers
   View plan / Restore plan; restoring reloads the list.
9. Workout templates section (if you have templates): unchanged,
   after Archived.
10. Free tier: no plan → "No active plan yet" empty state with quiz
    first, library second; Plan tools shows the default action cards;
    nothing Pro leaks.
11. New account (zero previous plans): NO "Previous plans" header at
    all — no empty shell.
12. VoiceOver/TalkBack spot check on one compact row: the row, "Set
    active" and the options dots are three separate focus stops.
