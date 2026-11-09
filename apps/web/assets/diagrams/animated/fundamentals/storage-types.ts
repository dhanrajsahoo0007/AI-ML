import type { DiagramSpec } from "@/components/diagrams/types";

// Pantry, the recipe site from the "Files, blocks and objects" page, with each kind of data on the storage built
// for it. One storage kind per build step:
// Step 1: block storage. Readers reach two web servers; web server B queries the Postgres server, which reads and
// writes fixed-size blocks on its own block volume. (Both web servers query the database; one edge is drawn so the
// picture stays free of crossings.)
// Step 2: file storage. Both web servers mount the same shared folder over NFS, so the publishing tool's templates
// look the same on every server.
// Step 3: object storage. Photos live in a bucket; readers fetch them through a CDN, which reads the bucket only on
// a miss. Every server ships its old log files to the same bucket each hour (drawn from web server A).
//
// Layout check (card boxes are centre ± w/2, h 64):
// readers 35-185 x 249-313 (zone 20-200 x 40-466).
// cdn 260-420 x 71-135 (edge zone 230-450 x 40-150).
// web-a 265-415 x 204-268, web-b 265-415 x 294-358, db 265-415 x 384-448 (gaps 26; servers zone 230-450 x 180-466).
// bucket 570-790 x 71-135 (object zone 480-880 x 40-150), share 570-790 x 249-313 (file zone 480-880 x 180-330),
// volume 570-790 x 384-448 (block zone 480-880 x 350-466).
// Column gaps: 75 (readers to servers), 155 (servers to storage).
// The readers-to-CDN route climbs at x 110 inside the readers zone and runs right at y 103. The log route leaves the
// top of web server A, runs right at y 165 in the 30 px channel between the top zones and the lower ones, and climbs
// into the bottom of the bucket, so it crosses no box and no other edge.
const spec: DiagramSpec = {
  title: "Block, file and object storage in one site",
  width: 900,
  height: 480,
  steps: [
    { title: "Block storage: a disk for one server" },
    { title: "File storage: one folder, many servers" },
    { title: "Object storage: photos and old logs over HTTP" },
  ],
  zones: [
    { id: "clients", title: "Readers", tone: "neutral", x: 20, y: 40, w: 180, h: 426 },
    { id: "edge", title: "Edge", tone: "blue", x: 230, y: 40, w: 220, h: 110 },
    { id: "servers", title: "Servers", tone: "teal", x: 230, y: 180, w: 220, h: 286 },
    { id: "object-zone", title: "Object storage", tone: "violet", x: 480, y: 40, w: 400, h: 110 },
    { id: "file-zone", title: "File storage", tone: "violet", x: 480, y: 180, w: 400, h: 150 },
    { id: "block-zone", title: "Block storage", tone: "violet", x: 480, y: 350, w: 400, h: 116 },
  ],
  nodes: [
    { id: "readers", label: "Readers", sub: "browsers, apps", icon: "browser", x: 110, y: 281, w: 150, h: 64 },
    {
      id: "web-a",
      label: "Web server A",
      sub: "runs the app",
      icon: "server",
      tone: "teal",
      x: 340,
      y: 236,
      w: 150,
      h: 64,
    },
    {
      id: "web-b",
      label: "Web server B",
      sub: "runs the app",
      icon: "server",
      tone: "teal",
      x: 340,
      y: 326,
      w: 150,
      h: 64,
    },
    {
      id: "db",
      label: "Database server",
      sub: "Postgres",
      icon: "database",
      tone: "teal",
      x: 340,
      y: 416,
      w: 150,
      h: 64,
    },
    {
      id: "volume",
      label: "Block volume",
      sub: "500 GB SSD, one server",
      icon: "disk",
      tone: "violet",
      x: 680,
      y: 416,
      w: 220,
      h: 64,
    },
    {
      id: "share",
      label: "Shared folder",
      sub: "NFS, many servers mount it",
      icon: "folder",
      tone: "violet",
      step: 2,
      x: 680,
      y: 281,
      w: 220,
      h: 64,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "copies near readers",
      icon: "cdn",
      tone: "blue",
      step: 3,
      x: 340,
      y: 103,
      w: 160,
      h: 64,
    },
    {
      id: "bucket",
      label: "Bucket",
      sub: "photos, video, old logs",
      icon: "blob",
      tone: "violet",
      step: 3,
      x: 680,
      y: 103,
      w: 220,
      h: 64,
    },
  ],
  edges: [
    // Step 1: a page request reaches a web server, which asks the database, which reads blocks from its own disk.
    { from: "readers", to: "web-a", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "readers", to: "web-b", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0.3 },
    { from: "web-b", to: "db", label: "SQL", tone: "teal", flow: true, packet: true, delay: 0.9 },
    {
      from: "db",
      to: "volume",
      label: "4 KB blocks",
      tone: "violet",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 1.5,
    },

    // Step 2: both web servers open the same files by path in one shared folder.
    { from: "web-a", to: "share", label: "NFS", tone: "violet", flow: true, packet: true, delay: 0.6 },
    { from: "web-b", to: "share", label: "NFS", tone: "violet", flow: true, packet: true, delay: 0.9 },

    // Step 3: photos come from the bucket through the CDN; old logs go to the bucket in hourly batches.
    {
      from: "readers",
      to: "cdn",
      label: "photos",
      tone: "blue",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0,
      via: [[110, 103]],
    },
    {
      from: "cdn",
      to: "bucket",
      label: "on a miss",
      tone: "violet",
      flow: true,
      packet: true,
      bidirectional: true,
      delay: 0.7,
    },
    {
      from: "web-a",
      to: "bucket",
      label: "old logs, hourly",
      tone: "orange",
      dashed: true,
      delay: 1.2,
      via: [
        [340, 165],
        [680, 165],
      ],
    },
  ],
};

export default spec;
