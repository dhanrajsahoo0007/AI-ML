import type { DiagramSpec } from "@/components/diagrams/types";

// Infrastructure as code, told as the story of Brightpost's spring sale (cloud/fundamentals/infrastructure-as-code).
// Step 1: Asha builds the test copy and the shop's servers by clicking in the web console; every click becomes a call
// to the cloud's API. Step 2 (the failure step): five weeks before the sale she lowers the shop's scaling maximum from
// 10 to 3 by hand. The test copy still says 10, and on sale day 1,800 shoppers meet 3 servers. Step 3: the setup is
// written as a template in a repository, and the console becomes read-only. Step 4: an IaC engine compares the
// template with what is live and shows a plan ("max 3 → 10") before it applies anything. Step 5: a CI pipeline runs
// the plan and the apply after each merge, with a 1-hour token from the identity service and no stored key. Step 6:
// the engine keeps its state in one remote place and locks it during each run.
//
// Nodes never move between steps. The hand change and the old shortfall live in edge labels with `until`.
//
// Layout: three columns that read left to right.
//   Left (x 130), "what exists and who touches it": Asha, the console, the test copy, the shop servers, the shoppers.
//   Middle (x 395), "the shared doors": the repository, the cloud API, the plan.
//   Right (x 672), "the pipeline": identity service, CI pipeline, IaC engine, state.
// Rows (centres): 90 | 230 | 370 | 510 | 650.
// asha 130,90 | repo 395,90 | idsvc 672,90 | console 130,230 | api 395,230 | ci 672,230 |
// testgrp 130,370 | engine 672,370 | shopgrp 130,510 | plan 395,510 | state 672,510 | shoppers 130,650.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 use only the
// left column and the cloud API in the middle, so the free preview and the failure show without scrolling. The canvas
// stays under 800 wide so labels stay readable in the 660 px article column.
//
// The API reaches the shop servers through a bend at (285, 440), left of the empty middle row, so the edge clears the
// test copy's box. The repository reaches the CI pipeline down the gutter between the middle and right columns
// (x 535), so it enters the Deploy zone below its tab. The "Outside" zone uses the subnet kind (inline label, no tab).
// The zones on the left have short titles ("Test", "Shop") so their tabs end left of the vertical edges at x 130.
// Labels on the vertical edges in the right column sit near their source (labelAt) to keep the pills off the tabs.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle puts in them ("Managed instance group", "Infrastructure Manager",
// "Management Console"), not only for the generic label.
const scalingGroup = {
  aws: { label: "Auto Scaling group" },
  gcp: { label: "Managed instance group" },
  azure: { label: "VM scale set" },
};

