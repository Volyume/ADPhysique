import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.resolve(ROOT, 'src');

function listJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listJsFiles(fullPath, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(fullPath);
    }
  }
  return out;
}

function relative(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

describe('accessibility and design consistency guardrails', () => {
  const files = [
    path.resolve(ROOT, 'App.js'),
    ...listJsFiles(SRC),
  ];

  test('text inputs never use the generic placeholder accessibility label', () => {
    const offences = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('Text input field')) offences.push(relative(file));
    }
    expect(offences).toEqual([]);
  });

  test('text remains eligible for system font scaling', () => {
    const offences = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (/allowFontScaling=\{false\}/.test(text)) offences.push(relative(file));
    }
    expect(offences).toEqual([]);
  });

  test('native stack headers stay hidden so screens use the shared app chrome', () => {
    const navigationDir = path.resolve(SRC, 'navigation');
    const offences = [];
    for (const file of listJsFiles(navigationDir)) {
      const text = fs.readFileSync(file, 'utf8');
      if (/headerShown:\s*true/.test(text)) offences.push(relative(file));
    }
    expect(offences).toEqual([]);
  });

  test('tab bar border styling flows through the theme token only', () => {
    const offences = [];
    for (const file of files) {
      const rel = relative(file);
      if (rel === 'src/styles/theme.js') continue;
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('tabBarBorder')) offences.push(rel);
    }
    expect(offences).toEqual([]);
  });
});
