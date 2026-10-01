/**
 * Shared test fixtures: a small tree, a feature set with every DataTable
 * feature, and helpers to build a table with `useTable` like a consumer.
 */
import { renderHook } from '@testing-library/react'
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
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { TableOptions } from '@tanstack/react-table'
import type { AnyTable } from '../types'

export interface Item {
  id: string
  name: string
  locked?: boolean
  children?: Array<Item>
}

/**
 * a
 * ├─ a1
 * └─ a2
 *    ├─ a2x
 *    └─ a2y
 * b
 * c
 * └─ c1
 */
export const tree: Array<Item> = [
  {
    id: 'a',
    name: 'Alpha',
    children: [
      { id: 'a1', name: 'Alpha 1' },
      {
        id: 'a2',
        name: 'Alpha 2',
        children: [
          { id: 'a2x', name: 'Alpha 2 X' },
          { id: 'a2y', name: 'Alpha 2 Y' },
        ],
      },
    ],
  },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie', children: [{ id: 'c1', name: 'Charlie 1' }] },
]

export const flat: Array<Item> = [
  { id: 'x', name: 'Xray' },
  { id: 'y', name: 'Yankee' },
  { id: 'z', name: 'Zulu' },
]

export const features = tableFeatures({
  rowSelectionFeature,
  rowExpandingFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
})
export type Features = typeof features

export const columnHelper = createColumnHelper<Features, Item>()
export const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('id', { header: 'Id' }),
])

export type Options = Partial<TableOptions<Features, Item>>

export const treeOptions: Options = {
  getRowId: (row) => row.id,
  getSubRows: (row) => row.children,
}

/** A table instance for logic tests (no DOM rendering). */
export function makeTable(
  options: Options = {},
  data: Array<Item> = tree,
): AnyTable {
  const { result } = renderHook(() =>
    useTable(
      {
        features,
        columns,
        data,
        ...treeOptions,
        ...options,
      },
      () => ({}),
    ),
  )
  return result.current as unknown as AnyTable
}

/** Sorted ids, for readable selection assertions. */
export const ids = (selection: Record<string, unknown>) =>
  Object.keys(selection).sort()
