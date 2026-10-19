/**
 * Pins useCoachingSetUp (founder brief 2026-10-19): a profile with
 * coachingDeferred true is NOT set up; every other profile is (so every
 * existing user is unchanged). openCoachingSetup goes through the cross-tab
 * helper to the CoachingSetup route in ProfileStack.
 */
import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import useCoachingSetUp, { openCoachingSetup } from '../useCoachingSetUp';

jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
const { navigateCrossTab } = require('../../navigation/navigateCrossTab');

function read(profile) {
  act(() => { useAppStore.setState({ userProfile: profile }); });
  let out;
  function Probe() { out = useCoachingSetUp(); return null; }
  act(() => { create(<Probe />); });
  return out;
}

describe('useCoachingSetUp', () => {
  it('is false only for a deferred quick-start profile', () => {
    expect(read({ coachingDeferred: true })).toBe(false);
  });
  it('is true for everything else', () => {
    expect(read({ coachingDeferred: false })).toBe(true);
    expect(read({ sex: 'male' })).toBe(true);
    expect(read(null)).toBe(true);
  });
  it('opens CoachingSetup in the Coach tab', () => {
    const nav = {};
    openCoachingSetup(nav);
    expect(navigateCrossTab).toHaveBeenCalledWith(nav, 'ProfileTab', 'CoachingSetup');
  });
});
