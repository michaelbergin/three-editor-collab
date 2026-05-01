import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'

import App from '@/App'

describe('React app root entrypoint', () => {
  it('mounts the React app from root index.html without redirecting to the official editor', () => {
    const rootIndex = readFileSync(join('index.html'), 'utf8')

    expect(rootIndex).toContain('/src/main.tsx')
    expect(rootIndex).toContain('<div id="root"></div>')
    expect(rootIndex).not.toContain('http-equiv="refresh"')
    expect(rootIndex).not.toContain('/editor/index.html')
    expect(rootIndex).not.toContain('window.location.replace')
    expect(rootIndex).toContain('three-editor-collab')
  })

  it('keeps public/editor/index.html as the official three.js editor route', () => {
    const editorIndex = readFileSync(join('public', 'editor', 'index.html'), 'utf8')

    expect(editorIndex).toContain('<title>three.js editor</title>')
    expect(editorIndex).toContain("import { Editor } from './js/Editor.js';")
    expect(editorIndex).toContain('"three": "../build/three.module.js"')
    expect(editorIndex).toContain(
      '"three-gpu-pathtracer": "../vendor/three-gpu-pathtracer/index.module.js"',
    )
  })

  it('renders App with viewport manager and initial Perspective viewport chrome', () => {
    render(<App />)

    expect(screen.getByTestId('scene-viewport-manager')).toBeInTheDocument()
    expect(screen.getByTestId('viewport-chrome-vp-1-perspective')).toBeInTheDocument()
    expect(screen.getAllByText('Perspective').length).toBeGreaterThanOrEqual(1)
  })
})
