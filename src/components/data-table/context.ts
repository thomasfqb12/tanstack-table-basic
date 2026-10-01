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
 * Stable per-table context. Callbacks are read through refs so consumers can
 * pass inline functions without breaking row memoization; only the boolean
 * flags change the context value.
 */
export interface DataTableContextValue {
  tableId: string
  rootRef: RefObject<HTMLDivElement | null>
  hasDetail: boolean
  hasRowClick: boolean
  renderDetailRef: RefObject<RenderDetail | undefined>
  onRowClickRef: RefObject<OnRowClick | undefined>
}

export const DataTableContext = createContext<DataTableContextValue | null>(
  null,
)

export function useDataTableContext(): DataTableContextValue {
  const ctx = useContext(DataTableContext)
  if (!ctx)
    throw new Error('DataTable parts must be rendered inside <DataTable>')
  return ctx
}

export const detailId = (tableId: string, rowId: string) =>
  `${tableId}-detail-${rowId}`
