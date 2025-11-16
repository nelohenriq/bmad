import React, { useState, useEffect } from 'react'

interface PublishingJob {
  id?: string
  contentId: string
  platformId: string
  platformConfig: {
    id?: string
    name: string
    platform: 'wordpress' | 'medium' | 'blogger'
  }
  status: 'queued' | 'processing' | 'published' | 'failed'
  scheduledAt?: Date
  publishedAt?: Date
  error?: string
  platformPostId?: string
  platformUrl?: string
}

interface PublishingQueueProps {
  contentId?: string
}

export function PublishingQueue({ contentId }: PublishingQueueProps) {
  const [jobs, setJobs] = useState<PublishingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (contentId) {
      fetchJobs()
    } else {
      setLoading(false)
    }
  }, [contentId])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/publishing/jobs?contentId=${contentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch publishing jobs')
      }

      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: PublishingJob['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: PublishingJob['status']) => {
    switch (status) {
      case 'queued':
        return '⏳'
      case 'processing':
        return '🔄'
      case 'published':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not scheduled'
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
        <span className="ml-2 text-gray-600">Loading publishing queue...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Publishing Queue</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchJobs}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Publishing Jobs</h3>
        <p className="text-gray-500">
          {contentId 
            ? 'No publishing jobs found for this content.' 
            : 'Select content to view its publishing history.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Publishing Queue</h2>
        <p className="text-sm text-gray-500">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {jobs.map((job, index) => (
            <li key={job.id || index} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-xl">{getStatusIcon(job.status)}</span>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {job.platformConfig.name}
                      </p>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">
                        {job.platformConfig.platform}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Content ID: {job.contentId}
                    </p>
                    {job.scheduledAt && (
                      <p className="text-sm text-gray-500">
                        Scheduled: {formatDate(job.scheduledAt)}
                      </p>
                    )}
                    {job.publishedAt && (
                      <p className="text-sm text-green-600">
                        Published: {formatDate(job.publishedAt)}
                      </p>
                    )}
                    {job.platformUrl && (
                      <a
                        href={job.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View on platform →
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                  
                  {job.error && (
                    <div className="text-xs text-red-600 max-w-xs truncate" title={job.error}>
                      Error: {job.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress indicator for processing jobs */}
              {job.status === 'processing' && (
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Publishing in progress...</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Queue Summary */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Queued: {jobs.filter(j => j.status === 'queued').length} |
            Processing: {jobs.filter(j => j.status === 'processing').length} |
            Published: {jobs.filter(j => j.status === 'published').length} |
            Failed: {jobs.filter(j => j.status === 'failed').length}
          </span>
          <button
            onClick={fetchJobs}
            className="text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
