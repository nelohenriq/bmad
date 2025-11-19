import { Ollama } from 'ollama'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface FactCheckResult {
  id: string
  contentId: string
  sourceUrl: string
  claim: string
  verification: 'verified' | 'questionable' | 'inconsistent'
  confidence: number
  explanation: string
  suggestedCorrection?: string
  timestamp: Date
}

interface RSSSource {
  url: string
  title?: string
  content: string
  publishedAt?: Date
}

export class FactCheckingService {
  private ollama: Ollama

  constructor() {
    this.ollama = new Ollama()
  }

  /**
   * Check factual accuracy of content against RSS sources
   */
  async checkFacts(content: string, contentId: string, sources: RSSSource[]): Promise<FactCheckResult[]> {
    try {
      const results: FactCheckResult[] = []

      // Extract claims from content
      const claims = await this.extractClaims(content)

      for (const claim of claims) {
        const verification = await this.verifyClaim(claim, sources)
        results.push({
          id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          contentId,
          sourceUrl: verification.sourceUrl,
          claim,
          verification: verification.status,
          confidence: verification.confidence,
          explanation: verification.explanation,
          suggestedCorrection: verification.suggestion,
          timestamp: new Date()
        })
      }

      // Save results to database
      await this.saveFactCheckResults(results)

      return results

    } catch (error) {
      console.error('Error checking facts:', error)
      throw error
    }
  }

  /**
   * Extract factual claims from content
   */
  private async extractClaims(content: string): Promise<string[]> {
    // Mock implementation - extract sentences as claims
    return content.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 3)
  }

  /**
   * Verify a claim against sources
   */
  private async verifyClaim(claim: string, sources: RSSSource[]): Promise<{
    status: 'verified' | 'questionable' | 'inconsistent'
    confidence: number
    explanation: string
    sourceUrl: string
    suggestion?: string
  }> {
    try {
      // Find relevant sources
      const relevantSources = await this.findRelevantSources(claim, sources)

      if (relevantSources.length === 0) {
        return {
          status: 'questionable',
          confidence: 0.5,
          explanation: 'No relevant sources found for verification',
          sourceUrl: sources[0]?.url || ''
        }
      }

      // Mock verification - check if claim keywords appear in sources
      const sourceText = relevantSources[0].content
      const claimWords = claim.toLowerCase().split(/\s+/)
      const sourceWords = sourceText.toLowerCase().split(/\s+/)

      const matchingWords = claimWords.filter(word =>
        word.length > 3 && sourceWords.includes(word)
      )

      const matchRatio = matchingWords.length / claimWords.length

      if (matchRatio > 0.5) {
        return {
          status: 'verified',
          confidence: Math.min(0.9, matchRatio),
          explanation: `Claim supported by source content (${matchingWords.length} matching terms)`,
          sourceUrl: relevantSources[0].url
        }
      } else if (matchRatio > 0.2) {
        return {
          status: 'questionable',
          confidence: matchRatio,
          explanation: `Partial support found in source (${matchingWords.length} matching terms)`,
          sourceUrl: relevantSources[0].url
        }
      } else {
        return {
          status: 'inconsistent',
          confidence: 0.7,
          explanation: 'Claim not supported by available sources',
          sourceUrl: relevantSources[0].url,
          suggestion: 'Consider reviewing the source material'
        }
      }

    } catch (error) {
      console.error('Error verifying claim:', error)
      return {
        status: 'questionable',
        confidence: 0.5,
        explanation: 'Verification failed due to technical error',
        sourceUrl: sources[0]?.url || ''
      }
    }
  }

  /**
   * Find sources relevant to a claim
   */
  private async findRelevantSources(claim: string, sources: RSSSource[]): Promise<RSSSource[]> {
    try {
      const relevant: RSSSource[] = []

      for (const source of sources) {
        const similarity = this.calculateTextSimilarity(claim, source.content)
        if (similarity > 0.3) { // Threshold for relevance
          relevant.push(source)
        }
      }

      return relevant.slice(0, 3) // Limit to top 3 sources

    } catch (error) {
      console.error('Error finding relevant sources:', error)
      return sources.slice(0, 1) // Fallback to first source
    }
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Save fact check results to database
   */
  private async saveFactCheckResults(results: FactCheckResult[]): Promise<void> {
    try {
      await (prisma as any).factCheckResult.createMany({
        data: results.map(r => ({
          id: r.id,
          contentId: r.contentId,
          sourceUrl: r.sourceUrl,
          claim: r.claim,
          verification: r.verification,
          confidence: r.confidence,
          explanation: r.explanation,
          suggestedCorrection: r.suggestedCorrection,
          timestamp: r.timestamp
        }))
      })
    } catch (error) {
      console.error('Error saving fact check results:', error)
      throw error
    }
  }

  /**
   * Get fact check results for content
   */
  async getFactCheckResults(contentId: string): Promise<FactCheckResult[]> {
    try {
      const results = await (prisma as any).factCheckResult.findMany({
        where: { contentId },
        orderBy: { timestamp: 'desc' }
      })

      return results.map((r: any) => ({
        id: r.id,
        contentId: r.contentId,
        sourceUrl: r.sourceUrl,
        claim: r.claim,
        verification: r.verification as 'verified' | 'questionable' | 'inconsistent',
        confidence: r.confidence,
        explanation: r.explanation,
        suggestedCorrection: r.suggestedCorrection || undefined,
        timestamp: r.timestamp
      }))

    } catch (error) {
      console.error('Error getting fact check results:', error)
      throw error
    }
  }

  /**
   * Update fact check result with user review
   */
  async updateFactCheckResult(
    resultId: string,
    userVerification: 'verified' | 'questionable' | 'inconsistent',
    userNotes?: string
  ): Promise<void> {
    try {
      await (prisma as any).factCheckResult.update({
        where: { id: resultId },
        data: {
          verification: userVerification,
          explanation: userNotes ? `${userNotes} (User reviewed)` : undefined
        }
      })
    } catch (error) {
      console.error('Error updating fact check result:', error)
      throw error
    }
  }
}