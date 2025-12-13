import { GenerationOptions } from '../generation/generationService'
import { AssemblyOptions } from '../context/contextAssemblyService'

export interface GenerationMode {
  id: string
  name: string
  description: string
  category: 'creative' | 'factual' | 'analytical' | 'conversational'
  useCase: string
  generationConfig: GenerationOptions
  contextConfig: AssemblyOptions
  performanceProfile: {
    expectedTokens: number
    processingTimeMs: number
    qualityPriority: 'speed' | 'balance' | 'quality'
  }
  recommendations: string[]
}

export interface ModeSelectionCriteria {
  contentType?: 'article' | 'summary' | 'analysis' | 'tutorial' | 'news' | 'creative'
  length?: 'short' | 'medium' | 'long'
  tone?: 'formal' | 'casual' | 'technical' | 'engaging'
  audience?: 'general' | 'expert' | 'beginner'
  goal?: 'inform' | 'persuade' | 'entertain' | 'analyze'
  timeConstraint?: 'fast' | 'balanced' | 'thorough'
}

export interface ModeRecommendation {
  mode: GenerationMode
  confidence: number
  reasoning: string[]
  alternatives: GenerationMode[]
}

export class ModeSelectionService {
  private readonly modes: Map<string, GenerationMode> = new Map()

  constructor() {
    this.initializeModes()
  }

  /**
   * Initialize predefined generation modes
   */
  private initializeModes(): void {
    const modes: GenerationMode[] = [
      {
        id: 'creative-writing',
        name: 'Creative Writing',
        description: 'Generate engaging, creative content with high originality',
        category: 'creative',
        useCase: 'Blog posts, stories, marketing copy',
        generationConfig: {
          temperature: 0.9,
          maxTokens: 1500,
          topP: 0.95,
          frequencyPenalty: 0.3,
          presencePenalty: 0.6,
          systemPrompt: 'You are a creative writer who crafts engaging, original content with vivid language and compelling narratives.'
        },
        contextConfig: {
          maxTokens: 3000,
          prioritizeDiversity: true,
          strategy: 'balanced'
        },
        performanceProfile: {
          expectedTokens: 1200,
          processingTimeMs: 8000,
          qualityPriority: 'quality'
        },
        recommendations: [
          'Use for marketing content and creative writing',
          'Best when originality is more important than factual accuracy',
          'Suitable for engaging blog posts and stories'
        ]
      },
      {
        id: 'factual-summary',
        name: 'Factual Summary',
        description: 'Generate accurate, concise summaries of information',
        category: 'factual',
        useCase: 'News summaries, research overviews, technical documentation',
        generationConfig: {
          temperature: 0.3,
          maxTokens: 800,
          topP: 0.7,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
          systemPrompt: 'You are a precise summarizer who creates accurate, concise overviews of complex information.'
        },
        contextConfig: {
          maxTokens: 4000,
          prioritizeDiversity: false,
          strategy: 'relevance'
        },
        performanceProfile: {
          expectedTokens: 600,
          processingTimeMs: 4000,
          qualityPriority: 'balance'
        },
        recommendations: [
          'Use for summarizing research papers or news articles',
          'Ideal for technical documentation and reports',
          'Best when accuracy and conciseness are priorities'
        ]
      },
      {
        id: 'analytical-deep-dive',
        name: 'Analytical Deep Dive',
        description: 'Generate in-depth analysis with detailed explanations',
        category: 'analytical',
        useCase: 'Research analysis, tutorials, expert opinions',
        generationConfig: {
          temperature: 0.5,
          maxTokens: 2000,
          topP: 0.8,
          frequencyPenalty: 0.2,
          presencePenalty: 0.3,
          systemPrompt: 'You are an analytical expert who provides thorough, well-reasoned analysis with supporting evidence.'
        },
        contextConfig: {
          maxTokens: 5000,
          prioritizeDiversity: false,
          strategy: 'relevance'
        },
        performanceProfile: {
          expectedTokens: 1800,
          processingTimeMs: 12000,
          qualityPriority: 'quality'
        },
        recommendations: [
          'Use for in-depth analysis and research papers',
          'Suitable for tutorials and educational content',
          'Best when detailed explanations are needed'
        ]
      },
      {
        id: 'conversational-blog',
        name: 'Conversational Blog',
        description: 'Generate friendly, engaging blog-style content',
        category: 'conversational',
        useCase: 'Personal blogs, opinion pieces, casual articles',
        generationConfig: {
          temperature: 0.7,
          maxTokens: 1200,
          topP: 0.85,
          frequencyPenalty: 0.4,
          presencePenalty: 0.5,
          systemPrompt: 'You are a friendly blogger who writes engaging, conversational content that connects with readers.'
        },
        contextConfig: {
          maxTokens: 3500,
          prioritizeDiversity: true,
          strategy: 'balanced'
        },
        performanceProfile: {
          expectedTokens: 1000,
          processingTimeMs: 6000,
          qualityPriority: 'balance'
        },
        recommendations: [
          'Use for personal blogs and opinion pieces',
          'Ideal for engaging readers in casual topics',
          'Best for content that needs to feel personal and approachable'
        ]
      },
      {
        id: 'technical-explanation',
        name: 'Technical Explanation',
        description: 'Generate clear, accurate technical explanations',
        category: 'analytical',
        useCase: 'Technical documentation, how-to guides, API documentation',
        generationConfig: {
          temperature: 0.2,
          maxTokens: 1000,
          topP: 0.6,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
          systemPrompt: 'You are a technical writer who creates clear, accurate explanations of complex technical concepts.'
        },
        contextConfig: {
          maxTokens: 3000,
          prioritizeDiversity: false,
          strategy: 'relevance'
        },
        performanceProfile: {
          expectedTokens: 800,
          processingTimeMs: 5000,
          qualityPriority: 'balance'
        },
        recommendations: [
          'Use for technical documentation and API guides',
          'Ideal for explaining complex technical concepts',
          'Best when clarity and accuracy are most important'
        ]
      }
    ]

    modes.forEach(mode => this.modes.set(mode.id, mode))
  }

