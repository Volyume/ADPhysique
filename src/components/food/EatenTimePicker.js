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
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
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

  if (!visible) return null;

  const current = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();

  const commit = (d) => { if (d) onChange?.(d); };

  const onNativeChange = (event, selected) => {
    if (Platform.OS === 'android') {
      onClose?.();
      if (event?.type === 'set' && selected) commit(selected);
    } else if (selected) {
      commit(selected);
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
        <View style={[styles.backdrop, live.backdrop]}>
          <View style={[styles.sheet, live.sheet]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>What time did you eat this?</Text>
            <DateTimePicker
              value={current}
              mode="time"
              display="spinner"
              onChange={onNativeChange}
            />
            <View style={styles.actions}>
              <Button
                title="Done"
                size="sm"
                fullWidth={false}
                onPress={onClose}
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
