import React from 'react'
import { render, screen } from '@testing-library/react'
import { Loading } from '@/components/ui/loading'

describe('Loading', () => {
  it('renders with default size', () => {
    render(<Loading />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('h-8 w-8')
  })

  it('renders with small size', () => {
    render(<Loading size="sm" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-4 w-4')
  })

  it('renders with large size', () => {
    render(<Loading size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('h-12 w-12')
  })

  it('applies custom className', () => {
    render(<Loading className="custom-class" />)
    const container = screen.getByRole('status').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(<Loading />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })
})