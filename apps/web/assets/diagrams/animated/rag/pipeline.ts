import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, PROMPT, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// The RAG hero: Brightpost's help centre (1,200 articles) answering "How do I reset my password if I lost my
// phone?". Top lane, offline ingestion: sources → parse → chunk → embed → vector index. Bottom lanes, online
// answering: question → embed (the same model) → retrieve the top 5 chunks the user may see → build the prompt →
// LLM → answer with citations, shown back to the user.
//
// Eight steps (rag-diagrams plan §7): 1 sources are parsed · 2 text is split into chunks · 3 each chunk becomes a
// vector · 4 vectors and metadata go into the index · 5 a question arrives and is embedded by the same model · 6 the
// index returns the nearest permitted chunks · 7 chunks and question become one prompt · 8 the model answers and
// cites its chunks. Nodes never move between steps.
//
// Layout: five columns at x 90 | 265 | 440 | 615 | 790 (175 apart, cards 150 wide, so 25 between cards: no labels
// on the short edges; the numbers live in the sub lines, kept to about 14 characters so they fit beside the icon). Rows: 95 (offline) | 290 (online) | 410 (the answer).
// The index-to-retrieve edge runs in the corridor at y 192 between the two zones. The question also feeds the
// prompt along y 352, and the answer returns to the user along y 410.
//
// Colour (RAG legend, four tones plus neutral): documents and chunks blue, the embedding model pink, the vector index
// and retrieval violet, the LLM and the answer green; the user and the prompt builder neutral. The question is the
// user's (neutral) here so the hero stays at four tones; the orange question tone is used where rewrites appear.
// Pastel cards are the pipeline stages; the help centre and the user are paper; the index is the accent.

const X = [90, 265, 440, 615, 790] as const;
const ROW = { offline: 95, online: 290, answer: 410 } as const;
const W = 150;

// Managed services per role, for the Services toggle on provider pages (cloud/aws/ai-ml uses cloud="aws"). The
// managed RAG services (Bedrock Knowledge Bases, Vertex AI RAG Engine, the Azure AI Search indexer) do parse, chunk
// and retrieve for you; the embedding models are Amazon Titan Text Embeddings V2, Gemini Embedding and Azure OpenAI
// embeddings. Labels stay short so they fit beside the icon.
const KB = {
  aws: { id: "aws-bedrock", label: "Bedrock KB" },
  gcp: { id: "gcp-vertex-ai", label: "RAG Engine" },
  azure: { id: "azure-ai-search", label: "AI Search" },
};
const EMBED = {
  aws: { id: "aws-bedrock", label: "Titan Embed v2" },
  gcp: { id: "gcp-vertex-ai", label: "Gemini Embed" },
  azure: { id: "azure-foundry", label: "Azure OpenAI" },
};

