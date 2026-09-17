import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteModelGatewayButton } from "@/components/platform/delete-model-gateway-button";
import { ModelGatewayForm } from "@/components/platform/model-gateway-form";
import { PageHeader } from "@/components/workspace/page-header";
import { getModelGateway } from "@/model-gateways/model-gateway-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit model gateway" };

export default async function ModelGatewayPage({
  params,
}: {
  params: Promise<{ gatewayId: string }>;
}) {
  const { gatewayId } = await params;
  if (!z.uuid().safeParse(gatewayId).success) notFound();
  const gateway = await getModelGateway(gatewayId);
  if (!gateway) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        actions={
          <DeleteModelGatewayButton
            gatewayId={gateway.id}
            name={gateway.name}
          />
        }
        eyebrow="Model gateways"
        title={gateway.name}
      />
      <ModelGatewayForm gateway={gateway} />
    </div>
  );
}
