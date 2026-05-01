/** Jest stub — real OrbitControls is ESM; tests use this implementation */
export const orbitMockInstances: OrbitControls[] = []

export class OrbitControls {
  enableDamping = true
  enabled = false
  enableRotate = true
  pointerDownEvents = 0
  wheelEvents = 0
  updateCount = 0
  target = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.target.x = x
      this.target.y = y
      this.target.z = z
    },
    copy: (value: { x: number; y: number; z: number }) => {
      this.target.x = value.x
      this.target.y = value.y
      this.target.z = value.z
    },
  }

  private readonly camera: { userData?: Record<string, unknown> }
  private readonly domElement: HTMLElement
  private readonly onPointerDown = () => {
    if (!this.enabled) {
      return
    }
    this.pointerDownEvents += 1
    this.camera.userData = {
      ...this.camera.userData,
      mockPointerDownEvents: this.pointerDownEvents,
    }
  }
  private readonly onWheel = () => {
    if (!this.enabled) {
      return
    }
    this.wheelEvents += 1
    this.camera.userData = {
      ...this.camera.userData,
      mockWheelEvents: this.wheelEvents,
    }
  }

  constructor(camera: { userData?: Record<string, unknown> }, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('wheel', this.onWheel)
    orbitMockInstances.push(this)
  }

  update(): void {
    this.updateCount += 1
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('wheel', this.onWheel)
    const i = orbitMockInstances.indexOf(this)
    if (i >= 0) {
      orbitMockInstances.splice(i, 1)
    }
  }
}

export function clearOrbitMockInstances(): void {
  orbitMockInstances.length = 0
}
