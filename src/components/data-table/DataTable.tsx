import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Row, RowData, Table, TableFeatures } from '@tanstack/react-table'
import { DataTableBody } from './DataTableBody'
import { DataTableHeader } from './DataTableHeader'
import { DataTableContext } from './context'
import type { DataTableContextValue, OnRowClick, RenderDetail } from './context'
import { DataVersionContext } from './controls'
import { useTableSelector } from './hooks'
import { getGridLayout } from './layout'
import { DefaultEmptyState, DefaultLoadingState } from './primitives'
import type { AnyTable } from './types'

// Module-level so the default elements keep their identity across renders.
const defaultEmptyState = <DefaultEmptyState />
const defaultLoadingState = <DefaultLoadingState />

export interface DataTableProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> {
  /** The table instance from `useTable`. Configure features there. */
  table: Table<TFeatures, TData>
  /**
   * Content rendered under an expanded row (requires `rowExpandingFeature`).
   * Return `null` for rows without a panel. Use `getRowCanExpand` on the
   * table to make rows without sub-rows expandable.
   */
  renderDetail?: (row: Row<TFeatures, TData>) => ReactNode
  /** Makes rows clickable and focusable (Enter). Ignores clicks on controls. */
  onRowClick?: (
    row: Row<TFeatures, TData>,
    event: Parameters<OnRowClick>[1],
  ) => void
  /**
   * Header stays visible while the table scrolls. The table is its own
   * scroll container, so give it a height (e.g. `className="max-h-96"`).
   * @default true
   */
  stickyHeader?: boolean
  /** @default false */
  isLoading?: boolean
  /** Shown instead of the rows while `isLoading`. */
  loadingState?: ReactNode
  /** Shown when the row model is empty. */
  emptyState?: ReactNode
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function DataTable<
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  table: tableProp,
  renderDetail,
  onRowClick,
  stickyHeader = true,
  isLoading = false,
  loadingState = defaultLoadingState,
  emptyState = defaultEmptyState,
  className,
  ...aria
}: DataTableProps<TFeatures, TData>) {
  const table = tableProp as unknown as AnyTable
  const tableId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  // Latest-callback refs: inline functions don't re-render memoized rows.
  const renderDetailRef = useRef(renderDetail as RenderDetail | undefined)
  const onRowClickRef = useRef(onRowClick as OnRowClick | undefined)
  useLayoutEffect(() => {
    renderDetailRef.current = renderDetail as RenderDetail | undefined
    onRowClickRef.current = onRowClick as OnRowClick | undefined
  })

  const hasDetail = !!renderDetail
  const hasRowClick = !!onRowClick
  const context = useMemo<DataTableContextValue>(
    () => ({
      tableId,
      rootRef,
      hasDetail,
      hasRowClick,
      renderDetailRef,
      onRowClickRef,
    }),
    [tableId, hasDetail, hasRowClick],
  )

  // Only this component re-renders while resizing: rows read the CSS var.
  const { template, minWidth } = useTableSelector(table, () =>
    getGridLayout(table),
  )

  return (
    <DataTableContext value={context}>
      <DataVersionContext value={table.getCoreRowModel()}>
        <div
          ref={rootRef}
          role="table"
          aria-busy={isLoading || undefined}
          data-slot="data-table"
          className={`relative overflow-auto ${className ?? ''}`}
          style={{ '--dt-grid': template } as CSSProperties}
          {...aria}
        >
          <div style={{ minWidth }}>
            <DataTableHeader table={table} sticky={stickyHeader} />
            <DataTableBody
              table={table}
              isLoading={isLoading}
              loadingState={loadingState}
              emptyState={emptyState}
            />
          </div>
        </div>
      </DataVersionContext>
    </DataTableContext>
  )
}
