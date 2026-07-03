/**
 * PhotoDatePicker — a small, controlled wrapper over the real
 * `@react-native-community/datetimepicker` for the progress-photo flows
 * (add "Photo details" step and the viewer date edit).
 *
 * Why a wrapper: the two platforms present the native picker very differently
 * (Android shows a modal dialog the moment the component mounts; iOS renders an
 * inline spinner we host in a small sheet with a Done button). This component
 * hides that split behind one controlled `visible` prop and one `onChange(ms)`
 * callback, and pins the single rule both flows need: the date is PAST-ONLY,
 * never the future (`maximumDate`, with a clamp belt-and-braces).
 *
 * It carries no weight or body number itself; it only reports a chosen day in
 * epoch-ms. The caller decides what to snapshot (upsertPhotoMeta re-reads the
 * nearest weigh-in when takenAt changes).
 *
 * Motion: the iOS host sheet opens without a fade under Reduce Motion.
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View, Text, StyleSheet, Modal, Platform,
} from 'react-native';
import Button from './Button';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, radius, type,
} from '../styles/theme';

/**
 * @param {boolean}  props.visible  whether the picker is shown
 * @param {number}   props.valueMs  the currently selected day (epoch ms)
 * @param {number}   [props.maxMs]  latest selectable day (default: now); the
 *                                  future is never selectable
 * @param {Function} props.onChange called with the chosen day in epoch ms
 * @param {Function} props.onClose  called to dismiss the picker
 */
export default function PhotoDatePicker({
  visible, valueMs, maxMs, onChange, onClose,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);

  if (!visible) return null;

  const maxDate = new Date(Number.isFinite(maxMs) ? maxMs : Date.now());
  const raw = Number.isFinite(valueMs) ? valueMs : Date.now();
  // Never seed the spinner in the future either.
  const value = new Date(Math.min(raw, maxDate.getTime()));

  // Clamp any selection to the max so the future can never be committed, even
  // if a platform briefly allows it.
  const commit = (d) => {
    if (!d) return;
    onChange?.(Math.min(d.getTime(), maxDate.getTime()));
  };

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
            <Text style={styles.title}>When was this taken?</Text>
            <DateTimePicker
              value={value}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
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
      maximumDate={maxDate}
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
