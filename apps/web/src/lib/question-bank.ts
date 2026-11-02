import "server-only";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";

// Company-reported questions adapted from Outcome School's
// "AI Engineering Interview Questions Company Wise" (Apache 2.0); answers are our own.
// Data lives in content/question-bank/*.yaml and content/companies/companies.yaml.

export type Level = "Junior" | "Mid" | "Senior";

export interface QuestionRef {
  title: string;
  url: string;
}

export interface BankQuestion {
  id: string;
  q: string;
  a: string;
  topic: TopicKey;
  level: Level;
  companies: string[];
  related?: { href: string; title: string };
  refs: QuestionRef[];
}

export interface Company {
  slug: string;
  name: string;
  group: string;
  icon: string;
  roles: string;
  loop: string;
}

export const TOPICS = {
  "llm-internals": { label: "LLM Internals", bank: "transformers-and-attention" },
  "inference-gpu": { label: "Inference & GPU", bank: "llm-inference-and-gpu" },
  rag: { label: "RAG & Retrieval", bank: "genai-and-rag" },
  agents: { label: "Agents & Tools", bank: "agentic-ai" },
  "fine-tuning": { label: "Fine-Tuning & Alignment", bank: "fine-tuning-and-alignment" },
  evaluation: { label: "Evaluation", bank: "llm-evaluation" },
  safety: { label: "Safety & Security", bank: "ai-safety-and-security" },
  multimodal: { label: "Multimodal & Voice", bank: "multimodal-and-voice-ai" },
  "system-design": { label: "AI System Design", bank: "ml-system-design-interview" },
  ml: { label: "ML Fundamentals", bank: "ml-fundamentals" },
  dl: { label: "Deep Learning", bank: "deep-learning" },
  "forward-deployed": { label: "Forward-Deployed", bank: "forward-deployed-ai" },
} as const;

export type TopicKey = keyof typeof TOPICS;

export const COMPANY_GROUPS = [
  "Frontier AI Labs",
  "Big Tech AI",
  "AI Infrastructure",
  "AI-Native Products",
  "Forward-Deployed & Enterprise",
];

const LEVELS: Level[] = ["Junior", "Mid", "Senior"];
const CONTENT = path.join(process.cwd(), "content");
const BANK_DIR = path.join(CONTENT, "question-bank");

interface RawQuestion {
  id?: unknown;
  q?: unknown;
  a?: unknown;
  topic?: unknown;
  level?: unknown;
  companies?: unknown;
  related?: unknown;
  refs?: unknown;
}

// Resolves a site path such as /interviews/llms to its MDX file and title.
function resolveRelated(href: string): { href: string; title: string } | null {
  const file = path.join(CONTENT, `${href}.mdx`);
  if (!href.startsWith("/") || !fs.existsSync(file)) return null;
  const { data } = matter(fs.readFileSync(file, "utf8"));
  return { href, title: (data.title as string) ?? href };
}

function loadCompanies(): Company[] {
  const file = path.join(CONTENT, "companies", "companies.yaml");
  const raw = yaml.load(fs.readFileSync(file, "utf8")) as Company[];
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const c of raw) {
    for (const key of ["slug", "name", "group", "icon", "roles", "loop"] as const) {
      if (typeof c[key] !== "string" || !c[key]) errors.push(`company ${c.slug ?? "?"}: missing ${key}`);
    }
    if (!COMPANY_GROUPS.includes(c.group)) errors.push(`company ${c.slug}: unknown group ${c.group}`);
    if (slugs.has(c.slug)) errors.push(`company ${c.slug}: duplicate slug`);
    slugs.add(c.slug);
  }
  if (errors.length) throw new Error(`Invalid companies.yaml:\n${errors.join("\n")}`);
  return raw;
}

function loadQuestions(companyNames: Set<string>): BankQuestion[] {
  const files = fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".yaml"));
  const errors: string[] = [];
  const ids = new Set<string>();
  const out: BankQuestion[] = [];

  for (const file of files) {
    const items = (yaml.load(fs.readFileSync(path.join(BANK_DIR, file), "utf8")) ?? []) as RawQuestion[];
    for (const r of items) {
      const where = `${file} ${String(r.id ?? "?")}`;
      if (typeof r.id !== "string" || !r.id) { errors.push(`${where}: missing id`); continue; }
      if (ids.has(r.id)) errors.push(`${where}: duplicate id`);
      ids.add(r.id);
      if (typeof r.q !== "string" || !r.q.trim()) errors.push(`${where}: missing q`);
      if (typeof r.a !== "string" || !r.a.trim()) errors.push(`${where}: missing a`);
      if (typeof r.topic !== "string" || !(r.topic in TOPICS)) errors.push(`${where}: unknown topic ${String(r.topic)}`);
      if (!LEVELS.includes(r.level as Level)) errors.push(`${where}: bad level ${String(r.level)}`);
      const companies = Array.isArray(r.companies) ? (r.companies as string[]) : [];
      for (const c of companies) if (!companyNames.has(c)) errors.push(`${where}: unknown company ${c}`);
      let related: BankQuestion["related"];
      if (r.related !== undefined) {
        const resolved = typeof r.related === "string" ? resolveRelated(r.related) : null;
        if (!resolved) errors.push(`${where}: related page not found ${String(r.related)}`);
        else related = resolved;
      }
      const refs = Array.isArray(r.refs) ? (r.refs as QuestionRef[]) : [];
      for (const ref of refs) if (!ref?.title || !/^https:\/\//.test(ref?.url ?? "")) errors.push(`${where}: bad ref`);
      out.push({
        id: r.id,
        q: String(r.q).trim(),
        a: String(r.a).trim(),
        topic: r.topic as TopicKey,
        level: r.level as Level,
        companies,
        related,
        refs,
      });
    }
  }
  if (errors.length) throw new Error(`Invalid question bank:\n${errors.join("\n")}`);
  return out;
}

let cache: { companies: Company[]; questions: BankQuestion[] } | null = null;

function load() {
  if (!cache) {
    const companies = loadCompanies();
    const questions = loadQuestions(new Set(companies.map((c) => c.name)));
    cache = { companies, questions };
  }
  return cache;
}

export function getQuestions({ topic, company }: { topic?: TopicKey; company?: string } = {}) {
  return load().questions.filter(
    (q) => (!topic || q.topic === topic) && (!company || q.companies.includes(company))
  );
}

export function getCompanies() {
  return load().companies;
}

export function getCompany(nameOrSlug: string) {
  return load().companies.find((c) => c.slug === nameOrSlug || c.name === nameOrSlug);
}
