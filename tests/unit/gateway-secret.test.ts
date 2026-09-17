import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import {
  decryptGatewaySecret,
  encryptGatewaySecret,
} from "@/model-gateways/gateway-secret";

process.env.MODEL_GATEWAY_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("a gateway secret round-trips through encrypt and decrypt", () => {
  const plaintext = "sk-super-secret-gateway-key";
  const encrypted = encryptGatewaySecret(plaintext);
  assert.equal(decryptGatewaySecret(encrypted), plaintext);
});

test("two encryptions of the same plaintext use different IVs and ciphertext", () => {
  const first = encryptGatewaySecret("same-key-value");
  const second = encryptGatewaySecret("same-key-value");
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
});

function flipFirstByte(base64: string): string {
  const bytes = Buffer.from(base64, "base64");
  bytes[0] = (bytes[0] ?? 0) ^ 1;
  return bytes.toString("base64");
}

test("decrypting with a tampered ciphertext fails authentication", () => {
  const encrypted = encryptGatewaySecret("sk-super-secret-gateway-key");
  const tampered = {
    ...encrypted,
    ciphertext: flipFirstByte(encrypted.ciphertext),
  };
  assert.throws(() => decryptGatewaySecret(tampered));
});

test("decrypting with a tampered auth tag fails authentication", () => {
  const encrypted = encryptGatewaySecret("sk-super-secret-gateway-key");
  const tampered = { ...encrypted, authTag: flipFirstByte(encrypted.authTag) };
  assert.throws(() => decryptGatewaySecret(tampered));
});
