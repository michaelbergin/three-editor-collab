import {
  createViewportStore,
  viewportInitialState,
  viewportReducer,
} from '../../public/editor/js/ViewportState.js'

describe('ViewportState.js (legacy port)', () => {
  describe('viewportReducer', () => {
    it('ADD_VIEWPORT top yields 2 viewports and active ends with top', () => {
      const next = viewportReducer(viewportInitialState, {
        type: 'ADD_VIEWPORT',
        viewportType: 'top',
      })
      expect(next.viewports).toHaveLength(2)
      expect(next.activeViewportId?.endsWith('top')).toBe(true)
    })

    it('REMOVE_VIEWPORT when only one viewport returns same state reference', () => {
      const before = viewportInitialState
      const after = viewportReducer(before, {
        type: 'REMOVE_VIEWPORT',
        id: 'vp-1-perspective',
      })
      expect(after).toBe(before)
    })
  })

  describe('createViewportStore', () => {
    it('subscriber called exactly once per dispatch', () => {
      const store = createViewportStore()
      let n = 0
      store.subscribe(() => {
        n++
      })
      store.dispatch({ type: 'SET_ACTIVE', id: 'vp-1-perspective' })
      expect(n).toBe(1)
    })

    it('unsubscribe stops notifications', () => {
      const store = createViewportStore()
      let n = 0
      const unsub = store.subscribe(() => {
        n++
      })
      store.dispatch({ type: 'SET_ACTIVE', id: 'vp-1-perspective' })
      unsub()
      store.dispatch({ type: 'SET_ACTIVE', id: 'vp-1-perspective' })
      expect(n).toBe(1)
    })

    it('ADD_VIEWPORT left yields length 2', () => {
      const store = createViewportStore()
      store.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'left' })
      expect(store.getState().viewports).toHaveLength(2)
    })

    it('REMOVE_VIEWPORT last viewport keeps prior state snapshot equal', () => {
      const store = createViewportStore()
      const before = store.getState()
      store.dispatch({
        type: 'REMOVE_VIEWPORT',
        id: before.viewports[0].id,
      })
      expect(store.getState()).toBe(before)
    })
  })
})
