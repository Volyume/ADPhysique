import { useState, useEffect, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type } from '../styles/theme';
import {
  scheduleMorningWeightNotification,
  scheduleEveningWeightReminder,
  scheduleCheckinReminder,
  cancelMorningNotification,
  cancelCheckinNotification,
  requestNotificationPermissions,
} from '../lib/notifications';
import {
  scheduleTrainingReminders,
  cancelTrainingReminders,
  REMINDER_PREF_KEY,
  REMINDER_TIME_KEY,
} from '../lib/notifications/trainingReminders';
import {
  setPreference as setPrefRow,
  migrateFromLegacyBlob,
} from '../lib/notifications/preferences';
import { scheduleMealReminders } from '../lib/notifications/scheduler';
import useAppStore from '../store/useAppStore';
import Card from '../components/Card';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const TRAINING_PRESET_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '17:00', '18:00', '19:00', '20:00'];

// Opt-in meal-log reminders (gap #4). Default OFF, convenience-only. Times are
// chosen from a preset list (same lightweight picker as training reminders).
const MEAL_REMINDERS_KEY = '@volyume_meal_reminders';
const MEAL_PRESET_TIMES = ['07:00', '08:00', '09:00', '12:00', '12:30', '13:00', '17:00', '18:00', '18:30', '19:00', '20:00', '21:00'];
const DEFAULT_MEAL_REMINDERS = [
  { id: 'breakfast', label: 'Breakfast', hour: 8, minute: 0, enabled: false },
  { id: 'lunch', label: 'Lunch', hour: 12, minute: 30, enabled: false },
  { id: 'dinner', label: 'Dinner', hour: 18, minute: 30, enabled: false },
];





async function applyNotifications(prefs, permissionStatus) {
  // Cancel ONLY the two notifications this screen owns (morning weight +
  // weekly check-in), then re-lay them if enabled. Previously this called
  // cancelAllNotifications(), which wiped every scheduled notification
  // including ones managed elsewhere (cascade-gate day 19/21, weekly
  // coach-ready, year-of-lifts), so saving any notification setting
  // silently destroyed them with nothing to re-lay. Each schedule* helper
  // self-cancels its own ID too, so the explicit cancels here only matter
  // for the disabled case.
  await cancelMorningNotification();
  await cancelCheckinNotification();
  if (prefs.morningEnabled && permissionStatus === 'granted') {
    await scheduleMorningWeightNotification(prefs.morningHour, prefs.morningMinute);
    // Q1: evening weigh-in backstop rides the same toggle (self-gates on ED flag).
    await scheduleEveningWeightReminder();
  }
  if (prefs.checkinEnabled && permissionStatus === 'granted') {
    // Pass the last-check-in timestamp + a 7-day minimum gap so that
    // switching check-in day mid-cycle doesn't reschedule the reminder
    // to fire only 2-3 days after the last check-in (the coach needs a
    // full week of data for a meaningful trend read).
    await scheduleCheckinReminder(
      prefs.checkinDay, prefs.checkinHour, prefs.checkinMinute,
      { lastCheckinMs: prefs.lastCheckinMs ?? 0, minGapDays: 7 },
    );
  }
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));

  // Mirror into per-category SQLite rows so the registry-driven
  // sync push has something to send to the cloud
  // notification_preferences table (migration 044). SQLite is read
  // first on mount; the AsyncStorage blob is kept as legacy fallback.
  try {
    const userId = useAppStore.getState().user?.id;
    if (userId) {
      const morningTime =
        (prefs.morningHour ?? 8).toString().padStart(2, '0')
        + ':' + (prefs.morningMinute ?? 0).toString().padStart(2, '0');
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][prefs.checkinDay ?? 0];
      const checkinTime =
        (prefs.checkinHour ?? 18).toString().padStart(2, '0')
        + ':' + (prefs.checkinMinute ?? 0).toString().padStart(2, '0');
      await setPrefRow(userId, 'morning_weight', {
        enabled: !!prefs.morningEnabled,
        time_pref: morningTime,
      });
      await setPrefRow(userId, 'weekly_checkin_reminder', {
        enabled: !!prefs.checkinEnabled,
        time_pref: `${dow}_${checkinTime}`,
      });
      // training_reminder mirror per Codex re-audit 2026-05-26
      // finding #2: migration 044 includes the category but the
      // screen wasn't mirroring it. The per-day schedule lives in
      // AsyncStorage under REMINDER_TIME_KEY / SCHEDULE_KEY (read
      // by trainingReminders.js); the cloud row tracks the
      // enabled flag + default time so cross-device restore
      // honours the user's intent.
      const trainingTime =
        (prefs.trainingHour ?? 8).toString().padStart(2, '0')
        + ':' + (prefs.trainingMinute ?? 0).toString().padStart(2, '0');
      await setPrefRow(userId, 'training_reminder', {
        enabled: !!prefs.trainingEnabled,
        time_pref: trainingTime,
      });
    }
  } catch (_) { /* tolerate; AsyncStorage write already succeeded */ }
}



