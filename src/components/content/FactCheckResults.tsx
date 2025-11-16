'use client'

import React, { useState, useEffect } from 'react'
import { FactCheckResult, FactCheckReview } from '@/types/voice-consistency'

interface FactCheckResultsProps {
  contentId: string
}

export function FactCheckResults({ contentId }: FactCheckResultsProps) {
  const [results, setResults] = useState<FactCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFactCheckResults()
  }, [contentId])

  const loadFactCheckResults = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/content/${contentId}/fact-check`)
      if (!response.ok) {
        throw new Error('Failed to load fact check results')
      }
      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (resultId: string, verification: 'verified' | 'questionable' | 'inconsistent', notes?: string) => {
    try {
      const response = await fetch(`/api/content/${contentId}/fact-check/${resultId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verification,
          notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update fact check result')
      }

      // Reload results to show updated status
      await loadFactCheckResults()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const getVerificationColor = (verification: string) => {
    switch (verification) {
      case 'verified': return 'text-green-600 bg-green-50'
      case 'questionable': return 'text-yellow-600 bg-yellow-50'
      case 'inconsistent': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading fact check results: {error}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No fact check results available. Run fact checking first.
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Fact Check Results</h3>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-2">Claim: {result.claim}</p>
                <p className="text-sm text-gray-600 mb-2">
                  Source: <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {result.sourceUrl}
                  </a>
                </p>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getVerificationColor(result.verification)}`}>
                  {result.verification} ({Math.round(result.confidence * 100)}% confidence)
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3">{result.explanation}</p>

            {result.suggestedCorrection && (
              <div className="bg-blue-50 p-3 rounded mb-3">
                <p className="text-sm font-medium text-blue-900">Suggested Correction:</p>
                <p className="text-sm text-blue-800">{result.suggestedCorrection}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleReview(result.id, 'verified')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Mark Verified
              </button>
              <button
                onClick={() => handleReview(result.id, 'questionable')}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Mark Questionable
              </button>
              <button
                onClick={() => handleReview(result.id, 'inconsistent')}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Mark Inconsistent
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}