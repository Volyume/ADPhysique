# Demonstrations media — licence status & decision record

**Status:** founder sign-off given to ship the exercise demonstration media. We
proceed on the founder's authority with the CC BY-SA 3.0 attribution shown in
the Credits screen as the basis. No outstanding blocker.

## Decision log

- **2026-06-08 — Founder sign-off to ship the media.** Allan authorised using
  and populating the self-hosted demonstration media, and accepts the CC BY-SA
  3.0 attribution as the licensing basis.
- **Licensing basis: Everkinetic, CC BY-SA 3.0.** The animations derive from
  the Everkinetic exercise library (CC BY-SA 3.0); we self-host and redistribute
  under the same terms, with attribution shown verbatim in Credits.

## What we ship (unchanged, deliberately kept)

- **Attribution is live and verbatim** in `src/screens/CreditsScreen.js`:
  "Exercise demonstration media sourced via WorkoutX. Underlying animations
  derive from the Everkinetic exercise library, licensed under the Creative
  Commons Attribution-ShareAlike 3.0 licence; redistributed under the same
  terms." This is **not** to be removed while the basis is unconfirmed.
- Media is self-hosted (EU Supabase Storage, migration 073) so there are no
  ongoing third-party calls and offline-first is preserved.
- All `demo_url` columns stay null until the seeder is run; the app renders the
  illustrated-diagram + written-cues fallback in the meantime, so the feature
  is already shippable without media.

## Notes

- The CC BY-SA 3.0 attribution in `src/screens/CreditsScreen.js` must stay
  while we ship this media (share-alike + attribution).
- If we ever need to pull the media, it is a **data-only rollback**: clear the
  `demo_url`s and the app falls back to the illustrated diagrams automatically.
  No code change required.

## Running the seeder (operator, with production credentials)

The seeder is structurally run-ready but has **not** been executed here (this
environment has no Supabase service-role key and never runs the production DB).

```
# 1. Dry run first — reports name-match coverage, writes nothing:
WORKOUTX_API_KEY=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/seed/seedExerciseDemos.js --dry-run

# 2. Populate (drops --dry-run):
WORKOUTX_API_KEY=… SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/seed/seedExerciseDemos.js
```

⚠️ **Verify the WorkoutX adapter first.** `fetchWorkoutXExercises()` and
`mapWorkoutXExercise()` in the seeder are isolated and best-effort: the
endpoint path, auth header, pagination, and field names are guesses and must be
checked against the live WorkoutX API docs before the first real run.
