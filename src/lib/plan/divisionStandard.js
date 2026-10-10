/**
 * divisionStandard.js -- the standard routine of each category, in the
 * muscle's own sets a week and in sessions a week, from the research of
 * 2026-10-10 (founder order, register D219 addenda 2026-10-10 and 3):
 *
 *   docs/audit/plan-builder-science-2026-10-04/
 *     06-DIVISION-RESEARCH-MENS-PHYSIQUE-CLASSIC.md         (file 06)
 *     07-DIVISION-RESEARCH-BIKINI-WELLNESS.md                (file 07)
 *     08-DIVISION-RESEARCH-FIGURE-WOMENS-PHYSIQUE.md         (file 08)
 *     09-DIVISION-RESEARCH-BODYBUILDING-GENERAL-SURVEY.md    (file 09)
 *
 * The founder's law: the standard of the GROUP is always kept, and a focus
 * pick or a division's emphasis adds on top of it. The group's standard is
 * what its judging criteria and its competitors' off-season programming
 * say, not one bodybuilding routine for every category: wellness athletes
 * train chest at a median of one set a week and are marked down for upper
 * density (file 07), while men's physique athletes train chest at a median
 * of 32 (file 09, survey). So each category carries its own floors and its
 * own sessions a week per muscle; anything not listed takes the general
 * standard (science.js STANDARD_DIRECT_FLOOR; two sessions a week for the
 * big muscles from three days, two for any standard that does not fit one
 * session).
 *
 * The floors are the bottom of the category's own range, read against the
 * app's evidence band (10 to 20 direct sets a week is normal growth,
 * science.js WEEKLY_BANDS): the survey medians (da Silveira 2025, n = 154,
 * sets counted as exercises x sets x weekly frequency, file 09 A2) rank the
 * muscles within a category and across categories; the named programmes
 * give the structure. Every number below carries its source in EVIDENCE.
 *
 * Pure data, no imports.
 */

/**
 * Per goal: `directFloor` (the standard in the muscle's own sets a week,
 * overriding STANDARD_DIRECT_FLOOR) and `sessions` (the sessions a week a
 * muscle trains in, by days a week, overriding the general rule). A goal
 * absent here, or a muscle absent from its entry, takes the general rule.
 */
