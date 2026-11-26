import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  themeColor: "#17224d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
