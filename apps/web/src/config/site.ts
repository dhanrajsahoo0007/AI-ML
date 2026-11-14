import { publicNav, type PublicNavLink } from "@/features/sections/public";

// Section links come from the registry (content/sections.yaml), resolved at build for the current
// environment: only `on` sections, and only those with pages (not "coming soon" kinds).
const nav: PublicNavLink[] = publicNav().filter((link) => !link.comingSoon);

/** Links that are not sections, placed in a header mega-menu group. */
const extraNav: { href: string; label: string; navGroup: PublicNavLink["navGroup"] }[] = [
  { href: "/pricing", label: "Pricing", navGroup: "more" },
];

export const siteConfig = {
  name: "TokensToScale",
  description:
    "TokensToScale is a one-stop place to prepare for AI and system design interviews: deep-dives on LLMs, RAG, agents and production AI systems, classic system design case studies, and interview questions tagged with the companies that ask them.",
  nav,
  extraNav,
  hero: {
    badge: "One place for AI and system design interview prep",
    headline: ["From tokens", "to scale."],
    description:
      "Deep-dives on **transformers**, **LLMs**, **RAG**, **agents** and **production AI systems**, plus **system design** case studies and interview questions reported at top AI companies, so you can explain how ideas land in real systems.",
    primaryCta: { label: "Explore GenAI & LLM Systems", href: "/ai-system-design" },
    secondaryCta: { label: "Explore Interview Practice", href: "/interviews" },
  },
  workflow: {
    title: "Your learning journey",
    subtitle: "From how models work to designing the systems around them.",
    steps: [
      {
        num: "01",
        icon: "graduation-cap",
        title: "Learn Concepts",
        description:
          "Read AI system design deep-dives on transformers, RAG, agents, inference and evaluation, each with diagrams and trade-offs.",
      },
      {
        num: "02",
        icon: "target",
        title: "Practice Interviews",
        description: "Drill questions by topic, difficulty and company, with answers hidden until you are ready.",
      },
      {
        num: "03",
        icon: "rocket",
        title: "Design Systems",
        description:
          "Work through system design fundamentals and case studies, from APIs and databases to WhatsApp and YouTube.",
      },
    ],
  },
  features: {
    title: "Everything you need",
    subtitle: "Four pillars that cover concepts, practice and real-world architecture.",
    items: [
      {
        href: "/ai-system-design",
        icon: "sparkles",
        title: "AI System Design",
        description:
          "Transformers, RAG, knowledge graphs, agents and recommenders, explained with architecture diagrams.",
      },
      {
        href: "/system-design",
        icon: "layers",
        title: "System Design",
        description:
          "APIs, databases, replication and classic case studies such as URL shorteners, chat apps and video platforms.",
      },
      {
        href: "/interviews",
        icon: "brain",
        title: "Interview Prep",
        description: "AI interview questions organized by topic and subtopic, filterable by difficulty and company.",
      },
      {
        href: "/companies",
        icon: "users",
        title: "Companies",
        description: "See what top AI companies are reported to ask, with their interview loops and our answers.",
      },
    ],
  },
  cta: {
    headline: "Ready to master AI?",
    description: "Start with the deep-dives, then practice the questions top AI companies ask.",
    button: { label: "Explore GenAI & LLM Systems", href: "/ai-system-design" },
  },
};
