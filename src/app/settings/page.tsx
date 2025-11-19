'use client'

import React, { useState } from 'react'
import { UserProfile } from '@/components/user/UserProfile'
import { PreferencesPanel } from '@/components/user/PreferencesPanel'
import { User, Settings as SettingsIcon } from 'lucide-react'

// For now, using a mock user ID - in real app this would come from auth
const MOCK_USER_ID = 'user-1'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 transition-colors">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <User className="w-5 h-5 inline mr-2" />
                User Profile
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'preferences'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <SettingsIcon className="w-5 h-5 inline mr-2" />
                Preferences
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 transition-colors">
          {activeTab === 'profile' && (
            <div className="p-6">
              <UserProfile userId={MOCK_USER_ID} />
            </div>
          )}
          {activeTab === 'preferences' && (
            <div className="p-6">
              <PreferencesPanel userId={MOCK_USER_ID} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}