import { JsonLd } from "@/components/marketing/json-ld";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { marketingSession } from "@/marketing/marketing-auth";
import {
  ORGANIZATION_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/marketing/site-config";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = await marketingSession();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteNav isSignedIn={isSignedIn} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: ORGANIZATION_NAME,
          url: SITE_URL,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
        }}
      />
    </div>
  );
}
