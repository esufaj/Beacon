import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beacon - Global News Monitor",
  description:
    "Real-time global news monitoring with an interactive 3D globe visualization",
  keywords: ["news", "global", "monitor", "real-time", "world events"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
