import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import BlockShapeCard from './BlockShapeCard';
import { GLOSSARY } from '../lib/coachGlossary';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// COMP-010: the shape of the current training block, opened from the meso
// chip. Makes periodisation visible and the recovery week a destination
// rather than a dip.
function HomeBlockShapeSheet({ visible, onClose, currentMesoWeek, reduceMotion, insetsBottom }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { paddingBottom: spacing.xxxl + insetsBottom }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Your block</Text>
        {currentMesoWeek?.mesoName ? <Text style={styles.sheetSub}>{currentMesoWeek.mesoName}</Text> : null}
        <View style={{ paddingVertical: spacing.md }}>
          <BlockShapeCard
            weekIndex={currentMesoWeek?.weekIndex}
            plannedWeeks={currentMesoWeek?.plannedWeeks}
            isDeload={currentMesoWeek?.isDeload}
          />
        </View>
        {/* U-E-1/U-D-3: the chip is whole-tappable, so the plain-English
            definitions of its terms live here, in the sheet it opens. */}
        <Text style={styles.sheetDefn}>{GLOSSARY.deload}</Text>
        <Text style={styles.sheetDefn}>{GLOSSARY.rir}</Text>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.sheetCancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default React.memo(HomeBlockShapeSheet);

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: radius.hair,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...type.h3,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  sheetDefn: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { ...type.body, color: colors.textSecondary },
});