export default function NotificationSettingsScreen({ navigation }) {
  // Morning weight + weekly check-in reminders are Pro coaching inputs;
  // they drive the weekly Precision Coaching loop. Training reminders are
  // a general utility (any user benefits from "remember to train") so they
  // stay visible to Free users too.
  const tier = useAppStore(s => s.tier);
  const isPro = tier === 'pro';
  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningHour, setMorningHour] = useState(7);
  const [morningMinute, setMorningMinute] = useState(0);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [checkinDay, setCheckinDay] = useState(0);
  const [checkinHour, setCheckinHour] = useState(18);
  const [checkinMinute, setCheckinMinute] = useState(0);
  // Last check-in timestamp in ms, used to enforce the 7-day minimum gap
  // when the user switches their check-in day, so the next reminder
  // doesn't fire only 2-3 days after the previous check-in.
  const [lastCheckinMs, setLastCheckinMs] = useState(0);
  const [trainingEnabled, setTrainingEnabled] = useState(false);
  const [trainingHour, setTrainingHour] = useState(8);
  const [trainingMinute, setTrainingMinute] = useState(0);
  const [mealReminders, setMealReminders] = useState(DEFAULT_MEAL_REMINDERS);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  const debounceTimer = useRef(null);

  // Load saved prefs on mount and request permissions.
  //
  // Read order: SQLite mirror first (synced cross-device via
  // notification_preferences migration 044), then fall back to the
  // legacy AsyncStorage blob if SQLite is empty (fresh install or
  // install that pre-dates migration 044). When the legacy blob is
  // the source, migrateFromLegacyBlob seeds the SQLite mirror so the
  // next sync push has rows to ship. Codex re-audit 2026-05-26
  // finding #2: fresh devices that pulled cloud prefs into SQLite
  // were still rendering AsyncStorage defaults.
  useEffect(() => {
    async function init() {
      const userId = useAppStore.getState().user?.id;
      // Try SQLite mirror first
      const sqliteCategories = new Set();
      let fallbackTrainingEnabled = null;
      let fallbackTrainingHour = 8;
      let fallbackTrainingMinute = 0;
      let hasFallbackTraining = false;
      if (userId) {
        try {
          // eslint-disable-next-line global-require
          const { getAllPreferences } = require('../lib/notifications/preferences');
          const rows = await getAllPreferences(userId);
          if (rows.length > 0) {
            for (const r of rows) {
              sqliteCategories.add(r.category);
              if (r.category === 'morning_weight') {
                setMorningEnabled(!!r.enabled);
                if (typeof r.time_pref === 'string' && r.time_pref.includes(':')) {
                  const [h, m] = r.time_pref.split(':').map(n => parseInt(n, 10));
                  if (Number.isFinite(h)) setMorningHour(h);
                  if (Number.isFinite(m)) setMorningMinute(m);
                }
              } else if (r.category === 'weekly_checkin_reminder') {
                setCheckinEnabled(!!r.enabled);
                if (typeof r.time_pref === 'string' && r.time_pref.includes('_')) {
                  const [dow, hm] = r.time_pref.split('_');
                  const dowIdx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(dow);
                  if (dowIdx >= 0) setCheckinDay(dowIdx);
                  if (hm && hm.includes(':')) {
                    const [h, m] = hm.split(':').map(n => parseInt(n, 10));
                    if (Number.isFinite(h)) setCheckinHour(h);
                    if (Number.isFinite(m)) setCheckinMinute(m);
                  }
                }
              } else if (r.category === 'training_reminder') {
                setTrainingEnabled(!!r.enabled);
                if (typeof r.time_pref === 'string' && r.time_pref.includes(':')) {
                  const [h, m] = r.time_pref.split(':').map(n => parseInt(n, 10));
                  if (Number.isFinite(h)) setTrainingHour(h);
                  if (Number.isFinite(m)) setTrainingMinute(m);
                }
              }
            }
          }
        } catch (_) { /* fall through to AsyncStorage */ }
      }

      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) {
          const prefs = JSON.parse(raw);
          // Apply legacy AsyncStorage values only when SQLite was
          // missing that category. Otherwise SQLite wins (it is the
          // synced source).
          if (!sqliteCategories.has('morning_weight')) {
            if (prefs.morningEnabled !== undefined) setMorningEnabled(prefs.morningEnabled);
            if (prefs.morningHour !== undefined) setMorningHour(prefs.morningHour);
            if (prefs.morningMinute !== undefined) setMorningMinute(prefs.morningMinute);
          }
          if (!sqliteCategories.has('weekly_checkin_reminder')) {
            if (prefs.checkinEnabled !== undefined) setCheckinEnabled(prefs.checkinEnabled);
            if (prefs.checkinDay !== undefined) setCheckinDay(prefs.checkinDay);
            if (prefs.checkinHour !== undefined) setCheckinHour(prefs.checkinHour);
            if (prefs.checkinMinute !== undefined) setCheckinMinute(prefs.checkinMinute);
          }
          if (!sqliteCategories.has('training_reminder')) {
            if (prefs.trainingEnabled !== undefined) {
              fallbackTrainingEnabled = !!prefs.trainingEnabled;
              hasFallbackTraining = true;
              setTrainingEnabled(prefs.trainingEnabled);
            }
            if (prefs.trainingHour !== undefined) {
              fallbackTrainingHour = prefs.trainingHour;
              hasFallbackTraining = true;
              setTrainingHour(prefs.trainingHour);
            }
            if (prefs.trainingMinute !== undefined) {
              fallbackTrainingMinute = prefs.trainingMinute;
              hasFallbackTraining = true;
              setTrainingMinute(prefs.trainingMinute);
            }
          }
          // One-shot back-fill into the SQLite mirror so existing
          // installs that pre-date migration 044 get their prefs
          // into the per-category rows the sync push expects. Safe
          // to call on every mount: setPreference is an UPSERT and
          // migrateFromLegacyBlob skips rows that already exist in
          // SQLite, so a more-recent SQLite write is never stamped
          // with the older AsyncStorage value. Codex re-audit
          // 2026-05-26 F6.
          try {
            const userId = useAppStore.getState().user?.id;
            if (userId) await migrateFromLegacyBlob(userId, prefs);
          } catch (_) { /* tolerate; AsyncStorage read still succeeded */ }
        }
      } catch (_) {}

      if (!sqliteCategories.has('training_reminder')) {
        let legacyTrainingEnabled = fallbackTrainingEnabled;
        let legacyTrainingHour = fallbackTrainingHour;
        let legacyTrainingMinute = fallbackTrainingMinute;
        let hasLegacyTraining = hasFallbackTraining;

        try {
          const trainingEnabledRaw = await AsyncStorage.getItem(REMINDER_PREF_KEY);
          if (trainingEnabledRaw !== null) {
            legacyTrainingEnabled = trainingEnabledRaw === 'true';
            hasLegacyTraining = true;
            setTrainingEnabled(legacyTrainingEnabled);
          }
        } catch (_) {}

        try {
          const trainingTimeRaw = await AsyncStorage.getItem(REMINDER_TIME_KEY);
          if (trainingTimeRaw) {
            const { hour, minute } = JSON.parse(trainingTimeRaw);
            if (typeof hour === 'number') {
              legacyTrainingHour = hour;
              hasLegacyTraining = true;
              setTrainingHour(hour);
            }
            if (typeof minute === 'number') {
              legacyTrainingMinute = minute;
              hasLegacyTraining = true;
              setTrainingMinute(minute);
            }
          }
        } catch (_) {}

        if (userId && hasLegacyTraining) {
          try {
            await setPrefRow(userId, 'training_reminder', {
              enabled: legacyTrainingEnabled ?? false,
              time_pref: `${String(legacyTrainingHour).padStart(2, '0')}:${String(legacyTrainingMinute).padStart(2, '0')}`,
            });
          } catch (_) {}
        }
      }

      // Load the user's last check-in so we can enforce the 7-day minimum
      // gap when they change their check-in day, and so the UI can show
      // an honest "next reminder fires on …" preview.
      try {
        // eslint-disable-next-line global-require
        const { getLatestCheckin } = require('../lib/database');
        // eslint-disable-next-line global-require
        const { default: store } = require('../store/useAppStore');
        const userId = store.getState().user?.id;
        if (userId) {
          const latest = await getLatestCheckin(userId);
          if (latest?.weekStart) setLastCheckinMs(latest.weekStart);
        }
      } catch (_) {}

      try {
        const status = await requestNotificationPermissions();
        setPermissionStatus(status);
      } catch (_) {
        setPermissionStatus('denied');
      }
    }
    init();
  }, []);

  // Clear any pending debounce / saved-flag timers on unmount so they
  // don't fire setSaved/setSaving on an unmounted component (React warning
  // and potential leak if the user backed out mid-save).
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  // Retained deliberately: this debounced save wrapper (and applyNotifications,
  // which schedules the morning-weight + weekly-check-in reminders) is currently
  // only reachable via handlers removed in a half-finished refactor of this
  // screen. Not deleting notification-scheduling code on a guess. See audit note.
  // eslint-disable-next-line no-unused-vars
  function scheduleApply(nextPrefs) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      try {
        await applyNotifications(nextPrefs, permissionStatus);
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2000);
      } catch (_) {}
      setSaving(false);
    }, 600);
  }

  function getPrefs({
    me = morningEnabled,
    mh = morningHour,
    mm = morningMinute,
    ce = checkinEnabled,
    cd = checkinDay,
    ch = checkinHour,
    cmin = checkinMinute,
    te = trainingEnabled,
    th = trainingHour,
    tm = trainingMinute,
  } = {}) {
    return {
      morningEnabled: me,
      morningHour: mh,
      morningMinute: mm,
      checkinEnabled: ce,
      checkinDay: cd,
      checkinHour: ch,
      checkinMinute: cmin,
      trainingEnabled: te,
      trainingHour: th,
      trainingMinute: tm,
      lastCheckinMs,
    };
  }

  async function persistTrainingPreference(nextPrefs) {
    try {
      // Merge over the existing blob so keys this screen doesn't own
      // (missedCheckinEnabled from Coaching reminders, coachReady) are not
      // dropped by a training-reminder save.
      let existing = {};
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) existing = JSON.parse(raw) ?? {};
      } catch (_) {}
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ ...existing, ...nextPrefs }));
      const userId = useAppStore.getState().user?.id;
      if (userId) {
        const trainingTime =
          (nextPrefs.trainingHour ?? 8).toString().padStart(2, '0')
          + ':' + (nextPrefs.trainingMinute ?? 0).toString().padStart(2, '0');
        await setPrefRow(userId, 'training_reminder', {
          enabled: !!nextPrefs.trainingEnabled,
          time_pref: trainingTime,
        });
      }
    } catch (_) {}
  }

  async function handleTrainingToggle(value) {
    if (value && permissionStatus !== 'granted') {
      appAlert(
        'Notifications disabled',
        'You\'ll need to enable notifications in your device settings first.',
      );
      return;
    }
    const nextPrefs = getPrefs({ te: value });
    setTrainingEnabled(value);
    try {
      await AsyncStorage.setItem(REMINDER_PREF_KEY, value ? 'true' : 'false');
      await persistTrainingPreference(nextPrefs);
      if (value) {
        await scheduleTrainingReminders();
      } else {
        await cancelTrainingReminders();
      }
    } catch (_) {}
  }

  function handleTrainingTimePick() {
    const currentLabel = `${String(trainingHour).padStart(2, '0')}:${String(trainingMinute).padStart(2, '0')}`;
    appAlert(
      'Reminder time',
      `Current: ${currentLabel}`,
      TRAINING_PRESET_TIMES.map((label) => ({
        text: label,
        onPress: async () => {
          const [h, m] = label.split(':').map(Number);
          const nextPrefs = getPrefs({ th: h, tm: m });
          setTrainingHour(h);
          setTrainingMinute(m);
          try {
            await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour: h, minute: m }));
            await persistTrainingPreference(nextPrefs);
            if (trainingEnabled) {
              await scheduleTrainingReminders();
            }
          } catch (_) {}
        },
      })),
    );
  }

  // Load saved meal reminders on mount (default OFF).
  useEffect(() => {
    AsyncStorage.getItem(MEAL_REMINDERS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setMealReminders(parsed);
      } catch (_) { /* keep defaults */ }
    }).catch(() => {});
  }, []);

  async function persistMealReminders(next) {
    setMealReminders(next);
    try { await AsyncStorage.setItem(MEAL_REMINDERS_KEY, JSON.stringify(next)); } catch (_) {}
    if (permissionStatus === 'granted') {
      try { await scheduleMealReminders(next); } catch (_) {}
    }
  }

  function toggleMealReminder(id, value) {
    const next = mealReminders.map((r) => (r.id === id ? { ...r, enabled: value } : r));
    if (value && permissionStatus !== 'granted') {
      requestNotificationPermissions().then((status) => {
        setPermissionStatus(status);
        persistMealReminders(next);
      }).catch(() => persistMealReminders(next));
      return;
    }
    persistMealReminders(next);
  }

  function pickMealReminderTime(id) {
    const r = mealReminders.find((x) => x.id === id);
    const currentLabel = r ? `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}` : '';
    appAlert('Reminder time', `Current: ${currentLabel}`, MEAL_PRESET_TIMES.map((label) => ({
      text: label,
      onPress: () => {
        const [h, m] = label.split(':').map(Number);
        persistMealReminders(mealReminders.map((x) => (x.id === id ? { ...x, hour: h, minute: m } : x)));
      },
    })));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Subtitle only, the stack header (set in RootNavigator with
          options={{ title: 'Notifications' }}) already shows the back
          arrow + title at the top of the screen. */}
      <View style={styles.subtitleWrap}>
        <Text style={styles.subtitle}>
          Volyume uses local notifications only. No marketing, ever.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission banner */}
        {permissionStatus === 'denied' && (
          <View style={styles.permissionBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>
              Notifications are currently disabled. Enable them in your device settings to use these features.
            </Text>
          </View>
        )}

        {/* Morning weight + weekly check-in reminders moved to a dedicated
            Pro screen (Settings → Coaching reminders). The toggles here
            were misleading. Those reminders are non-optional inputs to
            Precision Coaching, so flipping them off broke the coaching
            loop. CoachingRemindersScreen exposes the day + hour pickers
            without toggles; both reminders are always scheduled for Pro
            users. This screen now only handles training reminders. */}
        {isPro && (
          <TouchableOpacity
            style={styles.crossLink}
            onPress={() => navigation.navigate('CoachingReminders')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Coaching reminders"
          >
            <View style={styles.toggleIconWrap}>
              <Ionicons name="pulse-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.crossLinkTitle}>Coaching reminders</Text>
              <Text style={styles.crossLinkSub}>
                Morning weight + weekly check-in schedule. Always on for Pro.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}


        {/* Section 3, Training reminders (available to all tiers) */}
        <Text style={styles.sectionLabel}>Training reminders</Text>
        <Card style={styles.card}>
          {/* Toggle row */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Ionicons name="barbell-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.toggleLabel}>Remind me to train</Text>
            <Switch
              value={trainingEnabled}
              onValueChange={handleTrainingToggle}
              trackColor={{ false: colors.surface2, true: colors.primaryDim }}
              thumbColor={colors.primary}
              ios_backgroundColor={colors.surface2}
              accessibilityLabel="Training reminder toggle"
            />
          </View>

          {/* Time picker row */}
          {trainingEnabled && (
            <View style={styles.expandedSection}>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.timePickerRow}
                onPress={handleTrainingTimePick}
                accessibilityRole="button"
                accessibilityLabel="Set reminder time"
              >
                <Text style={styles.timePickerLabel}>Reminder time</Text>
                <Text style={styles.timePickerValue}>
                  {`${String(trainingHour).padStart(2, '0')}:${String(trainingMinute).padStart(2, '0')}`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Helper text */}
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              Pick a time and the days you want the nudge. Plans don't have fixed weekdays in Volyume, so reminders fire on the days you choose.
            </Text>
          </View>
        </Card>

        {/* Meal-log reminders (opt-in, gap #4): convenience-only, never a streak. */}
        <Text style={styles.sectionLabel}>Meal reminders</Text>
        <Card style={styles.card}>
          {mealReminders.map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.toggleRow}>
                <View style={styles.toggleIconWrap}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.toggleLabel}>{r.label}</Text>
                <Switch
                  value={r.enabled}
                  onValueChange={(v) => toggleMealReminder(r.id, v)}
                  trackColor={{ false: colors.surface2, true: colors.primaryDim }}
                  thumbColor={colors.primary}
                  ios_backgroundColor={colors.surface2}
                  accessibilityLabel={`${r.label} reminder toggle`}
                />
              </View>
              {r.enabled && (
                <TouchableOpacity
                  style={styles.timePickerRow}
                  onPress={() => pickMealReminderTime(r.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set ${r.label} reminder time`}
                >
                  <Text style={styles.timePickerLabel}>Reminder time</Text>
                  <Text style={styles.timePickerValue}>
                    {`${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              Optional, gentle nudges to log a meal. No streaks and no pressure. Turn any of them off whenever you like.
            </Text>
          </View>
        </Card>

        {/* Bottom note */}
        <View style={styles.bottomNote}>
          <Text style={styles.bottomNoteText}>
            Volyume never sends marketing notifications. These are local-only reminders with no server involved. You can disable them anytime from your device settings.
          </Text>
        </View>

        {/* Save status */}
        {saving && <Text style={styles.savingText}>Saving…</Text>}
        {!saving && saved && <Text style={styles.savedText}>Saved</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  subtitleWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Scroll content
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  // Permission banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: withAlpha(colors.warning, alpha.tint),
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.35),
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerIcon: {
    marginTop: spacing.hair,
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 19,
  },

  // Section label
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // Card: the shared Card supplies surface, radius.lg and the 1px border.
  // This card's rows own their own padding, so cancel Card's default padding
  // and keep overflow hidden (the divider + rounded corners depend on it).
  card: {
    overflow: 'hidden',
    padding: 0,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  toggleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },

  // Expanded section
  expandedSection: {
    paddingBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Helper text
  helperRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.md,
  },

  // Time picker row (training reminders)
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  timePickerLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  timePickerValue: {
    ...type.num('bodyStrong'),
    color: colors.primary,
  },

  // Bottom note
  bottomNote: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  bottomNoteText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
    textAlign: 'center',
  },

  savingText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  crossLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  crossLinkTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  crossLinkSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  savedText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
