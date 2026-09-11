/**
 * migrate_172_community_pr_count.sql keeps the house migration shape and
 * the RPC-only posture (SD-14, as 160-171).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; the additive column; that BOTH re-issued
 * functions are byte-for-byte their current sources (migrate_165 lines
 * 298-517 and migrate_170 lines 765-866) once the lines marked migrate_172
 * are removed, so a hand-edited carry-forward can never silently change a
 * training-profile field or a card key; that the PR count is accepted only
 * inside the share_consistency block with a clamp; that the card exposes it
 * only under v_show_consistency AND share_sessions; that the card stays
 * unreachable by client roles; and that the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_172_community_pr_count.sql');
const SRC165 = read('supabase/migrate_165_community_boards_groups.sql').split('\n');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('END $$;', start) + 'END $$;'.length;
  return text.slice(start, end);
}
const UTP = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_update_training_profile(_p jsonb)');
const CARD = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_profile_card(_uid uuid, _viewer uuid)');

/** The exact additions the migration carries. Stripping them (each must be
 * present exactly once) must leave the source function byte-for-byte. */
const UTP_ADDITIONS = [
  "  -- migrate_172 (blueprint section 4, CR-05): PRs in the last four weeks,\n"
  + "  -- a count only, never a lift; accepted under the same gate as every\n"
  + "  -- counter above.\n"
  + "  v_c_prs_4w           smallint;\n",
  "    -- migrate_172: the PR count, clamped like its siblings; an out-of-range\n"
  + "    -- or missing value is null, never a refusal.\n"
  + "    IF jsonb_typeof(_p -> 'c_prs_4w') = 'number' THEN\n"
  + "      v_c_prs_4w := greatest(0, least((_p ->> 'c_prs_4w')::int, 200))::smallint;\n"
  + "    END IF;\n",
  "    c_prs_4w               = v_c_prs_4w,\n",
];
const CARD_ADDITIONS = [
  "    -- migrate_172 (blueprint section 4): the PR count travels only when the\n"
  + "    -- owner shares consistency AND shares what they did; a count, never a\n"
  + "    -- lift. The key is always present, the value null otherwise.\n"
  + "    'c_prs_4w',               CASE WHEN v_show_consistency AND coalesce(p.share_sessions, false) THEN p.c_prs_4w END,\n",
];
function withoutAdditions(text, additions) {
  let out = text;
  for (const add of additions) {
    expect(out.split(add).length - 1).toBe(1);
    out = out.replace(add, '');
  }
  return out;
}

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
  });

  test('the column is additive and idempotent', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.community_profiles\n\s+ADD COLUMN IF NOT EXISTS c_prs_4w smallint;/);
  });
});

describe('both functions are their current sources plus the marked lines only', () => {
  test('community_update_training_profile is migrate_165 lines 298-517 plus the PR count', () => {
    const source = SRC165.slice(297, 517).join('\n').trimEnd();
    expect(withoutAdditions(UTP, UTP_ADDITIONS).trimEnd()).toBe(source);
    expect(UTP).not.toBe(source);
  });

  test('_community_profile_card is migrate_170 lines 765-866 plus the PR count', () => {
    const source = SRC170.slice(764, 866).join('\n').trimEnd();
    expect(withoutAdditions(CARD, CARD_ADDITIONS).trimEnd()).toBe(source);
    expect(CARD).not.toBe(source);
  });
});

describe('the PR count is a gated, clamped counter and never a lift', () => {
  test('accepted only inside the share_consistency block, clamped 0..200', () => {
    const blockStart = UTP.indexOf('IF v_share_consistency THEN');
    const rail = UTP.indexOf("PERFORM public._community_rate_check(v_uid, 'update_training_profile'");
    const acceptAt = UTP.indexOf("IF jsonb_typeof(_p -> 'c_prs_4w') = 'number' THEN");
    expect(blockStart).toBeGreaterThan(-1);
    expect(acceptAt).toBeGreaterThan(blockStart);
    expect(acceptAt).toBeLessThan(rail);
    expect(UTP).toContain("v_c_prs_4w := greatest(0, least((_p ->> 'c_prs_4w')::int, 200))::smallint;");
    expect(UTP).toContain('c_prs_4w               = v_c_prs_4w,');
  });

  test('the card exposes it only when the owner shares consistency AND what they did', () => {
    expect(CARD).toContain("'c_prs_4w',               CASE WHEN v_show_consistency AND coalesce(p.share_sessions, false) THEN p.c_prs_4w END,");
  });

  test('a count only: nothing else about a PR leaves through this file', () => {
    expect(SQL).not.toMatch(/pr_exercise|pr_weight|pr_reps|personal_records/);
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path, both functions', () => {
    for (const fn of [UTP, CARD]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('EXECUTE: the RPC to authenticated only; the card helper to nobody', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.community_update_training_profile\(jsonb\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_update_training_profile\(jsonb\) TO authenticated;/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_profile_card\(uuid, uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._community_profile_card/);
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status entry and a ledger row', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/172 (WRITTEN, NOT APPLIED|APPLIED)/);
    expect(README).toContain('| 172 | `migrate_172_community_pr_count.sql` |');
  });
});
