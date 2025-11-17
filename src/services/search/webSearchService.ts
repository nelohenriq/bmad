export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
  publishedDate?: string
}

export interface WebSearchOptions {
  query: string
  maxResults?: number
  includeDateFilter?: boolean
  dateRange?: {
    from: Date
    to: Date
  }
}

export interface WebSearchResponse {
  query: string
  results: SearchResult[]
  totalResults: number
  searchTime: number
}

/**
 * Web search service for finding additional content about topics
 * This is a mock implementation - in production, integrate with real search APIs
 * like Google Custom Search, Bing Search API, or SerpApi
 */
export class WebSearchService {
  private readonly SEARCH_APIS = {
    tavily: 'https://api.tavily.com/search',
    exa: 'https://api.exa.ai/search',
    google: 'https://www.googleapis.com/customsearch/v1',
    bing: 'https://api.bing.microsoft.com/v7.0/search',
    serpapi: 'https://serpapi.com/search'
  }

  // API Keys from environment variables
  private readonly apiKeys = {
    tavily: process.env.TAVILY_API_KEY,
    exa: process.env.EXA_API_KEY,
    google: process.env.GOOGLE_SEARCH_API_KEY,
    googleCx: process.env.GOOGLE_SEARCH_CX, // Custom Search Engine ID
    bing: process.env.BING_SEARCH_API_KEY,
    serpapi: process.env.SERPAPI_KEY
  }

