'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Settings, Eye, Zap, FileText, Calendar, Tag, Edit } from 'lucide-react'
import { ModeSelection } from '@/components/generation/ModeSelection'
import { RagToggle } from '@/components/generation/RagToggle'
import { RetrievalResults, RetrievalResult } from '@/components/generation/RetrievalResults'
import { ProcessingStatus } from '@/components/generation/ProcessingStatus'

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  duration?: number
  message?: string
}
import { RagConfigPanel } from '@/components/generation/RagConfigPanel'
import { apiClient } from '@/lib/api/client'
import { toast } from '@/lib/hooks/useToast'
import Link from 'next/link'

// Import the service interface
interface GenerationMode {
  id: string
  name: string
  description: string
  performanceProfile: {
    expectedTokens: number
    processingTimeMs: number
    qualityPriority: 'speed' | 'balance' | 'quality'
  }
}


interface ContentItem {
  id: string
  title: string
  content: string
  type: string
  tags: string[]
  wordCount: number
  createdAt: string
  updatedAt: string
}

export default function ContentGenerationPage() {
  const [topic, setTopic] = useState('')
  const [selectedMode, setSelectedMode] = useState<string>('')
  const [ragEnabled, setRagEnabled] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [retrievalResults, setRetrievalResults] = useState<RetrievalResult[]>([])
  const [showRagConfig, setShowRagConfig] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [processingPhase, setProcessingPhase] = useState<'retrieval' | 'generation' | 'complete' | 'error'>('retrieval')
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [modes, setModes] = useState<GenerationMode[]>([])
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [loadingContent, setLoadingContent] = useState(false)

  // Load available modes on mount
  useEffect(() => {
    loadModes()
    loadRecentContent()
  }, [])

  const loadModes = async () => {
    try {
      const result = await apiClient.get('/api/generate/modes')
      if (result.success && result.data && (result.data as any).data) {
        const modesArray = Array.isArray((result.data as any).data) ? (result.data as any).data : []
        setModes(modesArray)
      } else {
        console.error('API call failed or returned no data')
        // Fallback to basic modes if API fails
        setModes([
          {
            id: 'creative-writing',
            name: 'Creative Writing',
            description: 'Generate engaging, creative content',
            performanceProfile: {
              expectedTokens: 1200,
              processingTimeMs: 8000,
              qualityPriority: 'quality'
            }
          },
          {
            id: 'factual-summary',
            name: 'Factual Summary',
            description: 'Generate accurate, concise summaries',
            performanceProfile: {
              expectedTokens: 600,
              processingTimeMs: 4000,
              qualityPriority: 'balance'
            }
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load modes:', error)
      // Fallback to basic modes if API fails
      setModes([
        {
          id: 'creative-writing',
          name: 'Creative Writing',
          description: 'Generate engaging, creative content',
          performanceProfile: {
            expectedTokens: 1200,
            processingTimeMs: 8000,
            qualityPriority: 'quality'
          }
        },
        {
          id: 'factual-summary',
          name: 'Factual Summary',
          description: 'Generate accurate, concise summaries',
          performanceProfile: {
            expectedTokens: 600,
            processingTimeMs: 4000,
            qualityPriority: 'balance'
          }
        }
      ])
    }
  }

  const loadRecentContent = async () => {
    try {
      setLoadingContent(true)
      const result = await apiClient.get('/api/content?limit=5')

      if (result.success && result.data) {
        const contentData = Array.isArray((result.data as any).data) ? (result.data as any).data : []
        setRecentContent(contentData)
      } else {
        console.error('Failed to load recent content:', result.error)
      }
    } catch (error) {
      console.error('Error loading recent content:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  const updateProcessingStep = (stepId: string, updates: Partial<ProcessingStep>) => {
    setProcessingSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ))
  }

  const initializeProcessingSteps = (useRag: boolean) => {
    const baseSteps: ProcessingStep[] = [
      { id: 'init', label: 'Initializing', status: 'pending' },
      { id: 'validate', label: 'Validating input', status: 'pending' },
    ]

    const ragSteps: ProcessingStep[] = useRag ? [
      { id: 'embed-query', label: 'Generating query embedding', status: 'pending' },
      { id: 'search-vector', label: 'Searching vector database', status: 'pending' },
      { id: 'retrieve-results', label: 'Retrieving relevant content', status: 'pending' },
    ] : []

    const finalSteps: ProcessingStep[] = [
      { id: 'generate-content', label: 'Generating content with AI', status: 'pending' },
      { id: 'save-content', label: 'Saving generated content', status: 'pending' },
    ]

    return [...baseSteps, ...ragSteps, ...finalSteps]
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: 'Topic Required',
        description: 'Please enter a topic for content generation.',
        variant: 'destructive'
      })
      return
    }

    // Initialize processing steps
    const steps = initializeProcessingSteps(ragEnabled)
    setProcessingSteps(steps)
    setIsGenerating(true)
    setProcessingStep('Starting content generation...')
    setProcessingPhase('retrieval')

    const startTime = Date.now()

    try {
      // Step 1: Initialize
      updateProcessingStep('init', { status: 'active' })
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UI feedback
      updateProcessingStep('init', { status: 'completed', duration: Date.now() - startTime })

      // Step 2: Validate input
      updateProcessingStep('validate', { status: 'active' })
      // Validation already done above
      updateProcessingStep('validate', { status: 'completed', duration: Date.now() - startTime })

      let retrievalData = null

      // RAG Steps
      if (ragEnabled) {
        // Step 3: Generate query embedding
        updateProcessingStep('embed-query', { status: 'active' })
        // Embedding generation happens inside the search API
        updateProcessingStep('embed-query', { status: 'completed', duration: Date.now() - startTime })

        // Step 4: Search vector database
        updateProcessingStep('search-vector', { status: 'active' })
        const retrievalResult = await apiClient.post('/api/search/hybrid', {
          query: topic,
          limit: 10
        })

        if (retrievalResult.success) {
          setRetrievalResults((retrievalResult.data as any).results || [])
          retrievalData = retrievalResult.data as any
          updateProcessingStep('search-vector', { status: 'completed', duration: Date.now() - startTime })
        } else {
          updateProcessingStep('search-vector', { status: 'error', message: 'Search failed' })
          throw new Error('Vector search failed')
        }

        // Step 5: Retrieve results
        updateProcessingStep('retrieve-results', { status: 'active' })
        // Results already retrieved above
        updateProcessingStep('retrieve-results', { status: 'completed', duration: Date.now() - startTime })
      }

      // Step 6: Generate content
      updateProcessingStep('generate-content', { status: 'active' })
      setProcessingStep('Generating content with AI...')
      setProcessingPhase('generation')

      const generationResult = await apiClient.post('/api/ai/generate', {
        topic,
        mode: selectedMode,
        ragEnabled,
        retrievalData
      })

      if (generationResult.success) {
        const content = (generationResult.data as any).content || ''
        setGeneratedContent(content)
        updateProcessingStep('generate-content', { status: 'completed', duration: Date.now() - startTime })

        // Step 7: Save content
        updateProcessingStep('save-content', { status: 'active' })
        setProcessingStep('Saving generated content...')

        const saveResult = await apiClient.post('/api/content', {
          title: `Generated: ${topic}`,
          content: content,
          type: 'generated',
          tags: ['ai-generated', selectedMode],
          wordCount: content.split(' ').length,
          sources: [] // Could add retrieved sources here
        })

        if (saveResult.success) {
          updateProcessingStep('save-content', { status: 'completed', duration: Date.now() - startTime })
          setProcessingStep('Generation complete!')
          setProcessingPhase('complete')
          toast({
            title: 'Content Generated & Saved',
            description: 'Your content has been generated and saved successfully.',
          })
          // Refresh recent content
          loadRecentContent()
        } else {
          updateProcessingStep('save-content', { status: 'error', message: 'Save failed' })
          console.warn('Content generated but not saved:', saveResult.error)
          toast({
            title: 'Content Generated',
            description: 'Content was generated but could not be saved.',
            variant: 'destructive'
          })
        }
      } else {
        updateProcessingStep('generate-content', { status: 'error', message: 'Generation failed' })
        throw new Error(generationResult.error || 'Generation failed')
      }

    } catch (error) {
      console.error('Generation failed:', error)
      setProcessingStep('Generation failed')
      setProcessingPhase('error')

      // Mark current active step as error
      const activeStep = processingSteps.find(s => s.status === 'active')
      if (activeStep) {
        updateProcessingStep(activeStep.id, { status: 'error', message: (error as Error).message })
      }

      toast({
        title: 'Generation Failed',
        description: 'An error occurred during content generation.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
      setProcessingStep('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Content Generation
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Generate high-quality content using AI with optional RAG enhancement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Topic Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic or Prompt
                  </label>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter your content topic or detailed prompt..."
                    className="min-h-24"
                    disabled={isGenerating}
                  />
                </div>

                {/* Mode Selection */}
                <ModeSelection
                  modes={modes}
                  selectedMode={selectedMode}
                  onModeChange={setSelectedMode}
                  disabled={isGenerating}
                />

                {/* RAG Toggle */}
                <RagToggle
                  enabled={ragEnabled}
                  onToggle={setRagEnabled}
                  disabled={isGenerating}
                />

                {/* RAG Configuration */}
                {ragEnabled && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRagConfig(!showRagConfig)}
                      disabled={isGenerating}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      RAG Settings
                    </Button>
                    {showRagConfig && (
                      <Badge variant="secondary">Configured</Badge>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim() || !selectedMode}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Generated Content */}
            {recentContent.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Recent Generated Content
                    </CardTitle>
                    <Link href="/content/list">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentContent.slice(0, 4).map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm line-clamp-2">{item.title}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleDateString()}
                            <span>•</span>
                            {item.wordCount} words
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {item.content}
                          </p>
                          <div className="flex gap-2">
                            <Link href={`/content/${item.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/content/${item.id}/edit`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isGenerating && (
              <ProcessingStatus
                message={processingStep}
                phase={processingPhase}
                steps={processingSteps}
                startTime={isGenerating ? new Date() : undefined}
              />
            )}

            {/* Generated Content */}
            {generatedContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Generated Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{generatedContent}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RAG Configuration Panel */}
            {ragEnabled && showRagConfig && (
              <RagConfigPanel />
            )}

            {/* Retrieval Results */}
            {ragEnabled && retrievalResults.length > 0 && (
              <RetrievalResults results={retrievalResults} />
            )}

            {/* Help/Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p>
                  <strong>RAG Mode:</strong> Retrieves relevant content from your RSS feeds before generation for more accurate and contextual results.
                </p>
                <p>
                  <strong>Generation Modes:</strong> Choose different AI strategies optimized for various content types and quality requirements.
                </p>
                <p>
                  <strong>Hybrid Search:</strong> Combines semantic and keyword search for optimal content retrieval.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}