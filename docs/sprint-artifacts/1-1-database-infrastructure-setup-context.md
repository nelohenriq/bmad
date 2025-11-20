# Story Context: 1-1 Database Infrastructure Setup

## Overview

**Story:** 1-1 Database Infrastructure Setup
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Status:** Drafted → Ready for Development
**Estimated Effort:** 8 story points (4-5 days)

## Story Summary

This story establishes the foundational database infrastructure required for the RAG implementation. It sets up PostgreSQL for relational data storage and Qdrant for vector embeddings, creating the data layer that all subsequent RAG features depend on.

## Business Context

### Why This Story Matters
- **Foundation for RAG:** Without database infrastructure, no RAG features can function
- **Data Persistence:** Ensures content and embeddings are reliably stored
- **Scalability Foundation:** Establishes architecture for future growth
- **Development Enablement:** Allows parallel development of other features

### Business Value Delivered
- Enables content storage and retrieval
- Supports vector similarity search
- Provides foundation for AI-powered features
- Reduces development friction for the team

## Technical Context

### Architecture Requirements

#### PostgreSQL Setup
**Version:** PostgreSQL 15 (latest stable with performance improvements)
**Purpose:** Relational data storage for feeds, content chunks, and metadata
**Key Features Needed:**
- UUID support for entity identification
- JSON support for flexible metadata storage
- ACID compliance for data integrity
- Connection pooling for performance

#### Qdrant Setup
**Version:** Latest stable
**Purpose:** Vector storage and similarity search for embeddings
**Key Features Needed:**
- Cosine similarity metric (optimal for text embeddings)
- 384-dimensional vectors (qwen2:0.5b output size)
- REST API for easy integration
- Payload storage for metadata alongside vectors

### Infrastructure Decisions

#### Containerization Strategy
- **Docker Compose:** Simplifies local development and ensures consistency
- **Named Volumes:** Persistent data storage across container restarts
- **Health Checks:** Automatic monitoring and restart capabilities
- **Network Isolation:** Dedicated network for database communication

#### Environment Configuration
- **Environment Variables:** Flexible configuration for different environments
- **Default Values:** Sensible defaults for development
- **Validation:** Runtime validation of configuration
- **Documentation:** Clear setup instructions

## Implementation Guidance

### Phase 1: Infrastructure Setup (Day 1)

#### 1.1 Create Docker Compose Configuration
```yaml
# docker-compose.infrastructure.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: neural_feed_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: neural_feed_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8"
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/postgres-init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d neural_feed_dev -h localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - neural_feed_network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  qdrant:
    image: qdrant/qdrant:latest
    container_name: neural_feed_qdrant
    restart: unless-stopped
    ports:
      - "${QDRANT_PORT:-6333}:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - neural_feed_network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

volumes:
  postgres_data:
    driver: local
  qdrant_data:
    driver: local

networks:
  neural_feed_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 1.2 PostgreSQL Initialization Script
```sql
-- scripts/postgres-init.sql
-- Database initialization for Neural Feed Studio RAG

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application role with limited permissions
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'neural_feed_app') THEN
      CREATE ROLE neural_feed_app WITH LOGIN PASSWORD 'app_password';
   END IF;
END
$$;

-- Grant basic permissions
GRANT CONNECT ON DATABASE neural_feed_dev TO neural_feed_app;
GRANT USAGE ON SCHEMA public TO neural_feed_app;
GRANT CREATE ON SCHEMA public TO neural_feed_app;

-- Create development helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

#### 1.3 Environment Configuration
```bash
# .env.infrastructure
# Database Infrastructure Configuration

# PostgreSQL Settings
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432
DATABASE_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"

# Qdrant Settings
QDRANT_PORT=6333
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""

# Development Settings
NODE_ENV=development
DEBUG=neural-feed:*

# Resource Limits (for development)
POSTGRES_MEMORY_LIMIT=1g
QDRANT_MEMORY_LIMIT=1g
```

### Phase 2: Validation & Testing (Day 2)

#### 2.1 Health Check Implementation
```typescript
// scripts/health-check.ts
import { Client as PostgresClient } from 'pg';
import fetch from 'node-fetch';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
}

async function checkPostgreSQL(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const client = new PostgresClient({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    return {
      service: 'PostgreSQL',
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      service: 'PostgreSQL',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkQdrant(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${process.env.QDRANT_URL}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return {
      service: 'Qdrant',
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      service: 'Qdrant',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runHealthChecks() {
  console.log('🔍 Running infrastructure health checks...\n');

  const [postgresStatus, qdrantStatus] = await Promise.all([
    checkPostgreSQL(),
    checkQdrant()
  ]);

  const results = [postgresStatus, qdrantStatus];

  results.forEach(result => {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    console.log(`${icon} ${result.service}: ${result.status} (${result.responseTime}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const allHealthy = results.every(r => r.status === 'healthy');
  console.log(`\n${allHealthy ? '🎉' : '⚠️'} Infrastructure ${allHealthy ? 'healthy' : 'has issues'}`);

  if (!allHealthy) {
    process.exit(1);
  }
}

