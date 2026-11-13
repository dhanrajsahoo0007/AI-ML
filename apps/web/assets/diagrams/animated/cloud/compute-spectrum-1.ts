import type { DiagramSpec } from "@/components/diagrams/types";

// Brightpost's order-tracking page moves along the spectrum (cloud/compute/compute-spectrum).
// Step 1: tracking is part of the shop app on the VM fleet, in front of the managed orders database.
// Step 2: tracking moves to a serverless container platform with a minimum of zero copies; its 1.1 GB image comes
// from a registry. Step 3 (the failure step): after a quiet night the platform has no copy left, so the first
// shopper at 07:05 waits about 8 seconds while one starts. Step 4: one warm copy (minimum 1) answers at once, and a
// 180 MB image lets extra copies start in about 2 seconds. Step 5: an alert fires when slow replies come back.
//
// Nodes never move or disappear. What a later step replaces is an edge with `until`: the step-1 "orders, tracking"
// label, the step-2 tracking request, the red 8-second wait, and the 1.1 GB pull.
//
// Layout: three columns and three rows. Columns (centres): left 125 | middle 370 | right 670. Rows: 95 | 265 | 425.
// customers 125,265 | app 370,95 | db 670,95 | tracking 370,265 | registry 670,265 | warm 370,425 | alert 670,425.
// The customers sit in the middle row so the request to tracking is a straight line into the platform's left side,
// clear of its tab, and the request to the app climbs into the fleet's bottom edge.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 (the free
// preview and the failure) happen between the customers, the app and the tracking service, all in the left and
// middle columns. The registry's pull edge reaches in from the right.
//
// Tabs: a zone's tab spans x+16 to x+44+8.2 per title character, y-14 to y+14. The tracking-to-database diagonal
// leaves the platform zone through its top edge at x 467, right of the "Container platform" tab (260-452). The
// warm copy's alert edge is horizontal and enters Monitoring through its left side.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest Services-toggle names: "Managed instance group" (w 224), "Database for PostgreSQL" (w 222),
// "Cloud Run service" and "Container Registry" (w 196 to 210), "Min replicas: 1" and "Amazon CloudWatch" (w 196).
const spec: DiagramSpec = {
  title: "Brightpost's tracking page on serverless containers",
  width: 795,
  height: 500,
  steps: [
    { title: "Tracking runs inside the shop on the VMs" },
    { title: "Tracking moves to serverless containers, minimum zero" },
    { title: "After a quiet night, the first shopper waits 8 seconds" },
    { title: "One warm copy and a smaller image" },
    { title: "An alert on slow replies" },
  ],
  zones: [
    { id: "customers", title: "Customers", tone: "neutral", x: 10, y: 200, w: 214, h: 140 },
    { id: "vms", title: "VM fleet", tone: "teal", x: 244, y: 40, w: 252, h: 110 },
    { id: "data", title: "Data", tone: "violet", x: 552, y: 40, w: 236, h: 110 },
    { id: "platform", title: "Container platform", tone: "teal", x: 244, y: 210, w: 252, h: 270 },
    { id: "images", title: "Images", tone: "teal", x: 552, y: 210, w: 236, h: 110 },
    { id: "monitoring", title: "Monitoring", tone: "orange", x: 552, y: 370, w: 236, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "customers",
      label: "Customers",
      sub: "1,200 tracking visits a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 125,
      y: 265,
    },
    {
      id: "app",
      label: "App servers",
      sub: "2 to 10 VMs",
      icon: "server",
      tone: "teal",
      x: 370,
      y: 95,
      w: 224,
      cloud: {
        aws: { id: "aws-ec2", label: "EC2 Auto Scaling" },
        gcp: { id: "gcp-compute-engine", label: "Managed instance group" },
        azure: { id: "azure-vm", label: "VM Scale Sets" },
      },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "managed Postgres",
      icon: "database",
      tone: "violet",
      x: 670,
      y: 95,
      w: 222,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Database for PostgreSQL" },
      },
    },

    // Step 2
    {
      id: "tracking",
      label: "Tracking service",
      sub: "copies start on demand",
      icon: "container",
      tone: "teal",
      accent: true,
      step: 2,
      x: 370,
      y: 265,
      w: 210,
      cloud: {
        aws: { id: "aws-fargate", label: "Fargate service" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run service" },
        azure: { id: "azure-container-apps", label: "Container App" },
      },
    },
    {
      id: "registry",
      label: "Image registry",
      sub: "the tracking image",
      icon: "image",
      tone: "teal",
      step: 2,
      x: 670,
      y: 265,
      w: 196,
      cloud: { aws: "aws-ecr", gcp: "gcp-artifact-registry", azure: { id: "azure-acr", label: "Container Registry" } },
    },

    // Step 4
    {
      id: "warm",
      label: "Warm copy",
      sub: "minimum 1, always on",
      icon: "container",
      tone: "green",
      step: 4,
      x: 370,
      y: 425,
      w: 196,
      cloud: {
        aws: { label: "Min tasks: 1" },
        gcp: { label: "Min instances: 1" },
        azure: { label: "Min replicas: 1" },
      },
    },

    // Step 5
    {
      id: "alert",
      label: "Alert",
      sub: "slow replies",
      icon: "bell",
      tone: "orange",
      step: 5,
      x: 670,
      y: 425,
      w: 196,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
  ],
  edges: [
    // Step 1: shoppers order and track on the fleet; the fleet reads and writes orders.
    { from: "customers", to: "app", label: "orders, tracking", packet: true, until: 1 },
    { from: "app", to: "db", label: "SQL", packet: true, delay: 1 },

    // Step 2: tracking leaves the fleet. Its copies pull the 1.1 GB image and read the order status.
    { from: "customers", to: "app", label: "orders", packet: true, step: 2 },
    { from: "customers", to: "tracking", label: "tracking", packet: true, step: 2, until: 2 },
    { from: "registry", to: "tracking", label: "pulls 1.1 GB", dashed: true, step: 2, until: 3 },
    { from: "tracking", to: "db", label: "reads status", packet: true, delay: 1, step: 2 },

    // Step 3: the failure. No copy is running at 07:05, so the first request waits while one starts.
    { from: "customers", to: "tracking", label: "8 s wait", tone: "red", dashed: true, step: 3, until: 3 },

    // Step 4: the warm copy answers at once; extra copies pull a 180 MB image and start in about 2 seconds.
    { from: "customers", to: "warm", label: "0.3 s", packet: true, step: 4 },
    { from: "registry", to: "tracking", label: "pulls 180 MB", dashed: true, step: 4 },

    // Step 5: slow replies raise an alert before customers write to support.
    { from: "warm", to: "alert", label: "slow replies", dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
