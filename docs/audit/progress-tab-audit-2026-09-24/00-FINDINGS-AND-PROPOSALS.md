# Progress tab audit, 2026-09-24: findings, root causes and proposals

**Order (founder, 2026-09-24, verbatim):** "For next audit once community is
done. I need you to do an extensive audit on these areas of the app next. It
does not represent directly or report correctly and change per selection. I
need you to audit every area and come back with improvement suggestions for
the consistency this weeks plan, recovery and so on. Make sure everything.
I'm here works 100% is accurate and usable and offer suggestions of
improvements. Use lowest level agent for each relevant task with you doing
these brain work. Work out why recovery doesn't show nor does this weeks
plan," with five screenshots of the Progress tab (Volume heatmap at 1, 2 and
4 weeks; the body heatmap; the Consistency screen).

**Method (D185, lowest capable tier):** four Haiku read lanes mapped the data
paths (R1 volume and body heatmaps, R2 the Consistency screen, R3 the tab
inventory, R4 every selector and every definition of "week"); a fifth (R5)
is checking the body-metrics, lift and history screens. Every root cause
below was then read and confirmed by the lead in the code itself; nothing is
taken from a lane's summary alone. Sentry (org `volyume`, 90 days) holds no
error for `ReadinessCards`, `ConsistencyScreen`, `BlockProgressCard` or the
heatmap screen. Evidence rule: OBSERVED is what the code says; SUGGESTS is
the inference, labelled as such.

**Scope of this pass:** the two screens in the founder's screenshots in
depth (Volume heatmap, Consistency), the rest of the tab by inventory and a
first accuracy sweep (section 5). What was NOT audited in depth yet is named
in section 6.

---

## 1. Findings that are defects (fix, no product fork)

### F2. "This week's plan" renders empty bars and "/" for every row (Consistency)

OBSERVED. `src/components/BlockProgressCard.js:14` documents its input as
`blockProgress [{ muscle, label, actual, planned }]`; line 63 computes
`pct = p.planned > 0 ? Math.min(1, p.actual / p.planned) : 0`; line 79
renders `{p.actual}/{p.planned}`; the row name is `p.label`.
`src/hooks/useProgressData.js:237-254` (`loadBlockState`) fills that prop
with the RAW result of `getPlannedMuscleVolume(week.id)`, and
`src/lib/database.js:6248-6259` returns `SELECT * FROM planned_muscle_volume`
rows whose columns are `id, mesocycle_week_id, muscle, planned_sets, mev,
mav, mrv, source, created_at, updated_at` (`database.js:557-568`). No row
carries `planned`, `actual` or `label`.

SO (not an inference): every bar has `pct = 0`, every value renders as "/"
(React prints nothing for two undefined values around the slash) and every
row name is blank. The header "This week's plan · Effort 4/5" is right
because it reads `currentMesoWeek`, which is a different object.

HISTORY. The X15 note at `useProgressData.js:239-243` (2026-07-30) fixed the
call from `user.id` to `week.id`, which moved the card from "renders null
for every user" to "renders empty rows"; the card's contract was never
satisfied by this hook. `src/screens/HomeScreen.js:1276-1296` has the
correct mapper for the Home card (filter `planned_sets > 0`, map to
`{muscle, planned, actual, label}`, sort, top 8), so Home shows numbers and
Consistency does not, for the same data.

COVERAGE GAP. `src/components/__tests__/BlockProgressCard.test.js` feeds the
card hand-built `{planned, actual}` fixtures, and
`src/screens/__tests__/ConsistencyScreen.loadState.test.js` never returns a
planned row, so no test ever drove the real rows into the real card.

