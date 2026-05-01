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

  it('bootstraps the command palette in the editor runtime', () => {
    const editorIndex = readFileSync(join('public', 'editor', 'index.html'), 'utf8')

    expect(editorIndex).toContain("import { CommandPalette } from './js/CommandPalette.js';")
    expect(editorIndex).toContain('const commandPalette = new CommandPalette( editor );')
    expect(editorIndex).toContain('document.body.appendChild( commandPalette.dom );')
  })

  it('removes the Add menu from the top-level menubar', () => {
    const menubar = readFileSync(join('public', 'editor', 'js', 'Menubar.js'), 'utf8')

    expect(menubar).not.toContain('MenubarAdd')
    expect(menubar).not.toContain('./Menubar.Add.js')
  })

  it('exposes default command groups in the main palette', () => {
    const commandPalette = readFileSync(
      join('public', 'editor', 'js', 'CommandPalette.js'),
      'utf8',
    )

    expect(commandPalette).toContain("id: 'menu.transform'")
    expect(commandPalette).toContain("submenu: 'transform'")
    expect(commandPalette).toContain("id: 'menu.add'")
    expect(commandPalette).toContain("submenu: 'add'")
    expect(commandPalette).toContain('openTransformMenu')
    expect(commandPalette).toContain('openAddMenu')
    expect(commandPalette).toContain('this.openAddMenu()')
    expect(commandPalette).not.toContain('...ADD_COMMANDS')
  })

  it('shows the command dock instead of a transform-only toolbar', () => {
    const toolbar = readFileSync(join('public', 'editor', 'js', 'Toolbar.js'), 'utf8')

    expect(toolbar).toContain("createToolbarButton( 'command'")
    expect(toolbar).toContain("createToolbarButton( 'move3d'")
    expect(toolbar).toContain("createToolbarButton( 'circlePlus'")
    expect(toolbar).toContain("createToolbarButton( 'keyboard'")
    expect(toolbar).toContain('commandPalette.openMainMenu()')
    expect(toolbar).toContain('commandPalette.openAddMenu()')
    expect(toolbar).toContain('showKeyboardShortcuts( editor )')
    expect(toolbar).not.toContain('images/translate.svg')
    expect(toolbar).not.toContain('images/rotate.svg')
    expect(toolbar).not.toContain('images/scale.svg')
  })

  it('registers every migrated Add command for the palette', () => {
    const addCommands = readFileSync(
      join('public', 'editor', 'js', 'AddCommands.js'),
      'utf8',
    )
    const expectedCommandIds = [
      'add.group',
      'add.mesh.box',
      'add.mesh.capsule',
      'add.mesh.circle',
      'add.mesh.cylinder',
      'add.mesh.dodecahedron',
      'add.mesh.icosahedron',
      'add.mesh.lathe',
      'add.mesh.octahedron',
      'add.mesh.plane',
      'add.mesh.ring',
      'add.mesh.sphere',
      'add.mesh.sprite',
      'add.mesh.tetrahedron',
      'add.mesh.text',
      'add.mesh.torus',
      'add.mesh.torusknot',
      'add.mesh.tube',
      'add.light.ambient',
      'add.light.directional',
      'add.light.hemisphere',
      'add.light.point',
      'add.light.spot',
      'add.camera.orthographic',
      'add.camera.perspective',
    ]

    for (const commandId of expectedCommandIds) {
      expect(addCommands).toContain(`'${commandId}'`)
    }

    expect(addCommands).toContain("'cube'")
    expect(addCommands).toContain('helvetiker_bold.typeface.json')
  })
})
