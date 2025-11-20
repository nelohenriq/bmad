# System Architecture: RAG Implementation for Neural Feed Studio

## Executive Summary

This document outlines the complete system architecture for implementing Retrieval-Augmented Generation (RAG) capabilities in Neural Feed Studio. The architecture maintains full backward compatibility while adding intelligent content retrieval and generation features.

**Architecture Approach:** Brownfield enhancement with optional RAG mode
**Key Principles:** Modularity, scalability, backward compatibility, performance optimization
**Timeline:** 8-10 weeks implementation across 5 phases

## Project Context

### System Overview
Neural Feed Studio is a Next.js-based application for automated content generation from RSS feeds. This architecture adds RAG capabilities to enhance content relevance and quality through intelligent retrieval from processed feed content.

### Architectural Drivers
- **Brownfield Enhancement:** Preserve all existing functionality
- **Optional RAG Mode:** User choice between traditional and RAG generation
- **Performance Requirements:** <2 second average response time
- **Scalability:** Support 100+ concurrent users
- **Local AI Focus:** Privacy-preserving with Ollama integration

## Architectural Decisions

### 1. Database Architecture
**Decision:** Dual database approach
- **PostgreSQL:** Relational data (feeds, users, metadata, content chunks)
- **Qdrant:** Vector embeddings and similarity search
- **Migration Strategy:** Zero-downtime migration with SQLite fallback

**Rationale:**
- Optimal tool for each data type
- PostgreSQL for ACID compliance and complex queries
- Qdrant for high-performance vector operations
- Separate concerns for better scalability

### 2. API Architecture
**Decision:** RESTful API with content negotiation
- **Existing Endpoints:** Fully preserved for backward compatibility
- **New RAG Endpoints:** `/api/rag/*` namespace
- **Content Negotiation:** Support for JSON and TOON formats
- **Feature Flags:** Gradual rollout capability

**API Structure:**
```
GET  /api/content/generate     # Existing endpoint (preserved)
POST /api/rag/search          # New: Content retrieval
POST /api/rag/embed           # New: Embedding generation
POST /api/rag/process-feed    # New: Feed processing
GET  /api/rag/stats           # New: System metrics
```

### 3. Component Architecture
**Decision:** Service-oriented architecture with clear separation of concerns

**Core Services:**
- **ContentProcessor:** RSS ingestion, parsing, deduplication
- **ChunkingService:** Semantic text splitting and metadata preservation
- **EmbeddingService:** Ollama integration for vector generation
- **RetrievalService:** Vector search and cross-encoder reranking
- **GenerationService:** Context assembly and AI content generation

**Component Relationships:**
```
ContentProcessor → ChunkingService → EmbeddingService → Storage
UserQuery → EmbeddingService → RetrievalService → GenerationService → Output
```

### 4. Data Flow Architecture
**Decision:** Pipeline-based processing with async capabilities

**Content Ingestion Pipeline:**
```
RSS Feed → ContentProcessor → ChunkingService → EmbeddingService → PostgreSQL + Qdrant
```

**Query Processing Pipeline:**
```
User Query → QueryProcessor → EmbeddingService → RetrievalService → Reranking → ContextAssembly → AIGeneration → Response
```

**Key Characteristics:**
- Asynchronous processing for performance
- Batch operations for efficiency
- Error recovery at each stage
- Monitoring and metrics throughout

### 5. Deployment Architecture
**Decision:** Containerized infrastructure with Docker Compose

**Development Environment:**
```yaml
services:
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
  qdrant:
    image: qdrant/qdrant
    volumes:
      - qdrant_data:/qdrant/storage
  ollama:
    image: ollama/ollama
    command: serve
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - QDRANT_URL=http://qdrant:6333
      - OLLAMA_BASE_URL=http://ollama:11434
```

**Production Considerations:**
- Kubernetes for orchestration at scale
- Managed databases (AWS RDS, Google Cloud SQL)
- CDN for static assets
- Load balancing for multiple app instances

### 6. Error Handling Architecture
**Decision:** Comprehensive error handling with graceful degradation

**Error Handling Patterns:**
- **Circuit Breaker:** Automatic fallback when services unavailable
- **Retry Logic:** Exponential backoff for transient failures
- **Fallback Modes:** Traditional generation when RAG fails
- **User Communication:** Clear error messages and recovery options

**Error Types Handled:**
- Network failures (Ollama, Qdrant, external APIs)
- Database connectivity issues
- Model loading problems
- Input validation errors
- Resource exhaustion (memory, disk space)