runHealthChecks().catch(console.error);
```

#### 2.2 Connection Testing
```typescript
// scripts/test-connections.ts
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client';

async function testPostgreSQL() {
  console.log('Testing PostgreSQL connection...');

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful');

    // Test basic query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ PostgreSQL query successful:', result);

    await prisma.$disconnect();
    console.log('✅ PostgreSQL disconnection successful');
  } catch (error) {
    console.error('❌ PostgreSQL test failed:', error);
    throw error;
  }
}

async function testQdrant() {
  console.log('Testing Qdrant connection...');

  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
  });

  try {
    // Test health endpoint
    const health = await qdrant.api('GET /health');
    console.log('✅ Qdrant health check successful');

    // Test collections endpoint
    const collections = await qdrant.getCollections();
    console.log('✅ Qdrant collections query successful:', collections.collections.length, 'collections');

    console.log('✅ Qdrant connection test completed');
  } catch (error) {
    console.error('❌ Qdrant test failed:', error);
    throw error;
  }
}

async function runConnectionTests() {
  try {
    await testPostgreSQL();
    console.log();
    await testQdrant();
    console.log('\n🎉 All connection tests passed!');
  } catch (error) {
    console.error('\n💥 Connection tests failed!');
    process.exit(1);
  }
}

runConnectionTests();
```

### Phase 3: Application Integration (Day 3-4)

#### 3.1 Database Client Configuration
```typescript
// src/lib/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection test function
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
```

#### 3.2 Vector Database Client
```typescript
// src/lib/qdrant.ts
import { QdrantClient } from '@qdrant/js-client';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

// Collection configuration
export const COLLECTION_CONFIG = {
  name: 'feed_chunks',
  vectorSize: 384, // qwen2:0.5b embedding size
  distance: 'Cosine' as const
};

export async function ensureCollection() {
  try {
    await qdrantClient.getCollection(COLLECTION_CONFIG.name);
    console.log(`Collection '${COLLECTION_CONFIG.name}' already exists`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`Creating collection '${COLLECTION_CONFIG.name}'...`);
      await qdrantClient.createCollection(COLLECTION_CONFIG.name, {
        vectors: {
          size: COLLECTION_CONFIG.vectorSize,
          distance: COLLECTION_CONFIG.distance
        }
      });
      console.log(`Collection '${COLLECTION_CONFIG.name}' created successfully`);
    } else {
      throw error;
    }
  }
}

export async function testQdrantConnection(): Promise<boolean> {
  try {
    const health = await qdrantClient.api('GET /health');
    return health.status === 'ok';
  } catch (error) {
    console.error('Qdrant connection test failed:', error);
    return false;
  }
}

export { qdrantClient };
```

#### 3.3 Infrastructure Status API
```typescript
// src/app/api/infrastructure/status/route.ts
import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/database';
import { testQdrantConnection } from '@/lib/qdrant';

export async function GET() {
  try {
    const [postgresHealthy, qdrantHealthy] = await Promise.all([
      testDatabaseConnection(),
      testQdrantConnection()
    ]);

    const overallHealthy = postgresHealthy && qdrantHealthy;

    return NextResponse.json({
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        postgresql: {
          status: postgresHealthy ? 'healthy' : 'unhealthy',
          type: 'relational'
        },
        qdrant: {
          status: qdrantHealthy ? 'healthy' : 'unhealthy',
          type: 'vector'
        }
      }
    });
  } catch (error) {
    console.error('Infrastructure status check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to check infrastructure status'
      },
      { status: 500 }
    );
  }
}
```

### Phase 4: Documentation & Validation (Day 5)

#### 4.1 Setup Documentation
```markdown
# Database Infrastructure Setup Guide

## Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+
- 4GB RAM available
- 10GB disk space available

## Quick Start

1. **Clone and setup environment:**
   ```bash
   cd neural-feed-studio
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

2. **Start infrastructure:**
   ```bash
   docker-compose -f docker-compose.infrastructure.yml up -d
   ```

3. **Verify setup:**
   ```bash
   # Run health checks
   npm run health-check

   # Test connections
   npm run test-connections
   ```

4. **Check status via API:**
   ```bash
   curl http://localhost:3000/api/infrastructure/status
   ```

## Troubleshooting

### PostgreSQL Issues
- **Port already in use:** Change POSTGRES_PORT in .env.local
- **Connection refused:** Check if container is running with `docker ps`
- **Permission denied:** Verify POSTGRES_PASSWORD is correct

### Qdrant Issues
- **Port conflict:** Change QDRANT_PORT in .env.local
- **Memory issues:** Increase Docker memory limit
- **Storage issues:** Check available disk space

### General Issues
- **Slow startup:** Check system resources
- **Network issues:** Verify Docker network configuration
- **Volume issues:** Check Docker volume permissions
```

