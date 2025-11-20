# Story: 1-4 Data Backup and Recovery
**Epic:** Epic 1 - Infrastructure & Data Foundation
**Estimated Points:** 5
**Priority:** High
**Assignee:** DevOps Engineer

## User Story
**As a** system administrator  
**I want to** implement automated backup and recovery procedures  
**So that** data can be restored in case of failures or disasters

## Business Value
This story ensures data durability and business continuity for the RAG system. Without reliable backup and recovery capabilities, any data loss could severely impact the system's ability to provide AI-powered content generation and semantic search. This provides the safety net needed for production operations.

## Acceptance Criteria

### Functional Requirements
- [ ] Automated PostgreSQL backups execute on schedule
- [ ] Qdrant vector data backups are performed regularly
- [ ] Point-in-time recovery capability for PostgreSQL
- [ ] Full system recovery procedures documented and tested
- [ ] Backup integrity validation mechanisms in place
- [ ] Backup storage with retention policies implemented
- [ ] Recovery time objectives (RTO) meet requirements (< 4 hours)
- [ ] Recovery point objectives (RPO) meet requirements (< 1 hour data loss)

### Non-Functional Requirements
- [ ] Backup operations don't impact production performance (> 10% degradation)
- [ ] Backup storage is encrypted and secure
- [ ] Automated monitoring and alerting for backup failures
- [ ] Backup verification runs automatically after each backup
- [ ] Recovery procedures are tested quarterly
- [ ] Backup retention policies prevent storage overflow

### Quality Requirements
- [ ] Backup scripts are idempotent and safe to rerun
- [ ] Comprehensive error handling and logging
- [ ] Backup verification includes data integrity checks
- [ ] Recovery procedures include rollback capabilities
- [ ] Documentation includes troubleshooting guides

## Technical Requirements

### Backup Strategy
**Multi-Layer Approach:**
- **PostgreSQL:** Logical backups (pg_dump) + continuous WAL archiving
- **Qdrant:** Collection snapshots + incremental updates
- **Application Data:** Configuration and metadata backups
- **Storage:** Encrypted cloud storage with versioning

### Recovery Strategy
**Disaster Recovery Tiers:**
- **RTO (Recovery Time Objective):** 4 hours for full system recovery
- **RPO (Recovery Point Objective):** 1 hour maximum data loss
- **Recovery Methods:** Automated scripts + manual procedures
- **Testing:** Quarterly disaster recovery drills

### Backup Components
```typescript
interface BackupConfiguration {
  postgresql: {
    schedule: string;          // Cron expression
    retention: number;         // Days to keep backups
    compression: boolean;      // Enable compression
    encryption: boolean;       // Enable encryption
    verify: boolean;          // Run integrity checks
  };
  qdrant: {
    schedule: string;
    retention: number;
    includePayload: boolean;   // Include metadata in backups
    compression: boolean;
  };
  storage: {
    provider: 'local' | 's3' | 'gcs';
    bucket: string;
    region: string;
    encryption: boolean;
    versioning: boolean;
  };
}
```

## Implementation Details

### Phase 1: PostgreSQL Backup System (Day 1-2)