  /**
   * Get all available modes
   */
  getAllModes(): GenerationMode[] {
    return Array.from(this.modes.values())
  }

  /**
   * Get mode by ID
   */
  getMode(id: string): GenerationMode | null {
    return this.modes.get(id) || null
  }

  /**
   * Get modes by category
   */
  getModesByCategory(category: GenerationMode['category']): GenerationMode[] {
    return this.getAllModes().filter(mode => mode.category === category)
  }

  /**
   * Recommend the best mode based on criteria
   */
  recommendMode(criteria: ModeSelectionCriteria): ModeRecommendation {
    const modes = this.getAllModes()
    const scores = modes.map(mode => ({
      mode,
      score: this.calculateModeScore(mode, criteria),
      reasoning: this.generateReasoning(mode, criteria)
    }))

    scores.sort((a, b) => b.score - a.score)

    const topMode = scores[0]
    const alternatives = scores.slice(1, 4).map(s => s.mode)

    return {
      mode: topMode.mode,
      confidence: Math.min(topMode.score / 100, 1),
      reasoning: topMode.reasoning,
      alternatives
    }
  }

  /**
   * Calculate how well a mode matches the criteria
   */
  private calculateModeScore(mode: GenerationMode, criteria: ModeSelectionCriteria): number {
    let score = 50 // Base score

    // Content type matching
    if (criteria.contentType) {
      const contentTypeMatches = this.getContentTypeMatches(mode, criteria.contentType)
      score += contentTypeMatches * 15
    }

    // Length preference
    if (criteria.length) {
      const lengthMatches = this.getLengthMatches(mode, criteria.length)
      score += lengthMatches * 10
    }

    // Tone matching
    if (criteria.tone) {
      const toneMatches = this.getToneMatches(mode, criteria.tone)
      score += toneMatches * 10
    }

    // Audience matching
    if (criteria.audience) {
      const audienceMatches = this.getAudienceMatches(mode, criteria.audience)
      score += audienceMatches * 10
    }

    // Goal matching
    if (criteria.goal) {
      const goalMatches = this.getGoalMatches(mode, criteria.goal)
      score += goalMatches * 10
    }

    // Time constraint
    if (criteria.timeConstraint) {
      const timeMatches = this.getTimeMatches(mode, criteria.timeConstraint)
      score += timeMatches * 5
    }

    return Math.min(score, 100)
  }

  /**
   * Generate reasoning for mode recommendation
   */
  private generateReasoning(mode: GenerationMode, criteria: ModeSelectionCriteria): string[] {
    const reasoning: string[] = []

    if (criteria.contentType) {
      reasoning.push(`${mode.name} is well-suited for ${criteria.contentType} content`)
    }

    if (criteria.tone) {
      reasoning.push(`Provides ${criteria.tone} tone appropriate for your needs`)
    }

    if (criteria.length) {
      const expectedTokens = mode.performanceProfile.expectedTokens
      const lengthDesc = expectedTokens > 1200 ? 'longer' : expectedTokens > 800 ? 'medium-length' : 'concise'
      reasoning.push(`Generates ${lengthDesc} content (${expectedTokens} tokens)`)
    }

    reasoning.push(mode.recommendations[0]) // Add primary recommendation

    return reasoning
  }

