import {
  encryptCredentials,
  decryptCredentials,
  secureStoreCredentials,
  secureRetrieveCredentials,
  validateCredentialStorage,
  sanitizeCredentials
} from '../../../src/lib/publishing/credentialStorage'

// Mock logger
jest.mock('../../../src/lib/logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('Credential Storage', () => {
  const testCredentials = {
    apiKey: 'test-api-key-123',
    username: 'testuser',
    password: 'secret-password',
    siteUrl: 'https://example.com',
    blogId: 'blog-123'
  }

  const nonSensitiveCredentials = {
    siteUrl: 'https://example.com',
    blogId: 'blog-123',
    category: 'Tech'
  }

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credentials correctly', () => {
      const encrypted = encryptCredentials(testCredentials)
      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)

      const decrypted = decryptCredentials(encrypted)
      expect(decrypted).toEqual(testCredentials)
    })

    it('should produce different encrypted outputs for same input', () => {
      const encrypted1 = encryptCredentials(testCredentials)
      const encrypted2 = encryptCredentials(testCredentials)

      // Due to random IV, encryption should produce different outputs
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty credentials', () => {
      const emptyCredentials = {}
      const encrypted = encryptCredentials(emptyCredentials)
      const decrypted = decryptCredentials(encrypted)
      expect(decrypted).toEqual(emptyCredentials)
    })

    it('should handle complex credential structures', () => {
      const complexCredentials = {
        tokens: {
          access: 'access-token',
          refresh: 'refresh-token'
        },
        metadata: {
          expires: '2025-12-31',
          scopes: ['read', 'write']
        }
      }

      const encrypted = encryptCredentials(complexCredentials)
      const decrypted = decryptCredentials(encrypted)
      expect(decrypted).toEqual(complexCredentials)
    })
  })

  describe('secureStoreCredentials and secureRetrieveCredentials', () => {
    it('should store and retrieve sensitive credentials with encryption', () => {
      const stored = secureStoreCredentials(testCredentials)
      expect(stored).toBeDefined()
      expect(typeof stored).toBe('string')

      const retrieved = secureRetrieveCredentials(stored)
      expect(retrieved).toEqual(testCredentials)
    })

    it('should store non-sensitive credentials as plain JSON', () => {
      const stored = secureStoreCredentials(nonSensitiveCredentials)
      expect(stored).toBeDefined()

      // Should be valid JSON
      expect(() => JSON.parse(stored)).not.toThrow()

      const retrieved = secureRetrieveCredentials(stored)
      expect(retrieved).toEqual(nonSensitiveCredentials)
    })

    it('should detect sensitive data and encrypt accordingly', () => {
      const sensitiveStored = secureStoreCredentials(testCredentials)
      const nonSensitiveStored = secureStoreCredentials(nonSensitiveCredentials)

      // Sensitive data should be encrypted (not valid JSON)
      expect(() => JSON.parse(sensitiveStored)).toThrow()

      // Non-sensitive data should be plain JSON
      expect(() => JSON.parse(nonSensitiveStored)).not.toThrow()
    })

    it('should reject empty credentials', () => {
      expect(() => secureStoreCredentials({})).toThrow('Credentials cannot be empty')
      expect(() => secureStoreCredentials(null as any)).toThrow('Credentials cannot be empty')
      expect(() => secureStoreCredentials(undefined as any)).toThrow('Credentials cannot be empty')
    })

    it('should handle retrieval of invalid data', () => {
      expect(() => secureRetrieveCredentials('')).toThrow('No stored credential data')
      expect(() => secureRetrieveCredentials('invalid-data')).toThrow()
    })
  })

  describe('validateCredentialStorage', () => {
    it('should validate correctly stored credentials', () => {
      const stored = secureStoreCredentials(testCredentials)
      expect(validateCredentialStorage(stored)).toBe(true)
    })

    it('should validate plain JSON credentials', () => {
      const stored = JSON.stringify(nonSensitiveCredentials)
      expect(validateCredentialStorage(stored)).toBe(true)
    })

    it('should reject invalid stored data', () => {
      expect(validateCredentialStorage('invalid')).toBe(false)
      expect(validateCredentialStorage('')).toBe(false)
      expect(validateCredentialStorage('{"invalid": json}')).toBe(false)
    })
  })

  describe('sanitizeCredentials', () => {
    it('should redact sensitive fields', () => {
      const sanitized = sanitizeCredentials(testCredentials)

      expect(sanitized.apiKey).toBe('***REDACTED***')
      expect(sanitized.password).toBe('***REDACTED***')
      expect(sanitized.username).toBe('testuser') // Not sensitive
      expect(sanitized.siteUrl).toBe('https://example.com') // Not sensitive
      expect(sanitized.blogId).toBe('blog-123') // Not sensitive
    })

    it('should handle credentials without sensitive fields', () => {
      const sanitized = sanitizeCredentials(nonSensitiveCredentials)

      expect(sanitized).toEqual(nonSensitiveCredentials)
      expect(sanitized.siteUrl).toBe('https://example.com')
      expect(sanitized.blogId).toBe('blog-123')
      expect(sanitized.category).toBe('Tech')
    })

    it('should handle various sensitive field names', () => {
      const credentialsWithVariousFields = {
        api_key: 'value1',
        API_KEY: 'value2',
        password: 'value3',
        PASSWORD: 'value4',
        token: 'value5',
        TOKEN: 'value6',
        secret: 'value7',
        SECRET: 'value8',
        normalField: 'normal'
      }

      const sanitized = sanitizeCredentials(credentialsWithVariousFields)

      expect(sanitized.api_key).toBe('***REDACTED***')
      expect(sanitized.API_KEY).toBe('***REDACTED***')
      expect(sanitized.password).toBe('***REDACTED***')
      expect(sanitized.PASSWORD).toBe('***REDACTED***')
      expect(sanitized.token).toBe('***REDACTED***')
      expect(sanitized.TOKEN).toBe('***REDACTED***')
      expect(sanitized.secret).toBe('***REDACTED***')
      expect(sanitized.SECRET).toBe('***REDACTED***')
      expect(sanitized.normalField).toBe('normal')
    })

    it('should not modify the original credentials object', () => {
      const original = { ...testCredentials }
      const sanitized = sanitizeCredentials(testCredentials)

      expect(testCredentials).toEqual(original)
      expect(sanitized).not.toBe(testCredentials)
    })

    it('should handle empty credentials', () => {
      const sanitized = sanitizeCredentials({})
      expect(sanitized).toEqual({})
    })
  })

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', () => {
      // Mock a scenario that might cause encryption to fail
      const invalidCredentials = {
        circular: {} as any
      }
      invalidCredentials.circular = invalidCredentials

      expect(() => encryptCredentials(invalidCredentials)).toThrow('Failed to encrypt credentials')
    })

    it('should handle decryption errors gracefully', () => {
      expect(() => decryptCredentials('invalid-base64')).toThrow('Failed to decrypt credentials')
      expect(() => decryptCredentials('dGhpcyBpcyBub3QgZW5jcnlwdGVk')).toThrow('Failed to decrypt credentials')
    })
  })

  describe('Environment-based Key Generation', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should use environment variables for key generation', () => {
      process.env.PUBLISHING_ENCRYPTION_KEY = 'custom-key'
      process.env.PUBLISHING_ENCRYPTION_SALT = 'custom-salt'

      // Re-import to get new key generation
      const { encryptCredentials: newEncrypt, decryptCredentials: newDecrypt } =
        require('../../../src/lib/publishing/credentialStorage')

      const encrypted = newEncrypt(testCredentials)
      const decrypted = newDecrypt(encrypted)

      expect(decrypted).toEqual(testCredentials)
    })

    it('should throw error when environment variables are not set', () => {
      delete process.env.PUBLISHING_ENCRYPTION_KEY
      delete process.env.PUBLISHING_ENCRYPTION_SALT

      // Re-import to trigger new key generation
      const { encryptCredentials: defaultEncrypt } =
        require('../../../src/lib/publishing/credentialStorage')

      expect(() => defaultEncrypt(testCredentials)).toThrow(
        'Failed to encrypt credentials'
      )
    })
  })
})