import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/generate-outline/route';
import { prisma } from '@/services/database/prisma';

// Mock the contentOutlineService
jest.mock('@/services/content/contentOutlineService', () => ({
  contentOutlineService: {
    generateOutline: jest.fn(),
  },
}));

// Mock Prisma
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    topic: {
      findUnique: jest.fn(),
    },
    content: {
      create: jest.fn(),
    },
  },
}));

describe('/api/content/generate-outline', () => {
  let mockContentOutlineService: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContentOutlineService = require('@/services/content/contentOutlineService').contentOutlineService;
    mockPrisma = require('@/services/database/prisma').prisma;
  });

  describe('POST', () => {
    const validRequestBody = {
      topicId: 'topic-123',
      angleIds: ['angle-1', 'angle-2'],
      style: 'standard',
      length: 'medium',
    };

    const mockTopic = {
      id: 'topic-123',
      name: 'Test Topic',
      description: 'A test topic',
      approvals: [
        {
          approvedBy: 'user-456',
          approvalLevel: 'approved',
        },
      ],
    };

    const mockOutline = {
      title: 'Generated Blog Post Title',
      introduction: {
        title: 'Introduction',
        content: 'Introduction content',
        keyPoints: ['Point 1'],
      },
      body: [
        {
          title: 'Main Section',
          content: 'Body content',
          keyPoints: ['Key point'],
        },
      ],
      conclusion: {
        title: 'Conclusion',
        content: 'Conclusion content',
        keyPoints: ['Final point'],
      },
      metadata: {
        generatedAt: new Date(),
        model: 'llama2:7b',
        confidence: 0.85,
        processingTime: 2500,
      },
    };

    const mockCreatedContent = {
      id: 'content-789',
      title: 'Generated Blog Post Title',
      userId: 'user-456',
      topicId: 'topic-123',
      content: '',
      outline: JSON.stringify(mockOutline),
      status: 'outline_generated',
      style: 'standard',
      length: 'medium',
      model: 'llama2:7b',
      outlineGeneratedAt: mockOutline.metadata.generatedAt,
      outlineModel: mockOutline.metadata.model,
      outlineConfidence: mockOutline.metadata.confidence,
    };

    it('should generate outline successfully for approved topic', async () => {
      // Mock topic lookup
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);

      // Mock outline generation
      mockContentOutlineService.generateOutline.mockResolvedValue(mockOutline);

      // Mock content creation
      mockPrisma.content.create.mockResolvedValue(mockCreatedContent);

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.contentId).toBe('content-789');
      expect(result.outline).toEqual(mockOutline);
      expect(result.metadata).toEqual(mockOutline.metadata);

      expect(mockPrisma.topic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-123' },
        include: {
          approvals: {
            where: { approvalLevel: 'approved' },
          },
        },
      });

      expect(mockContentOutlineService.generateOutline).toHaveBeenCalledWith(validRequestBody);
    });

    it('should return 404 for non-existent topic', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('Topic not found');
    });

    it('should return 400 for unapproved topic', async () => {
      const unapprovedTopic = {
        ...mockTopic,
        approvals: [], // No approvals
      };

      mockPrisma.topic.findUnique.mockResolvedValue(unapprovedTopic);

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Topic is not approved for content generation');
    });

    it('should validate request body', async () => {
      const invalidRequestBody = {
        // Missing topicId
        style: 'invalid-style', // Invalid enum value
      };

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should handle outline generation errors', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);
      mockContentOutlineService.generateOutline.mockRejectedValue(
        new Error('LLM service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('Outline generation failed');
    });

    it('should handle database errors during content creation', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue(mockTopic);
      mockContentOutlineService.generateOutline.mockResolvedValue(mockOutline);
      mockPrisma.content.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/content/generate-outline', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('Outline generation failed');
    });
  });
});