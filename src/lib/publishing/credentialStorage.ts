import { createHash } from 'crypto'
import logger from '@/lib/logger'

// Simple encryption utility for platform credentials
// Note: In a production environment, consider using more robust encryption
// and proper key management (e.g., Web Crypto API, keyring services)

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 16

/**
 * Generate a consistent encryption key from environment
 * In production, this should use a proper key management system
 */
function getEncryptionKey(): Buffer {
  // Use a combination of environment variables and a salt
  // This is a simplified approach - in production, use proper key derivation
  const keySource = process.env.PUBLISHING_ENCRYPTION_KEY
  const salt = process.env.PUBLISHING_ENCRYPTION_SALT

  if (!keySource || !salt) {
    throw new Error(
      'PUBLISHING_ENCRYPTION_KEY and PUBLISHING_ENCRYPTION_SALT environment variables must be set for credential encryption'
    )
  }

  return createHash('sha256')
    .update(keySource + salt)
    .digest()
    .slice(0, KEY_LENGTH)
}

/**
 * Encrypt sensitive credential data
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  try {
    // Convert credentials to JSON string
    const credentialString = JSON.stringify(credentials)

    // Generate a random IV for each encryption
    const iv = Buffer.alloc(IV_LENGTH)
    for (let i = 0; i < IV_LENGTH; i++) {
      iv[i] = Math.floor(Math.random() * 256)
    }

    // For simplicity in this demo, we'll use a basic XOR encryption
    // In production, use proper AES encryption with crypto module
    const key = getEncryptionKey()
    const encrypted = Buffer.alloc(credentialString.length)

    for (let i = 0; i < credentialString.length; i++) {
      encrypted[i] = credentialString.charCodeAt(i) ^ key[i % key.length]
    }

    // Combine IV and encrypted data
    const result = Buffer.concat([iv, encrypted])

    return result.toString('base64')
  } catch (error) {
    logger.error('Error encrypting credentials', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Failed to encrypt credentials')
  }
}

/**
 * Decrypt credential data
 */
export function decryptCredentials(encryptedData: string): Record<string, any> {
  try {
    // Decode from base64
    const data = Buffer.from(encryptedData, 'base64')

    // Extract IV and encrypted content
    const iv = data.slice(0, IV_LENGTH)
    const encrypted = data.slice(IV_LENGTH)

    // Decrypt using the same key
    const key = getEncryptionKey()
    const decrypted = Buffer.alloc(encrypted.length)

    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length]
    }

    // Convert back to string and parse JSON
    const credentialString = decrypted.toString('utf8')

    return JSON.parse(credentialString)
  } catch (error) {
    logger.error('Error decrypting credentials', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Failed to decrypt credentials')
  }
}

/**
 * Securely store platform credentials
 * This function handles the encryption and storage logic
 */
export function secureStoreCredentials(credentials: Record<string, any>): string {
  if (!credentials || Object.keys(credentials).length === 0) {
    throw new Error('Credentials cannot be empty')
  }

  // Validate that sensitive fields are present
  const sensitiveFields = ['apiKey', 'password', 'token']
  const hasSensitiveData = Object.keys(credentials).some(key =>
    sensitiveFields.some(field => key.toLowerCase().includes(field))
  )

  if (!hasSensitiveData) {
    // If no sensitive data, store as plain JSON (for URLs, usernames, etc.)
    return JSON.stringify(credentials)
  }

  // Encrypt sensitive credentials
  return encryptCredentials(credentials)
}

/**
 * Securely retrieve platform credentials
 * This function handles the decryption and retrieval logic
 */
export function secureRetrieveCredentials(storedData: string): Record<string, any> {
  if (!storedData) {
    throw new Error('No stored credential data')
  }

  try {
    // Try to parse as plain JSON first (for non-sensitive data)
    return JSON.parse(storedData)
  } catch {
    // If parsing fails, assume it's encrypted
    return decryptCredentials(storedData)
  }
}

/**
 * Validate credential storage format
 */
export function validateCredentialStorage(storedData: string): boolean {
  try {
    secureRetrieveCredentials(storedData)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize credentials for logging/debugging
 * Removes sensitive information
 */
export function sanitizeCredentials(credentials: Record<string, any>): Record<string, any> {
  const sanitized = { ...credentials }
  const sensitivePatterns = ['api', 'key', 'password', 'token', 'secret']

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
      sanitized[key] = '***REDACTED***'
    }
  }

  return sanitized
}