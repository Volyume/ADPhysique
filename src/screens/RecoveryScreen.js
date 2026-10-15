// Recovery (register D208). Founder, 2026-09-26: "Should we have a place in
// Progress exclusively for recovery rather than it being hidden behind a
// button for consistency? Have a think the best way because it looks like a
// good feature now hard to find." The lead's ruling, previewed to the
// founder the same day: a Recovery row in the top card on Progress opens
// this screen, which holds the Recovery section as it stood on Consistency.
// Consistency keeps the sessions milestone and everything else; the section
// moved, it was not copied, so there is one place to find it. The section's
// order is the founder's (by muscle, then speed, then ratings, 2026-09-26),
// and under D214 Q7 = A the first block leads with the answer line.
// The ScrollView ref goes down to the cards so a tap on the body figure can
// scroll the list to that muscle's row (D214, RC-12), the way the Volume
// heatmap scrolls to its rows.
// D228 item 6 (2026-10-15): the weekly volume review (CoachReviewScreen, the
// sets per muscle this week against the plan) lost its only door when the Today
// deload card went. It is one row here, directly after Recovery by muscle (the
// cards draw it through `afterByMuscle`, so they stay navigation-agnostic),
// and the screen is registered in the Progress stack so Back returns here.
import { useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import ReadinessCards from '../components/ReadinessCards';
import { NavRow, NavGroup } from '../components/NavRow';
import useAppStore from '../store/useAppStore';

export default function RecoveryScreen({ navigation }) {
  const t = useTheme();
  const user = useAppStore((s) => s.user);
  const scrollRef = useRef(null);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
      <BackHeader title="Recovery" />
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingHorizontal: t.screenPadding }]}>
        <ReadinessCards
          userId={user?.id}
          sections="recovery"
          scrollRef={scrollRef}
          onRateLastSession={(params) => navigation.navigate('WorkoutSummary', params)}
          afterByMuscle={(
            <NavGroup>
              <NavRow
                icon="bar-chart-outline"
                label="Weekly volume review"
                sub="Sets per muscle this week against your plan"
                onPress={() => navigation.navigate('CoachReview')}
              />
            </NavGroup>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
});
