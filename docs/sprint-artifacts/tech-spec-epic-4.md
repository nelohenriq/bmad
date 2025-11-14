# Epic Technical Specification: AI Content Generation

Date: 2025-11-14T16:43:06.954Z
Author: BMad
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 implements a multi-agent AI system for generating blog content from approved topics. This epic transforms topic selections and content angles into structured blog posts through a pipeline of outline generation, AI writing, content editing, and feedback learning. The system maintains content quality while enabling scalable blog post production.

## Objectives and Scope

### In Scope
- Blog post outline generation from approved topics and angles
- Full blog post writing using AI with voice consistency
- Content editing interface for user refinement
- Feedback learning system to improve future content
- Integration with topic approval system (Epic 3)
- Multi-step content generation pipeline

### Out of Scope
- Voice/style management (covered in Epic 5)
- Fact-checking and attribution (covered in Epic 6)
- Content publishing (covered in Epic 7)
- User account management (covered in Epic 8)

## System Architecture Alignment

This epic builds on the foundation established in Epics 1-3, utilizing:
- Next.js application framework with API routes
- Prisma database with Topic, ContentAngle, and new Content models
- Ollama integration for local LLM access
- Zustand state management for content generation workflow
- Tailwind CSS + shadcn/ui for content editing interface

The content generation pipeline follows a modular architecture with clear separation between outline generation, writing, editing, and learning phases.

## Detailed Design

### Services and Modules

| Service/Module | Responsibilities | Inputs | Outputs | Owner |
|---------------|------------------|--------|---------|-------|
| `ContentOutlineService` | Generate structured blog post outlines | Topic, ContentAngles, Style preferences | Outline JSON with sections, key points | AI Service Layer |
| `ContentWriterService` | Produce full blog posts from outlines | Outline, Voice profile, Topic context | Complete blog post content | AI Service Layer |
| `ContentEditorService` | Manage content editing workflow | AI-generated content, User edits | Edited content with change tracking | UI Layer |
| `FeedbackLearningService` | Analyze user edits and improve models | Original content, Edited content, User feedback | Learning data, Model updates | AI Service Layer |
| `ContentStorageService` | Persist content through generation pipeline | Content at each stage | Database records with version history | Data Layer |

### Data Models and Contracts

#### Content Model (New)
```typescript
model Content {
  id          String   @id @default(cuid())
  userId      String
  topicId     String
  outlineId   String?

  // Content stages
  outline     String?  // JSON structure
  draft       String?  // AI-generated content
  edited      String?  // User-edited content
  final       String?  // Published content

  // Metadata
  title       String
  status      String   @default("draft") // outline, writing, editing, final
  wordCount   Int?
  readingTime Int?

  // AI generation tracking
  modelUsed       String?
  generationTime  Int?    // milliseconds
  feedbackApplied Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user  User    @relation(fields: [userId], references: [id])
  topic Topic   @relation(fields: [topicId], references: [id])
}
```

#### ContentFeedback Model (New)
```typescript
model ContentFeedback {
  id        String   @id @default(cuid())
  contentId String
  userId    String

  // Feedback data
  originalText  String
  editedText    String
  feedbackType  String   // addition, deletion, rephrasing, style
  confidence    Float?

  // Learning metadata
  appliedToModel Boolean  @default(false)
  modelVersion   String?

  createdAt DateTime @default(now())

  // Relations
  content Content @relation(fields: [contentId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
}
```

### APIs and Interfaces

#### Content Generation APIs
```
POST /api/content/generate-outline
- Body: { topicId: string, angleIds?: string[], style?: string }
- Response: { contentId: string, outline: OutlineObject }

POST /api/content/generate-draft
- Body: { contentId: string, voiceProfile?: VoiceProfile }
- Response: { contentId: string, draft: string, metadata: GenerationMetadata }

POST /api/content/submit-feedback
- Body: { contentId: string, originalText: string, editedText: string, feedbackType: string }
- Response: { feedbackId: string, learningApplied: boolean }

GET /api/content/{contentId}
- Response: { content: ContentObject, versions: ContentVersion[] }

PUT /api/content/{contentId}/edit
- Body: { editedContent: string, changeSummary: string }
- Response: { contentId: string, version: number }
```

#### Editor Interface Contract
```typescript
interface ContentEditorProps {
  contentId: string
  initialContent: string
  onSave: (editedContent: string) => Promise<void>
  onFeedback: (feedback: FeedbackData) => Promise<void>
  readOnly?: boolean
}

interface FeedbackData {
  originalText: string
  editedText: string
  type: 'addition' | 'deletion' | 'rephrasing' | 'style'
  context?: string
}
```

### Workflows and Sequencing

#### Content Generation Pipeline
1. **Topic Approval** → User approves topics in TopicReviewDashboard (Epic 3)
2. **Outline Generation** → AI creates structured outline from topic + angles
3. **Draft Writing** → AI generates full blog post from outline
4. **Content Editing** → User reviews and edits content
5. **Feedback Learning** → System learns from user edits for future improvement
6. **Content Finalization** → Content ready for publishing (Epic 7)

