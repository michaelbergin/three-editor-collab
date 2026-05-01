import { fireEvent, render } from '@testing-library/react'

import { ViewportResizeHandle } from '@/components/editor/ViewportResizeHandle'
import {
  MIN_VIEWPORT_FRACTION,
  viewportInitialState,
  viewportReducer,
} from '@/store/viewport-reducer'

describe('ViewportResizeHandle', () => {
  const handle = {
    id: 'h1',
    direction: 'vertical' as const,
    dividerIndex: 0,
    x: 10,
    y: 0,
    width: 6,
    height: 100,
  }

  it('vertical uses col-resize cursor', () => {
    const { container } = render(
      <ViewportResizeHandle
        handle={handle}
        containerWidth={400}
        containerHeight={300}
        containerOffsetLeft={0}
        containerOffsetTop={0}
        onDragEnd={jest.fn()}
      />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.style.cursor).toBe('col-resize')
  })

  it('horizontal uses row-resize cursor', () => {
    const { container } = render(
      <ViewportResizeHandle
        handle={{ ...handle, direction: 'horizontal' }}
        containerWidth={400}
        containerHeight={300}
        containerOffsetLeft={0}
        containerOffsetTop={0}
        onDragEnd={jest.fn()}
      />,
    )
    const el = container.firstChild as HTMLElement
    expect(el.style.cursor).toBe('row-resize')
  })

  it('emits absolute divider fraction once on pointerup', () => {
    const onDragEnd = jest.fn()
    const { getByTestId } = render(
      <ViewportResizeHandle
        handle={handle}
        containerWidth={200}
        containerHeight={100}
        containerOffsetLeft={50}
        containerOffsetTop={60}
        onDragEnd={onDragEnd}
      />,
    )
    const el = getByTestId('resize-handle-h1')
    fireEvent.pointerDown(el, { clientX: 150 + 50, pointerId: 1 })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 100 + 50,
        clientY: 0,
        pointerId: 1,
        bubbles: true,
      }),
    )
    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledWith('vertical', 0, 0.5)
  })

  it('emits horizontal absolute divider fraction on pointerup', () => {
    const onDragEnd = jest.fn()
    const { getByTestId } = render(
      <ViewportResizeHandle
        handle={{ ...handle, direction: 'horizontal', dividerIndex: 1 }}
        containerWidth={200}
        containerHeight={400}
        containerOffsetLeft={10}
        containerOffsetTop={40}
        onDragEnd={onDragEnd}
      />,
    )
    const el = getByTestId('resize-handle-h1')

    fireEvent.pointerDown(el, { clientY: 80, pointerId: 4 })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 0,
        clientY: 240,
        pointerId: 4,
        bubbles: true,
      }),
    )

    expect(onDragEnd).toHaveBeenCalledTimes(1)
    expect(onDragEnd).toHaveBeenCalledWith('horizontal', 1, 0.5)
  })

  it('clamps out-of-range vertical drag coordinates to 0 and 1', () => {
    const onDragEnd = jest.fn()
    const { getByTestId, rerender } = render(
      <ViewportResizeHandle
        handle={handle}
        containerWidth={100}
        containerHeight={100}
        containerOffsetLeft={50}
        containerOffsetTop={0}
        onDragEnd={onDragEnd}
      />,
    )
    const el = getByTestId('resize-handle-h1')

    fireEvent.pointerDown(el, { clientX: 50, pointerId: 5 })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 20,
        clientY: 0,
        pointerId: 5,
        bubbles: true,
      }),
    )

    rerender(
      <ViewportResizeHandle
        handle={handle}
        containerWidth={100}
        containerHeight={100}
        containerOffsetLeft={50}
        containerOffsetTop={0}
        onDragEnd={onDragEnd}
      />,
    )
    fireEvent.pointerDown(el, { clientX: 50, pointerId: 6 })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 300,
        clientY: 0,
        pointerId: 6,
        bubbles: true,
      }),
    )

    expect(onDragEnd).toHaveBeenNthCalledWith(1, 'vertical', 0, 0)
    expect(onDragEnd).toHaveBeenNthCalledWith(2, 'vertical', 0, 1)
  })

  it('row divider fractions resize only the adjacent reducer row pair', () => {
    let state = viewportInitialState
    for (const viewportType of ['top', 'left', 'right', 'top', 'left', 'right'] as const) {
      state = viewportReducer(state, { type: 'ADD_VIEWPORT', viewportType })
    }

    state = {
      ...state,
      rowFractions: [0.25, 0.25, 0.5],
    }

    const onDragEnd = (
      direction: 'vertical' | 'horizontal',
      dividerIndex: number,
      dividerFraction: number,
    ) => {
      if (direction === 'horizontal') {
        state = viewportReducer(state, {
          type: 'SET_ROW_DIVIDER',
          dividerIndex,
          dividerFraction,
        })
      }
    }

    const { getByTestId } = render(
      <ViewportResizeHandle
        handle={{ ...handle, direction: 'horizontal', dividerIndex: 0 }}
        containerWidth={100}
        containerHeight={1000}
        containerOffsetLeft={0}
        containerOffsetTop={0}
        onDragEnd={onDragEnd}
      />,
    )

    fireEvent.pointerDown(getByTestId('resize-handle-h1'), {
      clientY: 250,
      pointerId: 7,
    })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 0,
        clientY: 1,
        pointerId: 7,
        bubbles: true,
      }),
    )

    expect(state.rowFractions[0]).toBe(MIN_VIEWPORT_FRACTION)
    expect(state.rowFractions[1]).toBeCloseTo(0.5 - MIN_VIEWPORT_FRACTION, 6)
    expect(state.rowFractions[2]).toBeCloseTo(0.5, 6)
  })

  it('removes document listeners after drag end', () => {
    const onDragEnd = jest.fn()
    const { getByTestId, unmount } = render(
      <ViewportResizeHandle
        handle={handle}
        containerWidth={200}
        containerHeight={100}
        containerOffsetLeft={0}
        containerOffsetTop={0}
        onDragEnd={onDragEnd}
      />,
    )
    const el = getByTestId('resize-handle-h1')
    const removeSpy = jest.spyOn(document, 'removeEventListener')
    fireEvent.pointerDown(el, { clientX: 80, pointerId: 2 })
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 80,
        clientY: 0,
        pointerId: 2,
        bubbles: true,
      }),
    )
    expect(removeSpy).toHaveBeenCalled()
    removeSpy.mockRestore()
    unmount()
  })
})
