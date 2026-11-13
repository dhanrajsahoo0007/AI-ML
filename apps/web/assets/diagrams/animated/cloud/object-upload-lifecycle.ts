import type { DiagramSpec } from "@/components/diagrams/types";

// Object storage, told as the story of Brightpost's product photos (cloud/data/object-storage).
// Step 1: staff upload each 20 MB original through the app server, which writes it to the uploads bucket by key.
// Step 2 (the only failure step): a thumbnail rebuild script, pointed at the wrong bucket, writes small thumbnails
// over 900 originals under the same keys; versioning is off, so nothing older is kept. Step 3: versioning is on;
// every overwrite keeps the previous version, and the 900 originals are restored from it. Step 4: the app only
// signs a short-lived URL; the browser uploads straight to the bucket, and the bucket's new-object event starts the
// resize worker, which writes the thumbnail. Step 5: a lifecycle rule moves originals to a cool class after 30 days.
// Step 6: every new version is copied to a locked bucket in a second region, in another account.
//
// Nodes never move and never disappear. Edges a later step replaces end with `until`: the two "through the app"
// edges stop at step 3, and the red overwrite stops at step 2 (from step 3 the same write only adds a version).
//
// Layout: three columns (left x 130, middle x 390, right x 672) and three rows (y 95, 250, 400).
//   Left: app server 130,95 | staff browser 130,250 | rebuild script 130,400.
//   Middle, all inside the uploads bucket zone: old versions 390,95 | uploads bucket 390,250 | cool class 390,400.
//   Right: thumbnails bucket 672,95 | resize worker 672,250 | locked copy 672,400.
// The bucket zone starts at y 40, so the diagonal edges from the app server and the script enter it through its
// left side (near y 190 and y 308), well below the zone tab. The signed URL and the old "photo" edge share the
// x 130 line but never show in the same view; their labels sit near the app end, clear of the Staff tab. The copy to
// the second region leaves the bucket downwards, runs right along y 330 under the worker and drops into the region
// zone at x 720, right of its short tab.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 (the free
// preview, the failure and the fix) use only the left and middle columns. The canvas stays under 800 wide.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Virtual Machines" (app, w 180), "Object Versioning" (versions, w 180),
// "Cloud Run functions" (worker, w 192), "Object replication" (copy, w 192).
const bucket = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "Object storage: from uploads through the app to signed uploads, versions, lifecycle and a locked copy",
  width: 795,
  height: 480,
  steps: [
    { title: "Photos pass through the app server" },
    { title: "A script overwrites 900 originals" },
    { title: "Versioning keeps every old copy" },
    { title: "A signed URL: straight to the bucket" },
    { title: "Lifecycle: originals go cool after 30 days" },
    { title: "A locked copy in a second region" },
  ],
  zones: [
    { id: "app", title: "Application", tone: "teal", x: 10, y: 40, w: 240, h: 110 },
    { id: "staff", title: "Staff", tone: "neutral", x: 10, y: 190, w: 240, h: 115 },
    { id: "jobs", title: "One-off job", tone: "neutral", x: 10, y: 345, w: 240, h: 115 },
    { id: "uploadsz", title: "Uploads bucket", tone: "violet", x: 290, y: 40, w: 200, h: 420 },
    { id: "thumbsz", title: "Thumbnails", tone: "violet", x: 560, y: 40, w: 225, h: 110 },
    { id: "compute", title: "Worker", tone: "teal", x: 560, y: 190, w: 225, h: 115 },
    { id: "region2", title: "Region 2", tone: "blue", x: 560, y: 345, w: 225, h: 115 },
  ],
  nodes: [
    // Step 1
    {
      id: "app",
      label: "App server",
      sub: "admin page",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 95,
      w: 180,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "staff",
      label: "Staff browser",
      sub: "300 photos a week",
      icon: "browser",
      tone: "neutral",
      x: 130,
      y: 250,
      w: 180,
    },
    {
      id: "uploads",
      label: "Uploads bucket",
      sub: "30,000 originals",
      icon: "blob",
      tone: "violet",
      accent: true,
      x: 390,
      y: 250,
      w: 180,
      cloud: bucket,
    },

    // Step 2: the failure
    {
      id: "script",
      label: "Rebuild script",
      sub: "output: wrong bucket",
      icon: "file",
      tone: "red",
      step: 2,
      x: 130,
      y: 400,
      w: 180,
    },

    // Step 3
    {
      id: "versions",
      label: "Old versions",
      sub: "kept 30 days",
      icon: "history",
      tone: "violet",
      step: 3,
      x: 390,
      y: 95,
      w: 180,
      cloud: {
        aws: { id: "aws-s3", label: "S3 Versioning" },
        gcp: { id: "gcp-cloud-storage", label: "Object Versioning" },
        azure: { id: "azure-blob", label: "Blob versioning" },
      },
    },

    // Step 4
    {
      id: "worker",
      label: "Resize worker",
      sub: "starts per photo",
      icon: "function",
      tone: "teal",
      step: 4,
      x: 672,
      y: 250,
      w: 192,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
    {
      id: "thumbs",
      label: "Thumbnails bucket",
      sub: "shop pictures",
      icon: "blob",
      tone: "violet",
      step: 4,
      x: 672,
      y: 95,
      w: 192,
      cloud: bucket,
    },

    // Step 5
    {
      id: "cool",
      label: "Cool class",
      sub: "originals > 30 days",
      icon: "archive",
      tone: "violet",
      step: 5,
      x: 390,
      y: 400,
      w: 180,
      cloud: {
        aws: { id: "aws-s3", label: "S3 Standard-IA" },
        gcp: { id: "gcp-cloud-storage", label: "Nearline" },
        azure: { id: "azure-blob", label: "Cool tier" },
      },
    },

    // Step 6
    {
      id: "replica",
      label: "Locked copy",
      sub: "in the audit account",
      icon: "lock",
      tone: "violet",
      step: 6,
      x: 672,
      y: 400,
      w: 192,
      cloud: {
        aws: { id: "aws-s3", label: "S3 Replication" },
        gcp: { id: "gcp-storage-transfer", label: "Storage Transfer" },
        azure: { id: "azure-blob", label: "Object replication" },
      },
    },
  ],
  edges: [
    // Step 1: every byte of every photo passes through the app server on its way to the bucket.
    { from: "staff", to: "app", label: "photo, 20 MB", packet: true, labelAt: 0.65, until: 3 },
    { from: "app", to: "uploads", label: "PUT by key", packet: true, delay: 1.2, until: 3 },

    // Step 2: the script writes thumbnails over the originals under the same keys.
    { from: "script", to: "uploads", label: "900 overwrites", tone: "red", packet: true, step: 2, until: 2 },

    // Step 3: the same kind of write now adds a version; the old originals come back.
    { from: "script", to: "uploads", label: "adds a version", dashed: true, step: 3 },
    { from: "versions", to: "uploads", label: "restore 900", tone: "green", packet: true, step: 3 },

    // Step 4: the app only signs; the bytes go straight to the bucket, and the bucket starts the worker.
    { from: "app", to: "staff", label: "signed URL", dashed: true, packet: true, labelAt: 0.35, step: 4 },
    { from: "staff", to: "uploads", label: "PUT, direct", packet: true, delay: 1.2, step: 4 },
    { from: "uploads", to: "worker", label: "new photo", dashed: true, flow: true, step: 4 },
    { from: "worker", to: "thumbs", label: "thumbnail", packet: true, delay: 1.2, labelAt: 0.65, step: 4 },

    // Step 5: a lifecycle rule moves originals to the cool class when they are 30 days old.
    { from: "uploads", to: "cool", label: "after 30 days", tone: "orange", flow: true, step: 5 },

    // Step 6: each new version is copied to a bucket in the second region, in the audit account.
    {
      from: "uploads",
      to: "replica",
      label: "each new version",
      dashed: true,
      flow: true,
      via: [
        [520, 330],
        [720, 330],
      ],
      labelAt: 0.6,
      step: 6,
    },
  ],
};

export default spec;
