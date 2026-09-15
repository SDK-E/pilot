import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

const keyCache: { current?: Buffer } = {};

/**
 * `CONNECTOR_TOKEN_ENCRYPTION_KEY` must be 32 raw bytes, base64-encoded.
 * Validated once at first use, mirroring the fail-fast style of
 * `src/ai/workos-m2m.ts`'s env var loaders.
 */
function encryptionKey(): Buffer {
  if (keyCache.current) return keyCache.current;
  const raw = process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "CONNECTOR_TOKEN_ENCRYPTION_KEY is required to store connector tokens.",
    );
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `CONNECTOR_TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH_BYTES} bytes (got ${decoded.length}).`,
    );
  }
  keyCache.current = decoded;
  return decoded;
}

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * AES-256-GCM with a fresh random IV per call — never reuse or derive one.
 */
export function encryptToken(plaintext: string): EncryptedToken {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptToken(input: EncryptedToken): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
