/**
 * getPlanRoles -- D219 lane A5 (design 5.3): each muscle's role in the ACTIVE
 * plan, read from the plan's own facts, so every surface that judges a muscle's
 * weekly sets judges a muscle the person picked to bring up against its focus
 * range (register D219: "27 sets of biceps ... it shows I have overtrained").
 *
 * What this pins, and why:
 *   - a plan the new planner built (`programmes.plan_facts`, version 2) gives its
 *     `roles` map exactly (focus, raised, standard, maintenance);
 *   - everything else reads as "no roles" (an empty map, so every muscle reads the
 *     standard bands): no user, no active plan, a plan with no facts (a library, kit
 *     or manual plan, or one the older generator built), facts of another version,
 *     facts with no usable roles map, and ANY failure (never throws: a roles read
 *     must never stop a screen);
 *   - the map handed back is a copy: a surface can never edit the stored facts.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
}));

const db = require('../database');
const { getPlanRoles } = require('../effectiveLandmarks');

beforeEach(() => {
  jest.clearAllMocks();
  db.getActivePlan.mockResolvedValue({ id: 'plan1' });
  db.getProgrammePlanFacts.mockResolvedValue(null);
});

describe('getPlanRoles', () => {
  test("a version 2 plan's roles are read from its facts, including a raised muscle", async () => {
    db.getProgrammePlanFacts.mockResolvedValue({
      version: 2, roles: { biceps: 'focus', back: 'raised', chest: 'standard', abs: 'maintenance' },
    });
    await expect(getPlanRoles('u1')).resolves.toEqual({
      biceps: 'focus', back: 'raised', chest: 'standard', abs: 'maintenance',
    });
    expect(db.getActivePlan).toHaveBeenCalledWith('u1');
    expect(db.getProgrammePlanFacts).toHaveBeenCalledWith('plan1');
  });

  test('the map is a copy, not the stored facts', async () => {
    const facts = { version: 2, roles: { biceps: 'focus' } };
    db.getProgrammePlanFacts.mockResolvedValue(facts);
    const roles = await getPlanRoles('u1');
    roles.biceps = 'standard';
    expect(facts.roles.biceps).toBe('focus');
  });

  test.each([
    ['no user', () => getPlanRoles(null)],
    ['no facts', () => getPlanRoles('u1')],
  ])('%s reads as no roles', async (_name, run) => {
    await expect(run()).resolves.toEqual({});
  });

  test('no active plan reads as no roles, without reading any facts', async () => {
    db.getActivePlan.mockResolvedValue(null);
    await expect(getPlanRoles('u1')).resolves.toEqual({});
    expect(db.getProgrammePlanFacts).not.toHaveBeenCalled();
  });

  test.each([
    ['facts of another version', { version: 1, roles: { biceps: 'focus' } }],
    ['facts with no roles', { version: 2 }],
    ['roles that are not a map', { version: 2, roles: ['biceps'] }],
    ['roles that are text', { version: 2, roles: 'biceps' }],
  ])('%s read as no roles', async (_name, facts) => {
    db.getProgrammePlanFacts.mockResolvedValue(facts);
    await expect(getPlanRoles('u1')).resolves.toEqual({});
  });

  test('a failing read never throws: no roles, every muscle standard', async () => {
    db.getActivePlan.mockRejectedValue(new Error('db gone'));
    await expect(getPlanRoles('u1')).resolves.toEqual({});
    db.getActivePlan.mockResolvedValue({ id: 'plan1' });
    db.getProgrammePlanFacts.mockRejectedValue(new Error('facts unreadable'));
    await expect(getPlanRoles('u1')).resolves.toEqual({});
  });
});
