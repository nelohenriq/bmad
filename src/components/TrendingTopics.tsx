'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'

interface TrendingTopic {
  name: string
  category?: string
  frequency: number
}

interface TrendingTopicsProps {
  onTopicSelect: (topic: string) => void
  className?: string
}

export default function TrendingTopics({ onTopicSelect, className = '' }: TrendingTopicsProps) {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/rss/trending')

        if (!response.ok) {
          throw new Error('Failed to fetch trending topics')
        }

        const data = await response.json()
        setTrendingTopics(data.trendingTopics || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trending topics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrendingTopics()
  }, [])

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading trending topics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (trendingTopics.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">No trending topics available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex items-center mb-3">
        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Trending Topics from RSS Feeds</h3>
      </div>

      <div className="space-y-2">
        {trendingTopics.slice(0, 5).map((topic, index) => (
          <button
            key={index}
            onClick={() => onTopicSelect(topic.name)}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {topic.name}
              </span>
              <div className="flex items-center space-x-2">
                {topic.category && (
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                    {topic.category}
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {topic.frequency} mentions
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {trendingTopics.length > 5 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Showing top 5 of {trendingTopics.length} trending topics
        </p>
      )}
    </div>
  )
}