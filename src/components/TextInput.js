/**
 * TextInput: the house input primitive (D104-1, Campaign 27 phase 2b, D220
 * addendum 31). React Native's TextInput with the READING font-scale cap
 * from the theme's one table applied by default; a caller passes its own
 * maxFontSizeMultiplier from the same table for a fixed-geometry field.
 * The ref and the statics (TextInput.State) are React Native's.
 */
import { forwardRef } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { fontScaleCaps } from '../styles/theme';

const TextInput = forwardRef(function TextInput({ maxFontSizeMultiplier, ...props }, ref) {
  return (
    <RNTextInput
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier == null ? fontScaleCaps.reading : maxFontSizeMultiplier}
      {...props}
    />
  );
});
TextInput.State = RNTextInput.State;

export default TextInput;
