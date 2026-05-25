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
        if (dataType === 'morning_weight' && await _alreadyLoggedWeightToday()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'weekly_checkin' && await _alreadyCheckedInThisWeek()) {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        if (dataType === 'training_reminder' && await _alreadyTrainedToday()) {
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
    const d = new Date();
    const daysFromMon = (d.getUTCDay() + 6) % 7;
    const monMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - daysFromMon * 86400000;
    const ci = await getLatestCheckin(uid, monMs);
    return !!ci;
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
