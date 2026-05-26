import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
  cancelAllNotifications,
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
import useAppStore from '../store/useAppStore';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const HOURS = [5, 6, 7, 8, 9, 10, 11, 12];
const TRAINING_PRESET_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '17:00', '18:00', '19:00', '20:00'];
const EVENING_HOURS = [14, 15, 16, 17, 18, 19, 20, 21];
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

// Compute the actual next-fire Date for the check-in reminder honouring the
// minimum-gap rule from the last check-in. Mirrors the runtime logic in
// notifications.js so the preview text matches what the reminder will do.
function computeNextCheckinFireDate(weekday, hour, minute, lastCheckinMs, minGapDays = 7) {
  const after = new Date();
  const target = new Date(after);
  const currentDow = target.getDay();
  let daysUntil = (weekday - currentDow + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (daysUntil === 0 && target.getTime() <= after.getTime()) daysUntil = 7;
  target.setDate(target.getDate() + daysUntil);
  if (lastCheckinMs > 0 && minGapDays > 0) {
    const earliest = lastCheckinMs + minGapDays * 24 * 60 * 60 * 1000;
    while (target.getTime() < earliest) target.setDate(target.getDate() + 7);
  }
  return target;
}

// "Sunday 25 May at 12:00"
function formatNextFire(date) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${dayNames[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} at ${formatHour(h)}${m === '00' ? '' : ':' + m}`;
}

async function applyNotifications(prefs, permissionStatus) {
  await cancelAllNotifications();
  if (prefs.morningEnabled && permissionStatus === 'granted') {
    await scheduleMorningWeightNotification(prefs.morningHour, prefs.morningMinute);
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

function HourChips({ hours, selected, onSelect, disabled }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {hours.map((hour) => {
        const isSelected = hour === selected;
        return (
          <TouchableOpacity
            key={hour}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(hour)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatHour(hour)}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {formatHour(hour)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function DayChips({ selected, onSelect, disabled }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {DAYS.map((day, index) => {
        const isSelected = index === selected;
        return (
          <TouchableOpacity
            key={day}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(index)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={day}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
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
  // Last check-in timestamp in ms — used to enforce the 7-day minimum gap
  // when the user switches their check-in day, so the next reminder
  // doesn't fire only 2-3 days after the previous check-in.
  const [lastCheckinMs, setLastCheckinMs] = useState(0);
  const [trainingEnabled, setTrainingEnabled] = useState(false);
  const [trainingHour, setTrainingHour] = useState(8);
  const [trainingMinute, setTrainingMinute] = useState(0);
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
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(nextPrefs));
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

  function handleMorningToggle(value) {
    if (value && permissionStatus !== 'granted') {
      Alert.alert(
        'Notifications disabled',
        'You\'ll need to enable notifications in your device settings first.',
      );
      return;
    }
    setMorningEnabled(value);
    scheduleApply(getPrefs({ me: value }));
  }

  function handleMorningHour(hour) {
    setMorningHour(hour);
    scheduleApply(getPrefs({ mh: hour }));
  }

  function handleCheckinToggle(value) {
    if (value && permissionStatus !== 'granted') {
      Alert.alert(
        'Notifications disabled',
        'You\'ll need to enable notifications in your device settings first.',
      );
      return;
    }
    setCheckinEnabled(value);
    scheduleApply(getPrefs({ ce: value }));
  }

  function handleCheckinDay(day) {
    setCheckinDay(day);
    scheduleApply(getPrefs({ cd: day }));
  }

  function handleCheckinHour(hour) {
    setCheckinHour(hour);
    scheduleApply(getPrefs({ ch: hour }));
  }

  async function handleTrainingToggle(value) {
    if (value && permissionStatus !== 'granted') {
      Alert.alert(
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
    Alert.alert(
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Subtitle only — the stack header (set in RootNavigator with
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


        {/* Section 3 — Training reminders (available to all tiers) */}
        <Text style={styles.sectionLabel}>Training reminders</Text>
        <View style={styles.card}>
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
        </View>

        {/* Bottom note */}
        <View style={styles.bottomNote}>
          <Text style={styles.bottomNoteText}>
            Volyume never sends marketing notifications. These are local-only reminders with no server involved. You can disable them anytime from your device settings.
          </Text>
        </View>

        {/* Save status */}
        {saving && <Text style={styles.savingText}>Saving...</Text>}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    marginTop: 2,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
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
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerIcon: {
    marginTop: 1,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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

  // Picker label
  pickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Chip container
  chipContainer: {
    marginBottom: spacing.md,
  },
  chipContainerDisabled: {
    opacity: 0.4,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 40,
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Schedule text
  scheduleText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  scheduleSubText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 17,
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
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.xs,
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
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  crossLinkSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
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
