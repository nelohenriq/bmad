# Story Context: 1-2 Database Schema Migration

## Overview

**Story:** 1-2 Database Schema Migration
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Status:** Drafted → Ready for Development
**Estimated Effort:** 13 story points (6-7 days)

## Story Summary

This story implements the critical database migration from SQLite to PostgreSQL, transforming the data foundation from a simple file-based system to a robust relational database capable of supporting RAG functionality. The migration must ensure zero data loss while establishing the schema foundation for advanced querying, vector operations, and content chunking.

## Business Context

### Why This Migration Matters
- **RAG Foundation:** Enables complex queries and relationships required for retrieval-augmented generation
- **Scalability:** Supports growing content volumes and user bases
- **Performance:** Advanced indexing and query optimization capabilities
- **Reliability:** ACID compliance and transaction safety
- **Future-Proofing:** Establishes architecture for AI-powered features

### Business Impact
- **Zero Downtime:** Migration occurs without service interruption
- **Data Integrity:** 100% data preservation with validation
- **Performance Gains:** Improved query performance for content operations
- **Feature Enablement:** Unlocks all RAG and advanced content features

## Technical Context

### Migration Scope & Complexity

#### Source System Analysis
**Current SQLite Schema:**
- Simple file-based database (database.db)
- Two main tables: feeds, feed_items
- Basic relationships with foreign keys
- Limited indexing and query capabilities
- No advanced data types or constraints

#### Target System Requirements
**New PostgreSQL Schema:**
- UUID primary keys for global uniqueness
- Advanced indexing (GIN, B-tree, partial indexes)
- JSONB support for flexible metadata storage
- Full-text search capabilities
- Connection pooling and advanced querying
- Support for content chunks and vector relationships

### Migration Strategy

#### Approach: Phased Migration with Validation
1. **Analysis Phase:** Schema and data profiling
2. **Preparation Phase:** Backup creation and validation scripts
3. **Migration Phase:** Transaction-based data transfer
4. **Validation Phase:** Integrity checks and consistency validation
5. **Optimization Phase:** Index creation and performance tuning

#### Safety Measures
- **Transaction Boundaries:** All operations within database transactions
- **Rollback Capability:** Complete reversal procedures
- **Data Validation:** Multiple integrity checks at each phase
- **Progress Tracking:** Detailed logging and monitoring
- **Error Recovery:** Comprehensive error handling and recovery

## Implementation Guidance

### Phase 1: Pre-Migration Analysis (Day 1-2)

#### 1.1 Environment Setup & Validation
```typescript
// scripts/validate-migration-environment.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface EnvironmentCheck {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

async function validateMigrationEnvironment(): Promise<EnvironmentCheck[]> {
  const checks: EnvironmentCheck[] = [];

  // Check source database
  const sqlitePath = './data/database.db';
  if (fs.existsSync(sqlitePath)) {
    const stats = fs.statSync(sqlitePath);
    checks.push({
      component: 'SQLite Database',
      status: 'ok',
      message: `Found database file (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      details: { size: stats.size, modified: stats.mtime }
    });
  } else {
    checks.push({
      component: 'SQLite Database',
      status: 'error',
      message: 'Source database file not found'
    });
  }

  // Check target database connectivity
  try {
    execSync('docker-compose -f docker-compose.infrastructure.yml ps postgres --format json', {
      stdio: 'pipe'
    });

    // Test PostgreSQL connection
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    checks.push({
      component: 'PostgreSQL Connection',
      status: 'ok',
      message: 'Successfully connected to PostgreSQL'
    });
  } catch (error) {
    checks.push({
      component: 'PostgreSQL Connection',
      status: 'error',
      message: 'Cannot connect to PostgreSQL',
      details: error.message
    });
  }

  // Check Qdrant connectivity (for future vector operations)
  try {
    const response = await fetch(`${process.env.QDRANT_URL}/health`);
    if (response.ok) {
      checks.push({
        component: 'Qdrant Connection',
        status: 'ok',
        message: 'Qdrant is accessible'
      });
    } else {
      checks.push({
        component: 'Qdrant Connection',
        status: 'warning',
        message: 'Qdrant health check failed'
      });
    }
  } catch (error) {
    checks.push({
      component: 'Qdrant Connection',
      status: 'warning',
      message: 'Qdrant not accessible (optional for migration)'
    });
  }

  // Check available disk space
  try {
    const diskUsage = execSync('df -h . | tail -1', { encoding: 'utf8' });
    const availableSpace = diskUsage.split(/\s+/)[3];
    checks.push({
      component: 'Disk Space',
      status: availableSpace.includes('G') ? 'ok' : 'warning',
      message: `Available disk space: ${availableSpace}`,
      details: { available: availableSpace }
    });
  } catch (error) {
    checks.push({
      component: 'Disk Space',
      status: 'warning',
      message: 'Could not check disk space'
    });
  }

  return checks;
}

