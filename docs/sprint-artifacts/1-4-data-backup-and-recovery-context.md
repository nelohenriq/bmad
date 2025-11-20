# Story Context: 1-4 Data Backup and Recovery

## Overview

**Story:** 1-4 Data Backup and Recovery
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Status:** Drafted → Ready for Development
**Estimated Effort:** 5 story points (3-4 days)

## Story Summary

This story implements comprehensive backup and disaster recovery capabilities for the Neural Feed Studio RAG system. It establishes automated backup procedures for both PostgreSQL relational data and Qdrant vector data, along with recovery procedures that ensure business continuity with defined RTO (Recovery Time Objective) and RPO (Recovery Point Objective) targets. The implementation provides the safety net needed for production operations while maintaining system performance.

## Business Context

### Why Backup and Recovery Matters
- **Data Durability:** Protects against data loss from system failures, human error, or disasters
- **Business Continuity:** Ensures the RAG system remains operational for content generation
- **Regulatory Compliance:** Provides audit trails and data protection capabilities
- **User Trust:** Guarantees that AI-powered features remain reliable and available
- **Cost Protection:** Prevents expensive data reconstruction or system rebuilds

### Business Impact
- **Zero Downtime Recovery:** RTO of 4 hours maximum system unavailability
- **Minimal Data Loss:** RPO of 1 hour maximum data loss in worst-case scenarios
- **Automated Operations:** Reduces manual intervention and human error
- **Performance Preservation:** Backups don't impact production system performance
- **Scalable Solution:** Grows with data volume and system complexity

## Technical Context

### Backup Architecture Overview

#### Multi-Layer Backup Strategy
**PostgreSQL Backups:**
- Logical backups using pg_dump for portability and flexibility
- Continuous WAL archiving for point-in-time recovery
- Compressed and encrypted storage for security and efficiency
- Automated integrity validation and alerting

**Qdrant Backups:**
- Collection snapshots for consistent point-in-time captures
- API-based operations for programmatic control
- Incremental backup support for large vector datasets
- Metadata preservation alongside vector data

**Application Data:**
- Configuration backups for system state
- Environment-specific settings and secrets
- Operational logs and audit trails
- Performance metrics and monitoring data

### Recovery Objectives

#### RTO/RPO Targets
- **Recovery Time Objective (RTO):** 4 hours maximum system downtime
- **Recovery Point Objective (RPO):** 1 hour maximum data loss
- **Recovery Methods:** Automated scripts with manual override capabilities
- **Testing Frequency:** Quarterly disaster recovery drills

#### Recovery Scenarios
- **Data Corruption:** Point-in-time recovery to last known good state
- **System Failure:** Full infrastructure rebuild with data restoration
- **Human Error:** Selective data restoration with minimal impact
- **Disaster Events:** Cross-region or cross-cloud recovery procedures

## Implementation Guidance

### Phase 1: PostgreSQL Backup Infrastructure (Day 1-2)

