import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';

const LAST_UPDATED = '4 July 2026';

export default function PrivacyPolicyScreen() {
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen renders its sections via .map()-free static JSX inside a plain
  // ScrollView (no FlatList/FlashList/SectionList), so an unmemoised call
  // matches AddCustomFoodScreen's own precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      <BackHeader title="Privacy Policy" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, live.updated]}>Last updated {LAST_UPDATED}</Text>

        <Section title="What Volyume collects">
          <Body>
            Volyume collects information you provide directly: your name, email address, profile details,
            body measurements, workout logs, food diary entries, check-ins, training preferences, and the
            settings you choose. This data is used solely to run the app and give you personalised training
            and nutrition guidance.
          </Body>
          <Body>
            If you use Progress Photos or Volyume Score analysis, the photo files stay on this device unless you choose
            to share or export them. The app may store local metadata and analysis outputs such as photo quality,
            result confidence, leanness band, Volyume Score and progress change. Volyume Score is a simple
            progress read, not a DEXA scan, diagnosis, medical assessment, or medical advice.
          </Body>
          <Body>
            We do not sell your data. We do not share it with third parties for advertising purposes.
          </Body>
        </Section>

        <Section title="How your data is stored">
          <Body>
            Your data is stored locally on your device and, if you create an account, synchronised to our
            secure cloud database in Supabase's EU region. All data in transit is encrypted via HTTPS. Auth
            tokens are stored in your device's secure encrypted storage.
          </Body>
          <Body>
            Progress photo image files are device-local. Cloud-backed account data is protected with
            row-level security so only you, and the team supporting your account when needed, can see it.
          </Body>
        </Section>

        <Section title="Nutrition and training information">
          <Body>
            Calorie targets, macro splits, and training guidance provided by Volyume are estimates based on
            established scientific principles. They are not medical advice. Always consult a qualified
            healthcare professional before making significant changes to your diet or exercise programme,
            particularly if you have a pre-existing medical condition.
          </Body>
        </Section>

        <Section title="Body metrics and sensitive data">
          <Body>
            Body weight, measurements, food logs, check-ins, eating-habits screening, progress photos and
            progress photo analysis outputs are treated as sensitive health data. They are never sold, never shared for
            advertising, and never used for third-party model training.
          </Body>
        </Section>

        <Section title="Usage data">
          <Body>
            Volyume keeps first-party usage telemetry to see which features get
            used and where the app is slow: things like which screens open, when
            a sync runs, and whether a purchase flow completes. It is tied to a
            pseudonymous account id, not your name, and it never includes your
            training, food, or body data.
          </Body>
          <Body>
            We do not use third-party analytics or tracking tools, and we do not
            build advertising profiles. The lawful basis is legitimate interest
            (keeping the app working and worth using). You can switch usage data off in
            Settings &gt; Privacy &amp; legal &gt; Share usage data, and once off,
            nothing further is collected or sent. Crash and performance reports are sent through Sentry with
            known health, nutrition and photo fields scrubbed.
          </Body>
        </Section>

        <Section title="Your rights">
          <Body>
            You can export your workout sets as CSV from Settings &gt; Your data &gt; Export workout log.
            You can also create a JSON backup of app database records, including workout, nutrition, body
            metric, progress photo metadata and Volyume Score analysis metadata. The JSON backup does not bundle
            private photo image files.
          </Body>
          <Body>
            You can permanently delete your account from Settings &gt; Account &gt; Delete account. Cloud removal
            starts immediately and local data is wiped on this device; if final sign-in removal cannot finish
            while offline, Volyume tells you and completes it when you reconnect. Backup copies are purged
            within 30 days.
          </Body>
          <Body>
            If you are in the European Economic Area or United Kingdom, you have additional rights under GDPR,
            including the right to access, rectify, port, or erase your personal data. Contact us at
            support@volyume.app to exercise these rights.
          </Body>
        </Section>

        <Section title="Children">
          <Body>
            Volyume is not directed at children under 13. We do not knowingly collect data from anyone under 13.
          </Body>
        </Section>

        <Section title="Changes to this policy">
          <Body>
            We may update this policy from time to time. We will notify you of significant changes within the
            app. If you carry on using Volyume after the changes take effect, that counts as accepting the updated policy.
          </Body>
        </Section>

        <Section title="Contact">
          <Body>
            Questions or requests: support@volyume.app
          </Body>
        </Section>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  // CP-10 batch F (2026-07-11): sibling function-component scope (not
  // prop-drilled `live`/`t` from PrivacyPolicyScreen, matching
  // AddCustomFoodScreen's Field/NumField precedent from batch D), own
  // useTheme() call and shared buildLiveStyles(t).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, live.sectionTitle]} accessibilityRole="header">{title}</Text>
      {children}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  updated: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...type.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  footer: { height: spacing.xl },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this file's three function-component scopes (PrivacyPolicyScreen,
// Section, Body) so they can never drift out of step with each other or the
// frozen block. Pure layout keys (flex/padding/height, no token) are
// correctly omitted -- there is nothing to unfreeze for them. Same pattern
// as AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    updated: { ...t.type.caption, color: t.colors.textMuted },
    sectionTitle: { ...t.type.label, color: t.colors.textPrimary },
    body: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
  };
}
