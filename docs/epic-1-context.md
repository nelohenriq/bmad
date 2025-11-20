# Epic 1 Context: Infrastructure & Data Foundation

## Overview

**Epic Goal:** Establish the core data infrastructure for RAG functionality by setting up PostgreSQL and Qdrant databases, migrating existing data, and implementing vector database operations.

**Business Value:** Provides the foundational data layer that enables all RAG capabilities, ensuring reliable storage and retrieval of both relational data and vector embeddings.

**Timeline:** Weeks 1-2 (8 story points total)
**Priority:** Critical - Blocks all subsequent epics
**Requirements:** FR29-FR32 (Database & Infrastructure)

## Epic Scope & Requirements

### Functional Requirements Covered
- **FR29:** System can migrate existing content to new database schema
- **FR30:** System maintains data integrity during migration from SQLite to PostgreSQL
- **FR31:** System can handle vector database operations alongside relational data
- **FR32:** System provides backup and recovery capabilities for vector data

### Non-Functional Requirements
- **Performance:** Database operations complete within acceptable time limits
- **Reliability:** 99.9% database availability during migration
- **Security:** Data encrypted at rest and in transit
- **Scalability:** Support for growing data volumes

## User Stories Breakdown

### Story 1.1: Database Infrastructure Setup (8 points)

**Goal:** Set up PostgreSQL and Qdrant databases with Docker Compose for development environment.

**Technical Requirements:**
- PostgreSQL 15 with PostGIS extension
- Qdrant vector database (latest stable version)
- Docker Compose configuration
- Health check endpoints
- Development environment optimization

**Implementation Steps:**

1. **Create Docker Compose Configuration**
```yaml
# docker-compose.infrastructure.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: neural_feed_postgres
    environment:
      POSTGRES_DB: neural_feed_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  qdrant:
    image: qdrant/qdrant:latest
    container_name: neural_feed_qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  qdrant_data:
```

2. **Database Initialization Scripts**
```sql
-- scripts/init.sql
-- Create extensions and initial schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application role
CREATE ROLE neural_feed_app WITH LOGIN PASSWORD 'app_password';
GRANT CONNECT ON DATABASE neural_feed_dev TO neural_feed_app;
```

3. **Environment Configuration**
```env
# .env.local
# PostgreSQL Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"

# Qdrant Configuration
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # For production

# Application Configuration
NODE_ENV="development"
NEXTAUTH_SECRET="development-secret"
NEXTAUTH_URL="http://localhost:3000"
```

**Acceptance Criteria:**
- [ ] PostgreSQL container running and accessible on port 5432
- [ ] Qdrant container running and accessible on port 6333
- [ ] Health checks passing for both services
- [ ] Docker Compose configuration documented
- [ ] Environment variables configured
- [ ] Basic database connections tested

**Testing:**
```bash
# Test PostgreSQL connection
psql postgresql://postgres:password@localhost:5432/neural_feed_dev -c "SELECT version();"

# Test Qdrant connection
curl http://localhost:6333/health
```

---

### Story 1.2: Database Schema Migration (13 points)

**Goal:** Migrate from SQLite to PostgreSQL schema while preserving data integrity.

**Technical Requirements:**
- Complete schema analysis and mapping
- Data transformation and migration scripts
- Foreign key relationships and constraints
- Index optimization for PostgreSQL
- Data validation and integrity checks

**Current SQLite Schema Analysis:**
```sql
-- Current SQLite tables (from existing codebase)
CREATE TABLE feeds (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  last_fetched DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feed_items (
  id INTEGER PRIMARY KEY,
  feed_id INTEGER,
  title TEXT,
  content TEXT,
  url TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES feeds(id)
);
```

**New PostgreSQL Schema:**
```sql
-- prisma/schema.prisma
model Feed {
  id          String   @id @default(uuid())
  url         String   @unique
  title       String?
  description String?
  lastFetched DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items FeedItem[]

  @@map("feeds")
}

model FeedItem {
  id          String   @id @default(uuid())
  feedId      String
  title       String?
  content     String?
  url         String?
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  feed Feed @relation(fields: [feedId], references: [id], onDelete: Cascade)

  chunks ContentChunk[]

  @@map("feed_items")
}

model ContentChunk {
  id          String   @id @default(uuid())
  feedItemId  String
  chunkIndex  Int
  content     String
  metadata    Json?    // TOON-compatible metadata
  createdAt   DateTime @default(now())

  feedItem FeedItem @relation(fields: [feedItemId], references: [id], onDelete: Cascade)

  @@map("content_chunks")
}
```

**Migration Implementation:**

