/**
 * D228 addendum Q4-A: a style-tagged plan (kettlebell, circuit, band) keeps its
 * own workouts at the block boundary, so the advisor gives it NO structural
 * verdict. PlansScreen shows the verdict card from `programmeReview.copy`; a
 * "worth rebuilding" or "changes recommended" card on a plan whose next block
 * is its own workouts would describe changes that are never made.
 *
 * Runs the real getBlockAdvice -> buildProgrammeReview over a mocked database.
 * The control case (an ordinary plan) proves the guard, and not a failed read,
 * is what ends the style plan's review early.
 */
jest.mock('../database', () => ({
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getActivePlan: jest.fn(),
  getAllProgrammes: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllMesocycles: jest.fn(),
  getAllExercises: jest.fn(),
}));
jest.mock('../mesocycle', () => ({
  ...jest.requireActual('../mesocycle'),
  getBlockStatus: jest.fn(),
}));

import { getBlockAdvice } from '../blockAdvisor';
import {
  getRecentCheckins, getRecentCompletedWorkouts, getActivePlan, getAllProgrammes,
  getRoutinesForPlan, getRoutineExercisesWithDetails, getAllMesocycles, getAllExercises,
} from '../database';
import { getBlockStatus } from '../mesocycle';

const block = { id: 'b1', startDate: Date.now() - 40 * 86400000, plannedWeeks: 6 };
const finishedStatus = {
  status: 'completed_awaiting_decision', currentWeek: 6, totalWeeks: 6,
  recoveryWeek: 6, weeksOverdue: 0, awaitingDecision: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  getRecentCheckins.mockResolvedValue([]);
  getRecentCompletedWorkouts.mockResolvedValue([]);
  getBlockStatus.mockReturnValue(finishedStatus);
  getAllProgrammes.mockResolvedValue([]);
  getAllMesocycles.mockResolvedValue([]);
  getAllExercises.mockResolvedValue([]);
  getRoutinesForPlan.mockResolvedValue([]);
  getRoutineExercisesWithDetails.mockResolvedValue([]);
});

describe('Q4-A: no structural verdict for a style plan at the block boundary', () => {
  test.each([
    ['kettlebell', 'library style:kettlebell_foundations'],
    ['circuit', 'style:circuit_full_body'],
    ['band', 'style:band'],
  ])('a %s plan: the review ends before any routine is read, and no verdict card is offered', async (_name, tags) => {
    getActivePlan.mockResolvedValue({ id: 'p1', name: 'Kettlebell plan', tags });
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
    expect(advice.action).toBe('post_recovery');
    expect(advice.programmeReview).toBeNull();
    expect(getActivePlan).toHaveBeenCalled();
    expect(getRoutinesForPlan).not.toHaveBeenCalled();
    expect(getRoutineExercisesWithDetails).not.toHaveBeenCalled();
  });

  test('control: an ordinary plan still goes on to read its routines (the guard, not a failed read, ends the style plan\'s review)', async () => {
    getActivePlan.mockResolvedValue({ id: 'p2', name: 'My plan', tags: 'hypertrophy upper_lower' });
    await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
    expect(getRoutinesForPlan).toHaveBeenCalledWith('p2');
  });

  test('control: a plan with no tags at all is an ordinary plan', async () => {
    getActivePlan.mockResolvedValue({ id: 'p3', name: 'My plan' });
    await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
    expect(getRoutinesForPlan).toHaveBeenCalledWith('p3');
  });

  test('the volume recommendation is unaffected: the card still offers both options\' evidence', async () => {
    getActivePlan.mockResolvedValue({ id: 'p1', tags: 'style:kettlebell_foundations' });
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
    expect(advice.nextBlock).toBeTruthy();
    expect(typeof advice.headline).toBe('string');
  });
});
