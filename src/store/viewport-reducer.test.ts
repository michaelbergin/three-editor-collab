import { deriveViewportLabel } from '@/lib/viewport-grid'
import {
  MIN_VIEWPORT_FRACTION,
  viewportInitialState,
  viewportReducer,
} from '@/store/viewport-reducer'

describe('viewportReducer', () => {
  it('initial state has one active Perspective viewport', () => {
    expect(viewportInitialState.viewports).toHaveLength(1)
    expect(viewportInitialState.activeViewportId).toBe('vp-1-perspective')
    expect(viewportInitialState.colFractions).toEqual([1])
    expect(viewportInitialState.rowFractions).toEqual([1])
  })

  it('add Top creates two viewports and equal column fractions', () => {
    let s = viewportInitialState
    s = viewportReducer(s, { type: 'ADD_VIEWPORT', viewportType: 'top' })
    expect(s.viewports).toHaveLength(2)
    expect(s.colFractions).toEqual([0.5, 0.5])
    expect(s.rowFractions).toEqual([1])
    expect(s.activeViewportId).toBe('vp-1-top')
  })

  it('remove last viewport is no-op', () => {
    const s = viewportReducer(viewportInitialState, {
      type: 'REMOVE_VIEWPORT',
      id: 'vp-1-perspective',
    })
    expect(s).toEqual(viewportInitialState)
  })

  it('remove active selects another viewport and resets fractions', () => {
    let s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'top',
    })
    const topId = s.activeViewportId!
    s = viewportReducer(s, { type: 'REMOVE_VIEWPORT', id: topId })
    expect(s.viewports).toHaveLength(1)
    expect(s.activeViewportId).toBe('vp-1-perspective')
    expect(s.colFractions).toEqual([1])
  })

  it('SET_ACTIVE ignores unknown id', () => {
    const s = viewportReducer(viewportInitialState, {
      type: 'SET_ACTIVE',
      id: 'nope',
    })
    expect(s).toEqual(viewportInitialState)
  })

  it('SET_ACTIVE accepts known id', () => {
    let s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'top',
    })
    const p = 'vp-1-perspective'
    s = viewportReducer(s, { type: 'SET_ACTIVE', id: p })
    expect(s.activeViewportId).toBe(p)
  })

  it('duplicate Perspective labels via deriveViewportLabel', () => {
    const s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'perspective',
    })
    const labels = s.viewports.map((v) => deriveViewportLabel(v, s.viewports))
    expect(labels.sort()).toEqual(['Perspective 1', 'Perspective 2'])
  })

  it('type counters never decrement after removal', () => {
    let s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'perspective',
    })
    const c = s.typeCounters.perspective
    const rm = s.viewports.find((v) => v.id !== 'vp-1-perspective')!
    s = viewportReducer(s, { type: 'REMOVE_VIEWPORT', id: rm.id })
    expect(s.typeCounters.perspective).toBe(c)
  })

  it('three-column resize preserves untouched first column', () => {
    let s = viewportInitialState
    for (const t of ['top', 'left', 'right', 'top'] as const) {
      s = viewportReducer(s, { type: 'ADD_VIEWPORT', viewportType: t })
    }
    expect(s.colFractions).toHaveLength(3)
    s = {
      ...s,
      colFractions: [0.2, 0.3, 0.5],
    }
    s = viewportReducer(s, {
      type: 'SET_COL_DIVIDER',
      dividerIndex: 1,
      dividerFraction: 0.7,
    })
    expect(s.colFractions[0]).toBeCloseTo(0.2, 6)
    expect(s.colFractions[1]).toBeCloseTo(0.5, 6)
    expect(s.colFractions[2]).toBeCloseTo(0.3, 6)
  })

  it('two-column SET_COL_DIVIDER clamps to minimum', () => {
    let s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'top',
    })
    s = viewportReducer(s, {
      type: 'SET_COL_DIVIDER',
      dividerIndex: 0,
      dividerFraction: 0,
    })
    expect(s.colFractions[0]).toBe(MIN_VIEWPORT_FRACTION)
    expect(s.colFractions[1]).toBeCloseTo(1 - MIN_VIEWPORT_FRACTION, 6)
  })

  it('three-row resize adjusts adjacent pair only', () => {
    let s = viewportInitialState
    for (const t of ['top', 'left', 'right', 'top', 'left', 'right'] as const) {
      s = viewportReducer(s, { type: 'ADD_VIEWPORT', viewportType: t })
    }
    expect(s.rowFractions).toHaveLength(3)
    s = {
      ...s,
      rowFractions: [0.25, 0.25, 0.5],
    }
    s = viewportReducer(s, {
      type: 'SET_ROW_DIVIDER',
      dividerIndex: 0,
      dividerFraction: 0.001,
    })
    expect(s.rowFractions[0]).toBe(MIN_VIEWPORT_FRACTION)
    expect(s.rowFractions[1]).toBeCloseTo(0.5 - MIN_VIEWPORT_FRACTION, 6)
    expect(s.rowFractions[2]).toBeCloseTo(0.5, 6)
  })

  it('invalid divider index is ignored', () => {
    const s = viewportReducer(viewportInitialState, {
      type: 'SET_COL_DIVIDER',
      dividerIndex: 3,
      dividerFraction: 0.5,
    })
    expect(s).toEqual(viewportInitialState)
  })

  it('add resets manual column widths', () => {
    let s = viewportReducer(viewportInitialState, {
      type: 'ADD_VIEWPORT',
      viewportType: 'top',
    })
    s = viewportReducer(s, {
      type: 'SET_COL_DIVIDER',
      dividerIndex: 0,
      dividerFraction: 0.2,
    })
    s = viewportReducer(s, { type: 'ADD_VIEWPORT', viewportType: 'left' })
    expect(s.colFractions).toEqual([0.5, 0.5])
  })
})