const spec: DiagramSpec = {
  title: "RAG: ingest the help centre offline, answer a question online",
  width: 880,
  height: 470,
  steps: [
    { title: "Sources are parsed" },
    { title: "Text is split into chunks" },
    { title: "Each chunk becomes a vector" },
    { title: "Vectors and metadata go into the index" },
    { title: "A question arrives and is embedded by the same model" },
    { title: "The index returns the nearest permitted chunks" },
    { title: "Chunks and question become one prompt" },
    { title: "The model answers and cites its chunks" },
  ],
  zones: [
    { id: "offline", title: "Offline: ingestion", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 115 },
    { id: "online", title: "Online: answering", tone: RAG_TONE.infra, x: 10, y: 232, w: 860, h: 225 },
  ],
  nodes: [
    // Offline lane
    {
      id: "sources",
      cloud: {
        aws: { id: "aws-s3", label: "S3" },
        gcp: { id: "gcp-cloud-storage", label: "Cloud Storage" },
        azure: { id: "azure-blob", label: "Blob Storage" },
      },
      label: "Help centre",
      sub: `${fmt(CORPUS.articles)} articles`,
      icon: "folder",
      tone: RAG_TONE.text,
      x: X[0],
      y: ROW.offline,
      w: W,
    },
    {
      id: "parse",
      cloud: KB,
      label: "Parse",
      sub: "HTML to text",
      icon: "file",
      tone: RAG_TONE.text,
      fill: "pastel",
      x: X[1],
      y: ROW.offline,
      w: W,
    },
    {
      id: "chunk",
      cloud: KB,
      label: "Chunk",
      sub: `${CORPUS.chunkTokens} tokens each`,
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.offline,
      w: W,
    },
    {
      id: "embed",
      cloud: EMBED,
      label: "Embed",
      sub: `${fmt(CORPUS.dims)} numbers`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.offline,
      w: W,
    },
    {
      id: "index",
      cloud: {
        aws: { id: "aws-opensearch", label: "OpenSearch" },
        gcp: { id: "gcp-vertex-ai", label: "Vector Search" },
        azure: { id: "azure-ai-search", label: "AI Search" },
      },
      label: "Vector index",
      sub: `${fmt(CORPUS.chunks)} vectors`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 4,
      x: X[4],
      y: ROW.offline,
      w: W,
    },

    // Online lane
    {
      id: "question",
      label: "Question",
      sub: "lost my phone",
      icon: "users",
      tone: RAG_TONE.infra,
      step: 5,
      x: X[0],
      y: ROW.online,
      w: W,
    },
    {
      id: "qembed",
      cloud: EMBED,
      label: "Embed",
      sub: "the same model",
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 5,
      x: X[1],
      y: ROW.online,
      w: W,
    },
    {
      id: "retrieve",
      cloud: KB,
      label: "Retrieve",
      sub: `top ${TOP_K}, permitted`,
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 6,
      x: X[2],
      y: ROW.online,
      w: W,
    },
    {
      id: "prompt",
      cloud: {
        aws: { id: "aws-lambda", label: "Lambda" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run" },
        azure: { id: "azure-functions", label: "Functions" },
      },
      label: "Build prompt",
      sub: PROMPT.rounded,
      icon: "prompt",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 7,
      x: X[3],
      y: ROW.online,
      w: W,
    },
    {
      id: "llm",
      cloud: {
        aws: { id: "aws-bedrock", label: "Bedrock" },
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI" },
        azure: { id: "azure-foundry", label: "Foundry" },
      },
      label: "LLM",
      sub: "writes the reply",
      icon: "model",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 8,
      x: X[4],
      y: ROW.online,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "cites 2 articles",
      icon: "link",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 8,
      x: X[4],
      y: ROW.answer,
      w: W,
    },
  ],
  edges: [
    // Offline: one packet runs the whole lane, stage by stage.
    { from: "sources", to: "parse", packet: true },
    { from: "parse", to: "chunk", packet: true, delay: 0.6 },
    { from: "chunk", to: "embed", packet: true, delay: 1.2 },
    { from: "embed", to: "index", packet: true, delay: 1.8 },

    // Online: the question becomes a vector, the index answers with the nearest chunks the user may read.
    { from: "question", to: "qembed", packet: true },
    { from: "qembed", to: "retrieve", packet: true, delay: 0.6 },
    {
      from: "index",
      to: "retrieve",
      label: `nearest ${TOP_K} the user may see`,
      packet: true,
      delay: 1.2,
      via: [
        [X[4], 192],
        [X[2], 192],
      ],
    },

    // The prompt holds the chunks and the question; the model answers; the answer goes back with its sources.
    { from: "retrieve", to: "prompt", packet: true, delay: 1.8 },
    {
      from: "question",
      to: "prompt",
      label: "the question",
      dashed: true,
      step: 7,
      via: [
        [135, 352],
        [X[3], 352],
      ],
    },
    { from: "prompt", to: "llm", packet: true, delay: 2.4 },
    { from: "llm", to: "answer", packet: true, delay: 3 },
    {
      from: "answer",
      to: "question",
      label: "shown with links",
      dashed: true,
      labelAt: 0.45,
      via: [[X[0], ROW.answer]],
    },
  ],
};

export default spec;
