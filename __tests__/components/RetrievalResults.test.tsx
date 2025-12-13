import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RetrievalResults } from '@/components/generation/RetrievalResults'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon" />,
  Star: () => <div data-testid="star-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}))

const mockResults = [
  {
    chunkId: 'chunk-1',
    contentId: 'content-1',
    text: 'This is a short content snippet that should not be truncated.',
    score: 0.95,
    metadata: {
      model: 'qwen2:0.5b',
      generatedAt: '2025-01-15T10:00:00Z',
      chunkIndex: 1,
      wordCount: 12,
      charCount: 67
    },
    contentInfo: {
      title: 'Test Article Title',
      source: 'https://example.com/feed1',
      publishedAt: '2025-01-15T10:00:00Z'
    },
    hybridScore: 0.95,
    vectorScore: 0.9,
    keywordScore: 0.05,
    rank: 1
  },
  {
    chunkId: 'chunk-2',
    contentId: 'content-2',
    text: 'This is a very long content snippet that should be truncated because it exceeds the 200 character limit and therefore needs to be expandable by the user to see the full text content in its entirety.',
    score: 0.87,
    metadata: {
      model: 'qwen2:0.5b',
      generatedAt: '2025-01-14T15:30:00Z',
      chunkIndex: 2,
      wordCount: 45,
      charCount: 250
    },
    contentInfo: {
      title: 'Another Article',
      source: 'https://example.com/feed2',
      publishedAt: '2025-01-14T15:30:00Z'
    },
    hybridScore: 0.87,
    vectorScore: 0.8,
    keywordScore: 0.07,
    rank: 2
  }
]

describe('RetrievalResults', () => {
  it('renders nothing when no results provided', () => {
    const { container } = render(<RetrievalResults />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when empty results array provided', () => {
    const { container } = render(<RetrievalResults results={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders results with correct count in header', () => {
    render(<RetrievalResults results={mockResults} />)

    expect(screen.getByText('Retrieved Content (2)')).toBeInTheDocument()
  })

  it('displays loading state when loading is true', () => {
    render(<RetrievalResults loading={true} />)

    expect(screen.getByText('Retrieving relevant content...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('displays error state when error is provided', () => {
    const errorMessage = 'Failed to fetch results'
    render(<RetrievalResults error={errorMessage} />)

    expect(screen.getByText(`Failed to retrieve content: ${errorMessage}`)).toBeInTheDocument()
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
  })

  it('displays result items with proper structure', () => {
    render(<RetrievalResults results={mockResults} />)

    // Check first result
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('95.0%')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/feed1')).toBeInTheDocument()
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    expect(screen.getByText('1/15/2025')).toBeInTheDocument()
    expect(screen.getByText('12 words')).toBeInTheDocument()
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
  })

  it('displays source link with proper accessibility', () => {
    render(<RetrievalResults results={mockResults} />)

    const sourceLink = screen.getByRole('link', { name: /View original article: Test Article Title/i })
    expect(sourceLink).toHaveAttribute('href', 'https://example.com/feed1')
    expect(sourceLink).toHaveAttribute('target', '_blank')
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows truncated content with expand button for long content', () => {
    render(<RetrievalResults results={mockResults} />)

    // Second result has long content
    expect(screen.getByText('Show More')).toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('expands and collapses content when button is clicked', async () => {
    render(<RetrievalResults results={mockResults} />)

    const expandButton = screen.getByRole('button', { name: 'Show full content' })

    // Initially collapsed
    expect(screen.getByText('Show More')).toBeInTheDocument()
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByText('Show Less')).toBeInTheDocument()
      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
    })

    // Click to collapse
    fireEvent.click(expandButton)

    await waitFor(() => {
      expect(screen.getByText('Show More')).toBeInTheDocument()
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('supports keyboard navigation for expand/collapse', () => {
    render(<RetrievalResults results={mockResults} />)

    const expandButton = screen.getByRole('button', { name: 'Show full content' })

    // Press Enter to expand
    fireEvent.keyDown(expandButton, { key: 'Enter' })

    expect(expandButton).toHaveAttribute('aria-expanded', 'true')

    // Press Space to collapse
    fireEvent.keyDown(expandButton, { key: ' ' })

    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('displays relevance score with proper accessibility', () => {
    render(<RetrievalResults results={mockResults} />)

    const relevanceScore = screen.getByLabelText('Relevance score: 95.0 percent')
    expect(relevanceScore).toBeInTheDocument()
  })

  it('shows RAG context explanation', () => {
    render(<RetrievalResults results={mockResults} />)

    expect(screen.getByText(/RAG Context:/)).toBeInTheDocument()
    expect(screen.getByText(/The AI will use these retrieved chunks as context/)).toBeInTheDocument()
  })

  it('displays metadata badges', () => {
    render(<RetrievalResults results={mockResults} />)

    expect(screen.getByText('12 words')).toBeInTheDocument()
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
    expect(screen.getByText('45 words')).toBeInTheDocument()
    expect(screen.getByText('Chunk 2')).toBeInTheDocument()
  })

  it('handles missing contentInfo gracefully', () => {
    const resultsWithoutContentInfo = [{
      chunkId: 'chunk-3',
      contentId: 'content-3',
      text: 'Content without content info',
      score: 0.75,
      metadata: {
        model: 'qwen2:0.5b',
        generatedAt: '2025-01-13T12:00:00Z',
        chunkIndex: 1,
        wordCount: 5,
        charCount: 28
      }
    }]

    render(<RetrievalResults results={resultsWithoutContentInfo} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
  })

  it('displays full content when content is short', () => {
    render(<RetrievalResults results={mockResults} />)

    // First result has short content, should display fully without expand button
    const expandButtons = screen.getAllByRole('button', { name: /Show/ })
    expect(expandButtons).toHaveLength(1) // Only one expand button for the long content
  })
})