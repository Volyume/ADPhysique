/**
 * migrate_180_community_consistency_server_gate.sql keeps the house
 * migration shape and the RPC-only posture (SD-14, as 160-179).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header and its two facts (the ED helper's
 * predicate and the OBSERVED truth that nothing wrote the cloud table
 * before migrate_182 -- review H1; and, since founder decision B of
 * 2026-09-23 (register D196), the calm-mode arm read from the guarded
 * synced pref, READ-SIDE ONLY); that the three helpers
 * `_community_ed_flag_open`, `_community_calm_mode_on` and
 * `_community_consistency_withheld` are each BYTE-FOR-BYTE their pinned
 * bodies (review M2: an inverted RETURN, a flipped EXISTS or a dropped arm
 * must fail here, not in production), SECURITY DEFINER/STABLE on the
 * pinned search_path, revoked from every client role and never granted to
 * any; that all SIX re-issued readers and the re-issued
 * `community_update_training_profile` are byte-for-byte their current
 * sources (migrate_172 lines 302-406 and 63-292; migrate_170 lines
 * 1268-1531, 882-961 and 3632-3719; migrate_171 lines 63-114; migrate_176
 * lines 88-241 for community_hub_summary) once the lines marked
 * migrate_180 are removed, AND that each marked change sits at its named
 * anchor (review M1); that the six readers call the WITHHELD helper (both
 * arms) while the write-side force in Part 8 calls the ED helper ONLY
 * (fact (b): calm mode never pins the stored preference off); that no
 * signature or client-facing grant changed and no GRANT of any shape
 * widens anything (review M2); that the apply order 176-before-180 is a
 * refusal in code, Part 0 (review H2); that the acceptance block carries
 * the behavioural probes for all three helpers and the open-flag count
 * (review M3); that no destructive statement was introduced; that the fix
 * stays inside the named scope; and that the tracker knows the file.
 *
 * LEAD RULING 2026-09-23: `community_hub_summary` is re-issued from
 * migrate_176's body (applied 2026-09-24 14:14 UTC, before 180; it already carries the
 * closed-groups fix), not migrate_170's, and the four helper calls inside
 * FILTER/sample expressions sit LAST in their AND so the cheap column tests
 * run first (review L1).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_180_community_consistency_server_gate.sql');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const SRC171 = read('supabase/migrate_171_community_friends_trained_today.sql').split('\n');
const SRC172 = read('supabase/migrate_172_community_pr_count.sql').split('\n');
const SRC176 = read('supabase/migrate_176_community_closed_groups_out_of_lists.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 0'));
const PART0 = SQL.slice(SQL.indexOf('-- ─── Part 0'), SQL.indexOf('-- ─── Part 1'));
const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));

function fnSpan(text, startMarker, endMarker = 'END $$;') {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf(endMarker, start) + endMarker.length;
  return text.slice(start, end);
}

const HELPER = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_ed_flag_open(_uid uuid)');
const CALM = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_calm_mode_on(_uid uuid)');
const WITHHELD = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_consistency_withheld(_uid uuid)');
const PROFILE_CARD = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_profile_card(_uid uuid, _viewer uuid)');
const BOARD = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_board(', '$function$;');
const COHORT_STATS = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public._community_cohort_stats(');
const HUB_SUMMARY = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)');
const GROUP_GET = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_group_get(_group_id uuid)');
const FRIENDS_TODAY = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_friends_trained_today(', '$function$;');
const UPDATE_TRAINING_PROFILE = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_update_training_profile(_p jsonb)');

/** The three helpers, byte-for-byte (review M2). Any drift -- an inverted
 * RETURN, a NOT on an EXISTS, a widened predicate, a dropped arm -- fails
 * here. */
const HELPER_EXPECTED = `CREATE OR REPLACE FUNCTION public._community_ed_flag_open(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open boolean;
BEGIN
  -- Fail closed: a null owner id is an unexpected shape, not "no flag".
  IF _uid IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.ed_pattern_flags
      WHERE user_id = _uid AND cleared_at IS NULL AND deleted_at IS NULL
    ) INTO v_open;
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error (a missing table, a type
    -- mismatch) withholds the counters rather than exposing them.
    RETURN true;
  END;

  RETURN v_open;
END $$;`;