1. **Migration Script Structure**
```typescript
// scripts/migrate-to-postgres.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';

const prisma = new PrismaClient();
const sqlite = new Database('./data/database.db');

async function migrateData() {
  try {
    // Migrate feeds
    const feeds = sqlite.prepare('SELECT * FROM feeds').all();
    for (const feed of feeds) {
      await prisma.feed.create({
        data: {
          id: generateUUID(feed.id),
          url: feed.url,
          title: feed.title,
          description: feed.description,
          lastFetched: feed.last_fetched ? new Date(feed.last_fetched) : null,
          createdAt: new Date(feed.created_at),
          updatedAt: new Date()
        }
      });
    }

    // Migrate feed items
    const feedItems = sqlite.prepare('SELECT * FROM feed_items').all();
    for (const item of feedItems) {
      await prisma.feedItem.create({
        data: {
          id: generateUUID(item.id),
          feedId: generateUUID(item.feed_id),
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: item.published_at ? new Date(item.published_at) : null,
          createdAt: new Date(item.created_at),
          updatedAt: new Date()
        }
      });
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function generateUUID(sqliteId: number): string {
  // Convert SQLite INTEGER PK to UUID for PostgreSQL
  const hash = createHash('md5').update(sqliteId.toString()).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}
```

2. **Data Validation Script**
```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  const sqliteCount = sqlite.prepare('SELECT COUNT(*) as count FROM feeds').get();
  const postgresCount = await prisma.feed.count();

  if (sqliteCount.count !== postgresCount) {
    throw new Error(`Feed count mismatch: SQLite ${sqliteCount.count}, PostgreSQL ${postgresCount}`);
  }

  console.log('Data validation passed');
}
```

**Acceptance Criteria:**
- [ ] Complete schema mapping from SQLite to PostgreSQL
- [ ] Migration script handles all data types correctly
- [ ] Foreign key relationships preserved
- [ ] Data integrity validation passes
- [ ] Rollback procedures documented
- [ ] Performance benchmarks meet requirements

**Testing:**
- Unit tests for migration functions
- Integration tests with sample data
- Performance tests for large datasets
- Data consistency validation
- Rollback and recovery testing

---

### Story 1.3: Vector Database Integration (8 points)

**Goal:** Implement Qdrant client and vector database operations.

**Technical Requirements:**
- Qdrant REST API integration
- Vector storage and retrieval operations
- Metadata handling alongside vectors
- Batch operations support
- Error handling and connection management

**Implementation Steps:**

1. **Qdrant Client Setup**
```typescript
// src/lib/qdrant.ts
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Collection configuration
export const COLLECTION_NAME = 'feed_chunks';
export const VECTOR_SIZE = 384; // qwen2:0.5b embedding size

export async function ensureCollection() {
  try {
    await qdrantClient.getCollection(COLLECTION_NAME);
  } catch (error) {
    // Collection doesn't exist, create it
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    });
  }
}
```

2. **Vector Operations**
```typescript
// src/services/vectorService.ts
import { qdrantClient, COLLECTION_NAME } from '@/lib/qdrant';

export class VectorService {
  async storeVectors(vectors: number[][], metadata: any[], ids: string[]) {
    const points = vectors.map((vector, index) => ({
      id: ids[index],
      vector: vector,
      payload: metadata[index]
    }));

    await qdrantClient.upsert(COLLECTION_NAME, {
      points: points
    });
  }

  async searchVectors(queryVector: number[], limit: number = 10, filter?: any) {
    const searchRequest = {
      vector: queryVector,
      limit: limit,
      with_payload: true,
      with_vector: false
    };

    if (filter) {
      searchRequest.filter = filter;
    }

    const results = await qdrantClient.search(COLLECTION_NAME, searchRequest);
    return results;
  }

  async deleteVectors(ids: string[]) {
    await qdrantClient.delete(COLLECTION_NAME, {
      points: ids
    });
  }
}
```

3. **Metadata Schema**
```typescript
// types/vector.ts
export interface VectorMetadata {
  chunk_id: string;
  feed_item_id: string;
  feed_id: string;
  chunk_index: number;
  content_preview: string;
  source_url: string;
  published_at?: string;
  author?: string;
  tags?: string[];
  created_at: string;
}

export interface SearchFilter {
  feed_id?: string;
  date_range?: {
    gte: string;
    lte: string;
  };
  tags?: string[];
}
```

**Acceptance Criteria:**
- [ ] Qdrant client properly configured and connected
- [ ] Vector collection created with correct configuration
- [ ] Store, search, and delete operations implemented
- [ ] Metadata handling alongside vectors
- [ ] Batch operations support
- [ ] Error handling for connection issues
- [ ] Performance benchmarks meet requirements

**Testing:**
```typescript
// tests/vectorService.test.ts
describe('VectorService', () => {
  test('should store and retrieve vectors', async () => {
    const service = new VectorService();
    const testVectors = [[0.1, 0.2, 0.3]];
    const testMetadata = [{ chunk_id: 'test-1' }];
    const testIds = ['test-1'];

    await service.storeVectors(testVectors, testMetadata, testIds);

    const results = await service.searchVectors([0.1, 0.2, 0.3], 1);
    expect(results.length).toBe(1);
    expect(results[0].payload.chunk_id).toBe('test-1');
  });
});
```

---

### Story 1.4: Data Backup and Recovery (5 points)

**Goal:** Implement backup and recovery capabilities for both databases.

**Technical Requirements:**
- Automated backup procedures
- Point-in-time recovery
- Data consistency across databases
- Backup verification
- Recovery testing procedures

**Implementation Steps:**

