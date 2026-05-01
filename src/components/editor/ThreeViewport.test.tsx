import * as THREE from 'three'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ThreeViewport } from '@/components/editor/ThreeViewport'
import { useViewportContext, ViewportProvider } from '@/store/ViewportContext'
import {
  clearOrbitMockInstances,
  orbitMockInstances,
} from '@/test/orbit-controls-mock'

interface MockRenderer {
  domElement: HTMLCanvasElement
  setPixelRatio: jest.Mock
  setSize: jest.Mock
  setScissorTest: jest.Mock
  setViewport: jest.Mock
  setScissor: jest.Mock
  clear: jest.Mock
  render: jest.Mock
  dispose: jest.Mock
  shadowMap: { enabled: boolean; type: number }
}

const mockRendererInstances: MockRenderer[] = []

jest.mock('three', () => {
  const actual = jest.requireActual<typeof import('three')>('three')

  return {
    ...actual,
    WebGLRenderer: jest.fn(() => {
      const renderer: MockRenderer = {
        domElement: document.createElement('canvas'),
        setPixelRatio: jest.fn(),
        setSize: jest.fn(),
        setScissorTest: jest.fn(),
        setViewport: jest.fn(),
        setScissor: jest.fn(),
        clear: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn(),
        shadowMap: { enabled: false, type: 0 },
      }
      mockRendererInstances.push(renderer)
      return renderer
    }),
  }
})

interface LayoutBox {
  width: number
  height: number
  left: number
  top: number
}

function AddViewportButtons() {
  const { dispatch } = useViewportContext()

  return (
    <div>
      <button
        type="button"
        onClick={() => dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })}
      >
        Add Top Test
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: 'ADD_VIEWPORT', viewportType: 'perspective' })
        }
      >
        Add Perspective Test
      </button>
    </div>
  )
}

function renderViewport() {
  const view = render(
    <ViewportProvider>
      <AddViewportButtons />
      <div style={{ width: 800, height: 600 }}>
        <ThreeViewport />
      </div>
    </ViewportProvider>,
  )
  const host = screen.getByTestId('three-viewport')
  const layout: LayoutBox = { width: 800, height: 600, left: 0, top: 0 }

  jest.spyOn(host, 'clientWidth', 'get').mockImplementation(() => layout.width)
  jest.spyOn(host, 'clientHeight', 'get').mockImplementation(() => layout.height)
  jest.spyOn(host, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        right: layout.left + layout.width,
        bottom: layout.top + layout.height,
        x: layout.left,
        y: layout.top,
        toJSON: () => {},
      }) as DOMRect,
  )

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })

  return { ...view, host, layout }
}

let frameQueue: FrameRequestCallback[] = []
let frameId = 0

function flushFrames(count = 1) {
  act(() => {
    for (let i = 0; i < count; i++) {
      const cb = frameQueue.shift()
      if (!cb) {
        return
      }
      cb(100 + i)
    }
  })
}

function flushUntilRender(renderer: MockRenderer, count: number) {
  for (let i = 0; i < 8 && renderer.render.mock.calls.length < count; i++) {
    flushFrames()
  }
}

function currentRenderer(): MockRenderer {
  const renderer = mockRendererInstances.at(-1)
  if (!renderer) {
    throw new Error('expected mocked WebGLRenderer')
  }
  return renderer
}

function canvas(host: HTMLElement): HTMLCanvasElement {
  const el = host.querySelector('canvas')
  if (!el) {
    throw new Error('expected renderer canvas')
  }
  return el
}

