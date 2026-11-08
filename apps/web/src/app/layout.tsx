import type { Metadata } from "next";
import { ContentProtection } from "@/features/content-protection";
import { Observability } from "@/features/observability/observability";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ProfileMenu } from "@/features/account/profile-menu.client";
import { SiteFooter } from "@/components/site-footer";
import { HydrationSlot } from "@/components/hydration-slot";
import { LocalViewSwitch } from "@/components/local-view-switch.client";
import { getHeaderNav } from "@/lib/nav-tree";
import { THEME_SCRIPT } from "@/components/theme-script";
import { siteConfig } from "@/config/site";
import { SITE_URL } from "@/config/business";
import "./globals.css";

// Two families (plan §6 P6): Inter for body text and headings (globals.css gives headings their weight
// and tracking), JetBrains Mono for code. Only Inter is preloaded; code blocks are rarely above the fold.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});
const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

// Defaults for every page. Pages set their own canonical URL (never here: it would be inherited by every
// page) through features/seo. The Open Graph image comes from app/opengraph-image.tsx
// and the favicon from app/favicon.ico (file conventions).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Slim list (sections and their first-level groups): this is serialized into every page.
  const headerNav = await getHeaderNav();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {/* Keys: an element handed to a client component as a prop arrives lazily and lands among the header's other
            children, which React treats as an unkeyed list member (a dev-only warning); a key settles it. */}
        <SiteHeader
          navTree={headerNav}
          profileMenu={<ProfileMenu key="profile-menu" />}
          profileMenuMobile={<ProfileMenu key="profile-menu-mobile" />}
        />
        <ContentProtection />
        {/* `next dev` only: the paid/unpaid view switch. APP_ENV is inlined at build, so deployed builds drop it. */}
        {process.env.APP_ENV === "local" && <LocalViewSwitch envDefault={process.env.LOCAL_VIEW_AS} />}
        {/* HydrationSlot: these arrive as separate RSC rows that may land after hydration starts; see
            components/hydration-slot.tsx (React #418). Not a Suspense boundary: that would turn notFound() 404s into 200s. */}
        <main id="main" className="w-full flex-1">
          <HydrationSlot>{children}</HydrationSlot>
        </main>
        <HydrationSlot>
          <SiteFooter />
          <Observability />
        </HydrationSlot>
      </body>
    </html>
  );
}
