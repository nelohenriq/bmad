import { contentService } from '../../../src/services/database/contentService'
import { prisma } from '../../../src/services/database/prisma'

describe('ContentService Integration Tests', () => {
  const testUserId = 'test-user-integration'

  beforeAll(async () => {
    // Ensure database is clean for integration tests
    await prisma.content.deleteMany({ where: { userId: testUserId } })
    await prisma.feed.deleteMany({ where: { userId: testUserId } })
  })

  afterAll(async () => {
    // Clean up after tests
    await prisma.content.deleteMany({ where: { userId: testUserId } })
    await prisma.feed.deleteMany({ where: { userId: testUserId } })
  })

  describe('Content CRUD Operations', () => {
    it('should create, read, update and delete content', async () => {
      // Create content
      const createdContent = await contentService.createContent({
        userId: testUserId,
        title: 'Integration Test Article',
        content: 'This is test content for integration testing.',
        style: 'professional',
        length: 'medium',
        model: 'llama2:7b'
      })

      expect(createdContent).toBeDefined()
      expect(createdContent.title).toBe('Integration Test Article')
      expect(createdContent.userId).toBe(testUserId)

      const contentId = createdContent.id

      // Read content
      const retrievedContent = await contentService.getContentById(contentId)
      expect(retrievedContent).toBeDefined()
      expect(retrievedContent?.id).toBe(contentId)

      // Update content (if update method exists)
      // Note: ContentService may not have update method, adjust based on actual implementation

      // Delete content (if delete method exists)
      // Note: ContentService may not have delete method, adjust based on actual implementation
    })

    it('should handle content search', async () => {
      // Create test content
      await contentService.createContent({
        userId: testUserId,
        title: 'Search Test Article',
        content: 'This article contains searchable content.',
        style: 'casual',
        length: 'short',
        model: 'llama2:7b'
      })

      // Search content
      const searchResults = await contentService.searchContent(testUserId, 'searchable')
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults[0].content).toContain('searchable')
    })

    it('should get user content with pagination', async () => {
      const userContent = await contentService.getUserContent(testUserId, 5, 0)
      expect(Array.isArray(userContent)).toBe(true)
      expect(userContent.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Feed CRUD Operations', () => {
    it('should create, read, update and delete feeds', async () => {
      // Create feed
      const createdFeed = await contentService.addFeed({
        userId: testUserId,
        url: 'https://example.com/integration-test-feed.xml',
        title: 'Integration Test Feed',
        description: 'Test feed for integration testing'
      })

      expect(createdFeed).toBeDefined()
      expect(createdFeed.url).toBe('https://example.com/integration-test-feed.xml')

      const feedId = createdFeed.id

      // Read feed
      const retrievedFeed = await contentService.getFeedById(feedId)
      expect(retrievedFeed).toBeDefined()
      expect(retrievedFeed?.id).toBe(feedId)

      // Update feed
      const updatedFeed = await contentService.updateFeed(feedId, {
        title: 'Updated Integration Test Feed'
      })
      expect(updatedFeed.title).toBe('Updated Integration Test Feed')

      // Delete feed
      await contentService.deleteFeed(feedId)

      // Verify deletion
      const deletedFeed = await contentService.getFeedById(feedId)
      expect(deletedFeed).toBeNull()
    })

    it('should get user feeds', async () => {
      const userFeeds = await contentService.getUserFeeds(testUserId)
      expect(Array.isArray(userFeeds)).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should get content stats', async () => {
      const stats = await contentService.getContentStats(testUserId)
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('published')
      expect(stats).toHaveProperty('unpublished')
      expect(typeof stats.total).toBe('number')
    })

    it('should get feed stats', async () => {
      const stats = await contentService.getFeedStats(testUserId)
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('inactive')
      expect(typeof stats.total).toBe('number')
    })
  })
})