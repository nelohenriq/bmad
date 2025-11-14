'use client'

import React, { useState, useEffect } from 'react'
import { FeedAdditionForm } from '@/components/FeedAdditionForm'
import { FeedSettings } from '@/components/FeedSettings'
import { FeedStatusIndicator } from '@/components/FeedStatusIndicator'
import { FeedNotifications } from '@/components/FeedNotifications'
import { FeedErrorHistory } from '@/components/FeedErrorHistory'
import {
  contentService,
  FeedData,
  UpdateFeedData,
} from '@/services/database/contentService'
import { feedProcessor } from '@/services/rss/feedProcessor'
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
      const userFeeds = await contentService.getUserFeeds(userId)
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
      await contentService.deleteFeed(feedId)
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
      await contentService.updateFeed(feedId, { isActive: !currentStatus })
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
        feeds.map((feed) => contentService.updateFeed(feed.id, { isActive }))
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
      // Process all active feeds
      await Promise.all(
        activeFeeds.map((feed) => feedProcessor.processFeed(feed))
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
      // Get feed data and trigger manual processing
      const feed = feeds.find((f) => f.id === feedId)
      if (feed) {
        await feedProcessor.processFeed(feed)
        loadFeeds() // Reload feeds to show updated status
      }
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
      await contentService.updateFeed(editingFeed, {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        category: editForm.category || undefined,
      })
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
      await contentService.updateFeed(feedId, data)
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
    <div key={feed.id} className="p-4 border rounded-lg hover:bg-gray-50">
      {editingFeed === feed.id ? (
        // Edit Mode
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Edit Feed</h3>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Feed title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
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

            {/* Monitoring Dashboard */}
            <div className="lg:col-span-1 space-y-6">
              <FeedNotifications />
              <FeedErrorHistory feedId="sample-feed-id" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
              placeholder="Feed description"
            />
          </div>

          <div className="text-sm text-gray-500">URL: {feed.url}</div>
        </div>
      ) : (
        // Display Mode
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-gray-900 truncate">
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

            <p className="text-sm text-gray-600 mb-2 truncate">{feed.url}</p>

            {feed.description && (
              <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                {feed.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>Added {new Date(feed.createdAt).toLocaleDateString()}</span>
              {feed.lastFetched && (
                <span>
                  Last fetched {new Date(feed.lastFetched).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStartEdit(feed)}
              className="text-blue-600 hover:text-blue-700"
              title="Edit feed"
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenSettings(feed)}
              className="text-purple-600 hover:text-purple-700"
              title="Configure feed settings"
            >
              <Settings className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleForceRefresh(feed.id)}
              className="text-orange-600 hover:text-orange-700"
              title="Force refresh feed"
              disabled={!feed.isActive}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleFeedStatus(feed.id, feed.isActive)}
              className={
                feed.isActive
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-gray-400 hover:text-gray-600'
              }
              title={feed.isActive ? 'Deactivate feed' : 'Activate feed'}
            >
              {feed.isActive ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <a
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteFeed(feed.id)}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RSS Feed Management
        </h1>
        <p className="text-gray-600">
          Manage your RSS feed sources for content generation.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add Feed Form */}
        <div className="lg:col-span-1">
          <FeedAdditionForm userId={userId} onFeedAdded={handleFeedAdded} />
        </div>

        {/* Feed List */}
        <div className="lg:col-span-1">
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
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading feeds...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={loadFeeds} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : feeds.length === 0 ? (
                <div className="text-center py-8">
                  <Rss className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">No feeds added yet</p>
                  <p className="text-sm text-gray-400">
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
                        <div key={category} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {category}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {categoryFeeds.length} feed
                              {categoryFeeds.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
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
