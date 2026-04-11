import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url);

const paths = [
  {
    slug: "machine-learning",
    title: "Machine learning",
    summary: "Supervised and unsupervised learning, evaluation, and practical workflows.",
    topic: "machine-learning",
    sort: "1",
  },
  {
    slug: "deep-learning",
    title: "Deep learning",
    summary: "Neural networks, training at scale, and modern architectures.",
    topic: "deep-learning",
    sort: "2",
  },
  {
    slug: "generative-ai",
    title: "Generative AI",
    summary: "Diffusion, GANs, and multimodal generation fundamentals.",
    topic: "generative-ai",
    sort: "3",
  },
  {
    slug: "llms",
    title: "Large language models",
    summary: "Transformers, prompting, fine-tuning, and safety basics.",
    topic: "llms",
    sort: "4",
  },
  {
    slug: "agentic-ai",
    title: "Agentic AI",
    summary: "Tool use, planning, memory, and reliable agent patterns.",
    topic: "agentic-ai",
    sort: "5",
  },
];

for (const p of paths) {
  const [row] = await sql`
    INSERT INTO learning_paths (slug, title, summary, topic, sort_order)
    VALUES (${p.slug}, ${p.title}, ${p.summary}, ${p.topic}, ${p.sort})
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      topic = EXCLUDED.topic,
      sort_order = EXCLUDED.sort_order
    RETURNING id
  `;
  const pathId = row.id;

  const modules = [
    {
      slug: "overview",
      title: "Overview",
      summary: "What you will learn and how to use this path.",
      sort: "1",
    },
    {
      slug: "core-concepts",
      title: "Core concepts",
      summary: "Foundational ideas and vocabulary.",
      sort: "2",
    },
    {
      slug: "practice",
      title: "Hands-on practice",
      summary: "Mini-projects and checkpoints.",
      sort: "3",
    },
  ];

  for (const m of modules) {
    await sql`
      INSERT INTO modules (path_id, slug, title, summary, sort_order)
      VALUES (${pathId}, ${m.slug}, ${m.title}, ${m.summary}, ${m.sort})
      ON CONFLICT (path_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        sort_order = EXCLUDED.sort_order
    `;
  }
}

await sql.end();
console.log("Seed complete.");
