import React, { useState } from 'react'

export interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (format: 'json' | 'csv') => Promise<void>
  userId: string
  loading?: boolean
}

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  userId,
  loading = false
}: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [includeEvents, setIncludeEvents] = useState(true)
  const [includeMetrics, setIncludeMetrics] = useState(true)
  const [dateRange, setDateRange] = useState('all')

  const handleExport = async () => {
    try {
      await onExport(exportFormat)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      // Error handling would be done by parent component
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Export Analytics Data</h2>

          <div className="space-y-4">
            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value as 'json')}
                    className="mr-2"
                  />
                  <span className="text-sm">JSON</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as 'csv')}
                    className="mr-2"
                  />
                  <span className="text-sm">CSV (Coming Soon)</span>
                </label>
              </div>
            </div>

            {/* Data Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Data Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeEvents}
                    onChange={(e) => setIncludeEvents(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Analytics Events</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMetrics}
                    onChange={(e) => setIncludeMetrics(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Calculated Metrics</span>
                </label>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="year">Last Year</option>
                <option value="month">Last 30 Days</option>
                <option value="week">Last 7 Days</option>
              </select>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Privacy Notice</p>
                  <p>Your analytics data will be exported locally. No data is sent to external servers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading || (!includeEvents && !includeMetrics)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick export button component
export function ExportButton({
  onExport,
  userId,
  className = ''
}: {
  onExport: (format: 'json' | 'csv') => Promise<void>
  userId: string
  className?: string
}) {
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true)
    try {
      await onExport(format)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Data
      </button>

      <ExportDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onExport={handleExport}
        userId={userId}
        loading={loading}
      />
    </>
  )
}