import type { SequenceSpec } from "@/components/diagrams/types";

// A partner script pages through Crumbs' orders, newest first, 50 at a time, with an opaque cursor.
// Step 1: the first call has no cursor. The API asks the database for 51 rows: the 51st only proves that a
//         next page exists. It returns 50 orders and next_cursor c1, which encodes (created_at, id) of row 50.
// Step 2: while the partner works, the phone app creates order 9001. It sorts above the cursor, so the next
//         page is unchanged. The partner sends c1; the API decodes it and seeks straight past that row.
// Step 3: the last page (page 40,000 of about 2 million orders) has only 12 rows, so next_cursor is null
//         and the sync stops.
//
// Lane order puts the partner two lanes from the API so its long request labels have room (about 380 px).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Paging through a list with a cursor",
  width: 800,
  steps: [
    { title: "First page: no cursor yet" },
    { title: "Next page: resume after the cursor" },
    { title: "Last page: next_cursor is null" },
  ],
  lanes: [
    { id: "partner", label: "Partner script", icon: "robot", tone: "neutral" },
    { id: "phone", label: "Phone app", icon: "phone", tone: "neutral" },
    { id: "api", label: "Orders API", icon: "api", tone: "green" },
    { id: "db", label: "Orders DB", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: first page.
    { from: "partner", to: "api", label: "GET /v1/orders?limit=50", step: 1 },
    { from: "api", to: "db", label: "newest 51 rows", step: 1 },
    { from: "db", to: "api", label: "51 rows", kind: "return", step: 1 },
    { from: "api", to: "partner", label: "200 · 50 orders · next_cursor=c1", kind: "return", step: 1 },

    // Step 2: a new order arrives, then the partner asks for the page after c1.
    { from: "phone", to: "api", label: "POST /v1/orders", step: 2, delay: 0.4 },
    { from: "api", to: "db", label: "INSERT order 9001", step: 2 },
    { from: "api", to: "phone", label: "201 Created", kind: "return", step: 2 },
    { from: "partner", to: "api", label: "GET /v1/orders?limit=50&cursor=c1", step: 2, delay: 0.4 },
    { from: "api", to: "api", label: "decode c1 → (time, id)", step: 2 },
    { from: "api", to: "db", label: "51 rows after c1", step: 2 },
    { from: "db", to: "api", label: "51 rows", kind: "return", step: 2 },
    { from: "api", to: "partner", label: "200 · 50 orders · next_cursor=c2", kind: "return", step: 2 },

    // Step 3: the last page.
    { from: "partner", to: "api", label: "GET /v1/orders?limit=50&cursor=c39999", step: 3, delay: 0.4 },
    { from: "api", to: "db", label: "51 rows after c39999", step: 3 },
    { from: "db", to: "api", label: "12 rows", kind: "return", step: 3 },
    { from: "api", to: "partner", label: "200 · 12 orders · next_cursor=null", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "db", text: "51st row = a next page exists", step: 1, at: 2.5 },
    { lane: "phone", text: "9001 sorts above the cursor", step: 2, at: 6.5 },
    { lane: "partner", text: "null cursor: sync done", step: 3, at: 15.5 },
  ],
};

export default spec;
