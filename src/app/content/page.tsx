'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ContentItem {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  style: string
  length: string
  model: string
}

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async (query?: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (query) {
        params.append('q', query)
      }

      const response = await fetch(`/api/content?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load content')
      }

      const data = await response.json()
      setContent(data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadContent(searchQuery)
  }

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete content')
      }

      // Remove from local state
      setContent(prev => prev.filter(item => item.id !== contentId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="ml-3 text-lg text-gray-600 dark:text-gray-300 transition-colors">Loading content...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Content Management</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 transition-colors">
              Create, edit, and organize your AI-generated content
            </p>
          </div>
          <Link href="/content/generate">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Generate New Content
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6 border border-gray-100 dark:border-gray-700 transition-colors">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 transition-colors">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 transition-colors">
                  Error loading content
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400 transition-colors">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
          {content.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4 transition-colors" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 transition-colors">
                No content found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 transition-colors">
                {searchQuery ? 'Try adjusting your search terms.' : 'Get started by generating your first piece of content.'}
              </p>
              <Link href="/content/generate">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Content
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {content.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 transition-colors">
                        {item.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created {formatDate(item.createdAt)}
                        </div>
                        <span className="capitalize">{item.style}</span>
                        <span>{item.length}</span>
                        <span>{item.model}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/content/${item.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/content/${item.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        {content.length > 0 && (
          <div className="mt-6 flex justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
              Showing {content.length} content item{content.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}