### 7. Security Architecture
**Decision:** Defense in depth with multiple security layers

**Security Controls:**
- **Authentication:** JWT-based with role-based access
- **Authorization:** Granular permissions for RAG operations
- **Input Validation:** Schema validation at all entry points
- **Data Protection:** Encryption at rest and in transit
- **Audit Logging:** Complete trail of all operations

**Privacy Considerations:**
- Local AI processing (no external data sharing)
- User data isolation
- Configurable data retention policies
- GDPR compliance measures

### 8. Performance Architecture
**Decision:** Multi-layer optimization strategy

**Performance Optimizations:**
- **Batch Processing:** Multiple embeddings/chunks simultaneously
- **Caching:** Query results, frequent embeddings, metadata
- **Async Operations:** Non-blocking processing for heavy tasks
- **Memory Management:** Streaming for large datasets
- **Database Indexing:** Optimized queries and vector search

**Performance Targets:**
- Content generation: <2 seconds average
- Feed processing: <30 seconds per feed
- Concurrent users: 100+ supported
- Memory usage: Efficient scaling

### 9. Monitoring Architecture
**Decision:** Comprehensive observability with multiple monitoring layers

**Monitoring Components:**
- **Application Metrics:** Response times, error rates, throughput
- **Infrastructure Metrics:** CPU, memory, disk usage
- **Business Metrics:** RAG vs traditional mode usage, user satisfaction
- **AI Model Metrics:** Embedding quality, retrieval accuracy

**Tools and Integration:**
- Custom metrics collection
- Structured logging with correlation IDs
- Health check endpoints
- Alerting for critical issues

### 10. Migration Architecture
**Decision:** Phased migration with comprehensive rollback capabilities

**Migration Strategy:**
1. **Preparation:** Complete backups and testing environment
2. **Database Migration:** Schema creation and data transformation
3. **Feature Rollout:** Feature flags and A/B testing
4. **Validation:** Data integrity and performance verification
5. **Rollback:** Automated procedures for any issues

**Migration Phases:**
- **Phase 1:** Infrastructure setup (Docker, databases)
- **Phase 2:** Schema migration and data transformation
- **Phase 3:** Application deployment with feature flags
- **Phase 4:** Gradual user rollout and monitoring
- **Phase 5:** Full activation and legacy system decommissioning

## Technology Stack Details

### Core Technologies
- **Frontend Framework:** Next.js 15 with App Router
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom design system
- **State Management:** Zustand for client state
- **Backend:** Next.js API Routes (Node.js runtime)

### Data Layer
- **Primary Database:** PostgreSQL 15
- **Vector Database:** Qdrant (Docker deployment)
- **ORM:** Prisma with custom extensions
- **Migration Tool:** Prisma Migrate with custom scripts

### AI/ML Infrastructure
- **Model Server:** Ollama with qwen2:0.5b embeddings
- **Local Inference:** Privacy-preserving, offline-capable
- **Model Management:** Automatic model loading and caching
- **Fallback Support:** Alternative models for reliability

### Development Tools
- **Language:** TypeScript with strict configuration
- **Linting:** ESLint with Next.js and accessibility rules
- **Formatting:** Prettier with consistent styling
- **Testing:** Jest with React Testing Library
- **Build Tool:** Next.js built-in with custom webpack config

### Infrastructure Tools
- **Containerization:** Docker & Docker Compose
- **Process Management:** PM2 for production
- **Reverse Proxy:** Next.js development server
- **SSL/TLS:** Let's Encrypt for production

## Project Structure

