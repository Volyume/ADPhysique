/**
 * NutritionEducationScreen
 *
 * 5-minute friendly explainer for someone who's never thought about
 * calories or macros, what they are, why each matters, how to
 * actually put a diet together, and what level of accuracy is enough.
 *
 * Linked from NutritionTargetsScreen so it's the
 * first thing a new Pro user reads before fiddling with numbers.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';

export default function NutritionEducationScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Nutrition basics" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          If you've never tracked calories or macros, this is the 5-minute
          version of why they matter and how to use them without it taking
          over your life.
        </Text>

        <Section
          icon="flame-outline"
          tint={colors.warning}
          title="1. Calories. Your energy budget"
        >
          <Body>
            Your body burns energy every day just existing, plus more on top for
            training and movement. That total is your maintenance.
          </Body>
          <Body>
            Eat below maintenance over time and you lose weight. Eat above and
            you gain. The body composition change follows the weekly average,
            not any single day. One big meal won't undo a week of progress.
          </Body>
          <KeyPoint>Trend over weeks &gt; perfection on any day.</KeyPoint>
          <Body>
            Cardio and steps are part of that maintenance number. When you log
            a session, the calorie estimate is feedback, not extra food budget.
          </Body>
          <KeyPoint>
            Other apps add exercise calories back on top. Volyume never does.
            Your weight trend already counts everything you burn, so nothing is
            counted twice.
          </KeyPoint>
        </Section>

        <Section
          icon="restaurant-outline"
          tint={colors.primary}
          title="2. The three macros"
        >
          <Body>
            All food is made of three macronutrients. Each does a different job.
          </Body>
          <MacroLine
            color={colors.primary}
            name="Protein"
            kcalPerG="4 kcal/g"
            role="Builds and protects muscle. The non-negotiable. Get this right and the rest is much more forgiving."
          />
          <MacroLine
            color={colors.warning}
            name="Fat"
            kcalPerG="9 kcal/g"
            role="Hormones, vitamins, joint health. Keep above a minimum. Don't go ultra-low."
          />
          <MacroLine
            color={colors.success}
            name="Carbs"
            kcalPerG="4 kcal/g"
            role="Training fuel. Higher carbs = better performance in the gym, especially in a bulk."
          />
        </Section>

        <Section
          icon="podium-outline"
          tint={colors.primary}
          title="3. How to set your numbers"
        >
          <Body>
            Volyume calculates a starting point for you from your goal, age,
            weight and activity. The rough idea:
          </Body>
          <PhaseLine name="Cut" rate="lose 0.5 to 0.8% bodyweight per week" gist="calories down, protein up to protect muscle" />
          <PhaseLine name="Maintain" rate="weight steady" gist="calories at maintenance, protein moderate" />
          <PhaseLine name="Lean gain" rate="gain 0.25 to 0.5% per week" gist="small surplus, slow tissue gain, minimal fat" />
          <PhaseLine name="Bulk" rate="gain 0.5 to 1% per week" gist="larger surplus, faster growth, some fat comes with it" />
          <KeyPoint>
            You don't have to do the maths. Log your morning weight and weekly
            check-in. Your coach watches the trend and nudges these numbers
            up or down for you when a real signal is there.
          </KeyPoint>
        </Section>

        <Section
          icon="scale-outline"
          tint={colors.success}
          title="4. How to actually track"
        >
          <Body>
            You don't need to weigh every gram. Pick what fits your life:
          </Body>
          <BulletRow num="A">
            <Body>
              <Strong>Log it in the app.</Strong> Open your food diary, scan a
              barcode, snap a label, or pick a saved meal. The first week is the
              slowest; after that most meals are repeats.
            </Body>
          </BulletRow>
          <BulletRow num="B">
            <Body>
              <Strong>Weigh the protein source dry/raw,</Strong> eyeball the
              rest. A palm of chicken is roughly 25 to 30g protein. A cupped hand of rice
              ≈ 40g carbs. A thumb of oil/butter ≈ 10g fat.
            </Body>
          </BulletRow>
          <BulletRow num="C">
            <Body>
              <Strong>Or repeat meals.</Strong> The simplest plan is 3 to 5 meals
              you already know the totals for, eaten in the same proportions
              every day. No tracking needed once you've measured them once.
            </Body>
          </BulletRow>
        </Section>

        <Section
          icon="checkmark-circle-outline"
          tint={colors.success}
          title="5. Adherence beats perfection"
        >
          <Body>
            Hitting your protein every day matters more than hitting your
            calories to the gram. If you can stay within ±100 kcal of your
            target on most days, you're doing it right.
          </Body>
          <KeyPoint>
            Miss a day? Don't double up the next day. Pick up where you left
            off. The weekly average is what counts.
          </KeyPoint>
        </Section>

        <Section
          icon="trending-up-outline"
          tint={colors.primary}
          title="6. The coach does the adjustments"
        >
          <Body>
            You don't need to second-guess the numbers each week. Volyume's
            weekly check-in watches your morning weight trend, compares it
            to the target rate for your phase, and shifts your calories up
            or down when a real signal appears, and ignores noisy single-
            week swings (water, sodium, sleep, time of month).
          </Body>
          <Body>
            Two safety nets are built in: a 5% cap on any single change so
            it never swings too hard, and a 2-week cooldown after each
            change so the trend has time to react before the next one.
            The result you'll see is small, infrequent nudges, not weekly
            churn.
          </Body>
          <KeyPoint>
            Your job: log your morning weight most days and fill in the
            weekly check-in. The coach does the rest.
          </KeyPoint>
        </Section>

        {/* "Coming soon" teaser removed 2026-05-27 per CLAUDE.md design
            rule: "Coming soon placeholders or greyed-out future features.
            Ship what's there or hide it." The teaser was promising a diet
            builder that doesn't exist. */}

        <Text style={styles.footer}>
          Volyume's starting numbers are estimates. The 2 to 4 week trend is what
          counts. That's exactly what the coach watches for you.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Building blocks ──────────────────────────────────────────────────────

