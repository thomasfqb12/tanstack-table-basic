import { useState } from 'react'
import {
  columnResizingFeature,
  columnSizingFeature,
  createColumnHelper,
  createExpandedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { Row } from '@tanstack/react-table'
import { DataTable } from '#/components/data-table'
import {
  BudgetCell,
  DateCell,
  NameCell,
  ProjectDetail,
  StatusCell,
} from './cells'
import { projects } from './data'
import type { Project } from './data'

// Static: defined once, outside the component.
export const features = tableFeatures({
  rowSelectionFeature,
  rowExpandingFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
})

const columnHelper = createColumnHelper<typeof features, Project>()

// Static column defs keep header/row memoization effective.
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name', size: 220, cell: NameCell }),
  columnHelper.accessor('owner', { header: 'Owner', size: 120 }),
  columnHelper.accessor('status', {
    header: 'Status',
    size: 120,
    cell: StatusCell,
  }),
  columnHelper.accessor('budget', {
    header: 'Budget',
    size: 120,
    cell: BudgetCell,
    meta: { grow: false },
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    size: 140,
    cell: DateCell,
  }),
])

const renderDetail = (row: Row<typeof features, Project>) =>
  row.original.notes ? <ProjectDetail project={row.original} /> : null

export function ProjectsTable() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState(projects)
  const [lastClicked, setLastClicked] = useState<string>()
  const [cascadeSelection, setCascadeSelection] = useState(true)

  const table = useTable(
    {
      features,
      columns,
      data,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      // Rows with notes are expandable even without sub-rows (detail panel).
      getRowCanExpand: (row) => row.subRows.length > 0 || !!row.original.notes,
      columnResizeMode: 'onChange',
      enableMultiSort: false,
      // true: selecting a parent selects its children (default).
      // false: each row is selected on its own. Also accepts (row) => boolean.
      enableSubRowSelection: cascadeSelection,
    },
    // Subscribe this component to nothing: DataTable subscribes to what it
    // needs, so selecting/sorting/resizing never re-renders ProjectsTable.
    () => ({}),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm">
        <table.Subscribe source={table.atoms.rowSelection}>
          {(rowSelection) => (
            <span>{Object.keys(rowSelection).length} selected</span>
          )}
        </table.Subscribe>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => setIsLoading((v) => !v)}
        >
          Toggle loading
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => setData((d) => (d.length ? [] : projects))}
        >
          Toggle empty
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => table.resetColumnSizing()}
        >
          Reset widths
        </button>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cascadeSelection}
            onChange={(event) => {
              setCascadeSelection(event.target.checked)
              table.resetRowSelection()
            }}
          />
          Select children with parent
        </label>
        {lastClicked && (
          <span className="opacity-60">Clicked: {lastClicked}</span>
        )}
      </div>

      <DataTable
        table={table}
        aria-label="Projects"
        className="max-h-[70vh] rounded border border-gray-200"
        isLoading={isLoading}
        renderDetail={renderDetail}
        onRowClick={(row) => setLastClicked(row.original.name)}
      />
    </div>
  )
}
