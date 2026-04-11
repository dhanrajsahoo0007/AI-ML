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

export const metadata: Metadata = {
  title: "AI-ML Learning Platform",
  description:
    "Learning paths, interview prep, and ML system design for beginners starting AI and ML.",
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
