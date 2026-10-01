import {
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
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
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor, within } from 'storybook/test'
import { StoryTable } from './stories/StoryTable'
import type { DataTableProps } from './DataTable'
import {
  BudgetCell,
  DateCell,
  NameCell,
  ProjectDetail,
  StatusCell,
} from '#/demo/cells'
import { projects } from '#/demo/data'
import type { Project } from '#/demo/data'

// ---------------------------------------------------------------------------
// Fixtures (module scope, like a real consumer)
// ---------------------------------------------------------------------------

const sortFns = {
  alphanumeric: sortFn_alphanumeric,
  basic: sortFn_basic,
  datetime: sortFn_datetime,
  text: sortFn_text,
}

/** Everything DataTable has UI for. */
const features = tableFeatures({
  rowSelectionFeature,
  rowExpandingFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns,
})
const h = createColumnHelper<typeof features, Project>()
type ProjectColumn = ColumnDef<typeof features, Project, any>

const nameColumn: ProjectColumn = h.accessor('name', {
  header: 'Name',
  size: 220,
  cell: NameCell,
})
const dataColumns: Array<ProjectColumn> = [
  nameColumn,
  h.accessor('owner', { header: 'Owner', size: 120 }),
  h.accessor('status', { header: 'Status', size: 120, cell: StatusCell }),
  h.accessor('budget', {
    header: 'Budget',
    size: 120,
    cell: BudgetCell,
    meta: { grow: false },
  }),
  h.accessor('updatedAt', { header: 'Updated', size: 140, cell: DateCell }),
]
const columns = dataColumns

const treeData = projects.slice(0, 12)
const flatData = treeData.map(({ children: _children, ...project }) => project)

const getRowId = (row: Project) => row.id
const getSubRows = (row: Project) => row.children
const renderDetail: NonNullable<
  DataTableProps<typeof features, Project>['renderDetail']
> = (row) =>
  row.original.notes ? <ProjectDetail project={row.original} /> : null

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

type StoryArgs = Pick<
  DataTableProps<typeof features, Project>,
  | 'stickyHeader'
  | 'isLoading'
  | 'striped'
  | 'borders'
  | 'className'
  | 'aria-label'
> & {
  /** Story-only: logged in the Actions panel by the RowClick story. */
  onRowClicked?: (name: string) => void
}

const meta = {
  title: 'Components/DataTable',
  args: {
    stickyHeader: true,
    isLoading: false,
    striped: false,
    borders: { outer: true, rows: true },
    className: 'max-h-[420px] rounded',
    'aria-label': 'Projects',
  },
  argTypes: {
    stickyHeader: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    striped: { control: 'boolean' },
    borders: { control: 'object' },
    className: { control: 'text' },
  },
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<StoryArgs>

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** All features together: selection, tree rows, detail panels, sorting, resizing. */
export const Playground: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{
        getRowId,
        getSubRows,
        getRowCanExpand: (row) =>
          row.subRows.length > 0 || !!row.original.notes,
        enableMultiSort: false,
        columnResizeMode: 'onChange',
      }}
      renderDetail={renderDetail}
      toolbar={(table) => (
        <table.Subscribe source={table.atoms.rowSelection}>
          {(rowSelection) => (
            <span>{Object.keys(rowSelection).length} selected</span>
          )}
        </table.Subscribe>
      )}
    />
  ),
}

const noFeatures = tableFeatures({})
const plain = createColumnHelper<typeof noFeatures, Project>()

/** No optional features registered: no sorting, selection, toggles or resize handles. */
export const Minimal: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={noFeatures}
      columns={plain.columns([
        plain.accessor('name', { header: 'Name' }),
        plain.accessor('owner', { header: 'Owner' }),
        plain.accessor('status', { header: 'Status' }),
      ])}
      data={flatData.slice(0, 5)}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0)
    await expect(
      canvas.queryByRole('button', { name: /Name/ }),
    ).not.toBeInTheDocument()
  },
}

const sortingFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})
const sortH = createColumnHelper<typeof sortingFeatures, Project>()

