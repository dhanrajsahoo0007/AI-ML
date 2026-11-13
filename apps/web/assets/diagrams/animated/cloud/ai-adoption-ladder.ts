import type { DiagramSpec } from "@/components/diagrams/types";

// The ladder of ways to use AI on a cloud (cloud/operations/ai-ml-platforms-on-the-cloud). Four rungs, one per row and
// one per step, ordered from least control and least work (top) to most of both (bottom). Each row pairs what you
// bring (left) with what the cloud runs for you (right). The Services toggle names each provider's product on each
// rung; the generic label stays underneath.
//
// Layout: two columns. Left (x 120): what you bring. Right (x 390): the managed service. Rows (centres): 100 | 240 |
// 380 | 520, each in its own zone. The "more control" edges run down the right column at x 390, well right of the
// zone tabs, which end near 230. Row edges are short and carry one-word labels that fit the 65-unit gap.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. The
// service boxes are sized for "Bedrock Knowledge Bases" (23 characters).
const spec: DiagramSpec = {
  title: "Four ways to use AI on a cloud",
  width: 530,
  height: 595,
  steps: [
    { title: "Rung 1: a ready-made AI service" },
    { title: "Rung 2: a hosted model through one API" },
    { title: "Rung 3: your data, their model" },
    { title: "Rung 4: your own model on your own GPUs" },
  ],
  zones: [
    { id: "r1", title: "Rung 1: ready-made AI", tone: "neutral", x: 10, y: 40, w: 510, h: 110 },
    { id: "r2", title: "Rung 2: hosted models", tone: "blue", x: 10, y: 180, w: 510, h: 110 },
    { id: "r3", title: "Rung 3: your data, their model", tone: "violet", x: 10, y: 320, w: 510, h: 110 },
    { id: "r4", title: "Rung 4: your own model", tone: "teal", x: 10, y: 460, w: 510, h: 120 },
  ],
  nodes: [
    // Rung 1
    {
      id: "in1",
      label: "Your data only",
      sub: "a photo, a call, a PDF",
      icon: "file",
      tone: "neutral",
      x: 120,
      y: 100,
      w: 180,
    },
    {
      id: "svc1",
      label: "Pre-trained API",
      sub: "nothing to run",
      icon: "api",
      tone: "teal",
      x: 390,
      y: 100,
      w: 230,
      cloud: {
        aws: { label: "Rekognition, Textract" },
        gcp: { label: "Vision, Speech APIs" },
        azure: { label: "Azure AI services" },
      },
    },

    // Rung 2
    {
      id: "in2",
      label: "A prompt",
      sub: "no training data",
      icon: "chat",
      tone: "neutral",
      step: 2,
      x: 120,
      y: 240,
      w: 180,
    },
    {
      id: "svc2",
      label: "Hosted models",
      sub: "one API, pay per token",
      icon: "model",
      tone: "teal",
      step: 2,
      x: 390,
      y: 240,
      w: 230,
      cloud: {
        aws: "aws-bedrock",
        gcp: { id: "gcp-vertex-ai", label: "Gemini on Vertex AI" },
        azure: "azure-foundry",
      },
    },

    // Rung 3
    {
      id: "in3",
      label: "Your documents",
      sub: "or labelled examples",
      icon: "folder",
      tone: "violet",
      step: 3,
      x: 120,
      y: 380,
      w: 180,
    },
    {
      id: "svc3",
      label: "Retrieval or tuning",
      sub: "an index, a tuning job",
      icon: "search",
      tone: "teal",
      step: 3,
      x: 390,
      y: 380,
      w: 230,
      cloud: {
        aws: { id: "aws-bedrock", label: "Bedrock Knowledge Bases" },
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI RAG Engine" },
        azure: "azure-ai-search",
      },
    },

    // Rung 4
    {
      id: "in4",
      label: "Data, code, GPUs",
      sub: "and people to run them",
      icon: "gpu",
      tone: "teal",
      step: 4,
      x: 120,
      y: 520,
      w: 180,
    },
    {
      id: "svc4",
      label: "Your own model",
      sub: "train, register, serve",
      icon: "pipeline",
      tone: "teal",
      accent: true,
      step: 4,
      x: 390,
      y: 520,
      w: 230,
      cloud: {
        aws: "aws-sagemaker",
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI training" },
        azure: "azure-ml",
      },
    },
  ],
  edges: [
    { from: "in1", to: "svc1", label: "send", packet: true },
    { from: "in2", to: "svc2", label: "send", packet: true },
    { from: "in3", to: "svc3", label: "add", packet: true },
    { from: "in4", to: "svc4", label: "build", packet: true },
    { from: "svc1", to: "svc2", label: "more control", dashed: true },
    { from: "svc2", to: "svc3", label: "more work", dashed: true },
    { from: "svc3", to: "svc4", label: "most of both", dashed: true },
  ],
};

export default spec;
