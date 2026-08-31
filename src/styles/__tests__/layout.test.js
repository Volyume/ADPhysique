import { touchTarget, workoutLoggerSize } from '../layout';

describe('layout sizing policy', () => {
  test('workout logger keeps a stable phone density instead of viewport-scaling controls', () => {
    // 48dp: Material 3's floor, the figure docs/DESIGN_SYSTEM.md mandates, and
    // the right number for an Android-primary product. It was 44 (the iOS
    // figure) while `android: 48` sat unreferenced by any app code. Asserting
    // they AGREE is the point of the second line now -- it is what stops the
    // two-number split silently coming back.
    expect(touchTarget.minimum).toBe(48);
    expect(touchTarget.android).toBe(48);
    expect(touchTarget.minimum).toBe(touchTarget.android);
    expect(workoutLoggerSize.primaryActionMinHeight).toBe(touchTarget.minimum);
    expect(workoutLoggerSize.headerButtonMin).toBe(touchTarget.minimum);
    expect(workoutLoggerSize.overflowButton).toBe(touchTarget.minimum);
  });

  test('set-entry visual controls stay compact but governed by one token', () => {
    expect(workoutLoggerSize.setEntryLabelWidth).toBe(96);
    expect(workoutLoggerSize.setEntryStepperButton).toBe(36);
    expect(workoutLoggerSize.setEntryStepperButton).toBeLessThan(touchTarget.minimum);
  });
});