```
neural-feed-studio/
├── docker-compose.yml              # Infrastructure definition
├── docker-compose.prod.yml         # Production configuration
├── package.json                    # Dependencies and scripts
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Styling configuration
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration scripts
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API endpoints
│   │   │   ├── rag/              # RAG-specific endpoints
│   │   │   │   ├── embed/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   ├── process/route.ts
│   │   │   │   └── stats/route.ts
│   │   │   └── content/          # Existing endpoints (preserved)
│   │   ├── dashboard/            # Enhanced UI
│   │   ├── globals.css           # Global styles
│   │   └── layout.tsx            # Root layout
│   ├── components/               # React components
│   │   ├── rag/                 # RAG-specific components
│   │   │   ├── RagModeToggle.tsx
│   │   │   ├── RetrievalResults.tsx
│   │   │   ├── RagSettings.tsx
│   │   │   └── ContextPreview.tsx
│   │   ├── ui/                  # Reusable UI components
│   │   └── forms/               # Form components
│   ├── services/                # Business logic services
│   │   ├── rag/                 # RAG services
│   │   │   ├── contentProcessor.ts
│   │   │   ├── embeddingService.ts
│   │   │   ├── retrievalService.ts
│   │   │   ├── generationService.ts
│   │   │   └── contextAssembler.ts
│   │   ├── database/            # Database services
│   │   │   ├── prisma.ts        # Prisma client
│   │   │   ├── migrations.ts    # Migration utilities
│   │   │   └── vector-db.ts     # Qdrant client
│   │   ├── ollama/              # AI service integration
│   │   │   ├── client.ts        # Ollama client
│   │   │   ├── models.ts        # Model management
│   │   │   └── embeddings.ts    # Embedding utilities
│   │   └── external/            # External API clients
│   ├── lib/                     # Utilities and configurations
│   │   ├── toon.ts              # TOON format utilities
│   │   ├── validation.ts        # Input validation
│   │   ├── errors.ts            # Error handling utilities
│   │   ├── metrics.ts           # Monitoring utilities
│   │   ├── config.ts            # Configuration management
│   │   └── constants.ts         # Application constants
│   ├── stores/                  # State management
│   │   ├── ragStore.ts          # RAG-specific state
│   │   ├── uiStore.ts           # UI state
│   │   └── userStore.ts         # User preferences
│   ├── types/                   # TypeScript type definitions
│   │   ├── api.ts               # API types
│   │   ├── rag.ts               # RAG-specific types
│   │   ├── database.ts          # Database types
│   │   └── common.ts            # Shared types
│   └── utils/                   # Utility functions
│       ├── formatters.ts        # Data formatters
│       ├── helpers.ts           # Helper functions
│       └── async.ts             # Async utilities
├── tests/                       # Test suites
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── utils/                   # Test utilities
├── docs/                        # Documentation
│   ├── architecture.md          # This document
│   ├── PRD.md                   # Product requirements
│   ├── api-reference.md         # API documentation
│   ├── deployment.md            # Deployment guide
│   └── troubleshooting.md       # Troubleshooting guide
├── scripts/                     # Utility scripts
│   ├── migrate.ts               # Migration scripts
│   ├── seed.ts                  # Database seeding
│   └── setup.ts                 # Development setup
└── .env.example                 # Environment variables template
```

## Integration Points

### Existing System Integration
- **Database Layer:** Seamless migration from SQLite to PostgreSQL
- **API Layer:** New endpoints alongside existing REST APIs
- **UI Layer:** Enhanced components with feature flags
- **Authentication:** Leverage existing JWT-based auth system
- **State Management:** Extend existing Zustand stores

### External Service Integration
- **Ollama Service:** Local AI model serving and management
- **Qdrant Vector DB:** High-performance vector operations
- **RSS Feed Sources:** Enhanced processing with metadata extraction
- **Content APIs:** Optional integration with external content sources

### Third-Party Service Integration
- **Monitoring:** Custom metrics with optional external monitoring
- **Logging:** Structured logging with optional external aggregation
- **Backup:** Automated backups with optional cloud storage
- **CDN:** Static asset delivery optimization

## Security Architecture

### Authentication & Authorization
- **JWT Tokens:** Secure authentication with configurable expiration
- **Role-Based Access:** Granular permissions for different user types
- **API Keys:** Service-to-service authentication for external calls
- **Session Management:** Secure session handling with automatic cleanup

### Data Protection
- **Encryption at Rest:** All sensitive data encrypted in databases
- **TLS in Transit:** End-to-end encryption for all communications
- **Secure Credentials:** Environment-based secret management
- **Data Sanitization:** Input validation and SQL injection prevention

### Privacy & Compliance
- **Local Processing:** AI operations performed locally (no external data sharing)
- **Data Minimization:** Only collect necessary user data
- **Retention Policies:** Configurable data retention periods
- **Audit Trails:** Complete logging of all data operations

### Security Monitoring
- **Intrusion Detection:** Automated monitoring for suspicious activities
- **Vulnerability Scanning:** Regular security assessments
- **Access Logging:** Comprehensive audit trails
- **Incident Response:** Defined procedures for security incidents

## Performance Considerations

