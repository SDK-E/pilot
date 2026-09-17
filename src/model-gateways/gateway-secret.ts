import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Same AES-256-GCM shape as `connectors/token-encryption.ts`, kept as its
 * own module with its own key (`MODEL_GATEWAY_ENCRYPTION_KEY`) so rotating
 * one secret family never touches the other.
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

const keyCache: { current?: Buffer } = {};

function encryptionKey(): Buffer {
  if (keyCache.current) return keyCache.current;
  const raw = process.env.MODEL_GATEWAY_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "MODEL_GATEWAY_ENCRYPTION_KEY is required to store model gateway credentials.",
    );
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `MODEL_GATEWAY_ENCRYPTION_KEY must decode to ${KEY_LENGTH_BYTES} bytes (got ${decoded.length}).`,
    );
  }
  keyCache.current = decoded;
  return decoded;
}

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptGatewaySecret(plaintext: string): EncryptedSecret {
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

export function decryptGatewaySecret(input: EncryptedSecret): string {
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
