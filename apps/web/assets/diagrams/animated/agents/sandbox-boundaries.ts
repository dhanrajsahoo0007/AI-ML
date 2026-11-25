import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { SANDBOX } from "@/components/diagrams/presets/agents-env";

// The sandbox's three fences (ai-first-environment-and-tool-scaffolding, Deep dive "Sandboxing filesystem, network and
// credentials"): where the coding agent's shell commands (running example B: run_tests, npm install) can and cannot
// reach. File system: writes stay in the repository copy; reads of credential files are denied. Network: there is no
// direct route out; every connection goes through a proxy whose allow-list starts empty, so the package registry passes
// and an unlisted host is blocked. Credentials: no real token is inside; a git proxy outside checks each push (the
// branch) and only then adds the real token. The shape follows Claude Code's sandbox (code.claude.com/docs/en/sandboxing)
// and Anthropic's "Beyond permission prompts" (20 Oct 2025), checked 2026-11-15. Anthropic stresses that the fences
// work only together: without the network fence a command could send ~/.ssh out; without the file fence it could
// rewrite its own settings to escape.
//
// Five steps: 1 commands run inside the sandbox, on a copy of the repository · 2 the file-system fence: a read of
// ~/.ssh is denied · 3 the network fence: one way out, through a proxy that lets the registry through · 4 an unlisted
// host is blocked · 5 the credential fence: a push leaves with a scoped token, the git proxy checks the branch
// and adds the real one. Nodes never move.
//
// Layout: the sandbox zone (x 20–310, y 130–420) holds the commands (x 165, y 210) and the repo copy below them
// (x 165, y 360). Outside, a middle column at x 500, cards 170 wide, one row per fence (home folder y 70, network
// proxy y 210, git proxy y 360), and a right column at x 775, cards 190 wide (registry y 160, unlisted host y 260,
// GitHub y 360). The three fence edges fan out from the commands' right side, so none crosses another.
//
// Colour (agents legend, four tones plus neutral): commands teal, the repo copy violet, the two proxies lime (they are
// checks), the unlisted host and every refused edge red; the sandbox, the home folder, the registry and GitHub neutral.

const MID = 500;
const RIGHT = 775;

const spec: DiagramSpec = {
  title: "A sandbox has three fences: files, network, credentials",
  width: 880,
  height: 450,
  steps: [
    { title: "Commands run inside the sandbox" },
    { title: "File system: writes stay in the copy" },
    { title: "Network: one way out, through a proxy" },
    { title: "An unlisted host is blocked" },
    { title: "Credentials stay outside" },
  ],
  zones: [
    { id: "box", title: "Sandbox (container)", tone: AGENT_TONE.infra, kind: "vpc", x: 20, y: 130, w: 290, h: 290 },
  ],
  nodes: [
    {
      id: "cmds",
      label: "Agent's commands",
      sub: "run_tests, npm install",
      icon: "sandbox",
      tone: AGENT_TONE.action,
      fill: "pastel",
      x: 165,
      y: 210,
      w: 230,
    },
    {
      id: "repo",
      label: "Repo copy",
      sub: CODING_TASK.repo,
      icon: "folder",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: 165,
      y: 360,
      w: 200,
    },
    {
      id: "home",
      label: "Home folder",
      sub: SANDBOX.deniedRead,
      icon: "key",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 2,
      x: MID,
      y: 70,
      w: 170,
    },
    {
      id: "proxy",
      label: "Network proxy",
      sub: "allow-list",
      icon: "proxy",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 3,
      x: MID,
      y: 210,
      w: 170,
    },
    {
      id: "registry",
      label: SANDBOX.allowedHost,
      sub: "on the list",
      icon: "globe",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 3,
      x: RIGHT,
      y: 160,
      w: 190,
    },
    {
      id: "paste",
      label: SANDBOX.blockedHost,
      sub: "not on the list",
      icon: "globe",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 4,
      x: RIGHT,
      y: 260,
      w: 190,
    },
    {
      id: "gitproxy",
      label: "Git proxy",
      sub: "holds the real token",
      icon: "vault",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 5,
      x: MID,
      y: 360,
      w: 170,
    },
    {
      id: "github",
      label: "GitHub",
      sub: `branch ${SANDBOX.branch}`,
      icon: "server",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 5,
      x: RIGHT,
      y: 360,
      w: 190,
    },
  ],
  edges: [
    // Step 1: commands read and write the repository copy, and nothing else yet.
    { from: "cmds", to: "repo", label: "read, write", bidirectional: true, packet: true },

    // Step 2: the file-system fence refuses a read of the credential files.
    { from: "cmds", to: "home", label: "read: denied", tone: AGENT_TONE.failure, dashed: true, step: 2 },

    // Step 3: no direct route out; the proxy checks each host against the allow-list.
    { from: "cmds", to: "proxy", label: "every connection", packet: true, step: 3 },
    { from: "proxy", to: "registry", label: "allowed", packet: true, step: 3 },

    // Step 4: an unlisted host is refused at the proxy.
    { from: "proxy", to: "paste", label: "blocked", tone: AGENT_TONE.failure, dashed: true, step: 4 },

    // Step 5: a push leaves with a scoped credential; the git proxy checks it and adds the real token.
    { from: "cmds", to: "gitproxy", label: "push, scoped token", packet: true, step: 5 },
    { from: "gitproxy", to: "github", label: "real token", packet: true, step: 5 },
  ],
};

export default spec;
