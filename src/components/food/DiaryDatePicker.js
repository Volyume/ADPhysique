/**
 * DiaryDatePicker — the diary's date-jump (NAV-3, elite audit
 * 2026-07-04). The diary previously only had single-day chevrons for the
 * whole history (`gotoYesterday`/`gotoTomorrow` in DiaryScreen), so
 * correcting food from three weeks ago meant ~21 chevron taps. Tapping the
 * date label now opens this, the platform's real date picker, the same
 * `@react-native-community/datetimepicker` already wired into the
 * progress-photo flows (see `PhotoDatePicker`) — no new dependency.
 *
 * Unlike `PhotoDatePicker` (PAST-only, for a photo's taken date), the diary
 * already allows navigating into the future via the forward chevron
 * (currently unbounded), so this picker carries no min/max restriction: it
 * only reports the chosen LOCAL day-key, leaving that existing chevron
 * behaviour untouched (fixing the unbounded-future chevron is a separate,
 * unrelated item).
 *
 * Same platform split as PhotoDatePicker: Android shows a native modal
 * dialog the moment it mounts and reports once; iOS renders an inline
 * spinner hosted in a small sheet with a Done button, updating live until
 * dismissed.
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View, Text, StyleSheet, Modal, Platform,
} from 'react-native';
import Button from '../Button';
import useAppStore from '../../store/useAppStore';
import { parseLocalDay } from '../../lib/dayKey';
import { isoDate } from '../../lib/food/diaryDates';
import {
  colors, spacing, radius, type,
} from '../../styles/theme';

/**
 * @param {boolean}  props.visible   whether the picker is shown
 * @param {string}   props.valueIso  the currently selected LOCAL day-key (YYYY-MM-DD)
 * @param {Function} props.onChange  called with the chosen day's LOCAL day-key
 * @param {Function} props.onClose   called to dismiss the picker
 */
export default function DiaryDatePicker({
  visible, valueIso, onChange, onClose,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);

  if (!visible) return null;

  const parsed = parseLocalDay(valueIso);
  const value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const commit = (d) => { if (d) onChange?.(isoDate(d)); };

  const onNativeChange = (event, selected) => {
    if (Platform.OS === 'android') {
      // Android fires once with 'set' or 'dismissed', then we unmount.
      onClose?.();
      if (event?.type === 'set' && selected) commit(selected);
    } else if (selected) {
      // iOS spinner updates live; the host sheet stays open until Done.
      commit(selected);
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal
        transparent
        visible
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Jump to a date</Text>
            <DateTimePicker
              value={value}
              mode="date"
              display="spinner"
              onChange={onNativeChange}
            />
            <View style={styles.actions}>
              <Button
                title="Done"
                size="sm"
                fullWidth={false}
                onPress={onClose}
                accessibilityLabel="Done choosing the date"
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode="date"
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
