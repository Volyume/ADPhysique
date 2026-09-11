/**
 * The ONE ordered list of equipment answers, shared by every screen that
 * asks the question (ProOnboardingScreen at first run, PlanUpdateScreen
 * under Adjust training), so no two screens can offer different answers or
 * different wording for the same answer. Pure data: no I/O, nothing derived.
 *
 * The first six values ARE the engine's closed equipment-profile vocabulary
 * (planEngine.filterPool and swapEngine.rankSwaps do a bare membership test
 * against it). The last two are ANSWERS rather than profiles.
 *
 * F-16 REVISED (docs/final-certification-2026-09-05/07-FINDINGS.md,
 * evidence A12): a kettlebell or band owner had to answer "Dumbbells only"
 * or "Home gym" and was then given a plan full of kit they do not own. The
 * F-16 investigation (04-TRAINING-STYLES.md) measured the real generator
 * against the real corpus and found it cannot build either kit honestly, so
 * 'kettlebells' and 'bands' never generate: each installs the LIBRARY plan
 * that fits the week (installLibraryPlanForKit) and is stored as the profile
 * generationEquipmentFor maps it to (both in src/lib/startWithPlan.js).
 * Any screen that offers this list must take that route for those two.
 */
export const EQUIPMENT_OPTIONS = Object.freeze([
  { value: 'full_gym',        label: 'Full gym',           sub: 'Barbells, cables, machines, dumbbells' },
  { value: 'machines_cables', label: 'Machines and cables', sub: 'No free barbells' },
  { value: 'dumbbells_only',  label: 'Dumbbells only',     sub: 'Adjustable or fixed dumbbells' },
  { value: 'barbell_plates',  label: 'Barbell and plates', sub: 'Power rack or squat stand setup' },
  { value: 'home_gym',        label: 'Home gym',           sub: 'Mixed equipment at home' },
  { value: 'bodyweight',      label: 'Bodyweight',         sub: 'No equipment needed' },
  { value: 'kettlebells',     label: 'Kettlebells',        sub: 'One or two kettlebells, no other weights' },
  { value: 'bands',           label: 'Bands',              sub: 'Resistance bands, no weights' },
]);
