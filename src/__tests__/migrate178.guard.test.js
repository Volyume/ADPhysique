/**
 * migrate_178_community_note_posts.sql keeps the house migration shape and
 * the RPC-only posture (SD-14, as 160-176), following
 * migrate172.rpcOnly.guard.test.js's pattern.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that `community_posts_kind_check` is
 * widened to add 'note' while keeping every existing value; that BOTH
 * re-issued functions (`_community_payload_keys` and `community_create_post`)
 * are byte-for-byte their current sources (migrate_160 lines 652-675 and
 * migrate_170 lines 2981-3182) once the lines marked migrate_178 are
 * removed, so a hand-edited carry-forward can never silently change an
 * existing kind's allow-list or `community_create_post`'s existing
 * behaviour; that 'note' returns an empty (never NULL) allow-list; that a
 * 'note' post requires a non-empty caption, checked AFTER the caption is
 * cleaned and BEFORE any other new-post rule; that nothing destructive is
 * anywhere in the file; that every function stays a pinned SECURITY
 * DEFINER, granted deliberately; and that the tracker knows the file.
 *
 * RE-ANCHORED (Opus adversarial review, founder order 2026-09-22, "ship
 * with fixes"): three further marked additions to `community_create_post`,
 * each pinned below alongside the original note-caption addition --
 *   F6: an automatic ('note' + `_auto`) post is refused outright.
 *   F8: the note-caption rule tests emptiness with a whitespace CLASS
 *       (including U+00A0 and U+200B), not `v_caption`'s own NULL-ness.
 *   P1: a NEW helper, `_community_payload_has_blocked_term`, is called
 *       after the allow-list/forbidden-key checks and before the caption
 *       rule, raising `content_not_allowed` when any payload STRING VALUE
 *       carries a blocked term -- pinned for existence, SECURITY DEFINER,
 *       search_path, revokes and its call site, the same way every other
 *       `_community_` helper in this file already is.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_178_community_note_posts.sql');
const SRC160_RAW = read('supabase/migrate_160_community.sql');
const SRC160 = SRC160_RAW.split('\n');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

/** A LANGUAGE sql function: no BEGIN/END, just AS $$ ... $$;. */
function fnSpanSql(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const asAt = text.indexOf('AS $$', start);
  const end = text.indexOf('$$;', asAt) + '$$;'.length;
  return text.slice(start, end);
}

/** A LANGUAGE plpgsql function: BEGIN ... END $$;. */
function fnSpanPlpgsql(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('END $$;', start) + 'END $$;'.length;
  return text.slice(start, end);
}

const PAYLOAD_KEYS_FN = fnSpanSql(SQL, 'CREATE OR REPLACE FUNCTION public._community_payload_keys(_kind text)');
const CREATE_POST_FN = fnSpanPlpgsql(SQL, 'CREATE OR REPLACE FUNCTION public.community_create_post(');
// fix P1: the new blocked-term helper, same LANGUAGE plpgsql shape as
// community_create_post, so the same span finder applies.
const BLOCKED_TERM_FN = fnSpanPlpgsql(SQL, 'CREATE OR REPLACE FUNCTION public._community_payload_has_blocked_term(_payload jsonb)');

/** The exact additions the migration carries. Stripping them (each must be
 * present exactly once) must leave the source function byte-for-byte. */
const PAYLOAD_KEYS_ADDITIONS = [
  "    WHEN 'note' THEN ARRAY[]::text[] -- migrate_178: no payload; the caption IS the post\n",
];
// fix P1: the blocked-term check, placed after the allow-list and
// forbidden-key checks and before the caption rule.
const P1_ADDITION = "  -- migrate_178 P1 (lead ruling, Opus adversarial review, founder order\n"
  + "  -- 2026-09-22): a payload STRING VALUE (a session name, plan name,\n"
  + "  -- exercise name, milestone title) reached every feed and public page\n"
  + "  -- with no blocked-terms check at all until now -- only the caption\n"
  + "  -- ever had one. Same helper, same list as the caption's own check, so\n"
  + "  -- the two can never disagree. Placed after the allow-list and\n"
  + "  -- forbidden-key checks (the payload is now known well-formed and\n"
  + "  -- PII-free) and before the caption rule.\n"
  + '  IF public._community_payload_has_blocked_term(_payload) THEN\n'
  + "    RAISE EXCEPTION USING message = 'content_not_allowed';\n"
  + '  END IF;\n'
  + '\n';
