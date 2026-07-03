/**
 * Wave A A1 — the false first-set PERSONAL RECORD.
 *
 * Two contracts pinned together:
 *  1. ENGINE UNCHANGED: detectPR still returns a heaviest_weight entry for a
 *     set with empty history (previousValue null). The set remains the
 *     baseline every later comparison uses; A1 changed nothing here.
 *  2. CELEBRATION LAYER: the ActiveWorkoutScreen trigger routes an
 *     empty-history first to the quiet 'first_lift' acknowledgement and
 *     keeps it OUT of the session's PR list, and PRCelebration never dresses
 *     a first_lift in the PERSONAL RECORD treatment (forced subdued, no
 *     record announcement). Pinned at source level.
 */
import fs from 'fs';
import path from 'path';
import { detectPR } from '../algorithms';

describe('A1 contract 1: detectPR engine behaviour is unchanged', () => {
  test('empty history still yields the baseline heaviest_weight entry', () => {
    const prs = detectPR({ weight: 60, actualReps: 8 }, [], { id: 'e1' }, 'kg');
    const heaviest = prs.find(p => p.type === 'heaviest_weight');
    expect(heaviest).toBeTruthy();
    expect(heaviest.previousValue).toBeNull();
  });

  test('a genuine beat over real history still reports previousValue', () => {
    const history = [{ weight: 50, actualReps: 8 }];
    const prs = detectPR({ weight: 60, actualReps: 8 }, history, { id: 'e1' }, 'kg');
    const heaviest = prs.find(p => p.type === 'heaviest_weight');
    expect(heaviest).toBeTruthy();
    expect(heaviest.previousValue).toBe(50);
  });
});

describe('A1 contract 2: the celebration layer treats a first honestly', () => {
  const ROOT = path.resolve(__dirname, '..', '..');
  const screen = fs.readFileSync(path.join(ROOT, 'screens', 'ActiveWorkoutScreen.js'), 'utf8');
  const celebration = fs.readFileSync(path.join(ROOT, 'components', 'PRCelebration.js'), 'utf8');

  test('empty history routes to first_lift and skips the PR list', () => {
    const gate = /prs\.length > 0 && prHistory\.length === 0/.exec(screen);
    expect(gate).toBeTruthy();
    const branch = screen.slice(gate.index, screen.indexOf('} else if (prs.length > 0)', gate.index));
    expect(branch).toMatch(/type:\s*'first_lift'/);
    expect(branch).not.toMatch(/setDetectedPRs/);
  });

  test('PRCelebration forces the quiet variant for first_lift', () => {
    expect(celebration).toMatch(/isFirstLift = pr\?\.type === 'first_lift'/);
    expect(celebration).toMatch(/subdued \|\| !!reduceMotion \|\| isFirstLift/);
    expect(celebration).toMatch(/'First lift logged'/);
    // The record announcement never fires for a first lift.
    expect(celebration).toMatch(/pr\?\.type === 'first_lift'[\s\S]{0,200}First lift logged/);
  });
});
