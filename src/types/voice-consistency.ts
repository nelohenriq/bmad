// Voice consistency monitoring interfaces

export interface ConsistencyCheck {
  id: string
  contentId?: string
  profileId: string
  consistencyScore: number
  deviationDetails?: VoiceDeviation[]
  timestamp: Date
  autoCorrected: boolean
  userFeedback?: ConsistencyFeedback
}

export interface VoiceDeviation {
  type: 'tone' | 'formality' | 'complexity' | 'engagement' | 'structure'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestedCorrection?: string
  confidence: number
  affectedRange?: {
    start: number
    end: number
    text: string
  }
}

export interface ConsistencyFeedback {
  userId: string
  accepted: boolean
  comments?: string
  timestamp: Date
}

export interface AppliedChange {
  type: string
  description: string
  confidence: number
  location: {
    start: number
    end: number
  }
  correctedText: string
}

export interface ConsistencySettings {
  id: string
  profileId: string
  threshold: number // 0.0 to 1.0
  alertOnDeviation: boolean
  autoCorrectMinor: boolean
  notificationPreferences: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  inApp: boolean
  webhook?: string
}

export interface VoiceAnalysisResult {
  formalityScore: number
  complexityScore: number
  engagementScore: number
  toneProfile: string[]
  sentenceStructure: {
    avgLength: number
    variance: number
    complexity: number
  }
  vocabularyProfile: {
    avgWordLength: number
    diversity: number
    technicalTerms: number
  }
  overallScore: number
}

export interface ConsistencyMetrics {
  totalChecks: number
  averageScore: number
  deviationFrequency: {
    tone: number
    formality: number
    complexity: number
    engagement: number
    structure: number
  }
  improvementTrend: {
    period: string
    scoreChange: number
  }[]
  userSatisfactionScore: number
}

export interface AutoCorrection {
  originalText: string
  correctedText: string
  appliedChanges: AppliedChange[]
}

// Voice tuning interfaces
export interface VoiceParameters {
  formalityLevel: number // 0-100
  complexityLevel: number // 0-100
  engagementLevel: number // 0-100
}

export interface VoiceTuningSession {
  id: string
  profileId: string
  userId: string
  startTime: Date
  endTime?: Date
  initialParameters: VoiceParameters
  finalParameters?: VoiceParameters
  parameterAdjustments: ParameterAdjustment[]
  previewData: VoicePreview[]
  userFeedback?: TuningFeedback
}

export interface ParameterAdjustment {
  parameter: keyof VoiceParameters
  previousValue: number
  newValue: number
  timestamp: Date
  confidence: number
}

export interface VoicePreview {
  timestamp: Date
  parameters: VoiceParameters
  analysis: VoiceAnalysisResult
  quality: number
}

export interface TuningFeedback {
  userId: string
  satisfactionScore: number
  usabilityRating: number
  suggestions: string[]
  completed: boolean
}

// Fact-checking interfaces
export interface FactCheckResult {
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

export interface FactCheckReview {
  resultId: string
  verification: 'verified' | 'questionable' | 'inconsistent'
  notes?: string
}