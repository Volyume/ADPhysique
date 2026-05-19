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

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const HOURS = [5, 6, 7, 8, 9, 10, 11, 12];
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

async function applyNotifications(prefs, permissionStatus) {
  await cancelAllNotifications();
  if (prefs.morningEnabled && permissionStatus === 'granted') {
    await scheduleMorningWeightNotification(prefs.morningHour, prefs.morningMinute);
  }
  if (prefs.checkinEnabled && permissionStatus === 'granted') {
    await scheduleCheckinReminder(prefs.checkinDay, prefs.checkinHour, prefs.checkinMinute);
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
  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningHour, setMorningHour] = useState(7);
  const [morningMinute, setMorningMinute] = useState(0);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [checkinDay, setCheckinDay] = useState(0);
  const [checkinHour, setCheckinHour] = useState(18);
  const [checkinMinute, setCheckinMinute] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [saving, setSaving] = useState(false);

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
        const status = await requestNotificationPermissions();
        setPermissionStatus(status);
      } catch (_) {
        setPermissionStatus('denied');
      }
    }
    init();
  }, []);

  function scheduleApply(nextPrefs) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await applyNotifications(nextPrefs, permissionStatus);
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Volyume uses local notifications only. No marketing, ever.
          </Text>
        </View>
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
              A gentle reminder to step on the scale. Takes 3 seconds.
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
            </View>
          )}

          {/* Helper text */}
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>
              Reminds you to complete your weekly coaching check-in.
            </Text>
          </View>
        </View>

        {/* Bottom note */}
        <View style={styles.bottomNote}>
          <Text style={styles.bottomNoteText}>
            Volyume never sends marketing notifications. These are local-only reminders with no server involved. You can disable them anytime from your device settings.
          </Text>
        </View>

        {/* Saving indicator */}
        {saving && (
          <Text style={styles.savingText}>Saving...</Text>
        )}
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

  // Saving indicator
  savingText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
