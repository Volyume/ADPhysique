/**
 * PresenceBand (D221 Stage 3, 3a; visual law V1 band, V5 identity): who is
 * training right now, drawn as a `surface` band at the top of the Hub Feed
 * and on the group page. `AvatarStack` at 24 dp, then "2 training now ·
 * 3 trained today" in `type.bodySm` and the first names in `type.caption`.
 *
 * It is not drawn at all (returns null) when the server withheld the marker
 * (`trainingNow` is null), when the caller's own calm mode or an open ED flag
 * gates the surface (`gated`, the screen's `consistencyGateState` answer; the
 * server also returns null, so both checks must agree to show), or when there
 * is nothing to say. No amber: presence is the ring dot's job, not this band's.
 *
 * Props:
 *   trainingNow   { count, names[] } from `normaliseTrainingNow`, or null
 *   trainedToday  optional count for the second half of the line
 *   gapAfter      draw the 10 dp page-colour strip below, only when drawn
 *   gated         true while the consistency gate withholds (default true:
 *                 fail closed until the screen has an answer)
 */
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import Band, { BandGap } from './Band';
import AvatarStack from './AvatarStack';
import useTheme from '../../hooks/useTheme';
import { spacing } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { presenceLine, firstNamesLine } from '../../lib/community/presence';

export default function PresenceBand({ trainingNow, trainedToday = null, gated = true, gapAfter = false }) {
  const t = useTheme();
  if (gated || !trainingNow) return null;
  const line = presenceLine(trainingNow.count, trainedToday);
  if (!line) return null;
  const names = firstNamesLine(trainingNow.names, trainingNow.count);
  // The server sends names only, so each mark is the initial of a first name.
  const people = (trainingNow.names ?? []).map((name, i) => ({
    user_id: `presence-${i}`, display_name: name, avatar_preset: null,
  }));
  return (
    <>
    <Band style={styles.band}>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={names ? `${line}. ${names}` : line}
      >
        <AvatarStack people={people} size={24} />
        <View style={styles.text}>
          <Text style={[t.type.bodySm, { color: t.colors.textPrimary }]}>{line}</Text>
          {names ? (
            <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>{names}</Text>
          ) : null}
        </View>
      </View>
    </Band>
    {gapAfter ? <BandGap /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  band: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget.minimum, paddingVertical: spacing.sm,
  },
  text: { flex: 1, gap: spacing.xxs },
});
