import type { DiagramSpec } from "@/components/diagrams/types";

// Keeping accelerators busy, told as Brightpost's photo-tagging experiment (cloud/compute/batch-hpc-gpus).
// Step 1 (the naive setup): a notebook holds one GPU machine all week, 168 paid hours, and the busy-time meter reads
// 15%. Step 2: work goes into a job queue instead; one shared GPU runs jobs back to back and the meter reads about 80%.
// Step 3: training runs join the same queue, and the batch service starts GPUs when jobs wait and stops them at zero.
// One idea: a GPU is billed while it is on, busy or not, so a queue in front of it is what keeps it busy.
//
// Nodes never move. The notebook's direct hold on the GPU is an edge that ends at step 1 (`until: 1`); it runs
// straight down through the place where the queue appears in step 2, so the line and the queue never show together.
//
// Layout: three columns and three rows.
//   Top row (y 100), "who needs a GPU": tagging job, notebook, training runs.
//   Middle row (y 250): the job queue, under the notebook.
//   Bottom row (y 400): busy-time meter, GPU machines, batch service.
// Step 1 uses the left and middle columns only (notebook, GPU machines, meter), so it shows on a phone.
// Zone tabs sit on the top-left corner; the vertical edge at x 390 enters the "GPUs" zone right of its short tab.
// Nodes are sized for the longest name the Services toggle puts in them ("Vertex AI Workbench", "EC2 GPU instances").
const spec: DiagramSpec = {
  title: "A GPU kept busy by a queue",
  width: 780,
  height: 480,
  steps: [
    { title: "A notebook holds a GPU all week" },
    { title: "Jobs wait in a queue for a shared GPU" },
    { title: "GPUs follow the queue, down to zero" },
  ],
  zones: [
    { id: "users", title: "Who needs a GPU", tone: "neutral", x: 15, y: 40, w: 750, h: 115 },
    { id: "wait", title: "Queue", tone: "orange", x: 285, y: 195, w: 210, h: 105 },
    { id: "watch", title: "Watch", tone: "orange", x: 15, y: 340, w: 240, h: 120 },
    { id: "gpus", title: "GPUs", tone: "teal", x: 285, y: 340, w: 480, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "notebook",
      label: "Notebook",
      sub: "open all week",
      icon: "browser",
      tone: "neutral",
      x: 390,
      y: 100,
      w: 200,
      cloud: {
        aws: { id: "aws-sagemaker", label: "SageMaker notebook" },
        gcp: { id: "gcp-vertex-ai", label: "Vertex AI Workbench" },
        azure: { id: "azure-ml", label: "Compute instance" },
      },
    },
    {
      id: "pool",
      label: "GPU machines",
      sub: "billed while on",
      icon: "gpu",
      tone: "teal",
      accent: true,
      x: 390,
      y: 400,
      w: 190,
      cloud: {
        aws: { id: "aws-ec2", label: "EC2 GPU instances" },
        gcp: { id: "gcp-compute-engine", label: "GPU VMs" },
        azure: { id: "azure-vm", label: "N-series VMs" },
      },
    },
    {
      id: "meter",
      label: "Busy time",
      sub: "share of paid hours",
      icon: "meter",
      tone: "orange",
      x: 120,
      y: 400,
      w: 180,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch" },
        gcp: "gcp-cloud-monitoring",
        azure: "azure-monitor",
      },
    },

    // Step 2
    {
      id: "tagging",
      label: "Tagging job",
      sub: "2,000 product photos",
      icon: "media",
      tone: "neutral",
      step: 2,
      x: 135,
      y: 100,
      w: 190,
    },
    {
      id: "queue",
      label: "Job queue",
      sub: "one list for everyone",
      icon: "queue",
      tone: "orange",
      step: 2,
      x: 390,
      y: 250,
      w: 190,
      cloud: {
        aws: { id: "aws-batch", label: "Batch job queue" },
        gcp: { id: "gcp-batch", label: "Batch jobs" },
        azure: { id: "azure-batch", label: "Batch jobs" },
      },
    },

    // Step 3
    {
      id: "training",
      label: "Training runs",
      sub: "save every 30 min",
      icon: "model",
      tone: "neutral",
      step: 3,
      x: 645,
      y: 100,
      w: 190,
    },
    {
      id: "scaler",
      label: "Batch service",
      sub: "GPUs follow the queue",
      icon: "workers",
      tone: "teal",
      step: 3,
      x: 650,
      y: 400,
      w: 180,
      cloud: { aws: "aws-batch", gcp: "gcp-batch", azure: "azure-batch" },
    },
  ],
  edges: [
    // Step 1: the notebook keeps the machine on all week; it is busy for 25 of 168 hours.
    { from: "notebook", to: "pool", label: "holds 1 GPU, 168 h a week", dashed: true, until: 1 },
    { from: "pool", to: "meter", label: "15% busy", tone: "red", dashed: true, flow: true, until: 1 },

    // Step 2: everyone submits work to one queue; the GPU runs one job after another.
    { from: "notebook", to: "queue", label: "submits runs", packet: true, labelAt: 0.3, step: 2 },
    {
      from: "tagging",
      to: "queue",
      label: "1 job",
      packet: true,
      via: [[135, 250]],
      labelAt: 0.35,
      step: 2,
    },
    { from: "queue", to: "pool", label: "next job", packet: true, delay: 1.2, labelAt: 0.3, step: 2 },
    { from: "pool", to: "meter", label: "80% busy", tone: "green", dashed: true, flow: true, step: 2 },

    // Step 3: training joins the queue; the batch service turns GPUs on and off with the queue length.
    {
      from: "training",
      to: "queue",
      label: "checkpointed runs",
      packet: true,
      via: [[645, 250]],
      labelAt: 0.35,
      step: 3,
    },
    { from: "queue", to: "scaler", label: "queue length", dashed: true, flow: true, step: 3 },
    { from: "scaler", to: "pool", label: "0 to 2", packet: true, step: 3 },
  ],
};

export default spec;
