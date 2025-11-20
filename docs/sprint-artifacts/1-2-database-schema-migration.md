# Story: 1-2 Database Schema Migration
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Estimated Points:** 13
**Priority:** Critical
**Assignee:** Backend Developer 1

## User Story
**As a** developer  
**I want to** migrate from SQLite to PostgreSQL schema  
**So that** the system supports advanced querying and vector operations

## Business Value
This story enables the transition from a simple file-based database to a robust relational database that can handle the complex queries and relationships required for RAG functionality. Without this migration, the system cannot support the advanced features needed for content analysis, user management, and vector operations.

## Acceptance Criteria

### Functional Requirements
- [ ] Complete schema mapping from SQLite to PostgreSQL implemented
- [ ] Migration scripts handle all data types correctly (TEXT, INTEGER, DATETIME)
- [ ] Foreign key relationships and constraints preserved
- [ ] Data integrity validation passes for all migrated records
- [ ] Rollback procedures documented and tested
- [ ] Migration performance meets requirements (< 30 minutes for typical datasets)
- [ ] Zero data loss during migration process

### Non-Functional Requirements
- [ ] Migration scripts are idempotent (can be run multiple times safely)
- [ ] Transaction safety ensures atomic migration operations
- [ ] Comprehensive error handling and recovery mechanisms
- [ ] Migration progress logging and monitoring
- [ ] Backward compatibility maintained during transition period

### Quality Requirements
- [ ] Migration scripts include comprehensive validation
- [ ] Data transformation logic handles edge cases
- [ ] Performance optimized for large datasets
- [ ] Documentation includes troubleshooting procedures
- [ ] Testing covers various data scenarios

## Technical Requirements

### Current SQLite Schema Analysis
**Existing Tables:**
```sql
-- Current feeds table
CREATE TABLE feeds (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  last_fetched DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Current feed_items table
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

### Target PostgreSQL Schema
**New Schema with RAG Support:**
```sql
-- Enhanced feeds table with UUID
CREATE TABLE feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  last_fetched TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced feed_items table
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

-- New content_chunks table for RAG
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_item_id) REFERENCES feed_items(id) ON DELETE CASCADE,
  UNIQUE(feed_item_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at);
CREATE INDEX idx_content_chunks_feed_item_id ON content_chunks(feed_item_id);
CREATE INDEX idx_content_chunks_metadata ON content_chunks USING GIN(metadata);
```

### Migration Strategy
**Approach:** Phased migration with validation and rollback capabilities
**Tools:** Custom TypeScript migration scripts using Prisma and better-sqlite3
**Safety:** Transaction-based migration with comprehensive error handling

## Implementation Details

### Phase 1: Migration Planning & Analysis (Day 1-2)

#### 1.1 Schema Analysis Script
```typescript
// scripts/analyze-sqlite-schema.ts
import Database from 'better-sqlite3';
import * as fs from 'fs';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: any;
  primaryKey: boolean;
}

function analyzeSQLiteSchema(dbPath: string): TableInfo[] {
  const db = new Database(dbPath, { readonly: true });

  try {
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];

    const schemaInfo: TableInfo[] = [];

    for (const table of tables) {
      // Get table info
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };

      const columnInfo: ColumnInfo[] = columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1
      }));

      schemaInfo.push({
        name: table.name,
        columns: columnInfo,
        rowCount: rowCount.count
      });
    }

    return schemaInfo;
  } finally {
    db.close();
  }
}

function generateMigrationReport(schemaInfo: TableInfo[]): void {
  console.log('📊 SQLite Schema Analysis Report');
  console.log('==================================\n');

  schemaInfo.forEach(table => {
    console.log(`Table: ${table.name}`);
    console.log(`Rows: ${table.rowCount.toLocaleString()}`);
    console.log('Columns:');
    table.columns.forEach(col => {
      const pk = col.primaryKey ? ' (PK)' : '';
      const nullable = col.nullable ? '' : ' NOT NULL';
      console.log(`  - ${col.name}: ${col.type}${nullable}${pk}`);
    });
    console.log();
  });

  // Generate JSON report
  fs.writeFileSync('migration-analysis.json', JSON.stringify(schemaInfo, null, 2));
  console.log('📄 Detailed analysis saved to migration-analysis.json');
}

