import {
  ConsistencyCheck,
  VoiceDeviation,
  VoiceAnalysisResult,
  ConsistencySettings,
  AutoCorrection,
  AppliedChange,
  ConsistencyFeedback
} from '@/types/voice-consistency'

// Local interface to match Prisma VoiceProfile model
interface VoiceProfile {
  id: string
  userId: string
  name: string
  description?: string
  formalityLevel: number
  complexityLevel: number
  engagementLevel: number
  tonePreferences?: string
  sentenceStructure?: string
  vocabularyProfile?: string
  punctuationStyle?: string
  sampleCount: number
  lastUpdated: Date
  isActive: boolean
}

interface ConsistencyCheckRecord {
  id: string
  contentId?: string
  profileId: string
  consistencyScore: number
  deviationDetails?: string
  timestamp: Date
  autoCorrected: boolean
  userFeedback?: ConsistencyFeedback
}

export class VoiceConsistencyService {
  /**
   * Get voice profile by ID (mock implementation)
   */
  private async getVoiceProfile(profileId: string): Promise<VoiceProfile | null> {
    // Mock implementation - in real app would query database
    if (profileId === 'mock-profile-1') {
      return {
        id: profileId,
        userId: 'mock-user-1',
        name: 'Professional Voice',
        description: 'Default professional voice profile',
        formalityLevel: 0.8,
        complexityLevel: 0.6,
        engagementLevel: 0.7,
        tonePreferences: JSON.stringify(['professional', 'confident']),
        sampleCount: 10,
        lastUpdated: new Date(),
        isActive: true
      }
    }
    return null
  }

  /**
   * Analyze content against a voice profile and detect deviations
   */
  async checkConsistency(
    content: string,
    profileId: string,
    contentId?: string
  ): Promise<ConsistencyCheck> {
    try {
      // Get voice profile and settings
      const profile = await this.getVoiceProfile(profileId)
      const settings = await this.getConsistencySettings(profileId)

      if (!profile) {
        throw new Error(`Voice profile ${profileId} not found`)
      }

      // Analyze content voice characteristics
      const analysisResult = await this.analyzeContentVoice(content, profile)
      
      // Calculate consistency score and detect deviations
      const consistencyScore = this.calculateConsistencyScore(analysisResult, profile)
      const deviations = this.detectDeviations(analysisResult, profile, settings)

      // Create consistency check record
      const consistencyCheck: ConsistencyCheckRecord = {
        id: `check-${Date.now()}`,
        contentId,
        profileId,
        consistencyScore,
        deviationDetails: JSON.stringify(deviations),
        timestamp: new Date(),
        autoCorrected: false,
        userFeedback: undefined
      }

      return {
        ...consistencyCheck,
        deviationDetails: deviations
      }

    } catch (error) {
      console.error('Error checking voice consistency:', error)
      throw error
    }
  }

  /**
   * Auto-correct minor voice inconsistencies
   */
  async autoCorrectConsistency(
    checkId: string,
    content: string
  ): Promise<AutoCorrection> {
    try {
      // Mock consistency check retrieval
      const mockCheck: ConsistencyCheckRecord = {
        id: checkId,
        profileId: 'mock-profile-1',
        consistencyScore: 0.7,
        deviationDetails: JSON.stringify([
          {
            type: 'formality',
            severity: 'low',
            description: 'Slightly casual tone detected',
            confidence: 0.8
          }
        ]),
        timestamp: new Date(),
        autoCorrected: false
      }

      const profile = await this.getVoiceProfile(mockCheck.profileId)
      if (!profile) {
        throw new Error('Voice profile not found')
      }

      const settings = await this.getConsistencySettings(mockCheck.profileId)
      if (!settings.autoCorrectMinor) {
        throw new Error('Auto-correction is disabled for this profile')
      }

      const deviations: VoiceDeviation[] = mockCheck.deviationDetails ? 
        JSON.parse(mockCheck.deviationDetails) : []
      
      const applicableDeviations = deviations.filter(
        dev => dev.severity === 'low' || dev.severity === 'medium'
      )

      let correctedContent = content
      const appliedChanges: AppliedChange[] = []

      for (const deviation of applicableDeviations) {
        const change = this.applyDeviationCorrection(deviation, correctedContent, profile)
        if (change) {
          correctedContent = correctedContent.substring(0, change.location.start) +
                            change.correctedText +
                            correctedContent.substring(change.location.end)
          appliedChanges.push(change)
        }
      }

      return {
        originalText: content,
        correctedText: correctedContent,
        appliedChanges
      }

    } catch (error) {
      console.error('Error auto-correcting consistency:', error)
      throw error
    }
  }

