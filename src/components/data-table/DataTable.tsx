import { useId, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Row, RowData, Table, TableFeatures } from '@tanstack/react-table'
import { DataTableBody } from './DataTableBody'
import { DataTableHeader } from './DataTableHeader'
import { DataTableContext, RenderDetailContext } from './context'
import type { DataTableContextValue, OnRowClick, RenderDetail } from './context'
import { DataVersionContext } from './controls'
import type { SelectAllScope } from './controls'
import { useTableSelector } from './hooks'
import { getGridLayout } from './layout'
import type { SelectionPlacement } from './layout'
import { DefaultEmptyState, DefaultLoadingState } from './primitives'
import type { AnyTable } from './types'

// Module-level so the default elements keep their identity across renders
// (a default value in the parameter list would be recreated every render).
const defaultEmptyState = <DefaultEmptyState />
const defaultLoadingState = <DefaultLoadingState />

export interface DataTableProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> {
  /**
   * The table instance from `useTable`. Behaviour TanStack already models is
   * configured there, not with DataTable props:
   * - `features`: UI only for registered features (sorting, selection,
   *   expanding, resizing)
   * - `getSubRows` (+ `expandedRowModel`) / `getRowCanExpand`: tree rows and
   *   detail panels
   * - `enableRowSelection`: `false` hides checkboxes, a function disables rows
   * - `enableMultiRowSelection`: `false` for single selection (no select-all)
   * - `enableSubRowSelection`: `true` (default) a parent selects its children,
   *   `false` each row is selected on its own, or a function per row
   * - `enableSorting`, `enableColumnResizing`, `columnResizeMode`
   *
   * See "Table options DataTable reacts to" in the DataTable README.
   */
  table: Table<TFeatures, TData>
  /**
   * Content rendered under an expanded row (requires `rowExpandingFeature`).
   * Return `null` for rows without a panel. Use `getRowCanExpand` on the
   * table to make rows without sub-rows expandable.
   */
  renderDetail?: (row: Row<TFeatures, TData>) => ReactNode
  /**
   * Where row checkboxes go when selection is enabled (`rowSelectionFeature`
   * registered, `enableRowSelection` not `false`):
   * - `'lead'`: in the lead cell, after the expand toggle, indented with the
   *   row (`toggle → checkbox → content`)
   * - `'column'`: in a fixed first column, aligned across depths
   * @default 'lead'
   */
  selectionPlacement?: SelectionPlacement
  /**
   * What the header checkbox toggles: every row, or the current page.
   * @default 'all'
   */
  selectAllScope?: SelectAllScope
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
  selectionPlacement = 'lead',
  selectAllScope = 'all',
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

  // Latest-callback ref, read only in row event handlers: an inline
  // `onRowClick` doesn't change the context, so rows don't re-render.
  const onRowClickRef = useRef(onRowClick as OnRowClick | undefined)
  useLayoutEffect(() => {
    onRowClickRef.current = onRowClick as OnRowClick | undefined
  })

  // Cached by the React Compiler: changes only with the boolean flags.
  const context: DataTableContextValue = {
    tableId,
    rootRef,
    hasDetail: !!renderDetail,
    hasRowClick: !!onRowClick,
    onRowClickRef,
  }

  // Only this component re-renders while resizing: rows read the CSS var.
  const { template, minWidth } = useTableSelector(table, () =>
    getGridLayout(table, selectionPlacement),
  )

  return (
    <DataTableContext value={context}>
      <RenderDetailContext value={renderDetail as RenderDetail | undefined}>
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
              <DataTableHeader
                table={table}
                sticky={stickyHeader}
                selectionPlacement={selectionPlacement}
                selectAllScope={selectAllScope}
              />
              <DataTableBody
                table={table}
                selectionPlacement={selectionPlacement}
                isLoading={isLoading}
                loadingState={loadingState}
                emptyState={emptyState}
              />
            </div>
          </div>
        </DataVersionContext>
      </RenderDetailContext>
    </DataTableContext>
  )
}
