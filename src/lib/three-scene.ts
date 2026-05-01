import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import type { ViewportType } from '@/types/viewport'

function safeAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return 1
  }
  return aspect
}

export function createViewportCamera(
  type: ViewportType,
  aspect: number,
): THREE.PerspectiveCamera | THREE.OrthographicCamera {
  const a = safeAspect(aspect)

  if (type === 'perspective') {
    const cam = new THREE.PerspectiveCamera(45, a, 0.1, 100)
    cam.position.set(4.2, 3.2, 5.2)
    cam.lookAt(0, 0.65, 0)
    cam.updateProjectionMatrix()
    return cam
  }

  const frustumSize = 10
  const halfH = frustumSize / 2
  const halfW = halfH * a
  const cam = new THREE.OrthographicCamera(
    -halfW,
    halfW,
    halfH,
    -halfH,
    0.1,
    100,
  )

  if (type === 'top') {
    cam.position.set(0, 10, 0)
    cam.up.set(0, 0, -1)
    cam.lookAt(0, 0, 0)
  } else if (type === 'left') {
    cam.position.set(-10, 0, 0)
    cam.up.set(0, 1, 0)
    cam.lookAt(0, 0, 0)
  } else {
    cam.position.set(10, 0, 0)
    cam.up.set(0, 1, 0)
    cam.lookAt(0, 0, 0)
  }

  cam.updateProjectionMatrix()
  return cam
}

export function createViewportControls(
  camera: THREE.Camera,
  type: ViewportType,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.enabled = false

  if (type === 'perspective') {
    controls.target.set(0, 0.65, 0)
    controls.enableRotate = true
  } else {
    controls.target.set(0, 0, 0)
    controls.enableRotate = false
  }

  controls.update()
  return controls
}

export interface EditorSceneResult {
  scene: THREE.Scene
  objects: {
    cube: THREE.Mesh
    ghost: THREE.Mesh
  }
  dispose(): void
}

export function buildEditorScene(): EditorSceneResult {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#101820')

  const hemiLight = new THREE.HemisphereLight('#f8fafc', '#1e293b', 1.8)
  scene.add(hemiLight)

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.6)
  keyLight.position.set(3, 5, 4)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  scene.add(keyLight)

  const floorGeometry = new THREE.PlaneGeometry(10, 10)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: '#18212f',
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const cubeGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2)
  const cubeMaterial = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.4,
    metalness: 0.15,
  })
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
  cube.name = 'Editable Cube'
  cube.position.y = 0.68
  cube.castShadow = true
  scene.add(cube)

  const ghostGeometry = new THREE.SphereGeometry(0.38, 32, 18)
  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: '#bef264',
    roughness: 0.5,
    metalness: 0.05,
  })
  const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial)
  ghost.name = 'Presence Cursor'
  ghost.position.set(-1.55, 0.45, -0.9)
  ghost.castShadow = true
  scene.add(ghost)

  const grid = new THREE.GridHelper(10, 20, '#67e8f9', '#334155')
  scene.add(grid)

  const axes = new THREE.AxesHelper(1.6)
  axes.position.y = 0.02
  scene.add(axes)

  return {
    scene,
    objects: { cube, ghost },
    dispose() {
      floorGeometry.dispose()
      floorMaterial.dispose()
      cubeGeometry.dispose()
      cubeMaterial.dispose()
      ghostGeometry.dispose()
      ghostMaterial.dispose()
      grid.geometry.dispose()
      const gm = grid.material
      if (Array.isArray(gm)) {
        gm.forEach((m) => m.dispose())
      } else {
        gm.dispose()
      }
      axes.dispose()
    },
  }
}
