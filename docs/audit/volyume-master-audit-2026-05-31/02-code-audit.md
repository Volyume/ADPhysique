# 02 — Line-by-line code audit

Status: **IN PROGRESS**
Date: 2026-05-31
Branch: `main` @ `a4bf964`

> **Method (post-retraction discipline).** A prior version of this file
> presented findings from sub-agents that had not reported, and several
> "[VERIFIED]" claims did not match source. That version is gone. **Every
> finding below was produced by reading the cited lines in this session.**
> Each finding names the file and line and, where useful, quotes the code.
> If a line cannot be quoted from a read I performed, it is not here.
>
> **Files read in full so far:** `App.js` (1–768).
> **Next:** `src/navigation/RootNavigator.js`, `src/store/useAppStore.js`,
> `src/styles/theme.js`, `src/lib/supabase.js`, then the large lib/screen files.

The prior session's correctly-verified facts (re-checked by me where noted)
are retained at the bottom under "Carried verified facts."

---

## `App.js` (root component, 768 lines) — read in full

**Purpose (from code):** installs global error handlers (`:19`), inits
Sentry via lazy require (`:25-35`), wires Play Billing (`:42-46`),
defines two background TaskManager tasks (rest-timer keepalive `:55-61`,
daily sync `:73-91`), sets the notification handler (`:95-107`), boots
accessibility/theme/observability, handles auth deep links, and renders
the provider tree + `RootNavigator` (`:722-767`).

### Findings

**A2-001 — Duplicate sync paths fire on every foreground (perf + correctness risk).**
There are **two separate `useEffect`s that each register their own
`AppState` `'change'` listener and both trigger cloud sync**:
- `:445-596` — `maybeSync()`, registered at `:561`, runs on `state ===
  'active' || 'background' || 'inactive'` (`:588-590`). It calls
  `bulkUploadLocalData` (`:477-478`), `drainSyncQueue` (`:488-489`),
  `importNewWeights` (`:501-502`), `recordTodaySteps` (`:509-510`),
  `flushPendingFeedback` (`:519`), a Year-of-Lifts query (`:536-542`),
  and telemetry (`:469`, `:554`). Throttled to once / 60s (`:448,451`).
- `:605-670` — `callSyncAll()`, registered at `:641`, runs on `state ===
  'active'` (`:642`) and calls `syncAll(...)` (`:622-623`) **plus**
  `importNewWeights` again (`:633`). Also fires on NetInfo reconnect
  (`:649-655`) and a 15-min interval (`:662`).

On each return to foreground, **both** `maybeSync` (→ `bulkUploadLocalData`)
and `callSyncAll` (→ `syncAll`) run. Per the prior session's grep
(carried below), `syncAll` itself calls back into `bulkUploadLocalData +
pullFromCloud`. So `bulkUploadLocalData` is plausibly invoked **twice per
foreground**, and `importNewWeights` is invoked twice (`:501` and `:633`).
The 60s throttle only guards `maybeSync`, not `callSyncAll`.
→ **To confirm in `sync.js` audit:** whether `syncAll` and the direct
`bulkUploadLocalData` call de-dupe (the comment at `:598-604` claims the
runner "has its own in-memory lock so concurrent calls dedupe" — must be
verified against `sync/runner.js`). Severity depends on that lock.
Even if de-duped, two `getSession()` round-trips fire per foreground
(`:455` and `:617`).

**A2-002 — `maybeSync` also fires on `'inactive'`, contradicting its own comment.**
Comment `:581-587` says "Fire on BOTH foreground (active) and
backgrounding (inactive/background)", but the guard `:588` includes
`'inactive'` explicitly. On iOS, `'inactive'` fires on transient events
(Control Center pull, incoming call, app-switcher peek), so `maybeSync`
is attempted on those too. The 60s throttle limits damage, but the
intent/condition mismatch is real. Low severity.

