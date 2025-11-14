import { OllamaClient } from './ollamaClient'

export interface ContentGenerationOptions {
  topic: string
  style?: 'professional' | 'casual' | 'technical' | 'creative'
  length?: 'short' | 'medium' | 'long'
  includeSources?: boolean
}

export interface ContentSummary {
  originalLength: number
  summary: string
  keyPoints: string[]
  generatedAt: Date
}

export class AIService {
  private ollamaClient: OllamaClient
  private initialized: boolean = false

  constructor(modelName?: string) {
    this.ollamaClient = new OllamaClient(modelName)
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      await this.ollamaClient.initialize()
      this.initialized = true
    } catch (error) {
      throw new Error(`AI Service initialization failed: ${error}`)
    }
  }

  async generateBlogPost(options: ContentGenerationOptions): Promise<string> {
    this.ensureInitialized()

    const { topic, style = 'professional', length = 'medium', includeSources = true } = options

    const lengthGuide = {
      short: '800-1200 words',
      medium: '1500-2500 words',
      long: '3000+ words'
    }

    const prompt = `Write a comprehensive blog post about "${topic}" in a ${style} style.

Length: ${lengthGuide[length]}

Requirements:
- Engaging introduction with hook
- Well-structured content with clear sections and subheadings
- Practical examples and insights
- Professional conclusion
${includeSources ? '- Include relevant sources and references where appropriate' : ''}

Make it informative, well-researched, and engaging for readers interested in ${topic}.`

    return this.ollamaClient.generateBlogPost(topic, style)
  }

  async summarizeContent(content: string): Promise<ContentSummary> {
    this.ensureInitialized()

    const summary = await this.ollamaClient.summarizeContent(content)

    // Extract key points (simple parsing - in real implementation could be more sophisticated)
    const keyPoints = summary
      .split('\n')
      .filter(line => line.trim().match(/^[-•*]\s/))
      .map(line => line.trim().replace(/^[-•*]\s/, ''))

    return {
      originalLength: content.length,
      summary,
      keyPoints,
      generatedAt: new Date()
    }
  }

  async analyzeTopic(topic: string): Promise<{
    relevance: number
    complexity: 'low' | 'medium' | 'high'
    suggestedSections: string[]
    estimatedWordCount: number
  }> {
    this.ensureInitialized()

    const prompt = `Analyze the topic "${topic}" for blog post creation:

Provide analysis in JSON format:
{
  "relevance": <0-100 score for general interest>,
  "complexity": "low|medium|high",
  "suggestedSections": ["array of section titles"],
  "estimatedWordCount": <number>
}`

    const response = await this.ollamaClient.generateContent(prompt)

    try {
      return JSON.parse(response)
    } catch {
      // Fallback analysis
      return {
        relevance: 75,
        complexity: 'medium',
        suggestedSections: ['Introduction', 'Main Content', 'Conclusion'],
        estimatedWordCount: 1500
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.initialized) {
      return false
    }

    try {
      return await this.ollamaClient.testConnection()
    } catch {
      return false
    }
  }

  getModelInfo(): { name: string; initialized: boolean } {
    return {
      name: this.ollamaClient.getModelName(),
      initialized: this.ollamaClient.isInitialized()
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AI Service not initialized. Call initialize() first.')
    }
  }
}

// Singleton instance for app-wide use
export const aiService = new AIService()