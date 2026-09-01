import {
  prepareIncomingAccount,
  _resetAccountTransitionQueueForTests,
} from '../accountTransitionGuard';

function deps(overrides = {}) {
  let owner = 'account-a';
  const d = {
    incomingUid: 'account-b',
    readDeviceOwner: jest.fn(async () => owner),
    verifyFirstAccountClean: jest.fn(async () => ({ ok: true })),
    chooseAccountSwitch: jest.fn(async () => 'switch'),
    beginAccountEpoch: jest.fn(),
    quiesceAccountWork: jest.fn(async () => ({ ok: true })),
    wipeNotifications: jest.fn(async () => ({ ok: true })),
    wipeDatabase: jest.fn(async () => ({ ok: true })),
    wipeStorage: jest.fn(async () => ({ ok: true })),
    resetMemory: jest.fn(async () => {}),
    writeDeviceOwner: jest.fn(async (uid) => { owner = uid; }),
    ...overrides,
  };
  return d;
}

beforeEach(() => {
  _resetAccountTransitionQueueForTests();
});

describe('prepareIncomingAccount', () => {
  test('same-account entry is non-destructive', async () => {
    const d = deps({ readDeviceOwner: jest.fn(async () => 'account-b') });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: true, switched: false });
    expect(d.chooseAccountSwitch).not.toHaveBeenCalled();
    expect(d.wipeDatabase).not.toHaveBeenCalled();
  });

  test('first-account marker loss cannot admit over unowned local residue', async () => {
    const d = deps({
      readDeviceOwner: jest.fn(async () => null),
      verifyFirstAccountClean: jest.fn(async () => ({ ok: false, step: 'workouts' })),
    });
    expect(await prepareIncomingAccount(d)).toMatchObject({
      ok: false, reason: 'unowned_local_residue', step: 'workouts',
    });
    expect(d.writeDeviceOwner).not.toHaveBeenCalled();
  });

  test('first-account entry stamps and verifies its owner before admission', async () => {
    let owner = null;
    const d = deps({
      readDeviceOwner: jest.fn(async () => owner),
      writeDeviceOwner: jest.fn(async (uid) => { owner = uid; }),
    });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: true, initialized: true });
    expect(d.writeDeviceOwner).toHaveBeenCalledWith('account-b');
    expect(d.wipeDatabase).not.toHaveBeenCalled();
  });

  test('keep never bumps the epoch or touches either store', async () => {
    const d = deps({ chooseAccountSwitch: jest.fn(async () => 'keep') });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: false, reason: 'kept_device_data' });
    expect(d.beginAccountEpoch).not.toHaveBeenCalled();
    expect(d.wipeDatabase).not.toHaveBeenCalled();
    expect(d.wipeStorage).not.toHaveBeenCalled();
  });

  test('switch order retires work and residue before memory reset and owner stamp', async () => {
    const order = [];
    let owner = 'account-a';
    const d = deps({
      readDeviceOwner: jest.fn(async () => { order.push('read'); return owner; }),
      chooseAccountSwitch: jest.fn(async () => { order.push('choose'); return 'switch'; }),
      beginAccountEpoch: jest.fn(() => order.push('epoch')),
      quiesceAccountWork: jest.fn(async () => { order.push('quiesce'); return { ok: true }; }),
      wipeNotifications: jest.fn(async () => { order.push('notifications'); return { ok: true }; }),
      wipeDatabase: jest.fn(async () => { order.push('database'); return { ok: true }; }),
      wipeStorage: jest.fn(async () => { order.push('storage'); return { ok: true }; }),
      resetMemory: jest.fn(async () => { order.push('memory'); }),
      writeDeviceOwner: jest.fn(async (uid) => { order.push('stamp'); owner = uid; }),
    });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: true, switched: true });
    expect(order).toEqual([
      'read', 'choose', 'epoch', 'quiesce', 'notifications',
      'database', 'storage', 'memory', 'stamp', 'read',
    ]);
  });

  test.each([
    ['owner read', { readDeviceOwner: jest.fn(async () => { throw new Error('unreadable'); }) }, 'owner_marker_unreadable'],
    ['epoch', { beginAccountEpoch: jest.fn(() => { throw new Error('no epoch'); }) }, 'epoch_failed'],
    ['sync quiesce', { quiesceAccountWork: jest.fn(async () => ({ ok: false, step: 'sync' })) }, 'account_work_quiesce_failed'],
    ['notifications', { wipeNotifications: jest.fn(async () => ({ ok: false, step: 'notifications' })) }, 'notification_wipe_failed'],
    ['database', { wipeDatabase: jest.fn(async () => ({ ok: false, step: 'photos' })) }, 'database_wipe_failed'],
    ['storage', { wipeStorage: jest.fn(async () => ({ ok: false, step: 'residue' })) }, 'storage_wipe_failed'],
    ['memory', { resetMemory: jest.fn(async () => { throw new Error('residue'); }) }, 'memory_reset_failed'],
  ])('%s failure is closed', async (_label, override, reason) => {
    const d = deps(override);
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: false, reason });
    expect(d.writeDeviceOwner).not.toHaveBeenCalled();
  });

  test('a marker write that does not persist is rejected', async () => {
    const d = deps({ writeDeviceOwner: jest.fn(async () => {}) });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: false, reason: 'owner_marker_write_failed' });
  });

  test('simultaneous repeated sign-ins serialize the destructive transition', async () => {
    let owner = 'account-a';
    let releaseWipe;
    const wipeGate = new Promise((resolve) => { releaseWipe = resolve; });
    const d = deps({
      readDeviceOwner: jest.fn(async () => owner),
      wipeDatabase: jest.fn(async () => { await wipeGate; return { ok: true }; }),
      writeDeviceOwner: jest.fn(async (uid) => { owner = uid; }),
    });
    const first = prepareIncomingAccount(d);
    const second = prepareIncomingAccount(d);
    await Promise.resolve();
    releaseWipe();
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ ok: true, switched: true }),
      expect.objectContaining({ ok: true, switched: false }),
    ]);
    expect(d.wipeDatabase).toHaveBeenCalledTimes(1);
    expect(d.resetMemory).toHaveBeenCalledTimes(1);
  });

  test('A to B to A transitions execute in request order without mixed ownership', async () => {
    let owner = 'account-a';
    const common = {
      verifyFirstAccountClean: jest.fn(async () => ({ ok: true })),
      chooseAccountSwitch: jest.fn(async () => 'switch'),
      beginAccountEpoch: jest.fn(),
      quiesceAccountWork: jest.fn(async () => ({ ok: true })),
      wipeNotifications: jest.fn(async () => ({ ok: true })),
      wipeDatabase: jest.fn(async () => ({ ok: true })),
      wipeStorage: jest.fn(async () => ({ ok: true })),
      resetMemory: jest.fn(async () => {}),
      readDeviceOwner: jest.fn(async () => owner),
      writeDeviceOwner: jest.fn(async (uid) => { owner = uid; }),
    };
    const toB = prepareIncomingAccount({ ...common, incomingUid: 'account-b' });
    const toA = prepareIncomingAccount({ ...common, incomingUid: 'account-a' });
    await expect(Promise.all([toB, toA])).resolves.toEqual([
      expect.objectContaining({ ok: true, previousUid: 'account-a' }),
      expect.objectContaining({ ok: true, previousUid: 'account-b' }),
    ]);
    expect(owner).toBe('account-a');
  });
});