// fix F8: REPLACES the original note-caption addition (the condition
// itself changed, so it is re-stated here in full rather than patched).
const F8_ADDITION = "  -- migrate_178 (founder order 2026-09-22 item 5, A-05): a 'note' carries\n"
  + "  -- no payload at all, so its caption IS the whole post; every other\n"
  + "  -- kind's caption stays optional, exactly as before. Checked AFTER\n"
  + "  -- cleaning, so a blocked-term caption still raises content_not_allowed\n"
  + "  -- first, never masked as invalid_input.\n"
  + '  --\n'
  + '  -- F8 (Opus adversarial review, founder order 2026-09-22): emptiness is\n'
  + "  -- now tested with a whitespace CLASS, not v_caption's own NULL-ness.\n"
  + '  -- btrim (used above, and inside _community_clean_text) strips only\n'
  + '  -- the ASCII space character, so a caption made only of a non-breaking\n'
  + '  -- space (U+00A0) or a zero-width space (U+200B) survived as non-NULL\n'
  + '  -- and would have passed as a real note. Alternation, not a bracket\n'
  + "  -- class: _community_fold's own '\\s+' (migrate_160 line 712) already\n"
  + '  -- proves this engine accepts \\s standalone, kept unambiguous here by\n'
  + '  -- never mixing \\s with other characters inside one [...] class.\n'
  + `  -- Lead review 2026-09-23: the no-break space (U+00A0) and the zero-width\n`
  + `  -- space (U+200B) are spelt chr(160) and chr(8203) so the rule is visible\n`
  + `  -- in the file, never two invisible bytes an editor could drop.\n`
  + `  IF _kind = 'note' AND (v_caption IS NULL OR v_caption ~ ('^(\\s|' || chr(160) || '|' || chr(8203) || ')*$')) THEN\n`
  + "    RAISE EXCEPTION USING message = 'invalid_input';\n"
  + '  END IF;\n'
  + '\n';
// fix F6: placed with the note rule immediately above (F8_ADDITION).
const F6_ADDITION = '  -- migrate_178 F6 (Opus adversarial review, founder order 2026-09-22):\n'
  + '  -- a note is a person\'s own words, never a machine-generated ambient\n'
  + "  -- item -- CommunityComposeScreen.js never sets _auto for kind 'note'.\n"
  + '  -- Placed with the note rule immediately above; refuses a caller who\n'
  + '  -- tries anyway rather than silently accepting it.\n'
  + "  IF _kind = 'note' AND coalesce(_auto, false) THEN\n"
  + "    RAISE EXCEPTION USING message = 'invalid_input';\n"
  + '  END IF;\n'
  + '\n';
const CREATE_POST_ADDITIONS = [P1_ADDITION, F8_ADDITION, F6_ADDITION];
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

  test('nothing destructive is anywhere in the file: no DROP TABLE, TRUNCATE or ENABLE ROW LEVEL SECURITY', () => {
    expect(SQL).not.toMatch(/DROP TABLE/i);
    expect(SQL).not.toMatch(/TRUNCATE/i);
    expect(SQL).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(SQL).not.toMatch(/CREATE POLICY/i);
  });
});

describe('community_posts_kind_check is widened to add note, keeping every existing value', () => {
  test('the constraint is dropped by name and re-added, never a bare ADD that could collide', () => {
    expect(SQL).toContain('DROP CONSTRAINT IF EXISTS community_posts_kind_check');
    expect(SQL).toContain('ADD CONSTRAINT community_posts_kind_check');
  });

  test('the CHECK carries note and the five pre-existing values', () => {
    const at = SQL.indexOf('ADD CONSTRAINT community_posts_kind_check');
    const check = SQL.slice(at, SQL.indexOf(';', at));
    for (const kind of ['pr', 'session', 'block', 'milestone', 'programme', 'note']) {
      expect(check).toContain(`'${kind}'`);
    }
  });
});

describe('both functions are their current sources plus the marked lines only', () => {
  test('_community_payload_keys is migrate_160 lines 652-675 plus the note branch', () => {
    const source = SRC160.slice(651, 675).join('\n').trimEnd();
    expect(withoutAdditions(PAYLOAD_KEYS_FN, PAYLOAD_KEYS_ADDITIONS).trimEnd()).toBe(source);
    expect(PAYLOAD_KEYS_FN).not.toBe(source);
  });

  test('community_create_post is migrate_170 lines 2981-3182 plus the note-caption rule', () => {
    const source = SRC170.slice(2980, 3182).join('\n').trimEnd();
    expect(withoutAdditions(CREATE_POST_FN, CREATE_POST_ADDITIONS).trimEnd()).toBe(source);
    expect(CREATE_POST_FN).not.toBe(source);
  });
});

