import React, { useState, useEffect } from 'react'
import { z } from 'zod'

interface UserProfile {
  id: string
  email: string
  name?: string
  bio?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

interface UserProfileProps {
  userId: string
  onUpdate?: (user: UserProfile) => void
  onError?: (error: string) => void
}

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  bio: z.string().max(500, 'Bio is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional().or(z.literal(''))
})

export function UserProfile({ userId, onUpdate, onError }: UserProfileProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/profile?userId=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to load user profile')
      }

      const data = await response.json()
      setUser(data.user)
      setFormData({
        name: data.user.name || '',
        bio: data.user.bio || '',
        avatar: data.user.avatar || ''
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    try {
      profileSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/user/profile?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name || undefined,
          bio: formData.bio || undefined,
          avatar: formData.avatar || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      setUser(data.user)
      onUpdate?.(data.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      onError?.(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load user profile</p>
        <button
          onClick={loadUserProfile}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">User Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling!.classList.remove('hidden')
                }}
              />
            ) : null}
            <div className={`text-2xl text-gray-400 ${formData.avatar ? 'hidden' : ''}`}>
              👤
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => handleInputChange('avatar', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/avatar.jpg"
            />
            {errors.avatar && (
              <p className="mt-1 text-sm text-red-600">{errors.avatar}</p>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </div>

        {/* Account Information */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Member since:</span>
              <p className="text-gray-600">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last updated:</span>
              <p className="text-gray-600">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: user.name || '',
                bio: user.bio || '',
                avatar: user.avatar || ''
              })
              setErrors({})
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}