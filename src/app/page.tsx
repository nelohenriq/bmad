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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full shadow-lg">
                <Brain className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Transform RSS into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}
                Content Gold
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Neural Feed Studio turns your RSS feeds into engaging blog posts
              and podcasts. AI-powered content creation with your unique voice,
              automated publishing, and intelligent topic discovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow">
                Start Creating Content
              </button>
              <button className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:border-gray-400 transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            From RSS feed to published content in minutes, not hours
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
            <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
              <Rss className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Smart Feed Monitoring
            </h3>
            <p className="text-gray-600 leading-relaxed">
              AI analyzes your RSS feeds in real-time, identifying trending
              topics, emerging stories, and content opportunities you might
              miss.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200">
            <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              AI Content Generation
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Multi-agent AI system crafts blog posts and podcast scripts in
              your unique voice, maintaining consistency across all content.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200">
            <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Automated Publishing
            </h3>
            <p className="text-gray-600 leading-relaxed">
              One-click publishing to your blog, social media, and podcast
              platforms with SEO optimization and source attribution.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-red-200">
            <div className="bg-red-100 p-3 rounded-lg w-fit mb-4">
              <Mic className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Podcast Production
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Generate natural conversation between AI hosts, complete with
              sound effects, music, and professional audio production.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Neural Feed Studio?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Built for content creators who want quality over quantity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Zap className="w-10 h-10 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">
                10x Faster Creation
              </h3>
              <p className="text-gray-600">
                Turn RSS research into published content in minutes instead of
                hours. Focus on strategy, not writing.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Shield className="w-10 h-10 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Your Unique Voice</h3>
              <p className="text-gray-600">
                AI learns your writing style and maintains consistency across
                all content, preserving your brand.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="w-10 h-10 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">
                Multi-Platform Ready
              </h3>
              <p className="text-gray-600">
                Publish simultaneously to blogs, podcasts, social media, and
                newsletters with platform-optimized formatting.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <BarChart3 className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">
                Data-Driven Insights
              </h3>
              <p className="text-gray-600">
                Track what content performs best and get AI recommendations for
                future topics based on your audience.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <Brain className="w-10 h-10 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-gray-600">
                Local AI processing keeps your content and data private. No
                cloud uploads or third-party access.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <FileText className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Source Attribution</h3>
              <p className="text-gray-600">
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
          <p className="text-blue-100 mb-8 text-lg">
            Join content creators who are publishing 10x faster with AI
            assistance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
