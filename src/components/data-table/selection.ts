/**
 * Selection rules on top of TanStack's row selection, for nested rows.
 *
 * The mode is TanStack's `enableSubRowSelection` (boolean or per-row
 * predicate), read per row through `row.getCanSelectSubRows()`:
 * - cascade (default `true`): selecting a parent selects its children, and a
 *   parent is selected exactly when all its selectable children are
 * - independent (`false`): every row is selected on its own
 */
import type { RowSelectionState } from '@tanstack/react-table'
import type { AnyRow, AnyTable } from './types'

/** Does this row's selection follow its children? */
export function isCascadeParent(row: AnyRow): boolean {
  return (
    row.subRows.length > 0 &&
    row.getCanSelectSubRows() &&
    row.getCanMultiSelect()
  )
}

/**
 * Makes every cascade parent selected exactly when all its selectable
 * children are. Runs after a checkbox toggle, so:
 * - unchecking a child unchecks its cascade ancestors (they show partial)
 * - checking the last unchecked child checks its cascade parent
 * Independent parents are left as they are.
 */
export function syncCascadeParents(
  table: AnyTable,
  selection: RowSelectionState,
): RowSelectionState {
  const next = { ...selection }
  // Post-order: a child's own state is settled before its parent reads it.
  const visit = (rows: Array<AnyRow>) => {
    for (const row of rows) {
      if (!row.subRows.length) continue
      visit(row.subRows)
      if (!isCascadeParent(row) || !row.getCanSelect()) continue
      const selectable = row.subRows.filter((child) => child.getCanSelect())
      if (!selectable.length) continue
      if (selectable.every((child) => Object.hasOwn(next, child.id)))
        next[row.id] = true
      else delete next[row.id]
    }
  }
  visit(table.getCoreRowModel().rows)
  return next
}

/**
 * Rows the header checkbox acts on: every selectable row at every depth
 * (after filtering), or those of the current page. Unlike TanStack's
 * select-all, it doesn't skip children of independent parents.
 */
export function getSelectAllRows(
  table: AnyTable,
  scope: 'all' | 'page',
): Array<AnyRow> {
  const rows =
    scope === 'page'
      ? table.getPaginatedRowModel().flatRows
      : table.getFilteredRowModel().flatRows
  return rows.filter((row) => row.getCanSelect())
}

export function setRowsSelected(
  table: AnyTable,
  rows: Array<AnyRow>,
  value: boolean,
) {
  table.setRowSelection((old) => {
    const next = { ...old }
    for (const row of rows) {
      if (value) next[row.id] = true
      else delete next[row.id]
    }
    return next
  })
}
