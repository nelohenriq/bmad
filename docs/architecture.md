# Architecture

## Executive Summary

Neural Feed Studio is built as a modern web application using Next.js 14 with TypeScript, featuring local AI integration via Ollama and LangChain for content generation. The architecture emphasizes local-first data storage with IndexedDB, ensuring user privacy and offline capability. Multi-agent AI orchestration handles RSS processing, content analysis, and blog post generation with consistent voice management.

## Project Initialization

First implementation story should execute:
```bash
npx create-next-app@latest neural-feed-studio --typescript --tailwind --app --src-dir --import-alias "@/*"
```

This establishes the base architecture with these decisions:
- Framework: Next.js 14 with App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Project Structure: src/ directory with app/ routing

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| Framework | Next.js | 14.2.3 | All | Full-stack React framework with excellent AI integration support |
| Language | TypeScript | 5.3.3 | All | Type safety for complex AI agent interactions |
| AI Integration | Ollama + LangChain | Latest | 3,4,5,6 | Local LLM execution with orchestration framework |
| Data Storage | IndexedDB | Native | 2,8 | Local-first approach for user privacy |
| State Management | Zustand | 4.4.7 | All | Lightweight, TypeScript-friendly state management |
| Styling | Tailwind CSS | 3.4.1 | All | Utility-first CSS with excellent React integration |
| Testing | Jest + React Testing Library | Latest | All | Comprehensive testing framework |
| Build Tool | Next.js built-in | - | All | Optimized for React applications |

## Project Structure

```
neural-feed-studio/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Main application routes
│   ├── api/                     # API routes for RSS and AI
│   └── globals.css              # Global styles
├── components/                  # Reusable UI components
│   ├── ui/                      # Base UI components
│   ├── rss/                     # RSS-related components
│   ├── ai/                      # AI agent components
│   └── content/                 # Content management components
├── lib/                         # Utility libraries
│   ├── ai/                      # AI integration utilities
│   ├── rss/                     # RSS processing utilities
│   ├── db/                      # Database utilities
│   └── validation/              # Data validation
├── stores/                      # Zustand state stores
├── types/                       # TypeScript type definitions
├── hooks/                       # Custom React hooks
├── utils/                       # Helper functions
└── __tests__/                   # Test files
```

## Epic to Architecture Mapping

- **Epic 1 (Foundation)** → Core Next.js setup, TypeScript configuration, project structure
- **Epic 2 (RSS Feed Management)** → API routes in app/api/rss/, RSS processing utilities in lib/rss/
- **Epic 3 (Content Analysis & Topic Selection)** → AI components in components/ai/, analysis utilities in lib/ai/
- **Epic 4 (AI Content Generation)** → Multi-agent orchestration in lib/ai/agents/, content generation components
- **Epic 5 (Voice & Style Management)** → Voice profiling utilities, style consistency algorithms
- **Epic 6 (Fact-Checking & Attribution)** → Verification utilities, citation management
- **Epic 7 (Content Publishing)** → Export utilities, platform integration components
- **Epic 8 (User Management & Analytics)** → User stores, analytics components, profile management

## Technology Stack Details

### Core Technologies

- **Frontend Framework:** Next.js 14.2.3 with App Router
- **Language:** TypeScript 5.3.3
- **Styling:** Tailwind CSS 3.4.1
- **State Management:** Zustand 4.4.7
- **AI Integration:** Ollama (local) + LangChain.js
- **Data Storage:** IndexedDB with Dexie.js
- **Testing:** Jest + React Testing Library

### Integration Points

- **RSS Processing:** Direct HTTP requests to RSS feeds with XML parsing
- **AI Agents:** Local Ollama API calls orchestrated through LangChain
- **Content Storage:** IndexedDB for local persistence with export capabilities
- **Publishing:** Direct API calls to blogging platforms (WordPress, Medium, etc.)

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions
- **Components:** PascalCase (UserProfile, RSSFeedList)
- **Files:** kebab-case (user-profile.tsx, rss-feed-list.tsx)
- **API Routes:** kebab-case (/api/rss-feeds, /api/content-generate)
- **Database:** camelCase (userPreferences, rssFeedList)
- **Functions:** camelCase (processRSSFeed, generateContent)

