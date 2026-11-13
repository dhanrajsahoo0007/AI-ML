import type { DiagramSpec } from "@/components/diagrams/types";

// Hosting an API on the cloud, told as the story of Brightpost's wholesale order API (cloud/networking/hosting-apis).
// Step 1: shoppers and the ~300 gift shops both reach the shop's app servers through one load balancer; the order
// API is extra routes inside the shop app. Step 2 (the failure step): one gift shop's retry bug sends about 4,000
// calls a minute into that shared door, and checkout slows for everyone. Step 3: the order API moves to a service of
// its own, still straight behind the load balancer. Step 4: an API gateway in front checks each shop's key and
// throttles it, so the buggy shop is told to slow down. Step 5: a custom domain with a certificate on the gateway.
// Step 6: an edge cache answers the public catalogue reads. Step 7: a GraphQL service for the shop owners' app,
// whose resolvers call the order API and read the database.
//
// Nodes never move between steps. Edges that a later step replaces end with `until`.
//
// Layout: three columns.
//   Left (x 78-230): the clients row on top, then the shop's own path: load balancer, app servers, database.
//   Middle (x 400-490): gift shops on top, then the gateway, the order API service and the GraphQL service.
//   Right (x 702): edge cache, certificate, the owners' app.
// Rows (centres): 80 | 250 | 390 | 530.
// shoppers 78,80 | shop217 230,80 | shops 400,80 | edge 702,80 | lb 230,250 | gw 490,250 | cert 702,250 |
// app 230,390 | api 490,390 | wapp 702,390 | db 230,530 | gql 490,530.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 use only the
// clients row and the left column, so the free preview and the failure show without scrolling.
//
// Zone tabs sit on a zone's top-left corner. The Shop zone starts at x 70 so the shoppers' diagonal enters right of
// its tab; the API zone's tab ("API") ends near x 441, so the gift shops' edge enters at x 465 and the refused calls
// of shop 217 come in through the zone's left side (via 350,140 and 350,250).
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are sized
// for the longest provider name the Services toggle shows ("Virtual machines", "API Management", "Cloud Run server").
const spec: DiagramSpec = {
  title: "From one shared app to a gateway in front of its own API service",
  width: 800,
  height: 620,
  steps: [
    { title: "One app answers shoppers and gift shops" },
    { title: "One shop's bug floods the shared servers" },
    { title: "The order API gets a service of its own" },
    { title: "A gateway checks each shop's key and rate" },
    { title: "A custom name with its own certificate" },
    { title: "The edge answers catalogue reads" },
    { title: "A GraphQL service for the owners' app" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 5, y: 25, w: 480, h: 112 },
    { id: "edgezone", title: "Edge and name", tone: "blue", x: 600, y: 25, w: 198, h: 282 },
    { id: "shop", title: "Shop", tone: "teal", x: 70, y: 190, w: 258, h: 245 },
    { id: "wholesale", title: "API", tone: "teal", x: 380, y: 190, w: 205, h: 395 },
    { id: "owners", title: "Shop owners", tone: "neutral", x: 600, y: 335, w: 198, h: 110 },
    { id: "data", title: "Data", tone: "violet", x: 150, y: 470, w: 160, h: 138 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "40 online",
      icon: "users",
      tone: "neutral",
      x: 78,
      y: 80,
      w: 136,
    },
    {
      id: "shops",
      label: "Gift shops",
      sub: "about 300 shops",
      icon: "bag",
      tone: "neutral",
      x: 400,
      y: 80,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "one front door",
      icon: "load-balancer",
      tone: "blue",
      x: 230,
      y: 250,
      w: 176,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: { id: "gcp-cloud-load-balancing", label: "Application LB" },
        azure: { id: "azure-app-gateway", label: "App Gateway" },
      },
    },
    {
      id: "app",
      label: "Shop app servers",
      sub: "pages and checkout",
      icon: "server",
      tone: "teal",
      x: 230,
      y: 390,
      w: 176,
      cloud: {
        aws: "aws-ec2",
        gcp: "gcp-compute-engine",
        azure: { id: "azure-vm", label: "Virtual machines" },
      },
    },
    {
      id: "db",
      label: "Orders database",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 230,
      y: 530,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 2: the failure
    {
      id: "shop217",
      label: "Shop 217",
      sub: "retry bug",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 230,
      y: 80,
      w: 150,
    },

    // Step 3
    {
      id: "api",
      label: "Order API service",
      sub: "own containers",
      icon: "container",
      tone: "teal",
      step: 3,
      x: 490,
      y: 390,
      w: 176,
      cloud: {
        aws: { id: "aws-ecs", label: "ECS on Fargate" },
        gcp: "gcp-cloud-run",
        azure: { id: "azure-container-apps", label: "Container Apps" },
      },
    },

    // Step 4
    {
      id: "gw",
      label: "API gateway",
      sub: "keys, throttles",
      icon: "gateway",
      tone: "blue",
      accent: true,
      step: 4,
      x: 490,
      y: 250,
      w: 176,
      cloud: {
        aws: { id: "aws-api-gateway", label: "API Gateway" },
        gcp: { label: "API Gateway" },
        azure: { id: "azure-apim", label: "API Management" },
      },
    },

    // Step 5
    {
      id: "cert",
      label: "Domain + cert",
      sub: "api.brightpost.example",
      icon: "certificate",
      tone: "red",
      step: 5,
      x: 702,
      y: 250,
      w: 186,
      cloud: {
        aws: { label: "ACM certificate" },
        gcp: { label: "Managed SSL cert" },
        azure: { id: "azure-key-vault", label: "Key Vault cert" },
      },
    },

    // Step 6
    {
      id: "edge",
      label: "Edge cache",
      sub: "catalogue, 10 min",
      icon: "cdn",
      tone: "blue",
      step: 6,
      x: 702,
      y: 80,
      w: 186,
      cloud: {
        aws: { id: "aws-cloudfront", label: "CloudFront" },
        gcp: { id: "gcp-cloud-cdn", label: "Cloud CDN" },
        azure: { id: "azure-front-door", label: "Front Door" },
      },
    },

    // Step 7
    {
      id: "wapp",
      label: "Shop owners' app",
      sub: "web screens",
      icon: "browser",
      tone: "neutral",
      step: 7,
      x: 702,
      y: 390,
      w: 186,
    },
    {
      id: "gql",
      label: "GraphQL service",
      sub: "one query, many reads",
      icon: "api",
      tone: "teal",
      step: 7,
      x: 490,
      y: 530,
      w: 176,
      cloud: {
        aws: "aws-appsync",
        gcp: { id: "gcp-cloud-run", label: "Cloud Run server" },
        azure: { id: "azure-apim", label: "APIM GraphQL" },
      },
    },
  ],
  edges: [
    // Step 1: both kinds of client come through the same door, and every route lands on the same servers.
    { from: "shoppers", to: "lb", label: "shop pages", packet: true, labelAt: 0.35 },
    { from: "shops", to: "lb", label: "order API", packet: true, delay: 0.8, labelAt: 0.35, until: 3 },
    { from: "lb", to: "app", label: "every route", packet: true, delay: 1.2, until: 1 },
    { from: "app", to: "db", label: "SQL", packet: true, delay: 1.8, labelAt: 0.3 },

    // Step 2: one shop's retry loop floods the shared door. Nothing counts calls per shop.
    {
      from: "shop217",
      to: "lb",
      label: "4,000/min",
      tone: "red",
      packet: true,
      duration: 0.9,
      labelAt: 0.7,
      step: 2,
      until: 3,
    },
    { from: "lb", to: "app", label: "flooded", tone: "red", packet: true, duration: 0.9, step: 2, until: 2 },

    // Step 3: the order API runs on its own service; the balancer sends /api paths there.
    { from: "lb", to: "app", label: "shop pages", packet: true, delay: 1.2, step: 3 },
    { from: "lb", to: "api", label: "/api paths", packet: true, delay: 0.6, step: 3, until: 3 },
    { from: "api", to: "db", label: "SQL, capped", packet: true, delay: 1.4, labelAt: 0.55, step: 3 },

    // Step 4: each shop calls the gateway with its own key; shop 217's extra calls are refused.
    { from: "shops", to: "gw", label: "shop key", packet: true, labelAt: 0.4, step: 4, until: 5 },
    {
      from: "shop217",
      to: "gw",
      label: "slow down",
      tone: "red",
      dashed: true,
      via: [
        [350, 140],
        [350, 250],
      ],
      labelAt: 0.5,
      step: 4,
    },
    { from: "gw", to: "api", label: "within limits", packet: true, delay: 0.8, step: 4 },

    // Step 5: the gateway answers on Brightpost's own name with its own certificate.
    { from: "cert", to: "gw", label: "TLS", dashed: true, step: 5 },

    // Step 6: catalogue reads stop at the edge; orders still go to the gateway.
    { from: "shops", to: "edge", label: "GET catalogue", packet: true, step: 6 },
    { from: "edge", to: "gw", label: "on a miss", dashed: true, labelAt: 0.35, step: 6 },
    { from: "shops", to: "gw", label: "orders, key", packet: true, labelAt: 0.4, step: 6 },

    // Step 7: one query from the owners' app; resolvers call the order API and read the database.
    { from: "wapp", to: "gql", label: "one query", packet: true, labelAt: 0.3, step: 7 },
    { from: "gql", to: "api", label: "resolvers", packet: true, delay: 0.8, step: 7 },
    { from: "gql", to: "db", label: "reads", packet: true, delay: 1.2, step: 7 },
  ],
};

export default spec;
