import { useId, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type {
  Cell,
  Row,
  RowData,
  Table,
  TableFeatures,
} from '@tanstack/react-table'
import { DataTableBody } from './DataTableBody'
import { DataTableHeader } from './DataTableHeader'
import {
  DataTableContext,
  RenderDetailContext,
  TableVersionContext,
} from './context'
import type { DataTableContextValue, OnRowClick, RenderDetail } from './context'
import type { SelectAllScope } from './controls'
import { useTableSelector } from './hooks'
import { getGridLayout } from './layout'
import type { SelectionPlacement } from './layout'
import { DefaultEmptyState, DefaultLoadingState } from './primitives'
import {
  CellClassNameContext,
  ClassNamesContext,
  RowClassNameContext,
  splitSlot,
  withOverrides,
} from './classNames'
import type {
  CellClassName,
  DataTableClassNames,
  RowClassName,
} from './classNames'
import { rootClasses } from './styles'
import type { AnyTable } from './types'

/**
 * Which borders to draw, each on or off independently. Keys you leave out
 * keep their default (`rows` on, `outer` and `columns` off).
 * Color: the `--dt-border-color` CSS variable.
 */
export interface DataTableBorders {
  /** Frame around the table. */
  outer?: boolean
  /** Line under the header and under each row. */
  rows?: boolean
  /** Lines between columns. */
  columns?: boolean
}

const allBorders: Required<DataTableBorders> = {
  outer: true,
  rows: true,
  columns: true,
}
const noBorders: Required<DataTableBorders> = {
  outer: false,
  rows: false,
  columns: false,
}
const defaultBorders: Required<DataTableBorders> = {
  outer: false,
  rows: true,
  columns: false,
}

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
   * Which borders to draw: `true` (all), `false` (none), or switch each one
   * on or off with `{ outer, rows, columns }`. Keys you leave out keep their
   * default: `{ columns: true }` adds column lines and keeps row lines,
   * `{ rows: false }` removes row lines. Color: `--dt-border-color`.
   * @default { outer: false, rows: true, columns: false }
   */
  borders?: boolean | DataTableBorders
  /**
   * Alternating row background. `true` uses the default tint; a CSS color
   * (`'#f8fafc'`, `'var(--ds-surface-2)'`) sets your own. The color can also
   * come from the `--dt-stripe-bg` CSS variable.
   * @default false
   */
  striped?: boolean | string
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
  /** Classes for the root (scroll container). Same as `classNames.root`. */
  className?: string
  /**
   * Classes per part, merged with `cn` so they replace conflicting defaults:
   * `{ root, header, headerRow, headerCell, body, row, cell, detail }`.
   *
   * `row` and `cell` also accept a function, for data- or state-driven
   * classes:
   * - `row: (row, { selected, expanded }) => ...`: use the `state` argument
   *   rather than `row.getIsSelected()`, so the class updates with the row
   * - `cell: (cell) => ...`: from the cell's data (`cell.getValue()`)
   *
   * Strings are compared by value. A new function re-renders the rows (or
   * cells) that call it, but not your cell components: define it at module
   * scope, or let the React Compiler keep it stable.
   * For one column, use the column's `meta.className` / `meta.headerClassName`.
   */
  classNames?: DataTableClassNames<
    Row<TFeatures, TData>,
    Cell<TFeatures, TData, unknown>
  >
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
  borders,
  striped = false,
  stickyHeader = true,
  isLoading = false,
  loadingState = defaultLoadingState,
  emptyState = defaultEmptyState,
  className,
  classNames,
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

  // Destructured, so the slots context only changes when a class string does
  // (not when a new but identical `classNames` object is passed). Functions
  // go to their own contexts, read only by the rows / cells that call them.
  const {
    root: rootClassName,
    header,
    headerRow,
    headerCell,
    body,
    row: rowSlot,
    cell: cellSlot,
    detail,
  } = classNames ?? {}
  const [row, rowClassName] = splitSlot(rowSlot)
  const [cell, cellClassName] = splitSlot(cellSlot)
  const slots = { header, headerRow, headerCell, body, row, cell, detail }

  const border =
    borders === true
      ? allBorders
      : borders === false
        ? noBorders
        : { ...defaultBorders, ...borders }

  // Only this component re-renders while resizing: rows read the CSS var.
  const { template, minWidth } = useTableSelector(table, () =>
    getGridLayout(table, selectionPlacement),
  )

  return (
    <DataTableContext value={context}>
      <RenderDetailContext value={renderDetail as RenderDetail | undefined}>
        <ClassNamesContext value={slots}>
          <RowClassNameContext value={rowClassName as RowClassName | undefined}>
            <CellClassNameContext
              value={cellClassName as CellClassName | undefined}
            >
              <TableVersionContext value={tableProp}>
                <div
                  ref={rootRef}
                  role="table"
                  aria-busy={isLoading || undefined}
                  data-slot="data-table"
                  data-border-outer={border.outer || undefined}
                  data-border-rows={border.rows || undefined}
                  data-border-columns={border.columns || undefined}
                  data-striped={striped ? '' : undefined}
                  className={withOverrides(
                    rootClasses,
                    className,
                    rootClassName,
                  )}
                  style={
                    {
                      '--dt-grid': template,
                      ...(typeof striped === 'string' && {
                        '--dt-stripe-bg': striped,
                      }),
                    } as CSSProperties
                  }
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
              </TableVersionContext>
            </CellClassNameContext>
          </RowClassNameContext>
        </ClassNamesContext>
      </RenderDetailContext>
    </DataTableContext>
  )
}
