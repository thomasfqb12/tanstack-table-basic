import { useContext } from 'react'
import { shallow, useSelector } from '@tanstack/react-store'
import { TableVersionContext } from './context'
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
 * Selectors also read table *options* (`row.getCanSelect()`,
 * `column.getCanSort()`, ...) and data, which change without a store update
 * and without the row/column object changing. Under the React Compiler the
 * selector would then be cached and return stale values. Tying it to the
 * table version (the consumer's table object, a new one whenever its options
 * or data change) makes it re-run then.
 */
function useVersioned<TArg, TSelected>(
  selector: (arg: TArg) => TSelected,
): (arg: TArg) => TSelected {
  const version = useContext(TableVersionContext)
  // Passed as an (ignored) argument: a real use, so the compiler keeps
  // `version` as a dependency (a bare `void version` is optimized away).
  return (arg) =>
    (selector as (arg: TArg, version: unknown) => TSelected)(arg, version)
}

/**
 * Subscribes to a single table state atom (e.g. `table.atoms.rowSelection`)
 * and re-renders only when the selected value changes (shallow compare).
 * Also re-runs when the table's options or data change.
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
    useVersioned(selector),
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
  return useSelector(table.store, useVersioned(selector), { compare: shallow })
}
