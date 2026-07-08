const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('premium app font bootstrap', () => {
  test('App loads bundled fonts before requiring the navigator', () => {
    const app = read('App.js');
    expect(app).toContain("import * as Font from 'expo-font';");
    expect(app).toContain("import { appFonts, installTextDefaults } from './src/styles/fonts';");
    expect(app).toContain('async function bootstrapVisualSystem()');
    expect(app).toContain('await bootstrapAccessibility();');
    expect(app).toContain('await Font.loadAsync(appFonts);');
    expect(app).toContain('installTextDefaults();');
    expect(app.indexOf('bootstrapVisualSystem()')).toBeLessThan(app.indexOf("require('./src/navigation/RootNavigator')"));
  });

  test('the design system registers static Inter files for React Native', () => {
    const fonts = read('src/styles/fonts.js');
    for (const name of [
      'Inter-Regular.ttf',
      'Inter-Medium.ttf',
      'Inter-SemiBold.ttf',
      'Inter-Bold.ttf',
      'Inter-ExtraBold.ttf',
      'InterDisplay-Bold.ttf',
      'InterDisplay-ExtraBold.ttf',
    ]) {
      expect(fonts).toContain(`require('../../assets/fonts/${name}')`);
      expect(fs.existsSync(path.join(ROOT, 'assets', 'fonts', name))).toBe(true);
    }
  });

  test('Android text uses bundled Inter without extra platform font padding', () => {
    const fonts = read('src/styles/fonts.js');
    expect(fonts).toContain('includeFontPadding: false');
    expect(fonts).toContain('Text.defaultProps.style = currentText ? [textDefaultStyle, currentText] : textDefaultStyle;');
    expect(fonts).toContain('TextInput.defaultProps.style = currentInput ? [inputDefaultStyle, currentInput] : inputDefaultStyle;');
  });
});
