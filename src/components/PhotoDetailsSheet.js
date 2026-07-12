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
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import PhotoDatePicker from './PhotoDatePicker';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, radius, type, iconSize, motion,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';

const POSES = [
  { key: 'front', label: 'Front', icon: 'body-outline' },
  { key: 'side', label: 'Side', icon: 'swap-horizontal-outline' },
  { key: 'back', label: 'Back', icon: 'walk-outline' },
];

/**
 * @param {boolean}  props.visible        whether the sheet is shown
 * @param {number}   [props.initialDateMs] the date to seed (default: today)
 * @param {string}   [props.initialPose]   the pose to pre-fill (guided capture)
 * @param {string}   [props.previewUri]     optional image preview for picker/camera routes
 * @param {Function} props.onConfirm       called with `{ takenAt, pose }`
 * @param {Function} props.onCancel        called to dismiss without saving
 */
export default function PhotoDetailsSheet({
  visible, initialDateMs, initialPose = null, previewUri = null, onConfirm, onCancel,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
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
      <Pressable
        style={[styles.backdrop, live.backdrop]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Dismiss photo details"
      >
        <View style={[styles.sheet, live.sheet]} onStartShouldSetResponder={() => true}>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sheetTitle, live.sheetTitle]}>Photo details</Text>
            <Text style={[styles.sheetIntro, live.sheetIntro]}>
              Add the date and pose so Progress Photos can keep this image in the right place.
            </Text>
            {previewUri ? (
              <View style={[styles.previewWrap, live.previewWrap]}>
                <Image
                  source={{ uri: previewUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={reduceMotion ? 0 : motion.state}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel="Selected progress photo preview"
                />
              </View>
            ) : null}
            <View style={[styles.contextBox, live.contextBox]}>
              <Ionicons name="shield-checkmark-outline" size={iconSize.sm} color={t.colors.primary} />
              <Text style={[styles.contextText, live.contextText]}>
                Date and pose make future reviews fairer by grouping photos from the same day together.
              </Text>
            </View>

            <Text style={[styles.helper, live.helper]}>When was this photo taken?</Text>
            <TouchableOpacity
              style={[styles.dateField, live.dateField]}
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Change the date, currently ${formatProgressPhotoDay(dateMs)}`}
            >
              <Ionicons name="calendar-outline" size={iconSize.md} color={t.colors.primary} />
              <Text style={[styles.dateText, live.dateText]} numberOfLines={1} ellipsizeMode="tail">{formatProgressPhotoDay(dateMs)}</Text>
              <Ionicons name="chevron-down" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, live.sectionLabel]}>Pose</Text>
            <View style={styles.poseSelector}>
              {POSES.map((p) => {
                const active = pose === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => onSelectPose(p.key)}
                    style={[styles.poseOption, live.poseOption, active && [styles.poseOptionActive, live.poseOptionActive]]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Set pose to ${p.label}`}
                  >
                    <Ionicons
                      name={p.icon}
                      size={iconSize.sm}
                      color={active ? t.colors.primary : t.colors.textMuted}
                    />
                    <Text style={[styles.poseOptionText, live.poseOptionText, active && [styles.poseOptionTextActive, live.poseOptionTextActive]]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              style={styles.actionButton}
              onPress={onCancel}
              accessibilityLabel="Cancel adding the photo"
            />
            <Button
              title="Save photo"
              size="sm"
              fullWidth={false}
              style={styles.actionButton}
              onPress={() => onConfirm?.({ takenAt: dateMs, pose })}
              accessibilityLabel="Save the progress photo"
            />
          </View>
        </View>
      </Pressable>

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
    maxHeight: '90%',
  },
  sheetScroll: { flexShrink: 1, minHeight: 0 },
  sheetScrollBody: { paddingBottom: spacing.xs },
  sheetTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.md },
  sheetIntro: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
  previewWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 260,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  previewImage: { width: '100%', height: '100%' },
  contextBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  contextText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
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
    flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  poseOptionActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  poseOptionText: { ...type.label, color: colors.textSecondary },
  poseOptionTextActive: { color: colors.primary },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 136,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. sheetScroll/sheetScrollBody/
// previewImage/poseSelector/actions/actionButton have no colour tokens.
function buildLiveStyles(t) {
  return {
    backdrop: { backgroundColor: t.colors.scrim },
    sheet: { backgroundColor: t.colors.surfaceElevated ?? t.colors.surface, borderColor: t.colors.border },
    sheetTitle: { color: t.colors.textPrimary },
    sheetIntro: { color: t.colors.textSecondary },
    previewWrap: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    contextBox: { backgroundColor: t.colors.primaryBg },
    contextText: { color: t.colors.textPrimary },
    helper: { color: t.colors.textMuted },
    dateField: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    dateText: { color: t.colors.textPrimary },
    sectionLabel: { color: t.colors.textMuted },
    poseOption: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    poseOptionActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    poseOptionText: { color: t.colors.textSecondary },
    poseOptionTextActive: { color: t.colors.primary },
  };
}
