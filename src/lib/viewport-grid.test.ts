import {
  computeViewportGrid,
  computeViewportResizeHandles,
  deriveViewportLabel,
  getViewportGridDimensions,
  makeEqualFractions,
} from '@/lib/viewport-grid'
import type { ViewportConfig } from '@/types/viewport'

function sumf(a: number[]) {
  return a.reduce((s, x) => s + x, 0)
}

function handleHasTouchingRects(
  handle: ReturnType<typeof computeViewportResizeHandles>[number],
  rects: ReturnType<typeof computeViewportGrid>,
) {
  const handleCenterX = handle.x + handle.width / 2
  const handleCenterY = handle.y + handle.height / 2

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]
      const b = rects[j]
      const ax1 = a.x + a.width
      const ay1 = a.y + a.height
      const bx1 = b.x + b.width
      const by1 = b.y + b.height

      if (handle.direction === 'vertical') {
        const edgeMatches =
          (Math.abs(ax1 - b.x) <= 2 && Math.abs(handleCenterX - ax1) <= 4) ||
          (Math.abs(bx1 - a.x) <= 2 && Math.abs(handleCenterX - bx1) <= 4)
        const overlapStart = Math.max(a.y, b.y)
        const overlapEnd = Math.min(ay1, by1)
        const segmentFits =
          handle.y >= overlapStart - 1 &&
          handle.y + handle.height <= overlapEnd + 1 &&
          handle.height > 0
        if (edgeMatches && segmentFits) {
          return true
        }
      } else {
        const edgeMatches =
          (Math.abs(ay1 - b.y) <= 2 && Math.abs(handleCenterY - ay1) <= 4) ||
          (Math.abs(by1 - a.y) <= 2 && Math.abs(handleCenterY - by1) <= 4)
        const overlapStart = Math.max(a.x, b.x)
        const overlapEnd = Math.min(ax1, bx1)
        const segmentFits =
          handle.x >= overlapStart - 1 &&
          handle.x + handle.width <= overlapEnd + 1 &&
          handle.width > 0
        if (edgeMatches && segmentFits) {
          return true
        }
      }
    }
  }

  return false
}

describe('makeEqualFractions', () => {
  it('returns [] for 0 and negative', () => {
    expect(makeEqualFractions(0)).toEqual([])
    expect(makeEqualFractions(-3)).toEqual([])
  })
  it('returns [1] for 1', () => {
    expect(makeEqualFractions(1)).toEqual([1])
  })
  it('returns three values summing to 1 for 3', () => {
    const f = makeEqualFractions(3)
    expect(f).toHaveLength(3)
    expect(sumf(f)).toBeCloseTo(1, 6)
  })
})

describe('getViewportGridDimensions', () => {
  it('returns zeros for non-positive', () => {
    expect(getViewportGridDimensions(0)).toEqual({ cols: 0, rows: 0 })
    expect(getViewportGridDimensions(-1)).toEqual({ cols: 0, rows: 0 })
  })
  it('handles 1, 2, 3, 5', () => {
    expect(getViewportGridDimensions(1)).toEqual({ cols: 1, rows: 1 })
    expect(getViewportGridDimensions(2)).toEqual({ cols: 2, rows: 1 })
    expect(getViewportGridDimensions(3)).toEqual({ cols: 2, rows: 2 })
    expect(getViewportGridDimensions(5)).toEqual({ cols: 3, rows: 2 })
  })
})

