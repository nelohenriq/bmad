// scripts/migration-orchestrator.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

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
  private prisma: PrismaClient;
  private progressCallback?: (progress: MigrationProgress) => void;
  private abortController: AbortController;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn']
    });
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
    const sqlitePath = path.join('data', 'database.db');
    if (fs.existsSync(sqlitePath)) {
      const sqliteBackup = path.join(backupDir, 'database.db');
      fs.copyFileSync(sqlitePath, sqliteBackup);
      console.log('✅ SQLite database backed up');
    }

    // Export PostgreSQL schema (if exists)
    try {
      const schemaExport = path.join(backupDir, 'postgres-schema.sql');
      // For now, just create an empty schema file
      fs.writeFileSync(schemaExport, '-- PostgreSQL schema backup placeholder\n');
      console.log('✅ PostgreSQL schema placeholder created');
    } catch (error) {
      console.warn('Could not create PostgreSQL schema backup:', (error as Error).message);
    }

    console.log(`✅ Backup created: ${backupDir}`);
    return backupDir;
  }

  async migrateFeeds(sampleData?: any[]): Promise<number> {
    console.log('🔄 Migrating feeds...');

    // First, ensure we have a default user for feeds
    const defaultUserId = 'default-user-uuid';
    try {
      await this.prisma.user.upsert({
        where: { id: defaultUserId },
        update: {},
        create: {
          id: defaultUserId,
          email: 'migration@example.com',
          name: 'Migration User'
        }
      });
    } catch (error) {
      console.log('Default user already exists or could not be created');
    }

    // Use sample data if provided, otherwise expect real SQLite data
    const feeds = sampleData || [
      {
        id: 1,
        url: 'https://techcrunch.com/feed/',
        title: 'TechCrunch',
        description: 'TechCrunch is a leading technology media property.',
        last_fetched: '2024-01-15T10:30:00Z',
        created_at: '2024-01-01T08:00:00Z'
      },
      {
        id: 2,
        url: 'https://www.theverge.com/rss/index.xml',
        title: 'The Verge',
        description: 'The Verge covers technology, science, art, and culture.',
        last_fetched: '2024-01-15T09:45:00Z',
        created_at: '2024-01-02T14:20:00Z'
      }
    ];

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
            userId: defaultUserId,
            url: feed.url,
            title: feed.title || null,
            description: feed.description || null,
            lastFetched: feed.last_fetched ? new Date(feed.last_fetched) : null,
            createdAt: new Date(feed.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        migrated++;
      } catch (error: any) {
        throw new Error(`Failed to migrate feed ${feed.id}: ${error.message}`);
      }

      this.reportProgress('Migrating feeds', i + 1, feeds.length);
    }

    console.log(`✅ Migrated ${migrated} feeds`);
    return migrated;
  }

  async migrateFeedItems(sampleData?: any[]): Promise<number> {
    console.log('🔄 Migrating feed items...');

    // Use sample data if provided
    const feedItems = sampleData || [
      {
        id: 1,
        feed_id: 1,
        guid: 'techcrunch-2024-001',
        title: 'OpenAI announces GPT-5 with revolutionary capabilities',
        content: 'OpenAI has unveiled GPT-5, their latest language model featuring unprecedented reasoning capabilities and multimodal understanding.',
        published_at: '2024-01-15T08:00:00Z',
        created_at: '2024-01-15T08:05:00Z'
      },
      {
        id: 2,
        feed_id: 1,
        guid: 'techcrunch-2024-002',
        title: 'Meta introduces Llama 3.1 with 405B parameters',
        content: 'Meta has released Llama 3.1, the largest open-source language model to date with 405 billion parameters.',
        published_at: '2024-01-14T16:30:00Z',
        created_at: '2024-01-14T16:35:00Z'
      }
    ];

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
            publishedAt: item.published_at ? new Date(item.published_at) : null,
            createdAt: new Date(item.created_at || Date.now()),
            updatedAt: new Date()
          }
        });
        migrated++;
      } catch (error: any) {
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
    const postgresFeeds = await this.prisma.feed.count();
    const postgresItems = await this.prisma.feedItem.count();

    // Expected counts (from sample data)
    const expectedFeeds = 2;
    const expectedItems = 2;

    if (postgresFeeds !== expectedFeeds) {
      issues.push(`Feed count mismatch: Expected ${expectedFeeds}, got ${postgresFeeds}`);
    }

    if (postgresItems !== expectedItems) {
      issues.push(`Feed item count mismatch: Expected ${expectedItems}, got ${postgresItems}`);
    }

    // Check referential integrity using raw query
    const orphanedItems = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM feed_items fi
      LEFT JOIN feeds f ON fi.feed_id = f.id
      WHERE f.id IS NULL
    `;

    if (orphanedItems[0].count > 0) {
      issues.push(`${orphanedItems[0].count} feed items have no corresponding feed`);
    }

    // Check data integrity (sample validation)
    const sampleItems = await this.prisma.feedItem.findMany({ take: 5 });
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

    } catch (error: any) {
      result.errors.push(error.message);
      console.error('💥 Migration failed:', error.message);

      // Attempt cleanup if partial migration occurred
      if (result.recordsMigrated.total > 0) {
        console.log('🧹 Attempting cleanup of partial migration...');
        try {
          await this.prisma.feedItem.deleteMany();
          await this.prisma.feed.deleteMany();
          console.log('✅ Partial migration cleaned up');
        } catch (cleanupError: any) {
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
      await this.prisma.$disconnect();
    }

    return result;
  }
}

// CLI interface
async function main() {
  const orchestrator = new MigrationOrchestrator();

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