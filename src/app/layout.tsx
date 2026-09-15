import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { cn } from "cn";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_URL } from "@/marketing/site-config";

import type { Metadata } from "next";
import "./globals.css";

// The shadcn preset b2pR8pzoh pairs Space Grotesk for text with JetBrains
// Mono for code. Both variables are read by globals.css.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Pilot by SDK Enterprises", template: "%s · Pilot" },
  description:
    "Pilot answers questions, plans and runs multi-step work, and reviews code in one workspace. Free to start, no credit card required.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full font-sans antialiased",
        spaceGrotesk.variable,
        jetbrainsMono.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <AuthKitProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthKitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
