import * as THREE from 'three'

import {
  buildEditorScene,
  createViewportCamera,
  createViewportControls,
} from '@/lib/three-scene'

function direction(camera: THREE.Camera) {
  return camera.getWorldDirection(new THREE.Vector3()).normalize()
}

describe('createViewportCamera', () => {
  it.each([
    ['perspective', THREE.PerspectiveCamera, { x: 4.2, y: 3.2, z: 5.2 }],
    ['top', THREE.OrthographicCamera, { x: 0, y: 10, z: 0 }],
    ['left', THREE.OrthographicCamera, { x: -10, y: 0, z: 0 }],
    ['right', THREE.OrthographicCamera, { x: 10, y: 0, z: 0 }],
  ] as const)('%s uses expected class and position', (type, Cls, pos) => {
    const cam = createViewportCamera(type, 1.5)
    expect(cam).toBeInstanceOf(Cls)
    expect(cam.position.x).toBeCloseTo(pos.x, 5)
    expect(cam.position.y).toBeCloseTo(pos.y, 5)
    expect(cam.position.z).toBeCloseTo(pos.z, 5)
  })

  it('falls back to aspect 1 for bad aspects', () => {
    const cam = createViewportCamera('perspective', NaN)
    expect(cam).toBeInstanceOf(THREE.PerspectiveCamera)
    expect((cam as THREE.PerspectiveCamera).aspect).toBe(1)
  })

  it('perspective camera looks toward the editor target', () => {
    const cam = createViewportCamera('perspective', 1)
    const expected = new THREE.Vector3(0, 0.65, 0)
      .sub(cam.position)
      .normalize()

    expect(direction(cam).dot(expected)).toBeCloseTo(1, 5)
  })

  it('orthographic cameras point down and from opposite sides', () => {
    const top = createViewportCamera('top', 1)
    const left = createViewportCamera('left', 1)
    const right = createViewportCamera('right', 1)

    expect(direction(top).dot(new THREE.Vector3(0, -1, 0))).toBeCloseTo(1, 5)
    expect(direction(left).dot(new THREE.Vector3(1, 0, 0))).toBeCloseTo(1, 5)
    expect(direction(right).dot(new THREE.Vector3(-1, 0, 0))).toBeCloseTo(1, 5)
    expect(direction(left).dot(direction(right))).toBeCloseTo(-1, 5)
  })
})

describe('createViewportControls', () => {
  it('starts disabled, uses damping; ortho types disable rotation', () => {
    const div = document.createElement('div')
    const cam = createViewportCamera('perspective', 1)
    const c = createViewportControls(cam, 'perspective', div)
    expect(c.enableDamping).toBe(true)
    expect(c.enabled).toBe(false)
    expect(c.enableRotate).toBe(true)
    c.dispose()
  })

  it.each(['top', 'left', 'right'] as const)('%s disables rotation', (type) => {
    const div = document.createElement('div')
    const cam = createViewportCamera(type, 1)
    const c = createViewportControls(cam, type, div)
    expect(c.enableRotate).toBe(false)
    expect(c.enabled).toBe(false)
    c.dispose()
  })
})

describe('buildEditorScene', () => {
  it('exposes named cube and ghost and disposes cleanly', () => {
    const ed = buildEditorScene()
    const cube = ed.scene.getObjectByName('Editable Cube')
    const ghost = ed.scene.getObjectByName('Presence Cursor')
    expect(cube).toBe(ed.objects.cube)
    expect(ghost).toBe(ed.objects.ghost)
    expect(() => ed.dispose()).not.toThrow()
  })
})
