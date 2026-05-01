import { render, screen } from '@testing-library/react'

import App from './App'

jest.mock('@/components/editor/ThreeViewport', () => ({
  ThreeViewport: () => <div data-testid="three-viewport" />,
}))

describe('App', () => {
  it('renders the editor shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /three editor/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('three-viewport')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save scene/i })).toBeInTheDocument()
  })
})
