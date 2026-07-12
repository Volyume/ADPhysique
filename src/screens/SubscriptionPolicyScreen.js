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
 * Linked from Settings > Account and ProUpgradeScreen.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import { storeName } from '../lib/storeName';

export default function SubscriptionPolicyScreen() {
  const platformStore = storeName();
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen renders its sections/bullets via .map()-free static JSX inside a
  // plain ScrollView (no FlatList/FlashList/SectionList), so an unmemoised
  // call matches AddCustomFoodScreen's own precedent (batch D). Billing-
  // adjacent copy and links are untouched -- theming only.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Free, Pro, and your data" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, live.intro]}>
          Here's what you get on Free, what Pro adds, and what happens to
          your data if you ever switch back.
        </Text>

        <Section
          icon="checkmark-done-outline"
          tint={t.colors.success}
          title="What stays free"
        >
          {/* C7 (2026-07-11): 'no account needed' contradicted the identity
              rule - the app requires an account (Apple/Google sign-in, no
              anonymous mode, IDENTITY_AND_OWNERSHIP_LOCKED.md). Title
              aligned with the Welcome screen's card. */}
          <Body>
            The core logbook is free on every account, and your training data stays on your phone.
          </Body>
          <Bullet>Full workout logger with rest timer, beeps and haptics.</Bullet>
          <Bullet>400+ exercise library with form notes.</Bullet>
          <Bullet>31 ready-made plans you can pick from.</Bullet>
          <Bullet>Create your own routines from scratch.</Bullet>
          <Bullet>Workout history kept on your phone.</Bullet>
          <Bullet>Personal records and strength standing.</Bullet>
          <Bullet>Weekly muscle-group volume targets.</Bullet>
          <Bullet>Year of Lifts: a shareable review of your training year.</Bullet>
          <Bullet>Plate calculator.</Bullet>
          <Bullet>Training reminders.</Bullet>
          <Bullet>Export your training history to CSV anytime.</Bullet>
        </Section>

        <Section
          icon="barbell-outline"
          tint={t.colors.primary}
          title="What Pro adds"
        >
          <Body>
            Pro is the coach who writes back. Everything in Free stays; Pro adds a layer on top that adjusts your training each week based on how you're going.
          </Body>
          <Bullet>Coach decisions that nudge your training as your body responds.</Bullet>
          <Bullet>Personalised calorie and protein targets, updated as your goals change.</Bullet>
          <Bullet>Weekly check-ins with a written reason for every change, including what we held the same.</Bullet>
          <Bullet>Nutrition guidance tied to what you're working on right now.</Bullet>
          <Bullet>Body measurements: waist, chest, arms, legs and the rest.</Bullet>
          <Bullet>Morning weight log and the trend that drives your weekly check-in.</Bullet>
          <Bullet>An account so your data is backed up and follows you across phones.</Bullet>
        </Section>

        <Section
          icon="swap-horizontal-outline"
          tint={t.colors.warning}
          title="If you switch from Pro back to Free"
        >
          <Body>
            <Strong>Nothing you've logged disappears.</Strong> Every workout, every PR, every check-in stays on your phone exactly as you left it.
          </Body>
          <KeyPoint>
            You keep read access to everything you built on Pro.
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
          tint={t.colors.primary}
          title="Your free trial"
        >
          <Body>
            New accounts get Pro free for 14 days. You get the full coaching features and can see if it's for you.
          </Body>
          <Body>
            To keep Pro after that, subscribe in the app. Your store adds a further 7 days free, then it renews at the price shown at checkout until you cancel.
          </Body>
          <Bullet>The Free tier has no time limit: the plan library, your own training, and your progress charts stay free.</Bullet>
          <Bullet>Anything you built on Pro stays yours and readable even if you move to Free; only new coaching changes pause.</Bullet>
          <Bullet>Cancel anytime in {platformStore}. You keep Pro until the period you've paid for ends, then you drop to Free.</Bullet>
        </Section>

        <Section
          icon="trash-outline"
          tint={t.colors.error}
          title="Deleting your account"
        >
          <Body>
            <Strong>Deleting is different to switching back to Free.</Strong> It erases everything: your data on this phone, your backup, the account itself.
          </Body>
          <Body>
            Use it if you're leaving the app for good. If you only want to stop paying for Pro, use Switch to Free instead. That keeps your history.
          </Body>
        </Section>

        <Text style={[styles.footer, live.footer]}>
          We won't quietly raise prices, change what's free, or hold your data behind a paywall. If something changes, you'll hear about it first.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, tint, title, children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope (not
  // prop-drilled `live`/`t` from SubscriptionPolicyScreen, matching
  // AddCustomFoodScreen's Field/NumField precedent from batch D), own
  // useTheme() call and shared buildLiveStyles(t). `tint` itself already
  // arrives live from the caller (t.colors.*), so the icon and its
  // withAlpha() wash need no separate live entry here.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.section, live.section]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: withAlpha(tint, 0.125) }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={[styles.sectionTitle, live.sectionTitle]} accessibilityRole="header">{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Body({ children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope, own
  // useTheme() call, same reasoning as Section above.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return <Text style={[styles.body, live.body]}>{children}</Text>;
}

function Strong({ children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope, own
  // useTheme() call, same reasoning as Section above. fontWeight is not
  // part of useTheme()'s returned shape, so it stays frozen in styles.strong.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return <Text style={[styles.strong, live.strong]}>{children}</Text>;
}

function Bullet({ children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope, own
  // useTheme() call, same reasoning as Section above.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, live.bulletDot]} />
      <Text style={[styles.bulletText, live.bulletText]}>{children}</Text>
    </View>
  );
}

function KeyPoint({ children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope, own
  // useTheme() call, same reasoning as Section above.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.keypoint, live.keypoint]}>
      <Ionicons name="bookmark" size={14} color={t.colors.primary} />
      <Text style={[styles.keypointText, live.keypointText]}>{children}</Text>
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

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this file's six function-component scopes (SubscriptionPolicyScreen,
// Section, Body, Strong, Bullet, KeyPoint) so they can never drift out of
// step with each other or the frozen block. Pure layout keys
// (flex/gap/padding/width, no token) are correctly omitted -- there is
// nothing to unfreeze for them. `sectionIconWrap` needs no live entry: its
// colour comes entirely from the `tint` prop, itself already live at the
// call site. fontWeight.* is not part of useTheme()'s returned shape
// (src/hooks/useTheme.js) because it never varies by theme/contrast, so it
// stays frozen wherever the source style spreads it (styles.strong,
// styles.keypointText). Same pattern as AddCustomFoodScreen.js's
// buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    intro: { color: t.colors.textSecondary, fontSize: t.fontSize.md },
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    sectionTitle: { ...t.type.title, color: t.colors.textPrimary },
    body: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    strong: { color: t.colors.textPrimary },
    bulletDot: { backgroundColor: t.colors.primary },
    bulletText: { ...t.type.bodySm, color: t.colors.textSecondary },
    keypoint: { backgroundColor: t.colors.primaryBg, borderLeftColor: t.colors.primary },
    keypointText: { ...t.type.bodySm, color: t.colors.textPrimary },
    footer: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
