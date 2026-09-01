/**
 * Fail-closed account-boundary preflight.
 *
 * An incoming Supabase session must not be published to app state while the
 * previous account still owns SQLite or AsyncStorage. All dependencies are
 * injected so ordering and failure behaviour can be tested without React.
 */
let transitionTail = Promise.resolve();

async function prepareIncomingAccountOnce({
  incomingUid,
  readDeviceOwner,
  verifyFirstAccountClean,
  chooseAccountSwitch,
  beginAccountEpoch,
  quiesceAccountWork,
  wipeNotifications,
  wipeDatabase,
  wipeStorage,
  resetMemory,
  writeDeviceOwner,
}) {
  if (!incomingUid) return { ok: false, reason: 'missing_incoming_user' };

  let previousUid;
  try {
    previousUid = await readDeviceOwner();
  } catch (_) {
    return { ok: false, reason: 'owner_marker_unreadable' };
  }
  if (!previousUid) {
    let firstAccountCheck;
    try { firstAccountCheck = await verifyFirstAccountClean(incomingUid); } catch (_) {
      return { ok: false, reason: 'first_account_check_failed', previousUid: null };
    }
    if (!firstAccountCheck?.ok) {
      return {
        ok: false,
        reason: 'unowned_local_residue',
        step: firstAccountCheck?.step,
        previousUid: null,
      };
    }
    try {
      await writeDeviceOwner(incomingUid);
      if (await readDeviceOwner() !== incomingUid) throw new Error('owner marker mismatch');
    } catch (_) {
      return { ok: false, reason: 'owner_marker_write_failed', previousUid: null };
    }
    return { ok: true, switched: false, initialized: true, previousUid: null };
  }
  if (previousUid === incomingUid) {
    return { ok: true, switched: false, previousUid };
  }

  let choice;
  try {
    choice = await chooseAccountSwitch(previousUid, incomingUid);
  } catch (_) {
    return { ok: false, reason: 'choice_failed', previousUid };
  }
  if (choice !== 'switch') return { ok: false, reason: 'kept_device_data', previousUid };

  // Retire every in-flight write from the previous account before the first
  // destructive operation. A late A response must not re-seed B's device.
  try { beginAccountEpoch(); } catch (_) {
    return { ok: false, reason: 'epoch_failed', previousUid };
  }

  let quiesceResult;
  try { quiesceResult = await quiesceAccountWork(previousUid); } catch (_) {
    return { ok: false, reason: 'account_work_quiesce_failed', previousUid };
  }
  if (!quiesceResult?.ok) {
    return {
      ok: false,
      reason: 'account_work_quiesce_failed',
      step: quiesceResult?.step,
      previousUid,
    };
  }

  let notificationResult;
  try { notificationResult = await wipeNotifications(previousUid); } catch (_) {
    return { ok: false, reason: 'notification_wipe_failed', previousUid };
  }
  if (!notificationResult?.ok) {
    return {
      ok: false,
      reason: 'notification_wipe_failed',
      step: notificationResult?.step,
      previousUid,
    };
  }

  let databaseResult;
  try { databaseResult = await wipeDatabase(previousUid); } catch (_) {
    return { ok: false, reason: 'database_wipe_failed', previousUid };
  }
  if (!databaseResult?.ok) {
    return { ok: false, reason: 'database_wipe_failed', step: databaseResult?.step, previousUid };
  }

  let storageResult;
  try { storageResult = await wipeStorage(); } catch (_) {
    return { ok: false, reason: 'storage_wipe_failed', previousUid };
  }
  if (!storageResult?.ok) {
    return { ok: false, reason: 'storage_wipe_failed', step: storageResult?.step, previousUid };
  }

  try { await resetMemory(previousUid); } catch (_) {
    return { ok: false, reason: 'memory_reset_failed', previousUid };
  }

  // AsyncStorage.clear necessarily removed the owner marker. Re-stamp it and
  // read it back; a write that merely resolves is not proof of isolation.
  try {
    await writeDeviceOwner(incomingUid);
    const confirmedUid = await readDeviceOwner();
    if (confirmedUid !== incomingUid) throw new Error('owner marker mismatch');
  } catch (_) {
    return { ok: false, reason: 'owner_marker_write_failed', previousUid };
  }

  return { ok: true, switched: true, previousUid };
}

/**
 * Serialise the whole account transition, not only individual store wipes.
 * Repeated SIGNED_IN/INITIAL_SESSION/TOKEN_REFRESHED events can otherwise
 * observe the same A marker and concurrently prompt, wipe and stamp B.
 */
export function prepareIncomingAccount(options) {
  const run = transitionTail.then(() => prepareIncomingAccountOnce(options));
  transitionTail = run.catch(() => {});
  return run;
}

export function _resetAccountTransitionQueueForTests() {
  transitionTail = Promise.resolve();
}
