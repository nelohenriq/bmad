import React, { useState, useEffect } from 'react'

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
  const [newPreference, setNewPreference] = useState({
    key: '',
    value: '',
    category: 'ui',
    type: 'string' as const
  })

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
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
  }

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

  const renderPreferenceInput = (item: PreferenceItem, isEditing: boolean = false) => {
    const [editValue, setEditValue] = useState(formatPreferenceValue(item.value))
    const [editType, setEditType] = useState(item.type)

    if (!isEditing) {
      return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">{item.key.split('.').pop()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {item.type} • {formatPreferenceValue(item.value)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {/* Edit logic */}}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => deletePreference(item.key)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="p-3 border rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={editType === 'json' ? 3 : 1}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Enter ${editType} value`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => {/* Cancel edit */}}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const value = parsePreferenceValue(editValue, editType)
              savePreference(item.key, value, item.category)
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading preferences...</span>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6" id="preferences-heading">User Preferences</h2>

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
            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              activeCategory === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="text-center py-8 text-gray-500">
            No preferences set for {PREFERENCE_CATEGORIES[activeCategory as keyof typeof PREFERENCE_CATEGORIES]}
          </div>
        )}
      </div>

      {/* Add New Preference */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Add New Preference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={newPreference.category}
              onChange={(e) => setNewPreference(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(PREFERENCE_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key
            </label>
            <input
              type="text"
              value={newPreference.key}
              onChange={(e) => setNewPreference(prev => ({ ...prev, key: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="preference.key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={newPreference.type}
              onChange={(e) => setNewPreference(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="text"
              value={newPreference.value}
              onChange={(e) => setNewPreference(prev => ({ ...prev, value: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter value"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleAddPreference}
            disabled={!newPreference.key.trim() || saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Preference'}
          </button>
        </div>
      </div>
    </div>
  )
}