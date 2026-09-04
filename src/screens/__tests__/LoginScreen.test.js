/**
 * A7 (Wave A first-week trust): a cancelled OAuth dialog (the user backed out
 * of the Google/Apple sheet) used to fall into the same silent branch as a
 * genuine success, with zero feedback. This pins the new cancelled-path toast
 * and the "waiting" caption shown while the dialog is up.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

const mockToastShow = jest.fn();
// A5: shared fake `.focus()` the password field's forwarded ref exposes, so
// the email field's onSubmitEditing hop can be asserted end to end (jest
// hoists jest.mock() above this file's imports/consts, but a `mock`-prefixed
// binding is specially hoisted alongside it -- standard jest convention).
const mockPasswordFocus = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.mock('../../lib/supabase', () => ({
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  // E-3 (D96): the reset helper the app never called until Wave B.
  resetPassword: jest.fn(),
}));
// TextField/Button pull in @gorhom/bottom-sheet and expo-haptics (native
// Expo modules) at import; this suite tests LoginScreen's handler behaviour,
// not those components' internals, so stub them to plain host elements whose
// props (value/onChangeText/onPress) stay inspectable.
//
// A5 (pre-release sweep 2026-07-27): the password field's show/hide toggle
// is passed as a `trailing` element (real TouchableOpacity/Ionicons, same as
// EmailPasswordFields.js). Left as a raw, unconsumed prop on this host-tag
// stub, react-test-renderer's toJSON() serialises it verbatim, including the
// element's dev-mode `_owner` fiber pointer -- a circular structure that
// blows up the OAuth tests' `JSON.stringify(tree.toJSON())` assertions
// below, which have nothing to do with the password field. Rendering
// trailing/leading as real children (as the real TextField does) reconciles
// them into ordinary serialisable host nodes instead.
jest.mock('../../components/TextField', () => {
  const React = require('react');
  // forwardRef so LoginScreen's passwordRef (A5's email->password focus hop)
  // resolves to a real object with a `.focus()` the test can assert against,
  // exactly like the real TextField forwards its ref to the underlying input.
  const Comp = React.forwardRef((props, ref) => {
    const { trailing, leading, ...rest } = props;
    React.useImperativeHandle(ref, () => ({ focus: mockPasswordFocus }));
    return React.createElement('TextField', rest, leading, trailing);
  });
  return { __esModule: true, default: Comp };
});
jest.mock('../../components/Button', () => (props) => {
  const React = require('react');
  return React.createElement('Button', props);
});

import {
  signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword,
} from '../../lib/supabase';
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

  // Create-account mode starts with the fields collapsed behind a
  // "Continue with email" tertiary button; expand before typing into them.
  function openEmailForm(tree) {
    const openBtn = tree.root.findByProps({ accessibilityLabel: 'Continue with email' });
    act(() => { openBtn.props.onPress(); });
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
    openEmailForm(tree);
    typeCreds(tree, 'new@volyume.app', 'freshpw12');
    const submit = tree.root.findByProps({ accessibilityLabel: 'Create account with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();
    expect(signUpWithEmail).toHaveBeenCalledWith('new@volyume.app', 'freshpw12');
  });
});

/**
 * Campaign 5, Wave B (D96). The entry surface's honesty and recoverability:
 * the sign-up CTA opens a sign-up form (E-1), a duplicate address is told to
 * sign in instead of waiting for mail Supabase never sends (E-2), a forgotten
 * password has a route back (E-3), a dead connection is named as one (E-5),
 * the states the user must leave the app to act on stay on screen (E-8), and
 * the screen carries a visible back control (E-9).
 */
