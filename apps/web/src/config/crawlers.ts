// Crawler policy for robots.txt (plan §11.10, layer 2). AI and training crawlers are refused; search engines
// that send readers are allowed. robots.txt is a request, not a wall: the Cloudflare "Block AI bots" /
// AI Crawl Control setting enforces it at the edge for crawlers that ignore it.

/** AI assistants, AI search and model-training crawlers. Matched by their published user-agent tokens. */
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "CCBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  "Amazonbot",
  "Diffbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "ImagesiftBot",
  "Omgilibot",
  "Omgili",
  "YouBot",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "DuckAssistBot",
  "MistralAI-User",
  "Timpibot",
] as const;

/** Search engines allowed to index public pages for SEO. */
export const SEARCH_CRAWLERS = ["Googlebot", "Bingbot"] as const;

/** Paths no crawler should fetch. */
export const DISALLOWED_PATHS = ["/api/"];
