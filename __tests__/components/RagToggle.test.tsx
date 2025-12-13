import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RagToggle } from '@/components/generation/RagToggle'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Info: () => <div data-testid="info-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}))

describe('RagToggle', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  it('renders with correct initial state (disabled by default)', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagToggle />)

    expect(screen.getByText('RAG Mode')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByText('Direct generation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle rag mode off/i })).toBeInTheDocument()
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('renders with enabled state when localStorage has true', () => {
    localStorageMock.getItem.mockReturnValue('true')

    render(<RagToggle />)

    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Using retrieved context')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle rag mode on/i })).toBeInTheDocument()
    expect(screen.getByText('On')).toBeInTheDocument()
    expect(screen.getByText('Enhanced')).toBeInTheDocument()
  })

  it('toggles mode when button is clicked', async () => {
    localStorageMock.getItem.mockReturnValue('false')

    render(<RagToggle />)

    const button = screen.getByRole('button', { name: /toggle rag mode off/i })

    // Click to enable
    fireEvent.click(button)

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('generationMode', 'true')
    })

    // Re-render to check state change
    localStorageMock.getItem.mockReturnValue('true')
    render(<RagToggle />)

    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Using retrieved context')).toBeInTheDocument()
  })

  it('supports keyboard navigation with Enter key', () => {
    localStorageMock.getItem.mockReturnValue('false')

    render(<RagToggle />)

    const button = screen.getByRole('button', { name: /toggle rag mode off/i })

    // Press Enter to toggle
    fireEvent.keyDown(button, { key: 'Enter' })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('generationMode', 'true')
  })

  it('supports keyboard navigation with Space key', () => {
    localStorageMock.getItem.mockReturnValue('false')

    render(<RagToggle />)

    const button = screen.getByRole('button', { name: /toggle rag mode off/i })

    // Press Space to toggle
    fireEvent.keyDown(button, { key: ' ' })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('generationMode', 'true')
  })

  it('respects controlled mode when enabled prop is provided', () => {
    const mockOnToggle = jest.fn()

    render(<RagToggle enabled={true} onToggle={mockOnToggle} />)

    const button = screen.getByRole('button', { name: /toggle rag mode on/i })

    fireEvent.click(button)

    expect(mockOnToggle).toHaveBeenCalledWith(false)
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('disables toggle when disabled prop is true', () => {
    render(<RagToggle disabled={true} />)

    const button = screen.getByRole('button', { name: /toggle rag mode off/i })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('tabindex', '-1')
  })

  it('has proper accessibility attributes', () => {
    localStorageMock.getItem.mockReturnValue('true')

    render(<RagToggle />)

    const button = screen.getByRole('button', { name: /toggle rag mode on/i })

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('role', 'button')
    expect(button).toHaveAttribute('tabindex', '0')
  })

  it('displays mode descriptions clearly', () => {
    localStorageMock.getItem.mockReturnValue('true')

    render(<RagToggle />)

    expect(screen.getByText('Retrieve relevant content from your RSS feeds before generation for more accurate results')).toBeInTheDocument()
    expect(screen.getByText('Using retrieved context')).toBeInTheDocument()
  })

  it('shows visual indicator when enabled', () => {
    localStorageMock.getItem.mockReturnValue('true')

    render(<RagToggle />)

    expect(screen.getByText('Enhanced')).toBeInTheDocument()
  })
})