export const DIVISION_STANDARD = Object.freeze({
  mens_physique: Object.freeze({
    directFloor: Object.freeze({
      chest: 10, back: 12, side_delts: 10, rear_delts: 6, biceps: 8, triceps: 8,
      quads: 8, hamstrings: 6, glutes: 4, calves: 8, abs: 8,
    }),
    // Legs once a week in the 3- and 5-day weeks (the modal 5-day is a
    // body-part week with one leg day; 3 to 3 among named athletes on once
    // against twice), twice in the upper/lower 4-day week and the push/pull/
    // legs 6-day week, which is how the only 4-day and 6-day sources run.
    sessions: Object.freeze({
      quads: Object.freeze({ 3: 1, 4: 2, 5: 1, 6: 2 }),
      hamstrings: Object.freeze({ 3: 1, 4: 2, 5: 1, 6: 2 }),
      glutes: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      calves: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 2 }),
    }),
  }),
  classic_physique: Object.freeze({
    directFloor: Object.freeze({
      chest: 10, back: 12, side_delts: 8, rear_delts: 6, biceps: 8, triceps: 8,
      quads: 12, hamstrings: 10, glutes: 8, calves: 10, abs: 6,
    }),
    // Legs twice in six of seven athletes, as a quad-led day and a
    // hamstring-led day; the general rule already gives two.
    sessions: Object.freeze({}),
  }),
  bodybuilding: Object.freeze({
    directFloor: Object.freeze({
      chest: 12, back: 14, side_delts: 8, rear_delts: 6, biceps: 8, triceps: 8,
      quads: 12, hamstrings: 10, glutes: 8, calves: 10, abs: 6,
    }),
    sessions: Object.freeze({}),
  }),
  bikini: Object.freeze({
    directFloor: Object.freeze({
      glutes: 12, hamstrings: 8, quads: 6, calves: 6, adductors: 4,
      back: 8, side_delts: 8, rear_delts: 4, chest: 4, biceps: 4, triceps: 4, abs: 4,
    }),
    // Glutes and hamstrings in every lower session (two at 4 days, three
    // at 6); quads, chest and the arms once; the delts and back twice.
    sessions: Object.freeze({
      glutes: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 3 }),
      hamstrings: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 3 }),
      quads: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      chest: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      biceps: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      triceps: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      calves: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
    }),
  }),
  wellness: Object.freeze({
    directFloor: Object.freeze({
      glutes: 12, quads: 10, hamstrings: 10, adductors: 4, calves: 8,
      back: 8, side_delts: 6, rear_delts: 4, biceps: 6, triceps: 6, chest: 2, abs: 6,
    }),
    // Three lower sessions to two upper at 5 days, four to two at 6; chest
    // once and light (survey median one set, upper density marked down).
    sessions: Object.freeze({
      glutes: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 3 }),
      hamstrings: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 3 }),
      quads: Object.freeze({ 3: 2, 4: 2, 5: 2, 6: 2 }),
      chest: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      biceps: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      triceps: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 1 }),
      side_delts: Object.freeze({ 3: 1, 4: 2, 5: 2, 6: 2 }),
      back: Object.freeze({ 3: 1, 4: 2, 5: 2, 6: 2 }),
      calves: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 2 }),
    }),
  }),
  figure: Object.freeze({
    directFloor: Object.freeze({
      side_delts: 10, rear_delts: 6, back: 12, chest: 8, biceps: 8, triceps: 8,
      quads: 10, hamstrings: 8, glutes: 8, calves: 8, abs: 6,
    }),
    sessions: Object.freeze({
      chest: Object.freeze({ 3: 1, 4: 1, 5: 1, 6: 2 }),
    }),
  }),
  womens_physique: Object.freeze({
    directFloor: Object.freeze({
      chest: 8, back: 12, side_delts: 10, rear_delts: 6, biceps: 8, triceps: 8,
      quads: 10, hamstrings: 8, glutes: 8, calves: 8, abs: 6,
    }),
    sessions: Object.freeze({}),
  }),
});

/** The goals with a standard of their own; every other goal is general. */
export const DIVISION_STANDARD_GOALS = Object.freeze(Object.keys(DIVISION_STANDARD));

/** The category's direct floor for a muscle, or null for the general rule. */
export function divisionDirectFloor(goal, muscle) {
  const v = DIVISION_STANDARD[goal]?.directFloor?.[muscle];
  return Number.isFinite(v) ? v : null;
}

/** The category's sessions a week for a muscle at `days`, or null for the general rule. */
export function divisionSessions(goal, muscle, days) {
  const v = DIVISION_STANDARD[goal]?.sessions?.[muscle]?.[days];
  return Number.isFinite(v) ? v : null;
}

/**
 * Source for every entry above, keyed "goal.directFloor.muscle" or
 * "goal.sessions.muscle" (divisionStandard.test.js pins that no entry is
 * without one). S = the survey medians, off-season (file 09 A3 and A4;
 * da Silveira 2025, https://pmc.ncbi.nlm.nih.gov/articles/PMC12345604/).
 */
