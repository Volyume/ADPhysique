⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# F3 Spec — "Did your day go to plan?" planned-meal confirm reminder (push)

> Extends `docs/NOTIFICATIONS_LOCKED.md` (the PROPOSED ADDENDUM, "new pushes ship
> only within this budget; founder reviews at PR"). Founder decision 2026-06-16:
> add a push reminder so users confirm planned meals they logged but never marked
> as eaten ("ate as planned"). Spec-first because notifications are a locked,
> budgeted, safety-aware system. NOT built until founder signs off.

## WHY
Planned meals are scaffolding (`is_planned=1`) until the user confirms they ate
them (`confirmPlannedDay`, flips to a real entry that counts toward adherence/the
coach). The confirm action already exists in-app (the Diary banner "Ate as
planned", and the weekly check-in's retroactive confirm). The gap is a gentle
proactive nudge when a day's planned meals sit unconfirmed — in case the user
forgot. Keeping them confirmed keeps the coach's adherence read accurate.

## THE PUSH (proposed inventory row)
| Push | Category (code) | Class | Trigger | Frequency cap |
| --- | --- | --- | --- | --- |
| Planned meals to confirm | `planned_meal_confirm` | Event | 20:00 local, only if TODAY has unconfirmed planned meals (`is_planned=1`) and the user has not opened/confirmed them | 1 per day (one per topic per day) |

- **Pro only** (food/diary is a Pro domain), default ON, with a disable toggle in
  Settings → Coaching reminders (the same group as `checkin_missed`).
- **Event-class**, so it requests a slot through `budget.js` (counts toward the
  ≤2 event/day, ≤8/week budget).
- Self-suppresses at delivery if, by 20:00, the day has no unconfirmed planned
  meals (they confirmed or cleared them) — like the habit reminders' "action
  already done" suppression.

## SAFETY / SUPPRESSION (all inherited, must hold)
- **Open ED/wellbeing flag suppresses it** at schedule AND delivery (it is a
  food/eating push — silence is the respectful behaviour). Non-negotiable.
- Quiet hours always win (shift after the window).
- One per topic per day; budget-gated; ED-flag never itself pushes.
- No shame copy ("you forgot" / "you missed" banned).

## COLLISION PRIORITY
Insert LOW (it is a gentle, non-urgent nudge). Proposed placement: below
`monthly_recap`, above `partner_cheer` — i.e. it loses its slot to anything more
important on a busy day. Updated order:
1 cascade_gate · 2 weekly_coach_ready · 3 checkin_missed · 4 trial_day3 ·
5 winback · 6 year_of_lifts_unlock · 7 monthly_recap · **8 planned_meal_confirm** ·
9 partner_cheer.

## COPY (British, warm, no shame, no em dashes)
```
Title: Did your day go to plan{, First}?
Body:  If you ate your planned meals, tap to confirm them so your coach stays accurate.
```

## ROUTING
Tap → Diary on today's date (where the "Ate as planned" banner + confirm live).
Add the route in `src/lib/notifications/notificationRoute.js` (e.g.
`{ tab: 'DiaryTab', screen: 'Diary', params: { date: <today> } }`), mirroring the
existing `Consistency`/check-in routes.

## IMPLEMENTATION (files)
- `src/lib/notifications/categories.js` — add the `planned_meal_confirm` category
  (Pro, default on, disable path).
- `src/lib/notifications/budget.js` — add to collision priority at rank 8.
- scheduler — lay it for 20:00 local when today has unconfirmed planned meals;
  cancel/skip when none. Reuse the unconfirmed-days query (`db.js:205`,
  `getDaysWithUnconfirmed...`) / `is_planned` check.
- `src/lib/notifications/notificationRoute.js` — tap route to the Diary day.
- Telemetry: existing `notification_sent|tapped|failed` with the new category; no
  new event names.
- Settings → Coaching reminders: add the toggle.

## OPEN DECISIONS FOR FOUNDER
- D-f3-1: Time — 20:00 local (matches the diary "evening" rhythm and `checkin_missed`)? Or the user's own meal/check-in hour?
- D-f3-2: Scope — today only (recommended), or also nudge once for an unconfirmed PAST day the next evening?
- D-f3-3: Title personalisation "{, First}" — keep consistent with the other pushes (recommended yes).

## TESTS (write-to-fail)
ED-flag suppresses at schedule + delivery; quiet-hours shift; budget slot
requested + evicts correctly at priority 8; self-suppress when no unconfirmed
planned meals at delivery; Pro-gated; disable toggle honoured; route resolves to
the Diary day; deterministic.
