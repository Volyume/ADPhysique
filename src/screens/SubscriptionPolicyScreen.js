/**
 * SubscriptionPolicyScreen
 *
 * The plain-English policy on what's free, what Pro adds, and what
 * happens to your data if you ever switch from Pro back to Free.
 *
 * Modelled on Hevy's downgrade-friendly approach (Help Center article
 * 38279350428695): anything created on Pro stays accessible read-only
 * on Free, yours forever, even after a downgrade.
 *
 * Linked from Settings → Account and ProUpgradeScreen.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle } from '../styles/theme';
import BackHeader from '../components/BackHeader';

export default function SubscriptionPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Free, Pro, and your data" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Here's what you get on Free, what Pro adds, and what happens to
          your data if you ever switch back.
        </Text>

        <Section
          icon="checkmark-done-outline"
          tint={colors.success}
          title="What's always free"
        >
          <Body>
            The core logbook is yours, no account needed. Everything stays on your phone.
          </Body>
          <Bullet>Full workout logger with rest timer, beeps and haptics.</Bullet>
          <Bullet>400+ exercise library with form notes.</Bullet>
          <Bullet>31 ready-made plans you can pick from.</Bullet>
          <Bullet>Build your own routines from scratch.</Bullet>
          <Bullet>Workout history kept on your phone.</Bullet>
          <Bullet>Personal records and strength standing.</Bullet>
          <Bullet>Weekly muscle-group volume targets.</Bullet>
          <Bullet>Year of Lifts: your training year in one card.</Bullet>
          <Bullet>Plate calculator.</Bullet>
          <Bullet>Training reminders.</Bullet>
          <Bullet>Export your training history to CSV anytime.</Bullet>
        </Section>

        <Section
          icon="sparkles-outline"
          tint={colors.primary}
          title="What Pro adds"
        >
          <Body>
            Pro is the coach who writes back. Everything in Free stays; Pro adds a layer on top that adjusts your training each week based on how you're going.
          </Body>
          <Bullet>Precision Coaching™ that nudges your training as your body responds.</Bullet>
          <Bullet>Personalised calorie and protein targets, updated as your goals change.</Bullet>
          <Bullet>Weekly check-ins with a written reason for every change, including what we held the same.</Bullet>
          <Bullet>Nutrition guidance tied to what you're working on right now.</Bullet>
          <Bullet>Body measurements: waist, chest, arms, legs and the rest.</Bullet>
          <Bullet>Morning weight log and the trend that drives your weekly check-in.</Bullet>
          <Bullet>An account so your data is backed up and follows you across phones.</Bullet>
        </Section>

        <Section
          icon="swap-horizontal-outline"
          tint={colors.warning}
          title="If you switch from Pro back to Free"
        >
          <Body>
            <Strong>Nothing you've logged disappears.</Strong> Every workout, every PR, every check-in stays on your phone exactly as you left it.
          </Body>
          <KeyPoint>
            You keep read access to everything you built on Pro, forever.
          </KeyPoint>
          <Body>
            What changes on Free:
          </Body>
          <Bullet>Past coaching write-ups stay readable in your history.</Bullet>
          <Bullet>Past check-ins stay viewable; you just can't run new ones.</Bullet>
          <Bullet>Plans you built on Pro stay viewable; you can re-use them, but you won't get new coaching changes week to week.</Bullet>
          <Bullet>Nutrition targets last set on Pro stay visible; they just won't auto-update.</Bullet>
          <Bullet>Body measurements you've logged stay there; only new entries pause.</Bullet>
        </Section>

        <Section
          icon="time-outline"
          tint={colors.primary}
          title="Your free trial"
        >
          <Body>
            New accounts get Pro free for 14 days. You get the full coaching features and can see if it's for you.
          </Body>
          <Body>
            To keep Pro after that, subscribe in the app. Google Play adds a further 7 days free, then it renews monthly at the price shown at checkout until you cancel.
          </Body>
          <Bullet>The Free tier has no time limit: the plan library, your own training, and your progress charts stay free.</Bullet>
          <Bullet>Anything you built on Pro stays yours and readable even if you move to Free; only new coaching changes pause.</Bullet>
          <Bullet>Cancel anytime in Google Play. You keep Pro until the period you've paid for ends, then you drop to Free.</Bullet>
        </Section>

        <Section
          icon="trash-outline"
          tint={colors.error}
          title="Deleting your account"
        >
          <Body>
            <Strong>Deleting is different to switching back to Free.</Strong> It erases everything: your data on this phone, your backup, the account itself.
          </Body>
          <Body>
            Use it if you're leaving the app for good. If you only want to stop paying for Pro, use Switch to Free instead. That keeps your history.
          </Body>
        </Section>

        <Text style={styles.footer}>
          We won't quietly raise prices, change what's free, or hold your data behind a paywall. If something changes, you'll hear about it first.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, tint, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: withAlpha(tint, 0.125) }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Body({ children }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Strong({ children }) {
  return <Text style={styles.strong}>{children}</Text>;
}

function Bullet({ children }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function KeyPoint({ children }) {
  return (
    <View style={styles.keypoint}>
      <Ionicons name="bookmark" size={14} color={colors.primary} />
      <Text style={styles.keypointText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  intro: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 },

  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconWrap: { width: 32, height: 32, borderRadius: circle(32), alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...type.title, color: colors.textPrimary, flex: 1 },
  sectionBody: { gap: spacing.sm },

  body: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 21 },
  strong: { color: colors.textPrimary, fontWeight: fontWeight.bold },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingLeft: spacing.xs },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginTop: spacing.sm },
  bulletText: { ...type.bodySm, color: colors.textSecondary, flex: 1 },

  keypoint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary, marginTop: spacing.xs },
  keypointText: { ...type.bodySm, color: colors.textPrimary, flex: 1, fontWeight: fontWeight.medium },

  footer: { ...type.captionTight, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
});
