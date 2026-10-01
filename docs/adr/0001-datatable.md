# ADR 0001: DataTable component

- **Status**: Accepted
- **Date**: 2026-10-01
- **Deciders**: Thomas Fauquemberg
- **Code**: `src/components/data-table/`
- **Docs**: [`src/components/data-table/README.md`](../../src/components/data-table/README.md), Storybook "Components / DataTable"
- **Deferred features**: [what's not built yet, and how to add it](#deferred-features)

## Context

Many screens need tables, each with different columns, cells and behaviour.
We want one table component reused everywhere, with these requirements:

- Teams configure their own table: features, columns, custom cells, state
  (client or server side).
- It must support row selection, nested rows (tree sub-rows and detail panels)
  and sorting.
- It must have a fluid layout that fills its container.
- Performance matters: interacting with one row must not re-render the whole
  table.
- Styling is minimal for now; the design system components will be plugged in
  later.

The project depends on TanStack Table **v9**. In v9, state lives in per-slice
atoms (`table.atoms.rowSelection`, ...) with subscription helpers
(`table.Subscribe`, `useSelector`), and features are opt-in per table
(`tableFeatures({...})`). The project that imports DataTable runs React 19
with the React Compiler enabled, so DataTable is written for the compiler: no
manual `memo`/`useMemo` except where the compiler can't help (see decision 4),
and the coding rules in the component README.

## Decision

### 1. The consumer owns the table instance

```tsx
const table = useTable({ features, columns, data, ...options }, () => ({}))
<DataTable table={table} renderDetail={...} onRowClick={...} />
```

DataTable never calls `useTable`. Every TanStack option (controlled state,
manual sorting, `getRowCanExpand`, selection modes, ...) stays available
without DataTable re-exposing it. DataTable props only cover what TanStack
doesn't: rendering (`renderDetail`, states), layout (`selectionPlacement`,
`stickyHeader`) and interaction (`onRowClick`).

### 2. Feature-agnostic rendering

DataTable works with any feature set. It checks at runtime which features are
registered (`table._features`, isolated in `hasFeature()`) and only renders
their UI. A table with `tableFeatures({})` is a plain table. Internally the
instance is typed as "all features" (`Table<any, TData>`), and every feature
API call is guarded.

### 3. Div + CSS grid layout

- The root sets one `--dt-grid` CSS variable (`grid-template-columns`). Every
  header row and body row is its own `display: grid` using it, so columns line
  up while rows stay real boxes (hover, selected background, borders).
- Each column is a track `minmax(<size>px, <grow>fr)`: `size` is the minimum
  width, and leftover space is shared by `meta.grow` (default `1`, `false` =
  fixed). Below the sum of sizes, the table scrolls horizontally.
- A resized column becomes a fixed `px` track. When a drag starts, its
  rendered width is written to `columnSizing` first, so it doesn't jump back to
  `size`. Double-clicking the handle removes the entry and the column is fluid
  again.
- Detail panels are full-width rows after their row.

### 4. Fine-grained subscriptions

Each part subscribes to the smallest slice it needs:

| Component                | Subscribes to                                    |
| ------------------------ | ------------------------------------------------ |
| `DataTable` root         | grid layout (sizing, visibility): CSS var only   |
| Header / header cell     | header groups / its own sort and resize state    |
| Body                     | row model, visible columns, lead layout          |
| Row                      | its own `selected` / `expanded` flags            |
| Checkbox / expand toggle | its own row's selection / expanded state         |
| Cell                     | nothing: re-renders only when its `cell` changes |

`onRowClick` is read through a ref in event handlers, and `renderDetail`
through a context only open panels read, so inline functions don't re-render
rows. Consumers pass a selector to `useTable` (`() => ({})`), so their own
component doesn't re-render on table state changes.

`DataTableRow` is the one component wrapped in `memo`: the compiler caches the
body's `rows.map(...)` as one value, not per row, so without `memo` a new row
order would call every row.

TanStack objects keep their identity while their answers change, so values
read from them (`row.getCanSelect()`, `column.getCanSort()`, options, data) are
read inside these store selectors, never directly in render. Options and data
change without a store update, though, and the compiler caches a selector by
its inputs. So the subscription hooks also depend on a **table version**: the
consumer's table object from `useTable`, which is a new object whenever its
options or data change. Selectors then re-run on state changes _and_ on
option/data changes. A regression test caught the first version of this: the
compiler had dropped a `void version` read as dead code, leaving select-all
stale after a data change.

