import type { DiagramSpec } from "@/components/diagrams/types";

// The three storage shapes, told as the story of Brightpost's print service (cloud/data/storage-types).
// Step 1: the order service books print jobs through an internal balancer; each of the two print servers renders
// a print file, saves it on its own disk (block storage) and sends it to the printing partner. Step 2 (the only
// failure step): the partner is down, server A's send fails, the retry lands on server B, and B cannot find the
// file, because it sits on disk A, which only server A can attach. Step 3: both servers mount one file share, so
// the retry on B finds the file. Step 4: print files move to a bucket (object storage): each server writes one
// object per order by key, and the partner downloads it with a signed link. The share keeps the templates and
// fonts that the render tool opens by path. Step 5: each shape gets its own backup: disk snapshots, a share
// backup and object versions, all copied to a backup vault.
//
// Nodes never move and never disappear. Edges a later step replaces are twins: server B's edge to disk B is a save
// in step 1 and a red "not found" in step 2; the send to the partner is plain in step 1, red in step 2 and a green
// retry from B in step 3, before the partner reads the bucket in step 4.
//
// Layout: three columns (left x 130, middle x 390, right x 672) and four rows.
//   Row 1 (y 100): order service 130 | internal balancer 390 | printing partner 672.
//   Row 2 (y 250): print server A 130 | print server B 390 | bucket 672.
//   Row 3 (y 410): disk A 130 | disk B 390 | backup vault 672 (y 420).
//   Row 4 (y 565): file share 260, centred under the gutter between the two servers.
// Edge routes: the two mount edges run down the gutter between the columns (x 235 and x 285), clear of both disks.
// Server A reaches the bucket over the top gutter (y 170) and enters it from the left below the zone tab; server B
// reaches it straight right. The partner reads the bucket straight down x 672, right of the short "Objects" tab.
// Disk A's snapshot edge runs along y 462, under both disk cards; the share's backup edge runs right along y 565
// and up x 672 into the vault.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the left and middle columns, apart from the partner. The canvas stays under
// 800 wide so labels are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Virtual Machines" (servers, w 176), "Persistent Disk" (disks, w 176),
// "Internal NLB" (balancer, w 184).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const disk = { aws: "aws-ebs", gcp: "gcp-persistent-disk", azure: "azure-managed-disks" } as const;

