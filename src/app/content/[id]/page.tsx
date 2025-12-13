'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Calendar, FileText, Tag, Clock, User, Trash2, Download } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { toast } from '@/lib/hooks/useToast'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

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

export default function ContentViewPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
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

  const handleExport = async () => {
    if (!content) return

    try {
      const response = await fetch(`/api/content/${content.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'markdown'
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: 'Export successful',
          description: 'Content exported as Markdown.',
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Error exporting content:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export the content.',
        variant: 'destructive'
      })
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
            <Link href="/content/list">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content List
              </Button>
            </Link>
            <div className="flex gap-2">
               <Link href={`/content/${content.id}/edit`}>
                 <Button variant="outline">
                   <Edit className="w-4 h-4 mr-2" />
                   Edit
                 </Button>
               </Link>
               <Button variant="outline" onClick={handleExport}>
                 <Download className="w-4 h-4 mr-2" />
                 Export MD
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

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {content.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary">{content.type}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {content.createdAt ? new Date(content.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Unknown date'}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {content.wordCount} words
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
                <ReactMarkdown>
                  {content.content}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type:</span>
                <Badge variant="outline">{content.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Word Count:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{content.wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {content.createdAt ? new Date(content.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </CardContent>
          </Card>

          {content.tags && content.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}