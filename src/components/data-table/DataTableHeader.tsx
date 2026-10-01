import { FlexRender } from '@tanstack/react-table'
import type { HeaderGroup } from '@tanstack/react-table'
import type { MouseEvent, TouchEvent } from 'react'
import { useDataTableContext } from './context'
import { SelectAllCheckbox } from './controls'
import type { SelectAllScope } from './controls'
import {
  hasFeature,
  readAtom,
  useAtomSelector,
  useTableSelector,
} from './hooks'
import { getLeadLayout } from './layout'
import type { SelectionPlacement } from './layout'
import { ControlSlot, LeadContent, SortIcon } from './primitives'
import type { AnyHeader, AnyTable } from './types'

export function DataTableHeader({
  table,
  sticky,
  selectionPlacement,
  selectAllScope,
}: {
  table: AnyTable
  sticky: boolean
  selectionPlacement: SelectionPlacement
  selectAllScope: SelectAllScope
}) {
  const { headerGroups, leadColumnId, leadToggle, selection } =
    useTableSelector(table, () => ({
      headerGroups: table.getHeaderGroups(),
      ...getLeadLayout(table, selectionPlacement),
    }))
  const lastIndex = headerGroups.length - 1
  return (
    <div
      role="rowgroup"
      data-slot="header"
      className={`border-b border-gray-200 bg-white ${sticky ? 'sticky top-0 z-10' : ''}`}
    >
      {headerGroups.map((headerGroup, index) => (
        <HeaderRow
          key={headerGroup.id}
          table={table}
          headerGroup={headerGroup}
          isLeafRow={index === lastIndex}
          leadColumnId={leadColumnId}
          leadToggle={leadToggle}
          selection={selection}
          selectAllScope={selectAllScope}
        />
      ))}
    </div>
  )
}

function HeaderRow({
  table,
  headerGroup,
  isLeafRow,
  leadColumnId,
  leadToggle,
  selection,
  selectAllScope,
}: {
  table: AnyTable
  headerGroup: HeaderGroup<any, any>
  isLeafRow: boolean
  leadColumnId: string | null
  leadToggle: boolean
  selection: SelectionPlacement | null
  selectAllScope: SelectAllScope
}) {
  return (
    <div role="row" className="grid grid-cols-(--dt-grid)">
      {selection === 'column' && (
        <div
          role="columnheader"
          data-slot="header-cell"
          data-column-id="__selection"
          className="flex items-center px-3 py-2"
        >
          {isLeafRow && (
            <SelectAllCheckbox table={table} scope={selectAllScope} />
          )}
        </div>
      )}
      {headerGroup.headers.map((header) => {
        // Only leaf headers line up with the cells' controls.
        const isLead = isLeafRow && header.column.id === leadColumnId
        return (
          <HeaderCell
            key={header.id}
            header={header}
            isLeaf={isLeafRow}
            isLead={isLead}
            toggleSlot={isLead && leadToggle}
            selectAll={isLead && selection === 'lead' ? selectAllScope : null}
          />
        )
      })}
    </div>
  )
}

type AriaSort = 'ascending' | 'descending' | 'none'

