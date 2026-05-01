/**
 * @jest-environment jsdom
 */

import * as THREE from 'three'
import { fireEvent } from '@testing-library/dom'

jest.mock('../../public/editor/js/libs/ui.js', () => {
  class UIElement {
    dom: HTMLElement

    constructor(dom: HTMLElement) {
      this.dom = dom
    }

    add(...children: Array<{ dom: HTMLElement }>) {
      for (const child of children) {
        this.dom.appendChild(child.dom)
      }
      return this
    }

    setId(id: string) {
      this.dom.id = id
      return this
    }

    setPosition(value: string) {
      this.dom.style.position = value
      return this
    }

    setClass(value: string) {
      this.dom.className = value
      return this
    }

    setTextContent(value: string) {
      this.dom.textContent = value
      return this
    }
  }

  class UIPanel extends UIElement {
    constructor() {
      super(document.createElement('div'))
    }
  }

  return { UIPanel }
})

jest.mock('../../public/editor/js/Viewport.Controls.js', () => ({
  ViewportControls: class {
    dom = document.createElement('div')
  },
}))

jest.mock('../../public/editor/js/Viewport.Info.js', () => ({
  ViewportInfo: class {
    dom = document.createElement('div')
  },
}))

jest.mock('../../public/editor/js/EditorControls.js', () => ({
  EditorControls: class {
    enabled = true
    center = new (jest.requireActual<typeof import('three')>('three').Vector3)()
    object: { userData: Record<string, number> }

    constructor(object: { userData: Record<string, number> }) {
      this.object = object
      this.object.userData.controlPointerDowns = 0
      this.object.userData.controlWheels = 0
    }

    addEventListener() {}

    connect(element: HTMLElement) {
      element.addEventListener('pointerdown', () => {
        if (this.enabled) {
          this.object.userData.controlPointerDowns += 1
        }
      })
      element.addEventListener('wheel', () => {
        if (this.enabled) {
          this.object.userData.controlWheels += 1
        }
      })
    }

    disconnect() {}

    focus() {}
  },
}))

const mockTransformControlsInstances: Array<{
  dispatchEvent(event: { type: string }): void
}> = []

jest.mock('three/addons/controls/TransformControls.js', () => {
  const actualThree = jest.requireActual<typeof import('three')>('three')

  return {
    TransformControls: class {
      object = undefined
      listeners: Record<string, Array<() => void>> = {}

      constructor() {
        mockTransformControlsInstances.push(this)
      }

      addEventListener(type: string, fn: () => void) {
        this.listeners[type] ??= []
        this.listeners[type].push(fn)
      }

      dispatchEvent(event: { type: string }) {
        for (const fn of this.listeners[event.type] ?? []) {
          fn()
        }
      }

      connect() {}
      detach() {}
      attach() {}
      setMode() {}
      getMode() {
        return 'translate'
      }
      setTranslationSnap() {}
      setSpace() {}
      getHelper() {
        return new actualThree.Object3D()
      }
    },
  }
})

jest.mock('../../public/editor/js/Viewport.ViewHelper.js', () => ({
  ViewHelper: class {
    animating = false
    center = null
    render = jest.fn()
    update = jest.fn()
  },
}))

jest.mock('../../public/editor/js/Viewport.XR.js', () => ({
  XR: class {},
}))

jest.mock('../../public/editor/js/Viewport.Pathtracer.js', () => ({
  ViewportPathtracer: class {
    init = jest.fn()
    reset = jest.fn()
    setSize = jest.fn()
    setBackground = jest.fn()
    setEnvironment = jest.fn()
    updateMaterials = jest.fn()
    update = jest.fn()
    getSamples = jest.fn(() => 0)
  },
}))

jest.mock('three/webgpu', () => ({
  PMREMGenerator: class {
    dispose = jest.fn()
    fromScene = jest.fn(() => ({ texture: {} }))
  },
}))

jest.mock('three/addons/environments/ColorEnvironment.js', () => ({
  ColorEnvironment: class {},
}))

jest.mock('three/addons/environments/RoomEnvironment.js', () => ({
  RoomEnvironment: class {},
}))

