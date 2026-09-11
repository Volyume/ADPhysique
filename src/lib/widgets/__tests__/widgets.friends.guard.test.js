/**
 * widgets.friends.guard.test.js -- CR-14 (24-PHASE4-SPEC.md section 3,
 * "Source-level privacy pin").
 *
 * What this pins, and why it is a source-level guard rather than a
 * behavioural test: the friends count is the ONLY thing this surface may
 * ever carry about another person (24-PHASE4-SPEC.md section 1 rule 1;
 * snapshot.js's own binding privacy rule). A future edit that reaches for
 * a name, handle or avatar to make the widget "nicer" would compile and
 * pass every behavioural test that only exercises today's counting path,
 * so this scans the actual source text of both the JS feeder and the iOS
 * decode struct:
 *  - `src/lib/widgets/friends.js` never imports `../database` (the local
 *    DB is out of scope for this privacy surface: only the Community
 *    board RPC, already reduced to a count, is a legitimate source here);
 *  - it never references a `handle`, `name` or `avatar` field in code;
 *  - the Swift decode struct for the friends block (`VolyumeFriendsData`)
 *    declares exactly `dayKey`, `count`, `label` and nothing else.
 *
 * Comments are stripped before the source scan (same convention as
 * `community.copy.guard.test.js`), so this file's own prose ("never a
 * name, handle or avatar") and friends.js's own explanatory comments can
 * say those words without tripping the guard on themselves; only live
 * code is checked.
 */
const fs = require('fs');
const path = require('path');

const FRIENDS_JS = path.join(__dirname, '../friends.js');
const SWIFT_FILE = path.join(__dirname, '../../../../modules/live-activity/widget/VolyumeHomeWidgets.swift');

const friendsSourceRaw = fs.readFileSync(FRIENDS_JS, 'utf8');
const swiftSourceRaw = fs.readFileSync(SWIFT_FILE, 'utf8');

/** Strip block and line comments, identical to the stripper
 * `community.copy.guard.test.js` uses, for the same reason: a rule named
 * or explained in a comment must never be mistaken for live code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const friendsCode = code(friendsSourceRaw);
const swiftCode = code(swiftSourceRaw);

describe('friends.js: never the local database, never a person', () => {
  test('never imports ../database', () => {
    expect(friendsCode).not.toMatch(/require\(\s*['"]\.\.\/database['"]\s*\)/);
    expect(friendsCode).not.toMatch(/from\s+['"]\.\.\/database['"]/);
  });

  test('never references a handle, name or avatar field in code', () => {
    expect(friendsCode).not.toMatch(/\bhandle\b/i);
    expect(friendsCode).not.toMatch(/\bavatar\w*/i);
    expect(friendsCode).not.toMatch(/\bname\b/i);
  });
});

describe('VolyumeHomeWidgets.swift: the friends decode carries only dayKey, count, label', () => {
  const structMatch = /struct\s+VolyumeFriendsData\s*:\s*Decodable\s*\{([\s\S]*?)\n\}/.exec(swiftCode);

  test('VolyumeFriendsData exists', () => {
    expect(structMatch).toBeTruthy();
  });

  test('declares exactly the three privacy-safe fields', () => {
    const body = structMatch[1];
    const fields = [...body.matchAll(/let\s+(\w+)\s*:/g)].map((m) => m[1]).sort();
    expect(fields).toEqual(['count', 'dayKey', 'label']);
  });

  test('is never given a handle, name or avatar field', () => {
    const body = structMatch[1];
    expect(body).not.toMatch(/\bhandle\b/i);
    expect(body).not.toMatch(/\bname\b/i);
    expect(body).not.toMatch(/\bavatar\w*/i);
  });
});
