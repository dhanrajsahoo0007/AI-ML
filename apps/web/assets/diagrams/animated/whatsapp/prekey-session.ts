import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// How Ana starts an encrypted session with Ben while Ben's phone is off (whatsapp, Step 4 and Deep dive 1).
// Two steps: 1 earlier, Ben's phone uploaded its public identity key, signed prekey and a batch of 100 one-time
// prekeys; Ana's phone asks for Ben's key bundle, the key service returns identity key, signed prekey and one-time
// prekey #17 and deletes #17 from the store; Ana derives the session key on her phone (four Diffie-Hellman results
// hashed together), encrypts m1 and sends it with a setup header; Ben is offline, so the chat server stores m1 in
// the offline queue and acks Ana (one tick) · 2 Ben's phone connects; the chat server drains his mailbox and delivers
// m1 with the header; Ben derives the same key with his private keys (including #17), decrypts, deletes the private
// half of #17 and acks; the queue deletes m1; Ben's phone tops up its one-time prekeys when few are left.
// Working: 100 one-time prekeys × 32 bytes = 3.2 KB per device; key ids and message ids are illustrative.
// Fact check (2026-11-17, WhatsApp encryption overview, version of 2026-10-30): a one-time prekey "is removed from
// server storage after being requested"; the initiator can send "even if the recipient is offline", carrying the
// setup information in the header of every message until the recipient responds.
// Colours (PATTERN_TONE): phones orange (traffic), the key service green (the pattern's own part), the chat server
// teal (compute), the offline queue violet (store). Section tones only on lanes.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Starting an encrypted session with an offline phone",
  lanes: [
    { id: "ana", label: "Ana's phone", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "keys", label: "Key service", icon: "key", tone: PATTERN_TONE.pattern },
    { id: "chat", label: "Chat server", icon: "chat", tone: PATTERN_TONE.compute },
    { id: "queue", label: "Offline queue", icon: "queue", tone: PATTERN_TONE.store },
    { id: "ben", label: "Ben's phone", icon: "phone", tone: PATTERN_TONE.traffic },
  ],
  messages: [
    { from: "ben", to: "keys", label: "earlier: identity key, signed prekey, 100 one-time", kind: "async", step: 1 },
    { from: "ana", to: "keys", label: "key bundle for Ben's devices?", step: 1 },
    { from: "keys", to: "ana", label: "identity, signed, one-time #17", kind: "return", step: 1 },
    { from: "ana", to: "chat", label: "m1 + setup header (ciphertext)", step: 1 },
    { from: "chat", to: "queue", label: "store m1 for Ben's phone", step: 1 },
    { from: "chat", to: "ana", label: "ack m1: one tick", kind: "return", step: 1 },

    { from: "ben", to: "chat", label: "connect", step: 2 },
    { from: "chat", to: "queue", label: "read Ben's mailbox", step: 2 },
    { from: "queue", to: "chat", label: "m1", kind: "return", step: 2 },
    { from: "chat", to: "ben", label: "m1 + setup header", step: 2 },
    { from: "ben", to: "chat", label: "ack m1", kind: "return", step: 2 },
    { from: "chat", to: "queue", label: "delete m1", step: 2 },
    { from: "ben", to: "keys", label: "top up one-time prekeys when low", kind: "async", step: 2 },
  ],
  notes: [
    { lane: "keys", text: "#17 deleted: never handed out twice", step: 1, at: 2.5 },
    { lane: "ana", text: "4 key agreements → session key", step: 1, at: 2.6 },
    { lane: "ben", text: "same key from his private half of #17", step: 2, at: 9.5 },
  ],
  steps: [{ title: "Ana sends while Ben is offline" }, { title: "Ben connects and decrypts" }],
};

export default spec;
