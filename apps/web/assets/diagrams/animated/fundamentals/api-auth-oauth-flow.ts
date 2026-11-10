import type { SequenceSpec } from "@/components/diagrams/types";

// OAuth 2 authorization code flow with PKCE. PlanMyWeek, a meal-planning app, wants to read a user's saved recipes
// on Larder without ever seeing the user's Larder password. The user's browser carries the redirects; the code
// travels through it, but the tokens never do. Step 5 shows a refresh with rotation.
// Lanes are ordered so that the most frequent hops (browser <-> app, app <-> login) sit next to each other.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "OAuth 2 code flow with PKCE",
  width: 800,
  steps: [
    { title: "The app sends you to Larder to log in and agree" },
    { title: "Larder sends a one-time code back through the browser" },
    { title: "The app trades the code and its verifier for tokens" },
    { title: "The app calls the API with the access token" },
    { title: "When the access token expires, refresh it" },
  ],
  lanes: [
    { id: "browser", label: "Your browser", icon: "browser", tone: "neutral" },
    { id: "planner", label: "PlanMyWeek app", icon: "server", tone: "blue" },
    { id: "auth", label: "Larder login", icon: "key", tone: "violet" },
    { id: "api", label: "Larder API", icon: "api", tone: "green" },
  ],
  messages: [
    // Step 1: redirect to Larder, log in there, approve the scope.
    { from: "browser", to: "planner", label: "Click: Connect Larder", step: 1 },
    { from: "planner", to: "browser", label: "302 to /authorize", kind: "return", step: 1 },
    { from: "browser", to: "auth", label: "/authorize + challenge", step: 1 },
    { from: "auth", to: "browser", label: "Log in, allow recipes:read?", kind: "return", step: 1 },
    { from: "browser", to: "auth", label: "Allow", step: 1 },

    // Step 2: the code comes back through the browser, in the URL.
    { from: "auth", to: "browser", label: "302 to callback, code", kind: "return", step: 2 },
    { from: "browser", to: "planner", label: "GET /callback?code=x7f", step: 2 },

    // Step 3: a direct server-to-server call; the verifier proves this is the app that started the flow.
    { from: "planner", to: "auth", label: "POST /token code+verifier", step: 3 },
    { from: "auth", to: "planner", label: "access (15 min) + refresh", kind: "return", step: 3 },

    // Step 4: the access token goes in the Authorization header.
    { from: "planner", to: "api", label: "GET /recipes, Bearer", step: 4 },
    { from: "api", to: "planner", label: "200: saved recipes", kind: "return", step: 4 },

    // Step 5: refresh with rotation.
    { from: "planner", to: "auth", label: "POST /token refresh", step: 5, delay: 0.6 },
    { from: "auth", to: "planner", label: "new access + new refresh", kind: "return", step: 5 },
  ],
  notes: [
    { lane: "planner", text: "Keeps verifier, sends its hash", step: 1, at: 1.5 },
    { lane: "auth", text: "Code: single use, 60 s", step: 2, at: 5.5 },
    { lane: "auth", text: "SHA-256(verifier) = challenge?", step: 3, at: 7.5 },
    { lane: "api", text: "Checks signature, exp, scope", step: 4, at: 9.5 },
    { lane: "auth", text: "Old refresh token is now dead", step: 5 },
  ],
};

export default spec;
