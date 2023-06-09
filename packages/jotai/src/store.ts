import { noop } from 'foxact/noop';
import type { Atom, createStore } from 'jotai/vanilla';

type Store = ReturnType<typeof createStore>;

export function subAtomWithDispose<Value>(
  store: Store,
  atom: Atom<Value>,
  callback: (value: Value) => (() => void) | void
) {
  let dispose = noop;
  store.sub(atom, () => {
    dispose();
    dispose = noop;
    const value = store.get(atom);
    const result = callback(value);
    if (result) {
      dispose = result;
    }
  });
}