describe('computeViewportGrid', () => {
  it('returns [] for empty ids', () => {
    expect(computeViewportGrid([], 800, 600, [1], [1])).toEqual([])
  })

  it('one viewport fills 800x600', () => {
    const r = computeViewportGrid(['a'], 800, 600, [1], [1])
    expect(r).toEqual([{ id: 'a', x: 0, y: 0, width: 800, height: 600 }])
  })

  it('four quadrants', () => {
    const ids = ['a', 'b', 'c', 'd']
    const r = computeViewportGrid(ids, 800, 600, [0.5, 0.5], [0.5, 0.5])
    expect(r).toHaveLength(4)
    expect(r.map((x) => x.width)).toEqual([400, 400, 400, 400])
    expect(r.map((x) => x.height)).toEqual([300, 300, 300, 300])
  })

  it('applies custom unequal fractions to complete rows', () => {
    const ids = ['a', 'b', 'c', 'd']
    const r = computeViewportGrid(ids, 1000, 500, [0.2, 0.8], [0.25, 0.75])

    expect(r).toEqual([
      { id: 'a', x: 0, y: 0, width: 200, height: 125 },
      { id: 'b', x: 200, y: 0, width: 800, height: 125 },
      { id: 'c', x: 0, y: 125, width: 200, height: 375 },
      { id: 'd', x: 200, y: 125, width: 800, height: 375 },
    ])
  })

  it('three viewports: two top 300x200, bottom full width 600x200', () => {
    const ids = ['a', 'b', 'c']
    const r = computeViewportGrid(ids, 600, 400, [0.5, 0.5], [0.5, 0.5])
    expect(r).toHaveLength(3)
    const top = r.filter((x) => x.y === 0)
    const bot = r.filter((x) => x.y > 0)
    expect(top).toHaveLength(2)
    expect(top.every((x) => x.height === 200)).toBe(true)
    expect(top.map((x) => x.width).sort((a, b) => a - b)).toEqual([300, 300])
    expect(bot).toHaveLength(1)
    expect(bot[0].width).toBe(600)
    expect(bot[0].height).toBe(200)
  })

  it('clamps negative container size', () => {
    const r = computeViewportGrid(['a'], -10, 100, [1], [1])
    expect(r[0].width).toBe(0)
  })

  it('malformed fractions still yield non-negative rects', () => {
    const r = computeViewportGrid(
      ['a', 'b'],
      100,
      100,
      [NaN, Infinity],
      [-1, 3],
    )
    for (const x of r) {
      expect(x.width).toBeGreaterThanOrEqual(0)
      expect(x.height).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('deriveViewportLabel', () => {
  const p1 = (i: number): ViewportConfig => ({
    id: `p${i}`,
    type: 'perspective',
    typeIndex: i,
  })

  it('single Perspective', () => {
    const v = p1(1)
    expect(deriveViewportLabel(v, [v])).toBe('Perspective')
  })

  it('two Perspective numbered', () => {
    const a = p1(1)
    const b = { ...p1(2), id: 'p2' }
    expect(deriveViewportLabel(a, [a, b])).toBe('Perspective 1')
    expect(deriveViewportLabel(b, [a, b])).toBe('Perspective 2')
  })

  it('after removing one duplicate, remaining label is plain', () => {
    const b = { ...p1(2), id: 'p2' }
    expect(deriveViewportLabel(b, [b])).toBe('Perspective')
  })

  it('Top stays Top when Perspective exists', () => {
    const t: ViewportConfig = { id: 't1', type: 'top', typeIndex: 1 }
    const p = p1(1)
    expect(deriveViewportLabel(t, [p, t])).toBe('Top')
  })
})

describe('computeViewportResizeHandles', () => {
  it('single viewport has no handles', () => {
    const rects = computeViewportGrid(['a'], 400, 300, [1], [1])
    const h = computeViewportResizeHandles(rects, 400, 300, [1], [1])
    expect(h).toEqual([])
  })

  it('two side-by-side: one vertical segment', () => {
    const rects = computeViewportGrid(
      ['a', 'b'],
      400,
      300,
      [0.5, 0.5],
      [1],
    )
    const h = computeViewportResizeHandles(rects, 400, 300, [0.5, 0.5], [1])
    expect(h.some((x) => x.direction === 'vertical')).toBe(true)
    expect(h.every((x) => x.dividerIndex === 0)).toBe(true)
  })

  it('three layout: vertical handle only over top row, not crossing bottom', () => {
    const ids = ['a', 'b', 'c']
    const rects = computeViewportGrid(ids, 600, 400, [0.5, 0.5], [0.5, 0.5])
    const h = computeViewportResizeHandles(
      rects,
      600,
      400,
      [0.5, 0.5],
      [0.5, 0.5],
    )
    const vert = h.filter((x) => x.direction === 'vertical')
    expect(vert.length).toBeGreaterThanOrEqual(1)
    const bottomY = 200
    for (const ha of vert) {
      expect(ha.y + ha.height).toBeLessThanOrEqual(bottomY + 2)
    }
    const horz = h.filter((x) => x.direction === 'horizontal')
    expect(horz.length).toBeGreaterThanOrEqual(1)
  })

  it('four quadrants: vertical per row and horizontal per column segments', () => {
    const ids = ['a', 'b', 'c', 'd']
    const rects = computeViewportGrid(
      ids,
      800,
      800,
      [0.5, 0.5],
      [0.5, 0.5],
    )
    const h = computeViewportResizeHandles(
      rects,
      800,
      800,
      [0.5, 0.5],
      [0.5, 0.5],
    )
    expect(h.filter((x) => x.direction === 'vertical')).toHaveLength(2)
    expect(h.filter((x) => x.direction === 'horizontal')).toHaveLength(2)
  })

  it('five viewports: no handle on bottom row local split, keeps global handles', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const colFr = makeEqualFractions(3)
    const rowFr = makeEqualFractions(2)
    const rects = computeViewportGrid(ids, 900, 600, colFr, rowFr)
    const h = computeViewportResizeHandles(rects, 900, 600, colFr, rowFr)
    const bottomRow = rects.slice(3)
    expect(bottomRow).toHaveLength(2)
    const midLocal = bottomRow[0].x + bottomRow[0].width
    expect(
      h.some(
        (x) =>
          x.direction === 'vertical' &&
          Math.abs(x.x + 3 - midLocal) < 2,
      ),
    ).toBe(false)
    expect(h.length).toBeGreaterThan(0)
  })

  it.each([
    ['two side-by-side', ['a', 'b'], 400, 300, [0.5, 0.5], [1]],
    ['three two-over-one', ['a', 'b', 'c'], 600, 400, [0.5, 0.5], [0.5, 0.5]],
    [
      'four quadrants',
      ['a', 'b', 'c', 'd'],
      800,
      800,
      [0.5, 0.5],
      [0.5, 0.5],
    ],
    [
      'five incomplete final row',
      ['a', 'b', 'c', 'd', 'e'],
      900,
      600,
      [1 / 3, 1 / 3, 1 / 3],
      [0.5, 0.5],
    ],
  ] as const)(
    'every %s handle maps to a real shared touching edge',
    (_name, ids, width, height, colFr, rowFr) => {
      const rects = computeViewportGrid([...ids], width, height, [...colFr], [...rowFr])
      const handles = computeViewportResizeHandles(
        rects,
        width,
        height,
        [...colFr],
        [...rowFr],
      )

      expect(handles.length).toBeGreaterThan(0)
      for (const handle of handles) {
        expect(handleHasTouchingRects(handle, rects)).toBe(true)
      }
    },
  )

  it('single viewport remains the only layout without resize handles', () => {
    const rects = computeViewportGrid(['a'], 400, 300, [1], [1])
    expect(computeViewportResizeHandles(rects, 400, 300, [1], [1])).toEqual([])
  })
})