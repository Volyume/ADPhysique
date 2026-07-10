/**
 * PhotoDateRangeSheet — the calm "Filter by date" step for the progress-photo
 * timeline. It narrows which photos the gallery shows to a chosen day range,
 * so someone can look back at a particular stretch of time without scrolling.
 *
 * It collects two optional bounds and nothing else:
 *   - From, the earliest day to include (start of that day).
 *   - To, the latest day to include (end of that day).
 * Either side may be left open ("Any"), so "from March" or "up to last week"
 * both work. Both use the same real date picker as the add flow
 * (`PhotoDatePicker` over `@react-native-community/datetimepicker`), past-only.
 *
 * It is a dumb collector: it owns no persistence and no filtering. On Done it
 * hands back `{ fromMs, toMs }` (start-of-day / end-of-day, or null) and the
 * caller applies the filter. If the two ends are entered inverted, it quietly
 * swaps them so the range is always valid, with no error.
 *
 * This is neutral navigation only: no cadence, no streak, no "you last took one
 * N days ago". It simply moves the user's own private view around in time.
 *
 * Voice: plain and unhurried, British English, no em dash. Motion: opens
 * without a fade under Reduce Motion.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import PhotoDatePicker from './PhotoDatePicker';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, radius, type, iconSize,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { formatProgressPhotoDay } from '../lib/progressPhotoDates';

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ms) {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * @param {boolean}  props.visible   whether the sheet is shown
 * @param {number}   [props.fromMs]  the earliest bound to seed (epoch ms) or null
 * @param {number}   [props.toMs]    the latest bound to seed (epoch ms) or null
 * @param {Function} props.onApply   called with `{ fromMs, toMs }` (day-bounded, nullable)
 * @param {Function} props.onCancel  called to dismiss without applying
 */
export default function PhotoDateRangeSheet({
  visible, fromMs = null, toMs = null, onApply, onCancel,
}) {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [fromDraft, setFromDraft] = useState(Number.isFinite(fromMs) ? fromMs : null);
  const [toDraft, setToDraft] = useState(Number.isFinite(toMs) ? toMs : null);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  // Seed the drafts each time the sheet opens, so it reflects the range that is
  // actually applied and no stale picker state lingers.
  useEffect(() => {
    if (!visible) return;
    setFromDraft(Number.isFinite(fromMs) ? fromMs : null);
    setToDraft(Number.isFinite(toMs) ? toMs : null);
    setFromPickerOpen(false);
    setToPickerOpen(false);
  }, [visible, fromMs, toMs]);

  if (!visible) return null;

  const apply = () => {
    let f = fromDraft;
    let toVal = toDraft;
    // Quietly swap an inverted range so the result is always valid.
    if (Number.isFinite(f) && Number.isFinite(toVal) && f > toVal) { const s = f; f = toVal; toVal = s; }
    onApply?.({
      fromMs: Number.isFinite(f) ? startOfDay(f) : null,
      toMs: Number.isFinite(toVal) ? endOfDay(toVal) : null,
    });
  };

  const hasDraft = Number.isFinite(fromDraft) || Number.isFinite(toDraft);

  return (
    <Modal
      transparent
      visible
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, live.backdrop]}>
        <View style={[styles.sheet, live.sheet]}>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Filter by date</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.helper, live.helper]}>Show only photos within a range. Leave either side on Any to keep everything before or after it.</Text>

            <Text maxFontSizeMultiplier={1.3} style={[styles.sectionLabel, live.sectionLabel]}>From</Text>
            <TouchableOpacity
              style={[styles.dateField, live.dateField]}
              onPress={() => { setToPickerOpen(false); setFromPickerOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel={`Change the earliest date, currently ${Number.isFinite(fromDraft) ? formatProgressPhotoDay(fromDraft) : 'Any'}`}
            >
              <Ionicons name="calendar-outline" size={iconSize.md} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.dateText, live.dateText]} numberOfLines={1} ellipsizeMode="tail">{Number.isFinite(fromDraft) ? formatProgressPhotoDay(fromDraft) : 'Any'}</Text>
              <Ionicons name="chevron-down" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>

            <Text maxFontSizeMultiplier={1.3} style={[styles.sectionLabel, live.sectionLabel]}>To</Text>
            <TouchableOpacity
              style={[styles.dateField, live.dateField]}
              onPress={() => { setFromPickerOpen(false); setToPickerOpen(true); }}
              accessibilityRole="button"
              accessibilityLabel={`Change the latest date, currently ${Number.isFinite(toDraft) ? formatProgressPhotoDay(toDraft) : 'Any'}`}
            >
              <Ionicons name="calendar-outline" size={iconSize.md} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.dateText, live.dateText]} numberOfLines={1} ellipsizeMode="tail">{Number.isFinite(toDraft) ? formatProgressPhotoDay(toDraft) : 'Any'}</Text>
              <Ionicons name="chevron-down" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            {hasDraft ? (
              <Button
                title="Clear"
                variant="tertiary"
                size="sm"
                fullWidth={false}
                style={styles.actionButton}
                onPress={() => { setFromDraft(null); setToDraft(null); }}
                accessibilityLabel="Clear both dates"
              />
            ) : null}
            <Button
              title="Cancel"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              style={styles.actionButton}
              onPress={onCancel}
              accessibilityLabel="Cancel the date filter"
            />
            <Button
              title="Done"
              size="sm"
              fullWidth={false}
              style={styles.actionButton}
              onPress={apply}
              accessibilityLabel="Apply the date filter"
            />
          </View>
        </View>
      </View>

      <PhotoDatePicker
        visible={fromPickerOpen}
        valueMs={Number.isFinite(fromDraft) ? fromDraft : Date.now()}
        maxMs={Date.now()}
        onChange={setFromDraft}
        onClose={() => setFromPickerOpen(false)}
      />
      <PhotoDatePicker
        visible={toPickerOpen}
        valueMs={Number.isFinite(toDraft) ? toDraft : Date.now()}
        maxMs={Date.now()}
        onChange={setToDraft}
        onClose={() => setToPickerOpen(false)}
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
  helper: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  sectionLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  dateText: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 118,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. sheetScroll/sheetScrollBody/
// actions/actionButton have no colour tokens.
function buildLiveStyles(t) {
  return {
    backdrop: { backgroundColor: t.colors.scrim },
    sheet: { backgroundColor: t.colors.surfaceElevated ?? t.colors.surface, borderColor: t.colors.border },
    sheetTitle: { color: t.colors.textPrimary },
    helper: { color: t.colors.textMuted },
    sectionLabel: { color: t.colors.textMuted },
    dateField: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    dateText: { color: t.colors.textPrimary },
  };
}
