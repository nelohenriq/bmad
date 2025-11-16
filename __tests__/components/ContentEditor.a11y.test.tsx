import React from 'react'
import { render, act } from '@testing-library/react'
import { ContentEditor } from '@/components/ContentEditor'

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ content: 'Test content', updatedAt: new Date().toISOString() }),
  })
) as jest.Mock

describe('ContentEditor Accessibility', () => {
  it('has proper ARIA attributes', () => {
    const { getByText } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    // Check for heading structure
    expect(getByText('Content Editor')).toBeInTheDocument()
  })

  it('editor has proper accessibility attributes', () => {
    const { container } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    const editor = container.querySelector('[contenteditable]')
    expect(editor).toHaveAttribute('role', 'textbox')
    expect(editor).toHaveAttribute('aria-label', 'Content editor')
    expect(editor).toHaveAttribute('aria-multiline', 'true')
    expect(editor).toHaveAttribute('aria-describedby', 'editor-help')
    expect(editor).toHaveAttribute('aria-required', 'false')
    expect(editor).toHaveAttribute('aria-invalid', 'false')
    expect(editor).toHaveAttribute('tabIndex', '0')
    expect(editor).toHaveAttribute('spellCheck', 'true')
  })

  it('has screen reader help text', () => {
    const { container } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    const helpText = container.querySelector('#editor-help')
    expect(helpText).toBeInTheDocument()
    expect(helpText).toHaveClass('sr-only')
    expect(helpText).toHaveTextContent('Rich text editor')
    expect(helpText).toHaveTextContent('Ctrl+B for bold')
    expect(helpText).toHaveTextContent('Ctrl+I for italic')
    expect(helpText).toHaveTextContent('Ctrl+S to save')
  })

  it('toolbar buttons have proper accessibility', () => {
    const { getByLabelText } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    expect(getByLabelText('Bold text')).toBeInTheDocument()
    expect(getByLabelText('Italic text')).toBeInTheDocument()
    expect(getByLabelText('Insert bullet list')).toBeInTheDocument()
    expect(getByLabelText('Insert link')).toBeInTheDocument()
    expect(getByLabelText('Insert image')).toBeInTheDocument()
    expect(getByLabelText('Show export history')).toBeInTheDocument()
    expect(getByLabelText('Save content')).toBeInTheDocument()
  })

  it('export format select has proper accessibility', () => {
    const { getByLabelText } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    const select = getByLabelText('Export format')
    expect(select).toBeInTheDocument()
    expect(select).toHaveAttribute('aria-label', 'Export format')
  })

  it('checkbox has proper accessibility', () => {
    const { getByLabelText } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    const checkbox = getByLabelText('Include citations in export')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('aria-label', 'Include citations in export')
  })

  it('read-only mode removes interactive elements', () => {
    const { queryByLabelText, container } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" readOnly />
    )

    // Toolbar should not be present in read-only mode
    expect(queryByLabelText('Bold text')).not.toBeInTheDocument()
    expect(queryByLabelText('Save content')).not.toBeInTheDocument()

    // Editor should be read-only
    const editor = container.querySelector('[contenteditable]')
    expect(editor).toHaveClass('cursor-not-allowed')
    expect(editor).toHaveClass('bg-gray-50')
  })

  it('maintains focus management', () => {
    const { container } = render(
      <ContentEditor contentId="test-content" initialContent="Test content" />
    )

    const editor = container.querySelector('[contenteditable]')
    expect(editor).toHaveAttribute('tabIndex', '0')
  })
})