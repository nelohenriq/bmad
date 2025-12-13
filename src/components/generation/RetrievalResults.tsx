import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, FileText, Star, ChevronDown, ChevronUp, AlertCircle, Loader2 } from 'lucide-react'

export interface RetrievalResult {
  chunkId: string
  contentId: string
  text: string
  score: number
  metadata: {
    model: string
    generatedAt: string
    chunkIndex: number
    wordCount: number
    charCount: number
  }
  contentInfo?: {
    title: string
    source: string
    publishedAt?: string
  }
  hybridScore?: number
  vectorScore?: number
  keywordScore?: number
  rank?: number
}

interface RetrievalResultsProps {
  results?: RetrievalResult[]
  loading?: boolean
  error?: string | null
}

export const RetrievalResults: React.FC<RetrievalResultsProps> = ({
  results = [],
  loading = false,
  error = null
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleKeyDown = (event: React.KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExpanded(id)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Retrieving relevant content...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to retrieve content: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!results || results.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Retrieved Content ({results.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => {
            const isExpanded = expandedItems.has(result.chunkId)
            const shouldTruncate = result.text.length > 200
            const displayContent = isExpanded || !shouldTruncate
              ? result.text
              : `${result.text.substring(0, 200)}...`

            return (
              <div
                key={result.chunkId}
                className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      <span aria-label={`Relevance score: ${(result.score * 100).toFixed(1)} percent`}>
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    <span>{result.contentInfo?.source || 'Unknown'}</span>
                  </div>
                </div>

                {/* Source Attribution */}
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                  {result.contentInfo?.title && (
                    <div className="font-medium mb-1">{result.contentInfo.title}</div>
                  )}
                  <div className="flex items-center gap-2">
                    {result.contentInfo?.publishedAt && (
                      <span>{new Date(result.contentInfo.publishedAt).toLocaleDateString()}</span>
                    )}
                    {result.contentInfo?.source && result.contentInfo.source.startsWith('http') && (
                      <a
                        href={result.contentInfo.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        aria-label={`View original article: ${result.contentInfo.title || 'Article'}`}
                      >
                        View Source
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {displayContent}
                </div>

                {/* Expand/Collapse Button */}
                {shouldTruncate && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(result.chunkId)}
                      onKeyDown={(e) => handleKeyDown(e, result.chunkId)}
                      className="h-6 px-2 text-xs"
                      aria-expanded={isExpanded}
                      aria-controls={`content-${result.chunkId}`}
                      aria-label={isExpanded ? 'Show less content' : 'Show full content'}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" aria-hidden="true" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" aria-hidden="true" />
                          Show More
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Metadata Info */}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {result.metadata.wordCount} words
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Chunk {result.metadata.chunkIndex}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>RAG Context:</strong> The AI will use these retrieved chunks as context for generating more accurate and relevant content based on your topic.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}