describe('note is an empty allow-list, never NULL, and its caption is required', () => {
  test('_community_payload_keys returns an empty text[] for note, not the unknown-kind NULL', () => {
    expect(PAYLOAD_KEYS_FN).toContain("WHEN 'note' THEN ARRAY[]::text[]");
    expect(PAYLOAD_KEYS_FN).toMatch(/ELSE NULL/);
  });

  // F8 (Opus adversarial review): the condition itself changed (a
  // whitespace CLASS, not a bare v_caption IS NULL) -- re-pinned in full.
  test('the note-caption rule sits after the caption is cleaned and before every other new-post rule', () => {
    const cleaned = CREATE_POST_FN.indexOf('v_caption := public._community_clean_text(v_caption);');
    const rule = CREATE_POST_FN.indexOf(
      "IF _kind = 'note' AND (v_caption IS NULL OR v_caption ~ ('^(\\s|' || chr(160) || '|' || chr(8203) || ')*$')) THEN",
    );
    const visibility = CREATE_POST_FN.indexOf("v_vis := coalesce(nullif(btrim(coalesce(_visibility, '')), ''), 'public');");
    expect(cleaned).toBeGreaterThan(-1);
    expect(rule).toBeGreaterThan(cleaned);
    expect(visibility).toBeGreaterThan(rule);
    // F6's auto-refusal sits between the note-caption rule and visibility.
    expect(CREATE_POST_FN).toContain(
      "RAISE EXCEPTION USING message = 'invalid_input';\n  END IF;\n\n  -- migrate_178 F6",
    );
    expect(CREATE_POST_FN).toContain(
      "RAISE EXCEPTION USING message = 'invalid_input';\n  END IF;\n\n  -- migrate_170 part B",
    );
  });

  // F8: the whitespace class actually includes U+00A0 and U+200B, the two
  // characters btrim (used both above and inside _community_clean_text)
  // does not strip, which is exactly the gap this fix closes.
  test('F8: the whitespace class names U+00A0 and U+200B, the two characters btrim does not strip', () => {
    expect(CREATE_POST_FN).toContain(`'^(\\s|' || chr(160) || '|' || chr(8203) || ')*$'`);
    // No raw invisible character may sit in the migration file.
    expect(SQL.includes('\u00a0') || SQL.includes('\u200b')).toBe(false);
  });

  // F6: an automatic note is refused outright, placed with the note rule.
  test('F6: an automatic (\'note\' + _auto) post is refused, immediately after the note-caption rule', () => {
    expect(CREATE_POST_FN).toMatch(
      /IF _kind = 'note' AND \(v_caption IS NULL OR v_caption ~[\s\S]*?END IF;\s*\n\s*-- migrate_178 F6[\s\S]*?IF _kind = 'note' AND coalesce\(_auto, false\) THEN\s*\n\s*RAISE EXCEPTION USING message = 'invalid_input';\s*\n\s*END IF;/,
    );
  });

  // P1: a payload STRING VALUE is checked for a blocked term, placed
  // after the allow-list/forbidden-key checks and before the caption rule.
  test('P1: the blocked-term helper is called after forbidden-keys and before the caption rule, raising content_not_allowed', () => {
    const forbidden = CREATE_POST_FN.indexOf('PERFORM public._community_forbidden_keys(_payload);');
    const p1Call = CREATE_POST_FN.indexOf('IF public._community_payload_has_blocked_term(_payload) THEN');
    const p1Raise = CREATE_POST_FN.indexOf("RAISE EXCEPTION USING message = 'content_not_allowed';");
    const captionAssign = CREATE_POST_FN.indexOf("v_caption := nullif(btrim(coalesce(_caption, '')), '');");
    expect(forbidden).toBeGreaterThan(-1);
    expect(p1Call).toBeGreaterThan(forbidden);
    expect(p1Raise).toBeGreaterThan(p1Call);
    expect(captionAssign).toBeGreaterThan(p1Raise);
  });

  test('a note with no payload at all still passes the payload-object and forbidden-key checks unchanged', () => {
    // Not re-tested here at runtime (no local Postgres in this lane); the
    // unchanged control flow is pinned by the byte-for-byte comparison
    // above, which proves `_payload IS NULL OR jsonb_typeof(_payload) <>
    // 'object'`, the jsonb_each loop and _community_forbidden_keys are
    // untouched by migrate_178.
    expect(CREATE_POST_FN).toContain("IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN");
    expect(CREATE_POST_FN).toContain('PERFORM public._community_forbidden_keys(_payload);');
  });
});

// fix P1 (lead ruling, Opus adversarial review, founder order 2026-09-22):
// the new helper itself -- existence, its recursive shape, and that its
// matching rule is the EXACT one _community_clean_text uses, so the two
// checks can never disagree.
describe('fix P1: _community_payload_has_blocked_term', () => {
  test('exists, LANGUAGE plpgsql, and is a genuinely new function (no migrate_178 marker needed -- it is not a re-issue)', () => {
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public._community_payload_has_blocked_term(_payload jsonb)');
    expect(SQL).toContain('RETURNS boolean');
  });

  test('recurses over objects (by value) and arrays (by element), the same shape _community_forbidden_keys uses', () => {
    expect(BLOCKED_TERM_FN).toContain("jsonb_typeof(_payload) = 'object'");
    expect(BLOCKED_TERM_FN).toContain('FOR v_val IN SELECT value FROM jsonb_each(_payload) LOOP');
    expect(BLOCKED_TERM_FN).toContain("jsonb_typeof(_payload) = 'array'");
    expect(BLOCKED_TERM_FN).toContain('FOR v_item IN SELECT value FROM jsonb_array_elements(_payload) LOOP');
    // Depth-bounded the same way _community_forbidden_keys is: no explicit
    // depth counter of its own -- both rely on community_create_post's own
    // octet_length(_payload::text) > 16384 cap running before either is
    // ever called.
    expect(BLOCKED_TERM_FN).not.toMatch(/depth|_depth/i);
  });

  // The exact matching rule _community_clean_text uses (migrate_160 lines
  // 924-930): fold, pad with a leading and trailing space, whole-word test
  // against every _community_blocked_terms() entry. Reused verbatim here
  // so the caption's own check and this one can never disagree.
  test('matches with the exact fold-and-whole-word test _community_clean_text uses, on the string leaf, never the caption', () => {
    // _community_clean_text lives in migrate_160 (never re-issued by this
    // file), so its span is read from that source, not from SQL.
    const cleanText = fnSpanPlpgsql(SRC160_RAW, 'CREATE OR REPLACE FUNCTION public._community_clean_text(_t text)');
    expect(BLOCKED_TERM_FN).toContain("v_folded := ' ' || public._community_fold(_payload #>> '{}') || ' ';");
    expect(cleanText).toContain("v_folded := ' ' || public._community_fold(_t) || ' ';");
    expect(BLOCKED_TERM_FN).toContain("FOREACH v_term IN ARRAY public._community_blocked_terms() LOOP");
    expect(cleanText).toContain('FOREACH v_term IN ARRAY public._community_blocked_terms() LOOP');
    expect(BLOCKED_TERM_FN).toContain("position(' ' || v_term || ' ' IN v_folded) > 0");
    expect(cleanText).toContain("position(' ' || v_term || ' ' IN v_folded) > 0");
  });

  test('SECURITY DEFINER, pinned search_path, and EXECUTE revoked from PUBLIC, anon and authenticated', () => {
    expect(BLOCKED_TERM_FN).toMatch(/SECURITY DEFINER/);
    expect(BLOCKED_TERM_FN).toMatch(/SET search_path = public, pg_temp/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_payload_has_blocked_term\(jsonb\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._community_payload_has_blocked_term/);
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path, every migrate_178 function', () => {
    for (const fn of [PAYLOAD_KEYS_FN, CREATE_POST_FN, BLOCKED_TERM_FN]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('EXECUTE: the RPC to authenticated only; the payload-keys and blocked-term helpers to nobody', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.community_create_post\(text, jsonb, text, uuid, text, boolean, text, uuid\[\]\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_create_post\(text, jsonb, text, uuid, text, boolean, text, uuid\[\]\) TO authenticated;/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_payload_keys\(text\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._community_payload_keys/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\._community_payload_has_blocked_term\(jsonb\) FROM PUBLIC, anon, authenticated;/);
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._community_payload_has_blocked_term/);
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status entry and names the file', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/178 WRITTEN 2026-09-22, NOT APPLIED/);
    expect(README).toContain('migrate_178_community_note_posts.sql');
  });
});
