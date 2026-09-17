import { z } from "zod";

import { optionalText } from "@/lib/form-data";

import type { ModelGatewayConfiguration } from "@/model-gateways/model-gateway-repository";

const gatewayFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  baseUrl: z.url("Enter the gateway's base URL.").max(500),
  apiKey: z.string().trim().max(2000).optional(),
  allowedModelIds: z
    .string()
    .trim()
    .min(1, "List at least one model id.")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  enabled: z.boolean(),
});

/**
 * The `enabled` Switch submits `value="true"` when checked (see
 * `model-gateway-form.tsx`) and is absent from FormData when unchecked —
 * never Radix's bubble-input default of `"on"`.
 */
export function gatewayFromForm(
  formData: FormData,
): { gateway: ModelGatewayConfiguration } | { error: string } {
  const parsed = gatewayFormSchema.safeParse({
    name: formData.get("name"),
    baseUrl: formData.get("baseUrl"),
    apiKey: optionalText(formData, "apiKey"),
    allowedModelIds: formData.get("allowedModelIds"),
    enabled: formData.get("enabled") === "true",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the gateway details.",
    };
  }
  return {
    gateway: {
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      apiKey: parsed.data.apiKey ?? "",
      allowedModelIds: parsed.data.allowedModelIds,
      enabled: parsed.data.enabled,
    },
  };
}
