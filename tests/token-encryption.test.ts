import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";

process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("a token round-trips through encrypt and decrypt", () => {
  const plaintext = "gho_super-secret-access-token";
  const encrypted = encryptToken(plaintext);
  assert.equal(decryptToken(encrypted), plaintext);
});

test("two encryptions of the same plaintext use different IVs and ciphertext", () => {
  const first = encryptToken("same-token-value");
  const second = encryptToken("same-token-value");
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

function flipFirstByte(base64: string): string {
  const bytes = Buffer.from(base64, "base64");
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return bytes.toString("base64");
}

test("decrypting with a tampered ciphertext fails authentication", () => {
  const encrypted = encryptToken("gho_super-secret-access-token");
  const tampered = {
    ...encrypted,
    ciphertext: flipFirstByte(encrypted.ciphertext),
  };
  assert.throws(() => decryptToken(tampered));
});

test("decrypting with a tampered auth tag fails authentication", () => {
  const encrypted = encryptToken("gho_super-secret-access-token");
  const tampered = { ...encrypted, authTag: flipFirstByte(encrypted.authTag) };
  assert.throws(() => decryptToken(tampered));
});
