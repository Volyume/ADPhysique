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
 * Founder defect 2026-09-14, lead ruling CR-17: the block used to sit on
 * a `Card` wrapping a second `Card` (the person, through `ProfileCard`),
 * so one request drew two boxes where every other Community surface draws
 * none. `20-BLUEPRINT.md` section 9 rule 2 bans `Card` for people and
 * activity. It is now a flat block in `PersonRow`'s anatomy -- avatar 32,
 * `bodyStrong` name, one `bodySm` `textSecondary` line, then the reasons,
 * the note and the two answers, closing with one `borderSubtle` hairline
 * across the block. No gutter of its own: the Activity screen's list
 * already pays `spacing.lg`.
 *
 * Why the identity line is built here rather than handed to `PersonRow`:
 * that row closes with the list hairline, which would cut this block
 * between the person and their own note. Everything above that hairline
 * is `PersonRow`'s shape to the pixel (same avatar size, same type roles,
 * same gaps), so the two read as one row on the same screen. The request
 * line ("@jamie wants to connect") IS this row's caption, so the handle
 * is stated once rather than twice as it was on the old two-card block.
 *
 * Accept/Decline stay the one Button pair this block carries (V7: Accept
 * `primary` sm, Decline `secondary` sm), on their own line rather than in
 * the row's trailing slot, because a request with a note is taller than a
 * roster row and the answer belongs under what it is answering.
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
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { CONNECT_REASONS } from '../../lib/community';

const AVATAR = 32;

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

  const name = card.display_name || card.handle || 'A lifter';
  const line = `${card.handle ? `@${card.handle}` : 'Someone'} wants to connect`;
  const reasons = reasonsLine(request?.reasons);
  const note = typeof request?.note === 'string' ? request.note.trim() : '';

  return (
    <View style={styles.block}>
      <PressableCard
        onPress={onPress}
        disabled={!onPress}
        accessibilityLabel={[name, line, reasons].filter(Boolean).join('. ')}
      >
        <View style={styles.row}>
          <ProfileAvatarMark presetKey={card.avatar_preset} displayName={name} size={AVATAR} />
          <View style={styles.body}>
            <Text style={[styles.name, { color: t.colors.textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.line, { color: t.colors.textSecondary }]} numberOfLines={1}>
              {line}
            </Text>
          </View>
        </View>
      </PressableCard>
      {reasons ? (
        <Text style={[styles.reasons, { color: t.colors.textPrimary }]}>
          {reasons}
        </Text>
      ) : null}
      {note ? (
        <Text style={[styles.note, { color: t.colors.textSecondary }]}>
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
      <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: spacing.md,
  },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  line: { ...type.bodySm, color: colors.textSecondary },
  reasons: { ...type.captionStrong, color: colors.textPrimary },
  note: { ...type.bodySm, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginTop: spacing.sm,
  },
});
