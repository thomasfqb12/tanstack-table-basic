import { hasFeature, readAtom } from './hooks'
import type { AnyColumn, AnyTable } from './types'

/** TanStack's default column size when `size` is not set. */
const DEFAULT_COLUMN_SIZE = 150

export function getLeafColumns(table: AnyTable): Array<AnyColumn> {
  return hasFeature(table, 'columnVisibilityFeature')
    ? table.getVisibleLeafColumns()
    : table.getAllLeafColumns()
}

export function getColumnSize(column: AnyColumn): number {
  return hasFeature(column.table, 'columnSizingFeature')
    ? column.getSize()
    : (column.columnDef.size ?? DEFAULT_COLUMN_SIZE)
}

/** Where row checkboxes go when selection is enabled. */
export type SelectionPlacement = 'lead' | 'column'

/** Width of the checkbox column in `selectionPlacement="column"` mode. */
export const SELECTION_COLUMN_SIZE = 44

/**
 * Checkboxes show when `rowSelectionFeature` is registered, unless the table
 * sets `enableRowSelection: false` (a function only disables some rows).
 */
export function canShowSelection(table: AnyTable): boolean {
  return (
    hasFeature(table, 'rowSelectionFeature') &&
    table.options.enableRowSelection !== false
  )
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
 * plus a fixed checkbox track first in `selectionPlacement="column"` mode.
 */
export function getGridLayout(
  table: AnyTable,
  selectionPlacement: SelectionPlacement,
): GridLayout {
  const columnSizing = readAtom(table, 'columnSizing') ?? {}
  const tracks: Array<string> = []
  let minWidth = 0
  if (selectionPlacement === 'column' && canShowSelection(table)) {
    tracks.push(`${SELECTION_COLUMN_SIZE}px`)
    minWidth += SELECTION_COLUMN_SIZE
  }
  for (const column of getLeafColumns(table)) {
    const size = getColumnSize(column)
    minWidth += size
    const grow = column.columnDef.meta?.grow ?? 1
    tracks.push(
      grow === false || Object.hasOwn(columnSizing, column.id)
        ? `${size}px`
        : `minmax(${size}px, ${grow}fr)`,
    )
  }
  return { template: tracks.join(' '), minWidth }
}

/**
 * The lead cell renders `toggle → checkbox → content`, indented by depth.
 * Flat primitives (not an object) so store selectors compare them shallowly.
 */
export interface LeadLayout {
  /** Column hosting the lead cell; `null` when it has nothing to show. */
  leadColumnId: string | null
  /** Some row can expand: lead cells show the toggle (or a spacer). */
  leadToggle: boolean
  /** Where checkboxes go; `null` when selection isn't shown. */
  selection: SelectionPlacement | null
}

export function getLeadLayout(
  table: AnyTable,
  selectionPlacement: SelectionPlacement,
): LeadLayout {
  const selection = canShowSelection(table) ? selectionPlacement : null
  const leadToggle =
    hasFeature(table, 'rowExpandingFeature') && table.getCanSomeRowsExpand()
  if (!leadToggle && selection !== 'lead') {
    return { leadColumnId: null, leadToggle, selection }
  }
  const columns = getLeafColumns(table)
  const lead =
    columns.find((column) => column.columnDef.meta?.lead === true) ??
    columns.at(0)
  return { leadColumnId: lead?.id ?? null, leadToggle, selection }
}