const spec: DiagramSpec = {
  title: "From console clicks to a reviewed template applied by a pipeline",
  width: 795,
  height: 720,
  steps: [
    { title: "Built by clicking in the console" },
    { title: "A change by hand that nobody wrote down" },
    { title: "The setup lives in a template" },
    { title: "A plan before any change" },
    { title: "Applied from CI with a short-lived identity" },
    { title: "State kept in one place, and locked" },
  ],
  zones: [
    { id: "team", title: "Team", tone: "neutral", x: 10, y: 40, w: 240, h: 245 },
    { id: "test", title: "Test", tone: "teal", x: 10, y: 315, w: 240, h: 115 },
    { id: "shop", title: "Shop", tone: "teal", x: 10, y: 455, w: 240, h: 110 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 10, y: 590, w: 240, h: 115 },
    { id: "code", title: "Code", tone: "orange", x: 280, y: 40, w: 230, h: 100 },
    { id: "provider", title: "Provider", tone: "blue", x: 280, y: 175, w: 230, h: 100 },
    { id: "review", title: "Review", tone: "orange", x: 280, y: 455, w: 230, h: 110 },
    { id: "identity", title: "Identity", tone: "red", x: 560, y: 40, w: 225, h: 100 },
    { id: "delivery", title: "Deploy", tone: "orange", x: 560, y: 175, w: 225, h: 255 },
    { id: "statez", title: "State", tone: "violet", x: 560, y: 455, w: 225, h: 110 },
  ],
  nodes: [
    // Step 1
    { id: "asha", label: "Asha", sub: "developer", icon: "user-check", tone: "neutral", x: 130, y: 90, w: 150 },
    {
      id: "console",
      label: "Web console",
      sub: "clicks, no record",
      icon: "browser",
      tone: "blue",
      x: 130,
      y: 230,
      w: 190,
      cloud: {
        aws: { label: "Management Console" },
        gcp: { label: "Cloud console" },
        azure: { label: "Azure portal" },
      },
    },
    {
      id: "api",
      label: "Cloud API",
      sub: "every tool calls it",
      icon: "api",
      tone: "blue",
      x: 395,
      y: 230,
      w: 186,
      cloud: {
        aws: { label: "AWS service APIs" },
        gcp: { label: "Google Cloud APIs" },
        azure: { label: "Resource Manager" },
      },
    },
    {
      id: "testgrp",
      label: "Test copy",
      sub: "scaling group",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 370,
      w: 228,
      cloud: scalingGroup,
    },
    {
      id: "shopgrp",
      label: "Shop servers",
      sub: "scaling group, live",
      icon: "server",
      tone: "teal",
      accent: true,
      x: 130,
      y: 510,
      w: 228,
      cloud: scalingGroup,
    },

    // Step 2: the failure
    {
      id: "shoppers",
      label: "Sale-day shoppers",
      sub: "1,800 at 10:05",
      icon: "users",
      tone: "red",
      step: 2,
      x: 130,
      y: 650,
      w: 190,
    },

    // Step 3
    {
      id: "repo",
      label: "Repository",
      sub: "template + history",
      icon: "git-branch",
      tone: "orange",
      step: 3,
      x: 395,
      y: 90,
      w: 186,
    },

    // Step 4
    {
      id: "engine",
      label: "IaC engine",
      sub: "compares, then applies",
      icon: "controller",
      tone: "orange",
      accent: true,
      step: 4,
      x: 672,
      y: 370,
      w: 212,
      cloud: {
        aws: "aws-cloudformation",
        gcp: "gcp-infra-manager",
        azure: { id: "azure-bicep", label: "Bicep deployment" },
      },
    },
    {
      id: "plan",
      label: "Plan",
      sub: "1 change: max 3 → 10",
      icon: "file",
      tone: "orange",
      step: 4,
      x: 395,
      y: 510,
      w: 186,
      cloud: {
        aws: { label: "Change set" },
        gcp: { label: "Preview" },
        azure: { label: "What-if" },
      },
    },

    // Step 5
    {
      id: "ci",
      label: "CI pipeline",
      sub: "no stored keys",
      icon: "pipeline",
      tone: "orange",
      step: 5,
      x: 672,
      y: 230,
      w: 190,
      cloud: { aws: "aws-codepipeline", gcp: "gcp-cloud-build", azure: "azure-pipelines" },
    },
    {
      id: "idsvc",
      label: "Identity service",
      sub: "trusts the CI token",
      icon: "key",
      tone: "red",
      step: 5,
      x: 672,
      y: 90,
      w: 190,
      cloud: { aws: "aws-iam", gcp: "gcp-iam", azure: "azure-entra-id" },
    },

    // Step 6
    {
      id: "state",
      label: "State",
      sub: "remote, locked",
      icon: "lock",
      tone: "violet",
      step: 6,
      x: 672,
      y: 510,
      w: 190,
      cloud: {
        aws: { id: "aws-cloudformation", label: "Stack state" },
        gcp: { id: "gcp-infra-manager", label: "Managed state" },
        azure: { label: "No state file" },
      },
    },
  ],
  edges: [
    // Step 1: every click in the console becomes a call to the cloud's API, which builds both copies.
    { from: "asha", to: "console", label: "clicks", packet: true, until: 1 },
    { from: "console", to: "api", label: "calls", packet: true, delay: 0.8 },
    { from: "api", to: "testgrp", label: "create", packet: true, delay: 1.6, labelAt: 0.55 },
    {
      from: "api",
      to: "shopgrp",
      label: "create",
      packet: true,
      delay: 1.6,
      via: [[285, 440]],
      labelAt: 0.35,
    },

    // Step 2: a hand change in production; the two copies now differ, and the sale meets 3 servers.
    { from: "asha", to: "console", label: "max 10 → 3, by hand", tone: "red", step: 2, until: 2 },
    {
      from: "testgrp",
      to: "shopgrp",
      label: "max 10 vs max 3",
      tone: "red",
      dashed: true,
      labelAt: 0.3,
      step: 2,
      until: 3,
    },
    { from: "shoppers", to: "shopgrp", label: "3 servers: 600 fit", tone: "red", packet: true, step: 2, until: 3 },

    // Step 3: the setup is written down and reviewed; the console is for looking only.
    { from: "asha", to: "repo", label: "commit", packet: true, step: 3 },
    { from: "asha", to: "console", label: "read only", dashed: true, step: 3 },

    // Step 4: the engine compares the template with what is live, shows the plan, then applies it.
    {
      from: "repo",
      to: "engine",
      label: "template",
      packet: true,
      via: [
        [535, 90],
        [535, 230],
      ],
      labelAt: 0.35,
      step: 4,
      until: 4,
    },
    { from: "engine", to: "plan", label: "shows", packet: true, delay: 1, step: 4 },
    { from: "engine", to: "api", label: "apply", packet: true, delay: 2, step: 4 },
    { from: "shoppers", to: "shopgrp", label: "up to 10 servers", packet: true, step: 4 },

    // Step 5: a merge starts the pipeline, which swaps its own token for a 1-hour one and runs the engine.
    {
      from: "repo",
      to: "ci",
      label: "on merge",
      packet: true,
      via: [
        [535, 90],
        [535, 230],
      ],
      labelAt: 0.5,
      step: 5,
    },
    { from: "idsvc", to: "ci", label: "1-hour token", packet: true, delay: 0.8, labelAt: 0.25, step: 5 },
    { from: "ci", to: "engine", label: "plan, then apply", packet: true, delay: 1.6, step: 5 },

    // Step 6: the engine reads its state from one remote store and holds a lock while it runs.
    { from: "engine", to: "state", label: "read + lock", dashed: true, flow: true, labelAt: 0.3, step: 6 },
  ],
};

export default spec;