Measured in the demo (40 top-level rows, 130 in total), with the React
Compiler on, as in the consuming project:

| Interaction           | Re-renders                                         |
| --------------------- | -------------------------------------------------- |
| Select one row        | 1 row + 1 checkbox, 0 cells                        |
| Select all            | changed rows + their checkboxes, 0 cells           |
| Expand a row          | that row; its sub-rows mount                       |
| Sort                  | body, clicked header, and the rows TanStack clones |
| Resize (drag)         | 0 rows, 0 cells, 0 headers                         |
| Consumer state change | 0 rows, 0 cells                                    |

### 5. The lead cell: toggle → checkbox → content

The lead column's cell renders the expand toggle, the row checkbox and the
consumer's cell content, indented together by `--dt-depth × --dt-indent`
(default `1.25rem`). The lead column is the first visible column, or the one
with `meta: { lead: true }`. The header mirrors it with the same fixed-size
slots (empty toggle slot → select-all → label), so labels align with depth-0
content. A slot appears only when needed: no toggle slot when no row can
expand, no checkbox when selection is off.

### 6. Selection

- **DataTable renders the checkboxes itself** when `rowSelectionFeature` is
  registered. TanStack's options configure them: `enableRowSelection: false`
  hides them, a predicate disables some rows (keeping alignment), and
  `enableMultiRowSelection: false` gives single selection with no select-all.
- **Placement is configurable per table.** `selectionPlacement: 'lead'`
  (default) puts the checkbox in the lead cell, after the toggle.
  `'column'` puts it in a fixed 44px track before the TanStack columns, aligned
  at every depth (`data-column-id="__selection"`).
- **Nested selection mode is TanStack's `enableSubRowSelection`**, per table
  or per row:
  - `true` (default), cascade: selecting a parent selects its children. After
    each checkbox click, `syncCascadeParents` sets every cascade parent
    selected exactly when all its selectable children are. Unchecking a child
    deselects its cascade ancestors (they show partial), and checking the last
    child selects the parent. So `getSelectedRowModel()` always matches what's
    checked.
  - `false`, independent: every row is selected on its own, and parents never
    show partial.
- **Select-all selects every selectable row at every depth** (after filtering,
  or the current page with `selectAllScope="page"`), in every mode. DataTable
  implements it instead of using TanStack's `toggleAllRowsSelected`, which
  skips children of independent parents.

### 7. Sorting and accessibility

- Sorting is single-column: headers call `column.toggleSorting(undefined,
false)`, so shift-click never adds a sort, whatever `enableMultiSort` says.
- Accessibility: `role="table"` roles, `aria-sort`, and `aria-expanded` +
  `aria-controls` on the toggle. Selection is exposed by the checkbox.
  `aria-selected`/`aria-expanded` on rows are only valid in `grid`/`treegrid`,
  which also require arrow-key navigation (out of scope).

### 8. Styling: props, CSS variables, class overrides

Minimal Tailwind, with five levels of control:

1. **Props for common variations.** `striped` (default `false`; `true` uses a
   default tint, a CSS color string sets your own) and `borders` (row lines by
   default; `true` all, `false` none, and `{ outer, rows, columns }` switches
   each one independently, with omitted keys keeping their default).
   The root sets `data-striped` / `data-border-*`, and each part styles itself
   with `in-data-[…]` variants (`:where([data-x]) &`, no extra specificity).
2. **CSS variables with defaults**: `--dt-border-color`, `--dt-stripe-bg`,
   `--dt-indent`.
3. **Class overrides.** One `classNames` prop with a slot per part (`root`,
   `header`, `headerRow`, `headerCell`, `body`, `row`, `cell`, `detail`).
   `row` also takes `(row, { selected, expanded }) => classes` and `cell`
   takes `(cell) => classes`, returning anything `cn` accepts. Per column:
   `meta.className` / `meta.headerClassName`. A cell combines them from
   general to specific: `cell` string, column meta, `cell` function. They're merged over the defaults with the `cn`
   package (shadcn; clsx + tailwind-merge semantics), so a conflicting default
   is replaced, not just appended. Without overrides, the precomputed default
   string is used and no merge runs.
