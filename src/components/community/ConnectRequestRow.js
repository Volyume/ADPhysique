/**
 * ConnectRequestRow (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 1
 * and 10; SD-20)
 *
 * One waiting connection request, in the Activity inbox: who asked, the
 * reasons they chose, the note they wrote, and the two answers.
 *
 * "Jamie wants to connect · Same gym · Want to train together?" is the
 * whole point of the tier. A follow-back is a coincidence; a request with
 * a reason and a note is a decision, and the recipient gets to read it
 * before answering.
 *
 * Declining is silent (blueprint section 1): nothing here tells the
 * requester anything, and the row says nothing that suggests it will.
 *
 * Lead visual review 2026-09-06, ruling V18: sits on `Card padding="md"
 * radius="md"`. Accept/Decline stay the one Button pair a V18 row may
 * carry (V7: Accept `primary` sm, Decline `secondary` sm).
 *
 * Props:
 *   request   {requester, reasons, note, created_at} from the connections
 *             list. `requester` is a profile card.
 *   onPress   open the requester's profile
 *   onAccept  accept the request
 *   onDecline decline it
 *   busy      this row's answer is in flight
 */

import { View, Text, StyleSheet } from 'react-native';
import Button from '../Button';
import Card from '../Card';
import ProfileCard from './ProfileCard';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { CONNECT_REASONS } from '../../lib/community';

/** "Same gym · Want to train together?", in the sheet's own wording. */
export function reasonsLine(reasons) {
  return (Array.isArray(reasons) ? reasons : [])
    .map((key) => CONNECT_REASONS[key])
    .filter(Boolean)
    .join(' · ');
}

export default function ConnectRequestRow({ request, onPress, onAccept, onDecline, busy = false }) {
  const t = useTheme();
  const card = request?.requester ?? request?.card ?? null;
  if (!card) return null;

  const line = `${card.handle ? `@${card.handle}` : 'Someone'} wants to connect`;
  const reasons = reasonsLine(request?.reasons);
  const note = typeof request?.note === 'string' ? request.note.trim() : '';

  return (
    <Card padding="md" radius="md" style={styles.row}>
      <ProfileCard card={card} showFollow={false} compact onPress={onPress} />
      <Text style={[styles.line, { ...t.type.bodySm, color: t.colors.textPrimary }]}>
        {line}
      </Text>
      {reasons ? (
        <Text style={[styles.reasons, { ...t.type.captionStrong, color: t.colors.textPrimary }]}>
          {reasons}
        </Text>
      ) : null}
      {note ? (
        <Text style={[styles.note, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          {note}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          title="Accept"
          loading={busy}
          onPress={onAccept}
          accessibilityLabel={`Accept the connection request from @${card.handle}`}
        />
        <Button
          variant="secondary"
          size="sm"
          fullWidth={false}
          title="Decline"
          disabled={busy}
          onPress={onDecline}
          accessibilityLabel={`Decline the connection request from @${card.handle}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  line: { ...type.bodySm, color: colors.textPrimary },
  reasons: { ...type.captionStrong, color: colors.textPrimary },
  note: { ...type.bodySm, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
