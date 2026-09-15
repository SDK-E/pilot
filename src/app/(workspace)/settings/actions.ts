"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAgent } from "@/agents/agent-repository";
import {
  disconnectConnectorConnection,
  setDefaultConnectorConnection,
} from "@/connectors/connector-repository";
import {
  addOrganizationDomain,
  verifyOrganizationDomain,
} from "@/organizations/local-domain-verification";
import {
  deleteLocalOrganization,
  renameLocalOrganization,
} from "@/organizations/local-workspace";
import {
  updateOrganizationCapabilities,
  updateOrganizationDefaultWorker,
  updateOrganizationModelPolicy,
} from "@/organizations/organization-preference-repository";
import { generateDomainVerificationLink } from "@/organizations/organization-provisioning";
import {
  LOCAL_ORGANIZATION_COOKIE,
  requireWorkspaceSession,
} from "@/organizations/workspace-session";
import { updateUserPreferences } from "@/users/user-preference-repository";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export async function updateMessageShortcutAction(formData: FormData) {
  const input = z
    .object({ sendMessageShortcut: z.enum(["enter", "mod_enter"]) })
    .safeParse({ sendMessageShortcut: formData.get("sendMessageShortcut") });
  if (!input.success) return;
  const { user } = await withAuth({ ensureSignedIn: true });
  await updateUserPreferences({ workosUserId: user.id, ...input.data });
  revalidatePath("/", "layout");
}

export async function updateDefaultAgentAction(formData: FormData) {
  const input = z
    .object({ agentId: z.uuid() })
    .safeParse({ agentId: formData.get("agentId") });
  if (!input.success) return;
  const { organizationId } = await requireWorkspaceSession();
  const agent = await getAgent(organizationId, input.data.agentId);
  if (!agent || agent.archived) throw new Error("This agent is unavailable.");
  await updateOrganizationDefaultWorker({
    organizationId,
    defaultWorkerId: agent.id,
  });
  revalidatePath("/", "layout");
}

const modelPolicySchema = z.object({
  primaryModelId: z
    .string()
    .trim()
    .regex(/^kilo\/[a-z0-9][a-z0-9._:-]*(?:\/[a-z0-9][a-z0-9._:-]*)*$/i)
    .max(200),
  retryEnabled: z.boolean(),
});

export async function updateModelPolicyAction(formData: FormData) {
  const input = modelPolicySchema.safeParse({
    primaryModelId: formData.get("primaryModelId"),
    retryEnabled: formData.get("retryEnabled") === "true",
  });
  if (!input.success) throw new Error("Enter a valid Kilo Gateway model ID.");
  const { organizationId, membership } = await requireWorkspaceSession();
  if (!["owner", "admin"].includes(membership.role.slug)) {
    throw new Error(
      "Only organization owners and admins can change the model policy.",
    );
  }
  await updateOrganizationModelPolicy({ organizationId, ...input.data });
  revalidatePath("/", "layout");
}

const capabilitiesSchema = z.object({
  webSearchEnabled: z.boolean(),
  codeSandboxEnabled: z.boolean(),
});

export async function updateOrganizationCapabilitiesAction(formData: FormData) {
  const input = capabilitiesSchema.parse({
    webSearchEnabled: formData.get("webSearchEnabled") === "true",
    codeSandboxEnabled: formData.get("codeSandboxEnabled") === "true",
  });
  const { organizationId, membership } = await requireWorkspaceSession();
  if (!ADMIN_ROLES.has(membership.role.slug)) {
    throw new Error(
      "Only organization owners and admins can change agent capabilities.",
    );
  }
  await updateOrganizationCapabilities({ organizationId, ...input });
  revalidatePath("/", "layout");
}

const connectionIdSchema = z.object({ connectionId: z.uuid() });

/**
 * Revokes a connector connection. A personal connection may only be
 * disconnected by its own owner; an organization connection only by an
 * admin — both checks are enforced again inside the repository.
 */
export async function disconnectConnectorConnectionAction(formData: FormData) {
  const input = connectionIdSchema.safeParse({
    connectionId: formData.get("connectionId"),
  });
  if (!input.success) return;
  const { organizationId, user, membership } = await requireWorkspaceSession();
  await disconnectConnectorConnection({
    organizationId,
    userId: user.id,
    connectionId: input.data.connectionId,
    isAdmin: ADMIN_ROLES.has(membership.role.slug),
  });
  revalidatePath("/settings");
}

/**
 * Makes one connection the default used by connector tool calls for its
 * provider and owner scope.
 */
export async function setDefaultConnectorConnectionAction(formData: FormData) {
  const input = connectionIdSchema.safeParse({
    connectionId: formData.get("connectionId"),
  });
  if (!input.success) return;
  const { organizationId, user, membership } = await requireWorkspaceSession();
  await setDefaultConnectorConnection({
    organizationId,
    userId: user.id,
    connectionId: input.data.connectionId,
    isAdmin: ADMIN_ROLES.has(membership.role.slug),
  });
  revalidatePath("/settings");
}

