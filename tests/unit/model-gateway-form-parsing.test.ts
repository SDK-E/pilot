import assert from "node:assert/strict";
import { test } from "node:test";

import { gatewayFromForm } from "@/model-gateways/gateway-form-schema";

function formDataFor(enabledValue: string | undefined): FormData {
  const formData = new FormData();
  formData.set("name", "Test gateway");
  formData.set("baseUrl", "https://api.example.com/v1");
  formData.set("apiKey", "sk-test");
  formData.set("allowedModelIds", "model-a, model-b");
  if (enabledValue !== undefined) formData.set("enabled", enabledValue);
  return formData;
}

test('gatewayFromForm reads the Switch\'s actual submitted value ("true") as enabled', () => {
  const result = gatewayFromForm(formDataFor("true"));
  assert.ok("gateway" in result);
  assert.equal(result.gateway.enabled, true);
});

test("gatewayFromForm treats an absent enabled field (unchecked Switch) as disabled", () => {
  const result = gatewayFromForm(formDataFor(undefined));
  assert.ok("gateway" in result);
  assert.equal(result.gateway.enabled, false);
});

test('gatewayFromForm does not treat Radix\'s bare bubble-input default ("on") as enabled', () => {
  const result = gatewayFromForm(formDataFor("on"));
  assert.ok("gateway" in result);
  assert.equal(
    result.gateway.enabled,
    false,
    'the Switch must pass value="true" explicitly — "on" is not recognized',
  );
});
