/**
 * ConnectButton (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 1
 * and 10; SD-20, SD-32)
 *
 * One control for the whole connection tie, in the four states the card
 * itself carries: Connect, Requested, Respond, Connected.
 *
 * Connect is the middle tier between Follow (one way, quiet) and Message
 * (connected only), so the button is `primary` while there is no tie and
 * `secondary` once there is: the settled state is the quieter one, the
 * same way FollowButton reads. Never `emphatic` (section 13, ruling 2).
 *
 * Lead visual review 2026-09-06, ruling V7: once connected, Message
 * renders `primary` sm `chatbubble-outline` beside the `secondary`
 * `people-outline` Connected button (Message leaves the menu); the menu
 * itself, shared `MenuSheet` (V16), keeps only Remove connection.
 *
 * Two taps are decisions rather than actions, so both are confirmed
 * through `appAlert`: withdrawing a request, and removing a connection
 * (which closes the conversation for both people and leaves the two
 * follows in place). Declining is silent to the other person, and this
 * component never says otherwise.
 *
 * SD-32: an under-18 account never sends or receives a connection
 * request. The server enforces it in both directions; the button is not
 * offered to a minor VIEWER at all, and a minor TARGET is refused by the
 * server with `minor_restricted`, which is spoken plainly here (the card
 * carries no age, so the client cannot know it in advance).
 *
 * Props:
 *   card             the profile card (user_id, handle, connection, ...)
 *   me               the `community_get_me` payload, for the minor check
 *   onConnect        open the ConnectSheet for this card. Absent, a tap
 *                    sends a plain request with no reasons and no note,
 *                    which is a complete request in its own right.
 *   onChange         (card) after any state change
 *   onMessage        (card) open the conversation, from the Connected menu
 *   onRulesOutdated  () the rules changed and must be accepted first
 *   size, fullWidth  passed to Button
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Button from '../Button';
import MenuSheet from './MenuSheet';
import { appAlert } from '../AppAlert';
import { useToast } from '../Toast';
import { spacing } from '../../styles/theme';
import {
  connectionState, connect, withdrawConnect, respondToConnect, removeConnection,
} from '../../lib/community';

/**
 * The calm line for a refusal. Every code the connection RPCs raise is
 * here, and none of them reveals something the other person did:
 * `not_allowed` covers a request that was declined or withdrawn inside
 * its 30 day cool off, and says only that it is not available.
 */
const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  no_profile: 'Create your Community profile first.',
  not_found: 'This profile is no longer available.',
  blocked: 'You cannot connect with this person.',
  rate_limited: 'That is a lot of requests for one day. Try again tomorrow.',
  content_not_allowed: 'That wording is not allowed here. Try different words.',
  invalid_input: 'Check what you have typed, then try again.',
  connect_not_allowed:
    'Not available. This person chooses who can send them a connection request. Try following them first.',
  minor_restricted: 'Not available. Connections and messages are for people over 18.',
  not_connected: 'You need to be connected first.',
  not_allowed: 'Not available just now. You can try again later.',
  rules_outdated: 'The Community rules have changed. Accept them to carry on.',
};

export function connectRefusalLine(code) {
  return REFUSALS[code] ?? 'Could not do that just now.';
}

/**
 * Whether a Connect control belongs on this card at all (blueprint
 * section 1). Your own card, a blocked person and a minor viewer never
 * see one; everything else is the server's call, spoken as a refusal.
 */
export function shouldOfferConnect(me, card) {
  if (!card?.user_id) return false;
  if (me?.is_minor) return false;
  if (card.is_minor) return false;
  if (card.user_id === me?.profile?.user_id) return false;
  if (card.relationship?.blocked) return false;
  return true;
}

const STATES = {
  none: { title: 'Connect', variant: 'primary', icon: 'person-add-outline' },
  requested_by_me: { title: 'Requested', variant: 'secondary', icon: 'time-outline' },
  requested_by_them: { title: 'Respond', variant: 'primary', icon: 'mail-open-outline' },
  // V7: `secondary` with `people-outline`, Message sits beside it as its own
  // button now (see the render below), so this state no longer opens
  // straight to a menu that offers messaging too.
  connected: { title: 'Connected', variant: 'secondary', icon: 'people-outline' },
};

export default function ConnectButton({
  card,
  me = null,
  onConnect,
  onChange,
  onMessage,
  onRulesOutdated,
  size = 'sm',
  fullWidth = false,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const state = connectionState(card);
  const shape = STATES[state] ?? STATES.none;
  const who = card?.display_name || card?.handle || 'this person';

  if (!shouldOfferConnect(me, card)) return null;

  async function run(fn, fallbackState, message) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await fn();
      onChange?.(next && next.user_id
        ? next
        : { ...card, connection: fallbackState });
      if (message) toast.show(message);
    } catch (e) {
      if (e?.code === 'rules_outdated' && onRulesOutdated) onRulesOutdated();
      else toast.show(connectRefusalLine(e?.code), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function confirmWithdraw() {
    appAlert(
      'Withdraw your request?',
      'They are not told either way. You can ask again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => run(() => withdrawConnect(card.user_id), 'none', 'Request withdrawn'),
        },
      ],
    );
  }

  function respond() {
    appAlert(
      `${card?.handle ? `@${card.handle}` : 'This person'} wants to connect`,
      'Accepting means you both follow each other and can message. Declining is not passed on.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => run(() => respondToConnect(card.user_id, false), 'none', 'Request declined'),
        },
        {
          text: 'Accept',
          onPress: () => run(() => respondToConnect(card.user_id, true), 'connected', 'You are connected'),
        },
      ],
    );
  }

  function confirmRemove() {
    setMenuOpen(false);
    appAlert(
      `Remove your connection with @${card?.handle ?? 'this person'}?`,
      'Your conversation closes for both of you. You each stay following the other, and you can connect again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => run(() => removeConnection(card.user_id), 'none', 'Connection removed'),
        },
      ],
    );
  }

  function press() {
    if (busy) return;
    if (state === 'none') {
      if (onConnect) onConnect(card);
      // No sheet on this surface: a request with no reasons and no note is
      // still a complete request (blueprint section 1, both are optional).
      else run(() => connect(card.user_id, {}), 'requested_by_me', 'Request sent');
      return;
    }
    if (state === 'requested_by_me') { confirmWithdraw(); return; }
    if (state === 'requested_by_them') { respond(); return; }
    setMenuOpen(true);
  }

  return (
    <>
      <View style={styles.row}>
        <Button
          variant={shape.variant}
          size={size}
          fullWidth={fullWidth}
          title={shape.title}
          icon={shape.icon}
          loading={busy}
          onPress={press}
          accessibilityLabel={`${shape.title} ${who}`.trim()}
        />
        {/* V7a: Message follows Connected so a profile row reads
            Following · Connected · Message on one line. */}
        {state === 'connected' && onMessage ? (
          <Button
            variant="primary"
            size={size}
            fullWidth={false}
            title="Message"
            icon="chatbubble-outline"
            onPress={() => onMessage(card)}
            accessibilityLabel={`Message @${card?.handle ?? ''}`.trim()}
          />
        ) : null}
      </View>

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={card?.handle ? `@${card.handle}` : 'Connected'}
        rows={[
          { icon: 'person-remove-outline', label: 'Remove connection', tone: 'destructive', onPress: confirmRemove },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2 },
});
