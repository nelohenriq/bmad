import { UserService } from '../../../src/lib/user/userService'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    userPreference: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn()
    },
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    },
    userSettings: {
      upsert: jest.fn()
    },
    $transaction: jest.fn((callback) => callback({
      userSession: {
        deleteMany: jest.fn()
      },
      userPreference: {
        deleteMany: jest.fn()
      },
      user: {
        delete: jest.fn()
      }
    }))
  }))
}))

describe('UserService', () => {
  let userService: UserService
  let mockPrisma: any

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the singleton instance
    userService = new UserService()
    mockPrisma = (userService as any).prisma
  })

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg'
      }

      const mockUser = {
        id: 'user-1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.user.create.mockResolvedValue(mockUser)

      const result = await userService.createUser(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData
      })
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })

    it('should throw error for duplicate email', async () => {
      mockPrisma.user.create.mockRejectedValue(new Error('Unique constraint failed'))

      await expect(userService.createUser({
        email: 'existing@example.com'
      })).rejects.toThrow('User with this email already exists')
    })
  })

  describe('getUserById', () => {
    it('should return user profile when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await userService.getUserById('user-1')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await userService.getUserById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio'
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
        bio: 'Updated bio',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.user.update.mockResolvedValue(mockUser)

      const result = await userService.updateUser('user-1', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: 'Updated Name',
          bio: 'Updated bio',
          updatedAt: new Date()
        }
      })
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
        bio: 'Updated bio',
        avatar: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })
  })

  describe('deleteUser', () => {
    it('should delete user and all associated data', async () => {
      const mockTransaction = jest.fn((callback) => callback({
        userSession: { deleteMany: jest.fn() },
        userPreference: { deleteMany: jest.fn() },
        user: { delete: jest.fn() }
      }))

      mockPrisma.$transaction = mockTransaction

      await userService.deleteUser('user-1')

      expect(mockTransaction).toHaveBeenCalled()
    })
  })

  describe('createSession', () => {
    it('should create a new session with default expiration', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'mock-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        createdAt: new Date()
      }

      mockPrisma.userSession.create.mockResolvedValue(mockSession)

      const result = await userService.createSession('user-1', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      })

      expect(mockPrisma.userSession.create).toHaveBeenCalled()
      expect(result.token).toBeDefined()
      expect(result.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('validateSession', () => {
    it('should return user profile for valid session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Future date
        createdAt: new Date(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          bio: null,
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession)

      const result = await userService.validateSession('valid-token')

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        bio: undefined,
        avatar: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })

    it('should return null for expired session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Past date
        createdAt: new Date(),
        user: { id: 'user-1' }
      }

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession)
      mockPrisma.userSession.delete.mockResolvedValue(mockSession)

      const result = await userService.validateSession('expired-token')

      expect(mockPrisma.userSession.delete).toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should return null for non-existent session', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null)

      const result = await userService.validateSession('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('getUserPreferences', () => {
    it('should return parsed user preferences', async () => {
      const mockPreferences = [
        {
          userId: 'user-1',
          key: 'theme',
          value: '"dark"',
          category: 'ui',
          isEncrypted: false
        },
        {
          userId: 'user-1',
          key: 'notifications.enabled',
          value: 'true',
          category: 'notifications',
          isEncrypted: false
        }
      ]

      mockPrisma.userPreference.findMany.mockResolvedValue(mockPreferences)

      const result = await userService.getUserPreferences('user-1')

      expect(result).toEqual({
        theme: 'dark',
        'notifications.enabled': true
      })
    })

    it('should handle encrypted preferences', async () => {
      const mockPreferences = [
        {
          userId: 'user-1',
          key: 'apiKey',
          value: 'encrypted-data',
          category: 'ai',
          isEncrypted: true
        }
      ]

      mockPrisma.userPreference.findMany.mockResolvedValue(mockPreferences)

      // Mock the decrypt function
      const mockDecrypt = jest.spyOn(require('../../../src/lib/publishing/credentialStorage'), 'secureRetrieveCredentials')
      mockDecrypt.mockReturnValue('decrypted-api-key')

      const result = await userService.getUserPreferences('user-1')

      expect(mockDecrypt).toHaveBeenCalledWith('encrypted-data')
      expect(result).toEqual({
        apiKey: 'decrypted-api-key'
      })

      mockDecrypt.mockRestore()
    })
  })

  describe('setUserPreference', () => {
    it('should set preference without encryption', async () => {
      mockPrisma.userPreference.upsert.mockResolvedValue({})

      await userService.setUserPreference('user-1', 'theme', 'dark', {
        category: 'ui'
      })

      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_key: {
            userId: 'user-1',
            key: 'theme'
          }
        },
        update: {
          value: '"dark"',
          category: 'ui',
          isEncrypted: false,
          updatedAt: expect.any(Date)
        },
        create: {
          userId: 'user-1',
          key: 'theme',
          value: '"dark"',
          category: 'ui',
          isEncrypted: false
        }
      })
    })

    it('should encrypt sensitive preferences', async () => {
      mockPrisma.userPreference.upsert.mockResolvedValue({})

      const mockEncrypt = jest.spyOn(require('../../../src/lib/publishing/credentialStorage'), 'secureStoreCredentials')
      mockEncrypt.mockReturnValue('encrypted-data')

      await userService.setUserPreference('user-1', 'apiKey', 'secret-key', {
        encrypt: true
      })

      expect(mockEncrypt).toHaveBeenCalledWith('secret-key')
      expect(mockPrisma.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            value: 'encrypted-data',
            isEncrypted: true
          }),
          create: expect.objectContaining({
            value: 'encrypted-data',
            isEncrypted: true
          })
        })
      )

      mockEncrypt.mockRestore()
    })
  })

  describe('exportUserData', () => {
    it('should export complete user data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          id: 'settings-1',
          userId: 'user-1',
          defaultModel: 'llama2:7b',
          defaultStyle: 'professional',
          defaultLength: 'medium',
          theme: 'dark',
          language: 'en',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        preferences: [
          {
            userId: 'user-1',
            key: 'theme',
            value: '"dark"',
            category: 'ui',
            isEncrypted: false
          }
        ],
        sessions: [
          {
            id: 'session-1',
            userId: 'user-1',
            expiresAt: new Date(),
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent',
            createdAt: new Date()
          }
        ]
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await userService.exportUserData('user-1')

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('settings')
      expect(result).toHaveProperty('preferences')
      expect(result).toHaveProperty('sessions')
      expect(result).toHaveProperty('exportedAt')
      expect(result).toHaveProperty('version', '1.0')
    })
  })

  describe('importUserData', () => {
    it('should import user data successfully', async () => {
      const importData = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Imported User',
          bio: 'Imported bio',
          avatar: 'https://example.com/avatar.jpg',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        settings: {
          id: 'settings-1',
          userId: 'user-1',
          defaultModel: 'llama2:7b',
          defaultStyle: 'professional',
          defaultLength: 'medium',
          theme: 'dark',
          language: 'en',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        preferences: {
          'theme': 'dark',
          'notifications.enabled': true
        },
        sessions: [],
        exportedAt: '2025-01-01T00:00:00Z',
        version: '1.0'
      }

      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.userSettings.upsert.mockResolvedValue({})

      await userService.importUserData('user-1', importData)

      expect(mockPrisma.user.update).toHaveBeenCalled()
      expect(mockPrisma.userSettings.upsert).toHaveBeenCalled()
    })

    it('should reject import with wrong version', async () => {
      const importData = {
        ...{},
        version: '2.0'
      } as any

      await expect(userService.importUserData('user-1', importData))
        .rejects.toThrow('Unsupported import data version')
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions and return count', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 5 })

      const result = await userService.cleanupExpiredSessions()

      expect(result).toBe(5)
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      })
    })
  })
})