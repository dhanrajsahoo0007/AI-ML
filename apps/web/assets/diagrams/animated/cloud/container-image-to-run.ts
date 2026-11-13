import type { DiagramSpec } from "@/components/diagrams/types";

// From a build to a running container, told as Brightpost's two-versions incident (cloud/compute/containers-and-
// registries). Step 1: the build pushes `shop:latest` to one registry, and three app servers pull `latest` when they
// start. Step 2 (the failure step): a half-tested build is pushed under the same tag; servers 2 and 3 start after
// it and pull it, server 1 still runs 1.4, so the shop runs two versions for 40 minutes. Step 3: every build gets a
// version tag and a digest, and servers pull the digest. Step 4: the registry scans each push and finds a critical
// flaw in the base layer. Step 5: builds land in a test registry; only a tested, clean digest is promoted to the
// registry production pulls from. Step 6: the pipeline signs the digest, and a check runs only signed digests.
// Step 7: a lifecycle rule deletes old test builds, and a replica keeps the images in a second region.
//
// Nodes never move or disappear. What a later step replaces is an edge with `until`: the `latest` pushes and pulls,
// the red test-build edges, the first scan edge and the first push to the test registry.
//
// Layout: three columns. Left (x 115): the three app servers, stacked, so the failure is a fan of three pulls.
// Middle (x 400): build pipeline 95 | test registry 230 | image registry 370 | signature check 510, one vertical
// pipeline. Right (x 680): lifecycle rule 155 | image scanner 300 | registry replica 460.
// The image registry sits on server 2's row, so its three pulls fan out evenly to rows 270, 370 and 470.
// Before step 5 the push edge runs straight down through the empty place the test registry later takes.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 (the free
// preview, the failure and the digest fix) use only the left and middle columns.
//
// Tabs: a zone's tab spans x+16 to x+44+8.2 per title character. The middle zones start at x 290 with short titles
// ("Build", "Images", "Policy", tabs ending by 383), so the vertical edges at x 400 enter right of each tab.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// Services-toggle names: "Binary Authorization" (w 200), "Container Registry" and "Defender for Cloud" (w 184 to
// 196), "Compute Engine VM" (w 180).
const SERVER_CLOUD = {
  aws: { id: "aws-ec2", label: "EC2 instance" },
  gcp: { id: "gcp-compute-engine", label: "Compute Engine VM" },
  azure: { id: "azure-vm", label: "Azure VM" },
};

