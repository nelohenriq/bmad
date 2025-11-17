import { toast } from '@/lib/hooks/useToast'

export interface ApiResponse<T = Record<string, any>> {
  data?: T
  error?: string
  success: boolean
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseURL = ''
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config)

        if (response.ok) {
          const data = await response.json()
          return { data, success: true }
        }

        // Handle specific error codes
        if (response.status === 401) {
          // Handle unauthorized - could redirect to login
          toast({
            title: 'Authentication Required',
            description: 'Please log in to continue.',
            variant: 'destructive',
          })
          return { error: 'Unauthorized', success: false }
        }

        if (response.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to perform this action.',
            variant: 'destructive',
          })
          return { error: 'Forbidden', success: false }
        }

        if (response.status === 404) {
          toast({
            title: 'Not Found',
            description: 'The requested resource was not found.',
            variant: 'destructive',
          })
          return { error: 'Not found', success: false }
        }

        if (response.status >= 500) {
          // Server errors - retry
          if (attempt < retries) {
            await this.delay(this.calculateBackoffDelay(attempt))
            continue
          }
          toast({
            title: 'Server Error',
            description: 'Something went wrong on our end. Please try again later.',
            variant: 'destructive',
          })
          return { error: 'Server error', success: false }
        }

        // Client errors - don't retry
        let errorMessage = 'An error occurred'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          // Ignore JSON parse errors
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })

        return { error: errorMessage, success: false }

      } catch (error) {
        lastError = error as Error

        if (attempt < retries) {
          await this.delay(this.calculateBackoffDelay(attempt))
          continue
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Network error'
    toast({
      title: 'Connection Error',
      description: 'Unable to connect. Please check your internet connection and try again.',
      variant: 'destructive',
    })

    return { error: errorMessage, success: false }
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000 // 1 second
    const maxDelay = 10000 // 10 seconds
    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
    return Math.min(delay, maxDelay)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async postBlob(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<{ data?: Blob, error?: string, success: boolean }> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      ...options,
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }

    try {
      const response = await fetch(url, config)

      if (response.ok) {
        const blob = await response.blob()
        return { data: blob, success: true }
      }

      // Handle errors similar to request method
      let errorMessage = 'Export failed'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        // Ignore JSON parse errors
      }

      return { error: errorMessage, success: false }
    } catch (error) {
      return { error: 'Network error during export', success: false }
    }
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // Specialized methods for common operations
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // For file uploads, we might want to show progress
    // This is a simplified version
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Let browser set content-type for FormData
        ...Object.fromEntries(
          Object.entries(this.defaultHeaders).filter(([key]) => key !== 'Content-Type')
        ),
      },
    })
  }
}

export const apiClient = new ApiClient()

// Convenience functions for common API calls
export const api = {
  // Content operations
  getContent: (id: string) => apiClient.get(`/api/content/${id}/edit`),
  saveContent: (id: string, data: any) => apiClient.put(`/api/content/${id}/edit`, data),
  exportContent: (id: string, format: string, options: any) =>
    apiClient.post(`/api/content/${id}/export`, { format, ...options }),

  // Feed operations
  getFeeds: () => apiClient.get('/api/feeds'),
  addFeed: (data: any) => apiClient.post('/api/feeds', data),

  // Analytics
  getAnalytics: (params?: any) => apiClient.get('/api/analytics/dashboard', { body: JSON.stringify(params) }),

  // User operations
  getUserProfile: () => apiClient.get('/api/user/profile'),
  updateUserProfile: (data: any) => apiClient.put('/api/user/profile', data),
}