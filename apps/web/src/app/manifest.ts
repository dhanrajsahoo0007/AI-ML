import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Web app manifest (/manifest.webmanifest). Colours match the light theme in globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "TokensToScale",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#faf9f6",
    theme_color: "#1e3a8a",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
