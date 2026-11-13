import type { DiagramSpec } from "@/components/diagrams/types";

// Batch jobs on spare capacity, told as Brightpost's month-end re-render (cloud/compute/batch-hpc-gpus).
// Step 1: one script on one spot machine reads every product photo and plans to upload all 12,000 new images at the
// end. Step 2 (the failure step): the provider takes the machine back after 5 hours; the finished images were on
// its local disk and are gone. Step 3: the work is split into 200 small jobs of 10 products each, in a job queue.
// Step 4: the batch service sees 200 waiting jobs and starts 20 spot machines. Step 5: each job saves every product
// as it goes; a reclaim now loses under 2 minutes, and the job goes back in the queue. Step 6: jobs that fail three
// times are set aside, and a final publish job waits until all 200 have succeeded.
//
// Nodes never move between steps. The single machine of steps 1-2 and the fleet of 20 are the same node ("Spot
// machines"); the edge labels carry the count. The local disk is never a node: it lives in the labels of edges that
// end at step 1 and step 2 (`until`).
//
// Layout: three columns.
//   Left (x 140), "the photos": uploads bucket, thumbnails bucket.
//   Middle (x 400), "the machines": spot machines, the provider that takes them back, the set-aside jobs.
//   Right (x 670), "the scheduling": job queue, batch service, publish job.
// Rows (centres): 100 | 235 | 370-445 | 585.
// uploads 140,100 | queue 670,100 | machines 400,235 | batch 670,235 | thumbs 140,370 | publish 670,390 |
// provider 400,445 | failed 400,585.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only the left and middle
// columns, so the free preview and the failure show without scrolling. The canvas stays at 800 wide.
//
// Zone tabs sit on the top-left corner. Vertical edges into the right column run at x 670, right of its tabs. The
// provider zone uses the subnet kind (inline label, no tab) because the reclaim edge leaves through its top. The edge
// to the set-aside jobs runs down the gutter between the middle and right columns (x 527).
// Nodes are sized for the longest name the Services toggle puts in them ("Job with tasks", "Compute environment").
const spec: DiagramSpec = {
  title: "From one long script on spot to a queue of small jobs",
  width: 800,
  height: 660,
  steps: [
    { title: "One script on one spot machine" },
    { title: "The machine is taken back" },
    { title: "Split the work into 200 jobs" },
    { title: "The batch service starts machines to match" },
    { title: "A reclaim now costs one small job" },
    { title: "Failed jobs set aside, then one final job" },
  ],
  zones: [
    { id: "storage", title: "Photo storage", tone: "violet", x: 20, y: 40, w: 240, h: 450 },
    { id: "compute", title: "Compute", tone: "teal", x: 290, y: 165, w: 220, h: 135 },
    { id: "outside", title: "Provider", tone: "neutral", kind: "subnet", x: 290, y: 380, w: 220, h: 110 },
    { id: "aside", title: "Set aside", tone: "orange", x: 290, y: 525, w: 220, h: 115 },
    { id: "jobs", title: "Jobs", tone: "orange", x: 545, y: 40, w: 235, h: 120 },
    { id: "sched", title: "Scheduler", tone: "teal", x: 545, y: 175, w: 235, h: 125 },
    { id: "final", title: "Final step", tone: "teal", x: 545, y: 330, w: 235, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "uploads",
      label: "Uploads bucket",
      sub: "2,000 product photos",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 140,
      y: 100,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "machines",
      label: "Spot machines",
      sub: "spare capacity",
      icon: "server",
      tone: "teal",
      x: 400,
      y: 235,
      w: 180,
      cloud: {
        aws: { id: "aws-ec2", label: "EC2 Spot" },
        gcp: { id: "gcp-compute-engine", label: "Spot VMs" },
        azure: { id: "azure-vm", label: "Spot VMs" },
      },
    },
    {
      id: "thumbs",
      label: "Thumbnails bucket",
      sub: "6 new sizes each",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 140,
      y: 370,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 2: the failure
    {
      id: "provider",
      label: "Cloud provider",
      sub: "wants its spare back",
      icon: "building",
      tone: "red",
      step: 2,
      x: 400,
      y: 445,
      w: 180,
    },

    // Step 3
    {
      id: "queue",
      label: "Job queue",
      sub: "200 jobs, 2 min each",
      icon: "queue",
      tone: "orange",
      step: 3,
      x: 670,
      y: 100,
      w: 180,
      cloud: {
        aws: { id: "aws-batch", label: "Job queue" },
        gcp: { id: "gcp-batch", label: "Job with tasks" },
        azure: { id: "azure-batch", label: "Job and tasks" },
      },
    },

    // Step 4
    {
      id: "batch",
      label: "Batch service",
      sub: "machines match queue",
      icon: "workers",
      tone: "teal",
      accent: true,
      step: 4,
      x: 670,
      y: 235,
      w: 180,
      cloud: { aws: "aws-batch", gcp: "gcp-batch", azure: "azure-batch" },
    },

    // Step 6
    {
      id: "failed",
      label: "Failed jobs",
      sub: "after 3 tries",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 400,
      y: 585,
      w: 180,
    },
    {
      id: "publish",
      label: "Publish job",
      sub: "waits for all 200",
      icon: "pipeline",
      tone: "teal",
      step: 6,
      x: 670,
      y: 390,
      w: 180,
    },
  ],
  edges: [
    // Step 1: one machine reads everything and keeps the results on its own disk until the end.
    { from: "uploads", to: "machines", label: "1 machine reads all", packet: true, labelAt: 0.42 },
    { from: "machines", to: "thumbs", label: "upload at the end", dashed: true, until: 1 },

    // Step 2: the provider takes the machine back after 5 hours; 9,000 finished images vanish with its disk.
    { from: "provider", to: "machines", label: "reclaim at 01:00", tone: "red", packet: true, step: 2, until: 2 },
    { from: "machines", to: "thumbs", label: "5 hours lost", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: one small job per 10 products, all in one queue.
    { from: "uploads", to: "queue", label: "10 products per job", packet: true, step: 3 },

    // Step 4: the batch service reads the queue and starts machines to match.
    { from: "queue", to: "batch", label: "200 waiting", flow: true, dashed: true, step: 4 },
    { from: "batch", to: "machines", label: "start 20", packet: true, step: 4 },

    // Step 5: each job saves each product as it goes; a reclaim loses one job, which is queued again.
    { from: "machines", to: "thumbs", label: "each job saves", packet: true, step: 5 },
    { from: "provider", to: "machines", label: "takes 1 of 20", tone: "red", packet: true, step: 5 },
    {
      from: "machines",
      to: "queue",
      label: "retry: back in queue",
      dashed: true,
      via: [
        [430, 150],
        [600, 150],
      ],
      labelAt: 0.45,
      step: 5,
    },

    // Step 6: three failures send a job aside; the publish job runs once every job has succeeded.
    {
      from: "batch",
      to: "failed",
      label: "3rd failure",
      tone: "orange",
      dashed: true,
      via: [
        [600, 312],
        [527, 312],
        [527, 585],
      ],
      labelAt: 0.72,
      step: 6,
    },
    { from: "batch", to: "publish", label: "all succeeded", packet: true, step: 6 },
  ],
};

export default spec;
