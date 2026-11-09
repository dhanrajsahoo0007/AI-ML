import type { LayoutSpec } from "@/components/diagrams/types";

// The SOAP envelope for the savings app's GetBalance call to the partner bank, drawn as nested parts: an HTTP POST
// carries one XML Envelope, which holds an optional Header (WS-Security) and a Body (the call). Step 3 adds the
// bank's reply on the right: a GetBalanceResponse, or a Fault in the same place.
//
// Layout check (canvas 880 x 540). Group tabs reach 14 px above each group's top edge.
// Left column x 20-580: HTTP box y 20-72; Envelope group y 104-520 (tab 90-118); Header group x 40-560, y 144-268
// (tab 130-158), its text y 166-184 and three cells y 192-248 at x 60-210, 225-375, 390-540 (15 px gaps);
// Body group x 40-560, y 304-500 (tab 290-318), operation box y 334-386, two cells y 402-454 at x 60-290 and
// 310-540, note text y 466-486.
// Right column x 610-860: notes as text; Reply group y 304-500 (tab 290-318) with the response box y 334-386,
// "or" text y 394-412 and the fault box y 420-472. The reply arrow runs from the operation box (right edge x 540)
// to the response box (left edge x 630) at y 360.
const spec: LayoutSpec = {
  kind: "layout",
  title: "A SOAP message: envelope, header and body",
  width: 880,
  height: 540,
  steps: [
    { title: "The Body carries the call" },
    { title: "The Header carries WS-Security" },
    { title: "The reply: a result or a Fault" },
  ],
  groups: [
    { id: "env", title: "soap:Envelope", tone: "blue", x: 20, y: 104, w: 560, h: 416 },
    { id: "hdr", title: "soap:Header", tone: "orange", x: 40, y: 144, w: 520, h: 124 },
    { id: "body", title: "soap:Body", tone: "teal", x: 40, y: 304, w: 520, h: 196 },
    { id: "reply", title: "Reply, same envelope", tone: "green", x: 610, y: 304, w: 250, h: 196 },
  ],
  shapes: [
    // Step 1: HTTP carries one envelope; the Body names the operation and its typed fields.
    {
      id: "http",
      type: "box",
      x: 20,
      y: 20,
      w: 560,
      h: 52,
      label: "HTTP POST /AccountService",
      sub: "Content-Type: application/soap+xml",
      tone: "neutral",
    },
    { id: "http-note", type: "text", x: 610, y: 36, w: 250, h: 20, label: "HTTP is only the carrier", tone: "neutral" },
    {
      id: "op",
      type: "box",
      x: 60,
      y: 334,
      w: 480,
      h: 52,
      label: "GetBalance",
      sub: "an operation named in the WSDL",
      tone: "teal",
    },
    { id: "acct", type: "cell", x: 60, y: 402, w: 230, h: 52, label: "accountId", sub: "ACC-10442", tone: "teal" },
    { id: "ccy", type: "cell", x: 310, y: 402, w: 230, h: 52, label: "currency", sub: "EUR", tone: "teal" },
    {
      id: "body-note",
      type: "text",
      x: 60,
      y: 466,
      w: 480,
      h: 20,
      label: "Every field has a type from the WSDL's schema",
      tone: "teal",
    },

    // Step 2: the WS-Security block in the Header.
    {
      id: "sec-label",
      type: "text",
      x: 60,
      y: 166,
      w: 480,
      h: 18,
      label: "wsse:Security block",
      tone: "orange",
      step: 2,
    },
    {
      id: "ts",
      type: "cell",
      x: 60,
      y: 192,
      w: 150,
      h: 56,
      label: "Timestamp",
      sub: "expires in 5 min",
      tone: "orange",
      step: 2,
    },
    {
      id: "token",
      type: "cell",
      x: 225,
      y: 192,
      w: 150,
      h: 56,
      label: "Certificate",
      sub: "who is calling",
      tone: "orange",
      step: 2,
    },
    {
      id: "sig",
      type: "cell",
      x: 390,
      y: 192,
      w: 150,
      h: 56,
      label: "Signature",
      sub: "over Body + Timestamp",
      tone: "orange",
      step: 2,
    },
    {
      id: "sec-note1",
      type: "text",
      x: 610,
      y: 196,
      w: 250,
      h: 20,
      label: "Signed: a changed byte fails",
      tone: "orange",
      step: 2,
    },
    {
      id: "sec-note2",
      type: "text",
      x: 610,
      y: 222,
      w: 250,
      h: 20,
      label: "Timestamped: a late copy fails",
      tone: "orange",
      step: 2,
    },

    // Step 3: the reply comes back in the same shape, with a result or a Fault in the Body.
    {
      id: "resp",
      type: "box",
      x: 630,
      y: 334,
      w: 210,
      h: 52,
      label: "GetBalanceResponse",
      sub: "balance 1250.00 EUR",
      tone: "green",
      step: 3,
    },
    { id: "or", type: "text", x: 630, y: 394, w: 210, h: 18, label: "or, if it failed", tone: "neutral", step: 3 },
    {
      id: "fault",
      type: "box",
      x: 630,
      y: 420,
      w: 210,
      h: 52,
      label: "soap:Fault",
      sub: "Code, Reason, Detail",
      tone: "red",
      step: 3,
    },
    { id: "answer", type: "arrow", x: 0, y: 0, from: "op", to: "resp", tone: "green", step: 3 },
  ],
};

export default spec;
