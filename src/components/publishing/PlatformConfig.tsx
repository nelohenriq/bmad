import React, { useState } from 'react'

interface PlatformConfigProps {
  platform?: {
    id?: string
    name: string
    platform: 'wordpress' | 'medium' | 'blogger'
    credentials: {
      apiKey?: string
      username?: string
      password?: string
      siteUrl?: string
      blogId?: string
    }
    settings: {
      defaultTags?: string[]
      defaultCategory?: string
      publishImmediately?: boolean
      format?: 'markdown' | 'html'
    }
    isActive: boolean
  }
  onSave: (config: any) => void
  onCancel: () => void
}

export function PlatformConfig({ platform, onSave, onCancel }: PlatformConfigProps) {
  const [formData, setFormData] = useState({
    name: platform?.name || '',
    platform: platform?.platform || 'wordpress',
    credentials: {
      apiKey: platform?.credentials.apiKey || '',
      username: platform?.credentials.username || '',
      password: platform?.credentials.password || '',
      siteUrl: platform?.credentials.siteUrl || '',
      blogId: platform?.credentials.blogId || ''
    },
    settings: {
      defaultTags: platform?.settings.defaultTags || [],
      defaultCategory: platform?.settings.defaultCategory || 'General',
      publishImmediately: platform?.settings.publishImmediately ?? true,
      format: platform?.settings.format || 'html'
    },
    isActive: platform?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleTagChange = (tagIndex: number, value: string) => {
    const newTags = [...formData.settings.defaultTags!]
    newTags[tagIndex] = value
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        defaultTags: newTags
      }
    })
  }

  const addTag = () => {
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        defaultTags: [...(formData.settings.defaultTags || []), '']
      }
    })
  }

  const removeTag = (tagIndex: number) => {
    const newTags = formData.settings.defaultTags?.filter((_, i) => i !== tagIndex) || []
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        defaultTags: newTags
      }
    })
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        {platform ? 'Edit Platform' : 'Add Platform'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform Type
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="wordpress">WordPress</option>
              <option value="medium">Medium</option>
              <option value="blogger">Blogger</option>
            </select>
          </div>
        </div>

        {/* Platform-specific credentials */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.platform === 'wordpress' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WordPress Site URL
                  </label>
                  <input
                    type="url"
                    value={formData.credentials.siteUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, siteUrl: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.credentials.username}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, username: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password / API Key
                  </label>
                  <input
                    type="password"
                    value={formData.credentials.password}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, password: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            {formData.platform === 'medium' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medium API Key
                </label>
                <input
                  type="text"
                  value={formData.credentials.apiKey}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, apiKey: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Medium API key"
                />
              </div>
            )}
            
            {formData.platform === 'blogger' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blog ID
                  </label>
                  <input
                    type="text"
                    value={formData.credentials.blogId}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, blogId: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={formData.credentials.apiKey}
                    onChange={(e) => setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, apiKey: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Publishing Settings */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Publishing Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Category
              </label>
              <input
                type="text"
                value={formData.settings.defaultCategory}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, defaultCategory: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Format
              </label>
              <select
                value={formData.settings.format}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, format: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="html">HTML</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Tags
              </label>
              <div className="space-y-2">
                {(formData.settings.defaultTags || []).map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Tag ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 text-blue-600 hover:text-blue-800"
                >
                  + Add Tag
                </button>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.settings.publishImmediately}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, publishImmediately: e.target.checked }
                  })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Publish immediately by default</span>
              </label>
            </div>
          </div>
        </div>

        {/* Platform Status */}
        <div className="border-t pt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Active platform</span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {platform ? 'Update Platform' : 'Add Platform'}
          </button>
        </div>
      </form>
    </div>
  )
}
