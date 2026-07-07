import fs from 'fs';
import path from 'path';

const PRO_GATE = fs.readFileSync(path.join(__dirname, '..', 'ProGate.js'), 'utf8');
const ROOT_NAVIGATOR = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');

describe('Pro gate feature copy', () => {
  test('uses current coaching and progress-photo labels instead of retired feature names', () => {
    expect(ROOT_NAVIGATOR).toContain("'Progress photos and Volyume Score'");
    expect(ROOT_NAVIGATOR).toContain("'Coaching decision'");
    expect(PRO_GATE).toContain("'Progress photos and Volyume Score'");
    expect(PRO_GATE).toContain("'Coaching decision'");

    expect(ROOT_NAVIGATOR).not.toContain("'Progress photos and Physique Scan'");
    expect(ROOT_NAVIGATOR).not.toContain("'Your week'");
    expect(PRO_GATE).not.toContain("'Progress photos and Physique Scan'");
    expect(PRO_GATE).not.toContain("'Your week'");
  });
});
