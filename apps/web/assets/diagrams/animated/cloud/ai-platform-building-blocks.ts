import type { DiagramSpec } from "@/components/diagrams/types";

// The building blocks of an AI platform on a cloud, told as Brightpost's reply-drafting assistant
// (cloud/operations/ai-ml-platforms-on-the-cloud). Step 1: the assistant calls a model that Asha tuned on 9,000 old
// support emails and serves from a GPU machine kept on all day. Step 2 (the failure step): the help article changes
// the Christmas date, but the tuned model has no way to read it and keeps writing the old date. Step 3: the tuned
// endpoint is deleted and the app calls a hosted model through one API, paid per token. Step 4: an index job turns
// the help articles into a vector index, and the app searches it before each call. Step 5: an evaluation set of 80
// test questions runs on every change. Step 6: a usage monitor watches tokens and spend, and the model is called
// through a private endpoint in the UK region. Step 7: the only model Brightpost owns (the photo style tagger) gets a
// training pipeline on the GPUs and a model registry that accepts versions that pass the tests.
//
// Nodes never move and never disappear. The GPU node is not "the endpoint": it is rented accelerator capacity, which
// the tuned model used in steps 1 and 2 and the training pipeline uses in step 7. The endpoint's state lives in the
// labels of the app-to-GPU edges, which end at steps 1, 2 and 3 (`until`).
//
// Layout: three columns, four rows.
//   Left (x 130): support agent, reply drafter, GPU machines, training pipeline.
//   Middle (x 390): vector index, hosted model API, shop data, model registry.
//   Right (x 665): index job, usage monitor, evaluation set.
// Rows (centres): 95 | 245 | 400 | 550.
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 to 3 use only the left and middle
// columns, so the free preview, the failure and the first fix show without scrolling.
//
// Edge routing: the index job's feed leaves the shop data to the right and climbs the gutter between the middle and
// right columns (x 527); its label sits in the row gutter at y 170. The evaluation edge crosses that climb at about
// y 322, so its label sits at 0.3, inside the operations zone. Vertical edges in the left column run at x 130, right
// of the short zone tabs ("People", "Application", "GPUs", "Own models"), which end near 110.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Boxes fit
// the longest name the Services toggle puts in them ("Gemini on Vertex AI", "Bedrock evaluations", "SageMaker Pipelines").
const spec: DiagramSpec = {
  title: "From a tuned model on its own GPU to a hosted model with retrieval",
  width: 795,
  height: 625,
  steps: [
    { title: "A model tuned on old emails, on its own GPU" },
    { title: "The date moves, the model does not" },
    { title: "Move down: a hosted model through one API" },
    { title: "Ground the answers in the help articles" },
    { title: "Test every change before release" },
    { title: "Watch tokens, keep the data private" },
    { title: "Own a model only where it pays" },
  ],
  zones: [
    { id: "people", title: "People", tone: "neutral", x: 10, y: 40, w: 240, h: 110 },
    { id: "app", title: "Application", tone: "teal", x: 10, y: 190, w: 240, h: 110 },
    { id: "gpus", title: "GPUs", tone: "teal", x: 10, y: 345, w: 240, h: 110 },
    { id: "own", title: "Own models", tone: "teal", x: 10, y: 495, w: 490, h: 115 },
    { id: "retrieval", title: "Retrieval", tone: "violet", x: 280, y: 40, w: 505, h: 110 },
    { id: "platform", title: "Model platform", tone: "blue", x: 280, y: 190, w: 220, h: 110 },
    { id: "storage", title: "Storage", tone: "violet", x: 280, y: 345, w: 220, h: 110 },
    { id: "ops", title: "Operations", tone: "orange", x: 555, y: 190, w: 230, h: 265 },
  ],
  nodes: [
    // Step 1
    {
      id: "agent",
      label: "Support agent",
      sub: "about 60 emails a day",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 176,
    },
    {
      id: "app",
      label: "Reply drafter",
      sub: "the shop's code",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 245,
      w: 166,
    },
    {
      id: "gpu",
      label: "GPU machines",
      sub: "rented by the hour",
      icon: "gpu",
      tone: "teal",
      x: 130,
      y: 400,
      w: 176,
      cloud: {
        aws: { label: "GPU instances" },
        gcp: { id: "gcp-tpu", label: "GPUs and TPUs" },
        azure: { label: "N-series GPU VMs" },
      },
    },
    {
      id: "data",
      label: "Shop data",
      sub: "emails, articles, photos",
      icon: "blob",
      tone: "violet",
      x: 390,
      y: 400,
      w: 186,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 3
    {
      id: "modelapi",
      label: "Hosted model API",
      sub: "a catalog, per token",
      icon: "model",
      tone: "teal",
      accent: true,
      step: 3,
      x: 390,
      y: 245,
      w: 200,
      cloud: {
        aws: "aws-bedrock",
        gcp: { id: "gcp-vertex-ai", label: "Gemini on Vertex AI" },
        azure: "azure-foundry",
      },
    },

    // Step 4
    {
      id: "vector",
      label: "Vector index",
      sub: "120 articles as vectors",
      icon: "search",
      tone: "violet",
      step: 4,
      x: 390,
      y: 95,
      w: 196,
      cloud: {
        aws: { id: "aws-opensearch", label: "OpenSearch vectors" },
        gcp: { id: "gcp-vertex-ai", label: "Vector Search" },
        azure: "azure-ai-search",
      },
    },
    {
      id: "indexjob",
      label: "Index job",
      sub: "split, embed, store",
      icon: "pipeline",
      tone: "teal",
      step: 4,
      x: 665,
      y: 95,
      w: 200,
      cloud: {
        aws: { id: "aws-bedrock", label: "Knowledge Bases" },
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI RAG Engine" },
        azure: { id: "azure-ai-search", label: "Search indexer" },
      },
    },

    // Step 5
    {
      id: "eval",
      label: "Evaluation set",
      sub: "fixed test cases",
      icon: "policy",
      tone: "orange",
      step: 5,
      x: 665,
      y: 400,
      w: 200,
      cloud: {
        aws: { id: "aws-bedrock", label: "Bedrock evaluations" },
        gcp: { id: "gcp-vertex-ai", label: "Gen AI evaluation" },
        azure: { id: "azure-foundry", label: "Foundry evaluations" },
      },
    },

    // Step 6
    {
      id: "monitor",
      label: "Usage monitor",
      sub: "tokens, spend, alerts",
      icon: "meter",
      tone: "orange",
      step: 6,
      x: 665,
      y: 245,
      w: 190,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },

    // Step 7
    {
      id: "trainpipe",
      label: "Training pipeline",
      sub: "photo style tagger",
      icon: "pipeline",
      tone: "teal",
      step: 7,
      x: 130,
      y: 550,
      w: 200,
      cloud: {
        aws: { id: "aws-sagemaker", label: "SageMaker Pipelines" },
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI Pipelines" },
        azure: { id: "azure-ml", label: "Azure ML pipelines" },
      },
    },
    {
      id: "registry",
      label: "Model registry",
      sub: "approved versions",
      icon: "registry",
      tone: "violet",
      step: 7,
      x: 390,
      y: 550,
      w: 196,
      cloud: {
        aws: { id: "aws-sagemaker", label: "Model Registry" },
        gcp: { id: "gcp-vertex-ai", label: "Model Registry" },
        azure: { id: "azure-ml", label: "Azure ML registry" },
      },
    },
  ],
  edges: [
    // Step 1: the agent asks for a draft; the app calls the tuned model on a GPU machine that is on all day.
    { from: "agent", to: "app", label: "draft a reply", packet: true },
    { from: "app", to: "gpu", label: "busy 2 h of 24", packet: true, bidirectional: true, until: 1 },
    { from: "data", to: "gpu", label: "tune", packet: true, until: 1 },

    // Step 2: the article changes, but nothing carries it into the model's weights; the reply has the old date.
    { from: "data", to: "gpu", label: "no way in", tone: "red", dashed: true, step: 2, until: 2 },
    { from: "gpu", to: "app", label: "says 18 Dec", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: the tuned endpoint is deleted; the app calls a hosted model and pays per token.
    { from: "app", to: "gpu", label: "endpoint deleted", dashed: true, step: 3, until: 3 },
    { from: "app", to: "modelapi", label: "prompt", packet: true, step: 3, until: 5 },

    // Step 4: an index job reads each edited article and fills the vector index; the app searches it first.
    {
      from: "data",
      to: "indexjob",
      label: "on each edit",
      dashed: true,
      flow: true,
      via: [
        [527, 400],
        [527, 95],
      ],
      labelAt: 0.71,
      step: 4,
    },
    { from: "indexjob", to: "vector", label: "vectors", packet: true, step: 4 },
    { from: "app", to: "vector", label: "search: top 3", packet: true, step: 4 },

    // Step 5: a fixed set of test questions runs against the prompt and model on every change.
    { from: "eval", to: "modelapi", label: "80 tests", dashed: true, labelAt: 0.3, step: 5 },

    // Step 6: the call goes through a private endpoint in the UK region, and every token is counted.
    { from: "app", to: "modelapi", label: "private, UK", packet: true, step: 6 },
    { from: "modelapi", to: "monitor", label: "tokens", dashed: true, flow: true, step: 6 },

    // Step 7: the one model Brightpost owns is trained on the GPUs and registered only if it passes the tests.
    { from: "data", to: "trainpipe", label: "tagged photos", packet: true, step: 7 },
    { from: "trainpipe", to: "gpu", label: "training runs", packet: true, step: 7 },
    { from: "trainpipe", to: "registry", label: "versions", packet: true, step: 7 },
    { from: "eval", to: "registry", label: "must pass", dashed: true, step: 7 },
  ],
};

export default spec;