const CALM_EXPECTED = `CREATE OR REPLACE FUNCTION public._community_calm_mode_on(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_calm boolean;
BEGIN
  -- Fail closed: a null owner id is an unexpected shape, not "not calm".
  IF _uid IS NULL THEN
    RETURN true;
  END IF;

  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.user_prefs
      WHERE user_id = _uid AND key = '@volyume_wellbeing_mode' AND value = 'calm'
    ) INTO v_calm;
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: any unexpected error withholds rather than exposes.
    RETURN true;
  END;

  RETURN v_calm;
END $$;`;

const WITHHELD_EXPECTED = `CREATE OR REPLACE FUNCTION public._community_consistency_withheld(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public._community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid);
END $$;`;

/** Every marked change is a PURE insertion relative to its source: removing
 * it (once) must leave the source byte-for-byte. Each entry is
 * [addition, anchor, follower]: the addition must sit IMMEDIATELY after
 * `anchor` and immediately before `follower` (review M1), so a block that
 * reverts cleanly but sits in the wrong place fails too. */
const PROFILE_CARD_ADDITIONS = [[
  '  -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"): the\n'
  + "  -- client's calm/ED withhold on consistency sharing had no server-side\n"
  + '  -- equivalent (audit B-02); this is the one place it is enforced here.\n'
  + '  v_show_consistency := v_show_consistency AND NOT public._community_consistency_withheld(p.user_id);\n',
  "    AND p.status = 'active' AND p.is_minor = false;\n",
  '',
]];
const BOARD_ADDITIONS = [[
  '      -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"):\n'
  + '      -- withhold consistency data for an owner with an open ED-pattern\n'
  + "      -- flag, matching the client's calm/ED withhold server-side (B-02).\n"
  + '      AND NOT public._community_consistency_withheld(p.user_id)\n',
  "    WHERE p.status = 'active'\n      AND p.is_minor = false\n      AND p.share_consistency = true\n",
  '      AND p.c_updated_at IS NOT NULL\n',
]];
const COHORT_STATS_ADDITIONS = [
  [
    '\n             -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety\n'
    + '             -- backstop"): withhold "trained today" for an owner with an\n'
    + "             -- open ED-pattern flag, matching the client's calm/ED\n"
    + '             -- withhold server-side (B-02). Last in the AND (review L1):\n'
    + '             -- the cheap column tests run first, so the helper is called\n'
    + '             -- only for members who trained today.\n'
    + '             AND NOT public._community_consistency_withheld(p.user_id)',
    '             AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today',
    ')\n  INTO v_member_count, v_trained_count',
  ],
  [
    '\n       -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"); last in the AND (review L1).\n'
    + '       AND NOT public._community_consistency_withheld(p.user_id)',
    '       AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today',
    ') AS trained_today',
  ],
];
const HUB_SUMMARY_ADDITIONS = [
  [
    '          -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety\n'
    + '          -- backstop"); last in the AND (review L1).\n'
    + '          AND NOT public._community_consistency_withheld(p2.user_id)\n',
    '          AND p2.c_last_trained_day IS NOT NULL AND p2.c_last_trained_day = v_today\n',
    '      ),\n',
  ],
  [
    '\n             -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety\n'
    + '             -- backstop"); last in the AND (review L1).\n'
    + '             AND NOT public._community_consistency_withheld(p3.user_id)',
    '             AND p3.c_last_trained_day IS NOT NULL AND p3.c_last_trained_day = v_today',
    ') AS trained_today',
  ],
];
const GROUP_GET_ADDITIONS = [[
  '      -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"):\n'
  + "      -- withhold this member's contribution to the sum while their\n"
  + "      -- ED-pattern flag is open, matching the client's calm/ED withhold\n"
  + '      -- server-side (B-02).\n'
  + '      AND NOT public._community_consistency_withheld(p2.user_id)\n',
  "      AND p2.status = 'active' AND p2.is_minor = false\n      AND p2.share_consistency = true\n",
  '      AND NOT public._community_is_blocked(v_uid, p2.user_id);\n',
]];
const FRIENDS_TODAY_ADDITIONS = [[
  '    -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop").\n'
  + '    AND NOT public._community_consistency_withheld(p.user_id)\n',
  '    AND p.is_minor = false\n    AND p.share_consistency = true\n',
  '    AND p.c_updated_at IS NOT NULL\n',
]];
const UPDATE_TRAINING_PROFILE_ADDITIONS = [[
  '  -- RE-ANCHORED 2026-09-22 (founder order, item 6, "safety backstop"): the\n'
  + '  -- client already refuses to turn consistency sharing on while calm mode\n'
  + '  -- or an open ED-pattern flag is active\n'
  + '  -- (src/lib/community/trainingConsistency.js consistencyGateState); this\n'
  + '  -- makes the server agree rather than trust the client. The response is\n'
  + '  -- unchanged (RETURN public._community_profile_card below already nulls\n'
  + '  -- every counter once share_consistency is false), so no new key reaches\n'
  + '  -- a client that would not recognise it.\n'
  + '  IF v_share_consistency AND public._community_ed_flag_open(v_uid) THEN\n'
  + '    v_share_consistency := false;\n'
  + '  END IF;\n',
  '  IF v_share_consistency AND public._community_caller_is_minor(v_uid) THEN\n    v_share_consistency := false;\n  END IF;\n',
  '',
]];

