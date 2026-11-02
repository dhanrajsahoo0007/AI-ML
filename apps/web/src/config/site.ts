export const siteConfig = {
  name: "Origins AI Learn",
  tagline: "AI learning",
  description:
    "Origins AI Learn is a structured learning system for going from scratch to job-ready in modern AI: machine learning, deep learning, generative AI, large language models, agentic AI, and adjacent topics. It combines guided learning paths, interview prep, and ML system design notes so you understand both concepts and how they show up in real systems.",
  github: "https://github.com/dhanrajsahoo0007",
  nav: [
    { href: "/learning-paths", label: "Learning Paths" },
    { href: "/interviews", label: "Interviews" },
    { href: "/system-design", label: "ML System Design" },
  ],
  hero: {
    badge: "From zero to GenAI, LLMs, and agents — with interview depth",
    headline: ["Master AI.", "From Scratch."],
    description:
      "A structured path through **machine learning**, **deep learning**, **generative AI**, **LLMs**, and **agentic AI** — with interview prep and ML system design so you see how ideas land in real systems.",
    primaryCta: { label: "Start Learning", href: "/learning-paths" },
    secondaryCta: { label: "Explore Interviews", href: "/interviews" },
  },
  workflow: {
    title: "Your learning journey",
    subtitle: "A clear path from fundamentals to production-ready knowledge.",
    steps: [
      {
        num: "01",
        icon: "graduation-cap",
        title: "Learn Concepts",
        description:
          "Work through structured paths covering ML, deep learning, generative AI, LLMs, and agentic AI.",
      },
      {
        num: "02",
        icon: "target",
        title: "Practice Interviews",
        description:
          "Drill with question-first pages and collapsible answers to build recall without spoilers.",
      },
      {
        num: "03",
        icon: "rocket",
        title: "Design Systems",
        description:
          "Study architecture patterns for serving, data movement, and reliability in production ML.",
      },
    ],
  },
  features: {
    title: "Everything you need",
    subtitle:
      "Three pillars that cover concepts, practice, and real-world architecture.",
    items: [
      {
        href: "/learning-paths",
        icon: "book-open",
        title: "Learning Paths",
        description:
          "ML, deep learning, generative AI, LLMs, and agentic AI — sequenced for newcomers and structured for depth.",
      },
      {
        href: "/interviews",
        icon: "brain",
        title: "Interview Prep",
        description:
          "Question-first pages with collapsible answers so you can drill without spoiling yourself.",
      },
      {
        href: "/system-design",
        icon: "layers",
        title: "ML System Design",
        description:
          "Serving, data movement, and reliability patterns you will see in real production systems.",
      },
    ],
  },
  cta: {
    headline: "Ready to master AI?",
    description:
      "Start with the fundamentals and build up to production systems. Track your progress along the way.",
    button: { label: "Start Learning", href: "/learning-paths" },
  },
} as const;