### Optimization Strategies
- **Batch Processing:** Process multiple chunks and embeddings together
- **Intelligent Caching:** Cache frequent queries and embeddings
- **Async Processing:** Non-blocking operations for heavy computations
- **Memory Optimization:** Streaming processing for large datasets
- **Database Optimization:** Indexed queries and connection pooling

### Scalability Patterns
- **Horizontal Scaling:** Multiple application instances behind load balancer
- **Database Sharding:** Future support for database partitioning
- **CDN Integration:** Static asset delivery optimization
- **Microservices Ready:** Architecture supports service decomposition

### Performance Monitoring
- **Real-time Metrics:** Response times, throughput, error rates
- **Resource Monitoring:** CPU, memory, disk, and network usage
- **User Experience:** Frontend performance and loading times
- **AI Performance:** Model inference times and accuracy metrics

## Deployment Architecture

### Development Environment
**Single-Command Setup:**
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

**Service Configuration:**
- PostgreSQL on port 5432
- Qdrant on port 6333
- Ollama on port 11434
- Next.js on port 3000

### Production Environment
**Infrastructure Options:**
- **Small Scale:** Docker Compose on single server
- **Medium Scale:** Docker Swarm or Kubernetes cluster
- **Large Scale:** Managed Kubernetes (EKS, GKE, AKS)

**Production Configuration:**
- Environment-based configuration
- Secrets management
- Health checks and monitoring
- Automated backups and updates

### CI/CD Pipeline
**Automated Deployment:**
1. Code quality checks (linting, testing)
2. Build Docker images
3. Run integration tests
4. Deploy to staging environment
5. Performance and security testing
6. Production deployment with rollback capability

## Architecture Decision Records

### ADR 001: Vector Database Selection
**Context:** Need for efficient similarity search and vector storage
**Decision:** Use Qdrant as the vector database
**Rationale:**
- Excellent performance for cosine similarity operations
- Easy Docker deployment and scaling
- Good integration with existing TypeScript/Node.js stack
- Cost-effective for current and projected scale
**Alternatives Considered:** Pinecone, Weaviate, Chroma, Milvus
**Impact:** Foundation for all RAG retrieval capabilities

### ADR 002: Optional RAG Mode Design
**Context:** Need to add RAG without breaking existing functionality
**Decision:** Implement RAG as an optional mode with feature flags
**Rationale:**
- Zero breaking changes to existing user workflows
- Allows gradual adoption and A/B testing
- Provides fallback options if RAG fails
- Enables comparison between modes
**Alternatives Considered:** Forced migration, separate application
**Impact:** User flexibility and risk mitigation

### ADR 003: Local AI with Ollama
**Context:** Balance between AI capabilities and privacy/cost
**Decision:** Use Ollama for local embedding generation
**Rationale:**
- Preserves user privacy (no external API calls)
- Eliminates usage-based AI costs
- Enables offline operation
- Consistent with local-first architecture principles
**Alternatives Considered:** OpenAI API, Hugging Face Inference API
**Impact:** Self-hosted AI infrastructure with cost predictability

### ADR 004: Dual Database Architecture
**Context:** Different data types require different storage solutions
**Decision:** PostgreSQL for relational data, Qdrant for vectors
**Rationale:**
- PostgreSQL excels at relational queries and ACID compliance
- Qdrant optimized for vector operations and similarity search
- Clear separation of concerns
- Independent scaling capabilities
**Alternatives Considered:** Single database (PostgreSQL with pgvector), MongoDB
**Impact:** Optimal performance for different data access patterns

### ADR 005: TOON Format for LLM Interactions
**Context:** High token costs and context limitations in LLM interactions
**Decision:** Implement TOON format for AI communications
**Rationale:**
- 30-70% reduction in token usage
- Significantly larger context windows
- Reduced API costs for AI operations
- Minimal implementation overhead
**Alternatives Considered:** Custom compression, JSON optimization
**Impact:** Improved AI interaction efficiency and cost savings

### ADR 006: Service-Oriented Architecture
**Context:** Need for maintainable and scalable codebase
**Decision:** Organize code into focused services with clear boundaries
**Rationale:**
- Clear separation of concerns
- Easier testing and maintenance
- Supports independent scaling
- Facilitates future microservices migration
**Alternatives Considered:** Monolithic architecture, full microservices
**Impact:** Development velocity and system maintainability

### ADR 007: Comprehensive Error Handling
**Context:** AI systems can fail in complex ways requiring graceful handling
**Decision:** Implement circuit breakers and fallback modes
**Rationale:**
- Prevents cascade failures
- Maintains user experience during outages
- Enables gradual degradation
- Supports debugging and monitoring
**Alternatives Considered:** Simple try/catch, no fallbacks
**Impact:** System reliability and user trust

