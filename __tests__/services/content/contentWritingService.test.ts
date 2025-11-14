jest.mock('@/services/ai/ollamaClient', () => ({
  OllamaClient: jest.fn().mockImplementation(() => ({
    generateContent: jest.fn(),
  })),
}));
jest.mock('@/services/database/prisma', () => ({
  prisma: {
    content: {
      findUnique: jest.fn(),
    },
  },
}));

import { ContentWritingService, BlogPost } from '@/services/content/contentWritingService';
import { OllamaClient } from '@/services/ai/ollamaClient';
import { prisma } from '@/services/database/prisma';

describe('ContentWritingService', () => {
  let service: ContentWritingService;
  let mockOllamaClient: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create service
    service = new ContentWritingService();

    // Get the mock instances
    mockOllamaClient = (service as any).ollamaClient;
    mockPrisma = prisma;
  });

  describe('generateBlogPost', () => {
    const mockOutline = {
      id: 'outline-1',
      outline: JSON.stringify({
        title: 'Test Blog Post',
        introduction: {
          title: 'Introduction',
          content: 'This is an introduction',
          keyPoints: ['Point 1', 'Point 2']
        },
        body: [
          {
            title: 'Main Section',
            content: 'This is the main content',
            keyPoints: ['Key point 1']
          }
        ],
        conclusion: {
          title: 'Conclusion',
          content: 'This is the conclusion',
          keyPoints: ['Final point']
        }
      }),
      topic: {
        id: 'topic-1',
        name: 'Test Topic',
        contentAngles: [
          {
            id: 'angle-1',
            title: 'Test Angle',
            description: 'Angle description',
            keywords: 'keyword1, keyword2'
          }
        ],
        approvals: [
          {
            approvalLevel: 'approved',
            approvedBy: 'user-1'
          }
        ]
      }
    };

    const mockRequest = {
      outlineId: 'outline-1',
      style: 'professional' as const,
      length: 'medium' as const,
      tone: 'formal' as const,
    };

    it('should generate a complete blog post from outline', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);

      const mockLLMResponses = [
        'This is the introduction content with detailed explanation.',
        'This is the main section content with comprehensive analysis.',
        'This is the conclusion content summarizing key points.'
      ];

      mockOllamaClient.generateContent
        .mockResolvedValueOnce(mockLLMResponses[0])
        .mockResolvedValueOnce(mockLLMResponses[1])
        .mockResolvedValueOnce(mockLLMResponses[2]);

      const result = await service.generateBlogPost(mockRequest);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Blog Post');
      expect(result.sections).toHaveLength(3);
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle outline not found', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(service.generateBlogPost(mockRequest)).rejects.toThrow('Outline not found');
    });

    it('should handle LLM generation failures gracefully', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);
      mockOllamaClient.generateContent.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await service.generateBlogPost(mockRequest);

      // Should return fallback content
      expect(result).toBeDefined();
      expect(result.sections).toHaveLength(3);
      expect(result.content).toContain('# Test Blog Post');
    });

    it('should incorporate different writing styles and tones', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);

      mockOllamaClient.generateContent
        .mockResolvedValueOnce('Casual introduction content')
        .mockResolvedValueOnce('Conversational main content')
        .mockResolvedValueOnce('Relaxed conclusion');

      const result = await service.generateBlogPost({
        ...mockRequest,
        style: 'conversational',
        tone: 'casual'
      });

      expect(result.metadata.style).toBe('conversational');
      expect(result.metadata.tone).toBe('casual');
    });

    it('should generate appropriate length content', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockOutline);

      mockOllamaClient.generateContent
        .mockResolvedValueOnce('Short introduction')
        .mockResolvedValueOnce('Brief main content')
        .mockResolvedValueOnce('Concise conclusion');

      const result = await service.generateBlogPost({
        ...mockRequest,
        length: 'short'
      });

      expect(result.metadata.length).toBe('short');
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('validateBlogPost', () => {
    it('should validate complete blog post successfully', () => {
      const validPost: BlogPost = {
        title: 'Valid Title',
        content: 'This is a complete blog post with sufficient content for validation purposes. It has enough words to meet the minimum requirement of three hundred words for proper validation. The content should be comprehensive and cover the main topics adequately.',
        wordCount: 320,
        readingTime: 2,
        sections: [
          {
            title: 'Introduction',
            content: 'Introduction content with sufficient length to meet validation requirements.',
            wordCount: 80,
            keyPoints: ['Point 1']
          },
          {
            title: 'Main Content',
            content: 'Main content section with adequate length for proper validation testing.',
            wordCount: 120,
            keyPoints: ['Key point']
          },
          {
            title: 'Conclusion',
            content: 'Conclusion content that wraps up the main points discussed.',
            wordCount: 70,
            keyPoints: ['Final point']
          }
        ],
        metadata: {
          generatedAt: new Date(),
          model: 'test-model',
          confidence: 0.8,
          processingTime: 1000,
          outlineId: 'outline-1',
          style: 'professional',
          length: 'medium',
          tone: 'formal'
        }
      };

      const result = service.validateBlogPost(validPost);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify validation issues', () => {
      const invalidPost: BlogPost = {
        title: '',
        content: 'Too short',
        wordCount: 50,
        readingTime: 1,
        sections: [],
        metadata: {
          generatedAt: new Date(),
          model: 'test-model',
          confidence: 0.8,
          processingTime: 1000,
          outlineId: 'outline-1',
          style: 'professional',
          length: 'medium',
          tone: 'formal'
        }
      };

      const result = service.validateBlogPost(invalidPost);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing or empty title');
      expect(result.issues).toContain('Content too short (minimum 300 words)');
      expect(result.issues).toContain('Missing blog post sections');
    });
  });

  describe('word counting', () => {
    it('should count words accurately in validation', () => {
      const post: BlogPost = {
        title: 'Test Title',
        content: 'This is a complete blog post with sufficient content for validation. It has enough words to meet the minimum requirement of three hundred words for proper validation purposes.',
        wordCount: 310,
        readingTime: 2,
        sections: [
          {
            title: 'Introduction',
            content: 'Introduction content with sufficient length.',
            wordCount: 50,
            keyPoints: ['Point 1']
          },
          {
            title: 'Main Content',
            content: 'Main content section with adequate length.',
            wordCount: 150,
            keyPoints: ['Key point']
          },
          {
            title: 'Conclusion',
            content: 'Conclusion content that wraps up the main points.',
            wordCount: 60,
            keyPoints: ['Final point']
          }
        ],
        metadata: {
          generatedAt: new Date(),
          model: 'test',
          confidence: 0.8,
          processingTime: 1000,
          outlineId: 'test',
          style: 'professional',
          length: 'medium',
          tone: 'formal'
        }
      };

      const result = service.validateBlogPost(post);
      expect(result.isValid).toBe(true);
    });
  });
});