  /**
   * Search the web for content related to a query
   */
  async search(options: WebSearchOptions): Promise<WebSearchResponse> {
    const startTime = Date.now()
    const { query, maxResults = 5 } = options

    try {
      // Try real APIs first, fallback to mock
      // Priority: Tavily > Exa > SerpApi > Google > Bing > Mock
      let results: SearchResult[] = []

      if (this.apiKeys.tavily) {
        results = await this.performTavilySearch(query, maxResults)
      } else if (this.apiKeys.exa) {
        results = await this.performExaSearch(query, maxResults)
      } else if (this.apiKeys.serpapi) {
        results = await this.performSerpApiSearch(query, maxResults)
      } else if (this.apiKeys.google && this.apiKeys.googleCx) {
        results = await this.performGoogleSearch(query, maxResults)
      } else if (this.apiKeys.bing) {
        results = await this.performBingSearch(query, maxResults)
      } else {
        // No real API keys configured, use mock
        console.log('No web search API keys configured, using mock search')
        results = await this.performMockSearch(query, maxResults)
      }

      return {
        query,
        results,
        totalResults: results.length,
        searchTime: Date.now() - startTime
      }
    } catch (error) {
      console.error('Web search failed:', error)
      // Fallback to mock search on error
      try {
        const results = await this.performMockSearch(query, maxResults)
        return {
          query,
          results,
          totalResults: results.length,
          searchTime: Date.now() - startTime
        }
      } catch (mockError) {
        // Return empty results if everything fails
        return {
          query,
          results: [],
          totalResults: 0,
          searchTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Mock search implementation - replace with real API calls
   */
  private async performMockSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    // Generate mock results based on query keywords
    const keywords = query.toLowerCase().split(' ')
    const mockResults: SearchResult[] = []

    // Common sources for mock results
    const sources = [
      'TechCrunch', 'Wired', 'The Verge', 'MIT Technology Review',
      'Harvard Business Review', 'Forbes', 'Bloomberg', 'Reuters',
      'BBC News', 'The New York Times', 'The Guardian'
    ]

    for (let i = 0; i < maxResults; i++) {
      const source = sources[Math.floor(Math.random() * sources.length)]
      const daysAgo = Math.floor(Math.random() * 30)

      mockResults.push({
        title: `${this.capitalizeWords(query)} - ${source} Analysis ${i + 1}`,
        url: `https://${source.toLowerCase().replace(/\s+/g, '')}.com/article-${i + 1}`,
        snippet: `This comprehensive analysis explores ${query} in depth, covering recent developments and future implications. ${keywords.slice(0, 3).join(', ')} are key factors in understanding this topic.`,
        source,
        publishedDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return mockResults
  }

  /**
   * Extract key topics from text for better search queries
   */
  extractSearchTopics(text: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    // Remove common stop words
    const stopWords = new Set(['that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'])

    return words.filter(word => !stopWords.has(word)).slice(0, 5)
  }

  /**
   * Create optimized search query from article title
   */
  createSearchQuery(title: string, additionalKeywords: string[] = []): string {
    const topics = this.extractSearchTopics(title)
    const allKeywords = [...topics, ...additionalKeywords]

    // Create a focused search query
    return allKeywords.slice(0, 4).join(' ')
  }

  /**
   * Tavily AI search + extract implementation (BEST for our use case)
   * Uses search first, then extracts content from top results for richer snippets
   */
  private async performTavilySearch(query: string, maxResults: number): Promise<SearchResult[]> {
    // First, perform search to get URLs
    const searchResponse = await fetch(this.SEARCH_APIS.tavily, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.tavily}`
      },
      body: JSON.stringify({
        query,
        max_results: Math.min(maxResults, 3), // Get fewer but better results
        include_answer: false,
        include_raw_content: false,
        search_depth: "advanced" // Better search quality
      })
    })

    if (!searchResponse.ok) {
      throw new Error(`Tavily search request failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const results: SearchResult[] = []

    if (searchData.results && searchData.results.length > 0) {
      // Extract content from top 2 results for richer snippets
      const topUrls = searchData.results.slice(0, 2).map((r: any) => r.url)

      if (topUrls.length > 0) {
        try {
          const extractResponse = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKeys.tavily}`
            },
            body: JSON.stringify({
              urls: topUrls,
              include_images: false
            })
          })

          if (extractResponse.ok) {
            const extractData = await extractResponse.json()

            // Create results with extracted content
            for (let i = 0; i < Math.min(searchData.results.length, maxResults); i++) {
              const searchResult = searchData.results[i]
              const extractedContent = extractData.results?.find((e: any) => e.url === searchResult.url)

              results.push({
                title: searchResult.title,
                url: searchResult.url,
                snippet: extractedContent?.content?.substring(0, 500) || searchResult.content || searchResult.snippet || '',
                source: this.extractDomain(searchResult.url),
                publishedDate: searchResult.published_date ? new Date(searchResult.published_date).toISOString() : undefined
              })
            }
          } else {
            // Fallback to search results only
            for (const result of searchData.results.slice(0, maxResults)) {
              results.push({
                title: result.title,
                url: result.url,
                snippet: result.content || result.snippet || '',
                source: this.extractDomain(result.url),
                publishedDate: result.published_date ? new Date(result.published_date).toISOString() : undefined
              })
            }
          }
        } catch (extractError) {
          console.warn('Tavily extract failed, using search results only:', extractError)
          // Fallback to search results only
          for (const result of searchData.results.slice(0, maxResults)) {
            results.push({
              title: result.title,
              url: result.url,
              snippet: result.content || result.snippet || '',
              source: this.extractDomain(result.url),
              publishedDate: result.published_date ? new Date(result.published_date).toISOString() : undefined
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Exa AI research implementation (PERFECT for our use case)
   * Uses /research endpoint for comprehensive AI-powered research
   */
  private async performExaSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch('https://api.exa.ai/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKeys.exa!
      },
      body: JSON.stringify({
        query,
        numResults: Math.min(maxResults, 5), // Research endpoint works best with fewer results
        includeText: true,
        includeDomains: [],
        excludeDomains: [],
        // Research endpoint provides AI-synthesized answers
        answerQuestion: `Research and summarize key insights about: ${query}`,
        searchType: "research" // Use research mode for comprehensive analysis
      })
    })

    if (!response.ok) {
      throw new Error(`Exa research request failed: ${response.status}`)
    }

    const data = await response.json()
    const results: SearchResult[] = []

    // Exa research returns different structure - adapt to our SearchResult format
    if (data.results) {
      for (const result of data.results.slice(0, maxResults)) {
        results.push({
          title: result.title || `${query} - Research Insight`,
          url: result.url,
          snippet: result.text || result.snippet || result.summary || `AI research insight about ${query}`,
          source: this.extractDomain(result.url),
          publishedDate: result.publishedDate ? new Date(result.publishedDate).toISOString() : undefined
        })
      }
    }

    // If research endpoint gives us an answer, include it as first result
    if (data.answer && results.length > 0) {
      results[0].snippet = `${data.answer}\n\n${results[0].snippet}`
    }

    return results
  }

  /**
   * Real SerpApi search implementation
   */
  private async performSerpApiSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch(`${this.SEARCH_APIS.serpapi}?q=${encodeURIComponent(query)}&api_key=${this.apiKeys.serpapi}&num=${maxResults}`)

    if (!response.ok) {
      throw new Error(`SerpApi request failed: ${response.status}`)
    }

    const data = await response.json()
    const results: SearchResult[] = []

    if (data.organic_results) {
      for (const result of data.organic_results.slice(0, maxResults)) {
        results.push({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          source: this.extractDomain(result.link),
          publishedDate: result.date ? new Date(result.date).toISOString() : undefined
        })
      }
    }

    return results
  }

  /**
   * Real Google Custom Search implementation
   */
  private async performGoogleSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch(`${this.SEARCH_APIS.google}?q=${encodeURIComponent(query)}&key=${this.apiKeys.google}&cx=${this.apiKeys.googleCx}&num=${maxResults}`)

    if (!response.ok) {
      throw new Error(`Google Search request failed: ${response.status}`)
    }

    const data = await response.json()
    const results: SearchResult[] = []

    if (data.items) {
      for (const item of data.items.slice(0, maxResults)) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet,
          source: this.extractDomain(item.link),
          publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'] || undefined
        })
      }
    }

    return results
  }

  /**
   * Real Bing Search implementation
   */
  private async performBingSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await fetch(this.SEARCH_APIS.bing, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKeys.bing!
      },
      body: new URLSearchParams({
        q: query,
        count: maxResults.toString()
      })
    })

    if (!response.ok) {
      throw new Error(`Bing Search request failed: ${response.status}`)
    }

    const data = await response.json()
    const results: SearchResult[] = []

    if (data.webPages?.value) {
      for (const page of data.webPages.value.slice(0, maxResults)) {
        results.push({
          title: page.name,
          url: page.url,
          snippet: page.snippet,
          source: this.extractDomain(page.url),
          publishedDate: page.datePublished ? new Date(page.datePublished).toISOString() : undefined
        })
      }
    }

    return results
  }

  /**
   * Extract domain from URL for source attribution
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return 'Unknown'
    }
  }

  /**
   * Check which APIs are available
   */
  getAvailableApis(): { tavily: boolean; exa: boolean; serpapi: boolean; google: boolean; bing: boolean; mock: boolean } {
    return {
      tavily: !!this.apiKeys.tavily,
      exa: !!this.apiKeys.exa,
      serpapi: !!this.apiKeys.serpapi,
      google: !!(this.apiKeys.google && this.apiKeys.googleCx),
      bing: !!this.apiKeys.bing,
      mock: true // Always available as fallback
    }
  }

  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}

export const webSearchService = new WebSearchService()