  /**
   * Get consistency analytics for a profile
   */
  async getConsistencyAnalytics(profileId: string, days: number = 30) {
    try {
      const settings = await this.getConsistencySettings(profileId)
      
      // Mock analytics data
      const mockChecks: ConsistencyCheckRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: `check-${i}`,
        profileId,
        consistencyScore: 0.7 + Math.random() * 0.3,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        autoCorrected: Math.random() > 0.5
      }))

      const metrics = this.calculateConsistencyMetrics(mockChecks)
      
      return {
        metrics,
        recentChecks: mockChecks.slice(0, 5).map(check => ({
          ...check,
          deviationDetails: []
        })),
        settings,
        period: { 
          days, 
          since: new Date(Date.now() - days * 24 * 60 * 60 * 1000), 
          until: new Date() 
        }
      }

    } catch (error) {
      console.error('Error getting consistency analytics:', error)
      throw error
    }
  }

  /**
   * Update consistency settings for a profile
   */
  async updateConsistencySettings(
    profileId: string,
    updates: Partial<ConsistencySettings>
  ): Promise<ConsistencySettings> {
    try {
      const defaultSettings: ConsistencySettings = {
        id: `settings-${profileId}`,
        profileId,
        threshold: updates.threshold || 0.85,
        alertOnDeviation: updates.alertOnDeviation ?? true,
        autoCorrectMinor: updates.autoCorrectMinor ?? false,
        notificationPreferences: updates.notificationPreferences || { email: true, inApp: true }
      }

      return defaultSettings

    } catch (error) {
      console.error('Error updating consistency settings:', error)
      throw error
    }
  }

  /**
   * Get historical consistency data for trend analysis
   */
  async getConsistencyTrends(profileId: string, days: number = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      
      // Mock trend data
      const trendData = Array.from({ length: 7 }, (_, i) => ({
        consistencyScore: 0.6 + Math.random() * 0.4,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        deviationDetails: null
      }))

      return {
        trendData,
        period: { days, since, until: new Date() }
      }

    } catch (error) {
      console.error('Error getting consistency trends:', error)
      throw error
    }
  }

  /**
   * Analyze content voice characteristics
   */
  private async analyzeContentVoice(content: string, profile: VoiceProfile): Promise<VoiceAnalysisResult> {
    const sentences = this.splitIntoSentences(content)
    const words = content.split(/\s+/).filter(w => w.length > 0)
    
    const formalityScore = this.calculateFormalityScore(content)
    const complexityScore = this.calculateComplexityScore(content)
    const engagementScore = this.calculateEngagementScore(content)
    
    const sentenceStructure = {
      avgLength: words.length / sentences.length,
      variance: this.calculateSentenceVariance(sentences),
      complexity: this.calculateSentenceComplexity(sentences)
    }

    const vocabularyProfile = {
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      diversity: this.calculateVocabularyDiversity(words),
      technicalTerms: this.countTechnicalTerms(content)
    }

    const toneProfile = this.extractToneProfile(content)
    const overallScore = (formalityScore + complexityScore + engagementScore) / 3

    return {
      formalityScore,
      complexityScore,
      engagementScore,
      toneProfile,
      sentenceStructure,
      vocabularyProfile,
      overallScore
    }
  }

  /**
   * Calculate consistency score based on analysis and profile
   */
  private calculateConsistencyScore(analysis: VoiceAnalysisResult, profile: VoiceProfile): number {
    const formalityDiff = Math.abs(analysis.formalityScore - profile.formalityLevel)
    const complexityDiff = Math.abs(analysis.complexityScore - profile.complexityLevel)
    const engagementDiff = Math.abs(analysis.engagementScore - profile.engagementLevel)

    const avgDiff = (formalityDiff + complexityDiff + engagementDiff) / 3
    
    return Math.max(0, 1 - avgDiff)
  }

  /**
   * Detect deviations from expected voice characteristics
   */
  private detectDeviations(
    analysis: VoiceAnalysisResult, 
    profile: VoiceProfile,
    settings: ConsistencySettings
  ): VoiceDeviation[] {
    const deviations: VoiceDeviation[] = []

    // Formality deviations
    const formalityDiff = Math.abs(analysis.formalityScore - profile.formalityLevel)
    if (formalityDiff > 0.2) {
      deviations.push({
        type: 'formality',
        severity: formalityDiff > 0.4 ? 'high' : 'medium',
        description: `Formality level deviates by ${formalityDiff.toFixed(2)}`,
        confidence: Math.min(0.95, formalityDiff * 2)
      })
    }

    // Complexity deviations
    const complexityDiff = Math.abs(analysis.complexityScore - profile.complexityLevel)
    if (complexityDiff > 0.2) {
      deviations.push({
        type: 'complexity',
        severity: complexityDiff > 0.4 ? 'high' : 'medium',
        description: `Complexity level deviates by ${complexityDiff.toFixed(2)}`,
        confidence: Math.min(0.95, complexityDiff * 2)
      })
    }

    // Engagement deviations
    const engagementDiff = Math.abs(analysis.engagementScore - profile.engagementLevel)
    if (engagementDiff > 0.2) {
      deviations.push({
        type: 'engagement',
        severity: engagementDiff > 0.4 ? 'high' : 'medium',
        description: `Engagement level deviates by ${engagementDiff.toFixed(2)}`,
        confidence: Math.min(0.95, engagementDiff * 2)
      })
    }

    return deviations
  }

  /**
   * Get consistency settings for a profile
   */
  private async getConsistencySettings(profileId: string): Promise<ConsistencySettings> {
    // Mock implementation - in real app would query database
    return {
      id: `settings-${profileId}`,
      profileId,
      threshold: 0.85,
      alertOnDeviation: true,
      autoCorrectMinor: false,
      notificationPreferences: {
        email: true,
        inApp: true
      }
    }
  }

  /**
   * Apply deviation correction
   */
  private applyDeviationCorrection(
    deviation: VoiceDeviation,
    content: string,
    profile: VoiceProfile
  ): AppliedChange | null {
    switch (deviation.type) {
      case 'formality':
        if (deviation.severity === 'low' || deviation.severity === 'medium') {
          return {
            type: 'formality_adjustment',
            description: 'Adjusted formality to match profile',
            confidence: deviation.confidence,
            location: { start: 0, end: content.length },
            correctedText: this.adjustFormality(content, profile.formalityLevel)
          }
        }
        break
      case 'complexity':
        if (deviation.severity === 'low') {
          return {
            type: 'complexity_adjustment',
            description: 'Adjusted sentence complexity',
            confidence: deviation.confidence,
            location: { start: 0, end: content.length },
            correctedText: this.adjustComplexity(content, profile.complexityLevel)
          }
        }
        break
    }
    
    return null
  }

  private calculateConsistencyMetrics(checks: ConsistencyCheckRecord[]) {
    if (checks.length === 0) {
      return {
        totalChecks: 0,
        averageScore: 0,
        deviationFrequency: {
          tone: 0,
          formality: 0,
          complexity: 0,
          engagement: 0,
          structure: 0
        },
        improvementTrend: [],
        userSatisfactionScore: 0
      }
    }

    const averageScore = checks.reduce((sum, check) => sum + check.consistencyScore, 0) / checks.length
    
    return {
      totalChecks: checks.length,
      averageScore,
      deviationFrequency: {
        tone: 0,
        formality: 0,
        complexity: 0,
        engagement: 0,
        structure: 0
      },
      improvementTrend: [],
      userSatisfactionScore: 0
    }
  }

  // Helper methods for voice analysis

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  }

  private calculateFormalityScore(text: string): number {
    const formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'hence']
    const casualWords = ['yeah', 'ok', 'gonna', 'wanna', 'cool']
    
    const words = text.toLowerCase().split(/\s+/)
    const formalCount = words.filter(word => formalWords.includes(word)).length
    const casualCount = words.filter(word => casualWords.includes(word)).length
    
    const totalWords = words.length
    return Math.max(0, Math.min(1, (formalCount - casualCount) / totalWords + 0.5))
  }

  private calculateComplexityScore(text: string): number {
    const sentences = this.splitIntoSentences(text)
    const words = text.split(/\s+/).filter(w => w.length > 0)
    
    const avgSentenceLength = words.length / sentences.length
    const longWords = words.filter(word => word.length > 6).length
    
    const complexity = (avgSentenceLength * 0.4) + (longWords / words.length * 100 * 0.6)
    return Math.min(1, complexity / 20)
  }

  private calculateEngagementScore(text: string): number {
    const engagingWords = ['amazing', 'incredible', 'fantastic', 'wonderful', 'exciting']
    const neutralWords = ['is', 'are', 'was', 'were', 'be']
    
    const words = text.toLowerCase().split(/\s+/)
    const engagingCount = words.filter(word => engagingWords.includes(word)).length
    const neutralCount = words.filter(word => neutralWords.includes(word)).length
    
    const totalWords = words.length
    const engagement = (engagingCount - neutralCount) / totalWords + 0.5
    return Math.max(0, Math.min(1, engagement))
  }

  private calculateSentenceVariance(sentences: string[]): number {
    if (sentences.length === 0) return 0
    const lengths = sentences.map(s => s.split(/\s+/).length)
    const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length
    return variance
  }

  private calculateSentenceComplexity(sentences: string[]): number {
    if (sentences.length === 0) return 0
    return sentences.reduce((sum, sentence) => {
      const clauses = sentence.split(/[,;]/).length
      return sum + clauses
    }, 0) / sentences.length
  }

  private calculateVocabularyDiversity(words: string[]): number {
    if (words.length === 0) return 0
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    return uniqueWords.size / words.length
  }

  private countTechnicalTerms(text: string): number {
    const technicalPatterns = /\b[A-Z]{2,}\b|\b\w*tech\w*\b|\b\w*ology\w*\b/gi
    return (text.match(technicalPatterns) || []).length
  }

  private extractToneProfile(text: string): string[] {
    const tones: string[] = []
    
    if (text.includes('!') || text.includes('?')) tones.push('questioning')
    if (text.includes('...')) tones.push('contemplative')
    if (text.toLowerCase().includes('because')) tones.push('analytical')
    if (text.toLowerCase().includes('amazing') || text.toLowerCase().includes('incredible')) tones.push('enthusiastic')
    
    return tones
  }

  private adjustFormality(text: string, targetLevel: number): string {
    if (targetLevel > 0.7) {
      return text.replace(/\byeah\b/gi, 'yes')
                 .replace(/\bok\b/gi, 'acceptable')
    } else if (targetLevel < 0.3) {
      return text.replace(/\btherefore\b/gi, 'so')
                 .replace(/\bhowever\b/gi, 'but')
    }
    return text
  }

  private adjustComplexity(text: string, targetLevel: number): string {
    if (targetLevel < 0.5) {
      const sentences = this.splitIntoSentences(text)
      const simplified = sentences.map(s => {
        const words = s.split(/\s+/)
        return words.length > 15 ? words.slice(0, 15).join(' ') + '.' : s
      })
      return simplified.join(' ')
    }
    return text
  }
}