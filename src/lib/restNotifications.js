import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PROMPT_KEY = 'volyume_notif_prompt_seen';
const TRAINING_REMINDERS_CHANNEL = 'training-reminders';

export async function ensureNotifChannels() {
  try {
    await Notifications.setNotificationChannelAsync(TRAINING_REMINDERS_CHANNEL, {
      name: 'Training reminders',
      description: 'Reminders on your scheduled training days',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  } catch {}
}

export async function hasSeenNotifPrompt() {
  try {
    const val = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markNotifPromptSeen() {
  try {
    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
  } catch {}
}

export async function getNotifPermissionStatus() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

export async function requestNotifPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Rest timer notifications are disabled — the in-app timer handles feedback.
export async function scheduleRestNotif(_seconds, _exerciseName) {
  return null;
}

export async function cancelRestNotif() {}
