import type { DiagramSpec } from "@/components/diagrams/types";

// Deployment strategies on one fleet, told as the story of Brightpost's column rename
// (cloud/operations/ci-cd-and-deployment-strategies).
// Step 1: the pipeline builds one image, and the deploy replaces all 3 servers at once. Step 2: a rolling deploy
// replaces one server at a time, so the old and the new version serve shoppers together. Step 3 (the failure step):
// the pipeline renames a database column before the rollout; every checkout that reaches an old server fails until
// the last old server is gone, 12 minutes later. Step 4: expand and contract: add the new column, keep the old one,
// and the new version writes both, so either version works. Step 5: blue/green: the new version runs as a full
// second fleet, the balancer flips all traffic, and the old fleet stays warm for a rollback. Step 6: canary: the new
// version takes 5% of traffic while an alarm watches its error rate and shifts the traffic back on its own. Step 7:
// a feature flag: the new checkout ships switched off, so a deploy and a release become two different moments.
//
// Nodes never move between steps. Each strategy is a different set of edges between the same boxes, so the edges of
// earlier strategies end with `until`. The full view shows the final state: canary, alarm and flag.
//
// Layout: three columns that read left to right.
//   Left (x 130), "the old side": shoppers, the current version, the orders database, the migration job.
//   Middle (x 395), "the new side": load balancer, the new version, the registry, the pipeline.
//   Right (x 672), "release control" (steps 6 and 7 only): alarm, flag service.
// Rows (centres): 95 | 245 | 405 | 565.
// shoppers 130,95 | lb 395,95 | alarm 672,95 | current 130,245 | next 395,245 | flag 672,245 |
// db 130,405 | registry 395,405 | migration 130,565 | pipeline 395,565.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 5 use only the
// left and middle columns, so the free preview and the failure show without scrolling. The canvas stays under 800
// wide so labels stay readable in the 660 px article column.
//
// Crossings: the registry feeds the current version only in step 1 (`until: 1`), and the new version reaches the
// database only from step 2, so those two diagonals are never drawn together. Vertical edges into a zone run at
// x 130 or x 395, right of the zone tabs. Every zone top sits at least 26 units above its first node.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle puts in them ("Cloud Load Balancing", "Cloud Build + Deploy",
// "Auto Scaling group", "App Configuration"), not only for the generic label.
// Both fleets are the same kind of thing on each cloud: a group of identical servers built from one image.
const fleet = {
  aws: { id: "aws-ec2", label: "Auto Scaling group" },
  gcp: { id: "gcp-compute-engine", label: "Instance group" },
  azure: { id: "azure-vm", label: "VM scale set" },
};