/** Reverting is removing each addition exactly once, nothing to put back. */
function revert(text, additions) {
  let out = text;
  for (const [add] of additions) {
    expect(out.split(add).length - 1).toBe(1);
    out = out.replace(add, '');
  }
  return out;
}

/** Review M1: each addition sits exactly between its anchor and follower. */
function expectAnchored(text, additions) {
  for (const [add, anchor, follower] of additions) {
    expect(text.split(add).length - 1).toBe(1);
    expect(text).toContain(anchor + add + follower);
  }
}

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/Applied remotely:\s+YES - 2026-09-24 15:13 UTC \(written 2026-09-23\)/);
  });

  test('the header states both facts: the OBSERVED dormancy before 182 (review H1) and the calm arm (decision B)', () => {
    expect(HEADER).toContain('FACT (a)');
    expect(HEADER).toContain('FACT (b)');
    expect(HEADER).toContain('NOTHING\n--                    WRITES THE CLOUD TABLE TODAY');
    expect(HEADER).toContain('DORMANT until D92-11');
    expect(HEADER).toContain('migrate_182 adds that write path');
    expect(HEADER).toContain('B-02 is therefore NOT closed\n--                    by this migration alone: it closes with migrate_182');
    expect(HEADER).toContain('is withdrawn');
    // The prior draft's inference must not come back as a fact.
    expect(HEADER).not.toMatch(/at least as reliable as the client's own read(?!" was an inference)/);
    // Founder decision B, 2026-09-23: the calm arm, read-side only.
    expect(HEADER).toContain('founder\n--                    decision B (2026-09-23, register D196), READ-SIDE\n--                    ONLY');
    expect(HEADER).toContain('That force stays\n--                    ED-flag-only');
    expect(HEADER).toContain('do not invent a calm\n--                    signal');
    expect(HEADER).not.toMatch(/calm mode: CLIENT-ONLY/);
  });

  test('the header records the enforced apply order (review H2)', () => {
    expect(HEADER).toContain('ENFORCED MECHANICALLY');
    expect(HEADER).toContain('176 must land BEFORE 180');
    expect(HEADER).not.toContain('does not strictly have');
    expect(SQL).not.toContain('does not strictly have');
  });

  test('no CREATE TABLE, no DROP TABLE, no TRUNCATE, no ENABLE ROW LEVEL SECURITY', () => {
    expect(SQL).not.toMatch(/CREATE TABLE/i);
    expect(SQL).not.toMatch(/DROP\s+TABLE/i);
    expect(SQL).not.toMatch(/TRUNCATE/i);
    expect(SQL).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });

  test('the only DROP <object> statement shapes mentioned anywhere are the three new helpers, in the rollback comment', () => {
    const dropLines = SQL.split('\n').filter((l) => /\bDROP\s+(FUNCTION|TABLE|INDEX|POLICY|TRIGGER|VIEW|COLUMN)\b/i.test(l));
    expect(dropLines).toHaveLength(3);
    for (const line of dropLines) {
      expect(line.trim().startsWith('--')).toBe(true);
      expect(line).toMatch(/_community_(ed_flag_open|calm_mode_on|consistency_withheld)\(uuid\)/);
    }
  });
});

