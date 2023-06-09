import { atom, createStore } from 'jotai/vanilla';
import { describe, expect, test, vi } from 'vitest';

import { subAtomWithDispose } from '../store';

describe('subAtomWithDispose', () => {
  test('basic', () => {
    const store = createStore();
    const numAtom = atom(0);
    const fn = vi.fn();
    subAtomWithDispose(store, numAtom, value => {
      expect(value).toBe(store.get(numAtom));
      return () => {
        fn();
      };
    });

    expect(fn).toHaveBeenCalledTimes(0);
    store.set(numAtom, 1);
    expect(fn).toHaveBeenCalledTimes(0);
    store.set(numAtom, 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
