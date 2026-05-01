import { copyFile, cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const paths = {
  threeBuild: resolve(root, 'node_modules/three/build'),
  threeExamplesFonts: resolve(root, 'node_modules/three/examples/fonts'),
  threeExamplesJsm: resolve(root, 'node_modules/three/examples/jsm'),
  pathtracer: resolve(
    root,
    'node_modules/three-gpu-pathtracer/build/index.module.js',
  ),
  meshBvh: resolve(root, 'node_modules/three-mesh-bvh/build/index.module.js'),
  publicBuild: resolve(root, 'public/build'),
  publicExamplesFonts: resolve(root, 'public/examples/fonts'),
  publicExamplesJsm: resolve(root, 'public/examples/jsm'),
  publicPathtracer: resolve(
    root,
    'public/vendor/three-gpu-pathtracer/index.module.js',
  ),
  publicMeshBvh: resolve(root, 'public/vendor/three-mesh-bvh/index.module.js'),
}

async function replaceDirectory(source, destination) {
  await rm(destination, { force: true, recursive: true })
  await mkdir(dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true })
}

await Promise.all([
  replaceDirectory(paths.threeBuild, paths.publicBuild),
  replaceDirectory(paths.threeExamplesFonts, paths.publicExamplesFonts),
  replaceDirectory(paths.threeExamplesJsm, paths.publicExamplesJsm),
])

await Promise.all([
  mkdir(dirname(paths.publicPathtracer), { recursive: true }),
  mkdir(dirname(paths.publicMeshBvh), { recursive: true }),
])

await Promise.all([
  copyFile(paths.pathtracer, paths.publicPathtracer),
  copyFile(paths.meshBvh, paths.publicMeshBvh),
])
