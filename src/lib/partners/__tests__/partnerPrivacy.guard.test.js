/**
 * partnerPrivacy.guard.test.js — source-level guard for the partner §5 privacy
 * contract (docs/bp-partner-system-rebuild.md:38-41: "derived only — NEVER raw
 * weights, sets, reps, body weight, measurements, photos, food, calories,
 * diary, check-ins, coach messages, or location").
 *
 * Why this exists (Wave 5 A0): the §5 rule was enforced only by behavioural
 * tests + the cloud schema shape — there was NO source-text guard. Wave 5 C5
 * (Partner v2) is about to WIDEN the shared surface with a new shared-block
 * table, so the leak-proof property is pinned at source level FIRST, before the
 * surface grows. The pin is structural: the only columns any client-side
 * partner CLOUD write serialises are on an explicit allowlist of derived /
 * lifecycle fields. A new column (e.g. a careless `body_weight:` or `avg_kcal:`
 * on a future shared row) fails here and must be a deliberate, reviewed
 * addition to the allowlist — never a silent widening.
 *
 * Scope: the client cloud-write surfaces only (device → Supabase), where a leak
 * would escape the device. Local mirror writes (database.js pull-appliers) and
 * pure helpers carry no raw data by construction and are not leak vectors.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const WRITE_SURFACES = [
  'src/lib/partners/service.js',
  'src/lib/sync/tables/partners.js',
];

// The complete set of columns a client may write to any partner cloud table.
// Derived week signal (partner_week_signals), block rows (partner_blocks), and
// the standard row-identity/timestamp fields. NOTHING raw: no weight, food,
// calorie, rep, set-count, measurement, photo, note or location field.
// Growing this list is a deliberate §5-reviewed act (Wave 5 C5's shared-block
// columns land here explicitly when A1 ships).
const ALLOWED_PARTNER_WRITE_COLUMNS = new Set([
  'pair_id', 'user_id', 'week_start',
  'planned_count', 'done_count', 'week_met', 'state',
  'blocker_id', 'blocked_id',
  'id', 'created_at', 'updated_at',
  // Wave 5 C5 A1 (§5-reviewed): the shared training block row. block_name is
  // the ONE piece of user-chosen content, deliberately shared by the proposer
  // (80-char cap); status is proposed|active; block_ref is server-minted and
  // never client-written. No plan content ever crosses.
  'block_name', 'proposed_by', 'status',
  // Partner STEP A (§5-reviewed): the two milestone-moment BOOLEANS carried on
  // the existing derived weekly signal row. completed_block = finished a block
  // this week; hit_pb = set at least one PB this week. Booleans only, never a
  // number, exercise name or any content; forced false under the ED freeze.
  'completed_block', 'hit_pb',
  // Partner STEP A (founder addition, §5-reviewed): real partner FIRST names.
  // Server-snapshotted from users_profile.first_name (first token, 40-cap) at
  // mint/redeem — the two people share these by definition of pairing.
  // member_a/b_first_name are the cloud snapshot columns; partner_first_name is
  // the local-mirror mapping of the OTHER side's name at pull time. FIRST names
  // only — never full names, never emails. Exactly these three keys, no wider.
  'partner_first_name', 'member_a_first_name', 'member_b_first_name',
  // Partners D5-A (§5-reviewed): the mutual weekly intention. weekly_aim is a
  // single small integer — the member's OWN session aim for the week, against
  // their OWN plan. It carries no exercise, load, body or food content, and is
  // never compared across people (partnerComparison.guard.test.js). Members
  // write only their own row (RLS + this allowlist key).
  'weekly_aim',
  // Partner win cards: explicit, one-card shares chosen by the sender. These
  // are sanitized display strings, not raw workout sets/reps/load, body data,
  // food, coach notes, photos or scan internals. revoked_at hides the card on
  // both devices while keeping the sync row auditable.
  'sender_id', 'card_type', 'title', 'summary', 'detail',
  'visible_to_partner', 'remains_private', 'revoked_at',
]);

// Raw-data tokens that must NEVER appear as a written key, independent of the
// allowlist (belt and braces: catches a careless allowlist widening too).
const FORBIDDEN_KEY_TOKENS = [
  'weight', 'bodyweight', 'body_weight', 'kcal', 'calorie', 'protein',
  'carb', 'fat', 'rep', 'set_count', 'sets', 'measurement', 'photo',
  'note', 'food', 'diary', 'location', 'lat', 'lng',
];

// Row-identity markers: every partner CLOUD row object carries one of these as
// its own column (week signals + cheers → pair_id; blocks → blocker_id). Any
// object literal containing one is a partner row and must pass the allowlist.
// This attributes correctly whether the row is inline in the .upsert(...) call
// (service.js) or built earlier and pushed to a batch (sync/tables/partners.js),
// and it naturally ignores the { onConflict } upsert-options object.
const ROW_MARKERS = /\b(pair_id|blocker_id)\s*:/g;

// Given an index inside an object literal, return the balanced { ... } body of
// the innermost enclosing object.
function enclosingObject(src, at) {
  let depth = 0;
  let open = -1;
  for (let i = at; i >= 0; i -= 1) {
    if (src[i] === '}') depth += 1;
    else if (src[i] === '{') {
      if (depth === 0) { open = i; break; }
      depth -= 1;
    }
  }
  if (open === -1) return null;
  depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

// Top-level `key:` identifiers in an object-literal body (nested objects are
// skipped so only the row's own columns are read).
function topLevelKeys(body) {
  const keys = [];
  let depth = 0;
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{' || ch === '[' || ch === '(') { depth += 1; i += 1; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { depth -= 1; i += 1; continue; }
    if (depth === 0) {
      const km = /^([a-z_][a-z0-9_]*)\s*:/i.exec(body.slice(i));
      if (km) { keys.push(km[1]); i += km[0].length; continue; }
    }
    i += 1;
  }
  return keys;
}

function collectWrittenKeys(src) {
  const keys = [];
  const seen = new Set();
  let m;
  ROW_MARKERS.lastIndex = 0;
  while ((m = ROW_MARKERS.exec(src)) !== null) {
    const body = enclosingObject(src, m.index);
    if (!body || seen.has(body)) continue;
    seen.add(body);
    keys.push(...topLevelKeys(body));
  }
  return keys;
}

describe('partner §5 privacy: client cloud writes carry only derived columns', () => {
  for (const rel of WRITE_SURFACES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const keys = collectWrittenKeys(src);

    test(`${rel} writes at least one partner row (guard is live)`, () => {
      expect(keys.length).toBeGreaterThan(0);
    });

    test(`${rel} writes only allowlisted derived/lifecycle columns`, () => {
      const offenders = [...new Set(keys)].filter((k) => !ALLOWED_PARTNER_WRITE_COLUMNS.has(k));
      expect(offenders).toEqual([]);
    });

    test(`${rel} never writes a raw-data key (§5 forbidden tokens)`, () => {
      const leaks = [...new Set(keys)].filter((k) =>
        FORBIDDEN_KEY_TOKENS.some((t) => k.toLowerCase().includes(t)));
      expect(leaks).toEqual([]);
    });
  }
});
