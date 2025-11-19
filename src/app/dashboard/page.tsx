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
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, Demo User</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              </p>
            </div>
          </Link>

          <Link href="/feeds/new" className="group block">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-blue-200">
              <Rss className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-gray-900 text-lg font-semibold mb-2">
                Add RSS Feed
              </h3>
              <p className="text-gray-600 text-sm">
                Connect a new source to monitor trends and generate ideas.
              </p>
            </div>
          </Link>

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
              </div>
            </div>
          </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