/** Click a header to cycle asc → desc → none. Single-column only. */
export const Sorting: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={sortingFeatures}
      columns={sortH.columns([
        sortH.accessor('name', { header: 'Name', cell: NameCell }),
        sortH.accessor('owner', { header: 'Owner' }),
        sortH.accessor('budget', {
          header: 'Budget',
          cell: BudgetCell,
          // Opt a column out of sorting.
          enableSorting: false,
        }),
      ])}
      data={flatData}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole('columnheader', { name: /Owner/ })
    await expect(header).toHaveAttribute('aria-sort', 'none')
    await userEvent.click(canvas.getByRole('button', { name: /Owner/ }))
    await expect(header).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(canvas.getByRole('button', { name: /Owner/ }))
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    await expect(
      canvas.queryByRole('button', { name: /Budget/ }),
    ).not.toBeInTheDocument()
  },
}

/**
 * Registering `rowSelectionFeature` shows checkboxes in the lead cell; the
 * header checkbox toggles all rows.
 */
export const RowSelection: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={flatData}
      tableOptions={{ getRowId }}
      toolbar={(table) => (
        <table.Subscribe source={table.atoms.rowSelection}>
          {(rowSelection) => (
            <span>{Object.keys(rowSelection).length} selected</span>
          )}
        </table.Subscribe>
      )}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const [first] = canvas.getAllByRole('checkbox', { name: 'Select row' })
    await userEvent.click(first)
    await expect(first.closest('[role="row"]')).toHaveAttribute(
      'data-selected',
      'true',
    )
    await expect(canvas.getByText('1 selected')).toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole('checkbox', { name: 'Select all rows' }),
    )
    await expect(
      canvas.getByText(`${flatData.length} selected`),
    ).toBeInTheDocument()
  },
}

/** `enableMultiRowSelection: false`: one row at a time, no select-all. */
export const SingleRowSelection: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={flatData}
      tableOptions={{ getRowId, enableMultiRowSelection: false }}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole('checkbox', { name: 'Select all rows' }),
    ).not.toBeInTheDocument()
    const [first, second] = canvas.getAllByRole('checkbox', {
      name: 'Select row',
    })
    await userEvent.click(first)
    await userEvent.click(second)
    await expect(first).not.toBeChecked()
    await expect(second).toBeChecked()
  },
}

/**
 * `getSubRows` + `expandedRowModel`. The lead cell (first column) renders
 * toggle → checkbox → your content, indented by depth.
 */
export const TreeRows: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{ getRowId, getSubRows }}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvasElement.querySelector('[data-depth="1"]')).toBeNull()
    const [toggle] = canvas.getAllByRole('button', { name: 'Expand row' })
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-depth="1"]')).not.toBeNull(),
    )
  },
}

const checkboxOf = (canvasElement: HTMLElement, rowId: string) => {
  const input = canvasElement.querySelector<HTMLInputElement>(
    `[data-row-id="${rowId}"] input[type="checkbox"]`,
  )
  if (!input) throw new Error(`No checkbox for row ${rowId}`)
  return input
}
const stateOf = (input: HTMLInputElement) =>
  input.checked ? 'checked' : input.indeterminate ? 'partial' : 'empty'

/**
 * Default `enableSubRowSelection: true`: selecting a parent selects its
 * children, and a parent is selected exactly when all its children are
 * (unchecking one child makes its ancestors partial).
 */
export const CascadeSelection: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{ getRowId, getSubRows, initialState: { expanded: true } }}
      toolbar={(table) => (
        <table.Subscribe source={table.atoms.rowSelection}>
          {(rowSelection) => (
            <span>{Object.keys(rowSelection).length} selected</span>
          )}
        </table.Subscribe>
      )}
    />
  ),
  play: async ({ canvasElement, userEvent }) => {
    const parent = treeData.find((p) => p.children?.length)!
    const [child] = parent.children!
    await userEvent.click(checkboxOf(canvasElement, parent.id))
    await expect(stateOf(checkboxOf(canvasElement, child.id))).toBe('checked')
    await userEvent.click(checkboxOf(canvasElement, child.id))
    await expect(stateOf(checkboxOf(canvasElement, parent.id))).toBe(
      parent.children!.length > 1 ? 'partial' : 'empty',
    )
    await userEvent.click(checkboxOf(canvasElement, child.id))
    await expect(stateOf(checkboxOf(canvasElement, parent.id))).toBe('checked')
  },
}

/**
 * `enableSubRowSelection: false`: every row is selected on its own; parents
 * never show partial. Select-all still selects rows at every depth.
 * A predicate (`(row) => row.depth === 0`) mixes both modes per row.
 */
