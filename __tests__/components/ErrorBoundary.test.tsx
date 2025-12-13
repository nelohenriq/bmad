import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ErrorBoundary, AsyncErrorBoundary } from '@/components/error/ErrorBoundary'

// Mock the error service
jest.mock('@/services/error/errorService', () => ({
  errorService: {
    reportError: jest.fn().mockResolvedValue('error-id-123')
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium'
  },
  ErrorCategory: {
    SYSTEM: 'system',
    BUSINESS_LOGIC: 'business_logic'
  }
}))

// Component that throws an error
const ErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Component that triggers async error
const AsyncErrorComponent = ({ shouldReject }: { shouldReject: boolean }) => {
  React.useEffect(() => {
    if (shouldReject) {
      Promise.reject(new Error('Async test error'))
    }
  }, [shouldReject])

  return <div>Async component</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('We encountered an unexpected error.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('shows error details when showErrorDetails is true', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary showErrorDetails={true}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details (for developers)')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('allows retry when enableRetry is true', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary enableRetry={true}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /try again \(3 left\)/i })).toBeInTheDocument()

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /try again \(3 left\)/i }))

    // Re-render with shouldThrow=false to simulate successful retry
    rerender(
      <ErrorBoundary enableRetry={true}>
        <ErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('calls onError callback when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const mockOnError = jest.fn()

    render(
      <ErrorBoundary onError={mockOnError}>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )

    consoleSpy.mockRestore()
  })

  it('reports error to error service', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { errorService } = require('@/services/error/errorService')

    render(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(errorService.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      'high',
      'system',
      expect.objectContaining({
        operation: 'ui-error-boundary',
        metadata: expect.objectContaining({
          errorBoundary: true
        })
      }),
      false
    )

    consoleSpy.mockRestore()
  })
})

describe('AsyncErrorBoundary', () => {
  it('handles unhandled promise rejections', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { errorService } = require('@/services/error/errorService')

    render(
      <AsyncErrorBoundary>
        <AsyncErrorComponent shouldReject={true} />
      </AsyncErrorBoundary>
    )

    // Wait for the promise rejection to be handled
    waitFor(() => {
      expect(errorService.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        'high',
        'system',
        expect.objectContaining({
          operation: 'async-error-boundary',
          metadata: expect.objectContaining({
            type: 'unhandledRejection'
          })
        }),
        false
      )
    })

    consoleSpy.mockRestore()
  })

  it('renders custom fallback for async errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AsyncErrorBoundary fallback={<div>Async error occurred</div>}>
        <AsyncErrorComponent shouldReject={true} />
      </AsyncErrorBoundary>
    )

    waitFor(() => {
      expect(screen.getByText('Async error occurred')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })
})