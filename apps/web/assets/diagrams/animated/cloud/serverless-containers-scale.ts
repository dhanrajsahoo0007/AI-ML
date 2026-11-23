import type { DiagramSpec } from "@/components/diagrams/types";

// Serverless containers, told as Brightpost's card maker (cloud/compute/serverless-containers-and-paas).
// Step 1: Asha hands the platform an image; the platform gives back an HTTPS front door that routes every request
// to revision v1. Step 2: one copy serves many requests at once, and the autoscaler adds copies (1 to 3) as requests
// in flight grow. Step 3 (the failure step): revision v2, with a 5 MB upload limit, takes 100% of traffic at once and
// refuses most phone photos. Step 4: traffic moves back to v1 in seconds; v2 stays, at 0%. Step 5: the fixed v3 gets
// 10%, then 50%, then 100%, while an alert watches errors per revision. Step 6: v3 reaches the private orders
// database through a link into the company network.
//
// Nodes never move or disappear. v2 is red because it is the broken revision; it stays on the canvas at 0%. Traffic
// that a later step changes is an edge with `until`: "all requests" to v1 (steps 1-2), "100% at once" to v2 (step 3)
// and "100% back" to v1 (step 4).
//
// Layout: three columns. Left (x 150): customers 150,95 | front door 150,375. Middle (x 440), the platform:
// autoscaler 440,110 | v1 440,240 | v2 440,375 | v3 440,525. Right (x 674): registry 674,110 | alert 674,375 |
// private link 674,525 | orders database 674,650. The 107-unit gap between the front door and v2 holds the
// "100% at once" pill; the diagonal labels sit at 0.62 of their edges, clear of the zone corners.
// The front door sits level with v2 and fans out to the three revisions: up to v1, across to v2, down to v3. That
// fan is the traffic split the page is about.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4 happen
// between the customers, the front door and the middle column, so the free preview and the failure need no
// scrolling. The registry's pull edge reaches in from the right.
//
// Tabs: a zone's tab spans x+16 to x+44+8.2 per title character. The customers-to-front-door edge runs down x 150,
// right of the "Front door" tab (26 to 136). Nothing enters the platform zone through its top. The alert edge
// leaves v3 to the upper right and enters Monitoring through its bottom edge.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest Services-toggle names: "ALB + certificate" (left, w 190), "Cloud Run scaling" and "Fargate tasks v1"
// (middle, w 176), "Direct VPC egress", "Artifact Registry", "Cloud Monitoring" and "Azure PostgreSQL" (right, w 200).
const spec: DiagramSpec = {
  title: "Serverless containers: revisions, copies and traffic splits",
  width: 790,
  height: 735,
  steps: [
    { title: "Hand over an image, get an HTTPS address" },
    { title: "One copy serves many requests; the platform adds copies" },
    { title: "A new revision takes 100% of traffic at once" },
    { title: "Roll back by moving traffic" },
    { title: "Release the fix: 10%, then 50%, then 100%" },
    { title: "Reach the private database" },
  ],
  zones: [
    { id: "people", title: "Customers", tone: "neutral", x: 10, y: 40, w: 245, h: 140 },
    { id: "edge", title: "Front door", tone: "blue", x: 10, y: 300, w: 245, h: 150 },
    { id: "platform", title: "Container platform", tone: "teal", x: 310, y: 40, w: 240, h: 560 },
    { id: "images", title: "Images", tone: "violet", x: 562, y: 40, w: 223, h: 170 },
    { id: "monitoring", title: "Monitoring", tone: "orange", x: 562, y: 305, w: 223, h: 150 },
    { id: "private", title: "Private network", tone: "blue", kind: "vpc", x: 562, y: 470, w: 223, h: 250 },
  ],
  nodes: [
    // Step 1
    {
      id: "customers",
      label: "Customers",
      sub: "make a custom card",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 150,
      y: 95,
    },
    {
      id: "front",
      label: "Front door",
      sub: "URL, TLS, routing",
      icon: "load-balancer",
      tone: "blue",
      x: 150,
      y: 375,
      w: 190,
      cloud: {
        aws: { id: "aws-elb", label: "ALB + certificate" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run URL" },
        azure: { id: "azure-container-apps", label: "Built-in ingress" },
      },
    },
    {
      id: "v1",
      label: "Revision v1",
      sub: "card maker",
      icon: "container",
      tone: "teal",
      x: 440,
      y: 240,
      w: 176,
      cloud: {
        aws: { id: "aws-fargate", label: "Fargate tasks v1" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run v1" },
        azure: { id: "azure-container-apps", label: "Container App v1" },
      },
    },
    {
      id: "registry",
      label: "Registry",
      sub: "card maker images",
      icon: "image",
      tone: "violet",
      x: 674,
      y: 110,
      w: 200,
      cloud: { aws: "aws-ecr", gcp: "gcp-artifact-registry", azure: "azure-acr" },
    },

    // Step 2
    {
      id: "autoscaler",
      label: "Autoscaler",
      sub: "copies follow load",
      icon: "controller",
      tone: "teal",
      step: 2,
      x: 440,
      y: 110,
      w: 176,
      cloud: {
        aws: { label: "App Auto Scaling" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run scaling" },
        azure: { label: "KEDA scale rules" },
      },
    },

    // Step 3: the failure
    {
      id: "v2",
      label: "Revision v2",
      sub: "upload limit 5 MB",
      icon: "container",
      tone: "red",
      step: 3,
      x: 440,
      y: 375,
      w: 176,
      cloud: {
        aws: { id: "aws-fargate", label: "Fargate tasks v2" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run v2" },
        azure: { id: "azure-container-apps", label: "Container App v2" },
      },
    },

    // Step 5
    {
      id: "v3",
      label: "Revision v3",
      sub: "limit fixed",
      icon: "container",
      tone: "teal",
      step: 5,
      x: 440,
      y: 525,
      w: 176,
      cloud: {
        aws: { id: "aws-fargate", label: "Fargate tasks v3" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run v3" },
        azure: { id: "azure-container-apps", label: "Container App v3" },
      },
    },
    {
      id: "alert",
      label: "Alert",
      sub: "errors per revision",
      icon: "bell",
      tone: "orange",
      step: 5,
      x: 674,
      y: 375,
      w: 200,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },

    // Step 6
    {
      id: "egress",
      label: "Private link",
      sub: "into your network",
      icon: "link",
      tone: "blue",
      step: 6,
      x: 674,
      y: 525,
      w: 200,
      cloud: {
        aws: { id: "aws-vpc", label: "Task in your VPC" },
        gcp: { id: "gcp-vpc", label: "Direct VPC egress" },
        azure: { label: "VNet environment" },
      },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "private address only",
      icon: "database",
      tone: "violet",
      step: 6,
      x: 674,
      y: 650,
      w: 200,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
  ],
  edges: [
    // Step 1: the platform gives back an HTTPS address and routes every request to the only revision.
    { from: "customers", to: "front", label: "HTTPS", packet: true },
    { from: "front", to: "v1", label: "all requests", packet: true, delay: 1, labelAt: 0.62, until: 2 },
    { from: "registry", to: "v1", label: "pull image", dashed: true, labelAt: 0.3 },

    // Step 2: the autoscaler counts requests in flight per copy and adds copies.
    { from: "autoscaler", to: "v1", label: "adds copies: 1 → 3", flow: true, step: 2 },

    // Step 3: the failure. Every request goes to the new revision at once.
    { from: "front", to: "v2", label: "100% at once", tone: "red", packet: true, step: 3, until: 3 },

    // Step 4: traffic moves back to v1. v2 is kept, with no traffic.
    { from: "front", to: "v1", label: "100% back", tone: "green", packet: true, labelAt: 0.62, step: 4, until: 4 },
    { from: "front", to: "v2", label: "0%", dashed: true, step: 4 },

    // Step 5: the fix gets a small share first, while an alert watches each revision's errors.
    { from: "front", to: "v1", label: "90% → 50% → 0%", dashed: true, labelAt: 0.62, step: 5 },
    { from: "front", to: "v3", label: "10% → 50% → 100%", packet: true, labelAt: 0.62, step: 5 },
    { from: "v3", to: "alert", label: "errors per revision", dashed: true, flow: true, labelAt: 0.62, step: 5 },

    // Step 6: the live revision reaches the database through a private link.
    { from: "v3", to: "egress", label: "SQL", packet: true, step: 6 },
    { from: "egress", to: "db", label: "private address", packet: true, delay: 1, step: 6 },
  ],
};

export default spec;
