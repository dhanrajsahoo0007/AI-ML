import type { DiagramSpec } from "@/components/diagrams/types";

// Moving bulk data into the cloud, told as the story of the photographer's archive (cloud/data/file-hybrid-and-transfer).
// Step 1: the archive sits on a NAS in Brightpost's office; a copy script pushes 12 TB of finished photos to the photo
// bucket over the office's one 100 Mbit/s line, which the staff also use for the help desk and mail. Step 2 (the only
// failure step): the full line makes the help desk time out all day, and the script skips 4,000 files without saying
// so. Step 3: a transfer agent next to the NAS replaces the script: capped to 30 Mbit/s in working hours, full speed at
// night, a checksum for every file. Step 4: the 100 TB of raw files go on a transfer appliance, filled on site and sent
// by courier. Step 5: a storage gateway keeps the office's share working after the NAS is retired; it caches hot files
// and syncs changes to a copy in the cloud. Step 6: the photographer sends new photos to a managed SFTP endpoint that
// writes into the bucket.
//
// Nodes never move and never disappear. The copy script is not a node, because the transfer agent replaces it: it
// lives in the labels of edges that end at step 2 (`until`). Two edges are twins: line-to-help-desk is plain in step 1,
// red in step 2 and plain again from step 3; line-to-bucket is a copy in step 1, a red "4,000 skipped" in step 2 and a
// checked copy from step 3.
//
// Layout: three rows of places, top to bottom: the office, the internet and courier band, the cloud.
//   Columns (centres): left x 130 | middle x 390 | right x 672.
//   Office (y 40-300): gateway 130,100 | NAS 390,100 / staff 130,235 | agent 390,235.
//   Courier (y 190-310): appliance 672,250, beside the office.
//   Internet band (y 335-445): help desk 130,390 | office line 390,390. Partner band: photographer 672,390.
//   Cloud (y 495-680): share copy 130,580 | photo bucket 390,575 | SFTP endpoint 672,600.
// The gaps between the bands (y 300-335 and 445-495) hold the pills of the vertical edges, off every zone border.
// Every byte the office sends goes through the office line node, so the reader sees one pipe shared by the staff, the
// copy, the agent and the gateway. The data path runs straight down the middle column (NAS, line, bucket); the agent
// sits on that path from step 3. The courier route (step 4) goes down the gutter at x 525, between the internet band
// and the partner band, and enters the bucket from the upper right.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the left and middle columns. The canvas stays under 800 wide so labels are
// readable in the 660 px article column.
// Zone tabs sit on a zone's top-left corner. The internet and partner bands use the subnet kind (inline label, no tab)
// because edges cross their tops. The courier route enters the appliance from above, right of the Courier tab.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized for
// the longest name the Services toggle shows: "Transfer Appliance" (w 190), "Storage Transfer", "Storage Gateway",
// "Partner gateway", "Transfer Family".
const bucket = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "Moving a photo archive into the cloud: online, by courier and through a gateway",
  width: 795,
  height: 695,
  steps: [
    { title: "A copy script over the office line" },
    { title: "The line fills and files go missing" },
    { title: "A transfer agent: capped, scheduled, checked" },
    { title: "The raw files go by courier" },
    { title: "A gateway keeps the office share" },
    { title: "Partners send files by SFTP" },
  ],
  zones: [
    { id: "office", title: "Brightpost office", tone: "neutral", x: 10, y: 40, w: 480, h: 260 },
    { id: "courier", title: "Courier", tone: "neutral", x: 560, y: 190, w: 225, h: 120 },
    { id: "internet", title: "Internet", tone: "neutral", kind: "subnet", x: 10, y: 335, w: 480, h: 110 },
    { id: "partner", title: "Partner", tone: "neutral", kind: "subnet", x: 560, y: 335, w: 225, h: 110 },
    { id: "cloud", title: "Cloud", tone: "blue", kind: "vpc", x: 10, y: 495, w: 775, h: 185 },
  ],
  nodes: [
    // Step 1: the office, its one line, and the bucket the photos must reach.
    {
      id: "nas",
      label: "Office NAS",
      sub: "12 TB + 100 TB raw",
      icon: "disk",
      tone: "violet",
      x: 390,
      y: 100,
      w: 190,
    },
    {
      id: "staff",
      label: "Office staff",
      sub: "support, finance",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 130,
      y: 235,
    },
    {
      id: "line",
      label: "Office line",
      sub: "100 Mbit/s, shared",
      icon: "router",
      tone: "blue",
      x: 390,
      y: 390,
      w: 170,
    },
    {
      id: "helpdesk",
      label: "Help desk",
      sub: "rented, in a browser",
      icon: "browser",
      tone: "neutral",
      x: 130,
      y: 390,
      w: 170,
    },
    {
      id: "bucket",
      label: "Photo bucket",
      sub: "photos + raw files",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 390,
      y: 575,
      cloud: bucket,
    },

    // Step 3: a transfer agent replaces the script.
    {
      id: "agent",
      label: "Transfer agent",
      sub: "VM beside the NAS",
      icon: "workers",
      tone: "teal",
      step: 3,
      x: 390,
      y: 235,
      w: 180,
      cloud: {
        aws: { id: "aws-datasync", label: "DataSync agent" },
        gcp: { id: "gcp-storage-transfer", label: "Storage Transfer" },
        azure: { label: "Storage Mover" },
      },
    },

    // Step 4: the raw files travel on a device.
    {
      id: "appliance",
      label: "Transfer appliance",
      sub: "filled on site, shipped",
      icon: "appliance",
      tone: "violet",
      step: 4,
      x: 672,
      y: 250,
      w: 190,
      cloud: {
        aws: { id: "aws-snow-family", label: "Snowball" },
        gcp: "gcp-transfer-appliance",
        azure: "azure-data-box",
      },
    },

    // Step 5: a gateway in the office, backed by a copy in the cloud.
    {
      id: "gateway",
      label: "Storage gateway",
      sub: "SMB share + cache",
      icon: "folder-share",
      tone: "teal",
      step: 5,
      x: 130,
      y: 100,
      w: 190,
      cloud: {
        aws: "aws-storage-gateway",
        gcp: { label: "Partner gateway" },
        azure: "azure-file-sync",
      },
    },
    {
      id: "cloudshare",
      label: "Share in the cloud",
      sub: "the office's files",
      icon: "folder",
      tone: "violet",
      step: 5,
      x: 130,
      y: 580,
      w: 190,
      cloud: {
        aws: { id: "aws-s3", label: "S3 bucket" },
        gcp: "gcp-cloud-storage",
        azure: "azure-files",
      },
    },

    // Step 6: a partner who can only send files over SFTP.
    {
      id: "photographer",
      label: "Photographer",
      sub: "200 photos a month",
      icon: "users",
      tone: "neutral",
      step: 6,
      x: 672,
      y: 390,
      w: 190,
    },
    {
      id: "sftp",
      label: "SFTP endpoint",
      sub: "no server to run",
      icon: "api",
      tone: "blue",
      step: 6,
      x: 672,
      y: 600,
      w: 180,
      cloud: {
        aws: "aws-transfer-family",
        gcp: { label: "Partner SFTP" },
        azure: { id: "azure-blob", label: "Blob SFTP" },
      },
    },
  ],
  edges: [
    // Step 1: everything the office sends shares one line.
    { from: "staff", to: "line", label: "web, mail" },
    { from: "line", to: "helpdesk", label: "help desk", until: 1 },
    { from: "nas", to: "line", label: "copy script", packet: true, until: 2 },
    { from: "line", to: "bucket", label: "one stream, no cap", packet: true, delay: 1, until: 1 },

    // Step 2: the line is full all day, and the script skips files it cannot name.
    { from: "line", to: "helpdesk", label: "time-outs", tone: "red", step: 2, until: 2 },
    { from: "line", to: "bucket", label: "4,000 skipped", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: the agent reads the NAS, keeps to a cap by day and checks every file.
    { from: "line", to: "helpdesk", label: "help desk", step: 3 },
    { from: "nas", to: "agent", label: "reads files", step: 3 },
    { from: "agent", to: "line", label: "30 Mbit/s by day", packet: true, step: 3 },
    { from: "line", to: "bucket", label: "checksum per file", packet: true, delay: 1, step: 3 },

    // Step 4: 100 TB is copied onto the appliance in the office, then driven to the cloud.
    { from: "nas", to: "appliance", label: "100 TB, on site", via: [[672, 100]], step: 4 },
    {
      from: "appliance",
      to: "bucket",
      label: "by courier",
      dashed: true,
      flow: true,
      via: [
        [525, 250],
        [525, 535],
      ],
      step: 4,
    },

    // Step 5: staff open files on the gateway; it syncs changes over the same line.
    { from: "staff", to: "gateway", label: "opens files", step: 5 },
    { from: "gateway", to: "line", label: "syncs changes", flow: true, labelAt: 0.3, step: 5 },
    { from: "line", to: "cloudshare", label: "kept in step", flow: true, labelAt: 0.62, step: 5 },

    // Step 6: the photographer uploads by SFTP; each file lands as an object.
    { from: "photographer", to: "sftp", label: "SFTP upload", packet: true, labelAt: 0.3, step: 6 },
    { from: "sftp", to: "bucket", label: "one object per file", packet: true, delay: 1.2, step: 6 },
  ],
};

export default spec;
