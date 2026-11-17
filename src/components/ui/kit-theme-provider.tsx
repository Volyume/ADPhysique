/**
 * KitThemeProvider: the one place the React Native Reusables kit gets its
 * colours (LOC-411 kit trial; not part of the kit itself).
 *
 * Wrap any subtree that renders kit parts. It reads the live theme.js palette
 * through useTheme() (the same resolveTheme() the rest of the app resolves
 * through) and sets the kit's CSS variables from it with NativeWind's vars(),
 * so the palette picked at boot (dark, light, higher contrast, colour-blind
 * safe) is the palette every kit part draws in. src/styles/kitTheme.js owns
 * the variable-to-token table; no colour value lives here.
 *
 * It also loads the kit's stylesheet (global.css), so the NativeWind runtime
 * and the kit's compiled classes load only once something renders the kit;
 * screens that never use the kit never load them.
 *
 * The kit's `dark:` variants follow the colour scheme NativeWind reads from
 * Appearance, which App.js already aligns with theme.js's resolved theme at
 * boot (bootstrapAccessibility). This provider deliberately never calls
 * NativeWind's colorScheme.set(), which would override Appearance app-wide.
 * Known trial gap: after a live light/dark switch in Settings the colour
 * variables follow at once, but those `dark:` variants (Input and Checkbox
 * fills) keep the boot scheme until the next launch.
 */
import '../../../global.css';
import { cssInterop, vars } from 'nativewind';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import useTheme from '../../hooks/useTheme';
import { kitColourVariables } from '../../styles/kitTheme';

// The kit's Accordion puts className on reanimated's Animated.View. NativeWind
// only registers React Native's own components, and babel.config.js compiles
// only the kit's files with NativeWind's JSX runtime (not reanimated's source,
// which Metro also compiles), so without this the Accordion's border and
// padding classes would be dropped on a device. cssInterop() only adds an
// entry to the lookup NativeWind's JSX runtime reads, so it affects the kit's
// own call sites and no Animated.View anywhere else in the app.
cssInterop(Animated.View, { className: 'style' });

function KitThemeProvider({ style, ...props }: ViewProps & React.RefAttributes<View>) {
  const { colors } = useTheme();
  const themeVariables = React.useMemo(() => vars(kitColourVariables(colors)), [colors]);
  return <View style={[themeVariables, style]} {...props} />;
}

export { KitThemeProvider };