#### 1.1 Core Backup Manager Implementation
```typescript
// src/lib/backup/core/postgres-backup-manager.ts
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

export interface PostgresBackupConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  outputDir: string;
  compression: {
    enabled: boolean;
    level: number; // 1-9
  };
  encryption: {
    enabled: boolean;
    key?: string;
    algorithm: 'aes-256-cbc' | 'aes-256-gcm';
  };
  retention: {
    days: number;
    maxBackups: number;
  };
  walArchiving: {
    enabled: boolean;
    archiveDir: string;
  };
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  database: string;
  size: number;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
  duration: number;
  success: boolean;
  error?: string;
}

export class PostgresBackupManager extends EventEmitter {
  private config: PostgresBackupConfig;
  private activeBackups: Map<string, { abort: () => void }> = new Map();

  constructor(config: PostgresBackupConfig) {
    super();
    this.config = config;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.config.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    if (this.config.walArchiving.enabled && !fs.existsSync(this.config.walArchiving.archiveDir)) {
      fs.mkdirSync(this.config.walArchiving.archiveDir, { recursive: true });
    }
  }

  async createFullBackup(options: { priority?: 'low' | 'normal' | 'high' } = {}): Promise<BackupMetadata> {
    const backupId = `pg-full-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.emit('backupStarted', { backupId, type: 'full', timestamp: new Date() });

    // Create abort controller for this backup
    const abortController = new AbortController();
    this.activeBackups.set(backupId, { abort: () => abortController.abort() });

    try {
      // Set lower priority if requested to reduce production impact
      if (options.priority === 'low') {
        await this.setBackupPriority('low');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `postgres-backup-${timestamp}`;
      const sqlFilename = `${baseFilename}.sql`;
      const sqlPath = path.join(this.config.outputDir, sqlFilename);

      // Create the backup using pg_dump
      const dumpArgs = this.buildDumpArguments(sqlPath);
      await this.executeDump(dumpArgs, abortController.signal);

      // Process the backup file (compression, encryption)
      let finalPath = sqlPath;
      const processingSteps: string[] = [];

      if (this.config.compression.enabled) {
        finalPath = await this.compressBackup(finalPath);
        processingSteps.push('compressed');
      }

      if (this.config.encryption.enabled) {
        finalPath = await this.encryptBackup(finalPath);
        processingSteps.push('encrypted');
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);
      const stats = fs.statSync(finalPath);

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        database: this.config.database,
        size: stats.size,
        checksum,
        compressed: this.config.compression.enabled,
        encrypted: this.config.encryption.enabled,
        duration: Date.now() - startTime,
        success: true
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      // Cleanup old backups
      await this.cleanupOldBackups();

      this.emit('backupCompleted', { backupId, metadata, processingSteps });

      return metadata;

    } catch (error) {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        database: this.config.database,
        size: 0,
        checksum: '',
        compressed: false,
        encrypted: false,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      };

      this.emit('backupFailed', { backupId, error: error.message, metadata });

      // Cleanup failed backup files
      await this.cleanupFailedBackup(backupId);

      throw error;

    } finally {
      this.activeBackups.delete(backupId);

      // Reset priority if it was changed
      if (options.priority === 'low') {
        await this.resetBackupPriority();
      }
    }
  }

  async restoreBackup(
    backupPath: string,
    options: {
      targetDatabase?: string;
      clean?: boolean;
      create?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();
    const restoreId = `restore-${Date.now()}`;

    this.emit('restoreStarted', { restoreId, backupPath, options });

    try {
      // Validate backup file
      await this.validateBackupFile(backupPath);

      // Prepare the backup file (decompress, decrypt)
      let restorePath = backupPath;
      const processingSteps: string[] = [];

      if (backupPath.endsWith('.gz')) {
        restorePath = await this.decompressBackup(backupPath);
        processingSteps.push('decompressed');
      }

      if (backupPath.includes('.enc.') || backupPath.endsWith('.enc')) {
        restorePath = await this.decryptBackup(restorePath);
        processingSteps.push('decrypted');
      }

      // Build restore arguments
      const restoreArgs = this.buildRestoreArguments(restorePath, options);

      if (options.dryRun) {
        console.log(`[DRY RUN] Would execute: pg_restore ${restoreArgs.join(' ')}`);
        return { success: true, duration: Date.now() - startTime };
      }

      // Execute restore
      await this.executeRestore(restoreArgs);

      // Verify restore if possible
      if (options.targetDatabase) {
        await this.verifyRestore(options.targetDatabase);
      }

      this.emit('restoreCompleted', {
        restoreId,
        backupPath,
        duration: Date.now() - startTime,
        processingSteps
      });

      return { success: true, duration: Date.now() - startTime };

    } catch (error) {
      this.emit('restoreFailed', {
        restoreId,
        backupPath,
        error: error.message,
        duration: Date.now() - startTime
      });

      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    const metadataFiles = fs.readdirSync(this.config.outputDir)
      .filter(file => file.endsWith('.metadata.json'))
      .map(file => path.join(this.config.outputDir, file));

    const backups: BackupMetadata[] = [];

    for (const metadataFile of metadataFiles) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        backups.push({
          ...metadata,
          timestamp: new Date(metadata.timestamp)
        });
      } catch (error) {
        console.warn(`Failed to read metadata file ${metadataFile}:`, error.message);
      }
    }

    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async verifyBackupIntegrity(backupPath: string): Promise<boolean> {
    try {
      // Check file exists and is readable
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file does not exist: ${backupPath}`);
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error(`Backup file is empty: ${backupPath}`);
      }

      // Try to read the file (basic integrity check)
      const fileHandle = fs.openSync(backupPath, 'r');
      const buffer = Buffer.alloc(1024);
      fs.readSync(fileHandle, buffer, 0, 1024, 0);
      fs.closeSync(fileHandle);

      // For SQL files, check for basic PostgreSQL dump structure
      if (backupPath.endsWith('.sql') || backupPath.includes('.sql.')) {
        const content = buffer.toString('utf8');
        if (!content.includes('PostgreSQL database dump')) {
          throw new Error('Invalid PostgreSQL dump file format');
        }
      }

      return true;

    } catch (error) {
      console.error(`Backup integrity check failed for ${backupPath}:`, error.message);
      return false;
    }
  }

  private buildDumpArguments(outputPath: string): string[] {
    const args = [
      'pg_dump',
      `--host=${this.config.host}`,
      `--port=${this.config.port}`,
      `--username=${this.config.username}`,
      `--dbname=${this.config.database}`,
      '--no-password',
      '--format=custom',  // Directory format for flexibility
      '--compress=9',     // Maximum compression
      '--verbose',
      '--no-privileges',  // Don't dump privileges
      '--no-tablespaces', // Don't dump tablespace assignments
      `--file=${outputPath}`
    ];

    return args;
  }

  private buildRestoreArguments(
    backupPath: string,
    options: { targetDatabase?: string; clean?: boolean; create?: boolean }
  ): string[] {
    const dbName = options.targetDatabase || this.config.database;

    const args = [
      'pg_restore',
      `--host=${this.config.host}`,
      `--port=${this.config.port}`,
      `--username=${this.config.username}`,
      `--dbname=${dbName}`,
      '--no-password',
      '--verbose'
    ];

    if (options.clean !== false) { // Default to clean
      args.push('--clean');
      args.push('--if-exists');
    }

    if (options.create) {
      args.push('--create');
    }

    args.push(backupPath);

    return args;
  }

  private async executeDump(args: string[], abortSignal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const dump = spawn('pg_dump', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PGPASSWORD: this.config.password
        }
      });

      let stderr = '';
      dump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      dump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });

      dump.on('error', reject);

      // Handle abort signal
      abortSignal.addEventListener('abort', () => {
        dump.kill('SIGTERM');
        reject(new Error('Backup aborted'));
      });
    });
  }

  private async executeRestore(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const restore = spawn('pg_restore', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PGPASSWORD: this.config.password
        }
      });

      let stderr = '';
      restore.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      restore.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${stderr}`));
        }
      });

      restore.on('error', reject);
    });
  }

  private async compressBackup(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.gz`;

    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-9', inputPath]);

      gzip.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`gzip failed with code ${code}`));
        }
      });

      gzip.on('error', reject);
    });
  }

  private async decompressBackup(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace('.gz', '');

    return new Promise((resolve, reject) => {
      const gunzip = spawn('gunzip', [inputPath]);

      gunzip.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`gunzip failed with code ${code}`));
        }
      });

      gunzip.on('error', reject);
    });
  }

  private async encryptBackup(inputPath: string): Promise<string> {
    if (!this.config.encryption.key) {
      throw new Error('Encryption key not configured');
    }

    const outputPath = `${inputPath}.enc`;

    return new Promise((resolve, reject) => {
      const openssl = spawn('openssl', [
        'enc',
        `-${this.config.encryption.algorithm}`,
        '-salt',
        '-pbkdf2',
        '-k', this.config.encryption.key!,
        '-in', inputPath,
        '-out', outputPath
      ]);

      openssl.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`openssl encryption failed with code ${code}`));
        }
      });

      openssl.on('error', reject);
    });
  }

  private async decryptBackup(inputPath: string): Promise<string> {
    if (!this.config.encryption.key) {
      throw new Error('Encryption key not configured');
    }

    const outputPath = inputPath.replace('.enc', '');

    return new Promise((resolve, reject) => {
      const openssl = spawn('openssl', [
        'enc',
        '-d',
        `-${this.config.encryption.algorithm}`,
        '-pbkdf2',
        '-k', this.config.encryption.key!,
        '-in', inputPath,
        '-out', outputPath
      ]);

      openssl.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`openssl decryption failed with code ${code}`));
        }
      });

      openssl.on('error', reject);
    });
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataPath = path.join(this.config.outputDir, `${metadata.id}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.days);

    let deletedCount = 0;

    for (const backup of backups) {
      if (backup.timestamp < cutoffDate || backups.length > this.config.retention.maxBackups) {
        try {
          // Remove backup file
          const backupFile = path.join(this.config.outputDir,
            `postgres-backup-${backup.timestamp.toISOString().replace(/[:.]/g, '-')}.sql${
              backup.compressed ? '.gz' : ''
            }${backup.encrypted ? '.enc' : ''}`
          );

          if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
          }

          // Remove metadata file
          const metadataFile = path.join(this.config.outputDir, `${backup.id}.metadata.json`);
          if (fs.existsSync(metadataFile)) {
            fs.unlinkSync(metadataFile);
          }

          deletedCount++;
          console.log(`🗑️ Cleaned up old backup: ${backup.id}`);

        } catch (error) {
          console.warn(`Failed to cleanup backup ${backup.id}:`, error.message);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old PostgreSQL backups`);
    }
  }

  private async cleanupFailedBackup(backupId: string): Promise<void> {
    const files = fs.readdirSync(this.config.outputDir)
      .filter(file => file.includes(backupId))
      .map(file => path.join(this.config.outputDir, file));

    for (const file of files) {
      try {
        fs.unlinkSync(file);
        console.log(`🗑️ Cleaned up failed backup file: ${file}`);
      } catch (error) {
        console.warn(`Failed to cleanup ${file}:`, error.message);
      }
    }
  }

  private async setBackupPriority(priority: 'low' | 'normal' | 'high'): Promise<void> {
    // Set nice level for backup process (Unix systems)
    // This is a simplified implementation
    console.log(`Setting backup priority to: ${priority}`);
  }

  private async resetBackupPriority(): Promise<void> {
    console.log('Resetting backup priority');
  }

  private async validateBackupFile(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const isValid = await this.verifyBackupIntegrity(backupPath);
    if (!isValid) {
      throw new Error(`Backup file integrity check failed: ${backupPath}`);
    }
  }

  private async verifyRestore(database: string): Promise<void> {
    // Simple verification - check if we can connect and run a basic query
    try {
      execSync(`psql --host=${this.config.host} --port=${this.config.port} --username=${this.config.username} --dbname=${database} --command="SELECT 1;"`, {
        env: { ...process.env, PGPASSWORD: this.config.password },
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error(`Restore verification failed: ${error.message}`);
    }
  }

  abortBackup(backupId: string): void {
    const backup = this.activeBackups.get(backupId);
    if (backup) {
      backup.abort();
      this.activeBackups.delete(backupId);
    }
  }

  getActiveBackups(): string[] {
    return Array.from(this.activeBackups.keys());
  }
}
```

#### 1.2 WAL Archiving for Point-in-Time Recovery
```typescript
// src/lib/backup/postgres-wal-manager.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface WALConfig {
  archiveDir: string;
  retentionHours: number;
  compression: boolean;
  encryption: {
    enabled: boolean;
    key?: string;
  };
}

export class WALArchivingManager {
  private config: WALConfig;

  constructor(config: WALConfig) {
    this.config = config;
    this.ensureArchiveDirectory();
  }

  private ensureArchiveDirectory(): void {
    if (!fs.existsSync(this.config.archiveDir)) {
      fs.mkdirSync(this.config.archiveDir, { recursive: true });
    }
  }

  async archiveWALSegment(segmentPath: string): Promise<void> {
    const segmentName = path.basename(segmentPath);
    const archivePath = path.join(this.config.archiveDir, segmentName);

    try {
      // Copy WAL segment to archive
      fs.copyFileSync(segmentPath, archivePath);

      // Compress if enabled
      if (this.config.compression) {
        await this.compressWALSegment(archivePath);
      }

      // Encrypt if enabled
      if (this.config.encryption.enabled) {
        await this.encryptWALSegment(archivePath);
      }

      console.log(`✅ Archived WAL segment: ${segmentName}`);

    } catch (error) {
      console.error(`❌ Failed to archive WAL segment ${segmentName}:`, error);
      throw error;
    }
  }

  async cleanupOldWALSegments(): Promise<number> {
    const files = fs.readdirSync(this.config.archiveDir)
      .filter(file => file.endsWith('.wal') || file.endsWith('.gz') || file.endsWith('.enc'))
      .map(file => ({
        name: file,
        path: path.join(this.config.archiveDir, file),
        stats: fs.statSync(path.join(this.config.archiveDir, file))
      }));

    const cutoffTime = Date.now() - (this.config.retentionHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const file of files) {
      if (file.stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(file.path);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  private async compressWALSegment(segmentPath: string): Promise<void> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', [segmentPath]);

      gzip.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`gzip failed with code ${code}`));
        }
      });

      gzip.on('error', reject);
    });
  }

  private async encryptWALSegment(segmentPath: string): Promise<void> {
    if (!this.config.encryption.key) {
      throw new Error('Encryption key not configured');
    }

    const { spawn } = require('child_process');
    const outputPath = `${segmentPath}.enc`;

    return new Promise((resolve, reject) => {
      const openssl = spawn('openssl', [
        'enc',
        '-aes-256-cbc',
        '-salt',
        '-pbkdf2',
        '-k', this.config.encryption.key!,
        '-in', segmentPath,
        '-out', outputPath
      ]);

      openssl.on('close', (code) => {
        if (code === 0) {
          // Remove original file
          fs.unlinkSync(segmentPath);
          resolve();
        } else {
          reject(new Error(`openssl encryption failed with code ${code}`));
        }
      });

      openssl.on('error', reject);
    });
  }
}
```

### Phase 2: Qdrant Backup System (Day 3)

#### 2.1 Qdrant Snapshot Manager
```typescript
// src/lib/backup/qdrant-snapshot-manager.ts
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface QdrantBackupConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
  snapshotDir: string;
  retention: {
    count: number;
    days: number;
  };
  compression: boolean;
  timeout: number;
}

export interface SnapshotMetadata {
  name: string;
  collection: string;
  createdAt: Date;
  size: number;
  checksum: string;
  compressed: boolean;
  vectorCount: number;
  indexSize: number;
}

export class QdrantSnapshotManager {
  private config: QdrantBackupConfig;

  constructor(config: QdrantBackupConfig) {
    this.config = config;
    this.ensureSnapshotDirectory();
  }

  private ensureSnapshotDirectory(): void {
    if (!fs.existsSync(this.config.snapshotDir)) {
      fs.mkdirSync(this.config.snapshotDir, { recursive: true });
    }
  }

  async createSnapshot(): Promise<SnapshotMetadata> {
    const snapshotName = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`Creating Qdrant snapshot: ${snapshotName}`);

    try {
      // Create snapshot via API
      const createResponse = await fetch(`${this.config.url}/collections/${this.config.collectionName}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'api-key': this.config.apiKey })
        },
        body: JSON.stringify({
          snapshot_name: snapshotName
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create snapshot: ${createResponse.status} ${error}`);
      }

      // Wait for snapshot to complete
      await this.waitForSnapshotCompletion(snapshotName);

      // Download snapshot
      const downloadPath = await this.downloadSnapshot(snapshotName);

      // Compress if enabled
      let finalPath = downloadPath;
      if (this.config.compression) {
        finalPath = await this.compressSnapshot(downloadPath);
        fs.unlinkSync(downloadPath);
      }

      // Calculate metadata
      const stats = fs.statSync(finalPath);
      const checksum = await this.calculateChecksum(finalPath);
      const collectionInfo = await this.getCollectionInfo();

      const metadata: SnapshotMetadata = {
        name: snapshotName,
        collection: this.config.collectionName,
        createdAt: new Date(),
        size: stats.size,
        checksum,
        compressed: this.config.compression,
        vectorCount: collectionInfo?.points_count || 0,
        indexSize: collectionInfo?.index_size || 0
      };

      // Save metadata
      await this.saveSnapshotMetadata(metadata);

      // Cleanup old snapshots
      await this.cleanupOldSnapshots();

      console.log(`✅ Qdrant snapshot created: ${snapshotName} (${this.formatBytes(metadata.size)})`);

      return metadata;

    } catch (error) {
      console.error(`❌ Failed to create Qdrant snapshot:`, error);
      throw error;
    }
  }

  async restoreSnapshot(snapshotName: string): Promise<void> {
    console.log(`Restoring Qdrant snapshot: ${snapshotName}`);

    try {
      // Find snapshot file
      const snapshotPath = await this.findSnapshotFile(snapshotName);
      if (!snapshotPath) {
        throw new Error(`Snapshot file not found: ${snapshotName}`);
      }

      // Prepare snapshot for upload (decompress if needed)
      let uploadPath = snapshotPath;
      if (snapshotPath.endsWith('.gz')) {
        uploadPath = await this.decompressSnapshot(snapshotPath);
      }

      // Upload snapshot
      await this.uploadSnapshot(uploadPath);

      // Restore from uploaded snapshot
      await this.restoreFromUploadedSnapshot(snapshotName);

      console.log(`✅ Qdrant snapshot restored: ${snapshotName}`);

    } catch (error) {
      console.error(`❌ Failed to restore Qdrant snapshot:`, error);
      throw error;
    }
  }

  async listSnapshots(): Promise<SnapshotMetadata[]> {
    const metadataFiles = fs.readdirSync(this.config.snapshotDir)
      .filter(file => file.endsWith('.metadata.json'))
      .map(file => path.join(this.config.snapshotDir, file));

    const snapshots: SnapshotMetadata[] = [];

    for (const metadataFile of metadataFiles) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        snapshots.push({
          ...metadata,
          createdAt: new Date(metadata.createdAt)
        });
      } catch (error) {
        console.warn(`Failed to read snapshot metadata ${metadataFile}:`, error.message);
      }
    }

    return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async waitForSnapshotCompletion(snapshotName: string, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.config.url}/collections/${this.config.collectionName}/snapshots/${snapshotName}`, {
          headers: {
            ...(this.config.apiKey && { 'api-key': this.config.apiKey })
          }
        });

        if (response.ok) {
          const snapshot = await response.json();
          if (snapshot.status === 'completed') {
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        console.warn('Error checking snapshot status:', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    throw new Error(`Snapshot creation timeout after ${timeoutMs}ms`);
  }

  private async downloadSnapshot(snapshotName: string): Promise<string> {
    const response = await fetch(`${this.config.url}/collections/${this.config.collectionName}/snapshots/${snapshotName}/download`, {
      headers: {
        ...(this.config.apiKey && { 'api-key': this.config.apiKey })
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to download snapshot: ${response.status} ${error}`);
    }

    const downloadPath = path.join(this.config.snapshotDir, `${snapshotName}.snapshot`);
    const fileStream = fs.createWriteStream(downloadPath);

    return new Promise((resolve, reject) => {
      response.body?.pipe(fileStream);

      fileStream.on('finish', () => resolve(downloadPath));
      fileStream.on('error', reject);
    });
  }

  private async uploadSnapshot(snapshotPath: string): Promise<void> {
    const fileStream = fs.createReadStream(snapshotPath);

    const response = await fetch(`${this.config.url}/collections/${this.config.collectionName}/snapshots/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(this.config.apiKey && { 'api-key': this.config.apiKey })
      },
      body: fileStream
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload snapshot: ${response.status} ${error}`);
    }
  }

  private async restoreFromUploadedSnapshot(snapshotName: string): Promise<void> {
    const response = await fetch(`${this.config.url}/collections/${this.config.collectionName}/snapshots/${snapshotName}/restore`, {
      method: 'PUT',
      headers: {
        ...(this.config.apiKey && { 'api-key': this.config.apiKey })
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to restore snapshot: ${response.status} ${error}`);
    }
  }

  private async compressSnapshot(snapshotPath: string): Promise<string> {
    const { spawn } = require('child_process');
    const outputPath = `${snapshotPath}.gz`;

    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-9', snapshotPath]);

      gzip.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`gzip failed with code ${code}`));
        }
      });

      gzip.on('error', reject);
    });
  }

  private async decompressSnapshot(snapshotPath: string): Promise<string> {
    const { spawn } = require('child_process');
    const outputPath = snapshotPath.replace('.gz', '');

    return new Promise((resolve, reject) => {
      const gunzip = spawn('gunzip', [snapshotPath]);

      gunzip.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`gunzip failed with code ${code}`));
        }
      });

      gunzip.on('error', reject);
    });
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private async saveSnapshotMetadata(metadata: SnapshotMetadata): Promise<void> {
    const metadataPath = path.join(this.config.snapshotDir, `${metadata.name}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.days);

    let deletedCount = 0;

    for (const snapshot of snapshots) {
      if (snapshot.createdAt < cutoffDate || snapshots.length > this.config.retention.count) {
        try {
          // Remove snapshot file
          const snapshotFile = path.join(this.config.snapshotDir, `${snapshot.name}.snapshot${snapshot.compressed ? '.gz' : ''}`);
          if (fs.existsSync(snapshotFile)) {
            fs.unlinkSync(snapshotFile);
          }

          // Remove metadata file
          const metadataFile = path.join(this.config.snapshotDir, `${snapshot.name}.metadata.json`);
          if (fs.existsSync(metadataFile)) {
            fs.unlinkSync(metadataFile);
          }

          deletedCount++;
          console.log(`🗑️ Cleaned up old snapshot: ${snapshot.name}`);

        } catch (error) {
          console.warn(`Failed to cleanup snapshot ${snapshot.name}:`, error.message);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old Qdrant snapshots`);
    }
  }

  private async findSnapshotFile(snapshotName: string): Promise<string | null> {
    const files = fs.readdirSync(this.config.snapshotDir);

    for (const file of files) {
      if (file.startsWith(snapshotName) && (file.endsWith('.snapshot') || file.endsWith('.snapshot.gz'))) {
        return path.join(this.config.snapshotDir, file);
      }
    }

    return null;
  }

  private async getCollectionInfo() {
    try {
      const response = await fetch(`${this.config.url}/collections/${this.config.collectionName}`, {
        headers: {
          ...(this.config.apiKey && { 'api-key': this.config.apiKey })
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Could not get collection info:', error.message);
    }

    return null;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
```

### Phase 3: Unified Backup Orchestration (Day 4-5)

#### 3.1 Backup Scheduler and Monitoring
```typescript
// src/lib/backup/orchestrator/backup-orchestrator.ts
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { PostgresBackupManager } from '../core/postgres-backup-manager';
import { QdrantSnapshotManager } from '../qdrant-snapshot-manager';

export interface BackupJob {
  id: string;
  name: string;
  type: 'postgresql' | 'qdrant' | 'full-system';
  schedule: string; // Cron expression
  enabled: boolean;
  config: any;
  lastRun?: Date;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export interface BackupExecution {
  jobId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  results: {
    postgresql?: any;
    qdrant?: any;
  };
  error?: string;
}

export class BackupOrchestrator extends EventEmitter {
  private jobs: Map<string, BackupJob> = new Map();
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private executions: Map<string, BackupExecution> = new Map();
  private postgresManager: PostgresBackupManager;
  private qdrantManager: QdrantSnapshotManager;
  private logFile: string;

  constructor(
    postgresManager: PostgresBackupManager,
    qdrantManager: QdrantSnapshotManager,
    logFile: string = './logs/backup-orchestrator.log'
  ) {
    super();

    this.postgresManager = postgresManager;
    this.qdrantManager = qdrantManager;
    this.logFile = logFile;

    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  addJob(job: BackupJob): void {
    this.jobs.set(job.id, job);

    if (job.enabled) {
      this.scheduleJob(job);
    }

    this.log(`Added backup job: ${job.name} (${job.id})`);
  }

  updateJob(jobId: string, updates: Partial<BackupJob>): void {
    const existing = this.jobs.get(jobId);
    if (!existing) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const updated = { ...existing, ...updates };
    this.jobs.set(jobId, updated);

    // Reschedule if needed
    if (updates.enabled !== undefined || updates.schedule !== undefined) {
      this.unscheduleJob(jobId);
      if (updated.enabled) {
        this.scheduleJob(updated);
      }
    }

    this.log(`Updated backup job: ${jobId}`);
  }

  removeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.unscheduleJob(jobId);
      this.jobs.delete(jobId);
      this.log(`Removed backup job: ${jobId}`);
    }
  }

  async executeJob(jobId: string): Promise<BackupExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const executionId = `exec-${jobId}-${Date.now()}`;
    const execution: BackupExecution = {
      jobId,
      executionId,
      startTime: new Date(),
      status: 'running',
      results: {}
    };

    this.executions.set(executionId, execution);
    this.emit('executionStarted', execution);

    try {
      this.log(`Starting backup job execution: ${job.name} (${executionId})`);

      switch (job.type) {
        case 'postgresql':
          execution.results.postgresql = await this.postgresManager.createFullBackup();
          break;

        case 'qdrant':
          execution.results.qdrant = await this.qdrantManager.createSnapshot();
          break;

        case 'full-system':
          // Execute both backups in parallel
          const [pgResult, qdrantResult] = await Promise.allSettled([
            this.postgresManager.createFullBackup(),
            this.qdrantManager.createSnapshot()
          ]);

          execution.results.postgresql = pgResult.status === 'fulfilled' ? pgResult.value : { error: pgResult.reason.message };
          execution.results.qdrant = qdrantResult.status === 'fulfilled' ? qdrantResult.value : { error: qdrantResult.reason.message };
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      execution.status = 'completed';
      execution.endTime = new Date();

      // Update job status
      job.lastRun = execution.startTime;
      job.lastStatus = 'success';
      job.lastError = undefined;

      this.log(`✅ Backup job completed: ${job.name} (${executionId})`);
      this.emit('executionCompleted', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;

      // Update job status
      job.lastRun = execution.startTime;
      job.lastStatus = 'failed';
      job.lastError = error.message;

      this.log(`❌ Backup job failed: ${job.name} (${executionId}) - ${error.message}`);
      this.emit('executionFailed', execution);
    }

    this.executions.set(executionId, execution);
    return execution;
  }

  private scheduleJob(job: BackupJob): void {
    const task = cron.schedule(job.schedule, async () => {
      try {
        await this.executeJob(job.id);
      } catch (error) {
        this.log(`Scheduled job execution failed for ${job.id}: ${error.message}`);
      }
    });

    this.activeJobs.set(job.id, task);
    this.log(`Scheduled job: ${job.name} (${job.schedule})`);
  }

  private unscheduleJob(jobId: string): void {
    const task = this.activeJobs.get(jobId);
    if (task) {
      task.destroy();
      this.activeJobs.delete(jobId);
      this.log(`Unscheduled job: ${jobId}`);
    }
  }

  getJob(jobId: string): BackupJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): BackupJob[] {
    return Array.from(this.jobs.values());
  }

  getExecution(executionId: string): BackupExecution | undefined {
    return this.executions.get(executionId);
  }

  getJobExecutions(jobId: string, limit: number = 10): BackupExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.jobId === jobId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  getRecentExecutions(limit: number = 20): BackupExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  getBackupStatistics(): {
    totalJobs: number;
    activeJobs: number;
    recentExecutions: number;
    successRate: number;
    last24Hours: {
      executions: number;
      successes: number;
      failures: number;
    };
  } {
    const allJobs = this.getAllJobs();
    const recentExecutions = this.getRecentExecutions(100);
    const last24Hours = recentExecutions.filter(exec =>
      exec.startTime > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(exec => exec.status === 'completed').length;

    return {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter(job => job.enabled).length,
      recentExecutions: totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      last24Hours: {
        executions: last24Hours.length,
        successes: last24Hours.filter(exec => exec.status === 'completed').length,
        failures: last24Hours.filter(exec => exec.status === 'failed').length
      }
    };
  }

  stop(): void {
    for (const task of this.activeJobs.values()) {
      task.destroy();
    }
    this.activeJobs.clear();
    this.log('Backup orchestrator stopped');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(this.logFile, logEntry);
    console.log(message);
  }
}
```

## Configuration and Setup

### Environment Configuration
```typescript
// src/config/backup-config.ts
export interface BackupSystemConfig {
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    outputDir: string;
    compression: {
      enabled: boolean;
      level: number;
    };
    encryption: {
      enabled: boolean;
      key: string;
      algorithm: 'aes-256-cbc' | 'aes-256-gcm';
    };
    retention: {
      days: number;
      maxBackups: number;
    };
    walArchiving: {
      enabled: boolean;
      archiveDir: string;
    };
  };
  qdrant: {
    url: string;
    apiKey?: string;
    collectionName: string;
    snapshotDir: string;
    retention: {
      count: number;
      days: number;
    };
    compression: boolean;
    timeout: number;
  };
  orchestrator: {
    jobs: {
      postgresql: {
        schedule: string; // Cron expression
        enabled: boolean;
      };
      qdrant: {
        schedule: string;
        enabled: boolean;
      };
      fullSystem: {
        schedule: string;
        enabled: boolean;
      };
    };
    logFile: string;
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      backupFailureStreak: number;
      backupSizeDeviation: number; // percentage
    };
    notificationChannels: string[];
  };
}

export const defaultBackupConfig: BackupSystemConfig = {
  postgresql: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'neural_feed_studio',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    outputDir: './backups/postgresql',
    compression: {
      enabled: true,
      level: 6
    },
    encryption: {
      enabled: true,
      key: process.env.BACKUP_ENCRYPTION_KEY || '',
      algorithm: 'aes-256-cbc'
    },
    retention: {
      days: 30,
      maxBackups: 10
    },
    walArchiving: {
      enabled: true,
      archiveDir: './backups/postgresql/wal'
    }
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION || 'neural_feed_vectors',
    snapshotDir: './backups/qdrant',
    retention: {
      count: 10,
      days: 30
    },
    compression: true,
    timeout: 300000 // 5 minutes
  },
  orchestrator: {
    jobs: {
      postgresql: {
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: true
      },
      qdrant: {
        schedule: '0 3 * * *', // Daily at 3 AM
        enabled: true
      },
      fullSystem: {
        schedule: '0 4 * * 0', // Weekly on Sunday at 4 AM
        enabled: true
      }
    },
    logFile: './logs/backup-orchestrator.log'
  },
  monitoring: {
    enabled: true,
    alertThresholds: {
      backupFailureStreak: 3,
      backupSizeDeviation: 50
    },
    notificationChannels: ['email', 'slack']
  }
};
```

### Recovery Plan Templates
```typescript
// src/lib/backup/recovery-plans.ts
import { RecoveryPlan } from './disaster-recovery';

export const recoveryPlans: Record<string, RecoveryPlan> = {
  'full-system-recovery': {
    id: 'full-system-recovery',
    name: 'Full System Recovery',
    description: 'Complete recovery of PostgreSQL and Qdrant from latest backups',
    estimatedDuration: 180, // 3 hours
    rto: 240, // 4 hours
    rpo: 60, // 1 hour
    steps: [
      {
        id: 'validate-backups',
        name: 'Validate Latest Backups',
        description: 'Ensure latest backups are available and valid',
        type: 'automated',
        action: 'validate-backups',
        parameters: {},
        timeout: 300000, // 5 minutes
        dependencies: [],
        validation: 'backup-integrity'
      },
      {
        id: 'stop-services',
        name: 'Stop Application Services',
        description: 'Stop all application services to prevent data conflicts',
        type: 'manual',
        action: 'stop-services',
        parameters: { services: ['neural-feed-studio', 'qdrant'] },
        timeout: 600000, // 10 minutes
        dependencies: ['validate-backups']
      },
      {
        id: 'restore-postgresql',
        name: 'Restore PostgreSQL Database',
        description: 'Restore PostgreSQL from latest backup',
        type: 'automated',
        action: 'postgres-restore',
        parameters: {
          backupPath: 'latest',
          targetDatabase: 'neural_feed_studio'
        },
        timeout: 1800000, // 30 minutes
        dependencies: ['stop-services'],
        validation: 'postgres-connection'
      },
      {
        id: 'restore-qdrant',
        name: 'Restore Qdrant Collection',
        description: 'Restore Qdrant collection from latest snapshot',
        type: 'automated',
        action: 'qdrant-restore',
        parameters: {
          snapshotName: 'latest'
        },
        timeout: 1800000, // 30 minutes
        dependencies: ['stop-services'],
        validation: 'qdrant-health'
      },
      {
        id: 'start-services',
        name: 'Start Application Services',
        description: 'Start all application services',
        type: 'manual',
        action: 'start-services',
        parameters: { services: ['qdrant', 'neural-feed-studio'] },
        timeout: 600000, // 10 minutes
        dependencies: ['restore-postgresql', 'restore-qdrant']
      },
      {
        id: 'verify-system',
        name: 'Verify System Health',
        description: 'Run comprehensive system health checks',
        type: 'automated',
        action: 'verify-system',
        parameters: {},
        timeout: 300000, // 5 minutes
        dependencies: ['start-services']
      }
    ]
  },

  'postgresql-only-recovery': {
    id: 'postgresql-only-recovery',
    name: 'PostgreSQL Database Recovery',
    description: 'Recovery of PostgreSQL database only',
    estimatedDuration: 60, // 1 hour
    rto: 120, // 2 hours
    rpo: 60, // 1 hour
    steps: [
      {
        id: 'validate-pg-backup',
        name: 'Validate PostgreSQL Backup',
        description: 'Ensure PostgreSQL backup is available and valid',
        type: 'automated',
        action: 'validate-backup',
        parameters: { type: 'postgresql' },
        timeout: 300000,
        dependencies: []
      },
      {
        id: 'stop-app-services',
        name: 'Stop Application Services',
        description: 'Stop application services that depend on PostgreSQL',
        type: 'manual',
        action: 'stop-services',
        parameters: { services: ['neural-feed-studio'] },
        timeout: 300000,
        dependencies: ['validate-pg-backup']
      },
      {
        id: 'restore-postgresql-only',
        name: 'Restore PostgreSQL Database',
        description: 'Restore PostgreSQL from backup',
        type: 'automated',
        action: 'postgres-restore',
        parameters: {
          backupPath: 'latest',
          targetDatabase: 'neural_feed_studio'
        },
        timeout: 1800000,
        dependencies: ['stop-app-services'],
        validation: 'postgres-connection'
      },
      {
        id: 'restart-app-services',
        name: 'Restart Application Services',
        description: 'Restart application services',
        type: 'manual',
        action: 'start-services',
        parameters: { services: ['neural-feed-studio'] },
        timeout: 300000,
        dependencies: ['restore-postgresql-only']
      }
    ]
  }
};
```

## Testing Strategy

### Unit Testing
```typescript
// src/__tests__/backup/postgres-backup-manager.test.ts
import { PostgresBackupManager } from '../../lib/backup/core/postgres-backup-manager';
import * as fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('PostgresBackupManager', () => {
  let manager: PostgresBackupManager;
  const mockConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    username: 'test_user',
    password: 'test_pass',
    outputDir: '/tmp/backups',
    compression: { enabled: true, level: 6 },
    encryption: { enabled: false },
    retention: { days: 30, maxBackups: 10 },
    walArchiving: { enabled: false, archiveDir: '/tmp/wal' }
  };

  beforeEach(() => {
    manager = new PostgresBackupManager(mockConfig);
  });

  describe('createFullBackup', () => {
    it('should create a backup successfully', async () => {
      const result = await manager.createFullBackup();

      expect(result.success).toBe(true);
      expect(result.database).toBe('test_db');
      expect(result.size).toBeGreaterThan(0);
      expect(result.checksum).toBeDefined();
    });

    it('should handle backup failures gracefully', async () => {
      // Mock pg_dump failure
      const result = await manager.createFullBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should compress backups when enabled', async () => {
      const result = await manager.createFullBackup();

      expect(result.compressed).toBe(true);
    });
  });

  describe('restoreBackup', () => {
    it('should restore from backup successfully', async () => {
      const result = await manager.restoreBackup('/path/to/backup.sql.gz');

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle restore failures', async () => {
      const result = await manager.restoreBackup('/invalid/path');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyBackupIntegrity', () => {
    it('should verify valid backup files', async () => {
      const isValid = await manager.verifyBackupIntegrity('/valid/backup.sql');

      expect(isValid).toBe(true);
    });

    it('should reject invalid backup files', async () => {
      const isValid = await manager.verifyBackupIntegrity('/invalid/backup.sql');

      expect(isValid).toBe(false);
    });
  });
});
```

### Integration Testing
```typescript
// src/__tests__/integration/backup-integration.test.ts
import { BackupOrchestrator } from '../../lib/backup/orchestrator/backup-orchestrator';
import { PostgresBackupManager } from '../../lib/backup/core/postgres-backup-manager';
import { QdrantSnapshotManager } from '../../lib/backup/qdrant-snapshot-manager';

describe('Backup Integration Tests', () => {
  let orchestrator: BackupOrchestrator;
  let postgresManager: PostgresBackupManager;
  let qdrantManager: QdrantSnapshotManager;

  beforeAll(async () => {
    // Setup test databases and managers
    postgresManager = new PostgresBackupManager(testPostgresConfig);
    qdrantManager = new QdrantSnapshotManager(testQdrantConfig);
    orchestrator = new BackupOrchestrator(postgresManager, qdrantManager);
  });

  describe('Full System Backup', () => {
    it('should execute full system backup successfully', async () => {
      const execution = await orchestrator.executeJob('full-system-backup');

      expect(execution.status).toBe('completed');
      expect(execution.results.postgresql).toBeDefined();
      expect(execution.results.qdrant).toBeDefined();
    }, 300000); // 5 minute timeout

    it('should handle partial failures gracefully', async () => {
      // Simulate Qdrant failure
      const execution = await orchestrator.executeJob('full-system-backup');

      expect(execution.status).toBe('failed');
      expect(execution.results.postgresql.success).toBe(true);
      expect(execution.results.qdrant.success).toBe(false);
    });
  });

  describe('Scheduled Backups', () => {
    it('should execute scheduled jobs', async () => {
      // Add a test job
      orchestrator.addJob({
        id: 'test-job',
        name: 'Test Job',
        type: 'postgresql',
        schedule: '* * * * *', // Every minute
        enabled: true,
        config: {}
      });

      // Wait for job execution
      await new Promise(resolve => setTimeout(resolve, 65000));

      const executions = orchestrator.getJobExecutions('test-job');
      expect(executions.length).toBeGreaterThan(0);
    });
  });
});
```

### Disaster Recovery Testing
```typescript
// src/__tests__/disaster-recovery/disaster-recovery.test.ts
import { DisasterRecoveryCoordinator } from '../../lib/backup/disaster-recovery';
import { recoveryPlans } from '../../lib/backup/recovery-plans';

describe('Disaster Recovery Tests', () => {
  let coordinator: DisasterRecoveryCoordinator;

  beforeAll(() => {
    // Setup coordinator with test managers
    coordinator = new DisasterRecoveryCoordinator(testPostgresManager, testQdrantManager);

    // Register recovery plans
    Object.values(recoveryPlans).forEach(plan => {
      coordinator.registerPlan(plan);
    });
  });

  describe('Recovery Plan Execution', () => {
    it('should execute full system recovery in dry-run mode', async () => {
      const execution = await coordinator.executeRecovery('full-system-recovery', { dryRun: true });

      expect(execution.status).toBe('completed');
      expect(execution.completedSteps.length).toBeGreaterThan(0);
      expect(execution.log.some(log => log.includes('DRY RUN'))).toBe(true);
    });

    it('should handle step failures gracefully', async () => {
      // Mock a step failure
      const execution = await coordinator.executeRecovery('full-system-recovery');

      expect(execution.status).toBe('failed');
      expect(execution.failedSteps.length).toBeGreaterThan(0);
    });

    it('should respect step dependencies', async () => {
      const execution = await coordinator.executeRecovery('full-system-recovery', { dryRun: true });

      // Verify dependency order
      const stopServicesIndex = execution.completedSteps.indexOf('stop-services');
      const restorePgIndex = execution.completedSteps.indexOf('restore-postgresql');
      const restoreQdrantIndex = execution.completedSteps.indexOf('restore-qdrant');

      expect(stopServicesIndex).toBeLessThan(restorePgIndex);
      expect(stopServicesIndex).toBeLessThan(restoreQdrantIndex);
    });
  });

  describe('Recovery Plan Validation', () => {
    it('should reject plans with circular dependencies', () => {
      const invalidPlan = {
        ...recoveryPlans['full-system-recovery'],
        id: 'invalid-plan',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            description: 'First step',
            type: 'automated' as const,
            action: 'test',
            parameters: {},
            timeout: 60000,
            dependencies: ['step2'] // Circular dependency
          },
          {
            id: 'step2',
            name: 'Step 2',
            description: 'Second step',
            type: 'automated' as const,
            action: 'test',
            parameters: {},
            timeout: 60000,
            dependencies: ['step1'] // Circular dependency
          }
        ]
      };

      expect(() => coordinator.registerPlan(invalidPlan)).toThrow('Circular dependency detected');
    });
  });
});
```

## Operational Procedures

### Daily Operations

#### Backup Monitoring
1. **Check Backup Status**: Review daily backup execution logs
2. **Verify Backup Integrity**: Run automated integrity checks
3. **Monitor Storage Usage**: Ensure sufficient backup storage space
4. **Review Alert Notifications**: Address any backup failure alerts

#### Log Analysis
```bash
# Check backup orchestrator logs
tail -f ./logs/backup-orchestrator.log

# Analyze backup execution times
grep "Backup job completed" ./logs/backup-orchestrator.log | tail -10

# Check for backup failures
grep "Backup job failed" ./logs/backup-orchestrator.log
```

### Weekly Operations

#### Backup Verification
1. **Test Backup Restoration**: Perform test restores in staging environment
2. **Validate Backup Integrity**: Run comprehensive integrity checks
3. **Review Retention Policies**: Clean up old backups as needed
4. **Update Backup Schedules**: Adjust schedules based on system load

### Monthly Operations

#### Disaster Recovery Testing
1. **Execute Recovery Drills**: Run full disaster recovery procedures
2. **Update Recovery Plans**: Incorporate lessons learned
3. **Review Backup Strategies**: Assess effectiveness and make improvements
4. **Compliance Audits**: Verify backup and recovery compliance

### Emergency Procedures

#### Immediate Response
1. **Assess Situation**: Determine scope and impact of data loss
2. **Stop Affected Services**: Prevent further data corruption
3. **Identify Recovery Path**: Choose appropriate recovery plan
4. **Execute Recovery**: Follow recovery procedures step-by-step

#### Communication Plan
1. **Internal Notifications**: Alert development and operations teams
2. **Stakeholder Updates**: Keep business stakeholders informed
3. **User Communications**: Notify users of service disruptions
4. **Post-Incident Review**: Conduct thorough incident analysis

## Success Metrics and KPIs

### Backup Effectiveness
- **Backup Success Rate**: > 99% of scheduled backups complete successfully
- **Backup Verification**: 100% of backups pass integrity checks
- **Recovery Time**: Average RTO of < 4 hours for full recovery
- **Data Loss**: Average RPO of < 1 hour in failure scenarios

### System Performance
- **Backup Impact**: < 10% performance degradation during backups
- **Storage Efficiency**: < 50% storage overhead for compressed backups
- **Recovery Speed**: Full system recovery completes within 3 hours

### Operational Excellence
- **Alert Response**: < 15 minutes average response to backup failures
- **Documentation Updates**: Recovery procedures updated within 24 hours of changes
- **Training Completion**: 100% of operations team trained on procedures

## Risk Mitigation

### Technical Risks
1. **Backup Corruption**: Multiple integrity validation layers
2. **Storage Failure**: Multi-location backup storage
3. **Network Issues**: Retry logic and offline backup capabilities
4. **Performance Impact**: Off-peak scheduling and resource monitoring

### Operational Risks
1. **Process Failures**: Comprehensive monitoring and alerting
2. **Human Error**: Clear procedures and validation steps
3. **Resource Exhaustion**: Capacity planning and automated cleanup
4. **Compliance Issues**: Audit logging and retention policies

## Implementation Timeline

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Implement PostgreSQL backup manager
- [ ] Implement WAL archiving system
- [ ] Create basic backup orchestration
- [ ] Set up configuration management

### Phase 2: Qdrant Integration (Day 3)
- [ ] Implement Qdrant snapshot manager
- [ ] Integrate with backup orchestrator
- [ ] Add compression and encryption
- [ ] Create snapshot retention policies

### Phase 3: Recovery System (Days 4-5)
- [ ] Implement disaster recovery coordinator
- [ ] Create recovery plan templates
- [ ] Add monitoring and alerting
- [ ] Set up automated testing

### Phase 4: Production Deployment
- [ ] Configure production backup schedules
- [ ] Set up monitoring and alerting
- [ ] Create operational documentation
- [ ] Conduct initial disaster recovery drill

## Definition of Done

### Code Quality
- [ ] All backup managers implement proper error handling
- [ ] Comprehensive logging throughout backup operations
- [ ] Unit tests cover > 90% of backup functionality
- [ ] Integration tests validate end-to-end backup workflows

### Testing Quality
- [ ] Backup procedures tested successfully in staging
- [ ] Recovery procedures validated with test data
- [ ] Performance benchmarks meet production requirements
- [ ] Disaster recovery drills completed successfully

### Documentation Quality
- [ ] Backup procedures fully documented
- [ ] Recovery runbooks created and validated
- [ ] Troubleshooting guides available
- [ ] Operational procedures documented

### Operational Readiness
- [ ] Backup schedules configured and tested
- [ ] Monitoring and alerting set up
- [ ] Support team trained on procedures
- [ ] Go-live checklist completed and validated

## Story Completion Checklist

### Development Phase
- [ ] PostgreSQL backup system implemented
- [ ] Qdrant backup system developed
- [ ] Backup orchestrator created
- [ ] Disaster recovery coordinator built
- [ ] Configuration management completed

### Testing Phase
- [ ] Unit tests for backup components
- [ ] Integration tests for backup workflows
- [ ] Recovery testing completed
- [ ] Performance validation finished

### Documentation Phase
- [ ] Backup procedures documented
- [ ] Recovery runbooks created
- [ ] Operational procedures documented
- [ ] Troubleshooting guides completed

### Deployment Phase
- [ ] Production configuration applied
- [ ] Backup schedules activated
- [ ] Monitoring enabled
- [ ] Initial backup executed successfully

**Story Status:** Ready for Development
**Estimated Timeline:** 3-4 days
**Risk Level:** Medium
**Dependencies:** Database infrastructure, Qdrant setup

#### 3.2 Disaster Recovery Coordinator
```typescript
// src/lib/backup/disaster-recovery.ts
import { PostgresBackupManager } from '../core/postgres-backup-manager';
import { QdrantSnapshotManager } from '../