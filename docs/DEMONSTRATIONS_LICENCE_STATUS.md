# Demonstrations media — licence status & decision record

**Status:** founder sign-off given to proceed with the exercise demonstration
media. **Basis: not formally confirmed** by WorkoutX. We are proceeding on the
founder's authority with the conservative CC BY-SA 3.0 attribution already
shipped, and the formal redistribution grant is still outstanding.

## Decision log

- **2026-06-08 — Founder sign-off to use the images.** Allan authorised
  populating the self-hosted demonstration media.
- **Licence basis: NOT formally confirmed.** WorkoutX has not (yet) returned a
  written redistribution/sublicence grant, and the exact provenance of each
  asset (WorkoutX-owned vs Everkinetic/CC) is not contractually pinned. We
  therefore treat the corpus as **Everkinetic, CC BY-SA 3.0** — the most
  conservative assumption — and redistribute under the same terms.

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

## Outstanding (before this can be considered legally closed)

1. **Obtain a written grant from WorkoutX** confirming either (a) they own the
   media and grant Volyume a perpetual self-host + sublicence right, or (b) the
   assets are Everkinetic/CC BY-SA 3.0 and our attribution satisfies it.
2. If WorkoutX **cannot** sublicence and the assets are **not** actually
   CC BY-SA 3.0, the media must not be shipped — remove `demo_url`s and fall
   back to illustrations only. (The fallback path already exists, so this is a
   data-only rollback, no code change.)
3. Re-confirm the CC BY-SA share-alike obligation is satisfied for our use
   (self-hosted redistribution with attribution + same-licence notice).

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
