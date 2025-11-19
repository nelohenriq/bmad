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
<<<<<<< HEAD
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, Demo User</p>
=======
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
            Neural Feed Studio Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 transition-colors">
            AI-Powered Content Creation Control Center
          </p>
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
<<<<<<< HEAD
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +12% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Total Content</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">1,234</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +5% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">
              AI Generations
            </h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">856</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Rss className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-gray-400 flex items-center text-sm font-medium">
                0% <Activity className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Active Feeds</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-green-500 flex items-center text-sm font-medium">
                +24% <ArrowUpRight className="w-4 h-4 ml-1" />
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Engagement</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">45.2k</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/content/generate" className="group block">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <Brain className="w-8 h-8 text-white mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">
                Generate New Content
              </h3>
              <p className="text-blue-100 text-sm">
                Create high-quality blog posts and articles using advanced AI
                models.
=======
          <Link href="/content/generate" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Generate Content</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                Create blog posts with AI assistance
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
              </p>
            </div>
          </Link>

<<<<<<< HEAD
          <Link href="/feeds/new" className="group block">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-blue-200">
              <Rss className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-gray-900 text-lg font-semibold mb-2">
                Add RSS Feed
              </h3>
              <p className="text-gray-600 text-sm">
                Connect a new source to monitor trends and generate ideas.
=======
          <Link href="/content/manage" className="block">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700">
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">Manage Content</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                Edit and organize your content
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
              </p>
            </div>
          </Link>

<<<<<<< HEAD
          <Link href="/settings" className="group block">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-purple-200">
              <Settings className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-gray-900 text-lg font-semibold mb-2">
                Configure AI
              </h3>
              <p className="text-gray-600 text-sm">
                Fine-tune your AI models, voice, and content preferences.
              </p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">
                    AI Inference Engine
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Database Connection
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Background Jobs
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Processing
                </span>
=======
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
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-900 font-medium">
                      Content Generated: "The Future of AI"
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      2 hours ago • 1,200 words
                    </p>
                  </div>
                </div>
              ))}
=======
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
>>>>>>> 15af963d871800b157ef3afa1374fbeda9414cbe
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
