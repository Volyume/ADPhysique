/**
 * saveUserBodyProfile keeps what the caller does not name (lead ruling
 * 2026-09-24, register D198), run against the REAL database.js on an
 * in-memory SQLite.
 *
 * WHAT THIS SUITE PINS, and why it is written to FAIL: the update path used
 * to write every column from its argument, so the onboarding wizard's
 * completion-time save (sex, height, date of birth, goal) nulled the SCOFF
 * score, the experience level, the training age and the consent flag on a
 * re-run. The SCOFF score is ED-screening data: `coachReport.js` and the
 * peak-week countdown gate read a positive screen from it, so losing it
 * silently weakened a safety posture. Now:
 *  - a field the caller leaves UNDEFINED keeps its stored value;
 *  - a field the caller names is written, null included (an explicit
 *    clear still clears);
 *  - the first save (no row yet) inserts exactly what it is given;
 *  - the callers that spread the stored row first behave exactly as before.
 */

jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const { db, saveUserBodyProfile, getUserBodyProfile } = require('../database');

let userSeq = 0;
const freshUser = () => `user-body-merge-${++userSeq}`;

const FULL = {
  sex: 'female', dateOfBirth: '1990-04-12', heightCm: 165, experienceLevel: 'intermediate',
  trainingAgeYears: 3, primaryGoal: 'strength', gdprConsented: true, scoffScore: 3,
};

beforeAll(async () => { await db(); });

test('the first save inserts exactly what it is given', async () => {
  const u = freshUser();
  await saveUserBodyProfile(u, FULL);
  const row = await getUserBodyProfile(u);
  expect(row).toMatchObject({
    sex: 'female', dateOfBirth: '1990-04-12', heightCm: 165, experienceLevel: 'intermediate',
    trainingAgeYears: 3, primaryGoal: 'strength', gdprConsented: 1, scoffScore: 3,
  });
});

test("the wizard's completion-time shape (sex, height, date of birth, goal) keeps the SCOFF score, experience, training age and consent flag", async () => {
  const u = freshUser();
  await saveUserBodyProfile(u, FULL);
  await saveUserBodyProfile(u, {
    sex: 'female', heightCm: 170, dateOfBirth: '1990-04-12', primaryGoal: 'hypertrophy',
  });
  const row = await getUserBodyProfile(u);
  expect(row).toMatchObject({
    sex: 'female', heightCm: 170, dateOfBirth: '1990-04-12', primaryGoal: 'hypertrophy',
    experienceLevel: 'intermediate', trainingAgeYears: 3, gdprConsented: 1, scoffScore: 3,
  });
});

test('an explicit null still clears the named field, and nothing else', async () => {
  const u = freshUser();
  await saveUserBodyProfile(u, FULL);
  await saveUserBodyProfile(u, { trainingAgeYears: null });
  const row = await getUserBodyProfile(u);
  expect(row.trainingAgeYears).toBeNull();
  expect(row).toMatchObject({ scoffScore: 3, gdprConsented: 1, experienceLevel: 'intermediate', heightCm: 165 });
});

test('a caller that spreads the stored row first (the wellbeing check, the settings screen) behaves exactly as before', async () => {
  const u = freshUser();
  await saveUserBodyProfile(u, FULL);
  const existing = await getUserBodyProfile(u);
  await saveUserBodyProfile(u, { ...existing, scoffScore: 1 });
  const row = await getUserBodyProfile(u);
  expect(row).toMatchObject({ ...FULL, gdprConsented: 1, scoffScore: 1 });
});

test('a positive SCOFF screen survives a full wizard re-run twice over', async () => {
  const u = freshUser();
  await saveUserBodyProfile(u, { sex: 'male', heightCm: 180, dateOfBirth: '1985-01-01', primaryGoal: 'strength' });
  const existing = await getUserBodyProfile(u);
  await saveUserBodyProfile(u, { ...existing, scoffScore: 2 });
  for (let i = 0; i < 2; i += 1) {
    await saveUserBodyProfile(u, { sex: 'male', heightCm: 181, dateOfBirth: '1985-01-01', primaryGoal: 'fat_loss' });
  }
  expect((await getUserBodyProfile(u)).scoffScore).toBe(2);
});
