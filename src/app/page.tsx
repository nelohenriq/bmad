'use client'

import {
  Brain,
  Rss,
  FileText,
  Mic,
  Zap,
  Shield,
  Users,
  BarChart3,
} from 'lucide-react'
import { toast } from '@/lib/hooks/useToast'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full shadow-lg">
                <Brain className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors">
              Transform RSS into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}
                Content Gold
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8 transition-colors">
              Neural Feed Studio turns your RSS feeds into engaging blog posts
              and podcasts. AI-powered content creation with your unique voice,
              automated publishing, and intelligent topic discovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/content"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow inline-block text-center"
              >
                Start Creating Content
              </a>
              <button
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-semibold hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800"
                onClick={() => toast({
                  title: 'Demo Coming Soon',
                  description: 'A video demo will be available soon. In the meantime, try creating some content!',
                })}
              >
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">
            How It Works
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
            From RSS feed to published content in minutes, not hours
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg w-fit mb-4">
              <Rss className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
              Smart Feed Monitoring
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
              AI analyzes your RSS feeds in real-time, identifying trending
              topics, emerging stories, and content opportunities you might
              miss.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-600">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg w-fit mb-4">
              <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
              AI Content Generation
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
              Multi-agent AI system crafts blog posts and podcast scripts in
              your unique voice, maintaining consistency across all content.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-600">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg w-fit mb-4">
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
              Automated Publishing
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
              One-click publishing to your blog, social media, and podcast
              platforms with SEO optimization and source attribution.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-600">
            <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg w-fit mb-4">
              <Mic className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
              Podcast Production
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
              Generate natural conversation between AI hosts, complete with
              sound effects, music, and professional audio production.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 dark:bg-gray-800 py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 transition-colors">
              Why Choose Neural Feed Studio?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
              Built for content creators who want quality over quantity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <Zap className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
                10x Faster Creation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Turn RSS research into published content in minutes instead of
                hours. Focus on strategy, not writing.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <Shield className="w-10 h-10 text-green-500 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Your Unique Voice</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                AI learns your writing style and maintains consistency across
                all content, preserving your brand.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <Users className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
                Multi-Platform Ready
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Publish simultaneously to blogs, podcasts, social media, and
                newsletters with platform-optimized formatting.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <BarChart3 className="w-10 h-10 text-purple-500 dark:text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">
                Data-Driven Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Track what content performs best and get AI recommendations for
                future topics based on your audience.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <Brain className="w-10 h-10 text-indigo-500 dark:text-indigo-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Privacy First</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Local AI processing keeps your content and data private. No
                cloud uploads or third-party access.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
              <FileText className="w-10 h-10 text-red-500 dark:text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 transition-colors">Source Attribution</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors">
                Automatic citation and linking to original sources builds
                credibility and avoids plagiarism concerns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Content Creation?
          </h2>
          <p className="text-blue-100 dark:text-blue-200 mb-8 text-lg transition-colors">
            Join content creators who are publishing 10x faster with AI
            assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-50 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 dark:hover:bg-gray-100 dark:hover:text-blue-700 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
