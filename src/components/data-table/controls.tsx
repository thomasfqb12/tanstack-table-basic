/**
 * Stateful controls. Each one subscribes to the smallest slice of table state
 * it needs, so toggling a row re-renders that row's control only.
 * They can be used inside custom cells (e.g. a tree-style first column).
 *
 * React Compiler note: TanStack row/table objects keep their identity while
 * their answers change, so the compiler would cache `row.getCanSelect()` & co.
 * Read them inside selectors (re-run on every state change) and call methods
 * from handlers, never cache handlers built during render.
 */
import { createContext, useContext } from 'react'
import { readAtom, useAtomSelector, useTableSelector } from './hooks'
import { DataTableContext, detailId } from './context'
import { Checkbox, ChevronIcon, IconButton } from './primitives'
import {
  getSelectAllRows,
  isCascadeParent,
  setRowsSelected,
  syncCascadeParents,
} from './selection'
import type { RowModel } from '@tanstack/react-table'
import type { ChangeEvent } from 'react'
import type { AnyRow, AnyTable } from './types'

/**
 * Changes when the table data changes. Lets controls that derive from the
 * full row set (select all) refresh without subscribing to every render.
 */
export const DataVersionContext = createContext<RowModel<any, any> | null>(null)

/**
 * Row checkbox. How it treats children follows TanStack's
 * `enableSubRowSelection` (see `selection.ts`):
 * - cascade parent: toggles its children, shows partial when only some
 *   descendants are selected, and parents stay in sync with their children
 * - independent row: shows and toggles only its own state
 */
export function RowSelectionCheckbox({ row }: { row: AnyRow }) {
  const { checked, indeterminate, disabled } = useAtomSelector(
    row.table.atoms.rowSelection,
    () => {
      const selected = row.getIsSelected()
      return {
        checked: selected,
        indeterminate:
          !selected &&
          isCascadeParent(row) &&
          (row.getIsSomeSelected() || row.getIsAllSubRowsSelected()),
        disabled: !row.getCanSelect(),
      }
    },
  )

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    // TanStack handles children and shift-click ranges, then parents are
    // re-synced in a second update (batched by React in the same event).
    row.getToggleSelectedHandler()(event)
    row.table.setRowSelection((old) => syncCascadeParents(row.table, old))
  }

  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onChange={onChange}
      aria-label="Select row"
    />
  )
}

export type SelectAllScope = 'all' | 'page'

/** Selects every selectable row at every depth (or of the page). */
export function SelectAllCheckbox({
  table,
  scope = 'all',
}: {
  table: AnyTable
  scope?: SelectAllScope
}) {
  useContext(DataVersionContext)
  // Whole-store subscription: the row set also depends on filters/pagination.
  const { enabled, checked, indeterminate } = useTableSelector(table, () => {
    const rowSelection = readAtom(table, 'rowSelection') ?? {}
    const rows = getSelectAllRows(table, scope)
    const count = rows.filter((row) =>
      Object.hasOwn(rowSelection, row.id),
    ).length
    return {
      enabled: table.options.enableMultiRowSelection !== false,
      checked: rows.length > 0 && count === rows.length,
      indeterminate: count > 0 && count < rows.length,
    }
  })
  if (!enabled) return null

  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    setRowsSelected(table, getSelectAllRows(table, scope), event.target.checked)

  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      aria-label={
        scope === 'page' ? 'Select all rows on page' : 'Select all rows'
      }
    />
  )
}

export interface RowExpandToggleProps {
  row: AnyRow
  /** Pixels of indentation per nesting level. `0` disables indentation. */
  indent?: number
}

export function RowExpandToggle({ row, indent = 0 }: RowExpandToggleProps) {
  const ctx = useContext(DataTableContext)
  const { canExpand, expanded } = useAtomSelector(
    row.table.atoms.expanded,
    () => ({ canExpand: row.getCanExpand(), expanded: row.getIsExpanded() }),
  )
  const style = indent ? { paddingInlineStart: row.depth * indent } : undefined

  return (
    <span className="inline-flex" style={style}>
      {canExpand ? (
        <IconButton
          onClick={() => row.toggleExpanded()}
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
}
