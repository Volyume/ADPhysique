// Recovery (register D208). Founder, 2026-09-26: "Should we have a place in
// Progress exclusively for recovery rather than it being hidden behind a
// button for consistency? Have a think the best way because it looks like a
// good feature now hard to find." The lead's ruling, previewed to the
// founder the same day: a Recovery row in the top card on Progress opens
// this screen, which holds the Recovery section exactly as it stood on
// Consistency, in the same order (the founder's earlier order: "The order
// wasn't to change the order or lead with anything"): your ratings first,
// then recovery by muscle, then the next workout. Consistency keeps the
// sessions milestone and everything else; the section moved, it was not
// copied, so there is one place to find it.
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import ReadinessCards from '../components/ReadinessCards';
import useAppStore from '../store/useAppStore';

export default function RecoveryScreen({ navigation }) {
  const t = useTheme();
  const user = useAppStore((s) => s.user);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
      <BackHeader title="Recovery" />
      <ScrollView contentContainerStyle={styles.content}>
        <ReadinessCards
          userId={user?.id}
          sections="recovery"
          onRateLastSession={(params) => navigation.navigate('WorkoutSummary', params)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
});
