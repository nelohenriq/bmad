import React from 'react'
import { render, screen } from '@testing-library/react'
import { Navigation } from '../../src/components/Navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Navigation', () => {
  it('renders navigation links', () => {
    render(<Navigation />)

    expect(screen.getByText('Neural Feed Studio')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /home/i })).toHaveLength(2) // desktop and mobile
    expect(screen.getAllByRole('link', { name: /dashboard/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /content/i })).toHaveLength(2)
  })

  it('highlights active link', () => {
    render(<Navigation />)

    const homeLinks = screen.getAllByRole('link', { name: /home/i })
    const desktopHomeLink = homeLinks.find((link) =>
      link.classList.contains('inline-flex')
    )
    expect(desktopHomeLink).toHaveClass('border-blue-500')
  })
})
