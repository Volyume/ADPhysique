/**
 * PlanRebuildChoiceCard - D222 phase 8 (R94): the one calm card on Today when
 * the structure engine could not rebuild the plan a person follows without a
 * choice from them (their days or session length do not build, or it would ask
 * a length or focus question). The plan keeps serving exactly as it is; the card
 * offers "Update your plan" (the PlanUpdate flow, which shows the engine's
 * choices). Built from the existing Card and Button components; the words are
 * structure/messages.js NEEDS_CHOICE_CARD. Renders nothing at all unless
 * planRebuild says this plan needs the choice (never with the switch off).
 */
import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';
import { getPlanRebuildChoice, dismissPlanRebuildChoice } from '../lib/planRebuild';
import { NEEDS_CHOICE_CARD } from '../lib/structure/messages';

export default function PlanRebuildChoiceCard({ userId, programmeId = null, onUpdate }) {
  const t = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId || !programmeId) {
      setShow(false);
      return undefined;
    }
    getPlanRebuildChoice(userId, programmeId)
      .then((v) => { if (alive) setShow(v === true); })
      .catch(() => { if (alive) setShow(false); }); // best-effort: no card is the safe answer
    return () => { alive = false; };
  }, [userId, programmeId]);

  const notNow = useCallback(() => {
    setShow(false);
    dismissPlanRebuildChoice(userId, programmeId).catch(() => {}); // best-effort: hidden for this view either way
  }, [userId, programmeId]);

  if (!show) return null;
  return (
    <Card style={styles.card} accessibilityLabel={`${NEEDS_CHOICE_CARD.title}. ${NEEDS_CHOICE_CARD.body}`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.colors.primaryBg }]}>
          <Ionicons name="information-circle-outline" size={20} color={t.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>{NEEDS_CHOICE_CARD.title}</Text>
          <Text style={[styles.body, { color: t.colors.textSecondary }]}>{NEEDS_CHOICE_CARD.body}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title={NEEDS_CHOICE_CARD.action}
          variant="secondary"
          onPress={onUpdate}
          fullWidth={false}
          accessibilityLabel={NEEDS_CHOICE_CARD.action}
        />
        <Button
          title="Not now"
          variant="secondary"
          onPress={notNow}
          fullWidth={false}
          accessibilityLabel="Not now. Hides this card and leaves your plan as it is."
        />
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
