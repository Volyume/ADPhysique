/**
 * TextField.sheetInput.guard.test.js - pins the founder-reported keyboard
 * fix (2026-07-10): a TextField rendered inside a bottom sheet MUST use
 * gorhom's BottomSheetTextInput (library requirement). A plain TextInput
 * inside a dynamically-sized sheet fights the sheet's keyboard coordination
 * and Android dismisses the keyboard after every keystroke.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('TextField picks the sheet-safe input primitive', () => {
  const src = read('TextField.js');

  test('imports BottomSheetTextInput and the inside-sheet context', () => {
    expect(src).toMatch(/import\s*{\s*BottomSheetTextInput\s*}\s*from\s*'@gorhom\/bottom-sheet'/);
    expect(src).toMatch(/import\s*{\s*InsideBottomSheetContext\s*}\s*from\s*'.\/BottomSheet'/);
  });

  test('switches the rendered input on the context, never hardcodes TextInput in the JSX', () => {
    expect(src).toMatch(/insideSheet\s*\?\s*BottomSheetTextInput\s*:\s*TextInput/);
    expect(src).toMatch(/<InputComponent/);
    expect(src).not.toMatch(/<TextInput[\s/>]/);
  });

  test('the sheet wrapper provides the context around its children', () => {
    const sheet = read('BottomSheet.js');
    expect(sheet).toMatch(/export const InsideBottomSheetContext = createContext\(false\)/);
    expect(sheet).toMatch(/<InsideBottomSheetContext.Provider value>/);
  });
});
