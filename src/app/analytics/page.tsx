'use client'

import React from 'react'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

// For now, using a mock user ID - in real app this would come from auth
const MOCK_USER_ID = 'user-1'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard userId={MOCK_USER_ID} />
      </div>
    </div>
  )
}