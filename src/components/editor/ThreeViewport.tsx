import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
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

export function ThreeViewport() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<ViewportStatus>(() => {
    if (typeof document === 'undefined') {
      return 'booting'
    }

    return canCreateWebGLContext() ? 'booting' : 'webgl-unavailable'
  })
  const webglUnavailableAtBoot = status === 'webgl-unavailable'

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    if (webglUnavailableAtBoot) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#101820')

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(4.2, 3.2, 5.2)

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      window.setTimeout(() => setStatus('webgl-unavailable'), 0)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'h-full w-full'
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 0.65, 0)

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

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)

      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    resizeObserver?.observe(host)
    window.addEventListener('resize', resize)
    resize()

    let animationFrame = 0
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()

      cube.rotation.y = elapsed * 0.38
      ghost.position.y = 0.45 + Math.sin(elapsed * 1.8) * 0.08
      controls.update()
      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(animate)
    }

    animate()
    const readyFrame = window.requestAnimationFrame(() => setStatus('ready'))

    return () => {
      window.cancelAnimationFrame(readyFrame)
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      resizeObserver?.disconnect()
      controls.dispose()
      renderer.dispose()

      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement)
      }

      floorGeometry.dispose()
      floorMaterial.dispose()
      cubeGeometry.dispose()
      cubeMaterial.dispose()
      ghostGeometry.dispose()
      ghostMaterial.dispose()
    }
  }, [webglUnavailableAtBoot])

  return (
    <section className="relative h-full min-h-[420px] overflow-hidden bg-[#101820]">
      <div ref={hostRef} data-testid="three-viewport" className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur">
        <span className="size-2 rounded-full bg-emerald-300" />
        {status === 'ready' ? 'Viewport' : 'WebGL offline'}
      </div>
      {status === 'webgl-unavailable' ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/80">
          WebGL is unavailable in this environment.
        </div>
      ) : null}
    </section>
  )
}
