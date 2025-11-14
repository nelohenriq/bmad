import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/generate-post/route';
import { prisma } from '@/services/database/prisma';

// Mock the ContentWritingService
jest.mock('@/services/content/contentWritingService', () => ({
  contentWritingService: {
    generateBlogPost: jest.fn(),
  },
}));

// Mock Prisma
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    content: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('/api/content/generate-post', () => {
  let mockContentWritingService: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContentWritingService = require('@/services/content/contentWritingService').contentWritingService;
    mockPrisma = require('@/services/database/prisma').prisma;
  });

  describe('POST', () => {
    const validRequestBody = {
      outlineId: 'outline-123',
      style: 'professional',
      length: 'medium',
      tone: 'formal',
    };

    const mockOutline = {
      id: 'outline-123',
      outline: JSON.stringify({ title: 'Test Outline' }),
      topic: {
        id: 'topic-123',
        name: 'Test Topic',
        approvals: [
          {
            approvalLevel: 'approved',
            approvedBy: 'user-123',
          },
        ],
      },
    };

    const mockBlogPost = {
      title: 'Generated Blog Post',
      content: 'Full blog post content...',
      wordCount: 500,
      readingTime: 3,
      sections: [],
      metadata: {
        generatedAt: new Date(),
        model: 'llama2:7b',
        confidence: 0.85,
        processingTime: 2500,
        outlineId: 'outline-123',
        style: 'professional',
        length: 'medium',
        tone: 'formal',
      },
    };

    it('should generate and store blog post successfully', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);
      mockContentWritingService.generateBlogPost.mockResolvedValue(mockBlogPost);
      mockPrisma.content.create.mockResolvedValue({
        id: 'content-456',
        ...mockBlogPost,
      });

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.contentId).toBe('content-456');
      expect(result.blogPost).toEqual(mockBlogPost);
      expect(result.metadata).toEqual(mockBlogPost.metadata);

      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          topicId: 'topic-123',
          title: 'Generated Blog Post',
          content: 'Full blog post content...',
          status: 'generated',
          style: 'professional',
          length: 'medium',
          model: 'llama2:7b',
          wordCount: 500,
          readingTime: 3,
          generatedAt: mockBlogPost.metadata.generatedAt,
          prompt: expect.stringContaining('sections'),
        }),
      });
    });

    it('should return 404 for non-existent outline', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Outline not found');
    });

    it('should return 400 for outline without topic association', async () => {
      const outlineWithoutTopic = {
        ...mockOutline,
        topic: null,
      };

      mockPrisma.content.findUnique.mockResolvedValue(outlineWithoutTopic);

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Outline is not associated with a topic');
    });

    it('should return 400 for unapproved topics', async () => {
      const outlineWithUnapprovedTopic = {
        ...mockOutline,
        topic: {
          ...mockOutline.topic,
          approvals: [], // No approvals
        },
      };

      mockPrisma.content.findUnique.mockResolvedValue(outlineWithUnapprovedTopic);

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Topic is not approved for content generation');
    });

    it('should return 400 for invalid request data', async () => {
      const invalidRequestBody = {
        // Missing outlineId
        style: 'professional',
      };

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);
      mockContentWritingService.generateBlogPost.mockRejectedValue(
        new Error('Content generation failed')
      );

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('Blog post generation failed');
    });

    it('should support different writing styles and parameters', async () => {
      const customRequestBody = {
        outlineId: 'outline-123',
        style: 'conversational',
        length: 'long',
        tone: 'enthusiastic',
      };

      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);
      mockContentWritingService.generateBlogPost.mockResolvedValue({
        ...mockBlogPost,
        metadata: {
          ...mockBlogPost.metadata,
          style: 'conversational',
          length: 'long',
          tone: 'enthusiastic',
        },
      });
      mockPrisma.content.create.mockResolvedValue({
        id: 'content-789',
        ...mockBlogPost,
      });

      const request = new NextRequest('http://localhost:3000/api/content/generate-post', {
        method: 'POST',
        body: JSON.stringify(customRequestBody),
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(mockContentWritingService.generateBlogPost).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'conversational',
          length: 'long',
          tone: 'enthusiastic',
        })
      );
    });
  });
});