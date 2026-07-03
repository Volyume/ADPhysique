/**
 * PhotoDetailsSheet — the calm "Photo details" step shown after an image is
 * obtained (camera, library, or the guided ghost capture) and before the photo
 * is finalised (progress-photos DATING upgrade).
 *
 * It collects two things and nothing else:
 *   - Date taken, via the real date picker, defaulting to TODAY and selectable
 *     into the PAST only (never the future). This is what lets someone add last
 *     week's photo today and have it index under last week, with last week's
 *     weigh-in snapshotted onto it.
 *   - Pose (front/side/back), optional, pre-filled when the shot came from the
 *     guided capture for a pose.
 *
 * It is a dumb collector: it owns no persistence. On confirm it hands back
 * `{ takenAt, pose }` and the caller performs the save + upsertPhotoMeta (which
 * snapshots the nearest weigh-in for the chosen date). The default path stays
 * fast: today is pre-selected, so a normal add is a single "Save" tap.
 *
 * Voice: plain and unhurried, no cadence, no streak, no numbers on a body.
 * Motion: opens without a fade under Reduce Motion.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import PhotoDatePicker from './PhotoDatePicker';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, radius, type, iconSize,
} from '../styles/theme';

const POSES = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'back', label: 'Back' },
];

function formatDay(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return ''; }
}

/**
 * @param {boolean}  props.visible        whether the sheet is shown
 * @param {number}   [props.initialDateMs] the date to seed (default: today)
 * @param {string}   [props.initialPose]   the pose to pre-fill (guided capture)
 * @param {Function} props.onConfirm       called with `{ takenAt, pose }`
 * @param {Function} props.onCancel        called to dismiss without saving
 */
export default function PhotoDetailsSheet({
  visible, initialDateMs, initialPose = null, onConfirm, onCancel,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const [dateMs, setDateMs] = useState(Number.isFinite(initialDateMs) ? initialDateMs : Date.now());
  const [pose, setPose] = useState(initialPose ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset the drafts each time the sheet opens, so a fresh add always starts on
  // today with the seeded pose (and no stale picker state lingers).
  useEffect(() => {
    if (!visible) return;
    setDateMs(Number.isFinite(initialDateMs) ? initialDateMs : Date.now());
    setPose(initialPose ?? null);
    setPickerOpen(false);
  }, [visible, initialDateMs, initialPose]);

  if (!visible) return null;

  const onSelectPose = (key) => {
    // Re-tapping the active pose clears it; otherwise set it.
    setPose((prev) => (prev === key ? null : key));
  };

  return (
    <Modal
      transparent
      visible
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Photo details</Text>

          <Text style={styles.helper}>When was this taken?</Text>
          <TouchableOpacity
            style={styles.dateField}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Change the date, currently ${formatDay(dateMs)}`}
          >
            <Ionicons name="calendar-outline" size={iconSize.md} color={colors.primary} />
            <Text style={styles.dateText}>{formatDay(dateMs)}</Text>
            <Ionicons name="chevron-down" size={iconSize.sm} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Pose (optional)</Text>
          <View style={styles.poseSelector}>
            {POSES.map((p) => {
              const active = pose === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => onSelectPose(p.key)}
                  style={[styles.poseOption, active && styles.poseOptionActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Set pose to ${p.label}`}
                >
                  <Text style={[styles.poseOptionText, active && styles.poseOptionTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              onPress={onCancel}
              accessibilityLabel="Cancel adding the photo"
            />
            <Button
              title="Save"
              size="sm"
              fullWidth={false}
              onPress={() => onConfirm?.({ takenAt: dateMs, pose })}
              accessibilityLabel="Save the photo"
            />
          </View>
        </View>
      </View>

      <PhotoDatePicker
        visible={pickerOpen}
        valueMs={dateMs}
        maxMs={Date.now()}
        onChange={setDateMs}
        onClose={() => setPickerOpen(false)}
      />
    </Modal>
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
  sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.md },
  helper: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dateText: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  sectionLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  poseSelector: { flexDirection: 'row', gap: spacing.sm },
  poseOption: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  poseOptionActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  poseOptionText: { ...type.label, color: colors.textSecondary },
  poseOptionTextActive: { color: colors.primary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xl },
});
