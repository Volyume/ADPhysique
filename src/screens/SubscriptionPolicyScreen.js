/**
 * SubscriptionPolicyScreen
 *
 * The plain-English policy on what's free, what Pro adds, and what
 * happens to your data if you ever switch from Pro back to Free.
 *
 * Modelled on Hevy's downgrade-friendly approach (Help Center article
 * 38279350428695): anything created on Pro stays accessible read-only
 * on Free. Volyume extends this to anything created during the free
 * beta period — yours forever, even after we move Pro to paid.
 *
 * Linked from Settings → Account and ProUpgradeScreen.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

export default function SubscriptionPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Free, Pro, and your data</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Plain English: here's what you get on Free, what Pro adds, and
          exactly what happens to your data if you ever switch back to Free.
        </Text>

        <Section
          icon="checkmark-done-outline"
          tint={colors.success}
          title="What's always free"
        >
          <Body>
            The core logbook is yours forever, no account needed.
          </Body>
          <Bullet>Full workout logger with rest timer.</Bullet>
          <Bullet>300+ exercise library and starter templates.</Bullet>
          <Bullet>Workout history kept on your device.</Bullet>
          <Bullet>Personal records and the PR Wall.</Bullet>
          <Bullet>Body weight tracking.</Bullet>
          <Bullet>Weekly muscle-group volume targets.</Bullet>
          <Bullet>Local backup and CSV export, any time.</Bullet>
          <Bullet>Optional cloud sync with a free account — your data, backed up.</Bullet>
        </Section>

        <Section
          icon="sparkles-outline"
          tint={colors.primary}
          title="What Pro adds"
        >
          <Body>
            Pro is the coach who writes back. Everything in Free stays;
            Pro layers an adaptive coaching loop on top.
          </Body>
          <Bullet>Precision Coaching that adjusts your training as your body responds.</Bullet>
          <Bullet>Personalised calorie and protein targets, updated as your goals change.</Bullet>
          <Bullet>Weekly check-ins with a written explanation of every coach decision.</Bullet>
          <Bullet>Mesocycles and the programme builder.</Bullet>
          <Bullet>Body metrics tracking beyond weight.</Bullet>
        </Section>

        <Section
          icon="swap-horizontal-outline"
          tint={colors.warning}
          title="If you switch from Pro back to Free"
        >
          <Body>
            <Strong>Nothing you created disappears.</Strong> Every workout, every
            PR, every check-in stays on your device and in your cloud backup
            exactly as you left it.
          </Body>
          <KeyPoint>
            You keep read access to all of your Pro-created data forever — even
            after switching to Free.
          </KeyPoint>
          <Body>
            What changes on Free:
          </Body>
          <Bullet>Past coach outputs stay readable in your history.</Bullet>
          <Bullet>Past check-ins stay viewable; you just can't run new ones.</Bullet>
          <Bullet>Mesocycles and programmes you built on Pro stay viewable; you can re-use templates but won't get new coaching adjustments.</Bullet>
          <Bullet>Nutrition targets last set on Pro stay visible, but won't auto-update without Pro.</Bullet>
          <Bullet>Body metrics you've logged stay there; only the tracking entry is Pro-only going forward.</Bullet>
        </Section>

        <Section
          icon="time-outline"
          tint={colors.primary}
          title="The free-beta period"
        >
          <Body>
            Volyume is fully free during the beta — including Pro features —
            while we test, iterate, and listen to feedback.
          </Body>
          <Body>
            When Pro becomes a paid feature, beta users get:
          </Body>
          <Bullet>At least <Strong>90 days' notice</Strong> in the app and by email before any charge.</Bullet>
          <Bullet>Anything you created during the free beta stays yours, readable forever, even if you choose to stay on Free.</Bullet>
          <Bullet>A clear list of what's moving behind Pro, and what stays free, well before the change.</Bullet>
          <Bullet>An honest reason for the change — supporting continued development of the app.</Bullet>
        </Section>

        <Section
          icon="trash-outline"
          tint={colors.error}
          title="Deleting your account"
        >
          <Body>
            <Strong>Account deletion is different.</Strong> It's the destructive
            action — it erases everything: your local data, your cloud backup,
            your account.
          </Body>
          <Body>
            Use it if you're leaving the app entirely. If you only want to
            stop paying for Pro, use Switch to Free instead — that keeps your
            history intact.
          </Body>
        </Section>

        <Text style={styles.footer}>
          We'll never quietly raise prices, change what's free, or strand your
          data behind a paywall. If something changes, you'll hear about it
          first.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, tint, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: tint + '20' }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  intro: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 },

  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, flex: 1 },
  sectionBody: { gap: spacing.sm },

  body: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 21 },
  strong: { color: colors.textPrimary, fontWeight: fontWeight.bold },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingLeft: spacing.xs },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginTop: 8 },
  bulletText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },

  keypoint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary, marginTop: spacing.xs },
  keypointText: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20, flex: 1, fontWeight: fontWeight.medium },

  footer: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
});
