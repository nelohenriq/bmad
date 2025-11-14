'use client'

import { useState } from 'react'
import { Brain, Loader2, FileText } from 'lucide-react'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 mr-3 text-blue-600" />
            AI Content Generation
          </h1>
          <p className="mt-2 text-gray-600">
            Generate high-quality blog content using AI assistance
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="topic"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="style"
                  className="block text-sm font-medium text-gray-700 mb-2"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="block text-sm font-medium text-gray-700 mb-2"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="includeSources"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Include sources
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>

        {generatedContent && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Content</h2>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {generatedContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
