const store = new Map();
module.exports = {
  __esModule: true,
  default: {
    getItem: jest.fn(k => Promise.resolve(store.get(k) ?? null)),
    setItem: jest.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
    removeItem: jest.fn(k => { store.delete(k); return Promise.resolve(); }),
    clear: jest.fn(() => { store.clear(); return Promise.resolve(); }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
    multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, store.get(k) ?? null]))),
    multiSet: jest.fn(pairs => { for (const [k, v] of pairs) store.set(k, v); return Promise.resolve(); }),
    multiRemove: jest.fn(keys => { for (const k of keys) store.delete(k); return Promise.resolve(); }),
  },
  __store: store,
};