// Usage
const schemaInfo = analyzeSQLiteSchema('./data/database.db');
generateMigrationReport(schemaInfo);
```

#### 1.2 Data Sampling Script
```typescript
// scripts/sample-sqlite-data.ts
import Database from 'better-sqlite3';
import * as fs from 'fs';

function sampleSQLiteData(dbPath: string, sampleSize: number = 10): void {
  const db = new Database(dbPath, { readonly: true });

  try {
    // Sample feeds
    const feeds = db.prepare(`
      SELECT * FROM feeds ORDER BY RANDOM() LIMIT ?
    `).all(sampleSize);

    // Sample feed items
    const feedItems = db.prepare(`
      SELECT * FROM feed_items ORDER BY RANDOM() LIMIT ?
    `).all(sampleSize);

    const sampleData = {
      feeds,
      feedItems,
      metadata: {
        sampledAt: new Date().toISOString(),
        sampleSize,
        totalFeeds: db.prepare('SELECT COUNT(*) as count FROM feeds').get().count,
        totalFeedItems: db.prepare('SELECT COUNT(*) as count FROM feed_items').get().count
      }
    };

    fs.writeFileSync('data-sample.json', JSON.stringify(sampleData, null, 2));
    console.log('📊 Data sample saved to data-sample.json');

    // Log data types and ranges
    console.log('\n📈 Data Analysis:');
    console.log(`Total feeds: ${sampleData.metadata.totalFeeds}`);
    console.log(`Total feed items: ${sampleData.metadata.totalFeedItems}`);

  } finally {
    db.close();
  }
}

sampleSQLiteData('./data/database.db');
```

### Phase 2: Migration Script Development (Day 3-4)

#### 2.1 Core Migration Script
```typescript
// scripts/migrate-to-postgres.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import * as fs from 'fs';

interface MigrationStats {
  feedsProcessed: number;
  feedItemsProcessed: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

class DatabaseMigrator {
  private sqlite: Database;
  private prisma: PrismaClient;
  private stats: MigrationStats;

  constructor(sqlitePath: string) {
    this.sqlite = new Database(sqlitePath, { readonly: true });
    this.prisma = new PrismaClient();
    this.stats = {
      feedsProcessed: 0,
      feedItemsProcessed: 0,
      startTime: new Date(),
      errors: []
    };
  }

