export type ViewportType = 'perspective' | 'top' | 'left' | 'right'

export interface ViewportConfig {
  id: string
  type: ViewportType
  typeIndex: number
}

export interface ViewportRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface ViewportResizeHandleRect {
  id: string
  direction: 'vertical' | 'horizontal'
  dividerIndex: number
  x: number
  y: number
  width: number
  height: number
}
