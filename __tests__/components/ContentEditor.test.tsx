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
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/test-content-id/edit',
        expect.objectContaining({
          method: 'PUT',
        })
      )
    })

    expect(mockProps.onSave).toHaveBeenCalledWith('<p>Test content</p>')
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
    const execCommandSpy = jest
      .spyOn(document, 'execCommand')
      .mockImplementation()

    render(
      <ContentEditor {...mockProps} initialContent="<p>Test content</p>" />
    )
    const editor =
      screen.getByRole('textbox') || document.querySelector('[contenteditable]')

    fireEvent.keyDown(editor as Element, { key: 'b', ctrlKey: true })

    expect(execCommandSpy).toHaveBeenCalledWith('bold', false, undefined)

    execCommandSpy.mockRestore()
  })

  it('loads content from API on mount', async () => {
    const mockContent = {
      content: '<p>Loaded content</p>',
      originalContent: '<p>Original content</p>',
      updatedAt: '2025-11-14T10:00:00Z',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContent),
    })

    render(<ContentEditor {...mockProps} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/content/test-content-id/edit',
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
})
