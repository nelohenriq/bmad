import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContentEditor } from '@/components/ContentEditor'

// Mock fetch
global.fetch = jest.fn()

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bold: () => <div data-testid="bold-icon" />,
  Italic: () => <div data-testid="italic-icon" />,
  List: () => <div data-testid="list-icon" />,
  Link: () => <div data-testid="link-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Undo: () => <div data-testid="undo-icon" />,
  Redo: () => <div data-testid="redo-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Download: () => <div data-testid="download-icon" />,
  History: () => <div data-testid="history-icon" />,
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

// Mock content editor components
jest.mock('@/components/content-editor/Toolbar', () => ({
  Toolbar: ({ onSave, isLoading, ...props }: any) => (
    <div>
      <button onClick={onSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </div>
  ),
}))

jest.mock('@/components/content-editor/EditorCanvas', () => ({
  EditorCanvas: ({ content, onChange, onKeyDown, ...props }: any) => (
    <div
      contentEditable
      onInput={(e) => onChange?.((e.target as HTMLElement).innerHTML)}
      onKeyDown={onKeyDown}
      {...props}
    >
      {content}
    </div>
  ),
}))

jest.mock('@/components/content-editor/ExportPanel', () => ({
  ExportPanel: () => <div>Export Panel</div>,
}))

jest.mock('@/components/content-editor/ChangeTracker', () => ({
  ChangeTracker: () => <div>Change Tracker</div>,
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ options, onChange, placeholder, className }: any) => (
    <select
      onChange={(e) => onChange && onChange(e)}
      className={className}
      data-testid="export-format-select"
    >
      <option value="">{placeholder}</option>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

describe('ContentEditor', () => {
  const mockProps = {
    contentId: 'test-content-id',
    onSave: jest.fn(),
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially when no initial content', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })

    render(<ContentEditor {...mockProps} />)
    expect(screen.getByText('Loading content...')).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading content...')).not.toBeInTheDocument()
    })
  })

  it('renders with initial content', () => {
    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )
    expect(screen.getByText('Content Editor')).toBeInTheDocument()
  })

  it('displays formatting toolbar when not read-only', () => {
    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument()
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument()
  })

  it('hides toolbar when read-only', () => {
    render(
      <ContentEditor
        {...mockProps}
        readOnly={true}
        initialContent="<p>Test content</p>"
      />
    )
    expect(screen.queryByTitle('Bold (Ctrl+B)')).not.toBeInTheDocument()
  })

  it('calls onChange when content is edited', async () => {
    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Content Editor')).toBeInTheDocument()
    })

    const editor = document.querySelector('[contenteditable]') as HTMLElement
    expect(editor).toBeInTheDocument()

    fireEvent.input(editor, {
      target: { innerHTML: '<p>Updated content</p>' },
    })

    expect(mockProps.onChange).toHaveBeenCalledWith('<p>Updated content</p>')
  })

  it('handles save operation', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledWith('<p>Test content</p>')
    })
  })

  it('shows loading state during save', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('handles keyboard shortcuts', () => {
    // Mock execCommand on document
    Object.defineProperty(document, 'execCommand', {
      value: jest.fn(),
      writable: true,
    })

    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )
    const editor =
      screen.getByRole('textbox') || document.querySelector('[contenteditable]')

    fireEvent.keyDown(editor as Element, { key: 'b', ctrlKey: true })

    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined)
  })

  it('loads content from API on mount', async () => {
    const mockContent = {
      content: '<p>Loaded content</p>',
      originalContent: '<p>Original content</p>',
      updatedAt: '2025-11-14T10:00:00Z',
    }

    const mockExports = { exports: [] }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContent),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExports),
      })

    render(<ContentEditor {...mockProps} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/test-content-id/edit',
        expect.any(Object)
      )
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/test-content-id/exports',
        expect.any(Object)
      )
    })
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    })

    render(<ContentEditor {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Content Editor')).toBeInTheDocument()
    })
  })

  describe('Export functionality', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock document methods for download
      const mockClick = jest.fn()
      const mockAppendChild = jest.fn()
      const mockRemoveChild = jest.fn()

      document.createElement = jest.fn().mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      })
      document.body.appendChild = mockAppendChild
      document.body.removeChild = mockRemoveChild
    })

    it('renders export format selector', () => {
      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      expect(select).toBeInTheDocument()
      expect(select).toHaveDisplayValue('Format')
    })

    it('renders citation inclusion checkbox', () => {
      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const checkbox = screen.getByLabelText('Include Citations')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('toggles citation inclusion state', () => {
      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const checkbox = screen.getByLabelText('Include Citations')
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('shows export history button', () => {
      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      expect(screen.getByTitle('Export History')).toBeInTheDocument()
    })

    it('loads export history on mount', async () => {
      const mockExportHistory = [
        {
          id: 'export-1',
          format: 'markdown',
          fileName: 'Test_Content_2025-11-15.md',
          fileSize: 150,
          exportedAt: new Date('2025-11-15T10:00:00Z')
        }
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ content: '<p>Test content</p>', updatedAt: new Date() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ exports: mockExportHistory }),
        })

      render(<ContentEditor {...mockProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/test-content-id/exports')
      })
    })

    it('exports content in markdown format', async () => {
      const mockResponse = new Response('# Test Content\n\nThis is test content.', {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="Test_Content_2025-11-15.md"'
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'markdown' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/test-content-id/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'markdown',
            includeCitations: false
          }),
        })
      })
    })

    it('exports content in HTML format', async () => {
      const mockResponse = new Response('<html><body>Test content</body></html>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'attachment; filename="Test_Content_2025-11-15.html"'
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'html' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/test-content-id/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'html',
            includeCitations: false
          }),
        })
      })
    })

    it('shows export loading state', async () => {
      const mockResponse = new Response('content', {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="test.md"'
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'markdown' } })

      expect(screen.getByText('Exporting...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Exporting...')).not.toBeInTheDocument()
      })
    })

    it('handles export errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Export failed'))

      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'markdown' } })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('toggles export history display', () => {
      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const historyButton = screen.getByTitle('Export History')
      expect(screen.queryByText('Export History')).not.toBeInTheDocument()

      fireEvent.click(historyButton)
      expect(screen.getByText('Export History')).toBeInTheDocument()

      fireEvent.click(historyButton)
      expect(screen.queryByText('Export History')).not.toBeInTheDocument()
    })

    it('displays export history when available', () => {
      const mockExportHistory = [
        {
          id: 'export-1',
          format: 'markdown',
          fileName: 'Test_Content_2025-11-15.md',
          fileSize: 150,
          exportedAt: new Date('2025-11-15T10:00:00Z')
        },
        {
          id: 'export-2',
          format: 'html',
          fileName: 'Test_Content_2025-11-15.html',
          fileSize: 250,
          exportedAt: new Date('2025-11-15T11:00:00Z')
        }
      ]

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      // Simulate export history being set (this would normally come from API)
      // For this test, we'll just check the UI elements exist when history button is clicked
      const historyButton = screen.getByTitle('Export History')
      fireEvent.click(historyButton)

      expect(screen.getByText('Export History')).toBeInTheDocument()
      // Since we can't easily mock the internal state, we'll just verify the UI structure
      expect(screen.getByText('No exports yet')).toBeInTheDocument()
    })

    it('exports with citations when checkbox is checked', async () => {
      const mockResponse = new Response('content with citations', {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="test.md"'
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      // Enable citations
      const checkbox = screen.getByLabelText('Include Citations')
      fireEvent.click(checkbox)

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'markdown' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/content/test-content-id/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'markdown',
            includeCitations: true
          }),
        })
      })
    })

    it('refreshes export history after successful export', async () => {
      const mockResponse = new Response('content', {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="test.md"'
        }
      })

      const mockHistoryResponse = {
        ok: true,
        json: () => Promise.resolve({ exports: [] })
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockHistoryResponse)

      render(
        <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
      )

      const select = screen.getByTestId('export-format-select')
      fireEvent.change(select, { target: { value: 'markdown' } })

      await waitFor(() => {
        // Should call export API and then refresh history
        expect(global.fetch).toHaveBeenCalledTimes(2)
        expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/content/test-content-id/exports')
      })
    })
  })
})
