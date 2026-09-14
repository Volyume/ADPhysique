/**
 * ProfileCard (blueprint section 6)
 *
 * One person, as a row: avatar, display name, one line, and the one
 * action this surface offers.
 *
 * Founder defect 2026-09-14 ("it is meant to not look AI and is meant to
 * look like the rest of the app"), lead ruling CR-17: this file used to
 * wrap every person in a `Card`, so the same person read as one product
 * on the Hub, a cohort page or a group page (flat `PersonRow`s) and as a
 * different one in Find people, Search, Followers, Connections and the
 * Activity inbox, one tap away. `20-BLUEPRINT.md` section 9 rule 2 bans
 * `Card` for people; the presentation guard only ever grepped SCREEN
 * source for the literal `<Card`, so a card rendered inside this wrapper
 * slipped through it for the whole campaign.
 *
 * So there is now ONE person row in Community: this file composes what a
 * person card means (which facts, which reasons, which single action) and
 * hands it to `PersonRow` (`docs/rules/styling.md`, "extend, do not
 * fork"), which owns the anatomy -- avatar 32, `bodyStrong` name, one
 * `bodySm` `textSecondary` line, an optional trailing control, a
 * `borderSubtle` hairline across the row, and no gutter of its own
 * (every screen below already pays `spacing.lg`).
 *
 * THE ONE LINE (a presentation ruling, no copy removed). `PersonRow`
 * carries a single caption, so the four lines this card used to stack are
 * now chosen by priority rather than piled up, most useful first:
 *   1. the connect-deny line, when Connect is hidden by the target's own
 *      preference -- refusal copy that explains the row's missing action,
 *      and the only line on that row long enough to need the full width;
 *   2. the reasons (SD-24), which already carry the place, the gym and
 *      the age band that would otherwise repeat on the facts line;
 *   3. the facts: `@handle`, the place line, the age band and (outside
 *      `compact`) the chosen training facts.
 * Every string this file ever rendered still renders; which one gets the
 * line depends on what that row is FOR. Concatenating all four instead
 * would have truncated the important half behind the unimportant one --
 * "@priya_kb · Motherwell · Accepts requests from..." cuts at roughly
 * thirty characters on a 360 dp phone.
 *
 * Section 13, ruling 1: no amber anywhere in this file (pinned at 0 by
 * `rows.amber.guard.test.js`).
 *
 * Lead correction, ruling V8a (unchanged by CR-17): a row shows ONE
 * trailing action, never the Follow plus Connect pair. Precedence: if
 * `showConnect` and the viewer may connect (`ConnectButton`'s own
 * `shouldOfferConnect`), render `ConnectButton` alone (Connect `primary`,
 * Requested `secondary`, Respond `primary`); once connected, render
 * Message alone (`primary` sm `chatbubble-outline`, via `onMessage`) with
 * no Connected button on the row; otherwise (connect not offered) render
 * `FollowButton` alone. The profile screen composes the full
 * Follow+Connect pair itself and is unaffected.
 *
 * Spec 1.1 C / 1.3 (migration 163): a card's `place_label` (falling back
 * to `area_label`) and `age_band` join the handle line when present, and
 * `reasons` runs through `reasonLines` so the four fixed-token reasons
 * (`same_place`, `near_place`, `within_25_miles`, `same_age_band`) read as
 * copy rather than a raw key. When Connect would otherwise be offered but
 * the target's own `connect_from` refuses the caller
 * (`connectDeniedByPreference`), Follow renders with the line explaining
 * why ("Accepts requests from people who follow them" / "Not taking
 * requests"): the row is never silently missing its action.
 *
 * Props:
 *   card       the profile card (user_id, handle, display_name,
 *              avatar_preset, bio, styles, goal, setting, area_label,
 *              gym_label, follower_count, relationship, ...)
 *   reasons    string[] from `suggestedPeople`, rendered as the line
 *   onPress    opens the profile
 *   showFollow render the FollowButton (default true; pass false on your
 *              own card and inside a picker); only takes effect when
 *              Connect is not offered here (V8a)
 *   onFollowChange (relationship, card) after a successful follow toggle
 *   compact    drops the training facts, for a condensed creator line
 *   showConnect offer the connection tier instead of Follow when the viewer
 *              may connect (discovery blueprint section 4); V8a: one
 *              trailing action only, never both
 *   me         the `community_get_me` payload, for the minor check
 *   onConnect  (card) open the ConnectSheet
 *   onConnectChange (card) after any connection state change
 *   onMessage  (card) open the conversation; once connected this is the
 *              row's own Message action (V8a), not only the menu's
 *   onRulesOutdated () the rules changed and must be accepted first
 *   trailing   a caller-built node for the row's trailing slot, in place
 *              of the action above (the Followers and Connections kebab,
 *              the Activity screen's Accept/Decline pair, the Privacy
 *              screen's Unblock/Unmute): one row shape, whatever the
 *              surface's own control happens to be
 */

import Button from '../Button';
import PersonRow from './PersonRow';
import FollowButton from './FollowButton';
import ConnectButton, { shouldOfferConnect, connectDeniedByPreference } from './ConnectButton';
import {
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS, COMMUNITY_SETTINGS, connectionState,
  reasonLines, TP_AGE_BANDS,
} from '../../lib/community';

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

/**
 * The row's one line, by priority (see the header): the refusal that
 * explains a missing action, else the reasons this person is here, else
 * who they are. Never a concatenation of all three, which would truncate
 * the half that matters.
 *
 * @param {object} card
 * @param {string[]} reasons
 * @param {boolean} compact
 * @param {string|null} denyLine
 * @returns {string|null}
 */
export function personLine(card, reasons, compact, denyLine) {
  if (denyLine) return denyLine;
  const reasonLine = reasons?.length ? reasonLines(reasons, card).join(' · ') : null;
  if (reasonLine) return reasonLine;
  const facts = compact ? [] : factLabels(card);
  return [
    card?.handle ? `@${card.handle}` : null,
    placeLine(card),
    TP_AGE_BANDS[card?.age_band] ?? null,
    facts.length ? facts.join(' · ') : null,
  ].filter(Boolean).join(' · ') || null;
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
  trailing = null,
}) {
  if (!card) return null;

  // V8a: one trailing action, never the Follow+Connect pair. Connect (in
  // whichever of its own states) wins over Follow whenever it is offered at
  // all; once connected, Message takes its place; Follow only ever shows
  // when Connect is not offered here.
  const canConnect = showConnect && shouldOfferConnect(me, card);
  const connected = canConnect && connectionState(card) === 'connected';
  const showAction = showFollow || canConnect;
  // Spec 1.3: Connect hidden by the target's OWN preference (not by a
  // structural reason) shows Follow with the line saying why, so the row
  // is never quietly missing its action.
  const denyLine = showConnectDenyLine(showConnect, me, card) ? connectDenyLine(card) : null;

  const action = canConnect ? (
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
  );

  return (
    <PersonRow
      person={{ ...card, caption: personLine(card, reasons, compact, denyLine) }}
      onPress={onPress}
      trailing={trailing ?? (showAction ? action : null)}
    />
  );
}