/**
 * Sends an SDK Enterprises owner/admin to the WorkOS Admin Portal to verify
 * their company's email domain, enabling automatic membership for new
 * sign-ups with a matching domain. Only meaningful for the WorkOS-backed
 * organization — local workspaces have no WorkOS Organization to link to.
 */
export async function generateDomainVerificationLinkAction() {
  const session = await requireWorkspaceSession();
  if (session.kind !== "workos") {
    throw new Error(
      "Only SDK Enterprises has a WorkOS organization to verify.",
    );
  }
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    throw new Error("Only organization owners and admins can verify a domain.");
  }
  const link = await generateDomainVerificationLink(session.organizationId);
  redirect(link);
}

/**
 * Starts verifying a domain for a local workspace: records a pending row
 * with a fresh token and shows the admin the DNS TXT record to add. Once
 * verified, new sign-ups with a matching email auto-join this workspace.
 */
export async function addOrganizationDomainAction(formData: FormData) {
  const input = z
    .object({ domain: z.string().trim().min(1).max(253) })
    .safeParse({ domain: formData.get("domain") });
  if (!input.success) throw new Error("Enter a domain, like acme.com.");
  const session = await requireWorkspaceSession();
  if (session.kind !== "local") {
    throw new Error("Only local workspaces verify a domain this way.");
  }
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    throw new Error("Only workspace owners and admins can add a domain.");
  }
  await addOrganizationDomain({
    organizationId: session.organizationId,
    domain: input.data.domain,
    requesterEmail: session.user.email,
  });
  revalidatePath("/settings");
}

/**
 * Re-checks DNS for the domain's verification TXT record.
 */
export async function verifyOrganizationDomainAction(formData: FormData) {
  const input = z
    .object({ domainId: z.uuid() })
    .safeParse({ domainId: formData.get("domainId") });
  if (!input.success) return;
  const session = await requireWorkspaceSession();
  if (
    session.kind !== "local" ||
    !ADMIN_ROLES.has(session.membership.role.slug)
  ) {
    throw new Error("Only workspace owners and admins can verify a domain.");
  }
  await verifyOrganizationDomain(input.data.domainId);
  revalidatePath("/settings");
}

/**
 * Renames a local workspace. Not offered for the WorkOS-backed SDK
 * Enterprises organization — that name is managed in WorkOS.
 */
export async function renameOrganizationAction(formData: FormData) {
  const input = z
    .object({ name: z.string().trim().min(1).max(200) })
    .safeParse({ name: formData.get("name") });
  if (!input.success) throw new Error("Enter a workspace name.");
  const session = await requireWorkspaceSession();
  if (session.kind !== "local") {
    throw new Error("Only local workspaces can be renamed here.");
  }
  if (!ADMIN_ROLES.has(session.membership.role.slug)) {
    throw new Error("Only workspace owners and admins can rename it.");
  }
  await renameLocalOrganization(session.organizationId, input.data.name);
  revalidatePath("/", "layout");
}

export interface DeleteOrganizationState {
  message?: string;
  status: "idle" | "error";
}

/**
 * Permanently deletes a local workspace and everything in it — owner only,
 * since it destroys every member's data, not just the requester's own.
 */
export async function deleteOrganizationAction(
  _previousState: DeleteOrganizationState,
  formData: FormData,
): Promise<DeleteOrganizationState> {
  const input = z
    .object({ organizationId: z.string().min(1) })
    .safeParse({ organizationId: formData.get("organizationId") });
  if (!input.success) {
    return { status: "error", message: "This workspace is unavailable." };
  }

  const session = await requireWorkspaceSession();
  if (
    session.kind !== "local" ||
    session.organizationId !== input.data.organizationId
  ) {
    return { status: "error", message: "This workspace is unavailable." };
  }
  if (session.membership.role.slug !== "owner") {
    return {
      status: "error",
      message: "Only the workspace owner can delete it.",
    };
  }

  const deletedOrganizationId = await deleteLocalOrganization(
    session.organizationId,
  );
  if (!deletedOrganizationId) {
    return { status: "error", message: "This workspace is unavailable." };
  }

  const cookieStore = await cookies();
  if (
    cookieStore.get(LOCAL_ORGANIZATION_COOKIE)?.value === session.organizationId
  ) {
    cookieStore.delete(LOCAL_ORGANIZATION_COOKIE);
  }

  // Redirecting here (rather than returning success for the client to
  // navigate away on) avoids a race with this same route's own
  // revalidation: once deleted, this workspace's pages 404 or resolve to a
  // different session, and a client-side redirect issued after that render
  // had already lost would leave the visitor stranded.
  revalidatePath("/", "layout");
  redirect("/chat");
}
