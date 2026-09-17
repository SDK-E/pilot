"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { gatewayFromForm } from "@/model-gateways/gateway-form-schema";
import {
  createModelGateway,
  deleteModelGateway,
  updateModelGateway,
} from "@/model-gateways/model-gateway-repository";
import { requirePlatformAdmin } from "@/platform/platform-session";

export interface GatewayFormState {
  status: "idle" | "error" | "success";
  message?: string;
  href?: string;
}

function isDuplicateName(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505"
  );
}

export async function createModelGatewayAction(
  _previous: GatewayFormState,
  formData: FormData,
): Promise<GatewayFormState> {
  const session = await requirePlatformAdmin();
  const form = gatewayFromForm(formData);
  if ("error" in form) return { status: "error", message: form.error };
  if (!form.gateway.apiKey) {
    return { status: "error", message: "An API key is required." };
  }

  try {
    const created = await createModelGateway(session.user.id, form.gateway);
    if (!created)
      return { status: "error", message: "Could not save this gateway." };
    revalidatePath("/admin/model-gateways");
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: `${created.name} is ready.`,
      href: `/admin/model-gateways/${created.id}`,
    };
  } catch (error) {
    if (isDuplicateName(error)) {
      return {
        status: "error",
        message: "A gateway with that name already exists.",
      };
    }
    throw error;
  }
}

export async function updateModelGatewayAction(
  _previous: GatewayFormState,
  formData: FormData,
): Promise<GatewayFormState> {
  await requirePlatformAdmin();
  const gatewayId = z.uuid().safeParse(formData.get("gatewayId"));
  if (!gatewayId.success)
    return { status: "error", message: "This gateway is unavailable." };
  const form = gatewayFromForm(formData);
  if ("error" in form) return { status: "error", message: form.error };

  try {
    const updated = await updateModelGateway(gatewayId.data, {
      ...form.gateway,
      apiKey: form.gateway.apiKey || undefined,
    });
    if (!updated)
      return { status: "error", message: "This gateway is unavailable." };
    revalidatePath("/admin/model-gateways");
    revalidatePath("/", "layout");
    return { status: "success", message: `${updated.name} was updated.` };
  } catch (error) {
    if (isDuplicateName(error)) {
      return {
        status: "error",
        message: "A gateway with that name already exists.",
      };
    }
    throw error;
  }
}

export async function deleteModelGatewayAction(formData: FormData) {
  await requirePlatformAdmin();
  const gatewayId = z.uuid().safeParse(formData.get("gatewayId"));
  if (!gatewayId.success) throw new Error("This gateway is unavailable.");
  await deleteModelGateway(gatewayId.data);
  revalidatePath("/", "layout");
  redirect("/admin/model-gateways");
}