const spec: DiagramSpec = {
  title: "All at once, rolling, blue/green, canary and flags on one fleet",
  width: 795,
  height: 625,
  steps: [
    { title: "Build once, replace every server at once" },
    { title: "Rolling: old and new serve together" },
    { title: "A column rename breaks the old servers" },
    { title: "Expand and contract: both versions work" },
    { title: "Blue/green: flip all traffic, keep the old fleet" },
    { title: "Canary: 5% first, an alarm can roll it back" },
    { title: "Feature flag: deploy now, release later" },
  ],
  zones: [
    { id: "outside", title: "Outside", tone: "neutral", x: 10, y: 40, w: 240, h: 105 },
    { id: "network", title: "Network", tone: "blue", x: 280, y: 40, w: 230, h: 105 },
    { id: "control", title: "Release control", tone: "orange", x: 560, y: 40, w: 225, h: 265 },
    { id: "servers", title: "Shop servers", tone: "teal", x: 10, y: 190, w: 500, h: 115 },
    { id: "data", title: "Data", tone: "violet", x: 10, y: 350, w: 240, h: 255 },
    { id: "delivery", title: "Delivery", tone: "orange", x: 280, y: 350, w: 230, h: 255 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "about 40 at once",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 170,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "one address",
      icon: "load-balancer",
      tone: "blue",
      x: 395,
      y: 95,
      w: 200,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: "gcp-cloud-load-balancing",
        azure: { id: "azure-app-gateway", label: "Application Gateway" },
      },
    },
    {
      id: "current",
      label: "Current version",
      sub: "blue servers",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 245,
      w: 196,
      cloud: fleet,
    },
    {
      id: "db",
      label: "Orders database",
      sub: "one schema",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 405,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
    {
      id: "registry",
      label: "Registry",
      sub: "one digest per build",
      icon: "registry",
      tone: "orange",
      variant: "glyph",
      x: 395,
      y: 405,
      cloud: { aws: "aws-ecr", gcp: "gcp-artifact-registry", azure: "azure-acr" },
    },
    {
      id: "pipeline",
      label: "CI/CD pipeline",
      sub: "build, test, deploy",
      icon: "pipeline",
      tone: "orange",
      x: 395,
      y: 565,
      w: 200,
      cloud: {
        aws: "aws-codepipeline",
        gcp: { id: "gcp-cloud-deploy", label: "Cloud Build + Deploy" },
        azure: "azure-pipelines",
      },
    },

    // Step 2
    {
      id: "next",
      label: "New version",
      sub: "green servers",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 395,
      y: 245,
      w: 196,
      cloud: fleet,
    },

    // Step 3: the failure
    {
      id: "migration",
      label: "Migration job",
      sub: "schema changes",
      icon: "workers",
      tone: "teal",
      step: 3,
      x: 130,
      y: 565,
      w: 176,
    },

    // Step 6
    {
      id: "alarm",
      label: "Alarm",
      sub: "error rate > 1%",
      icon: "bell",
      tone: "orange",
      step: 6,
      x: 672,
      y: 95,
      w: 180,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch alarm" },
        gcp: { id: "gcp-cloud-monitoring", label: "Alerting policy" },
        azure: { id: "azure-monitor", label: "Monitor alert" },
      },
    },

    // Step 7
    {
      id: "flag",
      label: "Flag service",
      sub: "on, off, or 10%",
      icon: "flag",
      tone: "orange",
      step: 7,
      x: 672,
      y: 245,
      w: 190,
      cloud: {
        aws: { label: "AppConfig flags" },
        gcp: { label: "Flag library" },
        azure: { id: "azure-app-configuration", label: "App Configuration" },
      },
    },
  ],
  edges: [
    // Always: shoppers reach one address, and the pipeline builds one image per commit.
    { from: "shoppers", to: "lb", label: "pages", packet: true },
    { from: "pipeline", to: "registry", label: "build once", packet: true },

    // Step 1: all at once. Every server is replaced together, so the shop is down while they restart.
    { from: "lb", to: "current", label: "all traffic", packet: true, delay: 0.6, until: 1 },
    { from: "registry", to: "current", label: "all 3 at once", dashed: true, flow: true, until: 1 },
    { from: "current", to: "db", label: "reads, writes", packet: true, delay: 1.2, until: 2 },

    // Step 2: rolling. One server at a time moves to the new version; both versions take traffic.
    { from: "registry", to: "next", label: "1 server at a time", dashed: true, flow: true, labelAt: 0.62, step: 2 },
    { from: "lb", to: "current", label: "old version", packet: true, delay: 0.6, step: 2, until: 4 },
    { from: "lb", to: "next", label: "new version", packet: true, delay: 0.6, step: 2, until: 4 },
    { from: "next", to: "db", label: "reads, writes", packet: true, delay: 1.2, step: 2, until: 3 },

    // Step 3: the failure. The rename runs first; the old servers still write the old column name.
    { from: "pipeline", to: "migration", label: "runs first", dashed: true, step: 3 },
    { from: "migration", to: "db", label: "rename column", tone: "red", packet: true, step: 3, until: 3 },
    {
      from: "current",
      to: "db",
      label: "old column: error",
      tone: "red",
      dashed: true,
      packet: true,
      delay: 1.2,
      step: 3,
      until: 3,
    },

    // Step 4: expand and contract. Add the new column, keep the old one; the new version writes both.
    { from: "migration", to: "db", label: "add column", tone: "green", packet: true, step: 4 },
    { from: "current", to: "db", label: "old column: OK", packet: true, delay: 1.2, step: 4 },
    { from: "next", to: "db", label: "writes both", packet: true, delay: 1.2, step: 4 },

    // Step 5: blue/green. All traffic flips to the new fleet; the old fleet stays up, unused, for a rollback.
    { from: "lb", to: "next", label: "100% after flip", packet: true, delay: 0.6, step: 5, until: 5 },
    { from: "lb", to: "current", label: "0%, kept warm", dashed: true, step: 5, until: 5 },

    // Step 6: canary. 5% goes to the new version; the alarm watches it and can send the 5% back.
    { from: "lb", to: "next", label: "canary 5%", packet: true, delay: 0.6, step: 6 },
    { from: "lb", to: "current", label: "95%", packet: true, delay: 0.6, step: 6 },
    { from: "next", to: "alarm", label: "error rate", dashed: true, flow: true, step: 6 },
    { from: "alarm", to: "lb", label: "roll back", tone: "orange", packet: true, delay: 1.6, step: 6 },

    // Step 7: a feature flag. The new checkout is in the deployed code but switched off.
    { from: "flag", to: "next", label: "flag: off", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
