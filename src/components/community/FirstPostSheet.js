/**
 * FirstPostSheet (D228 item 1, option B): the one-time question the workout
 * summary asks before the FIRST automatic post to Community.
 *
 * Sharing is on by default and to everyone (D194 addendum 2 stands); this
 * sheet is the person's own informed answer to "who should see them" before
 * anything is posted. It carries no default and no nudge: the two audiences
 * are the same weight, and "Not now" is a plain, equal way out that posts
 * nothing and records nothing, so the question returns at the next finished
 * workout.
 *
 * A minor is offered only "People who follow me" (the server holds a minor's
 * posts to followers whatever is written), and "Not now".
 *
 * Presentational only: the screen decides when it shows (never under calm
 * mode or an open ED flag, never once answered) and what each answer does.
 *
 * Props:
 *   visible
 *   isMinor    true shows only the followers action
 *   onChoose   (audience: 'everyone' | 'followers') => void
 *   onNotNow   () => void; also what a swipe, a scrim tap or back does
 */

import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { spacing } from '../../styles/theme';

export const FIRST_POST_TITLE = 'Share this session?';
export const FIRST_POST_BODY =
  'Every session you finish can post to Community automatically: exercises, sets, the total lifted and any PRs. Never your body, food or coaching. Who should see them?';

export default function FirstPostSheet({
  visible, isMinor = false, onChoose, onNotNow,
}) {
  const t = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onNotNow}
      scroll
      accessibilityLabel={FIRST_POST_TITLE}
    >
      <View style={styles.body}>
        <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>{FIRST_POST_TITLE}</Text>
        <Text style={[t.type.body, { color: t.colors.textSecondary }]}>{FIRST_POST_BODY}</Text>
        <View style={styles.actions}>
          {isMinor ? null : (
            <Button
              variant="primary"
              title="Everyone"
              onPress={() => onChoose('everyone')}
              accessibilityLabel="Share my sessions with everyone"
            />
          )}
          <Button
            variant="primary"
            title="People who follow me"
            onPress={() => onChoose('followers')}
            accessibilityLabel="Share my sessions with people who follow me"
          />
          <Button
            variant="secondary"
            title="Not now"
            onPress={onNotNow}
            accessibilityLabel="Not now"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.md },
  actions: { gap: spacing.sm, paddingTop: spacing.xs },
});
