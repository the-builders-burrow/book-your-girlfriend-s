import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Book Your Girlfriend — Make every detail count.",
  description:
    "An AI-native concierge for exceptional restaurants, tickets, flights, private venues, personal gifts, rare experiences, and memorable getaways.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Book Your Girlfriend — Make every detail count.",
    description:
      "One thoughtful brief becomes a researched restaurant, ticket, flight, venue, gift, experience, getaway, or anything else.",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Book Your Girlfriend romantic experience concierge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book Your Girlfriend — Make every detail count.",
    description:
      "Tables, tickets, flights, gifts, experiences, venues, and escapes through one thoughtful AI concierge.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
