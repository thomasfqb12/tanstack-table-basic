/**
 * Class name overrides: the `classNames` prop and column `meta.className` /
 * `meta.headerClassName`.
 *
 * Overrides are merged with `cn` (shadcn's `cn` package: clsx +
 * tailwind-merge semantics), so they replace conflicting defaults (`px-4`
 * beats the default `px-3`). Without overrides the precomputed default string
 * is used as-is: no merge work per render.
 *
 * `row` and `cell` accept a string or a function. Internally, strings and
 * functions go to separate contexts: strings are compared by value (a new but
 * identical `classNames` object changes nothing), and only a new function
 * re-renders the rows or cells that call it.
 */
import { createContext } from 'react'
import { cn } from 'cn'
import type { ClassValue } from 'cn'
import type { AnyCell, AnyRow } from './types'

/**
 * What a class function may return: anything `cn` accepts (a string, an
 * array, `{ 'font-bold': selected }`, falsy values...).
 */
export type ClassNameResult = ClassValue

/** The row's own state, passed so classes that depend on it stay current. */
export interface RowClassNameState {
  selected: boolean
  expanded: boolean
}

/** Classes for one row, from its data and state. */
export type RowClassName<TRow = AnyRow> = (
  row: TRow,
  state: RowClassNameState,
) => ClassNameResult

/**
 * Classes for one cell, from its data (`cell.getValue()`, `cell.row.original`,
 * `cell.column`). For selection/expansion state, use the `row` function or the
 * row's `data-selected` / `data-expanded` attributes: cells don't re-render on
 * state changes.
 */
export type CellClassName<TCell = AnyCell> = (cell: TCell) => ClassNameResult

/** Classes added to each part of the table. They win over the defaults. */
export interface DataTableClassNames<TRow = AnyRow, TCell = AnyCell> {
  /** Scroll container (same as `className`). */
  root?: string
  /** Header row group (`bg-white`, sticky). */
  header?: string
  /** Each header row. */
  headerRow?: string
  /** Each header cell, including the checkbox column's. */
  headerCell?: string
  /** Body row group. */
  body?: string
  /**
   * Each body row (hover, selected, stripes, row borders). A function gets the
   * row and its `{ selected, expanded }` state.
   */
  row?: string | RowClassName<TRow>
  /** Each body cell, including the checkbox column's. A function gets the cell. */
  cell?: string | CellClassName<TCell>
  /** Content area of a detail panel (padding). */
  detail?: string
}

/** The string parts of `classNames` (compared by value). */
export interface ClassNameSlots {
  header?: string
  headerRow?: string
  headerCell?: string
  body?: string
  row?: string
  cell?: string
  detail?: string
}

export const ClassNamesContext = createContext<ClassNameSlots>({})

/** `classNames.row` when it's a function. Read by rows only. */
export const RowClassNameContext = createContext<RowClassName | undefined>(
  undefined,
)

/** `classNames.cell` when it's a function. Read by cells only. */
export const CellClassNameContext = createContext<CellClassName | undefined>(
  undefined,
)

/** Splits a `string | function` slot into its string and function parts. */
export function splitSlot<TFn extends (...args: Array<never>) => unknown>(
  value: string | TFn | undefined,
): [string | undefined, TFn | undefined] {
  return typeof value === 'function' ? [undefined, value] : [value, undefined]
}

/** Default classes, plus overrides merged with `cn` when there are any. */
export function withOverrides(
  defaults: string,
  ...overrides: Array<ClassNameResult>
): string {
  return overrides.some(Boolean) ? cn(defaults, ...overrides) : defaults
}
