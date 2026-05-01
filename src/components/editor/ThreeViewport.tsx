import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { ViewportChrome } from '@/components/editor/ViewportChrome'
import { ViewportResizeHandle } from '@/components/editor/ViewportResizeHandle'
import {
  computeViewportGrid,
  computeViewportResizeHandles,
  deriveViewportLabel,
} from '@/lib/viewport-grid'
import {
  buildEditorScene,
  createViewportCamera,
  createViewportControls,
} from '@/lib/three-scene'
import { useViewportContext } from '@/store/ViewportContext'
import type { ViewportType } from '@/types/viewport'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type ViewportStatus = 'booting' | 'ready' | 'webgl-unavailable'

function canCreateWebGLContext() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function updatePerspectiveFromRect(
  cam: THREE.PerspectiveCamera,
  width: number,
  height: number,
) {
  const h = Math.max(height, 1e-6)
  const w = Math.max(width, 1e-6)
  cam.aspect = w / h
  cam.updateProjectionMatrix()
}

function updateOrthoFromRect(
  cam: THREE.OrthographicCamera,
  width: number,
  height: number,
) {
  const h = Math.max(height, 1e-6)
  const w = Math.max(width, 1e-6)
  const a = w / h
  const frustumSize = 10
  const halfH = frustumSize / 2
  const halfW = halfH * a
  cam.left = -halfW
  cam.right = halfW
  cam.top = halfH
  cam.bottom = -halfH
  cam.updateProjectionMatrix()
}

function syncCameraProjection(
  camera: THREE.Camera,
  width: number,
  height: number,
) {
  if (camera instanceof THREE.PerspectiveCamera) {
    updatePerspectiveFromRect(camera, width, height)
  } else if (camera instanceof THREE.OrthographicCamera) {
    updateOrthoFromRect(camera, width, height)
  }
}