import { Viewport } from '../../public/editor/js/Viewport.js'

function createSignal() {
  const listeners: Array<(...args: unknown[]) => void> = []
  return {
    add(fn: (...args: unknown[]) => void) {
      listeners.push(fn)
    },
    dispatch: jest.fn((...args: unknown[]) => {
      for (const fn of listeners) {
        fn(...args)
      }
    }),
  }
}

function createSignals() {
  const names = [
    'editorCleared',
    'transformModeChanged',
    'snapChanged',
    'spaceChanged',
    'rendererUpdated',
    'rendererCreated',
    'rendererDetectKTX2Support',
    'sceneGraphChanged',
    'cameraChanged',
    'objectSelected',
    'objectFocused',
    'geometryChanged',
    'objectChanged',
    'objectRemoved',
    'materialChanged',
    'sceneBackgroundChanged',
    'sceneEnvironmentChanged',
    'sceneFogChanged',
    'sceneFogSettingsChanged',
    'viewportCameraChanged',
    'viewportShadingChanged',
    'windowResize',
    'showHelpersChanged',
    'cameraResetted',
    'morphTargetsUpdated',
    'pathTracerUpdated',
    'sceneRendered',
    'refreshSidebarObject3D',
    'intersectionsDetected',
  ] as const

  return Object.fromEntries(names.map((name) => [name, createSignal()])) as Record<
    (typeof names)[number],
    ReturnType<typeof createSignal>
  >
}

function createRenderer() {
  const domElement = document.createElement('canvas')
  return {
    domElement,
    isWebGLRenderer: false,
    xr: { isPresenting: false },
    autoClear: true,
    setAnimationLoop: jest.fn(),
    setClearColor: jest.fn(),
    getClearColor: jest.fn(),
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    dispose: jest.fn(),
    setScissorTest: jest.fn(),
    setViewport: jest.fn(),
    setScissor: jest.fn(),
    clear: jest.fn(),
    render: jest.fn(),
  }
}

function setupViewport() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  camera.name = 'editorCamera'

  const scene = new THREE.Scene()
  const sceneHelpers = new THREE.Scene()
  const signals = createSignals()
  const selector = {
    getPointerIntersects: jest.fn(() => []),
  }
  const editor = {
    selector,
    signals,
    camera,
    viewportCamera: camera,
    scene,
    sceneHelpers,
    cameras: { [camera.uuid]: camera },
    helpers: {},
    viewportColor: new THREE.Color(),
    viewportShading: 'solid',
    environmentType: 'None',
    mixer: { stats: { actions: { inUse: 0 } }, update: jest.fn() },
    selected: null,
  } as unknown as {
    selector: typeof selector
    signals: ReturnType<typeof createSignals>
    camera: THREE.PerspectiveCamera
    viewportCamera: THREE.Camera
    scene: THREE.Scene
    sceneHelpers: THREE.Scene
    cameras: Record<string, THREE.Camera>
    helpers: Record<string, { update: () => void; isSkeletonHelper?: boolean }>
    viewportColor: THREE.Color
    viewportShading: string
    environmentType: string
    mixer: { stats: { actions: { inUse: number } }; update: jest.Mock }
    selected: THREE.Object3D | null
    viewportStore: {
      dispatch(action: unknown): void
      getState(): { viewports: Array<{ id: string }>; activeViewportId: string }
    }
  }

  const panel = Viewport(editor)
  let width = 800
  let height = 600

  Object.defineProperty(panel.dom, 'offsetWidth', {
    configurable: true,
    get: () => width,
  })
  Object.defineProperty(panel.dom, 'offsetHeight', {
    configurable: true,
    get: () => height,
  })
  panel.dom.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {
        return {}
      },
    }) as DOMRect

  const renderer = createRenderer()
  signals.rendererCreated.dispatch(renderer)

  return {
    editor,
    panel,
    renderer,
    setSize(nextWidth: number, nextHeight: number) {
      width = nextWidth
      height = nextHeight
    },
  }
}

