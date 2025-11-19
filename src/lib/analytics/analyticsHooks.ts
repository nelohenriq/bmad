import { analyticsService } from './analyticsService'

// Analytics event types
export const ANALYTICS_EVENTS = {
  // Content creation events
  CONTENT_CREATED: 'content_created',
  CONTENT_EDITED: 'content_edited',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_DELETED: 'content_deleted',

  // RSS feed events
  FEED_ADDED: 'feed_added',
  FEED_REMOVED: 'feed_removed',
  FEED_MONITORED: 'feed_monitored',
  FEED_ERROR: 'feed_error',

  // AI usage events
  AI_REQUEST_STARTED: 'ai_request_started',
  AI_REQUEST_COMPLETED: 'ai_request_completed',
  AI_REQUEST_FAILED: 'ai_request_failed',

  // User interaction events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  SETTINGS_CHANGED: 'settings_changed',
  PREFERENCES_UPDATED: 'preferences_updated',

  // Publishing events
  PUBLISHING_STARTED: 'publishing_started',
  PUBLISHING_COMPLETED: 'publishing_completed',
  PUBLISHING_FAILED: 'publishing_failed',

  // UI interaction events
  PAGE_VIEWED: 'page_viewed',
  BUTTON_CLICKED: 'button_clicked',
  FORM_SUBMITTED: 'form_submitted'
} as const

export type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]

// Analytics tracking functions
export class AnalyticsTracker {
  private userId?: string
  private sessionId?: string

  constructor(userId?: string, sessionId?: string) {
    this.userId = userId
    this.sessionId = sessionId
  }

  // Content creation tracking
  async trackContentCreated(contentId: string, contentType: string, wordCount: number, metadata?: Record<string, any>) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.CONTENT_CREATED,
      {
        contentId,
        contentType,
        wordCount,
        ...metadata
      },
      this.sessionId
    )
  }

  async trackContentEdited(contentId: string, changes: number, timeSpent: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.CONTENT_EDITED,
      {
        contentId,
        changes,
        timeSpent
      },
      this.sessionId
    )
  }

  async trackContentPublished(contentId: string, platforms: string[], success: boolean, timeSpent: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.CONTENT_PUBLISHED,
      {
        contentId,
        platforms,
        success,
        timeSpent
      },
      this.sessionId
    )
  }

  // RSS feed tracking
  async trackFeedAdded(feedId: string, feedUrl: string, category?: string) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.FEED_ADDED,
      {
        feedId,
        feedUrl,
        category
      },
      this.sessionId
    )
  }

  async trackFeedMonitored(feedId: string, itemsFound: number, success: boolean, responseTime: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.FEED_MONITORED,
      {
        feedId,
        itemsFound,
        success,
        responseTime
      },
      this.sessionId
    )
  }

  async trackFeedError(feedId: string, error: string, errorCode?: string) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.FEED_ERROR,
      {
        feedId,
        error,
        errorCode
      },
      this.sessionId
    )
  }

  // AI usage tracking
  async trackAiRequestStarted(model: string, requestType: string, inputLength: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.AI_REQUEST_STARTED,
      {
        model,
        requestType,
        inputLength,
        timestamp: Date.now()
      },
      this.sessionId
    )
  }

  async trackAiRequestCompleted(model: string, requestType: string, responseTime: number, tokensUsed: number, success: boolean) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.AI_REQUEST_COMPLETED,
      {
        model,
        requestType,
        responseTime,
        tokensUsed,
        success
      },
      this.sessionId
    )
  }

  async trackAiRequestFailed(model: string, requestType: string, error: string, responseTime: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.AI_REQUEST_FAILED,
      {
        model,
        requestType,
        error,
        responseTime
      },
      this.sessionId
    )
  }

  // Publishing tracking
  async trackPublishingStarted(contentId: string, platform: string, format: string) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.PUBLISHING_STARTED,
      {
        contentId,
        platform,
        format,
        timestamp: Date.now()
      },
      this.sessionId
    )
  }

  async trackPublishingCompleted(contentId: string, platform: string, success: boolean, publishTime: number, url?: string) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.PUBLISHING_COMPLETED,
      {
        contentId,
        platform,
        success,
        publishTime,
        url
      },
      this.sessionId
    )
  }

  async trackPublishingFailed(contentId: string, platform: string, error: string, publishTime: number) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.PUBLISHING_FAILED,
      {
        contentId,
        platform,
        error,
        publishTime
      },
      this.sessionId
    )
  }

  // User interaction tracking
  async trackPageViewed(page: string, referrer?: string) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.PAGE_VIEWED,
      {
        page,
        referrer
      },
      this.sessionId
    )
  }

  async trackButtonClicked(buttonId: string, page: string, context?: Record<string, any>) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.BUTTON_CLICKED,
      {
        buttonId,
        page,
        ...context
      },
      this.sessionId
    )
  }

  async trackFormSubmitted(formId: string, page: string, success: boolean, fields?: string[]) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.FORM_SUBMITTED,
      {
        formId,
        page,
        success,
        fields
      },
      this.sessionId
    )
  }

  async trackSettingsChanged(setting: string, oldValue: any, newValue: any) {
    await analyticsService.recordEvent(
      this.userId,
      ANALYTICS_EVENTS.SETTINGS_CHANGED,
      {
        setting,
        oldValue,
        newValue
      },
      this.sessionId
    )
  }

  // Generic event tracking
  async trackEvent(eventType: AnalyticsEventType, data?: Record<string, any>) {
    await analyticsService.recordEvent(this.userId, eventType, data, this.sessionId)
  }
}

