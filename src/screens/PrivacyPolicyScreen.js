import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';

const LAST_UPDATED = '26 September 2026';

export default function PrivacyPolicyScreen() {
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen renders its sections via .map()-free static JSX inside a plain
  // ScrollView (no FlatList/FlashList/SectionList), so an unmemoised call
  // matches AddCustomFoodScreen's own precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      <BackHeader title="Privacy policy" />

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
          {/* FQ-5 item 3 (D96, founder-approved Option A): the calibration
              upload disclosed with its mechanism, so the anonymity claim is
              verifiable rather than asserted. The stored row carries no user
              id, photo, note or exact time; height and weight travel only as
              5-unit bands (progressScanCalibrationTelemetry.js). */}
          <Body>
            When you use photo analysis, Volyume sends one set of anonymous
            measurement numbers (body-shape ratios, with height and weight
            grouped into 5-unit bands) to improve scoring accuracy for every
            body type. These numbers are stored without your name, account,
            photo or exact time, and cannot be traced back to you. This is
            separate from the usage-data setting and stops if you stop using
            photo analysis.
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

        {/* Founder order 2026-09-26 (register D194 addendum 2): workouts are
            shared to Community by default for every member, new and existing,
            and "We need that in the privacy policy also". Every sentence here
            is checked against the code it describes: the session payload
            allow-list (posts.js buildSessionPayload), the ED/calm gate
            (ambient.js), the minor clamp and the public-link 404 for minors
            (community_upsert_profile, community-public), the three-reporter
            auto-hide (_community_auto_hide) and Leave Community
            (CommunityPrivacyScreen). */}
        <Section title="Community">
          <Body>
            Community is optional. Nothing you log is shown to other people unless you join it.
          </Body>
          <Body>
            When you join, you choose a handle and can add a display name, a short bio, your training styles and
            goal, and your area and gym. Your profile is public unless you set it to followers only, and you can
            hide your area and gym at any time. It also shows how many sessions you usually do a week, the lifts
            you focus on and your experience level, and you can hide any of these. You can choose to show more:
            the days and times you usually train, your age band, and your training consistency, such as how many
            sessions you have done this week.
          </Body>
          <Body>
            Your workouts are shared by default. Once you have joined, each workout you finish is posted to
            Community automatically. The post shows the workout's name and date, how long it took, how many sets
            you did, the total weight you lifted, the exercises, your best set and how many personal records you
            set, and up to three of those records are posted alongside it. It never includes your body weight,
            measurements, food diary, photos or check-ins. Everyone in Community can see these posts, except that
            if you are under 18 only your followers can. The switch is shown, already on, before you create your
            profile.
          </Body>
          <Body>
            You can stop sharing at any time by turning off "Share what I did" in Community, under Training
            profile, and you can remove what you have already shared at the same time. Automatic sharing also
            pauses on its own while calm mode is on, or while Volyume's safety check has paused your calorie
            changes.
          </Body>
          <Body>
            A post, profile or training plan shared with everyone can be opened from a link by people who do not
            use Volyume. Nothing from anyone under 18 is ever shown this way.
          </Body>
          <Body>
            You can also write posts, comment, give Respect, share training plans, join groups and message people
            you are connected with. Messages are private to the people in the conversation. If someone reports a
            message, our moderators can see it.
          </Body>
          <Body>
            If you tap "Use my location" in the gym finder, your phone's approximate location is used for that one
            search and then discarded. It is never stored. Community can send you notifications, for example when
            someone follows you, replies to you or messages you, and you can turn them off in Settings, under
            Notifications.
          </Body>
          <Body>
            You can block, mute and report people, posts, comments, plans, messages and groups. The Volyume team
            reviews reports, and a post, comment or plan reported by three different people is hidden
            automatically.
          </Body>
          <Body>
            You can leave Community at any time in Community, under Privacy. Leaving deletes your profile, posts
            and follows; your training, plans and food diary are not touched. Deleting your account deletes
            everything you shared in Community too. Reports you made are kept for moderation, with your account
            removed from them. We use this data to run the Community features you choose to use, which is part of
            our agreement with you, and to keep Community safe, which is our legitimate interest.
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
            within 30 days. This includes your Community profile and everything you shared there.
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
          <Body>
            In Community, anyone under 18 shares with their followers only and never appears on pages shown
            outside the app.
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
    ...type.bodySm,
    color: colors.textSecondary,
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
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