#### State Transitions
```
pending → outline_generated → draft_generated → editing → final → published
    ↓           ↓                    ↓            ↓        ↓
  error      outline_error        draft_error  edit_error  publish_error
```

## Non-Functional Requirements

### Performance
- Outline generation: < 10 seconds for topic + 3 angles
- Draft writing: < 30 seconds for 1000-word blog post
- Content editing: < 2 second save response time
- Feedback processing: < 5 seconds for learning application
- Concurrent generations: Support 3 simultaneous content generations

### Security
- Content generation requests validated against user permissions
- AI prompts sanitized to prevent injection attacks
- User feedback data anonymized for learning
- Content access controlled by user ownership
- No sensitive data exposed in generated content

### Reliability/Availability
- Content generation failures fallback to basic templates
- Partial failures preserve work-in-progress content
- Automatic retry for transient AI service failures
- Content versioning prevents data loss during editing
- 99.5% uptime for content generation services

### Observability
- Content generation metrics: success rate, response time, quality scores
- User editing patterns: edit frequency, common change types
- AI model performance: accuracy, coherence, style consistency
- Error tracking: generation failures, user-reported issues
- Audit logging: content creation, modification, publication events

## Dependencies and Integrations

### Core Dependencies
- **Next.js 14+**: Application framework and API routes
- **Prisma**: Database ORM with Content and ContentFeedback models
- **Ollama**: Local LLM service for content generation
- **Zustand**: State management for content workflow
- **Tailwind CSS + shadcn/ui**: Content editor interface

### External Integrations
- **Topic Approval System** (Epic 3): Receives approved topics and angles
- **Voice Management** (Epic 5): Applies user voice profiles to content
- **Content Publishing** (Epic 7): Receives finalized content for export/publication

### Version Constraints
- Node.js: >= 18.0.0
- Ollama: >= 0.1.0
- React: >= 18.0.0
- TypeScript: >= 5.0.0

## Acceptance Criteria (Authoritative)

1. **Outline Generation**: Given approved topics, when outline generation runs, then structured outlines are created with introduction, body, conclusion sections and key points identified
2. **Draft Writing**: Given approved outline, when writing generation runs, then full blog post is created following outline structure with engaging, informative content
3. **Content Editing**: Given AI-generated blog post, when user accesses editing interface, then content is displayed in editor with inline editing capabilities and change tracking
4. **Feedback Learning**: Given user edits content, when content is finalized, then changes are analyzed and incorporated into future content generation

## Traceability Mapping

| AC ID | Spec Section | Component/API | Test Case |
|-------|-------------|---------------|-----------|
| AC-4.1 | Detailed Design → Services/Modules | ContentOutlineService, /api/content/generate-outline | Outline structure validation, section completeness |
| AC-4.2 | Detailed Design → Services/Modules | ContentWriterService, /api/content/generate-draft | Content quality assessment, outline adherence |
| AC-4.3 | Detailed Design → APIs/Interfaces | ContentEditor component, /api/content/{id}/edit | Edit functionality, change tracking |
| AC-4.4 | Detailed Design → Services/Modules | FeedbackLearningService, /api/content/submit-feedback | Learning application, content improvement |

## Risks, Assumptions, Open Questions

### Risks
- **AI Content Quality**: Generated content may require significant editing, impacting user satisfaction
- **Voice Consistency**: Maintaining consistent writing style across multiple posts
- **Performance Scaling**: Content generation may become slow with complex topics
- **User Feedback Loop**: Insufficient feedback data may limit learning effectiveness

### Assumptions
- Users will provide adequate topic context through angle selections
- AI models will maintain reasonable quality standards for blog content
- Users are comfortable editing AI-generated content
- Feedback learning will show measurable improvement over time

### Open Questions
- What level of content editing complexity is expected from users?
- How should voice consistency be measured and validated?
- What are acceptable content generation time limits for user experience?
- How will content quality be quantitatively measured?

## Test Strategy Summary

### Unit Testing
- ContentOutlineService: Outline structure validation, section completeness
- ContentWriterService: Content generation quality, outline adherence
- ContentEditorService: Edit functionality, change tracking
- FeedbackLearningService: Learning algorithm accuracy, data processing

### Integration Testing
- End-to-end content generation pipeline from topic to final content
- API integration between content services and database
- AI service integration with error handling and fallbacks
- User interface integration with content editing workflow

### User Acceptance Testing
- Content generation workflow usability and intuitiveness
- Content editing interface effectiveness and user satisfaction
- AI content quality assessment and improvement over time
- Performance validation under realistic usage patterns

### Performance Testing
- Content generation response times under various loads
- Concurrent content generation capacity testing
- Memory usage and resource consumption monitoring
- Large content set editing performance validation