import { PrismaClient } from '@prisma/client'
import { secureStoreCredentials, secureRetrieveCredentials } from '../publishing/credentialStorage'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

export interface UserProfile {
  id: string
  email: string
  name?: string
  bio?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  [key: string]: any
}

export interface CreateUserData {
  email: string
  name?: string
  bio?: string
  avatar?: string
}

export interface UpdateUserData {
  name?: string
  bio?: string
  avatar?: string
}

export interface UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export class UserService {
  /**
   * Create a new user account
   */
  async createUser(userData: CreateUserData): Promise<UserProfile> {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          bio: userData.bio,
          avatar: userData.avatar
        }
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        bio: user.bio || undefined,
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('User with this email already exists')
      }
      throw new Error('Failed to create user account')
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        bio: user.bio || undefined,
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      throw new Error('Failed to retrieve user profile')
    }
  }

  /**
   * Get user profile by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        bio: user.bio || undefined,
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      throw new Error('Failed to retrieve user profile')
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<UserProfile> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: updateData.name,
          bio: updateData.bio,
          avatar: updateData.avatar,
          updatedAt: new Date()
        }
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        bio: user.bio || undefined,
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      throw new Error('Failed to update user profile')
    }
  }

  /**
   * Delete user account and all associated data
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Delete in order to maintain referential integrity
      await prisma.$transaction(async (tx) => {
        // Delete user sessions
        await tx.userSession.deleteMany({
          where: { userId }
        })

        // Delete user preferences
        await tx.userPreference.deleteMany({
          where: { userId }
        })

        // Delete user settings
        await tx.userSettings.deleteMany({
          where: { userId }
        })

        // Delete user (this will cascade to related content, feeds, etc.)
        await tx.user.delete({
          where: { id: userId }
        })
      })
    } catch (error) {
      throw new Error('Failed to delete user account')
    }
  }

  /**
   * Create a new user session
   */
  async createSession(userId: string, options: {
    ipAddress?: string
    userAgent?: string
    expiresInHours?: number
  } = {}): Promise<UserSession> {
    try {
      const { ipAddress, userAgent, expiresInHours = 24 } = options

      // Generate a secure random token
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

      const session = await prisma.userSession.create({
        data: {
          userId,
          token,
          expiresAt,
          ipAddress,
          userAgent
        }
      })

      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        createdAt: session.createdAt
      }
    } catch (error) {
      throw new Error('Failed to create user session')
    }
  }

  /**
   * Validate and get session by token
   */
  async validateSession(token: string): Promise<UserProfile | null> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true }
      })

      if (!session) return null

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        // Clean up expired session
        await prisma.userSession.delete({
          where: { id: session.id }
        })
        return null
      }

      const user = session.user
      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        bio: user.bio || undefined,
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      throw new Error('Failed to validate session')
    }
  }

  /**
   * Delete user session (logout)
   */
  async deleteSession(token: string): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: { token }
      })
    } catch (error) {
      throw new Error('Failed to delete session')
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
      return result.count
    } catch (error) {
      throw new Error('Failed to cleanup expired sessions')
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = await prisma.userPreference.findMany({
        where: { userId }
      })

      const result: UserPreferences = {}

      for (const pref of preferences) {
        try {
          // Try to parse as JSON first, then decrypt if needed
          if (pref.isEncrypted) {
            result[pref.key] = secureRetrieveCredentials(pref.value)
          } else {
            result[pref.key] = JSON.parse(pref.value)
          }
        } catch {
          // If parsing fails, treat as string
          result[pref.key] = pref.value
        }
      }

      return result
    } catch (error) {
      throw new Error('Failed to retrieve user preferences')
    }
  }

  /**
   * Set user preference
   */
  async setUserPreference(
    userId: string,
    key: string,
    value: any,
    options: {
      category?: string
      encrypt?: boolean
    } = {}
  ): Promise<void> {
    try {
      const { category, encrypt = false } = options

      // Serialize the value
      let storedValue: string
      if (encrypt) {
        storedValue = secureStoreCredentials(value)
      } else {
        storedValue = typeof value === 'string' ? value : JSON.stringify(value)
      }

      await prisma.userPreference.upsert({
        where: {
          userId_key: {
            userId,
            key
          }
        },
        update: {
          value: storedValue,
          category,
          isEncrypted: encrypt,
          updatedAt: new Date()
        },
        create: {
          userId,
          key,
          value: storedValue,
          category,
          isEncrypted: encrypt
        }
      })
    } catch (error) {
      throw new Error('Failed to set user preference')
    }
  }

  /**
   * Delete user preference
   */
  async deleteUserPreference(userId: string, key: string): Promise<void> {
    try {
      await prisma.userPreference.deleteMany({
        where: {
          userId,
          key
        }
      })
    } catch (error) {
      throw new Error('Failed to delete user preference')
    }
  }

  /**
   * Export user data for backup/download
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
          preferences: true,
          sessions: {
            select: {
              id: true,
              expiresAt: true,
              ipAddress: true,
              userAgent: true,
              createdAt: true
            }
          }
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Format preferences for export
      const preferences: UserPreferences = {}
      for (const pref of user.preferences) {
        try {
          if (pref.isEncrypted) {
            preferences[pref.key] = secureRetrieveCredentials(pref.value)
          } else {
            preferences[pref.key] = JSON.parse(pref.value)
          }
        } catch {
          preferences[pref.key] = pref.value
        }
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        settings: user.settings,
        preferences,
        sessions: user.sessions,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    } catch (error) {
      throw new Error('Failed to export user data')
    }
  }

  /**
   * Import user data from backup
   */
  async importUserData(userId: string, importData: any): Promise<void> {
    try {
      const { user, settings, preferences, version } = importData

      if (version !== '1.0') {
        throw new Error('Unsupported import data version')
      }

      // Update user profile
      if (user.name || user.bio || user.avatar) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: user.name,
            bio: user.bio,
            avatar: user.avatar,
            updatedAt: new Date()
          }
        })
      }

      // Update settings
      if (settings) {
        await prisma.userSettings.upsert({
          where: { userId },
          update: {
            defaultModel: settings.defaultModel,
            defaultStyle: settings.defaultStyle,
            defaultLength: settings.defaultLength,
            theme: settings.theme,
            language: settings.language,
            updatedAt: new Date()
          },
          create: {
            userId,
            defaultModel: settings.defaultModel || 'llama2:7b',
            defaultStyle: settings.defaultStyle || 'professional',
            defaultLength: settings.defaultLength || 'medium',
            theme: settings.theme || 'light',
            language: settings.language || 'en'
          }
        })
      }

      // Update preferences
      if (preferences) {
        for (const [key, value] of Object.entries(preferences)) {
          // Determine if this should be encrypted (sensitive data)
          const encrypt = this.shouldEncryptPreference(key, value)
          await this.setUserPreference(userId, key, value, { encrypt })
        }
      }
    } catch (error) {
      throw new Error('Failed to import user data')
    }
  }

  /**
   * Determine if a preference should be encrypted
   */
  private shouldEncryptPreference(key: string, value: any): boolean {
    const sensitiveKeys = [
      'apiKey', 'password', 'token', 'secret', 'key',
      'credentials', 'auth', 'private'
    ]

    return sensitiveKeys.some(sensitiveKey =>
      key.toLowerCase().includes(sensitiveKey)
    ) || (typeof value === 'string' && value.length > 100) // Long strings might be sensitive
  }
}

// Export singleton instance
export const userService = new UserService()