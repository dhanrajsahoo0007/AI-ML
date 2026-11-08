import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/seo";
import { routeSection } from "@/features/sections";

// Social card for Company Questions (rendered once at build).
export const alt = "Company Questions";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function CompaniesOpengraphImage() {
  const section = routeSection("directory");
  return ogImage({
    title: section.label,
    subtitle: "Interview questions publicly reported at top AI companies, with our answers.",
  });
}
