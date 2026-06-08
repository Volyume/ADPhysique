# Phase 2 — Feature 2 Proposal: Exercise Demonstrations (phase2-04)

**Date:** 2026-06-08 · **Status:** proposal for approval; nothing built until approved.
**Grounded in:** `phase2-00` (audit) + `phase2-03` (research).

---

## 0. Strategy & the dependency decision

**Build the data model, the cues layer, and a premium fallback NOW; light up real video later.** Research is unambiguous: owned video is the premium bar but doesn't exist yet, and free GIF datasets are disqualified on licence/architecture/quality (phase2-03 §C/§B). The brief itself mandates supporting **both states**.

**Dependency note (CLAUDE.md: no deps without permission):**
- `expo-image` (WebP thumbnails, animated WebP loops, caching) is **already installed** — use it, no new dep.
- `expo-video` (real H.264 MP4 loops, offline disk cache) and any 3D stack (`three`/`expo-gl`) are **NEW dependencies**. **Do not add them in this feature.** Phase 1 ships the **fallback + cues + thumbnail** experience with zero new deps; the MP4 player is wired behind a capability check and only enabled once (a) owned videos exist and (b) `expo-video` is approved. (Interim premium motion can use **animated WebP via expo-image** — no new dep — if motion is wanted before video.)

**Free, not Pro-gated** (phase2-03 §F6): demos are credibility/table-stakes and harm Pro conversion if gated. Consistent with Volyume's Free exercise library.

---

## 1. Content strategy
- **Source:** commission an **owned** library, batched as one studio series (the MacroFactor/RP bar — phase2-03 §C), dark-set to read on #0D0D0D. Optionally licence **ExRx Premium API for *data/taxonomy* only**, never its visuals. Reject AI-generated video (correctness/consistency/safety, §B), CC BY-SA media, stock as the demo source, and ExerciseDB/RapidAPI (offline-first conflict).
- **Quality bar:** consistent framing/lighting/model, seamless ~3–6s loop, biomechanically correct, muted, ≤1MB H.264, 480–720p; WebP thumbnail 400×300. Dark background.
- **Coverage/rollout:** ~250–400 priority exercises first (the most-logged compounds/isolations), phased. Until a given exercise has media, it shows the fallback. New library exercises default to fallback until media is added.

## 2. Database additions (additive, nullable — safe)

**Supabase** `migrate_073_exercise_demos.sql`:
```sql
ALTER TABLE exercises
  ADD COLUMN demo_url TEXT,
  ADD COLUMN demo_thumbnail_url TEXT,
  ADD COLUMN form_cues JSONB,            -- { setup:[], execution:[], cues:[] }
  ADD COLUMN common_mistakes JSONB,      -- ["..."]
  ADD COLUMN demo_duration_seconds INTEGER;
```
(Additive/nullable; existing canonical-read RLS unchanged. No billing/coaching/safety surface touched.)

