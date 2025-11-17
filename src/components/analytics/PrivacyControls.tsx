import React, { useState, useEffect, useCallback } from 'react'
import { analyticsService } from '@/lib/analytics/analyticsService'

interface AnalyticsPreferences {
  enabled: boolean
  dataRetentionDays: number
  collectDetailedMetrics: boolean
  allowPersonalization: boolean
}

interface PrivacyControlsProps {
  userId: string
  onUpdate?: (preferences: AnalyticsPreferences) => void
  onError?: (error: string) => void
  className?: string
}

export function PrivacyControls({
  userId,
  onUpdate,
  onError,
  className = ''
}: PrivacyControlsProps) {
  const [preferences, setPreferences] = useState<AnalyticsPreferences>({
    enabled: true,
    dataRetentionDays: 90,
    collectDetailedMetrics: true,
    allowPersonalization: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      const prefs = await analyticsService.getAnalyticsPreferences(userId)
      setPreferences(prefs)
      onUpdate?.(prefs)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preferences'
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }, [userId, onUpdate, onError])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const savePreferences = async (newPreferences: Partial<AnalyticsPreferences>) => {
    try {
      setSaving(true)
      const updated = { ...preferences, ...newPreferences }
      await analyticsService.setAnalyticsPreferences(userId, updated)
      setPreferences(updated)
      onUpdate?.(updated)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save preferences'
      onError?.(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteData = async () => {
    if (deleteConfirmText !== 'DELETE ALL DATA') return

    try {
      setSaving(true)
      await analyticsService.clearAnalyticsData(userId)
      setShowDeleteDialog(false)
      setDeleteConfirmText('')
      // Reset preferences to defaults
      const defaultPrefs: AnalyticsPreferences = {
        enabled: false,
        dataRetentionDays: 90,
        collectDetailedMetrics: false,
        allowPersonalization: false
      }
      setPreferences(defaultPrefs)
      onUpdate?.(defaultPrefs)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete data'
      onError?.(message)
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch(`/api/analytics/export?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-data-${userId}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      onError?.(message)
    }
  }

  if (loading) {
    return (
      <div className={`privacy-controls ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading privacy settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`privacy-controls bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Privacy & Data Controls</h2>
        <p className="text-gray-600 mt-1">
          Control how your analytics data is collected and managed
        </p>
      </div>

      <div className="space-y-6">
        {/* Analytics Collection Toggle */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Analytics Collection</h3>
              <p className="text-sm text-gray-600 mt-1">
                Allow Neural Feed Studio to collect anonymous usage analytics to improve your experience
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => savePreferences({ enabled: e.target.checked })}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Detailed Settings */}
        {preferences.enabled && (
          <div className="space-y-6">
            {/* Data Retention */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention Period
              </label>
              <select
                value={preferences.dataRetentionDays}
                onChange={(e) => savePreferences({ dataRetentionDays: parseInt(e.target.value) })}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
                <option value={-1}>Keep forever</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Analytics data older than this period will be automatically deleted
              </p>
            </div>

            {/* Detailed Metrics */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Detailed Metrics</h4>
                <p className="text-sm text-gray-600">
                  Collect detailed performance metrics and usage patterns
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.collectDetailedMetrics}
                  onChange={(e) => savePreferences({ collectDetailedMetrics: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Personalization */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Personalization</h4>
                <p className="text-sm text-gray-600">
                  Use analytics data to personalize your experience and recommendations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.allowPersonalization}
                  onChange={(e) => savePreferences({ allowPersonalization: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Data Management Actions */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>

          <div className="space-y-3">
            {/* Export Data */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Export Your Data</h4>
                <p className="text-sm text-gray-600">
                  Download a copy of all your analytics data
                </p>
              </div>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Export
              </button>
            </div>

            {/* Delete Data */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-red-900">Delete All Data</h4>
                <p className="text-sm text-red-700">
                  Permanently delete all your analytics data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete Data
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium">Your Privacy Matters</p>
              <p className="mt-1">
                All analytics data is stored locally on your device and never shared with external services.
                You have full control over data collection and can delete everything at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Delete All Analytics Data</h3>
              <p className="text-gray-700 mb-4">
                This will permanently delete all your analytics data, including:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
                <li>Usage statistics and metrics</li>
                <li>Content creation history</li>
                <li>AI interaction logs</li>
                <li>Publishing performance data</li>
                <li>All cached analytics information</li>
              </ul>
              <p className="text-sm text-gray-600 mb-4">
                Type <strong>DELETE ALL DATA</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                placeholder="DELETE ALL DATA"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setDeleteConfirmText('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteData}
                  disabled={deleteConfirmText !== 'DELETE ALL DATA' || saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Deleting...' : 'Delete All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}