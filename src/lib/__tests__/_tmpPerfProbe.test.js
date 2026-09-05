import { fuzzyScore, tokenize } from '../exerciseFuzzySearch';

test('perf probe raw fuzzyScore', () => {
  const implements_ = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Kettlebell', 'Bodyweight', 'Band', 'Smith'];
  const movements = ['Press', 'Row', 'Squat', 'Curl', 'Raise', 'Extension', 'Pulldown', 'Fly', 'Deadlift', 'Lunge'];
  const modifiers = ['Incline', 'Decline', 'Seated', 'Standing', 'Single-Arm', 'Close Grip', 'Wide Grip', 'Paused'];
  const names = [];
  for (let i = 0; i < 1600; i++) {
    const impl = implements_[i % implements_.length];
    const mov = movements[(i * 3) % movements.length];
    const mod = modifiers[(i * 7) % modifiers.length];
    names.push(`${mod} ${impl} ${mov} ${i}`);
  }
  for (let trial = 0; trial < 5; trial++) {
    const start = Date.now();
    let hits = 0;
    for (const n of names) {
      if (fuzzyScore('incline press', n) > 0) hits++;
    }
    console.log('trial', trial, 'ms', Date.now() - start, 'hits', hits);
  }
});
