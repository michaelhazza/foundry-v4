import crypto from 'crypto';
import { env, features } from '../config/env';

/**
 * Generate a secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Encrypt sensitive data (API credentials, etc.)
 * Falls back to plaintext if ENCRYPTION_KEY not set
 */
export function encrypt(text: string): string {
  if (!features.encryption || !env.ENCRYPTION_KEY) {
    // Return plaintext with marker in dev mode
    return `plain:${text}`;
  }

  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(env.ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `enc:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  // Handle plaintext fallback
  if (encryptedText.startsWith('plain:')) {
    return encryptedText.slice(6);
  }

  if (!env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY required to decrypt data');
  }

  const parts = encryptedText.split(':');
  if (parts[0] !== 'enc' || parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const key = crypto.scryptSync(env.ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
