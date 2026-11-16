import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Releasing an archive only to its owner (user-data-export, Step 7 and Deep dive 3).
// Two steps: 1 the owner: user 42 opens the link from the email; the delivery service asks them to sign in again
// (password and second factor); one conditional UPDATE checks that export 9f3 belongs to user 42 and that part 1 has
// been fetched fewer than 5 times, and counts this fetch; the service signs a URL valid for 15 minutes and the
// browser downloads the 4 GB part straight from the archive store · 2 the misuse cases: the email was forwarded and
// user 77 opens the link: the same UPDATE matches 0 rows, so the answer is 404 (not 403, which would confirm the
// export exists); an old signed URL used 16 minutes later is refused by the store.
// Working: a 12 GB archive in 4 GB parts is 12 ÷ 4 = 3 parts; 5 fetches allowed per part.
// Layout: five lanes. Colours (PATTERN_TONE, section tones only): the user orange (traffic), the delivery service
// teal (compute), re-auth green (the pattern's own check), the job DB and the archive store violet (stores).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Releasing an archive only to its owner",
  lanes: [
    { id: "user", label: "User", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Delivery", icon: "link", tone: PATTERN_TONE.compute },
    { id: "auth", label: "Re-auth", icon: "key", tone: PATTERN_TONE.pattern },
    { id: "db", label: "Job DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "store", label: "Archive store", icon: "blob", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "user", to: "svc", label: "open link: export 9f3", step: 1 },
    { from: "svc", to: "user", label: "sign in again", kind: "return", step: 1 },
    { from: "user", to: "auth", label: "password + 2FA", step: 1 },
    { from: "auth", to: "svc", label: "user 42, fresh session", kind: "async", step: 1 },
    { from: "svc", to: "db", label: "owner = 42 AND fetches < 5: +1", step: 1 },
    { from: "db", to: "svc", label: "1 row", kind: "return", step: 1 },
    { from: "svc", to: "user", label: "signed URL, 15 min", kind: "return", step: 1 },
    { from: "user", to: "store", label: "GET part 1 of 3", step: 1 },
    { from: "store", to: "user", label: "4 GB", kind: "return", step: 1 },

    { from: "user", to: "svc", label: "forwarded link, as user 77", step: 2 },
    { from: "svc", to: "db", label: "owner = 77 AND fetches < 5: +1", step: 2 },
    { from: "db", to: "svc", label: "0 rows", kind: "return", step: 2 },
    { from: "svc", to: "user", label: "404 not found", kind: "return", step: 2 },
    { from: "user", to: "store", label: "old URL, 16 min later", step: 2 },
    { from: "store", to: "user", label: "403 expired", kind: "return", step: 2 },
  ],
  steps: [{ title: "The owner downloads a part" }, { title: "A forwarded link and an old URL" }],
};

export default spec;
