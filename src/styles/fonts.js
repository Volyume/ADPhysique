import { fontFamily } from './fontFamily';
import { Text, TextInput } from 'react-native';

export const appFonts = {
  [fontFamily.regular]: require('../../assets/fonts/Inter-Regular.ttf'),
  [fontFamily.medium]: require('../../assets/fonts/Inter-Medium.ttf'),
  [fontFamily.semibold]: require('../../assets/fonts/Inter-SemiBold.ttf'),
  [fontFamily.bold]: require('../../assets/fonts/Inter-Bold.ttf'),
  [fontFamily.heavy]: require('../../assets/fonts/Inter-ExtraBold.ttf'),
  [fontFamily.displayBold]: require('../../assets/fonts/InterDisplay-Bold.ttf'),
  [fontFamily.displayHeavy]: require('../../assets/fonts/InterDisplay-ExtraBold.ttf'),
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
