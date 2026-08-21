/**
 * capabilityCoach.test.js — CC31 tests
 *
 * The CONSTRAINED limiter, per-muscle holds and the anti-causal register.
 * Pins: classifyTrainingLimiter, chooseInterventions, coordinateChanges,
 * computeVolumeApply, conflictOutcome, runWeeklyCoach behaviour, PD-3 note
 * stripping, weekNote storage, and section 19 rendering on WeeklyCheckInScreen.
 *
 * Pure tests on exported functions (no mocks; database access in integration
 * only). All capability-related behaviour exercised, limits pinned against
 * real production modules.
 */
import { classifyTrainingLimiter, chooseInterventions, coordinateChanges, conflictOutcome, LIMITER, INTERVENTION } from '../coachPrecedence';
import { computeVolumeApply } from '../coachApply';
import { runWeeklyCoach, parseNoteFlags } from '../weeklyCoach';
import { stripAutoNotes } from '../checkinDerive';
import { CAPABILITY_WEEK_ANSWER, setCapabilityWeekNote, getCapabilityWeekNote } from '../capability/weekNote';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('CC31 — CONSTRAINED limiter and per-muscle holds', () => {
  describe('a. classifyTrainingLimiter — CONSTRAINED classification', () => {
    it('classifies as CONSTRAINED when active episode + poor execution + excused omissions', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = classifyTrainingLimiter(context);
      expect(result.limiter).toBe(LIMITER.CONSTRAINED);
      expect(result.because).toBe('constraint_explained_shortfall');
    });

    it('classifies as EXECUTION (not CONSTRAINED) when excusedThisWeek is 0', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 0,
          },
        },
      };
      const result = classifyTrainingLimiter(context);
      expect(result.limiter).toBe(LIMITER.EXECUTION);
    });

    it('classifies as PLAN (not CONSTRAINED) when execution and progress both good', () => {
      const context = {
        training: {
          execution: { signal: 'good' },
          progress: { signal: 'good' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = classifyTrainingLimiter(context);
      expect(result.limiter).toBe(LIMITER.PLAN);
    });
  });

  describe('b. chooseInterventions — CONSTRAINED intervention cap', () => {
    it('caps at EXPLAIN for CONSTRAINED training limiter', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = chooseInterventions(context);
      expect(result.training).toBe(INTERVENTION.EXPLAIN);
      expect(result.holds).toContainEqual({ domain: 'training', reason: 'constraint_active' });
    });
  });

  describe('c. coordinateChanges — CONSTRAINED volume withholding', () => {
    it('withholds volume INCREASE under CONSTRAINED', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = coordinateChanges({
        context,
        proposed: { volumeChange: 2 },
      });
      expect(result.allowVolumeChange).toBe(false);
      expect(result.holds).toContainEqual({ domain: 'training', reason: 'constraint_active' });
    });

    it('allows volume DECREASE under CONSTRAINED', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = coordinateChanges({
        context,
        proposed: { volumeChange: -1 },
      });
      expect(result.allowVolumeChange).toBe(true);
    });
  });

  describe('d. computeVolumeApply — per-muscle holds', () => {
    it('holds volume INCREASE on affected muscles only', () => {
      const plannedRows = [
        { muscle: 'chest', mev: 8, mrv: 20, planned_sets: 10 },
        { muscle: 'quads', mev: 8, mrv: 20, planned_sets: 10 },
      ];
      const result = computeVolumeApply(plannedRows, 1, ['chest']);
      // chest held, quads changes
      expect(result).toHaveLength(1);
      expect(result[0].muscle).toBe('quads');
      expect(result[0].plannedSets).toBe(11);
    });

    it('allows volume DECREASE on all muscles including held ones', () => {
      const plannedRows = [
        { muscle: 'chest', mev: 8, mrv: 20, planned_sets: 10 },
        { muscle: 'quads', mev: 8, mrv: 20, planned_sets: 10 },
      ];
      const result = computeVolumeApply(plannedRows, -1, ['chest']);
      // both decrease
      expect(result).toHaveLength(2);
      expect(result.find(r => r.muscle === 'chest').plannedSets).toBe(9);
      expect(result.find(r => r.muscle === 'quads').plannedSets).toBe(9);
    });

    it('allows volume INCREASE on all muscles with no holds', () => {
      const plannedRows = [
        { muscle: 'chest', mev: 8, mrv: 20, planned_sets: 10 },
        { muscle: 'quads', mev: 8, mrv: 20, planned_sets: 10 },
      ];
      const result = computeVolumeApply(plannedRows, 1, null);
      expect(result).toHaveLength(2);
    });
  });

  describe('e. conflictOutcome — neverClaim entries', () => {
    it('includes capability constraint entries in neverClaim', () => {
      const context = {
        training: {
          execution: { signal: 'poor' },
          physicalConstraint: {
            active: true,
            affectedMuscles: ['chest'],
            excusedThisWeek: 1,
          },
        },
      };
      const result = conflictOutcome(context);
      expect(result.neverClaim).toContain('capability_caused_recovery_outcome');
      expect(result.neverClaim).toContain('constraint_justified_nutrition_change');
    });
  });

  describe('f. runWeeklyCoach — nutrition invariance under constraint', () => {
    it('produces identical calorieAdjustment with and without constraint', async () => {
      const baseInputs = {
        checkin: {
          energyScore: 3,
          sorenessScore: 2,
        },
        morningWeights: [],
        sessionsCompleted: 3,
        sessionsPlanned: 3,
        prsThisWeek: 0,
        goalPhase: 'maint',
        weeksInPhase: 4,
        consecutiveOffTargetWeeks: 0,
        consecutivePoorRecoveryWeeks: 0,
        sex: 'male',
        targetKcal: 2500,
        userProfile: { ffm: 80 },
      };

      // Run without constraint
      const outputWithout = runWeeklyCoach(baseInputs);

      // Run with constraint
      const outputWith = runWeeklyCoach({
        ...baseInputs,
        physicalConstraint: {
          active: true,
          affectedMuscles: ['chest'],
          excusedThisWeek: 1,
        },
      });

      // Calorie adjustments must be identical
      expect(outputWith.calorieAdjustment).toEqual(outputWithout.calorieAdjustment);
    });
  });

  describe('g. PD-3 — note stripping and injury flag', () => {
    it('stripAutoNotes removes auto-appended joint-pain sentence', () => {
      const notes = 'My comment here. Joint pain flagged this week.';
      const stripped = stripAutoNotes(notes);
      expect(stripped).toBe('My comment here.');
    });

    it('parseNoteFlags detects injury only in user notes (not auto)', () => {
      const userNotes = 'my knee pain is bad';
      const flags1 = parseNoteFlags(userNotes);
      expect(flags1.injury).toBe(true);

      const autoNote = stripAutoNotes('Joint pain flagged this week.');
      const flags2 = parseNoteFlags(autoNote);
      expect(flags2.injury).toBe(false);
    });
  });

  describe('h. weekNote round trip', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('round-trips weekNote via AsyncStorage', async () => {
      const userId = 'test-user-1';
      const weekStart = 1692057600000; // arbitrary epoch ms

      const success = await setCapabilityWeekNote(userId, {
        weekStart,
        answer: CAPABILITY_WEEK_ANSWER.FINE,
      });
      expect(success).toBe(true);

      const retrieved = await getCapabilityWeekNote(userId, weekStart);
      expect(retrieved?.answer).toBe(CAPABILITY_WEEK_ANSWER.FINE);
    });

    it('returns null for different weekStart', async () => {
      const userId = 'test-user-2';
      const weekStart1 = 1692057600000;
      const weekStart2 = 1692144000000;

      await setCapabilityWeekNote(userId, {
        weekStart: weekStart1,
        answer: CAPABILITY_WEEK_ANSWER.IN_THE_WAY,
      });

      const retrieved = await getCapabilityWeekNote(userId, weekStart2);
      expect(retrieved).toBe(null);
    });

    it('rejects invalid answer', async () => {
      const userId = 'test-user-3';
      const weekStart = 1692057600000;

      const success = await setCapabilityWeekNote(userId, {
        weekStart,
        answer: 'invalid-answer',
      });
      expect(success).toBe(false);
    });
  });

  describe('i. section 19 rendering — WeeklyCheckInScreen pins (source guards)', () => {
    // Realised 2026-08-21 (these three were placeholders): the house
    // source-guard pattern, pinning the conditional question surface the
    // founder's weekly-loop order depends on.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../screens/WeeklyCheckInScreen.js'), 'utf8',
    );

    it('source contains the conditional question, gated on hasActiveEpisode', () => {
      expect(src).toContain('How did you get on training around your temporary change?');
      expect(/hasActiveEpisode\s*\?/.test(src)).toBe(true);
    });

    it('source stores the weekly answer via setCapabilityWeekNote', () => {
      expect(/setCapabilityWeekNote\(userId,\s*\{\s*weekStart/.test(src)).toBe(true);
    });

    it('joint-pain question renders only without an active episode', () => {
      // The ternary's else branch carries the joint-pain question, so the
      // two can never render together.
      const conditional = src.slice(src.indexOf('hasActiveEpisode ?'));
      const restrictionIdx = conditional.indexOf('How did you get on training around your temporary change?');
      const jointIdx = conditional.indexOf('Any joint or tendon pain?');
      expect(restrictionIdx).toBeGreaterThan(-1);
      expect(jointIdx).toBeGreaterThan(restrictionIdx);
    });

    it('an overdue restriction adds the close-it hint to the question (2026-08-21)', () => {
      expect(src.includes('episodeOverdue')).toBe(true);
      expect(src).toContain("This has been going longer than you expected. If you're done with it, you can end it under How you train.");
      // Detection uses the real status machine, not a re-derived clock rule.
      expect(/constraintStatus\(r,\s*Date\.now\(\)\)\s*===\s*EPISODE_STATUS\.AWAITING_CONFIRMATION/.test(src)).toBe(true);
    });
  });

  describe('j. weekly-answer note consumer — both directions, fine inert (2026-08-21)', () => {
    const baseInputs = {
      checkin: { energyScore: 3, sorenessScore: 2 },
      morningWeights: [],
      sessionsCompleted: 3,
      sessionsPlanned: 3,
      prsThisWeek: 0,
      goalPhase: 'maint',
      weeksInPhase: 4,
      consecutiveOffTargetWeeks: 0,
      consecutivePoorRecoveryWeeks: 0,
      sex: 'male',
      targetKcal: 2500,
      userProfile: { ffm: 80 },
    };
    const withAnswer = (weeklyAnswer) => runWeeklyCoach({
      ...baseInputs,
      physicalConstraint: {
        active: true,
        affectedMuscles: ['chest'],
        excusedThisWeek: 1,
        weeklyAnswer,
      },
    });

    it('"in the way" appends the adjust suggestion', () => {
      const out = withAnswer(CAPABILITY_WEEK_ANSWER.IN_THE_WAY);
      expect(out.adjustments.training.note).toContain('you can adjust it under How you train');
      expect(out.adjustments.training.note).not.toContain('you can end it under How you train');
    });

    it('"mostly didn\'t come up" appends the close suggestion', () => {
      const out = withAnswer(CAPABILITY_WEEK_ANSWER.NOT_RELEVANT);
      expect(out.adjustments.training.note).toContain("If you're done with it, you can end it under How you train");
      expect(out.adjustments.training.note).not.toContain('you can adjust it under How you train');
    });

    it('"fine" and no answer change nothing', () => {
      for (const answer of [CAPABILITY_WEEK_ANSWER.FINE, null]) {
        const out = withAnswer(answer);
        // Read the REAL field (adjustments.training.note is always a
        // string), so this can never pass vacuously on a wrong key.
        expect(typeof out.adjustments.training.note).toBe('string');
        expect(out.adjustments.training.note).not.toContain('You said');
      }
    });

    it('the suggestion reaches data-hold weeks too (no weigh-ins - the path that hid it)', () => {
      // Found while building this: the original consumer lived only on
      // the full-data path, so a user without regular weigh-ins never saw
      // either suggestion. Now applied at every note-bearing return.
      const out = withAnswer(CAPABILITY_WEEK_ANSWER.NOT_RELEVANT);
      expect(out.adjustments.training.note).toContain("If you're done with it, you can end it under How you train");
      const inWay = withAnswer(CAPABILITY_WEEK_ANSWER.IN_THE_WAY);
      expect(inWay.adjustments.training.note).toContain('you can adjust it under How you train');
    });

    it('suggestions never change a number: decisions identical across answers', () => {
      const a = withAnswer(CAPABILITY_WEEK_ANSWER.NOT_RELEVANT);
      const b = withAnswer(CAPABILITY_WEEK_ANSWER.FINE);
      expect(a.adjustments.training.signal).toEqual(b.adjustments.training.signal);
      expect(a.adjustments.calories).toEqual(b.adjustments.calories);
      expect(a.deloadSuggested).toEqual(b.deloadSuggested);
    });
  });
});
