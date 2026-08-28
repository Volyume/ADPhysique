import { prepareIncomingAccount } from '../accountTransitionGuard';

function deps(overrides = {}) {
  let owner = 'account-a';
  const d = {
    incomingUid: 'account-b',
    readDeviceOwner: jest.fn(async () => owner),
    chooseAccountSwitch: jest.fn(async () => 'switch'),
    beginAccountEpoch: jest.fn(),
    wipeDatabase: jest.fn(async () => ({ ok: true })),
    wipeStorage: jest.fn(async () => ({ ok: true })),
    writeDeviceOwner: jest.fn(async (uid) => { owner = uid; }),
    ...overrides,
  };
  return d;
}

describe('prepareIncomingAccount', () => {
  test('same-account entry is non-destructive', async () => {
    const d = deps({ readDeviceOwner: jest.fn(async () => 'account-b') });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: true, switched: false });
    expect(d.chooseAccountSwitch).not.toHaveBeenCalled();
    expect(d.wipeDatabase).not.toHaveBeenCalled();
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

  test('switch order is epoch, verified database wipe, storage wipe, owner stamp', async () => {
    const order = [];
    let owner = 'account-a';
    const d = deps({
      readDeviceOwner: jest.fn(async () => { order.push('read'); return owner; }),
      chooseAccountSwitch: jest.fn(async () => { order.push('choose'); return 'switch'; }),
      beginAccountEpoch: jest.fn(() => order.push('epoch')),
      wipeDatabase: jest.fn(async () => { order.push('database'); return { ok: true }; }),
      wipeStorage: jest.fn(async () => { order.push('storage'); return { ok: true }; }),
      writeDeviceOwner: jest.fn(async (uid) => { order.push('stamp'); owner = uid; }),
    });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: true, switched: true });
    expect(order).toEqual(['read', 'choose', 'epoch', 'database', 'storage', 'stamp', 'read']);
  });

  test.each([
    ['owner read', { readDeviceOwner: jest.fn(async () => { throw new Error('unreadable'); }) }, 'owner_marker_unreadable'],
    ['epoch', { beginAccountEpoch: jest.fn(() => { throw new Error('no epoch'); }) }, 'epoch_failed'],
    ['database', { wipeDatabase: jest.fn(async () => ({ ok: false, step: 'photos' })) }, 'database_wipe_failed'],
    ['storage', { wipeStorage: jest.fn(async () => ({ ok: false, step: 'residue' })) }, 'storage_wipe_failed'],
  ])('%s failure is closed', async (_label, override, reason) => {
    const d = deps(override);
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: false, reason });
    expect(d.writeDeviceOwner).not.toHaveBeenCalled();
  });

  test('a marker write that does not persist is rejected', async () => {
    const d = deps({ writeDeviceOwner: jest.fn(async () => {}) });
    expect(await prepareIncomingAccount(d)).toMatchObject({ ok: false, reason: 'owner_marker_write_failed' });
  });
});
