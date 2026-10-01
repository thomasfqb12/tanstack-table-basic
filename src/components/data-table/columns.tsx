import { RowSelectionCheckbox, SelectAllCheckbox } from './controls'
import type { SelectAllScope } from './controls'
import { createColumnHelper } from '@tanstack/react-table'
import type {
  CellContext,
  ColumnDef,
  ColumnHelper,
  HeaderContext,
  RowData,
  TableFeatures,
} from '@tanstack/react-table'

interface SelectionColumnOptions {
  id?: string
  size?: number
  /** What the header checkbox toggles: every row, or the current page. */
  scope?: SelectAllScope
}

export interface DataTableColumnHelper<
  TFeatures extends TableFeatures,
  TData extends RowData,
> extends ColumnHelper<TFeatures, TData> {
  selection: (
    options?: SelectionColumnOptions,
  ) => ColumnDef<TFeatures, TData, unknown>
}

/**
 * `createColumnHelper` plus DataTable's utility columns, typed for your table.
 *
 * @example
 * const columnHelper = createDataTableColumnHelper<typeof features, Person>()
 * const columns = columnHelper.columns([
 *   columnHelper.selection(),
 *   columnHelper.accessor('name', { header: 'Name' }),
 * ])
 */
export function createDataTableColumnHelper<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(): DataTableColumnHelper<TFeatures, TData> {
  return {
    ...createColumnHelper<TFeatures, TData>(),
    selection: (options) => selectionColumn<TFeatures, TData>(options),
  }
}

/**
 * Checkbox column. Requires `rowSelectionFeature`.
 * Single vs multi selection, sub-row selection, etc. are configured on the
 * table (`enableMultiRowSelection`, `enableSubRowSelection`, ...).
 *
 * Prefer `createDataTableColumnHelper().selection()`, which infers the types.
 */
export function selectionColumn<
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  id = 'select',
  size = 44,
  scope = 'all',
}: SelectionColumnOptions = {}): ColumnDef<TFeatures, TData, unknown> {
  return {
    id,
    size,
    enableSorting: false,
    enableResizing: false,
    meta: { grow: false, utility: true },
    header: (ctx: HeaderContext<any, any, unknown>) => (
      <SelectAllCheckbox table={ctx.table} scope={scope} />
    ),
    cell: (ctx: CellContext<any, any, unknown>) => (
      <RowSelectionCheckbox row={ctx.row} />
    ),
  } as unknown as ColumnDef<TFeatures, TData, unknown>
}