export const IndependentSelection: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{
        getRowId,
        getSubRows,
        initialState: { expanded: true },
        enableSubRowSelection: false,
      }}
      toolbar={(table) => (
        <table.Subscribe source={table.atoms.rowSelection}>
          {(rowSelection) => (
            <span>{Object.keys(rowSelection).length} selected</span>
          )}
        </table.Subscribe>
      )}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const parent = treeData.find((p) => p.children?.length)!
    const [child] = parent.children!
    await userEvent.click(checkboxOf(canvasElement, parent.id))
    await expect(stateOf(checkboxOf(canvasElement, child.id))).toBe('empty')
    await expect(canvas.getByText('1 selected')).toBeInTheDocument()
    await userEvent.click(checkboxOf(canvasElement, parent.id))
    await userEvent.click(checkboxOf(canvasElement, child.id))
    await expect(stateOf(checkboxOf(canvasElement, parent.id))).toBe('empty')
    await userEvent.click(
      canvas.getByRole('checkbox', { name: 'Select all rows' }),
    )
    const total = (rows: Array<Project>): number =>
      rows.reduce((sum, row) => sum + 1 + total(row.children ?? []), 0)
    await expect(
      canvas.getByText(`${total(treeData)} selected`),
    ).toBeInTheDocument()
  },
}

/**
 * `selectionPlacement="column"`: checkboxes in a fixed first column, aligned
 * across depths, while the toggle stays in the lead cell.
 */
export const SelectionColumn: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{ getRowId, getSubRows, initialState: { expanded: true } }}
      selectionPlacement="column"
    />
  ),
  play: async ({ canvasElement }) => {
    const checkboxCells = canvasElement.querySelectorAll(
      '[data-slot="cell"][data-column-id="__selection"] input',
    )
    await expect(checkboxCells.length).toBeGreaterThan(0)
    await expect(
      canvasElement.querySelector('[data-lead] input[type="checkbox"]'),
    ).toBeNull()
  },
}

/** `enableRowSelection: false` hides the checkboxes; a function disables some rows. */
export const SelectionDisabled: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <StoryTable
        {...args}
        aria-label="No checkboxes"
        features={features}
        columns={columns}
        data={treeData}
        tableOptions={{ getRowId, getSubRows, enableRowSelection: false }}
      />
      <StoryTable
        {...args}
        aria-label="Done rows disabled"
        features={features}
        columns={columns}
        data={flatData}
        tableOptions={{
          getRowId,
          enableRowSelection: (row) => row.original.status !== 'done',
        }}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const [hidden, partial] = canvas.getAllByRole('table')
    await expect(
      within(hidden).queryAllByRole('checkbox', { name: 'Select row' }),
    ).toHaveLength(0)
    const disabled = within(partial)
      .getAllByRole('checkbox', { name: 'Select row' })
      .filter((checkbox) => (checkbox as HTMLInputElement).disabled)
    await expect(disabled.length).toBeGreaterThan(0)
  },
}

/** `renderDetail` + `getRowCanExpand`: rows expand into a full-width panel. */
export const DetailPanel: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={flatData}
      tableOptions={{
        getRowId,
        getRowCanExpand: (row) => !!row.original.notes,
      }}
      renderDetail={renderDetail}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const [toggle] = canvas.getAllByRole('button', { name: 'Expand row' })
    await userEvent.click(toggle)
    const panel = canvasElement.querySelector('[data-slot="detail"]')
    await expect(panel).not.toBeNull()
    await expect(toggle).toHaveAttribute('aria-controls', panel?.id)
  },
}

/** Sub-rows and detail panels share the expanded state: panel first, then children. */
export const TreeWithDetail: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={treeData}
      tableOptions={{
        getRowId,
        getSubRows,
        getRowCanExpand: (row) =>
          row.subRows.length > 0 || !!row.original.notes,
        initialState: { expanded: true },
      }}
      renderDetail={renderDetail}
    />
  ),
}

/** `meta: { lead: true }` moves the toggle + checkbox to another column. */
export const CustomLeadColumn: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={h.columns([
        h.accessor('owner', {
          header: 'Owner',
          size: 180,
          meta: { lead: true },
        }),
        ...dataColumns.filter((column) => column !== dataColumns[1]),
      ])}
      data={treeData}
      tableOptions={{ getRowId, getSubRows }}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-slot="header-cell"][data-lead]'),
    ).toHaveAttribute('data-column-id', 'owner')
  },
}

