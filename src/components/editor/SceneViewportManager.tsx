import { Button } from '@/components/ui/button'
import { deriveViewportLabel } from '@/lib/viewport-grid'
import { useViewportContext } from '@/store/ViewportContext'
import type { ViewportType } from '@/types/viewport'

const ADD_TYPES: { type: ViewportType; label: string }[] = [
  { type: 'perspective', label: 'Perspective' },
  { type: 'top', label: 'Top' },
  { type: 'left', label: 'Left' },
  { type: 'right', label: 'Right' },
]

export function SceneViewportManager() {
  const { state, dispatch } = useViewportContext()
  const multi = state.viewports.length > 1

  return (
    <section className="space-y-3" data-testid="scene-viewport-manager">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Viewports
      </h3>
      <ul className="space-y-1">
        {state.viewports.map((vp) => (
          <li
            key={vp.id}
            className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <span className="min-w-0 truncate">
              {deriveViewportLabel(vp, state.viewports)}
            </span>
            {multi ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  dispatch({ type: 'REMOVE_VIEWPORT', id: vp.id })
                }
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {ADD_TYPES.map(({ type, label }) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => dispatch({ type: 'ADD_VIEWPORT', viewportType: type })}
          >
            + {label}
          </Button>
        ))}
      </div>
    </section>
  )
}