4. **Global CSS** on `data-slot` and state attributes (`data-selected`,
   `data-expanded`, `data-depth`, `data-sorted`, `data-lead`).
5. **Swap the defaults.** Controls, icons and empty/loading states live in
   `primitives.tsx`; default classes per part in `styles.ts`.

**Stripes are pure CSS**: `:nth-child(even of [data-slot=row])`, wrapped in
`:where()`. Detail panels don't shift the pattern, hover and selected
backgrounds win, and expanding a row doesn't re-render the rows below it.

**Overrides keep render costs flat.** The slots context is built from the
individual class strings, so a new but identical `classNames` object changes
nothing. The `row` and `cell` functions are split out into their own contexts,
read only by the rows and cells that call them. The `row` function receives
the row's state as arguments, so state-based classes are correct under the
compiler, without re-running on every store change.

### 9. Tests

Three layers, all running compiled with the React Compiler, as in the
consuming project:

- **Logic** (Vitest): cascade parent sync in every mode, select-all rows,
  grid tracks, lead layout.
- **Behaviour** (React Testing Library, jsdom): re-render isolation measured
  with spy cells, values that go stale under the compiler, selection end to
  end, controlled state, class overrides.
- **Stories** (`@storybook/addon-vitest`, Chromium): every story renders and
  its `play` function passes, including computed layout (borders, stripes,
  padding), which jsdom can't measure.

## Alternatives considered

**Ownership and layout**

- **DataTable takes `columns` + `data` and calls `useTable` itself.** Simpler
  call sites, but every TanStack option would have to be re-exposed as a prop,
  and consumers would lose direct access to the instance. Rejected.
- **`createTableHook` (v9).** Pre-binds features and components app-wide, which
  couples every table to one feature set. It can still be layered on top later.
- **Semantic `<table>`.** Native semantics, but no fluid `fr` column sharing,
  and sticky headers, full-width detail rows and per-row grids are awkward.
- **Rows with `display: contents` on one root grid.** Rows lose their box (no
  row background or hover), and screen reader support has a history of bugs.
- **Flex rows with `column.getSize()` widths.** Columns don't fill the
  container.
- **Row virtualization.** Not needed for the expected volume (under ~200 rows).

**Lead cell and selection**

- **A dedicated expand column, then a separate `columnHelper.selection()`
  column.** Tried first. Indentation in a fixed 48px column overflows after one
  or two levels. A checkbox before the toggle doesn't move with depth, so it
  isn't obvious what selecting a parent includes. Both helpers were removed.
- **One layout for every table (no `selectionPlacement`).** Rejected: some
  tables want checkboxes aligned in one column whatever the depth.
- **A `showSelection` prop.** Duplicates `enableRowSelection: false`.
- **Selection as a real TanStack column in `'column'` mode.** Consumers would
  have to add it to every column list again.
- **TanStack's `deselectParents: true` for cascade.** It removes every
  ancestor, including independent ones in mixed mode, and doesn't select a
  parent when its last child is checked.
- **A parent that only _looks_ checked when all children are.** Bulk actions
  would then disagree with what the user sees.
- **A partial dash on independent parents.** It suggests a link that mode
  doesn't have.
- **TanStack's select-all.** On independent tables it selects top-level rows
  only, despite the "Select all rows" label.

**Styling**

- **Striping by row index in JS** (`data-odd` per row). Every row below an
  expanded one would re-render to flip its parity. Pure CSS has no cost.
- **A plain CSS file for stripes and borders.** Unlayered CSS beats Tailwind's
  layered utilities, so hover/selected couldn't override it, and putting it in
  Tailwind's layers depends on stylesheet load order in the consuming app.
- **`classNames` appended without merging.** No dependency, but which of two
  conflicting classes wins depends on CSS order, not on the consumer.
- **`clsx` + `tailwind-merge` directly.** Same semantics; the `cn` package is
  the consuming project's convention, and it's a single dependency.
- **A separate `rowClassName` prop.** Tried first. Two places for row classes,
  for no technical reason: the string/function split is internal.
