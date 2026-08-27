/**
 * The Article 9 consent gate does not claim encryption the app knows it has not
 * got (adversarial audit 2026-08-26, finding 10).
 *
 * WHAT WAS WRONG. The consent screen stated, unconditionally, that health data
 * lives "on your phone, in encrypted local storage". The database does not
 * always get to be encrypted: dbCrypto opens it plaintext, deliberately, when
 * SQLCipher is unavailable, when the key cannot be read, or when the
 * plaintext-to-encrypted migration fails (F-002). That fallback is the right
 * call and is not changed here, because bricking the app or losing someone's
 * training history would be worse than the weaker protection.
 *
 * The defect was that the app already KNEW. isLocalDbEncrypted() was written
 * for exactly this, its own comment saying "a surface can read
 * isLocalDbEncrypted() to keep privacy copy honest", and it had no callers at
 * all. So the one screen where accuracy is legally load-bearing carried on
 * making a claim the code could already contradict.
 *
 * WHAT IS DELIBERATELY NOT CHANGED. The gate itself: same position in the flow,
 * same un-skippable structure, same checkbox, same withdrawal notice. Only the
 * storage sentence varies, and only when the answer is a definite false. This
 * strengthens the gate rather than weakening it, which is the direction
 * Section 2 requires.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'Article9ConsentScreen.js'), 'utf8',
);
const code = SRC.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

describe('the screen reads the real encryption state', () => {
  test('it imports isLocalDbEncrypted', () => {
    expect(code).toMatch(/import \{ isLocalDbEncrypted \} from '\.\.\/lib\/database'/);
  });

  test('it actually calls it, rather than importing and ignoring it', () => {
    // The whole defect was an unused reporter. An unused import would be the
    // same bug with extra steps.
    expect(code).toMatch(/const dbEncrypted = isLocalDbEncrypted\(\);/);
  });

  test('the storage bullet is derived, not a hard-coded string', () => {
    expect(code).toMatch(/storageLine,/);
    expect(code).not.toMatch(/'On your phone, in encrypted local storage\. Progress photo image files stay on this device unless you choose to share or export them',/);
  });
});

describe('only a definite false changes what the user is told', () => {
  test('the test is === false, not falsy', () => {
    // null means the database has not been opened yet, which is not the same
    // as "not encrypted". A falsy check would show the weaker copy to everyone
    // who reaches this screen before the database opens.
    expect(code).toMatch(/dbEncrypted === false/);
    expect(code).not.toMatch(/!dbEncrypted\s*\?/);
  });

  test('the encrypted wording is unchanged for the normal case', () => {
    expect(code).toMatch(/On your phone, in encrypted local storage\./);
  });
});

describe('the plaintext wording is accurate and calm', () => {
  const fallback = code.slice(code.indexOf('dbEncrypted === false'), code.indexOf('storageLine,'));

  test('it does not claim the encryption layer it has not got', () => {
    const firstBranch = fallback.slice(0, fallback.indexOf(': '));
    expect(firstBranch).not.toMatch(/in encrypted local storage/);
  });

  // The copy is written as a concatenation across several source lines, and
  // apostrophes inside single-quoted strings are backslash-escaped, so these
  // read the assembled sentence rather than the source text.
  const assembled = fallback
    .replace(/\\'/g, "'")
    .replace(/'\s*\+\s*'/g, '')
    .replace(/\s+/g, ' ');

  test('it says what IS protecting the data, not just what is not', () => {
    // "Not encrypted" alone would frighten someone without telling them
    // anything useful. Device-level protection is still real protection.
    expect(assembled).toMatch(/device's own security/);
  });

  test('it keeps the progress-photo sentence, which is true either way', () => {
    expect(assembled).toMatch(/Progress photo image files stay on this device/);
  });

  test('it stays in the coaching voice: no alarm, no blame, no jargon', () => {
    expect(fallback).not.toMatch(/\b(WARNING|Error|failed|insecure|unsafe|vulnerable|at risk)\b/i);
    // British English, and no em dash in user-facing copy (lint enforces the
    // second, asserted here so this file's own copy is covered too).
    expect(fallback).not.toMatch(/—/);
  });
});

describe('the gate itself is untouched', () => {
  test('consent is still an explicit checkbox', () => {
    expect(code).toMatch(/<ConsentCheckboxRow/);
    expect(code).toMatch(/checked=\{agreed\}/);
  });

  test('the Article 7(3) withdrawal notice is still shown before consent', () => {
    const checkbox = code.indexOf('<ConsentCheckboxRow');
    const withdraw = code.indexOf('withdrawNote', checkbox);
    expect(checkbox).toBeGreaterThan(-1);
    expect(withdraw).toBeGreaterThan(checkbox);
  });

  test('the EU residency and deletion bullets are unchanged', () => {
    expect(code).toMatch(/In Supabase in the EU region/);
    expect(code).toMatch(/backup copies are purged within 30 days/);
  });

  test('continuing still requires the checkbox, which is what un-skippable means', () => {
    // An earlier version of this test grepped for the word "skip" and matched
    // a comment saying the gate is un-skippable. The invariant is the gating,
    // not the vocabulary.
    expect(code).toMatch(/disabled=\{!agreed/);
  });
});
