# Cardio QA — 04: Competitor research (design + sentiment)

Status: COMPLETE. Timestamp: 2026-06-03. Sourcing note: the deep competitor
+ sentiment research was done in the integration audit and is cited in
`docs/audit/volyume-cardio-integration-2026-06-03/cardio-audit-02/03/04`. Two
fresh QA-angle searches this session returned little new signal
([Setgraph round-up](https://setgraph.app/ai-blog/best-gym-app-reddit) was the
only fresh hit), so this doc synthesises the established cited research against
the QA question "how does Volyume's built feature compare", rather than
re-citing thinly. No fabricated quotes.

---

## 1. Logging-flow benchmark (taps to a simple log)

| App | Simple-log flow | Taps | Source |
|---|---|---|---|
| Strava | pick sport → start/stop or manual duration | low; sport picker is the hub | [Strava types](https://support.strava.com/hc/en-us/articles/216919407) |
| Apple Fitness | pick workout type → auto | low | [DC Rainmaker](https://www.dcrainmaker.com/2025/01/apple-fitness-and-strava-integration-and-new-fitness-features.html) |
| MacroFactor | no activity log (energy balance) | n/a | [MF expenditure](https://help.macrofactorapp.com/en/articles/26) |
| RP Hypertrophy | none | n/a | [dr-muscle](https://dr-muscle.com/rp-hypertrophy-app-critique/) |
| **Volyume (built)** | activity → duration → intensity → save | **~4 taps** (favourite chip → +/- → segment → Save) | `LogCardioScreen` |

Volyume's log is competitive on speed for a favourite/recent activity (one tap
to pick, then duration + intensity + save). Where the activity-first apps win is
that the sport list is the **home** of the feature, not a modal reached from
elsewhere; Volyume reaches the log from the Train card / Plans / Diary, which is
fine for a lifting-first app.

## 2. Activity-library design

The activity-first apps (Strava 50+ types, Garmin device-defined, Apple native
types) all present a **flat, searchable, favourite-able** list and let the user
pick. Volyume's 36-activity categorised list + search + favourites/recents
matches this pattern at the right scale for a lifting app (the integration audit
deliberately chose ~36 over a 1000-row sport DB). No competitor evidence
suggests Volyume is too small or too large here.

Gap vs the best: the activity-first apps show a **glyph/illustration per
activity** and remember per-activity defaults (last duration/intensity). Volyume
remembers nothing per activity yet (duration always defaults to 30; intensity to
the activity's `default_intensity`). Per-activity "last used" defaults are a
cheap, high-value polish the best apps all do.

## 3. Calorie display

MyFitnessPal-style add-back is widely criticised for encouraging over-eating;
MacroFactor markets the energy-balance opposite as a selling point
([MF wearables](https://help.macrofactorapp.com/en/articles/33)). **Volyume is
on the correct side of this** (kcal feedback only, never added). The one risk is
showing "~320 kcal" in the Diary next to food without the clarifier the log
screen has, which could read as an add-back to a user trained by MFP (see
cardio-qa-05).

## 4. Integration "native vs bolt-on" sentiment

The recurring theme across the cited research: cardio feels bolted on when it
lives in a separate area with different design, and integrated when it shares
the app's surfaces and the coach reasons about it
(integration audit `cardio-audit-03`). Volyume's surfaces (Train card mirrors
StepsCard, Diary row mirrors WaterRow, Plans card matches the Plans cards) are
visually native. The bolt-on risk in Volyume is **behavioural, not visual**:
the coach does not yet reason about the cardio the user logs (cardio-qa-03 CI-1),
which is exactly the "captured but unused" pattern users complain about in
strength apps that tacked cardio on.

## 5. The single best implementation, and what it does that Volyume does not

From the cited research, **MacroFactor** is the best *calorie* model (no
add-back, expenditure self-corrects) and Volyume already matches it.
**Strava/Apple** are the best *activity-logging* experience; what they do that
Volyume does not: (a) per-activity remembered defaults, (b) an activity glyph so
the list scans visually, (c) the activity list is the feature's home. None of
these are behavioural bugs; they are polish that would lift Volyume's log from
"good" to "elite".

The thing **no app does well** that Volyume is uniquely placed to do: use the
logged cardio as a real coaching lever (compliance → next target; load →
training caution) inside a physique-coaching loop. Volyume has built the engine
for this; it is just not wired (cardio-qa-03). Closing that is the biggest
differentiator available, bigger than any UI polish.
