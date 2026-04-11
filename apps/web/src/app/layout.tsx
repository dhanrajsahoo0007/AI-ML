import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Origins AI Learn";
const siteDescription =
  "Origins AI Learn is a structured learning system for going from scratch to job-ready in modern AI: machine learning, deep learning, generative AI, large language models, agentic AI, and adjacent topics. It combines guided learning paths, interview prep (question-first drills), and ML system design notes so you understand both concepts and how they show up in real systems.";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s · ${siteTitle}`,
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SiteHeader />
        <div className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-6xl px-4 pb-16 pt-6">
          {children}
        </div>
      </body>
    </html>
  );
}