async function runEnvironmentValidation() {
  console.log('🔍 Validating migration environment...\n');

  const checks = await validateMigrationEnvironment();

  checks.forEach(check => {
    const icon = check.status === 'ok' ? '✅' :
                 check.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${check.component}: ${check.message}`);
    if (check.details) {
      console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
    }
  });

  const errors = checks.filter(c => c.status === 'error').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  console.log(`\n📊 Validation Summary:`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Warnings: ${warnings}`);
  console.log(`   OK: ${checks.length - errors - warnings}`);

  if (errors > 0) {
    console.log('\n❌ Environment validation failed. Fix errors before proceeding.');
    process.exit(1);
  }

  if (warnings > 0) {
    console.log('\n⚠️  Warnings detected. Review before proceeding.');
  }

  console.log('\n✅ Environment ready for migration.');

  // Save validation results
  fs.writeFileSync('migration-environment-check.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    checks
  }, null, 2));
}

runEnvironmentValidation().catch(console.error);
```

#### 1.2 Schema Analysis & Mapping
```typescript
// scripts/analyze-schema-differences.ts
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

interface SchemaDifference {
  table: string;
  column: string;
  sqliteType: string;
  postgresType: string;
  nullable: boolean;
  needsTransform: boolean;
  transformLogic?: string;
}

async function analyzeSchemaDifferences(): Promise<SchemaDifference[]> {
  const differences: SchemaDifference[] = [];

  // Analyze SQLite schema
  const sqlite = new Database('./data/database.db', { readonly: true });

  const sqliteTables = sqlite.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];

  for (const table of sqliteTables) {
    const columns = sqlite.prepare(`PRAGMA table_info(${table.name})`).all() as any[];

    for (const col of columns) {
      const pgType = mapSQLiteToPostgresType(col.type);
      const needsTransform = col.type !== pgType ||
                           (col.pk === 1 && table.name !== 'feeds'); // UUID transform needed

      differences.push({
        table: table.name,
        column: col.name,
        sqliteType: col.type,
        postgresType: pgType,
        nullable: col.notnull === 0,
        needsTransform,
        transformLogic: needsTransform ? getTransformLogic(col, table.name) : undefined
      });
    }
  }

  sqlite.close();
  return differences;
}

function mapSQLiteToPostgresType(sqliteType: string): string {
  const typeMap: { [key: string]: string } = {
    'INTEGER': 'INTEGER',
    'TEXT': 'TEXT',
    'REAL': 'DOUBLE PRECISION',
    'BLOB': 'BYTEA',
    'DATETIME': 'TIMESTAMPTZ'
  };

  return typeMap[sqliteType.toUpperCase()] || 'TEXT';
}

function getTransformLogic(column: any, tableName: string): string {
  if (column.pk === 1) {
    return `generateUUID(${column.name}) // Convert INTEGER PK to UUID`;
  }

  if (column.type.toUpperCase() === 'DATETIME') {
    return `new Date(${column.name}) // Convert string to Date object`;
  }

  return 'Direct mapping';
}

async function generateMigrationPlan() {
  console.log('🔍 Analyzing schema differences...\n');

  const differences = await analyzeSchemaDifferences();

  console.log('📊 Schema Differences Found:');
  differences.forEach(diff => {
    const transform = diff.needsTransform ? ' (needs transform)' : '';
    console.log(`  ${diff.table}.${diff.column}: ${diff.sqliteType} → ${diff.postgresType}${transform}`);
    if (diff.transformLogic) {
      console.log(`    Transform: ${diff.transformLogic}`);
    }
  });

  const transformsNeeded = differences.filter(d => d.needsTransform).length;
  console.log(`\n📈 Summary:`);
  console.log(`   Total columns: ${differences.length}`);
  console.log(`   Need transformation: ${transformsNeeded}`);
  console.log(`   Direct mappings: ${differences.length - transformsNeeded}`);

  // Save analysis
  fs.writeFileSync('schema-analysis.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    differences,
    summary: {
      totalColumns: differences.length,
      transformsNeeded,
      directMappings: differences.length - transformsNeeded
    }
  }, null, 2));

  console.log('\n📄 Analysis saved to schema-analysis.json');
}

