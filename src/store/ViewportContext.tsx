import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'

/* eslint-disable react-refresh/only-export-components -- module exports provider + hook */
import {
  viewportInitialState,
  viewportReducer,
  type ViewportAction,
  type ViewportState,
} from '@/store/viewport-reducer'

interface ViewportCtx {
  state: ViewportState
  dispatch: Dispatch<ViewportAction>
}

const ViewportContext = createContext<ViewportCtx | null>(null)

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewportReducer, viewportInitialState)

  return (
    <ViewportContext.Provider value={{ state, dispatch }}>
      {children}
    </ViewportContext.Provider>
  )
}

export function useViewportContext(): ViewportCtx {
  const ctx = useContext(ViewportContext)
  if (!ctx) {
    throw new Error(
      'useViewportContext must be used within a ViewportProvider',
    )
  }
  return ctx
}
