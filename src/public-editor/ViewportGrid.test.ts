import {
  computeViewportGrid,
  computeViewportResizeHandles,
  deriveViewportLabel,
  getViewportGridDimensions,
  makeEqualFractions,
} from '../../public/editor/js/ViewportGrid.js'

function sumf(a: number[]) {
  return a.reduce((s, x) => s + x, 0)
}

describe('ViewportGrid.js (legacy port)', () => {
  describe('makeEqualFractions', () => {
    it('returns [] for 0 and negative', () => {
      expect(makeEqualFractions(0)).toEqual([])
      expect(makeEqualFractions(-3)).toEqual([])
    })
    it('returns [1] for 1', () => {
      expect(makeEqualFractions(1)).toEqual([1])
    })
    it('returns two 0.5 for 2', () => {
      expect(makeEqualFractions(2)).toEqual([0.5, 0.5])
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
    it('handles 3 → 2×2', () => {
      expect(getViewportGridDimensions(3)).toEqual({ cols: 2, rows: 2 })
    })
  })

  describe('computeViewportGrid', () => {
    it('two columns tile full width with equal fractions', () => {
      const r = computeViewportGrid(['a', 'b'], 800, 600, [0.5, 0.5], [1])
      expect(r).toHaveLength(2)
      expect(r[0].width).toBe(400)
      expect(r[1].width).toBe(400)
      expect(r[0].height).toBe(600)
      expect(r[1].height).toBe(600)
      expect(r[0].x).toBe(0)
      expect(r[1].x).toBe(400)
    })
    it('four quadrants are 400×300 on 800×600', () => {
      const ids = ['a', 'b', 'c', 'd']
      const r = computeViewportGrid(ids, 800, 600, [0.5, 0.5], [0.5, 0.5])
      expect(r).toHaveLength(4)
      expect(r.map((x: { width: number }) => x.width)).toEqual([400, 400, 400, 400])
      expect(r.map((x: { height: number }) => x.height)).toEqual([300, 300, 300, 300])
    })
    it('malformed fractions still yield non-negative rects', () => {
      const r = computeViewportGrid(['a', 'b'], 100, 100, [NaN, Infinity], [-1, 3])
      for (const x of r) {
        expect(x.width).toBeGreaterThanOrEqual(0)
        expect(x.height).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('deriveViewportLabel', () => {
    const p1 = (i: number) => ({
      id: `p${i}`,
      type: 'perspective' as const,
      typeIndex: i,
    })

    it('single Perspective', () => {
      const v = p1(1)
      expect(deriveViewportLabel(v, [v])).toBe('Perspective')
    })
  })

  describe('computeViewportResizeHandles', () => {
    it('single viewport has no handles', () => {
      const rects = computeViewportGrid(['a'], 400, 300, [1], [1])
      const h = computeViewportResizeHandles(rects, 400, 300, [1], [1])
      expect(h).toEqual([])
    })
  })
})
