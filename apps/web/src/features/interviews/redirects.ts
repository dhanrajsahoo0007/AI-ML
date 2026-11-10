// Interview Practice URLs that moved. `distributed-systems-patterns` was one category holding every system design
// question; it is now four categories (content/question-bank/taxonomy.yaml), and each old subsection page
// redirects to its new home. next.config.ts turns this list into permanent redirects.

const OLD_CATEGORY = "distributed-systems-patterns";

/** Old subsection slug → new `category/subsection` (or just `category`). */
export const SPLIT_SUBSECTIONS: Record<string, string> = {
  fundamentals: "system-design-fundamentals/fundamentals",
  networking: "system-design-fundamentals/networking",
  apis: "system-design-fundamentals/apis",
  "realtime-communication": "system-design-fundamentals/realtime-communication",
  security: "system-design-fundamentals/security",
  "database-foundations": "system-design-databases/database-foundations",
  "database-selection": "system-design-databases/database-selection",
  "storage-engines": "system-design-databases/storage-engines",
  replication: "system-design-databases/replication",
  "scaling-traffic": "system-design-patterns/scaling-traffic",
  "data-consistency": "system-design-patterns/data-consistency",
  "messaging-async": "system-design-patterns/messaging-async",
  "reliability-resilience": "system-design-patterns/reliability-resilience",
  "specialised-structures": "system-design-patterns/specialised-structures",
  "case-studies": "system-design-questions",
};

export function interviewRedirects() {
  return [
    ...Object.entries(SPLIT_SUBSECTIONS).map(([old, to]) => ({
      source: `/interviews/${OLD_CATEGORY}/${old}`,
      destination: `/interviews/${to}`,
      permanent: true,
    })),
    // The old category page, and anything else under it, goes to the system design track on the index.
    { source: `/interviews/${OLD_CATEGORY}`, destination: "/interviews#design", permanent: true },
    { source: `/interviews/${OLD_CATEGORY}/:path*`, destination: "/interviews#design", permanent: true },
  ];
}
