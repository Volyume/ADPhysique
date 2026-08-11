// Pro coaching reminders, morning weight + weekly check-in.
//
// These reminders feed the Precision Coaching loop and are non-optional
// for Pro users (you can't run the coach without the morning weight
// trend or weekly check-in answers). Previously they lived in
// NotificationSettingsScreen alongside Free-tier training reminders,
// with on/off toggles, but the toggles were misleading. The user has
// to keep them on for the app to work as designed, so the toggle just
// added a way to break the experience.
//
// This screen exposes only the day + hour pickers. Both reminders are
// always scheduled. Toggle removed. Lives in Settings > Coaching
// reminders (Pro-only row).

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import {
  scheduleMorningWeightNotification,
  scheduleEveningWeightReminder,
  scheduleCheckinReminder,
  scheduleMissedCheckinFollowups,
  cancelMissedCheckinFollowups,
  schedulePlannedMealConfirm,
  cancelPlannedMealConfirm,
  cancelMorningNotification,
  cancelCheckinNotification,
  requestNotificationPermissions,
} from '../lib/notifications';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import SectionLabel from '../components/SectionLabel';
import Chip from '../components/Chip';
import { setPreference as setPrefRow } from '../lib/notifications/preferences';
import { getQuietHours, shiftHourMinuteOutOfQuietHours } from '../lib/notifications/quietHours';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const HOURS_MORNING = [5, 6, 7, 8, 9, 10, 11, 12];
const HOURS_EVENING = [14, 15, 16, 17, 18, 19, 20, 21];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatDayHour(dayIndex, hour) {
  return `${DAYS[dayIndex]} at ${formatHour(hour)}`;
}

