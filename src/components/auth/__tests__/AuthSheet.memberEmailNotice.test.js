/**
 * The member email notice on the create-account sheet (founder decision
 * 2026-10-17): one plain informational line, shown when creating an account
 * (Apple, Google and email sign-up all sit in this mode), not shown when
 * signing in. It is text, not a control.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../BottomSheet', () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock('../../Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../TextField', () => { const React = require('react'); return { __esModule: true, default: React.forwardRef(() => null) }; });
jest.mock('../../../lib/supabase', () => ({
  signInWithGoogle: jest.fn(), signInWithApple: jest.fn(), signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(), resetPassword: jest.fn(),
}));
jest.mock('../../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), impact: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn() }));

import AuthSheet from '../AuthSheet';
import { MEMBER_EMAIL_SIGNUP_NOTICE } from '../../../lib/memberEmail/copy';

function notices(tree) {
  return tree.root.findAll((n) => n.props?.testID === 'member-email-signup-notice' && typeof n.type !== 'string');
}

test('create-account mode shows the notice as plain text', () => {
  let tree;
  act(() => { tree = create(<AuthSheet visible initialMode="signup" onClose={() => {}} navigation={{}} />); });
  const found = notices(tree);
  expect(found.length).toBeGreaterThan(0);
  expect(found[0].props.children).toBe(MEMBER_EMAIL_SIGNUP_NOTICE);
  // information, not a control
  expect(found[0].props.onPress).toBeUndefined();
  expect(found[0].props.onValueChange).toBeUndefined();
});

test('sign-in mode does not show it', () => {
  let tree;
  act(() => { tree = create(<AuthSheet visible initialMode="signin" onClose={() => {}} navigation={{}} />); });
  expect(notices(tree)).toHaveLength(0);
});
