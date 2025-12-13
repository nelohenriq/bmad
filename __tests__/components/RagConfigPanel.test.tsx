import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RagConfigPanel } from '@/components/generation/RagConfigPanel'

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

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-url'),
})
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Settings: () => <div data-testid="settings-icon" />,
  Save: () => <div data-testid="save-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  HelpCircle: () => <div data-testid="help-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
}))

// Mock TooltipWrapper
jest.mock('@/components/ui/tooltip', () => ({
  TooltipWrapper: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div data-testid="tooltip-wrapper" data-content={content}>
      {children}
    </div>
  ),
}))

describe('RagConfigPanel', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  it('renders with default configuration', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    expect(screen.getByText('RAG Configuration')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument() // maxResults
    expect(screen.getByDisplayValue('70')).toBeInTheDocument() // similarityThreshold
    expect(screen.getByText('Yes')).toBeInTheDocument() // includeMetadata
  })

  it('loads configuration from localStorage', () => {
    const storedConfig = {
      maxResults: 15,
      similarityThreshold: 0.8,
      includeMetadata: false,
      dateRange: 'last 7 days',
      sourceFilter: 'example.com',
      vectorWeight: 0.6,
      keywordWeight: 0.4
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig))

    render(<RagConfigPanel />)

    expect(screen.getByDisplayValue('15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('80')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByDisplayValue('last 7 days')).toBeInTheDocument()
    expect(screen.getByDisplayValue('example.com')).toBeInTheDocument()
  })

  it('validates maxResults range', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const maxResultsSelect = screen.getByDisplayValue('10')

    // Valid value
    fireEvent.change(maxResultsSelect, { target: { value: '25' } })
    expect(screen.queryByText('Max results must be between 1 and 50')).not.toBeInTheDocument()

    // Invalid value - too high
    fireEvent.change(maxResultsSelect, { target: { value: '60' } })
    await waitFor(() => {
      expect(screen.getByText('Max results must be between 1 and 50')).toBeInTheDocument()
    })
  })

  it('validates similarity threshold range', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const thresholdSelect = screen.getByDisplayValue('70')

    fireEvent.change(thresholdSelect, { target: { value: '1.5' } })
    await waitFor(() => {
      expect(screen.getByText('Similarity threshold must be between 0 and 1')).toBeInTheDocument()
    })
  })

  it('validates vector and keyword weights sum', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const vectorWeightInput = screen.getByDisplayValue('0.7')

    fireEvent.change(vectorWeightInput, { target: { value: '0.8' } })
    await waitFor(() => {
      expect(screen.getByText('Vector and keyword weights must sum to 1.0')).toBeInTheDocument()
    })
  })

  it('saves configuration to localStorage', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ragConfig',
        expect.stringContaining('"maxResults":10')
      )
    })

    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('prevents saving when validation errors exist', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    // Create validation error
    const maxResultsSelect = screen.getByDisplayValue('10')
    fireEvent.change(maxResultsSelect, { target: { value: '60' } })

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    expect(saveButton).toBeDisabled()
  })

  it('resets configuration to defaults', () => {
    const storedConfig = {
      maxResults: 20,
      similarityThreshold: 0.9,
      includeMetadata: false
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig))

    render(<RagConfigPanel />)

    const resetButton = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetButton)

    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('70')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('shows performance warning for high result count', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const maxResultsSelect = screen.getByDisplayValue('10')
    fireEvent.change(maxResultsSelect, { target: { value: '25' } })

    expect(screen.getByText('High result count may impact performance')).toBeInTheDocument()
  })

  it('shows performance warning for low similarity threshold', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const thresholdSelect = screen.getByDisplayValue('70')
    fireEvent.change(thresholdSelect, { target: { value: '0.2' } })

    expect(screen.getByText('Low threshold may return less relevant results')).toBeInTheDocument()
  })

  it('exports configuration as JSON file', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const exportButton = screen.getByRole('button', { name: /export config/i })
    fireEvent.click(exportButton)

    expect(window.URL.createObjectURL).toHaveBeenCalled()
  })

  it('imports configuration from JSON file', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const importInput = document.getElementById('config-import') as HTMLInputElement
    const file = new File(['{"maxResults": 20, "similarityThreshold": 0.8}'], 'config.json', {
      type: 'application/json'
    })

    fireEvent.change(importInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    })
  })

  it('shows unsaved changes indicator', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()

    const maxResultsSelect = screen.getByDisplayValue('10')
    fireEvent.change(maxResultsSelect, { target: { value: '15' } })

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
  })

  it('displays current configuration summary', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    expect(screen.getByText('Current Configuration')).toBeInTheDocument()
    expect(screen.getByText('Max: 10')).toBeInTheDocument()
    expect(screen.getByText('Threshold: 70%')).toBeInTheDocument()
    expect(screen.getByText('Vector: 70%')).toBeInTheDocument()
    expect(screen.getByText('Keyword: 30%')).toBeInTheDocument()
    expect(screen.getByText('Metadata: Yes')).toBeInTheDocument()
  })

  it('renders tooltips for help information', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const tooltips = screen.getAllByTestId('tooltip-wrapper')
    expect(tooltips.length).toBeGreaterThan(0)

    // Check that tooltips have content
    expect(tooltips[0]).toHaveAttribute('data-content')
  })

  it('handles invalid imported configuration', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<RagConfigPanel />)

    const importInput = document.getElementById('config-import') as HTMLInputElement
    const file = new File(['invalid json'], 'config.json', {
      type: 'application/json'
    })

    fireEvent.change(importInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Invalid configuration file')).toBeInTheDocument()
    })
  })
})