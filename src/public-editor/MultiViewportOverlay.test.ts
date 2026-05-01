/**
 * @jest-environment jsdom
 */

import { createMultiViewportOverlay } from '../../public/editor/js/MultiViewportOverlay.js'
import { createViewportStore } from '../../public/editor/js/ViewportState.js'

describe('MultiViewportOverlay.js', () => {
  function stubRect(w: number, h: number): () => DOMRect {
    return () =>
      ({
        left: 0,
        top: 0,
        width: w,
        height: h,
        right: w,
        bottom: h,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      }) as DOMRect
  }

  it('initial chrome/handle counts and overlay pointer-events', () => {
    const host = document.createElement('div')
    const store = createViewportStore()
    const overlayApi = createMultiViewportOverlay(host, store, stubRect(800, 600))

    const overlay = host.querySelector('.viewport-overlay')! as HTMLElement
    expect(overlay).toBeTruthy()
    expect(overlay.style.pointerEvents).toBe('none')

    expect(host.querySelectorAll('.viewport-chrome')).toHaveLength(1)
    expect(host.querySelectorAll('.viewport-resize-handle')).toHaveLength(0)

    const chrome = host.querySelector('.viewport-chrome') as HTMLElement
    expect(chrome.style.pointerEvents).toBe('none')

    overlayApi.dispose()
  })

  it('ADD_VIEWPORT top adds chrome and one resize handle', () => {
    const host = document.createElement('div')
    const store = createViewportStore()
    const overlayApi = createMultiViewportOverlay(host, store, stubRect(800, 600))

    store.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })

    expect(host.querySelectorAll('.viewport-chrome')).toHaveLength(2)
    expect(host.querySelectorAll('.viewport-resize-handle')).toHaveLength(1)

    overlayApi.dispose()
  })

  it('sync updates geometry without store dispatch', () => {
    const host = document.createElement('div')
    const store = createViewportStore()
    let W = 400
    let H = 300
    const overlayApi = createMultiViewportOverlay(host, store, () =>
      stubRect(W, H)(),
    )

    const chrome = host.querySelector('.viewport-chrome') as HTMLElement
    expect(chrome.style.width).toBe('400px')

    W = 640
    H = 480
    overlayApi.sync()

    expect(chrome.style.width).toBe('640px')

    overlayApi.dispose()
  })

  it('dispose removes overlay and ignores further dispatch/sync', () => {
    const host = document.createElement('div')
    const store = createViewportStore()
    const overlayApi = createMultiViewportOverlay(host, store, stubRect(800, 600))

    expect(host.querySelector('.viewport-overlay')).toBeTruthy()

    overlayApi.dispose()

    expect(host.querySelector('.viewport-overlay')).toBeNull()

    const childrenBefore = host.childNodes.length
    store.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'left' })
    overlayApi.sync()
    expect(host.childNodes.length).toBe(childrenBefore)
  })
})
