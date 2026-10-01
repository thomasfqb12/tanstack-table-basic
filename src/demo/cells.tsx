/**
 * Consumer-owned cells. Each is a small memo-friendly component receiving the
 * cell context; DataTable only re-renders them when their row data changes.
 */
import type { CellContext } from '@tanstack/react-table'
import type { Project, Status } from './data'

// Feature-agnostic so the same cells work in any table over `Project`.
type Ctx<TValue> = CellContext<any, Project, TValue>

const statusStyles: Record<Status, string> = {
  todo: 'bg-gray-100',
  'in-progress': 'bg-amber-100',
  done: 'bg-green-100',
  blocked: 'bg-red-100',
}

export function StatusCell({ getValue }: Ctx<Status>) {
  const status = getValue()
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function BudgetCell({ getValue }: Ctx<number>) {
  return (
    <span className="ml-auto tabular-nums">{currency.format(getValue())}</span>
  )
}

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export function DateCell({ getValue }: Ctx<Date>) {
  return (
    <time dateTime={getValue().toISOString()}>
      {dateFormat.format(getValue())}
    </time>
  )
}

export function NameCell({ row, getValue }: Ctx<string>) {
  return (
    <span className={`truncate ${row.depth === 0 ? 'font-medium' : ''}`}>
      {getValue()}
    </span>
  )
}

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{project.name}</p>
      <p className="opacity-70">{project.notes}</p>
    </div>
  )
}
