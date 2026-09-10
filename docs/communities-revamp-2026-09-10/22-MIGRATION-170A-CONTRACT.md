# 22 — CONTRACT: migrate_170_community_connection.sql, Part A

For the client lanes: build against this, not the SQL. Source: `supabase/migrate_170_community_connection.sql`.
WRITTEN, NOT APPLIED — do not call any of this against production until the founder's "run against production"
lands and the file is actually applied.

## Discipline taxonomy (15 keys, max 3 per profile, no dupes)

Keys: `bodybuilding, mens_physique, classic_physique, womens_physique, figure, bikini, wellness, powerlifting,
olympic_weightlifting, strongman, crossfit_functional, calisthenics, hybrid, sport_sc, general_strength`.

Labels (British English, server-authoritative via `_community_discipline_label`): Bodybuilding; Men's physique;
Classic physique; Women's physique; Figure; Bikini; Wellness; Powerlifting; Olympic weightlifting; Strongman and
strongwoman; CrossFit and functional fitness; Calisthenics; Hybrid (lifting and endurance); Sport strength and
conditioning; General strength and fitness.

### Physique-division keys (the Q1b calm-mode / open-ED-flag withhold set) — SEVEN

Lead ruling 3, 2026-09-10. `bodybuilding, mens_physique, classic_physique, womens_physique, figure, bikini,
wellness`. 20-BLUEPRINT.md section 8 calls this "the six" because it was written before Q1 added Women's
physique without removing Wellness; the authoritative set is these seven. The client withholds a viewer's OWN
cohort page for any of these seven under calm mode or an open ED flag (blueprint section 8, Q1b) and carries the
standing Beat UK signpost on all seven. The server has no part in it and never learns the viewer's calm-mode
state — cite this list, not the blueprint's prose.

## community_upsert_profile(_p jsonb) — signature unchanged

New optional key in `_p`: `discipline_keys` (array of up to 3 taxonomy strings). **Omit the key to leave it
unchanged** (same contract `styles` already has); send an array, including `[]`, to replace it. Invalid key,
>3 elements, or a value that is present but is not an array → `invalid_input` (reviewer 2026-09-10: a non-array
used to erase the stored keys silently). No new consent type: rides the existing `community_visibility` consent this RPC
already records.

## _community_profile_card(_uid, _viewer) — signature unchanged

