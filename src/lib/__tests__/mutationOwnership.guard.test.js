/**
 * Ownership predicates on user-owned mutations (adversarial audit 2026-08-26).
 *
 * The audit's named finding was setActivePlan updating a programme by id with
 * no user predicate. The defect is sharper than "a missing WHERE clause": both
 * statements live in the SAME transaction, and only one of them was scoped.
 *
 *     UPDATE programmes SET is_active = 0 ... WHERE user_id = ?   <- scoped
 *     UPDATE programmes SET is_active = 1 ... WHERE id = ?        <- was not
 *
 * So activating a plan belonging to someone else would set it active and
 * unarchive it for them, while the deactivate-all only cleared is_active for
 * the caller. The result is two active programmes across two users, and the
 * active/archived partition that every list read assumes is broken.
 *
 * SCOPE, deliberately narrow. A sweep of database.js found 32 UPDATE/DELETE
 * statements on user-owned tables keyed by id alone. Exactly two of those sit
 * in functions that already hold a userId and simply did not use it. The other
 * thirty take only an id, so scoping them means changing signatures and every
 * caller, on a local SQLite database that normally holds a single user's rows.
 * The audit brief is explicit that redundant predicates must not be added
 * without understanding the schema, so this pins the one that was genuinely
 * wrong rather than manufacturing a number.
 *
 * saveCoachOutput is the second of those two and is deliberately NOT changed:
 * its id is generated inside that same call for that same user and never
 * crosses a user boundary, so a predicate there would be decoration.
 */

const fs = require('fs');
const path = require('path');

const DB = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

function fnBody(name) {
  const start = DB.indexOf(`export async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const rest = DB.slice(start + 1);
  const next = rest.indexOf('\nexport ');
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('setActivePlan cannot activate another user\'s plan', () => {
  const body = fnBody('setActivePlan');

  test('the activate is scoped by user_id, not by id alone', () => {
    expect(body).toContain(
      "'UPDATE programmes SET is_active = 1, is_archived = 0, updated_at = ? WHERE id = ? AND user_id = ?'",
    );
  });

  test('userId is actually passed, not just named in the SQL', () => {
    // A predicate with the wrong binding order is worse than none: it would
    // silently match nothing and the plan would never activate.
    expect(body).toMatch(/\[now, planId, userId\]/);
  });

  test('both statements in the transaction are user-scoped, so the asymmetry is gone', () => {
    const deactivate = body.indexOf("SET is_active = 0");
    const activate = body.indexOf("SET is_active = 1");
    expect(deactivate).toBeGreaterThan(-1);
    expect(activate).toBeGreaterThan(-1);
    // Each statement's own WHERE must mention user_id.
    const deactivateStmt = body.slice(deactivate, deactivate + 200);
    const activateStmt = body.slice(activate, activate + 200);
    expect(deactivateStmt).toMatch(/WHERE user_id = \?/);
    expect(activateStmt).toMatch(/user_id = \?/);
  });

  test('it still runs both statements in one transaction', () => {
    // Two interleaved activations previously left two active programmes; that
    // fix predates this one and must not be lost to this one.
    expect(body).toMatch(/runInTransaction\(/);
  });
});

describe('the sweep result is recorded so the next reader does not redo it', () => {
  test('functions holding a userId use it in their id-keyed mutation', () => {
    // Regression form of the sweep: if a NEW function is added that takes a
    // userId and mutates programmes by id alone, this catches it.
    const start = DB.indexOf('export async function setActivePlan(');
    const body = DB.slice(start, start + 2000);
    const idOnlyUpdates = body
      .split('\n')
      .filter((l) => /UPDATE programmes/.test(l))
      .filter((l) => /WHERE id = \?'/.test(l) && !/user_id/.test(l));
    expect(idOnlyUpdates).toEqual([]);
  });
});
