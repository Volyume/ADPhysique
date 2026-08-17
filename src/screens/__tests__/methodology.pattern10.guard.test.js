/**
 * Source guard for MethodologyScreen against the locked voice rules
 * (COACHING_VOICE_SYNTHESIS_LOCKED.md Pattern 10: plain-mechanism language —
 * substitute "FFM"/"fat-free mass" with "lean mass" or "muscle" in anything
 * a user reads). Wave A B2 fixed three violations; this pins the rule.
 */
import fs from 'fs';
import path from 'path';

const RAW = fs.readFileSync(
  path.join(__dirname, '..', 'MethodologyScreen.js'),
  'utf8',
);
// Strip line + block comments so code commentary (which may name the old
// term when citing the locked doc) never trips the user-facing check.
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('MethodologyScreen honours locked Pattern 10', () => {
  test('no user-facing "fat-free mass" or bare FFM', () => {
    expect(CODE).not.toMatch(/fat-free/i);
    expect(CODE).not.toMatch(/\bFFM\b/);
  });

  test('the lean-mass energy floor keeps its published number', () => {
    expect(CODE).toMatch(/30 calories per kilogram of lean\s*'?\s*\+?\s*'?\s*mass/);
  });

  test('user-facing hold explanation does not use UI-card jargon', () => {
    expect(CODE).toContain('held-decision section in your coaching decision');
    expect(CODE).not.toContain('held-decision card in your coaching decision');
  });

  test('entry-point deep-linking maps sources onto sections', () => {
    expect(RAW).toMatch(/SOURCE_SECTION/);
    expect(RAW).toMatch(/held_decisions:\s*'holds'/);
    expect(RAW).toMatch(/route\?\.params\?\.source/);
  });

  // Wave C item 4 (whole-app coherence campaign 24, 2026-08-17,
  // WAVE-C-FINDINGS.md DEAD-STALE_SURFACE): SOURCE_SECTION only documents
  // routes a real navigate('Methodology', { source: ... }) call site
  // actually passes. paywall/goal_lock/plan_reveal were dead (no call site
  // anywhere in the app used them); deleted rather than wired, since wiring
  // would mean inventing a new "Learn more" link on screens outside this
  // wave's scope. trial_banner is now live (Wave C item 3).
  test('the three unreachable SOURCE_SECTION keys are removed, not left dead', () => {
    expect(RAW).not.toMatch(/paywall:\s*'safety'/);
    expect(RAW).not.toMatch(/goal_lock:\s*'safety'/);
    expect(RAW).not.toMatch(/plan_reveal:\s*'training'/);
  });

  test('every remaining SOURCE_SECTION key matches a real call site', () => {
    const mapBody = RAW.match(/const SOURCE_SECTION = \{([\s\S]*?)\};/)[1];
    expect(mapBody).toMatch(/held_decisions:/);
    expect(mapBody).toMatch(/why_block:/);
    expect(mapBody).toMatch(/trial_banner:/);
    expect(mapBody).toMatch(/setup_complete:/);
    // Exactly 4 keys left -- if this count moves, a corresponding real
    // call site must exist (or this test, and the comment above the map,
    // need updating alongside it).
    const keyCount = (mapBody.match(/^\s*\w+:/gm) || []).length;
    expect(keyCount).toBe(4);
  });
});
