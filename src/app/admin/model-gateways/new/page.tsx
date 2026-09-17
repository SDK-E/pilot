import { ModelGatewayForm } from "@/components/platform/model-gateway-form";
import { PageHeader } from "@/components/workspace/page-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New model gateway" };

export default function NewModelGatewayPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader eyebrow="Model gateways" title="New gateway" />
      <ModelGatewayForm />
    </div>
  );
}
