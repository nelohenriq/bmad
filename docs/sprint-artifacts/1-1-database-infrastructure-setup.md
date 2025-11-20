# Story: 1-1 Database Infrastructure Setup
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Estimated Points:** 8
**Priority:** Critical
**Assignee:** Backend Developer 1

## User Story
**As a** developer  
**I want to** set up PostgreSQL and Qdrant databases  
**So that** the system can store both relational and vector data for RAG functionality

## Business Value
This story establishes the foundational data infrastructure that enables all RAG capabilities. Without proper database setup, no other RAG features can function. This is the critical first step that unblocks the entire implementation.

## Acceptance Criteria

### Functional Requirements
- [ ] PostgreSQL container running and accessible on port 5432
- [ ] Qdrant container running and accessible on port 6333
- [ ] Docker Compose configuration functional and documented
- [ ] Basic health checks passing for both databases
- [ ] Environment configuration complete and validated
- [ ] Database connections working from application code

### Non-Functional Requirements
- [ ] Startup time < 30 seconds for both containers
- [ ] Memory usage within acceptable limits (< 2GB total)
- [ ] No security vulnerabilities in default configurations
- [ ] Configuration easily modifiable for different environments

### Quality Requirements
- [ ] Docker Compose file follows best practices
- [ ] Environment variables properly documented
- [ ] Health check endpoints functional
- [ ] Error messages clear and actionable

## Technical Requirements

### PostgreSQL Setup
- **Version:** PostgreSQL 15
- **Extensions:** PostGIS (for future spatial features)
- **Database:** neural_feed_dev
- **Authentication:** Password-based (development environment)
- **Persistence:** Named volume for data persistence

### Qdrant Setup
- **Version:** Latest stable
- **Collection Config:** Cosine similarity, 384 dimensions (qwen2:0.5b)
- **Persistence:** Named volume for data persistence
- **API:** REST API accessible on port 6333

### Docker Configuration
- **Network:** Isolated bridge network for database communication
- **Volumes:** Persistent storage for both databases
- **Health Checks:** Automatic container health monitoring
- **Resource Limits:** Memory and CPU constraints

## Implementation Details

### Step 1: Create Docker Compose Configuration
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
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d neural_feed_dev"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - neural_feed_network

  qdrant:
    image: qdrant/qdrant:latest
    container_name: neural_feed_qdrant
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

volumes:
  postgres_data:
    driver: local
  qdrant_data:
    driver: local

networks:
  neural_feed_network:
    driver: bridge
```

### Step 2: Database Initialization Scripts
```sql
-- scripts/init.sql
-- Create extensions and initial setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application role with limited permissions
CREATE ROLE neural_feed_app WITH LOGIN PASSWORD 'app_password';
GRANT CONNECT ON DATABASE neural_feed_dev TO neural_feed_app;
GRANT USAGE ON SCHEMA public TO neural_feed_app;

-- Grant permissions for application tables (to be created later)
-- These will be expanded as tables are created
```

### Step 3: Environment Configuration
```env
# .env.local
# PostgreSQL Configuration
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432
DATABASE_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/neural_feed_dev"

# Qdrant Configuration
QDRANT_PORT=6333
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""

# Application Configuration
NODE_ENV=development
NEXTAUTH_SECRET="development-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 4: Health Check Validation Scripts
```bash
#!/bin/bash
# scripts/health-check.sh

echo "Checking PostgreSQL health..."
if pg_isready -h localhost -p ${POSTGRES_PORT:-5432} -U postgres; then
  echo "✅ PostgreSQL is healthy"
else
  echo "❌ PostgreSQL is not responding"
  exit 1
fi

echo "Checking Qdrant health..."
if curl -f -s http://localhost:${QDRANT_PORT:-6333}/health > /dev/null; then
  echo "✅ Qdrant is healthy"
else
  echo "❌ Qdrant is not responding"
  exit 1
fi

echo "All databases are healthy!"
```

### Step 5: Application Connection Testing
```typescript
// scripts/test-connections.ts
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client';

async function testConnections() {
  console.log('Testing database connections...');

  // Test PostgreSQL
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ PostgreSQL connection successful');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }

  // Test Qdrant
  try {
    const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });
    const health = await qdrant.api('GET /health');
    console.log('✅ Qdrant connection successful');
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error);
    process.exit(1);
  }

  console.log('All connections successful!');
}
```

## Dependencies & Prerequisites

### System Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for testing scripts)
- At least 4GB available RAM
- At least 10GB available disk space

### External Dependencies
- PostgreSQL 15 Docker image
- Qdrant latest Docker image
- curl (for health checks)

## Testing Strategy

### Unit Testing
- Docker Compose file validation
- Environment variable parsing
- Connection string formatting
- Health check script functionality

### Integration Testing
- Container startup and shutdown
- Network connectivity between containers
- Volume persistence across restarts
- Application-to-database connections

### Performance Testing
- Container startup time measurement
- Memory usage monitoring
- Concurrent connection handling
- Resource limit validation

### Acceptance Testing
- Manual verification of health checks
- Application database operations
- Data persistence across container restarts
- Environment-specific configuration testing

## Success Metrics

### Completion Criteria
- [ ] Docker Compose up command succeeds without errors
- [ ] Both containers show healthy status in docker ps
- [ ] Health check scripts return success for both databases
- [ ] Application can establish connections to both databases
- [ ] Basic CRUD operations work on PostgreSQL
- [ ] Vector collection creation works on Qdrant

### Quality Metrics
- [ ] Startup time < 60 seconds total
- [ ] Memory usage < 2GB combined
- [ ] No container restarts during normal operation
- [ ] All health checks pass consistently

## Risk Mitigation

### Identified Risks
1. **Port Conflicts:** Default ports (5432, 6333) may be in use
   - **Mitigation:** Environment variable configuration for custom ports

2. **Resource Constraints:** Insufficient memory/disk space
   - **Mitigation:** Clear system requirements and resource monitoring

3. **Network Issues:** Containers can't communicate
   - **Mitigation:** Explicit network configuration and connectivity testing

4. **Data Persistence:** Data loss on container restart
   - **Mitigation:** Named volumes and backup procedures

### Contingency Plans
- **Alternative Setup:** Local PostgreSQL/Qdrant installation if Docker fails
- **Port Changes:** Automatic port detection and configuration
- **Resource Scaling:** Docker resource limit adjustments
- **Data Recovery:** Backup and restore procedures

## Documentation Requirements

### Setup Documentation
- [ ] Docker Compose usage instructions
- [ ] Environment variable configuration guide
- [ ] Troubleshooting common issues
- [ ] Development vs production differences

### Operational Documentation
- [ ] Container management commands
- [ ] Health check procedures
- [ ] Backup and recovery processes
- [ ] Monitoring and alerting setup

## Definition of Done

- [ ] Code implemented and committed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Acceptance criteria verified
- [ ] Sprint demo prepared
- [ ] No outstanding bugs or issues

## Story Completion Checklist

### Development Phase
- [ ] Docker Compose configuration created
- [ ] Environment variables configured
- [ ] Health check scripts implemented
- [ ] Connection testing scripts created
- [ ] Documentation written

### Testing Phase
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Manual testing completed
- [ ] Performance benchmarks met

### Review Phase
- [ ] Code review completed
- [ ] Documentation review completed
- [ ] Acceptance criteria verified
- [ ] Story marked as done in sprint tracking

This story establishes the critical database infrastructure foundation that enables all subsequent RAG development work.