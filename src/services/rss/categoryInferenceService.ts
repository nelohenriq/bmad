import { aiService } from '../ai/aiService'
import { rssService } from './rssService'

export interface CategoryInferenceResult {
  category: string
  confidence: number
  reasoning: string
}

export class CategoryInferenceService {
  private readonly COMMON_CATEGORIES = [
    'Technology',
    'Business',
    'Science',
    'Health',
    'Sports',
    'Entertainment',
    'Politics',
    'World News',
    'Finance',
    'Lifestyle',
    'Education',
    'Gaming',
    'Food',
    'Travel',
    'Fashion',
    'Art & Design',
    'Environment',
    'Real Estate',
    'Automotive',
    'Cryptocurrency',
    'AI & Machine Learning',
    'Programming',
    'Marketing',
    'Startups',
    'Productivity',
    'Other'
  ]

  /**
   * Infer category from RSS feed content
   */
  async inferCategory(feedUrl: string): Promise<CategoryInferenceResult> {
    try {
      // Fetch the RSS feed to analyze its content
      const fetchResult = await rssService.fetchFeed(feedUrl, 1) // Single retry for speed

      if (!fetchResult.success || !fetchResult.feed) {
        throw new Error(`Failed to fetch feed: ${fetchResult.error}`)
      }

      const feed = fetchResult.feed

      // Prepare content for analysis
      const feedInfo = {
        title: feed.title || '',
        description: feed.description || '',
        sampleItems: feed.items.slice(0, 5).map(item => ({
          title: item.title || '',
          content: item.content?.substring(0, 500) || '', // Limit content length
          categories: item.categories || []
        }))
      }

      // Create analysis prompt
      const prompt = `Analyze this RSS feed and determine the most appropriate category from the following options:

${this.COMMON_CATEGORIES.join(', ')}

Feed Information:
Title: ${feedInfo.title}
Description: ${feedInfo.description}

Sample Content (first 5 items):
${feedInfo.sampleItems.map((item, i) =>
  `Item ${i + 1}:
  Title: ${item.title}
  Content: ${item.content.substring(0, 200)}...
  Categories: ${item.categories.join(', ') || 'none'}`
).join('\n\n')}

Based on the feed title, description, and sample content, determine the most appropriate category. Consider:
- The main topic or theme of the content
- The target audience
- The type of information being shared
- Any explicit categories mentioned in the feed items

Respond with a JSON object in this exact format:
{
  "category": "Category Name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category fits"
}

Choose "Other" only if none of the predefined categories are appropriate.`

      // Use AI to analyze and categorize
      const analysisResponse = await aiService.analyzeTopic(`RSS Feed Analysis: ${feedInfo.title}`)

      // For now, return a fallback since analyzeTopic might not work as expected
      // In a real implementation, we'd parse the AI response
      const inferredCategory = this.fallbackCategoryInference(feedInfo)

      return {
        category: inferredCategory.category,
        confidence: inferredCategory.confidence,
        reasoning: inferredCategory.reasoning
      }

    } catch (error) {
      console.warn('Category inference failed, using fallback:', error)
      return this.getFallbackCategory()
    }
  }

  /**
   * Fallback category inference using keyword matching
   */
  private fallbackCategoryInference(feedInfo: any): CategoryInferenceResult {
    const textToAnalyze = `${feedInfo.title} ${feedInfo.description} ${
      feedInfo.sampleItems.map((item: any) => `${item.title} ${item.content}`).join(' ')
    }`.toLowerCase()

    // Define keyword patterns for each category
    const categoryKeywords: Record<string, string[]> = {
      'Technology': ['tech', 'software', 'programming', 'developer', 'coding', 'ai', 'machine learning', 'blockchain', 'crypto', 'app', 'mobile', 'web'],
      'Business': ['business', 'finance', 'economy', 'market', 'startup', 'entrepreneur', 'corporate', 'industry', 'commerce'],
      'Science': ['science', 'research', 'study', 'discovery', 'scientific', 'laboratory', 'experiment', 'physics', 'chemistry', 'biology'],
      'Health': ['health', 'medical', 'medicine', 'doctor', 'patient', 'disease', 'treatment', 'wellness', 'fitness', 'nutrition'],
      'Sports': ['sports', 'football', 'basketball', 'soccer', 'baseball', 'tennis', 'athlete', 'game', 'match', 'tournament'],
      'Entertainment': ['entertainment', 'movie', 'film', 'music', 'celebrity', 'hollywood', 'tv', 'show', 'actor', 'artist'],
      'Politics': ['politics', 'political', 'government', 'election', 'policy', 'politician', 'democrat', 'republican', 'vote'],
      'World News': ['news', 'world', 'international', 'global', 'breaking', 'headline', 'current events'],
      'Finance': ['finance', 'financial', 'stock', 'market', 'investment', 'banking', 'economy', 'trading', 'crypto', 'bitcoin'],
      'Lifestyle': ['lifestyle', 'life', 'daily', 'home', 'family', 'relationship', 'fashion', 'beauty', 'travel'],
      'Education': ['education', 'learning', 'school', 'university', 'student', 'teacher', 'course', 'academic', 'study'],
      'Gaming': ['gaming', 'game', 'video game', 'esports', 'gamer', 'console', 'pc gaming', 'mobile gaming'],
      'Food': ['food', 'cooking', 'recipe', 'restaurant', 'chef', 'cuisine', 'dining', 'meal', 'drink'],
      'Travel': ['travel', 'tourism', 'destination', 'vacation', 'trip', 'hotel', 'flight', 'adventure'],
      'Fashion': ['fashion', 'style', 'clothing', 'designer', 'trend', 'model', 'runway', 'couture'],
      'Art & Design': ['art', 'design', 'creative', 'artist', 'gallery', 'museum', 'photography', 'illustration'],
      'Environment': ['environment', 'climate', 'green', 'sustainable', 'ecology', 'nature', 'conservation'],
      'Real Estate': ['real estate', 'property', 'housing', 'home', 'mortgage', 'rent', 'apartment'],
      'Automotive': ['car', 'automotive', 'vehicle', 'auto', 'motorcycle', 'driving', 'transportation'],
      'Cryptocurrency': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'trading'],
      'AI & Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'neural network', 'deep learning', 'robotics'],
      'Programming': ['programming', 'code', 'developer', 'software', 'javascript', 'python', 'java', 'web development'],
      'Marketing': ['marketing', 'advertising', 'brand', 'social media', 'seo', 'content marketing', 'digital marketing'],
      'Startups': ['startup', 'entrepreneur', 'venture', 'funding', 'pitch', 'scale', 'growth'],
      'Productivity': ['productivity', 'workflow', 'tool', 'efficiency', 'organization', 'management']
    }

    // Count matches for each category
    const scores: Record<string, number> = {}
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        const matches = textToAnalyze.match(regex)
        if (matches) {
          score += matches.length
        }
      }
      scores[category] = score
    }

    // Find the category with the highest score
    let bestCategory = 'Other'
    let bestScore = 0

    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score
        bestCategory = category
      }
    }

    const confidence = bestScore > 0 ? Math.min(bestScore / 10, 0.9) : 0.1 // Cap at 0.9, minimum 0.1

    return {
      category: bestCategory,
      confidence,
      reasoning: `Category inferred from keyword analysis (${bestScore} matches)`
    }
  }

  /**
   * Get fallback category when inference fails
   */
  private getFallbackCategory(): CategoryInferenceResult {
    return {
      category: 'Other',
      confidence: 0.1,
      reasoning: 'Unable to analyze feed content, using default category'
    }
  }
}

export const categoryInferenceService = new CategoryInferenceService()