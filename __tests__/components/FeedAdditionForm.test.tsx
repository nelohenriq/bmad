import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeedAdditionForm } from '../../src/components/FeedAdditionForm'

// Mock the services
jest.mock('../../src/services/rssService', () => ({
  rssService: {
    validateFeed: jest.fn(),
  },
}))

jest.mock('../../src/services/database/contentService', () => ({
  contentService: {
    addFeed: jest.fn(),
  },
}))

describe('FeedAdditionForm', () => {
  const mockOnFeedAdded = jest.fn()
  const userId = 'test-user-id'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with required fields', () => {
    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    expect(screen.getByText('Add RSS Feed')).toBeInTheDocument()
    expect(screen.getByLabelText(/RSS Feed URL/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Validate/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Add Feed/i })
    ).toBeInTheDocument()
  })

  it('validates RSS feed when URL is valid', async () => {
    const { rssService } = require('../../src/services/rssService')
    rssService.validateFeed.mockResolvedValue({
      isValid: false,
      error: 'Feed not found',
    })

    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const validateButton = screen.getByRole('button', { name: /Validate/i })

    // Valid URL format
    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.click(validateButton)

    // Should call validateFeed
    await waitFor(() => {
      expect(rssService.validateFeed).toHaveBeenCalledWith(
        'https://example.com/feed.xml'
      )
    })

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument()
      expect(screen.getByText('Feed not found')).toBeInTheDocument()
    })
  })

  it('shows validation success for valid RSS feeds', async () => {
    const { rssService } = require('../../src/services/rssService')
    rssService.validateFeed.mockResolvedValue({
      isValid: true,
      feedTitle: 'Test Feed',
      feedDescription: 'A test RSS feed',
    })

    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const validateButton = screen.getByRole('button', { name: /Validate/i })

    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.click(validateButton)

    await waitFor(() => {
      expect(screen.getByText('Valid RSS Feed')).toBeInTheDocument()
      expect(screen.getByText('Test Feed')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid RSS feeds', async () => {
    const { rssService } = require('../../src/services/rssService')
    rssService.validateFeed.mockResolvedValue({
      isValid: false,
      error: 'Feed not found',
    })

    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const validateButton = screen.getByRole('button', { name: /Validate/i })

    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.click(validateButton)

    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument()
      expect(screen.getByText('Feed not found')).toBeInTheDocument()
    })
  })

  it('submits the form successfully', async () => {
    const { rssService } = require('../../src/services/rssService')
    const {
      contentService,
    } = require('../../src/services/database/contentService')

    rssService.validateFeed.mockResolvedValue({
      isValid: true,
      feedTitle: 'Test Feed',
      feedDescription: 'A test RSS feed',
    })

    contentService.addFeed.mockResolvedValue({
      id: 'feed-id',
      userId,
      url: 'https://example.com/feed.xml',
      title: 'Test Feed',
      description: 'A test RSS feed',
      category: 'Technology',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const categoryInput = screen.getByLabelText(/Category/i)
    const validateButton = screen.getByRole('button', { name: /Validate/i })
    const submitButton = screen.getByRole('button', { name: /Add Feed/i })

    // Fill form
    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.change(categoryInput, { target: { value: 'Technology' } })

    // Validate first
    fireEvent.click(validateButton)

    await waitFor(() => {
      expect(rssService.validateFeed).toHaveBeenCalled()
    })

    // Submit
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(contentService.addFeed).toHaveBeenCalledWith({
        userId,
        url: 'https://example.com/feed.xml',
        category: 'Technology',
        title: 'Test Feed',
        description: 'A test RSS feed',
      })
      expect(mockOnFeedAdded).toHaveBeenCalled()
    })
  })

  it('handles duplicate feed errors', async () => {
    const { rssService } = require('../../src/services/rssService')
    const {
      contentService,
    } = require('../../src/services/database/contentService')

    rssService.validateFeed.mockResolvedValue({
      isValid: true,
      feedTitle: 'Test Feed',
    })

    contentService.addFeed.mockRejectedValue(
      new Error('Feed with this URL already exists')
    )

    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const validateButton = screen.getByRole('button', { name: /Validate/i })
    const submitButton = screen.getByRole('button', { name: /Add Feed/i })

    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.click(validateButton)

    await waitFor(() => {
      expect(rssService.validateFeed).toHaveBeenCalled()
    })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText('This feed has already been added.')
      ).toBeInTheDocument()
    })
  })

  it('clears the form', () => {
    render(<FeedAdditionForm userId={userId} onFeedAdded={mockOnFeedAdded} />)

    const urlInput = screen.getByLabelText(/RSS Feed URL/i)
    const categoryInput = screen.getByLabelText(/Category/i)
    const clearButton = screen.getByRole('button', { name: /Clear/i })

    fireEvent.change(urlInput, {
      target: { value: 'https://example.com/feed.xml' },
    })
    fireEvent.change(categoryInput, { target: { value: 'Technology' } })

    fireEvent.click(clearButton)

    expect(urlInput).toHaveValue('')
    expect(categoryInput).toHaveValue('')
  })
})
