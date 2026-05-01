import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SceneViewportManager } from '@/components/editor/SceneViewportManager'
import { ViewportProvider } from '@/store/ViewportContext'
import { useViewportContext } from '@/store/ViewportContext'

function renderManager() {
  return render(
    <ViewportProvider>
      <SceneViewportManager />
    </ViewportProvider>,
  )
}

function Bad() {
  useViewportContext()
  return null
}

describe('SceneViewportManager', () => {
  it('initially shows one Perspective row', () => {
    renderManager()
    const list = screen.getByTestId('scene-viewport-manager')
    expect(within(list).getByText('Perspective')).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: /^Remove$/ })).toBeNull()
  })

  it('add Top adds Top row', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: /\+ Top/i }))
    expect(screen.getByTestId('scene-viewport-manager')).toHaveTextContent('Top')
  })

  it('add duplicate Perspective shows numbered labels', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: /\+ Perspective/i }))
    const mgr = screen.getByTestId('scene-viewport-manager')
    expect(mgr).toHaveTextContent('Perspective 1')
    expect(mgr).toHaveTextContent('Perspective 2')
  })

  it('remove works with two viewports', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: /\+ Top/i }))
    const removeButtons = screen.getAllByRole('button', { name: /^Remove$/ })
    expect(removeButtons.length).toBe(2)
    await user.click(removeButtons[0])
    expect(screen.queryAllByRole('button', { name: /^Remove$/ })).toHaveLength(0)
  })
})

describe('useViewportContext', () => {
  it('throws outside ViewportProvider', () => {
    expect(() => render(<Bad />)).toThrow(/ViewportProvider/)
  })
})
