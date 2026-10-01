import { describe, expect, it } from 'vitest'
import { getGridLayout, getLeadLayout, SELECTION_COLUMN_SIZE } from './layout'
import { columnHelper, flat, makeTable } from './test/fixtures'

describe('getGridLayout', () => {
  const sized = columnHelper.columns([
    columnHelper.accessor('name', { header: 'Name', size: 200 }),
    columnHelper.accessor('id', {
      header: 'Id',
      size: 80,
      meta: { grow: false },
    }),
    columnHelper.display({ id: 'wide', size: 100, meta: { grow: 3 } }),
  ])

  it('makes columns fluid by default, fixed with grow: false, weighted with grow: n', () => {
    const table = makeTable({ columns: sized })
    expect(getGridLayout(table, 'lead')).toEqual({
      template: 'minmax(200px, 1fr) 80px minmax(100px, 3fr)',
      minWidth: 380,
    })
  })

  it('fixes a column at its resized width', () => {
    const table = makeTable({
      columns: sized,
      initialState: { columnSizing: { name: 260 } },
    })
    expect(getGridLayout(table, 'lead').template).toBe(
      '260px 80px minmax(100px, 3fr)',
    )
  })

  it('adds a checkbox track only in column placement with selection shown', () => {
    const columnMode = getGridLayout(makeTable({ columns: sized }), 'column')
    expect(columnMode.template.startsWith(`${SELECTION_COLUMN_SIZE}px `)).toBe(
      true,
    )
    expect(columnMode.minWidth).toBe(380 + SELECTION_COLUMN_SIZE)

    const noSelection = makeTable({ columns: sized, enableRowSelection: false })
    expect(getGridLayout(noSelection, 'column').minWidth).toBe(380)
  })

  it('drops hidden columns', () => {
    const table = makeTable({
      columns: sized,
      initialState: { columnVisibility: { id: false } },
    })
    expect(getGridLayout(table, 'lead').template).toBe(
      'minmax(200px, 1fr) minmax(100px, 3fr)',
    )
  })
})

describe('getLeadLayout', () => {
  it('puts toggle and checkbox in the first column of a tree table', () => {
    expect(getLeadLayout(makeTable(), 'lead')).toEqual({
      leadColumnId: 'name',
      leadToggle: true,
      selection: 'lead',
    })
  })

  it('honours meta.lead', () => {
    const table = makeTable({
      columns: columnHelper.columns([
        columnHelper.accessor('name', { header: 'Name' }),
        columnHelper.accessor('id', { header: 'Id', meta: { lead: true } }),
      ]),
    })
    expect(getLeadLayout(table, 'lead').leadColumnId).toBe('id')
  })

  it('reserves no toggle slot when no row can expand', () => {
    expect(getLeadLayout(makeTable({}, flat), 'lead')).toEqual({
      leadColumnId: 'name',
      leadToggle: false,
      selection: 'lead',
    })
  })

  it('has no lead cell for a flat table with checkboxes in their own column', () => {
    expect(getLeadLayout(makeTable({}, flat), 'column')).toEqual({
      leadColumnId: null,
      leadToggle: false,
      selection: 'column',
    })
  })

  it('hides selection with enableRowSelection: false', () => {
    expect(
      getLeadLayout(makeTable({ enableRowSelection: false }), 'lead').selection,
    ).toBeNull()
  })
})