1. **PostgreSQL Backup Script**
```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql"

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U postgres -d neural_feed_dev > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

echo "PostgreSQL backup completed: ${BACKUP_FILE}.gz"
```

2. **Qdrant Backup Script**
```bash
#!/bin/bash
# scripts/backup-qdrant.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/qdrant_backup_${TIMESTAMP}"

mkdir -p $BACKUP_DIR

# Use Qdrant snapshot API
curl -X POST "http://localhost:6333/collections/feed_chunks/snapshots" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -o "${BACKUP_FILE}.snapshot"

echo "Qdrant backup completed: ${BACKUP_FILE}.snapshot"
```

3. **Recovery Procedures**
```typescript
// scripts/recovery.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function recoverPostgreSQL(backupFile: string) {
  try {
    await execAsync(`gunzip -c ${backupFile} | psql -h localhost -U postgres -d neural_feed_dev`);
    console.log('PostgreSQL recovery completed');
  } catch (error) {
    console.error('PostgreSQL recovery failed:', error);
    throw error;
  }
}

export async function recoverQdrant(snapshotFile: string) {
  try {
    // Qdrant recovery would use their recovery API
    // This is a simplified example
    await execAsync(`curl -X POST "http://localhost:6333/collections/feed_chunks/snapshots/recover" \\
      -H "Content-Type: application/json" \\
      -d @${snapshotFile}`);
    console.log('Qdrant recovery completed');
  } catch (error) {
    console.error('Qdrant recovery failed:', error);
    throw error;
  }
}
```

**Acceptance Criteria:**
- [ ] Automated backup scripts for both databases
- [ ] Backup verification procedures
- [ ] Point-in-time recovery capability
- [ ] Data consistency validation
- [ ] Recovery testing with sample data
- [ ] Documentation for operations team

**Testing:**
- Backup execution and verification
- Recovery from backup files
- Data integrity after recovery
- Performance impact assessment
- Failure scenario testing

## Dependencies & Prerequisites

### Technical Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ with npm/yarn
- Git for version control
- Sufficient disk space for databases and backups

### Knowledge Prerequisites
- PostgreSQL database administration
- Docker container management
- TypeScript and Node.js development
- Database migration strategies
- Vector database concepts

### External Dependencies
- PostgreSQL 15 Docker image
- Qdrant latest Docker image
- Prisma ORM for database operations
- Qdrant JavaScript client library

## Risk Mitigation

### High-Risk Areas
1. **Data Migration Complexity**
   - **Risk:** Data loss or corruption during migration
   - **Mitigation:** Comprehensive testing, backup verification, staged rollout

2. **Database Performance**
   - **Risk:** Slow queries or high resource usage
   - **Mitigation:** Index optimization, query analysis, performance monitoring

3. **Vector Database Integration**
   - **Risk:** Connection issues or data inconsistency
   - **Mitigation:** Robust error handling, retry logic, monitoring

### Contingency Plans
- **Rollback Procedures:** Documented steps to revert to SQLite
- **Backup Strategy:** Multiple backup locations and verification
- **Monitoring:** Real-time alerts for database issues
- **Support:** Access to database experts for complex issues

## Success Criteria

### Epic Completion Criteria
- [ ] PostgreSQL and Qdrant containers running successfully
- [ ] Complete data migration from SQLite to PostgreSQL
- [ ] Vector database operations fully functional
- [ ] Backup and recovery procedures tested and documented
- [ ] All database connections working in application
- [ ] Performance benchmarks meet requirements (<100ms query time)
- [ ] Data integrity validation passes

### Quality Gates
- **Code Coverage:** >90% for database-related code
- **Performance:** Database operations complete within time limits
- **Security:** No sensitive data exposure in logs or backups
- **Documentation:** Complete setup and maintenance guides

## Implementation Timeline

### Week 1
- **Day 1-2:** Database infrastructure setup and Docker configuration
- **Day 3-4:** PostgreSQL schema design and initial migration scripts
- **Day 5:** Qdrant integration and vector operations

### Week 2
- **Day 1-2:** Complete data migration and validation
- **Day 3-4:** Backup and recovery system implementation
- **Day 5:** Testing, documentation, and handover

## Testing Strategy

### Unit Testing
- Database connection and query functions
- Vector operations and metadata handling
- Migration script components
- Backup and recovery utilities

### Integration Testing
- Full migration pipeline
- Cross-database consistency
- Vector search end-to-end
- Backup and recovery workflows

### Performance Testing
- Database query performance benchmarks
- Vector search latency measurements
- Migration time validation
- Concurrent user load testing

### Acceptance Testing
- Data integrity verification
- Application functionality with new databases
- Backup and recovery validation
- Performance under production-like load

## Monitoring & Observability

### Key Metrics
- Database connection pool utilization
- Query execution times
- Vector search performance
- Backup completion times
- Error rates and failure patterns

### Logging Strategy
- Structured logging for all database operations
- Error tracking with correlation IDs
- Performance metrics collection
- Audit trails for data modifications

### Alerting
- Database connection failures
- Slow query detection
- Backup failures
- Storage space warnings

This detailed context provides the foundation for successfully implementing Epic 1 and establishing a robust data infrastructure for the RAG system.