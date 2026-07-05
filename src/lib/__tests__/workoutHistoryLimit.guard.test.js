const fs = require('fs');
const path = require('path');

const DB_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
const SCREEN_SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'WorkoutHistoryScreen.js'), 'utf8');

describe('Workout History bounded load contract', () => {
  test('database helper fetches only a limited recent completed workout page', () => {
    expect(DB_SOURCE).toMatch(/export async function getRecentCompletedWorkouts/);
    expect(DB_SOURCE).toMatch(/WHERE w\.user_id = \? AND w\.is_completed = 1/);
    expect(DB_SOURCE).toMatch(/ORDER BY COALESCE\(w\.ended_at, w\.started_at, w\.created_at\) DESC/);
    expect(DB_SOURCE).toMatch(/LIMIT \?/);
  });

  test('screen uses the bounded helper instead of the full history reader', () => {
    expect(SCREEN_SOURCE).toMatch(/getRecentCompletedWorkouts\(user\.id, 50\)/);
    expect(SCREEN_SOURCE).not.toMatch(/getAllWorkouts\(user\.id\)/);
  });
});