function Section({ icon, tint, title, children }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: withAlpha(tint, 0.125) }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

function Body({ children }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Strong({ children }) {
  return <Text style={styles.strong}>{children}</Text>;
}

function KeyPoint({ children }) {
  return (
    <View style={styles.keypoint}>
      <Ionicons name="bookmark" size={14} color={colors.primary} />
      <Text style={styles.keypointText}>{children}</Text>
    </View>
  );
}

function MacroLine({ color, name, kcalPerG, role }) {
  return (
    <View style={styles.macroLine}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.macroHead}>
          <Text style={styles.macroName}>{name}</Text>
          <Text style={styles.macroKcal}>{kcalPerG}</Text>
        </View>
        <Text style={styles.macroRole}>{role}</Text>
      </View>
    </View>
  );
}

function PhaseLine({ name, rate, gist }) {
  return (
    <View style={styles.phaseLine}>
      <View style={styles.phaseHead}>
        <Text style={styles.phaseName}>{name}</Text>
        <Text style={styles.phaseRate}>{rate}</Text>
      </View>
      <Text style={styles.phaseGist}>{gist}</Text>
    </View>
  );
}

function BulletRow({ num, children }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletChip}><Text style={styles.bulletChipText}>{num}</Text></View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  intro: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 },

  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconWrap: { width: 32, height: 32, borderRadius: circle(32), alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...type.title, color: colors.textPrimary, flex: 1 },
  sectionBody: { gap: spacing.sm },

  body: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 21 },
  strong: { color: colors.textPrimary, fontWeight: fontWeight.bold },

  keypoint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary, marginTop: spacing.xs },
  keypointText: { ...type.bodySm, color: colors.textPrimary, flex: 1, fontWeight: fontWeight.medium },

  macroLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  macroDot: { width: 10, height: 10, borderRadius: circle(10), marginTop: 6 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  macroName: { ...type.bodyStrong, color: colors.textPrimary },
  macroKcal: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  macroRole: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xxs },

  phaseLine: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs },
  phaseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  phaseName: { ...type.bodyStrong, color: colors.textPrimary },
  phaseRate: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  phaseGist: { ...type.bodySm, color: colors.textSecondary },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
  bulletChip: { width: 22, height: 22, borderRadius: circle(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bulletChipText: { color: colors.onPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  footer: { ...type.captionTight, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
});
