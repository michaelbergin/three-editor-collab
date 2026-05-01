import { useCallback, useEffect, useRef } from 'react'

import type { ViewportResizeHandleRect } from '@/types/viewport'

export interface ViewportResizeHandleProps {
  handle: ViewportResizeHandleRect
  containerWidth: number
  containerHeight: number
  /** Host element `getBoundingClientRect().left` */
  containerOffsetLeft: number
  /** Host element `getBoundingClientRect().top` */
  containerOffsetTop: number
  onDragEnd(
    direction: 'vertical' | 'horizontal',
    dividerIndex: number,
    dividerFraction: number,
  ): void
}

export function ViewportResizeHandle({
  handle,
  containerWidth,
  containerHeight,
  containerOffsetLeft,
  containerOffsetTop,
  onDragEnd,
}: ViewportResizeHandleProps) {
  const dragging = useRef(false)
  const propsRef = useRef({
    handle,
    containerWidth,
    containerHeight,
    containerOffsetLeft,
    containerOffsetTop,
    onDragEnd,
  })

  useEffect(() => {
    propsRef.current = {
      handle,
      containerWidth,
      containerHeight,
      containerOffsetLeft,
      containerOffsetTop,
      onDragEnd,
    }
  }, [
    handle,
    containerWidth,
    containerHeight,
    containerOffsetLeft,
    containerOffsetTop,
    onDragEnd,
  ])

  const teardownRef = useRef<(() => void) | null>(null)

  const endDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) {
      return
    }
    dragging.current = false
    const {
      handle: h,
      containerWidth: cw,
      containerHeight: ch,
      containerOffsetLeft: ox,
      containerOffsetTop: oy,
      onDragEnd: end,
    } = propsRef.current
    const w = Math.max(cw, 1)
    const hPx = Math.max(ch, 1)
    const cx = Number.isFinite(clientX) ? clientX : 0
    const cy = Number.isFinite(clientY) ? clientY : 0
    const relX = cx - ox
    const relY = cy - oy
    if (h.direction === 'vertical') {
      const frac = Math.min(1, Math.max(0, relX / w))
      end('vertical', h.dividerIndex, frac)
    } else {
      const frac = Math.min(1, Math.max(0, relY / hPx))
      end('horizontal', h.dividerIndex, frac)
    }
  }, [])

  useEffect(() => {
    return () => {
      teardownRef.current?.()
      teardownRef.current = null
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const onMove = () => {
      /* fraction computed on up */
    }
    const onUp = (ev: PointerEvent) => {
      endDrag(ev.clientX, ev.clientY)
      teardown()
    }
    const onLost = () => {
      dragging.current = false
      teardown()
    }

    const teardown = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      document.removeEventListener('lostpointercapture', onLost)
      teardownRef.current = null
    }

    teardownRef.current = teardown
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    document.addEventListener('lostpointercapture', onLost)
  }

  return (
    <div
      className="pointer-events-auto absolute z-10 touch-none"
      style={{
        left: handle.x,
        top: handle.y,
        width: handle.width,
        height: handle.height,
        cursor: handle.direction === 'vertical' ? 'col-resize' : 'row-resize',
      }}
      data-testid={`resize-handle-${handle.id}`}
      onPointerDown={onPointerDown}
    />
  )
}
