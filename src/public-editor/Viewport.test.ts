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

    focus() {}
  },
}))

jest.mock('three/addons/controls/TransformControls.js', () => {
  const actualThree = jest.requireActual<typeof import('three')>('three')

  return {
    TransformControls: class {
      object = undefined

      addEventListener() {}
      connect() {}
      detach() {}
      attach() {}
      setMode() {}
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

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })
    renderer.setScissor.mockClear()
    renderer.render.mockClear()

    editor.signals.cameraChanged.dispatch()

    expect(renderer.setScissor).toHaveBeenCalledWith(0, 0, 400, 600)
    expect(renderer.setScissor).toHaveBeenCalledWith(400, 0, 400, 600)

    const secondarySceneRender = renderer.render.mock.calls.find(
      ([object, cam]) => object === editor.scene && cam !== editor.camera,
    )
    expect(secondarySceneRender).toBeTruthy()

    const topCamera = secondarySceneRender?.[1] as THREE.OrthographicCamera
    expect(topCamera.isOrthographicCamera).toBe(true)
    expect(topCamera.projectionMatrix.elements.every(Number.isFinite)).toBe(true)
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

    fireEvent.pointerDown(renderer.domElement, {
      clientX: 600,
      clientY: 300,
      pointerId: 1,
    })
    expect(editor.viewportStore.getState().activeViewportId).toBe('vp-1-top')

    fireEvent.mouseDown(renderer.domElement, { clientX: 600, clientY: 300 })
    fireEvent.mouseUp(document, { clientX: 600, clientY: 300 })
    expect(editor.selector.getPointerIntersects).not.toHaveBeenCalled()

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

    const pointer = (editor.selector.getPointerIntersects.mock.calls as unknown[][])[0][0] as THREE.Vector2
    expect(pointer.x).toBeCloseTo(0.5)
    expect(pointer.y).toBeCloseTo(0.5)
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
