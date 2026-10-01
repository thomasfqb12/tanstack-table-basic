/**
 * Stateful controls. Each one subscribes to the smallest slice of table state
 * it needs, so toggling a row re-renders that row's control only.
 * They can be used inside custom cells (e.g. a tree-style first column).
 */
import { createContext, memo, useContext } from 'react'
import { useAtomSelector, useTableSelector } from './hooks'
import { DataTableContext, detailId } from './context'
import { Checkbox, ChevronIcon, IconButton } from './primitives'
import type { RowModel } from '@tanstack/react-table'
import type { AnyRow, AnyTable } from './types'

/**
 * Changes when the table data changes. Lets controls that derive from the
 * full row set (select all) refresh without subscribing to every render.
 */
export const DataVersionContext = createContext<RowModel<any, any> | null>(null)

export const RowSelectionCheckbox = memo(function RowSelectionCheckbox({
  row,
}: {
  row: AnyRow
}) {
  const { checked, indeterminate } = useAtomSelector(
    row.table.atoms.rowSelection,
    () => ({
      checked: row.getIsSelected(),
      indeterminate: row.getIsSomeSelected(),
    }),
  )
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={!row.getCanSelect()}
      onChange={row.getToggleSelectedHandler()}
      aria-label="Select row"
    />
  )
})

export type SelectAllScope = 'all' | 'page'

export const SelectAllCheckbox = memo(function SelectAllCheckbox({
  table,
  scope = 'all',
}: {
  table: AnyTable
  scope?: SelectAllScope
}) {
  useContext(DataVersionContext)
  // Whole-store subscription: "all selected" also depends on filters/pagination.
  const { checked, indeterminate } = useTableSelector(table, () =>
    scope === 'page'
      ? {
          checked: table.getIsAllPageRowsSelected(),
          indeterminate: table.getIsSomePageRowsSelected(),
        }
      : {
          checked: table.getIsAllRowsSelected(),
          indeterminate: table.getIsSomeRowsSelected(),
        },
  )
  if (table.options.enableMultiRowSelection === false) return null
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={
        scope === 'page'
          ? table.getToggleAllPageRowsSelectedHandler()
          : table.getToggleAllRowsSelectedHandler()
      }
      aria-label={
        scope === 'page' ? 'Select all rows on page' : 'Select all rows'
      }
    />
  )
})

export interface RowExpandToggleProps {
  row: AnyRow
  /** Pixels of indentation per nesting level. `0` disables indentation. */
  indent?: number
}

export const RowExpandToggle = memo(function RowExpandToggle({
  row,
  indent = 0,
}: RowExpandToggleProps) {
  const ctx = useContext(DataTableContext)
  const expanded = useAtomSelector(row.table.atoms.expanded, () =>
    row.getIsExpanded(),
  )
  const style = indent ? { paddingInlineStart: row.depth * indent } : undefined

  return (
    <span className="inline-flex" style={style}>
      {row.getCanExpand() ? (
        <IconButton
          onClick={row.getToggleExpandedHandler()}
          aria-expanded={expanded}
          aria-controls={
            ctx?.hasDetail && expanded
              ? detailId(ctx.tableId, row.id)
              : undefined
          }
          aria-label={expanded ? 'Collapse row' : 'Expand row'}
        >
          <ChevronIcon expanded={expanded} />
        </IconButton>
      ) : (
        // Keeps leaf rows aligned with expandable siblings.
        <span aria-hidden className="inline-block size-6" />
      )}
    </span>
  )
})