### Code Organization
- **Components:** Grouped by feature in components/ subdirectories
- **Utilities:** Organized by domain in lib/ subdirectories
- **Tests:** Co-located with implementation files (*.test.ts)
- **Types:** Centralized in types/ directory with feature-specific files

### Error Handling
- **API Errors:** Return structured error objects {error: string, code: string}
- **UI Errors:** Display user-friendly messages with retry options
- **AI Errors:** Fallback to mock responses with clear error indicators

### Logging Strategy
- **Format:** Structured JSON logs with consistent fields
- **Levels:** ERROR, WARN, INFO, DEBUG
- **Storage:** Local console in development, file-based in production

## Consistency Rules

### API Response Format
```typescript
// Success
{ data: T, success: true }

// Error
{ error: string, code: string, success: false }
```

### Date Handling
- **Storage:** ISO 8601 strings
- **Display:** Localized formatting using Intl.DateTimeFormat

### State Management
- **Updates:** Immutable updates using spread operators
- **Async:** Zustand middleware for async actions
- **Persistence:** Selective persistence to IndexedDB

## Data Architecture

### Core Entities
- **User:** Profile, preferences, voice settings
- **RSSFeed:** URL, metadata, update schedule, categories
- **ContentItem:** Generated content, metadata, status
- **VoiceProfile:** Style patterns, sample texts, consistency rules

### Relationships
- User has many RSSFeeds
- RSSFeed has many ContentItems
- User has one VoiceProfile
- ContentItem belongs to RSSFeed and User

## API Contracts

### RSS Management
```
GET  /api/rss-feeds     → { data: RSSFeed[], success: true }
POST /api/rss-feeds     → { data: RSSFeed, success: true }
PUT  /api/rss-feeds/:id → { data: RSSFeed, success: true }
```

### Content Generation
```
POST /api/content/generate → { data: ContentItem, success: true }
GET  /api/content/:id      → { data: ContentItem, success: true }
```

## Security Architecture

- **Authentication:** Optional, user-controlled (no mandatory accounts)
- **Data Protection:** Local storage only, user-controlled backups
- **AI Privacy:** All processing local, no cloud data transmission
- **Content Security:** Input sanitization, XSS prevention

## Performance Considerations

- **AI Processing:** Asynchronous with progress indicators
- **RSS Fetching:** Background processing with caching
- **UI Responsiveness:** Virtual scrolling for large lists
- **Memory Management:** Efficient data structures for content processing

## Deployment Architecture

- **Target:** Static export for any web server
- **AI Dependency:** Requires local Ollama installation
- **Offline Capability:** Full functionality without internet (except RSS fetching)
- **Updates:** Web-based, no app store requirements

## Development Environment

### Prerequisites

- Node.js 18+
- npm or yarn
- Ollama installed and running locally
- Git

### Setup Commands

```bash
# Clone and setup
git clone <repo>
cd neural-feed-studio
npm install

# Setup Ollama (separate step)
# Download and install Ollama from https://ollama.ai
# Pull required models: ollama pull llama2:7b

# Start development
npm run dev
```

## Architecture Decision Records (ADRs)

### ADR-001: Local-First AI Architecture
**Decision:** Use Ollama for local LLM execution instead of cloud APIs
**Rationale:** User privacy, cost control, offline capability
**Alternatives Considered:** OpenAI API, Anthropic Claude
**Impact:** Requires local hardware resources, limits model selection

### ADR-002: IndexedDB for Data Storage
**Decision:** Use IndexedDB with Dexie.js for local data persistence
**Rationale:** Native browser API, no external dependencies, user data control
**Alternatives Considered:** LocalStorage, SQLite WASM
**Impact:** Complex queries limited, migration system required

### ADR-003: Multi-Agent Orchestration Pattern
**Decision:** Implement specialized AI agents for different content phases
**Rationale:** Better separation of concerns, improved content quality
**Alternatives Considered:** Single unified AI model
**Impact:** Increased complexity, coordination overhead

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-14T01:32:15.490Z_
_For: BMad_