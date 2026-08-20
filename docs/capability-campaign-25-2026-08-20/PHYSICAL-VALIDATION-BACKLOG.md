# PHYSICAL VALIDATION BACKLOG

Consolidated device checklist for the CC26-CC29 bundle (founder bundle
order section 12: banked, extended per campaign, executed at an
integrated checkpoint). Physical Android device, EAS build. ED-safety
cases are not applicable to these flows (no weight/food surfaces
touched) except where marked.

## CC26 - How you train (banked from that campaign)
1. Settings -> How you train opens FREE (no Pro sheet). Expected: screen renders with empty state copy.
2. Add a baseline demand rule (e.g. Standing work). Expected: consent moment appears first; readback is ONE grouped sentence; row appears under Your setup.
3. Add a temporary (episode) rule with a rough end date. Expected: appears under temporary section with time wording; day-0 prompt absent.
4. Kill the app; reopen. Expected: rows persist; no re-consent.
5. Second device (same account): rows arrive after sync; end a row on device B; device A converges to ended.
6. Withdraw and erase. Expected: rows gone on BOTH devices; feature off; workouts/history untouched.
7. TalkBack: every row/action announces label + state; the add flow is operable start to finish.

## CC27 - selection integrity
8. With Standing work active: open the exercise picker. Expected: standing movements absent by default; "Show movements outside how you train" reveals them with per-row reasons.
9. Tap a revealed self-declared conflicting exercise. Expected: the three-way sheet (cancel / add anyway just this plan / works for me). "Works for me" then shows the exercise normally on the next open.
10. Mark a rule as clinician-reported; tap a conflicting exercise. Expected: no add-anyway; "Update restriction" routes to How you train.
11. Create a custom exercise while a demand rule is active. Expected: exactly one optional question per constrained axis; skipping leaves it usable manually.
12. Pro: rebuild plan (Adjust training) with Standing work active. Expected: no standing movement in the preview or saved plan; any shortfall reported with honest copy; thin sessions lead with the reduced banner.
13. Recent rail in the picker never shows a capability-blocked movement.
14. Engine Log joint-discomfort entry reads the new honest copy (no rotation claim).

## CC28 - onboarding + library
15. Fresh free first-run: the capability step appears after the three questions; skip is one tap; "Yes" opens How you train and returns.
16. With a rule set during onboarding: the recommended starter plan opens fully compatible (no conflict sheet on install).
17. Pro onboarding: the How you train step shows between Training week and Targets; skipping never blocks; step count reads 6 with Account excluded.
18. Plan library with a rule active: "Fits how you train" collection appears; family plans carry the chip; a conflicting plan shows the honest to-swap count.
19. Install a conflicting plan. Expected: the conflict sheet words capability rows separately ("Outside how you train") and substitution works per row.
20. Session length is editable FREE under Settings -> Workout and units; the energy row on How you train routes there.
21. VoiceOver/TalkBack on: onboarding capability steps (both paths), the library chips, the conflict sheet - operable and announced.

## CC29 - effective prescription (extended when built)
(placeholder - extended at CC29 landing)
