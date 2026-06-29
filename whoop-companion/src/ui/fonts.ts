/**
 * WHOOP's actual typefaces, bundled from the decompiled app for exact visual
 * parity (private personal-use build): DIN Pro for numerals/metrics and Proxima
 * Nova for text. Family-name constants are used across the theme; useWhoopFonts
 * loads the .otf assets at startup.
 */

import { useFonts } from 'expo-font';

export const fonts = {
  // DIN Pro — the big metric numerals (recovery %, strain, HR)
  black: 'DINPro-Black',
  bold: 'DINPro-Bold',
  medium: 'DINPro-Medium',
  regular: 'DINPro-Regular',
  light: 'DINPro-Light',
  // Proxima Nova — UI text, labels, body
  textBold: 'ProximaNova-Bold',
  textSemibold: 'ProximaNova-Semibold',
  text: 'ProximaNova-Regular',
  textLight: 'ProximaNova-Light',
};

export function useWhoopFonts(): boolean {
  const [loaded] = useFonts({
    'DINPro-Black': require('../../assets/fonts/dinpro_black.otf'),
    'DINPro-Bold': require('../../assets/fonts/dinpro_bold.otf'),
    'DINPro-Medium': require('../../assets/fonts/dinpro_medium.otf'),
    'DINPro-Regular': require('../../assets/fonts/dinpro_regular.otf'),
    'DINPro-Light': require('../../assets/fonts/dinpro_light.otf'),
    'ProximaNova-Bold': require('../../assets/fonts/proxima_nova_bold.otf'),
    'ProximaNova-Semibold': require('../../assets/fonts/proxima_nova_semibold.otf'),
    'ProximaNova-Regular': require('../../assets/fonts/proxima_nova_regular.otf'),
    'ProximaNova-Light': require('../../assets/fonts/proxima_nova_light.otf'),
  });
  return loaded;
}
