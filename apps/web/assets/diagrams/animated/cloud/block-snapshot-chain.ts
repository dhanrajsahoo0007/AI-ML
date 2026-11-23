import type { DiagramSpec } from "@/components/diagrams/types";

// One block volume, told as the story of Brightpost's review service (cloud/data/block-storage).
// Step 1: on a normal day the app servers ask the review server for reviews, and its self-run database reads about
// 80 blocks a second from a 100 GB general-purpose volume that bursts on credits. Step 2 (the only failure step):
// on sale day the database asks for 1,200 reads a second, the credit bucket is empty at 9:50, the volume falls to
// its 300 IOPS baseline and product pages wait about 7 s. Step 3: the volume moves to a type with 2,000 IOPS set
// and no credits. Step 4: the first snapshot copies all 40 GB in use. Step 5: nightly snapshots copy only the
// changed blocks and reuse the rest. Step 6: the newest snapshot becomes a new volume in zone B for a spare server.
// Step 7: a weekly copy goes to a second region.
//
// Nodes never move and never disappear. Edges a later step replaces are twins: the app-to-server and
// server-to-volume edges are plain in step 1, red in step 2 and plain or green again from step 3; the credit edge
// is plain in step 1 and red in step 2, and is gone from step 3, because the new type has no credits.
//
// Layout: three columns (left x 130, middle x 390, right x 660) and five rows.
//   Row 1 (y 95): shoppers 130 | app servers 390.
//   Row 2 (y 255): review server 390.
//   Row 3 (y 415): burst credits 130 | review volume 390 | new disk type 660.
//   Row 4 (y 600): snapshot 1 130 | snapshot 2 390 | snapshot 3 660.
//   Row 5 (y 770): spare server 130 | restored volume 390 (zone B) | snapshot copy 660 (region 2).
// Edge routes: the three snapshot edges leave the volume's bottom; their labels sit in the gap between zone A and
// the snapshot zone (y 490 to 540), at x 260, 390 and 525. The restore runs diagonally from snapshot 3 to the
// restored volume, left of the "Region 2" tab; the copy runs straight down x 660, right of that tab.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the left and middle columns. The canvas stays under 800 wide.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Virtual Machines" (servers, w 176), "Persistent Disk" (volumes, w 184; subs kept to 15 characters),
// "Multi-region snapshot" (the copy, w 210).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const volume = {
  aws: { id: "aws-ebs", label: "EBS volume" },
  gcp: { id: "gcp-persistent-disk", label: "Persistent Disk" },
  azure: { id: "azure-managed-disks", label: "Managed Disk" },
};
const snapshot = {
  aws: { id: "aws-ebs", label: "EBS snapshot" },
  gcp: { id: "gcp-persistent-disk", label: "Disk snapshot" },
  azure: { id: "azure-managed-disks", label: "Disk snapshot" },
};

