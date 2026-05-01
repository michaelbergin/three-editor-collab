import {
  getViewportGridDimensions,
  makeEqualFractions,
} from '@/lib/viewport-grid'
import type { ViewportConfig, ViewportType } from '@/types/viewport'

export const MIN_VIEWPORT_FRACTION = 0.02

export interface ViewportState {
  viewports: ViewportConfig[]
  activeViewportId: string | null
  colFractions: number[]
  rowFractions: number[]
  typeCounters: Record<ViewportType, number>
}

export type ViewportAction =
  | { type: 'ADD_VIEWPORT'; viewportType: ViewportType }
  | { type: 'REMOVE_VIEWPORT'; id: string }
  | { type: 'SET_ACTIVE'; id: string }
  | { type: 'SET_COL_DIVIDER'; dividerIndex: number; dividerFraction: number }
  | { type: 'SET_ROW_DIVIDER'; dividerIndex: number; dividerFraction: number }

const INITIAL_COUNTERS: Record<ViewportType, number> = {
  perspective: 1,
  top: 0,
  left: 0,
  right: 0,
}

export const viewportInitialState: ViewportState = {
  viewports: [
    { id: 'vp-1-perspective', type: 'perspective', typeIndex: 1 },
  ],
  activeViewportId: 'vp-1-perspective',
  colFractions: [1],
  rowFractions: [1],
  typeCounters: { ...INITIAL_COUNTERS },
}

function sum(arr: number[], start: number, endInclusive: number): number {
  let s = 0
  for (let i = start; i <= endInclusive; i++) {
    s += arr[i] ?? 0
  }
  return s
}

function applyColDivider(
  fractions: number[],
  dividerIndex: number,
  dividerFraction: number,
): number[] | null {
  if (
    dividerIndex < 0 ||
    dividerIndex >= fractions.length - 1 ||
    fractions.length < 2
  ) {
    return null
  }
  const pairStart = sum(fractions, 0, dividerIndex - 1)
  const pairEnd = sum(fractions, 0, dividerIndex + 1)
  const pairSpan = pairEnd - pairStart
  if (pairSpan < 2 * MIN_VIEWPORT_FRACTION) {
    return null
  }
  let first = dividerFraction - pairStart
  first = Math.min(
    Math.max(first, MIN_VIEWPORT_FRACTION),
    pairSpan - MIN_VIEWPORT_FRACTION,
  )
  const second = pairSpan - first
  const next = [...fractions]
  next[dividerIndex] = first
  next[dividerIndex + 1] = second
  return next
}

function applyRowDivider(
  fractions: number[],
  dividerIndex: number,
  dividerFraction: number,
): number[] | null {
  return applyColDivider(fractions, dividerIndex, dividerFraction)
}

export function viewportReducer(
  state: ViewportState,
  action: ViewportAction,
): ViewportState {
  switch (action.type) {
    case 'ADD_VIEWPORT': {
      const nextCount = state.typeCounters[action.viewportType] + 1
      const typeCounters = {
        ...state.typeCounters,
        [action.viewportType]: nextCount,
      }
      const id = `vp-${nextCount}-${action.viewportType}`
      const viewports = [
        ...state.viewports,
        {
          id,
          type: action.viewportType,
          typeIndex: nextCount,
        },
      ]
      const { cols, rows } = getViewportGridDimensions(viewports.length)
      return {
        viewports,
        activeViewportId: id,
        colFractions: makeEqualFractions(cols),
        rowFractions: makeEqualFractions(rows),
        typeCounters,
      }
    }
    case 'REMOVE_VIEWPORT': {
      if (state.viewports.length <= 1) {
        return state
      }
      const viewports = state.viewports.filter((v) => v.id !== action.id)
      if (viewports.length === state.viewports.length) {
        return state
      }
      const { cols, rows } = getViewportGridDimensions(viewports.length)
      let activeViewportId = state.activeViewportId
      if (!activeViewportId || !viewports.some((v) => v.id === activeViewportId)) {
        activeViewportId = viewports[0]?.id ?? null
      }
      return {
        viewports,
        activeViewportId,
        colFractions: makeEqualFractions(cols),
        rowFractions: makeEqualFractions(rows),
        typeCounters: state.typeCounters,
      }
    }
    case 'SET_ACTIVE': {
      if (!state.viewports.some((v) => v.id === action.id)) {
        return state
      }
      return { ...state, activeViewportId: action.id }
    }
    case 'SET_COL_DIVIDER': {
      const next = applyColDivider(
        state.colFractions,
        action.dividerIndex,
        action.dividerFraction,
      )
      if (!next) {
        return state
      }
      return { ...state, colFractions: next }
    }
    case 'SET_ROW_DIVIDER': {
      const next = applyRowDivider(
        state.rowFractions,
        action.dividerIndex,
        action.dividerFraction,
      )
      if (!next) {
        return state
      }
      return { ...state, rowFractions: next }
    }
    default:
      return state
  }
}
