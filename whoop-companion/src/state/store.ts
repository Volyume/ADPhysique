/**
 * Minimal observable store + React hook (useSyncExternalStore). Avoids pulling
 * in a state-management dependency for this private app while still giving the
 * UI a single source of truth that the sync layer updates.
 */

import { useSyncExternalStore } from 'react';

export class Store<T> {
  private state: T;
  private listeners = new Set<() => void>();

  constructor(initial: T) {
    this.state = initial;
  }

  getState = (): T => this.state;

  setState = (patch: Partial<T> | ((prev: T) => Partial<T>)): void => {
    const next = typeof patch === 'function' ? (patch as (p: T) => Partial<T>)(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export function useStoreSelector<T, S>(store: Store<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