- **A row function without a state argument.** A class based on
  `row.getIsSelected()` would be cached by the compiler and go stale.
- **Re-running the row function in a store selector.** Correct for any state,
  but it would call the consumer's function for every row on every state
  change (including each resize frame).
- **A `borders` object that replaces the defaults.** Tried first:
  `{ columns: true }` then silently dropped the default row lines, so borders
  didn't feel independent. Omitted keys now keep their default.

**Tests**

- **Rewriting the story interactions in React Testing Library.** Duplicates
  the `play` functions, and jsdom has no layout to check borders or widths.
- **Only story tests.** They can't count renders or force the edge cases
  (controlled state, runtime option changes) cheaply.

## Consequences

**Positive**

- One component covers flat, tree, detail and selectable tables, with any
  TanStack option.
- Interactions stay cheap as tables grow, because updates are local.
- Checkboxes, selection state and `getSelectedRowModel()` always agree.
- Common variations are one prop (`striped`, `borders`), and anything else is
  a class override that reliably replaces the default.
- The design system integration is confined to `primitives.tsx`, `styles.ts`,
  CSS variables and class overrides.
- Performance and compiler guarantees are tested, not just measured once.

**Negative / to watch**

- **Consumer rules.** Pass a selector to `useTable`, keep `features`/`columns`
  stable, and make cells that show table state subscribe to it
  (`useAtomSelector`). They are documented, but not enforced.
- **Semi-internal API.** Feature detection reads `table._features`. A TanStack
  upgrade could rename it.
- **Sticky header.** It needs the table to have a height, because the table is
  its own scroll container.
- **Lead column width.** For deep trees, it must fit the controls (2 × 24px +
  gaps) plus `--dt-indent` per level.
- **Checkbox column.** In `'column'` mode it isn't a TanStack column, so
  visibility, ordering and pinning don't apply to it.
- **Parent sync scope.** It runs only on checkbox clicks, walking the tree
  (O(rows)). Selection set programmatically is taken as-is. Switching
  `enableSubRowSelection` at runtime should reset the selection.
- **Range anchor.** Select-all doesn't reset TanStack's shift-click anchor
  (`_lastSelectedRowId`, internal).
- **Sorting re-renders.** Rows TanStack clones while sorting (parents whose
  sub-rows reorder) re-render their cells.
- **Tailwind scanning.** Classes passed in `classNames` are generated only if
  Tailwind scans the file that contains them. If DataTable lives outside the
  app's scanned folders, the app needs an `@source` for it.
- **Option changes re-render controls.** When the consumer's options or data
  change, rows and controls re-run their selectors through the table version.
  Your cells don't re-render.
- **Class function identity.** A new `classNames.row` / `classNames.cell`
  function re-renders the rows / cells that call it (not your cell
  components). Define it at module scope, or let the compiler keep it stable.
- **Dependencies.** `cn` for class merging; Vitest, React Testing Library,
  jsdom and Playwright (Chromium, ~95MB) for tests.

## Deferred features

Not built yet, on purpose: no screen needs them so far. Each one lists what
already works and how to add it without breaking the decisions above
(consumer-owned table, feature-agnostic rendering, local updates). Ordered by
expected need.

### Global search (client or server)

**Works today.** Search is table state, and DataTable renders
`table.getRowModel()`, which already includes filtering. The search input
belongs to the consumer's toolbar.

- Client: register `globalFilteringFeature` and
  `filteredRowModel: createFilteredRowModel(filterFns)`, then call
  `table.setGlobalFilter(value)` from the input.
- Server: `manualFiltering: true`, `globalFilter` in controlled state,
  debounce it, fetch, pass the result as `data`.

**To add, in this order:**

1. **Refetch state.** `isLoading` replaces the rows, so server search would
   blank the table on every keystroke. Add an `isFetching` prop that keeps
   the rows and sets `aria-busy` plus a `data-fetching` attribute on the root
   (dimmed with an `in-data-[fetching]` class, no row re-renders).
2. **No-results state.** Add a `noResultsState` prop, shown when the row
   model is empty while `globalFilter` or `columnFilters` is set (read in the
   body selector); `emptyState` stays for "no data".
