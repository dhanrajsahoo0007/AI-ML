import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { MCP_ENDPOINTS } from "@/components/diagrams/presets/agents-mcp";

// MCP authorisation on model-context-protocol (Core concepts, "Authorization and OAuth"). A Brightpost support agent
// connects a desktop AI assistant (a second host) to the remote email server, which sends mail as that agent, so the
// server must know who is asking. The flow follows the MCP specification revision 2026-07-28, "Authorization"
// (checked 2026-11-15): the MCP server is an OAuth 2.1 resource server; a request without a token gets HTTP 401 with
// a WWW-Authenticate header naming its Protected Resource Metadata (RFC 9728); that document names the authorisation
// server, whose metadata the client fetches (RFC 8414 or OpenID Connect Discovery); the user signs in in a browser
// with PKCE and the `resource` parameter (RFC 8707); the client checks `iss` (RFC 9207), swaps the code for a token
// whose audience is this server, and sends it as a Bearer token on every request. Client registration (a Client ID
// Metadata Document, the spec's preferred way) is left to the text. Authorisation applies to HTTP transports only;
// a stdio server takes its credentials from the environment.
//
// Five steps: 1 a call with no token gets 401 and the metadata URL · 2 the client finds the sign-in server and its
// endpoints · 3 the support agent signs in and allows `email:send` in a browser; the code comes back by redirect · 4
// the client swaps the code (with its PKCE verifier) for a token issued for the email server · 5 the call is retried
// with the Bearer token; the server checks audience and scope, then runs send_email.
//
// Layout: four lanes, support agent | sign-in server | assistant | email server (width 880, 220 per lane), so most
// messages join neighbours; only the two browser hand-offs cross the sign-in lane. Labels stay at or under 26
// characters to fit between neighbouring lanes.
//
// Colour (SEQUENCE_TONE): the support agent orange, the sign-in server and the assistant neutral (infrastructure),
// the email server teal. Three tones plus neutral.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "MCP authorisation: OAuth 2.1 for a remote server",
  width: 880,
  steps: [
    { title: "No token: the server says where to sign in" },
    { title: "Find the sign-in server" },
    { title: `The support agent signs in and allows ${MCP_ENDPOINTS.emailScope}` },
    { title: "Swap the code for a token" },
    { title: "Call again with the token" },
  ],
  lanes: [
    { id: "agent", label: BRIGHTPOST.approver, icon: "approval", tone: SEQUENCE_TONE.approver },
    { id: "signin", label: "Sign-in server", icon: "key", tone: SEQUENCE_TONE.harness },
    { id: "assistant", label: "Assistant", icon: "chat", tone: SEQUENCE_TONE.harness },
    { id: "email", label: "Email server", icon: "tool", tone: SEQUENCE_TONE.tool },
  ],
  messages: [
    // Step 1: the first call has no token. The server answers 401 and names its Protected Resource Metadata.
    { from: "assistant", to: "email", label: `${TOOLS.sendEmail.name}, no token`, step: 1, at: 1 },
    { from: "email", to: "assistant", label: "401 + resource_metadata", kind: "return", step: 1, at: 2 },

    // Step 2: discovery. The metadata names the sign-in server; its own metadata lists the endpoints.
    { from: "assistant", to: "email", label: "GET resource metadata", step: 2, at: 3 },
    { from: "email", to: "assistant", label: "sign-in server's URL", kind: "return", step: 2, at: 4 },
    { from: "assistant", to: "signin", label: "GET server metadata", step: 2, at: 5 },
    { from: "signin", to: "assistant", label: "endpoints, PKCE S256", kind: "return", step: 2, at: 6 },

    // Step 3: the person signs in and consents in a browser; the code comes back to the assistant by redirect.
    { from: "assistant", to: "agent", label: "open browser: PKCE + resource", step: 3, at: 7 },
    { from: "agent", to: "signin", label: `sign in, allow ${MCP_ENDPOINTS.emailScope}`, step: 3, at: 8 },
    { from: "signin", to: "agent", label: "redirect: code + iss", kind: "return", step: 3, at: 9 },
    { from: "agent", to: "assistant", label: "code", kind: "return", step: 3, at: 10 },

    // Step 4: the code and the PKCE verifier buy a token whose audience is the email server only.
    { from: "assistant", to: "signin", label: "code + verifier + resource", step: 4, at: 11 },
    { from: "signin", to: "assistant", label: "token for the email server", kind: "return", step: 4, at: 12 },

    // Step 5: the same call, now with the token. The server checks it was issued for this server, with this scope.
    { from: "assistant", to: "email", label: "send_email + Bearer token", step: 5, at: 13 },
    { from: "email", to: "assistant", label: "result: email sent", kind: "return", step: 5, at: 15 },
  ],
  notes: [{ lane: "email", text: "Checks audience and scope", step: 5, at: 14 }],
};

export default spec;
