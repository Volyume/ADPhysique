/**
 * HomeHowYouTrainOfferCard - the one-time How you train offer on Home
 * (founder decision D134, 2026-09-03).
 *
 * Shown to a person with nothing set up in How you train, once the welcome
 * card has retired and only when no ranked banner holds Home's attention
 * slot. It is an OFFER in the person's words, never a question that asks
 * them to classify themselves (banked research: the DfE door). Either
 * button dismisses it forever; HomeScreen also retires it by itself the
 * moment anything is set up. The gating lives in HomeScreen.js; this file
 * renders only the card's content, on the shared Card and Button.
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';

export default function HomeHowYouTrainOfferCard({ onSetUp, onDismiss }) {
  const t = useTheme();
  return (
    <Card style={styles.card} accessibilityLabel="Anything Volyume should build your training around? Entirely optional.">
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.colors.primaryBg }]}>
          <Ionicons name="body-outline" size={20} color={t.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Anything Volyume should build your training around?</Text>
          <Text style={[styles.body, { color: t.colors.textSecondary }]}>
            Injury, pain, a long-term condition or a disability. Tell Volyume once and every plan and workout is built around it. Entirely optional, and you can change it any time.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Set it up" onPress={onSetUp} fullWidth={false} style={styles.action} />
        <Button title="No thanks" variant="secondary" onPress={onDismiss} fullWidth={false} style={styles.action} accessibilityLabel="No thanks. Hides this offer for good." />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...type.h3 },
  body: { ...type.bodySm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
});
