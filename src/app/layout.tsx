import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/layout/auth-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const BASE_URL = "https://lcon.leafclutch.com.np";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "LCON | Leafclutch Online Network",
    template: "%s | LCON",
  },
  description:
    "LCON — the secure staff portal for Leafclutch team members. Manage workflows, attendance, and daily operations in one place.",
  keywords: [
    "LCON",
    "lcon",
    "lcon portal",
    "Leafclutch",
    "leafclutch online network",
    "leafclutch portal",
    "leafclutch staff portal",
    "lcon.leafclutch.com.np",
  ],
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "LCON — Leafclutch Online Network",
    title: "LCON | Leafclutch Online Network",
    description:
      "Secure staff portal for Leafclutch team members. Access your workflows, attendance, and team operations.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LCON | Leafclutch Online Network",
    description: "Secure staff portal for Leafclutch team members.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Leafclutch",
  url: BASE_URL,
  description:
    "LCON is the Leafclutch Online Network — a secure internal portal for Leafclutch team members.",
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LCON — Leafclutch Online Network",
  url: BASE_URL,
  description: "Secure staff portal for Leafclutch team members.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
