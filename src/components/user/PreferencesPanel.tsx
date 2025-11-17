import React, { useState, useEffect, useCallback } from 'react'

interface UserPreferences {
  [key: string]: any
}

interface PreferencesPanelProps {
  userId: string
  onUpdate?: (preferences: UserPreferences) => void
  onError?: (error: string) => void
}

interface PreferenceItem {
  key: string
  value: any
  category: string
  type: 'string' | 'number' | 'boolean' | 'json'
}

const PREFERENCE_CATEGORIES = {
  ui: 'User Interface',
  ai: 'AI Settings',
  publishing: 'Publishing',
  privacy: 'Privacy',
  notifications: 'Notifications'
}

export function PreferencesPanel({ userId, onUpdate, onError }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('ui')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editType, setEditType] = useState<'string' | 'number' | 'boolean' | 'json'>('string')
  const [newPreference, setNewPreference] = useState({
    key: '',
    value: '',
    category: 'ui',
    type: 'string' as const
  })

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/preferences?userId=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to load preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences || {})
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }, [userId, onError])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const savePreference = async (key: string, value: any, category: string = 'ui') => {
    try {
      const response = await fetch(`/api/user/preferences?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          value,
          category,
          encrypt: shouldEncrypt(key)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save preference')
      }

      // Update local state
      setPreferences(prev => ({ ...prev, [key]: value }))
      onUpdate?.({ ...preferences, [key]: value })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError?.(message)
    }
  }

  const deletePreference = async (key: string) => {
    try {
      const response = await fetch(`/api/user/preferences?userId=${userId}&key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete preference')
      }

      // Update local state
      const updated = { ...preferences }
      delete updated[key]
      setPreferences(updated)
      onUpdate?.(updated)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError?.(message)
    }
  }

  const shouldEncrypt = (key: string): boolean => {
    const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'key']
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
  }

  const getPreferenceType = (value: any): 'string' | 'number' | 'boolean' | 'json' => {
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'string') return 'string'
    return 'json'
  }

  const parsePreferenceValue = (value: string, type: string): any => {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true'
      case 'number':
        return parseFloat(value) || 0
      case 'json':
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      default:
        return value
    }
  }

  const formatPreferenceValue = (value: any): string => {
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const getPreferencesByCategory = (category: string): PreferenceItem[] => {
    return Object.entries(preferences)
      .filter(([key]) => key.startsWith(`${category}.`))
      .map(([key, value]) => ({
        key,
        value,
        category,
        type: getPreferenceType(value)
      }))
  }

  const handleAddPreference = async () => {
    if (!newPreference.key.trim()) return

    const value = parsePreferenceValue(newPreference.value, newPreference.type)
    await savePreference(newPreference.key, value, newPreference.category)

    setNewPreference({
      key: '',
      value: '',
      category: 'ui',
      type: 'string'
    })
  }

  const startEditing = (item: PreferenceItem) => {
    setEditingKey(item.key)
    setEditValue(formatPreferenceValue(item.value))
    setEditType(item.type)
  }

  const cancelEditing = () => {
    setEditingKey(null)
    setEditValue('')
    setEditType('string')
  }

  const saveEditing = async (item: PreferenceItem) => {
    const value = parsePreferenceValue(editValue, editType)
    await savePreference(item.key, value, item.category)
    cancelEditing()
  }

  const renderPreferenceInput = (item: PreferenceItem) => {
    const isEditing = editingKey === item.key

    if (!isEditing) {
      return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md transition-colors">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 transition-colors">{item.key.split('.').pop()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              {item.type} • {formatPreferenceValue(item.value)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => startEditing(item)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => deletePreference(item.key)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="p-3 border dark:border-gray-600 rounded-md transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Value</label>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={editType === 'json' ? 3 : 1}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              placeholder={`Enter ${editType} value`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={cancelEditing}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => saveEditing(item)}
            className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300 transition-colors">Loading preferences...</span>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 transition-colors" id="preferences-heading">User Preferences</h2>

      {/* Category Tabs */}
      <div
        className="flex flex-wrap gap-2 mb-6"
        role="tablist"
        aria-labelledby="preferences-heading"
      >
        {Object.entries(PREFERENCE_CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 transition-colors ${
              activeCategory === key
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            role="tab"
            aria-selected={activeCategory === key}
            aria-controls={`preferences-panel-${key}`}
            id={`preferences-tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Preferences List */}
      <div
        className="space-y-3 mb-6"
        role="tabpanel"
        aria-labelledby={`preferences-tab-${activeCategory}`}
        id={`preferences-panel-${activeCategory}`}
      >
        {getPreferencesByCategory(activeCategory).map((item) => (
          <div key={item.key}>
            {renderPreferenceInput(item)}
          </div>
        ))}

        {getPreferencesByCategory(activeCategory).length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors">
            No preferences set for {PREFERENCE_CATEGORIES[activeCategory as keyof typeof PREFERENCE_CATEGORIES]}
          </div>
        )}
      </div>

      {/* Add New Preference */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 transition-colors">Add New Preference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
              Category
            </label>
            <select
              value={newPreference.category}
              onChange={(e) => setNewPreference(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              {Object.entries(PREFERENCE_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
              Key
            </label>
            <input
              type="text"
              value={newPreference.key}
              onChange={(e) => setNewPreference(prev => ({ ...prev, key: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              placeholder="preference.key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
              Type
            </label>
            <select
              value={newPreference.type}
              onChange={(e) => setNewPreference(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
              Value
            </label>
            <input
              type="text"
              value={newPreference.value}
              onChange={(e) => setNewPreference(prev => ({ ...prev, value: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              placeholder="Enter value"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleAddPreference}
            disabled={!newPreference.key.trim() || saving}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Adding...' : 'Add Preference'}
          </button>
        </div>
      </div>
    </div>
  )
}