const spec: DiagramSpec = {
  title: "A block volume: burst credits, a steady disk type, a snapshot chain and a restore",
  width: 795,
  height: 850,
  steps: [
    { title: "A review server reads its volume" },
    { title: "Burst credits run out at 9:50" },
    { title: "A disk type with IOPS set" },
    { title: "First snapshot: a full copy" },
    { title: "Later snapshots: changed blocks only" },
    { title: "Restore into another zone" },
    { title: "Copy to a second region" },
  ],
  zones: [
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 10, y: 40, w: 240, h: 110 },
    { id: "shop", title: "Shop", tone: "teal", x: 290, y: 40, w: 200, h: 110 },
    { id: "zonea", title: "Zone A", tone: "blue", x: 10, y: 190, w: 775, h: 300 },
    { id: "snaps", title: "Snapshots", tone: "violet", x: 10, y: 540, w: 775, h: 120 },
    { id: "zoneb", title: "Zone B", tone: "blue", x: 10, y: 710, w: 480, h: 120 },
    { id: "region2", title: "Region 2", tone: "neutral", x: 540, y: 710, w: 245, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "2,000 at 9 a.m.",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 176,
    },
    {
      id: "app",
      label: "App servers",
      sub: "product pages",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 95,
      w: 176,
      cloud: server,
    },
    {
      id: "server",
      label: "Review server",
      sub: "self-run database",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 255,
      w: 176,
      cloud: server,
    },
    {
      id: "credits",
      label: "Burst credits",
      sub: "saved when quiet",
      icon: "meter",
      tone: "orange",
      x: 130,
      y: 415,
      w: 176,
    },
    {
      id: "disk",
      label: "Review volume",
      sub: "general purpose",
      icon: "disk",
      tone: "violet",
      accent: true,
      x: 390,
      y: 415,
      w: 184,
      cloud: volume,
    },

    // Step 3
    {
      id: "disktype",
      label: "New disk type",
      sub: "2,000 IOPS set",
      icon: "disk",
      tone: "violet",
      step: 3,
      x: 660,
      y: 415,
      w: 176,
      cloud: {
        aws: { id: "aws-ebs", label: "gp3 or io2" },
        gcp: { id: "gcp-persistent-disk", label: "Hyperdisk" },
        azure: { id: "azure-managed-disks", label: "Premium SSD v2" },
      },
    },

    // Step 4
    {
      id: "snap1",
      label: "Snapshot 1",
      sub: "all 40 GB in use",
      icon: "snapshot",
      tone: "violet",
      step: 4,
      x: 130,
      y: 600,
      w: 180,
      cloud: snapshot,
    },

    // Step 5
    {
      id: "snap2",
      label: "Snapshot 2",
      sub: "1 GB changed",
      icon: "snapshot",
      tone: "violet",
      step: 5,
      x: 390,
      y: 600,
      w: 180,
      cloud: snapshot,
    },
    {
      id: "snap3",
      label: "Snapshot 3",
      sub: "1.2 GB changed",
      icon: "snapshot",
      tone: "violet",
      step: 5,
      x: 660,
      y: 600,
      w: 180,
      cloud: snapshot,
    },

    // Step 6
    {
      id: "spare",
      label: "Spare server",
      sub: "review service",
      icon: "server",
      tone: "teal",
      step: 6,
      x: 130,
      y: 770,
      w: 176,
      cloud: server,
    },
    {
      id: "restored",
      label: "Restored volume",
      sub: "new, in zone B",
      icon: "disk",
      tone: "violet",
      step: 6,
      x: 390,
      y: 770,
      w: 184,
      cloud: volume,
    },

    // Step 7
    {
      id: "copy",
      label: "Snapshot copy",
      sub: "second region, weekly",
      icon: "snapshot",
      tone: "violet",
      step: 7,
      x: 660,
      y: 770,
      w: 210,
      cloud: {
        aws: { id: "aws-ebs", label: "EBS snapshot copy" },
        gcp: { id: "gcp-persistent-disk", label: "Multi-region snapshot" },
        azure: { id: "azure-managed-disks", label: "Snapshot copy" },
      },
    },
  ],
  edges: [
    // Step 1: a normal day. The volume serves 80 reads a second; its credit bucket stays full.
    { from: "shoppers", to: "app", label: "pages", packet: true },
    { from: "app", to: "server", label: "get reviews", packet: true, delay: 1.2, labelAt: 0.4, until: 1 },
    { from: "server", to: "disk", label: "80 reads/s", packet: true, delay: 2.4, until: 1 },
    { from: "credits", to: "disk", label: "burst 3,000", dashed: true, until: 1 },

    // Step 2: sale day. The bucket is empty at 9:50 and the volume falls to its baseline.
    { from: "app", to: "server", label: "waits 7 s", tone: "red", dashed: true, labelAt: 0.4, step: 2, until: 2 },
    {
      from: "server",
      to: "disk",
      label: "1,200 asked, 300 served",
      tone: "red",
      packet: true,
      duration: 4.8,
      step: 2,
      until: 2,
    },
    { from: "credits", to: "disk", label: "empty 9:50", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: a type with IOPS set and no credits, below the VM's own limit.
    { from: "app", to: "server", label: "get reviews", packet: true, delay: 1.2, labelAt: 0.4, step: 3 },
    { from: "server", to: "disk", label: "1,200 reads/s", tone: "green", packet: true, delay: 2.4, step: 3 },
    { from: "disktype", to: "disk", label: "2,000 IOPS", tone: "violet", step: 3 },

    // Step 4: the first snapshot copies every block in use.
    { from: "disk", to: "snap1", label: "first: full copy", dashed: true, flow: true, step: 4 },

    // Step 5: later snapshots copy only changed blocks and point back for the rest.
    { from: "disk", to: "snap2", label: "night 2: 1 GB", dashed: true, flow: true, step: 5 },
    { from: "disk", to: "snap3", label: "night 3: 1.2 GB", dashed: true, flow: true, step: 5 },
    { from: "snap2", to: "snap1", label: "reuses", dashed: true, step: 5 },
    { from: "snap3", to: "snap2", label: "reuses", dashed: true, step: 5 },

    // Step 6: the newest snapshot becomes a new volume in zone B.
    { from: "snap3", to: "restored", label: "new volume", packet: true, via: [[430, 700]], labelAt: 0.62, step: 6 },
    { from: "restored", to: "spare", label: "attach", step: 6 },

    // Step 7: a weekly copy to a second region.
    { from: "snap3", to: "copy", label: "copy weekly", dashed: true, flow: true, labelAt: 0.35, step: 7 },
  ],
};

export default spec;
