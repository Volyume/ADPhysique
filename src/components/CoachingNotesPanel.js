/**
 * CoachingNotesPanel
 *
 * The "Technique guide" shown below the demo/illustration. Open by default so
 * the written how-to is visible immediately (when there's no animation, this IS
 * the demonstration). Renders structured form_cues when present, and folds in
 * the existing FORM_TIPS prose / coaching cue / exercise notes so nothing is
 * duplicated.
 *
 * Renders nothing if there is no content at all.
 *
 * Voice: British English. Visuals: #0D0D0D/#F5A623 tokens only.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function NumberedList({ items }) {
  if (!items?.length) return null;
  return (
    <View style={styles.list}>
      {items.map((line, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={styles.listNum}>{i + 1}</Text>
          <Text style={styles.listText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CoachingNotesPanel({ formCues, commonMistakes, formTip, coachingCue, notes }) {
  // Open by default. When there's no demo animation this written guide IS the
  // demonstration, so it must be visible, not hidden behind a tap — the card
  // above promises "Technique guide below", and this is it.
  const [open, setOpen] = useState(true);

  const cues = formCues && typeof formCues === 'object' ? formCues : null;
  const mistakes = Array.isArray(commonMistakes) ? commonMistakes : null;
  const prose = formTip || notes || null;

  const hasStructured = cues && (cues.setup?.length || cues.execution?.length || cues.cues?.length);
  const hasAny = hasStructured || mistakes?.length || prose || coachingCue;
  if (!hasAny) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Technique guide"
      >
        <Ionicons name="bulb-outline" size={16} color={colors.primary} />
        <Text style={styles.headerText}>Technique guide</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {coachingCue ? <Text style={styles.cue}>{coachingCue}</Text> : null}

          {hasStructured ? (
            <>
              {cues.setup?.length ? (
                <>
                  <Text style={styles.subhead}>Setup</Text>
                  <NumberedList items={cues.setup} />
                </>
              ) : null}
              {cues.execution?.length ? (
                <>
                  <Text style={styles.subhead}>Execution</Text>
                  <NumberedList items={cues.execution} />
                </>
              ) : null}
              {cues.cues?.length ? (
                <>
                  <Text style={styles.subhead}>Key cues</Text>
                  <View style={styles.chips}>
                    {cues.cues.map((c, i) => (
                      <View key={i} style={styles.pill}><Text style={styles.pillText}>{c}</Text></View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : prose ? (
            <Text style={styles.prose}>{prose}</Text>
          ) : null}

          {mistakes?.length ? (
            <>
              <Text style={styles.subhead}>Common mistakes</Text>
              {mistakes.map((m, i) => (
                <View key={i} style={styles.mistakeRow}>
                  <Ionicons name="warning-outline" size={14} color={colors.warning} />
                  <Text style={styles.mistakeText}>{m}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  cue: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  subhead: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: spacing.xs },
  prose: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 },
  list: { gap: spacing.xs },
  listRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  listNum: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary,
    minWidth: 16, textAlign: 'center',
  },
  listText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    backgroundColor: colors.primaryBg,
    borderColor: withAlpha(colors.primary, 0.4),
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  mistakeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  mistakeText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