/**
 * Columns are `minmax(size, grow fr)` grid tracks. Name takes 3× the leftover
 * space, Budget is fixed. Drag a header edge to resize; double-click resets.
 */
export const FluidAndResizableColumns: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={h.columns([
        h.accessor('name', {
          header: 'Name (grow: 3)',
          size: 160,
          cell: NameCell,
          meta: { grow: 3 },
        }),
        h.accessor('owner', { header: 'Owner (grow: 1)', size: 120 }),
        h.accessor('budget', {
          header: 'Budget (fixed)',
          size: 140,
          cell: BudgetCell,
          meta: { grow: false },
        }),
        h.accessor('status', {
          header: 'Status (not resizable)',
          size: 180,
          cell: StatusCell,
          enableResizing: false,
        }),
      ])}
      data={flatData}
      tableOptions={{ getRowId, columnResizeMode: 'onChange' }}
      toolbar={(table) => (
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => table.resetColumnSizing()}
        >
          Reset widths
        </button>
      )}
    />
  ),
}

/** Group columns render as an extra header row spanning their children. */
export const GroupedHeaders: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={h.columns([
        h.group({
          id: 'project',
          header: 'Project',
          columns: dataColumns.slice(0, 2),
        }),
        h.group({
          id: 'details',
          header: 'Details',
          columns: dataColumns.slice(2),
        }),
      ])}
      data={flatData}
      tableOptions={{ getRowId }}
    />
  ),
}

/** `columnVisibilityFeature`: hidden columns drop out of the grid and the rows. */
export const ColumnVisibility: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={flatData}
      tableOptions={{ getRowId }}
      toolbar={(table) => (
        <table.Subscribe source={table.atoms.columnVisibility}>
          {() =>
            table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <label key={column.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  {column.id}
                </label>
              ))
          }
        </table.Subscribe>
      )}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'owner' }))
    await expect(
      canvasElement.querySelector('[data-slot="cell"][data-column-id="owner"]'),
    ).toBeNull()
  },
}

/** Rows become clickable and focusable (Enter). Clicks on controls are ignored. */
export const RowClick: Story = {
  args: { onRowClicked: fn() },
  render: ({ onRowClicked, ...args }) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={flatData}
      tableOptions={{ getRowId }}
      onRowClick={(row) => onRowClicked?.(row.original.name)}
    />
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(flatData[0].name))
    await expect(args.onRowClicked).toHaveBeenCalledWith(flatData[0].name)
    await userEvent.click(
      canvas.getAllByRole('checkbox', { name: 'Select row' })[1],
    )
    await expect(args.onRowClicked).toHaveBeenCalledTimes(1)
  },
}

/**
 * `striped`: off by default. `true` uses the default tint, a CSS color sets
 * your own (or set the `--dt-stripe-bg` CSS variable). Detail panels don't
 * shift the pattern, and hover/selected backgrounds win over stripes.
 */
export const Striped: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <StoryTable
        {...args}
        aria-label="Default stripes"
        features={features}
        columns={columns}
        data={flatData}
        tableOptions={{
          getRowId,
          getRowCanExpand: (row) => !!row.original.notes,
        }}
        renderDetail={renderDetail}
        striped
      />
      <StoryTable
        {...args}
        aria-label="Custom stripes"
        features={features}
        columns={columns}
        data={flatData}
        tableOptions={{ getRowId }}
        striped="#eff6ff"
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const [defaultStripes, custom] = canvas.getAllByRole('table')
    const bodyRows = (table: HTMLElement) => [
      ...table.querySelectorAll<HTMLElement>(
        '[data-slot="body"] [data-slot="row"]',
      ),
    ]
    const bg = (el: HTMLElement) => getComputedStyle(el).backgroundColor
    const [first, second] = bodyRows(defaultStripes)
    await expect(bg(first)).toBe('rgba(0, 0, 0, 0)')
    await expect(bg(second)).toBe('rgba(0, 0, 0, 0.03)')
    await expect(bg(bodyRows(custom)[1])).toBe('rgb(239, 246, 255)')
  },
}

/**
 * `borders`: row lines by default. `true` draws all, `false` none, and
 * `{ outer, rows, columns }` switches each one independently: keys you leave
 * out keep their default. Color: the `--dt-border-color` variable.
 */
