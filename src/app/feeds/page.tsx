'use client'

import React, { useState, useEffect } from 'react'
import { FeedAdditionForm } from '@/components/FeedAdditionForm'
import { FeedSettings } from '@/components/FeedSettings'
import { FeedStatusIndicator } from '@/components/FeedStatusIndicator'
import { FeedNotifications } from '@/components/FeedNotifications'
import { FeedErrorHistory } from '@/components/FeedErrorHistory'
// FeedData and UpdateFeedData types are now handled via API
interface FeedData {
  id: string
  userId: string
  url: string
  title: string | null
  description: string | null
  category: string | null
  isActive: boolean
  updateFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly' | null
  keywordFilters?: string[] | null
  contentFilters?: Record<string, any> | null
  lastConfigUpdate?: Date | null
  lastFetched: Date | null
  createdAt: Date
  updatedAt: Date
}

interface UpdateFeedData {
  title?: string
  description?: string
  category?: string
  isActive?: boolean
  updateFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly'
  keywordFilters?: string[]
  contentFilters?: Record<string, any>
  lastConfigUpdate?: Date
}
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Rss,
  ExternalLink,
  Trash2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  X,
  Group,
  List,
  Settings,
} from 'lucide-react'

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<FeedData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingFeed, setEditingFeed] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
  })
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [selectedFeedForSettings, setSelectedFeedForSettings] =
    useState<FeedData | null>(null)

  // For now, using a mock user ID. In a real app, this would come from authentication
  const userId = 'user-1'

  const loadFeeds = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/feeds?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch feeds')
      }
      const userFeeds = await response.json()
      setFeeds(userFeeds)
      setError(null)
    } catch (err) {
      setError('Failed to load feeds')
      console.error('Error loading feeds:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeeds()
  }, [])

  const handleFeedAdded = () => {
    loadFeeds() // Reload feeds after adding a new one
  }

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this feed?')) return

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete feed')
      }
      loadFeeds() // Reload feeds after deletion
    } catch (err) {
      setError('Failed to delete feed')
      console.error('Error deleting feed:', err)
    }
  }

  const handleToggleFeedStatus = async (
    feedId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (!response.ok) {
        throw new Error('Failed to update feed status')
      }
      loadFeeds() // Reload feeds after status change
    } catch (err) {
      setError('Failed to update feed status')
      console.error('Error updating feed status:', err)
    }
  }

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    const confirmMessage = isActive
      ? 'Are you sure you want to activate all feeds?'
      : 'Are you sure you want to deactivate all feeds?'

    if (!confirm(confirmMessage)) return

    try {
      // Update all feeds with the new status
      await Promise.all(
        feeds.map((feed) =>
          fetch(`/api/feeds/${feed.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive }),
          }).then((res) => {
            if (!res.ok) throw new Error('Failed to update feed')
          })
        )
      )
      loadFeeds() // Reload feeds after bulk update
    } catch (err) {
      setError('Failed to update feed statuses')
      console.error('Error updating feed statuses:', err)
    }
  }

  const handleBulkRefresh = async () => {
    const activeFeeds = feeds.filter((feed) => feed.isActive)
    if (activeFeeds.length === 0) {
      setError('No active feeds to refresh')
      return
    }

    const confirmMessage = `Are you sure you want to refresh all ${activeFeeds.length} active feed${activeFeeds.length !== 1 ? 's' : ''}?`
    if (!confirm(confirmMessage)) return

    try {
      setError(null)
      // Process all active feeds via API
      await Promise.all(
        activeFeeds.map((feed) =>
          fetch(`/api/feeds/${feed.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'refresh' }),
          }).then((res) => {
            if (!res.ok) throw new Error('Failed to refresh feed')
          })
        )
      )
      loadFeeds() // Reload feeds to show updated status
    } catch (err) {
      setError('Failed to refresh some feeds')
      console.error('Error refreshing feeds:', err)
      loadFeeds() // Still reload to show partial updates
    }
  }

  const handleForceRefresh = async (feedId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      })
      if (!response.ok) {
        throw new Error('Failed to refresh feed')
      }
      loadFeeds() // Reload feeds to show updated status
    } catch (err) {
      setError('Failed to refresh feed')
      console.error('Error refreshing feed:', err)
    }
  }

  const handleStartEdit = (feed: FeedData) => {
    setEditingFeed(feed.id)
    setEditForm({
      title: feed.title || '',
      description: feed.description || '',
      category: feed.category || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingFeed(null)
    setEditForm({ title: '', description: '', category: '' })
  }

  const handleSaveEdit = async () => {
    if (!editingFeed) return

    try {
      const response = await fetch(`/api/feeds/${editingFeed}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.title || undefined,
          description: editForm.description || undefined,
          category: editForm.category || undefined,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to update feed')
      }
      setEditingFeed(null)
      loadFeeds() // Reload feeds after edit
    } catch (err) {
      setError('Failed to update feed')
      console.error('Error updating feed:', err)
    }
  }

  const handleOpenSettings = (feed: FeedData) => {
    setSelectedFeedForSettings(feed)
    setSettingsModalOpen(true)
  }

  const handleSaveSettings = async (feedId: string, data: UpdateFeedData) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update feed settings')
      }
      loadFeeds() // Reload feeds after settings update
    } catch (err) {
      setError('Failed to update feed settings')
      console.error('Error updating feed settings:', err)
      throw err // Re-throw to let the modal handle the error
    }
  }

  // Group feeds by category
  const groupedFeeds = feeds.reduce(
    (acc, feed) => {
      const category = feed.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(feed)
      return acc
    },
    {} as Record<string, FeedData[]>
  )

  // Render feed item (extracted to avoid duplication)
  const renderFeedItem = (feed: FeedData) => (
    <Card key={feed.id} className="mb-4">
      <CardContent className="p-6">
        {editingFeed === feed.id ? (
          // Edit Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 transition-colors">Edit Feed</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                    placeholder="Feed title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="">No category</option>
                    {[
                      'Technology',
                      'News',
                      'Blog',
                      'Personal',
                      'Business',
                      'Entertainment',
                      'Science',
                      'Sports',
                      'Health',
                      'Education',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  rows={3}
                  placeholder="Feed description"
                />
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">URL: {feed.url}</div>
          </div>
        ) : (
          // Display Mode
          <div className="space-y-4">
            {/* Header with title and status */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 transition-colors">
                    {feed.title || 'Untitled Feed'}
                  </h3>
                  <FeedStatusIndicator
                    status={(feed as any).lastFetchStatus}
                    healthScore={(feed as any).healthScore || 1.0}
                    isActive={feed.isActive}
                    lastFetched={feed.lastFetched}
                    retryCount={(feed as any).fetchRetryCount || 0}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 break-all transition-colors">{feed.url}</p>
              </div>
            </div>

            {/* Description */}
            {feed.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors">
                {feed.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 transition-colors">
              <div className="flex items-center gap-4">
                <span>Added {new Date(feed.createdAt).toLocaleDateString()}</span>
                {feed.lastFetched && (
                  <span>
                    Last fetched {new Date(feed.lastFetched).toLocaleDateString()}
                  </span>
                )}
                {feed.category && (
                  <Badge variant="secondary" className="text-xs">
                    {feed.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 transition-colors">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartEdit(feed)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                title="Edit feed"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenSettings(feed)}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                title="Configure feed settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleForceRefresh(feed.id)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                title="Force refresh feed"
                disabled={!feed.isActive}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleFeedStatus(feed.id, feed.isActive)}
                className={
                  feed.isActive
                    ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors'
                }
                title={feed.isActive ? 'Deactivate feed' : 'Activate feed'}
              >
                {feed.isActive ? (
                  <>
                    <ToggleRight className="w-4 h-4 mr-2" />
                    Active
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 mr-2" />
                    Inactive
                  </>
                )}
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                  title="Open feed URL"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit
                </a>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteFeed(feed.id)}
                className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Delete feed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">
          RSS Feed Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300 transition-colors">
          Manage your RSS feed sources for content generation.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add Feed Form */}
        <div className="lg:col-span-1">
          <FeedAdditionForm userId={userId} onFeedAdded={handleFeedAdded} />
        </div>

        {/* Feed List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="w-5 h-5" />
                  Your Feeds
                </div>
                {feeds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupByCategory(!groupByCategory)}
                      title={
                        groupByCategory ? 'Show as list' : 'Group by category'
                      }
                    >
                      {groupByCategory ? (
                        <List className="w-4 h-4 mr-2" />
                      ) : (
                        <Group className="w-4 h-4 mr-2" />
                      )}
                      {groupByCategory ? 'List' : 'Group'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRefresh}
                      disabled={!feeds.some((feed) => feed.isActive)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusUpdate(true)}
                      disabled={feeds.every((feed) => feed.isActive)}
                    >
                      Activate All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkStatusUpdate(false)}
                      disabled={feeds.every((feed) => !feed.isActive)}
                    >
                      Deactivate All
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {feeds.length} feed{feeds.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400 dark:text-gray-500 transition-colors" />
                  <p className="text-gray-500 dark:text-gray-400 transition-colors">Loading feeds...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400 mb-4 transition-colors">{error}</p>
                  <Button onClick={loadFeeds} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : feeds.length === 0 ? (
                <div className="text-center py-8">
                  <Rss className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600 transition-colors" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4 transition-colors">No feeds added yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 transition-colors">
                    Add your first RSS feed using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupByCategory ? (
                    // Grouped by category view
                    Object.entries(groupedFeeds)
                      .sort(([a], [b]) => {
                        // Sort categories with "Uncategorized" last
                        if (a === 'Uncategorized') return 1
                        if (b === 'Uncategorized') return -1
                        return a.localeCompare(b)
                      })
                      .map(([category, categoryFeeds]) => (
                        <div key={category} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 transition-colors">
                            <h3 className="font-semibold text-xl text-gray-900 dark:text-gray-100 transition-colors">
                              {category}
                            </h3>
                            <Badge variant="outline" className="text-sm">
                              {categoryFeeds.length} feed{categoryFeeds.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            {categoryFeeds.map((feed) => renderFeedItem(feed))}
                          </div>
                        </div>
                      ))
                  ) : (
                    // Flat list view
                    <div className="space-y-4">
                      {feeds.map((feed) => renderFeedItem(feed))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feed Settings Modal */}
      {selectedFeedForSettings && (
        <FeedSettings
          feed={selectedFeedForSettings}
          isOpen={settingsModalOpen}
          onClose={() => {
            setSettingsModalOpen(false)
            setSelectedFeedForSettings(null)
          }}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  )
}
