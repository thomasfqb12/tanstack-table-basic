# DataTable

A reusable, div-based (CSS grid) table for TanStack Table **v9**.

You own the table: create it with `useTable`, pick the features, define the
columns and cells, then hand it over with `<DataTable table={table} />`.
DataTable renders the layout, the header (sorting, resizing), the rows (tree
indentation, expand toggle, detail panel, selection state) and the empty and
loading states. Everything else, including every cell, is yours.

- **Live examples**: `pnpm storybook`, then Components / DataTable. Each
  feature has a story, and the stories with a `play` function double as
  interaction tests.
- **Why it's built this way**: [ADR 0001](../../../docs/adr/0001-datatable.md).
- **Full demo**: `src/demo/ProjectsTable.tsx` (`pnpm dev`).
- **Not built yet** (search states, column pinning, keyboard navigation,
  filters, pagination...): see
  [Deferred features](../../../docs/adr/0001-datatable.md#deferred-features)
  for what already works and how to add the rest.

**Configuring a table** happens in three places:

1. **`useTable` options**: features, data, and behaviour such as selection
   modes or which rows can expand. See
   [Table options DataTable reacts to](#table-options-datatable-reacts-to).
2. **Column definitions**: size, sorting, resizing, and `meta.grow` /
   `meta.lead`. See [Column options](#column-options).
3. **`<DataTable>` props**: rendering, layout and interaction. See
   [Props](#props).

## Usage

```tsx
import {
  columnResizingFeature,
  columnSizingFeature,
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
  createColumnHelper,
  useTable,
} from '@tanstack/react-table'
import { DataTable } from '#/components/data-table'

// 1. Features: module scope. Register only what this table needs.
const features = tableFeatures({
  rowSelectionFeature,
  rowExpandingFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(), // needed for sub-rows
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
})

// 2. Columns: module scope (or useMemo). Only your data columns: DataTable
//    adds the expand toggle and the checkbox itself.
const columnHelper = createColumnHelper<typeof features, Person>()
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name', size: 200, cell: NameCell }),
  columnHelper.accessor('age', {
    header: 'Age',
    size: 80,
    meta: { grow: false },
  }),
])

function PeopleTable({ data }: { data: Array<Person> }) {
  const table = useTable(
    {
      features,
      columns,
      data,
      getRowId: (row) => row.id,
      getSubRows: (row) => row.children,
      enableMultiSort: false,
    },
    () => ({}), // see "Performance"
  )

  return (
    <DataTable
      table={table}
      className="max-h-[600px]"
      renderDetail={(row) => <PersonDetail person={row.original} />}
      onRowClick={(row) => navigate(row.original.id)}
    />
  )
}
```

## Props

| Prop                 | Default      | Notes                                                                                                                        |
| -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `table`              | required     | Instance from `useTable`.                                                                                                    |
| `renderDetail`       | —            | Panel under an expanded row. Return `null` for rows without one.                                                             |
| `selectionPlacement` | `'lead'`     | `'lead'`: checkbox in the lead cell. `'column'`: own first column.                                                           |
| `selectAllScope`     | `'all'`      | What the header checkbox toggles: `'all'` rows or the current `'page'`.                                                      |
| `onRowClick`         | —            | Makes rows clickable and focusable (Enter). Ignores clicks on controls.                                                      |
| `stickyHeader`       | `true`       | The table is its own scroll container: give it a height.                                                                     |
| `isLoading`          | `false`      | Shows `loadingState` instead of rows and sets `aria-busy`.                                                                   |
| `loadingState`       | `Loading…`   | Any node.                                                                                                                    |
| `emptyState`         | `No results` | Any node.                                                                                                                    |
| `borders`            | rows only    | `true` (all), `false` (none), or switch each with `{ outer, rows, columns }`; omitted keys keep their default.               |
| `striped`            | `false`      | `true`: default tint. A CSS color (`'#f8fafc'`): your own.                                                                   |
| `className`          | —            | Classes for the root (scroll container).                                                                                     |
| `classNames`         | —            | Classes per part: `{ root, header, headerRow, headerCell, body, row, cell, detail }`. `row` and `cell` also take a function. |
| `aria-*`             | —            | Applied to the root.                                                                                                         |

## Table options DataTable reacts to

Behaviour that TanStack already models is configured on `useTable`, not with
DataTable props. DataTable follows these options:

| Option (`useTable`)       | Effect in DataTable                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `features`                | UI only for registered features: sort buttons, checkboxes, expand toggles, resize handles.                                           |
| `getSubRows`              | Tree rows: the toggle and depth indentation appear in the lead cell. Needs `expandedRowModel` in `features`.                         |
| `getRowCanExpand`         | Makes rows expandable without sub-rows (detail panels with `renderDetail`).                                                          |
| `enableRowSelection`      | `false` hides the checkboxes. A function disables the checkbox of some rows.                                                         |
| `enableMultiRowSelection` | `false` gives single selection, and hides select-all.                                                                                |
| `enableSubRowSelection`   | Nested selection mode: `true` (default) cascades parent ↔ children, `false` selects each row on its own, a function decides per row. |
| `enableSorting`           | `false` removes the sort buttons (also per column).                                                                                  |
| `enableColumnResizing`    | `false` removes the resize handles (also `enableResizing` per column).                                                               |
| `columnResizeMode`        | `'onChange'`: live resizing. `'onEnd'`: preview handle, resize on release.                                                           |
| `manualSorting`, `state`  | Server-side or controlled state work as usual: DataTable reads state from the table.                                                 |

`enableMultiSort` has no effect: header sorting is always single-column.

## Column options

| Column definition          | Effect in DataTable                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `size`                     | Minimum width (px). Below the sum of sizes, the table scrolls horizontally.             |
| `minSize`, `maxSize`       | Resize limits.                                                                          |
| `meta.grow`                | Share of leftover width (`1` by default). `false`: always `size` px.                    |
| `meta.lead`                | `true` puts the lead cell (toggle → checkbox → content) in this column, not the first.  |
| `meta.className`           | Classes for this column's cells (e.g. `justify-end tabular-nums`).                      |
| `meta.headerClassName`     | Classes for this column's header cell.                                                  |
| `enableSorting`            | `false`: no sort button on this header.                                                 |
| `enableResizing`           | `false`: no resize handle on this header.                                               |
| `header`, `cell`, `footer` | Yours. Cells receive TanStack's cell context. See "A custom cell that reacts to state". |

If your features declare their own `columnMeta` slot, include
`DataTableColumnMeta` in it so `grow`, `lead`, `className` and
`headerClassName` stay typed.

## Features

- **Sorting**: click a sortable header to cycle asc → desc → none. Always
  single-column (shift-click does not add sorts). Client vs server sorting
  (`manualSorting`) is up to your table config.
- **Lead cell**: the first column's cell renders
  **toggle → checkbox → your content**, all indented by row depth (your cell
  renders unchanged). The header matches it (empty toggle slot → select-all →
  label), so everything lines up. `meta: { lead: true }` moves it to another
  column. Indent per level defaults to `1.25rem`; override it with the
  `--dt-indent` CSS variable on the table. A slot only appears when it's needed:
  no toggle slot if no row can expand, no checkbox if selection is off.
- **Nested rows**: `getSubRows` + `expandedRowModel` in features. The toggle
  goes in the lead cell.
- **Detail panel**: `renderDetail`. To make rows without sub-rows expandable,
  set `getRowCanExpand` (e.g. `(row) => !!row.original.notes`). Tree rows and
  panels can be combined.
- **Selection**: registering `rowSelectionFeature` shows checkboxes. Turn them
  off, disable some rows or switch to single selection with the TanStack
  options in [the table above](#table-options-datatable-reacts-to).
  `selectionPlacement="column"` moves checkboxes to a fixed first column,
  aligned across depths, for tables where selection matters more than
  hierarchy.
- **Nested selection**: TanStack's `enableSubRowSelection` picks the mode,
  per table or per row:
  - `true` (default), **cascade**: selecting a parent selects its children,
    and a parent is selected exactly when all its selectable children are.
    Unchecking one child makes its ancestors partial; checking the last one
    selects the parent again.
  - `false`, **independent**: every row is selected on its own, and parents
    never show partial.
  - `(row) => boolean`: decide per parent (e.g. only top-level rows cascade).

  In every mode the header checkbox selects every selectable row at every
  depth (TanStack's own select-all skips children of independent parents).

- **Fluid columns + resizing**: each column is a grid track
  `minmax(size px, grow fr)`, so columns fill the width and the table scrolls
  horizontally below the sum of sizes. A resized column becomes fixed at its
  new width, and double-clicking the handle restores it. See
  [Column options](#column-options).

Without a feature registered, its UI simply does not render. A table with only
`features: tableFeatures({})` works.

## Examples

All the stories in `DataTable.stories.tsx` are runnable versions of these.

### Flat table, no optional features

```tsx
const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, Person>()
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email', meta: { grow: 2 } }),
])

function People({ data }: { data: Array<Person> }) {
  const table = useTable({ features, columns, data }, () => ({}))
  return <DataTable table={table} aria-label="People" />
}
```

No sort buttons, checkboxes, toggles or resize handles are rendered: their
features aren't registered.

### Tree rows

```tsx
const table = useTable(
  {
    features, // includes rowExpandingFeature + expandedRowModel
    columns,
    data,
    getRowId: (row) => row.id,
    getSubRows: (row) => row.children,
    initialState: { expanded: { [rootId]: true } }, // optional
  },
  () => ({}),
)
```

The toggle, checkbox and indentation land in the first column. To put them
elsewhere:

```tsx
columnHelper.accessor('owner', { header: 'Owner', meta: { lead: true } })
```

### Detail panel

```tsx
const table = useTable(
  {
    features,
    columns,
    data,
    // Rows have no sub-rows, so tell TanStack which ones can expand.
    getRowCanExpand: (row) => !!row.original.notes,
  },
  () => ({}),
)

<DataTable
  table={table}
  renderDetail={(row) => <ProjectNotes project={row.original} />}
/>
```

Return `null` from `renderDetail` for rows without a panel. Tree rows and
panels can be combined: an expanded row shows its panel first, then its
children.

### Selection, and reading it outside the table

```tsx
// features include rowSelectionFeature: checkboxes appear in the lead cell.
const table = useTable(
  { features, columns, data, getRowId: (row) => row.id },
  () => ({}),
)

return (
  <>
    {/* Re-renders on selection changes; the parent component doesn't. */}
    <table.Subscribe source={table.atoms.rowSelection}>
      {(rowSelection) => (
        <BulkActions
          count={Object.keys(rowSelection).length}
          onDelete={() =>
            remove(table.getSelectedRowModel().rows.map((r) => r.original))
          }
        />
      )}
    </table.Subscribe>
    <DataTable table={table} />
  </>
)
```

### Cascade or independent selection

```tsx
// Default: a parent selects its children; parents follow their children.
useTable({ ...options, getSubRows })

// Each row on its own: selecting a parent doesn't touch its children.
useTable({ ...options, getSubRows, enableSubRowSelection: false })

// Mixed: only top-level rows cascade.
useTable({
  ...options,
  getSubRows,
  enableSubRowSelection: (row) => row.depth === 0,
})

// Switching modes at runtime: reset the selection, since what it means changes.
const [cascade, setCascade] = useState(true)
const table = useTable(
  { ...options, enableSubRowSelection: cascade },
  () => ({}),
)
const onToggle = (next: boolean) => {
  setCascade(next)
  table.resetRowSelection()
}
```

`table.getSelectedRowModel()` returns exactly the checked rows in both modes:
in cascade mode, a fully selected parent is part of it.

### Checkbox placement

```tsx
// Default: toggle → checkbox → content, indented together (tree selection).
<DataTable table={table} />

// Checkboxes in their own fixed first column, aligned at every depth.
<DataTable table={table} selectionPlacement="column" />

// Selection state without checkboxes (e.g. selected via row click).
useTable({ ...options, enableRowSelection: false })

// Some rows can't be selected: their checkbox is disabled.
useTable({ ...options, enableRowSelection: (row) => !row.original.locked })
```

### Controlled state (server-side sorting)

DataTable reads state from the table, so controlled state works as usual:

```tsx
const [sorting, setSorting] = useState<SortingState>([])
// e.g. TanStack Query
const { data = [], isFetching } = useQuery({
  queryKey: ['projects', sorting],
  queryFn: () => fetchProjects(sorting),
})

const table = useTable(
  {
    features, // rowSortingFeature, no sortedRowModel needed
    columns,
    data,
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  },
  () => ({}),
)

return <DataTable table={table} isLoading={isFetching && !data.length} />
```

### A custom cell that reacts to table state

Cells only re-render when their row data changes. A cell that displays state
must subscribe to it:

```tsx
import { useAtomSelector } from '#/components/data-table'

function NameCell({
  row,
  getValue,
}: CellContext<typeof features, Project, string>) {
  const selected = useAtomSelector(
    row.table.atoms.rowSelection,
    (rowSelection) => !!rowSelection?.[row.id],
  )
  return <span className={selected ? 'font-semibold' : ''}>{getValue()}</span>
}
```

For row-level styling, prefer the row's `data-selected` attribute: no
subscription needed.

### Column widths

```tsx
columnHelper.accessor('name', { size: 200, meta: { grow: 3 } }) // 3× the leftover space
columnHelper.accessor('owner', { size: 120 }) // grow: 1 (default)
columnHelper.accessor('amount', { size: 120, meta: { grow: false } }) // always 120px
columnHelper.accessor('status', { size: 140, enableResizing: false }) // no handle
```

`size` is the minimum width, and below the sum of sizes the table scrolls
horizontally. Reset user resizes with `table.resetColumnSizing()`.

### Column visibility

Register `columnVisibilityFeature`, then use the TanStack APIs. DataTable
follows the visible columns:

```tsx
<table.Subscribe source={table.atoms.columnVisibility}>
  {() =>
    table.getAllLeafColumns().map((column) => (
      <label key={column.id}>
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
```

### Stripes and borders

```tsx
<DataTable table={table} striped />                    // default tint
<DataTable table={table} striped="var(--ds-surface-2)" />  // your color

<DataTable table={table} borders={false} />            // no lines
<DataTable table={table} borders />                    // frame + rows + columns

// Each border on or off independently; omitted keys keep their default
// (rows on, outer and columns off).
<DataTable table={table} borders={{ columns: true }} />                // rows + columns
<DataTable table={table} borders={{ rows: false, columns: true }} />   // columns only
<DataTable table={table} borders={{ outer: true }} />                  // frame + rows
```

Stripes count data rows only (detail panels don't shift the pattern), and
hover and selected backgrounds win over them.

### Custom styles

```tsx
const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    // One column: right-aligned numbers.
    meta: { className: 'justify-end tabular-nums', headerClassName: 'justify-end' },
  }),
])

<DataTable
  table={table}
  // Per part. Merged with `cn`: `px-5` replaces the default `px-3`.
  classNames={{
    header: 'bg-slate-800 text-white',
    headerCell: 'uppercase text-xs',
    cell: 'px-5',
    row: 'data-selected:bg-amber-50',
  }}
/>

// `row` and `cell` also take a function. It returns anything `cn` accepts.
// Module scope (or the React Compiler) keeps it stable.
const classNames: DataTableClassNames<
  Row<typeof features, Invoice>,
  Cell<typeof features, Invoice, unknown>
> = {
  // Data and state: use the `state` argument, not `row.getIsSelected()`.
  row: (row, { selected }) => [
    'data-selected:bg-amber-50',
    selected ? 'font-semibold' : row.original.overdue && 'text-red-700',
  ],
  // Data only: cells don't re-render on selection/expansion.
  cell: (cell) => [
    'px-5',
    cell.column.id === 'amount' && Number(cell.getValue()) < 0 && 'text-red-700',
  ],
}

<DataTable table={table} classNames={classNames} />
```

A cell's classes combine from general to specific: `classNames.cell` (string),
then the column's `meta.className`, then `classNames.cell` (function).

### Theming with CSS

Without props, from a stylesheet (yours wins over DataTable's Tailwind
utilities: unlayered CSS beats layered CSS):

```css
[data-slot='data-table'] {
  --dt-border-color: var(--ds-border);
  --dt-stripe-bg: var(--ds-surface-2);
  --dt-indent: 1.5rem; /* tree indent per level */
}
[data-slot='row'][data-depth='0'] {
  font-weight: 500;
}
[data-slot='header-cell'][data-sorted] {
  color: var(--ds-accent);
}
```

## Performance

DataTable subscribes to the table's state atoms at the smallest useful level:

| Change          | What re-renders                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Select a row    | That row (for `data-selected`) and its checkbox. No cells. In cascade mode, also the parents whose state changes. |
| Select all      | Changed rows and their checkboxes. No cells.                                                                      |
| Expand a row    | That row. New sub-rows mount.                                                                                     |
| Sort            | Body + header cell. Cells only for rows TanStack cloned.                                                          |
| Resize a column | DataTable root only (CSS variable). No rows, no cells.                                                            |

To keep it that way:

- **Pass a selector to `useTable`** (`() => ({})` or the slices you actually
  render). Without one, your component and everything below it re-render on
  every state change. Read state lower down with
  `<table.Subscribe source={table.atoms.rowSelection}>` or the exported
  `useAtomSelector`.
- **Keep `features` and `columns` stable** (module scope, or let the React
  Compiler cache them). New arrays invalidate the header and column memos.
- **Cells re-render only when their row data changes.** A custom cell that
  shows table state (selection, expanded...) must subscribe to it itself, e.g.
  `useAtomSelector(row.table.atoms.rowSelection, (s) => !!s?.[row.id])`.
  `renderDetail` output is memoized per row the same way.
- Inline `onRowClick` is fine (read from a ref in the event handler). A new
  `renderDetail` function re-renders the open detail panels only.
- `classNames`: a new object with the same strings changes nothing. A new
  `row` or `cell` function re-renders the rows or cells that call it (not
  your cell components), so define it at module scope or let the compiler
  keep it stable.

### React Compiler

DataTable is written for the React Compiler, which the consuming project
enables. It has no manual `memo`/`useMemo`, with one exception:
`DataTableRow` keeps `memo`, because the compiler caches the body's
`rows.map(...)` as a whole, not per row. In this repo, the compiler runs in
`vite.config.ts` (Babel, `@babel/core` 7), and `pnpm compiler:report` checks
that every component compiles.

When writing code that touches the table under the compiler:

- TanStack table/row/column objects keep their identity while their answers
  change, and the compiler caches values by identity. Read things like
  `row.getCanSelect()` or `table.options.x` **inside a selector**
  (`useAtomSelector` / `useTableSelector`), not directly in render.
- Call TanStack methods from handlers (`onClick={() => row.toggleExpanded()}`)
  instead of passing handlers built during render
  (`onClick={row.getToggleExpandedHandler()}`), which would be cached.
- Derive per-row lists from props the compiler can see (e.g. cells from the
  `columns` prop), not from hidden table state.

## Exports

From `#/components/data-table`:

| Export                                                                                                                                                          | Use                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DataTable`, `DataTableProps`                                                                                                                                   | The component.                                                                       |
| `RowExpandToggle`, `RowSelectionCheckbox`                                                                                                                       | The lead cell controls, for custom placement (each subscribes to its own row state). |
| `SelectAllCheckbox`, `SelectAllScope`                                                                                                                           | The header checkbox, e.g. in a toolbar.                                              |
| `useAtomSelector`, `useTableSelector`                                                                                                                           | Subscribe a component to one state slice, or to a value derived from the table.      |
| `DataTableColumnMeta`, `SelectionPlacement`, `DataTableBorders`, `DataTableClassNames`, `RowClassName`, `CellClassName`, `RowClassNameState`, `ClassNameResult` | Types.                                                                               |

## Testing

```bash
pnpm test              # everything
pnpm test:unit         # logic + React Testing Library, in jsdom (fast)
pnpm test:storybook    # every story + its play function, in Chromium
pnpm test:watch        # unit tests in watch mode
```

| Layer     | Files                                 | Covers                                                                                                                                  |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Logic     | `selection.test.ts`, `layout.test.ts` | Cascade parent sync (all modes), select-all rows, grid tracks, lead layout                                                              |
| Behaviour | `DataTable.test.tsx` (RTL)            | Re-render isolation (spy cells), values that go stale under the React Compiler, selection end to end, controlled state, class overrides |
| Stories   | `DataTable.stories.tsx` (`play`)      | Each feature in a real browser, including computed layout (borders, stripes, padding)                                                   |

Tests run compiled with the React Compiler (`vitest.config.ts`), like the
consuming project, so compiler-only bugs show up. When adding a feature:
add a story (and a `play` function), and a `DataTable.test.tsx` case if it
has a performance or staleness guarantee.

## Troubleshooting

- **Sub-rows don't show when expanding**: add `expandedRowModel:
createExpandedRowModel()` to `features`.
- **Sorting does nothing / "sortFn is not registered" warning**: add
  `sortedRowModel: createSortedRowModel()` and the `sortFns` you use to
  `features` (or use `manualSorting`).
- **The header doesn't stick**: the table is its own scroll container; give it
  a height (`className="max-h-[600px]"`).
- **A custom cell doesn't update when selection/expansion changes**: cells
  only re-render when their row data changes; subscribe with
  `useAtomSelector` (see the example above).
- **Classes in `classNames` don't apply**: Tailwind only generates classes it
  finds in scanned files. Classes written in your code are scanned. If
  DataTable lives outside your app's scanned folders (e.g. a package), add
  `@source "<path to data-table>";` to your Tailwind CSS entry.
- **An override doesn't replace a default**: `cn` only replaces a default
  with the same variant. `row: 'bg-amber-50'` doesn't replace the selected
  background `data-selected:bg-blue-50`; use the same variant:
  `row: 'data-selected:bg-amber-50'`.
- **Every row re-renders on each interaction**: pass a selector to `useTable`
  (`() => ({})`), and define `features`/`columns` at module scope or let the
  compiler cache them.
- **Selecting a parent selects its children (or doesn't)**: that's
  `enableSubRowSelection`. See [Nested selection](#features).

## Styling and design system

Styling is minimal Tailwind. From least to most control:

1. **Props**: `striped`, `borders`.
2. **CSS variables**: `--dt-border-color`, `--dt-stripe-bg`, `--dt-indent`.
3. **Classes**: `className` / `classNames` slots (`row` and `cell` also as
   functions), and column `meta.className` / `meta.headerClassName`. They're merged over the defaults
   with `cn` (the `cn` package), so conflicting defaults are replaced.
   Without overrides, no merge runs.
4. **Global CSS** on the `data-*` hooks (below).
5. **Swap the defaults**: the checkbox, icon button, icons and empty/loading
   states live in `primitives.tsx`, and the default classes per part in
   `styles.ts`. Replace them with design system components and classes.

`data-*` hooks:

- `data-slot`: `data-table`, `header`, `header-cell`, `resize-handle`,
  `body`, `row`, `cell`, `detail`, `state`
- On rows: `data-selected`, `data-expanded`, `data-clickable`, `data-depth`,
  `data-row-id`, and the `--dt-depth` CSS variable
- On header cells: `data-sorted="asc|desc"`, `data-column-id`; on cells:
  `data-column-id`. Both get `data-lead` in the lead column. In
  `selectionPlacement="column"` mode the checkbox column has
  `data-column-id="__selection"`

## Accessibility

ARIA `table` roles (`rowgroup`, `row`, `columnheader`, `cell`), `aria-sort` on
sortable headers, and `aria-expanded` + `aria-controls` on the expand toggle.
Selection state is exposed by the checkbox itself. `aria-selected` and
`aria-expanded` on rows are only valid in `grid`/`treegrid`, which also require
arrow-key navigation, so they are not used.
