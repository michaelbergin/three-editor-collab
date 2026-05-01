/**
 * @jest-environment jsdom
 */

import { createViewportChrome } from '../../public/editor/js/ViewportChrome.js'
import { fireEvent } from '@testing-library/dom'

describe('ViewportChrome.js', () => {
  const baseRect = { x: 0, y: 0, width: 100, height: 80 }

  it('sets dataset.viewportId and toggles active class on update', () => {
    const onActivate = jest.fn()
    const onClose = jest.fn()
    const { dom, update } = createViewportChrome({
      id: 'vp-test',
      label: 'Perspective',
      isActive: true,
      canClose: false,
      rect: baseRect,
      onClose,
      onActivate,
    })
    expect(dom.dataset.viewportId).toBe('vp-test')
    expect(dom.classList.contains('viewport-chrome--active')).toBe(true)

    update({
      id: 'vp-test',
      label: 'Perspective',
      isActive: false,
      canClose: false,
      rect: baseRect,
      onClose,
      onActivate,
    })
    expect(dom.classList.contains('viewport-chrome--active')).toBe(false)
  })

  it('close vs bar interactions respect propagation rules', () => {
    const onActivate = jest.fn()
    const onClose = jest.fn()

    const { dom, update } = createViewportChrome({
      id: 'vp-x',
      label: 'Top',
      isActive: false,
      canClose: false,
      rect: baseRect,
      onClose,
      onActivate,
    })

    fireEvent.pointerDown(dom)
    expect(onActivate).not.toHaveBeenCalled()

    const bar = dom.querySelector('.viewport-chrome-bar')!
    fireEvent.pointerDown(bar)
    expect(onActivate).toHaveBeenCalledTimes(1)

    update({
      id: 'vp-x',
      label: 'Top',
      isActive: false,
      canClose: true,
      rect: baseRect,
      onClose,
      onActivate,
    })

    const closeBtn = dom.querySelector('.viewport-chrome-close')!
    expect(closeBtn).toBeTruthy()

    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onActivate).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(closeBtn)
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
