import { aiService } from '../ai/aiService'
import { prisma } from '../database/prisma'
import { analysisCache } from './analysisCache'
import { analysisLogger } from './analysisLogger'
import { trendAnalysisService } from './trendAnalysisService'

export interface TopicResult {
  name: string
  description?: string
  category?: string
  confidence: number
  keywords?: string[]
}

export interface AnalysisResult {
  topics: TopicResult[]
  primaryTopic?: TopicResult
  relevanceScore: number
  sentiment?: 'positive' | 'negative' | 'neutral'
  readability?: number
  wordCount?: number
  confidence: number
}

export interface ContentAnalysisRequest {
  feedItemId: string
  title: string
  content: string
  description?: string
}

export class SemanticAnalysisService {
  private readonly ANALYSIS_PROMPT = `Analyze the following RSS content and extract key topics, themes, and insights. Provide a structured analysis in JSON format.

Content Title: {title}
Content Description: {description}
Content Body: {content}

Please respond with a JSON object containing:
{
  "topics": [
    {
      "name": "Topic Name",
      "description": "Brief description of the topic",
      "category": "Category (technology, business, health, politics, entertainment, science, etc.)",
      "confidence": 0.85,
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "primaryTopic": {
    "name": "Most Important Topic",
    "description": "Description",
    "category": "Category",
    "confidence": 0.95,
    "keywords": ["keyword1", "keyword2"]
  },
  "relevanceScore": 0.8,
  "sentiment": "positive|negative|neutral",
  "readability": 65.5,
  "wordCount": 450,
  "confidence": 0.9
}

Guidelines:
- Extract 3-7 most relevant topics
- Provide confidence scores (0-1) for each topic
- Categorize topics appropriately
- Include relevant keywords for each topic
- Assess overall content relevance (0-1)
- Determine sentiment based on content tone
- Calculate approximate readability score (Flesch scale)
- Count total words in content
- Provide overall analysis confidence score`

