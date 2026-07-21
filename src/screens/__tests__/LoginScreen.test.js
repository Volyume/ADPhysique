/**
 * A7 (Wave A first-week trust): a cancelled OAuth dialog (the user backed out
 * of the Google/Apple sheet) used to fall into the same silent branch as a
 * genuine success, with zero feedback. This pins the new cancelled-path toast
 * and the "waiting" caption shown while the dialog is up.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.mock('../../lib/supabase', () => ({
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
}));
// TextField/Button pull in @gorhom/bottom-sheet and expo-haptics (native
// Expo modules) at import; this suite tests LoginScreen's handler behaviour,
// not those components' internals, so stub them to plain host elements whose
// props (value/onChangeText/onPress) stay inspectable.
jest.mock('../../components/TextField', () => (props) => {
  const React = require('react');
  return React.createElement('TextField', props);
});
jest.mock('../../components/Button', () => (props) => {
  const React = require('react');
  return React.createElement('Button', props);
});

import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../lib/supabase';
import LoginScreen from '../LoginScreen';

function findGoogleButton(tree) {
  return tree.root.findByProps({ accessibilityLabel: 'Continue with Google' });
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen OAuth feedback (A7)', () => {
  test('a cancelled sign-in shows a calm info toast (previously silent)', async () => {
    signInWithGoogle.mockResolvedValue({ cancelled: true });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);
    await act(async () => { await google.props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith('Sign-in was cancelled.', expect.objectContaining({ variant: 'info' }));
  });

  test('a provider error shows a calm fallback toast, never the raw SDK message (FR-2)', async () => {
    signInWithGoogle.mockResolvedValue({ error: { message: 'Network down' } });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);
    await act(async () => { await google.props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith("That didn't go through. Try again.", expect.objectContaining({ variant: 'error' }));
  });

  test('a genuine success shows neither toast (still driven by onAuthStateChange)', async () => {
    signInWithGoogle.mockResolvedValue({});
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);
    await act(async () => { await google.props.onPress(); });
    await flush();

    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a thrown OAuth exception shows the same calm fallback toast, not just a log (EP-18/UI-07)', async () => {
    signInWithGoogle.mockRejectedValue(new Error('native bridge exception'));
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);
    await act(async () => { await google.props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith("That didn't go through. Try again.", expect.objectContaining({ variant: 'error' }));
    // The button returns to idle rather than being left dimmed with no
    // explanation (the waiting caption, gated on the same loading state,
    // is gone once the catch's finally re-enables the buttons).
    expect(JSON.stringify(tree.toJSON())).not.toContain('Waiting for Google or Apple');
  });

  test('shows a "waiting" caption while the OAuth dialog is up, gone once it resolves', async () => {
    let resolveFn;
    signInWithGoogle.mockReturnValue(new Promise((resolve) => { resolveFn = resolve; }));
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);

    act(() => { google.props.onPress(); });
    await flush();
    expect(JSON.stringify(tree.toJSON())).toContain('Waiting for Google or Apple');

    await act(async () => { resolveFn({}); await Promise.resolve(); });
    await flush();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Waiting for Google or Apple');
  });

  // AX-08 (launch accessibility audit): the "Waiting..." busy copy was not
  // marked busy/live, so a screen reader never heard that sign-in was in
  // progress. The caption now carries a polite live region (mirroring
  // src/components/Toast.js's non-error announcement) plus
  // accessibilityState.busy for the duration.
  test('the waiting caption is announced: polite live region + accessibilityState.busy (AX-08)', async () => {
    let resolveFn;
    signInWithGoogle.mockReturnValue(new Promise((resolve) => { resolveFn = resolve; }));
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);

    act(() => { google.props.onPress(); });
    await flush();

    const waiting = tree.root.findAll(
      (n) => Array.isArray(n.props.children)
        ? n.props.children.join('') === 'Waiting for Google or Apple…'
        : n.props.children === 'Waiting for Google or Apple…',
    )[0];
    expect(waiting).toBeTruthy();
    expect(waiting.props.accessibilityLiveRegion).toBe('polite');
    expect(waiting.props.accessibilityState).toEqual({ busy: true });

    await act(async () => { resolveFn({}); await Promise.resolve(); });
    await flush();
  });
});

describe('LoginScreen email + password (founder 2026-07-21)', () => {
  function typeCreds(tree, e, p) {
    const emailField = tree.root.findByProps({ accessibilityLabel: 'Email address' });
    const pwField = tree.root.findByProps({ accessibilityLabel: 'Password' });
    act(() => { emailField.props.onChangeText(e); });
    act(() => { pwField.props.onChangeText(p); });
  }

  test('sign in calls signInWithEmail and shows no toast on a returned session (onAuthStateChange drives)', async () => {
    signInWithEmail.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    typeCreds(tree, 'test@volyume.app', 'hunter2pw');
    const submit = tree.root.findByProps({ accessibilityLabel: 'Sign in with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();
    expect(signInWithEmail).toHaveBeenCalledWith('test@volyume.app', 'hunter2pw');
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a wrong password maps to a calm message, never the raw SDK string', async () => {
    signInWithEmail.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    typeCreds(tree, 'test@volyume.app', 'wrongpw');
    const submit = tree.root.findByProps({ accessibilityLabel: 'Sign in with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();
    expect(mockToastShow).toHaveBeenCalledWith('That email or password is not right.', expect.objectContaining({ variant: 'error' }));
  });

  test('empty fields are blocked before any network call', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const submit = tree.root.findByProps({ accessibilityLabel: 'Sign in with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();
    expect(signInWithEmail).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith('Enter your email and password.', expect.objectContaining({ variant: 'info' }));
  });

  test('toggling to sign-up routes the submit to signUpWithEmail', async () => {
    signUpWithEmail.mockResolvedValue({ data: { session: { user: { id: 'u2' } } }, error: null });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const toggle = tree.root.findByProps({ accessibilityLabel: 'Switch to creating an account' });
    act(() => { toggle.props.onPress(); });
    typeCreds(tree, 'new@volyume.app', 'freshpw12');
    const submit = tree.root.findByProps({ accessibilityLabel: 'Create account with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();
    expect(signUpWithEmail).toHaveBeenCalledWith('new@volyume.app', 'freshpw12');
  });
});
