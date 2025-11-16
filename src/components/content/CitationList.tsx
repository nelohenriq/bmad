'use client'

import React, { useState, useEffect } from 'react'

interface Citation {
  id: string
  contentId: string
  sourceUrl: string
  title?: string
  accessDate: Date
  citationStyle: string
  formattedCitation: string
}

interface CitationListProps {
  contentId: string
}

export function CitationList({ contentId }: CitationListProps) {
  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCitations()
  }, [contentId])

  const loadCitations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/content/${contentId}/citations`)
      if (!response.ok) {
        throw new Error('Failed to load citations')
      }
      const data = await response.json()
      setCitations(data.citations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const generateCitations = async (style: 'APA' | 'MLA' | 'Chicago' = 'APA') => {
    try {
      const response = await fetch(`/api/content/${contentId}/citations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sources: [], // Will use content sources
          style
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate citations')
      }

      await loadCitations() // Reload citations
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading citations: {error}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Citations</h3>
        <div className="flex gap-2">
          <button
            onClick={() => generateCitations('APA')}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Generate APA
          </button>
          <button
            onClick={() => generateCitations('MLA')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Generate MLA
          </button>
          <button
            onClick={() => generateCitations('Chicago')}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            Generate Chicago
          </button>
        </div>
      </div>

      {citations.length === 0 ? (
        <p className="text-gray-500">No citations generated yet. Click a button above to generate citations.</p>
      ) : (
        <div className="space-y-3">
          {citations.map((citation, index) => (
            <div key={citation.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">[{index + 1}]</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      citation.citationStyle === 'APA' ? 'bg-blue-100 text-blue-800' :
                      citation.citationStyle === 'MLA' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {citation.citationStyle}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{citation.formattedCitation}</p>
                  <p className="text-xs text-gray-500">
                    Source: <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {citation.sourceUrl}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}