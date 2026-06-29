/**
 * WHOOP Journal behaviour library. WHOOP fetches the questionnaire from its
 * server, so this mirrors the standard public WHOOP behaviour set grouped by the
 * same six categories. Each behaviour has an answer type: yes/no, a count, a
 * time-of-day, or a 1–5 scale. Each month WHOOP assesses physiological impact;
 * here entries persist locally and can later be correlated with recovery.
 */

export type AnswerType = 'yesno' | 'count' | 'time' | 'scale';

export type Behaviour = {
  id: string;
  question: string;
  type: AnswerType;
  category: BehaviourCategory;
};

export type BehaviourCategory = 'Sleep' | 'Recovery' | 'Nutrition' | 'Activity' | 'Health';

export const BEHAVIOUR_CATEGORIES: BehaviourCategory[] = [
  'Sleep',
  'Recovery',
  'Nutrition',
  'Activity',
  'Health',
];

export const BEHAVIOURS: Behaviour[] = [
  // Sleep
  { id: 'own_bed', question: 'Sleep in your own bed?', type: 'yesno', category: 'Sleep' },
  { id: 'consistent_bedtime', question: 'Have a consistent bedtime?', type: 'yesno', category: 'Sleep' },
  { id: 'read_before_bed', question: 'Read (book) before bed?', type: 'yesno', category: 'Sleep' },
  { id: 'sleep_app', question: 'Use a sleep/meditation app before bed?', type: 'yesno', category: 'Sleep' },
  { id: 'melatonin', question: 'Take melatonin?', type: 'yesno', category: 'Sleep' },
  { id: 'magnesium', question: 'Take magnesium?', type: 'yesno', category: 'Sleep' },
  { id: 'screens_in_bed', question: 'Any screen time in bed?', type: 'yesno', category: 'Sleep' },
  { id: 'eye_mask', question: 'Use an eye mask / blackout?', type: 'yesno', category: 'Sleep' },
  { id: 'nap', question: 'Nap during the day?', type: 'yesno', category: 'Sleep' },
  { id: 'rested', question: 'Wake feeling rested?', type: 'yesno', category: 'Sleep' },
  // Recovery / Lifestyle
  { id: 'sunlight', question: 'Get morning sunlight / time outdoors?', type: 'yesno', category: 'Recovery' },
  { id: 'meditate', question: 'Meditate?', type: 'yesno', category: 'Recovery' },
  { id: 'sauna', question: 'Use a sauna / heat exposure?', type: 'yesno', category: 'Recovery' },
  { id: 'cold', question: 'Take an ice bath / cold exposure?', type: 'yesno', category: 'Recovery' },
  { id: 'breathwork', question: 'Do breathwork?', type: 'yesno', category: 'Recovery' },
  { id: 'stretch', question: 'Stretch / mobility / foam roll?', type: 'yesno', category: 'Recovery' },
  { id: 'massage', question: 'Get a massage?', type: 'yesno', category: 'Recovery' },
  { id: 'stress_control', question: 'Feel in control of your stress?', type: 'yesno', category: 'Recovery' },
  // Nutrition
  { id: 'alcohol', question: 'Drink any alcohol?', type: 'count', category: 'Nutrition' },
  { id: 'caffeine', question: 'Have any caffeine?', type: 'yesno', category: 'Nutrition' },
  { id: 'late_meal', question: 'Eat within 3 hours of bedtime?', type: 'yesno', category: 'Nutrition' },
  { id: 'hydrated', question: 'Stay hydrated?', type: 'yesno', category: 'Nutrition' },
  { id: 'whole_foods', question: 'Eat whole / unprocessed foods?', type: 'yesno', category: 'Nutrition' },
  { id: 'added_sugar', question: 'Eat any added sugar?', type: 'yesno', category: 'Nutrition' },
  { id: 'supplements', question: 'Take any supplements / vitamins?', type: 'yesno', category: 'Nutrition' },
  { id: 'fasting', question: 'Fast / time-restricted eating?', type: 'yesno', category: 'Nutrition' },
  // Activity
  { id: 'exercise', question: 'Exercise / work out today?', type: 'yesno', category: 'Activity' },
  { id: 'strenuous', question: 'Have a strenuous day of activity?', type: 'yesno', category: 'Activity' },
  { id: 'competition', question: 'Compete in a sporting event?', type: 'yesno', category: 'Activity' },
  // Health
  { id: 'sick', question: 'Feel sick / under the weather?', type: 'yesno', category: 'Health' },
  { id: 'allergies', question: 'Have any allergy symptoms?', type: 'yesno', category: 'Health' },
  { id: 'new_meds', question: 'Take any new medication?', type: 'yesno', category: 'Health' },
  { id: 'menstruating', question: 'Menstruating today?', type: 'yesno', category: 'Health' },
  { id: 'soreness', question: 'Feel any soreness?', type: 'scale', category: 'Health' },
  { id: 'travel', question: 'Travel today / jet lag?', type: 'yesno', category: 'Health' },
  { id: 'shared_bed', question: 'Share a bed (partner/pet)?', type: 'yesno', category: 'Health' },
];
