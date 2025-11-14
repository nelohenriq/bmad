import { NextRequest } from 'next/server';
import { GET } from '@/app/api/content/[contentId]/post/route';
import { prisma } from '@/services/database/prisma';

// Mock Prisma
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    content: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/content/[contentId]/post', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = require('@/services/database/prisma').prisma;
  });

  describe('GET', () => {
    const mockContent = {
      id: 'content-123',
      title: 'Test Blog Post',
      content: '# Test Blog Post\n\nThis is the full content...',
      status: 'generated',
      style: 'professional',
      length: 'medium',
      model: 'llama2:7b',
      wordCount: 250,
      readingTime: 2,
      generatedAt: new Date('2025-11-14T10:00:00Z'),
      outlineGeneratedAt: new Date('2025-11-14T09:00:00Z'),
      outlineModel: 'llama2:7b',
      outlineConfidence: 0.85,
      prompt: JSON.stringify({
        sections: [
          { title: 'Introduction', content: 'Intro content', wordCount: 50 },
          { title: 'Main Content', content: 'Main content', wordCount: 150 },
          { title: 'Conclusion', content: 'Conclusion content', wordCount: 50 }
        ],
        processingTime: 2000,
        tone: 'formal',
        confidence: 0.82
      }),
      topic: {
        id: 'topic-123',
        name: 'Test Topic',
        description: 'A test topic for blog posts'
      },
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      }
    };

    it('should retrieve blog post successfully', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/content/content-123/post');
      const response = await GET(request, { params: { contentId: 'content-123' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.id).toBe('content-123');
      expect(result.title).toBe('Test Blog Post');
      expect(result.content).toBe('# Test Blog Post\n\nThis is the full content...');
      expect(result.status).toBe('generated');
      expect(result.wordCount).toBe(250);
      expect(result.readingTime).toBe(2);

      expect(result.topic).toEqual({
        id: 'topic-123',
        name: 'Test Topic',
        description: 'A test topic for blog posts'
      });

      expect(result.author).toEqual({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com'
      });

      expect(result.metadata).toEqual(
        expect.objectContaining({
          sections: expect.any(Array),
          processingTime: 2000,
          tone: 'formal',
          confidence: 0.82,
          outlineGeneratedAt: mockContent.outlineGeneratedAt,
          outlineModel: 'llama2:7b',
          outlineConfidence: 0.85
        })
      );
    });

    it('should return 404 for non-existent content', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/content/non-existent/post');
      const response = await GET(request, { params: { contentId: 'non-existent' } });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Blog post not found');
    });

    it('should handle malformed metadata gracefully', async () => {
      const contentWithBadMetadata = {
        ...mockContent,
        prompt: 'invalid json',
      };

      mockPrisma.content.findUnique.mockResolvedValue(contentWithBadMetadata);

      const request = new NextRequest('http://localhost:3000/api/content/content-123/post');
      const response = await GET(request, { params: { contentId: 'content-123' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.metadata).toEqual(
        expect.objectContaining({
          outlineGeneratedAt: mockContent.outlineGeneratedAt,
          outlineModel: 'llama2:7b',
          outlineConfidence: 0.85
        })
      );
    });

    it('should handle content without topic association', async () => {
      const contentWithoutTopic = {
        ...mockContent,
        topic: null,
      };

      mockPrisma.content.findUnique.mockResolvedValue(contentWithoutTopic);

      const request = new NextRequest('http://localhost:3000/api/content/content-123/post');
      const response = await GET(request, { params: { contentId: 'content-123' } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.topic).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.content.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/content/content-123/post');
      const response = await GET(request, { params: { contentId: 'content-123' } });
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('Blog post retrieval failed');
    });

    it('should include all required fields in response', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/content/content-123/post');
      const response = await GET(request, { params: { contentId: 'content-123' } });
      const result = await response.json();

      // Check all required fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('style');
      expect(result).toHaveProperty('length');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('readingTime');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('topic');
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('metadata');
    });
  });
});