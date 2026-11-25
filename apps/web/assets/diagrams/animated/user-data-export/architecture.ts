import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// "Download your data", built one requirement at a time (user-data-export case study, the hero).
// Eight steps: 1 a synchronous endpoint that calls every source service and zips the result inside the request
// (red: it times out; replaced in step 2) · 2 an asynchronous job: the export API writes a job row and returns 202;
// export workers poll the job DB and call the sources (the poll goes away in step 3) · 3 a workflow engine starts one
// step per source service through rate-limited task queues; workers write each step's chunks to a staging store as a
// checkpoint · 4 where the data lives: live services answer by user, but the warehouse's logs are partitioned by date,
// so a per-user query scans the whole table (red; replaced in step 5) · 5 a batch scanner joins the day's requesters
// with each warehouse partition once and writes per-user files to staging · 6 the packager zips and splits the
// chunks into 4 GB parts in the archive store · 7 delivery: an email with a link to the page, re-authentication,
// and a 15-minute signed URL that downloads straight from the archive store · 8 privacy: an ownership check reads
// every chunk and passes only rows whose owner is the requester (the direct staging-to-packager edge goes away).
// Working (round numbers chosen to size the system): 20,000 exports a day × 2 GB average = 40 TB a day; archives kept
// 7 days = 280 TB live; one warehouse table of 100 TB scanned once a day for the whole batch instead of 20,000 times.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients x 105: user 330, email inbox 600. Edge x 297:
// API gateway 330, re-auth 520. Core x 575: export API 115, workflow engine (accent) 230. Services x 575 (w 180):
// export workers 390, source services 475, packager 560, delivery 645. Async x 879 (w 190): task queues 175, batch
// scanner 300, ownership check 465. Storage x 1098 (glyphs): job DB 130, warehouse 275, staging store 410, archive
// store 560. The download edge runs right of the storage column, under the zones (y 712) and up the gap between the
// Clients and Edge columns (x 201), so it crosses no box.
// Every long edge was checked against the boxes it passes: workers → staging crosses the async column at y 402 to
// 413, clear of the ownership check (437 to 493); export API → job DB crosses it at y 119 to 125, above the queues.
// Colours: zone tones from ZONE; red only for the two shortcuts that fail (steps 1 and 4).

