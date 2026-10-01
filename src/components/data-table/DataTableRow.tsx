import { memo, useContext } from 'react'
import { FlexRender } from '@tanstack/react-table'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { RenderDetailContext, detailId, useDataTableContext } from './context'
import { RowExpandToggle, RowSelectionCheckbox } from './controls'
import { hasFeature, useAtomSelector } from './hooks'
import type { SelectionPlacement } from './layout'
import { ControlSlot, LeadContent } from './primitives'
import {
  CellClassNameContext,
  ClassNamesContext,
  RowClassNameContext,
  withOverrides,
} from './classNames'
import {
  cellClasses,
  detailClasses,
  detailRowClasses,
  rowClasses,
  selectionCellClasses,
} from './styles'
import type { AnyCell, AnyColumn, AnyRow } from './types'

/** Clicks on these never trigger `onRowClick`. */
const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,[role="button"],[role="checkbox"],[data-row-click-ignore]'

/**
 * Re-renders only when its own selected/expanded state changes, or when the
 * visible columns change (`columns` prop). The cell list is cached on
 * `columns`, so toggling a row does not re-render its custom cells.
 *
 * Still wrapped in `memo` under the React Compiler: the compiler caches the
 * body's `rows.map(...)` as a whole, not per item, so a new row order would
 * otherwise call every row.
 */
export const DataTableRow = memo(function DataTableRow({
  row,
  columns,
  leadColumnId,
  leadToggle,
  selection,
}: {
  row: AnyRow
  /** Visible leaf columns: a new array re-renders the row (column change). */
  columns: Array<AnyColumn>
  /** Column hosting the lead cell (toggle → checkbox → content). */
  leadColumnId: string | null
  /** Lead cells reserve the toggle slot (some row can expand). */
  leadToggle: boolean
  /** Where the row checkbox goes; `null` when selection isn't shown. */
  selection: SelectionPlacement | null
}) {
  const { tableId, hasDetail, hasRowClick, onRowClickRef } =
    useDataTableContext()
  const { table } = row
  const slots = useContext(ClassNamesContext)
  const rowClassName = useContext(RowClassNameContext)

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
        className={withOverrides(
          rowClasses,
          slots.row,
          // Gets the row's state, so classes based on it are never stale.
          rowClassName?.(row, { selected, expanded }),
        )}
      >
        {selection === 'column' && (
          <div
            role="cell"
            data-slot="cell"
            data-column-id="__selection"
            className={withOverrides(selectionCellClasses, slots.cell)}
          >
            <RowSelectionCheckbox row={row} />
          </div>
        )}
        {cellsFor(row, columns).map((cell) => {
          const isLead = cell.column.id === leadColumnId
          return (
            <DataTableCell
              key={cell.id}
              cell={cell}
              isLead={isLead}
              toggle={isLead && leadToggle}
              checkbox={isLead && selection === 'lead'}
            />
          )
        })}
      </div>
      {hasDetail && expanded && (
        <DataTableDetail
          row={row}
          id={detailId(tableId, row.id)}
          span={columns.length + (selection === 'column' ? 1 : 0)}
        />
      )}
    </>
  )
})

/** Derived from `columns` so a visibility/order change refreshes the cells. */
function cellsFor(row: AnyRow, columns: Array<AnyColumn>): Array<AnyCell> {
  const byId = row.getAllCellsByColumnId()
  return columns.map((column) => byId[column.id])
}

function DataTableCell({
  cell,
  isLead,
  toggle,
  checkbox,
}: {
  cell: AnyCell
  isLead: boolean
  toggle: boolean
  checkbox: boolean
}) {
  const slots = useContext(ClassNamesContext)
  const cellClassName = useContext(CellClassNameContext)
  return (
    <div
      role="cell"
      data-slot="cell"
      data-column-id={cell.column.id}
      data-lead={isLead || undefined}
      // From general to specific: all cells, this column, this cell.
      className={withOverrides(
        cellClasses,
        slots.cell,
        cell.column.columnDef.meta?.className,
        cellClassName?.(cell),
      )}
    >
      {isLead ? (
        // Controls and content indent together. Each control subscribes to
        // its own state, so toggling doesn't re-render the cell.
        <LeadContent indent>
          {toggle && <RowExpandToggle row={cell.row} />}
          {checkbox && (
            <ControlSlot>
              <RowSelectionCheckbox row={cell.row} />
            </ControlSlot>
          )}
          <FlexRender cell={cell} />
        </LeadContent>
      ) : (
        <FlexRender cell={cell} />
      )}
    </div>
  )
}

/**
 * Full-width panel under an expanded row. Rendered only while expanded;
 * return `null` from `renderDetail` for rows without a panel.
 */
function DataTableDetail({
  row,
  id,
  span,
}: {
  row: AnyRow
  id: string
  span: number
}) {
  const renderDetail = useContext(RenderDetailContext)
  const slots = useContext(ClassNamesContext)
  const content = renderDetail?.(row)
  if (content == null) return null
  return (
    <div
      role="row"
      id={id}
      data-slot="detail"
      data-row-id={row.id}
      className={detailRowClasses}
    >
      <div
        role="cell"
        aria-colspan={span}
        className={withOverrides(detailClasses, slots.detail)}
      >
        {content}
      </div>
    </div>
  )
}