**Local (`database.js` migration array, new version block):**
```js
'ALTER TABLE exercises ADD COLUMN demo_url TEXT',
'ALTER TABLE exercises ADD COLUMN demo_thumbnail_url TEXT',
'ALTER TABLE exercises ADD COLUMN form_cues TEXT',          -- JSON string
'ALTER TABLE exercises ADD COLUMN common_mistakes TEXT',    -- JSON string
'ALTER TABLE exercises ADD COLUMN demo_duration_seconds INTEGER',
```
Extend `rowToCamel` to `JSON.parse` `form_cues`/`common_mistakes` (mirror the existing `secondary_muscles` handling). Add these fields to the exercise pull mapping in `src/lib/sync/` so canonical demo metadata can refresh (note: canonical exercises are seeded locally and currently don't sync — so demo metadata ships via a seed/asset update or a one-off canonical pull; document which. Recommendation: bundle a `seedExerciseDemos` map keyed by `canonicalExerciseId`, like `FORM_TIPS`, so it ships with the app and needs no cloud round-trip).

**`form_cues` shape:**
```json
{ "setup": ["Feet shoulder-width", "Brace"], "execution": ["Drive through heels"], "cues": ["Chest up","Knees track toes"] }
```

## 3. Components (reuse tokens/primitives — phase2-00 §9)

- **`DemoCard.js`** — top of `ExerciseDetailScreen`, above muscle info. `surface #191917` card, radius `lg`, amber 1dp border.
  - If `demoThumbnailUrl`/`demoUrl`: `expo-image` thumbnail (`cachePolicy="memory-disk"`) shown instantly; amber "▶ How to perform" overlay. Tap → play loop **silently** (animated WebP via expo-image now; expo-video MP4 when approved). Loading = amber skeleton shimmer (`Skeleton`/`SkeletonCard`) at card dimensions. **Error → silently fall through to `IllustrationCard`** (never a broken/"missing content" state).
  - The dark container visually contains any lighter-background media so it never bleeds into `#0D0D0D`.
- **`IllustrationCard.js`** (fallback, same dimensions) — primary muscle highlighted amber via existing `BodyDiagramHeatmap`/`Illustrations`. Stands alone; no "missing" feel.
- **`CoachingNotesPanel.js`** — collapsible (collapsed by default), below the card. Renders `form_cues` as Setup (numbered) / Execution (numbered) / Key cues (pill `Chip`s) / Common mistakes (amber ⚠ prefix). **Folds in the existing `FORM_TIPS[name]` and `exercise.cue`** so content isn't duplicated: prefer structured `form_cues`; fall back to `FORM_TIPS`/`cue` prose when `form_cues` is null. Only render if any content exists.

## 4. ExerciseDetailScreen integration (`src/screens/ExerciseDetailScreen.js`)
- Insert `<DemoCard>` (or `<IllustrationCard>`) at top, above muscle section.
- Replace the current ad-hoc cue/notes rendering (~lines 603/610) with `<CoachingNotesPanel>`, passing `formCues`, `commonMistakes`, `FORM_TIPS[exercise.name]`, `exercise.cue`, `exercise.notes`.
- **Progressive disclosure:** demo/illustration visible by default (advanced users get the 2s loop and leave); coaching notes collapsed (beginners are one tap away). Honours the "backfire effect" (phase2-03 §E) — nothing intimidating is forced.

## 5. Caching & prefetch (offline-first)
- `expo-image` `Image.prefetch(thumbnailUrl)` for every exercise in a session **on workout start** (`ActiveWorkoutScreen.js`), silently — warms thumbnails before the gym (no signal there). Full media lazy-loads only on tap.
- Cache policy `memory-disk`; ~30-day disk retention; bust on exercise data refresh. When expo-video lands, its persistent disk cache gives offline replay after first view.

## 6. Where demos appear (and where they don't)
- **Exercise detail (primary):** full DemoCard + notes. Plans & Progress stacks reach it.
- **Active workout (secondary, on-demand):** a small "ⓘ technique" affordance on the set view opens the demo in a `BottomSheet` — **never auto-plays, never blocks the set** (phase2-03 §E: keep active sets distraction-free). Mid-workout view shows the silent loop + 2–3 key cues only.
- **Exercise picker/library:** thumbnail only, no autoplay.
- **Not** on Home/Train dashboards.

## 7. Coach integration (read-only, no engine change)
The deterministic coach may *reference* technique in its existing free-text output (e.g. `getTrainingNote`-style copy already exists): *"Focus on lateral-raise form this week — check the technique guide before your shoulder session."* This is **copy referencing a screen**, not a coaching-logic change — fully within the no-LLM/no-engine-edit rule. First-time-logging a movement may surface a one-time tooltip ("Tap any exercise to see how it's performed") via the `seen_onboarding_hints` mechanism — shown once.

## 8. Performance gates (acceptance)
- ExerciseDetailScreen renders < 1s whether demo is cached, cold, or absent (screen never waits on media; thumbnail fills in).
- Demo playback must not affect workout-logging perf.
- 10 consecutive exercise-detail opens: no leak, no slow-down.
- Network-disabled: cached content shows, fallback otherwise; no infinite spinner.

## 9. What must be preserved
- Session logging stays fast/clean; demos on-demand, never forced.
- Feels like coaching intelligence, not a video library.
- Graceful fallback is a first-class state, not an error.
- British English; #0D0D0D/#F5A623 tokens only; 48dp targets; Reduce-Motion respected (no autoplay loop when Reduce Motion is on — show thumbnail + cues).

## 10. Open questions for sign-off
1. Approve **`expo-video`** as a new dependency for real MP4 loops, or stay on **animated WebP via expo-image** (no new dep) for launch? *(Recommend: WebP/fallback now; approve expo-video when owned videos exist.)*
2. Confirm content route: **commission owned** (recommended) vs interim stylised **Lottie** library (cheap, tiny, offline, but illustrative not photoreal — would need `lottie-react-native`, a new dep).
3. Confirm demo metadata ships as a **bundled seed map** (keyed by `canonicalExerciseId`, like `FORM_TIPS`) vs a canonical cloud pull.
