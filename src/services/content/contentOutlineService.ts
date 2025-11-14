import { OllamaClient } from '../ai/ollamaClient';
import { prisma } from '../database/prisma';

export interface OutlineGenerationRequest {
  topicId: string;
  angleIds?: string[];
  style?: 'standard' | 'deep-dive' | 'listicle' | 'how-to';
  length?: 'short' | 'medium' | 'long';
}

export interface OutlineSection {
  title: string;
  content: string;
  keyPoints?: string[];
}

export interface BlogOutline {
  title: string;
  introduction: OutlineSection;
  body: OutlineSection[];
  conclusion: OutlineSection;
  metadata: {
    generatedAt: Date;
    model: string;
    confidence: number;
    processingTime: number;
  };
}

export class ContentOutlineService {
  private ollamaClient: OllamaClient;

  constructor() {
    this.ollamaClient = new OllamaClient();
  }

  /**
   * Generate a blog post outline from approved topic and angles
   */
  async generateOutline(request: OutlineGenerationRequest): Promise<BlogOutline> {
    const startTime = Date.now();

    try {
      // Fetch topic and angles data
      const topic = await prisma.topic.findUnique({
        where: { id: request.topicId },
        include: {
          contentAngles: request.angleIds ? {
            where: { id: { in: request.angleIds } }
          } : true
        }
      });

      if (!topic) {
        throw new Error(`Topic not found: ${request.topicId}`);
      }

      // Build outline generation prompt
      const prompt = this.buildOutlinePrompt(topic, request);

      // Generate outline using LLM
      const response = await this.ollamaClient.generateContent(prompt);

      // Parse and validate outline structure
      const outline = this.parseOutlineResponse(response, topic);

      // Calculate confidence score
      const confidence = this.calculateOutlineConfidence(outline, topic);

      const processingTime = Date.now() - startTime;

      return {
        ...outline,
        metadata: {
          generatedAt: new Date(),
          model: 'llama2:7b',
          confidence,
          processingTime
        }
      };

    } catch (error) {
      console.error('Outline generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Outline generation failed: ${errorMessage}`);
    }
  }

  /**
   * Validate outline structure and completeness
   */
  validateOutline(outline: BlogOutline): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required sections
    if (!outline.title?.trim()) {
      issues.push('Missing or empty title');
    }

    if (!outline.introduction?.title || !outline.introduction?.content) {
      issues.push('Missing or incomplete introduction section');
    }

    if (!outline.body || outline.body.length === 0) {
      issues.push('Missing body sections');
    }

    if (!outline.conclusion?.title || !outline.conclusion?.content) {
      issues.push('Missing or incomplete conclusion section');
    }

    // Check section quality
    if (outline.introduction.content.length < 50) {
      issues.push('Introduction too short (minimum 50 characters)');
    }

    if (outline.body.length < 2) {
      issues.push('Insufficient body sections (minimum 2)');
    }

    if (outline.conclusion.content.length < 50) {
      issues.push('Conclusion too short (minimum 50 characters)');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Build the outline generation prompt
   */
  private buildOutlinePrompt(topic: any, request: OutlineGenerationRequest): string {
    const anglesText = topic.contentAngles
      .map((angle: any) => `- ${angle.title}: ${angle.description}`)
      .join('\n');

    const style = request.style || 'standard';
    const length = request.length || 'medium';

    return `Generate a comprehensive blog post outline for the topic: "${topic.name}"

Topic Description: ${topic.description || 'No description available'}

Content Angles to Incorporate:
${anglesText}

Style: ${style}
Length: ${length}

Requirements:
- Create a compelling title
- Structure with introduction, ${length === 'short' ? '2-3' : length === 'medium' ? '3-5' : '5-7'} body sections, and conclusion
- Each section should have a clear title and detailed content description
- Incorporate the provided content angles naturally
- Ensure logical flow and coherence
- Make it engaging and informative

Format as JSON:
{
  "title": "Blog Post Title",
  "introduction": {
    "title": "Introduction Section Title",
    "content": "Detailed description of introduction content",
    "keyPoints": ["Key point 1", "Key point 2"]
  },
  "body": [
    {
      "title": "Body Section 1 Title",
      "content": "Detailed description of section content",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ],
  "conclusion": {
    "title": "Conclusion Section Title",
    "content": "Detailed description of conclusion content",
    "keyPoints": ["Key point 1", "Key point 2"]
  }
}`;
  }

  /**
   * Parse LLM response into structured outline
   */
  private parseOutlineResponse(response: string, topic: any): Omit<BlogOutline, 'metadata'> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const outlineData = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!outlineData.title || !outlineData.introduction || !outlineData.body || !outlineData.conclusion) {
        throw new Error('Missing required outline sections');
      }

      return {
        title: outlineData.title,
        introduction: {
          title: outlineData.introduction.title,
          content: outlineData.introduction.content,
          keyPoints: outlineData.introduction.keyPoints || []
        },
        body: outlineData.body.map((section: any) => ({
          title: section.title,
          content: section.content,
          keyPoints: section.keyPoints || []
        })),
        conclusion: {
          title: outlineData.conclusion.title,
          content: outlineData.conclusion.content,
          keyPoints: outlineData.conclusion.keyPoints || []
        }
      };

    } catch (error) {
      // Fallback: create basic outline structure
      console.warn('Failed to parse outline response, using fallback:', error);
      return this.createFallbackOutline(topic);
    }
  }

  /**
   * Calculate outline confidence score
   */
  private calculateOutlineConfidence(outline: Omit<BlogOutline, 'metadata'>, topic: any): number {
    let score = 0.5; // Base score

    // Title quality
    if (outline.title.length > 20 && outline.title.length < 80) score += 0.1;

    // Section completeness
    if (outline.introduction.content.length > 100) score += 0.1;
    if (outline.body.length >= 3) score += 0.1;
    if (outline.conclusion.content.length > 100) score += 0.1;

    // Angle incorporation
    const angleKeywords = topic.contentAngles.flatMap((angle: any) =>
      angle.keywords.split(',').map((k: string) => k.trim().toLowerCase())
    );

    const outlineText = [
      outline.title,
      outline.introduction.content,
      ...outline.body.map(s => s.content),
      outline.conclusion.content
    ].join(' ').toLowerCase();

    const incorporatedAngles = angleKeywords.filter((keyword: string) =>
      outlineText.includes(keyword)
    ).length;

    score += (incorporatedAngles / angleKeywords.length) * 0.2;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Create fallback outline when parsing fails
   */
  private createFallbackOutline(topic: any): Omit<BlogOutline, 'metadata'> {
    const angles = topic.contentAngles.slice(0, 3); // Use first 3 angles

    return {
      title: `Understanding ${topic.name}`,
      introduction: {
        title: "Introduction",
        content: `This blog post explores ${topic.name} and its significance in today's context. We'll examine key aspects and provide practical insights.`,
        keyPoints: [
          `Overview of ${topic.name}`,
          "Current relevance and importance",
          "What readers will learn"
        ]
      },
      body: angles.map((angle: any, index: number) => ({
        title: angle.title,
        content: angle.description,
        keyPoints: [
          `Key aspects of ${angle.title.toLowerCase()}`,
          "Practical implications",
          "Real-world examples"
        ]
      })),
      conclusion: {
        title: "Conclusion",
        content: `In summary, ${topic.name} presents both opportunities and challenges. Understanding these aspects helps in making informed decisions and taking appropriate actions.`,
        keyPoints: [
          "Key takeaways",
          "Next steps",
          "Further reading"
        ]
      }
    };
  }
}

export const contentOutlineService = new ContentOutlineService();