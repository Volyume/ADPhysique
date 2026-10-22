/**
 * D2 (founder decision 2026-07-03, Option A): the session-start readiness ask
 * gains a standing opt-out. The rule of record: coaching input is NEVER
 * fabricated. An opted-out start is byte-identical to Skip — null intent,
 * all-null readiness — and with nothing stated the adjustment layer does
 * nothing (getReadinessTweak(null) === null is pinned in
 * sessionAdjustments.test.js:511; READINESS_RULES has no null key). These
 * source guards pin the two surfaces to that contract.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const HOME = read('screens/HomeScreen.js');
// RE-POINTED (D231, app layout rework batch 2): the sheet (readiness rows, the
// three answers, Skip, the standing opt-out) moved verbatim from HomeScreen to
// components/SessionIntentSheet.js so Train's Repeat asks the same question the
// same way. What it pins is unchanged: the opt-out persists the flag and then
// starts exactly as Skip (null intent, all-null readiness).
const SHEET = read('components/SessionIntentSheet.js');
const SETTINGS = read('screens/SettingsCoachingScreen.js');

describe('D2: readiness ask opt-out never fabricates coaching input', () => {
  test('the opted-out start path is the Skip path: null intent, all-null readiness', () => {
    const gate = HOME.indexOf("'@volyume_intent_prompt_off'");
    expect(gate).toBeGreaterThan(-1);
    const window = HOME.slice(gate, gate + 400);
    expect(window).toMatch(
      /confirmStart\(null,\s*\{\s*soreness24hBefore:\s*null,\s*sleepQuality:\s*null,\s*energyScore:\s*null\s*\}\)/,
    );
    // No default readiness is ever assumed on this path.
    expect(window).not.toMatch(/'average'|'sharp'|'below_par'/);
  });

  test('the modal opt-out persists the flag and starts as Skip in the same handler', () => {
    const site = SHEET.indexOf('Do not ask before each session');
    expect(site).toBeGreaterThan(-1);
    const window = SHEET.slice(Math.max(0, site - 1300), site + 400);
    // C14 job 2 re-anchor: the same write, through the one path that also
    // stamps the edit and pushes it. What this pins is unchanged - the
    // modal opt-out persists the flag before starting as Skip.
    expect(window).toMatch(/setUserPref\(userId, '@volyume_intent_prompt_off', 'true'\)/);
    expect(window).toMatch(/onConfirm\(null, NO_READINESS\)/);
    // The Skip path the opt-out mirrors passes the same all-null answers, and
    // that constant is all null.
    expect(SHEET).toMatch(/const NO_READINESS = \{ soreness24hBefore: null, sleepQuality: null, energyScore: null \};/);
    // Home hands the sheet its own start handler.
    expect(HOME).toMatch(/<SessionIntentSheet[\s\S]*onConfirm=\{confirmStart\}/);
  });

  // C14 job 2 re-anchor. The toggle still drives the same one key both
  // ways and is still reversible - that is what this pins and it has not
  // changed. What changed is that it no longer reaches AsyncStorage
  // directly: turning the ask back ON deletes the key, and a delete that
  // happened only locally was undone by the next pull, because the cloud
  // still held 'true'. Both branches now go through the delete/set pair,
  // which writes or removes locally AND tombstones or pushes the cloud
  // copy, so the prompt can no longer switch itself back off.
  test('Settings, Coaching drives the same key both ways and is reversible', () => {
    expect(SETTINGS).toMatch(/setUserPref\(user\?\.id, '@volyume_intent_prompt_off', 'true'\)/);
    expect(SETTINGS).toMatch(/deleteUserPref\(user\?\.id, '@volyume_intent_prompt_off'\)/);
    expect(SETTINGS).toContain('Session readiness check');
  });

  test('the readiness rule table still has no entry for an absent answer', () => {
    const rules = read('lib/sessionAdjustments.js');
    const start = rules.indexOf('READINESS_RULES');
    const block = rules.slice(start, rules.indexOf('});', start));
    // Only the three stated answers carry rules; an absent answer looks up
    // nothing and the tweak function bails.
    expect(block).not.toMatch(/\bnull\s*:/);
    expect(rules).toMatch(/const rule = READINESS_RULES\[intent\];\s*\n\s*if \(!rule\) return null;/);
  });
});