function HeaderCell({
  header,
  isLeaf,
  isLead,
  toggleSlot,
  selectAll,
}: {
  header: AnyHeader
  isLeaf: boolean
  isLead: boolean
  /** Empty slot matching the rows' expand toggle. */
  toggleSlot: boolean
  /** Select-all checkbox in the lead header, matching the rows' checkbox. */
  selectAll: SelectAllScope | null
}) {
  const { column, table } = header
  // In a selector: column options can change without the column's identity.
  const { canSort, canResize, sorted } = useTableSelector(table, () => {
    const sortable =
      !header.isPlaceholder &&
      hasFeature(table, 'rowSortingFeature') &&
      column.getCanSort()
    return {
      canSort: sortable,
      canResize:
        !header.isPlaceholder &&
        hasFeature(table, 'columnResizingFeature') &&
        column.getCanResize(),
      sorted: sortable ? column.getIsSorted() : false,
    }
  })
  const ariaSort: AriaSort | undefined = canSort
    ? sorted === 'asc'
      ? 'ascending'
      : sorted === 'desc'
        ? 'descending'
        : 'none'
    : undefined

  return (
    <div
      role="columnheader"
      aria-sort={ariaSort}
      aria-colspan={header.colSpan > 1 ? header.colSpan : undefined}
      data-slot="header-cell"
      data-column-id={column.id}
      data-leaf={isLeaf || undefined}
      data-sorted={sorted || undefined}
      data-lead={isLead || undefined}
      className="relative flex min-w-0 items-center px-3 py-2 text-left text-sm font-medium"
      style={{ gridColumn: `span ${header.colSpan}` }}
    >
      {isLead ? (
        <LeadContent indent={false}>
          {toggleSlot && <ControlSlot />}
          {selectAll && (
            // The slot stays when select-all is hidden (single selection).
            <ControlSlot>
              <SelectAllCheckbox table={table} scope={selectAll} />
            </ControlSlot>
          )}
          <HeaderLabel header={header} canSort={canSort} sorted={sorted} />
        </LeadContent>
      ) : (
        <HeaderLabel header={header} canSort={canSort} sorted={sorted} />
      )}
      {canResize && <ResizeHandle header={header} />}
    </div>
  )
}

function HeaderLabel({
  header,
  canSort,
  sorted,
}: {
  header: AnyHeader
  canSort: boolean
  sorted: false | 'asc' | 'desc'
}) {
  if (header.isPlaceholder) return null
  if (!canSort) return <FlexRender header={header} />
  return (
    <button
      type="button"
      className="flex min-w-0 items-center gap-1"
      // Single-column sorting: always replace, never add (ignores shift).
      onClick={() => header.column.toggleSorting(undefined, false)}
    >
      <span className="truncate">
        <FlexRender header={header} />
      </span>
      <SortIcon direction={sorted} />
    </button>
  )
}

function ResizeHandle({ header }: { header: AnyHeader }) {
  const { rootRef } = useDataTableContext()
  const { table, column } = header

  // In 'onEnd' mode sizes commit on release, so move the handle as preview.
  const { isResizing, previewOffset } = useAtomSelector(
    table.atoms.columnResizing,
    (state) => {
      const resizing = state?.isResizingColumn === column.id
      return {
        isResizing: resizing,
        previewOffset:
          resizing && table.options.columnResizeMode === 'onEnd'
            ? (state.deltaOffset ?? 0)
            : 0,
      }
    },
  )

  const onStart = (event: MouseEvent | TouchEvent) => {
    event.stopPropagation()
    freezeRenderedWidths(header, rootRef.current)
    header.getResizeHandler()(event)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      data-slot="resize-handle"
      data-resizing={isResizing || undefined}
      onMouseDown={onStart}
      onTouchStart={onStart}
      onDoubleClick={() =>
        header.getLeafHeaders().forEach((leaf) => leaf.column.resetSize())
      }
      className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize touch-none bg-black/20 opacity-0 select-none hover:opacity-100 data-resizing:opacity-100"
      style={
        previewOffset
          ? { transform: `translateX(${previewOffset}px)` }
          : undefined
      }
    />
  )
}

/**
 * Fluid columns render wider than their `size`. Before a resize starts, store
 * their rendered width so the drag starts from what the user sees instead of
 * jumping back to `size`. The column then stays fixed at its resized width.
 */
function freezeRenderedWidths(header: AnyHeader, root: HTMLElement | null) {
  if (!root) return
  const { table } = header
  const columnSizing = readAtom(table, 'columnSizing') ?? {}
  const measured: Record<string, number> = {}
  for (const leaf of header.getLeafHeaders()) {
    const id = leaf.column.id
    if (leaf.subHeaders.length || Object.hasOwn(columnSizing, id)) continue
    const el = root.querySelector<HTMLElement>(
      `[data-slot="header-cell"][data-leaf][data-column-id="${CSS.escape(id)}"]`,
    )
    if (el) measured[id] = el.getBoundingClientRect().width
  }
  if (Object.keys(measured).length) {
    table.setColumnSizing((old) => ({ ...old, ...measured }))
  }
}
