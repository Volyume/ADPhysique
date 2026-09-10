/**
 * ProfileCard (blueprint section 6)
 *
 * One person, as a row: avatar, display name, @handle and place, the
 * facts they chose (styles, goal, setting) as one training line, an
 * optional reasons line, and the follow control.
 *
 * Section 13, ruling 1: the reasons line is `textPrimary` at
 * `captionStrong`, never amber. Amber on a Community screen is only the
 * glyph on a primary button, the selected segment, an emphatic fill, the
 * Volyume chip and the unseen dot.
 *
 * Lead visual review 2026-09-06, ruling V8: avatar 40; name `bodyStrong`;
 * handle and place on one `caption` line in `textMuted`; reasons
 * `captionStrong` in `textPrimary`, at most two lines; the chosen facts as
 * one `caption` training line, in place of a chip row; actions trailing
 * per V7; `Card padding="md"`.
 *
 * Lead correction, ruling V8a: a card shows ONE trailing action, never the
 * Follow plus Connect pair. Precedence: if `showConnect` and the viewer may
 * connect (`ConnectButton`'s own `shouldOfferConnect`), render `ConnectButton`
 * alone (Connect `primary`, Requested `secondary`, Respond `primary`); once
 * connected, render Message alone (`primary` sm `chatbubble-outline`, via
 * `onMessage`) with no Connected button on the card; otherwise (connect not
 * offered) render `FollowButton` alone. The profile screen composes the full
 * Follow+Connect pair itself and is unaffected; only what this card composes
 * changes.
 *
 * Spec 1.1 C / 1.3 (migration 163): a card's `place_label` (falling back
 * to `area_label`) and `age_band` join the handle line when present, and
 * `reasons` runs through `reasonLines` so the four fixed-token reasons
 * (`same_place`, `near_place`, `within_25_miles`, `same_age_band`) read as
 * copy rather than a raw key. When Connect would otherwise be offered but
 * the target's own `connect_from` refuses the caller
 * (`connectDeniedByPreference`), Follow renders with one line explaining
 * why ("Accepts requests from people who follow them" / "Not taking
 * requests"): the card is never silently missing its action.
 *
 * Props:
 *   card       the profile card (user_id, handle, display_name,
 *              avatar_preset, bio, styles, goal, setting, area_label,
 *              gym_label, follower_count, relationship, ...)
 *   reasons    string[] from `suggestedPeople`, rendered as one line
 *   onPress    opens the profile
 *   showFollow render the FollowButton (default true; pass false on your
 *              own card and inside a picker); only takes effect when
 *              Connect is not offered here (V8a)
 *   onFollowChange (relationship, card) after a successful follow toggle
 *   compact    drops the training line, for a condensed creator line
 *   showConnect offer the connection tier instead of Follow when the viewer
 *              may connect (discovery blueprint section 4); V8a: one
 *              trailing action only, never both
 *   me         the `community_get_me` payload, for the minor check
 *   onConnect  (card) open the ConnectSheet
 *   onConnectChange (card) after any connection state change
 *   onMessage  (card) open the conversation; once connected this is the
 *              card's own Message action (V8a), not only the menu's
 *   onRulesOutdated () the rules changed and must be accepted first
 */

import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import Button from '../Button';
import ProfileAvatarMark from '../ProfileAvatarMark';
import FollowButton from './FollowButton';
import ConnectButton, { shouldOfferConnect, connectDeniedByPreference } from './ConnectButton';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import {
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS, COMMUNITY_SETTINGS, connectionState,
  reasonLines, TP_AGE_BANDS,
} from '../../lib/community';

const AVATAR = 40;

/** The chosen facts, in the order the profile hero shows them. */
export function factLabels(card) {
  const out = [];
  for (const key of card?.styles ?? []) {
    if (COMMUNITY_STYLE_KEYS[key]) out.push(COMMUNITY_STYLE_KEYS[key]);
  }
  if (COMMUNITY_GOALS[card?.goal]) out.push(COMMUNITY_GOALS[card.goal]);
  if (COMMUNITY_SETTINGS[card?.setting]) out.push(COMMUNITY_SETTINGS[card.setting]);
  return out;
}

/**
 * "Trains at PureGym Leeds · In Motherwell", or just whichever half is
 * set. `place_label` (the chosen postcode district or town, migration
 * 163) is preferred; a profile saved before 163, or one that only ever
 * set the free-text area, falls back to `area_label`.
 */
