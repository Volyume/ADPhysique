/**
 * Tactile feedback. A single haptics helper wraps expo-haptics and fails safe
 * (never throws) so a platform without haptics simply does nothing. WHOOP leans
 * heavily on subtle haptics; these give the app the same physical feel.
 */
import * as Haptics from 'expo-haptics';

function safe(run: () => Promise<unknown>): void {
  try {
    void run().catch(() => {});
  } catch {
    // Older devices / web: silently no-op.
  }
}

/** Light selection tick for taps on cards, tiles, rows and buttons. */
export function tapHaptic(): void {
  safe(() => Haptics.selectionAsync());
}

/** A slightly firmer press for primary actions. */
export function impactHaptic(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Success / warning notifications for outcome moments. */
export function successHaptic(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warnHaptic(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
