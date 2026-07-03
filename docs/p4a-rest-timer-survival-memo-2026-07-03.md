# P4A — Android rest-timer survival: final memo (decision taken and built)

Date: 2026-07-03. This finalises the P4 Part A memo. Evidence base:
`docs/rest-timer-android-survival-DRAFT.md` (2026-07-02, kept as the
evidence appendix). The founder approved the recommended path on
2026-07-02 and the build shipped (commits de1cb95 + 45d8a22); this memo
records the decision, the as-built posture and the honest residual limits.

## The constraint
Improve rest-timer/session survival WITHOUT any health runtime permission
and WITHOUT any Play-sensitive declaration. The old path died because
Android 14 rejects the 'health' FGS type without a health permission this
app will never request.

## Options evaluated (full analysis in the draft)
1. **health-type FGS** — dead on arrival (the constraint itself).
2. **specialUse FGS** — requires a Play Console declaration form with
   per-use-case approval; pessimistic Play-review posture; rejected.
3. **shortService FGS** — no type-specific permission, no Play declaration;
   OS-enforced ~3-minute ceiling per instance, deadline fixed at
   startForeground. CHOSEN for short rests.
4. **Exact alarms (SCHEDULE_EXACT_ALARM)** — user-grantable on Android 13+
   (not the Play-restricted USE_EXACT_ALARM, which is never declared);
   expo-notifications upgrades scheduling automatically when granted.
   CHOSEN for rest-end alert precision.
5. **Keep current behaviour + explain** — the fallback that remains for
   everything outside 3-4's coverage.

## What shipped (as built)
- **Exact rest-end alerts**: `SCHEDULE_EXACT_ALARM` declared; a one-time
  in-context prompt at the first rest (never again after either answer;
  permanent surface in Settings > "Make rest alerts exact"); alarm-based
  alerts land to the second when granted, inexact-window otherwise.
- **shortService FGS for short rests** (rest windows up to ~170s): a fresh
  service instance per re-anchor because notify() can never extend the
  fixed OS deadline; a foregroundedAtMs-anchored self-stop cap so the OS
  timeout is never hit blind; both onTimeout signatures handled;
  unconditional stops on teardown and window exit; deadline-aware sticky
  suppression so the fallback notification never doubles up.
- **Long rests** keep the existing sticky-notification path unchanged.

## Honest residual limits
- **Force stop survives nothing**, by OS design — alarms cancelled,
  services stopped. No path changes this; the app repairs state on next
  launch (restore machinery).
- Rests longer than the shortService window rely on the scheduled
  notification (exact when granted); the in-app countdown recomputes from
  the wall-clock anchor on return, so time is never lost, only the live
  lock-screen tick.
- Aggressive OEM reapers (MIUI/EMUI class) can still kill early;
  alarm-scheduled notifications are the survivor there, and they shipped.

## Founder actions
Device-walk on the next EAS build (checklists in commits de1cb95/45d8a22):
grant the exact-alarm prompt path, deny path, shortService lock-screen
behaviour during a 90s rest, and the sticky fallback on a 5-minute rest.
