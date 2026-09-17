import { RiAddLine, RiCloudLine } from "@remixicon/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { PageHeader } from "@/components/workspace/page-header";
import { listModelGateways } from "@/model-gateways/model-gateway-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Model gateways" };

export default async function ModelGatewaysPage() {
  const gateways = await listModelGateways();

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/model-gateways/new">
              <RiAddLine aria-hidden="true" /> New gateway
            </Link>
          </Button>
        }
        description="The models organizations can choose from in Settings."
        title="Model gateways"
      />
      {gateways.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {gateways.map((gateway) => (
            <li key={gateway.id}>
              <Item asChild className="h-full items-start" variant="outline">
                <Link href={`/admin/model-gateways/${gateway.id}`}>
                  <ItemMedia>
                    <RiCloudLine aria-hidden="true" className="size-5" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {gateway.name}
                      {gateway.enabled ? null : (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (disabled)
                        </span>
                      )}
                    </ItemTitle>
                    <ItemDescription className="truncate">
                      {gateway.baseUrl}
                    </ItemDescription>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {gateway.allowedModelIds.length} model
                      {gateway.allowedModelIds.length === 1 ? "" : "s"}
                    </p>
                  </ItemContent>
                </Link>
              </Item>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No model gateways yet</EmptyTitle>
            <EmptyDescription>
              Add one to let organizations choose a model in their Settings.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
