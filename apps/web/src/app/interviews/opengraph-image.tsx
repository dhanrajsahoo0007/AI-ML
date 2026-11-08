import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/features/seo";
import { routeSection } from "@/features/sections";

// Social card for Interview Practice and its category and subsection pages (rendered once at build).
export const alt = "Interview Practice";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function InterviewsOpengraphImage() {
  const section = routeSection("question-bank");
  return ogImage({
    title: section.label,
    subtitle:
      "AI interview questions with clear answers, organized by topic and tagged with the companies that ask them.",
  });
}
