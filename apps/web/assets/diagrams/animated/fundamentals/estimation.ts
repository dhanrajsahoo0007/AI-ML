import type { DiagramSpec } from "@/components/diagrams/types";

// Back-of-the-envelope estimation as a flow of numbers: two assumptions on the left (how many users, how often
// they act) become a daily total, then a per-second rate, then a peak rate, and from those the storage and
// bandwidth the system must hold. The numbers are the photo-sharing example on the estimation page.
//
// Main path (packets, in order): users -> uploads per day -> average per second -> peak per second, with the
// daily total branching to storage and the peak rate branching to bandwidth.
//
// Layout plan (centres): assumptions column x=130 (cards 180 wide: 40..220), traffic column x=410 (cards 190 wide:
// 315..505), capacity column x=740 (glyphs 702..778). Rows y=120, 250, 380 (cards 64 tall), so every gap is at
// least 66 px vertically and 95 px horizontally.
const spec: DiagramSpec = {
  title: "From assumptions to capacity: a photo app",
  width: 900,
  height: 470,
  steps: [
    { title: "Assumptions become a daily total" },
    { title: "Daily total becomes a per-second rate" },
    { title: "Average becomes peak" },
    { title: "Storage: items per day x size x days kept" },
    { title: "Bandwidth: peak rate x size" },
  ],
  zones: [
    { id: "assumptions", title: "Assumptions", tone: "neutral", x: 20, y: 50, w: 220, h: 400 },
    { id: "traffic", title: "Traffic", tone: "green", x: 280, y: 50, w: 260, h: 400 },
    { id: "capacity", title: "Capacity", tone: "violet", x: 580, y: 50, w: 300, h: 400 },
  ],
  nodes: [
    { id: "dau", label: "Daily active users", sub: "10 million", icon: "users", x: 130, y: 120, w: 180, h: 64 },
    { id: "actions", label: "Uploads per user", sub: "2 photos a day", icon: "media", x: 130, y: 250, w: 180, h: 64 },

    {
      id: "perday",
      label: "Uploads per day",
      sub: "10M x 2 = 20 million",
      icon: "chart",
      tone: "green",
      x: 410,
      y: 120,
      w: 190,
      h: 64,
    },
    {
      id: "qps",
      label: "Average uploads/s",
      sub: "20M / 86,400 = ~230",
      icon: "clock",
      tone: "green",
      accent: true,
      step: 2,
      x: 410,
      y: 250,
      w: 190,
      h: 64,
    },
    {
      id: "peak",
      label: "Peak uploads/s",
      sub: "230 x 3 = ~700",
      icon: "zap",
      tone: "green",
      step: 3,
      x: 410,
      y: 380,
      w: 190,
      h: 64,
    },

    {
      id: "storage",
      label: "Storage",
      sub: "10 TB/day, 3.65 PB/year",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 740,
      y: 140,
    },
    {
      id: "bandwidth",
      label: "Upload bandwidth",
      sub: "350 MB/s = 2.8 Gbit/s",
      icon: "globe",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 740,
      y: 330,
    },
  ],
  edges: [
    // Step 1: users times uploads per user.
    { from: "dau", to: "perday", tone: "green", flow: true, packet: true, delay: 0 },
    { from: "actions", to: "perday", tone: "neutral", dashed: true },

    // Step 2: a day has 86,400 seconds.
    { from: "perday", to: "qps", label: "/ 86,400 s", tone: "green", flow: true, packet: true, delay: 0.8 },

    // Step 3: traffic is not flat across the day.
    { from: "qps", to: "peak", label: "x 3 peak factor", tone: "green", flow: true, packet: true, delay: 1.6 },

    // Step 4: storage grows with the daily total, not the peak.
    {
      from: "perday",
      to: "storage",
      label: "x 500 KB x 365",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.6,
    },

    // Step 5: bandwidth follows the peak, not the average.
    {
      from: "peak",
      to: "bandwidth",
      label: "x 500 KB x 8 bits",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 2.4,
    },
  ],
};

export default spec;
