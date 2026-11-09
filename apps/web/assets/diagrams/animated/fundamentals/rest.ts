import type { DiagramSpec } from "@/components/diagrams/types";

// The pet-clinic booking API from the REST page, drawn as a resource model.
// Step 1: every thing gets a URL. Collections (/pets, /clinics) contain items (/pets/42, /clinics/7), and the
//         owner app reads one pet with GET.
// Step 2: a pet has a sub-collection of bookings; a booking links to its clinic. One booking resource is built
//         from three database tables, so resources are not tables.
// Step 3: two different clients change resources with the same standard methods: the owner app POSTs a new
//         booking to the collection, the clinic desk PATCHes one booking to mark Bella as checked in.
//
// Layout (centres): clients column x 100; resources in two columns x 300 and x 520 on rows y 130 / 240 / 350;
// database glyph at x 730. Resource cards are 150 x 58 with no icon so the longest path label fits.
const spec: DiagramSpec = {
  title: "REST resource model for a pet clinic API",
  width: 840,
  height: 470,
  steps: [
    { title: "Every thing gets a URL" },
    { title: "Sub-resources, links and storage" },
    { title: "Clients act with standard methods" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 160, h: 390 },
    { id: "resources", title: "Resources the API exposes", tone: "teal", x: 200, y: 50, w: 420, h: 390 },
    { id: "storage", title: "Storage", tone: "violet", x: 640, y: 50, w: 180, h: 390 },
  ],
  nodes: [
    { id: "app", label: "Owner app", sub: "phone", icon: "phone", x: 100, y: 185, w: 128, h: 58 },
    { id: "desk", label: "Clinic desk", sub: "browser", icon: "browser", x: 100, y: 380, w: 128, h: 58, step: 3 },

    { id: "pets", label: "/pets", sub: "collection", tone: "teal", x: 300, y: 130, w: 150, h: 58 },
    { id: "pet", label: "/pets/42", sub: "one pet: Bella", tone: "teal", accent: true, x: 300, y: 240, w: 150, h: 58 },
    { id: "clinics", label: "/clinics", sub: "collection", tone: "teal", x: 520, y: 130, w: 150, h: 58 },
    { id: "clinic", label: "/clinics/7", sub: "one clinic", tone: "teal", x: 520, y: 240, w: 150, h: 58 },
    {
      id: "appts",
      label: "/pets/42/appointments",
      sub: "Bella's bookings",
      tone: "teal",
      x: 300,
      y: 350,
      w: 150,
      h: 58,
      step: 2,
    },
    {
      id: "appt",
      label: "/appointments/981",
      sub: "one booking",
      tone: "teal",
      x: 520,
      y: 350,
      w: 150,
      h: 58,
      step: 2,
    },

    {
      id: "db",
      label: "Database",
      sub: "rows in tables",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 730,
      y: 220,
      step: 2,
    },
  ],
  edges: [
    // Step 1: collections hold items; the owner app reads one item.
    { from: "app", to: "pet", label: "GET", flow: true, packet: true },
    { from: "pets", to: "pet", label: "item", dashed: true },
    { from: "clinics", to: "clinic", label: "item", dashed: true },

    // Step 2: relations between resources, and where the data really lives.
    { from: "pet", to: "appts", label: "sub-resource", dashed: true },
    { from: "appts", to: "appt", label: "link", dashed: true },
    { from: "appt", to: "clinic", label: "link", dashed: true },
    { from: "appt", to: "db", label: "joins 3 tables", dashed: true },

    // Step 3: the same small set of methods, used by two different clients.
    { from: "app", to: "appts", label: "POST", flow: true, packet: true, via: [[195, 350]], step: 3 },
    {
      from: "desk",
      to: "appt",
      label: "PATCH",
      flow: true,
      packet: true,
      delay: 1,
      via: [
        [190, 418],
        [520, 418],
      ],
      step: 3,
    },
  ],
};

export default spec;
