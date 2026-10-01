/**
 * Story harness: plays the consumer role (owns `useTable`) so each story only
 * declares features, columns, data and DataTable props.
 */
import { useTable } from '@tanstack/react-table'
import type {
  ColumnDef,
  ReactTable,
  RowData,
  Table,
  TableFeatures,
  TableOptions,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { DataTable } from '../DataTable'
import type { DataTableProps } from '../DataTable'

export type StoryTableProps<
  TFeatures extends TableFeatures,
  TData extends RowData,
> = Omit<DataTableProps<TFeatures, TData>, 'table'> & {
  features: TFeatures
  columns: Array<ColumnDef<TFeatures, TData, any>>
  data: Array<TData>
  /** Extra `useTable` options (getSubRows, getRowCanExpand, ...). */
  tableOptions?: Partial<TableOptions<TFeatures, TData>>
  /** Rendered above the table with access to the instance. */
  toolbar?: (table: ReactTable<TFeatures, TData, any>) => ReactNode
}

export function StoryTable<
  TFeatures extends TableFeatures,
  TData extends RowData,
>({
  features,
  columns,
  data,
  tableOptions,
  toolbar,
  ...dataTableProps
}: StoryTableProps<TFeatures, TData>) {
  const table = useTable(
    { features, columns, data, ...tableOptions } as unknown as TableOptions<
      TFeatures,
      TData
    >,
    // Like a real consumer: subscribe to nothing, DataTable handles it.
    () => ({}),
  )
  return (
    <div className="flex flex-col gap-3">
      {toolbar && (
        <div className="flex items-center gap-3 text-sm">{toolbar(table)}</div>
      )}
      {/* Cast only needed in this generic harness; concrete tables infer. */}
      <DataTable
        table={table as unknown as Table<TFeatures, TData>}
        {...dataTableProps}
      />
    </div>
  )
}
