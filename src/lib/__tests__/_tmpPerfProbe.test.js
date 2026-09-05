import { fuzzySearch } from '../exerciseFuzzySearch';
import { tierRank } from '../exercise/canonicality';

test('per query timing', () => {
  const implements_ = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Kettlebell', 'Bodyweight', 'Band', 'Smith'];
  const movements = ['Press', 'Row', 'Squat', 'Curl', 'Raise', 'Extension', 'Pulldown', 'Fly', 'Deadlift', 'Lunge'];
  const modifiers = ['Incline', 'Decline', 'Seated', 'Standing', 'Single-Arm', 'Close Grip', 'Wide Grip', 'Paused'];
  const big = [];
  for (let i = 0; i < 1600; i++) {
    const impl = implements_[i % implements_.length];
    const mov = movements[(i * 3) % movements.length];
    const mod = modifiers[(i * 7) % modifiers.length];
    big.push({ name: `${mod} ${impl} ${mov}`, aliases: i % 10 === 0 ? [`${mov} Alt`, `${impl} ${mov} Variant`] : [] });
  }
  const getAliases = (item) => item.aliases;
  const getTier = (item) => tierRank(item.name);
  fuzzySearch(big, 'i', e => e.name, { getAliases, getTier }); // warm
  const queries = ['in', 'inc', 'incl', 'incli', 'inclin', 'incline', 'incline ', 'incline p', 'incline pr', 'incline press'];
  for (const q of queries) {
    const start = Date.now();
    const r = fuzzySearch(big, q, e => e.name, { getAliases, getTier });
    console.log(q, Date.now()-start, r.length);
  }
});
