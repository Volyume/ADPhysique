import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';

const LAST_UPDATED = '20 May 2025';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

        <Section title="What Volyume collects">
          <Body>
            Volyume collects information you provide directly: your name, email address, body measurements,
            workout logs, and training preferences. This data is used solely to run the app and give you
            personalised training and nutrition guidance.
          </Body>
          <Body>
            We do not sell your data. We do not share it with third parties for advertising purposes.
          </Body>
        </Section>

        <Section title="How your data is stored">
          <Body>
            Your workout and body data is stored locally on your device and, if you create an account,
            synchronised to our secure cloud database (Supabase). All data in transit is encrypted via HTTPS.
            Auth tokens are stored in your device's secure encrypted storage.
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
            Body weight, measurements, and progress photos are treated as sensitive personal data. They are
            stored only on your device and your private account. They are never shared, indexed, or visible
            to other users.
          </Body>
        </Section>

        <Section title="Your rights">
          <Body>
            You have the right to export all your data at any time (Settings &gt; Export workout log or Back
            up everything). You can permanently delete your account and all associated data from Settings
            &gt; Delete account. Deletion is immediate and irreversible.
          </Body>
          <Body>
            If you are in the European Economic Area or United Kingdom, you have additional rights under GDPR,
            including the right to access, rectify, port, or erase your personal data. Contact us at
            privacy@volyume.app to exercise these rights.
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
            app. Continued use of Volyume after changes take effect constitutes your acceptance of the updated policy.
          </Body>
        </Section>

        <Section title="Contact">
          <Body>
            Questions or requests: privacy@volyume.app
          </Body>
        </Section>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }) {
  return <Text style={styles.body}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  updated: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
