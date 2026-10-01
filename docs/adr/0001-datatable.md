# ADR 0001: DataTable component

- **Status**: Accepted
- **Date**: 2026-10-01
- **Deciders**: Thomas Fauquemberg
- **Code**: `src/components/data-table/`
- **Docs**: [`src/components/data-table/README.md`](../../src/components/data-table/README.md), Storybook "Components / DataTable"

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
order would call every row. Values read from TanStack objects (which keep
their identity while their answers change) are read inside these store
selectors, so compiled components never show stale values.

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

### 8. Design system swap points

Minimal Tailwind plus `data-slot` and state attributes (`data-selected`,
`data-expanded`, `data-depth`, `data-sorted`, `data-lead`, `--dt-depth`). The
checkbox, icon button, icons, control slots and empty/loading defaults live in
`primitives.tsx`, the single file to replace with design system components.

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

## Consequences

**Positive**

- One component covers flat, tree, detail and selectable tables, with any
  TanStack option.
- Interactions stay cheap as tables grow, because updates are local.
- Checkboxes, selection state and `getSelectedRowModel()` always agree.
- The design system integration is confined to `primitives.tsx` and CSS on
  `data-*` attributes.

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
