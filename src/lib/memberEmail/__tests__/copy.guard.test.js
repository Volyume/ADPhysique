/**
 * Member email copy guards (founder decision 2026-10-17). Pins the exact
 * words, that none contains a contraction or an em dash (lint enforces the
 * dash in user-facing copy; the contraction rule is the voice law), that the
 * sign-up notice is information and not a checkbox, and that it never sits on
 * the Article 9 health consent screen.
 */
const fs = require('fs');
const path = require('path');
const copy = require('../copy');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const CONTRACTION = /\b\w+(n't|'re|'ve|'ll|'d|'m)\b/i;

test('the agreed words, exactly', () => {
  expect(copy.MEMBER_EMAIL_SWITCH_LABEL).toBe('News by email');
  expect(copy.MEMBER_EMAIL_SWITCH_LINE).toBe('New features, short surveys and your weekly summary. You can turn this off at any time, here or from any email.');
  expect(copy.MEMBER_EMAIL_SIGNUP_NOTICE).toBe('Volyume will email you about new features, short surveys and a weekly summary. You can turn these off at any time in Settings or from any email.');
});

test('the weekly summary words, exactly', () => {
  expect(copy.WEEKLY_SUMMARY_SWITCH_LABEL).toBe('Weekly summary email');
  expect(copy.WEEKLY_SUMMARY_SWITCH_LINE).toBe('A short Monday email with how many sessions you trained last week. Never weights, food or body details.');
});

test.each(Object.entries(copy))('%s never says "offers"', (_name, text) => {
  expect(text).not.toMatch(/\boffers?\b/i);
});

test.each(Object.entries(copy))('%s has no contraction and no em dash', (_name, text) => {
  expect(text).not.toMatch(CONTRACTION);
  expect(text).not.toContain('—');
  expect(text).not.toContain('–');
});

test('the in-app privacy paragraph has no contraction or em dash and says members can turn it off', () => {
  const src = read('src', 'screens', 'PrivacyPolicyScreen.js').replace(/\s+/g, ' ');
  const start = src.indexOf('<Section title="News emails">');
  expect(start).toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf('</Section>', start))
    .replace(/<\/?Body>/g, ' ').replace(/<Section title="News emails">/, '');
  expect(block).toContain('You get these emails unless you turn them off');
  expect(block).toContain('in Settings, under Privacy and legal, or with the unsubscribe link in any email');
  // "Volyume's" is a possessive, not a contraction; strip it before the check.
  expect(block.replace(/Volyume's/g, 'Volyume')).not.toMatch(CONTRACTION);
  expect(block).not.toContain('—');
});

test('the privacy policy date moved with the new section', () => {
  expect(read('src', 'screens', 'PrivacyPolicyScreen.js')).toContain("LAST_UPDATED = '17 October 2026'");
});

test('the sign-up notice is shown in create-account mode only and is not a checkbox', () => {
  const src = read('src', 'components', 'auth', 'AuthSheet.js');
  expect(src).toContain("emailMode === 'signup' ? (\n          <Text style={[styles.emailNotice");
  expect(src).toContain('MEMBER_EMAIL_SIGNUP_NOTICE');
  expect(src).not.toMatch(/<Switch|Checkbox|CheckBox/);
});

test('the Article 9 consent screen and its action carry no member email wording or import', () => {
  const src = read('src', 'screens', 'Article9ConsentScreen.js');
  expect(src).not.toMatch(/memberEmail|member_email|MEMBER_EMAIL|news by email|email you about/i);
});

test('only the Settings switch and the sign-up notice use the copy; no consent prompt exists', () => {
  expect(fs.existsSync(path.join(root, 'src', 'lib', 'memberEmail', 'consent.js'))).toBe(false);
  const home = read('src', 'screens', 'HomeScreen.js');
  expect(home).not.toMatch(/memberEmail|member_email/);
});