export const Borders: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(
        [
          ['Default (rows)', undefined],
          ['None', false],
          ['Outer + rows', { outer: true }],
          ['Columns only', { rows: false, columns: true }],
          ['All', true],
        ] as const
      ).map(([label, borders]) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{label}</span>
          <StoryTable
            {...args}
            className="max-h-48"
            aria-label={label}
            features={features}
            columns={columns}
            data={flatData.slice(0, 3)}
            tableOptions={{ getRowId }}
            borders={borders}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const widths = (name: string) => {
      const table = canvas.getByRole('table', { name })
      const row = table.querySelector<HTMLElement>(
        '[data-slot="body"] [data-slot="row"]',
      )!
      const cell = row.querySelector<HTMLElement>('[data-slot="cell"]')!
      return [
        getComputedStyle(table).borderTopWidth,
        getComputedStyle(row).borderBottomWidth,
        getComputedStyle(cell).borderRightWidth,
      ]
    }
    await expect(widths('Default (rows)')).toEqual(['0px', '1px', '0px'])
    await expect(widths('None')).toEqual(['0px', '0px', '0px'])
    await expect(widths('Outer + rows')).toEqual(['1px', '1px', '0px'])
    await expect(widths('Columns only')).toEqual(['0px', '0px', '1px'])
    await expect(widths('All')).toEqual(['1px', '1px', '1px'])
  },
}

/**
 * Overrides: `classNames` per part (`row` and `cell` also take a function, for
 * data- or state-driven classes), and `meta.className` / `meta.headerClassName`
 * per column. Merged with `cn`, so they replace conflicting defaults.
 */
export const CustomStyles: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={h.columns([
        nameColumn,
        h.accessor('owner', { header: 'Owner', size: 120 }),
        h.accessor('budget', {
          header: 'Budget',
          size: 120,
          cell: BudgetCell,
          meta: {
            grow: false,
            className: 'justify-end font-mono',
            headerClassName: 'justify-end',
          },
        }),
      ])}
      data={flatData}
      tableOptions={{ getRowId }}
      classNames={{
        header: 'bg-slate-800 text-white',
        headerCell: 'py-3 uppercase tracking-wide text-xs',
        // A function: from the row's data and state. Returns anything `cn` takes.
        row: (row, { selected }) => [
          'data-selected:bg-amber-50',
          selected
            ? 'font-semibold'
            : row.original.status === 'blocked' && 'text-red-700',
        ],
        // A function: from the cell's data.
        cell: (cell) => [
          'px-5',
          cell.column.id === 'budget' &&
            Number(cell.getValue()) > 80_000 &&
            'text-emerald-700',
        ],
      }}
    />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const cell = canvasElement.querySelector<HTMLElement>(
      '[data-slot="body"] [data-slot="cell"][data-column-id="owner"]',
    )!
    await expect(getComputedStyle(cell).paddingLeft).toBe('20px')
    const header = canvasElement.querySelector<HTMLElement>(
      '[data-slot="header"]',
    )!
    await expect(getComputedStyle(header).backgroundColor).not.toBe(
      'rgb(255, 255, 255)',
    )
    const [first] = canvas.getAllByRole('checkbox', { name: 'Select row' })
    await userEvent.click(first)
    const row = first.closest<HTMLElement>('[role="row"]')!
    await expect(row).toHaveClass('font-semibold')
    const rich = flatData.find((project) => project.budget > 80_000)!
    await expect(
      canvasElement.querySelector(
        `[data-row-id="${rich.id}"] [data-column-id="budget"]`,
      ),
    ).toHaveClass('text-emerald-700')
    // `cn` replaced the default selected background instead of adding to it.
    await expect(row).toHaveClass('data-selected:bg-amber-50')
    await expect(row).not.toHaveClass('data-selected:bg-blue-50')
  },
}

export const Loading: Story = {
  args: { isLoading: true },
  render: (args) => (
    <StoryTable {...args} features={features} columns={columns} data={[]} />
  ),
}

export const Empty: Story = {
  render: (args) => (
    <StoryTable {...args} features={features} columns={columns} data={[]} />
  ),
}

/** Any node works for `emptyState` / `loadingState`. */
export const CustomStates: Story = {
  render: (args) => (
    <StoryTable
      {...args}
      features={features}
      columns={columns}
      data={[]}
      emptyState={
        <div className="p-8 text-center">
          <p className="font-medium">No projects yet</p>
          <p className="text-sm opacity-60">Create one to get started.</p>
        </div>
      }
      loadingState={<div className="p-8 text-center">Fetching projects…</div>}
    />
  ),
}