// React hooks for analytics
export function useAnalytics(userId?: string, sessionId?: string) {
  return new AnalyticsTracker(userId, sessionId)
}

// Global analytics instance (for anonymous users)
export const globalAnalytics = new AnalyticsTracker()

// Utility functions for common analytics patterns
export const analyticsUtils = {
  // Generate session ID
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // Track user session start
  async trackSessionStart(userId?: string, sessionId?: string) {
    const tracker = new AnalyticsTracker(userId, sessionId)
    await tracker.trackEvent(ANALYTICS_EVENTS.USER_LOGIN, {
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    })
  },

  // Track user session end
  async trackSessionEnd(duration: number, userId?: string, sessionId?: string) {
    const tracker = new AnalyticsTracker(userId, sessionId)
    await tracker.trackEvent(ANALYTICS_EVENTS.USER_LOGOUT, {
      duration,
      timestamp: Date.now()
    })
  },

  // Track content creation workflow
  async trackContentWorkflow(
    userId: string,
    sessionId: string,
    contentId: string,
    workflow: {
      startedAt: number
      completedAt: number
      edits: number
      aiRequests: number
      published: boolean
      platforms?: string[]
    }
  ) {
    const tracker = new AnalyticsTracker(userId, sessionId)
    const duration = workflow.completedAt - workflow.startedAt

    await tracker.trackContentCreated(contentId, 'blog_post', 0, {
      workflowDuration: duration,
      edits: workflow.edits,
      aiRequests: workflow.aiRequests,
      published: workflow.published,
      platforms: workflow.platforms
    })

    if (workflow.published && workflow.platforms) {
      await tracker.trackContentPublished(contentId, workflow.platforms, true, duration)
    }
  },

  // Track AI model performance
  async trackAiPerformance(
    userId: string,
    sessionId: string,
    model: string,
    performance: {
      requestType: string
      responseTime: number
      tokensUsed: number
      success: boolean
      quality?: number
    }
  ) {
    const tracker = new AnalyticsTracker(userId, sessionId)

    if (performance.success) {
      await tracker.trackAiRequestCompleted(
        model,
        performance.requestType,
        performance.responseTime,
        performance.tokensUsed,
        true
      )
    } else {
      await tracker.trackAiRequestFailed(
        model,
        performance.requestType,
        'Request failed',
        performance.responseTime
      )
    }
  }
}