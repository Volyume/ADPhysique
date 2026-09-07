/**
 * TrainingProfileLine (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 3
 * and 10; SD-22, SD-31)
 *
 * One line of observed training, in the bands the person chose to share:
 * "Usually trains Mon, Wed and Fri evenings · 4 to 5 sessions a week ·
 * Intermediate".
 *
 * The wording comes from `previewLine` in the client library, which is
 * the same function the Training profile screen previews with. That is
 * deliberate: the preview a person reads before sharing and the line
 * other people see are one sentence built by one function, so they can
 * never drift into saying different things.
 *
 * SD-31, the creepiness rule: a band is the finest thing this can say.
 * There is no time, no date, no "last trained", and nothing here reads
 * anything but the card it was handed.
 *
 * Props:
 *   card   a profile card carrying the shared `tp_*` bands
 *   style  optional style merged onto the Text
 */

import { Text, StyleSheet } from 'react-native';
import { type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { previewLine } from '../../lib/community';

/** The line for a card, or '' when nothing is shared. Spec 1.3: the age
 * band joins the line when the card carries one (`age_band`, gated
 * server-side to an owner who shared it and is not a minor; `tp_age_band`
 * is read too for a card shaped before that key existed). */
export function trainingProfileLine(card) {
  if (!card) return '';
  return previewLine({
    tp_days: card.tp_days,
    tp_time_bands: card.tp_time_bands,
    tp_sessions_band: card.tp_sessions_band,
    tp_experience_band: card.tp_experience_band,
  }, card.age_band ?? card.tp_age_band ?? null);
}

export default function TrainingProfileLine({ card, style }) {
  const t = useTheme();
  const line = trainingProfileLine(card);
  if (!line) return null;

  return (
    <Text
      style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }, style]}
      accessibilityRole="text"
    >
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { ...type.bodySm, color: colors.textSecondary },
});
