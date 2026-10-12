/**
 * trainingStatus (D226): the private natural / enhanced status. Pins: natural
 * by default, natural on a read failure, an enhanced round trip through the
 * secure store only (never AsyncStorage), natural removes the value, clear
 * removes it and never throws, and gainCeilingFor yields a number only for
 * enhanced.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainingStatus, setTrainingStatus, clearTrainingStatus, gainCeilingFor, TRAINING_STATUS, ENHANCED_GAIN_CEILING_PCT } from '../trainingStatus';

describe('trainingStatus', () => {
  beforeEach(async () => { await clearTrainingStatus(); jest.clearAllMocks(); });

  test('defaults to natural', async () => {
    expect(await getTrainingStatus()).toBe(TRAINING_STATUS.NATURAL);
  });
  test('a read failure is natural', async () => {
    SecureStore.getItemAsync.mockImplementationOnce(() => Promise.reject(new Error('locked')));
    expect(await getTrainingStatus()).toBe(TRAINING_STATUS.NATURAL);
  });
  test('enhanced round trips, in the secure store only', async () => {
    await setTrainingStatus(TRAINING_STATUS.ENHANCED);
    expect(await getTrainingStatus()).toBe(TRAINING_STATUS.ENHANCED);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await setTrainingStatus(TRAINING_STATUS.NATURAL);
    expect(await getTrainingStatus()).toBe(TRAINING_STATUS.NATURAL);
  });
  test('clear removes it and never throws', async () => {
    await setTrainingStatus(TRAINING_STATUS.ENHANCED);
    await clearTrainingStatus();
    expect(await getTrainingStatus()).toBe(TRAINING_STATUS.NATURAL);
    SecureStore.deleteItemAsync.mockImplementationOnce(() => Promise.reject(new Error('x')));
    await expect(clearTrainingStatus()).resolves.toBeUndefined();
  });
  test('gainCeilingFor', () => {
    expect(gainCeilingFor(TRAINING_STATUS.ENHANCED)).toBe(ENHANCED_GAIN_CEILING_PCT);
    expect(gainCeilingFor(TRAINING_STATUS.NATURAL)).toBeNull();
    expect(gainCeilingFor(undefined)).toBeNull();
  });
});
