import { create } from 'zustand'

export interface TopicForReview {
  id: string
  name: string
  description?: string
  category?: string
  trendScore: number
  velocity: number
  momentum: number
  frequency: number
  approvalStatus: 'pending' | 'approved' | 'rejected'
  priority: 'high' | 'medium' | 'low'
  angles?: ContentAngle[]
  lastUpdated: Date
}

export interface ContentAngle {
  id: string
  title: string
  description: string
  uniquenessScore: number
  seoPotential: number
  engagementPotential: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface ApprovalState {
  // Data
  topics: TopicForReview[]
  selectedTopicIds: string[]
  isLoading: boolean
  error: string | null

  // Filters
  searchQuery: string
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected'
  priorityFilter: 'all' | 'high' | 'medium' | 'low'
  categoryFilter: string

  // Actions
  fetchTopics: () => Promise<void>
  approveTopic: (topicId: string) => Promise<void>
  rejectTopic: (topicId: string, reason?: string) => Promise<void>
  updatePriority: (topicId: string, priority: 'high' | 'medium' | 'low') => Promise<void>
  bulkApprove: (topicIds: string[]) => Promise<void>
  bulkReject: (topicIds: string[], reason?: string) => Promise<void>
  bulkUpdatePriority: (topicIds: string[], priority: 'high' | 'medium' | 'low') => Promise<void>

  // Selection
  selectTopic: (topicId: string) => void
  deselectTopic: (topicId: string) => void
  selectAllTopics: () => void
  clearSelection: () => void

  // Filters
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: 'all' | 'pending' | 'approved' | 'rejected') => void
  setPriorityFilter: (priority: 'all' | 'high' | 'medium' | 'low') => void
  setCategoryFilter: (category: string) => void

  // UI state
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  // Initial state
  topics: [],
  selectedTopicIds: [],
  isLoading: false,
  error: null,

  // Filters
  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  categoryFilter: '',

  // Actions
  fetchTopics: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/topics/review')
      if (!response.ok) {
        throw new Error('Failed to fetch topics')
      }
      const topics = await response.json()
      set({ topics, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },

  approveTopic: async (topicId: string) => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topic.id === topicId
        ? { ...topic, approvalStatus: 'approved' as const }
        : topic
    )
    set({ topics: updatedTopics })

    try {
      const response = await fetch(`/api/topics/${topicId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'user' })
      })

      if (!response.ok) {
        throw new Error('Failed to approve topic')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topic.id === topicId
          ? { ...topic, approvalStatus: 'pending' as const }
          : topic
      )
      set({
        topics: originalTopics,
        error: error instanceof Error ? error.message : 'Failed to approve topic'
      })
    }
  },

  rejectTopic: async (topicId: string, reason?: string) => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topic.id === topicId
        ? { ...topic, approvalStatus: 'rejected' as const }
        : topic
    )
    set({ topics: updatedTopics })

    try {
      const response = await fetch(`/api/topics/${topicId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, rejectedBy: 'user' })
      })

      if (!response.ok) {
        throw new Error('Failed to reject topic')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topic.id === topicId
          ? { ...topic, approvalStatus: 'pending' as const }
          : topic
      )
      set({
        topics: originalTopics,
        error: error instanceof Error ? error.message : 'Failed to reject topic'
      })
    }
  },

  updatePriority: async (topicId: string, priority: 'high' | 'medium' | 'low') => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topic.id === topicId
        ? { ...topic, priority }
        : topic
    )
    set({ topics: updatedTopics })

    try {
      const response = await fetch(`/api/topics/${topicId}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      })

      if (!response.ok) {
        throw new Error('Failed to update priority')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topic.id === topicId
          ? { ...topic, priority: topics.find(t => t.id === topicId)?.priority || 'medium' }
          : topic
      )
      set({
        topics: originalTopics,
        error: error instanceof Error ? error.message : 'Failed to update priority'
      })
    }
  },

  bulkApprove: async (topicIds: string[]) => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topicIds.includes(topic.id)
        ? { ...topic, approvalStatus: 'approved' as const }
        : topic
    )
    set({ topics: updatedTopics, selectedTopicIds: [] })

    try {
      const response = await fetch('/api/topics/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds, approvedBy: 'user' })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk approve topics')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topicIds.includes(topic.id)
          ? { ...topic, approvalStatus: 'pending' as const }
          : topic
      )
      set({
        topics: originalTopics,
        selectedTopicIds: topicIds,
        error: error instanceof Error ? error.message : 'Failed to bulk approve topics'
      })
    }
  },

  bulkReject: async (topicIds: string[], reason?: string) => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topicIds.includes(topic.id)
        ? { ...topic, approvalStatus: 'rejected' as const }
        : topic
    )
    set({ topics: updatedTopics, selectedTopicIds: [] })

    try {
      const response = await fetch('/api/topics/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds, reason, rejectedBy: 'user' })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk reject topics')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topicIds.includes(topic.id)
          ? { ...topic, approvalStatus: 'pending' as const }
          : topic
      )
      set({
        topics: originalTopics,
        selectedTopicIds: topicIds,
        error: error instanceof Error ? error.message : 'Failed to bulk reject topics'
      })
    }
  },

  bulkUpdatePriority: async (topicIds: string[], priority: 'high' | 'medium' | 'low') => {
    // Optimistic update
    const { topics } = get()
    const updatedTopics = topics.map(topic =>
      topicIds.includes(topic.id)
        ? { ...topic, priority }
        : topic
    )
    set({ topics: updatedTopics, selectedTopicIds: [] })

    try {
      const response = await fetch('/api/topics/bulk-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds, priority })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk update priority')
      }
    } catch (error) {
      // Revert optimistic update
      const originalTopics = topics.map(topic =>
        topicIds.includes(topic.id)
          ? { ...topic, priority: topics.find(t => t.id === topic.id)?.priority || 'medium' }
          : topic
      )
      set({
        topics: originalTopics,
        selectedTopicIds: topicIds,
        error: error instanceof Error ? error.message : 'Failed to bulk update priority'
      })
    }
  },

  // Selection
  selectTopic: (topicId: string) => {
    const { selectedTopicIds } = get()
    if (!selectedTopicIds.includes(topicId)) {
      set({ selectedTopicIds: [...selectedTopicIds, topicId] })
    }
  },

  deselectTopic: (topicId: string) => {
    const { selectedTopicIds } = get()
    set({ selectedTopicIds: selectedTopicIds.filter(id => id !== topicId) })
  },

  selectAllTopics: () => {
    const { topics } = get()
    const allIds = topics.map(topic => topic.id)
    set({ selectedTopicIds: allIds })
  },

  clearSelection: () => {
    set({ selectedTopicIds: [] })
  },

  // Filters
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setStatusFilter: (statusFilter: 'all' | 'pending' | 'approved' | 'rejected') => set({ statusFilter }),
  setPriorityFilter: (priorityFilter: 'all' | 'high' | 'medium' | 'low') => set({ priorityFilter }),
  setCategoryFilter: (categoryFilter: string) => set({ categoryFilter }),

  // UI state
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error })
}))