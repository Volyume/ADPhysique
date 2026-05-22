const store = new Map();
module.exports = {
  getItemAsync: jest.fn(k => Promise.resolve(store.get(k) ?? null)),
  setItemAsync: jest.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
  deleteItemAsync: jest.fn(k => { store.delete(k); return Promise.resolve(); }),
};