const spec: DiagramSpec = {
  title: "User data export high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "A zip inside the request: it times out", covers: "F1" },
    { title: "An asynchronous job: submit, status, result", covers: "F1, F5" },
    { title: "A workflow: one step per source service", covers: "F2, N2" },
    { title: "Where the data lives: services and the warehouse", covers: "F2" },
    { title: "One scan serves the whole batch", covers: "F2, N4" },
    { title: "Split archives in object storage", covers: "F3" },
    { title: "Delivery: re-auth and a short signed link", covers: "F4" },
    { title: "Privacy: check the owner of every file", covers: "N3" },
  ],
  zones: zoneFrame({ core: "Export orchestration" }),
  nodes: [
    { id: "user", label: "User", sub: "web / app", icon: "phone", fill: "pastel", x: 105, y: 330, w: 140 },
    {
      id: "email",
      label: "Email inbox",
      sub: "link to the page",
      icon: "bell",
      fill: "pastel",
      step: 7,
      x: 105,
      y: 600,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 330,
      w: 150,
    },
    {
      id: "auth",
      label: "Re-auth",
      sub: "password + 2FA",
      icon: "key",
      tone: "blue",
      fill: "pastel",
      step: 7,
      x: 297,
      y: 520,
      w: 150,
    },
    {
      id: "api",
      label: "Export API",
      sub: "submit, status",
      icon: "api",
      tone: "green",
      fill: "pastel",
      x: 575,
      y: 115,
      w: 200,
    },
    {
      id: "engine",
      label: "Workflow engine",
      sub: "steps, checkpoints",
      icon: "coordinator",
      tone: "green",
      accent: true,
      step: 3,
      x: 575,
      y: 230,
      w: 220,
    },
    {
      id: "workers",
      label: "Export workers",
      sub: "one task per source",
      icon: "workers",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 390,
      w: 190,
    },
    {
      id: "sources",
      label: "Source services",
      sub: "40 exporters",
      icon: "server",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 475,
      w: 190,
    },
    {
      id: "packager",
      label: "Packager",
      sub: "zip, split, encrypt",
      icon: "folder",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 560,
      w: 190,
    },
    {
      id: "delivery",
      label: "Delivery",
      sub: "email, signed links",
      icon: "link",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 645,
      w: 190,
    },
    {
      id: "queues",
      label: "Task queues",
      sub: "a rate per source",
      icon: "queue",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 175,
      w: 190,
    },
    {
      id: "scanner",
      label: "Batch scanner",
      sub: "1 join a partition",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 300,
      w: 190,
    },
    {
      id: "check",
      label: "Ownership check",
      sub: "owner id per row",
      icon: "shield",
      tone: "orange",
      fill: "pastel",
      step: 8,
      x: 879,
      y: 465,
      w: 190,
    },
    {
      id: "jobdb",
      label: "Job DB",
      sub: "jobs, steps, history",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 130,
    },
    {
      id: "warehouse",
      label: "Warehouse",
      sub: "logs, by date",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 275,
    },
    {
      id: "staging",
      label: "Staging store",
      sub: "chunks per step",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 410,
    },
    {
      id: "archive",
      label: "Archive store",
      sub: "4 GB parts, 7 days",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 560,
    },
  ],
  edges: [
    { from: "user", to: "gw", flow: true, packet: true },
    { from: "gw", to: "api", label: "submit", labelAt: 0.3, flow: true, packet: true, delay: 0.4 },
    { from: "api", to: "sources", label: "zip in the request", tone: "red", step: 1, until: 1 },

    { from: "api", to: "jobdb", label: "job row, 202", step: 2 },
    { from: "workers", to: "jobdb", label: "poll, claim", dashed: true, step: 2, until: 2 },
    { from: "workers", to: "sources", step: 2 },

    { from: "api", to: "engine", label: "start", step: 3 },
    { from: "engine", to: "queues", label: "40 steps", flow: true, packet: true, step: 3 },
    { from: "queues", to: "workers", label: "task", flow: true, packet: true, delay: 0.4, step: 3 },
    { from: "workers", to: "staging", label: "chunks, checkpoint", step: 3 },

    { from: "workers", to: "warehouse", label: "scan per user", tone: "red", step: 4, until: 4 },

    { from: "workers", to: "scanner", label: "join batch", step: 5 },
    { from: "scanner", to: "warehouse", label: "1 scan", flow: true, packet: true, step: 5 },
    { from: "scanner", to: "staging", label: "per-user files", step: 5 },

    { from: "staging", to: "packager", label: "chunks", step: 6, until: 7 },
    { from: "packager", to: "archive", label: "4 GB parts", flow: true, packet: true, step: 6 },

    { from: "delivery", to: "email", label: "ready: link", dashed: true, step: 7 },
    { from: "email", to: "user", label: "open page", dashed: true, step: 7 },
    { from: "gw", to: "auth", label: "re-auth", step: 7 },
    { from: "auth", to: "delivery", label: "get link", step: 7 },
    { from: "delivery", to: "archive", label: "sign, 15 min", step: 7 },
    {
      from: "archive",
      to: "user",
      label: "download, signed URL",
      dashed: true,
      flow: true,
      via: [
        [1165, 560],
        [1165, 712],
        [201, 712],
        [201, 380],
      ],
      labelAt: 0.55,
      step: 7,
    },

    { from: "staging", to: "check", label: "every row", step: 8 },
    { from: "check", to: "packager", label: "owner only", flow: true, packet: true, step: 8 },
  ],
};

export default spec;
