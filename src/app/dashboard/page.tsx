import { Brain, FileText, Settings, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Neural Feed Studio Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            AI-Powered Content Creation Control Center
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/content/generate" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Brain className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Generate Content</h3>
              <p className="text-gray-600 text-sm">
                Create blog posts with AI assistance
              </p>
            </div>
          </Link>

          <Link href="/content/manage" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <FileText className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Manage Content</h3>
              <p className="text-gray-600 text-sm">
                Edit and organize your content
              </p>
            </div>
          </Link>

          <Link href="/feeds" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Settings className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">RSS Feeds</h3>
              <p className="text-gray-600 text-sm">
                Configure and monitor RSS sources
              </p>
            </div>
          </Link>

          <Link href="/analytics" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <BarChart3 className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600 text-sm">Track content performance</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  AI integration setup completed
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  Application framework initialized
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  Project setup and tooling configured
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Service</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Database</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Pending
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">RSS Feeds</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  Not Configured
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
