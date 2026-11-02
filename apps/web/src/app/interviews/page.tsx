import { GroupedIndex } from "@/components/grouped-index";

export const revalidate = 3600;

export default function InterviewsIndexPage() {
  return (
    <GroupedIndex
      section="interviews"
      label="Interviews"
      title="Interview question banks"
      lead="Hundreds of AI, data science and ML interview questions with clear answers, including questions reported at top AI companies. Filter by topic, difficulty and company, or search, and keep answers hidden until you are ready."
      areas={["ML & AI", "Data Science", "Production & Career"]}
    />
  );
}