  /**
   * Helper methods for criteria matching
   */
  private getContentTypeMatches(mode: GenerationMode, contentType: string): number {
    const matches: Record<string, string[]> = {
      'creative-writing': ['article', 'creative'],
      'factual-summary': ['summary', 'news', 'analysis'],
      'analytical-deep-dive': ['analysis', 'tutorial', 'research'],
      'conversational-blog': ['article', 'blog'],
      'technical-explanation': ['tutorial', 'technical']
    }

    return matches[mode.id]?.includes(contentType) ? 1 : 0
  }

  private getLengthMatches(mode: GenerationMode, length: string): number {
    const tokens = mode.performanceProfile.expectedTokens
    const lengthMap = { short: tokens < 800, medium: tokens >= 800 && tokens <= 1500, long: tokens > 1500 }
    return lengthMap[length as keyof typeof lengthMap] ? 1 : 0
  }

  private getToneMatches(mode: GenerationMode, tone: string): number {
    const toneMap: Record<string, string[]> = {
      formal: ['factual-summary', 'technical-explanation', 'analytical-deep-dive'],
      casual: ['conversational-blog', 'creative-writing'],
      technical: ['technical-explanation', 'analytical-deep-dive'],
      engaging: ['creative-writing', 'conversational-blog']
    }

    return toneMap[tone]?.includes(mode.id) ? 1 : 0
  }

  private getAudienceMatches(mode: GenerationMode, audience: string): number {
    const audienceMap: Record<string, string[]> = {
      general: ['conversational-blog', 'creative-writing'],
      expert: ['analytical-deep-dive', 'technical-explanation'],
      beginner: ['factual-summary', 'conversational-blog']
    }

    return audienceMap[audience]?.includes(mode.id) ? 1 : 0
  }

  private getGoalMatches(mode: GenerationMode, goal: string): number {
    const goalMap: Record<string, string[]> = {
      inform: ['factual-summary', 'technical-explanation'],
      persuade: ['creative-writing', 'conversational-blog'],
      entertain: ['creative-writing', 'conversational-blog'],
      analyze: ['analytical-deep-dive', 'factual-summary']
    }

    return goalMap[goal]?.includes(mode.id) ? 1 : 0
  }

  private getTimeMatches(mode: GenerationMode, timeConstraint: string): number {
    const timeMs = mode.performanceProfile.processingTimeMs
    const timeMap = {
      fast: timeMs < 5000,
      balanced: timeMs >= 5000 && timeMs <= 10000,
      thorough: timeMs > 10000
    }

    return timeMap[timeConstraint as keyof typeof timeMap] ? 1 : 0
  }

  /**
   * Validate mode selection criteria
   */
  validateCriteria(criteria: ModeSelectionCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    const validContentTypes = ['article', 'summary', 'analysis', 'tutorial', 'news', 'creative']
    if (criteria.contentType && !validContentTypes.includes(criteria.contentType)) {
      errors.push(`contentType must be one of: ${validContentTypes.join(', ')}`)
    }

    const validLengths = ['short', 'medium', 'long']
    if (criteria.length && !validLengths.includes(criteria.length)) {
      errors.push(`length must be one of: ${validLengths.join(', ')}`)
    }

    const validTones = ['formal', 'casual', 'technical', 'engaging']
    if (criteria.tone && !validTones.includes(criteria.tone)) {
      errors.push(`tone must be one of: ${validTones.join(', ')}`)
    }

    const validAudiences = ['general', 'expert', 'beginner']
    if (criteria.audience && !validAudiences.includes(criteria.audience)) {
      errors.push(`audience must be one of: ${validAudiences.join(', ')}`)
    }

    const validGoals = ['inform', 'persuade', 'entertain', 'analyze']
    if (criteria.goal && !validGoals.includes(criteria.goal)) {
      errors.push(`goal must be one of: ${validGoals.join(', ')}`)
    }

    const validTimeConstraints = ['fast', 'balanced', 'thorough']
    if (criteria.timeConstraint && !validTimeConstraints.includes(criteria.timeConstraint)) {
      errors.push(`timeConstraint must be one of: ${validTimeConstraints.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const modeSelectionService = new ModeSelectionService()