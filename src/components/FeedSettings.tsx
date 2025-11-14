'use client'

import React, { useState, useEffect } from 'react'
import {
  FeedData,
  UpdateFeedData,
  contentService,
} from '@/services/database/contentService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Plus, Trash2 } from 'lucide-react'

interface FeedSettingsProps {
  feed: FeedData
  isOpen: boolean
  onClose: () => void
  onSave: (feedId: string, data: UpdateFeedData) => void
}

export function FeedSettings({
  feed,
  isOpen,
  onClose,
  onSave,
}: FeedSettingsProps) {
  const [formData, setFormData] = useState({
    updateFrequency: feed.updateFrequency || 'daily',
    keywordFilters: feed.keywordFilters || [],
    contentFilters: feed.contentFilters || {},
  })
  const [newKeyword, setNewKeyword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when feed changes
  useEffect(() => {
    setFormData({
      updateFrequency: feed.updateFrequency || 'daily',
      keywordFilters: feed.keywordFilters || [],
      contentFilters: feed.contentFilters || {},
    })
  }, [feed])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updateData: UpdateFeedData = {
        updateFrequency: formData.updateFrequency as
          | 'manual'
          | 'hourly'
          | 'daily'
          | 'weekly',
        keywordFilters:
          formData.keywordFilters.length > 0
            ? formData.keywordFilters
            : undefined,
        contentFilters:
          Object.keys(formData.contentFilters).length > 0
            ? formData.contentFilters
            : undefined,
        lastConfigUpdate: new Date(),
      }

      await onSave(feed.id, updateData)
      onClose()
    } catch (error) {
      console.error('Failed to save feed settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addKeyword = () => {
    if (
      newKeyword.trim() &&
      !formData.keywordFilters.includes(newKeyword.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        keywordFilters: [...prev.keywordFilters, newKeyword.trim()],
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywordFilters: prev.keywordFilters.filter((k) => k !== keyword),
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Feed Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {feed.title || feed.url}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Update Frequency */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">
                Update Frequency
              </label>
              <select
                value={formData.updateFrequency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    updateFrequency: e.target.value as
                      | 'manual'
                      | 'hourly'
                      | 'daily'
                      | 'weekly',
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="manual">Manual (no automatic updates)</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p className="text-xs text-gray-500">
                How often this feed should be checked for new content
              </p>
            </div>

            {/* Keyword Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">
                Keyword Filters
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add keyword filter..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  type="button"
                  onClick={addKeyword}
                  disabled={!newKeyword.trim()}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {formData.keywordFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.keywordFilters.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Only include content that contains these keywords (leave empty
                for no filtering)
              </p>
            </div>

            {/* Content Type Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">
                Content Type Filters
              </label>
              <div className="space-y-2">
                {[
                  { key: 'text', label: 'Text Content' },
                  { key: 'images', label: 'Images' },
                  { key: 'videos', label: 'Videos' },
                  { key: 'links', label: 'External Links' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contentFilters[key] || false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contentFilters: {
                            ...prev.contentFilters,
                            [key]: e.target.checked,
                          },
                        }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Filter content based on media types (experimental feature)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
