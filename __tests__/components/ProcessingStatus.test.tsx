import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ProcessingStatus } from '@/components/generation/ProcessingStatus'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Wand2: () => <div data-testid="wand-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
}))

// Mock timers
jest.useFakeTimers()

describe('ProcessingStatus', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  it('renders nothing when no props provided', () => {
    const { container } = render(<ProcessingStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('renders with basic message', () => {
    render(<ProcessingStatus message="Processing content..." />)

    expect(screen.getByText('RAG Processing Status')).toBeInTheDocument()
    expect(screen.getByText('Processing content...')).toBeInTheDocument()
  })

  it('displays job ID when provided', () => {
    render(<ProcessingStatus jobId="job-12345678" message="Processing..." />)

    expect(screen.getByText('Job 12345678')).toBeInTheDocument()
  })

  it('shows retrieval phase with correct icon and color', () => {
    render(<ProcessingStatus phase="retrieval" message="Retrieving content..." />)

    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByText('Retrieving content...')).toBeInTheDocument()
  })

  it('shows generation phase with correct icon and color', () => {
    render(<ProcessingStatus phase="generation" message="Generating response..." />)

    expect(screen.getByTestId('wand-icon')).toBeInTheDocument()
    expect(screen.getByText('Generating response...')).toBeInTheDocument()
  })

  it('shows complete phase with success styling', () => {
    render(<ProcessingStatus phase="complete" message="Processing complete" />)

    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    // Should have green styling (checked via className in implementation)
  })

  it('shows error phase with error styling and message', () => {
    const errorMessage = 'Failed to retrieve content'
    render(<ProcessingStatus
      phase="error"
      message="Processing failed"
      error={errorMessage}
    />)

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    expect(screen.getByText('Processing Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('displays progress bar with correct width', () => {
    render(<ProcessingStatus phase="retrieval" progress={75} message="Processing..." />)

    const progressBar = document.querySelector('.bg-blue-600')
    expect(progressBar).toHaveStyle({ width: '75%' })
  })

  it('shows minimum progress width of 5%', () => {
    render(<ProcessingStatus phase="retrieval" progress={0} message="Processing..." />)

    const progressBar = document.querySelector('.bg-blue-600')
    expect(progressBar).toHaveStyle({ width: '5%' })
  })

  it('displays performance metrics', () => {
    const metrics = {
      duration: 5000,
      chunksRetrieved: 15,
      tokensGenerated: 2500,
      apiCalls: 3
    }

    render(<ProcessingStatus
      phase="complete"
      message="Complete"
      metrics={metrics}
    />)

    expect(screen.getByText('15 chunks')).toBeInTheDocument()
    expect(screen.getByText('5s')).toBeInTheDocument() // 5000ms = 5s
    expect(screen.getByText('2,500')).toBeInTheDocument() // 2500 tokens
    expect(screen.getByText('3')).toBeInTheDocument() // 3 API calls
  })

  it('tracks and displays elapsed time', () => {
    const startTime = new Date(Date.now() - 3000) // 3 seconds ago

    render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      startTime={startTime}
    />)

    // Fast-forward 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByText('Elapsed: 5s')).toBeInTheDocument()
  })

  it('handles timeout after specified duration', () => {
    const startTime = new Date()

    render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      startTime={startTime}
      timeoutMs={5000}
    />)

    // Fast-forward past timeout
    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    expect(screen.getByText(/timed out after/)).toBeInTheDocument()
  })

  it('shows cancel button for active processing', () => {
    const mockCancel = jest.fn()

    render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      onCancel={mockCancel}
    />)

    const cancelButton = screen.getByRole('button', { name: 'Cancel processing' })
    expect(cancelButton).toBeInTheDocument()

    fireEvent.click(cancelButton)
    expect(mockCancel).toHaveBeenCalled()
  })

  it('hides cancel button for completed processing', () => {
    render(<ProcessingStatus
      phase="complete"
      message="Done"
      onCancel={jest.fn()}
    />)

    expect(screen.queryByRole('button', { name: 'Cancel processing' })).not.toBeInTheDocument()
  })

  it('hides cancel button for error states', () => {
    render(<ProcessingStatus
      phase="error"
      message="Failed"
      error="Error occurred"
      onCancel={jest.fn()}
    />)

    expect(screen.queryByRole('button', { name: 'Cancel processing' })).not.toBeInTheDocument()
  })

  it('displays success confirmation with summary', () => {
    const metrics = {
      duration: 8000,
      chunksRetrieved: 12,
      tokensGenerated: 1800,
      apiCalls: 2
    }

    render(<ProcessingStatus
      phase="complete"
      message="Processing Complete"
      metrics={metrics}
    />)

    expect(screen.getByText('Processing Complete')).toBeInTheDocument()
    expect(screen.getByText('Retrieved 12 relevant chunks')).toBeInTheDocument()
    expect(screen.getByText('Generated 1,800 tokens')).toBeInTheDocument()
    expect(screen.getByText('Completed in 8s')).toBeInTheDocument()
  })

  it('formats time correctly', () => {
    const startTime = new Date(Date.now() - 125000) // 2 minutes 5 seconds ago

    render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      startTime={startTime}
    />)

    // Fast-forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByText('Elapsed: 2m 6s')).toBeInTheDocument()
  })

  it('shows timeout countdown', () => {
    const startTime = new Date()

    render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      startTime={startTime}
      timeoutMs={30000}
    />)

    expect(screen.getByText('Timeout: 30s')).toBeInTheDocument()
  })

  it('does not show progress bar for complete phase', () => {
    render(<ProcessingStatus phase="complete" message="Done" />)

    const progressBar = document.querySelector('.bg-blue-600')
    expect(progressBar).toBeNull()
  })

  it('does not show progress bar for error phase', () => {
    render(<ProcessingStatus phase="error" message="Failed" error="Error" />)

    const progressBar = document.querySelector('.bg-blue-600')
    expect(progressBar).toBeNull()
  })

  it('handles missing metrics gracefully', () => {
    render(<ProcessingStatus
      phase="complete"
      message="Complete"
      metrics={undefined}
    />)

    expect(screen.getByText('Processing Complete')).toBeInTheDocument()
    // Should not crash and should show basic success message
  })

  it('cleans up timers on unmount', () => {
    const startTime = new Date()

    const { unmount } = render(<ProcessingStatus
      phase="retrieval"
      message="Processing..."
      startTime={startTime}
    />)

    // Spy on clearInterval and clearTimeout
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    unmount()

    // Should have cleaned up timers
    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })
})