## Implementation Patterns

### Naming Patterns
- **APIs:** RESTful conventions with consistent HTTP methods
- **Databases:** snake_case for PostgreSQL, camelCase for application code
- **Components:** PascalCase for React components
- **Services:** PascalCase for class names, camelCase for methods
- **Files:** kebab-case for file names, consistent with Next.js conventions

### Structure Patterns
- **API Routes:** Feature-based organization under `/api/*`
- **Components:** Hierarchical organization with shared components
- **Services:** Clear separation between business logic and infrastructure
- **Configuration:** Environment-based with validation schemas

### Error Handling Patterns
- **Service Layer:** Try/catch with specific error types and logging
- **API Layer:** Consistent error response format with HTTP status codes
- **UI Layer:** User-friendly error messages with recovery actions
- **Fallbacks:** Automatic fallback to traditional modes when RAG fails

### Testing Patterns
- **Unit Tests:** Isolated testing of utilities and pure functions
- **Integration Tests:** API endpoint testing with real dependencies
- **E2E Tests:** Critical user journey validation
- **Performance Tests:** Load testing and benchmarking

### Logging Patterns
- **Structured Logging:** JSON format with consistent fields
- **Correlation IDs:** Request tracing across services
- **Log Levels:** Appropriate severity levels (ERROR, WARN, INFO, DEBUG)
- **Security:** No sensitive data in logs

## Consistency Rules

### Code Standards
1. **TypeScript:** Strict mode with no any types
2. **Error Handling:** Consistent error types and handling patterns
3. **Documentation:** JSDoc for all public APIs and complex functions
4. **Testing:** Minimum 80% code coverage requirement

### API Standards
1. **RESTful Design:** Consistent HTTP methods and status codes
2. **Content Negotiation:** Support for JSON and TOON formats
3. **Versioning:** API versioning strategy for future changes
4. **Documentation:** OpenAPI specification for all endpoints

### Database Standards
1. **Naming:** Consistent naming conventions across schemas
2. **Indexing:** Appropriate indexes for query performance
3. **Migrations:** Versioned migrations with rollback capability
4. **Constraints:** Proper foreign keys and data validation

### Security Standards
1. **Input Validation:** Schema validation for all inputs
2. **Authentication:** Consistent JWT handling across services
3. **Authorization:** Role-based permissions with clear hierarchies
4. **Audit Logging:** Complete audit trails for sensitive operations

## Development Environment Setup

### Prerequisites
- Node.js 18.17.0 or later
- Docker and Docker Compose
- Ollama installed and running
- Git for version control

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd neural-feed-studio

# Install dependencies
npm install

# Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# Set up the database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Pull required AI models
ollama pull qwen2:0.5b

# Start the development server
npm run dev
```

### Environment Configuration
```env
# .env.local
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/neural_feed_dev"

# Vector Database
QDRANT_URL="http://localhost:6333"

# AI Service
OLLAMA_BASE_URL="http://localhost:11434"

# Authentication
NEXTAUTH_SECRET="your-development-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Feature Flags
ENABLE_RAG_MODE="true"
ENABLE_TOON_FORMAT="true"

# Logging
LOG_LEVEL="debug"
```

### Development Workflow
1. **Feature Development:** Create feature branch from main
2. **Testing:** Run unit and integration tests locally
3. **Code Review:** Submit pull request with comprehensive tests
4. **Integration:** Automated CI/CD pipeline validation
5. **Deployment:** Automated deployment to staging environment

## Conclusion

This architecture provides a comprehensive foundation for implementing RAG capabilities in Neural Feed Studio while maintaining backward compatibility and enabling future scalability. The modular design supports incremental development and testing, with clear separation of concerns and comprehensive error handling.

Key architectural strengths:
- **Flexibility:** Optional RAG mode with seamless fallback
- **Performance:** Multi-layer optimization for sub-2-second responses
- **Scalability:** Horizontal scaling support for growing user base
- **Maintainability:** Service-oriented architecture with clear boundaries
- **Security:** Defense-in-depth approach with privacy preservation
- **Cost Efficiency:** Local AI processing and TOON format optimization

The architecture is production-ready and provides a solid foundation for the 8-10 week implementation timeline outlined in the PRD. All components are designed to work together cohesively while allowing for independent scaling and maintenance.