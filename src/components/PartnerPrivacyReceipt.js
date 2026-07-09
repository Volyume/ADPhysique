/**
 * PartnerPrivacyReceipt (DESIGN-SPEC B4), the brand's hero moment, shared by
 * the empty-state pitch and invite Beat 2 (where it is the recorded consent
 * notice). Screenshot-worthy by typesetting, not decoration: two columns,
 * "what crosses" against "what never does", a hairline rule between them.
 *
 * Motion: a single fade-and-rise on mount (motion.hero, emphasized-decelerate),
 * once. Reduce Motion renders it static, the app's standard flatten rule, and
 * all new motion runs on the UI thread via Reanimated (never JS-thread
 * Animated). On narrow widths the two columns stack (see, then never) rather
 * than truncate. British English, no em dash, no exclamation marks.
 */
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, radius, type, iconSize, withAlpha, alpha, motion, letterSpacing,
} from '../styles/theme';

// The two columns of the receipt. Copy is fixed (DESIGN-SPEC B4); it is echoed
// into the consent record via PARTNER_PRIVACY_NOTICE_VERSION, so it changes
// only with a version bump.
const CROSSES = [
  'Your first name',
  'Whether you trained this week',
  'Your shared streak in weeks',
  'Rest weeks shown as resting',
  'One fixed cheer a day',
  'A training phase name you choose to share',
];
const NEVER = [
  'Your sets, reps or loads',
  'Your body metrics or photos',
  'Your food diary',
  'Coach notes or check-ins',
  'Your location',
];

// Layout breakpoint (not a design token): below this the two columns stack so
// the lines never truncate. Mirrors the local-constant pattern the codebase
// uses for responsive thresholds (e.g. RestTimer COMPACT_HEIGHT).
const STACK_BELOW = 360;

export default function PartnerPrivacyReceipt() {
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const { width } = useWindowDimensions();
  const stack = width < STACK_BELOW;

  const body = (
    <>
      <Text style={styles.heading}>What your partner can see</Text>

      <View style={[styles.columns, stack && styles.columnsStack]}>
        <View style={styles.col}>
          <Text style={styles.colHeader}>THEY WILL SEE</Text>
          {CROSSES.map((line) => (
            <Text key={line} style={styles.crossLine}>{line}</Text>
          ))}
        </View>

        {stack ? <View style={styles.ruleH} /> : <View style={styles.ruleV} />}

        <View style={styles.col}>
          <Text style={styles.colHeader}>THEY NEVER SEE</Text>
          {NEVER.map((line) => (
            <View key={line} style={styles.neverRow}>
              <Ionicons
                name="lock-closed-outline"
                size={iconSize.sm}
                color={colors.textSecondary}
                style={styles.lockIcon}
              />
              <Text style={styles.neverLine}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footer}>
        Either of you can end this at any time. Everything shared is deleted.
      </Text>
    </>
  );

  if (reduceMotion) {
    return <View style={styles.card}>{body}</View>;
  }

  let entering;
  try {
    entering = FadeInDown.duration(motion.hero).easing(
      Easing.bezier(
        motion.easeDecelerate[0], motion.easeDecelerate[1],
        motion.easeDecelerate[2], motion.easeDecelerate[3],
      ),
    );
  } catch (_) {
    return <View style={styles.card}>{body}</View>;
  }

  return <Animated.View entering={entering} style={styles.card}>{body}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heading: { ...type.title, color: colors.textPrimary },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  columnsStack: { flexDirection: 'column' },
  col: { flex: 1, gap: spacing.md },
  colHeader: {
    ...type.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.caption,
  },
  // The vertical hairline between the two columns (side-by-side layout).
  ruleV: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: withAlpha(colors.border, alpha.strong),
    marginHorizontal: spacing.lg,
  },
  // The horizontal divider when the columns stack on a narrow width.
  ruleH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: withAlpha(colors.border, alpha.strong),
    marginVertical: spacing.lg,
  },
  crossLine: { ...type.body, color: colors.textPrimary },
  neverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lockIcon: { marginTop: spacing.xxs },
  neverLine: { ...type.body, color: colors.textSecondary, flex: 1 },
  footer: { ...type.caption, color: colors.textSecondary },
});
