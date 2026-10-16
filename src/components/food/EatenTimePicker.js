/**
 * EatenTimePicker -- the food-entry edit sheet's optional "what time did you
 * eat this" field (Ultimate-Audit item 15, D22 15b). Mirrors DiaryDatePicker
 * (the diary's date-jump picker, NAV-3) exactly: same
 * `@react-native-community/datetimepicker` dependency already wired into the
 * app (no new dependency), same platform split (Android shows a native modal
 * dialog once and reports; iOS renders an inline spinner in a small sheet
 * with a Done button, updating live until dismissed) -- the existing
 * time-picker idiom, just `mode="time"` instead of `mode="date"`.
 *
 * A calm, optional field: this never forces a choice. The caller (
 * FoodDetailSheet) decides whether a time is set at all; this component only
 * renders the platform picker when asked to open, and reports back a plain
 * ms-epoch time-of-day is resolved by the caller (it hands back a Date, the
 * caller keeps only hours/minutes against the entry's existing day).
 *
 * Food Diary audit 2026-10-16, item 5 (broken on iOS): the iOS spinner fires
 * on every wheel movement, and the caller closes the picker on each report,
 * so the first flick of the wheel shut it with a half-chosen time. On iOS the
 * wheel's value is now held here and reported once, on Done; closing the
 * sheet any other way changes nothing. Android is unchanged (its dialog
 * reports once, on "set"). The spinner follows the app's theme
 * (`themeVariant`), not the phone's, so it is readable on the sheet behind it.
 */
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, StyleSheet, Modal, Platform } from 'react-native';
import Text from '../Text';
import Button from '../Button';
import useAppStore from '../../store/useAppStore';
import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

/**
 * @param {boolean}  props.visible  whether the picker is shown
 * @param {Date}     props.value    the currently selected time (any Date;
 *                                  only its hours/minutes are read)
 * @param {Function} props.onChange called with the chosen Date
 * @param {Function} props.onClose  called to dismiss the picker
 */
export default function EatenTimePicker({ visible, value, onChange, onClose }) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const valueMs = value instanceof Date ? value.getTime() : NaN;
  // iOS: the wheel's value, held until Done. Re-seeded each time it opens.
  const [pending, setPending] = useState(null);
  useEffect(() => {
    if (visible) setPending(null);
  }, [visible, valueMs]);

  if (!visible) return null;

  const current = Number.isFinite(valueMs) ? value : new Date();

  const commit = (d) => { if (d) onChange?.(d); };

  const onNativeChange = (event, selected) => {
    if (Platform.OS === 'android') {
      onClose?.();
      if (event?.type === 'set' && selected) commit(selected);
    } else if (selected) {
      setPending(selected);
    }
  };

  const onDone = () => {
    if (pending) commit(pending);
    setPending(null);
    onClose?.();
  };
  // Closing without Done drops the half-chosen time, so a reopen never
  // flashes it (review finding 7).
  const onCancel = () => {
    setPending(null);
    onClose?.();
  };
  const themeVariant = t.resolvedTheme === 'light' ? 'light' : 'dark';

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
        <View style={[styles.backdrop, live.backdrop]}>
          <View style={[styles.sheet, live.sheet]}>
            <Text style={[styles.title, live.title]}>What time did you eat this?</Text>
            <DateTimePicker
              value={pending ?? current}
              mode="time"
              display="spinner"
              themeVariant={themeVariant}
              onChange={onNativeChange}
            />
            <View style={styles.actions}>
              <Button
                title="Done"
                size="sm"
                fullWidth={false}
                onPress={onDone}
                accessibilityLabel="Done choosing the time"
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <DateTimePicker
      value={current}
      mode="time"
      display="default"
      onChange={onNativeChange}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: colors.surfaceElevated ?? colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl,
  },
  title: { ...type.title, color: colors.textPrimary, marginBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. actions has no colour tokens.
function buildLiveStyles(t) {
  return {
    backdrop: { backgroundColor: t.colors.scrim },
    sheet: { backgroundColor: t.colors.surfaceElevated ?? t.colors.surface, borderColor: t.colors.border },
    title: { color: t.colors.textPrimary },
  };
}