function computeNextCheckinFireDate(weekday, hour, minute, lastCheckinMs, minGapDays = 7) {
  const after = new Date();
  const target = new Date(after);
  const currentDow = target.getDay();
  let daysUntil = (weekday - currentDow + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (daysUntil === 0 && target.getTime() <= after.getTime()) daysUntil = 7;
  target.setDate(target.getDate() + daysUntil);
  if (lastCheckinMs > 0 && minGapDays > 0) {
    // Correctness fix: lastCheckinMs is the reviewed week's Monday-anchored
    // weekStart (saveWeeklyCheckin stores weekStart, not the submit date),
    // not the actual day the check-in fired on. Measuring the gap straight
    // off that Monday pushed the displayed next-check-in date a whole week
    // later than the true next occurrence whenever the configured check-in
    // weekday falls before Monday in the week (e.g. Sunday, day 0): the
    // correct next Sunday sits only 6 days after that Monday, reads as
    // "too soon" against a 7-day gap measured from the Monday itself, and
    // gets bumped an extra week. Normalise lastCheckinMs onto the SAME
    // configured weekday first, so the gap is measured check-in-day to
    // check-in-day, matching what the check-in screen's own "come back on
    // [day]" gate assumes.
    const lastAnchor = new Date(lastCheckinMs);
    const lastDow = lastAnchor.getDay();
    lastAnchor.setDate(lastAnchor.getDate() + ((weekday - lastDow + 7) % 7));
    const earliest = lastAnchor.getTime() + minGapDays * 24 * 60 * 60 * 1000;
    while (target.getTime() < earliest) target.setDate(target.getDate() + 7);
  }
  return target;
}

function formatNextFire(date) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} at ${formatHour(h)}${m === '00' ? '' : ':' + m}`;
}

async function applyScheduled(prefs, permissionStatus) {
  // Always cancels and reschedules BOTH coaching reminders (no toggles).
  // Training reminders are independent and managed by NotificationSettings.
  //
  // Cancel ONLY the two notifications this screen owns (morning weight +
  // weekly check-in). Previously this called cancelAllNotifications(), which
  // wiped every scheduled notification laid elsewhere (cascade gates, trial
  // day-3, win-back, weekly coach-ready) until the next launch re-laid them,
  // the historic wipe-bug class NotificationSettingsScreen already fixed.
  // Each schedule* helper self-cancels its own ID too, so the explicit
  // cancels here only matter for the permission-not-granted case.
  await cancelMorningNotification();
  await cancelCheckinNotification();
  if (permissionStatus === 'granted') {
    await scheduleMorningWeightNotification(prefs.morningHour, prefs.morningMinute);
    // Q1: evening weigh-in backstop rides the same toggle (self-gates on ED flag).
    await scheduleEveningWeightReminder();
    await scheduleCheckinReminder(
      prefs.checkinDay, prefs.checkinHour, prefs.checkinMinute,
      { lastCheckinMs: prefs.lastCheckinMs ?? 0, minGapDays: 7 },
    );
  }
  // Merge over the existing blob so keys this screen doesn't own
  // (missedCheckinEnabled, coachReady, training) survive a save here.
  let existing = {};
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) existing = JSON.parse(raw) ?? {};
  } catch (_) {}
  // eslint-disable-next-line global-require
  try { require('../lib/sync').notePrefWrite(NOTIF_PREFS_KEY); } catch (_) {} // C6 S-2 (D97-23)
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({
    ...existing,
    ...prefs,
    morningEnabled: true,
    checkinEnabled: true,
  }));
  // Mirror into the per-category SQLite rows so the registry-driven sync
  // push (src/lib/sync/tables/notificationPreferences.js) has a fresh
  // row to ship to the cloud notification_preferences table (migration
  // 044). This is the LIVE and only writer for morning_weight /
  // weekly_checkin_reminder. NotificationSettingsScreen.applyNotifications
  // used to do this mirroring, but it was unreachable and left the cloud rows
  // frozen at whatever migrateFromLegacyBlob first back-filled; the mirror
  // moved here under D94-1 and the dead path was deleted under D95. Same
  // shape that path wrote.
  try {
    const userId = useAppStore.getState().user?.id;
    if (userId) {
      const morningTime =
        (prefs.morningHour ?? 8).toString().padStart(2, '0')
        + ':' + (prefs.morningMinute ?? 0).toString().padStart(2, '0');
      const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][prefs.checkinDay ?? 0];
      const checkinTime =
        (prefs.checkinHour ?? 18).toString().padStart(2, '0')
        + ':' + (prefs.checkinMinute ?? 0).toString().padStart(2, '0');
      await setPrefRow(userId, 'morning_weight', { enabled: true, time_pref: morningTime });
      await setPrefRow(userId, 'weekly_checkin_reminder', {
        enabled: true,
        time_pref: `${dow}_${checkinTime}`,
      });
    }
  } catch (_) { /* tolerate; AsyncStorage write already succeeded */ }
  // OPP-C03: the check-in day/time may have changed, so re-lay the
  // missed-check-in follow-up pair against the freshly saved schedule
  // (the helper self-cancels its own pair and self-guards on tier,
  // toggle and ED flag).
  if (permissionStatus === 'granted') {
    try {
      await scheduleMissedCheckinFollowups(useAppStore.getState().user?.id ?? null);
    } catch (_) {}
  }
}

function ChipRow({ items, selected, onSelect, formatter = (v) => String(v), accessibilityName = 'option' }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.map(item => {
        const value = typeof item === 'object' ? item.value : item;
        const label = typeof item === 'object' ? item.label : formatter(item);
        const isSelected = value === selected;
        return (
          <Chip
            key={value}
            label={label}
            selected={isSelected}
            onPress={() => onSelect(value)}
            accessibilityRole="radio"
            accessibilityLabel={`${accessibilityName} ${label}`}
            style={styles.chip}
          />
        );
      })}
    </ScrollView>
  );
}

export default function CoachingRemindersScreen() {
  const toast = useToast();
  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  // Memoised: this screen renders mapped ChipRow options.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [morningHour, setMorningHour] = useState(7);
  const [morningMinute, setMorningMinute] = useState(0);
  // PM-05 (D96): Sunday, matching the eight other readers of this preference
  // (WeeklyCheckInScreen's gate, scheduler.js, coachLedger, HomeScreen,
  // YouScreen). This screen alone defaulted to Monday, so a user whose prefs
  // blob has no checkinDay was told two different check-in days by two
  // screens, and touching any control here silently moved their check-in day
  // to Monday.
  const [checkinDay, setCheckinDay] = useState(0); // Sun
  const [checkinHour, setCheckinHour] = useState(18);
  const [checkinMinute, setCheckinMinute] = useState(0);
  const [lastCheckinMs, setLastCheckinMs] = useState(0);
  // OPP-C03: the missed-check-in follow-up pair. Optional (default on),
  // unlike the two coaching reminders above.
  const [missedEnabled, setMissedEnabled] = useState(true);
  const [plannedConfirmEnabled, setPlannedConfirmEnabled] = useState(true);
  // #12: partner-cheer pushes (cheer received, shared streak kept, partner
  // joined) read prefs.partnerCheerEnabled at send time (scheduler.js:1448)
  // and only suppress when it is explicitly false, so default ON here
  // preserves current behaviour for every existing user (an absent flag
  // already reads as enabled).
  const [partnerCheerEnabled, setPartnerCheerEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState(null);
  // C5-P28-01 (D96): quiet hours (default 22:00 -> 07:00) silently shift a 5 AM
  // or 6 AM weigh-in reminder to 07:00 at schedule time, while this screen kept
  // rendering "Notification at 5 AM". The rule is locked and unchanged; what
  // changes is that the screen states the time the reminder actually arrives.
  const [quietHours, setQuietHoursState] = useState(null);
  const [saved, setSaved] = useState(false);
  const debounceTimer = useRef(null);
  const savedTimer = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs.morningHour !== undefined) setMorningHour(prefs.morningHour);
          if (prefs.morningMinute !== undefined) setMorningMinute(prefs.morningMinute);
          if (prefs.checkinDay !== undefined) setCheckinDay(prefs.checkinDay);
          if (prefs.checkinHour !== undefined) setCheckinHour(prefs.checkinHour);
          if (prefs.checkinMinute !== undefined) setCheckinMinute(prefs.checkinMinute);
          if (prefs.missedCheckinEnabled !== undefined) {
            setMissedEnabled(prefs.missedCheckinEnabled !== false);
          }
          if (prefs.plannedMealConfirmEnabled !== undefined) {
            setPlannedConfirmEnabled(prefs.plannedMealConfirmEnabled !== false);
          }
          if (prefs.partnerCheerEnabled !== undefined) {
            setPartnerCheerEnabled(prefs.partnerCheerEnabled !== false);
          }
        }
      } catch (_) {}

      try {
        const { getLatestCheckin } = require('../lib/database');
        const userId = useAppStore.getState().user?.id;
        if (userId) {
          const latest = await getLatestCheckin(userId);
          if (latest?.weekStart) setLastCheckinMs(latest.weekStart);
        }
      } catch (_) {}

      // C5-P27-01 (D96) considered and deliberately NOT changed here: the
      // ruling covers Settings > Notifications, which prompts a user who
      // arrived only to look. This screen is reached by choosing "Coaching
      // reminders", so the intent is present, and it is the ONLY place a Pro
      // user with an undetermined status can grant permission for the two
      // reminders it owns. Removing the prompt would leave them no way in.
      try {
        const q = await getQuietHours();
        setQuietHoursState(q);
      } catch (_) { /* the effective-time note simply does not render */ }

      try {
        const status = await requestNotificationPermissions();
        setPermissionStatus(status);
      } catch (_) {
        setPermissionStatus('denied');
      }
    }
    init();
  }, []);

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  function scheduleApply(next) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await applyScheduled({
          morningHour: next.morningHour ?? morningHour,
          morningMinute: next.morningMinute ?? morningMinute,
          checkinDay: next.checkinDay ?? checkinDay,
          checkinHour: next.checkinHour ?? checkinHour,
          checkinMinute: next.checkinMinute ?? checkinMinute,
          lastCheckinMs,
        }, permissionStatus);
        // Existing inline "Saved" indicator stays for users who prefer
        // explicit on-screen confirmation; toast is the modern overlay
        // for users scrolling away from the section.
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2000);
        toast.show('Reminder schedule saved', { variant: 'success' });
      } catch (_e) {
        toast.show('Could not save reminder', { variant: 'error' });
      }
    }, 400);
  }

  async function handleMissedToggle(value) {
    setMissedEnabled(value);
    try {
      // Merge-write the blob so the schedule keys saved by applyScheduled
      // survive the toggle.
      let blob = {};
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) blob = JSON.parse(raw) ?? {};
      } catch (_) {}
      await AsyncStorage.setItem(
        NOTIF_PREFS_KEY,
        JSON.stringify({ ...blob, missedCheckinEnabled: value }),
      );
      // Mirror into the per-category SQLite row so the registry-driven
      // sync carries the preference cross-device (migration 044 pattern).
      const userId = useAppStore.getState().user?.id;
      if (userId) {
        await setPrefRow(userId, 'checkin_missed', { enabled: value, time_pref: null });
      }
      if (value) {
        await scheduleMissedCheckinFollowups(userId ?? null);
      } else {
        await cancelMissedCheckinFollowups();
      }
      toast.show(value ? 'Check-in follow-up on' : 'Check-in follow-up off', { variant: 'success' });
    } catch (_) {
      toast.show('Could not save that change', { variant: 'error' });
    }
  }

  async function handlePlannedConfirmToggle(value) {
    setPlannedConfirmEnabled(value);
    try {
      let blob = {};
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) blob = JSON.parse(raw) ?? {};
      } catch (_) {}
      await AsyncStorage.setItem(
        NOTIF_PREFS_KEY,
        JSON.stringify({ ...blob, plannedMealConfirmEnabled: value }),
      );
      const userId = useAppStore.getState().user?.id;
      if (userId) {
        await setPrefRow(userId, 'planned_meal_confirm', { enabled: value, time_pref: null });
      }
      if (value) {
        await schedulePlannedMealConfirm(userId ?? null);
      } else {
        await cancelPlannedMealConfirm();
      }
      toast.show(value ? 'Meal-plan reminder on' : 'Meal-plan reminder off', { variant: 'success' });
    } catch (_) {
      toast.show('Could not save that change', { variant: 'error' });
    }
  }

  // #12: partner cheers have no persistent scheduled notification to lay or
  // cancel (schedulePartnerBeats fires them near-instantly off a live
  // partner-sync event and reads this flag at that moment, scheduler.js:1448),
  // so unlike the two toggles above there is no schedule/cancel call here.
  async function handlePartnerCheerToggle(value) {
    setPartnerCheerEnabled(value);
    try {
      let blob = {};
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) blob = JSON.parse(raw) ?? {};
      } catch (_) {}
      await AsyncStorage.setItem(
        NOTIF_PREFS_KEY,
        JSON.stringify({ ...blob, partnerCheerEnabled: value }),
      );
      const userId = useAppStore.getState().user?.id;
      if (userId) {
        await setPrefRow(userId, 'partner_cheer', { enabled: value, time_pref: null });
      }
      toast.show(value ? 'Partner cheers on' : 'Partner cheers off', { variant: 'success' });
    } catch (_) {
      toast.show('Could not save that change', { variant: 'error' });
    }
  }

  const morningShift = quietHours
    ? shiftHourMinuteOutOfQuietHours(morningHour, morningMinute, quietHours)
    : { shifted: false };
  const nextFire = computeNextCheckinFireDate(checkinDay, checkinHour, checkinMinute, lastCheckinMs, 7);
  const lastFire = lastCheckinMs > 0 ? new Date(lastCheckinMs) : null;
  const gapDays = lastFire ? Math.round((nextFire.getTime() - lastFire.getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const bumped = lastCheckinMs > 0 && gapDays > 7;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Coaching reminders" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, live.intro]}>
          These reminders keep the weekly coaching loop accurate. Pick times that fit your normal routine.
        </Text>

        {/* C5-P27-04 (D96): the Campaign 3 Open Settings pattern. This banner
            stated the instruction with no way to get there, one tap from the
            NotificationSettings banner that does carry the control. */}
        {permissionStatus === 'denied' && (
          <View style={[styles.warningBox, live.warningBox]}>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={18} color={t.colors.warning} />
              <Text style={[styles.warningText, live.warningText]}>
                Notifications are disabled at the system level. Enable them in your device settings for these reminders to fire.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={styles.warningAction}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Text style={[styles.warningActionText, live.warningActionText]}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Morning weight */}
        <SectionLabel style={styles.sectionLabelSpacing}>Morning weight</SectionLabel>
        <Card style={[styles.card, live.card]} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, live.iconWrap]}>
              <Ionicons name="scale-outline" size={18} color={t.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, live.cardTitle]}>Morning weight reminder</Text>
          </View>
          <Text style={[styles.pickerLabel, live.pickerLabel]}>Hour</Text>
          <ChipRow
            items={HOURS_MORNING}
            selected={morningHour}
            onSelect={(h) => { setMorningHour(h); scheduleApply({ morningHour: h }); }}
            formatter={formatHour}
            accessibilityName="Morning weight hour"
          />
          <Text style={[styles.scheduleText, live.scheduleText]}>
            {morningShift.shifted
              ? `Notification at ${formatHour(morningShift.hour)}`
              : `Notification at ${formatHour(morningHour)}`}
          </Text>
          {morningShift.shifted ? (
            <Text style={[styles.scheduleSubText, live.scheduleSubText]}>
              Quiet hours currently run to {formatHour(morningShift.hour)}, so a {formatHour(morningHour)} reminder waits until then. You can change quiet hours in Settings, Notifications.
            </Text>
          ) : null}
          <View style={[styles.helperBlock, live.helperBlock]}>
            <Text style={[styles.helperText, live.helperText]}>
              Body weight shifts naturally each day with fluid, food, and hormones. Logging every other day at minimum gives Volyume enough readings to see the trend. Three or more readings per week opens up the weekly check-in.
            </Text>
            {/* C5-P28-03 (D96): the 19:30 backstop rides this same reminder
                and was named on no screen the user could reach. Disclosure
                only; what is scheduled, and its ED gates, are unchanged. */}
            <Text style={[styles.helperText, live.helperText]}>
              If the morning gets away from you, a quiet backstop at 7.30 pm offers one more chance that day. It goes quiet as soon as the weight is logged, and it turns off with this reminder.
            </Text>
          </View>
        </Card>

        {/* Weekly check-in */}
        <SectionLabel style={styles.sectionLabelSpacing}>Weekly check-in</SectionLabel>
        <Card style={[styles.card, live.card]} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, live.iconWrap]}>
              <Ionicons name="pulse-outline" size={18} color={t.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, live.cardTitle]}>Weekly check-in reminder</Text>
          </View>
          <Text style={[styles.pickerLabel, live.pickerLabel]}>Day</Text>
          <ChipRow
            items={DAYS.map((d, i) => ({ value: i, label: d }))}
            selected={checkinDay}
            onSelect={(d) => { setCheckinDay(d); scheduleApply({ checkinDay: d }); }}
            accessibilityName="Check-in day"
          />
          <Text style={[styles.pickerLabel, live.pickerLabel]}>Hour</Text>
          <ChipRow
            items={HOURS_EVENING}
            selected={checkinHour}
            onSelect={(h) => { setCheckinHour(h); scheduleApply({ checkinHour: h }); }}
            formatter={formatHour}
            accessibilityName="Check-in hour"
          />
          <Text style={[styles.scheduleText, live.scheduleText]}>Reminder every {formatDayHour(checkinDay, checkinHour)}</Text>
          {lastCheckinMs > 0 && (
            <Text style={[styles.scheduleSubText, live.scheduleSubText]}>
              Your next check-in will be {formatNextFire(nextFire)}{bumped ? ', so the coach has a full week of fresh data to act on' : ''}.
            </Text>
          )}
          <View style={[styles.helperBlock, live.helperBlock]}>
            <Text style={[styles.helperText, live.helperText]}>
              You can change the day any time. The next reminder will be at least 7 days after your last check-in so the trend has enough data to be useful.
            </Text>
          </View>
        </Card>

        {/* Missed check-in follow-up (OPP-C03). Optional, default on. */}
        <SectionLabel style={styles.sectionLabelSpacing}>Check-in follow-up</SectionLabel>
        <Card style={[styles.card, live.card]} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, live.iconWrap]}>
              <Ionicons name="hand-left-outline" size={18} color={t.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, styles.toggleTitle]}>Follow up if a check-in slips by</Text>
            <Switch
              value={missedEnabled}
              onValueChange={handleMissedToggle}
              trackColor={{ false: t.colors.surface3, true: t.colors.primaryBg }}
              thumbColor={t.colors.primary}
              ios_backgroundColor={t.colors.surface3}
              accessibilityLabel="Check-in follow-up toggle"
            />
          </View>
          <View style={[styles.helperBlock, live.helperBlock]}>
            <Text style={[styles.helperText, live.helperText]}>
              If a check-in day passes without one, you'll get a gentle nudge that evening and a look at your weekly trend two days later. Never more than that, and never a guilt trip.
            </Text>
          </View>
        </Card>

        {/* F3: planned-meal confirm reminder. Optional, default on, Pro. */}
        <SectionLabel style={styles.sectionLabelSpacing}>Meal-plan reminder</SectionLabel>
        <Card style={[styles.card, live.card]} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, live.iconWrap]}>
              <Ionicons name="restaurant-outline" size={18} color={t.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, styles.toggleTitle]}>Remind me to confirm planned meals</Text>
            <Switch
              value={plannedConfirmEnabled}
              onValueChange={handlePlannedConfirmToggle}
              trackColor={{ false: t.colors.surface3, true: t.colors.primaryBg }}
              thumbColor={t.colors.primary}
              ios_backgroundColor={t.colors.surface3}
              accessibilityLabel="Meal-plan reminder toggle"
            />
          </View>
          <View style={[styles.helperBlock, live.helperBlock]}>
            <Text style={[styles.helperText, live.helperText]}>
              If you have planned meals you've not marked as eaten, we'll send one gentle nudge in the evening so you can confirm them and keep your coach accurate.
            </Text>
          </View>
        </Card>

        {/* #12: partner-cheer pushes. Optional, default on, Pro. */}
        <SectionLabel style={styles.sectionLabelSpacing}>Partner cheers</SectionLabel>
        <Card style={[styles.card, live.card]} padding="md">
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, live.iconWrap]}>
              <Ionicons name="heart-outline" size={18} color={t.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, styles.toggleTitle]}>Partner cheers</Text>
            <Switch
              value={partnerCheerEnabled}
              onValueChange={handlePartnerCheerToggle}
              trackColor={{ false: t.colors.surface3, true: t.colors.primaryBg }}
              thumbColor={t.colors.primary}
              ios_backgroundColor={t.colors.surface3}
              accessibilityLabel="Partner cheers toggle"
            />
          </View>
          <View style={[styles.helperBlock, live.helperBlock]}>
            <Text style={[styles.helperText, live.helperText]}>
              A nudge when your partner cheers you on, keeps a shared training streak going, or joins you as a training partner.
            </Text>
          </View>
        </Card>

        {saved && <Text style={[styles.savedText, live.savedText]}>Saved</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  intro: { ...type.bodySm, color: colors.textSecondary },
  warningBox: {
    gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  warningText: { ...type.captionTight, flex: 1, color: colors.warning },
  // Mirrors NotificationSettingsScreen's bannerAction pair (the Campaign 3
  // Open Settings affordance), so the two banners read as one pattern.
  warningAction: { alignSelf: 'flex-start' },
  warningActionText: {
    ...type.bodySm, fontWeight: fontWeight.semibold,
    color: colors.warning, textDecorationLine: 'underline',
  },
  sectionLabelSpacing: { marginTop: spacing.md, marginBottom: -spacing.xs },
  // Intentional settings/list-style card: secondary surface (surface2),
  // vertical-only padding (children own their horizontal padding) and the
  // tighter radius.md corner. Card supplies the surface base, border and
  // vertical padding (padding="md"); these props keep the list-style look.
  card: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 0,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { ...type.bodyStrong, color: colors.textPrimary },
  toggleTitle: { flex: 1 },
  pickerLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, flexDirection: 'row' },
  chip: {
    minWidth: 40,
    marginBottom: spacing.md,
  },
  scheduleText: {
    ...type.label, color: colors.primary,
    paddingHorizontal: spacing.lg, marginTop: -spacing.sm, marginBottom: spacing.sm,
  },
  scheduleSubText: {
    ...type.captionTight, color: colors.textSecondary,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  helperBlock: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs,
  },
  helperText: { ...type.bodySm, color: colors.textMuted },
  savedText: {
    fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold,
    textAlign: 'center', marginTop: spacing.sm,
  },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/margin/borderRadius/minWidth, no token) and
// fontWeight (not part of useTheme()'s shape) are correctly omitted. Both
// coaching reminders stay always-scheduled (no toggle) -- colours only.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    intro: { ...t.type.bodySm, color: t.colors.textSecondary },
    warningBox: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warning },
    warningText: { ...t.type.captionTight, color: t.colors.warning },
    warningActionText: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.warning },
    card: { backgroundColor: t.colors.surface2 },
    iconWrap: { backgroundColor: t.colors.primaryBg },
    cardTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pickerLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    scheduleText: { ...t.type.label, color: t.colors.primary },
    scheduleSubText: { ...t.type.captionTight, color: t.colors.textSecondary },
    helperBlock: { borderTopColor: t.colors.border },
    helperText: { ...t.type.bodySm, color: t.colors.textMuted },
    savedText: { fontSize: t.fontSize.xs, color: t.colors.primary },
  };
}
