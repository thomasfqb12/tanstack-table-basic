import { memo } from 'react'
import { FlexRender } from '@tanstack/react-table'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { detailId, useDataTableContext } from './context'
import { RowExpandToggle } from './controls'
import { hasFeature, useAtomSelector } from './hooks'
import { getRowCells } from './layout'
import type { AnyCell, AnyColumn, AnyRow } from './types'

/** Clicks on these never trigger `onRowClick`. */
const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,[role="button"],[role="checkbox"],[data-row-click-ignore]'

/**
 * Re-renders only when its own selected/expanded state changes, or when the
 * visible columns change (`columns` prop). Cells are memoized on `cell`, so
 * toggling a row does not re-render its custom cells.
 */
export const DataTableRow = memo(function DataTableRow({
  row,
  columns,
  expanderId,
}: {
  row: AnyRow
  /** Visible leaf columns: a new array re-renders the row (column change). */
  columns: Array<AnyColumn>
  /** Column hosting the expand toggle, `null` for none. */
  expanderId: string | null
}) {
  const { tableId, hasDetail, hasRowClick, onRowClickRef } =
    useDataTableContext()
  const { table } = row

  const selected = useAtomSelector(
    table.atoms.rowSelection,
    () => hasFeature(table, 'rowSelectionFeature') && row.getIsSelected(),
  )
  const expanded = useAtomSelector(
    table.atoms.expanded,
    () => hasFeature(table, 'rowExpandingFeature') && row.getIsExpanded(),
  )

  const onClick = hasRowClick
    ? (event: MouseEvent<HTMLElement>) => {
        const target = event.target as HTMLElement
        if (target.closest(INTERACTIVE_SELECTOR)) return
        // Don't hijack text selection.
        if (window.getSelection()?.toString()) return
        onRowClickRef.current?.(row, event)
      }
    : undefined
  const onKeyDown = hasRowClick
    ? (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' || event.target !== event.currentTarget)
          return
        onRowClickRef.current?.(row, event)
      }
    : undefined

  return (
    <>
      <div
        role="row"
        data-slot="row"
        data-row-id={row.id}
        data-depth={row.depth}
        data-selected={selected || undefined}
        data-expanded={expanded || undefined}
        data-clickable={hasRowClick || undefined}
        tabIndex={hasRowClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{ '--dt-depth': row.depth } as CSSProperties}
        className="grid grid-cols-(--dt-grid) border-b border-gray-200 hover:bg-black/2 data-clickable:cursor-pointer data-selected:bg-blue-50"
      >
        {getRowCells(row).map((cell) => (
          <DataTableCell
            key={cell.id}
            cell={cell}
            isExpander={cell.column.id === expanderId}
          />
        ))}
      </div>
      {hasDetail && expanded && (
        <DataTableDetail
          row={row}
          id={detailId(tableId, row.id)}
          span={columns.length}
        />
      )}
    </>
  )
})

const DataTableCell = memo(function DataTableCell({
  cell,
  isExpander,
}: {
  cell: AnyCell
  isExpander: boolean
}) {
  return (
    <div
      role="cell"
      data-slot="cell"
      data-column-id={cell.column.id}
      data-expander={isExpander || undefined}
      className="flex min-w-0 items-center px-3 py-2 text-sm"
    >
      {isExpander ? (
        // Toggle and content indent together; the toggle subscribes to the
        // expanded state itself, so expanding doesn't re-render the cell.
        <div className="flex min-w-0 flex-1 items-center gap-1 ps-[calc(var(--dt-depth)*var(--dt-indent,1.25rem))]">
          <RowExpandToggle row={cell.row} />
          <FlexRender cell={cell} />
        </div>
      ) : (
        <FlexRender cell={cell} />
      )}
    </div>
  )
})

/**
 * Full-width panel under an expanded row. Rendered only while expanded;
 * return `null` from `renderDetail` for rows without a panel.
 */
const DataTableDetail = memo(function DataTableDetail({
  row,
  id,
  span,
}: {
  row: AnyRow
  id: string
  span: number
}) {
  const { renderDetailRef } = useDataTableContext()
  const content = renderDetailRef.current?.(row)
  if (content == null) return null
  return (
    <div
      role="row"
      id={id}
      data-slot="detail"
      data-row-id={row.id}
      className="border-b border-gray-200"
    >
      <div role="cell" aria-colspan={span} className="p-3">
        {content}
      </div>
    </div>
  )
})
