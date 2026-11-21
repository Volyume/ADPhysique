# LOC-697: Main CI has not passed since October (spec and evidence)

## Spec (verbatim from the task)

The app repository's own automatic check, the GitHub workflow Main CI (tests + lint + Expo Doctor), does not pass on `main` and has not passed since at least 23 October 2026.

Jest job never finishes on GitHub. Find why. Fix the cause in the test or the workflow, not by raising the time limit or skipping tests.

Expo Doctor. Name the packages whose versions differ from what the installed Expo SDK expects. Align them only if that needs no native rebuild decision.

Web dependency audit. Move the flagged packages to the lowest patched versions within their current major version. No new dependency.

Sweep the other workflows under `.github/workflows/` for the same three faults and list what you find.
