import type { SequenceSpec } from "@/components/diagrams/types";

// One gRPC call in the bookshop story: checkout asks inventory to hold two copies of book BK-1042.
// Step 1: checkout calls a generated function on the client stub, as if inventory were a local library.
// Step 2: the stub encodes the request (15 bytes of Protobuf, see rpc-layout), sends it on a new HTTP/2 stream as a
// HEADERS frame (method path, deadline) plus a DATA frame (5-byte gRPC prefix + 15 bytes), the server stub decodes it
// and calls the handler, and the reply comes back the same way, ending with grpc-status 0 (OK) in the trailers.
// Step 3: inventory is stuck on a row lock. The 300 ms deadline fires on the client, checkout gets DEADLINE_EXCEEDED,
// and the client cancels the stream so the server stops working on an answer nobody will read.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A gRPC call: stub, serialised call, server",
  width: 760,
  steps: [
    { title: "Call a generated function" },
    { title: "Encode, send on one HTTP/2 stream, reply" },
    { title: "The deadline runs out" },
  ],
  lanes: [
    { id: "app", label: "Checkout code", icon: "server", tone: "green" },
    { id: "cstub", label: "Client stub", icon: "api", tone: "blue" },
    { id: "sstub", label: "Server stub", icon: "api", tone: "blue" },
    { id: "inv", label: "Inventory code", icon: "server", tone: "teal" },
  ],
  messages: [
    // Step 1: the call looks local.
    { from: "app", to: "cstub", label: "ReserveStock(sku, qty)", step: 1 },

    // Step 2: serialise, frame, send, decode, run, reply.
    { from: "cstub", to: "cstub", label: "encode: 15 bytes", step: 2 },
    { from: "cstub", to: "sstub", label: "HEADERS: path, deadline", step: 2 },
    { from: "cstub", to: "sstub", label: "DATA: 5 + 15 bytes", step: 2 },
    { from: "sstub", to: "inv", label: "decode, call handler", step: 2 },
    { from: "inv", to: "sstub", label: "ReserveReply", kind: "return", step: 2 },
    { from: "sstub", to: "cstub", label: "DATA + grpc-status 0", kind: "return", step: 2 },
    { from: "cstub", to: "app", label: "reply object", kind: "return", step: 2 },

    // Step 3: no answer inside the deadline; fail fast and cancel the server's work.
    { from: "app", to: "cstub", label: "call, deadline 300 ms", step: 3 },
    { from: "cstub", to: "sstub", label: "grpc-timeout: 300m", kind: "timeout", step: 3, duration: 2 },
    { from: "sstub", to: "inv", label: "ReserveStock(req)", step: 3 },
    { from: "cstub", to: "app", label: "DEADLINE_EXCEEDED", kind: "return", step: 3, delay: 0.6 },
    { from: "cstub", to: "sstub", label: "RST_STREAM (cancel)", kind: "async", step: 3 },
    { from: "sstub", to: "inv", label: "context cancelled", kind: "async", step: 3 },
  ],
  notes: [
    { lane: "cstub", text: "Generated from the .proto file", step: 1, at: 0.5 },
    { lane: "inv", text: "Runs in about 4 ms", step: 2, at: 4.5 },
    { lane: "inv", text: "Stuck on a row lock", step: 3, at: 10.5 },
    { lane: "app", text: "Fails after 300 ms, not 30 s", step: 3 },
  ],
};

export default spec;
