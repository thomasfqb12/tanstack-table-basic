import { memo } from 'react'
import type { ReactNode } from 'react'
import { DataTableRow } from './DataTableRow'
import { useTableSelector } from './hooks'
import { getExpanderColumnId, getLeafColumns } from './layout'
import type { AnyTable } from './types'

/**
 * Re-renders when the row model (data, sorting, expanding, filtering,
 * pagination...) or the visible columns change. Selection and resizing
 * changes do not reach it.
 */
export const DataTableBody = memo(function DataTableBody({
  table,
  isLoading,
  loadingState,
  emptyState,
}: {
  table: AnyTable
  isLoading: boolean
  loadingState: ReactNode
  emptyState: ReactNode
}) {
  const { rows, columns, expanderId } = useTableSelector(table, () => ({
    rows: table.getRowModel().rows,
    columns: getLeafColumns(table),
    expanderId: getExpanderColumnId(table),
  }))

  let content: ReactNode
  if (isLoading) content = <StateRow>{loadingState}</StateRow>
  else if (!rows.length) content = <StateRow>{emptyState}</StateRow>
  else
    content = rows.map((row) => (
      <DataTableRow
        key={row.id}
        row={row}
        columns={columns}
        expanderId={expanderId}
      />
    ))

  return (
    <div role="rowgroup" data-slot="body">
      {content}
    </div>
  )
})

function StateRow({ children }: { children: ReactNode }) {
  return (
    <div role="row" data-slot="state">
      <div role="cell">{children}</div>
    </div>
  )
}
