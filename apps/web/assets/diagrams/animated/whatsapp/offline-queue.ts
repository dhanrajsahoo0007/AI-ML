import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Store and forward with acks (whatsapp, Step 3 and Deep dive 2).
// Three steps: 1 Ben's phone is offline: the chat server appends ciphertext a91 to Ben's mailbox, waits for 2 of 3
// replicas, acks Ana (one tick) and asks APNs / FCM to wake Ben's phone with no message content · 2 Ben connects:
// the chat server reads his mailbox in order, delivers a91, Ben acks, the queue deletes a91, and Ben's delivery
// receipt reaches Ana (two ticks) · 3 the ack for a92 is lost: the entry stays, so a92 is delivered again after the
// reconnect; Ben's phone already has id a92, so it acks without showing it twice, and the queue deletes it.
// Working: an entry lives from append to ack; an entry nobody acks is deleted after 30 days (the page's expiry).
// Ids are illustrative. Fact check (2026-11-17, WhatsApp privacy policy): undelivered messages are kept encrypted for
// up to 30 days and deleted on delivery.
// Colours (PATTERN_TONE): phones orange (traffic), the chat server teal (compute), the offline queue violet (store),
// APNs / FCM neutral (plumbing); the lost ack is the red timeout. Section tones only on lanes.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Store and forward: keep it until the device acks",
  lanes: [
    { id: "ana", label: "Ana's phone", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "chat", label: "Chat server", icon: "chat", tone: PATTERN_TONE.compute },
    { id: "queue", label: "Offline queue", icon: "queue", tone: PATTERN_TONE.store },
    { id: "push", label: "APNs / FCM", icon: "bell", tone: PATTERN_TONE.infra },
    { id: "ben", label: "Ben's phone", icon: "phone", tone: PATTERN_TONE.traffic },
  ],
  messages: [
    { from: "ana", to: "chat", label: "send a91 (ciphertext)", step: 1 },
    { from: "chat", to: "queue", label: "append a91 to Ben's mailbox", step: 1 },
    { from: "queue", to: "chat", label: "on 2 of 3 replicas", kind: "return", step: 1 },
    { from: "chat", to: "ana", label: "ack a91: one tick", kind: "return", step: 1 },
    { from: "chat", to: "push", label: "wake Ben, no content", kind: "async", step: 1 },
    { from: "push", to: "ben", label: "notification", kind: "async", step: 1 },

    { from: "ben", to: "chat", label: "connect", step: 2 },
    { from: "chat", to: "queue", label: "read mailbox, oldest first", step: 2 },
    { from: "queue", to: "chat", label: "a91", kind: "return", step: 2 },
    { from: "chat", to: "ben", label: "deliver a91", step: 2 },
    { from: "ben", to: "chat", label: "ack a91", kind: "return", step: 2 },
    { from: "chat", to: "queue", label: "delete a91", step: 2 },
    { from: "chat", to: "ana", label: "Ben's receipt: two ticks", kind: "async", step: 2 },

    { from: "chat", to: "ben", label: "deliver a92", step: 3 },
    { from: "ben", to: "chat", label: "ack a92 lost", kind: "timeout", step: 3 },
    { from: "chat", to: "ben", label: "after reconnect: a92 again", step: 3 },
    { from: "ben", to: "chat", label: "ack a92 (not shown twice)", kind: "return", step: 3 },
    { from: "chat", to: "queue", label: "delete a92", step: 3 },
  ],
  notes: [{ lane: "ben", text: "id a92 already seen", step: 3, at: 15.5 }],
  steps: [
    { title: "Ben is offline: store, ack, wake" },
    { title: "Ben connects: deliver, ack, delete" },
    { title: "The ack is lost: deliver again, show once" },
  ],
};

export default spec;