LEAD RULING (D33, best for the user; register D199). The plan row belongs
to a BLOCK week, not a calendar week: `src/lib/mesocycle.js:164-171`
(`getCurrentBlockWeekIndex` = floor(local days since the block start / 7)
+ 1). A block that starts on a Wednesday has weeks that run Wednesday to
Tuesday, so "actual" must count the sets logged inside THAT span, on both
surfaces. Home currently counts a rolling seven days (`HomeScreen.js:1276`,
`weekAgo = Date.now() - 7d`), which after a Monday session on a
Wednesday-started block credits the previous block week's work to this
one. Fix (lane F2, in flight at the time of writing): one pure helper,
`src/lib/blockWeekProgress.js` (`blockWeekSpan`, `buildBlockProgressRows`),
used by both surfaces; `getCurrentMesocycleWeek` gains `blockStartMs`
(additive); tests pin the helper, the block-week span across the UK clock
change, and, end to end, that the Consistency card renders "<actual>/<planned>"
from raw rows.

### F1. Volume heatmap: the 1, 2 and 4 week selector scales the sets but never the targets

OBSERVED. `src/screens/VolumeHeatmapScreen.js:153-168`: `windowMs =
windowWeeks * 7 * 24 * 60 * 60 * 1000`, sets filtered to `createdAt >=
windowStart`, then `calculateWeeklyVolume(recentSets, exerciseMap)`
(`src/lib/algorithms.js:270-303`), which simply sums the working sets it is
given. Lines 643-648 take `landmarks = effectiveLandmarks?.[muscle] ||
VOLUME_LANDMARKS[muscle]`, `mrv = landmarks.mrv || 20`, and line 644 calls
`getVolumeStatus(sets, muscle, effectiveLandmarks)`
(`algorithms.js:353-381`), whose bands (`< mev` below, `<= mev + 2` just
enough, `<= mav` good, `<= mrv` getting close, else too much) are WEEKLY
figures. Nothing multiplies or divides by `windowWeeks`. Line 727 prints
`/{mrv}`; line 689 reads the row to assistive tech as "`${sets} of ${mrv}
weekly sets`" whatever the window. The body diagram inherits the same
statuses (`volumeByMuscle`, lines 445-453, passed at 546), and the window
note (493-498) says only "Showing sets from the last 2 weeks".

SO. At 2 weeks a muscle trained at a good weekly level reads "Getting
close"; at 4 weeks it reads "Too much" and the figure turns red. The
screenshots show exactly this (Chest 12/32 green at 1 week, 19/32 at 2
weeks, 39/32 red at 4 weeks). "Too much" is a coaching verdict; at 2 and 4
weeks it is false for a normal load. That is the founder's "does not
represent directly or report correctly and change per selection".

COVERAGE GAP. No test drives the window buttons or asserts what a
denominator or status should be at 2 or 4 weeks (R1).

THE FORK (founder question Q1, section 4). The weekly landmarks are the
right bands; the question is what the multi-week windows should SHOW.

### F3. "Recovery" on the Consistency screen

OBSERVED. `src/screens/ConsistencyScreen.js:159` mounts `ReadinessCards`
under `!loading && hasData`, the same condition as the block section above
it (line 112), which did render in the screenshot. Inside
`src/components/ReadinessCards.js:143-332` there is no branch that returns
null once mounted: the "Recovery" `SectionLabel` (line 281) and the three
gauges (284-289) render unconditionally; only the milestone card
(`lastUnlocked || next`), the "Training recency" chips
(`freshnessEntries.length > 0`) and the trend insight
(`recoveryTrendInsight`) are conditional. The gauges show "N/A" with
"Nothing to show yet" or "After a couple of sessions" until at least two
RATED sessions exist inside the last 14 days
(`MIN_RATED_SESSIONS = 2`, lines 338-356; the 14-day bound at 188-191);
the recency chips need `getLastTrainedPerMuscle` rows; the trend insight
needs three weekly check-ins. The section sits between "This week's plan"
and the "Training load" card in render order. Sentry: no render error for
this component in 90 days.

SUGGESTS (two readings, the founder's device fact decides, Q2): (a) the
Recovery block is on screen with three "N/A" gauges and nothing else, which
reads as "recovery doesn't show"; this happens whenever the last two weeks'
sessions were finished without the post-session ratings (soreness, fatigue,
joint comfort) that are the ONLY input to the gauges; or (b) the block was
below the part of the screen the screenshots covered. There is no code path
in which the heading is absent while "This week's plan" is present.

Either way the surface fails the founder's "usable" bar: a section whose
three figures say N/A and whose caption says "Nothing to show yet" tells the
user nothing about what would fill it, and it ignores signals the app already
holds (the weekly check-in's soreness, energy and sleep scores in
`weekly_checkins_v2`, and the block's own recovery state). Proposals in
section 3.

---

## 2. Findings that are accuracy or consistency defects across the tab

### F4. Three definitions of "week" on the same screens (lead-verified on top of R4)

| Visible number | Screen | Week definition | Where |
|---|---|---|---|
| Heatmap sets per muscle and the "last N weeks" note | Volume heatmap | rolling N x 7 days from now | `VolumeHeatmapScreen.js:153-168` |
| Volume trend bars and takeaway | Volume heatmap | rolling 7-day buckets from now | `database.js:3955-3990` via `src/lib/weekWindows.js:3-11` |
| "Weekly load" sparkline (Now, -1w, -2w, -3w) on the plan card | Consistency | rolling 7-day buckets from now | `useProgressData.js:196-226` |
| "Training load" (this week kg, 4-wk avg, ratio) | Consistency | rolling 7-day buckets from now | `database.js:4076-4127` |
| Session length trend bars | Consistency | rolling 7-day buckets | `useProgressData.js:344-363` |
| Muscle frequency "this week" / "last week" | Consistency | Monday-anchored local week | `useProgressData.js:375-376`, `dayKey.js:130-136` |
| Volume snapshot feeding the landing's weekly strip | Progress landing | Monday-anchored local week | `useProgressData.js:256-267` |
| "Week N of M", the plan rows | Consistency, Home | block week (start date + 7-day steps) | `mesocycle.js:164-171` |
| Home "This week's plan" actual | Home | rolling 7 days | `HomeScreen.js:1276` (fixed by F2) |

SO. On a Sunday, "this week" on the muscle-frequency table is six days of
Monday-anchored data while "Now" on the load sparkline is the last seven
days, and "Week 3 of 6" is a third span again; two numbers labelled as the
same week on one screen can disagree for the same session. The T7 note at
`useProgressData.js:373-374` records an earlier decision to move "this week
vs last" surfaces to Monday-anchored weeks; the tonnage, workload and
duration bars were left on rolling buckets.

### F5. Two different "load" figures on one screen

OBSERVED. The plan card's sparkline is captioned "Weekly load"
(`src/components/ProgressSections.js:88`, kg moved per rolling week), and a
separate card below is titled "Training load" (`ProgressSections.js:268-331`,
the acute:chronic ratio with "This week (kg)" and "4-wk avg (kg)"). Both
are kg moved, both on rolling weeks, one is a bar row and one is a ratio,
and nothing on the screen says how they relate.

### F6. Copy that stops being true when the selection changes

- Heatmap row accessibility label "of N weekly sets" at 2 and 4 weeks
  (`VolumeHeatmapScreen.js:689`).
- The body-diagram legend "Below target / Good range / Getting close / Too
  much" (`BodyDiagramHeatmap.js:366-369`) keeps its weekly meaning at every
  window (consequence of F1).
- The division legend "▲ Elevated for Men's Physique · ▼ Capped"
  (`BodyDiagramHeatmap.js:378-388`) is accurate but does not say WHAT is
  elevated or capped (the weekly target for that muscle).

### F7. Coverage gaps that let F1 and F2 survive

No test drives the heatmap's window buttons or asserts a status per window
(R1); no test feeds `BlockProgressCard` from `useProgressData` with real
rows (F2); the Consistency load-state test never returns a planned row. The
F2 lane adds the end-to-end card test; the F1 fix must add the per-window
one.

---

## 3. Proposals (ranked; the lighter option is never the recommendation)

P1 (F2, building now). The block-week mapper and span on both surfaces,
with the end-to-end test. Also show every planned muscle on the Consistency
card (Home keeps its top eight, being a glance surface).

P2 (F1, Q1). Normalise the heatmap to the WEEKLY average inside the chosen
window and keep the weekly bands: bar, colour, status and the body figure
read "average sets per week over the last N weeks"; the row shows both
figures ("avg 10 / 32 per week · 39 sets in 4 weeks"); the divisor is the
number of weeks in the window that the account has actually existed for
(a ten-day-old account at "4 weeks" divides by two, not four, so a new user
is not told they are "Below target" everywhere); the ghost "previous window"
bar uses the same normalisation; the accessibility label says "average per
week". This keeps `getVolumeStatus` and the landmarks untouched (the bands
are weekly by definition) and makes every window a fair comparison.
Alternative (option B in Q1): scale the targets instead, "39 / 128 in 4
weeks", which is arithmetically the same verdict but shows large, unfamiliar
targets and understates a partial history the same way. Option C, totals
against weekly targets (today's behaviour), is wrong and stays out.

P3 (F3, Q2). Make Recovery always say something true and useful: (a) when
fewer than two rated sessions exist in 14 days, show the gauges greyed with
one line that names the input ("Rate soreness, fatigue and joint comfort
when you finish a session; the figures appear after two rated sessions")
and a one-tap "Rate your last session" path to the existing summary rating
row; (b) add the weekly check-in's soreness, energy and sleep as a second,
clearly labelled signal row when they exist (already stored in
`weekly_checkins_v2`); (c) fold the block's own recovery state (recovery
week in N weeks, or the recovery week now) into the same block so
"Recovery" is never empty for a person on a plan; (d) keep every ED/calm
withhold exactly as it is (none applies to these gauges today, and none is
added).

P4 (F4, Q3). One definition of "week" per meaning, applied across the tab:
block week for plan-versus-actual (Week N of M, This week's plan);
Monday-anchored local week for every "this week / last week" comparison
(muscle frequency, the landing strip, the load sparkline, the training-load
card, session length); rolling windows only where the user chooses a span
("last 4 weeks"), always labelled "last N days/weeks", never "this week".
The training-load ratio then compares the current calendar week (partial,
labelled "so far") with the previous four full weeks, which is also the
standard reading of an acute:chronic ratio.

P5 (F5). One load surface on Consistency: the sparkline stays on the plan
card as the picture, the ratio card becomes the explanation of the same
numbers ("this week so far vs your 4-week average"), titled the same way,
with the sparkline's "Now" bar and the card's "This week (kg)" guaranteed
to be the same figure.

P6 (F6). Copy: the row label and legend say "per week" at every window; the
division legend reads "▲ weekly target raised for Men's Physique · ▼ capped".

P7 (F7). The tests named in F7, landing with P1 and P2.

---

## 4. Founder questions (delivered in chat, recorded here)

Q1 (heatmap windows): A = weekly average with both figures shown, partial
history divisor (recommended, P2); B = scaled targets; C = keep totals
against weekly targets (not recommended).

Q2 (Recovery on your device): when you scroll the Consistency screen to
between "This week's plan" and "Training load", is there (1) a "Recovery"
heading with three "N/A" gauges, or (2) no "Recovery" heading at all? Your
answer decides whether P3 is the whole fix or whether a device-specific
render fault must be chased with a debug build.

Q3 (weeks): adopt P4 across the tab (recommended) or keep rolling weeks on
the load surfaces.

Q4 (order of the second pass): body metrics and weight trend, lifts and
e1RM, history and Year of lifts, the landing's recap, photos.

---

## 5. First accuracy sweep of the rest of the tab (R5, being verified)

Filled in from the R5 lane's report after lead verification; anything not
verified by the lead in the code is marked OBSERVED BY LANE.

---

## 6. Not audited in depth in this pass

`AnalyticsScreen` (the landing) sections beyond the volume strip, `RecapStory`,
`YearOfLiftsScreen`, `ProgressPhotosScreen`, `ShareCardScreen` and the
capability flows reached from the tab. Inventory only (R3). Second pass
proposed under Q4.
