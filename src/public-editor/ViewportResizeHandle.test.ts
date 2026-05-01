/**
 * @jest-environment jsdom
 */

import { createViewportResizeHandle } from '../../public/editor/js/ViewportResizeHandle.js'
import { fireEvent } from '@testing-library/dom'

describe('ViewportResizeHandle.js', () => {
  const getRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON() {
        return {}
      },
    }) as DOMRect

  beforeEach(() => {
    Element.prototype.setPointerCapture = jest.fn()
    Element.prototype.releasePointerCapture = jest.fn()
  })

  it('sets cursor by direction', () => {
    const h = createViewportResizeHandle(
      {
        id: 'v-0',
        direction: 'vertical',
        dividerIndex: 0,
        x: 10,
        y: 0,
        width: 6,
        height: 100,
      },
      { onDragEnd: jest.fn() },
      getRect,
    )
    expect(h.dom.style.cursor).toBe('col-resize')
    h.dispose()

    const h2 = createViewportResizeHandle(
      {
        id: 'h-0',
        direction: 'horizontal',
        dividerIndex: 1,
        x: 0,
        y: 10,
        width: 100,
        height: 6,
      },
      { onDragEnd: jest.fn() },
      getRect,
    )
    expect(h2.dom.style.cursor).toBe('row-resize')
    h2.dispose()
  })

  it('pointer sequence invokes onDragEnd once with dividerIndex', () => {
    const onDragEnd = jest.fn()
    const instance = createViewportResizeHandle(
      {
        id: 'v-0',
        direction: 'vertical',
        dividerIndex: 2,
        x: 100,
        y: 0,
        width: 6,
        height: 80,
      },
      { onDragEnd },
      getRect,
    )

    fireEvent.pointerDown(instance.dom, {
      pointerId: 1,
      clientX: 200,
      clientY: 50,
    })
    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 200,
      clientY: 50,
    })

    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd.mock.calls[0][1]).toBe(2)

    instance.dispose()

    fireEvent.pointerDown(instance.dom, {
      pointerId: 2,
      clientX: 200,
      clientY: 50,
    })
    fireEvent.pointerUp(document, {
      pointerId: 2,
      clientX: 200,
      clientY: 50,
    })

    expect(onDragEnd).toHaveBeenCalledTimes(1)
  })
})
