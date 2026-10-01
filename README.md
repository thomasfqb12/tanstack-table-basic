Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

# DataTable

`src/components/data-table` is a reusable, div-based (CSS grid) table for
TanStack Table **v9**. You own the table: create it with `useTable`, pick the
features, define the columns and cells, then hand it over:
`<DataTable table={table} />`. The demo lives in `src/demo/ProjectsTable.tsx`.

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
  useTable,
} from '@tanstack/react-table'
import { DataTable, createDataTableColumnHelper } from '#/components/data-table'

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

// 2. Columns: module scope (or useMemo). Same API as createColumnHelper,
//    plus a .selection() utility column.
const columnHelper = createDataTableColumnHelper<typeof features, Person>()
const columns = columnHelper.columns([
  columnHelper.selection(),
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

| Prop                  | Default      | Notes                                                                   |
| --------------------- | ------------ | ----------------------------------------------------------------------- |
| `table`               | required     | Instance from `useTable`.                                               |
| `renderDetail`        | —            | Panel under an expanded row. Return `null` for rows without one.        |
| `onRowClick`          | —            | Makes rows clickable and focusable (Enter). Ignores clicks on controls. |
| `stickyHeader`        | `true`       | The table is its own scroll container: give it a height.                |
| `isLoading`           | `false`      | Shows `loadingState` instead of rows and sets `aria-busy`.              |
| `loadingState`        | `Loading…`   | Any node.                                                               |
| `emptyState`          | `No results` | Any node.                                                               |
| `className`, `aria-*` | —            | Applied to the root.                                                    |

## Features

- **Sorting**: click a sortable header to cycle asc → desc → none. Always
  single-column (shift-click does not add sorts). Client vs server sorting
  (`manualSorting`) is up to your table config.
- **Selection**: `columnHelper.selection({ scope: 'all' | 'page' })`. Single or
  multi, sub-row selection and range selection are table options
  (`enableMultiRowSelection`, `enableSubRowSelection`, ...).
- **Nested rows**: `getSubRows` + `expandedRowModel` in features. DataTable
  puts the expand toggle and the depth indentation in the first column that
  isn't the selection column, around your cell content (your cell renders
  unchanged). Set `meta: { expander: true }` on another column to move it there.
  Indent per level defaults to `1.25rem`; override it with the `--dt-indent` CSS
  variable on the table. If no row can expand, no toggle space is reserved.
- **Detail panel**: `renderDetail`. To make rows without sub-rows expandable,
  set `getRowCanExpand` (e.g. `(row) => !!row.original.notes`).
- **Fluid columns + resizing**: each column is a grid track
  `minmax(size px, grow fr)`, so columns fill the width and the table scrolls
  horizontally below the sum of sizes. `meta: { grow: false }` fixes a column
  at `size`; `meta: { grow: 2 }` takes twice the leftover space. A resized
  column becomes fixed at its new width, and double-clicking the handle restores
  it. Use `columnResizeMode: 'onChange'` for live resizing (`'onEnd'` shows a
  preview handle). If your features declare their own `columnMeta` slot, include
  `DataTableColumnMeta` in it.

Without a feature registered, its UI simply does not render. A table with only
`features: tableFeatures({})` works.

## Performance

DataTable subscribes to the table's state atoms at the smallest useful level:

| Change          | What re-renders                                            |
| --------------- | ---------------------------------------------------------- |
| Select a row    | That row (for `data-selected`) and its checkbox. No cells. |
| Select all      | Changed rows and their checkboxes. No cells.               |
| Expand a row    | That row. New sub-rows mount.                              |
| Sort            | Body + header cell. Cells only for rows TanStack cloned.   |
| Resize a column | DataTable root only (CSS variable). No rows, no cells.     |

To keep it that way:

- **Pass a selector to `useTable`** (`() => ({})` or the slices you actually
  render). Without one, your component and everything below it re-render on
  every state change. Read state lower down with
  `<table.Subscribe source={table.atoms.rowSelection}>` or the exported
  `useAtomSelector`.
- **Keep `features` and `columns` stable** (module scope or `useMemo`). New
  arrays invalidate the header and column memos.
- **Cells re-render only when their row data changes.** A custom cell that
  shows table state (selection, expanded...) must subscribe to it itself, e.g.
  `useAtomSelector(row.table.atoms.rowSelection, (s) => !!s?.[row.id])`.
  `renderDetail` output is memoized per row the same way.
- Inline `renderDetail` / `onRowClick` functions are fine: they are read from a
  ref.

## Styling and design system

Styling is minimal Tailwind, plus `data-*` hooks for your design system:

- `data-slot`: `data-table`, `header`, `header-cell`, `resize-handle`,
  `body`, `row`, `cell`, `detail`, `state`
- On rows: `data-selected`, `data-expanded`, `data-clickable`, `data-depth`,
  `data-row-id`, and the `--dt-depth` CSS variable
- On header cells: `data-sorted="asc|desc"`, `data-column-id`; on cells:
  `data-column-id`. Both get `data-expander` in the toggle column

The checkbox, icon button, icons and empty/loading defaults live in
`src/components/data-table/primitives.tsx`: swap those for design system
components without touching the rest.

## Accessibility

ARIA `table` roles (`rowgroup`, `row`, `columnheader`, `cell`), `aria-sort` on
sortable headers, and `aria-expanded` + `aria-controls` on the expand toggle.
Selection state is exposed by the checkbox itself. `aria-selected` and
`aria-expanded` on rows are only valid in `grid`/`treegrid`, which also require
arrow-key navigation, so they are not used.

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
pnpm lint
pnpm format
pnpm check
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
