import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { Metadata } from "next";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Pilot by SDK Enterprises", template: "%s · Pilot" },
  description:
    "Organize. Delegate. Get things done. Your AI workforce, together in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} h-full antialiased`}
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
