import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Symmetric encryption for secrets that must be stored reversibly (e.g. a
// college's SMTP password) — unlike bcrypt (one-way, used for login passwords),
// this needs to be decrypted again to actually send mail.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.EMAIL_CREDENTIALS_KEY;
  if (!raw) throw new Error('EMAIL_CREDENTIALS_KEY is not configured');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('EMAIL_CREDENTIALS_KEY must decode to 32 bytes (generate: openssl rand -base64 32)');
  }
  return key;
}

/** Encrypts a plaintext secret to a single base64 string (iv + authTag + ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** Reverses encryptSecret(). Throws if the key is wrong or the value was tampered with. */
export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
