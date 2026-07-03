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
    const site = HOME.indexOf("Don't ask before each session");
    expect(site).toBeGreaterThan(-1);
    const window = HOME.slice(Math.max(0, site - 800), site + 400);
    expect(window).toMatch(/setItem\('@volyume_intent_prompt_off',\s*'true'\)/);
    expect(window).toMatch(/confirmStart\(null,/);
  });

  test('Settings, Coaching drives the same key both ways and is reversible', () => {
    expect(SETTINGS).toMatch(/setItem\('@volyume_intent_prompt_off',\s*'true'\)/);
    expect(SETTINGS).toMatch(/removeItem\('@volyume_intent_prompt_off'\)/);
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
