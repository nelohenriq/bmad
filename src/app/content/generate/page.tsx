'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Brain, Loader2, FileText, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TrendingTopics from '@/components/TrendingTopics'

interface GenerationOptions {
  topic: string
  style: 'professional' | 'casual' | 'technical' | 'creative'
  length: 'short' | 'medium' | 'long'
  includeSources: boolean
}

export default function ContentGenerationPage() {
  const [options, setOptions] = useState<GenerationOptions>({
    topic: '',
    style: 'professional',
    length: 'medium',
    includeSources: true,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [savedContentId, setSavedContentId] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!options.topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setIsGenerating(true)
    setError('')
    setGeneratedContent('')

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`)
      }

      const data = await response.json()
      setGeneratedContent(data.content)

      // Get model info
      const modelResponse = await fetch('/api/ai/generate')
      const modelData = await modelResponse.json()
      const modelName = modelData.model?.name || 'llama3.2:3b'

      // Save the generated content to the database
      try {
        const saveResponse = await fetch('/api/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: options.topic,
            content: data.content,
            style: options.style,
            length: options.length,
            model: modelName,
            prompt: options.topic,
          }),
        })

        if (saveResponse.ok) {
          const saveData = await saveResponse.json()
          setSavedContentId(saveData.data.id)
        } else {
          console.warn('Failed to save content to database')
        }
      } catch (saveError) {
        console.warn('Error saving content:', saveError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTopicSelect = (topic: string) => {
    setOptions(prev => ({ ...prev, topic }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center transition-colors">
            <Brain className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
            AI Content Generation
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 transition-colors">
            Generate high-quality blog content using AI assistance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="space-y-6">
            <div>
              <label
                htmlFor="topic"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors"
              >
                Topic
              </label>
              <input
                type="text"
                id="topic"
                value={options.topic}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, topic: e.target.value }))
                }
                placeholder="Enter your blog topic..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="style"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors"
                >
                  Writing Style
                </label>
                <select
                  id="style"
                  value={options.style}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      style: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="creative">Creative</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="length"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors"
                >
                  Content Length
                </label>
                <select
                  id="length"
                  value={options.length}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      length: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                >
                  <option value="short">Short (800-1200 words)</option>
                  <option value="medium">Medium (1500-2500 words)</option>
                  <option value="long">Long (3000+ words)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeSources"
                  checked={options.includeSources}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeSources: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded transition-colors"
                />
                <label
                  htmlFor="includeSources"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Include sources
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Content
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4 transition-colors">
                <p className="text-red-800 dark:text-red-300 transition-colors">{error}</p>
              </div>
            )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <TrendingTopics onTopicSelect={handleTopicSelect} />
          </div>
        </div>

        {generatedContent && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors">Generated Content</h2>
              {savedContentId && (
                <Link href={`/content/${savedContentId}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Saved Content
                  </Button>
                </Link>
              )}
            </div>
            {savedContentId && (
              <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4 transition-colors">
                <p className="text-green-800 dark:text-green-300 text-sm transition-colors">
                  ✓ Content saved successfully! You can view it in the Content Management section.
                </p>
              </div>
            )}
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
                {generatedContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
