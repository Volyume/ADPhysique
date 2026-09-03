/**
 * planSwitch: activating a plan is always an explicit choice (D139).
 *
 * The defect this suite exists to lock out: `if (status.currentWeek <= 1)
 * return true;` made the ONE moment where a plan is replaced with nothing yet
 * lost also the one moment where nothing was said. A user in week 1 of a
 * block had their block silently restarted by every activation path.
 *
 * Silence is now reserved for "there is no block at all". With a block in
 * week 1 the athlete gets the same first-activation dialogue PlansScreen
 * writes, in the same words, and Cancel means cancel.
 *
 * Every other branch (mid-block, recovery week, open decision) keeps its own
 * message and is pinned here too, so this extraction cannot quietly reword
 * them.
 */

jest.mock('../database', () => ({ getActiveBlock: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));

const { getActiveBlock } = require('../database');
const { appAlert } = require('../../components/AppAlert');
const { confirmPlanSwitchMidBlock, readActiveBlockStatus } = require('../planSwitch');
const { BLOCK_START_SENTENCE, ACTIVATION_MEANING_SENTENCE } = require('../blockExplain');

const DAY = 86400000;
const weeksAgo = (n) => Date.now() - (n * 7 * DAY);

// Answer the next dialogue by pressing the button whose text matches.
function answerWith(text) {
  appAlert.mockImplementation((title, body, buttons) => {
    const btn = buttons.find(b => b.text === text);
    if (!btn) throw new Error(`no button "${text}" in [${buttons.map(b => b.text).join(', ')}]`);
    btn.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('no block means no dialogue', () => {
  test('proceeds silently with no user', async () => {
    await expect(confirmPlanSwitchMidBlock(null, {})).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('proceeds silently when there is no active block', async () => {
    getActiveBlock.mockResolvedValue(null);
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('proceeds silently when the block cannot be read', async () => {
    getActiveBlock.mockRejectedValue(new Error('db down'));
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('week 1 with a block: the first-activation dialogue, not silence', () => {
  beforeEach(() => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(0), plannedWeeks: 6 });
  });

  test('asks, in PlansScreen\'s own wording', async () => {
    answerWith('Set as active');
    await expect(confirmPlanSwitchMidBlock('u1', { newPlanName: 'Upper / Lower' })).resolves.toBe(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = appAlert.mock.calls[0];
    expect(title).toBe('Make this your active plan?');
    expect(body).toBe(`${BLOCK_START_SENTENCE} ${ACTIVATION_MEANING_SENTENCE}`);
    expect(buttons.map(b => b.text)).toEqual(['Cancel', 'Set as active']);
  });

  test('Cancel means cancel: the caller is told not to proceed', async () => {
    answerWith('Cancel');
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(false);
  });

  test('dismissing the dialogue is a no', async () => {
    appAlert.mockImplementation((title, body, buttons, options) => options.onDismiss());
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(false);
  });
});

describe('the other branches keep their own honest message', () => {
  test('mid-block names the week it is restarting', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(2), plannedWeeks: 6 });
    answerWith('Switch plan');
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild' })).resolves.toBe(true);
    const [title, body] = appAlert.mock.calls[0];
    expect(title).toBe('Restart your training block?');
    expect(body).toContain('week 3 of 6');
    expect(body).toContain('Re-running the wizard creates a new plan and starts a fresh block from week 1.');
    expect(body).toContain('Your workout history and PRs are kept.');
  });

  test('an activation names the plan it is activating', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(2), plannedWeeks: 6 });
    answerWith('Switch plan');
    await confirmPlanSwitchMidBlock('u1', { newPlanName: 'Push Pull Legs' });
    expect(appAlert.mock.calls[0][1]).toContain('Activating "Push Pull Legs" starts a fresh block from week 1.');
  });

  test('the open block decision gets its own dialogue, not silence', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(7), plannedWeeks: 6 });
    answerWith('Cancel');
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(false);
    expect(appAlert.mock.calls[0][0]).toBe('Skip the open block decision?');
  });
});

describe('readActiveBlockStatus', () => {
  test('reads the block the confirm reads, so a preview cannot disagree with it', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(2), plannedWeeks: 6 });
    const status = await readActiveBlockStatus('u1');
    expect(status.currentWeek).toBe(3);
    expect(status.totalWeeks).toBe(6);
    expect(status.status).toBe('active');
  });

  test('falls back to durationWeeks, and returns null when there is nothing to read', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(1), durationWeeks: 4 });
    expect((await readActiveBlockStatus('u1')).totalWeeks).toBe(4);
    getActiveBlock.mockResolvedValue(null);
    expect(await readActiveBlockStatus('u1')).toBeNull();
    getActiveBlock.mockRejectedValue(new Error('db down'));
    expect(await readActiveBlockStatus('u1')).toBeNull();
    expect(await readActiveBlockStatus(null)).toBeNull();
  });
});

describe('D140: a rebuild that keeps every exercise keeps the block, and asks nothing', () => {
  test('mid-block with keepBlock proceeds silently', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(2), plannedWeeks: 6 });
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild', keepBlock: true })).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('week 1 with keepBlock proceeds silently too (nothing block-level is lost)', async () => {
    getActiveBlock.mockResolvedValue({ startDate: Date.now(), plannedWeeks: 6 });
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild', keepBlock: true })).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('the recovery week with keepBlock proceeds silently', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(5), plannedWeeks: 6 });
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild', keepBlock: true })).resolves.toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('a finished block is never kept: keepBlock still gets the open-decision dialogue', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(7), plannedWeeks: 6 });
    answerWith('Cancel');
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild', keepBlock: true })).resolves.toBe(false);
    expect(appAlert.mock.calls[0][0]).toBe('Skip the open block decision?');
  });

  test('without keepBlock the mid-block restart dialogue is unchanged', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(2), plannedWeeks: 6 });
    answerWith('Cancel');
    await expect(confirmPlanSwitchMidBlock('u1', { mode: 'rebuild', keepBlock: false })).resolves.toBe(false);
    expect(appAlert.mock.calls[0][0]).toBe('Restart your training block?');
  });
});

describe('D140: the recovery week gets its own dialogue (the branch matched the wrong status string)', () => {
  test('a switch in the recovery week asks, and Cancel means cancel', async () => {
    // getBlockStatus reports the final week as 'recovery'; the branch used
    // to test 'in_recovery' (blockAdvisor's action name) and never fired.
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(5), plannedWeeks: 6 });
    answerWith('Cancel');
    await expect(confirmPlanSwitchMidBlock('u1', { newPlanName: 'Push Pull Legs' })).resolves.toBe(false);
    const [title, body] = appAlert.mock.calls[0];
    expect(title).toBe('Switch during your recovery week?');
    expect(body).toContain("You're in your recovery week.");
    expect(body).toContain('on "Push Pull Legs"');
    expect(body).toContain('Your workout history and PRs are kept.');
  });

  test('the recovery-week dialogue can be accepted', async () => {
    getActiveBlock.mockResolvedValue({ startDate: weeksAgo(5), plannedWeeks: 6 });
    answerWith('Switch plan');
    await expect(confirmPlanSwitchMidBlock('u1', {})).resolves.toBe(true);
  });
});
