import { createContext, useContext } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { AnyRow } from './types'

export type RenderDetail<TData extends RowData = any> = (
  row: AnyRow<TData>,
) => ReactNode
/** Fired on click, or Enter when the row is focused. */
export type OnRowClick<TData extends RowData = any> = (
  row: AnyRow<TData>,
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
) => void

/**
 * Stable per-table context: only the boolean flags change its value.
 * `onRowClick` goes through a ref (read in event handlers only), so consumers
 * can pass inline functions without re-rendering every row.
 */
export interface DataTableContextValue {
  tableId: string
  rootRef: RefObject<HTMLDivElement | null>
  hasDetail: boolean
  hasRowClick: boolean
  onRowClickRef: RefObject<OnRowClick | undefined>
}

export const DataTableContext = createContext<DataTableContextValue | null>(
  null,
)

/**
 * Separate from the main context: only open detail panels consume it, so a
 * new `renderDetail` function re-renders those panels, not every row.
 */
export const RenderDetailContext = createContext<RenderDetail | undefined>(
  undefined,
)

export function useDataTableContext(): DataTableContextValue {
  const ctx = useContext(DataTableContext)
  if (!ctx)
    throw new Error('DataTable parts must be rendered inside <DataTable>')
  return ctx
}

/**
 * The consumer's table object (from `useTable`). It's a new object whenever
 * the table's options or data change, so selectors that read options or data
 * re-run then (see `useVersioned` in hooks.ts).
 */
export const TableVersionContext = createContext<object | null>(null)

export const detailId = (tableId: string, rowId: string) =>
  `${tableId}-detail-${rowId}`