export function ThreeViewport() {
  const { state, dispatch } = useViewportContext()
  const hostRef = useRef<HTMLDivElement | null>(null)

  const [status, setStatus] = useState<ViewportStatus>(() => {
    if (typeof document === 'undefined') {
      return 'booting'
    }
    return canCreateWebGLContext() ? 'booting' : 'webgl-unavailable'
  })
  const webglUnavailableAtBoot = status === 'webgl-unavailable'

  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 })
  const [hostOffset, setHostOffset] = useState({ left: 0, top: 0 })

  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const camerasRef = useRef<Map<string, THREE.Camera>>(new Map())
  const controlsRef = useRef<Map<string, OrbitControls>>(new Map())
  const viewportTypesRef = useRef<Map<string, ViewportType>>(new Map())

  const pointerDownOnCanvasRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }
    const measure = () => {
      setContainerSize({
        width: Math.max(host.clientWidth, 1),
        height: Math.max(host.clientHeight, 1),
      })
      const b = host.getBoundingClientRect()
      setHostOffset({ left: b.left, top: b.top })
    }
    measure()
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(host)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const findViewportAt = useCallback(
    (clientX: number, clientY: number) => {
      const host = hostRef.current
      if (!host) {
        return null
      }
      const b = host.getBoundingClientRect()
      const x = clientX - b.left
      const y = clientY - b.top
      const s = stateRef.current
      const w = Math.max(host.clientWidth, 1)
      const h = Math.max(host.clientHeight, 1)
      const rects = computeViewportGrid(
        s.viewports.map((v) => v.id),
        w,
        h,
        s.colFractions,
        s.rowFractions,
      )
      for (const rect of rects) {
        const insideX = x >= rect.x && x < rect.x + rect.width
        const insideY = y >= rect.y && y < rect.y + rect.height
        if (insideX && insideY) {
          return rect.id
        }
      }
      return null
    },
    [],
  )

  const disableAllControls = useCallback(() => {
    for (const c of controlsRef.current.values()) {
      Object.assign(c, { enabled: false })
    }
  }, [])

  const enableControlsFor = useCallback((id: string | null) => {
    for (const [vid, c] of controlsRef.current) {
      Object.assign(c, { enabled: vid === id })
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || webglUnavailableAtBoot) {
      return
    }

    const editor = buildEditorScene()
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      window.setTimeout(() => setStatus('webgl-unavailable'), 0)
      editor.dispose()
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'h-full w-full'
    host.appendChild(renderer.domElement)

    const camerasMapStable = camerasRef.current
    const controlsMapStable = controlsRef.current
    const typesMapStable = viewportTypesRef.current

    const resizeRenderer = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      renderer.setSize(width, height, false)
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeRenderer)
    resizeObserver?.observe(host)
    window.addEventListener('resize', resizeRenderer)
    resizeRenderer()

    const onPointerDownCapture = (e: PointerEvent) => {
      const id = findViewportAt(e.clientX, e.clientY)
      if (id) {
        dispatch({ type: 'SET_ACTIVE', id })
        pointerDownOnCanvasRef.current = true
        enableControlsFor(id)
      }
    }

    const onWheelCapture = (e: WheelEvent) => {
      const id = findViewportAt(e.clientX, e.clientY)
      if (!id) {
        return
      }
      dispatch({ type: 'SET_ACTIVE', id })
      enableControlsFor(id)
    }

    const onClick = (e: MouseEvent) => {
      const id = findViewportAt(e.clientX, e.clientY)
      if (id) {
        dispatch({ type: 'SET_ACTIVE', id })
      }
    }

    const onTouchStartCapture = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) {
        return
      }
      const id = findViewportAt(t.clientX, t.clientY)
      if (id) {
        dispatch({ type: 'SET_ACTIVE', id })
        pointerDownOnCanvasRef.current = true
        enableControlsFor(id)
      }
    }

    const releasePointerRouting = () => {
      pointerDownOnCanvasRef.current = false
      disableAllControls()
    }

    const onPointerUpDocument = () => {
      releasePointerRouting()
    }

    const onPointerLeaveCanvas = () => {
      if (!pointerDownOnCanvasRef.current) {
        disableAllControls()
      }
    }

    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onPointerDownCapture, true)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheelCapture, { capture: true, passive: true })
    canvas.addEventListener('touchstart', onTouchStartCapture, true)
    canvas.addEventListener('pointerup', releasePointerRouting)
    canvas.addEventListener('pointercancel', releasePointerRouting)
    canvas.addEventListener('lostpointercapture', releasePointerRouting)
    canvas.addEventListener('pointerleave', onPointerLeaveCanvas)
    document.addEventListener('pointerup', onPointerUpDocument)
    document.addEventListener('pointercancel', onPointerUpDocument)

    let animationFrame = 0
    const clock = new THREE.Clock()
    let lastKey = ''

    const syncViewportResources = () => {
      const s = stateRef.current
      const key = s.viewports.map((v) => `${v.id}:${v.type}`).join('|')
      if (key === lastKey) {
        return
      }
      lastKey = key
      const keep = new Set(s.viewports.map((v) => v.id))
      for (const id of camerasRef.current.keys()) {
        if (!keep.has(id)) {
          controlsRef.current.get(id)?.dispose()
          controlsRef.current.delete(id)
          camerasRef.current.delete(id)
          viewportTypesRef.current.delete(id)
        }
      }
      for (const v of s.viewports) {
        if (!camerasRef.current.has(v.id)) {
          const cam = createViewportCamera(v.type, 1)
          camerasRef.current.set(v.id, cam)
          viewportTypesRef.current.set(v.id, v.type)
          const ctrl = createViewportControls(cam, v.type, canvas)
          controlsRef.current.set(v.id, ctrl)
        } else if (viewportTypesRef.current.get(v.id) !== v.type) {
          controlsRef.current.get(v.id)?.dispose()
          const cam = createViewportCamera(v.type, 1)
          camerasRef.current.set(v.id, cam)
          viewportTypesRef.current.set(v.id, v.type)
          controlsRef.current.set(
            v.id,
            createViewportControls(cam, v.type, canvas),
          )
        }
      }
    }

    const animate = () => {
      syncViewportResources()
      const elapsed = clock.getElapsedTime()
      const cube = editor.objects.cube
      const ghost = editor.objects.ghost
      cube.rotation.y = elapsed * 0.38
      ghost.position.y = 0.45 + Math.sin(elapsed * 1.8) * 0.08

      const s = stateRef.current
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      const rects = computeViewportGrid(
        s.viewports.map((v) => v.id),
        width,
        height,
        s.colFractions,
        s.rowFractions,
      )

      for (const ctrl of controlsRef.current.values()) {
        if (ctrl.enabled) {
          ctrl.update()
        }
      }

      renderer.setScissorTest(true)
      for (const rect of rects) {
        const cam = camerasRef.current.get(rect.id)
        const vconf = s.viewports.find((v) => v.id === rect.id)
        if (!cam || !vconf) {
          continue
        }
        syncCameraProjection(cam, rect.width, rect.height)
        const yGl = height - rect.y - rect.height
        renderer.setViewport(rect.x, yGl, rect.width, rect.height)
        renderer.setScissor(rect.x, yGl, rect.width, rect.height)
        renderer.clear(true, true, true)
        renderer.render(editor.scene, cam)
      }
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, width, height)

      animationFrame = window.requestAnimationFrame(animate)
    }

    animate()
    const readyFrame = window.requestAnimationFrame(() => setStatus('ready'))

    return () => {
      window.cancelAnimationFrame(readyFrame)
      window.cancelAnimationFrame(animationFrame)
      canvas.removeEventListener('pointerdown', onPointerDownCapture, true)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheelCapture, { capture: true })
      canvas.removeEventListener('touchstart', onTouchStartCapture, true)
      canvas.removeEventListener('pointerup', releasePointerRouting)
      canvas.removeEventListener('pointercancel', releasePointerRouting)
      canvas.removeEventListener('lostpointercapture', releasePointerRouting)
      canvas.removeEventListener('pointerleave', onPointerLeaveCanvas)
      document.removeEventListener('pointerup', onPointerUpDocument)
      document.removeEventListener('pointercancel', onPointerUpDocument)
      window.removeEventListener('resize', resizeRenderer)
      resizeObserver?.disconnect()
      for (const c of [...controlsMapStable.values()]) {
        c.dispose()
      }
      controlsMapStable.clear()
      camerasMapStable.clear()
      typesMapStable.clear()
      lastKey = ''
      renderer.dispose()
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement)
      }
      editor.dispose()
    }
  }, [
    webglUnavailableAtBoot,
    dispatch,
    findViewportAt,
    enableControlsFor,
    disableAllControls,
  ])

  const viewportRects = computeViewportGrid(
    state.viewports.map((v) => v.id),
    containerSize.width,
    containerSize.height,
    state.colFractions,
    state.rowFractions,
  )

  const handles = computeViewportResizeHandles(
    viewportRects,
    containerSize.width,
    containerSize.height,
    state.colFractions,
    state.rowFractions,
  )

  const onResizeEnd = (
    direction: 'vertical' | 'horizontal',
    dividerIndex: number,
    dividerFraction: number,
  ) => {
    if (direction === 'vertical') {
      dispatch({
        type: 'SET_COL_DIVIDER',
        dividerIndex,
        dividerFraction,
      })
    } else {
      dispatch({
        type: 'SET_ROW_DIVIDER',
        dividerIndex,
        dividerFraction,
      })
    }
  }

  return (
    <section className="relative h-full min-h-[420px] overflow-hidden bg-[#101820]">
      <div ref={hostRef} data-testid="three-viewport" className="relative h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden={false}
      >
        {viewportRects.map((rect) => {
          const vp = state.viewports.find((v) => v.id === rect.id)
          if (!vp) {
            return null
          }
          return (
            <ViewportChrome
              key={rect.id}
              viewportId={vp.id}
              label={deriveViewportLabel(vp, state.viewports)}
              isActive={state.activeViewportId === vp.id}
              canClose={state.viewports.length > 1}
              rect={rect}
              onClose={() =>
                dispatch({ type: 'REMOVE_VIEWPORT', id: vp.id })
              }
              onActivate={() => dispatch({ type: 'SET_ACTIVE', id: vp.id })}
            />
          )
        })}
        {handles.map((h) => (
          <ViewportResizeHandle
            key={h.id}
            handle={h}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            containerOffsetLeft={hostOffset.left}
            containerOffsetTop={hostOffset.top}
            onDragEnd={onResizeEnd}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur">
        <span className="size-2 rounded-full bg-emerald-300" />
        {status === 'ready' ? 'Viewport' : 'WebGL offline'}
      </div>
      {status === 'webgl-unavailable' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/80">
          WebGL is unavailable in this environment.
        </div>
      ) : null}
    </section>
  )
}
