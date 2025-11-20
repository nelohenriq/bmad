import {
  Brain,
  FileText,
  Settings,
  BarChart3,
  ArrowUpRight,
  Activity,
  Database,
  Rss,
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
            Neural Feed Studio Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 transition-colors">
            AI-Powered Content Creation Control Center
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +12% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-colors">Total Content</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 transition-colors">1,234</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +5% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-colors">
              AI Generations
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 transition-colors">856</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg">
                <Rss className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-gray-400 flex items-center text-sm font-medium">
                0% <Activity className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-colors">Active Feeds</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 transition-colors">12</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +24% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-colors">Engagement</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 transition-colors">45.2k</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/content/generate" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Generate Content</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                Create blog posts with AI assistance
              </p>
            </div>
          </Link>

          <Link href="/content/manage" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Manage Content</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                Edit and organize your content
              </p>
            </div>
          </Link>

          <Link href="/feeds" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">RSS Feeds</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                Configure and monitor RSS sources
              </p>
            </div>
          </Link>

          <Link href="/analytics" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">Track content performance</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  AI integration setup completed
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  Application framework initialized
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  Project setup and tooling configured
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 transition-colors">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors">AI Service</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs rounded-full transition-colors">
                  Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Database</span>
                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 text-xs rounded-full transition-colors">
                  Pending
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors">RSS Feeds</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs rounded-full transition-colors">
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
