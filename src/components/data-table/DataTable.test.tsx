/**
 * Guarantees that stories don't cover: re-render isolation, values that
 * would go stale under the React Compiler, selection behaviour end to end,
 * and controlled state. Runs compiled (see vitest.config.ts).
 *
 * Layout (widths, borders, stripes) needs a real browser: see the Borders and
 * Striped stories, run by the `storybook` test project.
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import type {
  CellContext,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'
import { beforeEach, describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'
import type { DataTableProps } from './DataTable'
import {
  columnHelper,
  features,
  flat,
  treeOptions,
  tree,
} from './test/fixtures'
import type { Features, Item, Options } from './test/fixtures'
import type { AnyTable } from './types'

// ---------------------------------------------------------------------------
// Harness: a consumer component, instrumented
// ---------------------------------------------------------------------------

const renders = { cell: 0, consumer: 0 }
beforeEach(() => {
  renders.cell = 0
  renders.consumer = 0
})

// A hook, because the compiler never memoizes hook calls.
function useRenderCount(key: keyof typeof renders) {
  renders[key]++
}

function SpyCell({ getValue }: CellContext<Features, Item, string>) {
  useRenderCount('cell')
  return <span>{getValue()}</span>
}

const spyColumns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name', cell: SpyCell }),
  columnHelper.accessor('id', { header: 'Id', cell: SpyCell }),
])

type HarnessProps = {
  data?: Array<Item>
  options?: Options
  tableProps?: Partial<DataTableProps<Features, Item>>
  onTable?: (table: AnyTable) => void
}

function Harness({ data = tree, options, tableProps, onTable }: HarnessProps) {
  useRenderCount('consumer')
  const table = useTable(
    {
      features,
      columns: spyColumns,
      data,
      ...treeOptions,
      ...options,
    },
    () => ({}),
  )
  useEffect(() => {
    onTable?.(table as unknown as AnyTable)
  })
  return <DataTable table={table} aria-label="Items" {...tableProps} />
}

const row = (id: string) => {
  const el = document.querySelector<HTMLElement>(
    `[data-slot="row"][data-row-id="${id}"]`,
  )
  if (!el) throw new Error(`Row ${id} not rendered`)
  return el
}
const checkbox = (id: string) =>
  row(id).querySelector<HTMLInputElement>('input[type="checkbox"]')!
const expandToggle = (id: string) =>
  row(id).querySelector<HTMLButtonElement>('button[aria-label="Expand row"]')!
const state = (input: HTMLInputElement) =>
  input.checked ? 'checked' : input.indeterminate ? 'partial' : 'empty'
const rowIds = () =>
  [
    ...document.querySelectorAll<HTMLElement>(
      '[data-slot="body"] [data-slot="row"]',
    ),
  ].map((el) => el.dataset.rowId)
const selectAll = () =>
  screen.getByRole<HTMLInputElement>('checkbox', { name: 'Select all rows' })

// ---------------------------------------------------------------------------

describe('React Compiler', () => {
  it('runs on DataTable (the staleness tests below depend on it)', () => {
    // Compiled components read and write a memo cache: `$[0]`, `$[1]`...
    expect(DataTable.toString()).toMatch(/\$\[\d+\]/)
  })
})

describe('re-render isolation', () => {
  it('selecting a row renders no cells and leaves the consumer alone', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    renders.cell = renders.consumer = 0

    await user.click(checkbox('b'))

    expect(checkbox('b')).toBeChecked()
    expect(row('b')).toHaveAttribute('data-selected', 'true')
    expect(renders).toEqual({ cell: 0, consumer: 0 })
  })

  it('expanding a row renders only the cells of the new rows', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    renders.cell = 0

    await user.click(expandToggle('c'))

    expect(rowIds()).toEqual(['a', 'b', 'c', 'c1'])
    expect(renders.cell).toBe(2) // c1 × 2 columns
  })

  it('sorting flat rows reorders them without rendering cells', async () => {
    const user = userEvent.setup()
    render(<Harness data={flat} />)
    renders.cell = 0

    const name = screen.getByRole('button', { name: /Name/ })
    await user.click(name) // asc
    await user.click(name) // desc

    expect(rowIds()).toEqual(['z', 'y', 'x'])
    expect(renders.cell).toBe(0)
  })

  it('a consumer re-render with new inline callbacks renders no cells', async () => {
    const user = userEvent.setup()
    function Parent() {
      const [count, setCount] = useState(0)
      return (
        <>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            bump
          </button>
          <Harness
            tableProps={{
              onRowClick: () => setCount(count + 1),
              renderDetail: () => <p>detail {count}</p>,
            }}
          />
        </>
      )
    }
    render(<Parent />)
    renders.cell = 0

    await user.click(screen.getByRole('button', { name: 'bump' }))

    expect(renders.cell).toBe(0)
  })
})

describe('values that would go stale under the compiler', () => {
  it('hiding a column removes its cells', () => {
    let table!: AnyTable
    render(<Harness onTable={(t) => (table = t)} />)
    expect(row('a').querySelector('[data-column-id="id"]')).not.toBeNull()

    act(() => table.getColumn('id')!.toggleVisibility(false))

    expect(row('a').querySelector('[data-column-id="id"]')).toBeNull()
  })

  it('select-all follows data changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness data={flat.slice(0, 2)} />)
    await user.click(selectAll())
    expect(state(selectAll())).toBe('checked')

    rerender(<Harness data={flat} />)

    expect(state(selectAll())).toBe('partial')
  })

  it('option changes take effect without remounting', () => {
    const { rerender } = render(<Harness />)
    expect(checkbox('a')).not.toBeNull()

    rerender(<Harness options={{ enableRowSelection: false }} />)

    expect(checkbox('a')).toBeNull()
  })
})

describe('nested selection', () => {
  const expanded: Options = { initialState: { expanded: true } }

  it('cascade: unchecking a child makes its ancestors partial and drops them', async () => {
    const user = userEvent.setup()
    let table!: AnyTable
    render(<Harness options={expanded} onTable={(t) => (table = t)} />)

    await user.click(checkbox('a'))
    expect(['a1', 'a2', 'a2x', 'a2y'].map((id) => state(checkbox(id)))).toEqual(
      ['checked', 'checked', 'checked', 'checked'],
    )

    await user.click(checkbox('a2x'))

    expect(state(checkbox('a'))).toBe('partial')
    expect(state(checkbox('a2'))).toBe('partial')
    expect(
      table
        .getSelectedRowModel()
        .flatRows.map((r) => r.id)
        .sort(),
    ).toEqual(['a1', 'a2y'])
  })

  it('cascade: checking the last child selects the parent', async () => {
    const user = userEvent.setup()
    let table!: AnyTable
    render(<Harness options={expanded} onTable={(t) => (table = t)} />)

    await user.click(checkbox('c1'))

    expect(state(checkbox('c'))).toBe('checked')
    expect(
      table
        .getSelectedRowModel()
        .flatRows.map((r) => r.id)
        .sort(),
    ).toEqual(['c', 'c1'])
  })

  it('independent: a parent selects only itself and never shows partial', async () => {
    const user = userEvent.setup()
    render(<Harness options={{ ...expanded, enableSubRowSelection: false }} />)

    await user.click(checkbox('c'))
    expect(state(checkbox('c1'))).toBe('empty')

    await user.click(checkbox('c'))
    await user.click(checkbox('a1'))
    expect(state(checkbox('a'))).toBe('empty')
  })

  it('independent: select-all selects rows at every depth', async () => {
    const user = userEvent.setup()
    let table!: AnyTable
    render(
      <Harness
        options={{ ...expanded, enableSubRowSelection: false }}
        onTable={(t) => (table = t)}
      />,
    )

    await user.click(selectAll())

    expect(table.getSelectedRowModel().flatRows).toHaveLength(8)
    expect(state(selectAll())).toBe('checked')
  })

  it('switching the mode at runtime changes the behaviour', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness options={expanded} />)
    rerender(
      <Harness options={{ ...expanded, enableSubRowSelection: false }} />,
    )

    await user.click(checkbox('c'))

    expect(state(checkbox('c1'))).toBe('empty')
  })
})

describe('controlled state', () => {
  it('drives checkboxes from external rowSelection, and syncs parents through it', async () => {
    const user = userEvent.setup()
    let external: RowSelectionState = {}
    function Controlled() {
      const [rowSelection, setRowSelection] = useState<RowSelectionState>({
        b: true,
      })
      useEffect(() => {
        external = rowSelection
      })
      return (
        <Harness
          options={{
            initialState: { expanded: true },
            state: { rowSelection },
            onRowSelectionChange: setRowSelection,
          }}
        />
      )
    }
    render(<Controlled />)
    expect(checkbox('b')).toBeChecked()

    await user.click(checkbox('c1'))

    expect(Object.keys(external).sort()).toEqual(['b', 'c', 'c1'])
    expect(state(checkbox('c'))).toBe('checked')
  })

  it('reflects external sorting state', () => {
    const sorting: SortingState = [{ id: 'name', desc: true }]
    render(<Harness data={flat} options={{ state: { sorting } }} />)

    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(rowIds()).toEqual(['z', 'y', 'x'])
  })
})

describe('props', () => {
  const root = () => screen.getByRole('table', { name: 'Items' })

  it('draws row lines only, without stripes, by default', () => {
    render(<Harness />)
    expect(root()).toHaveAttribute('data-border-rows')
    expect(root()).not.toHaveAttribute('data-border-outer')
    expect(root()).not.toHaveAttribute('data-border-columns')
    expect(root()).not.toHaveAttribute('data-striped')
  })

  it('borders: true draws all, false none', () => {
    const { rerender } = render(<Harness tableProps={{ borders: true }} />)
    for (const side of ['outer', 'rows', 'columns'])
      expect(root()).toHaveAttribute(`data-border-${side}`)

    rerender(<Harness tableProps={{ borders: false }} />)
    for (const side of ['outer', 'rows', 'columns'])
      expect(root()).not.toHaveAttribute(`data-border-${side}`)
  })

  it('borders: each key switches one border, the others keep their default', () => {
    const { rerender } = render(
      <Harness tableProps={{ borders: { columns: true } }} />,
    )
    // Column lines added, default row lines kept.
    expect(root()).toHaveAttribute('data-border-columns')
    expect(root()).toHaveAttribute('data-border-rows')
    expect(root()).not.toHaveAttribute('data-border-outer')

    rerender(<Harness tableProps={{ borders: { rows: false } }} />)
    for (const side of ['outer', 'rows', 'columns'])
      expect(root()).not.toHaveAttribute(`data-border-${side}`)

    rerender(
      <Harness
        tableProps={{ borders: { outer: true, rows: false, columns: true } }}
      />,
    )
    expect(root()).toHaveAttribute('data-border-outer')
    expect(root()).toHaveAttribute('data-border-columns')
    expect(root()).not.toHaveAttribute('data-border-rows')
  })

  it('striped: true uses the default tint, a string sets the color', () => {
    const { rerender } = render(<Harness tableProps={{ striped: true }} />)
    expect(root()).toHaveAttribute('data-striped')
    expect(root().style.getPropertyValue('--dt-stripe-bg')).toBe('')

    rerender(<Harness tableProps={{ striped: '#eff6ff' }} />)
    expect(root().style.getPropertyValue('--dt-stripe-bg')).toBe('#eff6ff')
  })

  it('classNames slots replace conflicting defaults', () => {
    render(
      <Harness
        tableProps={{
          classNames: { cell: 'px-6 text-base', headerCell: 'uppercase' },
        }}
      />,
    )
    const cell = row('b').querySelector('[data-slot="cell"]')!
    expect(cell).toHaveClass('px-6', 'text-base', 'py-2')
    expect(cell).not.toHaveClass('px-3', 'text-sm')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveClass(
      'uppercase',
    )
  })

  it('column meta classes apply to that column only', () => {
    const metaColumns = columnHelper.columns([
      columnHelper.accessor('name', {
        header: 'Name',
        meta: { className: 'justify-end', headerClassName: 'text-right' },
      }),
      columnHelper.accessor('id', { header: 'Id' }),
    ])
    render(<Harness options={{ columns: metaColumns }} />)
    expect(row('b').querySelector('[data-column-id="name"]')).toHaveClass(
      'justify-end',
    )
    expect(row('b').querySelector('[data-column-id="id"]')).not.toHaveClass(
      'justify-end',
    )
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveClass(
      'text-right',
    )
  })

  it('classNames.row as a function gets the row state, so state-based classes update', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        tableProps={{
          classNames: {
            row: (r, { selected }) =>
              selected ? 'font-bold' : r.original.id === 'b' && 'italic',
          },
        }}
      />,
    )
    expect(row('b')).toHaveClass('italic')
    expect(row('c')).not.toHaveClass('italic', 'font-bold')

    await user.click(checkbox('c'))

    expect(row('c')).toHaveClass('font-bold')
  })

  it('classNames.cell as a function gets the cell, and wins over column meta', () => {
    const metaColumns = columnHelper.columns([
      columnHelper.accessor('name', {
        header: 'Name',
        meta: { className: 'text-left' },
      }),
      columnHelper.accessor('id', { header: 'Id' }),
    ])
    render(
      <Harness
        options={{ columns: metaColumns }}
        tableProps={{
          classNames: {
            cell: (c) => [
              'px-6',
              c.column.id === 'name' &&
                c.row.original.id === 'b' &&
                'text-right',
            ],
          },
        }}
      />,
    )
    const bName = row('b').querySelector('[data-column-id="name"]')!
    expect(bName).toHaveClass('px-6', 'text-right')
    expect(bName).not.toHaveClass('text-left', 'px-3')
    expect(row('a').querySelector('[data-column-id="name"]')).toHaveClass(
      'text-left',
    )
  })

  it('a new classNames object on each consumer render never re-renders your cells', async () => {
    const user = userEvent.setup()
    function Parent() {
      const [count, setCount] = useState(0)
      return (
        <>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            bump {count}
          </button>
          {/* Depends on `count`, so it's a new object on every bump (the
              compiler would hoist a constant literal), with the same class. */}
          <Harness
            tableProps={{ classNames: { cell: count >= 0 ? 'px-6' : 'px-2' } }}
          />
        </>
      )
    }
    render(<Parent />)
    renders.cell = 0

    await user.click(screen.getByRole('button', { name: /bump/ }))

    expect(renders.cell).toBe(0)
  })

  it('selectionPlacement="column" moves checkboxes out of the lead cell', () => {
    render(<Harness tableProps={{ selectionPlacement: 'column' }} />)
    expect(
      row('a').querySelector('[data-column-id="__selection"] input'),
    ).not.toBeNull()
    expect(row('a').querySelector('[data-lead] input')).toBeNull()
  })
})
