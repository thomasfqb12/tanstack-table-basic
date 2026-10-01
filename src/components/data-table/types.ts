import type {
  Cell,
  CellData,
  Column,
  Header,
  Row,
  RowData,
  Table,
  TableFeatures,
} from '@tanstack/react-table'

/**
 * Column meta understood by DataTable.
 *
 * Merged into TanStack's global `ColumnMeta`. If a table declares its own
 * `columnMeta` slot in `tableFeatures({...})`, extend this type there so the
 * DataTable keys stay typed: `columnMeta: {} as DataTableColumnMeta & MyMeta`.
 */
export interface DataTableColumnMeta {
  /**
   * How the column shares leftover horizontal space (CSS grid `fr`).
   * - `number` (default `1`): `minmax(<size>px, <grow>fr)`
   * - `false`: fixed at `<size>px`
   *
   * Once a user resizes the column, it becomes fixed at the resized width.
   * Double-clicking the resize handle restores the fluid behaviour.
   */
  grow?: number | false
  /**
   * Hosts the lead cell: expand toggle → checkbox → content, indented by row
   * depth. Defaults to the first visible column; `true` picks this one.
   */
  lead?: boolean
  /** Classes for this column's cells, merged over the defaults with `cn`. */
  className?: string
  /** Classes for this column's header cell, merged over the defaults. */
  headerClassName?: string
}

declare module '@tanstack/react-table' {
  // Type params must match the original declaration for merging to work.
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > extends DataTableColumnMeta {}
}

/**
 * DataTable works with any feature set, so internally it treats the table as
 * "all features" and checks at runtime which ones are registered.
 */
export type AnyTable<TData extends RowData = any> = Table<any, TData>
export type AnyRow<TData extends RowData = any> = Row<any, TData>
export type AnyCell<TData extends RowData = any> = Cell<any, TData, unknown>
export type AnyColumn<TData extends RowData = any> = Column<any, TData, unknown>
export type AnyHeader<TData extends RowData = any> = Header<any, TData, unknown>