describe('Part 0: the apply order is a refusal in code (review H2)', () => {
  test('sits before Part 1, read-only, and refuses until migrate_176 is live', () => {
    expect(SQL.indexOf('-- ─── Part 0')).toBeLessThan(SQL.indexOf('-- ─── Part 1'));
    expect(PART0).toContain('DO $$');
    expect(PART0).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/);
    expect(PART0).toContain("pg_get_functiondef(to_regprocedure('public.community_group_list_mine()'))");
    expect(PART0).toContain("strpos(v_def, 'AND g.status = ''active''; -- migrate_176') = 0");
    expect(PART0).toContain("RAISE EXCEPTION 'migrate_180 refused: migrate_176 is not applied");
    // The probe itself never reads hub_summary (the comment may name it).
    expect(PART0).not.toContain("to_regprocedure('public.community_hub_summary");
  });

  test('migrate_176 carries the matching refusal for the other direction', () => {
    const SQL176 = SRC176.join('\n');
    const part0 = SQL176.slice(SQL176.indexOf('-- ─── Part 0'), SQL176.indexOf('-- ─── Part 1'));
    expect(part0).toContain("strpos(v_def, '_community_consistency_withheld(') > 0 OR strpos(v_def, '_community_ed_flag_open(') > 0");
    expect(part0).toContain("RAISE EXCEPTION 'migrate_176 refused: migrate_180 is live");
  });
});

