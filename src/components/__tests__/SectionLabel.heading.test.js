/**
 * AX-07 (launch accessibility audit, 2026-07-12): SectionLabel has 133 call
 * sites spanning genuine section titles and overline/metadata labels, so it
 * cannot default to accessibilityRole="header" -- that would flood the
 * VoiceOver/TalkBack rotor. This suite pins the opt-in: passing `heading`
 * applies accessibilityRole="header"; the default (no `heading` prop, or
 * `heading={false}`) stays a plain, non-heading text node so existing call
 * sites are unaffected until deliberately opted in.
 */
import { create } from 'react-test-renderer';

import SectionLabel from '../SectionLabel';

// SectionLabel wraps its children in nested composites (SectionLabel itself,
// a forwardRef, then the host Text), all of which carry the same
// `children` prop, so findAll + .some (matching AppAlert.a11y.test.js's
// pattern) is used instead of findByProps, which can resolve ambiguously
// across that stack.
function hasHeaderRole(tree, text) {
  return tree.root.findAll((n) => n.props && n.props.children === text)
    .some((n) => n.props.accessibilityRole === 'header');
}

describe('SectionLabel heading opt-in (AX-07)', () => {
  test('defaults to no accessibilityRole (not a heading)', () => {
    const tree = create(<SectionLabel>Weekly volume</SectionLabel>);
    expect(hasHeaderRole(tree, 'Weekly volume')).toBe(false);
  });

  test('heading={true} applies accessibilityRole="header"', () => {
    const tree = create(<SectionLabel heading variant="title">This week</SectionLabel>);
    expect(hasHeaderRole(tree, 'This week')).toBe(true);
  });

  test('heading={false} (explicit) still yields no accessibilityRole', () => {
    const tree = create(<SectionLabel heading={false}>Sort</SectionLabel>);
    expect(hasHeaderRole(tree, 'Sort')).toBe(false);
  });

  test('an explicitly forwarded accessibilityRole is preserved when heading is not set (unchanged behaviour)', () => {
    const tree = create(<SectionLabel accessibilityRole="header">Records</SectionLabel>);
    expect(hasHeaderRole(tree, 'Records')).toBe(true);
  });
});
