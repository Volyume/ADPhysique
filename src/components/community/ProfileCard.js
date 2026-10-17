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
 * A row shows ONE trailing action: `FollowButton` (or the caller's own
 * `trailing` node). Connect and Message are offered on the profile screen
 * (`CommunityProfileScreen` composes Follow + Connect itself), not on rows;
 * the row's old, never-enabled connect branch was removed (audit E2).
 *
 * Spec 1.1 C / 1.3 (migration 163): a card's `place_label` (falling back
 * to `area_label`) and `age_band` join the handle line when present, and
 * `reasons` runs through `reasonLines` so the four fixed-token reasons
 * (`same_place`, `near_place`, `within_25_miles`, `same_age_band`) read as
 * copy rather than a raw key.
 *
 * Props:
 *   card       the profile card (user_id, handle, display_name,
 *              avatar_preset, bio, styles, goal, setting, area_label,
 *              gym_label, follower_count, relationship, ...)
 *   reasons    string[] from `suggestedPeople`, rendered as the line
 *   onPress    opens the profile
 *   onPressWithLayout  origin-aware open (D188), passed to the row
 *   inBand     D221 V1: the row carries the band's gutter itself
 *   showFollow render the FollowButton (default true; pass false on your
 *              own card and inside a picker)
 *   onFollowChange (relationship, card) after a successful follow toggle
 *   compact    drops the training facts, for a condensed creator line
 *   trailing   a caller-built node for the row's trailing slot, in place
 *              of the action above (the Followers and Connections kebab,
 *              the Activity screen's Accept/Decline pair, the Privacy
 *              screen's Unblock/Unmute): one row shape, whatever the
 *              surface's own control happens to be
 */

import PersonRow from './PersonRow';
import FollowButton from './FollowButton';
import {
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS, COMMUNITY_SETTINGS,
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
 * The row's one line, by priority (see the header): the reasons this person
 * is here, else who they are. Never a concatenation of both, which would
 * truncate the half that matters.
 *
 * @param {object} card
 * @param {string[]} reasons
 * @param {boolean} compact
 * @returns {string|null}
 */
export function personLine(card, reasons, compact) {
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
  onPressWithLayout,
  inBand = false,
  showFollow = true,
  onFollowChange,
  compact = false,
  trailing = null,
}) {
  if (!card) return null;

  // One trailing action: the caller's own node, else Follow. Connect and
  // Message live on the profile screen (audit E2).
  const action = <FollowButton card={card} onChange={onFollowChange} />;

  return (
    <PersonRow
      person={{ ...card, caption: personLine(card, reasons, compact) }}
      onPress={onPress}
      onPressWithLayout={onPressWithLayout}
      inBand={inBand}
      trailing={trailing ?? (showFollow ? action : null)}
    />
  );
}