New fields, always present:
- `discipline_keys` (text[]), `discipline_labels` (text[]) — same viewability gate `styles` uses; `[]` when not viewable.
- Nine consistency counters, key always present, **value null unless** the owner's `share_consistency = true` AND
  `status = 'active'` AND `is_minor = false` (applies even to the owner viewing their own card): `c_sessions_week`,
  `c_sessions_month`, `c_weeks_streak`, `c_planned_pct_4w`, `c_consistent_weeks_12w`, `c_trained_days_week` (text[]),
  `c_last_trained_day` (text, `YYYY-MM-DD`), `c_updated_at` (timestamptz), `c_weeks_history` (smallint[]). No new
  toggle: enforces the existing `share_consistency` choice on a surface (someone else's card) that never read it.

Nothing else added. Every card anywhere in Community (board rows, dimension rows, find_people, profile) carries these.

## community_dimension(_kind, _key, _cursor?, _limit?) — signature unchanged

`_kind` gains `'discipline'` (key = taxonomy key) and `'age_band'` (key = a band from `TP_AGE_BANDS`). Return shape
unchanged: `{label, count, people[], programmes: [], cursor}`.

`age_band` is **reciprocal**: caller with no `tp_age_band`, or a `_key` that isn't their own band, gets the empty
shape (`label: null, count: 0, people: []`) — never an error, never another band's roster. `'programme'` still
always returns the empty shape. Minors never counted or listed, in any kind.

## community_dimensions_me(_today) — SIGNATURE CHANGED, now takes `_today`

Was `community_dimensions_me()`; the old 0-arg overload is dropped. Now **requires** `_today` (`YYYY-MM-DD`, the
caller's LOCAL day, same reason `community_board` requires it — never `now()::date`); missing/malformed →
`invalid_input`.

**Lead ruling 1, 2026-09-10 — backwards compatible, so an old build does not break.** A NULL or absent `_today`
is ACCEPTED and falls back to the UK-local day key, `to_char(timezone('Europe/London', now()), 'YYYY-MM-DD')` —
byte-for-byte the format `src/lib/dayKey.js`'s `localDayKey()` produces, so both compare equal against
`c_last_trained_day`. A `_today` that IS supplied is still validated and still `invalid_input` when malformed.
Old builds (`src/lib/community/feed.js:168` sends `{}`) keep working and simply receive the enriched shape, which
is a harmless superset. **New callers must still pass `_today`**: only the client knows the user's real local
day, and the fallback is a safety net for shipped builds, never the intended path.

Also now **rate-railed at 120/hour** (action `dimensions_me`), the same rail `community_board`,
`community_find_people` and `community_hub_summary` carry; it runs `_community_cohort_stats` up to eight times
per call and previously had none.

Return shape: `{dimensions: [...]}`. Every style/gym/area/discipline/age_band row now also carries `member_count`
(int), `trained_today_count` (int) and `sample` (up to 3 `{user_id, handle, display_name, avatar_preset}`,
trained-today preferred then any member, never a minor).

New rows: one per discipline key the caller holds (`kind: 'discipline'`), and one reciprocal age-band row when the
caller shares theirs (`kind: 'age_band', key: <band>, label: <band>` — `label` is the raw key; map it through your
own `TP_AGE_BANDS` for display text). `programme` rows (dead path, `community_programmes` is empty) are not
enriched with the three new keys.

## community_board(...) — signature unchanged

`_scope` gains `'area'`, `'style'`, `'discipline'`, `'age_band'`.
- `area`: `_scope_key` optional, defaults to the caller's own `area_key` (same fallback as `gym`→`gym_id`). No key
  either way → empty board (`rows: [], count: 0`), never an error.
- `style` / `discipline`: `_scope_key` **required** (a profile can hold up to 3 of either, no implicit "yours").
  Missing → `invalid_input`. Out-of-taxonomy `discipline` key → `invalid_input`.
- `age_band`: no `_scope_key` (always the caller's own band). No `tp_age_band` → `not_allowed` (same shape `group`
  gives a non-member).
- Reviewer 2026-09-10: the four NEW scopes only list profiles the caller may actually see
  (`_community_can_view`: public-and-active, someone you follow with an accepted edge, or yourself). A scoped
  board otherwise states the very fact the profile card withholds — `area_label`, `discipline_keys` and
  `tp_age_band` are all behind the card's viewability gate. The pre-existing `gym`/`following`/`group`/`everyone`
  scopes are unchanged.

Everything else unchanged: windows (`week`/`month`/`consistency`), `threshold_met: count >= 8`, keyset `cursor`,
own-row `you`, the `rows[].card`/`metric`/`trained_days`/`trained_today` shape, the 120/hour rate rail. Minors
never on the board.

## community_hub_summary(_today) — NEW

`_today` expected (`YYYY-MM-DD`) and validated when supplied; NULL or absent falls back to the UK-local day key,
exactly as `community_dimensions_me` does above (lead ruling 1). Rate-railed, 120/hour (same rail as
`community_board`/`community_find_people`). Returns:

```
{ cohorts: [ { kind: 'gym'|'area'|'style'|'discipline'|'age_band', key, label,
               member_count, trained_today_count, sample: [] } ],
  groups:  [ { id, name, access, member_count, trained_today_count, sample: [] } ] }
```

One row per: caller's gym (if set), area (if set), each of up to 3 styles, each of up to 3 disciplines, age band
(only while shared) — omitted when `member_count` would be 0. `groups` lists groups the caller is a **member** of
(`state = 'member'`, not requested/invited). `sample` entries: `{user_id, handle, display_name, avatar_preset}`,
never a minor, up to 3, trained-today preferred.

Reviewer 2026-09-10, groups: `member_count` here is **computed** (active, non-minor, not blocked either way,
`state = 'member'`), NOT `community_groups.member_count`, which counts every member row including minors,
suspended and restricted profiles. It can therefore be lower than the figure `community_group_get` returns for
the same group — that is deliberate: `trained_today_count <= member_count` now always holds, and no minor is
ever in a count. `trained_today_count` and `sample` also exclude blocked pairs, and both — like every cohort
figure — count only members whose own `share_consistency` is true.

Lead ruling 5, 2026-09-10: every cohort `sample` (`community_dimensions_me` and `community_hub_summary` alike)
also excludes people the caller has **muted** — `community_find_people`'s rule, because a sample is a face you
see. The `member_count`/`trained_today_count` figures are deliberately NOT reduced by a mute (that would make a
cohort look smaller than it is); they stay blocked-only, matching `community_dimension`.

Lead ruling 6, 2026-09-10: the `member_count` divergence between this RPC (computed, minor- and block-aware) and
`community_group_get` (the stored `community_groups.member_count`, which counts everyone) is knowingly left in
place for part A. Part B (phase 3, which touches groups anyway) aligns `community_group_get` to the computed
figure. Until then, do not compare the two numbers in the UI.

One call for the whole Hub instead of one per cohort
(21-PHASE1-SPEC.md section 5). No minor-caller gate beyond the per-row `is_minor = false` filters — no existing
Community read blocks a minor caller outright.

## community_find_people(_mode, _cursor?, _limit?, _filters?, _discipline?)

New trailing param: `_discipline text DEFAULT NULL`. A **hard filter** (narrows results; does NOT add a scored
"match reason" the way shared styles/goal/bands do). Invalid taxonomy value → `invalid_input`. Independent of
`_mode`/`_filters` — combine freely with either.

## What did not change

`delete_user_data()` — no change (no new table; `community_profiles` is already deleted whole-row, taking
`discipline_keys` with it). Groups (`community_group_list_mine`, `community_group_get`, etc.) — unchanged; Part A
only reads group membership for the Hub summary. No new consent type, no new notification category, no change to
any existing band/reason list (`TP_AGE_BANDS`, `CONNECT_REASONS`, etc.).

## Client-side, not this migration

The blueprint's calm-mode / open-ED-flag withholding of a person's OWN physique-division cohort pages (section 8,
Q1b) is a **client** decision — the viewer's own app simply does not open/render that cohort page for themselves.
The server has no reason to know a viewer's calm-mode state to serve a `discipline` cohort to everyone else, so it
is not encoded here.
