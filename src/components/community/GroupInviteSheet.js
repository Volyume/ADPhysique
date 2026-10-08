/**
 * GroupInviteSheet (community product audit `docs/community-product-
 * audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4).
 *
 * Admin-only. Invite a member by handle (`community_group_invite`), or
 * mint and share a 14-day invite link (`community_group_invite_link`).
 * `Share` is the platform's native share sheet, matching every other
 * share surface in Community (profile/story links).
 *
 * Lead visual review 2026-09-06, ruling V16: `BottomSheet` with the
 * shared `ModalHeader`.
 *
 * Props:
 *   visible, onClose
 *   groupId
 *   groupName    for the share message
 */

import { useEffect, useState } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import Button from '../Button';
import TextField from '../TextField';
import SectionHeader from './SectionHeader';
import { useToast } from '../Toast';
import { spacing } from '../../styles/theme';
import { inviteToGroup, createGroupInviteLink, groupInviteUrl } from '../../lib/community';
import { RESTRICTION_REFUSALS } from '../../lib/community/restriction';

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  ...RESTRICTION_REFUSALS,
  not_found: 'No one with that username was found.',
  already_member: 'They are already in this group.',
  minor_restricted: 'That person is under 18 and cannot join groups.',
  blocked: 'That invite could not be sent.',
  rate_limited: 'That is a lot of invites for one hour. Try again later.',
  group_closed: 'This group is closed.',
};

export default function GroupInviteSheet({ visible, onClose, groupId, groupName }) {
  const toast = useToast();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (visible) { setHandle(''); setBusy(false); setLinkBusy(false); }
  }, [visible]);

  async function sendInvite() {
    const h = handle.trim();
    if (!h || busy) return;
    setBusy(true);
    try {
      await inviteToGroup(groupId, h);
      toast.show(`Invited @${h.toLowerCase()}.`);
      setHandle('');
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not send that invite just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function shareLink() {
    if (linkBusy) return;
    setLinkBusy(true);
    try {
      const { token } = await createGroupInviteLink(groupId);
      if (!token) throw new Error('no_token');
      await Share.share({
        message: `Join ${groupName || 'my group'} on Volyume: ${groupInviteUrl(groupId, token)}`,
      });
    } catch (e) {
      if (e?.code) toast.show(REFUSALS[e.code] ?? 'Could not create that link just now.', { variant: 'error' });
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Invite">
      <View style={styles.headerBleed}>
        <ModalHeader title="Invite" onClose={onClose} />
      </View>
      <View style={styles.body}>
        <SectionHeader flush title="By username" />
        <TextField
          value={handle}
          onChangeText={setHandle}
          placeholder="username"
          well
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Username to invite"
        />
        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          title="Invite"
          disabled={!handle.trim()}
          loading={busy}
          onPress={sendInvite}
          accessibilityLabel="Send invite"
        />
        <SectionHeader flush title="Or share a link" />
        <Button
          variant="secondary"
          size="sm"
          fullWidth={false}
          title="Share invite link"
          loading={linkBusy}
          onPress={shareLink}
          accessibilityLabel="Share invite link"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  body: { gap: spacing.sm, paddingBottom: spacing.md },
});