export const EVIDENCE = Object.freeze({
  'mens_physique.directFloor.chest': 'S: pectoral 32 (8 to 70), the highest chest median of any division; file 06 section 4.1. Floor at the bottom of the normal growth band.',
  'mens_physique.directFloor.back': 'S: lats 32; the V-taper is the judged shape (NPC, IFBB 2017 rules, file 06 section 1.1). Floor at the general standard.',
  'mens_physique.directFloor.side_delts': 'S: deltoid 33.5, the highest of any division; shoulder width is the judged line (file 06 section 1.1). Floor two above the general standard.',
  'mens_physique.directFloor.rear_delts': 'General standard (file 09 B5, Helms 10 to 20 a week per muscle, small muscles at the bottom).',
  'mens_physique.directFloor.biceps': 'S: biceps 18; general standard for the arms (file 09 B5).',
  'mens_physique.directFloor.triceps': 'S: triceps 16; general standard for the arms (file 09 B5).',
  'mens_physique.directFloor.quads': 'S: quadriceps 22 (1 to 56): competitors train legs, the judging excludes the upper legs under board shorts (file 06 sections 1.1 and 5). Floor two below the general standard, inside one leg day under the session cap of 8.',
  'mens_physique.directFloor.hamstrings': 'S: hamstrings 19; as quads, two below the general standard (file 06 section 5: legs once or twice a week, never none).',
  'mens_physique.directFloor.glutes': 'S: gluteal 9 (0 to 30), the lowest of the men\'s divisions; glutes are not judged in board shorts (file 06). Maintenance-band top.',
  'mens_physique.directFloor.calves': 'S: triceps surae 16; the survey authors note calves as a tiebreaker (file 06 section 5). General standard.',
  'mens_physique.directFloor.abs': 'S: abdominals 15, the highest of the men\'s divisions; the waist and abs are judged (file 06 section 1.1). Two above the general standard.',
  'mens_physique.sessions.quads': 'File 06 section 3.1: 5-day modal is a body-part week with one leg day (Hendrickson, Buendia); the only 4-day source is upper/lower twice (Hanson); 6-day is push/pull/legs twice (Terry, Cook); no 3-day week found, the 3-day follows the 5-day\'s one leg day.',
  'mens_physique.sessions.hamstrings': 'As quads (file 06 section 3.1).',
  'mens_physique.sessions.glutes': 'S: gluteal 9, once a week on the leg day (file 06 section 3.1; no source gives glutes a second day).',
  'mens_physique.sessions.calves': 'Calves twice a week, on the leg day and as an upper-day finisher (file 09 B2: Lunsford calves on two days; file 06 section 5: calves a tiebreaker).',
  'classic_physique.directFloor.chest': 'S: pectoral 27; Bumstead\'s cycle trains chest twice (file 06 section 3.2). General standard.',
  'classic_physique.directFloor.back': 'S: lats 29; back twice in the 6-day week, width and thickness (file 06 section 3.2). General standard.',
  'classic_physique.directFloor.side_delts': 'S: deltoid 26, below men\'s physique; the survey authors: reduced deltoid volume preserves proportion (file 06 section 5). General standard.',
  'classic_physique.directFloor.rear_delts': 'General standard.',
  'classic_physique.directFloor.biceps': 'S: biceps 16. General standard.',
  'classic_physique.directFloor.triceps': 'S: triceps 16. General standard.',
  'classic_physique.directFloor.quads': 'S: quadriceps 24; legs fully visible in trunks, a quad day in six of seven athletes (file 06 sections 3.2 and 5). Two above the general standard.',
  'classic_physique.directFloor.hamstrings': 'S: hamstrings 19; a hamstring day in Bumstead, Kalecinski, Ruffin (file 06 section 3.2). Two above the general standard.',
  'classic_physique.directFloor.glutes': 'S: gluteal 12. General standard.',
  'classic_physique.directFloor.calves': 'S: triceps surae 20, the highest of the men\'s divisions; calves judged in the X-frame (file 06 section 1.2). Two above the general standard.',
  'classic_physique.directFloor.abs': 'S: abdominals 9. General standard.',
  'bodybuilding.directFloor.chest': 'S (bodybuilding classic, n = 14): pectoral 20; open judging is the total package (file 09 B1). Two above the general standard.',
  'bodybuilding.directFloor.back': 'S: lats 24. Two above the general standard.',
  'bodybuilding.directFloor.side_delts': 'S: deltoid 22. General standard.',
  'bodybuilding.directFloor.rear_delts': 'General standard.',
  'bodybuilding.directFloor.biceps': 'S: biceps 12. General standard.',
  'bodybuilding.directFloor.triceps': 'S: triceps 12. General standard.',
  'bodybuilding.directFloor.quads': 'S: quadriceps 16; legs twice in the 5-day pro splits (file 09 B4). Two above the general standard.',
  'bodybuilding.directFloor.hamstrings': 'S: hamstrings 14. Two above the general standard.',
  'bodybuilding.directFloor.glutes': 'S: gluteal 7. General standard.',
  'bodybuilding.directFloor.calves': 'S: triceps surae 14. Two above the general standard.',
  'bodybuilding.directFloor.abs': 'S: abdominals 4.5. General standard.',
  'bikini.directFloor.glutes': 'S (n = 9): gluteal 31, the highest of any muscle in any division; "full round glutes" is the first judged line (file 07 sections 1.1 and 4.1). Two above the general standard.',
  'bikini.directFloor.hamstrings': 'S: hamstrings 17; glute to hamstring tie-in judged (file 07 section 1.1). General standard.',
  'bikini.directFloor.quads': 'S: quadriceps 7.5; not overly developed legs (OCB, file 07 section 1.1). Four below the general standard.',
  'bikini.directFloor.calves': 'S: triceps surae 8. Two below the general standard.',
  'bikini.directFloor.adductors': 'Bikini lower sessions carry the adductors in the existing lists (GOAL_OVERLAYS 1.10); maintenance-band top.',
  'bikini.directFloor.back': 'S: lats 12; "back muscularity without excessive density" (OCB, file 07 section 1.1). Four below the general standard.',
  'bikini.directFloor.side_delts': 'S: deltoid 7.5 (2 to 48); "some fullness and roundness in the deltoids" (OCB). General standard for the delts.',
  'bikini.directFloor.rear_delts': 'Two below the general standard, with the delts (file 07 section 1.1).',
  'bikini.directFloor.chest': 'S: pectoral 7.5; chest trained directly in six of seven splits, low (file 07 section 4.3; Starr: no pec focus). Maintenance-band top, never absent.',
  'bikini.directFloor.biceps': 'S: biceps 7.5; arms direct in four of seven splits (file 07 section 4.3). Maintenance-band top.',
  'bikini.directFloor.triceps': 'As biceps (file 07 section 4.3).',
  'bikini.directFloor.abs': 'S: abdominals 4; conditioned core judged, striations marked down (file 07 section 1.1). Maintenance-band top.',
  'bikini.sessions.glutes': 'File 07 section 3.1: glutes 2 at 4 days (B4, B6), 2 to 3 at 5, 3 at 6 (B5, B1).',
  'bikini.sessions.hamstrings': 'With the glutes in every lower session (file 07 section 3.1).',
  'bikini.sessions.quads': 'One quad-led lower session (glute/quad day, file 07 section 3.1).',
  'bikini.sessions.chest': 'Chest once, inside an upper session (file 07 section 3.1 and 4.3).',
  'bikini.sessions.biceps': 'Arms once, inside an upper session (file 07 section 4.3).',
  'bikini.sessions.triceps': 'As biceps.',
  'bikini.sessions.calves': 'Once, on a lower day (file 07 section 2.1 splits).',
  'wellness.directFloor.glutes': 'S (n = 20): gluteal 24; "glutes will be bigger than current bikini competitors" (NPC, file 07 section 1.2). Two above the general standard.',
  'wellness.directFloor.quads': 'S: quadriceps 28; quads judged with sweep (NPC, IFBB Australia, file 07 section 1.2). General standard.',
  'wellness.directFloor.hamstrings': 'S: hamstrings 24. Two above the general standard.',
  'wellness.directFloor.adductors': 'Inner thigh in the lower-body line (GOAL_OVERLAYS 1.40); maintenance-band top.',
  'wellness.directFloor.calves': 'S: triceps surae 12. General standard.',
  'wellness.directFloor.back': 'S: lats 16; hourglass upper body, not dense (IFBB Australia, file 07 section 1.2). Four below the general standard.',
  'wellness.directFloor.side_delts': 'S: deltoid 18; "capped shoulders slightly bigger than bikini, not overly dense" (file 07 section 1.2). Two below the general standard.',
  'wellness.directFloor.rear_delts': 'With the delts, two below the general standard.',
  'wellness.directFloor.biceps': 'S: biceps 8; arms direct in four of four splits (file 07 section 4.3). Two below the general standard.',
  'wellness.directFloor.triceps': 'S: triceps 10; as biceps.',
  'wellness.directFloor.chest': 'S: pectoral 1 (0 to 16); chest in one of four splits, light; upper density marked down (file 07 sections 1.2 and 4.3). One light exercise a week, never absent.',
  'wellness.directFloor.abs': 'S: abdominals 12; "wide/thick/dense/blocky waist" not rewarded, so the abs are trained, not loaded heavy (file 07 section 1.2). General standard.',
  'wellness.sessions.glutes': 'File 07 section 3.2: glutes 2 at 4 and 5 days, lower sessions 3 at 5 days and 4 at 6 (W1, W2, W4).',
  'wellness.sessions.hamstrings': 'With the glutes (W1 hamstrings and glutes day, file 07 section 3.2).',
  'wellness.sessions.quads': 'A quad day of its own from 4 days (W1, W2, W4; file 07 section 3.2).',
  'wellness.sessions.chest': 'Once, light (file 07 section 4.3).',
  'wellness.sessions.biceps': 'Arms once, on the upper day (file 07 section 3.2).',
  'wellness.sessions.triceps': 'As biceps.',
  'wellness.sessions.side_delts': 'Two upper sessions from 4 days (W3; W1 5-day; file 07 section 3.2).',
  'wellness.sessions.back': 'As side delts.',
  'wellness.sessions.calves': 'Once with the legs, twice in the 6-day week (W2, file 07 section 3.2).',
  'figure.directFloor.side_delts': 'S (n = 3): deltoid 23; capped shoulders and the V-taper are the judged line (file 08 section 1). Two above the general standard.',
  'figure.directFloor.rear_delts': 'General standard.',
  'figure.directFloor.back': 'S: lats 12; back width judged (file 08 section 1). General standard.',
  'figure.directFloor.chest': 'S: pectoral 12; chest direct in eight of eight splits, once a week in seven (file 08). Two below the general standard.',
  'figure.directFloor.biceps': 'S: biceps 12.5; arms direct in seven of eight (file 08). General standard.',
  'figure.directFloor.triceps': 'S: triceps 12.5; as biceps.',
  'figure.directFloor.quads': 'S: quadriceps 28.5; legs twice in four of eight splits (file 08). General standard.',
  'figure.directFloor.hamstrings': 'S: hamstrings 27. General standard.',
  'figure.directFloor.glutes': 'S: gluteal 13.5. General standard.',
  'figure.directFloor.calves': 'S: triceps surae 17.5. General standard.',
  'figure.directFloor.abs': 'S: abdominals 12. General standard.',
  'figure.sessions.chest': 'Chest once a week in seven of eight figure splits, twice only in the 6-day week (file 08).',
  'womens_physique.directFloor.chest': 'S (n = 3): pectoral 2, but chest direct in the three itemised splits (file 08); the survey sample is too small to set a floor from, so two below the general standard, as figure.',
  'womens_physique.directFloor.back': 'S: lats 17; V-taper judged (NPC, file 08). General standard.',
  'womens_physique.directFloor.side_delts': 'S: deltoid 20; shoulder caps judged (file 08). Two above the general standard.',
  'womens_physique.directFloor.rear_delts': 'General standard.',
  'womens_physique.directFloor.biceps': 'S: biceps 11; arms direct in the itemised splits (file 08). General standard.',
  'womens_physique.directFloor.triceps': 'S: triceps 11; as biceps.',
  'womens_physique.directFloor.quads': 'S: quadriceps 17; lower/upper twice in both 4-day templates (file 08). General standard.',
  'womens_physique.directFloor.hamstrings': 'S: hamstrings 11. General standard.',
  'womens_physique.directFloor.glutes': 'S: gluteal 11. General standard.',
  'womens_physique.directFloor.calves': 'S: triceps surae 9.5. General standard.',
  'womens_physique.directFloor.abs': 'S: abdominals 2 (n = 3); abs judged for conditioning. General standard.',
});
