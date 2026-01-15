import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "War Era Loot Calculator",
  description:
    "Calculate daily lootbox earnings, equipment costs, and profitability strategies for WARera. Simulate combat sessions and compare sell vs scrap vs recycle strategies.",
  keywords: [
    "WARera",
    "loot calculator",
    "lootbox",
    "profitability",
    "game calculator",
    "equipment durability",
  ],
  authors: [{ name: "WARera Calculator" }],
  openGraph: {
    title: "WARera Loot Calculator",
    description:
      "Calculate daily lootbox earnings and compare profitability strategies for WARera.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "WARera Loot Calculator",
    description:
      "Calculate daily lootbox earnings and compare profitability strategies for WARera.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