#### 1.1 Automated PostgreSQL Backups
```typescript
// src/lib/backup/postgres-backup.ts
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';

export interface PostgresBackupOptions {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  outputDir: string;
  compression: boolean;
  encryptionKey?: string;
  retentionDays: number;
}

export interface BackupResult {
  success: boolean;
  filePath: string;
  size: number;
  checksum: string;
  duration: number;
  error?: string;
}

export class PostgresBackupManager {
  private options: PostgresBackupOptions;

  constructor(options: PostgresBackupOptions) {
    this.options = options;
  }

  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `postgres-backup-${timestamp}`;
    const sqlFilename = `${baseFilename}.sql`;
    const sqlPath = path.join(this.options.outputDir, sqlFilename);

    try {
      // Ensure output directory exists
      fs.mkdirSync(this.options.outputDir, { recursive: true });

      // Build pg_dump command
      const dumpCommand = this.buildDumpCommand(sqlPath);

      console.log(`Starting PostgreSQL backup: ${sqlFilename}`);

      // Execute pg_dump
      execSync(dumpCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGPASSWORD: this.options.password
        }
      });

      // Compress if requested
      let finalPath = sqlPath;
      if (this.options.compression) {
        finalPath = await this.compressBackup(sqlPath);
        // Remove uncompressed file
        fs.unlinkSync(sqlPath);
      }

      // Encrypt if requested
      if (this.options.encryptionKey) {
        finalPath = await this.encryptBackup(finalPath);
        // Remove unencrypted file
        fs.unlinkSync(finalPath.replace('.enc', ''));
      }

      // Calculate checksum
      const checksum = await this.calculateChecksum(finalPath);
      const stats = fs.statSync(finalPath);

      const result: BackupResult = {
        success: true,
        filePath: finalPath,
        size: stats.size,
        checksum,
        duration: Date.now() - startTime
      };

      console.log(`✅ PostgreSQL backup completed: ${result.filePath} (${this.formatBytes(result.size)}) in ${result.duration}ms`);

      return result;

    } catch (error) {
      const result: BackupResult = {
        success: false,
        filePath: sqlPath,
        size: 0,
        checksum: '',
        duration: Date.now() - startTime,
        error: error.message
      };

      console.error(`❌ PostgreSQL backup failed:`, error.message);
      return result;
    }
  }

  async restoreBackup(backupPath: string, targetDatabase?: string): Promise<boolean> {
    try {
      console.log(`Starting PostgreSQL restore from: ${backupPath}`);

      // Handle encrypted backups
      let restorePath = backupPath;
      if (backupPath.endsWith('.enc') && this.options.encryptionKey) {
        restorePath = await this.decryptBackup(backupPath);
      }

      // Handle compressed backups
      if (restorePath.endsWith('.gz')) {
        restorePath = await this.decompressBackup(restorePath);
      }

      // Build restore command
      const restoreCommand = this.buildRestoreCommand(restorePath, targetDatabase);

      // Execute restore
      execSync(restoreCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGPASSWORD: this.options.password
        }
      });

      console.log(`✅ PostgreSQL restore completed from: ${backupPath}`);
      return true;

    } catch (error) {
      console.error(`❌ PostgreSQL restore failed:`, error.message);
      return false;
    }
  }

  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Check file exists and is readable
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file does not exist: ${backupPath}`);
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error(`Backup file is empty: ${backupPath}`);
      }

      // For SQL backups, try to parse and validate structure
      if (backupPath.endsWith('.sql')) {
        const content = fs.readFileSync(backupPath, 'utf8').substring(0, 1000);
        if (!content.includes('PostgreSQL database dump')) {
          throw new Error('Invalid backup file format');
        }
      }

      console.log(`✅ Backup verification passed: ${backupPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Backup verification failed:`, error.message);
      return false;
    }
  }

  async cleanupOldBackups(): Promise<number> {
    try {
      const files = fs.readdirSync(this.options.outputDir)
        .filter(file => file.startsWith('postgres-backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.options.outputDir, file),
          stats: fs.statSync(path.join(this.options.outputDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      let deletedCount = 0;
      for (const file of files.slice(this.options.retentionDays)) { // Keep at least retentionDays files
        if (file.stats.mtime < cutoffDate) {
          fs.unlinkSync(file.path);
          deletedCount++;
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      return 0;
    }
  }

  private buildDumpCommand(outputPath: string): string {
    const args = [
      'pg_dump',
      `--host=${this.options.host}`,
      `--port=${this.options.port}`,
      `--username=${this.options.username}`,
      `--dbname=${this.options.database}`,
      '--no-password',
      '--format=custom',  // Use custom format for better compression
      '--compress=9',     // Maximum compression
      '--verbose',
      `--file=${outputPath}`
    ];

    return args.join(' ');
  }

  private buildRestoreCommand(backupPath: string, targetDatabase?: string): string {
    const dbName = targetDatabase || this.options.database;

    const args = [
      'pg_restore',
      `--host=${this.options.host}`,
      `--port=${this.options.port}`,
      `--username=${this.options.username}`,
      `--dbname=${dbName}`,
      '--no-password',
      '--verbose',
      '--clean',        // Clean (drop) database objects before recreating
      '--if-exists',    // Use IF EXISTS when dropping objects
      '--create',       // Create the database
      backupPath
    ];

    return args.join(' ');
  }

  private async compressBackup(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.gz`;

    return new Promise((resolve, reject) => {
      const gzip = spawn('gzip', ['-9', inputPath], { stdio: 'inherit' });

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
      const gunzip = spawn('gunzip', [inputPath], { stdio: 'inherit' });

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
    const outputPath = `${inputPath}.enc`;
    const key = this.options.encryptionKey!;

    return new Promise((resolve, reject) => {
      const openssl = spawn('openssl', [
        'enc',
        '-aes-256-cbc',
        '-salt',
        '-pbkdf2',
        '-k', key,
        '-in', inputPath,
        '-out', outputPath
      ], { stdio: 'inherit' });

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
    const outputPath = inputPath.replace('.enc', '');
    const key = this.options.encryptionKey!;

    return new Promise((resolve, reject) => {
      const openssl = spawn('openssl', [
        'enc',
        '-d',  // Decrypt
        '-aes-256-cbc',
        '-pbkdf2',
        '-k', key,
        '-in', inputPath,
        '-out', outputPath
      ], { stdio: 'inherit' });

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

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
```

#### 1.2 Backup Scheduling System
```typescript
// src/lib/backup/scheduler.ts
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { PostgresBackupManager, QdrantBackupManager } from './managers';

export interface BackupSchedule {
  id: string;
  name: string;
  type: 'postgresql' | 'qdrant' | 'full';
  cronExpression: string;
  enabled: boolean;
  retentionDays: number;
  options: any;
}

export interface ScheduleExecution {
  scheduleId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  result?: any;
  error?: string;
}

export class BackupScheduler {
  private schedules: Map<string, BackupSchedule> = new Map();
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private executions: ScheduleExecution[] = new Map();
  private postgresManager: PostgresBackupManager;
  private qdrantManager: QdrantBackupManager;
  private logFile: string;

  constructor(
    postgresManager: PostgresBackupManager,
    qdrantManager: QdrantBackupManager,
    logFile: string = './logs/backup-scheduler.log'
  ) {
    this.postgresManager = postgresManager;
    this.qdrantManager = qdrantManager;
    this.logFile = logFile;

    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  addSchedule(schedule: BackupSchedule): void {
    this.schedules.set(schedule.id, schedule);

    if (schedule.enabled) {
      this.scheduleJob(schedule);
    }

    this.log(`Added backup schedule: ${schedule.name} (${schedule.id})`);
  }

  updateSchedule(scheduleId: string, updates: Partial<BackupSchedule>): void {
    const existing = this.schedules.get(scheduleId);
    if (!existing) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const updated = { ...existing, ...updates };
    this.schedules.set(scheduleId, updated);

    // Reschedule if needed
    if (updates.enabled !== undefined || updates.cronExpression !== undefined) {
      this.unscheduleJob(scheduleId);
      if (updated.enabled) {
        this.scheduleJob(updated);
      }
    }

    this.log(`Updated backup schedule: ${scheduleId}`);
  }

  removeSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      this.unscheduleJob(scheduleId);
      this.schedules.delete(scheduleId);
      this.log(`Removed backup schedule: ${scheduleId}`);
    }
  }

  private scheduleJob(schedule: BackupSchedule): void {
    const job = cron.schedule(schedule.cronExpression, async () => {
      await this.executeSchedule(schedule);
    });

    this.activeJobs.set(schedule.id, job);
    this.log(`Scheduled job: ${schedule.name} (${schedule.cronExpression})`);
  }

  private unscheduleJob(scheduleId: string): void {
    const job = this.activeJobs.get(scheduleId);
    if (job) {
      job.destroy();
      this.activeJobs.delete(scheduleId);
      this.log(`Unscheduled job: ${scheduleId}`);
    }
  }

  private async executeSchedule(schedule: BackupSchedule): Promise<void> {
    const executionId = `${schedule.id}-${Date.now()}`;
    const execution: ScheduleExecution = {
      scheduleId: schedule.id,
      executionId,
      startTime: new Date(),
      success: false
    };

    this.executions.set(executionId, execution);

    try {
      this.log(`Starting scheduled backup: ${schedule.name} (${executionId})`);

      let result: any;

      switch (schedule.type) {
        case 'postgresql':
          result = await this.postgresManager.createBackup();
          break;
        case 'qdrant':
          result = await this.qdrantManager.createBackup();
          break;
        case 'full':
          const pgResult = await this.postgresManager.createBackup();
          const qdrantResult = await this.qdrantManager.createBackup();
          result = { postgresql: pgResult, qdrant: qdrantResult };
          break;
        default:
          throw new Error(`Unknown schedule type: ${schedule.type}`);
      }

      execution.endTime = new Date();
      execution.success = true;
      execution.result = result;

      this.log(`✅ Scheduled backup completed: ${schedule.name} (${executionId})`);

      // Cleanup old backups
      if (schedule.type === 'postgresql' || schedule.type === 'full') {
        const deleted = await this.postgresManager.cleanupOldBackups();
        if (deleted > 0) {
          this.log(`Cleaned up ${deleted} old PostgreSQL backups`);
        }
      }

      if (schedule.type === 'qdrant' || schedule.type === 'full') {
        const deleted = await this.qdrantManager.cleanupOldBackups();
        if (deleted > 0) {
          this.log(`Cleaned up ${deleted} old Qdrant backups`);
        }
      }

    } catch (error) {
      execution.endTime = new Date();
      execution.success = false;
      execution.error = error.message;

      this.log(`❌ Scheduled backup failed: ${schedule.name} (${executionId}) - ${error.message}`);
    }

    this.executions.set(executionId, execution);
  }

  getSchedule(scheduleId: string): BackupSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  getAllSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values());
  }

  getExecution(executionId: string): ScheduleExecution | undefined {
    return this.executions.get(executionId);
  }

  getScheduleExecutions(scheduleId: string, limit: number = 10): ScheduleExecution[] {
    return Array.from(this.executions.values())
      .filter(exec => exec.scheduleId === scheduleId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  getRecentExecutions(limit: number = 20): ScheduleExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  stop(): void {
    for (const job of this.activeJobs.values()) {
      job.destroy();
    }
    this.activeJobs.clear();
    this.log('Backup scheduler stopped');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(this.logFile, logEntry);
    console.log(message);
  }
}
```

### Phase 2: Qdrant Backup System (Day 3)

#### 2.1 Qdrant Backup Manager
```typescript
// src/lib/backup/qdrant-backup.ts
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import fetch from 'node-fetch';

export interface QdrantBackupOptions {
  url: string;
  apiKey?: string;
  collectionName: string;
  outputDir: string;
  compression: boolean;
  retentionDays: number;
  includePayload: boolean;
}

export interface QdrantBackupResult {
  success: boolean;
  snapshotPath: string;
  size: number;
  checksum: string;
  duration: number;
  vectorCount: number;
  error?: string;
}

export class QdrantBackupManager {
  private options: QdrantBackupOptions;

  constructor(options: QdrantBackupOptions) {
    this.options = options;
  }

  async createBackup(): Promise<QdrantBackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = `qdrant-backup-${this.options.collectionName}-${timestamp}`;

    try {
      // Ensure output directory exists
      fs.mkdirSync(this.options.outputDir, { recursive: true });

      console.log(`Starting Qdrant backup for collection: ${this.options.collectionName}`);

      // Create collection snapshot
      const snapshotResult = await this.createSnapshot(snapshotName);

      if (!snapshotResult.success) {
        throw new Error(`Failed to create snapshot: ${snapshotResult.error}`);
      }

      // Download snapshot
      const downloadResult = await this.downloadSnapshot(snapshotName);

      if (!downloadResult.success) {
        throw new Error(`Failed to download snapshot: ${downloadResult.error}`);
      }

      // Compress if requested
      let finalPath = downloadResult.filePath;
      if (this.options.compression) {
        finalPath = await this.compressBackup(finalPath);
        fs.unlinkSync(downloadResult.filePath);
      }

      // Calculate checksum and stats
      const checksum = await this.calculateChecksum(finalPath);
      const stats = fs.statSync(finalPath);

      // Get collection info for metadata
      const collectionInfo = await this.getCollectionInfo();

      const result: QdrantBackupResult = {
        success: true,
        snapshotPath: finalPath,
        size: stats.size,
        checksum,
        duration: Date.now() - startTime,
        vectorCount: collectionInfo?.points_count || 0
      };

      console.log(`✅ Qdrant backup completed: ${finalPath} (${this.formatBytes(result.size)}) in ${result.duration}ms`);

      return result;

    } catch (error) {
      const result: QdrantBackupResult = {
        success: false,
        snapshotPath: '',
        size: 0,
        checksum: '',
        duration: Date.now() - startTime,
        vectorCount: 0,
        error: error.message
      };

      console.error(`❌ Qdrant backup failed:`, error.message);
      return result;
    }
  }

  private async createSnapshot(snapshotName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey && { 'api-key': this.options.apiKey })
        },
        body: JSON.stringify({
          snapshot_name: snapshotName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();

      // Wait for snapshot to complete
      await this.waitForSnapshot(snapshotName);

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async waitForSnapshot(snapshotName: string, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}/snapshots/${snapshotName}`, {
          headers: {
            ...(this.options.apiKey && { 'api-key': this.options.apiKey })
          }
        });

        if (response.ok) {
          const snapshot = await response.json();
          if (snapshot.status === 'completed') {
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

      } catch (error) {
        console.warn('Error checking snapshot status:', error.message);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    throw new Error(`Snapshot creation timeout after ${timeoutMs}ms`);
  }

  private async downloadSnapshot(snapshotName: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}/snapshots/${snapshotName}/download`, {
        headers: {
          ...(this.options.apiKey && { 'api-key': this.options.apiKey })
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const filePath = path.join(this.options.outputDir, `${snapshotName}.snapshot`);
      const fileStream = fs.createWriteStream(filePath);

      return new Promise((resolve, reject) => {
        response.body?.pipe(fileStream);

        fileStream.on('finish', () => {
          resolve({ success: true, filePath });
        });

        fileStream.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
      });

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async restoreBackup(snapshotPath: string): Promise<boolean> {
    try {
      console.log(`Starting Qdrant restore from: ${snapshotPath}`);

      // Upload snapshot to Qdrant
      const uploadResult = await this.uploadSnapshot(snapshotPath);

      if (!uploadResult.success) {
        throw new Error(`Failed to upload snapshot: ${uploadResult.error}`);
      }

      // Restore from snapshot
      const restoreResult = await this.restoreFromSnapshot(uploadResult.snapshotName!);

      if (!restoreResult.success) {
        throw new Error(`Failed to restore from snapshot: ${restoreResult.error}`);
      }

      console.log(`✅ Qdrant restore completed from: ${snapshotPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Qdrant restore failed:`, error.message);
      return false;
    }
  }

  private async uploadSnapshot(filePath: string): Promise<{ success: boolean; snapshotName?: string; error?: string }> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const snapshotName = path.basename(filePath, '.snapshot');

      const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}/snapshots/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(this.options.apiKey && { 'api-key': this.options.apiKey })
        },
        body: fileStream
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      return { success: true, snapshotName };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async restoreFromSnapshot(snapshotName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}/snapshots/${snapshotName}/restore`, {
        method: 'PUT',
        headers: {
          ...(this.options.apiKey && { 'api-key': this.options.apiKey })
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Check file exists and has content
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file does not exist: ${backupPath}`);
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error(`Backup file is empty: ${backupPath}`);
      }

      // For compressed files, check if they're valid
      if (backupPath.endsWith('.gz')) {
        // Try to read the compressed file (basic validation)
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
          const gunzip = spawn('gunzip', ['-t', backupPath]);

          gunzip.on('close', (code) => {
            resolve(code === 0);
          });

          gunzip.on('error', () => {
            resolve(false);
          });
        });
      }

      console.log(`✅ Qdrant backup verification passed: ${backupPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Qdrant backup verification failed:`, error.message);
      return false;
    }
  }

  async cleanupOldBackups(): Promise<number> {
    try {
      const files = fs.readdirSync(this.options.outputDir)
        .filter(file => file.startsWith(`qdrant-backup-${this.options.collectionName}-`))
        .map(file => ({
          name: file,
          path: path.join(this.options.outputDir, file),
          stats: fs.statSync(path.join(this.options.outputDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      let deletedCount = 0;
      for (const file of files.slice(this.options.retentionDays)) {
        if (file.stats.mtime < cutoffDate) {
          fs.unlinkSync(file.path);
          deletedCount++;
          console.log(`🗑️ Deleted old Qdrant backup: ${file.name}`);
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Failed to cleanup old Qdrant backups:', error);
      return 0;
    }
  }

  private async getCollectionInfo() {
    try {
      const response = await fetch(`${this.options.url}/collections/${this.options.collectionName}`, {
        headers: {
          ...(this.options.apiKey && { 'api-key': this.options.apiKey })
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

  private async compressBackup(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.gz`;
    const { spawn } = require('child_process');

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

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
```

### Phase 3: Recovery Procedures & Testing (Day 4-5)

#### 3.1 Disaster Recovery Coordinator
```typescript
// src/lib/backup/disaster-recovery.ts
import { PostgresBackupManager, QdrantBackupManager } from './managers';
import * as fs from 'fs';
import * as path from 'path';

export interface RecoveryPlan {
  id: string;
  name: string;
  description: string;
  steps: RecoveryStep[];
  estimatedDuration: number; // minutes
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
}

export interface RecoveryStep {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automated';
  command?: string;
  script?: string;
  dependencies: string[]; // IDs of steps that must complete first
  timeout: number; // seconds
  retryCount: number;
  validationQuery?: string;
}

export interface RecoveryExecution {
  planId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  completedSteps: string[];
  failedSteps: RecoveryStepResult[];
  log: string[];
}

export interface RecoveryStepResult {
  stepId: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
  retryCount: number;
}

export class DisasterRecoveryCoordinator {
  private plans: Map<string, RecoveryPlan> = new Map();
  private executions: Map<string, RecoveryExecution> = new Map();
  private postgresManager: PostgresBackupManager;
  private qdrantManager: QdrantBackupManager;

  constructor(postgresManager: PostgresBackupManager, qdrantManager: QdrantBackupManager) {
    this.postgresManager = postgresManager;
    this.qdrantManager = qdrantManager;
  }

  registerPlan(plan: RecoveryPlan): void {
    // Validate plan structure
    this.validatePlan(plan);
    this.plans.set(plan.id, plan);
  }

  async executeRecovery(planId: string, options: { dryRun?: boolean } = {}): Promise<RecoveryExecution> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planId}`);
    }

    const executionId = `recovery-${planId}-${Date.now()}`;
    const execution: RecoveryExecution = {
      planId,
      executionId,
      startTime: new Date(),
      status: 'running',
      completedSteps: [],
      failedSteps: [],
      log: [`Starting disaster recovery execution: ${executionId}`]
    };

    this.executions.set(executionId, execution);

    try {
      if (options.dryRun) {
        execution.log.push('DRY RUN MODE - No actual changes will be made');
      }

      // Execute steps in dependency order
      const executedSteps = new Set<string>();
      const remainingSteps = [...plan.steps];

      while (remainingSteps.length > 0) {
        const executableSteps = remainingSteps.filter(step =>
          step.dependencies.every(dep => executedSteps.has(dep))
        );

        if (executableSteps.length === 0) {
          throw new Error('Circular dependency detected in recovery plan');
        }

        // Execute steps in parallel if no dependencies between them
        const stepPromises = executableSteps.map(step => this.executeStep(step, execution, options.dryRun));

        const results = await Promise.allSettled(stepPromises);

        for (let i = 0; i < executableSteps.length; i++) {
          const step = executableSteps[i];
          const result = results[i];

          if (result.status === 'fulfilled') {
            const stepResult = result.value;
            if (stepResult.success) {
              executedSteps.add(step.id);
              execution.completedSteps.push(step.id);
              execution.log.push(`✅ Step completed: ${step.name}`);
            } else {
              execution.failedSteps.push(stepResult);
              execution.log.push(`❌ Step failed: ${step.name} - ${stepResult.error}`);
            }
          } else {
            execution.failedSteps.push({
              stepId: step.id,
              success: false,
              duration: 0,
              error: result.reason.message,
              retryCount: 0
            });
            execution.log.push(`💥 Step crashed: ${step.name} - ${result.reason.message}`);
          }

          // Remove from remaining steps
          const index = remainingSteps.indexOf(step);
          if (index > -1) {
            remainingSteps.splice(index, 1);
          }
        }
      }

      execution.status = execution.failedSteps.length > 0 ? 'failed' : 'completed';
      execution.endTime = new Date();

      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.log.push(`Recovery execution ${execution.status} in ${Math.round(duration / 1000)}s`);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.log.push(`💥 Recovery execution failed: ${error.message}`);
    }

    this.executions.set(executionId, execution);
    return execution;
  }

  private async executeStep(
    step: RecoveryStep,
    execution: RecoveryExecution,
    dryRun: boolean = false
  ): Promise<RecoveryStepResult> {
    const startTime = Date.now();
    execution.currentStep = step.id;

    const result: RecoveryStepResult = {
      stepId: step.id,
      success: false,
      duration: 0,
      retryCount: 0
    };

    for (let attempt = 0; attempt <= step.retryCount; attempt++) {
      try {
        result.retryCount = attempt;

        if (dryRun) {
          execution.log.push(`[DRY RUN] Would execute step: ${step.name}`);
          result.success = true;
          break;
        }

        if (step.type === 'automated' && step.script) {
          result.output = await this.executeScript(step.script);
        } else if (step.type === 'manual' && step.command) {
          result.output = await this.executeCommand(step.command);
        } else {
          throw new Error(`Invalid step configuration: ${step.id}`);
        }

        // Validate step if validation query provided
        if (step.validationQuery) {
          const isValid = await this.validateStep(step.validationQuery);
          if (!isValid) {
            throw new Error('Step validation failed');
          }
        }

        result.success = true;
        break;

      } catch (error) {
        result.error = error.message;

        if (attempt < step.retryCount) {
          execution.log.push(`Retry ${attempt + 1}/${step.retryCount} for step ${step.name}`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between retries
        }
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async executeScript(scriptPath: string): Promise<string> {
    // Execute a Node.js script
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const node = spawn('node', [scriptPath], { stdio: 'pipe' });
      let output = '';
      let errorOutput = '';

      node.stdout.on('data', (data) => {
        output += data.toString();
      });

      node.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      node.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
        }
      });

      node.on('error', reject);
    });
  }

  private async executeCommand(command: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn(`Command stderr: ${stderr}`);
    }

    return stdout;
  }

  private async validateStep(validationQuery: string): Promise<boolean> {
    // Simple validation - could be extended to check database state
    try {
      if (validationQuery.startsWith('postgres:')) {
        // PostgreSQL validation
        const query = validationQuery.replace('postgres:', '');
        // Execute query and check result
        return true; // Placeholder
      } else if (validationQuery.startsWith('qdrant:')) {
        // Qdrant validation
        const query = validationQuery.replace('qdrant:', '');
        // Execute query and check result
        return true; // Placeholder
      }

      return false;
    } catch (error) {
      console.error('Step validation failed:', error);
      return false;
    }
  }

  private validatePlan(plan: RecoveryPlan): void {
    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = plan.steps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of plan.steps) {
      if (hasCycle(step.id)) {
        throw new Error(`Circular dependency detected in recovery plan: ${plan.id}`);
      }
    }
  }

  getPlan(planId: string): RecoveryPlan | undefined {
    return this.plans.get(planId);
  }

  getExecution(executionId: string): RecoveryExecution | undefined {
    return this.executions.get(executionId);
  }

  getRecentExecutions(limit: number = 10): RecoveryExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }
}
```

## Dependencies & Prerequisites

### System Requirements
- Node.js 18+ with TypeScript support
- PostgreSQL client tools (pg_dump, pg_restore)
- Qdrant running and accessible
- File system permissions for backup storage
- Sufficient disk space for backups

### External Dependencies
- node-cron: For scheduled backup execution
- node-fetch: For HTTP requests to Qdrant
- child_process: For executing system commands
- crypto: For checksum calculation

### Knowledge Prerequisites
- Database backup and recovery concepts
- Linux command line tools
- Cron job scheduling
- Disaster recovery planning

## Testing Strategy

### Unit Testing
- Backup manager functionality
- Scheduling system logic
- Recovery plan validation
- Error handling scenarios

### Integration Testing
- End-to-end backup workflows
- Recovery procedure execution
- Cross-system validation
- Performance under load

### Disaster Recovery Testing
- Full system recovery drills
- Partial failure scenarios
- Data consistency validation
- Performance benchmarking

## Success Metrics

### Completion Criteria
- [ ] Automated backup schedules execute successfully
- [ ] Backup verification passes for all backup types
- [ ] Recovery procedures restore system to operational state
- [ ] RTO and RPO objectives are met
- [ ] Backup retention policies are enforced

### Quality Metrics
- [ ] Backup success rate > 99%
- [ ] Recovery time within 4 hours
- [ ] Data loss limited to 1 hour maximum
- [ ] Backup storage costs within budget
- [ ] Monitoring alerts trigger appropriately

## Risk Mitigation

### Technical Risks
1. **Storage Failure:** Multiple backup locations and cloud redundancy
2. **Performance Impact:** Off-peak scheduling and resource monitoring
3. **Data Corruption:** Integrity validation and multiple backup formats
4. **Access Issues:** Secure credential management and access controls

### Operational Risks
1. **Process Failure:** Automated monitoring and alerting
2. **Human Error:** Clear procedures and validation steps
3. **Resource Exhaustion:** Capacity planning and cleanup procedures
4. **Compliance Issues:** Audit logging and retention policies

## Definition of Done

### Code Quality
- [ ] Backup and recovery scripts reviewed and approved
- [ ] Comprehensive error handling and logging implemented
- [ ] Code follows project standards and security practices
- [ ] Unit tests cover all critical functions

### Testing Quality
- [ ] Backup procedures tested successfully
- [ ] Recovery procedures validated in test environment
- [ ] Performance benchmarks meet requirements
- [ ] Integration tests pass for all components

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
- [ ] Scheduling system created
- [ ] Recovery coordinator built

### Testing Phase
- [ ] Unit tests for backup components
- [ ] Integration tests for backup workflows
- [ ] Recovery testing completed
- [ ] Performance validation finished

### Documentation Phase
- [