export function placeLine(card) {
  const parts = [];
  if (card?.gym_label) parts.push(`Trains at ${card.gym_label}`);
  const place = card?.place_label || card?.area_label;
  if (place) parts.push(place);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Whether Connect would be offered here at all but for the target's own
 * `connect_from` preference (spec 1.3): the ProfileCard-only gate that
 * decides whether Follow gets its explanatory line.
 */
function showConnectDenyLine(showConnect, me, card) {
  return showConnect && connectDeniedByPreference(me, card);
}

/**
 * The line under Follow when Connect is hidden by the target's own
 * preference, never by a structural reason.
 *
 * The card never carries the target's `connect_from` value (their own
 * setting is not exposed to a viewer), so this cannot always name which
 * of the two closed settings it is. When the caller already follows the
 * target and Connect is STILL refused, the setting can only be 'nobody'
 * (a 'followers' setting would have opened it the moment the follow was
 * accepted), which is the one case this can state as fact rather than
 * invite. Every other case names the one thing that might open it.
 *
 * @param {object} card
 * @returns {string}
 */
export function connectDenyLine(card) {
  if (card?.relationship?.following === 'accepted') return 'Not taking requests';
  return 'Accepts requests from people who follow them';
}

export default function ProfileCard({
  card,
  reasons = [],
  onPress,
  showFollow = true,
  onFollowChange,
  compact = false,
  showConnect = false,
  me = null,
  onConnect,
  onConnectChange,
  onMessage,
  onRulesOutdated,
}) {
  const t = useTheme();
  if (!card) return null;
  const facts = compact ? [] : factLabels(card);
  const trainingLine = facts.length ? facts.join(' · ') : null;
  // Fallback rows (SD-28) always carry an empty `reasons` array, so this
  // is naturally null for them without any extra check here.
  const reasonLine = reasons.length ? reasonLines(reasons, card).join(' · ') : null;
  const name = card.display_name || card.handle;
  const ageBandLabel = TP_AGE_BANDS[card.age_band] ?? null;
  const handleAndPlace = [`@${card.handle}`, placeLine(card), ageBandLabel]
    .filter(Boolean).join(' · ');

  // V8a: one trailing action, never the Follow+Connect pair. Connect (in
  // whichever of its own states) wins over Follow whenever it is offered at
  // all; once connected, Message takes its place; Follow only ever shows
  // when Connect is not offered here.
  const canConnect = showConnect && shouldOfferConnect(me, card);
  const connected = canConnect && connectionState(card) === 'connected';
  const showAction = showFollow || canConnect;
  // Spec 1.3: Connect hidden by the target's OWN preference (not by a
  // structural reason) shows Follow with a line saying why, so the card
  // is never quietly missing its action.
  const denyLine = showConnectDenyLine(showConnect, me, card) ? connectDenyLine(card) : null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${name}, @${card.handle}`}
      padding="md"
      style={styles.card}
    >
      <View style={styles.row}>
        <ProfileAvatarMark
          presetKey={card.avatar_preset}
          displayName={name}
          size={AVATAR}
        />
        <View style={styles.body}>
          <Text style={[styles.name, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.handle, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
            {handleAndPlace}
          </Text>
          {reasonLine ? (
            <Text
              style={[styles.reasons, { ...t.type.captionStrong, color: t.colors.textPrimary }]}
              numberOfLines={2}
            >
              {reasonLine}
            </Text>
          ) : null}
          {trainingLine ? (
            <Text style={[styles.training, { ...t.type.caption, color: t.colors.textSecondary }]} numberOfLines={1}>
              {trainingLine}
            </Text>
          ) : null}
          {denyLine ? (
            <Text style={[styles.deny, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
              {denyLine}
            </Text>
          ) : null}
        </View>
        {showAction ? (
          <View style={styles.actions}>
            {canConnect ? (
              connected ? (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  title="Message"
                  icon="chatbubble-outline"
                  onPress={() => onMessage?.(card)}
                  accessibilityLabel={`Message @${card.handle ?? ''}`.trim()}
                />
              ) : (
                <ConnectButton
                  card={card}
                  me={me}
                  onConnect={onConnect}
                  onChange={onConnectChange}
                  onMessage={onMessage}
                  onRulesOutdated={onRulesOutdated}
                />
              )
            ) : (
              <FollowButton card={card} onChange={onFollowChange} />
            )}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  handle: { ...type.caption, color: colors.textMuted },
  reasons: { ...type.captionStrong, color: colors.textPrimary },
  training: { ...type.caption, color: colors.textSecondary },
  deny: { ...type.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2 },
});