describe('the three helpers', () => {
  test('are byte-for-byte their pinned bodies (review M2)', () => {
    expect(HELPER).toBe(HELPER_EXPECTED);
    expect(CALM).toBe(CALM_EXPECTED);
    expect(WITHHELD).toBe(WITHHELD_EXPECTED);
  });

  test('SECURITY DEFINER, STABLE, on the pinned search_path, each returning boolean from (_uid uuid)', () => {
    for (const [fn, name] of [[HELPER, '_community_ed_flag_open'], [CALM, '_community_calm_mode_on'], [WITHHELD, '_community_consistency_withheld']]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/\bSTABLE\b/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
      expect(SQL).toContain(`CREATE OR REPLACE FUNCTION public.${name}(_uid uuid)\nRETURNS boolean`);
    }
  });

  test('the ED arm reads exactly the open-flag predicate and fails closed', () => {
    expect(HELPER).toContain('FROM public.ed_pattern_flags');
    expect(HELPER).toContain('WHERE user_id = _uid AND cleared_at IS NULL AND deleted_at IS NULL');
    expect(HELPER).toMatch(/IF _uid IS NULL THEN\s*\n\s*RETURN true;/);
    expect(HELPER).toMatch(/EXCEPTION WHEN OTHERS THEN\s*\n(\s*--[^\n]*\n)*\s*RETURN true;/);
    expect(HELPER).not.toMatch(/RETURN false;/);
    expect(HELPER).not.toMatch(/NOT EXISTS/);
    expect(HELPER).not.toMatch(/RETURN NOT/);
  });

  test("the calm arm reads the person's own wellbeing pref and nothing else, and fails closed (decision B)", () => {
    expect(CALM).toContain('FROM public.user_prefs');
    expect(CALM).toContain("WHERE user_id = _uid AND key = '@volyume_wellbeing_mode' AND value = 'calm'");
    expect(CALM).toMatch(/IF _uid IS NULL THEN\s*\n\s*RETURN true;/);
    expect(CALM).toMatch(/EXCEPTION WHEN OTHERS THEN\s*\n(\s*--[^\n]*\n)*\s*RETURN true;/);
    expect(CALM).not.toMatch(/RETURN false;/);
    expect(CALM).not.toMatch(/NOT EXISTS/);
    // Only the wellbeing key: no other pref can ever feed this arm.
    expect(CALM.match(/key = '[^']+'/g)).toEqual(["key = '@volyume_wellbeing_mode'"]);
  });

  test('the withheld helper is the OR of the two arms and nothing else', () => {
    expect(WITHHELD).toContain('RETURN public._community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid);');
    expect(WITHHELD).not.toMatch(/\bAND\b/);
    expect(WITHHELD).not.toMatch(/\bNOT\b/);
  });

  test('all three revoked from PUBLIC, anon and authenticated, and granted to nobody in any GRANT shape (review M2)', () => {
    for (const name of ['_community_ed_flag_open', '_community_calm_mode_on', '_community_consistency_withheld']) {
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(uuid\\) FROM PUBLIC, anon, authenticated;`));
      expect(SQL).not.toMatch(new RegExp(`GRANT\\s+(EXECUTE|ALL)[^\\n]*${name}`));
    }
  });
});

describe('every re-issued reader is its current source plus the marked call only, at its anchor', () => {
  test('_community_profile_card is migrate_172 lines 302-406 plus the withheld AND', () => {
    const source = SRC172.slice(301, 406).join('\n').trimEnd();
    expect(revert(PROFILE_CARD, PROFILE_CARD_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(PROFILE_CARD, PROFILE_CARD_ADDITIONS);
  });

  test('community_board is migrate_170 lines 1268-1531 plus the withheld AND in the roster WHERE', () => {
    const source = SRC170.slice(1267, 1531).join('\n').trimEnd();
    expect(revert(BOARD, BOARD_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(BOARD, BOARD_ADDITIONS);
  });

  test('_community_cohort_stats is migrate_170 lines 882-961 plus the two withheld ANDs, each last in its AND', () => {
    const source = SRC170.slice(881, 961).join('\n').trimEnd();
    expect(revert(COHORT_STATS, COHORT_STATS_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(COHORT_STATS, COHORT_STATS_ADDITIONS);
  });

  test('community_hub_summary is migrate_176 lines 88-241 plus the two withheld ANDs, each last in its AND', () => {
    const source = SRC176.slice(87, 241).join('\n').trimEnd();
    expect(source.startsWith('CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)')).toBe(true);
    expect(source.endsWith('END $$;')).toBe(true);
    expect(revert(HUB_SUMMARY, HUB_SUMMARY_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(HUB_SUMMARY, HUB_SUMMARY_ADDITIONS);
  });

  test('community_hub_summary also still carries migrate_176\'s own closed-groups change intact', () => {
    expect(HUB_SUMMARY).toContain(
      "WHERE m.user_id = v_uid AND m.state = 'member'\n    AND g.status = 'active'; -- migrate_176: a closed group leaves the Hub",
    );
  });

  test('community_group_get is migrate_170 lines 3632-3719 plus the withheld AND', () => {
    const source = SRC170.slice(3631, 3719).join('\n').trimEnd();
    expect(revert(GROUP_GET, GROUP_GET_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(GROUP_GET, GROUP_GET_ADDITIONS);
  });

  test('community_friends_trained_today is migrate_171 lines 63-114 plus the withheld AND', () => {
    const source = SRC171.slice(62, 114).join('\n').trimEnd();
    expect(revert(FRIENDS_TODAY, FRIENDS_TODAY_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(FRIENDS_TODAY, FRIENDS_TODAY_ADDITIONS);
  });

  test('community_update_training_profile is migrate_172 lines 63-292 plus the ED-flag force-false block, right after the minor check', () => {
    const source = SRC172.slice(62, 292).join('\n').trimEnd();
    expect(revert(UPDATE_TRAINING_PROFILE, UPDATE_TRAINING_PROFILE_ADDITIONS).trimEnd()).toBe(source);
    expectAnchored(UPDATE_TRAINING_PROFILE, UPDATE_TRAINING_PROFILE_ADDITIONS);
  });
});

describe('every marked change actually calls the right helper (wired, not only declared)', () => {
  test.each([
    ['_community_profile_card', () => PROFILE_CARD, '_community_consistency_withheld(p.user_id)'],
    ['community_board', () => BOARD, '_community_consistency_withheld(p.user_id)'],
    ['_community_cohort_stats', () => COHORT_STATS, '_community_consistency_withheld(p.user_id)'],
    ['community_group_get', () => GROUP_GET, '_community_consistency_withheld(p2.user_id)'],
    ['community_friends_trained_today', () => FRIENDS_TODAY, '_community_consistency_withheld(p.user_id)'],
  ])('%s calls %s (both arms)', (_name, span, call) => {
    expect(span()).toContain(call);
    expect(span()).not.toContain('_community_ed_flag_open(');
  });

  test('community_hub_summary calls the withheld helper for both the count and the sample (two members, p2 and p3)', () => {
    expect(HUB_SUMMARY).toContain('_community_consistency_withheld(p2.user_id)');
    expect(HUB_SUMMARY).toContain('_community_consistency_withheld(p3.user_id)');
    expect(HUB_SUMMARY).not.toContain('_community_ed_flag_open(');
  });

  test('the write-side force in Part 8 calls the ED arm ONLY, never the calm arm (fact (b))', () => {
    expect(UPDATE_TRAINING_PROFILE).toContain('_community_ed_flag_open(v_uid)');
    expect(UPDATE_TRAINING_PROFILE).not.toContain('_community_consistency_withheld(');
    expect(UPDATE_TRAINING_PROFILE).not.toContain('_community_calm_mode_on(');
  });

  test('the profile-card gate is a strengthening AND, never a replacement of the existing condition', () => {
    expect(PROFILE_CARD).toContain(
      'v_show_consistency := v_show_consistency AND NOT public._community_consistency_withheld(p.user_id);',
    );
    expect(PROFILE_CARD).toContain(
      'v_show_consistency := v_viewable AND coalesce(p.share_consistency, false)\n    AND p.status = \'active\' AND p.is_minor = false;',
    );
  });

  test('community_update_training_profile forces share_consistency false, never true, when the flag is open', () => {
    expect(UPDATE_TRAINING_PROFILE).toContain(
      'IF v_share_consistency AND public._community_ed_flag_open(v_uid) THEN\n    v_share_consistency := false;\n  END IF;',
    );
    expect(UPDATE_TRAINING_PROFILE).not.toMatch(/_community_ed_flag_open\(v_uid\)[^\n]*\n\s*v_share_consistency := true/);
  });

  test('the response shape is unchanged: still returns _community_profile_card(v_uid, v_uid), no new key added', () => {
    expect(UPDATE_TRAINING_PROFILE).toContain('RETURN public._community_profile_card(v_uid, v_uid);');
    expect(UPDATE_TRAINING_PROFILE).not.toMatch(/RETURN jsonb_build_object/);
  });
});

describe('RPC-only security posture, all ten functions', () => {
  test('SECURITY DEFINER on the pinned search_path, every function', () => {
    for (const fn of [HELPER, CALM, WITHHELD, PROFILE_CARD, BOARD, COHORT_STATS, HUB_SUMMARY, GROUP_GET, FRIENDS_TODAY, UPDATE_TRAINING_PROFILE]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path\s*(=|TO)\s*'?public'?,\s*'?pg_temp'?/);
    }
  });

  test('signatures are unchanged from their current sources', () => {
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public._community_profile_card(_uid uuid, _viewer uuid)');
    expect(SQL).toContain(
      'CREATE OR REPLACE FUNCTION public.community_board(_scope text, _scope_key text DEFAULT NULL::text, _window text DEFAULT \'week\'::text, _cursor text DEFAULT NULL::text, _limit integer DEFAULT 20, _today text DEFAULT NULL::text)',
    );
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public._community_cohort_stats(\n  _uid uuid, _kind text, _key text, _today text\n)');
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)');
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_group_get(_group_id uuid)');
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_friends_trained_today(_today text DEFAULT NULL::text)');
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_update_training_profile(_p jsonb)');
  });

  test('the two internal readers stay revoked from every client role and are granted to nobody in any shape', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_profile_card\(uuid, uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_cohort_stats\(uuid, text, text, text\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).not.toMatch(/GRANT\s+(EXECUTE|ALL)[^\n]*_community_profile_card/);
    expect(SQL).not.toMatch(/GRANT\s+(EXECUTE|ALL)[^\n]*_community_cohort_stats/);
  });

  test('every GRANT in the file is EXECUTE on one of the five client RPCs to authenticated, once each (review M2)', () => {
    const allowed = [
      'community_board(text, text, text, text, integer, text)',
      'community_hub_summary(text)',
      'community_group_get(uuid)',
      'community_friends_trained_today(text)',
      'community_update_training_profile(jsonb)',
    ];
    const grants = SQL.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grants).toHaveLength(allowed.length);
    for (const sig of allowed) {
      expect(grants.filter((l) => l === `GRANT EXECUTE ON FUNCTION public.${sig} TO authenticated;`)).toHaveLength(1);
      const fname = sig.split('(')[0];
      expect(SQL).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fname}\\([^)]*\\) FROM PUBLIC, anon;`));
    }
    expect(SQL).not.toMatch(/ALL FUNCTIONS IN SCHEMA/i);
    expect(SQL).not.toMatch(/GRANT[^\n]*TO\s+(anon|PUBLIC|service_role)\b/i);
  });
});

