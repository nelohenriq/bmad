'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Eye, Tag, X, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { toast } from '@/lib/hooks/useToast'
import Link from 'next/link'

interface ContentItem {
  id: string
  title: string
  content: string
  type: string
  tags: string[]
  wordCount: number
  createdAt: string
  updatedAt: string
}

export default function ContentEditPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const loadContent = useCallback(async (id: string) => {
    try {
      setLoading(true)
      // Use the same API call as the list page that works
      const result = await apiClient.get('/api/content?limit=100')

      if (result.success && result.data) {
        const contentData = Array.isArray((result.data as any).data) ? (result.data as any).data : []
        const foundContent = contentData.find((item: ContentItem) => item.id === id)

        if (foundContent) {
          setContent(foundContent)
          setEditedTitle(foundContent.title)
          setEditedContent(foundContent.content)
          setEditedTags(foundContent.tags || [])
          setWordCount(foundContent.wordCount)
        } else {
          toast({
            title: 'Content not found',
            description: 'The requested content could not be found.',
            variant: 'destructive'
          })
          router.push('/content/list')
        }
      } else {
        toast({
          title: 'Failed to load content',
          description: 'Could not retrieve content data.',
          variant: 'destructive'
        })
        router.push('/content/list')
      }
    } catch (error) {
      console.error('Error loading content:', error)
      toast({
        title: 'Error',
        description: 'Failed to load content.',
        variant: 'destructive'
      })
      router.push('/content/list')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (params.id) {
      loadContent(params.id as string)
    }
  }, [params.id, loadContent])

  const handleSave = async () => {
    if (!content) return

    try {
      setSaving(true)

      const result = await apiClient.put(`/api/content/${content.id}`, {
        title: editedTitle,
        content: editedContent,
        type: content.type,
        tags: editedTags,
        wordCount,
      })

      if (result.success) {
        toast({
          title: 'Content updated',
          description: 'Your content has been saved successfully.',
        })
        router.push(`/content/${content.id}`)
      } else {
        throw new Error(result.error || 'Failed to save content')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      toast({
        title: 'Save failed',
        description: 'Failed to save your changes.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const updateWordCount = (content: string) => {
    const count = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(count)
  }

  const handleContentChange = (value: string) => {
    setEditedContent(value)
    updateWordCount(value)
  }

  const handleDelete = async () => {
    if (!content) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${content.title}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setDeleting(true)
      const result = await apiClient.delete(`/api/content/${content.id}`)

      if (result.success) {
        toast({
          title: 'Content deleted',
          description: 'The content has been permanently deleted.',
        })
        router.push('/content/list')
      } else {
        throw new Error(result.error || 'Failed to delete content')
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the content.',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3 text-lg text-muted-foreground">Loading content...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Content Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The content you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link href="/content/list">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content List
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link href={`/content/${content.id}`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to View
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href={`/content/${content.id}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Edit Content
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Make changes to your content below.
          </p>
        </div>

        {/* Edit Form */}
        <div className="space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Enter content title..."
                className="text-lg"
              />
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter your content..."
                className="min-h-96 font-mono text-sm"
              />
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {wordCount} words
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button onClick={addTag} variant="outline">
                  <Tag className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {editedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editedTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata Display */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                  <Badge variant="outline" className="ml-2">{content.type}</Badge>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {content.createdAt ? new Date(content.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}