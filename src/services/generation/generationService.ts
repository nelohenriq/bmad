import { AssembledContext } from '../context/contextAssemblyService'

export interface GenerationOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
  systemPrompt?: string
  userPrompt?: string
}

export interface GenerationResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata: {
    generatedAt: string
    processingTime: number
    contextTokens: number
    parameters: GenerationOptions
  }
  quality: {
    coherence: number
    relevance: number
    creativity: number
  }
}

export interface GenerationMetrics {
  totalGenerations: number
  averageProcessingTime: number
  averageTokens: number
  modelUsage: Record<string, number>
  errorRate: number
  lastUpdated: Date
}

export class GenerationService {
  private defaultModel = 'llama2:7b'
  private maxRetries = 3
  private generationMetrics: Array<{
    model: string
    processingTime: number
    tokens: number
    success: boolean
    timestamp: number
  }> = []

  /**
   * Generate content using AI model with assembled context
   * @param context Assembled context from retrieval
   * @param options Generation options
   * @returns Generation result
   */
  async generateContent(
    context: AssembledContext,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now()
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 1000,
      topP = 0.9,
      frequencyPenalty = 0.0,
      presencePenalty = 0.0,
      stopSequences = [],
      systemPrompt,
      userPrompt
    } = options

    try {
      // Prepare the prompt with context
      const fullPrompt = this.buildPrompt(context, systemPrompt, userPrompt)

      // Generate content
      const generatedContent = await this.callAIModel(
        fullPrompt,
        {
          model,
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
          stopSequences
        }
      )

      const processingTime = Date.now() - startTime
      const estimatedTokens = this.estimateTokens(fullPrompt + generatedContent)

      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(generatedContent, context)

      const result: GenerationResult = {
        content: generatedContent,
        model,
        usage: {
          promptTokens: this.estimateTokens(fullPrompt),
          completionTokens: this.estimateTokens(generatedContent),
          totalTokens: estimatedTokens
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime,
          contextTokens: context.metadata.estimatedTokens,
          parameters: options
        },
        quality
      }

      // Record metrics
      this.recordMetrics(model, processingTime, estimatedTokens, true)

      return result

    } catch (error) {
      console.error('Content generation failed:', error)

      // Record failed metrics
      this.recordMetrics(model, Date.now() - startTime, 0, false)

      throw new Error('Content generation failed')
    }
  }

  /**
   * Build the complete prompt with context
   */
  private buildPrompt(
    context: AssembledContext,
    systemPrompt?: string,
    userPrompt?: string
  ): string {
    const defaultSystemPrompt = `You are an expert content writer. Use the provided context to generate high-quality, relevant content. Be informative, engaging, and well-structured.`

    const system = systemPrompt || defaultSystemPrompt
    const user = userPrompt || `Based on the following context, generate comprehensive content:`

    return `${system}\n\nContext:\n${context.content}\n\n${user}`
  }

  /**
   * Call the AI model for generation
   */
  private async callAIModel(
    prompt: string,
    options: {
      model: string
      temperature: number
      maxTokens: number
      topP: number
      frequencyPenalty: number
      presencePenalty: number
      stopSequences: string[]
    }
  ): Promise<string> {
    const { model, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stopSequences } = options

    // Try multiple times with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
              temperature,
              top_p: topP,
              num_predict: maxTokens,
              frequency_penalty: frequencyPenalty,
              presence_penalty: presencePenalty,
              stop: stopSequences
            }
          }),
        })

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`)
        }

        const data = await response.json()
        return data.response

      } catch (error) {
        console.warn(`Generation attempt ${attempt} failed:`, error)

        if (attempt === this.maxRetries) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw new Error('All generation attempts failed')
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate quality metrics for generated content
   */
  private calculateQualityMetrics(content: string, context: AssembledContext): GenerationResult['quality'] {
    // Simple heuristics for quality assessment
    const words = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).length

    // Coherence: average words per sentence (ideal ~15-20)
    const avgWordsPerSentence = words / Math.max(sentences, 1)
    const coherence = Math.max(0, Math.min(1, 1 - Math.abs(avgWordsPerSentence - 17.5) / 17.5))

    // Relevance: overlap with context keywords
    const contextWords = new Set(context.content.toLowerCase().split(/\s+/))
    const contentWords = content.toLowerCase().split(/\s+/)
    const relevantWords = contentWords.filter(word => contextWords.has(word)).length
    const relevance = Math.min(relevantWords / Math.max(contentWords.length, 1), 1)

    // Creativity: unique word ratio
    const uniqueWords = new Set(contentWords).size
    const creativity = Math.min(uniqueWords / Math.max(contentWords.length, 1), 1)

    return {
      coherence: Math.round(coherence * 100) / 100,
      relevance: Math.round(relevance * 100) / 100,
      creativity: Math.round(creativity * 100) / 100
    }
  }

  /**
   * Record generation metrics
   */
  private recordMetrics(
    model: string,
    processingTime: number,
    tokens: number,
    success: boolean
  ): void {
    this.generationMetrics.push({
      model,
      processingTime,
      tokens,
      success,
      timestamp: Date.now()
    })

    // Keep only last 1000 metrics
    if (this.generationMetrics.length > 1000) {
      this.generationMetrics = this.generationMetrics.slice(-1000)
    }
  }

  /**
   * Get generation metrics
   */
  getMetrics(): GenerationMetrics {
    const recentMetrics = this.generationMetrics.filter(
      m => Date.now() - m.timestamp < 3600000 // Last hour
    )

    const totalGenerations = recentMetrics.length
    const successfulGenerations = recentMetrics.filter(m => m.success)

    const modelUsage: Record<string, number> = {}
    recentMetrics.forEach(m => {
      modelUsage[m.model] = (modelUsage[m.model] || 0) + 1
    })

    return {
      totalGenerations,
      averageProcessingTime: totalGenerations > 0 ?
        recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / totalGenerations : 0,
      averageTokens: totalGenerations > 0 ?
        recentMetrics.reduce((sum, m) => sum + m.tokens, 0) / totalGenerations : 0,
      modelUsage,
      errorRate: totalGenerations > 0 ? 1 - (successfulGenerations.length / totalGenerations) : 0,
      lastUpdated: new Date()
    }
  }

  /**
   * Validate generation options
   */
  validateOptions(options: GenerationOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2')
    }

    if (options.maxTokens !== undefined && (options.maxTokens < 1 || options.maxTokens > 8000)) {
      errors.push('Max tokens must be between 1 and 8000')
    }

    if (options.topP !== undefined && (options.topP < 0 || options.topP > 1)) {
      errors.push('Top P must be between 0 and 1')
    }

    if (options.frequencyPenalty !== undefined && (options.frequencyPenalty < -2 || options.frequencyPenalty > 2)) {
      errors.push('Frequency penalty must be between -2 and 2')
    }

    if (options.presencePenalty !== undefined && (options.presencePenalty < -2 || options.presencePenalty > 2)) {
      errors.push('Presence penalty must be between -2 and 2')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.error('Failed to fetch available models:', error)
      return [this.defaultModel] // Fallback
    }
  }
}

export const generationService = new GenerationService()