/**
 * Per-sport Strain coaching copy — wording lifted from WHOOP's own straincoach_*
 * strings (res/values/strings.xml). The STRAIN NUMBER is identical for every
 * sport (it's purely HR-driven, see strain.ts); only this coaching text varies
 * by sport category — exactly as WHOOP does it:
 *   - muscular  → adds muscle-soreness / recovery context (strength, lifting)
 *   - cardio    → cardiovascular framing
 *   - noncardio → notes high strain is hard to reach with limited cardio effort
 */

export type StrainCategory = 'cardio' | 'muscular' | 'noncardio';

// Map our activity labels to WHOOP's sport categories.
const MUSCULAR = ['strength', 'lift', 'weight', 'functional', 'crossfit', 'powerlif'];
const NONCARDIO = ['yoga', 'pilates', 'stretch', 'mobility', 'meditation', 'walk'];

export function strainCategory(label: string): StrainCategory {
  const l = label.toLowerCase();
  if (MUSCULAR.some((k) => l.includes(k))) return 'muscular';
  if (NONCARDIO.some((k) => l.includes(k))) return 'noncardio';
  return 'cardio';
}

/** WHOOP's five strain bands (minimal → all out). */
function band(strain: number): 1 | 2 | 3 | 4 | 5 {
  if (strain < 6) return 1;
  if (strain < 10) return 2;
  if (strain < 14) return 3;
  if (strain < 18) return 4;
  return 5;
}

export function strainCoachText(strain: number, category: StrainCategory): string {
  const b = band(strain);
  const s = strain.toFixed(1);
  if (category === 'muscular') {
    switch (b) {
      case 1:
        return `A ${s} Activity Strain represents minimal cardiovascular exertion.`;
      case 2:
        return `A ${s} Activity Strain represents light cardiovascular exertion, however muscle soreness may affect your Recovery tomorrow.`;
      case 3:
        return `A ${s} Activity Strain represents moderate cardiovascular exertion. You are likely to experience muscle soreness from this level of Strain during a muscular workout.`;
      case 4:
        return `A ${s} Activity Strain represents strenuous cardiovascular exertion. Building this much Strain in a muscular workout may cause considerable muscle soreness tomorrow. Plan for rest.`;
      default:
        return `A ${s} Activity Strain represents all out cardiovascular exertion. Building this much Strain in a muscular workout will likely take significant time and may result in extremely high muscle soreness. Plan for rest.`;
    }
  }
  if (category === 'noncardio') {
    switch (b) {
      case 1:
        return `A ${s} Activity Strain represents minimal cardiovascular exertion.`;
      case 2:
        return `A ${s} Activity Strain represents light cardiovascular exertion.`;
      case 3:
        return `A ${s} Activity Strain represents moderate cardiovascular exertion.`;
      case 4:
        return `A ${s} Activity Strain represents strenuous cardiovascular exertion. This much Strain may be challenging to reach during activities with limited cardiovascular effort.`;
      default:
        return `A ${s} Activity Strain represents all out cardiovascular exertion. Building this much Strain during activities with limited cardiovascular effort will likely take significant time.`;
    }
  }
  // cardio
  switch (b) {
    case 1:
      return `Activity Strain below 6 reflects a minimal amount of cardiovascular exertion. Increase Strain to build fitness.`;
    case 2:
      return `A ${s} Activity Strain represents light cardiovascular exertion.`;
    case 3:
      return `A ${s} Activity Strain represents moderate cardiovascular exertion.`;
    case 4:
      return `A ${s} Activity Strain represents strenuous cardiovascular exertion.`;
    default:
      return `A ${s} Activity Strain represents all out cardiovascular exertion.`;
  }
}
