# Founder's old-coach spreadsheet — structural extract (reference, NOT gospel)

Founder steer: "Don't use it as the fountain — there's better research out there —
but it's a base that might help." So this is a real-world VALIDATION reference for
the meal-plan + check-in design, not the source of truth. Source: a 14-tab coaching
"operating system" spreadsheet (Dashboard, Timeline, Daily Tracker, Check-In,
Progress Photos, Training, Logbook, Meal Plan, Supplements, PEDs, Exercise Database,
Nutrition Database, + BLANK templates). Volyume will NOT replicate every tab (e.g.
the PEDs tab is out of scope); the meal-plan-relevant tabs are extracted below.

## Meal Plan tab — the structure (validates the generator design)
- **Day level:** separate **TRAINING DAY vs NON-TRAINING DAY** plans side by side.
  Day totals shown as calories AND the macro split expressed in **calories per
  macro** (TD 3392 kcal = 1188 protein + 1412 carb + 792 fat; NTD 3174 =
  1140 + 1008 + 1026). Water target (4L). So macro carb-cycling between training
  and rest days is core, not a bolt-on.
- **Meal level:** ordered meals (MEAL 1–6) plus, on training days, **PRE-WORKOUT /
  INTRA / POST-WORKOUT** meals (intra = EAA/creatine/glutamine). Each meal shows
  per-macro subtotals (PRO/CHO/FAT) and a meal calorie total.
- **Food level:** `{ food, amount, unit (g|item), category, cals, pro, cho, fat }`.
  **CATEGORY = the food's macro role** (PRO / CHO / FAT / OTHER).
- **Swaps = an "OPTIONAL SWITCHES" column per food** — named substitutions matched
  by category at a specific portion, hand-calibrated to hold the macros:
    - Rice (Microwave) 125g → **Pasta 50g** (CHO)
    - Cashews 20g → **Dark Chocolate 85% 21g** (FAT)
    - Wrap 1 item → **Bagel Thin 1 item** (CHO)
    - Light Mayo 25g → **Peanut Butter 12g** (FAT)
    - Toast 2 → **English toasting muffin 2** (CHO)
  → This is EXACTLY the macro-preserving swap concept. The coach pre-curates them;
  Volyume can do BOTH curated switches AND compute equivalents from the food DB.
- **NOTES = constraints / coaching cues per food:** "Any cereal that is less than
  4g of fat per 100g", "Can be blended to help digestion and speed of eating".
  → Model swaps with optional constraints (e.g. a fat ceiling on a CHO swap).

## Nutrition Database tab — the food pool (validates the categorised food DB)
- **507 rows**, columns: `NO | FOOD | AMOUNT | UNIT | CALORIES | PROTEIN | CARBS |
  FATS | CATEGORY`. Categories: **PRO / CHO / FAT / FRUIT / VEG / OTHER**.
- Heavily **UK branded + generic** (Farmfoods chicken skewers, Quorn range, Grenade
  Bar, Heck sausages, ALDI protein pudding, Skyr, Carbmax) — validates the bundled
  UK food strategy and the "verified UK data" positioning. Vegan/veg items tagged.
- → The generator picks from a **role-categorised food pool**; swaps are "another
  food in the same category, rescaled to the same macro contribution."

## Check-In tab — weekly (validates Volyume's check-in + the Theme A acknowledgement)
- ~10 questions: energy / stress / nutrition / training-activity / recovery (each
  1–5 + details), plus **wellbeing**, **"biggest wins this week"**, **struggles**,
  **what to improve**, **other**. The "biggest wins" prompt is the human-coach
  hook the five-part coach response (Theme A) should mirror (acknowledge a specific
  win). Volyume's 4-question check-in is tighter; the qualitative wins/struggles
  framing is worth borrowing in the coach-voice layer.

## Daily Tracker tab — daily inputs + weekly averaging (validates the engine)
- Daily: **bodyweight (fasted, with weigh-in time)**, water, **hunger 1–5**,
  **nutrition adherence 1–5**, cravings/off-plan, digestion, stools — with a weekly
  **AVERAGES** row (the average-weight-trend the coach decides on; matches
  Volyume's EWMA + adherence). Real entries show day-to-day weight noise (92.6 →
  93.65 → 92.6) that weekly averaging smooths — exactly why Volyume trends, not
  single readings.

## Net for the blueprints
- Strongly **validates** the meal-plan generator + role-based macro-preserving swap
  + TD/NTD carb-cycling + the categorised UK food DB + per-food constraints/notes.
- Strongly **validates** Volyume's existing engine (weekly-average weight, adherence,
  biofeedback check-in) and the Theme A "acknowledge a specific win" coaching voice.
- Use as a structural reference; the generator's food DB, swap equivalences and
  presentation should come from the broader research + Volyume's bundled data, not
  be copied from this one sheet.
</content>
