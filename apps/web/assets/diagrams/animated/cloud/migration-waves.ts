import type { DiagramSpec } from "@/components/diagrams/types";

// Migration in waves, told as Brightpost moving the framing shop it bought (cloud/operations/migration-and-modernization).
// Step 1: discover. The VMware manager in the back office hands the assessment tool a list of the 6 virtual machines.
// Step 2: the landing zone and a private link come first, before any server is copied. Step 3: wave 1. A replication
// service copies the order app's disk blocks nonstop, launches the cloud copy, and the shop's DNS name is pointed at it;
// the cloud app still reads the old database over the link. Step 4 (the only failure step): an old PC under the
// workshop bench, which no inventory listed, fetches the day's orders at 02:00 from the old server, now off, so no
// tickets print. Step 5: traffic is mapped before each wave; the PC is kept and reads its export over the link; wave 2
// moves the database into a managed engine. Step 6: after the move, the price calculator is rebuilt as a small service.
//
// Nodes never move and never disappear. The edges that a later step replaces end with `until`: the cloud app's SQL to
// the old database (until 4) and the PC's 02:00 fetch from the old server (until 4).
//
// Layout: three columns (x 130 | 405 | 672) and five rows (y 110 | 225 | 345 | 455 | 600).
//   Left, back office: VMware manager 130,110 | order app 130,225 | order database 130,345 | 4 other servers 130,455;
//   the workshop band below holds the ticket PC 130,600.
//   Middle, tools and link: assessment tool 405,110 | replication service 405,225 | private link 405,345 |
//   dependency map 405,600.
//   Right, the cloud region: shop address (DNS) 672,110 | order app 672,225 | order database 672,345 |
//   price service 672,455 | landing zone 672,600.
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Step 1, the free preview,
// and step 4, the failure, sit in the left and middle columns; the cloud column fills in with the waves.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Edge routes: most edges are horizontal along a row. The failure edge climbs the gutter between the back office and
// the tools (x 262), with its label between the database and the other servers (y about 400). The link reaches the
// landing zone on a diagonal that passes under the price service and over the dependency map. The cloud app's SQL to
// the old database, and later the PC's export, run on the diagonal between the cloud app and the link.
// Text room: a label takes about 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle shows: "App Migration Service" (w 212), "SQL Managed Instance",
// "Azure landing zone" and "Site-to-Site VPN" (w 204).
const spec: DiagramSpec = {
  title: "Moving the framing shop in waves",
  width: 795,
  height: 668,
  steps: [
    { title: "Discover: list what runs" },
    { title: "Landing zone and private link first" },
    { title: "Wave 1: replicate the order app, cut over" },
    { title: "A forgotten PC stops the workshop" },
    { title: "Map traffic, then wave 2: the database" },
    { title: "Modernize after the move" },
  ],
  zones: [
    { id: "office", title: "Back office: 2 VMware hosts", tone: "neutral", x: 10, y: 40, w: 240, h: 460 },
    { id: "workshop", title: "Workshop", tone: "neutral", kind: "subnet", x: 10, y: 530, w: 240, h: 125 },
    { id: "tools", title: "Migration tools", tone: "orange", x: 290, y: 40, w: 230, h: 230 },
    { id: "link", title: "Network", tone: "blue", x: 290, y: 290, w: 230, h: 95 },
    { id: "check", title: "Before each wave", tone: "orange", x: 290, y: 530, w: 230, h: 125 },
    { id: "cloud", title: "Cloud region", tone: "neutral", kind: "region", x: 560, y: 40, w: 225, h: 615 },
  ],
  nodes: [
    // Step 1: what the back office runs, and the tool that lists it.
    {
      id: "vmware",
      label: "VMware manager",
      sub: "lists the 6 VMs",
      icon: "server",
      tone: "neutral",
      x: 130,
      y: 110,
      w: 176,
    },
    {
      id: "app",
      label: "Order app",
      sub: "about 120 orders a day",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 225,
      w: 176,
    },
    {
      id: "db",
      label: "Order database",
      sub: "SQL Server",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 345,
      w: 176,
    },
    {
      id: "others",
      label: "4 other servers",
      sub: "files, accounts, more",
      icon: "server",
      tone: "neutral",
      x: 130,
      y: 455,
      w: 176,
    },
    {
      id: "assess",
      label: "Assessment tool",
      sub: "inventory, sizes, cost",
      icon: "search",
      tone: "orange",
      x: 405,
      y: 110,
      w: 204,
      cloud: {
        aws: { label: "AWS Transform" },
        gcp: "gcp-migration-center",
        azure: "azure-migrate",
      },
    },

    // Step 2: the landing zone and the private link exist before any copy arrives.
    {
      id: "link",
      label: "Private link",
      sub: "VPN to the region",
      icon: "tunnel",
      tone: "blue",
      step: 2,
      x: 405,
      y: 345,
      w: 204,
      cloud: {
        aws: { label: "Site-to-Site VPN" },
        gcp: { label: "Cloud VPN" },
        azure: { label: "VPN Gateway" },
      },
    },
    {
      id: "lz",
      label: "Landing zone",
      sub: "account, network, rules",
      icon: "building",
      tone: "orange",
      step: 2,
      x: 672,
      y: 600,
      w: 204,
      cloud: {
        aws: "aws-control-tower",
        gcp: "gcp-resource-manager",
        azure: { label: "Azure landing zone" },
      },
    },

    // Step 3: wave 1, replicate then cut over.
    {
      id: "repl",
      label: "Replication service",
      sub: "copies changed blocks",
      icon: "pipeline",
      tone: "orange",
      step: 3,
      x: 405,
      y: 225,
      w: 212,
      cloud: {
        aws: { label: "App Migration Service" },
        gcp: { label: "Migrate to VMs" },
        azure: "azure-migrate",
      },
    },
    {
      id: "cloudapp",
      label: "Order app",
      sub: "rehosted VM",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 672,
      y: 225,
      w: 204,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "dns",
      label: "Shop address",
      sub: "DNS, TTL 5 minutes",
      icon: "dns",
      tone: "blue",
      step: 3,
      x: 672,
      y: 110,
      w: 204,
      cloud: { aws: "aws-route53", gcp: "gcp-cloud-dns", azure: "azure-dns" },
    },

    // Step 4: the failure. Nobody listed this PC.
    {
      id: "ticketpc",
      label: "Ticket PC",
      sub: "under the bench",
      icon: "server",
      tone: "red",
      step: 4,
      x: 130,
      y: 600,
      w: 176,
    },

    // Step 5: map traffic before each wave; wave 2 moves the database.
    {
      id: "depmap",
      label: "Dependency map",
      sub: "35 days of traffic",
      icon: "map",
      tone: "orange",
      step: 5,
      x: 405,
      y: 600,
      w: 204,
    },
    {
      id: "clouddb",
      label: "Order database",
      sub: "managed engine",
      icon: "database",
      tone: "violet",
      step: 5,
      x: 672,
      y: 345,
      w: 204,
      cloud: {
        aws: { id: "aws-rds", label: "RDS for SQL Server" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-sql", label: "SQL Managed Instance" },
      },
    },

    // Step 6: modernize after the move.
    {
      id: "price",
      label: "Price service",
      sub: "rebuilt in month 9",
      icon: "container",
      tone: "teal",
      step: 6,
      x: 672,
      y: 455,
      w: 204,
      cloud: {
        aws: { id: "aws-fargate", label: "ECS on Fargate" },
        gcp: "gcp-cloud-run",
        azure: "azure-container-apps",
      },
    },
  ],
  edges: [
    // Step 1: the hypervisor's list is the whole inventory, so a machine outside VMware is invisible.
    { from: "vmware", to: "assess", label: "VM list", packet: true },

    // Step 2: a private link joins the back office to the new account's network.
    { from: "db", to: "link", label: "VPN tunnel", dashed: true, step: 2 },
    { from: "link", to: "lz", label: "into the account", dashed: true, flow: true, labelAt: 0.62, step: 2 },

    // Step 3: copy the disk nonstop, launch the copy, point the name at it. The database is still in the back office.
    { from: "app", to: "repl", label: "disk blocks", packet: true, step: 3 },
    { from: "repl", to: "cloudapp", label: "launch", packet: true, delay: 1.2, step: 3 },
    { from: "dns", to: "cloudapp", label: "points here", step: 3 },
    { from: "cloudapp", to: "link", label: "SQL to old DB", packet: true, labelAt: 0.4, step: 3, until: 4 },

    // Step 4: at 02:00 the PC asks the old server for the day's orders. The server is off; nothing prints.
    {
      from: "ticketpc",
      to: "app",
      label: "02:00: server off",
      tone: "red",
      dashed: true,
      via: [
        [262, 580],
        [262, 250],
      ],
      labelAt: 0.53,
      step: 4,
      until: 4,
    },

    // Step 5: the traffic map shows the 02:00 flow; the PC stays and reads its export from the cloud app.
    { from: "ticketpc", to: "depmap", label: "02:00 flow", dashed: true, flow: true, step: 5 },
    { from: "ticketpc", to: "link", label: "via VPN", packet: true, labelAt: 0.4, step: 5 },
    { from: "link", to: "cloudapp", label: "02:00 export", packet: true, delay: 1.2, labelAt: 0.6, step: 5 },
    { from: "link", to: "clouddb", label: "rows + changes", packet: true, step: 5 },
    { from: "cloudapp", to: "clouddb", label: "SQL", packet: true, delay: 1, step: 5 },

    // Step 6: the rebuilt price service reads the managed database.
    { from: "price", to: "clouddb", label: "reads prices", packet: true, step: 6 },
  ],
};

export default spec;