const spec: DiagramSpec = {
  title: "From a build to a running container, by digest",
  width: 795,
  height: 590,
  steps: [
    { title: "Build, push latest, servers pull latest" },
    { title: "A test build moves latest: two versions live" },
    { title: "Version tags and digests: servers pull exact bytes" },
    { title: "The registry scans every push" },
    { title: "Test first, then promote the same digest" },
    { title: "Sign the digest, run only signed images" },
    { title: "Clean up old builds, keep a copy in a second region" },
  ],
  zones: [
    { id: "servers", title: "Shop servers", tone: "teal", x: 10, y: 215, w: 215, h: 305 },
    { id: "build", title: "Build", tone: "orange", x: 290, y: 40, w: 220, h: 110 },
    { id: "images", title: "Images", tone: "violet", x: 290, y: 175, w: 220, h: 255 },
    { id: "policy", title: "Policy", tone: "red", x: 290, y: 455, w: 220, h: 110 },
    { id: "housekeeping", title: "Housekeeping", tone: "orange", x: 578, y: 100, w: 207, h: 110 },
    { id: "security", title: "Security", tone: "red", x: 578, y: 245, w: 207, h: 110 },
    { id: "region2", title: "Second region", tone: "neutral", x: 578, y: 395, w: 207, h: 125 },
  ],
  nodes: [
    // Step 1
    {
      id: "build",
      label: "Build pipeline",
      sub: "Dockerfile to image",
      icon: "pipeline",
      tone: "orange",
      x: 400,
      y: 95,
      w: 184,
      cloud: {
        aws: { label: "CodeBuild" },
        gcp: "gcp-cloud-build",
        azure: { id: "azure-acr", label: "ACR Tasks" },
      },
    },
    {
      id: "registry",
      label: "Image registry",
      sub: "servers pull here",
      icon: "image",
      tone: "violet",
      x: 400,
      y: 370,
      w: 196,
      cloud: { aws: "aws-ecr", gcp: "gcp-artifact-registry", azure: { id: "azure-acr", label: "Container Registry" } },
    },
    {
      id: "srv1",
      label: "App server 1",
      sub: "runs the shop image",
      icon: "container",
      tone: "teal",
      x: 115,
      y: 270,
      w: 180,
      cloud: SERVER_CLOUD,
    },
    {
      id: "srv2",
      label: "App server 2",
      sub: "runs the shop image",
      icon: "container",
      tone: "teal",
      x: 115,
      y: 370,
      w: 180,
      cloud: SERVER_CLOUD,
    },
    {
      id: "srv3",
      label: "App server 3",
      sub: "runs the shop image",
      icon: "container",
      tone: "teal",
      x: 115,
      y: 470,
      w: 180,
      cloud: SERVER_CLOUD,
    },

    // Step 4
    {
      id: "scanner",
      label: "Image scanner",
      sub: "known flaws, per layer",
      icon: "search",
      tone: "red",
      step: 4,
      x: 680,
      y: 300,
      w: 184,
      cloud: {
        aws: "aws-inspector",
        gcp: { label: "Artifact Analysis" },
        azure: { id: "azure-defender", label: "Defender for Cloud" },
      },
    },

    // Step 5
    {
      id: "testreg",
      label: "Test registry",
      sub: "every build lands here",
      icon: "image",
      tone: "violet",
      step: 5,
      x: 400,
      y: 230,
      w: 196,
      cloud: {
        aws: { id: "aws-ecr", label: "ECR, test account" },
        gcp: { id: "gcp-artifact-registry", label: "Test repository" },
        azure: { id: "azure-acr", label: "Test registry" },
      },
    },

    // Step 6
    {
      id: "sigcheck",
      label: "Signature check",
      sub: "only signed digests run",
      icon: "certificate",
      tone: "red",
      step: 6,
      x: 400,
      y: 510,
      w: 200,
      cloud: {
        aws: { label: "AWS Signer" },
        gcp: { label: "Binary Authorization" },
        azure: { label: "Notation + Ratify" },
      },
    },

    // Step 7
    {
      id: "lifecycle",
      label: "Lifecycle rule",
      sub: "expire old builds",
      icon: "timer",
      tone: "orange",
      step: 7,
      x: 680,
      y: 155,
      w: 184,
      cloud: {
        aws: { label: "Lifecycle policy" },
        gcp: { label: "Cleanup policy" },
        azure: { label: "ACR purge task" },
      },
    },
    {
      id: "replica",
      label: "Registry replica",
      sub: "pulls stay in region",
      icon: "image",
      tone: "violet",
      step: 7,
      x: 680,
      y: 460,
      w: 184,
      cloud: {
        aws: { id: "aws-ecr", label: "ECR replication" },
        gcp: { id: "gcp-artifact-registry", label: "Multi-region repo" },
        azure: { id: "azure-acr", label: "Geo-replica" },
      },
    },
  ],
  edges: [
    // Step 1: one tag for everything. Each server pulls whatever `latest` means when it starts.
    { from: "build", to: "registry", label: "push shop:latest", packet: true, until: 1 },
    { from: "registry", to: "srv1", label: "pull latest", packet: true, delay: 1, until: 1 },
    { from: "registry", to: "srv2", label: "pull latest", packet: true, delay: 1, until: 1 },
    { from: "registry", to: "srv3", label: "pull latest", packet: true, delay: 1, until: 1 },

    // Step 2: the failure. A half-tested build takes the tag; servers that start after 10:50 get it.
    { from: "build", to: "registry", label: "test build as latest", tone: "red", packet: true, step: 2, until: 2 },
    { from: "registry", to: "srv1", label: "latest = 1.4", step: 2, until: 2 },
    {
      from: "registry",
      to: "srv2",
      label: "latest = test",
      tone: "red",
      packet: true,
      delay: 1,
      step: 2,
      until: 2,
    },
    {
      from: "registry",
      to: "srv3",
      label: "latest = test",
      tone: "red",
      packet: true,
      delay: 1,
      step: 2,
      until: 2,
    },

    // Step 3: a version tag for people, a digest for machines. All three servers pull the same bytes.
    { from: "build", to: "registry", label: "push v1.5 + digest", packet: true, step: 3, until: 4 },
    { from: "registry", to: "srv1", label: "sha256:4f2a…", packet: true, delay: 1, step: 3 },
    { from: "registry", to: "srv2", label: "sha256:4f2a…", packet: true, delay: 1, step: 3 },
    { from: "registry", to: "srv3", label: "sha256:4f2a…", packet: true, delay: 1, step: 3 },

    // Step 4: every push is scanned against public lists of known flaws.
    { from: "registry", to: "scanner", label: "scan on push", dashed: true, flow: true, step: 4, until: 4 },

    // Step 5: builds land in the test registry. A tested, clean digest is copied, never rebuilt.
    { from: "build", to: "testreg", label: "push v1.5", packet: true, step: 5, until: 5 },
    { from: "testreg", to: "scanner", label: "gate", dashed: true, flow: true, step: 5 },
    { from: "registry", to: "scanner", label: "rescan daily", dashed: true, flow: true, step: 5 },
    { from: "testreg", to: "registry", label: "promote same digest", packet: true, delay: 0.8, step: 5 },

    // Step 6: the pipeline signs the digest; the check reads the signature from the registry.
    { from: "build", to: "testreg", label: "push and sign", packet: true, step: 6 },
    { from: "registry", to: "sigcheck", label: "signature", dashed: true, step: 6 },
    { from: "sigcheck", to: "srv3", label: "signed only", dashed: true, step: 6 },

    // Step 7: old test builds expire; production's images are copied to the second region.
    { from: "lifecycle", to: "testreg", label: "expire old", dashed: true, step: 7 },
    { from: "registry", to: "replica", label: "replicate", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