describe('ThreeViewport', () => {
  let getContextSpy: jest.SpyInstance
  let requestFrameSpy: jest.SpyInstance
  let cancelFrameSpy: jest.SpyInstance

  beforeEach(() => {
    mockRendererInstances.length = 0
    clearOrbitMockInstances()
    frameQueue = []
    frameId = 0
    getContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as RenderingContext)
    requestFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frameQueue.push(cb)
        frameId += 1
        return frameId
      })
    cancelFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id: number) => {
        void id
      })
  })

  afterEach(() => {
    getContextSpy.mockRestore()
    requestFrameSpy.mockRestore()
    cancelFrameSpy.mockRestore()
    clearOrbitMockInstances()
  })

  it('renders initial Perspective viewport chrome with no close button or transform UI', () => {
    renderViewport()

    expect(screen.getByTestId('viewport-chrome-vp-1-perspective')).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
    expect(screen.queryByText(/gumball/i)).toBeNull()
    expect(screen.queryByText(/transform controls/i)).toBeNull()
  })

  it('adds, removes, and re-adds viewports without stale chrome', async () => {
    const user = userEvent.setup()
    renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    expect(screen.getByTestId('viewport-chrome-vp-1-top')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /close/i })).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /close top/i }))
    expect(screen.queryByTestId('viewport-chrome-vp-1-top')).toBeNull()
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    expect(screen.getByTestId('viewport-chrome-vp-2-top')).toBeInTheDocument()
    expect(screen.queryByTestId('viewport-chrome-vp-1-top')).toBeNull()
  })

  it('canvas click and keyboard focus switch the active viewport', async () => {
    const user = userEvent.setup()
    const { host } = renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    fireEvent.click(canvas(host), {
      clientX: 600,
      clientY: 300,
      bubbles: true,
    })

    expect(screen.getByTestId('viewport-chrome-vp-1-top')).toHaveAttribute(
      'data-active',
      'true',
    )

    fireEvent.focus(screen.getByTestId('viewport-chrome-vp-1-perspective'))
    expect(screen.getByTestId('viewport-chrome-vp-1-perspective')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('clicking outside viewport regions leaves active viewport unchanged', async () => {
    const user = userEvent.setup()
    const { host } = renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    const el = canvas(host)
    fireEvent.click(el, {
      clientX: 600,
      clientY: 300,
      bubbles: true,
    })
    expect(screen.getByTestId('viewport-chrome-vp-1-top')).toHaveAttribute(
      'data-active',
      'true',
    )

    fireEvent.click(el, {
      clientX: 900,
      clientY: 300,
      bubbles: true,
    })
    expect(screen.getByTestId('viewport-chrome-vp-1-top')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('renders the shared scene through scissored viewport regions', async () => {
    const user = userEvent.setup()
    renderViewport()
    const renderer = currentRenderer()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    renderer.render.mockClear()
    renderer.setScissor.mockClear()

    flushUntilRender(renderer, 2)

    expect(renderer.setScissorTest).toHaveBeenCalledWith(true)
    expect(renderer.render).toHaveBeenCalledTimes(2)
    expect(renderer.setScissor.mock.calls).toEqual([
      [0, 0, 400, 600],
      [400, 0, 400, 600],
    ])
    expect(renderer.render.mock.calls[0][0]).toBe(renderer.render.mock.calls[1][0])
  })

  it('observes direct shared-scene mutations in every viewport render', async () => {
    const user = userEvent.setup()
    renderViewport()
    const renderer = currentRenderer()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    const sharedScene = renderer.render.mock.calls[0][0] as THREE.Scene
    const cube = sharedScene.getObjectByName('Editable Cube')
    expect(cube).toBeTruthy()
    cube!.position.x = 2.5

    renderer.render.mockClear()
    flushUntilRender(renderer, 2)

    expect(renderer.render).toHaveBeenCalledTimes(2)
    for (const [scene] of renderer.render.mock.calls) {
      expect(scene).toBe(sharedScene)
      expect(
        (scene as THREE.Scene).getObjectByName('Editable Cube')?.position.x,
      ).toBe(2.5)
    }
  })

  it('routes pointer and wheel interactions only to the viewport under the event', async () => {
    const user = userEvent.setup()
    const { host } = renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    expect(orbitMockInstances).toHaveLength(2)
    const [perspective, top] = orbitMockInstances
    const el = canvas(host)

    fireEvent.pointerDown(el, {
      clientX: 600,
      clientY: 300,
      pointerId: 1,
      bubbles: true,
    })

    expect(perspective.pointerDownEvents).toBe(0)
    expect(top.pointerDownEvents).toBe(1)
    expect(perspective.enabled).toBe(false)
    expect(top.enabled).toBe(true)

    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: 600,
        clientY: 300,
        pointerId: 1,
        bubbles: true,
      }),
    )
    expect(orbitMockInstances.every((control) => !control.enabled)).toBe(true)

    fireEvent.wheel(el, {
      clientX: 600,
      clientY: 300,
      deltaY: -120,
      bubbles: true,
    })

    expect(perspective.wheelEvents).toBe(0)
    expect(top.wheelEvents).toBe(1)
    expect(perspective.enabled).toBe(false)
    expect(top.enabled).toBe(true)
  })

  it('updates camera projections on layout and container resize', async () => {
    const user = userEvent.setup()
    const { layout } = renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    const renderer = currentRenderer()
    const firstFrameCameras = renderer.render.mock.calls
      .slice(-2)
      .map((call) => call[1])
    const perspectiveCamera = firstFrameCameras.find(
      (camera) => camera instanceof THREE.PerspectiveCamera,
    ) as THREE.PerspectiveCamera

    expect(perspectiveCamera.aspect).toBeCloseTo(400 / 600, 6)

    layout.width = 1000
    layout.height = 500
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    renderer.render.mockClear()
    flushUntilRender(renderer, 2)

    expect(renderer.render).toHaveBeenCalledTimes(2)
    expect(perspectiveCamera.aspect).toBeCloseTo(500 / 500, 6)
  })

  it('updates camera projection after dragging a resize handle', async () => {
    const user = userEvent.setup()
    renderViewport()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()

    const renderer = currentRenderer()
    const initialCameras = renderer.render.mock.calls
      .slice(-2)
      .map((call) => call[1])
    const perspectiveCamera = initialCameras.find(
      (camera) => camera instanceof THREE.PerspectiveCamera,
    ) as THREE.PerspectiveCamera
    expect(perspectiveCamera.aspect).toBeCloseTo(400 / 600, 6)

    const handle = screen.getByTestId('resize-handle-v-0-0')
    fireEvent.pointerDown(handle, {
      clientX: 400,
      pointerId: 8,
      bubbles: true,
    })
    act(() => {
      document.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 200,
          clientY: 300,
          pointerId: 8,
          bubbles: true,
        }),
      )
    })

    renderer.render.mockClear()
    flushUntilRender(renderer, 2)

    expect(renderer.render).toHaveBeenCalledTimes(2)
    expect(perspectiveCamera.aspect).toBeCloseTo(200 / 600, 6)
  })

  it('closing a viewport reflows back to one rendered region', async () => {
    const user = userEvent.setup()
    renderViewport()
    const renderer = currentRenderer()

    await user.click(screen.getByRole('button', { name: /add top test/i }))
    flushFrames()
    await user.click(screen.getByRole('button', { name: /close top/i }))

    renderer.render.mockClear()
    renderer.setScissor.mockClear()
    flushUntilRender(renderer, 1)

    expect(renderer.render).toHaveBeenCalledTimes(1)
    expect(renderer.setScissor.mock.calls.at(-1)).toEqual([0, 0, 800, 600])
  })
})