generateMigrationPlan().catch(console.error);
```

### Phase 2: Migration Execution (Day 3-5)

#### 2.1 Migration Orchestrator
```typescript
// scripts/migration-orchestrator.ts
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationProgress {
  phase: string;
  completed: number;
  total: number;
  percentage: number;
  timestamp: Date;
}

interface MigrationResult {
  success: boolean;
  duration: number;
  recordsMigrated: {
    feeds: number;
    feedItems: number;
    total: number;
  };
  errors: string[];
  warnings: string[];
  rollbackAvailable: boolean;
}

class MigrationOrchestrator {
  private sqlite: Database;
  private prisma: PrismaClient;
  private progressCallback?: (progress: MigrationProgress) => void;
  private abortController: AbortController;

  constructor(sqlitePath: string) {
    this.sqlite = new Database(sqlitePath, { readonly: true });
    this.prisma = new PrismaClient();
    this.abortController = new AbortController();
  }

  onProgress(callback: (progress: MigrationProgress) => void) {
    this.progressCallback = callback;
  }

  abort() {
    this.abortController.abort();
  }

  private reportProgress(phase: string, completed: number, total: number) {
    const progress: MigrationProgress = {
      phase,
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      timestamp: new Date()
    };

    console.log(`[${progress.timestamp.toISOString()}] ${phase}: ${progress.percentage}% (${completed}/${total})`);

    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private generateUUID(sqliteId: number): string {
    // Create deterministic UUID from SQLite INTEGER PK
    const hash = createHash('md5').update(sqliteId.toString()).digest('hex');
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  }

  private validateFeedItem(item: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!item.feed_id) {
      errors.push(`Missing feed_id for item ${item.id}`);
    }

    if (!item.title && !item.content) {
      errors.push(`Missing both title and content for item ${item.id}`);
    }

    if (item.published_at && isNaN(Date.parse(item.published_at))) {
      errors.push(`Invalid published_at date for item ${item.id}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async createBackup(): Promise<string> {
    console.log('💾 Creating pre-migration backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join('backups', `pre-migration-${timestamp}`);

    // Ensure backup directory exists
    fs.mkdirSync(backupDir, { recursive: true });

    // Copy SQLite database
    const sqliteBackup = path.join(backupDir, 'database.db');
    fs.copyFileSync('./data/database.db', sqliteBackup);

    // Export PostgreSQL schema (if exists)
    try {
      const schemaExport = path.join(backupDir, 'postgres-schema.sql');
      // pg_dump schema only
      const { execSync } = require('child_process');
      execSync(`pg_dump --schema-only --no-owner --clean ${process.env.DATABASE_URL} > ${schemaExport}`);
    } catch (error) {
      console.warn('Could not backup PostgreSQL schema:', error.message);
    }

    console.log(`✅ Backup created: ${backupDir}`);
    return backupDir;
  }

  async migrateFeeds(): Promise<number> {
    console.log('🔄 Migrating feeds...');

    const feeds = this.sqlite.prepare('SELECT * FROM feeds').all() as any[];
    let migrated = 0;

    for (let i = 0; i < feeds.length; i++) {
      if (this.abortController.signal.aborted) {
        throw new Error('Migration aborted');
      }

      const feed = feeds[i];

      try {
        await this.prisma.feed.create({
          data: {
            id: this.generateUUID(feed.id),
            url: feed.url,
            title: feed.title || null,
            description: feed.description || null,
            lastFetched: feed.last_fetched ? new Date(feed.last_fetched) : null,
            createdAt: new Date(feed.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        migrated++;
      } catch (error) {
        throw new Error(`Failed to migrate feed ${feed.id}: ${error.message}`);
      }

      this.reportProgress('Migrating feeds', i + 1, feeds.length);
    }

    console.log(`✅ Migrated ${migrated} feeds`);
    return migrated;
  }

  async migrateFeedItems(): Promise<number> {
    console.log('🔄 Migrating feed items...');

    const feedItems = this.sqlite.prepare('SELECT * FROM feed_items').all() as any[];
    let migrated = 0;
    const errors: string[] = [];

    for (let i = 0; i < feedItems.length; i++) {
      if (this.abortController.signal.aborted) {
        throw new Error('Migration aborted');
      }

      const item = feedItems[i];
      const validation = this.validateFeedItem(item);

      if (!validation.valid) {
        errors.push(...validation.errors.map(err => `Item ${item.id}: ${err}`));
        continue; // Skip invalid items
      }

      try {
        await this.prisma.feedItem.create({
          data: {
            id: this.generateUUID(item.id),
            feedId: this.generateUUID(item.feed_id),
            title: item.title || null,
            content: item.content || null,
            url: item.url || null,
            publishedAt: item.published_at ? new Date(item.published_at) : null,
            createdAt: new Date(item.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        migrated++;
      } catch (error) {
        errors.push(`Failed to migrate feed item ${item.id}: ${error.message}`);
      }

      this.reportProgress('Migrating feed items', i + 1, feedItems.length);
    }

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} items had validation errors and were skipped`);
      // Save errors for review
      fs.writeFileSync('migration-errors.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        errors
      }, null, 2));
    }

    console.log(`✅ Migrated ${migrated} feed items`);
    return migrated;
  }

  async validateMigration(): Promise<{ valid: boolean; issues: string[] }> {
    console.log('🔍 Validating migration...');

    const issues: string[] = [];

    // Check record counts
    const sqliteFeeds = this.sqlite.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
    const postgresFeeds = await this.prisma.feed.count();

    const sqliteItems = this.sqlite.prepare('SELECT COUNT(*) as count FROM feed_items').get().count;
    const postgresItems = await this.prisma.feedItem.count();

    if (sqliteFeeds !== postgresFeeds) {
      issues.push(`Feed count mismatch: SQLite ${sqliteFeeds}, PostgreSQL ${postgresFeeds}`);
    }

    if (sqliteItems !== postgresItems) {
      issues.push(`Feed item count mismatch: SQLite ${sqliteItems}, PostgreSQL ${postgresItems}`);
    }

    // Check referential integrity
    const orphanedItems = await this.prisma.feedItem.findMany({
      where: {
        feed: null
      }
    });

    if (orphanedItems.length > 0) {
      issues.push(`${orphanedItems.length} feed items have no corresponding feed`);
    }

    // Check data integrity (sample validation)
    const sampleItems = await this.prisma.feedItem.findMany({ take: 10 });
    for (const item of sampleItems) {
      if (!item.title && !item.content) {
        issues.push(`Feed item ${item.id} has neither title nor content`);
      }
    }

    const valid = issues.length === 0;

    console.log(`📊 Validation ${valid ? 'passed' : 'failed'}`);
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    return { valid, issues };
  }

  async runMigration(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      duration: 0,
      recordsMigrated: { feeds: 0, feedItems: 0, total: 0 },
      errors: [],
      warnings: [],
      rollbackAvailable: false
    };

    try {
      console.log('🚀 Starting database migration...');
      console.log(`Start time: ${new Date().toISOString()}`);

      // Phase 1: Backup
      await this.createBackup();
      result.rollbackAvailable = true;

      // Phase 2: Migration (in transaction)
      await this.prisma.$transaction(async () => {
        result.recordsMigrated.feeds = await this.migrateFeeds();
        result.recordsMigrated.feedItems = await this.migrateFeedItems();
      });

      result.recordsMigrated.total = result.recordsMigrated.feeds + result.recordsMigrated.feedItems;

      // Phase 3: Validation
      const validation = await this.validateMigration();

      if (!validation.valid) {
        result.warnings.push(...validation.issues);
        console.warn('⚠️  Validation found issues, but migration completed');
      }

      result.success = true;
      console.log('🎉 Migration completed successfully!');

    } catch (error) {
      result.errors.push(error.message);
      console.error('💥 Migration failed:', error.message);

      // Attempt cleanup if partial migration occurred
      if (result.recordsMigrated.total > 0) {
        console.log('🧹 Attempting cleanup of partial migration...');
        try {
          await this.prisma.feedItem.deleteMany();
          await this.prisma.feed.deleteMany();
          console.log('✅ Partial migration cleaned up');
        } catch (cleanupError) {
          result.errors.push(`Cleanup failed: ${cleanupError.message}`);
        }
      }
    } finally {
      result.duration = Date.now() - startTime;

      // Save migration report
      fs.writeFileSync('migration-result.json', JSON.stringify({
        ...result,
        timestamp: new Date().toISOString(),
        duration: `${Math.round(result.duration / 1000)}s`
      }, null, 2));

      // Cleanup
      this.sqlite.close();
      await this.prisma.$disconnect();
    }

    return result;
  }
}

