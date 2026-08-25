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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const pageTitle = "MARVEL: Timeline del UCM en orden cronológico completo";
const socialTitle = "MARVEL: Timeline del UCM";
const description =
  "Orden cronológico y narrativo completo del universo cinematográfico de Marvel, con X-Men (Earth-10005) intercalado.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: "Orden cronológico y narrativo completo del universo cinematográfico de Marvel",
  openGraph: {
    title: socialTitle,
    description,
    type: "website",
    locale: "es_ES",
    siteName: "MCU Timeline",
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