describe('LoginScreen entry honesty and recovery (Wave B, D96)', () => {
  function typeEmail(tree, e) {
    const emailField = tree.root.findByProps({ accessibilityLabel: 'Email address' });
    act(() => { emailField.props.onChangeText(e); });
  }
  function openEmailForm(tree) {
    const openBtn = tree.root.findByProps({ accessibilityLabel: 'Continue with email' });
    act(() => { openBtn.props.onPress(); });
  }
  const html = (tree) => JSON.stringify(tree.toJSON());

  test('E-1: the sign-up intent opens the form in create-account mode, fields collapsed behind "Continue with email"', async () => {
    let tree;
    await act(async () => {
      tree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Continue with email' })).not.toThrow();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Create account with email' })).toThrow();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Sign in with email' })).toThrow();

    openEmailForm(tree);
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Create account with email' })).not.toThrow();
  });

  test('E-1: arriving without the intent still opens sign-in ("Already have an account?"), fields visible immediately', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen route={{ params: {} }} />); });
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Sign in with email' })).not.toThrow();
  });

  test('E-2: an existing address is told to sign in, never promised a confirmation email', async () => {
    // Supabase's enumeration protection: a user object, no session, and an
    // EMPTY identities array. No email is sent for this response.
    signUpWithEmail.mockResolvedValue({
      data: { user: { id: 'u1', identities: [] }, session: null },
      error: null,
    });
    let tree;
    await act(async () => {
      tree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    openEmailForm(tree);
    typeEmail(tree, 'already@volyume.app');
    const pw = tree.root.findByProps({ accessibilityLabel: 'Password' });
    act(() => { pw.props.onChangeText('freshpw12'); });
    const submit = tree.root.findByProps({ accessibilityLabel: 'Create account with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();

    expect(html(tree)).toContain('That email already has an account. Try signing in instead.');
    expect(html(tree)).not.toContain('Check your email to confirm');
    // And the form is now the one they need.
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Sign in with email' })).not.toThrow();
  });

  test('E-8: a genuine new signup keeps the confirm instruction ON SCREEN, not in a toast', async () => {
    signUpWithEmail.mockResolvedValue({
      data: { user: { id: 'u2', identities: [{ provider: 'email' }] }, session: null },
      error: null,
    });
    let tree;
    await act(async () => {
      tree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    openEmailForm(tree);
    typeEmail(tree, 'new@volyume.app');
    const pw = tree.root.findByProps({ accessibilityLabel: 'Password' });
    act(() => { pw.props.onChangeText('freshpw12'); });
    const submit = tree.root.findByProps({ accessibilityLabel: 'Create account with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();

    expect(html(tree)).toContain('Check your email to confirm your account, then sign in.');
    expect(mockToastShow).not.toHaveBeenCalledWith(
      expect.stringContaining('Check your email'), expect.anything(),
    );
    // Dismissible, and it survives until the user dismisses it.
    const dismiss = tree.root.findByProps({ accessibilityLabel: 'Dismiss this message' });
    await act(async () => { dismiss.props.onPress(); });
    expect(html(tree)).not.toContain('Check your email to confirm your account');
  });

  test('E-3: forgot password calls the reset helper and states the outcome conditionally', async () => {
    resetPassword.mockResolvedValue({ data: {}, error: null });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    typeEmail(tree, 'forgot@volyume.app');
    const link = tree.root.findByProps({ accessibilityLabel: 'Send a link to get back into your account' });
    await act(async () => { await link.props.onPress(); });
    await flush();

    expect(resetPassword).toHaveBeenCalledWith('forgot@volyume.app');
    // Never "we have emailed you": Supabase answers unknown addresses the same.
    expect(html(tree)).toContain('If that email has an account');
  });

  test('E-3: with no email typed, nothing is requested and the user is told what to do', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const link = tree.root.findByProps({ accessibilityLabel: 'Send a link to get back into your account' });
    await act(async () => { await link.props.onPress(); });
    await flush();

    expect(resetPassword).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Enter your email above first, then tap Forgot password.',
      expect.objectContaining({ variant: 'info' }),
    );
  });

  test('E-5: a dead connection names connectivity instead of blaming the credentials', async () => {
    signInWithEmail.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    typeEmail(tree, 'test@volyume.app');
    const pw = tree.root.findByProps({ accessibilityLabel: 'Password' });
    act(() => { pw.props.onChangeText('hunter2pw'); });
    const submit = tree.root.findByProps({ accessibilityLabel: 'Sign in with email' });
    await act(async () => { await submit.props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'You need an internet connection to create an account or sign in. Everything else works offline.',
      expect.objectContaining({ variant: 'error' }),
    );
    expect(mockToastShow).not.toHaveBeenCalledWith(
      'That email or password is not right.', expect.anything(),
    );
  });

  test('E-5: an OAuth network failure names connectivity too', async () => {
    signInWithGoogle.mockResolvedValue({ error: { message: 'Network request failed' } });
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const google = findGoogleButton(tree);
    await act(async () => { await google.props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'You need an internet connection to create an account or sign in. Everything else works offline.',
      expect.objectContaining({ variant: 'error' }),
    );
  });

  // D145 (third pass): the account step is a sheet over Welcome. Closing
  // it (backdrop, handle, hardware back) is the way back; when the Login
  // route was pushed from elsewhere, closing also pops back there.
  test('E-9: closing the sheet goes back when there is somewhere to go back to', async () => {
    const navigation = { canGoBack: () => true, goBack: jest.fn() };
    let tree;
    await act(async () => { tree = create(<LoginScreen navigation={navigation} />); });
    const close = tree.root.findByProps({ accessibilityLabel: 'Close' });
    await act(async () => { close.props.onPress(); });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('E-9: and never pops when the screen is the stack root', async () => {
    const navigation = { canGoBack: () => false, goBack: jest.fn() };
    let tree;
    await act(async () => { tree = create(<LoginScreen navigation={navigation} />); });
    const close = tree.root.findByProps({ accessibilityLabel: 'Close' });
    await act(async () => { close.props.onPress(); });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('E-9: inside the email form a visible control returns to the sign-up options', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />); });
    const open = tree.root.findByProps({ accessibilityLabel: 'Continue with email' });
    await act(async () => { open.props.onPress(); });
    const back = tree.root.findByProps({ accessibilityLabel: 'Back to sign-up options' });
    await act(async () => { back.props.onPress(); });
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Continue with email' })).not.toThrow();
  });

  test('no anonymous escape hatch survives anywhere on this screen', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    expect(html(tree)).not.toMatch(/without an account|continue as guest|skip for now/i);
  });
});

// Volyume is fully free (founder ruling): no trial, no Pro, no pricing, no
// upgrade. This pins the account step's tier-free framing: the mode heading,
// the single why-account line, and the trust line in both modes, plus the
// absence of any trial/Pro/payment-card copy.
describe('LoginScreen fully-free account step framing', () => {
  // The sheet's own subtree: Welcome renders behind it and carries its own
  // copy ("Completely free · No ads"), which is not the account step's.
  const html = (tree) => {
    const texts = [];
    tree.root.findAll((n) => n.type === 'BottomSheetModal').forEach((modal) => {
      modal.findAllByType(Text).forEach((n) => texts.push([].concat(n.props.children).join('')));
    });
    return texts.join(' | ');
  };

  test('heading reads "Create your account" in create-account mode, "Welcome back" in sign-in mode', async () => {
    let signupTree;
    await act(async () => {
      signupTree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    expect(html(signupTree)).toContain('Create your account');
    expect(html(signupTree)).not.toContain('Welcome back');

    let signinTree;
    await act(async () => { signinTree = create(<LoginScreen route={{ params: {} }} />); });
    expect(html(signinTree)).toContain('Welcome back');
    expect(html(signinTree)).not.toContain('Create your account');
  });

  test('the one why-account line names the account benefit, with no trial mention', async () => {
    // D145 (2026-09-04): one short line per mode on what the account is for.
    let signupTree;
    await act(async () => {
      signupTree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    expect(html(signupTree)).toContain('Keep your training, nutrition and progress synced across devices.');
    let signinTree;
    await act(async () => { signinTree = create(<LoginScreen />); });
    expect(html(signinTree)).toContain('Sign in to pick up where you left off.');
  });

  test('the trust line shows in both modes and names no payment card, no trial, no Pro', async () => {
    let signupTree;
    await act(async () => {
      signupTree = create(<LoginScreen route={{ params: { intent: 'pro_signup' } }} />);
    });
    // D145 (second pass): no marketing line on the account step at all;
    // the only foot text is the in-app privacy policy link.
    expect(html(signupTree)).not.toMatch(/No ads|Works fully offline|Export your data/);
    expect(html(signupTree)).toContain('Privacy policy');

    let signinTree;
    await act(async () => { signinTree = create(<LoginScreen route={{ params: {} }} />); });
    expect(html(signinTree)).not.toMatch(/No ads|Works fully offline|Export your data/);

    expect(html(signupTree)).not.toMatch(/trial|\bPro\b|payment card|14 day/i);
    expect(html(signinTree)).not.toMatch(/trial|\bPro\b|payment card|14 day/i);
  });
});

// A5 (pre-release sweep 2026-07-27): the email field did not advance to
// password on Return, and the password field had no show/hide toggle, even
// though EmailPasswordFields.js already implements one (unused here per the
// fix-in-place ruling -- smaller blast radius on the primary sign-in funnel
// than swapping the whole form component).
describe('LoginScreen focus hop + password visibility (A5)', () => {
  test('email is a genuine text keyboard: returnKeyType="next" advances focus to password on submit', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const emailField = tree.root.findByProps({ accessibilityLabel: 'Email address' });
    expect(emailField.props.returnKeyType).toBe('next');
    expect(typeof emailField.props.onSubmitEditing).toBe('function');

    mockPasswordFocus.mockClear();
    await act(async () => { emailField.props.onSubmitEditing(); });
    expect(mockPasswordFocus).toHaveBeenCalledTimes(1);
  });

  test('password starts hidden, and the toggle reveals it and flips its own label', async () => {
    let tree;
    await act(async () => { tree = create(<LoginScreen />); });
    const passwordField = () => tree.root.findByProps({ accessibilityLabel: 'Password' });
    expect(passwordField().props.secureTextEntry).toBe(true);

    const showToggle = tree.root.findByProps({ accessibilityLabel: 'Show password' });
    await act(async () => { showToggle.props.onPress(); });

    expect(passwordField().props.secureTextEntry).toBe(false);
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Hide password' })).not.toThrow();

    // Toggling back re-hides it (round trip, not a one-way reveal).
    const hideToggle = tree.root.findByProps({ accessibilityLabel: 'Hide password' });
    await act(async () => { hideToggle.props.onPress(); });
    expect(passwordField().props.secureTextEntry).toBe(true);
  });
});
