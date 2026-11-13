import type { DiagramSpec } from "@/components/diagrams/types";

// Brightpost picks a place to run each workload (cloud/start-here/choosing-compute).
// Step 1: the shop app runs on a fleet of 2 to 10 virtual machines that the team patches, in front of the managed
// orders database. Step 2: the photo-resize job is a function, started once per uploaded photo. Step 3 (the failure
// step): the new 40-minute recommendation job is deployed as a function on a 01:00 schedule; the platform stops it at
// its 15-minute limit before it writes anything. Step 4: the job becomes a container job: the platform pulls its image
// from a registry, runs it to the end and stops it. Step 5: an alert fires when the job fails or the picks are late.
// Step 6: the shop app is packed into an image too, so it can later move to the container platform.
//
// Nodes never move or disappear. The recommender is not a node of its own while it is a function: it is the
// scheduler's edge into the Functions node and the red edge to the database, both ending at step 3 (`until: 3`).
//
// Layout: three columns. Left (x 125): customers, the photo buckets and the functions. Middle (x 370): the app
// servers, the orders database and the scheduler. Right (x 670): the container platform (registry, job) and the
// alert. Rows (centres): 95 | 255 | 415.
// customers 125,95 | app 370,95 | registry 670,95 | photos 125,255 | db 370,255 | job 670,255 |
// fn 125,415 | sched 370,415 | alert 670,415.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 (the free
// preview and the failure) use only the left and middle columns, whose boxes end by x 481. Steps 4 to 6 add the right
// column. The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Tabs: a zone's tab spans x+16 to x+44+8.2 per title character, y-14 to y+14. The app-to-database edge enters the
// Data zone at x 370, right of its tab (260-321). The vertical edges into the Functions and Monitoring zones run
// through their tabs' x range, so those two zones use the subnet kind (inline label, no tab). The two diagonals
// (functions to database, scheduler to job) cross the gutter between rows 2 and 3 (y 310-360), clear of every tab,
// and their pills sit there too; the red one uses labelAt 0.6 to stay clear of the Schedule tab.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest Services-toggle names: "Managed instance group" (w 224), "Database for PostgreSQL" (w 222), "ECS task on
// Fargate", "Container Apps job" and "Artifact Registry" (w 196), "Cloud Run functions" (w 190).
const spec: DiagramSpec = {
  title: "Where Brightpost runs each workload",
  width: 795,
  height: 490,
  steps: [
    { title: "Today: the shop on a VM fleet" },
    { title: "Photos go to a function" },
    { title: "A 40-minute job in a 15-minute function" },
    { title: "Run it as a container job" },
    { title: "Alert when the picks are late" },
    { title: "Pack the shop app as an image too" },
  ],
  zones: [
    { id: "customers", title: "Customers", tone: "neutral", x: 10, y: 40, w: 214, h: 150 },
    { id: "vms", title: "Virtual machines", tone: "teal", x: 244, y: 40, w: 252, h: 110 },
    { id: "storage", title: "Storage", tone: "violet", x: 10, y: 200, w: 214, h: 120 },
    { id: "data", title: "Data", tone: "violet", x: 244, y: 200, w: 252, h: 110 },
    { id: "functions", title: "Functions", tone: "teal", kind: "subnet", x: 10, y: 360, w: 220, h: 110 },
    { id: "schedule", title: "Schedule", tone: "orange", x: 244, y: 360, w: 252, h: 110 },
    { id: "platform", title: "Container platform", tone: "teal", x: 552, y: 32, w: 236, h: 278 },
    { id: "monitoring", title: "Monitoring", tone: "orange", kind: "subnet", x: 552, y: 360, w: 236, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "customers",
      label: "Customers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 125,
      y: 95,
    },
    {
      id: "app",
      label: "App servers",
      sub: "2 to 10 VMs, we patch",
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
      x: 370,
      y: 255,
      w: 222,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Database for PostgreSQL" },
      },
    },

    // Step 2
    {
      id: "photos",
      label: "Photo buckets",
      sub: "uploads, thumbnails",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 125,
      y: 255,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "fn",
      label: "Functions",
      sub: "resize: 2 s a photo",
      icon: "function",
      tone: "teal",
      step: 2,
      x: 125,
      y: 415,
      w: 190,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },

    // Step 3: the failure
    {
      id: "sched",
      label: "Scheduler",
      sub: "01:00 every night",
      icon: "clock",
      tone: "orange",
      step: 3,
      x: 370,
      y: 415,
      w: 166,
      cloud: {
        aws: "aws-eventbridge",
        gcp: { label: "Cloud Scheduler" },
        azure: { label: "Cron trigger" },
      },
    },

    // Step 4
    {
      id: "registry",
      label: "Image registry",
      sub: "the job's image",
      icon: "image",
      tone: "teal",
      step: 4,
      x: 670,
      y: 95,
      w: 196,
      cloud: { aws: "aws-ecr", gcp: "gcp-artifact-registry", azure: "azure-acr" },
    },
    {
      id: "job",
      label: "Container job",
      sub: "runs to the end, stops",
      icon: "container",
      tone: "teal",
      step: 4,
      x: 670,
      y: 255,
      w: 196,
      cloud: {
        aws: { id: "aws-fargate", label: "ECS task on Fargate" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run job" },
        azure: { id: "azure-container-apps", label: "Container Apps job" },
      },
    },

    // Step 5
    {
      id: "alert",
      label: "Alert",
      sub: "no picks by 03:00",
      icon: "bell",
      tone: "orange",
      step: 5,
      x: 670,
      y: 415,
      w: 196,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },
  ],
  edges: [
    // Step 1: shoppers reach the fleet; the fleet reads and writes orders.
    { from: "customers", to: "app", label: "orders", packet: true },
    { from: "app", to: "db", label: "SQL", packet: true, delay: 1 },

    // Step 2: each new photo starts the function, which writes the thumbnail back.
    { from: "photos", to: "fn", label: "each new photo", bidirectional: true, packet: true, step: 2 },

    // Step 3: the schedule starts the recommender as a function; the platform stops it at 15 minutes, mid-read.
    { from: "sched", to: "fn", label: "01:00", packet: true, step: 3, until: 3 },
    {
      from: "fn",
      to: "db",
      label: "stopped at 15 min",
      tone: "red",
      dashed: true,
      labelAt: 0.6,
      step: 3,
      until: 3,
    },

    // Step 4: the schedule starts a container job instead; it pulls its image, reads orders and writes the picks.
    { from: "sched", to: "job", label: "01:00", packet: true, step: 4 },
    { from: "registry", to: "job", label: "pulls image", dashed: true, step: 4 },
    { from: "job", to: "db", label: "writes picks", packet: true, delay: 1.2, step: 4 },

    // Step 5: a failed or late run raises an alert instead of an empty row nobody sees.
    { from: "job", to: "alert", label: "failed or late", dashed: true, flow: true, step: 5 },

    // Step 6: the shop app is packed into an image too; it can move to the platform later without a rewrite.
    { from: "app", to: "registry", label: "shop image", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