#### 4.2 Validation Scripts
```typescript
// scripts/validate-infrastructure.ts
import { testDatabaseConnection } from '@/lib/database';
import { testQdrantConnection, ensureCollection } from '@/lib/qdrant';

async function validateInfrastructure() {
  console.log('🔍 Validating infrastructure setup...\n');

  // Test connections
  const postgresOk = await testDatabaseConnection();
  const qdrantOk = await testQdrantConnection();

  console.log(`PostgreSQL: ${postgresOk ? '✅' : '❌'}`);
  console.log(`Qdrant: ${qdrantOk ? '✅' : '❌'}`);

  if (!postgresOk || !qdrantOk) {
    console.error('\n💥 Infrastructure validation failed!');
    process.exit(1);
  }

  // Test Qdrant collection creation
  try {
    await ensureCollection();
    console.log('Qdrant collection: ✅');
  } catch (error) {
    console.error('Qdrant collection: ❌', error);
    process.exit(1);
  }

  // Test basic database operations
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Test basic query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database operations: ✅');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Database operations: ❌', error);
    process.exit(1);
  }

  console.log('\n🎉 Infrastructure validation completed successfully!');
  console.log('Ready for RAG implementation development.');
}

validateInfrastructure().catch(console.error);
```

## Development Workflow

### Daily Development Setup
1. **Start infrastructure:** `docker-compose -f docker-compose.infrastructure.yml up -d`
2. **Run health checks:** `npm run health-check`
3. **Start development server:** `npm run dev`
4. **Monitor logs:** `docker-compose logs -f`

### Testing Workflow
1. **Unit tests:** `npm run test:unit`
2. **Integration tests:** `npm run test:integration`
3. **Infrastructure tests:** `npm run test:infrastructure`
4. **End-to-end tests:** `npm run test:e2e`

### Debugging Workflow
1. **Check container status:** `docker ps`
2. **View container logs:** `docker logs <container_name>`
3. **Access database directly:** `docker exec -it neural_feed_postgres psql -U postgres -d neural_feed_dev`
4. **Check Qdrant UI:** Open http://localhost:6333/dashboard

## Performance Considerations

### Resource Optimization
- **Memory limits:** Prevent resource exhaustion
- **Connection pooling:** Efficient database connections
- **Query optimization:** Index usage and query planning
- **Caching:** Reduce database load for frequent queries

### Monitoring & Alerting
- **Health checks:** Automatic failure detection
- **Metrics collection:** Performance and usage tracking
- **Alert thresholds:** Proactive issue notification
- **Log aggregation:** Centralized error tracking

## Security Considerations

### Development Security
- **Environment isolation:** Separate dev/test/prod environments
- **Credential management:** Secure password storage
- **Network security:** Container network isolation
- **Access control:** Database user permissions

### Production Readiness
- **SSL/TLS:** Encrypted database connections
- **Authentication:** Strong credential requirements
- **Backup security:** Encrypted backup storage
- **Audit logging:** Database access tracking

## Success Criteria Validation

### Functional Validation
- [ ] PostgreSQL accepts connections and queries
- [ ] Qdrant responds to health checks and API calls
- [ ] Docker containers start within 60 seconds
- [ ] Application can read/write to both databases
- [ ] Health check endpoints return success

### Performance Validation
- [ ] Query response time < 100ms for simple operations
- [ ] Container memory usage < 2GB combined
- [ ] Startup time < 60 seconds total
- [ ] Concurrent connections supported

### Quality Validation
- [ ] All configuration documented
- [ ] Error handling implemented
- [ ] Logging configured appropriately
- [ ] Code follows project standards

## Risk Mitigation

### Implementation Risks
1. **Docker complexity:** Provide detailed setup guides and troubleshooting
2. **Resource constraints:** Clear system requirements and monitoring
3. **Network issues:** Explicit network configuration and testing
4. **Data persistence:** Named volumes and backup procedures

### Operational Risks
1. **Container failures:** Health checks and automatic restarts
2. **Performance degradation:** Resource monitoring and alerts
3. **Security vulnerabilities:** Regular updates and security scanning
4. **Data loss:** Automated backups and recovery procedures

## Definition of Done

### Code Quality
- [ ] All code reviewed and approved
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Documentation complete and accurate

### Infrastructure Quality
- [ ] Docker configuration optimized
- [ ] Environment setup validated
- [ ] Health checks functional
- [ ] Performance benchmarks met

### Operational Readiness
- [ ] Setup documentation complete
- [ ] Troubleshooting guides available
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested

### Team Readiness
- [ ] Development team trained on infrastructure
- [ ] Support procedures documented
- [ ] Knowledge transfer completed
- [ ] Go-live checklist validated

This context provides comprehensive guidance for implementing the database infrastructure foundation, ensuring reliable and scalable data storage for the RAG system.