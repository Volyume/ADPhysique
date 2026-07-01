/**
 * notifications/handler.js
 *
 * Foreground delivery handler for expo-notifications. The OS calls
 * handleNotification just before showing a notification while the
 * app is alive. We use that window to suppress notifications whose
 * action has already been completed today / this week (logged
 * weight, completed check-in, trained today). The point: don't
 * pester the user with "log your weight" 30 minutes after they
 * logged it.
 *
 * Call configureNotificationHandler once on app start.
 */

import * as Notifications from 'expo-notifications';

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const dataType = notification?.request?.content?.data?.type;
      try {
        // morning_weight now fires with sound (Q1), and the evening backstop is
        // a second daily weight prompt — so both stand down once the weight is
        // logged AND under an open ED flag (a loud/repeated weigh-in prompt at a
        // flagged user is the harm pattern; suppression here is protection, it
        // never weakens a floor or threshold).
        if ((dataType === 'morning_weight' || dataType === 'evening_weight')
            && (await _alreadyLoggedWeightToday() || await _edFlagOpen())) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'weekly_checkin' && await _alreadyCheckedInThisWeek()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'training_reminder' && await _alreadyTrainedToday()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        // OPP-C03 follow-ups: stand down if the user has in fact checked in
        // recently (the episode resolved after the pair was laid), and stay
        // silent entirely under an open ED flag (suppression consumed here,
        // never altered).
        if (dataType === 'checkin_missed'
            && (await _checkedInRecently() || await _edFlagOpen())) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
      } catch (_) {
        // Fall through to showing the notification on any DB error.
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
}

async function _alreadyLoggedWeightToday() {
  try {
    // eslint-disable-next-line global-require
    const { getMorningWeightToday } = require('../database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const entry = await getMorningWeightToday(uid);
    return !!entry?.weightKg;
  } catch (_) { return false; }
}

async function _alreadyCheckedInThisWeek() {
  try {
    // eslint-disable-next-line global-require
    const { getLatestCheckin } = require('../database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    // NOTIF-3: anchor the week on the LOCAL Monday, matching _alreadyTrainedToday
    // and the rest of the app. The old UTC anchor disagreed with the local
    // day/week used everywhere else, so suppression fired for the wrong week
    // for users not at UTC+0.
    const d = new Date();
    const daysFromMon = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monMs = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysFromMon).getTime();
    const ci = await getLatestCheckin(uid, monMs);
    // A row can exist from a completed workout (which contributes only
    // sleep_quality), so bare presence is not "checked in". A real weekly
    // check-in always sets an energy score, so gate on that, otherwise the
    // reminder is wrongly suppressed for a user who trained but never checked in.
    return !!(ci && ci.energyScore != null);
  } catch (_) { return false; }
}

// A real check-in (energy score present, same rule as the reminder skip) in
// the last 72 hours means the missed-check-in episode the follow-up was laid
// for has been resolved; the push must not pester them.
async function _checkedInRecently() {
  try {
    // eslint-disable-next-line global-require
    const { getLatestCheckin } = require('../database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const ci = await getLatestCheckin(uid);
    if (!ci || ci.energyScore == null) return false;
    const madeAt = ci.createdAt ?? ci.weekStart ?? 0;
    return madeAt >= Date.now() - 72 * 60 * 60 * 1000;
  } catch (_) { return false; }
}

async function _edFlagOpen() {
  try {
    // eslint-disable-next-line global-require
    const { getOpenEdPatternFlag } = require('../database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    return !!(await getOpenEdPatternFlag(uid));
  } catch (_) { return false; }
}

async function _alreadyTrainedToday() {
  try {
    // eslint-disable-next-line global-require
    const { getAllWorkouts } = require('../database');
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState().user?.id;
    if (!uid) return false;
    const all = await getAllWorkouts(uid);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return all.some(w => w.isCompleted && w.startedAt >= todayStart.getTime());
  } catch (_) { return false; }
}
