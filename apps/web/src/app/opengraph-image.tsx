import { siteConfig } from "@/config/site";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/seo";

// Default social card for every page without a closer one (rendered once at build).
export const alt = siteConfig.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return ogImage({
    title: "AI & system design, explained",
    subtitle:
      "Deep-dives on LLMs, RAG, agents and production AI systems, system design case studies and interview practice.",
  });
}