describe('Viewport.js multi-viewport integration', () => {
  it('scissor-renders each viewport and creates finite orthographic projections', () => {
    const { editor, renderer } = setupViewport()

    renderer.setScissor.mockClear()
    renderer.render.mockClear()

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })

    expect(renderer.setScissor).toHaveBeenCalledWith(0, 0, 400, 600)
    expect(renderer.setScissor).toHaveBeenCalledWith(400, 0, 400, 600)

    const secondarySceneRender = renderer.render.mock.calls.find(
      ([object, cam]) => object === editor.scene && cam !== editor.camera,
    )
    expect(secondarySceneRender).toBeTruthy()

    const topCamera = secondarySceneRender?.[1] as THREE.OrthographicCamera
    expect(topCamera.isOrthographicCamera).toBe(true)
    expect(topCamera.projectionMatrix.elements.every(Number.isFinite)).toBe(true)

    const secondaryOverlayRender = renderer.render.mock.calls.find(
      ([object, cam]) => object !== editor.scene && cam === topCamera,
    )
    expect(secondaryOverlayRender).toBeTruthy()
  })

  it('uses the current viewportCamera after viewportCameraChanged without helper draws', () => {
    const { editor, renderer } = setupViewport()
    const userCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)

    renderer.render.mockClear()
    editor.viewportCamera = userCamera
    editor.signals.viewportCameraChanged.dispatch()

    expect(renderer.render.mock.calls[0]).toEqual([editor.scene, userCamera])
    expect(
      renderer.render.mock.calls.some(([object]) => object === editor.sceneHelpers),
    ).toBe(false)
  })

  it('keeps controls and picking scoped to the perspective cell', () => {
    const { editor, renderer } = setupViewport()
    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })
    let scopedBounds: Pick<DOMRect, 'left' | 'width'> | null = null
    renderer.domElement.addEventListener('pointerdown', () => {
      scopedBounds = renderer.domElement.getBoundingClientRect()
    })

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 1,
    })
    expect(editor.viewportStore.getState().activeViewportId).toBe('vp-1-top')

    fireEvent.mouseDown(renderer.domElement, { clientX: 600, clientY: 300 })
    fireEvent.mouseUp(document, { clientX: 600, clientY: 300 })
    expect(editor.selector.getPointerIntersects).toHaveBeenCalledTimes(1)
    const topCall = (editor.selector.getPointerIntersects.mock.calls as unknown[][])[0]
    const topPointer = topCall[0] as THREE.Vector2
    const topCamera = topCall[1] as THREE.Camera
    expect(topPointer.x).toBeCloseTo(0.5)
    expect(topPointer.y).toBeCloseTo(0.5)
    expect(topCamera).not.toBe(editor.camera)
    expect(scopedBounds).toMatchObject({ left: 400, width: 400 })

    fireEvent.wheel(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      deltaY: 1,
    })

    expect(editor.camera.userData.controlPointerDowns).toBe(0)
    expect(editor.camera.userData.controlWheels).toBe(0)

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 200,
      clientY: 300,
      pointerId: 2,
    })
    expect(editor.camera.userData.controlPointerDowns).toBe(1)

    fireEvent.mouseDown(renderer.domElement, { clientX: 200, clientY: 300 })
    fireEvent.mouseUp(document, { clientX: 200, clientY: 300 })

    expect(editor.selector.getPointerIntersects).toHaveBeenCalledTimes(2)
    const pointer = (editor.selector.getPointerIntersects.mock.calls as unknown[][])[1][0] as THREE.Vector2
    const pointerCamera = (editor.selector.getPointerIntersects.mock.calls as unknown[][])[1][1] as THREE.Camera
    expect(pointer.x).toBeCloseTo(0.5)
    expect(pointer.y).toBeCloseTo(0.5)
    expect(pointerCamera).toBe(editor.camera)
  })

  it('raycasts actual scene geometry from a secondary top viewport', () => {
    const { editor, renderer } = setupViewport()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
    editor.scene.add(mesh)
    editor.scene.updateMatrixWorld(true)

    const raycaster = new THREE.Raycaster()
    const getPointerIntersects = editor.selector.getPointerIntersects as jest.Mock
    getPointerIntersects.mockImplementation((point: THREE.Vector2, camera: THREE.Camera) => {
      raycaster.setFromCamera(new THREE.Vector2(point.x * 2 - 1, -point.y * 2 + 1), camera)
      return raycaster.intersectObject(mesh, false)
    })

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })

    fireEvent.mouseDown(renderer.domElement, { clientX: 600, clientY: 300 })
    fireEvent.mouseUp(document, { clientX: 600, clientY: 300 })

    expect(editor.selector.getPointerIntersects).toHaveBeenCalledTimes(1)
    expect(editor.selector.getPointerIntersects.mock.results[0].value).toHaveLength(1)

    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  })

  it('supports zooming and panning orthographic viewports', () => {
    const { editor, renderer } = setupViewport()

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })
    const topSceneRender = renderer.render.mock.calls.find(
      ([object, cam]) => object === editor.scene && cam !== editor.camera,
    )
    const topCamera = topSceneRender?.[1] as THREE.OrthographicCamera
    const initialZoom = topCamera.zoom
    const initialPosition = topCamera.position.clone()

    fireEvent.wheel(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      deltaY: -1,
    })
    expect(topCamera.zoom).toBeGreaterThan(initialZoom)
    expect(editor.camera.userData.controlWheels).toBe(0)

    fireEvent.pointerDown(renderer.domElement, {
      button: 2,
      clientX: 600,
      clientY: 300,
      pointerId: 22,
    })
    fireEvent.pointerMove(renderer.domElement, {
      clientX: 640,
      clientY: 300,
      pointerId: 22,
    })
    fireEvent.pointerUp(renderer.domElement, {
      clientX: 640,
      clientY: 300,
      pointerId: 22,
    })

    expect(topCamera.position.equals(initialPosition)).toBe(false)
    expect(editor.camera.userData.controlPointerDowns).toBe(0)
  })

  it('enables orbit controls for a newly added perspective viewport', () => {
    const { editor, renderer } = setupViewport()

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'perspective' })

    const secondaryPerspectiveRender = renderer.render.mock.calls.find(
      ([object, cam]) => object === editor.scene && cam !== editor.camera,
    )
    const secondaryCamera = secondaryPerspectiveRender?.[1] as THREE.PerspectiveCamera
    expect(secondaryCamera.isPerspectiveCamera).toBe(true)

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 12,
    })

    expect(editor.camera.userData.controlPointerDowns).toBe(0)
    expect(secondaryCamera.userData.controlPointerDowns).toBe(1)
  })

  it('disables perspective viewport controls while the gumball is dragging', () => {
    const { editor, renderer } = setupViewport()

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'perspective' })
    const secondaryPerspectiveRender = renderer.render.mock.calls.find(
      ([object, cam]) => object === editor.scene && cam !== editor.camera,
    )
    const secondaryCamera = secondaryPerspectiveRender?.[1] as THREE.PerspectiveCamera

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 12,
    })
    expect(secondaryCamera.userData.controlPointerDowns).toBe(1)

    const transformControls = mockTransformControlsInstances.at(-1)!
    ;(transformControls as unknown as { object: THREE.Object3D }).object = new THREE.Object3D()
    transformControls.dispatchEvent({ type: 'mouseDown' })

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 13,
    })
    expect(secondaryCamera.userData.controlPointerDowns).toBe(1)

    transformControls.dispatchEvent({ type: 'mouseUp' })
    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 14,
    })
    expect(secondaryCamera.userData.controlPointerDowns).toBe(2)
  })

  it('syncs overlay geometry on resize and preserves one overlay after editorCleared', () => {
    const { editor, panel, renderer, setSize } = setupViewport()
    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })

    const firstChrome = panel.dom.querySelector('.viewport-chrome') as HTMLElement
    expect(firstChrome.style.width).toBe('400px')

    setSize(1000, 600)
    editor.signals.windowResize.dispatch()

    expect(renderer.setSize).toHaveBeenCalledWith(1000, 600)
    expect(firstChrome.style.width).toBe('500px')

    expect(panel.dom.querySelectorAll('.viewport-overlay')).toHaveLength(1)
    editor.signals.editorCleared.dispatch()
    expect(panel.dom.querySelectorAll('.viewport-overlay')).toHaveLength(1)
  })
})