// CLI interface
async function main() {
  const sqlitePath = process.argv[2] || './data/database.db';

  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database not found: ${sqlitePath}`);
    process.exit(1);
  }

  const orchestrator = new MigrationOrchestrator(sqlitePath);

  // Setup progress reporting
  orchestrator.onProgress((progress) => {
    // Could integrate with progress bars or UI here
  });

  // Handle abort signals
  process.on('SIGINT', () => {
    console.log('\n🛑 Migration abort requested...');
    orchestrator.abort();
  });

  const result = await orchestrator.runMigration();

  console.log('\n📊 Migration Summary:');
  console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
  console.log(`Records migrated: ${result.recordsMigrated.total}`);
  console.log(`Success: ${result.success ? '✅' : '❌'}`);

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);
```

#### 2.2 Post-Migration Optimization
```typescript
// scripts/optimize-postgres-schema.ts
import { PrismaClient } from '@prisma/client';

async function optimizePostgresSchema() {
  const prisma = new PrismaClient();

  try {
    console.log('⚡ Optimizing PostgreSQL schema...');

    // Create performance indexes
    console.log('Creating indexes...');

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_feed_id
      ON feed_items(feed_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_published_at
      ON feed_items(published_at DESC);
    `;

    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feeds_url
      ON feeds(url);
    `;

    // Analyze tables for query optimization
    console.log('Analyzing table statistics...');

    await prisma.$executeRaw`ANALYZE feed_items;`;
    await prisma.$executeRaw`ANALYZE feeds;`;

    // Create partial indexes for common queries
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_items_recent
      ON feed_items(published_at DESC)
      WHERE published_at > NOW() - INTERVAL '30 days';
    `;

    console.log('✅ Schema optimization completed');

    // Report on optimization results
    const indexStats = await prisma.$queryRaw`
      SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    console.log('📊 Index Statistics:');
    console.log(indexStats);

  } catch (error) {
    console.error('❌ Schema optimization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

optimizePostgresSchema().catch(console.error);
```

### Phase 3: Testing & Validation (Day 6-7)

#### 3.1 Comprehensive Migration Testing
```typescript
// scripts/test-migration-comprehensive.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import * as fs from 'fs';

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  test: () => Promise<{ passed: boolean; details?: string; error?: string }>;
}

async function runComprehensiveTests(): Promise<void> {
  const prisma = new PrismaClient();
  const sqlite = new Database('./data/database.db', { readonly: true });

  const testSuites: TestSuite[] = [
    {
      name: 'Data Integrity',
      tests: [
        {
          name: 'Record count validation',
          test: async () => {
            const sqliteFeeds = sqlite.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
            const postgresFeeds = await prisma.feed.count();

            const passed = sqliteFeeds === postgresFeeds;
            return {
              passed,
              details: `Feeds: SQLite ${sqliteFeeds}, PostgreSQL ${postgresFeeds}`
            };
          }
        },
        {
          name: 'Referential integrity',
          test: async () => {
            const orphanedItems = await prisma.feedItem.count({
              where: { feed: null }
            });

            return {
              passed: orphanedItems === 0,
              details: `Orphaned items: ${orphanedItems}`
            };
          }
        }
      ]
    },
    {
      name: 'Data Consistency',
      tests: [
        {
          name: 'Feed URL uniqueness',
          test: async () => {
            const duplicateUrls = await prisma.$queryRaw`
              SELECT url, COUNT(*) as count
              FROM feeds
              GROUP BY url
              HAVING COUNT(*) > 1
            ` as any[];

            return {
              passed: duplicateUrls.length === 0,
              details: `Duplicate URLs found: ${duplicateUrls.length}`
            };
          }
        },
        {
          name: 'Date field validation',
          test: async () => {
            const invalidDates = await prisma.feedItem.count({
              where: {
                OR: [
                  { publishedAt: { equals: new Date('1970-01-01') } },
                  { createdAt: { equals: new Date('1970-01-01') } }
                ]
              }
            });

            return {
              passed: invalidDates === 0,
              details: `Invalid dates found: ${invalidDates}`
            };
          }
        }
      ]
    },
    {
      name: 'Performance',
      tests: [
        {
          name: 'Query performance baseline',
          test: async () => {
            const startTime = Date.now();

            // Test common queries
            await prisma.feedItem.findMany({
              take: 100,
              include: { feed: true },
              orderBy: { publishedAt: 'desc' }
            });

            const duration = Date.now() - startTime;

            return {
              passed: duration < 5000, // 5 seconds max
              details: `Query took ${duration}ms`
            };
          }
        }
      ]
    }
  ];

  console.log('🧪 Running comprehensive migration tests...\n');

  const results = [];

  for (const suite of testSuites) {
    console.log(`\n📋 ${suite.name}`);

    for (const testCase of suite.tests) {
      try {
        const result = await testCase.test();
        const icon = result.passed ? '✅' : '❌';

        console.log(`  ${icon} ${testCase.name}`);
        if (result.details) console.log(`     ${result.details}`);
        if (result.error) console.log(`     Error: ${result.error}`);

        results.push({
          suite: suite.name,
          test: testCase.name,
          ...result
        });

      } catch (error) {
        console.log(`  ❌ ${testCase.name}`);
        console.log(`     Error: ${error.message}`);

        results.push({
          suite: suite.name,
          test: testCase.name,
          passed: false,
          error: error.message
        });
      }
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\n📊 Test Summary: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review results above.');
  }

  // Save detailed results
  fs.writeFileSync('comprehensive-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: { passed, total, success: passed === total }
  }, null, 2));

  sqlite.close();
  await prisma.$disconnect();

  if (passed !== total) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(console.error);
```

## Development Workflow

### Daily Development Rhythm
1. **Morning:** Check migration progress and resolve blockers
2. **Development:** Implement migration components and testing
3. **Testing:** Run validation scripts and fix issues
4. **Review:** Code review and optimization
5. **Documentation:** Update procedures and troubleshooting guides

### Quality Gates
- **Code Review:** All migration scripts reviewed by senior developer
- **Testing:** 100% test coverage for migration logic
- **Performance:** Migration completes within time limits
- **Validation:** Zero data loss with integrity checks
- **Documentation:** Complete runbooks and rollback procedures

### Monitoring & Alerting
- **Progress Tracking:** Real-time migration progress reporting
- **Error Monitoring:** Immediate alerts for migration failures
- **Performance Monitoring:** Resource usage and timing metrics
- **Data Validation:** Continuous integrity checking

## Success Criteria Validation

### Functional Validation
- [ ] Migration script executes without critical errors
- [ ] All data successfully migrated to PostgreSQL
- [ ] Foreign key relationships preserved and functional
- [ ] UUID generation creates unique, deterministic identifiers
- [ ] Date/time fields properly converted and validated

### Performance Validation
- [ ] Migration completes within 30 minutes for typical datasets
- [ ] Query performance improved over SQLite baseline
- [ ] Index creation doesn't impact production operations
- [ ] Memory usage stays within container limits

### Quality Validation
- [ ] Data integrity checks pass for all migrated records
- [ ] Transaction rollback works correctly
- [ ] Error handling covers all identified edge cases
- [ ] Migration scripts are idempotent and safe to rerun

## Risk Mitigation

### Technical Risks
1. **Data Corruption:** Comprehensive validation and backup procedures
2. **Performance Degradation:** Benchmarking and optimization before production
3. **Schema Incompatibilities:** Thorough analysis and transformation logic
4. **Memory Issues:** Streaming processing for large datasets

### Operational Risks
1. **Downtime Requirements:** Zero-downtime migration design
2. **Rollback Complexity:** Tested and documented rollback procedures
3. **Team Coordination:** Clear communication and status updates
4. **Resource Constraints:** Capacity planning and monitoring

### Contingency Plans
- **Migration Failure:** Complete rollback to SQLite with data restoration
- **Partial Migration:** Cleanup scripts to remove incomplete data
- **Performance Issues:** Query optimization and index tuning
- **Data Issues:** Validation scripts and manual data correction procedures

## Definition of Done

### Code Quality
- [ ] Migration orchestrator implements comprehensive error handling
- [ ] All scripts include detailed logging and progress reporting
- [ ] Code follows TypeScript best practices and is fully typed
- [ ] Unit tests cover all transformation and validation logic

### Testing Quality
- [ ] Integration tests validate end-to-end migration process
- [ ] Performance tests ensure migration completes within time limits
- [ ] Data integrity tests validate all transformations
- [ ] Edge case testing covers unusual data scenarios

### Documentation Quality
- [ ] Migration runbook includes step-by-step procedures
- [ ] Troubleshooting guide covers common issues
- [ ] Rollback procedures are clearly documented
- [ ] Performance benchmarks and expectations are recorded

### Operational Readiness
- [ ] Migration scripts are packaged for deployment
- [ ] Monitoring and alerting are configured
- [ ] Support team is trained on procedures
- [ ] Success criteria are measurable and validated

This context provides the complete technical foundation for executing the database schema migration, ensuring a smooth transition from SQLite to PostgreSQL while maintaining data integrity and system reliability.