  async analyzeContent(request: ContentAnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await analysisLogger.logAnalysisStart(request.feedItemId)

      // Check cache first
      const cacheKey = analysisCache.generateKey(
        `${request.title || ''}${request.description || ''}${request.content || ''}`,
        'semantic-analysis'
      )

      const cachedResult = analysisCache.get(cacheKey)
      if (cachedResult) {
        console.log('Using cached analysis result')
        await analysisLogger.logCacheHit(request.feedItemId)
        // Still store in database if not already there
        await this.storeAnalysisResult(request.feedItemId, cachedResult, 0)
        return cachedResult
      }

      // Prepare the prompt with content
      const prompt = this.ANALYSIS_PROMPT
        .replace('{title}', request.title || 'No Title')
        .replace('{description}', request.description || 'No Description')
        .replace('{content}', request.content || '')

      // Call AI service
      const processingTime = Date.now() - startTime
      const response = await (aiService as any).generateContent(prompt)
      const totalProcessingTime = Date.now() - startTime

      // Parse and validate the response
      const analysisResult = this.parseAnalysisResponse(response)

      // Cache the result
      analysisCache.set(cacheKey, analysisResult)

      // Store analysis result in database
      await this.storeAnalysisResult(request.feedItemId, analysisResult, totalProcessingTime)

      // Log success
      await analysisLogger.logAnalysisSuccess(request.feedItemId, totalProcessingTime, analysisResult.topics.length)

      return analysisResult

    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('Semantic analysis failed:', error)

      // Log error
      await analysisLogger.logAnalysisError(request.feedItemId, error, processingTime)

      // Store failed analysis
      await this.storeFailedAnalysis(request.feedItemId, error)

      // Return fallback result
      return this.getFallbackAnalysis(request)
    }
  }

  private parseAnalysisResponse(response: string): AnalysisResult {
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanResponse = response.trim()
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(cleanResponse)

      // Validate and normalize the response
      return this.validateAnalysisResult(parsed)

    } catch (parseError) {
      console.error('Failed to parse analysis response:', parseError)
      throw new Error(`Invalid analysis response format: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
    }
  }

  private validateAnalysisResult(result: any): AnalysisResult {
    // Ensure required fields exist with defaults
    const validated: AnalysisResult = {
      topics: Array.isArray(result.topics) ? result.topics.map(this.validateTopic) : [],
      relevanceScore: this.clampScore(result.relevanceScore || 0.5),
      confidence: this.clampScore(result.confidence || 0.5),
      sentiment: this.validateSentiment(result.sentiment),
      readability: result.readability ? Math.max(0, Math.min(100, result.readability)) : undefined,
      wordCount: result.wordCount ? Math.max(0, result.wordCount) : undefined
    }

    // Validate primary topic if provided
    if (result.primaryTopic) {
      validated.primaryTopic = this.validateTopic(result.primaryTopic)
    }

    // Ensure we have at least one topic
    if (validated.topics.length === 0) {
      validated.topics = [{
        name: 'General',
        description: 'General content topic',
        category: 'general',
        confidence: 0.5,
        keywords: ['content']
      }]
    }

    return validated
  }

  private validateTopic(topic: any): TopicResult {
    return {
      name: String(topic.name || 'Unknown Topic'),
      description: topic.description ? String(topic.description) : undefined,
      category: topic.category ? String(topic.category) : undefined,
      confidence: this.clampScore(topic.confidence || 0.5),
      keywords: Array.isArray(topic.keywords) ? topic.keywords.map(String) : undefined
    }
  }

  private validateSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' | undefined {
    const validSentiments = ['positive', 'negative', 'neutral']
    const sentimentStr = String(sentiment || '').toLowerCase()
    return validSentiments.includes(sentimentStr) ? sentimentStr as any : undefined
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(1, score))
  }

  private async storeAnalysisResult(
    feedItemId: string,
    result: AnalysisResult,
    processingTime: number
  ): Promise<void> {
    try {
      // Create or update topics
      const topicIds: string[] = []
      for (const topicResult of result.topics) {
        const topic = await (prisma as any).topic.upsert({
          where: {
            name: topicResult.name
          },
          update: {
            description: topicResult.description,
            category: topicResult.category,
            confidence: Math.max(topicResult.confidence, await this.getExistingTopicConfidence(topicResult.name)),
            frequency: {
              increment: 1
            },
            keywords: topicResult.keywords ? JSON.stringify(topicResult.keywords) : undefined,
            updatedAt: new Date()
          },
          create: {
            name: topicResult.name,
            description: topicResult.description,
            category: topicResult.category,
            confidence: topicResult.confidence,
            frequency: 1,
            keywords: topicResult.keywords ? JSON.stringify(topicResult.keywords) : undefined
          }
        })
        topicIds.push(topic.id)

        // Trigger trend update for this topic (async, don't wait)
        setImmediate(async () => {
          try {
            await trendAnalysisService.calculateTopicTrend(topic.id)
          } catch (error) {
            console.error(`Failed to update trend for topic ${topic.id}:`, error)
          }
        })
      }

      // Find primary topic ID
      let primaryTopicId: string | undefined
      if (result.primaryTopic) {
        const primaryTopic = await (prisma as any).topic.findFirst({
          where: { name: result.primaryTopic.name }
        })
        primaryTopicId = primaryTopic?.id
      }

      // Store analysis result
      await (prisma as any).contentAnalysis.upsert({
        where: { feedItemId },
        update: {
          topics: {
            set: topicIds.map(id => ({ id }))
          },
          primaryTopicId,
          relevanceScore: result.relevanceScore,
          sentiment: result.sentiment,
          readability: result.readability,
          wordCount: result.wordCount,
          confidence: result.confidence,
          processingTime,
          status: 'completed',
          updatedAt: new Date()
        },
        create: {
          feedItemId,
          topics: {
            connect: topicIds.map(id => ({ id }))
          },
          primaryTopicId,
          relevanceScore: result.relevanceScore,
          sentiment: result.sentiment,
          readability: result.readability,
          wordCount: result.wordCount,
          confidence: result.confidence,
          processingTime,
          status: 'completed'
        }
      })

    } catch (error) {
      console.error('Failed to store analysis result:', error)
      throw error
    }
  }

  private async getExistingTopicConfidence(topicName: string): Promise<number> {
    try {
      const topic = await (prisma as any).topic.findUnique({
        where: { name: topicName },
        select: { confidence: true }
      })
      return topic?.confidence || 0
    } catch {
      return 0
    }
  }

  private async storeFailedAnalysis(feedItemId: string, error: any): Promise<void> {
    try {
      await (prisma as any).contentAnalysis.upsert({
        where: { feedItemId },
        update: {
          status: 'failed',
          errorMessage: error.message || 'Analysis failed',
          updatedAt: new Date()
        },
        create: {
          feedItemId,
          status: 'failed',
          errorMessage: error.message || 'Analysis failed'
        }
      })
    } catch (storeError) {
      console.error('Failed to store failed analysis:', storeError)
    }
  }

  private getFallbackAnalysis(request: ContentAnalysisRequest): AnalysisResult {
    // Simple fallback analysis based on content keywords
    const content = `${request.title} ${request.description} ${request.content}`.toLowerCase()
    const wordCount = content.split(/\s+/).length

    return {
      topics: [{
        name: 'Content Analysis',
        description: 'Fallback topic analysis',
        category: 'general',
        confidence: 0.3,
        keywords: ['content', 'analysis']
      }],
      relevanceScore: 0.5,
      confidence: 0.3,
      wordCount
    }
  }

  async getAnalysisStatus(feedItemId: string): Promise<string> {
    try {
      const analysis = await (prisma as any).contentAnalysis.findUnique({
        where: { feedItemId },
        select: { status: true }
      })
      return analysis?.status || 'pending'
    } catch {
      return 'unknown'
    }
  }

  async getAnalysisResult(feedItemId: string): Promise<AnalysisResult | null> {
    try {
      const analysis = await (prisma as any).contentAnalysis.findUnique({
        where: { feedItemId },
        include: {
          topics: true,
          primaryTopic: true
        }
      })

      if (!analysis || analysis.status !== 'completed') {
        return null
      }

      return {
        topics: analysis.topics.map((topic: any) => ({
          name: topic.name,
          description: topic.description || undefined,
          category: topic.category || undefined,
          confidence: topic.confidence,
          keywords: topic.keywords ? JSON.parse(topic.keywords) : undefined
        })),
        primaryTopic: analysis.primaryTopic ? {
          name: analysis.primaryTopic.name,
          description: analysis.primaryTopic.description || undefined,
          category: analysis.primaryTopic.category || undefined,
          confidence: analysis.primaryTopic.confidence,
          keywords: analysis.primaryTopic.keywords ? JSON.parse(analysis.primaryTopic.keywords) : undefined
        } : undefined,
        relevanceScore: analysis.relevanceScore,
        sentiment: analysis.sentiment as any,
        readability: analysis.readability || undefined,
        wordCount: analysis.wordCount || undefined,
        confidence: analysis.confidence
      }
    } catch (error) {
      console.error('Failed to get analysis result:', error)
      return null
    }
  }
}

export const semanticAnalysisService = new SemanticAnalysisService()