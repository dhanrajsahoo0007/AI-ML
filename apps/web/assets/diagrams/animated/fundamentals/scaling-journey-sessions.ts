import type { SequenceSpec } from "@/components/diagrams/types";

// Why app servers must be stateless. The load balancer (not drawn as a lane, to keep four lanes) sends the
// login to server A and the next click to server B. Step 1: the session lives in A's memory, so B does not know
// the user and sends her back to the login page. Step 2: A writes the session to a shared store, so any server
// can read it.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Sessions on one server vs in a shared store",
  width: 760,
  lanes: [
    { id: "browser", label: "Browser", icon: "browser" },
    { id: "srvA", label: "Server A", icon: "server", tone: "green" },
    { id: "srvB", label: "Server B", icon: "server", tone: "green" },
    { id: "store", label: "Session store", icon: "cache", tone: "orange" },
  ],
  messages: [
    // Step 1: state kept inside one server.
    { from: "browser", to: "srvA", label: "POST /login" },
    { from: "srvA", to: "browser", label: "200, cookie sid=7f3", kind: "return" },
    { from: "browser", to: "srvB", label: "GET /cart, sid=7f3", delay: 0.4 },
    { from: "srvB", to: "browser", label: "302: please log in", kind: "return" },

    // Step 2: state moved to a shared store.
    { from: "browser", to: "srvA", label: "POST /login", step: 2 },
    { from: "srvA", to: "store", label: "SET sid 7f3 = Ana", step: 2 },
    { from: "srvA", to: "browser", label: "200, cookie sid=7f3", kind: "return", step: 2 },
    { from: "browser", to: "srvB", label: "GET /cart, sid=7f3", step: 2, delay: 0.4 },
    { from: "srvB", to: "store", label: "GET sid 7f3", step: 2 },
    { from: "store", to: "srvB", label: "Ana", kind: "return", step: 2 },
    { from: "srvB", to: "browser", label: "200, Ana's cart", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "srvA", text: "session kept in A's RAM", step: 1, at: 0.5 },
    { lane: "srvB", text: "B never saw sid 7f3", step: 1, at: 2.5 },
  ],
  steps: [
    { title: "Session in one server's memory: the next click fails" },
    { title: "Session in a shared store: any server can answer" },
  ],
};

export default spec;
