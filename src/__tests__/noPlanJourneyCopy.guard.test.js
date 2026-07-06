/**
 * No-plan / start-plan copy guard.
 *
 * The Home and Plans screens should speak with one voice when a user has no
 * plan yet: the same title, the same primary verb, and no older fallback
 * phrasing lingering in the empty-state blocks.
 */
import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const HOME = read('screens/HomeScreen.js');
const PLANS = read('screens/PlansScreen.js');

describe('no-plan / start-plan copy', () => {
  test('HomeScreen uses one no-plan title and the shared start CTA', () => {
    const block = HOME.slice(HOME.indexOf('<View style={styles.noPlanSection}>'), HOME.indexOf('{/* Progress at a glance'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    expect(block).toContain('Browse plans');
    expect(block).not.toContain('Find my plan');
    expect(block).not.toContain('Build my plan');
  });

  test('PlansScreen free no-plan copy matches the shared verb', () => {
    const block = PLANS.slice(PLANS.indexOf('<Card style={styles.noPlanCard}>'), PLANS.indexOf('<Card style={styles.noActivePlanRow}>'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    expect(block).toContain('Browse plans');
    expect(block).not.toContain('Browse the library');
    expect(block).not.toContain('Find my plan');
  });

  test('PlansScreen decision hub label stays on the same verb for no-plan users', () => {
    expect(PLANS).toContain("{isProWithPlan ? 'Switch your plan' : 'Start with a plan'}");
    expect(PLANS).not.toContain('Start or build a plan');
  });

  test('PlansScreen Pro no-plan row uses the same verb', () => {
    const block = PLANS.slice(PLANS.indexOf('<Card style={styles.noActivePlanRow}>'), PLANS.indexOf('{/* Folders'));
    expect(block).toContain('Start with a plan');
    expect(block).not.toContain('Build one');
  });
});
