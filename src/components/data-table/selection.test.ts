import { describe, expect, it } from 'vitest'
import {
  getSelectAllRows,
  isCascadeParent,
  syncCascadeParents,
} from './selection'
import { ids, makeTable } from './test/fixtures'

const selection = (...rowIds: Array<string>) =>
  Object.fromEntries(rowIds.map((id) => [id, true as const]))

describe('syncCascadeParents (enableSubRowSelection: true, default)', () => {
  const table = () => makeTable()

  it('removes every cascade ancestor when a descendant is unchecked', () => {
    // Everything under `a` selected, then a2x unchecked.
    const synced = syncCascadeParents(
      table(),
      selection('a', 'a1', 'a2', 'a2y'),
    )
    expect(ids(synced)).toEqual(['a1', 'a2y'])
  })

  it('selects a parent when its last child is checked', () => {
    expect(ids(syncCascadeParents(table(), selection('c1')))).toEqual([
      'c',
      'c1',
    ])
  })

  it('completes ancestors bottom-up', () => {
    // a2's children complete a2, which completes a (with a1).
    const synced = syncCascadeParents(table(), selection('a1', 'a2x', 'a2y'))
    expect(ids(synced)).toEqual(['a', 'a1', 'a2', 'a2x', 'a2y'])
  })

  it('leaves leaves and unrelated rows alone', () => {
    expect(ids(syncCascadeParents(table(), selection('b', 'a1')))).toEqual([
      'a1',
      'b',
    ])
  })

  it('ignores disabled children when deciding if a parent is complete', () => {
    const t = makeTable({
      enableRowSelection: (row) => row.id !== 'a2y',
    })
    // a2y can't be selected, so a2x alone completes a2.
    expect(ids(syncCascadeParents(t, selection('a2x')))).toEqual(['a2', 'a2x'])
  })

  it('does nothing in single-selection mode', () => {
    const t = makeTable({ enableMultiRowSelection: false })
    expect(ids(syncCascadeParents(t, selection('c1')))).toEqual(['c1'])
  })

  it('does not mutate its input', () => {
    const input = selection('c1')
    syncCascadeParents(table(), input)
    expect(ids(input)).toEqual(['c1'])
  })
})

describe('syncCascadeParents (enableSubRowSelection: false)', () => {
  it('never adds or removes parents', () => {
    const t = makeTable({ enableSubRowSelection: false })
    expect(ids(syncCascadeParents(t, selection('c1')))).toEqual(['c1'])
    expect(ids(syncCascadeParents(t, selection('a', 'a2y')))).toEqual([
      'a',
      'a2y',
    ])
  })
})

describe('syncCascadeParents (mixed, per-row predicate)', () => {
  it('only syncs the parents whose predicate allows cascading', () => {
    // Only top-level rows cascade; a2 is independent.
    const t = makeTable({ enableSubRowSelection: (row) => row.depth === 0 })
    expect(isCascadeParent(t.getRow('a'))).toBe(true)
    expect(isCascadeParent(t.getRow('a2'))).toBe(false)

    // a2's children are complete, but a2 doesn't follow them...
    expect(ids(syncCascadeParents(t, selection('a2x', 'a2y')))).toEqual([
      'a2x',
      'a2y',
    ])
    // ...while `a` follows its direct children (a1, a2).
    expect(ids(syncCascadeParents(t, selection('a1', 'a2')))).toEqual([
      'a',
      'a1',
      'a2',
    ])
  })
})

describe('getSelectAllRows', () => {
  it('returns rows at every depth, also when parents are independent', () => {
    const t = makeTable({ enableSubRowSelection: false })
    expect(
      getSelectAllRows(t, 'all')
        .map((row) => row.id)
        .sort(),
    ).toEqual(['a', 'a1', 'a2', 'a2x', 'a2y', 'b', 'c', 'c1'])
  })

  it('skips rows that cannot be selected', () => {
    const t = makeTable({ enableRowSelection: (row) => row.depth === 0 })
    expect(getSelectAllRows(t, 'all').map((row) => row.id)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})
