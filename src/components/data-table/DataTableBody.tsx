import { useContext } from 'react'
import type { ReactNode } from 'react'
import { ClassNamesContext } from './classNames'
import { DataTableRow } from './DataTableRow'
import { useTableSelector } from './hooks'
import { getLeadLayout, getLeafColumns } from './layout'
import type { SelectionPlacement } from './layout'
import type { AnyTable } from './types'

/**
 * Re-renders when the row model (data, sorting, expanding, filtering,
 * pagination...) or the visible columns change. Selection and resizing
 * changes do not reach it.
 */
export function DataTableBody({
  table,
  selectionPlacement,
  isLoading,
  loadingState,
  emptyState,
}: {
  table: AnyTable
  selectionPlacement: SelectionPlacement
  isLoading: boolean
  loadingState: ReactNode
  emptyState: ReactNode
}) {
  const { rows, columns, leadColumnId, leadToggle, selection } =
    useTableSelector(table, () => ({
      rows: table.getRowModel().rows,
      columns: getLeafColumns(table),
      ...getLeadLayout(table, selectionPlacement),
    }))

  const slots = useContext(ClassNamesContext)

  let content: ReactNode
  if (isLoading) content = <StateRow>{loadingState}</StateRow>
  else if (!rows.length) content = <StateRow>{emptyState}</StateRow>
  else
    content = rows.map((row) => (
      <DataTableRow
        key={row.id}
        row={row}
        columns={columns}
        leadColumnId={leadColumnId}
        leadToggle={leadToggle}
        selection={selection}
      />
    ))

  return (
    <div role="rowgroup" data-slot="body" className={slots.body}>
      {content}
    </div>
  )
}

function StateRow({ children }: { children: ReactNode }) {
  return (
    <div role="row" data-slot="state">
      <div role="cell">{children}</div>
    </div>
  )
}
