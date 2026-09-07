/**
 * ProfileMenuSheet (blueprint sections 2, 6; SD-11)
 *
 * The `...` menu on a profile: Share link, Mute or Unmute, Block or
 * Unblock, Report.
 *
 * Blocking is two-way invisibility and removes both follow edges, so it
 * is confirmed through `appAlert` (the app reserves alerts for exactly
 * this kind of decision). Muting is quiet and reversible, so it is a
 * single tap with a toast. The muted person is never told.
 *
 * Removing a connection (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 1)
 * lives ONLY in the `ConnectButton`'s own "Connected" menu next to it on
 * the profile action row (product review 2026-09-06 finding 5): a second
 * copy of the same action here duplicated it under near-identical confirm
 * copy from a different component, so it is not repeated in this sheet.
 *
 * Lead visual review 2026-09-06, ruling V16: composes the one shared
 * `MenuSheet` (BottomSheet + ModalHeader + SettingRow-style rows) rather
 * than its own hand-rolled menu rows.
 *
 * Props:
 *   visible    controlled
 *   onClose    close the sheet
 *   card       the profile card this menu is for
 *   onChanged  (relationship) after a mute/unmute/block/unblock
 *   onReport   open the report sheet (the parent owns it, so the report
 *              sheet is not nested inside this one)
 */

import { useState } from 'react';
import { Share } from 'react-native';
import MenuSheet from './MenuSheet';
import { appAlert } from '../AppAlert';
import { useToast } from '../Toast';
import {
  profileUrl, blockUser, unblockUser, muteUser, unmuteUser,
} from '../../lib/community';

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  no_profile: 'Create your Community profile first.',
  not_found: 'This profile is no longer available.',
};

export default function ProfileMenuSheet({
  visible, onClose, card, onChanged, onReport,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const rel = card?.relationship ?? {};

  async function run(fn, nextRelationship, message) {
    if (busy || !card?.user_id) return;
    setBusy(true);
    try {
      await fn(card.user_id);
      onChanged?.({ ...rel, ...nextRelationship });
      if (message) toast.show(message);
      onClose?.();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not do that just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function confirmBlock() {
    appAlert(
      `Block @${card?.handle ?? 'this person'}?`,
      'Neither of you will see the other in Community, and any follow between you is removed. You can unblock later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => run(blockUser, { blocked: true, following: 'none', followed_by: false }, 'Blocked'),
        },
      ],
    );
  }

  const rows = [
    {
      icon: 'link-outline',
      label: 'Share link',
      onPress: async () => {
        try { await Share.share({ message: profileUrl(card?.handle) }); }
        catch (_) { /* the user dismissed the share sheet */ }
        onClose?.();
      },
    },
    rel.muted
      ? { icon: 'volume-high-outline', label: 'Unmute', onPress: () => run(unmuteUser, { muted: false }, 'Unmuted') }
      : { icon: 'volume-mute-outline', label: 'Mute', onPress: () => run(muteUser, { muted: true }, 'Muted. They are not told.') },
    rel.blocked
      ? { icon: 'lock-open-outline', label: 'Unblock', onPress: () => run(unblockUser, { blocked: false }, 'Unblocked') }
      : { icon: 'ban-outline', label: 'Block', tone: 'destructive', onPress: confirmBlock },
    {
      icon: 'flag-outline',
      label: 'Report',
      onPress: () => { onClose?.(); onReport?.(); },
    },
  ];

  return (
    <MenuSheet
      visible={visible}
      onClose={onClose}
      title={card?.handle ? `@${card.handle}` : 'Options'}
      rows={rows}
    />
  );
}
