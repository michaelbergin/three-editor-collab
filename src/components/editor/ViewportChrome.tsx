import type { ViewportRect } from '@/types/viewport'

export interface ViewportChromeProps {
  viewportId: string
  label: string
  isActive: boolean
  canClose: boolean
  rect: ViewportRect
  onClose(): void
  onActivate(): void
}

export function ViewportChrome({
  viewportId,
  label,
  isActive,
  canClose,
  rect,
  onClose,
  onActivate,
}: ViewportChromeProps) {
  return (
    <div
      className={`absolute flex flex-col gap-1 border ${
        isActive
          ? 'border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
          : 'border-white/10'
      }`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
      data-viewport-id={viewportId}
      data-active={isActive ? 'true' : 'false'}
      data-testid={`viewport-chrome-${viewportId}`}
      tabIndex={0}
      onPointerDown={(e) => {
        e.stopPropagation()
        onActivate()
      }}
      onFocus={() => {
        onActivate()
      }}
    >
      <div className="pointer-events-auto flex shrink-0 items-start justify-between gap-2 p-1.5">
        <span className="select-none text-xs font-medium text-white drop-shadow">
          {label}
        </span>
        {canClose ? (
          <button
            type="button"
            className="pointer-events-auto flex size-6 shrink-0 items-center justify-center rounded bg-black/50 text-sm leading-none text-white hover:bg-black/70"
            aria-label={`Close ${label}`}
            onPointerDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  )
}
