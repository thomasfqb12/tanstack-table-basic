import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { DataTable } from '#/components/data-table'
import { projects } from './data'
import type { Project } from './data'

// No optional features: no sorting, selection, expanding or resizing UI.
const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, Project>()
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('owner', { header: 'Owner' }),
  columnHelper.accessor('status', { header: 'Status' }),
])
const data = projects.slice(0, 5)

export function MinimalTable() {
  const table = useTable({ features, columns, data }, () => ({}))
  return (
    <DataTable
      table={table}
      aria-label="Minimal"
      stickyHeader={false}
      className="rounded"
      borders
    />
  )
}