describe('the acceptance block proves the gate works, not only that it is wired (review M3)', () => {
  test('is read-only and checks both tables, the posture (with the NULL proconfig arm), the volatility and every wiring', () => {
    expect(ACCEPT).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)\b/);
    expect(ACCEPT).toContain("to_regclass('public.ed_pattern_flags') IS NULL");
    expect(ACCEPT).toContain("to_regclass('public.user_prefs') IS NULL");
    expect(ACCEPT).toContain('OR p.proconfig IS NULL');
    expect(ACCEPT).toContain("'search_path=public, pg_temp' = ANY (p.proconfig)");
    expect(ACCEPT).toContain("'_community_ed_flag_open', '_community_calm_mode_on',\n        '_community_consistency_withheld', '_community_profile_card',");
    expect(ACCEPT).toContain("IS DISTINCT FROM 's' THEN\n    RAISE EXCEPTION 'acceptance failed: _community_ed_flag_open is not STABLE'");
    for (const fn of ['_community_profile_card', 'community_board', '_community_cohort_stats', 'community_hub_summary', 'community_group_get', 'community_friends_trained_today']) {
      expect(ACCEPT).toContain(`acceptance failed: ${fn} does not call _community_consistency_withheld`);
    }
    expect(ACCEPT).toContain('acceptance failed: community_update_training_profile does not call _community_ed_flag_open');
  });

  test('probes all three helpers: NULL is true, an id with no row is false, an open row (when one exists) is true, and the OR composes', () => {
    expect(ACCEPT).toContain('IF public._community_ed_flag_open(NULL) IS DISTINCT FROM true THEN');
    expect(ACCEPT).toContain('IF public._community_ed_flag_open(gen_random_uuid()) IS DISTINCT FROM false THEN');
    expect(ACCEPT).toContain('IF v_probe IS NOT NULL AND public._community_ed_flag_open(v_probe) IS DISTINCT FROM true THEN');
    expect(ACCEPT).toContain('IF public._community_calm_mode_on(NULL) IS DISTINCT FROM true THEN');
    expect(ACCEPT).toContain('IF public._community_calm_mode_on(gen_random_uuid()) IS DISTINCT FROM false THEN');
    expect(ACCEPT).toContain('IF public._community_consistency_withheld(NULL) IS DISTINCT FROM true\n     OR public._community_consistency_withheld(gen_random_uuid()) IS DISTINCT FROM false THEN');
    expect(ACCEPT).toContain("strpos(v_def, '_community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid)') = 0");
  });

  test('prints the open-flag count so the state of the ED arm is visible in the apply output', () => {
    expect(ACCEPT).toContain("RAISE NOTICE 'migrate_180: open ED-pattern flags in the cloud table: %");
    expect(ACCEPT).toContain('0 means no device on a build with the migrate_182 push has raised a flag yet, or 182 is not applied');
    expect(ACCEPT).not.toContain('dormant until D92-11');
    // Review L8: the two decision-B helpers STABLE, the withheld helper's
    // live body compared exactly, and the calm arm probed against real
    // pref rows in both directions when any exist.
    expect(ACCEPT).toContain("IS DISTINCT FROM 's' THEN\n    RAISE EXCEPTION 'acceptance failed: _community_calm_mode_on is not STABLE'");
    expect(ACCEPT).toContain("IS DISTINCT FROM 's' THEN\n    RAISE EXCEPTION 'acceptance failed: _community_consistency_withheld is not STABLE'");
    expect(ACCEPT).toContain("IF v_def IS DISTINCT FROM E'BEGIN\\n  RETURN public._community_ed_flag_open(_uid) OR public._community_calm_mode_on(_uid);\\nEND' THEN");
    expect(ACCEPT).toContain("WHERE u.key = '@volyume_wellbeing_mode' AND u.value = 'calm' LIMIT 1;");
    expect(ACCEPT).toContain("the calm arm answers false for a real calm pref row");
    expect(ACCEPT).toContain("WHERE u.key = '@volyume_wellbeing_mode' AND u.value IS DISTINCT FROM 'calm'");
    expect(ACCEPT).toContain("the calm arm withholds a person who is neither calm nor flagged");
  });

  test('client roles can execute exactly the five RPCs and none of the five internals', () => {
    for (const internal of ['_community_ed_flag_open(uuid)', '_community_calm_mode_on(uuid)', '_community_consistency_withheld(uuid)', '_community_profile_card(uuid, uuid)', '_community_cohort_stats(uuid, text, text, text)']) {
      expect(ACCEPT).toContain(`has_function_privilege('authenticated', 'public.${internal}', 'EXECUTE')`);
    }
    expect(ACCEPT).toContain("IF NOT has_function_privilege('authenticated', 'public.community_board(text, text, text, text, integer, text)', 'EXECUTE')");
    expect(ACCEPT).toContain("IF has_function_privilege('anon', 'public.community_board(text, text, text, text, integer, text)', 'EXECUTE')");
  });
});

describe('scope discipline: the fix stays inside consistency sharing', () => {
  test('community_upsert_profile (share_sessions / c_planned_per_week) is never re-issued here', () => {
    expect(SQL).not.toContain('CREATE OR REPLACE FUNCTION public.community_upsert_profile');
  });

  test('the flagged-owner exclusion never touches share_sessions', () => {
    expect(UPDATE_TRAINING_PROFILE).not.toMatch(/share_sessions\s*:?=\s*false/);
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status row, naming the two arms, the apply order and migrate_182', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/\| 180 \|[^\n]*\*\*APPLIED 2026-09-24 15:13 UTC\*\*/);
    expect(README).toContain('| 180 | `migrate_180_community_consistency_server_gate.sql` |');
    const row = README.split('\n').find((l) => l.startsWith('| 180 | `migrate_180_'));
    expect(row).toContain('D92-11');
    expect(row).toContain('176 BEFORE 180');
    expect(row).toContain('calm');
    expect(row).toContain('182');
  });
});
