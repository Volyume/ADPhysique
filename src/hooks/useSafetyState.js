/**
 * useSafetyState: the hook form of src/lib/safetyState.js (D228 item 2).
 *
 * Starts in the UNKNOWN (suppressed) state, resolves both reads, and reads
 * them again every time the enclosing screen regains focus, exactly as
 * usePhotoSuppression does (S7-5): a verdict taken before calm was switched
 * on or a flag was raised elsewhere must not outlive the next focus. The
 * SCOFF score comes from the store's profile so Today and the You tab can
 * read `scoffPositive` without a read of their own.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import { readSafetyState, SAFETY_STATE_UNKNOWN } from '../lib/safetyState';

const NoNavigationContext = createContext(null);

export default function useSafetyState(explicitUserId) {
  const storeUserId = useAppStore((s) => s.user?.id);
  const scoffScore = useAppStore((s) => s.userProfile?.scoffScore);
  const userId = explicitUserId ?? storeUserId;
  const navigation = useContext(NavigationContext ?? NoNavigationContext);
  const [state, setState] = useState(SAFETY_STATE_UNKNOWN);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      const next = await readSafetyState(userId, { scoffScore }).catch(() => SAFETY_STATE_UNKNOWN);
      if (alive) setState(next);
    };
    read();
    const unsubscribe = typeof navigation?.addListener === 'function'
      ? navigation.addListener('focus', () => { read(); })
      : null;
    return () => {
      alive = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userId, scoffScore, navigation]);

  return state;
}
