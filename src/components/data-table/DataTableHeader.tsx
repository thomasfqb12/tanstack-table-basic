import { memo } from 'react'
import { FlexRender } from '@tanstack/react-table'
import type { HeaderGroup } from '@tanstack/react-table'
import type { MouseEvent, TouchEvent } from 'react'
import { useDataTableContext } from './context'
import {
  hasFeature,
  readAtom,
  useAtomSelector,
  useTableSelector,
} from './hooks'
import { getExpanderColumnId } from './layout'
import { SortIcon } from './primitives'
import type { AnyHeader, AnyTable } from './types'

export const DataTableHeader = memo(function DataTableHeader({
  table,
  sticky,
}: {
  table: AnyTable
  sticky: boolean
}) {
  const { headerGroups, expanderId } = useTableSelector(table, () => ({
    headerGroups: table.getHeaderGroups(),
    expanderId: getExpanderColumnId(table),
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
          headerGroup={headerGroup}
          isLeafRow={index === lastIndex}
          expanderId={expanderId}
        />
      ))}
    </div>
  )
})

const HeaderRow = memo(function HeaderRow({
  headerGroup,
  isLeafRow,
  expanderId,
}: {
  headerGroup: HeaderGroup<any, any>
  isLeafRow: boolean
  expanderId: string | null
}) {
  return (
    <div role="row" className="grid grid-cols-(--dt-grid)">
      {headerGroup.headers.map((header) => (
        <HeaderCell
          key={header.id}
          header={header}
          isLeaf={isLeafRow}
          // Only leaf headers line up with the cells' toggle.
          isExpander={isLeafRow && header.column.id === expanderId}
        />
      ))}
    </div>
  )
})

type AriaSort = 'ascending' | 'descending' | 'none'

const HeaderCell = memo(function HeaderCell({
  header,
  isLeaf,
  isExpander,
}: {
  header: AnyHeader
  isLeaf: boolean
  isExpander: boolean
}) {
  const { column, table } = header
  const canSort =
    !header.isPlaceholder &&
    hasFeature(table, 'rowSortingFeature') &&
    column.getCanSort()
  const canResize =
    !header.isPlaceholder &&
    hasFeature(table, 'columnResizingFeature') &&
    column.getCanResize()

  const sorted = useAtomSelector(table.atoms.sorting, () =>
    canSort ? column.getIsSorted() : false,
  )
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
      data-expander={isExpander || undefined}
      className="relative flex min-w-0 items-center px-3 py-2 text-left text-sm font-medium"
      style={{ gridColumn: `span ${header.colSpan}` }}
    >
      {isExpander && (
        // Same width as the row toggle (+ gap), so the label aligns with cells.
        <span aria-hidden className="inline-block w-7 shrink-0" />
      )}
      {header.isPlaceholder ? null : canSort ? (
        <button
          type="button"
          className="flex min-w-0 items-center gap-1"
          // Single-column sorting: always replace, never add (ignores shift).
          onClick={() => column.toggleSorting(undefined, false)}
        >
          <span className="truncate">
            <FlexRender header={header} />
          </span>
          <SortIcon direction={sorted} />
        </button>
      ) : (
        <FlexRender header={header} />
      )}
      {canResize && <ResizeHandle header={header} />}
    </div>
  )
})

function ResizeHandle({ header }: { header: AnyHeader }) {
  const { rootRef } = useDataTableContext()
  const { table, column } = header

  // `null` when another column (or none) is being resized.
  const delta = useAtomSelector(table.atoms.columnResizing, (state) =>
    state?.isResizingColumn === column.id ? (state.deltaOffset ?? 0) : null,
  )
  const isResizing = delta !== null
  // In 'onEnd' mode sizes commit on release, so move the handle as preview.
  const previewOffset =
    isResizing && table.options.columnResizeMode === 'onEnd' ? delta : 0

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
