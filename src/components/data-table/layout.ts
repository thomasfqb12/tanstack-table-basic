import { hasFeature, readAtom } from './hooks'
import type { AnyColumn, AnyRow, AnyTable } from './types'

/** TanStack's default column size when `size` is not set. */
const DEFAULT_COLUMN_SIZE = 150

export function getLeafColumns(table: AnyTable): Array<AnyColumn> {
  return hasFeature(table, 'columnVisibilityFeature')
    ? table.getVisibleLeafColumns()
    : table.getAllLeafColumns()
}

export function getRowCells(row: AnyRow) {
  return hasFeature(row.table, 'columnVisibilityFeature')
    ? row.getVisibleCells()
    : row.getAllCells()
}

export function getColumnSize(column: AnyColumn): number {
  return hasFeature(column.table, 'columnSizingFeature')
    ? column.getSize()
    : (column.columnDef.size ?? DEFAULT_COLUMN_SIZE)
}

export interface GridLayout {
  /** Value for `grid-template-columns`, shared by every row. */
  template: string
  /** Sum of column sizes: below this width the table scrolls horizontally. */
  minWidth: number
}

/**
 * One CSS grid track per visible leaf column:
 * - resized (present in `columnSizing`) or `meta.grow === false` → fixed px
 * - otherwise → `minmax(size, grow fr)` so columns fill the container
 */
export function getGridLayout(table: AnyTable): GridLayout {
  const columnSizing = readAtom(table, 'columnSizing') ?? {}
  let minWidth = 0
  const tracks = getLeafColumns(table).map((column) => {
    const size = getColumnSize(column)
    minWidth += size
    const grow = column.columnDef.meta?.grow ?? 1
    return grow === false || Object.hasOwn(columnSizing, column.id)
      ? `${size}px`
      : `minmax(${size}px, ${grow}fr)`
  })
  return { template: tracks.join(' '), minWidth }
}

/**
 * Column that hosts the expand toggle + indentation: `meta.expander === true`,
 * else the first non-utility column. `null` when the table has no expandable
 * rows, so flat tables don't reserve space for the toggle.
 */
export function getExpanderColumnId(table: AnyTable): string | null {
  if (!hasFeature(table, 'rowExpandingFeature')) return null
  if (!table.getCanSomeRowsExpand()) return null
  const columns = getLeafColumns(table)
  const column =
    columns.find((col) => col.columnDef.meta?.expander === true) ??
    columns.find((col) => !col.columnDef.meta?.utility)
  return column?.id ?? null
}
