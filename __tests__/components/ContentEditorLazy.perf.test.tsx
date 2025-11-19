import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ContentEditorLazy } from '@/components/ContentEditorLazy'

// Mock the ContentEditor component
jest.mock('@/components/ContentEditor', () => ({
  ContentEditor: ({ contentId }: { contentId: string }) => (
    <div data-testid="content-editor">Content Editor: {contentId}</div>
  ),
}))

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ content: 'Test content' }),
  })
) as jest.Mock

describe('ContentEditorLazy Performance', () => {
  it('shows skeleton initially', () => {
    render(<ContentEditorLazy contentId="test-content" />)

    expect(screen.getByTestId('content-editor-skeleton')).toBeInTheDocument()
  })

  it('lazy loads the component', async () => {
    const { container } = render(<ContentEditorLazy contentId="test-content" />)

    // Initially should show the lazy-loaded component (mocked)
    expect(screen.getByTestId('content-editor')).toBeInTheDocument()

    // Wait for any async operations
    await waitFor(() => {
      expect(container).toBeInTheDocument()
    })
  })

  it('passes props correctly to lazy component', () => {
    render(<ContentEditorLazy contentId="test-content" readOnly />)

    expect(screen.getByText('Content Editor: test-content')).toBeInTheDocument()
  })

  it('handles different content IDs', () => {
    const { rerender } = render(<ContentEditorLazy contentId="content-1" />)

    expect(screen.getByText('Content Editor: content-1')).toBeInTheDocument()

    rerender(<ContentEditorLazy contentId="content-2" />)

    expect(screen.getByText('Content Editor: content-2')).toBeInTheDocument()
  })
})