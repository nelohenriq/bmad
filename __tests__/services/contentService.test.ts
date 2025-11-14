import { contentService } from '../../src/services/database/contentService'

// Mock the prisma import used by the service
jest.mock('../../src/services/database/prisma', () => ({
  prisma: {
    content: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    contentSource: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

import { prisma } from '../../src/services/database/prisma'


describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create content', async () => {
    const mockContent = {
      id: 'content-1',
      userId: 'user-1',
      title: 'Test Article',
      content: 'Test content',
      style: 'professional',
      length: 'medium',
      model: 'llama2:7b',
      status: 'draft',
      outline: null,
      wordCount: null,
      readingTime: null,
      prompt: null,
      generatedAt: new Date(),
      outlineGeneratedAt: null,
      outlineModel: null,
      outlinePrompt: null,
      outlineConfidence: null,
      isPublished: false,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      topicId: null,
      topic: null,
      sources: [],
    }

    ;(prisma.content.create as jest.MockedFunction<typeof prisma.content.create>).mockResolvedValue(mockContent)

    const result = await contentService.createContent({
      userId: 'user-1',
      title: 'Test Article',
      content: 'Test content',
      style: 'professional',
      length: 'medium',
      model: 'llama2:7b',
    })

    expect(result).toEqual(mockContent)
    expect(prisma.content.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        title: 'Test Article',
      }),
    })
  })

  it('should get content by id', async () => {
    const mockContent = {
      id: 'content-1',
      title: 'Test Article',
      sources: [],
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    }

    ;(prisma.content.findUnique as jest.MockedFunction<typeof prisma.content.findUnique>).mockResolvedValue(mockContent as any)

    const result = await contentService.getContentById('content-1')

    expect(result).toEqual(mockContent)
    expect(prisma.content.findUnique).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      include: expect.any(Object),
    })
  })

  it('should get user content', async () => {
    const mockContents = [
      { id: 'content-1', title: 'Article 1' },
      { id: 'content-2', title: 'Article 2' },
    ]

    ;(prisma.content.findMany as jest.MockedFunction<typeof prisma.content.findMany>).mockResolvedValue(mockContents as any)

    const result = await contentService.getUserContent('user-1', 10, 0)

    expect(result).toEqual(mockContents)
    expect(prisma.content.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: { sources: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 0,
    })
  })

  it('should search content', async () => {
    const mockResults = [{ id: 'content-1', title: 'AI Article' }]

    ;(prisma.content.findMany as jest.MockedFunction<typeof prisma.content.findMany>).mockResolvedValue(mockResults as any)

    const result = await contentService.searchContent('user-1', 'AI', 10)

    expect(result).toEqual(mockResults)
    expect(prisma.content.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          { title: { contains: 'AI' } },
          { content: { contains: 'AI' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
  })
})