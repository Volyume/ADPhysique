/**
 * The shared auth UI extracted from LoginScreen and the Pro onboarding account
 * step (H7, shared form UI only). Presentational smoke tests: the controls fire
 * the callbacks the screens depend on. No auth logic lives in these components.
 */
import { create, act } from 'react-test-renderer';
import { TextInput, TouchableOpacity, Platform } from 'react-native';
import OAuthButtons from '../OAuthButtons';
import EmailPasswordFields from '../EmailPasswordFields';

describe('OAuthButtons', () => {
  test('Google press fires onGoogle (Android)', () => {
    const onGoogle = jest.fn();
    const tree = create(<OAuthButtons onGoogle={onGoogle} onApple={() => {}} disabled={false} />);
    const google = tree.root.findAllByProps({ accessibilityLabel: 'Continue with Google' })[0];
    act(() => google.props.onPress());
    expect(onGoogle).toHaveBeenCalledTimes(1);
  });

  test('disabled flag disables the Google button (Android)', () => {
    const tree = create(<OAuthButtons onGoogle={() => {}} onApple={() => {}} disabled />);
    const google = tree.root.findAllByProps({ accessibilityLabel: 'Continue with Google' })[0];
    expect(google.props.disabled).toBe(true);
  });

  test('iOS hides Google (no iOS client id) and keeps Apple', () => {
    const prev = Platform.OS;
    Platform.OS = 'ios';
    try {
      const tree = create(<OAuthButtons onGoogle={() => {}} onApple={() => {}} disabled={false} />);
      expect(tree.root.findAllByProps({ accessibilityLabel: 'Continue with Google' })).toHaveLength(0);
      expect(tree.root.findAllByProps({ accessibilityLabel: 'Continue with Apple' }).length).toBeGreaterThan(0);
    } finally {
      Platform.OS = prev;
    }
  });
});

describe('EmailPasswordFields', () => {
  const base = {
    mode: 'signin',
    email: '', onEmailChange: () => {},
    password: '', onPasswordChange: () => {},
    showPassword: false, onToggleShowPassword: () => {},
  };

  test('typing reports email and password up to the screen', () => {
    const onEmailChange = jest.fn();
    const onPasswordChange = jest.fn();
    const tree = create(
      <EmailPasswordFields {...base} onEmailChange={onEmailChange} onPasswordChange={onPasswordChange} />,
    );
    const inputs = tree.root.findAllByType(TextInput);
    act(() => inputs[0].props.onChangeText('a@b.com'));
    act(() => inputs[1].props.onChangeText('secret123'));
    expect(onEmailChange).toHaveBeenCalledWith('a@b.com');
    expect(onPasswordChange).toHaveBeenCalledWith('secret123');
  });

  test('password is masked until the eye toggles it', () => {
    const onToggle = jest.fn();
    const tree = create(<EmailPasswordFields {...base} showPassword={false} onToggleShowPassword={onToggle} />);
    const password = tree.root.findAllByType(TextInput)[1];
    expect(password.props.secureTextEntry).toBe(true);
    const eye = tree.root.findAllByType(TouchableOpacity).find(n => /password/i.test(n.props.accessibilityLabel || ''));
    act(() => eye.props.onPress());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('signup mode sets the new-password autofill hint', () => {
    const tree = create(<EmailPasswordFields {...base} mode="signup" />);
    const password = tree.root.findAllByType(TextInput)[1];
    expect(password.props.autoComplete).toBe('new-password');
  });
});
