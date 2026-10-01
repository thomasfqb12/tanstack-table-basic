import { shallow, useSelector } from '@tanstack/react-store'
import type { AnyTable } from './types'

type FeatureKey =
  | 'rowSelectionFeature'
  | 'rowExpandingFeature'
  | 'rowSortingFeature'
  | 'columnSizingFeature'
  | 'columnResizingFeature'
  | 'columnVisibilityFeature'

export function hasFeature(table: AnyTable, feature: FeatureKey): boolean {
  return Boolean((table._features as Record<string, unknown>)[feature])
}

/**
 * Atoms are typed as always present, but only registered features have one.
 */
export function readAtom<TKey extends keyof AnyTable['atoms']>(
  table: AnyTable,
  key: TKey,
): ReturnType<AnyTable['atoms'][TKey]['get']> | undefined {
  const atom = table.atoms[key] as AnyTable['atoms'][TKey] | undefined
  return atom?.get()
}

interface Source<T> {
  get: () => T
  subscribe: (listener: (value: T) => void) => { unsubscribe: () => void }
}

const EMPTY_SOURCE: Source<undefined> = {
  get: () => undefined,
  subscribe: () => ({ unsubscribe: () => {} }),
}

/**
 * Subscribes to a single table state atom (e.g. `table.atoms.rowSelection`)
 * and re-renders only when the selected value changes (shallow compare).
 *
 * Safe to call when the feature is not registered: the atom is then
 * `undefined` and the selector receives `undefined` once.
 */
export function useAtomSelector<TValue, TSelected>(
  atom: Source<TValue> | undefined,
  selector: (value: TValue | undefined) => TSelected,
): TSelected {
  return useSelector<TValue | undefined, TSelected>(
    atom ?? EMPTY_SOURCE,
    selector,
    { compare: shallow },
  )
}

/**
 * Subscribes to the whole table store with a projection. Use for values
 * derived from several slices (row model, visible columns...). The selector
 * runs on every state change, so keep it cheap (memoized table getters are).
 */
export function useTableSelector<TSelected>(
  table: AnyTable,
  selector: () => TSelected,
): TSelected {
  return useSelector(table.store, selector, { compare: shallow })
}
