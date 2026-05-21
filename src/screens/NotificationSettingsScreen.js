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
} from '../lib/trainingReminders';
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

  // Load saved prefs on mount and request permissions
  useEffect(() => {
    async function init() {
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) {
          const prefs = JSON.parse(raw);
          if (prefs.morningEnabled !== undefined) setMorningEnabled(prefs.morningEnabled);
          if (prefs.morningHour !== undefined) setMorningHour(prefs.morningHour);
          if (prefs.morningMinute !== undefined) setMorningMinute(prefs.morningMinute);
          if (prefs.checkinEnabled !== undefined) setCheckinEnabled(prefs.checkinEnabled);
          if (prefs.checkinDay !== undefined) setCheckinDay(prefs.checkinDay);
          if (prefs.checkinHour !== undefined) setCheckinHour(prefs.checkinHour);
          if (prefs.checkinMinute !== undefined) setCheckinMinute(prefs.checkinMinute);
        }
      } catch (_) {}

      try {
        const trainingEnabledRaw = await AsyncStorage.getItem(REMINDER_PREF_KEY);
        if (trainingEnabledRaw !== null) setTrainingEnabled(trainingEnabledRaw === 'true');
      } catch (_) {}

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
        const trainingTimeRaw = await AsyncStorage.getItem(REMINDER_TIME_KEY);
        if (trainingTimeRaw) {
          const { hour, minute } = JSON.parse(trainingTimeRaw);
          if (typeof hour === 'number') setTrainingHour(hour);
          if (typeof minute === 'number') setTrainingMinute(minute);
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
  } = {}) {
    return {
      morningEnabled: me,
      morningHour: mh,
      morningMinute: mm,
      checkinEnabled: ce,
      checkinDay: cd,
      checkinHour: ch,
      checkinMinute: cmin,
      lastCheckinMs,
    };
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
    setTrainingEnabled(value);
    try {
      await AsyncStorage.setItem(REMINDER_PREF_KEY, value ? 'true' : 'false');
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
          setTrainingHour(h);
          setTrainingMinute(m);
          try {
            await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour: h, minute: m }));
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

        {/* Sections 1 & 2 (morning weight + weekly check-in) are Pro-only:
            they feed Precision Coaching. Free users skip to training reminders. */}
        {isPro && (<>
        {/* Section 1 — Morning weight reminder */}
        <Text style={styles.sectionLabel}>Morning weight reminder</Text>
        <View style={styles.card}>
          {/* Toggle row */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Ionicons name="scale-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.toggleLabel}>Morning weight reminder</Text>
            <Switch
              value={morningEnabled}
              onValueChange={handleMorningToggle}
              trackColor={{ false: colors.surface2, true: colors.primaryDim }}
              thumbColor={colors.primary}
              ios_backgroundColor={colors.surface2}
              accessibilityLabel="Morning weight reminder toggle"
            />
          </View>

          {/* Expanded controls */}
          {morningEnabled && (
            <View style={styles.expandedSection}>
              <View style={styles.divider} />
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={[styles.chipContainer, !morningEnabled && styles.chipContainerDisabled]}>
                <HourChips
                  hours={HOURS}
                  selected={morningHour}
                  onSelect={handleMorningHour}
                  disabled={!morningEnabled}
                />
              </View>
              <Text style={styles.scheduleText}>
                Notification at {formatHour(morningHour)}
              </Text>
            </View>
          )}

          {/* Helper text */}
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              Body weight shifts naturally each day due to fluid, food, and hormones. Logging every other day (at minimum) gives your coaching enough readings to smooth out that noise and see what's actually changing. Three or more readings per week unlocks the weekly check-in.
            </Text>
          </View>
        </View>

        {/* Section 2 — Weekly check-in reminder */}
        <Text style={styles.sectionLabel}>Weekly check-in reminder</Text>
        <View style={styles.card}>
          {/* Toggle row */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Ionicons name="pulse-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.toggleLabel}>Weekly check-in reminder</Text>
            <Switch
              value={checkinEnabled}
              onValueChange={handleCheckinToggle}
              trackColor={{ false: colors.surface2, true: colors.primaryDim }}
              thumbColor={colors.primary}
              ios_backgroundColor={colors.surface2}
              accessibilityLabel="Weekly check-in reminder toggle"
            />
          </View>

          {/* Expanded controls */}
          {checkinEnabled && (
            <View style={styles.expandedSection}>
              <View style={styles.divider} />
              <Text style={styles.pickerLabel}>Day</Text>
              <View style={[styles.chipContainer, !checkinEnabled && styles.chipContainerDisabled]}>
                <DayChips
                  selected={checkinDay}
                  onSelect={handleCheckinDay}
                  disabled={!checkinEnabled}
                />
              </View>
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={[styles.chipContainer, !checkinEnabled && styles.chipContainerDisabled]}>
                <HourChips
                  hours={EVENING_HOURS}
                  selected={checkinHour}
                  onSelect={handleCheckinHour}
                  disabled={!checkinEnabled}
                />
              </View>
              <Text style={styles.scheduleText}>
                Reminder every {formatDayHour(checkinDay, checkinHour)}
              </Text>
              {/* Next-fire preview honouring the 7-day minimum gap from
                  the last check-in. Helps the user understand why
                  switching days doesn't always mean "this week" — the
                  coach needs a full week of fresh data to act on. */}
              {lastCheckinMs > 0 && (() => {
                const nextFire = computeNextCheckinFireDate(
                  checkinDay, checkinHour, checkinMinute, lastCheckinMs, 7,
                );
                const lastFire = new Date(lastCheckinMs);
                const gapDays = Math.round((nextFire.getTime() - lastFire.getTime()) / (24 * 60 * 60 * 1000));
                const bumped = gapDays > 7;
                return (
                  <Text style={styles.scheduleSubText}>
                    Your next check-in will be {formatNextFire(nextFire)}{bumped ? ', so the coach has a full week of fresh data to act on' : ''}.
                  </Text>
                );
              })()}
            </View>
          )}

          {/* Helper text */}
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              Reminds you to complete your weekly coaching check-in. You can change the day any time — the next reminder will be at least 7 days after your last check-in so the trend math has enough data to mean something.
            </Text>
          </View>
        </View>

        </>)}

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
  savedText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
