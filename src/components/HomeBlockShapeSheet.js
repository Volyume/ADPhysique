import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BlockShapeCard from './BlockShapeCard';
import { GLOSSARY } from '../lib/coachGlossary';
import BottomSheet from './BottomSheet';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// COMP-010: the shape of the current training block, opened from the meso
// chip. Makes periodisation visible and the recovery week a destination
// rather than a dip.
//
// D36a (item 17 modal tails, 2026-07-10): migrated off a hand-rolled Modal
// onto the shared BottomSheet chrome. BottomSheet owns the backdrop, drag
// handle, and bottom-inset padding itself, so `insetsBottom` (previously
// threaded in from HomeScreen's useSafeAreaInsets) and `reduceMotion`
// (BottomSheet reads it from the store itself) are no longer accepted --
// see HomeScreen.js's call site, which now omits both.
function HomeBlockShapeSheet({ visible, onClose, currentMesoWeek }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only.
  const t = useTheme();
  const live = {
    sheetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    sheetSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    sheetDefn: { ...t.type.bodySm, color: t.colors.textSecondary },
    sheetCancelText: { ...t.type.body, color: t.colors.textSecondary },
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Your block">
        <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Your block</Text>
        {currentMesoWeek?.mesoName ? <Text maxFontSizeMultiplier={1.3} style={[styles.sheetSub, live.sheetSub]}>{currentMesoWeek.mesoName}</Text> : null}
        <BlockShapeCard
          weekIndex={currentMesoWeek?.weekIndex}
          plannedWeeks={currentMesoWeek?.plannedWeeks}
          isDeload={currentMesoWeek?.isDeload}
        />
        {/* U-E-1/U-D-3: the chip is whole-tappable, so the plain-English
            definitions of its terms live here, in the sheet it opens. */}
        <Text maxFontSizeMultiplier={1.3} style={[styles.sheetDefn, live.sheetDefn]}>{GLOSSARY.deload}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.sheetDefn, live.sheetDefn]}>{GLOSSARY.rir}</Text>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text maxFontSizeMultiplier={1.3} style={[styles.sheetCancelText, live.sheetCancelText]}>Close</Text>
        </TouchableOpacity>
    </BottomSheet>
  );
}

export default React.memo(HomeBlockShapeSheet);

const styles = StyleSheet.create({
  // BottomSheet supplies the backdrop, panel chrome and drag handle now
  // (D36a migration) -- only the content-level styles below remain.
  sheetTitle: {
    ...type.h3,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  sheetDefn: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { ...type.body, color: colors.textSecondary },
});
