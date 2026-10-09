/**
 * Text: the house text primitive (D104-1, Campaign 27 phase 2b, D220
 * addendum 31). React Native's Text with the READING font-scale cap from
 * the theme's one table applied by default, so the phone's text size is
 * honoured up to 2.0x on every piece of copy without a prop on each
 * element (React 19's JSX runtime dropped Text.defaultProps, which is why a
 * primitive carries it). A caller with a chrome or fixed-geometry need
 * passes its own maxFontSizeMultiplier from the same table; nothing else
 * changes: every prop, ref and nested-Text behaviour is React Native's.
 */
import { forwardRef } from 'react';
import { Text as RNText } from 'react-native';
import { fontScaleCaps } from '../styles/theme';

const Text = forwardRef(function Text({ maxFontSizeMultiplier, ...props }, ref) {
  return (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier == null ? fontScaleCaps.reading : maxFontSizeMultiplier}
      {...props}
    />
  );
});

export default Text;
