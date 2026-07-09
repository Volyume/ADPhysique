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
}));

import { signInWithGoogle } from '../../lib/supabase';
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
});