**A2-003 — `WhatsNewSheet` render is dead code (`{false && (…)}`).**
`:747` renders `{false && (<WhatsNewSheet …/>)}`. The whole
`whatsNewItems` array (`:701-720`) and the `onOpenSettings` handler
(`:750-758`) are consequently unreachable at runtime. The comment
(`:740-746`) says this is intentional ("Suppressed for the initial
launch"). **Classify: dormant/intentional dead code** — not a bug, but
it is shipped, parsed, and a maintenance carry. Flag for Phase 11 as a
"keep behind a flag vs. remove" decision, not a defect.

**A2-004 — Auth deep-link errors are silently swallowed.**
`handleAuthDeepLink` (`:133-164`) wraps both the PKCE
`exchangeCodeForSession` (`:142`) and the implicit `setSession` (`:157-160`)
in `try { … } catch (_) {}` with empty bodies. If an auth callback fails
(expired code, network), the user taps the email link and **nothing
happens, with no error surfaced**. Severity: medium for the auth journey
(Phase 3/10 follow-up) — a failed confirmation link is invisible.

**A2-005 — `importNewWeights` duplicated across both sync effects.**
Called at `:501-502` (inside `maybeSync`) and again at `:633-634`
(inside `callSyncAll`). Both are gated only on `localUserId`, both
fire-and-forget. Redundant health read on every foreground. Low severity
(self-gates on permission + incremental), but a clear duplication.

**A2-006 — Heavy fire-and-forget `.catch(() => {})` density.**
Throughout the sync effects (`:478, :489, :502, :510, :521, :542, :557`,
etc.) every async call is fire-and-forget with empty catches. This is a
deliberate "tolerate offline" pattern (comments say so), but it means
**no sync failure is ever observable** to the user or to telemetry beyond
the explicit `track()` calls. Noted for Phase 5 (observability) and
Phase 10 (does the user ever learn sync is failing?). Not a defect per se.

**A2-007 — Two background-task definitions at module scope; daily-sync uses legacy path.**
`VOLYUME_DAILY_SYNC` (`:73-91`) calls `bulkUploadLocalData` directly
(`:85`) — the legacy push path, not `syncAll`. So the background task and
the foreground `callSyncAll` use **different sync entry points**. Worth
confirming (Phase 5) that the background path doesn't miss the
pull/queue-drain that the foreground path does (`drainSyncQueue` is only
in `maybeSync`, not in the background task).

### Positive observations (verified, not defects)
- `ErrorBoundary` (`:172-217`) uses literal hex, not theme tokens, with
  an explicit comment (`:219-224`) explaining this avoids re-crashing if
  the theme layer is what failed. Sound reasoning.
- Accessibility theme bake is gated before `RootNavigator` require
  (`:328-330`, `:672-683`) with a clear comment on why (`:109-114`).
  Correct ordering for the "frozen StyleSheet" problem described.
- Notification handler only sounds the `rest-done` channel in foreground
  (`:99-105`) — intentional, matches the rest-timer UX.

---

## Carried verified facts (from prior session; to be re-confirmed at each file's audit)

These were stated as re-read-verified in the retracted doc's retraction
section. I have **not yet personally re-read** these lines this session,
so they are carried as *prior-verified, pending my re-read* — not as my
own findings yet:
- Migration runner correct: `database.js:1152-1175` (bumps `user_version`
  only inside `try` after `m.up()`).
- `supabase.js` env-only, no fallback creds, returns `null` when
  unconfigured (`:24-54`); session in `expo-secure-store` (`:5-17`).
- Food sources have `AbortController` timeouts + env keys: `usda.js:26-48`,
  `liveOff.js:24-30`.
- `sync.js` is a facade layering over modular `sync/`; one push + one pull
  path; no `UPDATE … SET user_id` in `src/`.

I will re-verify each of these when I read the file in full and either
promote it to a confirmed finding or flag a discrepancy.
