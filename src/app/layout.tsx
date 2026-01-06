import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
      <body
        className={`${nunitoSans.variable} font-sans antialiased bg-background`}
      >
        <Providers>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
