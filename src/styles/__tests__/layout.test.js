import { touchTarget, workoutLoggerSize } from '../layout';

describe('layout sizing policy', () => {
  test('workout logger keeps a stable phone density instead of viewport-scaling controls', () => {
    expect(touchTarget.minimum).toBe(44);
    expect(touchTarget.android).toBe(48);
    expect(workoutLoggerSize.primaryActionMinHeight).toBe(touchTarget.minimum);
    expect(workoutLoggerSize.headerButtonMin).toBe(touchTarget.minimum);
    expect(workoutLoggerSize.overflowButton).toBe(touchTarget.minimum);
  });

  test('set-entry visual controls stay compact but governed by one token', () => {
    expect(workoutLoggerSize.setEntryLabelWidth).toBe(80);
    expect(workoutLoggerSize.setEntryStepperButton).toBe(36);
    expect(workoutLoggerSize.setEntryStepperButton).toBeLessThan(touchTarget.minimum);
  });
});
