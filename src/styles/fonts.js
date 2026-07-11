import { fontFamily } from './fontFamily';
import { Text, TextInput } from 'react-native';

// displayBold/displayHeavy resolve to the same alias as bold/heavy (see
// fontFamily.js) — Manrope has no separate display optical cut, so those
// two computed keys below collapse onto the bold/heavy entries (harmless;
// same file, loaded once).
export const appFonts = {
  [fontFamily.regular]: require('../../assets/fonts/Manrope-Regular.ttf'),
  [fontFamily.medium]: require('../../assets/fonts/Manrope-Medium.ttf'),
  [fontFamily.semibold]: require('../../assets/fonts/Manrope-SemiBold.ttf'),
  [fontFamily.bold]: require('../../assets/fonts/Manrope-Bold.ttf'),
  [fontFamily.heavy]: require('../../assets/fonts/Manrope-ExtraBold.ttf'),
  [fontFamily.displayBold]: require('../../assets/fonts/Manrope-Bold.ttf'),
  [fontFamily.displayHeavy]: require('../../assets/fonts/Manrope-ExtraBold.ttf'),
};

let defaultsInstalled = false;

export function installTextDefaults() {
  if (defaultsInstalled) return;
  defaultsInstalled = true;

  const textDefaultStyle = {
    fontFamily: fontFamily.regular,
    includeFontPadding: false,
  };
  const inputDefaultStyle = { fontFamily: fontFamily.regular };

  Text.defaultProps = Text.defaultProps || {};
  const currentText = Text.defaultProps.style;
  Text.defaultProps.style = currentText ? [textDefaultStyle, currentText] : textDefaultStyle;

  TextInput.defaultProps = TextInput.defaultProps || {};
  const currentInput = TextInput.defaultProps.style;
  TextInput.defaultProps.style = currentInput ? [inputDefaultStyle, currentInput] : inputDefaultStyle;
}
