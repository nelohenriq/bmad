import { promises as fs } from 'fs'
import { join } from 'path'
import { prisma } from './prisma'

export interface BackupResult {
  success: boolean
  backupPath?: string
  error?: string
}

export interface RestoreResult {
  success: boolean
  error?: string
}

export class BackupService {
  private dbPath: string

  constructor(dbPath = './prisma/dev.db') {
    this.dbPath = dbPath
  }

  /**
   * Create a backup of the SQLite database
   * @param backupDir Directory to store the backup
   * @param filename Optional custom filename for backup
   * @returns BackupResult with success status and backup path
   */
  async createBackup(backupDir = './backups', filename?: string): Promise<BackupResult> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true })

      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFilename = filename || `backup-${timestamp}.db`
      const backupPath = join(backupDir, backupFilename)

      // Copy the database file
      await fs.copyFile(this.dbPath, backupPath)

      return {
        success: true,
        backupPath
      }
    } catch (error) {
      return {
        success: false,
        error: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Restore database from backup
   * @param backupPath Path to the backup file
   * @returns RestoreResult with success status
   */
  async restoreFromBackup(backupPath: string): Promise<RestoreResult> {
    try {
      // Verify backup file exists
      await fs.access(backupPath)

      // Create backup of current database before restore (safety measure)
      const safetyBackup = await this.createBackup('./backups', 'pre-restore-safety-backup.db')

      // Copy backup file to database location
      await fs.copyFile(backupPath, this.dbPath)

      // Disconnect and reconnect Prisma to ensure clean state
      await prisma.$disconnect()
      // Note: In a real app, you'd want to reconnect or restart the connection pool

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * List available backups in a directory
   * @param backupDir Directory to scan for backups
   * @returns Array of backup filenames sorted by modification time (newest first)
   */
  async listBackups(backupDir = './backups'): Promise<string[]> {
    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = files.filter(file => file.endsWith('.db') && file.startsWith('backup-'))

      // Sort by modification time (newest first)
      const sortedFiles = await Promise.all(
        backupFiles.map(async (file) => {
          const stat = await fs.stat(join(backupDir, file))
          return { file, mtime: stat.mtime }
        })
      )

      return sortedFiles
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .map(item => item.file)
    } catch (error) {
      // If directory doesn't exist, return empty array
      return []
    }
  }

  /**
   * Get backup information
   * @param backupPath Path to backup file
   * @returns Backup metadata
   */
  async getBackupInfo(backupPath: string) {
    try {
      const stat = await fs.stat(backupPath)
      return {
        path: backupPath,
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime
      }
    } catch (error) {
      throw new Error(`Cannot access backup file: ${backupPath}`)
    }
  }
}

export const backupService = new BackupService()