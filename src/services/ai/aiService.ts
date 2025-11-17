import { OllamaClient } from './ollamaClient'
import { rssContextService } from '../rss/rssContextService'

export interface ContentGenerationOptions {
  topic: string
  style?: 'professional' | 'casual' | 'technical' | 'creative'
  length?: 'short' | 'medium' | 'long'
  includeSources?: boolean
  userId?: string
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

    const { topic, style = 'professional', length = 'medium', includeSources = true, userId } = options

    const lengthGuide = {
      short: '800-1200 words',
      medium: '1500-2500 words',
      long: '3000+ words'
    }

    // Fetch RSS context if userId is provided
    let rssContext = null
    if (userId) {
      try {
        rssContext = await rssContextService.getContextForTopic(topic, userId)
      } catch (error) {
        console.warn('Failed to fetch RSS context:', error)
        // Continue without RSS context
      }
    }

    // Build enhanced prompt with RSS context
    let contextSection = ''
    if (rssContext && (rssContext.relatedTopics.length > 0 || rssContext.recentTrends.length > 0 || rssContext.keyInsights.length > 0)) {
      contextSection = `

Recent Context from RSS Feeds:
${rssContext.relatedTopics.length > 0 ? `Related Topics: ${rssContext.relatedTopics.slice(0, 3).map(t => t.name).join(', ')}` : ''}
${rssContext.recentTrends.length > 0 ? `Current Trends: ${rssContext.recentTrends.slice(0, 3).map(t => `${t.topic} (${t.mentions} mentions)`).join(', ')}` : ''}
${rssContext.keyInsights.length > 0 ? `Key Insights: ${rssContext.keyInsights.slice(0, 3).join('; ')}` : ''}

${rssContext.relevantArticles.length > 0 ? `Recent Articles:
${rssContext.relevantArticles.slice(0, 2).map(a => `- "${a.title}" from ${a.source} (${new Date(a.publishedAt).toLocaleDateString()})`).join('\n')}` : ''}`
    }

    const prompt = `Write a comprehensive blog post about "${topic}" in a ${style} style.

Length: ${lengthGuide[length]}

Requirements:
- Engaging introduction with hook
- Well-structured content with clear sections and subheadings
- Practical examples and insights
- Professional conclusion
${includeSources ? '- Include relevant sources and references where appropriate' : ''}
${contextSection ? `- Incorporate current trends and insights from recent news and articles where relevant` : ''}

Make it informative, well-researched, and engaging for readers interested in ${topic}.${contextSection}`

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

  getModelInfo(): { name: string; initialized: boolean; availableModels: string[] } {
    return {
      name: this.ollamaClient.getModelName(),
      initialized: this.ollamaClient.isInitialized(),
      availableModels: this.ollamaClient.getAvailableModels().map(m => m.name)
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