  // Convert SQLite INTEGER PK to UUID for PostgreSQL
  private generateUUID(sqliteId: number): string {
    const hash = createHash('md5').update(sqliteId.toString()).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  // Validate data integrity
  private validateFeedItem(item: any): boolean {
    if (!item.feed_id) {
      this.stats.errors.push(`Feed item ${item.id} missing feed_id`);
      return false;
    }
    if (!item.title && !item.content) {
      this.stats.errors.push(`Feed item ${item.id} missing both title and content`);
      return false;
    }
    return true;
  }

  async migrateFeeds(): Promise<void> {
    console.log('🔄 Migrating feeds...');

    const feeds = this.sqlite.prepare('SELECT * FROM feeds').all() as any[];

    for (const feed of feeds) {
      try {
        await this.prisma.feed.create({
          data: {
            id: this.generateUUID(feed.id),
            url: feed.url,
            title: feed.title,
            description: feed.description,
            lastFetched: feed.last_fetched ? new Date(feed.last_fetched) : null,
            createdAt: new Date(feed.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        this.stats.feedsProcessed++;
      } catch (error) {
        this.stats.errors.push(`Failed to migrate feed ${feed.id}: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${this.stats.feedsProcessed} feeds`);
  }

  async migrateFeedItems(): Promise<void> {
    console.log('🔄 Migrating feed items...');

    const feedItems = this.sqlite.prepare('SELECT * FROM feed_items').all() as any[];

    for (const item of feedItems) {
      if (!this.validateFeedItem(item)) continue;

      try {
        await this.prisma.feedItem.create({
          data: {
            id: this.generateUUID(item.id),
            feedId: this.generateUUID(item.feed_id),
            title: item.title,
            content: item.content,
            url: item.url,
            publishedAt: item.published_at ? new Date(item.published_at) : null,
            createdAt: new Date(item.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        this.stats.feedItemsProcessed++;
      } catch (error) {
        this.stats.errors.push(`Failed to migrate feed item ${item.id}: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${this.stats.feedItemsProcessed} feed items`);
  }

  async validateMigration(): Promise<boolean> {
    console.log('🔍 Validating migration...');

    // Check counts
    const sqliteFeeds = this.sqlite.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
    const postgresFeeds = await this.prisma.feed.count();

    const sqliteItems = this.sqlite.prepare('SELECT COUNT(*) as count FROM feed_items').get().count;
    const postgresItems = await this.prisma.feedItem.count();

    const feedsMatch = sqliteFeeds === postgresFeeds;
    const itemsMatch = sqliteItems === postgresItems;

    console.log(`Feeds: SQLite ${sqliteFeeds} → PostgreSQL ${postgresFeeds} ${feedsMatch ? '✅' : '❌'}`);
    console.log(`Feed Items: SQLite ${sqliteItems} → PostgreSQL ${postgresItems} ${itemsMatch ? '✅' : '❌'}`);

    return feedsMatch && itemsMatch;
  }

  async runMigration(): Promise<boolean> {
    try {
      console.log('🚀 Starting database migration...');
      console.log(`Start time: ${this.stats.startTime.toISOString()}`);

      // Run migration in transaction
      await this.prisma.$transaction(async () => {
        await this.migrateFeeds();
        await this.migrateFeedItems();
      });

      // Validate migration
      const isValid = await this.validateMigration();

      this.stats.endTime = new Date();
      const duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

      console.log(`\n📊 Migration completed in ${duration}ms`);
      console.log(`Errors: ${this.stats.errors.length}`);

      if (this.stats.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        this.stats.errors.forEach(error => console.log(`  - ${error}`));
      }

      // Save migration report
      fs.writeFileSync('migration-report.json', JSON.stringify(this.stats, null, 2));

      return isValid && this.stats.errors.length === 0;

    } catch (error) {
      console.error('💥 Migration failed:', error);
      this.stats.errors.push(`Migration failed: ${error.message}`);
      return false;
    } finally {
      this.sqlite.close();
      await this.prisma.$disconnect();
    }
  }
}

// CLI usage
async function main() {
  const sqlitePath = process.argv[2] || './data/database.db';

  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database not found: ${sqlitePath}`);
    process.exit(1);
  }

  const migrator = new DatabaseMigrator(sqlitePath);
  const success = await migrator.runMigration();

  if (success) {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('💥 Migration completed with errors!');
    process.exit(1);
  }
}

main().catch(console.error);
```

#### 2.2 Rollback Script
```typescript
// scripts/rollback-migration.ts
import { PrismaClient } from '@prisma/client';

async function rollbackMigration(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Rolling back migration...');

    // Clear all data in reverse order (respecting foreign keys)
    await prisma.contentChunk.deleteMany();
    await prisma.feedItem.deleteMany();
    await prisma.feed.deleteMany();

    console.log('✅ Migration rolled back successfully');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

rollbackMigration().catch(console.error);
```

### Phase 3: Testing & Validation (Day 5-6)

#### 3.1 Migration Testing Script
```typescript
// scripts/test-migration.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import * as fs from 'fs';

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function runMigrationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Schema validation
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();

    // Check if tables exist
    const feedsExist = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feeds')`;
    const feedItemsExist = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_items')`;
    const chunksExist = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_chunks')`;

    results.push({
      test: 'Schema validation',
      passed: feedsExist && feedItemsExist && chunksExist,
      details: 'All required tables exist'
    });

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: 'Schema validation',
      passed: false,
      error: error.message
    });
  }

  // Test 2: Data integrity
  try {
    const sqlite = new Database('./data/database.db', { readonly: true });
    const prisma = new PrismaClient();

    const sqliteFeeds = sqlite.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
    const postgresFeeds = await prisma.feed.count();

    const integrityCheck = sqliteFeeds === postgresFeeds;

    results.push({
      test: 'Data integrity',
      passed: integrityCheck,
      details: `SQLite: ${sqliteFeeds}, PostgreSQL: ${postgresFeeds}`
    });

    sqlite.close();
    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: 'Data integrity',
      passed: false,
      error: error.message
    });
  }

  // Test 3: Foreign key constraints
  try {
    const prisma = new PrismaClient();

    // Try to create feed item with invalid feed_id (should fail)
    try {
      await prisma.feedItem.create({
        data: {
          feedId: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          title: 'Test',
          content: 'Test content'
        }
      });
      results.push({
        test: 'Foreign key constraints',
        passed: false,
        error: 'Foreign key constraint not enforced'
      });
    } catch (error) {
      // Expected to fail due to foreign key constraint
      results.push({
        test: 'Foreign key constraints',
        passed: true,
        details: 'Foreign key constraints working correctly'
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      test: 'Foreign key constraints',
      passed: false,
      error: error.message
    });
  }

  return results;
}

async function main() {
  console.log('🧪 Running migration tests...\n');

  const results = await runMigrationTests();

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    if (result.details) console.log(`   ${result.details}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All migration tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check migration logs.');
    process.exit(1);
  }

  // Save test results
  fs.writeFileSync('migration-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: { passed, total, success: passed === total }
  }, null, 2));
}

main().catch(console.error);
```

#### 3.2 Performance Benchmarking
```typescript
// scripts/benchmark-migration.ts
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';

interface BenchmarkResult {
  operation: string;
  duration: number;
  recordsProcessed?: number;
  recordsPerSecond?: number;
}

async function benchmarkMigration(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  // Benchmark schema analysis
  const schemaStart = performance.now();
  execSync('npm run analyze-schema', { stdio: 'pipe' });
  const schemaDuration = performance.now() - schemaStart;
  results.push({
    operation: 'Schema analysis',
    duration: schemaDuration
  });

  // Benchmark data migration (if data exists)
  try {
    const migrationStart = performance.now();
    execSync('npm run migrate-db', { stdio: 'pipe' });
    const migrationDuration = performance.now() - migrationStart;

    // Get record counts for throughput calculation
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const feedCount = await prisma.feed.count();
    const itemCount = await prisma.feedItem.count();
    const totalRecords = feedCount + itemCount;

    results.push({
      operation: 'Data migration',
      duration: migrationDuration,
      recordsProcessed: totalRecords,
      recordsPerSecond: totalRecords / (migrationDuration / 1000)
    });

    await prisma.$disconnect();
  } catch (error) {
    results.push({
      operation: 'Data migration',
      duration: 0,
      error: error.message
    });
  }

  return results;
}

async function main() {
  console.log('⚡ Running migration benchmarks...\n');

  const results = await benchmarkMigration();

  results.forEach(result => {
    console.log(`${result.operation}:`);
    console.log(`  Duration: ${result.duration.toFixed(2)}ms`);

    if (result.recordsProcessed) {
      console.log(`  Records: ${result.recordsProcessed.toLocaleString()}`);
      console.log(`  Throughput: ${result.recordsPerSecond?.toFixed(2)} records/sec`);
    }

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    console.log();
  });

  // Save benchmark results
  require('fs').writeFileSync('migration-benchmarks.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results
  }, null, 2));

  console.log('📊 Benchmarks saved to migration-benchmarks.json');
}

main().catch(console.error);
```

## Dependencies & Prerequisites

### System Requirements
- Node.js 18+ with TypeScript support
- Access to source SQLite database file
- PostgreSQL and Qdrant containers running
- Sufficient disk space for data migration
- File system permissions for reading SQLite and writing to PostgreSQL

### External Dependencies
- better-sqlite3: For reading SQLite database
- @prisma/client: For PostgreSQL operations
- uuid: For ID generation
- fs-extra: For file operations

### Knowledge Prerequisites
- Understanding of relational database concepts
- Experience with data migration patterns
- Familiarity with SQL and database constraints
- Knowledge of transaction management

## Testing Strategy

### Unit Testing
- Migration function individual components
- Data transformation logic
- Error handling scenarios
- UUID generation consistency

### Integration Testing
- End-to-end migration pipeline
- Database connection handling
- Transaction rollback scenarios
- Cross-database consistency validation

### Performance Testing
- Migration time measurement
- Memory usage monitoring
- Large dataset handling
- Concurrent operation simulation

### Acceptance Testing
- Data integrity verification
- Application functionality post-migration
- Performance comparison with original system
- User acceptance validation

## Success Metrics

### Completion Criteria
- [ ] Migration script runs without errors
- [ ] All data successfully migrated
- [ ] Foreign key relationships preserved
- [ ] Data integrity validation passes
- [ ] Performance requirements met
- [ ] Rollback procedures functional

### Quality Metrics
- [ ] Zero data loss during migration
- [ ] Migration time < 30 minutes for typical datasets
- [ ] Error handling covers all edge cases
- [ ] Documentation includes troubleshooting guides
- [ ] Testing covers > 90% of migration scenarios

## Risk Mitigation

### Identified Risks
1. **Data Loss:** Comprehensive backups and validation
2. **Performance Issues:** Benchmarking and optimization
3. **Schema Incompatibilities:** Thorough analysis and testing
4. **Downtime Requirements:** Phased migration approach
5. **Rollback Complexity:** Tested rollback procedures

### Contingency Plans
- **Backup Strategy:** Multiple backup points before migration
- **Staged Rollback:** Ability to revert in phases
- **Data Recovery:** Point-in-time recovery options
- **Alternative Migration:** Manual migration procedures if automated fails
- **Support Resources:** Database expert availability during migration

## Definition of Done

### Code Quality
- [ ] Migration scripts reviewed and approved
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Error handling comprehensive and tested
- [ ] Code follows project standards

### Documentation
- [ ] Migration procedures documented
- [ ] Troubleshooting guides created
- [ ] Rollback procedures documented
- [ ] Performance benchmarks included
- [ ] Post-migration validation steps defined

### Testing
- [ ] Data integrity tests passing
- [ ] Performance benchmarks met
- [ ] Edge case handling validated
- [ ] Rollback procedures tested
- [ ] Application integration verified

### Operational Readiness
- [ ] Migration scripts packaged for deployment
- [ ] Monitoring and alerting configured
- [ ] Support procedures documented
- [ ] Go-live checklist completed
- [ ] Success criteria validated

## Story Completion Checklist

### Development Phase
- [ ] Schema analysis completed
- [ ] Migration scripts implemented
- [ ] Data validation logic created
- [ ] Rollback procedures developed
- [ ] Error handling implemented

### Testing Phase
- [ ] Unit tests for migration functions
- [ ] Integration tests for full pipeline
- [ ] Performance testing completed
- [ ] Data integrity validation passed
- [ ] Edge case testing finished

### Documentation Phase
- [ ] Migration guide written
- [ ] Troubleshooting procedures documented
- [ ] Rollback instructions created
- [ ] Performance benchmarks recorded
- [ ] Operational procedures defined

### Review Phase
- [ ] Code review completed
- [ ] Documentation review finished
- [ ] Testing results validated
- [ ] Acceptance criteria verified
- [ ] Story signed off by product owner

This story transforms the database foundation from a simple file-based system to a robust, scalable relational database that can support all RAG functionality while ensuring zero data loss and maintaining system integrity.