import React from 'react'
import { render, screen } from '@testing-library/react'
import { Navigation } from '@/components/Navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => <a {...props}>{children}</a>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Home: () => null,
  Brain: () => null,
  FileText: () => null,
  Rss: () => null,
  BarChart3: () => null,
  Settings: () => null,
  Menu: () => null,
  X: () => null,
}))

describe('Navigation', () => {
  it('renders navigation links', () => {
    render(<Navigation />)

    expect(screen.getByText('Neural Feed Studio')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem', { name: 'Home' })).toHaveLength(2)
    expect(screen.getAllByRole('menuitem', { name: 'Dashboard' })).toHaveLength(2)
    expect(screen.getAllByRole('menuitem', { name: 'Content' })).toHaveLength(2)
  })

  it('highlights active link', () => {
    render(<Navigation />)

    const homeLinks = screen.getAllByRole('menuitem', { name: 'Home' })
    expect(homeLinks[0]).toHaveClass('border-blue-500')
  })
})
