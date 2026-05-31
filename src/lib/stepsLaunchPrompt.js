/**
 * stepsLaunchPrompt: decide whether to prompt for the steps connection on
 * launch, and run that prompt.
 *
 * The brief: a signed-in user who hasn't connected their daily steps should
 * be asked once, with a real system permission sheet, the next time they open
 * the app. They should not have to dig into Settings and hit a dead "permission
 * needed" message. If Health Connect itself isn't set up on the phone, send
 * them to install it rather than showing a refusal they can't act on.
 *
 * The decision is a pure function (shouldShowStepsPrompt) so it can be unit
 * tested without a device. The runner (maybePromptStepsConnect) wires the
 * decision to AsyncStorage, the permission layer, and a single Alert.
 *
 * We prompt at most once per install. The flag flips the moment we show the
 * prompt, whatever the user answers: a launch prompt that reappears every
 * cold start is the opposite of the calm, no-nag behaviour Volyume promises.
 * Settings still lets them connect later if they tap "Not now".
 *
 * Voice rules: CLAUDE.md. No em dashes; plain spoken; British English.
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One flag per install (not per user): the prompt is about the device's
// health connection, which is shared across any accounts on the phone.
export const STEPS_PROMPT_KEY = '@volyume_steps_launch_prompt_shown';

/**
 * Pure decision: should the launch prompt show?
 *
 *   sourceAvailable   the platform health module loaded (HealthKit / Health Connect)
 *   firstRunComplete  the user has finished onboarding (don't interrupt setup)
 *   stepsEnabled      the user hasn't switched the steps feature off
 *   permissionStatus  'granted' | 'denied' | 'undetermined' | 'sdk_unavailable' | 'unavailable'
 *   alreadyPrompted   we've shown this launch prompt before on this install
 *
 * We prompt only when steps are wanted, the source exists, we've never asked,
 * and the permission isn't already granted. A prior in-OS 'denied' still lets
 * the first launch prompt through once (alreadyPrompted gates repeats), since
 * the user may never have seen our ask, only a silent background read.
 */
export function shouldShowStepsPrompt({
  sourceAvailable,
  firstRunComplete,
  stepsEnabled,
  permissionStatus,
  alreadyPrompted,
}) {
  if (!sourceAvailable) return false;
  if (!firstRunComplete) return false;
  if (stepsEnabled === false) return false;
  if (alreadyPrompted) return false;
  if (permissionStatus === 'granted') return false;
  return true;
}

export async function wasStepsPromptShown() {
  try {
    return (await AsyncStorage.getItem(STEPS_PROMPT_KEY)) === 'true';
  } catch (_) {
    // If we can't read the flag, err on the side of not nagging.
    return true;
  }
}

export async function markStepsPromptShown() {
  try {
    await AsyncStorage.setItem(STEPS_PROMPT_KEY, 'true');
  } catch (_) { /* best effort; a repeat prompt is better than a crash */ }
}

/**
 * Run the launch prompt if the conditions hold. Safe to call on every cold
 * start: it self-gates and never throws. Pass the user id (for the immediate
 * read after granting) and whether the user has steps switched on + finished
 * first run, both of which the caller already has in the store.
 *
 *   userId            current local user id (may be null; the read no-ops)
 *   firstRunComplete  from the store
 *   stepsEnabled      from the store (userProfile.stepsEnabled !== false)
 *
 * Returns 'shown' | 'skipped'. Never throws.
 */
export async function maybePromptStepsConnect({ userId, firstRunComplete, stepsEnabled } = {}) {
  try {
    // eslint-disable-next-line global-require
    const activitySteps = require('./activitySteps');

    const sourceAvailable = await activitySteps.isStepSourceAvailable();
    const alreadyPrompted = await wasStepsPromptShown();
    const permissionStatus = await activitySteps.getStepPermissionStatus();

    const show = shouldShowStepsPrompt({
      sourceAvailable,
      firstRunComplete,
      stepsEnabled,
      permissionStatus,
      alreadyPrompted,
    });
    if (!show) return 'skipped';

    // Flip the flag before showing, so a force-quit mid-prompt can't make it
    // reappear on the next launch.
    await markStepsPromptShown();

    Alert.alert(
      'Track steps and weight?',
      'Volyume can read your daily steps and bodyweight from your watch, phone, scale or tracker, so your step target, weight log and check-ins stay accurate without typing them in. You can change this any time in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async () => {
            try {
              // One sheet for steps and weight. On a grant this records today's
              // steps and imports any new weight straight away.
              const status = await activitySteps.connectHealthStepsAndWeight(userId);
              if (status === 'sdk_unavailable') {
                // eslint-disable-next-line global-require
                const { openHealthConnectInstall } = require('./health');
                Alert.alert(
                  'Health Connect needed',
                  'Volyume reads your steps and weight through Health Connect. It isn\'t set up on this phone yet. Install or update it, then connect from Settings.',
                  [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Get Health Connect', onPress: () => { openHealthConnectInstall(); } },
                  ],
                );
              }
              // 'denied' / 'unavailable': stay quiet. The user can retry from
              // Settings; we don't nag on a launch prompt.
            } catch (_) { /* never block launch on a permission flow */ }
          },
        },
      ],
    );
    return 'shown';
  } catch (_) {
    return 'skipped';
  }
}
