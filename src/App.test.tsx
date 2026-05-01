import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('three.js editor entrypoints', () => {
  it('uses the official editor as the main app baseline', () => {
    const rootIndex = readFileSync(join('index.html'), 'utf8')
    const editorIndex = readFileSync(join('public', 'editor', 'index.html'), 'utf8')

    expect(rootIndex).toContain('/editor/index.html')
    expect(editorIndex).toContain('<title>three.js editor</title>')
    expect(editorIndex).toContain("import { Editor } from './js/Editor.js';")
    expect(editorIndex).toContain('"three": "../build/three.module.js"')
    expect(editorIndex).toContain(
      '"three-gpu-pathtracer": "../vendor/three-gpu-pathtracer/index.module.js"',
    )
  })
})
