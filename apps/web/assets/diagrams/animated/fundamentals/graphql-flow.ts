import type { SequenceSpec } from "@/components/diagrams/types";

// The podcast app's home screen: the user's name and avatar, then 40 followed shows, each with its latest episode.
// Step 1 (REST): the phone makes three calls over a slow mobile link, about 200 ms per round trip, one after another,
// because the third call needs the show ids from the second. 3 x 200 ms = about 600 ms. The responses carry every
// field each endpoint has: 4 KB + 60 KB + 80 KB = about 144 KB, of which the screen shows about 7 KB.
// Step 2 (GraphQL): one request crosses the mobile link. The GraphQL server makes the same three service calls
// inside the data center (about 1 to 5 ms each) and returns only the asked-for fields: about 200 + 20 = 220 ms, 7 KB.
// Packet durations follow the distances: mobile crossings are slow, data-center hops fast.
const MOBILE = 1.6;
const DC = 0.5;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One GraphQL query instead of three REST calls",
  width: 820,
  steps: [{ title: "Three REST calls from the phone" }, { title: "One GraphQL query" }],
  lanes: [
    { id: "phone", label: "Phone app", icon: "phone", tone: "neutral" },
    { id: "gql", label: "GraphQL server", icon: "api", tone: "green" },
    { id: "users", label: "User service", icon: "users", tone: "teal" },
    { id: "shows", label: "Show service", icon: "feed", tone: "teal" },
    { id: "episodes", label: "Episode service", icon: "media", tone: "teal" },
  ],
  messages: [
    // Step 1: three round trips over the mobile network, each returning whole objects.
    { from: "phone", to: "users", label: "GET /me", step: 1, duration: MOBILE },
    { from: "users", to: "phone", label: "4 KB, 40 fields", kind: "return", step: 1, duration: MOBILE },
    { from: "phone", to: "shows", label: "GET /me/subscriptions", step: 1, duration: MOBILE },
    { from: "shows", to: "phone", label: "60 KB, 40 shows", kind: "return", step: 1, duration: MOBILE },
    { from: "phone", to: "episodes", label: "GET /episodes?shows=7,9,...", step: 1, duration: MOBILE },
    { from: "episodes", to: "phone", label: "80 KB, 40 episodes", kind: "return", step: 1, duration: MOBILE },

    // Step 2: one request over the mobile network; the fan-out happens inside the data center.
    { from: "phone", to: "gql", label: "POST /graphql (1 query)", step: 2, delay: 0.6, duration: MOBILE },
    { from: "gql", to: "users", label: "user 42", step: 2, duration: DC },
    { from: "users", to: "gql", label: "name, avatar", kind: "return", step: 2, duration: DC },
    { from: "gql", to: "shows", label: "follows of user 42", step: 2, duration: DC },
    { from: "shows", to: "gql", label: "40 shows", kind: "return", step: 2, duration: DC },
    { from: "gql", to: "episodes", label: "latest of 40 shows", step: 2, duration: DC },
    { from: "episodes", to: "gql", label: "40 episodes", kind: "return", step: 2, duration: DC },
    { from: "gql", to: "phone", label: "7 KB, only asked fields", kind: "return", step: 2, duration: MOBILE },
  ],
  notes: [
    { lane: "phone", text: "3 round trips: about 600 ms, 144 KB", step: 1, at: 5.5 },
    { lane: "phone", text: "1 round trip: about 220 ms, 7 KB", step: 2 },
  ],
};

export default spec;
