import { fireEvent, render, screen } from '@testing-library/react'

import { ViewportChrome } from '@/components/editor/ViewportChrome'

describe('ViewportChrome', () => {
  const rect = { id: 'v1', x: 0, y: 0, width: 400, height: 300 }

  it('renders label and data-viewport-id', () => {
    render(
      <ViewportChrome
        viewportId="vp-a"
        label="Perspective"
        isActive={false}
        canClose={false}
        rect={rect}
        onClose={() => {}}
        onActivate={() => {}}
      />,
    )
    expect(screen.getByText('Perspective')).toBeInTheDocument()
    expect(screen.getByTestId('viewport-chrome-vp-a')).toHaveAttribute(
      'data-viewport-id',
      'vp-a',
    )
  })

  it('exposes active state', () => {
    render(
      <ViewportChrome
        viewportId="vp-a"
        label="Top"
        isActive
        canClose={false}
        rect={rect}
        onClose={() => {}}
        onActivate={() => {}}
      />,
    )
    expect(screen.getByTestId('viewport-chrome-vp-a')).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('close button only when canClose', () => {
    const { rerender } = render(
      <ViewportChrome
        viewportId="vp-a"
        label="A"
        isActive={false}
        canClose={false}
        rect={rect}
        onClose={() => {}}
        onActivate={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
    rerender(
      <ViewportChrome
        viewportId="vp-a"
        label="A"
        isActive={false}
        canClose
        rect={rect}
        onClose={() => {}}
        onActivate={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('close calls onClose once not onActivate', () => {
    const onClose = jest.fn()
    const onActivate = jest.fn()
    render(
      <ViewportChrome
        viewportId="vp-a"
        label="A"
        isActive={false}
        canClose
        rect={rect}
        onClose={onClose}
        onActivate={onActivate}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onActivate).not.toHaveBeenCalled()
  })
})
