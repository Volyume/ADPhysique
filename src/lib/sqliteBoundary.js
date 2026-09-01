const BINDING_METHODS = new Set(['runAsync', 'getFirstAsync', 'getAllAsync', 'getEachAsync']);

function assertBindingValue(value, path) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new TypeError(`Unsafe SQLite numeric binding at ${path}`);
    }
    return;
  }
  if (value instanceof Uint8Array) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertBindingValue(entry, `${path}[${index}]`));
    return;
  }
  if (Object.prototype.toString.call(value) === '[object Object]') {
    for (const [key, entry] of Object.entries(value)) assertBindingValue(entry, `${path}.${key}`);
    return;
  }
  // Date (including Invalid Date), boxed numbers, functions and arbitrary
  // host objects are not SQLite bind primitives. Reject them in JS rather than
  // relying on a platform-specific native conversion.
  throw new TypeError(`Unsupported SQLite binding at ${path}`);
}

export function assertSafeSqliteBindings(args) {
  for (let index = 1; index < args.length; index += 1) {
    assertBindingValue(args[index], `arg${index}`);
  }
}

/**
 * Last-resort guard for every app query, including sibling paths not carrying
 * their own domain validator. Domain writers still reject numeric strings,
 * negative values and narrower bounds before this point; this choke point
 * prevents JS-only NaN/Infinity/huge-finite values reaching native SQLite.
 */
export function guardSqliteConnection(connection) {
  if (!connection || connection.__volyumeSqliteBoundaryGuard) return connection;
  const methodCache = new Map();
  return new Proxy(connection, {
    get(target, property, receiver) {
      if (property === '__volyumeSqliteBoundaryGuard') return true;
      const member = Reflect.get(target, property, receiver);
      if (typeof member !== 'function') return member;
      if (methodCache.has(property)) return methodCache.get(property);
      // A function Proxy preserves attached APIs such as Jest mockReset /
      // mockResolvedValueOnce while still forcing the native connection as
      // `this`. A plain closure silently stripped those properties and made
      // the guarded connection observably incompatible with the real one.
      const wrapped = new Proxy(member, {
        apply(fn, _thisArg, args) {
          if (BINDING_METHODS.has(property)) assertSafeSqliteBindings(args);
          return Reflect.apply(fn, target, args);
        },
        get(fn, key) {
          const value = Reflect.get(fn, key, fn);
          return typeof value === 'function' ? value.bind(fn) : value;
        },
      });
      methodCache.set(property, wrapped);
      return wrapped;
    },
  });
}
