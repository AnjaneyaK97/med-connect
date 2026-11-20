import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedEnvelope {
  version: 'v1';
  encryptedDek: string; // Base64 DEK encrypted with KEK
  iv: string;           // Base64 Initialization Vector
  authTag: string;      // Base64 GCM Authentication Tag
  ciphertext: string;   // Base64 Ciphertext
}

export class EncryptionService {
  private static masterKey: Buffer;

  private static getMasterKey(): Buffer {
    if (!this.masterKey) {
      const rawKey = config.encryptionMasterKey;
      if (!rawKey) {
        throw new Error('ENCRYPTION_MASTER_KEY is not defined in configuration.');
      }

      // If hex string (64 chars), parse as hex; otherwise hash to derive 32-byte key
      if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
        this.masterKey = Buffer.from(rawKey, 'hex');
      } else {
        this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
      }
    }
    return this.masterKey;
  }

  /**
   * Encrypts plaintext using Envelope Encryption (AES-256-GCM).
   * Generates a fresh ephemeral Data Encryption Key (DEK) per record,
   * encrypts the DEK using the Key Encryption Key (KEK / Master Key),
   * and returns a serialized string format: v1:encryptedDek:iv:authTag:ciphertext
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const kek = this.getMasterKey();

    // 1. Generate ephemeral DEK (32 bytes)
    const dek = crypto.randomBytes(KEY_LENGTH);

    // 2. Encrypt DEK with KEK using AES-256-GCM
    const dekIv = crypto.randomBytes(IV_LENGTH);
    const dekCipher = crypto.createCipheriv(ALGORITHM, kek, dekIv);
    const encryptedDekBody = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();
    // Pack dekIv + dekAuthTag + encryptedDekBody
    const encryptedDekPacked = Buffer.concat([dekIv, dekAuthTag, encryptedDekBody]).toString('base64');

    // 3. Encrypt data with DEK using AES-256-GCM
    const dataIv = crypto.randomBytes(IV_LENGTH);
    const dataCipher = crypto.createCipheriv(ALGORITHM, dek, dataIv);
    const ciphertext = Buffer.concat([
      dataCipher.update(plaintext, 'utf8'),
      dataCipher.final(),
    ]).toString('base64');
    const authTag = dataCipher.getAuthTag().toString('base64');

    // 4. Return serialized envelope
    return `v1:${encryptedDekPacked}:${dataIv.toString('base64')}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypts an envelope-encrypted string.
   */
  public static decrypt(serializedEnvelope: string): string {
    if (!serializedEnvelope) return serializedEnvelope;

    // Check version prefix
    const parts = serializedEnvelope.split(':');
    if (parts.length !== 5 || parts[0] !== 'v1') {
      throw new Error('Invalid or unsupported encrypted envelope format.');
    }

    const [, encryptedDekPackedB64, dataIvB64, authTagB64, ciphertextB64] = parts;

    const kek = this.getMasterKey();

    // 1. Unpack and decrypt DEK
    const encryptedDekPacked = Buffer.from(encryptedDekPackedB64, 'base64');
    if (encryptedDekPacked.length < IV_LENGTH + 16) {
      throw new Error('Corrupted DEK payload.');
    }
    const dekIv = encryptedDekPacked.subarray(0, IV_LENGTH);
    const dekAuthTag = encryptedDekPacked.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encryptedDekBody = encryptedDekPacked.subarray(IV_LENGTH + 16);

    const dekDecipher = crypto.createDecipheriv(ALGORITHM, kek, dekIv);
    dekDecipher.setAuthTag(dekAuthTag);
    const dek = Buffer.concat([dekDecipher.update(encryptedDekBody), dekDecipher.final()]);

    // 2. Decrypt data using DEK
    const dataIv = Buffer.from(dataIvB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const dataDecipher = crypto.createDecipheriv(ALGORITHM, dek, dataIv);
    dataDecipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([dataDecipher.update(ciphertext), dataDecipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Helper to encrypt specific object fields in-place
   */
  public static encryptFields<T extends Record<string, any>>(obj: T, fields: Array<keyof T>): T {
    const copy = { ...obj };
    for (const field of fields) {
      if (typeof copy[field] === 'string') {
        copy[field] = this.encrypt(copy[field] as string) as any;
      }
    }
    return copy;
  }

  /**
   * Helper to decrypt specific object fields in-place
   */
  public static decryptFields<T extends Record<string, any>>(obj: T, fields: Array<keyof T>): T {
    const copy = { ...obj };
    for (const field of fields) {
      if (typeof copy[field] === 'string' && (copy[field] as string).startsWith('v1:')) {
        copy[field] = this.decrypt(copy[field] as string) as any;
      }
    }
    return copy;
  }
}
