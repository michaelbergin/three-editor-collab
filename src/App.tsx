import {
  Box,
  CircleDot,
  Code2,
  Cuboid,
  FolderTree,
  GitBranch,
  MousePointer2,
  Move3D,
  PanelsTopLeft,
  Rotate3D,
  Save,
  Scale3D,
  Settings2,
  UsersRound,
} from 'lucide-react'

import { ThreeViewport } from '@/components/editor/ThreeViewport'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const sceneObjects = [
  { name: 'Scene Root', type: 'Group', active: false },
  { name: 'Editable Cube', type: 'Mesh', active: true },
  { name: 'Presence Cursor', type: 'Mesh', active: false },
  { name: 'Key Light', type: 'Light', active: false },
  { name: 'Main Camera', type: 'Camera', active: false },
]

const collaborators = [
  { name: 'MB', label: 'Michael', color: 'bg-cyan-400' },
  { name: 'AI', label: 'Codex', color: 'bg-lime-300' },
]

const transformFields = [
  { label: 'X', value: '0.00' },
  { label: 'Y', value: '0.68' },
  { label: 'Z', value: '0.00' },
]

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Cuboid className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">three-editor-collab</p>
              <p className="text-xs text-muted-foreground">main.scene</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Scene
              </h2>
              <Button variant="ghost" size="icon-sm" aria-label="Scene settings">
                <Settings2 aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-1">
              {sceneObjects.map((object) => (
                <button
                  key={object.name}
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[active=true]:bg-secondary data-[active=true]:text-foreground"
                  data-active={object.active}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FolderTree className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{object.name}</span>
                  </span>
                  <span className="text-xs">{object.type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <UsersRound className="size-3.5" aria-hidden="true" />
              Presence
            </div>
            <div className="flex gap-2">
              {collaborators.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                  title={person.label}
                >
                  <span className={`size-2 rounded-full ${person.color}`} />
                  <span className="text-xs font-medium">{person.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b bg-background px-3 lg:px-4">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Cuboid className="size-4" aria-hidden="true" />
              </div>
              <h1 className="truncate text-sm font-semibold">Three Editor</h1>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Badge variant="success">
                <CircleDot aria-hidden="true" />
                Live
              </Badge>
              <Badge variant="outline">
                <GitBranch aria-hidden="true" />
                local
              </Badge>
            </div>

            <div
              className="flex items-center gap-1 rounded-md border bg-card p-1"
              aria-label="Editor tools"
            >
              <Button
                variant="toolbar"
                size="icon-sm"
                data-active="true"
                aria-label="Select"
              >
                <MousePointer2 aria-hidden="true" />
              </Button>
              <Button variant="toolbar" size="icon-sm" aria-label="Move">
                <Move3D aria-hidden="true" />
              </Button>
              <Button variant="toolbar" size="icon-sm" aria-label="Rotate">
                <Rotate3D aria-hidden="true" />
              </Button>
              <Button variant="toolbar" size="icon-sm" aria-label="Scale">
                <Scale3D aria-hidden="true" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <Code2 aria-hidden="true" />
                Sync
              </Button>
              <Button size="sm" aria-label="Save scene">
                <Save aria-hidden="true" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-h-[520px] xl:min-h-0">
              <ThreeViewport />
            </section>

            <aside className="hidden border-l bg-card xl:flex xl:flex-col">
              <div className="flex h-14 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2">
                  <PanelsTopLeft className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Inspector</h2>
                </div>
                <Badge variant="secondary">Mesh</Badge>
              </div>

              <div className="flex-1 space-y-5 overflow-auto p-4">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Transform
                    </h3>
                    <Box className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {transformFields.map((field) => (
                      <label key={field.label} className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {field.label}
                        </span>
                        <Input value={field.value} readOnly aria-label={`${field.label} position`} />
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                    Material
                  </h3>
                  <div className="space-y-2 rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Surface</span>
                      <span className="font-medium">MeshStandardMaterial</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Color</span>
                      <span className="flex items-center gap-2 font-medium">
                        <span className="size-3 rounded-full bg-sky-400" />
                        #38bdf8
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Roughness</span>
                      <span className="font-medium">0.40</span>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