3. **Tree rows.** A match under a collapsed parent stays hidden. Document
   `filterFromLeafRows` / `maxLeafRowFilterDepth`, and the recipe of setting
   `expanded: true` while a search is active (consumer state, not a prop).
4. **Selection.** Select-all already uses the filtered rows
   (`getSelectAllRows`). Decide and document what happens to selected rows
   the search hides (recommended: keep them, and show the count from
   `getSelectedRowModel()` in the toolbar). With server search, select-all
   only knows the loaded rows.
5. **Tests.** A story (client and server variants) and an RTL test that
   typing filters the rows under the React Compiler: the same class of bug as
   the stale select-all after a data change (decision 4).

Match highlighting stays in the consumer's cells: read the term with
`useAtomSelector(table.atoms.globalFilter, (value) => value)`.

### Column pinning (sticky columns)

**The main rendering gap.** Wide tables that scroll horizontally need the
first (and sometimes last) columns to stay visible.

- Detect `columnPinningFeature` with `hasFeature`, and add it to `FeatureKey`.
- Cells and header cells of pinned columns get `position: sticky`,
  `left: column.getStart('left')` (or `right: column.getAfter('right')`), a
  background and a `z-index` above unpinned cells (the header's above that).
- Pinned offsets change on resize: write them as CSS variables on the root
  from `getGridLayout` (like `--dt-grid`), so resizing still re-renders no
  rows.
- Mark the last left-pinned / first right-pinned cell with
  `data-pinned-edge` for a shadow or border.
- The `'column'` checkbox column isn't a TanStack column: pin it implicitly
  when any left column is pinned (offset = `SELECTION_COLUMN_SIZE`).
- Rows set their own background (hover, selected, stripes), so pinned cells
  must inherit it (`bg-inherit`) or they'll look transparent over scrolled
  content.

### Keyboard navigation

Rows answer Enter today (`onRowClick`). For spreadsheet-like navigation:
switch to `role="grid"`, a roving `tabIndex` (one focusable cell), and arrow,
Home/End and PageUp/PageDown handling in one root `onKeyDown` handler. Keep
the active cell in a ref and move focus imperatively, so moving doesn't
re-render rows. Space toggles selection, Left/Right on the lead cell
collapses/expands.

### Column filters

Same pattern as global search: `columnFilteringFeature` +
`filteredRowModel` (+ `columnFacetingFeature` / `createFacetedRowModel` for
value lists), filter UI owned by the consumer. The useful addition is a
header slot (`meta.headerActions` or a `renderHeaderActions(header)` prop)
for a filter or menu button, placed after the sort indicator and excluded
from the sort click target. Show active filters with `data-filtered` on the
header cell.

### Pagination

No DataTable work. `rowPaginationFeature` + `createPaginatedRowModel()`
(client) or `manualPagination` + `rowCount` (server); `getRowModel()` is
then one page, and `selectAllScope="page"` already exists. Optional: a
headless `<DataTablePagination table={table} />` built on
`getCanPreviousPage()` / `nextPage()` / `getPageCount()`, styled by the
design system.

### Column ordering

Probably works already: the layout and header use
`getVisibleLeafColumns()` / `getHeaderGroups()`, which follow `columnOrder`.
Confirm with a test (reorder → grid template and cells follow) before
documenting it. Drag-to-reorder is consumer UI (e.g. dnd-kit on the header
cells, calling `table.setColumnOrder`). The `'column'` checkbox column
always stays first.

### Header menu (sort / hide / pin)

Design-system component built only from table APIs
(`column.toggleSorting`, `toggleVisibility`, `pin`); it plugs into the
header slot from "Column filters". No core changes.

### Virtualization

Not worth it under ~200 rows. If needed: `@tanstack/react-virtual` over
`getRowModel().rows` in `DataTableBody` (the root is already the scroll
container), with `measureElement` for detail panels and variable heights.
Stripes then need a `data-index`-based class instead of `nth-child`, because
only visible rows are in the DOM.

### Grouping, aggregation, row pinning, cell selection

Skip until a screen needs them. Grouping/aggregation would reuse the lead
cell (grouped rows are expandable, like tree parents) and need an
`aggregatedCell` render path in `DataTableCell`. Row pinning needs sticky
top/bottom rows in the body. Cell selection conflicts with row click and
needs the keyboard navigation work first.