const spec: DiagramSpec = {
  title: "Object, block and file storage: from a private disk to a shared folder and a bucket",
  width: 795,
  height: 645,
  steps: [
    { title: "Each print server keeps files on its own disk" },
    { title: "A retry lands on the other server" },
    { title: "One file share, mounted by both" },
    { title: "Print files move to object storage" },
    { title: "Each shape gets its own backup" },
  ],
  zones: [
    { id: "shop", title: "Shop", tone: "teal", x: 10, y: 40, w: 240, h: 110 },
    { id: "network", title: "Network", tone: "blue", x: 290, y: 40, w: 200, h: 110 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 560, y: 40, w: 225, h: 110 },
    { id: "print", title: "Print service", tone: "teal", x: 10, y: 190, w: 480, h: 115 },
    { id: "disks", title: "Disks", tone: "violet", x: 10, y: 340, w: 480, h: 140 },
    { id: "files", title: "Files", tone: "violet", x: 90, y: 505, w: 340, h: 120 },
    { id: "objects", title: "Objects", tone: "violet", x: 580, y: 190, w: 205, h: 140 },
    { id: "backups", title: "Backups", tone: "violet", x: 580, y: 365, w: 205, h: 150 },
  ],
  nodes: [
    // Step 1
    {
      id: "order",
      label: "Order service",
      sub: "books print jobs",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 100,
      w: 176,
    },
    {
      id: "lb",
      label: "Internal balancer",
      sub: "picks A or B",
      icon: "load-balancer",
      tone: "blue",
      x: 390,
      y: 100,
      w: 184,
      cloud: {
        aws: { id: "aws-elb", label: "Internal NLB" },
        gcp: { id: "gcp-cloud-load-balancing", label: "Internal NLB" },
        azure: { id: "azure-load-balancer", label: "Internal LB" },
      },
    },
    {
      id: "partner",
      label: "Printing partner",
      sub: "prints the posters",
      icon: "building",
      tone: "neutral",
      x: 672,
      y: 100,
      w: 176,
    },
    {
      id: "pa",
      label: "Print server A",
      sub: "renders print files",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 250,
      w: 176,
      cloud: server,
    },
    {
      id: "pb",
      label: "Print server B",
      sub: "renders print files",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 250,
      w: 176,
      cloud: server,
    },
    {
      id: "da",
      label: "Disk A",
      sub: "attached to A only",
      icon: "disk",
      tone: "violet",
      x: 130,
      y: 410,
      w: 176,
      cloud: disk,
    },
    {
      id: "db",
      label: "Disk B",
      sub: "attached to B only",
      icon: "disk",
      tone: "violet",
      x: 390,
      y: 410,
      w: 176,
      cloud: disk,
    },

    // Step 3
    {
      id: "share",
      label: "File share",
      sub: "one folder, two servers",
      icon: "folder-share",
      tone: "violet",
      step: 3,
      x: 260,
      y: 565,
      w: 176,
      cloud: { aws: "aws-efs", gcp: "gcp-filestore", azure: "azure-files" },
    },

    // Step 4
    {
      id: "bucket",
      label: "Print files",
      sub: "one object per order",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 672,
      y: 255,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 5
    {
      id: "vault",
      label: "Backup vault",
      sub: "copies kept apart",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 672,
      y: 420,
      cloud: { aws: "aws-backup", gcp: "gcp-backup-dr", azure: "azure-backup" },
    },
  ],
  edges: [
    // Step 1: a job reaches one print server, which saves the file on its own disk and sends it on.
    { from: "order", to: "lb", label: "print job", packet: true },
    { from: "lb", to: "pa", label: "job", packet: true, delay: 1.2, labelAt: 0.55 },
    { from: "lb", to: "pb", label: "job", packet: true, delay: 1.2 },
    { from: "pa", to: "da", label: "save file", packet: true, delay: 2.4, until: 2 },
    { from: "pb", to: "db", label: "save file", packet: true, delay: 2.4, until: 1 },
    { from: "pa", to: "partner", label: "send file", packet: true, delay: 3.6, labelAt: 0.75, until: 1 },

    // Step 2: the partner is down; the retry lands on server B, which looks on its own disk and finds nothing.
    {
      from: "pa",
      to: "partner",
      label: "partner down",
      tone: "red",
      dashed: true,
      labelAt: 0.75,
      step: 2,
      until: 2,
    },
    { from: "pb", to: "db", label: "file not found", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: both servers mount one share, so the retry on B finds A's file. The mounts run down the gutter.
    {
      from: "pa",
      to: "share",
      label: "mount",
      via: [
        [235, 300],
        [235, 520],
      ],
      labelAt: 0.22,
      step: 3,
    },
    {
      from: "pb",
      to: "share",
      label: "mount",
      via: [
        [285, 300],
        [285, 520],
      ],
      labelAt: 0.8,
      step: 3,
    },
    { from: "pb", to: "partner", label: "retry: found", tone: "green", packet: true, labelAt: 0.7, step: 3, until: 3 },

    // Step 4: print files go to a bucket by key; the partner downloads each one with a signed link.
    {
      from: "pa",
      to: "bucket",
      label: "PUT by key",
      packet: true,
      via: [
        [200, 170],
        [530, 170],
        [560, 215],
      ],
      labelAt: 0.6,
      step: 4,
    },
    { from: "pb", to: "bucket", label: "PUT", packet: true, delay: 1.2, labelAt: 0.35, step: 4 },
    { from: "bucket", to: "partner", label: "signed link", packet: true, delay: 2.4, step: 4 },

    // Step 5: each shape has its own way to keep a copy, and the copies live in a vault.
    {
      from: "da",
      to: "vault",
      label: "snapshot",
      dashed: true,
      flow: true,
      via: [
        [130, 462],
        [560, 462],
      ],
      labelAt: 0.12,
      step: 5,
    },
    { from: "db", to: "vault", label: "snapshot", dashed: true, flow: true, labelAt: 0.35, step: 5 },
    {
      from: "share",
      to: "vault",
      label: "share backup",
      dashed: true,
      flow: true,
      via: [[672, 565]],
      labelAt: 0.4,
      step: 5,
    },
    { from: "bucket", to: "vault", label: "versions", dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
