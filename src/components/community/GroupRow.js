/**
 * GroupRow (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "GroupRow").
 *
 * The same anatomy as `CohortRow` (avatar stack, title, one secondary
 * line, chevron, hairline below), so it IS a `CohortRow` with the group's
 * name as the title: one implementation, no second copy to drift
 * (`docs/rules/styling.md`, "extend, do not fork"). The secondary line is
 * caller-composed: "8 members · invite only" until the server can say who
 * trained today (phase 2), then "3 trained today · 8 members".
 *
 * Props:
 *   group    { id, name, access, member_count }
 *   line     the secondary line, already composed by the caller
 *   people   up to three members for the avatar stack (may be empty)
 *   onPress  opens the group
 */
import CohortRow from './CohortRow';

export default function GroupRow({ group, line, people, onPress }) {
  return (
    <CohortRow
      title={group?.name || 'Group'}
      line={line}
      people={people}
      onPress={onPress}
    />
  );
}
