/**
 * Borders and stripes: the visual options driven by `borders` / `striped`.
 *
 * The root sets `data-border-outer|rows|columns` and `data-striped`, and parts
 * style themselves with `in-data-[...]` variants (`:where([data-x]) &`, no
 * extra specificity). Colors come from CSS variables with defaults, so a
 * design system can theme them without touching these classes:
 * - `--dt-border-color` (default: gray-200)
 * - `--dt-stripe-bg` (default: a 3% black tint)
 *
 * Full class strings only: Tailwind scans source files for them.
 */

const borderColor = 'border-[var(--dt-border-color,var(--color-gray-200))]'

/** Root: the outer frame. */
export const rootBorder = `${borderColor} data-[border-outer]:border`

/** Header row group: line under the header. */
export const headerBorder = `${borderColor} in-data-[border-rows]:border-b`

/** Body row and detail panel: line under each. */
export const rowBorder = `${borderColor} in-data-[border-rows]:border-b`

/** Header cell and cell: vertical line between columns. */
export const columnBorder = `${borderColor} in-data-[border-columns]:not-last:border-r`

/**
 * Even body rows when striped. `nth-child(even of [data-slot=row])` counts
 * data rows only (detail panels don't shift the pattern), and it's pure CSS,
 * so expanding a row doesn't re-render the rows below it. Wrapped in
 * `:where()`, so hover and selected backgrounds still win.
 */
export const rowStripe =
  '[:where([data-striped])_&:where(:nth-child(even_of_[data-slot=row]))]:bg-[var(--dt-stripe-bg,rgb(0_0_0/0.03))]'

// ---------------------------------------------------------------------------
// Default classes per part. `classNames` slots and column meta classes are
// merged over these (see classNames.ts).
// ---------------------------------------------------------------------------

export const rootClasses = `relative overflow-auto ${rootBorder}`

export const headerClasses = `bg-white ${headerBorder}`
export const stickyHeaderClasses = `sticky top-0 z-10 ${headerClasses}`

export const headerRowClasses = 'grid grid-cols-(--dt-grid)'

export const headerCellClasses = `relative flex min-w-0 items-center px-3 py-2 text-left text-sm font-medium ${columnBorder}`

/** Checkbox column (`selectionPlacement="column"`), header and body. */
export const selectionCellClasses = `flex items-center px-3 py-2 ${columnBorder}`

export const rowClasses = `grid grid-cols-(--dt-grid) hover:bg-black/2 data-clickable:cursor-pointer data-selected:bg-blue-50 ${rowBorder} ${rowStripe}`

export const cellClasses = `flex min-w-0 items-center px-3 py-2 text-sm ${columnBorder}`

export const detailRowClasses = rowBorder
export const detailClasses = 'p-3'
