/**
 * Laterality: the write path the interface was missing (founder order
 * 2026-08-21).
 *
 * What this suite pins and why: before this change the add flow's draft
 * had no side field at all, so every rule it created stored
 * laterality null and the resolver's carve path was dead in practice.
 * A source guard alone would pass on a selector that displays a side
 * and throws it away, so these tests follow the value into SQLite and
 * back out, and separately pin the screen's wiring (draft field, the
 * model-owned condition, and the write) so a regression in either half
 * fails here.
 */
jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: () => {} }));

const fs = require('fs');
const path = require('path');
const {
  createCapabilityConstraints, getCapabilityConstraints,
} = require('../../database');
const { LATERALITY, CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_RULE_KIND } = require('../model');

const USER = 'u-side';
const NOW = 1_760_000_000_000;
const base = {
  role: CONSTRAINT_ROLE.BASELINE,
  source: CONSTRAINT_SOURCE.SELF,
  ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
  startsAt: NOW - 86_400_000,
};

describe('a chosen side survives the round trip into storage', () => {
  it('left stays left, right stays right, and both stays sideless', async () => {
    const ids = await createCapabilityConstraints(USER, [
      { ...base, ruleValue: 'grip_bar', laterality: LATERALITY.LEFT },
      { ...base, ruleValue: 'bilateral_lower', laterality: LATERALITY.RIGHT },
      { ...base, ruleValue: 'overhead_position', laterality: null },
    ], { nowMs: NOW });
    expect(ids).toHaveLength(3);

    const rows = await getCapabilityConstraints(USER);
    const byValue = Object.fromEntries(rows.map(r => [r.ruleValue, r]));
    expect(byValue.grip_bar.laterality).toBe('left');
    expect(byValue.bilateral_lower.laterality).toBe('right');
    // "Both" is stored as no side, which is exactly what a rule with no
    // side has always meant. Nothing is invented on the way in or out.
    expect(byValue.overhead_position.laterality).toBeNull();
  });

  it('a re-started rule carries its side forward unchanged', async () => {
    // The flare re-start copies the saved shape; the side is part of it.
    const rows = await getCapabilityConstraints(USER);
    const original = rows.find(r => r.ruleValue === 'grip_bar');
    const [restartedId] = await createCapabilityConstraints(USER, [{
      role: CONSTRAINT_ROLE.EPISODE,
      source: original.source,
      ruleKind: original.ruleKind,
      ruleValue: original.ruleValue,
      laterality: original.laterality ?? null,
      episodeGroupId: 'g-restart',
      startsAt: NOW,
      endsAt: null,
    }], { nowMs: NOW });
    const again = (await getCapabilityConstraints(USER)).find(r => r.id === restartedId);
    expect(again.laterality).toBe('left');
  });

  it('the database refuses a side that is not left or right', async () => {
    await expect(createCapabilityConstraints(USER, [
      { ...base, ruleValue: 'grip_bar', laterality: 'both' },
    ], { nowMs: NOW })).rejects.toThrow(/laterality/);
  });
});

describe('the interface actually writes the side it collects', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../screens/HowYouTrainScreen.js'), 'utf8',
  );

  it('the draft carries a side and the write puts it on the row', () => {
    expect(src).toMatch(/side: null/);
    // The value reaches the row, gated by the model's own predicate -
    // this is the half that was missing entirely.
    expect(src).toMatch(/laterality: isSideCarveable\(CONSTRAINT_RULE_KIND\.DEMAND, axis\)\s*\?\s*\(draft\.side \?\? null\)\s*:\s*null/);
  });

  it('the question is asked from the model, never from a list kept here', () => {
    expect(src).toMatch(/import \{ isSideCarveable \}/);
    expect(src).toMatch(/adding === 'side'/);
    // No hand-maintained copy of which axes are sided.
    expect(src).not.toMatch(/SIDE_CARVEABLE\s*=/);
  });

  it('the side stage is reachable and leads onward', () => {
    expect(src).toMatch(/if \(sidedAxes\(d\)\.length\) return 'side';/);
    expect(src).toMatch(/setAdding\(afterRuleStage\(draft\)\)/);
    expect(src).toMatch(/const afterSideStage = /);
  });

  it('the words the user reads name a body part, never "laterality"', () => {
    const stage = src.slice(src.indexOf("adding === 'side'"), src.indexOf("adding === 'dates'"));
    expect(stage.length).toBeGreaterThan(200);
    expect(stage).toMatch(/Which \$\{part\}\?|ask\.question/);
    // Scoped to what a user can actually read: the LATERALITY enum is
    // code and legitimately appears here, the words it renders may not.
    const stageText = (stage.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? []).join(' ');
    expect(stageText).not.toMatch(/laterality|bilateral|unilateral/i);
    // Options are real labels ("Left hand"), not "option one".
    expect(src).toMatch(/left: part \? `Left \$\{part\}`/);
    expect(src).toMatch(/both: part \? `Both \$\{part\}s`/);
  });

  it('no user-facing string on the screen says laterality', () => {
    const literals = src
      .replace(/\/\*[^]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
      .match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
    for (const lit of literals) expect(lit).not.toMatch(/laterality/i);
  });
});
