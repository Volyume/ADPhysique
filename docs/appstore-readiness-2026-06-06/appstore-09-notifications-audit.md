# Phase 9: Push / notification compliance

Status: COMPLETE. Date 2026-06-06.

## Implementation
- `expo-notifications` with a dedicated module: `src/lib/notifications/`
  (`permissions.js`, `scheduler.js`, `trainingReminders.js`, `index.js`), tested
  (`src/lib/__tests__/notifications.*.test.js`).
- Local scheduled notifications drive training reminders and the cascade-gate
  reminders. These work without any server.

## Permission timing (Apple's preference)
- Permission is requested CONTEXTUALLY, not on first launch. Trigger points:
  `WeeklyCheckInScreen`, `CoachingRemindersScreen`, `ProOnboardingScreen`,
  `NotificationSettingsScreen` (i.e. when the user opts into reminders), via
  `requestNotificationPermissions()`. This matches Apple's guidance to ask at a
  moment the value is clear. PASS.
- Denial handled: `permissions.js` resolves to 'denied'/'undetermined' and the
  scheduler no-ops without throwing (tests cover the throw path). Graceful. PASS.

## User control
- `NotificationSettingsScreen` lets users manage reminder preferences in-app.
  PASS.

## Remote push (APNs)
- The app declares `remote-notification` background mode and has push entitlement
  in the build, but the APNs auth key is NOT set up (per the build handoff), so
  remote/server push will not deliver yet.
- FINDING-M5 (Medium, not a submission blocker): either (a) finish remote push by
  adding the APNs key (needs Apple ID cookie auth on EAS or expo.dev), or (b) if
  v1 ships local-notifications-only, that is fine and nothing breaks. Just do not
  market remote push, and consider whether `remote-notification` background mode
  should stay declared (Phase 3 L4).
- Payload formatting and the foreground handler are runtime-critical per CLAUDE.md
  rule 5; they are tested. No malformed-payload risk found.

## Severity
No notification blockers. Permission UX is exemplary (contextual + graceful
denial). M5 is the remote-push decision, deferrable.
