import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two devices edit one file (dropbox, Step 6 and Deep dive 2): a commit names the revision it was based on, so the
// second writer never overwrites the first.
// Two steps: 1 the desktop and the laptop both edit plan.docx (file id f42) offline from revision 7; the desktop comes
// back first and commits "f42, parent 7": it becomes revision 8; the laptop commits "f42, parent 7" and gets 409
// (current is 8); the laptop keeps its bytes as a new file "plan (Laptop's conflicted copy).docx" and pulls rev 8, so
// both versions survive · 2 a move and an edit: the desktop moves f42 to /archive (revision 9, same id); the laptop
// edits f42 based on revision 9 and commits by id, so the edit lands at /archive/plan.docx, not at the old path.
// Working: ids and revisions are illustrative. No bytes are merged and nothing is lost: two writers produce two files.
// Layout: four lanes. Colours (PATTERN_TONE): both devices orange (traffic), the metadata service green (the pattern's
// own part: the revision check), the metadata DB violet. No red: a rejected commit is the
// protocol working, not a failure.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two devices, one file: a revision check and a conflicted copy",
  lanes: [
    { id: "desk", label: "Desktop", icon: "server", tone: PATTERN_TONE.traffic },
    { id: "lap", label: "Laptop", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "meta", label: "Metadata svc", icon: "folder", tone: PATTERN_TONE.pattern },
    { id: "db", label: "Metadata DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "desk", to: "meta", label: "commit f42, parent 7", step: 1 },
    { from: "meta", to: "db", label: "UPDATE … WHERE rev = 7", step: 1 },
    { from: "db", to: "meta", label: "1 row: rev 8", kind: "return", step: 1 },
    { from: "meta", to: "desk", label: "ok, rev 8", kind: "return", step: 1 },
    { from: "lap", to: "meta", label: "commit f42, parent 7", step: 1 },
    { from: "meta", to: "lap", label: "409: current is rev 8", kind: "return", step: 1 },
    { from: "lap", to: "meta", label: "commit new file: conflicted copy", step: 1 },
    { from: "meta", to: "lap", label: "ok; pull rev 8 of f42", kind: "return", step: 1 },

    { from: "desk", to: "meta", label: "move f42 to /archive", step: 2 },
    { from: "meta", to: "db", label: "path changes, id f42 stays", step: 2 },
    { from: "meta", to: "desk", label: "ok, rev 9", kind: "return", step: 2 },
    { from: "lap", to: "meta", label: "commit f42, parent 9", step: 2 },
    { from: "meta", to: "lap", label: "ok, rev 10 at /archive", kind: "return", step: 2 },
  ],
  steps: [{ title: "Same parent: the second writer gets a copy" }, { title: "Move and edit: the id follows the file" }],
};

export default spec;
